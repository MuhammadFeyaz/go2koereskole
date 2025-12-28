(() => {
  const $ = (id) => document.getElementById(id);

  async function api(path, options = {}) {
    const res = await fetch(path, { credentials: "include", ...options });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showStatus(text, type = "") {
    const el = $("studentsStatus");
    if (!el) return;
    el.style.display = "block";
    el.textContent = text;
    el.className = `status ${type}`.trim();
  }

  function hideStatus() {
    const el = $("studentsStatus");
    if (!el) return;
    el.style.display = "none";
    el.textContent = "";
    el.className = "status";
  }

  async function ensureAdmin() {
    const { res, data } = await api("/api/auth/me");
    if (!res.ok || !data?.user) {
      window.location.href = "/login.html";
      return false;
    }
    if (data.user.role !== "admin") {
      window.location.href = "/index.html";
      return false;
    }
    return true;
  }

  async function loadStudents() {
    const listEl = $("studentsList");
    if (!listEl) return;

    hideStatus();
    listEl.textContent = "Indlæser...";

    const { res, data } = await api("/api/admin/students");
    if (!res.ok) {
      showStatus("Kunne ikke hente elever. (Er du logget ind som admin?)", "error");
      listEl.textContent = "";
      return;
    }

    const students = data.students || [];
    if (!students.length) {
      listEl.innerHTML = `<div class="muted">Ingen elever endnu.</div>`;
      return;
    }

    listEl.innerHTML = `
      <div style="display:grid; gap:10px;">
        ${students
          .map(
            (s) => `
          <div class="card" style="padding:14px;">
            <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; align-items:center;">
              <div>
                <div><strong>${esc(s.name)}</strong></div>
                <div class="muted">${esc(s.email)}${s.phone ? ` • ${esc(s.phone)}` : ""}</div>
              </div>

              <button class="btn" data-delete-email="${esc(s.email)}"
                style="border-color: rgba(255,120,120,.35);">
                🗑️ Slet elev
              </button>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `;

    listEl.querySelectorAll("[data-delete-email]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const email = btn.getAttribute("data-delete-email");
        if (!email) return;

        const ok = confirm(
          `Vil du slette eleven:\n${email}\n\nDette sletter også elevens bookinger.`
        );
        if (!ok) return;

        showStatus("Sletter elev...", "");

        const { res: delRes, data: delData } = await api(
          `/api/admin/students/${encodeURIComponent(email)}`,
          { method: "DELETE" }
        );

        if (!delRes.ok) {
          showStatus(delData?.error || "Kunne ikke slette elev.", "error");
          return;
        }

        showStatus("✅ Elev slettet.", "success");
        loadStudents();
      });
    });
  }

  async function init() {
    const ok = await ensureAdmin();
    if (!ok) return;
    loadStudents();
  }

  init();
})();
