import { loadMenu } from "./menu-loader.js";
import {
  guard, wireShell, setMessage, clearMessage, formatDate,
  db, collection, getDocs, doc, updateDoc, addDoc, serverTimestamp
} from "./dashboard.js";

/* ============================================================
   EMAILJS CONFIG — replace with your real values
   ============================================================ */
const EMAILJS = {
  publicKey: "YOUR_EMAILJS_PUBLIC_KEY",
  serviceId: "YOUR_EMAILJS_SERVICE_ID",
  approvalTemplateId: "YOUR_APPROVAL_TEMPLATE_ID"   // e.g. template_approval
};

/* ============================================================
   AUTH GUARD
   ============================================================ */
const user = await guard();
await loadMenu();
document.getElementById("gate").style.display = "none";
document.getElementById("shell").style.display = "block";
wireShell(user);

/* ============================================================
   STATE
   ============================================================ */
let applications = [];
let filteredApps = [];
let currentApp = null;      // app being viewed/approved
let busy = false;
let emailjsReady = false;

const $ = id => document.getElementById(id);
const gridEl = $("appGrid");
const appMessage = $("appMessage");

/* ============================================================
   EMAILJS INIT
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
   LOAD APPLICATIONS
   ============================================================ */
async function loadApplications() {
  gridEl.innerHTML = `<div class="empty" style="grid-column:1/-1"><strong>Loading applications…</strong></div>`;
  clearMessage(appMessage);

  try {
    const snap = await getDocs(collection(db, "mailRegistrations"));
    applications = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    applications.sort((a, b) => {
      const t = v => v?.toMillis ? v.toMillis() : (Date.parse(v || "") || 0);
      return t(b.submittedAt) - t(a.submittedAt);
    });

    updateStats();
    applyFilters();
    setMessage(appMessage, applications.length + " application(s) loaded.");
  } catch (err) {
    console.error(err);
    gridEl.innerHTML = `<div class="empty" style="grid-column:1/-1"><strong>Could not load applications</strong>${err.message}</div>`;
    setMessage(appMessage, "Error: " + err.message, true);
  }
}

function updateStats() {
  const pending = applications.filter(a => (a.status || "pending") === "pending").length;
  const approved = applications.filter(a => a.status === "approved").length;
  const rejected = applications.filter(a => a.status === "rejected").length;
  $("statPending").textContent = pending;
  $("statApproved").textContent = approved;
  $("statRejected").textContent = rejected;
}

/* ============================================================
   FILTERING
   ============================================================ */
function applyFilters() {
  const q = $("appSearch").value.trim().toLowerCase();
  const status = $("statusFilter").value;

  filteredApps = applications.filter(a => {
    const aStatus = a.status || "pending";
    if (status !== "all" && aStatus !== status) return false;
    if (!q) return true;
    const haystack = [
      a.fullName, a.personalEmail, a.workspaceEmail, a.workspaceHandle, a.phone
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(q);
  });

  renderGrid();
}

/* ============================================================
   RENDER GRID
   ============================================================ */
function renderGrid() {
  if (!filteredApps.length) {
    gridEl.innerHTML = `<div class="empty" style="grid-column:1/-1">
      <strong>No applications</strong>${applications.length ? "Try a different filter or search." : "No mailbox registrations yet."}
    </div>`;
    return;
  }

  gridEl.innerHTML = "";
  filteredApps.forEach(app => {
    const card = document.createElement("div");
    const status = app.status || "pending";
    card.className = "app-card " + status;

    const submitted = formatDate(app.submittedAt);

    card.innerHTML = `
      <div class="app-head">
        <div>
          <div class="app-name">${escapeHtml(app.fullName || "—")}</div>
          <div class="app-email">${escapeHtml(app.personalEmail || "—")}</div>
        </div>
        <span class="app-status ${status}">${status}</span>
      </div>

      <div class="app-workspace">${escapeHtml(app.workspaceEmail || "—")}</div>

      <div class="app-meta">
        <div><span class="k">Phone:</span> <span class="v">${escapeHtml(app.phone || "—")}</span></div>
        <div><span class="k">Submitted:</span> <span class="v">${submitted}</span></div>
        <div><span class="k">Reference:</span> <span class="v" style="font-family:monospace;font-size:11.5px">${escapeHtml(app.reference || "—")}</span></div>
        <div><span class="k">Location:</span> <span class="v">${escapeHtml(app.location || "—")}</span></div>
      </div>

      <div class="app-actions">
        <button class="btn-view" data-action="view" data-id="${app.id}">View details</button>
        ${status === "pending" ? `
          <button class="btn-approve" data-action="approve" data-id="${app.id}">✓ Approve</button>
          <button class="btn-reject" data-action="reject" data-id="${app.id}">✗ Reject</button>
        ` : ""}
      </div>
    `;
    gridEl.appendChild(card);
  });

  /* Wire actions */
  gridEl.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      const app = applications.find(a => a.id === id);
      if (!app) return;

      if (action === "view") openDetailModal(app);
      else if (action === "approve") openEmailModal(app);
      else if (action === "reject") rejectApplication(app);
    });
  });
}

