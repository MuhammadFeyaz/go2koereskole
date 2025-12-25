(() => {
  const $ = (id) => document.getElementById(id);

  // ---------------- Robust API (retry + timeout) ----------------
  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function api(path, options = {}, retries = 3) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s

    try {
      const res = await fetch(path, {
        credentials: "include",
        signal: controller.signal,
        ...options,
      });

      // Hvis response ikke er JSON (eller tom), så håndter pænt
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      return { res, data };
    } catch (err) {
      // Retry ved netværksfejl / timeout
      if (retries > 0) {
        await sleep(800);
        return api(path, options, retries - 1);
      }
      return { res: { ok: false, status: 0 }, data: { error: "NETWORK_ERROR" } };
    } finally {
      clearTimeout(timeout);
    }
  }

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------- Locations (must match backend) ----------
  const allowedLocations = [
    "Valby – Langgade St.",
    "Nørrebro – Nørrebro Station",
    "Amager – Sundbyvester Plads",
    "Hvidovre – Friheden Station",
  ];

  // ---------------- I18N (DA/EN) ----------------
  const translations = {
    da: {
      themeDark: "Mørk",
      themeLight: "Lys",

      navHome: "Hjem",
      navBooking: "Booking",
      navPrices: "Priser",
      navContact: "Kontakt",
      navBookNow: "Book nu",
      navLogin: "Login",
      navLogout: "Log ud",

      heroTitle: "Book din kørelektion nemt 🚗",
      heroText: "Vælg dato og tidspunkt — få svar hurtigt.",
      heroCTA1: "Gå til booking",
      heroCTA2: "Se priser",

      hoursTitle: "Åbningstider",

      nextLessonTitle: "Din kommende køretime",
      nextLessonLogin: "Log ind for at se din næste tid.",
      nextLessonCta: "Gå til booking",
      nextLessonNone: "Du har ingen kommende køretimer.",
      nextLessonNoApproved: "Du har ingen godkendte køretimer endnu.",

      bookingTitle: "Booking",
      bookingIntro: "Udfyld formularen og afvent godkendelse.",
      fillAll: "Udfyld venligst alle felter.",
      invalidLocation: "Vælg venligst et gyldigt mødested.",
      bookingSent: "✅ Booking sendt! Afventer godkendelse.",
      bookingFailed: "Booking fejlede.",
      timeTaken: "Tiden er allerede booket. Vælg et andet tidspunkt.",
      cannotLoadMyBookings: "Kunne ikke hente dine bookinger.",
      noneYet: "Ingen bookinger endnu.",

      footerTag: "Køreskole booking",
    },

    en: {
      themeDark: "Dark",
      themeLight: "Light",

      navHome: "Home",
      navBooking: "Booking",
      navPrices: "Prices",
      navContact: "Contact",
      navBookNow: "Book now",
      navLogin: "Login",
      navLogout: "Logout",

      heroTitle: "Book your driving lesson easily 🚗",
      heroText: "Choose date and time — get a quick reply.",
      heroCTA1: "Go to booking",
      heroCTA2: "See prices",

      hoursTitle: "Opening hours",

      nextLessonTitle: "Your upcoming lesson",
      nextLessonLogin: "Log in to see your next lesson.",
      nextLessonCta: "Go to booking",
      nextLessonNone: "You have no upcoming lessons.",
      nextLessonNoApproved: "You don’t have any approved lessons yet.",

      bookingTitle: "Booking",
      bookingIntro: "Fill out the form and wait for approval.",
      fillAll: "Please fill in all fields.",
      invalidLocation: "Please select a valid pickup location.",
      bookingSent: "✅ Booking sent! Waiting for approval.",
      bookingFailed: "Booking failed.",
      timeTaken: "This time is already booked. Please choose another time.",
      cannotLoadMyBookings: "Could not load your bookings.",
      noneYet: "No bookings yet.",

      footerTag: "Driving school booking",
    },
  };

  function getLang() {
    return (localStorage.getItem("lang") || "da").toLowerCase();
  }
  function setLang(lang) {
    localStorage.setItem("lang", lang);
  }
  function t(key) {
    const lang = getLang();
    return (translations[lang] || translations.da)[key] ?? key;
  }

  function applyI18n(lang) {
    const dict = translations[lang] || translations.da;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      const val = dict[key];
      if (val == null) return;
      el.textContent = String(val);
    });

    const langText = $("langText");
    if (langText) langText.textContent = lang.toUpperCase();

    const theme = document.documentElement.getAttribute("data-theme") || "light";
    const themeText = $("themeText");
    if (themeText)
      themeText.textContent = theme === "dark" ? dict.themeLight : dict.themeDark;
  }

  function initLanguage() {
    applyI18n(getLang());

    const btn = $("langToggle");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      const current = getLang();
      const next = current === "da" ? "en" : "da";
      setLang(next);
      applyI18n(next);
      await loadAboutContent(); // opdater om-tekst
      await loadNextLesson();   // opdater tekster i næste-time boksen
      await loadMyBookings();   // opdater tekster i bookings
    });
  }

  // ---------------- THEME (LIGHT/DARK) ----------------
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);

    const icon = $("themeIcon");
    if (icon) icon.textContent = theme === "dark" ? "☀️" : "🌙";

    const dict = translations[getLang()] || translations.da;
    const text = $("themeText");
    if (text) text.textContent = theme === "dark" ? dict.themeLight : dict.themeDark;
  }

  function initTheme() {
    const saved = localStorage.getItem("theme");
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const initial = saved || (prefersDark ? "dark" : "light");
    applyTheme(initial);

    const btn = $("themeToggle");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const current =
        document.documentElement.getAttribute("data-theme") || "light";
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      applyTheme(next);
    });

    if (!saved && window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener?.("change", (e) => applyTheme(e.matches ? "dark" : "light"));
    }
  }

  // ---------------- NAVBAR "Logget ind som X" ----------------
  async function initNavbarUser() {
    const navText = $("navUserText");
    const loginBtn = $("navLoginBtn");
    const logoutBtn = $("navLogoutBtn");
    if (!navText || !loginBtn || !logoutBtn) return;

    const { res, data } = await api("/api/auth/me");
    const user = data.user;

    if (!res.ok || !user) {
      navText.textContent = "";
      loginBtn.style.display = "";
      logoutBtn.style.display = "none";
      return;
    }

    navText.textContent = `Logget ind som ${user.name || user.email}`;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "";

    logoutBtn.onclick = async () => {
      await api("/api/auth/logout", { method: "POST" });
      window.location.href = "/login.html";
    };
  }

  // ---------------- ABOUT TEXT (from backend) ----------------
  async function loadAboutContent() {
    const aboutTitle = document.querySelector('[data-i18n="aboutTitle"]');
    if (!aboutTitle) return;

    const lang = getLang();
    const { res, data } = await api(`/api/content/about?lang=${lang}`);
    if (!res.ok || !data) return;

    const p1 = document.querySelector('[data-i18n="aboutP1"]');
    const p2 = document.querySelector('[data-i18n="aboutP2"]');
    const p3 = document.querySelector('[data-i18n="aboutP3"]');

    if (data?.title) aboutTitle.textContent = data.title;
    if (p1 && data?.p1) p1.textContent = data.p1;
    if (p2 && data?.p2) p2.textContent = data.p2;
    if (p3 && data?.p3) p3.textContent = data.p3;
  }

  // ---------------- NEXT LESSONS (index.html) ----------------
  async function loadNextLesson() {
    const el = $("nextLessonContent");
    if (!el) return;

    const { res: meRes, data: meData } = await api("/api/auth/me");
    if (!meRes.ok || !meData?.user) {
      el.textContent = t("nextLessonLogin");
      return;
    }

    const { res, data } = await api("/api/bookings/my");
    if (!res.ok) {
      el.textContent = t("bookingFailed");
      return;
    }

    const list = data.bookings || [];
    const now = new Date();

    const upcomingApproved = list
      .filter((b) => String(b.status || "").toUpperCase() === "APPROVED")
      .map((b) => ({ ...b, _dt: new Date(`${b.date}T${b.startTime}`) }))
      .filter((b) => b._dt && !isNaN(b._dt) && b._dt >= now)
      .sort((a, b) => a._dt - b._dt)
      .slice(0, 3);

    if (!upcomingApproved.length) {
      const hasApproved = list.some(
        (b) => String(b.status || "").toUpperCase() === "APPROVED"
      );
      el.textContent = hasApproved ? t("nextLessonNone") : t("nextLessonNoApproved");
      return;
    }

    el.innerHTML = `
      <div class="next-lesson-list">
        ${upcomingApproved
          .map(
            (b) => `
          <div class="next-lesson-badge">
            <div><strong>${esc(b.date)} • ${esc(b.startTime)} • ${esc(
              b.durationMin
            )} min</strong></div>
            <div class="muted">${esc(b.lessonType || "Kørelektion")} • ${esc(
              b.address || "-"
            )}</div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  // ---------------- Booking page: list my bookings ----------------
  function badge(status) {
    const s = String(status || "PENDING").toUpperCase();
    if (s === "APPROVED") return "✅ GODKENDT";
    if (s === "DENIED") return "❌ AFVIST";
    return "⏳ AFVENTER";
  }

  async function loadMyBookings() {
    const el = $("myBookings");
    if (!el) return;

    const { res, data } = await api("/api/bookings/my");
    if (!res.ok) {
      el.textContent = t("cannotLoadMyBookings");
      return;
    }

    const list = data.bookings || [];
    if (!list.length) {
      el.textContent = t("noneYet");
      return;
    }

    list.sort((a, b) =>
      `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`)
    );

    el.innerHTML = `
      <div style="display:grid; gap:10px;">
        ${list
          .map(
            (b) => `
          <div class="card" style="padding:14px;">
            <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
              <div><strong>${esc(
                b.lessonType || "Kørelektion"
              )}</strong> – ${esc(b.date)} kl. ${esc(b.startTime)}</div>
              <div class="muted"><strong>${badge(b.status)}</strong></div>
            </div>
            <div class="muted" style="margin-top:6px;">
              ${esc(b.durationMin)} min • ${esc(b.address)}
            </div>
            ${
              b.note
                ? `<div class="muted" style="margin-top:6px;">Note: ${esc(
                    b.note
                  )}</div>`
                : ""
            }
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  // ---------------- Booking form submit ----------------
  const form = $("bookingForm");
  const receipt = $("receipt");
  const statusEl = $("formStatus");

  function setStatus(text, type = "") {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = `status ${type}`.trim();
  }

  function renderReceipt(b) {
    if (!receipt) return;
    receipt.innerHTML = `
      <div class="receipt__row"><strong>Type:</strong> <span>${esc(
        b.lessonType || "-"
      )}</span></div>
      <div class="receipt__row"><strong>Dato:</strong> <span>${esc(
        b.date || "-"
      )}</span></div>
      <div class="receipt__row"><strong>Tid:</strong> <span>${esc(
        b.startTime || "-"
      )}</span></div>
      <div class="receipt__row"><strong>Varighed:</strong> <span>${esc(
        b.durationMin ?? "-"
      )} min</span></div>
      <div class="receipt__row"><strong>Mødested:</strong> <span>${esc(
        b.address || "-"
      )}</span></div>
      ${
        b.note
          ? `<hr /><div class="receipt__row"><strong>Note:</strong> <span>${esc(
              b.note
            )}</span></div>`
          : ""
      }
      <hr />
      <div class="receipt__row"><strong>Status:</strong> <span>${esc(
        b.status || "PENDING"
      )}</span></div>
    `;
  }

  // ---------------- Init (with retry to prevent refresh glitches) ----------------
  async function init() {
    try {
      initTheme();
      initLanguage();

      await initNavbarUser();
      await loadNextLesson();
      await loadMyBookings();
      await loadAboutContent();

      if ($("nextLessonContent")) setInterval(loadNextLesson, 10000);
      if ($("myBookings")) setInterval(loadMyBookings, 10000);
    } catch (e) {
      // Hvis backend er cold-start, prøv igen automatisk
      console.warn("Init failed (probably cold start). Retrying...", e);
      setTimeout(init, 1500);
    }
  }

  document.addEventListener("DOMContentLoaded", init);

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      setStatus("");

      const payload = {
        address: $("address")?.value?.trim() || "",
        date: $("date")?.value || "",
        startTime: $("time")?.value || "",
        durationMin: Number($("duration")?.value || 0),
        lessonType: $("lessonType")?.value || "Kørelektion",
        note: $("note")?.value?.trim() || "",
      };

      if (
        !payload.address ||
        !payload.date ||
        !payload.startTime ||
        !payload.durationMin
      ) {
        setStatus(t("fillAll"), "error");
        return;
      }

      if (!allowedLocations.includes(payload.address)) {
        setStatus(t("invalidLocation"), "error");
        return;
      }

      const { res, data } = await api("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 409 && data?.error === "TIME_TAKEN") {
          setStatus(data?.message || t("timeTaken"), "error");
        } else {
          setStatus(data?.error || t("bookingFailed"), "error");
        }
        return;
      }

      renderReceipt(data);
      setStatus(t("bookingSent"), "success");
      loadMyBookings();
      loadNextLesson();
    });
  }
})();
