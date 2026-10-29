'use strict';
// Pustaka bersama untuk aplikasi (server.js) dan skrip baris perintah (cari.js, baca.js).
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.env.NOTES_DIR || path.join(__dirname, '..'));

// Metadata di awal file:
// ---
// dibuat: 2026-10-29 16:11
// diubah: 2026-10-29 16:11
// lingkungan: prod        (opsional)
// ringkasan: satu dua kalimat  (disarankan)
// tag: sre, kemenkeu        (disarankan)
// ---
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return { meta, body: text.slice(m[0].length) };
}

function formatDate(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// "2026-10-29 16:11" (atau hanya tanggal) dibaca sebagai waktu lokal komputer ini.
function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(s || '');
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  return isNaN(d.getTime()) ? null : d.getTime();
}

function parseTags(s) {
  return String(s || '')
    .replace(/^\[|\]$/g, '')
    .split(/[,;]/)
    .map((t) => t.trim().replace(/^#/, '').toLowerCase())
    .filter(Boolean);
}

function isHiddenName(name) {
  return name.startsWith('.') || name.startsWith('_') || name === 'node_modules';
}

// Ubah isi file jadi objek catatan (untuk indeks pencarian).
function parseNote(rel, text, st) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const { meta, body } = parseFrontmatter(text);
  const m = body.match(/^#\s+(.+)$/m);
  return {
    path: rel,
    title: m ? m[1].trim() : rel.split('/').pop().replace(/\.md$/i, ''),
    text: body,
    summary: meta.ringkasan || '',
    tags: parseTags(meta.tag || meta.tags),
    env: String(meta.lingkungan || '').toLowerCase(),
    created: parseDate(meta.dibuat) ?? (st ? st.birthtimeMs : 0),
    modified: parseDate(meta.diubah) ?? (st ? st.mtimeMs : 0),
  };
}

// Semua file .md di folder catatan (tanpa folder tersembunyi seperti _app, _trash, _lampiran).
function listNotePaths(root = ROOT) {
  const out = [];
  (function walk(dir, rel) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (isHiddenName(e.name)) continue;
      const childRel = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) walk(path.join(dir, e.name), childRel);
      else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) out.push(childRel);
    }
  })(root, '');
  return out.sort((a, b) => a.localeCompare(b, 'id'));
}

// Lampiran sebuah catatan: <folder catatan>/_lampiran/<nama-file-catatan>/*
// Isi file teks (.sql, .txt, .log, ...) ikut dicari; gambar hanya dicatat namanya.
const TEXT_EXT = new Set(['.sql', '.txt', '.log', '.json', '.csv', '.xml', '.sh', '.ps1', '.yml', '.yaml', '.md', '.cs', '.php', '.js', '.py', '.http']);
const MAX_ATT_TEXT = 300 * 1024;
const attCache = new Map();
function attachmentsOf(root, rel) {
  const segs = rel.replace(/\.md$/i, '').split('/');
  const name = segs.pop();
  const dir = path.join(root, ...segs, '_lampiran', name);
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const e of entries) {
    if (!e.isFile() || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    let text = '';
    if (TEXT_EXT.has(path.extname(e.name).toLowerCase())) {
      try {
        const st = fs.statSync(full);
        if (st.size <= MAX_ATT_TEXT) {
          const c = attCache.get(full);
          if (c && c.mtimeMs === st.mtimeMs && c.size === st.size) text = c.text;
          else {
            text = fs.readFileSync(full, 'utf8');
            attCache.set(full, { mtimeMs: st.mtimeMs, size: st.size, text });
          }
        }
      } catch {}
    }
    out.push({ name: e.name, path: [...segs, '_lampiran', name, e.name].join('/'), text });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, 'id'));
}

function loadAllNotes(root = ROOT) {
  const notes = [];
  for (const rel of listNotePaths(root)) {
    const full = path.join(root, ...rel.split('/'));
    try {
      const n = parseNote(rel, fs.readFileSync(full, 'utf8'), fs.statSync(full));
      n.att = attachmentsOf(root, rel);
      notes.push(n);
    } catch {}
  }
  return notes;
}

function makeSnippet(text, textLower, terms) {
  let idx = -1;
  for (const t of terms) {
    const i = textLower.indexOf(t);
    if (i >= 0 && (idx < 0 || i < idx)) idx = i;
  }
  if (idx < 0) return '';
  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + 120);
  return (
    (start > 0 ? '…' : '') +
    text.slice(start, end).replace(/\s+/g, ' ').trim() +
    (end < text.length ? '…' : '')
  );
}

