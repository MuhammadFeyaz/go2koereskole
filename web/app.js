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

  // ---------- Locations (loaded from backend) ----------
  let allowedLocations = [];
  const fallbackLocations = ["Valby St.", "Brøndby", "Amager", "Glostrup"];

  async function loadLocations() {
    const { res, data } = await api("/api/locations");
    if (!res.ok) {
      allowedLocations = fallbackLocations.slice();
      return allowedLocations;
    }
    const list = Array.isArray(data.locations) ? data.locations : [];
    allowedLocations = list.length ? list : fallbackLocations.slice();
    return allowedLocations;
  }

  // ---------------- I18N (DA/EN) ----------------
  const translations = {
    da: {
      siteTitle: "go2køreskole",
      brandName: "go2køreskole",

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
      hoursLine1: "Man–Fre: 08–20",
      hoursLine2: "Lørdag: 10–16",
      hoursLine3: "Søndag: Lukket",

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

      footerTag: "Køreskole booking",

      aboutTitle: "Om Go2 Køreskole i København",
      aboutP1: "Velkommen hos Go2 Køreskole i København! Mit navn er Karim, og jeg er ejer af køreskolen – så det er dermed mig, du kommer til at få som kørelærer.",
      aboutP2: "Jeg er oprindeligt uddannet socialrådgiver, men har sidenhen valgt at skifte spor og få en levevej i køreskolebranchen.",
      aboutP3: "Jeg har god empati og er god til at håndtere elevers individuelle problemer, så de får en så god proces som mulig. Jeg tager mit arbejde seriøst, men ønsker samtidig, at det skal være en sjov og lærerig proces at få kørekort!"
    },

    en: {
      siteTitle: "go2 driving school",
      brandName: "go2koereskole",

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
      hoursLine1: "Mon–Fri: 08–20",
      hoursLine2: "Saturday: 10–16",
      hoursLine3: "Sunday: Closed",

      nextLessonTitle: "Your upcoming lesson",
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

      footerTag: "Driving school booking",

      aboutTitle: "About Go2 Driving School in Copenhagen",
      aboutP1: "Welcome to Go2 Driving School in Copenhagen! My name is Karim, and I own the school — so I’ll be your instructor.",
      aboutP2: "I was originally trained as a social worker, but later switched paths and found my career in the driving school industry.",
      aboutP3: "I’m empathetic and good at supporting students individually so they get the best possible learning process. I take my work seriously, but I also want it to be fun and educational!"
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

    // ✅ oversæt titel
    if (dict.siteTitle) document.title = dict.siteTitle;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      const val = dict[key];
      if (val == null) return;
      el.textContent = String(val);
    });

    const langText = $("langText");
    if (langText) langText.textContent = lang.toUpperCase();

    // keep theme button label correct
    const theme = document.documentElement.getAttribute("data-theme") || "light";
    const themeText = $("themeText");
    if (themeText) themeText.textContent = theme === "dark" ? dict.themeLight : dict.themeDark;

    // booking select placeholder
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

    btn.addEventListener("click", async () => {
      const current = getLang();
      const next = current === "da" ? "en" : "da";
      setLang(next);
      applyI18n(next);
      await loadNextLessons();
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
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

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

  // ---------------- MOBILE NAV ----------------
  function initMobileNav() {
    const nav = document.querySelector(".nav");
    const btn = $("navToggle");
    const menu = $("navMenu");
    if (!nav || !btn || !menu) return;

    const close = () => {
      nav.classList.remove("nav--open");
      btn.setAttribute("aria-expanded", "false");
    };

    btn.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("nav--open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));

    document.addEventListener("click", (e) => {
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

  // ---------------- NEXT LESSONS ----------------
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

  // ---------------- Booking select ----------------
  function initLocationsSelect() {
    const address = $("address");
    if (!address || address.tagName !== "SELECT") return;

    address.innerHTML = `
      <option value="">${esc(t("pickLocation"))}</option>
      ${allowedLocations.map((loc) => `<option value="${esc(loc)}">${esc(loc)}</option>`).join("")}
    `;
  }

  // ---------------- INIT ----------------
  async function init() {
    initTheme();
    initLanguage();
    initMobileNav();
    await initNavbarUser();

    // locations for booking page
    await loadLocations();
    initLocationsSelect();

    await loadNextLessons();
  }

  init();
})();
