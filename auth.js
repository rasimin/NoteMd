'use strict';
// Login sederhana. Kredensial ada di auth.json (folder aplikasi). Jika belum ada, dibuat otomatis dengan akun bawaan
// admin / admin123. Ganti password dengan mengedit auth.json (berlaku tanpa restart; sesi lama jadi tidak berlaku).
//   { "enabled": true, "sessionDays": 30, "users": [ { "username": "admin", "password": "admin123" } ], "secret": "..." }
//   "enabled": false mematikan login. "secret" dibuat otomatis (menandatangani cookie sesi), jangan dibagikan.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { APP_DIR } = require('./config');

const AUTH_FILE = path.join(APP_DIR, 'auth.json');
const COOKIE = 'ainote_session';
const DEFAULTS = { enabled: true, sessionDays: 30, users: [{ username: 'admin', password: 'admin123' }] };
const MEMORY_SECRET = crypto.randomBytes(32).toString('hex'); // cadangan jika auth.json tidak bisa ditulis

let cache = null; // { mtimeMs, cfg }

function writeFile(raw) {
  const tmp = `${AUTH_FILE}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(raw, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, AUTH_FILE);
}

function normalize(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const users = (Array.isArray(o.users) ? o.users : []).filter(
    (u) => u && typeof u.username === 'string' && u.username && typeof u.password === 'string' && u.password
  );
  return {
    enabled: o.enabled !== false,
    sessionDays: Number.isFinite(o.sessionDays) && o.sessionDays > 0 ? o.sessionDays : 30,
    secret: typeof o.secret === 'string' && o.secret.length >= 32 ? o.secret : '',
    users,
  };
}

function statOrNull() {
  try {
    return fs.statSync(AUTH_FILE);
  } catch {
    return null;
  }
}

// Dibaca ulang otomatis bila auth.json berubah.
function load() {
  let st = statOrNull();
  if (cache && st && cache.mtimeMs === st.mtimeMs) return cache.cfg;

  let raw;
  if (!st) {
    raw = { ...DEFAULTS, secret: crypto.randomBytes(32).toString('hex') };
    try {
      writeFile(raw);
      st = statOrNull();
      console.log(`auth.json dibuat dengan akun bawaan (admin / admin123): ${AUTH_FILE}`);
    } catch (err) {
      console.error('auth.json tidak bisa dibuat:', err.message);
    }
  } else {
    try {
      raw = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8').replace(/^﻿/, ''));
    } catch (err) {
      // Gagal baca: tetap minta login tetapi tanpa akun, supaya tidak terbuka tanpa sengaja.
      console.error('auth.json tidak bisa dibaca, login ditutup sampai diperbaiki:', err.message);
      const cfg = { enabled: true, sessionDays: 30, secret: MEMORY_SECRET, users: [] };
      cache = { mtimeMs: st.mtimeMs, cfg };
      return cfg;
    }
    if (raw && typeof raw === 'object' && !(typeof raw.secret === 'string' && raw.secret.length >= 32)) {
      raw.secret = crypto.randomBytes(32).toString('hex');
      try {
        writeFile(raw);
        st = statOrNull() || st;
      } catch {}
    }
  }

  const cfg = normalize(raw);
  if (!cfg.secret) cfg.secret = MEMORY_SECRET;
  if (cfg.enabled && !cfg.users.length) console.error('auth.json: belum ada akun yang valid (username dan password), tidak ada yang bisa login.');
  cache = { mtimeMs: st ? st.mtimeMs : 0, cfg };
  return cfg;
}

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const safeEq = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

// Mengembalikan username jika cocok, selain itu null. Semua akun selalu dibandingkan (waktu tetap).
function verify(username, password) {
  let found = null;
  for (const u of load().users) {
    const okUser = safeEq(u.username, username);
    const okPass = safeEq(u.password, password);
    if (okUser && okPass) found = u.username;
  }
  return found;
}

// Cookie sesi bertanda tangan. Kuncinya memuat password akun, jadi mengganti password membatalkan sesi lama.
const keyFor = (cfg, u) => crypto.createHash('sha256').update(`${cfg.secret}\0${u.password}`).digest();

function makeToken(username) {
  const cfg = load();
  const u = cfg.users.find((x) => x.username === username);
  if (!u) return '';
  const data = Buffer.from(JSON.stringify({ u: username, e: Date.now() + cfg.sessionDays * 86400000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', keyFor(cfg, u)).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function userFromToken(token) {
  try {
    const [data, sig] = String(token || '').split('.');
    if (!data || !sig) return null;
    const p = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!p || typeof p.u !== 'string' || !(p.e > Date.now())) return null;
    const cfg = load();
    const u = cfg.users.find((x) => x.username === p.u);
    if (!u) return null;
    const want = crypto.createHmac('sha256', keyFor(cfg, u)).update(data).digest();
    const got = Buffer.from(sig, 'base64url');
    if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
    return p.u;
  } catch {
    return null;
  }
}

function cookieOf(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return '';
      }
    }
  }
  return '';
}

const currentUser = (req) => userFromToken(cookieOf(req, COOKIE));
const sessionCookie = (token) => `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.round(load().sessionDays * 86400)}`;
const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;

// Batas percobaan gagal per alamat: 5 kali dalam 10 menit, lalu dikunci 5 menit.
const fails = new Map();
const MAX_FAILS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const LOCK_MS = 5 * 60 * 1000;

function lockedFor(ip) {
  const f = fails.get(ip);
  return f && f.lockedUntil > Date.now() ? Math.ceil((f.lockedUntil - Date.now()) / 1000) : 0;
}
function recordFail(ip) {
  const now = Date.now();
  if (fails.size > 1000) for (const [k, v] of fails) if (now - v.first > WINDOW_MS && v.lockedUntil < now) fails.delete(k);
  let f = fails.get(ip);
  if (!f || (now - f.first > WINDOW_MS && f.lockedUntil < now)) f = { n: 0, first: now, lockedUntil: 0 };
  f.n += 1;
  if (f.n >= MAX_FAILS) f.lockedUntil = now + LOCK_MS;
  fails.set(ip, f);
}
const recordOk = (ip) => fails.delete(ip);

const isEnabled = () => load().enabled;
const usesDefaultPassword = () => load().users.some((u) => u.username === 'admin' && u.password === 'admin123');

module.exports = { AUTH_FILE, isEnabled, verify, makeToken, currentUser, sessionCookie, clearCookie, lockedFor, recordFail, recordOk, usesDefaultPassword };