// Pencarian di judul, tag, ringkasan, path, dan isi.
// opts: { client, env, tag, any (cocok salah satu kata), limit }
function searchNotes(q, notes, opts = {}) {
  const terms = String(q || '').toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
  const limit = opts.limit || 30;
  const pool = notes.filter((n) => {
    if (opts.client && n.path.split('/')[0].toLowerCase() !== String(opts.client).toLowerCase()) return false;
    if (opts.env && n.env !== String(opts.env).toLowerCase()) return false;
    if (opts.tag && !n.tags.includes(String(opts.tag).toLowerCase().replace(/^#/, ''))) return false;
    return true;
  });
  if (!terms.length) {
    return pool
      .slice()
      .sort((a, b) => b.modified - a.modified)
      .slice(0, limit)
      .map((n) => ({ ...brief(n), snippet: '' }));
  }

  const results = [];
  for (const n of pool) {
    const pathL = n.path.toLowerCase();
    const titleL = n.title.toLowerCase();
    const textL = n.text.toLowerCase();
    const sumL = n.summary.toLowerCase();
    const tagL = n.tags.join(' ');
    const att = n.att || [];
    const attNameL = att.map((a) => a.name.toLowerCase()).join(' ');
    const attTextL = att.map((a) => a.text).join('\n').toLowerCase();
    let matched = 0;
    let score = 0;
    for (const t of terms) {
      const inTitle = titleL.includes(t);
      const inTag = tagL.includes(t);
      const inSum = sumL.includes(t);
      const inPath = pathL.includes(t);
      const first = textL.indexOf(t);
      const inAttName = attNameL.includes(t);
      const inAttText = attTextL.includes(t);
      if (!inTitle && !inTag && !inSum && !inPath && first < 0 && !inAttName && !inAttText) continue;
      matched++;
      if (inAttName) score += 5;
      if (inAttText) score += 2;
      if (inTitle) score += 10;
      if (inTag) score += 8;
      if (inSum) score += 6;
      if (inPath) score += 5;
      if (first >= 0) {
        let count = 0;
        let i = first;
        while (i >= 0 && count < 20) {
          count++;
          i = textL.indexOf(t, i + 1);
        }
        score += 1 + count * 0.1;
      }
    }
    if (opts.any ? matched === 0 : matched < terms.length) continue;
    let snippet = makeSnippet(n.text, textL, terms);
    let inAtt = null;
    if (!snippet) {
      const a = att.find((x) => terms.some((t) => x.text.toLowerCase().includes(t) || x.name.toLowerCase().includes(t)));
      if (a) {
        inAtt = a.name;
        snippet = makeSnippet(a.text, a.text.toLowerCase(), terms);
      }
    }
    results.push({ ...brief(n), snippet, inAtt, score: score + matched * 3, mtime: n.modified });
  }
  results.sort((a, b) => b.score - a.score || b.mtime - a.mtime);
  return results.slice(0, limit);
}

function brief(n) {
  return {
    path: n.path,
    title: n.title,
    env: n.env,
    summary: n.summary,
    tags: n.tags,
    modified: n.modified,
    att: (n.att || []).map((a) => ({ name: a.name, path: a.path })),
  };
}

// ---------- Judul bagian (untuk baca sebagian) ----------

function outline(body) {
  const lines = body.split('\n');
  const heads = [];
  let fence = null;
  lines.forEach((line, i) => {
    const f = /^\s*(`{3,}|~{3,})/.exec(line);
    if (f) {
      if (!fence) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      return;
    }
    if (fence) return;
    const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) heads.push({ level: m[1].length, text: m[2], line: i });
  });
  heads.forEach((h, k) => {
    let end = lines.length;
    for (let j = k + 1; j < heads.length; j++) {
      if (heads[j].level <= h.level) {
        end = heads[j].line;
        break;
      }
    }
    h.end = end;
    h.chars = lines.slice(h.line, end).join('\n').length;
  });
  return { lines, heads };
}

// Ambil satu bagian: judul yang mengandung `query` sampai judul berikutnya yang selevel atau lebih tinggi.
function section(body, query) {
  const { lines, heads } = outline(body);
  const q = String(query).toLowerCase();
  const h = heads.find((x) => x.text.toLowerCase().includes(q));
  if (!h) return null;
  return { heading: h.text, text: lines.slice(h.line, h.end).join('\n').replace(/\s+$/, '') };
}

module.exports = {
  ROOT,
  parseFrontmatter,
  formatDate,
  parseDate,
  parseTags,
  isHiddenName,
  parseNote,
  listNotePaths,
  loadAllNotes,
  attachmentsOf,
  TEXT_EXT,
  makeSnippet,
  searchNotes,
  outline,
  section,
};
