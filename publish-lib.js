'use strict';
// Penyimpanan token link publik (tanpa login, khusus 1 catatan yang di-publish).
// Disimpan di APP/published.json (diabaikan git).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { APP_DIR } = require('./config');

const PUB_FILE = path.join(APP_DIR, 'published.json');
let cache = null; // { mtimeMs, data }

function readData() {
  let st = null;
  try {
    st = fs.statSync(PUB_FILE);
  } catch {
    return { tokens: {} };
  }
  if (cache && cache.mtimeMs === st.mtimeMs) return cache.data;
  try {
    const raw = JSON.parse(fs.readFileSync(PUB_FILE, 'utf8').replace(/^\uFEFF/, ''));
    const tokens = raw && typeof raw.tokens === 'object' && raw.tokens ? raw.tokens : {};
    const data = { tokens };
    cache = { mtimeMs: st.mtimeMs, data };
    return data;
  } catch {
    return { tokens: {} };
  }
}

function writeData(data) {
  const tmp = `${PUB_FILE}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, PUB_FILE);
  try {
    const st = fs.statSync(PUB_FILE);
    cache = { mtimeMs: st.mtimeMs, data };
  } catch {
    cache = null;
  }
}

function findTokenForPath(tokens, rel) {
  for (const [tok, entry] of Object.entries(tokens)) {
    if (entry && entry.path === rel) return tok;
  }
  return null;
}

function getStatus(rel) {
  const data = readData();
  const token = findTokenForPath(data.tokens, rel);
  return { published: !!token, token };
}

function publish(rel) {
  const data = readData();
  let token = findTokenForPath(data.tokens, rel);
  if (token) return { published: true, token };
  token = crypto.randomBytes(16).toString('base64url');
  data.tokens[token] = { path: rel, createdAt: Date.now() };
  writeData(data);
  return { published: true, token };
}

function unpublish(rel) {
  const data = readData();
  let changed = false;
  for (const [tok, entry] of Object.entries(data.tokens)) {
    if (entry && entry.path === rel) {
      delete data.tokens[tok];
      changed = true;
    }
  }
  if (changed) writeData(data);
  return { published: false, token: null };
}

function resolveToken(token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{12,64}$/.test(token)) return null;
  const entry = readData().tokens[token];
  return entry && typeof entry.path === 'string' ? entry.path : null;
}

module.exports = { PUB_FILE, getStatus, publish, unpublish, resolveToken };
