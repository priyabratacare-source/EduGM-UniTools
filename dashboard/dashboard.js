/* Shared dashboard guard + helpers.
   Every dashboard page imports this — auth is enforced on every page. */
import {
  auth, db, onAuthStateChanged, signOut,
  collection, getDocs, doc, updateDoc, setDoc, deleteDoc,
  addDoc, serverTimestamp
} from "../firebase.js";

/* Authorized team UIDs — keep in sync with login.html + Firestore rules. */
export const AUTHORIZED_UIDS = new Set([
  "xrQ5oHinaAaddySn09V3k8CRAo52"
]);

export function isAuthorized() {
  return !!(auth.currentUser && AUTHORIZED_UIDS.has(auth.currentUser.uid));
}

/* Redirect to login. Uses replace() so back button can't return to dashboard. */
export function kickOut() {
  window.location.replace("../login.html");
}

/* Guard — call at the top of every dashboard page.
   Returns a Promise that resolves only when an authorized user is ready. */
export function guard() {
  return new Promise(resolve => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user || !AUTHORIZED_UIDS.has(user.uid)) {
        if (user) await signOut(auth);
        kickOut();
        return;
      }
      unsub();
      resolve(user);
    });
  });
}

/* Wire up the hamburger + sidebar overlay + logout button.
   Call once per page after guard() resolves. */
export function wireShell(user) {
  const sidebar   = document.getElementById("sidebar");
  const overlay   = document.getElementById("overlay");
  const hamburger = document.getElementById("hamburger");
  const logoutBtn = document.getElementById("logoutBtn");
  const userChip  = document.getElementById("userChip");

  if (hamburger && sidebar && overlay) {
    const close = () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("show");
    };
    hamburger.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      overlay.classList.toggle("show");
    });
    overlay.addEventListener("click", close);
    sidebar.querySelectorAll("a").forEach(a => a.addEventListener("click", close));
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      kickOut();
    });
  }

  if (userChip && user) {
    const initial = (user.email || "?").trim().charAt(0).toUpperCase();
    userChip.innerHTML = `
      <span class="user-avatar">${initial}</span>
      <span>${user.email}</span>
    `;
  }

  /* If the tab regains focus and session is gone, kick out. */
  window.addEventListener("focus", () => {
    if (!isAuthorized()) kickOut();
  });
}

/* ---------- Formatting helpers ---------- */
export function formatDate(value) {
  if (!value) return "—";
  let d;
  if (typeof value.toDate === "function") d = value.toDate();
  else if (typeof value === "string" || typeof value === "number") d = new Date(value);
  else return "—";
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export function safeText(v) {
  return v == null || v === "" ? "—" : String(v);
}

export function statusClass(s) {
  if (s === "verified") return "verified";
  if (s === "rejected") return "rejected";
  if (s === "hold") return "hold-status";
  return "pending";
}

export function setMessage(el, text, isError = false) {
  if (!el) return;
  el.textContent = text;
  el.className = "message " + (isError ? "error" : "success");
}

export function clearMessage(el) {
  if (!el) return;
  el.textContent = "";
  el.className = "message";
}

/* Re-export Firebase bits so pages only need one import. */
export {
  auth, db, signOut,
  collection, getDocs, doc, updateDoc, setDoc, deleteDoc,
  addDoc, serverTimestamp
};
