import {
  guard, wireShell, setMessage, clearMessage, formatDate,
  db, collection, getDocs, doc, updateDoc, addDoc, serverTimestamp
} from "./dashboard.js";

/* ============================================================
   CONFIG — replace with your EmailJS details
   ============================================================ */
const EMAILJS = {
  publicKey:  "YOUR_EMAILJS_PUBLIC_KEY",
  serviceId:  "YOUR_EMAILJS_SERVICE_ID",
  replyTemplateId: "YOUR_REPLY_TEMPLATE_ID"   // e.g. template_reply
};

/* ============================================================
   AUTH GUARD
   ============================================================ */
const user = await guard();
document.getElementById("gate").style.display = "none";
document.getElementById("shell").style.display = "block";
wireShell(user);

/* ============================================================
   STATE
   ============================================================ */
let allMessages = [];      // merged contact + donation messages
let selectedId    = null;  // currently open message id
let activeFilter  = "all";
let searchQuery   = "";
let emailjsReady  = false;
let busy          = false;

const $ = id => document.getElementById(id);
const listEl       = $("msgList");
const detailEmpty  = $("msgDetailEmpty");
const detailEl     = $("msgDetail");
const globalMsg    = $("globalMessage");

/* ============================================================
   EMAILJS INIT (best-effort)
   ============================================================ */
function initEmailJS() {
  if (!window.emailjs) return false;
  try {
    window.emailjs.init({ publicKey: EMAILJS.publicKey });
    emailjsReady = true;
    return true;
  } catch (e) {
    console.warn("EmailJS init failed:", e);
    return false;
  }
}

/* ============================================================
   LOAD MESSAGES FROM FIRESTORE
   Reads both "contactMessages" and "donations" collections.
   Each is normalised into a common shape.
   ============================================================ */
async function loadMessages() {
  listEl.innerHTML = '<div class="list-empty"><strong>Loading messages…</strong></div>';
  try {
    const [contactSnap, donationSnap] = await Promise.all([
      getDocs(collection(db, "contactMessages")),
      getDocs(collection(db, "donations"))
    ]);

    /* Normalise contact form submissions */
    const contacts = contactSnap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        kind: "contact",
        name: data.name || "—",
        email: data.email || "—",
        subject: data.subject || "Contact message",
        body: data.message || "",
        status: data.status || "new",
        reference: data.reference || "",
        createdAt: data.createdAt,
        replies: data.replies || []
      };
    });

    /* Normalise donation submissions as messages too */
    const donations = donationSnap.docs.map(d => {
      const data = d.data();
      const amt = Number(data.amount) || 0;
      return {
        id: d.id,
        kind: "donation",
        name: data.donorName || "Anonymous",
        email: data.email || "—",
        subject: `Donation — ₹${amt.toLocaleString()}`,
        body:
          `Donor: ${data.donorName || "Anonymous"}\n` +
          `Email: ${data.email || "—"}\n` +
          `Amount: ₹${amt.toLocaleString()}\n` +
          `Transaction reference: ${data.transactionId || "—"}\n` +
          (data.message ? `\nMessage:\n${data.message}` : ""),
        status: data.status === "verified" ? "replied" : (data.status || "new"),
        reference: data.reference || "",
        createdAt: data.submittedAt,
        replies: data.replies || [],
        raw: data
      };
    });

    /* Merge + sort newest first */
    allMessages = [...contacts, ...donations];
    allMessages.sort((a, b) => {
      const t = v => {
        if (!v) return 0;
        if (typeof v.toMillis === "function") return v.toMillis();
        if (typeof v.seconds === "number") return v.seconds * 1000;
        if (typeof v === "string") return Date.parse(v) || 0;
        return 0;
      };
      return t(b.createdAt) - t(a.createdAt);
    });

    renderList();
    updateCount();

    if (!allMessages.length) {
      detailEmpty.querySelector("div:last-child").textContent =
        "No messages yet — contact form and donation submissions will appear here.";
    }
  } catch (err) {
    console.error(err);
    listEl.innerHTML = `<div class="list-empty"><strong>Could not load messages</strong>${err.message}</div>`;
  }
}

function updateCount() {
  const newCount = allMessages.filter(m => m.status === "new").length;
  $("msgCount").textContent = newCount > 0
    ? `· ${newCount} new`
    : `· ${allMessages.length} total`;
}

