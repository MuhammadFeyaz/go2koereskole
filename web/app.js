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

  // ---------- Locations from backend ----------
  let allowedLocations = [];

  async function loadLocations() {
    const { res, data } = await api("/api/locations");
    if (!res.ok) return [];
    const list = Array.isArray(data.locations) ? data.locations : [];
    allowedLocations = list;
    return list;
  }

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
      navMenu: "Menu",

      heroTitle: "Book din kørelektion nemt 🚗",
      heroText: "Vælg dato og tidspunkt — få svar hurtigt.",
      heroCTA1: "Gå til booking",
      heroCTA2: "Se priser",

      hoursTitle: "Åbningstider",

      nextLessonTitle: "Din kommende køretime",
      nextLessonLogin: "Log ind for at se dine kommende tider.",
      nextLessonCta: "Gå til booking",
      nextLessonNone: "Du har ingen kommende køretimer.",
      nextLessonNoApproved: "Du har ingen godkendte køretimer endnu.",

      bookingTitle: "Booking",
      bookingIntro: "Udfyld formularen og afvent godkendelse.",
      fillAll: "Udfyld venligst alle felter.",
      invalidLocation: "Vælg venligst et gyldigt mødested.",
      bookingSent: "✅ Booking sendt! Afventer godkendelse.",
      bookingFailed: "Booking fejlede.",
      timeTaken: "Tiden overlapper med en anden booking. Vælg et andet tidspunkt.",
      cannotLoadMyBookings: "Kunne ikke hente dine bookinger.",
      noneYet: "Ingen bookinger endnu.",

      pickLocation: "Vælg lokation...",
      meetingPlace: "Vælg mødested",
      date: "Dato",
      time: "Tidspunkt",
      duration: "Varighed",
      type: "Type",
      note: "Note (valgfri)",
      confirmBooking: "Bekræft booking",

      footerTag: "Køreskole booking",

      aboutTitle: "Om Go2 Køreskole i København",
      aboutP1:
        "Velkommen hos Go2 Køreskole i København! Mit navn er Karim, og jeg er ejer af køreskolen – så det er dermed mig, du kommer til at få som kørelærer.",
      aboutP2:
        "Jeg er oprindeligt uddannet socialrådgiver, men har sidenhen valgt at skifte spor og få en levevej i køreskolebranchen.",
      aboutP3:
        "Jeg har god empati og er god til at håndtere elevers individuelle problemer, så de får en så god proces som mulig. Jeg tager mit arbejde seriøst, men ønsker samtidig, at det skal være en sjov og lærerig proces at få kørekort!",
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
      navMenu: "Menu",

      heroTitle: "Book your driving lesson easily 🚗",
      heroText: "Choose date and time — get a quick reply.",
      heroCTA1: "Go to booking",
      heroCTA2: "See prices",

      hoursTitle: "Opening hours",

      nextLessonTitle: "Your upcoming lessons",
      nextLessonLogin: "Log in to see your upcoming lessons.",
      nextLessonCta: "Go to booking",
      nextLessonNone: "You have no upcoming lessons.",
      nextLessonNoApproved: "You don’t have any approved lessons yet.",

      bookingTitle: "Booking",
      bookingIntro: "Fill out the form and wait for approval.",
      fillAll: "Please fill in all fields.",
      invalidLocation: "Please select a valid meeting place.",
      bookingSent: "✅ Booking sent! Waiting for approval.",
      bookingFailed: "Booking failed.",
      timeTaken: "This time overlaps an existing booking. Choose another time.",
      cannotLoadMyBookings: "Could not load your bookings.",
      noneYet: "No bookings yet.",

      pickLocation: "Choose location...",
      meetingPlace: "Meeting place",
      date: "Date",
      time: "Time",
      duration: "Duration",
      type: "Type",
      note: "Note (optional)",
      confirmBooking: "Confirm booking",

      footerTag: "Driving school booking",

      aboutTitle: "About Go2 Driving School in Copenhagen",
      aboutP1:
        "Welcome to Go2 Driving School in Copenhagen! My name is Karim, and I own the school — so I’ll be your instructor.",
      aboutP2:
        "I was originally trained as a social worker, but later switched paths and found my career in the driving school industry.",
      aboutP3:
        "I’m empathetic and good at supporting students individually so they get the best possible learning process. I take my work seriously, but I also want it to be fun and educational!",
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
    if (themeText) themeText.textContent = theme === "dark" ? dict.themeLight : dict.themeDark;

    const addrSelect = $("address");
    if (addrSelect && addrSelect.tagName === "SELECT") {
      const opt0 = addrSelect.querySelector('option[value=""]');
      if (opt0) opt0.textContent = dict.pickLocation;
    }
  }

  function initLanguage() {
    applyI18n(getLang());

    const btn = $("langToggle");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const current = getLang();
      const next = current === "da" ? "en" : "da";
      setLang(next);
      applyI18n(next);
      loadNextLessons();
    });
  }

  // ---------------- THEME ----------------
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
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = saved || (prefersDark ? "dark" : "light");
    applyTheme(initial);

    const btn = $("themeToggle");
    if (!btn) return;

    btn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      applyTheme(next);
    });

    if (!saved && window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener?.("change", (e) => applyTheme(e.matches ? "dark" : "light"));
    }
  }

  // ---------------- MOBILE NAV (FIX) ----------------
  function initMobileNav() {
    const nav = document.querySelector(".nav");
    const btn = $("navToggle");
    const menu = $("navMenu");
    if (!nav || !btn || !menu) return;

    const close = () => {
      nav.classList.remove("nav--open");
      btn.setAttribute("aria-expanded", "false");
    };

    btn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation(); // ✅ prevents instant close
        const isOpen = nav.classList.toggle("nav--open");
        btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      },
      { passive: false }
    );

    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));

    document.addEventListener("click", (e) => {
      if (!nav.classList.contains("nav--open")) return;
      if (!nav.contains(e.target)) close();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 860) close();
    });
  }

  // ---------------- NAVBAR USER ----------------
  async function initNavbarUser() {
    const navText = $("navUserText");
    const loginBtn = $("navLoginBtn");
    const logoutBtn = $("navLogoutBtn");
    if (!navText || !loginBtn || !logoutBtn) return;

    const { data } = await api("/api/auth/me");
    const user = data.user;

    if (!user) {
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

  // ---------------- NEXT LESSONS (index.html) ----------------
  async function loadNextLessons() {
    const el = $("nextLessonContent");
    if (!el) return;

    const { data: meData } = await api("/api/auth/me");
    if (!meData?.user) {
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
      const hasApproved = list.some((b) => String(b.status || "").toUpperCase() === "APPROVED");
      el.textContent = hasApproved ? t("nextLessonNone") : t("nextLessonNoApproved");
      return;
    }

    el.innerHTML = `
      <div class="next-lesson-list">
        ${upcomingApproved
          .map(
            (b) => `
          <div class="next-lesson-badge">
            <div><strong>${esc(b.date)} • ${esc(b.startTime)} • ${esc(b.durationMin)} min</strong></div>
            <div class="muted">${esc(b.lessonType || "Kørelektion")} • ${esc(b.address || "-")}</div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  // ---------------- BOOKINGS LIST (booking.html) ----------------
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

    list.sort((a, b) => `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`));

    el.innerHTML = `
      <div style="display:grid; gap:10px;">
        ${list
          .map(
            (b) => `
          <div class="card" style="padding:14px;">
            <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
              <div><strong>${esc(b.lessonType || "Kørelektion")}</strong> – ${esc(b.date)} kl. ${esc(b.startTime)}</div>
              <div class="muted"><strong>${badge(b.status)}</strong></div>
            </div>
            <div class="muted" style="margin-top:6px;">
              ${esc(b.durationMin)} min • ${esc(b.address)}
            </div>
            ${b.note ? `<div class="muted" style="margin-top:6px;">Note: ${esc(b.note)}</div>` : ""}
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  // ---------------- Booking form ----------------
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
      <div class="receipt__row"><strong>Type:</strong> <span>${esc(b.lessonType || "-")}</span></div>
      <div class="receipt__row"><strong>${esc(t("date"))}:</strong> <span>${esc(b.date || "-")}</span></div>
      <div class="receipt__row"><strong>${esc(t("time"))}:</strong> <span>${esc(b.startTime || "-")}</span></div>
      <div class="receipt__row"><strong>${esc(t("duration"))}:</strong> <span>${esc(b.durationMin ?? "-")} min</span></div>
      <div class="receipt__row"><strong>${esc(t("meetingPlace"))}:</strong> <span>${esc(b.address || "-")}</span></div>
      ${b.note ? `<hr /><div class="receipt__row"><strong>${esc(t("note"))}:</strong> <span>${esc(b.note)}</span></div>` : ""}
      <hr />
      <div class="receipt__row"><strong>Status:</strong> <span>${esc(b.status || "PENDING")}</span></div>
    `;
  }

  async function initLocationsSelect() {
    const address = $("address");
    if (!address || address.tagName !== "SELECT") return;

    const list = await loadLocations();

    address.innerHTML = `
      <option value="">${esc(t("pickLocation"))}</option>
      ${list.map((loc) => `<option value="${esc(loc)}">${esc(loc)}</option>`).join("")}
    `;
  }

  async function init() {
    initTheme();
    initLanguage();
    initMobileNav();
    await initNavbarUser();

    await initLocationsSelect();

    await loadNextLessons();
    if ($("nextLessonContent")) setInterval(loadNextLessons, 10000);

    await loadMyBookings();
    if ($("myBookings")) setInterval(loadMyBookings, 10000);
  }

  init();

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

      if (!payload.address || !payload.date || !payload.startTime || !payload.durationMin) {
        setStatus(t("fillAll"), "error");
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
        } else if (res.status === 400 && data?.error === "INVALID_LOCATION") {
          setStatus(t("invalidLocation"), "error");
        } else {
          setStatus(data?.error || t("bookingFailed"), "error");
        }
        return;
      }

      renderReceipt(data);
      setStatus(t("bookingSent"), "success");
      loadMyBookings();
      loadNextLessons();
    });
  }
})();
