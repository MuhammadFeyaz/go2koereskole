import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET || "devsecret"));

/** ---------------- Sessions ---------------- */
app.use(
  session({
    name: "go2.sid",
    secret: process.env.COOKIE_SECRET || "devsecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // true hvis https
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 dage
    }
  })
);

/** ---------------- Paths ---------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// WEB folder ligger ved siden af server-folderen: go2koreskole-web/web
const WEB_DIR = path.resolve(__dirname, "..", "web");

// Server statiske filer (css/js/html)
app.use(express.static(WEB_DIR));

/** Eksplicitte routes */
app.get("/", (req, res) => res.sendFile(path.join(WEB_DIR, "login.html")));
app.get("/login.html", (req, res) => res.sendFile(path.join(WEB_DIR, "login.html")));
app.get("/admin.html", (req, res) => res.sendFile(path.join(WEB_DIR, "admin.html")));
app.get("/index.html", (req, res) => res.sendFile(path.join(WEB_DIR, "index.html")));
app.get("/booking.html", (req, res) => res.sendFile(path.join(WEB_DIR, "booking.html")));
app.get("/priser.html", (req, res) => res.sendFile(path.join(WEB_DIR, "priser.html")));
app.get("/kontakt.html", (req, res) => res.sendFile(path.join(WEB_DIR, "kontakt.html")));

/** ---------------- In-memory “DB” ---------------- */
const students = new Map(); // key=emailLower -> student
const bookings = new Map(); // key=id -> booking

function nowId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sanitizeUser(u) {
  return { id: u.id, role: u.role, email: u.email, name: u.name, phone: u.phone || "" };
}

function getAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return null;
  return {
    id: "admin-1",
    role: "admin",
    email,
    name: "Admin",
    password
  };
}

/** ---------------- Locations (fixed 4) ---------------- */
const ALLOWED_LOCATIONS = [
  "Valby – Langgade St.",
  "Nørrebro – Nørrebro Station",
  "Amager – Sundbyvester Plads",
  "Hvidovre – Friheden Station"
];

/** ---------------- Content: About text (DA/EN) ---------------- */
const ABOUT_CONTENT = {
  da: {
    title: "Om Go2 Køreskole i København",
    p1: "Velkommen hos Go2 Køreskole i København! Mit navn er Karim, og jeg er ejer af køreskolen – så det er dermed mig, du kommer til at få som kørelærer.",
    p2: "Jeg er oprindeligt uddannet socialrådgiver, men har sidenhen valgt at skifte spor og få en levevej i køreskolebranchen.",
    p3: "Jeg har god empati og er god til at håndtere elevers individuelle problemer, så de får en så god proces som mulig. Jeg tager mit arbejde seriøst, men ønsker samtidig, at det skal være en sjov og lærerig proces at få kørekort!"
  },
  en: {
    title: "About Go2 Driving School in Copenhagen",
    p1: "Welcome to Go2 Driving School in Copenhagen! My name is Karim, and I’m the owner of the school—so I’ll be your driving instructor.",
    p2: "I originally trained as a social worker, but later chose to change direction and build my career in the driving school industry.",
    p3: "I’m empathetic and good at handling students’ individual challenges, so you get the best possible learning process. I take my work seriously, but I also want getting your license to be fun and educational!"
  }
};

// Hent “about” tekst. Brug ?lang=da eller ?lang=en (default: da)
app.get("/api/content/about", (req, res) => {
  const lang = String(req.query.lang || "da").toLowerCase();
  const content = ABOUT_CONTENT[lang] || ABOUT_CONTENT.da;
  res.json(content);
});

/** ---------------- Guards ---------------- */
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "NOT_LOGGED_IN" });
  next();
}
function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ error: "NOT_LOGGED_IN" });
    if (req.session.user.role !== role) return res.status(403).json({ error: "FORBIDDEN" });
    next();
  };
}

/** ---------------- Helpers: overlap check ---------------- */
function toDateTime(dateStr, timeStr) {
  // date: YYYY-MM-DD, time: HH:mm
  const dt = new Date(`${dateStr}T${timeStr}`);
  return isNaN(dt) ? null : dt;
}

function intervalsOverlap(startA, endA, startB, endB) {
  // overlap if startA < endB AND startB < endA
  return startA < endB && startB < endA;
}

function hasOverlap(newBooking) {
  const ns = toDateTime(newBooking.date, newBooking.startTime);
  if (!ns) return false;

  const ne = new Date(ns.getTime() + Number(newBooking.durationMin) * 60000);

  for (const b of bookings.values()) {
    // Block against any booking that is NOT denied
    const st = String(b.status || "PENDING").toUpperCase();
    if (st === "DENIED") continue;

    const bs = toDateTime(b.date, b.startTime);
    if (!bs) continue;
    const be = new Date(bs.getTime() + Number(b.durationMin) * 60000);

    if (intervalsOverlap(ns, ne, bs, be)) {
      return true;
    }
  }
  return false;
}