/* ============================================================
   FILTER + SEARCH
   ============================================================ */
function matchesFilter(m) {
  if (activeFilter === "all") return true;
  if (activeFilter === "contact" || activeFilter === "donation") {
    return m.kind === activeFilter;
  }
  if (activeFilter === "new") return m.status === "new";
  if (activeFilter === "replied") return m.status === "replied";
  return true;
}

function matchesSearch(m) {
  if (!searchQuery) return true;
  const q = searchQuery.toLowerCase();
  return (
    (m.name || "").toLowerCase().includes(q) ||
    (m.email || "").toLowerCase().includes(q) ||
    (m.subject || "").toLowerCase().includes(q) ||
    (m.body || "").toLowerCase().includes(q)
  );
}

/* ============================================================
   RENDER MESSAGE LIST
   ============================================================ */
function renderList() {
  const filtered = allMessages.filter(m => matchesFilter(m) && matchesSearch(m));

  if (!filtered.length) {
    listEl.innerHTML = `<div class="list-empty"><strong>No matches</strong>Try a different search or filter.</div>`;
    return;
  }

  listEl.innerHTML = "";
  filtered.forEach(m => {
    const item = document.createElement("div");
    item.className = "msg-item";
    if (m.id === selectedId) item.classList.add("active");
    if (m.status === "new") item.classList.add("unread");
    item.dataset.id = m.id;

    const timeStr = formatDate(m.createdAt);
    const catClass = m.kind === "donation" ? "cat-donation" : "cat-contact";
    const catLabel = m.kind === "donation" ? "Donation" : "Contact";

    item.innerHTML = `
      <div class="msg-item-subject">
        ${m.status === "new" ? '<span class="msg-unread-dot"></span>' : ""}
        ${escapeHtml(m.subject || "(no subject)")}
      </div>
      <div class="msg-item-from">${escapeHtml(m.name)} · ${escapeHtml(m.email)}</div>
      <div class="msg-item-meta">
        <span class="msg-item-cat ${catClass}">${catLabel}</span>
        <span class="msg-item-time">${timeStr}</span>
      </div>
    `;

    item.addEventListener("click", () => openMessage(m.id));
    listEl.appendChild(item);
  });
}

/* ============================================================
   OPEN MESSAGE
   ============================================================ */
async function openMessage(id) {
  const m = allMessages.find(x => x.id === id);
  if (!m) return;

  selectedId = id;
  renderList();

  /* Show detail pane */
  detailEmpty.style.display = "none";
  detailEl.classList.add("show");

  /* Fill details */
  $("detailSubject").textContent = m.subject || "(no subject)";
  $("detailFrom").innerHTML = `
    From <strong>${escapeHtml(m.name)}</strong>
    &lt;<a href="mailto:${escapeHtml(m.email)}">${escapeHtml(m.email)}</a>&gt;<br>
    <span class="msg-badge ${m.kind === 'donation' ? 'donation' : 'contact'}">${m.kind === 'donation' ? 'Donation' : 'Contact'}</span>
    <span class="msg-badge ${m.status}">${m.status}</span>
    ${m.reference ? `<span style="color:var(--muted);font-size:12px">Ref: ${escapeHtml(m.reference)}</span>` : ""}
    · ${formatDate(m.createdAt)}
  `;
  $("detailBody").textContent = m.body || "(no content)";

  /* Reply history */
  const replies = Array.isArray(m.replies) ? m.replies : [];
  const histEl = $("replyHistory");
  const histList = $("replyHistoryList");
  if (replies.length) {
    histEl.style.display = "block";
    histList.innerHTML = "";
    replies.forEach(r => {
      const div = document.createElement("div");
      div.className = "reply-item";
      div.innerHTML = `
        <div class="reply-meta">
          ${escapeHtml(r.sentBy || "team")} · ${formatDate(r.sentAt)}
        </div>
        ${escapeHtml(r.text || "")}
      `;
      histList.appendChild(div);
    });
  } else {
    histEl.style.display = "none";
  }

  /* Clear composer */
  $("replyText").value = "";

  /* Auto-mark as read */
  if (m.status === "new") {
    await markStatus(id, "read");
  }
}

