"use strict";

const path = require("path");
const fs = require("fs");
const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");

const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const COOKIE_NAME = "noteoving_session";
const COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 180; // 180 dager

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, "noteoving.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    client_session_id TEXT NOT NULL,
    date TEXT NOT NULL,
    seconds INTEGER NOT NULL,
    notes INTEGER NOT NULL,
    ts INTEGER NOT NULL,
    UNIQUE(user_id, client_session_id)
  );
`);

const insertUser = db.prepare(
  "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)"
);
const findUserByUsername = db.prepare("SELECT * FROM users WHERE username = ?");
const findUserById = db.prepare("SELECT * FROM users WHERE id = ?");
const upsertSession = db.prepare(`
  INSERT INTO sessions_log (user_id, client_session_id, date, seconds, notes, ts)
  VALUES (@user_id, @client_session_id, @date, @seconds, @notes, @ts)
  ON CONFLICT(user_id, client_session_id)
  DO UPDATE SET date=excluded.date, seconds=excluded.seconds, notes=excluded.notes, ts=excluded.ts
`);
const selectHistoryForUser = db.prepare(
  "SELECT date, seconds, notes, ts, client_session_id FROM sessions_log WHERE user_id = ? ORDER BY ts ASC"
);

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

function signToken(user) {
  return jwt.sign({ uid: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: "180d",
  });
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

function authOptional(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = findUserById.get(payload.uid);
      if (user) req.user = { id: user.id, username: user.username };
    } catch (e) {
      // ugyldig/utløpt token - behandles som ikke innlogget
    }
  }
  next();
}
app.use(authOptional);

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Ikke innlogget." });
  next();
}

function validateCredentials(username, password) {
  if (typeof username !== "string" || typeof password !== "string") return "Ugyldig input.";
  if (username.trim().length < 2) return "Brukernavn må ha minst 2 tegn.";
  if (password.length < 4) return "Passord må ha minst 4 tegn.";
  return null;
}

app.post("/api/register", (req, res) => {
  const { username, password } = req.body || {};
  const err = validateCredentials(username, password);
  if (err) return res.status(400).json({ error: err });

  const cleanUsername = username.trim();
  const existing = findUserByUsername.get(cleanUsername);
  if (existing) return res.status(409).json({ error: "Brukernavnet er allerede i bruk." });

  const hash = bcrypt.hashSync(password, 10);
  const info = insertUser.run(cleanUsername, hash, Date.now());
  const user = { id: info.lastInsertRowid, username: cleanUsername };
  setAuthCookie(res, signToken(user));
  res.json({ username: user.username });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  const err = validateCredentials(username, password);
  if (err) return res.status(400).json({ error: err });

  const user = findUserByUsername.get(username.trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Feil brukernavn eller passord." });
  }
  setAuthCookie(res, signToken(user));
  res.json({ username: user.username });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

app.get("/api/me", (req, res) => {
  res.json({ username: req.user ? req.user.username : null });
});

app.get("/api/history", requireAuth, (req, res) => {
  const rows = selectHistoryForUser.all(req.user.id);
  const byDate = {};
  for (const row of rows) {
    if (!byDate[row.date]) byDate[row.date] = [];
    byDate[row.date].push({
      seconds: row.seconds,
      notes: row.notes,
      ts: row.ts,
      sessionId: row.client_session_id,
    });
  }
  res.json(byDate);
});

app.post("/api/history", requireAuth, (req, res) => {
  const { sessionId, date, seconds, notes } = req.body || {};
  if (
    typeof sessionId !== "string" || !sessionId ||
    typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    typeof seconds !== "number" || !isFinite(seconds) ||
    typeof notes !== "number" || !isFinite(notes)
  ) {
    return res.status(400).json({ error: "Ugyldig data." });
  }
  upsertSession.run({
    user_id: req.user.id,
    client_session_id: sessionId,
    date: date,
    seconds: Math.round(seconds),
    notes: Math.round(notes),
    ts: Date.now(),
  });
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`noteoving server listening on :${PORT}`);
});
