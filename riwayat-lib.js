'use strict';
// Riwayat versi catatan. Setiap versi disimpan sebagai salinan terkompresi (gzip) di
// _riwayat/<path catatan>/<waktu>_<hash>_<label>.md.gz. Tanpa database dan tanpa git.
// Dipakai bersama oleh server.js dan skrip riwayat.js.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const HIST = '_riwayat';
const MAX_VERSIONS = 50;
const NAME_RE = /^(\d{8}-\d{6})_([0-9a-f]{10})_([a-z]+)\.md\.gz$/;
const ID_RE = /^\d{8}-\d{6}_[0-9a-f]{10}_[a-z]+$/;

function histDir(root, rel) {
  return path.join(root, HIST, ...String(rel).split('/'));
}

function stampOf(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function timeOfStamp(s) {
  const m = s.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime() : 0;
}

function hashOf(buf) {
  return crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);
}

// Daftar versi, terbaru di atas.
function list(root, rel) {
  let names;
  try {
    names = fs.readdirSync(histDir(root, rel));
  } catch {
    return [];
  }
  const out = [];
  for (const n of names) {
    const m = n.match(NAME_RE);
    if (!m) continue;
    let size = 0;
    try {
      size = fs.statSync(path.join(histDir(root, rel), n)).size;
    } catch {}
    out.push({ id: n.replace(/\.md\.gz$/, ''), stamp: m[1], time: timeOfStamp(m[1]), hash: m[2], label: m[3], size });
  }
  return out.sort((a, b) => (a.id < b.id ? 1 : -1));
}

function hasHistory(root, rel) {
  return list(root, rel).length > 0;
}

// Catat isi file sekarang sebagai versi baru jika beda dengan versi terakhir.
// label: app (disimpan lewat aplikasi), luar (diubah di luar aplikasi), baru, pulih, awal.
function record(root, rel, label = 'app') {
  const file = path.join(root, ...String(rel).split('/'));
  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch {
    return { changed: false, missing: true };
  }
  const versions = list(root, rel);
  const hash = hashOf(buf);
  if (versions.length && versions[0].hash === hash) return { changed: false, id: versions[0].id };
  if (!versions.length && label === 'luar') label = 'awal';
  const dir = histDir(root, rel);
  fs.mkdirSync(dir, { recursive: true });
  // Waktu harus selalu lebih baru dari versi terakhir, supaya urutan daftar benar.
  let ms = Date.now();
  while (versions.length && stampOf(ms) <= versions[0].stamp) ms += 1000;
  const id = `${stampOf(ms)}_${hash}_${label}`;
  fs.writeFileSync(path.join(dir, id + '.md.gz'), zlib.gzipSync(buf, { level: 9 }));
  prune(root, rel);
  return { changed: true, id };
}

function prune(root, rel, max = MAX_VERSIONS) {
  const versions = list(root, rel);
  for (const v of versions.slice(max)) {
    try {
      fs.unlinkSync(path.join(histDir(root, rel), v.id + '.md.gz'));
    } catch {}
  }
}

function read(root, rel, id) {
  if (!ID_RE.test(String(id))) return null;
  try {
    return zlib.gunzipSync(fs.readFileSync(path.join(histDir(root, rel), id + '.md.gz'))).toString('utf8');
  } catch {
    return null;
  }
}

function rmEmptyParents(root, dir) {
  const stop = path.join(root, HIST);
  let cur = dir;
  while (cur.startsWith(stop + path.sep)) {
    try {
      if (fs.readdirSync(cur).length) return;
      fs.rmdirSync(cur);
    } catch {
      return;
    }
    cur = path.dirname(cur);
  }
}

// Pindahkan riwayat (catatan atau folder) ke path baru. true jika berhasil atau tidak ada riwayat.
function move(root, fromRel, toRel) {
  const from = histDir(root, fromRel);
  const to = histDir(root, toRel);
  if (!fs.existsSync(from)) return true;
  if (fs.existsSync(to)) return false;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
  rmEmptyParents(root, path.dirname(from));
  return true;
}

// Pindahkan riwayat ke folder sembarang (untuk Sampah) dan sebaliknya.
function moveTo(root, fromRel, absDest) {
  const from = histDir(root, fromRel);
  if (!fs.existsSync(from) || fs.existsSync(absDest)) return false;
  fs.mkdirSync(path.dirname(absDest), { recursive: true });
  fs.renameSync(from, absDest);
  rmEmptyParents(root, path.dirname(from));
  return true;
}
function moveFrom(root, absSrc, toRel) {
  const to = histDir(root, toRel);
  if (!fs.existsSync(absSrc) || fs.existsSync(to)) return false;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(absSrc, to);
  return true;
}

module.exports = { HIST, MAX_VERSIONS, histDir, list, hasHistory, record, prune, read, move, moveTo, moveFrom };