/* ============================================================
   DETAIL MODAL
   ============================================================ */
const detailModal = $("detailModal");
const modalBody = $("modalBody");
const modalFoot = $("modalFoot");

function openDetailModal(app) {
  currentApp = app;
  $("modalTitle").textContent = app.fullName || "Application details";
  modalBody.innerHTML = `
    <div class="row"><span class="k">Full name</span><span class="v">${escapeHtml(app.fullName || "—")}</span></div>
    <div class="row"><span class="k">Personal email</span><span class="v">${escapeHtml(app.personalEmail || "—")}</span></div>
    <div class="row"><span class="k">Phone</span><span class="v">${escapeHtml(app.phone || "—")}</span></div>
    <div class="row"><span class="k">Location</span><span class="v">${escapeHtml(app.location || "—")}</span></div>
    <div class="row"><span class="k">Workspace email</span><span class="v mono">${escapeHtml(app.workspaceEmail || "—")}</span></div>
    <div class="row"><span class="k">Handle</span><span class="v mono">${escapeHtml(app.workspaceHandle || "—")}</span></div>
    <div class="row"><span class="k">Status</span><span class="v"><span class="app-status ${app.status || "pending"}">${app.status || "pending"}</span></span></div>
    <div class="row"><span class="k">Reference</span><span class="v mono">${escapeHtml(app.reference || "—")}</span></div>
    <div class="row"><span class="k">Submitted</span><span class="v">${formatDate(app.submittedAt)}</span></div>
    ${app.approvedAt ? `<div class="row"><span class="k">Approved</span><span class="v">${formatDate(app.approvedAt)}</span></div>` : ""}
    ${app.rejectedAt ? `<div class="row"><span class="k">Rejected</span><span class="v">${formatDate(app.rejectedAt)}</span></div>` : ""}
    ${app.rejectionReason ? `<div class="row"><span class="k">Reason</span><span class="v"><pre>${escapeHtml(app.rejectionReason)}</pre></span></div>` : ""}
  `;

  const status = app.status || "pending";
  modalFoot.innerHTML = `
    <button class="btn btn-secondary" id="detailCloseBtn" type="button">Close</button>
    ${status === "pending" ? `
      <button class="btn btn-primary" id="detailApproveBtn" type="button">✓ Approve</button>
      <button class="btn btn-danger" id="detailRejectBtn" type="button">✗ Reject</button>
    ` : ""}
  `;

  $("detailCloseBtn").addEventListener("click", () => detailModal.classList.remove("show"));
  if ($("detailApproveBtn")) {
    $("detailApproveBtn").addEventListener("click", () => {
      detailModal.classList.remove("show");
      openEmailModal(app);
    });
  }
  if ($("detailRejectBtn")) {
    $("detailRejectBtn").addEventListener("click", () => {
      detailModal.classList.remove("show");
      rejectApplication(app);
    });
  }

  detailModal.classList.add("show");
}

/* ============================================================
   APPROVAL EMAIL MODAL
   ============================================================ */
const emailModal = $("emailModal");

function openEmailModal(app) {
  currentApp = app;
  $("emailTo").textContent = app.personalEmail || "—";
  $("emailWorkspace").textContent = app.workspaceEmail || "—";
  $("tempPassword").value = generateTempPassword();
  emailModal.classList.add("show");
  setTimeout(() => $("tempPassword").focus(), 100);
}

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += chars[arr[i] % chars.length];
    if (i === 3 || i === 7) out += "-";
  }
  return out;
}

