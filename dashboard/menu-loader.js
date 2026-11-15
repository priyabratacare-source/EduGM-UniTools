/* Loads menu.html into every dashboard page.
   Automatically highlights the current page's nav link.
   Also wires the hamburger + overlay for mobile. */

export async function loadMenu() {
  const mount = document.getElementById("menu-mount");
  if (!mount) {
    console.warn("menu-loader: no #menu-mount element found");
    return;
  }

  try {
    const res = await fetch("menu.html", { cache: "no-store" });
    if (!res.ok) throw new Error("menu.html not found (" + res.status + ")");
    const html = await res.text();
    mount.innerHTML = html;

    /* Highlight the current page */
    const current = (location.pathname.split("/").pop() || "index.html")
      .replace(".html", "") || "index";
    const activeLink = mount.querySelector(`a[data-page="${current}"]`);
    if (activeLink) activeLink.classList.add("active");

    /* Wire hamburger + overlay */
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    const hamburger = document.getElementById("hamburger");

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

    /* Wire logout button */
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        try {
          const { auth, signOut } = await import("../firebase.js");
          await signOut(auth);
          window.location.replace("../login.html");
        } catch (e) {
          console.error("Logout failed:", e);
          window.location.replace("../login.html");
        }
      });
    }

  } catch (err) {
    console.error("menu-loader: failed to load menu —", err);
    mount.innerHTML = `<div style="padding:20px;color:#b42318;font-family:Arial,sans-serif;font-size:13px">
      Could not load the sidebar menu. Please refresh the page.
    </div>`;
  }
}
