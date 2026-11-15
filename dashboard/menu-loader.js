export async function loadMenu() {
  const mount = document.getElementById("menu-mount");
  if (!mount) return;

  try {
    const res = await fetch("menu.html", { cache: "no-store" });
    if (!res.ok) throw new Error("menu.html not found");
    mount.innerHTML = await res.text();

    const current = (location.pathname.split("/").pop() || "index.html").replace(".html", "") || "index";
    const activeLink = mount.querySelector(`a[data-page="${current}"]`);
    if (activeLink) activeLink.classList.add("active");

    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    const hamburger = document.getElementById("hamburger");

    if (hamburger && sidebar && overlay) {
      const close = () => { sidebar.classList.remove("open"); overlay.classList.remove("show"); };
      hamburger.addEventListener("click", () => {
        sidebar.classList.toggle("open");
        overlay.classList.toggle("show");
      });
      overlay.addEventListener("click", close);
      sidebar.querySelectorAll("a").forEach(a => a.addEventListener("click", close));
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        try {
          const { auth, signOut } = await import("../firebase.js");
          await signOut(auth);
        } catch (e) { console.warn("Logout:", e); }
        window.location.replace("../login.html");
      });
    }
  } catch (err) {
    mount.innerHTML = `<div style="padding:20px;color:#b42318;font-family:Arial,sans-serif;font-size:13px">Could not load menu.</div>`;
  }
}