/* ============================================================
   STATUS CHANGES
   ============================================================ */
async function markStatus(id, status) {
  const m = allMessages.find(x => x.id === id);
  if (!m) return;

  const collName = m.kind === "donation" ? "donations" : "contactMessages";

  try {
    await updateDoc(doc(db, collName, id), {
      status: status,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid
    });
    m.status = status;
    updateCount();
    renderList();
    setMessage(globalMsg, "Message marked as " + status + ".", false);
    setTimeout(() => clearMessage(globalMsg), 2000);
  } catch (err) {
    console.error(err);
    setMessage(globalMsg, "Could not update status: " + err.message, true);
  }
}

/* ============================================================
   SEND REPLY
   ============================================================ */
async function sendReply() {
  if (busy) return;
  const m = allMessages.find(x => x.id === selectedId);
  if (!m) return;

  const text = $("replyText").value.trim();
  if (!text) {
    setMessage(globalMsg, "Please type a reply before sending.", true);
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email)) {
    setMessage(globalMsg, "This message has no valid email address to reply to.", true);
    return;
  }

  busy = true;
  $("sendReplyBtn").disabled = true;
  $("sendReplyBtn").textContent = "Sending…";

  try {
    /* 1. Send via EmailJS */
    if (!emailjsReady) initEmailJS();

    if (emailjsReady) {
      await window.emailjs.send(EMAILJS.serviceId, EMAILJS.replyTemplateId, {
        to_email:   m.email,
        to_name:    m.name,
        subject:    "Re: " + (m.subject || "Your message to EduGM UniTools"),
        message:    text,
        from_name:  "EduGM UniTools Team",
        from_email: "admin@codebihin.in",
        reference:  m.reference || ""
      });
    } else {
      throw new Error("Email service not available — the reply was not sent.");
    }

    /* 2. Store reply in Firestore so the thread keeps history */
    const collName = m.kind === "donation" ? "donations" : "contactMessages";
    const replyEntry = {
      text: text,
      sentAt: new Date().toISOString(),
      sentBy: user.email || user.uid,
      sentByUid: user.uid
    };

    const existingReplies = Array.isArray(m.replies) ? m.replies : [];
    const updatedReplies = [...existingReplies, replyEntry];

    await updateDoc(doc(db, collName, m.id), {
      replies: updatedReplies,
      status: "replied",
      lastReplyAt: serverTimestamp()
    });

    /* 3. Update local state + UI */
    m.replies = updatedReplies;
    m.status = "replied";
    openMessage(m.id);   // refresh detail
    updateCount();

    $("replyText").value = "";
    setMessage(globalMsg, "Reply sent successfully.", false);
    setTimeout(() => clearMessage(globalMsg), 3000);

  } catch (err) {
    console.error(err);
    setMessage(globalMsg, "Reply failed: " + (err.message || err.text || "Unknown error"), true);
  } finally {
    busy = false;
    $("sendReplyBtn").disabled = false;
    $("sendReplyBtn").textContent = "✉ Send reply";
  }
}

/* ============================================================
   UTIL: escape HTML
   ============================================================ */
function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ============================================================
   WIRE UI
   ============================================================ */

/* Search */
$("msgSearch").addEventListener("input", e => {
  searchQuery = e.target.value.trim();
  renderList();
});

/* Filter buttons */
document.querySelectorAll(".msg-filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".msg-filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    renderList();
  });
});

/* Action buttons */
$("archiveBtn").addEventListener("click", () => {
  if (selectedId) markStatus(selectedId, "archived");
});
$("markReadBtn").addEventListener("click", () => {
  if (selectedId) markStatus(selectedId, "read");
});
$("markUnreadBtn").addEventListener("click", () => {
  if (selectedId) markStatus(selectedId, "new");
});
$("clearReplyBtn").addEventListener("click", () => {
  $("replyText").value = "";
  $("replyText").focus();
});
$("sendReplyBtn").addEventListener("click", sendReply);

/* Enter-to-send in reply textarea (Ctrl+Enter) */
$("replyText").addEventListener("keydown", e => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    sendReply();
  }
});

/* ============================================================
   INIT
   ============================================================ */
initEmailJS();
await loadMessages();

/* Auto-refresh every 60 seconds so the inbox stays current */
setInterval(loadMessages, 60000);