/** ---------------- Auth ---------------- */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "MISSING_FIELDS" });

    const emailLower = String(email).toLowerCase().trim();

    // Admin login (.env)
    const admin = getAdminUser();
    if (admin && admin.email.toLowerCase() === emailLower && admin.password === password) {
      req.session.user = sanitizeUser(admin);
      return res.json({ ok: true, user: req.session.user });
    }

    // Student login (created by admin)
    const stu = students.get(emailLower);
    if (!stu) return res.status(401).json({ error: "INVALID_LOGIN" });

    const ok = await bcrypt.compare(String(password), stu.passwordHash);
    if (!ok) return res.status(401).json({ error: "INVALID_LOGIN" });

    req.session.user = sanitizeUser(stu);
    return res.json({ ok: true, user: req.session.user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "LOGIN_FAILED" });
  }
});

app.get("/api/auth/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("go2.sid");
    res.json({ ok: true });
  });
});

/** ---------------- Admin: students ---------------- */
app.post("/api/admin/students", requireRole("admin"), async (req, res) => {
  const { name, email, phone, password } = req.body || {};
  if (!name || !email || !phone || !password) return res.status(400).json({ error: "MISSING_FIELDS" });

  const emailLower = String(email).toLowerCase().trim();
  if (students.has(emailLower)) return res.status(409).json({ error: "EMAIL_EXISTS" });

  const passwordHash = await bcrypt.hash(String(password), 10);

  const student = {
    id: nowId("stu"),
    role: "student",
    name: String(name).trim(),
    email: emailLower,
    phone: String(phone).trim(),
    passwordHash
  };

  students.set(emailLower, student);

  return res.json({
    ok: true,
    student: { id: student.id, role: student.role, name: student.name, email: student.email, phone: student.phone }
  });
});

app.get("/api/admin/students", requireRole("admin"), (req, res) => {
  const list = [...students.values()].map((s) => ({
    id: s.id,
    role: s.role,
    name: s.name,
    email: s.email,
    phone: s.phone
  }));
  res.json({ students: list });
});

/** ---------------- Booking ---------------- */
// Student creates booking
app.post("/api/bookings", requireRole("student"), (req, res) => {
  const { address, date, startTime, durationMin, note, lessonType } = req.body || {};
  if (!address || !date || !startTime || !durationMin) return res.status(400).json({ error: "MISSING_FIELDS" });

  const addr = String(address).trim();
  if (!ALLOWED_LOCATIONS.includes(addr)) {
    return res.status(400).json({ error: "INVALID_LOCATION" });
  }

  const user = req.session.user;

  const newBooking = {
    id: nowId("bk"),
    studentId: user.id,
    studentEmail: user.email,
    fullName: user.name,
    email: user.email,
    phone: user.phone,
    address: addr,
    date: String(date),
    startTime: String(startTime),
    durationMin: Number(durationMin),
    lessonType: lessonType ? String(lessonType) : "Kørelektion",
    note: note ? String(note) : "",
    status: "PENDING",
    createdAt: new Date().toISOString()
  };

  // Overlap protection (blocks PENDING + APPROVED overlaps)
  if (hasOverlap(newBooking)) {
    return res.status(409).json({
      error: "TIME_TAKEN",
      message: "Tiden overlapper med en anden booking. Vælg et andet tidspunkt."
    });
  }

  bookings.set(newBooking.id, newBooking);
  res.json(newBooking);
});

// Student: my bookings
app.get("/api/bookings/my", requireRole("student"), (req, res) => {
  const user = req.session.user;
  const list = [...bookings.values()]
    .filter((b) => b.studentId === user.id)
    .sort((a, b) => {
      const ad = `${a.date}T${a.startTime}`;
      const bd = `${b.date}T${b.startTime}`;
      return ad < bd ? 1 : -1;
    });

  res.json({ bookings: list });
});

// Admin: all bookings
app.get("/api/admin/bookings", requireRole("admin"), (req, res) => {
  const list = [...bookings.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  res.json({ bookings: list });
});

// Admin approve
app.post("/api/admin/bookings/:id/approve", requireRole("admin"), (req, res) => {
  const b = bookings.get(req.params.id);
  if (!b) return res.status(404).json({ error: "NOT_FOUND" });

  // Approve should also ensure it doesn't conflict with another (approved/pending)
  const clone = { ...b, status: "APPROVED" };
  bookings.delete(b.id);
  const conflict = hasOverlap(clone);
  bookings.set(b.id, b);

  if (conflict) {
    return res.status(409).json({
      error: "TIME_TAKEN",
      message: "Kan ikke godkende: tiden overlapper med en anden booking."
    });
  }

  b.status = "APPROVED";
  res.json({ ok: true, booking: b });
});

// Admin deny
app.post("/api/admin/bookings/:id/deny", requireRole("admin"), (req, res) => {
  const b = bookings.get(req.params.id);
  if (!b) return res.status(404).json({ error: "NOT_FOUND" });
  b.status = "DENIED";
  res.json({ ok: true, booking: b });
});

/** ---------------- Start server ---------------- */
const port = Number(process.env.PORT || 3002);
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Serving static from: ${WEB_DIR}`);
});