$("genPasswordBtn").addEventListener("click", () => {
  $("tempPassword").value = generateTempPassword();
});

$("emailCancelBtn").addEventListener("click", () => {
  emailModal.classList.remove("show");
});
$("emailCloseBtn").addEventListener("click", () => {
  emailModal.classList.remove("show");
});

$("sendApprovalBtn").addEventListener("click", async () => {
  if (!currentApp || busy) return;
  const tempPassword = $("tempPassword").value.trim();
  if (!tempPassword || tempPassword.length < 8) {
    setMessage(appMessage, "Please provide a temporary password of at least 8 characters.", true);
    return;
  }

  busy = true;
  $("sendApprovalBtn").disabled = true;
  $("sendApprovalBtn").textContent = "Sending…";

  try {
    /* 1. Send email via EmailJS */
    if (!emailjsReady) initEmailJS();
    if (!emailjsReady) throw new Error("Email service not available.");

    await window.emailjs.send(EMAILJS.serviceId, EMAILJS.approvalTemplateId, {
      to_email: currentApp.personalEmail,
      to_name: currentApp.fullName,
      workspace_email: currentApp.workspaceEmail,
      temp_password: tempPassword,
      sign_in_url: "https://tool.codebihin.in/mail-login.html",
      reference: currentApp.reference || "",
      from_name: "EduGM UniTools Team",
      from_email: "admin@codebihin.in"
    });

    /* 2. Update Firestore */
    await updateDoc(doc(db, "mailRegistrations", currentApp.id), {
      status: "approved",
      approvedAt: serverTimestamp(),
      approvedBy: user.uid,
      tempPasswordSent: true
    });

    /* 3. Log to audit */
    await addDoc(collection(db, "auditLogs"), {
      type: "mail_application_approved",
      applicationId: currentApp.id,
      workspaceEmail: currentApp.workspaceEmail,
      adminUid: user.uid,
      createdAt: serverTimestamp()
    });

    emailModal.classList.remove("show");
    setMessage(appMessage, "✓ Approved and email sent to " + currentApp.personalEmail, false);
    await loadApplications();

  } catch (err) {
    console.error(err);
    setMessage(appMessage, "Approval failed: " + (err.message || err.text || "Unknown error"), true);
  } finally {
    busy = false;
    $("sendApprovalBtn").disabled = false;
    $("sendApprovalBtn").textContent = "✉ Send approval email";
  }
});

/* ============================================================
   REJECT
   ============================================================ */
async function rejectApplication(app) {
  if (busy) return;
  const reason = prompt(
    "Reason for rejecting this application?\n\n" +
    "(This will be stored with the record. The applicant will not automatically be notified.)"
  );
  if (reason === null) return;  // user cancelled

  busy = true;
  try {
    await updateDoc(doc(db, "mailRegistrations", app.id), {
      status: "rejected",
      rejectedAt: serverTimestamp(),
      rejectedBy: user.uid,
      rejectionReason: reason.trim().slice(0, 500)
    });

    await addDoc(collection(db, "auditLogs"), {
      type: "mail_application_rejected",
      applicationId: app.id,
      workspaceEmail: app.workspaceEmail,
      reason: reason.trim().slice(0, 500),
      adminUid: user.uid,
      createdAt: serverTimestamp()
    });

    setMessage(appMessage, "Application rejected.", false);
    await loadApplications();
  } catch (err) {
    setMessage(appMessage, "Reject failed: " + err.message, true);
  } finally {
    busy = false;
  }
}

/* ============================================================
   HELPERS
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
   UI WIRING
   ============================================================ */
$("appSearch").addEventListener("input", applyFilters);
$("statusFilter").addEventListener("change", applyFilters);
$("refreshBtn").addEventListener("click", loadApplications);
$("modalCloseBtn").addEventListener("click", () => detailModal.classList.remove("show"));
detailModal.addEventListener("click", e => { if (e.target === detailModal) detailModal.classList.remove("show"); });
emailModal.addEventListener("click", e => { if (e.target === emailModal) emailModal.classList.remove("show"); });

/* ============================================================
   INIT
   ============================================================ */
initEmailJS();
await loadApplications();

/* Auto-refresh every 60 seconds so new applications appear */
setInterval(async () => {
  if (!busy && !detailModal.classList.contains("show") && !emailModal.classList.contains("show")) {
    await loadApplications();
  }
}, 60000);
