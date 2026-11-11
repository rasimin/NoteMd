'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec, spawn } = require('child_process');
const { marked } = require('marked');
const exporter = require('./exporter');
const H = require('./riwayat-lib');
const Auth = require('./auth');
const { parseFrontmatter, formatDate, parseDate, parseNote, parseTags, searchNotes, attachmentsOf } = require('./notes-lib');
const hljs = require('highlight.js/lib/common');

// Pengaturan di settings.json (contoh: {"port": 3001}), dibaca lewat config.js. Variabel lingkungan PORT mengalahkan file ini.
// "notesDir": letak folder catatan (relatif terhadap folder aplikasi atau path absolut). Variabel lingkungan NOTES_DIR mengalahkannya.
// "imageResize": true menyalakan ubah ukuran gambar di editor visual (bawaan: mati). Perlu restart server.
const { NOTES_DIR: ROOT, SETTINGS } = require('./config');
function validPort(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 65535 ? n : 0;
}
if (SETTINGS.port !== undefined && !validPort(SETTINGS.port)) {
  console.error(`Port "${SETTINGS.port}" di settings.json tidak valid (harus 1-65535), memakai 3001.`);
}
const PORT = validPort(process.env.PORT) || validPort(SETTINGS.port) || 3001;
// "host": alamat yang didengarkan. Bawaan hanya komputer ini (127.0.0.1). "0.0.0.0" membuka ke jaringan (login di auth.json tetap berlaku).
const HOST = (() => {
  const h = typeof SETTINGS.host === 'string' ? SETTINGS.host.trim() : '';
  if (!h) return '127.0.0.1';
  if (!require('net').isIP(h)) {
    console.error(`"host" di settings.json bukan alamat IP yang valid ("${h}"), memakai 127.0.0.1.`);
    return '127.0.0.1';
  }
  return h;
})();
const PUBLIC_DIR = path.join(__dirname, 'public');
const ENV_ORDER = []; // urutan folder: abjad (tidak ada lagi lapisan environment tetap)

const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy':
    "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
};

const MAX_BODY = 2 * 1024 * 1024; // batas ukuran catatan saat disimpan
// Nama yang boleh dipakai di alamat (header Host dan Origin): localhost; bila dibuka ke jaringan juga IP dan nama komputer ini;
// ditambah "allowedHosts" di settings.json (mis. nama DNS atau IP lain).
function allowedHostNames() {
  const names = new Set(['localhost', '127.0.0.1']);
  const add = (h) => {
    h = String(h || '').trim().toLowerCase();
    if (h) names.add(h);
  };
  if (Array.isArray(SETTINGS.allowedHosts)) SETTINGS.allowedHosts.forEach(add);
  if (HOST !== '127.0.0.1' && HOST !== '::1') {
    if (HOST === '0.0.0.0' || HOST === '::') {
      for (const list of Object.values(os.networkInterfaces())) {
        for (const i of list || []) if (i.family === 'IPv4' || i.family === 4) add(i.address);
      }
      add(os.hostname());
    } else {
      add(HOST);
    }
  }
  return [...names];
}
const HOST_NAMES = allowedHostNames();
const ALLOWED_ORIGINS = new Set(HOST_NAMES.map((h) => `http://${h}:${PORT}`));
const ALLOWED_HOSTS = new Set([...HOST_NAMES.map((h) => `${h}:${PORT}`), `[::1]:${PORT}`]);

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// HTML mentah di dalam Markdown ditampilkan sebagai teks, tidak dieksekusi.
// Folder catatan yang sedang di-render (untuk alamat gambar relatif). Array bagian path.
let renderDir = null;
let taskCounter = null; // null: checkbox hanya tampilan; angka: checkbox bisa diklik (diberi data-task)
let renderInline = false; // true: gambar disisipkan sebagai data URI (untuk ekspor)
const IMAGE_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
};

// Lampiran non-gambar: hanya diunduh (Content-Disposition: attachment), tidak ditampilkan di halaman.
const DOWNLOAD_TYPES = {
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.log': 'text/plain; charset=utf-8',
  '.sql': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

// Ubah alamat gambar di catatan jadi /files/... Alamat relatif dihitung dari folder catatan.
function imageSrc(href) {
  const raw = String(href || '');
  if (!raw || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(raw)) return raw; // data:, http: dibiarkan
  let dec;
  try {
    dec = decodeURIComponent(raw.split(/[?#]/)[0]).replace(/\\/g, '/');
  } catch {
    return raw;
  }
  const base = dec.startsWith('/') ? [] : renderDir || [];
  const out = [...base];
  for (const seg of dec.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      if (!out.length) return raw;
      out.pop();
    } else out.push(seg);
  }
  if (!out.length) return raw;
  if (renderInline) {
    const type = IMAGE_TYPES[path.extname(dec).toLowerCase()];
    const full = type ? resolveInside(out) : null;
    try {
      if (full && !out.some((x) => isHiddenName(x) && x !== '_lampiran')) {
        const real = fs.realpathSync(full);
        if (real.startsWith(fs.realpathSync(ROOT) + path.sep) && fs.statSync(real).size <= 15 * 1024 * 1024) {
          return `data:${type};base64,${fs.readFileSync(real).toString('base64')}`;
        }
      }
    } catch {}
    return raw;
  }
  return '/files/' + out.map(encodeURIComponent).join('/');
}

function renderMd(text, dirParts, inline = false, tasks = false) {
  renderDir = dirParts || null;
  renderInline = inline;
  taskCounter = tasks ? 0 : null;
  try {
    return marked.parse(text, { async: false });
  } finally {
    renderDir = null;
    renderInline = false;
    taskCounter = null;
  }
}

marked.use({
  gfm: true,
  renderer: {
    image(href, title, text) {
      const o = typeof href === 'object' && href ? href : { href, title, text };
      const t = o.title ? ` title="${escapeHtml(o.title)}"` : '';
      return `<img src="${escapeHtml(imageSrc(o.href))}" alt="${escapeHtml(o.text || '')}"${t} loading="lazy">`;
    },
    // Tautan relatif ke lampiran (_lampiran/...) diarahkan ke /files/ agar bisa diunduh.
    link(href, title, text) {
      const o = typeof href === 'object' && href ? href : { href, title, text };
      const h = String(o.href || '');
      if (renderInline || !/(^|\/)_lampiran\//.test(h.split(/[?#]/)[0]) || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(h)) return false;
      const src = imageSrc(h);
      if (!src.startsWith('/files/')) return false;
      const t = o.title ? ` title="${escapeHtml(o.title)}"` : '';
      const inner = o.tokens && this.parser ? this.parser.parseInline(o.tokens) : o.text;
      return `<a href="${escapeHtml(src)}"${t}>${inner}</a>`;
    },
    html(h) {
      return escapeHtml(typeof h === 'string' ? h : (h && h.text) || '');
    },
    // Checkbox daftar tugas. Di tampilan baca diberi nomor urut (data-task) agar bisa diceklis tanpa mode Edit.
    checkbox(checked) {
      const c = typeof checked === 'object' && checked ? checked.checked : checked;
      if (taskCounter === null) return `<input ${c ? 'checked="" ' : ''}disabled="" type="checkbox">`;
      return `<input ${c ? 'checked="" ' : ''}type="checkbox" data-task="${taskCounter++}">`;
    },
    // Blok kode diberi warna sintaks (SQL, PHP, JSON, bash, dll.) lewat highlight.js.
    code(code, infostring) {
      const text = typeof code === 'object' && code ? code.text : code;
      const info = typeof code === 'object' && code ? code.lang : infostring;
      const lang = String(info || '').match(/\S*/)[0].toLowerCase();
      let html;
      if (lang && hljs.getLanguage(lang)) {
        html = hljs.highlight(String(text), { language: lang, ignoreIllegals: true }).value;
      } else {
        html = escapeHtml(text);
      }
      return `<pre><code class="hljs language-${escapeHtml(lang || 'text')}">${html}\n</code></pre>\n`;
    },
  },
});

// ---------- Membaca folder catatan ----------

const cache = new Map(); // path relatif -> { mtimeMs, size, title, text, created, modified }

function isHiddenName(name) {
  return name.startsWith('.') || name.startsWith('_') || name === 'node_modules';
}

function walk(dir, rel, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (isHiddenName(e.name) || (rel === '' && e.name === 'kanban')) continue;
    const childRel = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) {
      out.dirs.push(childRel);
      walk(path.join(dir, e.name), childRel, out);
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
      out.files.push(childRel);
    }
  }
}

function scan() {
  const out = { dirs: [], files: [] };
  walk(ROOT, '', out);

  const notes = [];
  const seen = new Set();
  for (const rel of out.files) {
    const full = path.join(ROOT, ...rel.split('/'));
    let st;
    try {
      st = fs.statSync(full);
    } catch {
      continue;
    }
    let c = cache.get(rel);
    if (!c || c.mtimeMs !== st.mtimeMs || c.size !== st.size) {
      let text;
      try {
        text = fs.readFileSync(full, 'utf8');
      } catch {
        continue;
      }
      const n = parseNote(rel, text, st);
      c = {
        mtimeMs: st.mtimeMs,
        size: st.size,
        title: n.title,
        text: n.text,
        summary: n.summary,
        tags: n.tags,
        env: n.env,
        created: n.created,
        modified: n.modified,
      };
      const wasCached = cache.has(rel);
      cache.set(rel, c);
      // File berubah di luar aplikasi: catat sebagai versi baru jika catatan ini sudah punya riwayat.
      if (wasCached) {
        try {
          if (H.hasHistory(ROOT, rel)) H.record(ROOT, rel, 'luar');
        } catch {}
      }
    }
    seen.add(rel);
    notes.push({ path: rel, ...c, att: attachmentsOf(ROOT, rel) });
  }
  for (const k of cache.keys()) if (!seen.has(k)) cache.delete(k);
  return { notes, dirs: out.dirs };
}

// Cuplikan untuk kartu: pakai ringkasan jika ada, kalau tidak potongan isi tanpa sintaks Markdown.
function previewOf(n) {
  if (n.summary) return n.summary.slice(0, 220);
  let t = String(n.text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+.*$/gm, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*\|?[-:| ]+\|[-:| ]*$/gm, ' ')
    .replace(/[|*_`>~]/g, ' ')
    .replace(/^\s*(?:[-+]|\d+\.)\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > 220 ? t.slice(0, 220).trimEnd() + '…' : t;
}

function buildTree(notes, dirs) {
  const root = { name: '', path: '', type: 'dir', children: [] };
  const index = new Map([['', root]]);

  const ensureDir = (rel) => {
    if (index.has(rel)) return index.get(rel);
    const i = rel.lastIndexOf('/');
    const parent = ensureDir(i < 0 ? '' : rel.slice(0, i));
    const node = { name: rel.slice(i + 1), path: rel, type: 'dir', children: [] };
    parent.children.push(node);
    index.set(rel, node);
    return node;
  };

  for (const d of dirs) ensureDir(d);
  for (const n of notes) {
    const i = n.path.lastIndexOf('/');
    const parent = ensureDir(i < 0 ? '' : n.path.slice(0, i));
    parent.children.push({
      name: n.path.slice(i + 1),
      path: n.path,
      type: 'file',
      title: n.title,
      mtime: n.modified,
      preview: previewOf(n),
      tags: (n.tags || []).slice(0, 4),
    });
  }

  const envRank = (name) => {
    const i = ENV_ORDER.indexOf(name.toLowerCase());
    return i >= 0 ? i : 99;
  };
  const sortNode = (node) => {
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      if (a.type === 'dir') {
        const d = envRank(a.name) - envRank(b.name);
        if (d) return d;
      }
      return a.name.localeCompare(b.name, 'id');
    });
    node.children.forEach((c) => c.type === 'dir' && sortNode(c));
  };
  sortNode(root);
  return root;
}

// ---------- Pencarian ----------

// ---------- HTTP ----------

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...SEC_HEADERS,
  });
  res.end(body);
}

function sendText(res, code, text) {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8', ...SEC_HEADERS });
  res.end(text);
}

function resolveNote(rel) {
  if (typeof rel !== 'string' || !rel || rel.includes('\0') || rel.includes('\\')) return null;
  const parts = rel.split('/');
  if (parts.some((p) => !p || p === '.' || p === '..' || isHiddenName(p))) return null;
  if (!/\.md$/i.test(rel)) return null;
  const full = path.resolve(ROOT, ...parts);
  if (!full.startsWith(ROOT + path.sep)) return null;
  return full;
}

// Simpan catatan dari editor. Hanya dari halaman aplikasi ini (cek Origin + header khusus).
function handleSave(req, res, url) {
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) return sendJson(res, 403, { error: 'Origin tidak diizinkan' });
  if (req.headers['x-requested-with'] !== 'ai-note') return sendJson(res, 403, { error: 'Permintaan tidak valid' });

  const rel = url.searchParams.get('path');
  const full = resolveNote(rel);
  if (!full) return sendJson(res, 400, { error: 'Path tidak valid' });

  const chunks = [];
  let size = 0;
  let aborted = false;
  req.on('data', (c) => {
    if (aborted) return;
    size += c.length;
    if (size > MAX_BODY) {
      aborted = true;
      sendJson(res, 413, { error: 'Catatan terlalu besar' });
      return;
    }
    chunks.push(c);
  });
  req.on('end', () => {
    if (aborted) return;
    try {
      let payload;
      try {
        payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        return sendJson(res, 400, { error: 'JSON tidak valid' });
      }
      if (!payload || typeof payload.content !== 'string') {
        return sendJson(res, 400, { error: 'Isi catatan tidak valid' });
      }

      let st;
      try {
        st = fs.statSync(full);
      } catch {
        return sendJson(res, 404, { error: 'Catatan tidak ditemukan' });
      }
      if (!payload.force && typeof payload.version === 'number' && Math.abs(st.mtimeMs - payload.version) > 1) {
        return sendJson(res, 409, { error: 'File berubah di disk sejak dibuka' });
      }

      const existing = fs.readFileSync(full, 'utf8').replace(/^\uFEFF/, '');
      const { meta } = parseFrontmatter(existing);
      const createdMs = parseDate(meta.dibuat) ?? st.birthtimeMs;
      meta.dibuat = formatDate(createdMs);
      meta.diubah = formatDate(Date.now());

      // Metadata dari form editor (opsional): kosong berarti baris itu dihapus.
      if (payload.meta && typeof payload.meta === 'object') {
        const one = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
        const setOrDrop = (k, v) => {
          if (v) meta[k] = v;
          else delete meta[k];
        };
        if ('ringkasan' in payload.meta) setOrDrop('ringkasan', one(payload.meta.ringkasan).slice(0, 600));
        if ('tag' in payload.meta) setOrDrop('tag', parseTags(one(payload.meta.tag)).join(', '));
        if ('lingkungan' in payload.meta) {
          const env = one(payload.meta.lingkungan).toLowerCase();
          setOrDrop('lingkungan', /^[a-z0-9_-]{1,20}$/.test(env) ? env : '');
        }
      }

      const firstKeys = ['dibuat', 'diubah', 'lingkungan', 'ringkasan', 'tag'].filter((k) => k in meta);
      const keys = [...firstKeys, ...Object.keys(meta).filter((k) => !firstKeys.includes(k))];
      const front = keys.map((k) => `${k}: ${meta[k]}`).join('\n');
      const body = payload.content.replace(/\r\n/g, '\n').replace(/^\s*\n/, '').replace(/\s+$/, '');
      const out = `---\n${front}\n---\n\n${body}\n`;

      try {
        H.record(ROOT, rel, 'luar'); // simpan dulu isi yang ada (termasuk perubahan dari luar)
      } catch {}
      const tmp = `${full}.tmp-${process.pid}`;
      fs.writeFileSync(tmp, out, 'utf8');
      fs.renameSync(tmp, full);
      try {
        H.record(ROOT, rel, 'app');
      } catch {}

      return sendJson(res, 200, {
        ok: true,
        created: parseDate(meta.dibuat),
        modified: parseDate(meta.diubah),
        version: fs.statSync(full).mtimeMs,
      });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: 'Gagal menyimpan' });
    }
  });
}

// ---------- Ceklis daftar tugas dari tampilan baca ----------
// Cari item "- [ ]" / "- [x]" di isi catatan (di luar frontmatter dan blok kode), urut dari atas.
function locateTasks(text) {
  const fm = text.match(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/);
  const bodyStart = fm ? fm[0].length : text.charCodeAt(0) === 0xfeff ? 1 : 0;
  const items = [];
  const re = /^((?:[ \t]*>)*[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]+)\[([ xX])\](?=[ \t])/;
  let fence = null;
  let pos = bodyStart;
  while (pos < text.length) {
    let end = text.indexOf('\n', pos);
    if (end === -1) end = text.length;
    const line = text.slice(pos, end);
    const fm2 = line.replace(/^(?:[ \t]*>)*[ ]{0,3}/, '').match(/^(`{3,}|~{3,})/);
    if (fm2) {
      if (!fence) fence = fm2[1];
      else if (fm2[1][0] === fence[0] && fm2[1].length >= fence.length) fence = null;
    } else if (!fence) {
      const m = re.exec(line);
      if (m) items.push({ pos: pos + m[1].length + 1, checked: m[2] !== ' ' });
    }
    pos = end + 1;
  }
  return { bodyStart, items };
}

// Status checkbox menurut parser Markdown (urutan dokumen), untuk memastikan hitungan sama dengan locateTasks.
function markedTasks(body) {
  const out = [];
  const walk = (tokens) => {
    for (const t of tokens || []) {
      if (t.type === 'list') {
        for (const it of t.items || []) {
          if (it.task) out.push(!!it.checked);
          walk(it.tokens);
        }
      } else if (t.tokens) walk(t.tokens);
    }
  };
  walk(marked.lexer(body));
  return out;
}

// Ubah satu checkbox langsung di file .md. Tidak menulis riwayat versi (riwayat hanya lewat editor).
function handleToggleTask(req, res) {
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) return sendJson(res, 403, { error: 'Origin tidak diizinkan' });
  if (req.headers['x-requested-with'] !== 'ai-note') return sendJson(res, 403, { error: 'Permintaan tidak valid' });

  const chunks = [];
  let size = 0;
  let aborted = false;
  req.on('data', (c) => {
    if (aborted) return;
    size += c.length;
    if (size > 4096) {
      aborted = true;
      sendJson(res, 413, { error: 'Permintaan terlalu besar' });
      return;
    }
    chunks.push(c);
  });
  req.on('end', () => {
    if (aborted) return;
    try {
      let payload;
      try {
        payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        return sendJson(res, 400, { error: 'JSON tidak valid' });
      }
      const full = resolveNote(payload && payload.path);
      if (!full || !/\.md$/i.test(full)) return sendJson(res, 400, { error: 'Path tidak valid' });
      if (!Number.isInteger(payload.index) || payload.index < 0 || typeof payload.checked !== 'boolean') {
        return sendJson(res, 400, { error: 'Data tidak valid' });
      }
      let st;
      try {
        st = fs.statSync(full);
      } catch {
        return sendJson(res, 404, { error: 'Catatan tidak ditemukan' });
      }
      if (typeof payload.version === 'number' && Math.abs(st.mtimeMs - payload.version) > 1) {
        return sendJson(res, 409, { error: 'Catatan berubah sejak dibuka. Muat ulang catatan, lalu coba lagi.' });
      }

      const text = fs.readFileSync(full, 'utf8');
      const { bodyStart, items } = locateTasks(text);
      const same =
        (() => {
          const a = items.map((i) => i.checked);
          const b = markedTasks(text.slice(bodyStart));
          return a.length === b.length && a.every((v, i) => v === b[i]);
        })();
      if (!same) {
        return sendJson(res, 422, { error: 'Susunan daftar tugas di catatan ini tidak bisa diceklis dari tampilan baca. Gunakan Edit.' });
      }
      const item = items[payload.index];
      if (!item) return sendJson(res, 404, { error: 'Item tidak ditemukan' });
      if (item.checked === payload.checked) {
        return sendJson(res, 409, { error: 'Status item sudah berubah. Muat ulang catatan.' });
      }

      let head = text.slice(0, bodyStart);
      let rest = text.slice(bodyStart);
      const p = item.pos - bodyStart;
      rest = rest.slice(0, p) + (payload.checked ? 'x' : ' ') + rest.slice(p + 1);
      const now = Date.now();
      head = head.replace(/^(diubah[ \t]*:[ \t]*).*$/m, (m, k) => k + formatDate(now));
      const out = head + rest;

      const tmp = `${full}.tmp-${process.pid}`;
      fs.writeFileSync(tmp, out, 'utf8');
      fs.renameSync(tmp, full);
      // Perubahan ini berasal dari aplikasi: jangan dianggap "diubah di luar aplikasi" (yang akan mencatat riwayat).
      cache.delete(path.relative(ROOT, full).split(path.sep).join('/'));
      return sendJson(res, 200, { ok: true, version: fs.statSync(full).mtimeMs, modified: now });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: 'Gagal menyimpan ceklis' });
    }
  });
}

// Render Markdown untuk preview di editor (isi belum disimpan, tidak menyentuh file).
function handlePreview(req, res) {
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) return sendJson(res, 403, { error: 'Origin tidak diizinkan' });
  if (req.headers['x-requested-with'] !== 'ai-note') return sendJson(res, 403, { error: 'Permintaan tidak valid' });

  const chunks = [];
  let size = 0;
  let aborted = false;
  req.on('data', (c) => {
    if (aborted) return;
    size += c.length;
    if (size > MAX_BODY) {
      aborted = true;
      sendJson(res, 413, { error: 'Catatan terlalu besar' });
      return;
    }
    chunks.push(c);
  });
  req.on('end', () => {
    if (aborted) return;
    try {
      const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!payload || typeof payload.content !== 'string') {
        return sendJson(res, 400, { error: 'Isi catatan tidak valid' });
      }
      const pp = typeof payload.path === 'string' ? safeParts(payload.path) : null;
      return sendJson(res, 200, { html: renderMd(payload.content, pp ? pp.slice(0, -1) : null) });
    } catch {
      return sendJson(res, 400, { error: 'JSON tidak valid' });
    }
  });
}

// ---------- Kelola catatan & folder (buat, pindah, hapus) ----------

const TRASH = '_trash';

function guardMutation(req, res) {
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    sendJson(res, 403, { error: 'Origin tidak diizinkan' });
    return false;
  }
  if (req.headers['x-requested-with'] !== 'ai-note') {
    sendJson(res, 403, { error: 'Permintaan tidak valid' });
    return false;
  }
  return true;
}

function readJsonBody(req, res, cb) {
  const chunks = [];
  let size = 0;
  let aborted = false;
  req.on('data', (c) => {
    if (aborted) return;
    size += c.length;
    if (size > MAX_BODY) {
      aborted = true;
      sendJson(res, 413, { error: 'Permintaan terlalu besar' });
      return;
    }
    chunks.push(c);
  });
  req.on('end', () => {
    if (aborted) return;
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return sendJson(res, 400, { error: 'JSON tidak valid' });
    }
    if (!body || typeof body !== 'object') return sendJson(res, 400, { error: 'Permintaan tidak valid' });
    try {
      cb(body);
    } catch (err) {
      console.error(err);
      sendJson(res, 500, { error: 'Operasi gagal' });
    }
  });
}

function safeParts(rel, allowEmpty = false) {
  if (typeof rel !== 'string' || rel.includes('\0') || rel.includes('\\')) return null;
  if (rel === '') return allowEmpty ? [] : null;
  const parts = rel.split('/');
  if (parts.some((p) => !p || p === '.' || p === '..' || isHiddenName(p))) return null;
  return parts;
}

function resolveInside(parts) {
  const full = path.resolve(ROOT, ...parts);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) return null;
  return full;
}

// Folder yang sudah ada di dalam folder catatan. '' berarti folder utama.
function resolveDirPath(rel) {
  const parts = safeParts(rel, true);
  if (!parts) return null;
  const full = resolveInside(parts);
  if (!full) return null;
  try {
    if (!fs.statSync(full).isDirectory()) return null;
  } catch {
    return null;
  }
  return { full, parts };
}

// Nama folder/file: huruf kecil, spasi menjadi tanda hubung, tanpa karakter terlarang.
function cleanName(raw) {
  let n = String(raw || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._ -]+/g, ' ')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80);
  if (/^(con|prn|aux|nul|com\d|lpt\d)$/.test(n)) n += '-folder';
  return n;
}

function handleCreateNote(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (b) => {
    const dir = resolveDirPath(b.folder ?? '');
    if (!dir) return sendJson(res, 400, { error: 'Folder tujuan tidak valid' });
    const title = String(b.title || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    if (!title) return sendJson(res, 400, { error: 'Judul wajib diisi' });

    const base = cleanName(title) || 'catatan';
    let name = `${base}.md`;
    for (let n = 2; fs.existsSync(path.join(dir.full, name)); n++) name = `${base}-${n}.md`;

    const stamp = formatDate(Date.now());
    const content = `---\ndibuat: ${stamp}\ndiubah: ${stamp}\n---\n\n# ${title}\n\n`;
    fs.writeFileSync(path.join(dir.full, name), content, { encoding: 'utf8', flag: 'wx' });
    try {
      H.record(ROOT, [...dir.parts, name].join('/'), 'baru');
    } catch {}
    sendJson(res, 200, { ok: true, path: [...dir.parts, name].join('/') });
  });
}

// Impor satu file Markdown ke folder: nama disesuaikan standar, metadata dibuat/diubah ditambahkan.
function handleImport(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (b) => {
    const dir = resolveDirPath(b.folder ?? '');
    if (!dir) return sendJson(res, 400, { error: 'Folder tujuan tidak valid' });
    if (typeof b.content !== 'string') return sendJson(res, 400, { error: 'Isi file tidak valid' });
    const orig = String(b.name || '').split(/[\\/]/).pop();
    const baseRaw = orig.replace(/\.(md|markdown|txt)$/i, '');
    const base = cleanName(baseRaw) || 'catatan';
    let name = `${base}.md`;
    for (let n = 2; fs.existsSync(path.join(dir.full, name)); n++) name = `${base}-${n}.md`;

    const text = b.content.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    const { meta, body } = parseFrontmatter(text);
    const now = formatDate(Date.now());
    const cleanBody = body.replace(/^\s*\n/, '').replace(/\s+$/, '');
    // Tanpa judul (# ...): pakai nama file sebagai judul.
    const titled = /^#\s+\S/m.test(cleanBody) ? cleanBody : `# ${baseRaw.replace(/[-_]+/g, ' ').trim() || 'Catatan'}\n\n${cleanBody}`;
    if (!meta.dibuat) meta.dibuat = now;
    if (!meta.diubah) meta.diubah = now;
    const firstKeys = ['dibuat', 'diubah', 'lingkungan', 'ringkasan', 'tag'].filter((k) => k in meta);
    const keys = [...firstKeys, ...Object.keys(meta).filter((k) => !firstKeys.includes(k))];
    const front = keys.map((k) => `${k}: ${meta[k]}`).join('\n');
    fs.writeFileSync(path.join(dir.full, name), `---\n${front}\n---\n\n${titled}\n`, { encoding: 'utf8', flag: 'wx' });
    const rel = [...dir.parts, name].join('/');
    try {
      H.record(ROOT, rel, 'baru');
    } catch {}
    sendJson(res, 200, { ok: true, path: rel, name });
  });
}

// Mulai ulang aplikasi dari UI: jalankan proses baru, lalu proses ini berhenti.
function handleRestart(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, () => {
    sendJson(res, 200, { ok: true });
    setTimeout(() => {
      const args = process.argv.slice(2).filter((a) => a !== '--open');
      const env = { ...process.env, AI_NOTE_RESTART: '1' };
      try {
        if (process.platform === 'win32') {
          // Jendela konsol baru (berisi log), sama seperti saat dijalankan lewat start.bat.
          exec(`start "AI Note" /D "${__dirname}" cmd /k ""${process.execPath}" "${__filename}" ${args.join(' ')}"`, { env, cwd: __dirname }, () => {});
        } else {
          spawn(process.execPath, [__filename, ...args], { cwd: __dirname, env, detached: true, stdio: 'ignore' }).unref();
        }
      } catch (err) {
        console.error('Gagal memulai ulang:', err);
        return;
      }
      setTimeout(() => process.exit(0), 300);
    }, 150);
  });
}

function handleCreateFolder(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (b) => {
    const parent = resolveDirPath(b.parent ?? '');
    if (!parent) return sendJson(res, 400, { error: 'Folder induk tidak valid' });
    const name = cleanName(b.name);
    if (!name) return sendJson(res, 400, { error: 'Nama folder tidak valid' });
    const target = path.join(parent.full, name);
    if (fs.existsSync(target)) return sendJson(res, 409, { error: `"${name}" sudah ada di folder ini` });
    fs.mkdirSync(target);
    sendJson(res, 200, { ok: true, path: [...parent.parts, name].join('/') });
  });
}

function statItem(parts) {
  const full = resolveInside(parts);
  if (!full || full === ROOT) return null;
  let st;
  try {
    st = fs.statSync(full);
  } catch {
    return null;
  }
  if (st.isFile() && !/\.md$/i.test(full)) return null;
  if (!st.isFile() && !st.isDirectory()) return null;
  return { full, st };
}

// Lampiran sebuah catatan: <folder catatan>/_lampiran/<nama-file-tanpa-.md>/
const ATT = '_lampiran';
function attDirOf(noteFull) {
  return path.join(path.dirname(noteFull), ATT, path.basename(noteFull).replace(/\.md$/i, ''));
}
function isDirSafe(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}
// Pindahkan folder lampiran ke lokasi baru; folder _lampiran lama dihapus bila jadi kosong.
function moveAttachments(fromDir, toDir) {
  fs.mkdirSync(path.dirname(toDir), { recursive: true });
  fs.renameSync(fromDir, toDir);
  const parent = path.dirname(fromDir);
  try {
    if (!fs.readdirSync(parent).length) fs.rmdirSync(parent);
  } catch {}
}

// ---------- Lampiran gambar dari editor (tempel / seret) ----------
// POST /api/attachment?note=<path.md>&desc=<deskripsi>  isi: byte gambar (png/jpg/gif/webp, maks 10 MB)
//   -> disimpan ke <folder catatan>/_lampiran/<nama-catatan>/NN-<deskripsi>.<ext>
// POST /api/attachment/delete  { note, files: [nama] }  hapus lampiran (dipakai saat edit dibatalkan)
const MAX_UPLOAD = 10 * 1024 * 1024;
const UPLOAD_TYPES = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp' };
const UPLOAD_NAME = /^\d{2,4}-[a-z0-9][a-z0-9.-]*\.(png|jpg|gif|webp)$/;

function sniffImage(b) {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return '.png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return '.jpg';
  if (b.length >= 6 && b.toString('ascii', 0, 4) === 'GIF8') return '.gif';
  if (b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return '.webp';
  return null;
}

function noteFileOf(rel) {
  const full = resolveNote(rel);
  if (!full) return null;
  try {
    return fs.statSync(full).isFile() ? full : null;
  } catch {
    return null;
  }
}

function handleAttachmentUpload(req, res, url) {
  if (!guardMutation(req, res)) return;
  const noteRel = url.searchParams.get('note') || '';
  const full = noteFileOf(noteRel);
  if (!full) return sendJson(res, 404, { error: 'Catatan tidak ditemukan' });
  const ext = UPLOAD_TYPES[String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase()];
  if (!ext) return sendJson(res, 415, { error: 'Hanya gambar PNG, JPG, GIF, atau WebP' });
  const chunks = [];
  let size = 0;
  let aborted = false;
  req.on('data', (c) => {
    if (aborted) return;
    size += c.length;
    if (size > MAX_UPLOAD) {
      aborted = true;
      sendJson(res, 413, { error: 'Gambar terlalu besar (maks 10 MB)' });
      req.destroy();
      return;
    }
    chunks.push(c);
  });
  req.on('end', () => {
    if (aborted) return;
    try {
      const buf = Buffer.concat(chunks);
      const real = sniffImage(buf);
      if (!buf.length || !real) return sendJson(res, 415, { error: 'Isi file bukan gambar yang dikenali' });
      const dir = attDirOf(full);
      fs.mkdirSync(dir, { recursive: true });
      const slug = cleanName(url.searchParams.get('desc') || '').replace(/\./g, '-').slice(0, 60).replace(/-+$/, '') || 'gambar';
      let n = 0;
      for (const f of fs.readdirSync(dir)) {
        const m = /^(\d+)-/.exec(f);
        if (m) n = Math.max(n, parseInt(m[1], 10));
      }
      let name;
      for (let i = 0; i < 20; i++) {
        name = `${String(n + 1 + i).padStart(2, '0')}-${slug}${real}`;
        try {
          fs.writeFileSync(path.join(dir, name), buf, { flag: 'wx' });
          break;
        } catch (err) {
          if (err.code !== 'EEXIST' || i === 19) throw err;
        }
      }
      const noteBase = path.basename(full).replace(/\.md$/i, '');
      sendJson(res, 200, { ok: true, name, path: `${ATT}/${noteBase}/${name}`, size: buf.length });
    } catch (err) {
      console.error(err);
      sendJson(res, 500, { error: 'Gagal menyimpan gambar' });
    }
  });
}

function handleAttachmentDelete(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (body) => {
    const full = noteFileOf(body.note);
    if (!full) return sendJson(res, 404, { error: 'Catatan tidak ditemukan' });
    const files = Array.isArray(body.files) ? body.files.slice(0, 200) : [];
    const dir = attDirOf(full);
    let removed = 0;
    for (const f of files) {
      if (typeof f !== 'string' || !UPLOAD_NAME.test(f)) continue;
      try {
        fs.unlinkSync(path.join(dir, f));
        removed++;
      } catch {}
    }
    try {
      if (!fs.readdirSync(dir).length) {
        fs.rmdirSync(dir);
        const parent = path.dirname(dir);
        if (!fs.readdirSync(parent).length) fs.rmdirSync(parent);
      }
    } catch {}
    sendJson(res, 200, { ok: true, removed });
  });
}

function contentDisposition(name) {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

// Ekspor catatan: ?path=...&format=md|html|pdf|docx|print
async function handleExport(url, res) {
  const rel = url.searchParams.get('path');
  const format = url.searchParams.get('format');
  const full = resolveNote(rel);
  if (!full) return sendJson(res, 400, { error: 'Path tidak valid' });
  let raw, st;
  try {
    st = fs.statSync(full);
    raw = fs.readFileSync(full);
  } catch {
    return sendJson(res, 404, { error: 'Catatan tidak ditemukan' });
  }
  const baseName = path.basename(rel, path.extname(rel));
  const send = (type, data, ext, extraHeaders = {}) => {
    res.writeHead(200, {
      ...SEC_HEADERS,
      'Content-Type': type,
      'Content-Disposition': contentDisposition(baseName + ext),
      'Cache-Control': 'no-store',
      ...extraHeaders,
    });
    res.end(data);
  };

  if (format === 'md') return send('text/markdown; charset=utf-8', raw, '.md');

  let text = raw.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const { meta, body } = parseFrontmatter(text);
  const m = body.match(/^#\s+(.+)$/m);
  const title = m ? m[1].trim() : baseName;
  const created = parseDate(meta.dibuat);
  const modified = parseDate(meta.diubah);
  const info = [
    rel.split('/').slice(0, -1).join(' / '),
    `Dibuat ${formatDate(created ?? st.birthtimeMs)}`,
    `Diubah ${formatDate(modified ?? st.mtimeMs)}`,
  ]
    .filter(Boolean)
    .join('  ·  ');
  const dir = (safeParts(rel) || []).slice(0, -1);
  const bodyHtml = renderMd(body, dir, true);

  try {
    if (format === 'html') {
      return send('text/html; charset=utf-8', exporter.htmlDocument({ title, meta: info, bodyHtml }), '.html');
    }
    if (format === 'print') {
      // Cadangan jika PDF otomatis tidak bisa: buka halaman cetak, pengguna memilih "Simpan sebagai PDF".
      res.writeHead(200, {
        ...SEC_HEADERS,
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy':
          "default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
        'Cache-Control': 'no-store',
      });
      return res.end(exporter.htmlDocument({ title, meta: info, bodyHtml, autoPrint: true }));
    }
    if (format === 'pdf') {
      const pdf = await exporter.makePdf(exporter.htmlDocument({ title, meta: info, bodyHtml }));
      return send('application/pdf', pdf, '.pdf');
    }
    if (format === 'docx') {
      const docx = await exporter.makeDocx(exporter.htmlDocument({ title, meta: info, bodyHtml }));
      return send(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        docx,
        '.docx',
      );
    }
    return sendJson(res, 400, { error: 'Format tidak dikenal' });
  } catch (err) {
    if (err && err.code === 'NO_BROWSER') {
      return sendJson(res, 501, { error: 'Edge atau Chrome tidak ditemukan untuk membuat PDF.', fallback: 'print' });
    }
    if (err && err.code === 'NO_DOCX') {
      return sendJson(res, 501, {
        error: 'Pustaka Word belum terpasang. Tutup server lalu jalankan start.bat lagi (akan memasangnya otomatis).',
      });
    }
    console.error(err);
    return sendJson(res, 500, { error: 'Gagal membuat file: ' + (err && err.message ? err.message : err), fallback: format === 'pdf' ? 'print' : undefined });
  }
}

function handleMove(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (b) => {
    const parts = safeParts(b.from);
    if (!parts) return sendJson(res, 400, { error: 'Path asal tidak valid' });
    const item = statItem(parts);
    if (!item) return sendJson(res, 404, { error: 'Item tidak ditemukan' });
    const dest = resolveDirPath(b.to ?? '');
    if (!dest) return sendJson(res, 400, { error: 'Folder tujuan tidak valid' });

    const name = parts[parts.length - 1];
    const target = path.join(dest.full, name);
    if (target === item.full) return sendJson(res, 200, { ok: true, path: parts.join('/') });
    if (item.st.isDirectory() && (dest.full === item.full || dest.full.startsWith(item.full + path.sep))) {
      return sendJson(res, 400, { error: 'Folder tidak bisa dipindah ke dalam dirinya sendiri' });
    }
    if (fs.existsSync(target)) {
      return sendJson(res, 409, { error: `Sudah ada "${name}" di folder tujuan` });
    }
    // Catatan membawa lampirannya (gambar) ke folder tujuan.
    let att = null;
    if (item.st.isFile()) {
      const from = attDirOf(item.full);
      if (isDirSafe(from)) {
        const to = attDirOf(target);
        if (fs.existsSync(to)) {
          return sendJson(res, 409, { error: `Folder lampiran "${ATT}/${path.basename(to)}" sudah ada di folder tujuan` });
        }
        att = { from, to };
      }
    }
    fs.renameSync(item.full, target);
    if (att) moveAttachments(att.from, att.to);
    try {
      H.move(ROOT, parts.join('/'), [...dest.parts, name].join('/'));
    } catch {}
    sendJson(res, 200, { ok: true, path: [...dest.parts, name].join('/') });
  });
}

// Ganti nama folder (nama sesuai standar: huruf kecil, tanda hubung). Isinya ikut pindah.
function handleRename(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (b) => {
    const parts = safeParts(b.path);
    if (!parts) return sendJson(res, 400, { error: 'Path tidak valid' });
    const item = statItem(parts);
    if (!item) return sendJson(res, 404, { error: 'Item tidak ditemukan' });
    const isFile = item.st.isFile();
    if (!isFile && !item.st.isDirectory()) return sendJson(res, 404, { error: 'Item tidak ditemukan' });
    if (isFile && !/\.md$/i.test(parts[parts.length - 1])) return sendJson(res, 400, { error: 'Hanya catatan .md yang bisa diganti nama' });

    const base = cleanName(isFile ? String(b.name || '').replace(/\.md$/i, '') : b.name);
    if (!base) return sendJson(res, 400, { error: isFile ? 'Nama file tidak valid' : 'Nama folder tidak valid' });
    const name = isFile ? base + '.md' : base;

    const parentParts = parts.slice(0, -1);
    if (name === parts[parts.length - 1]) return sendJson(res, 200, { ok: true, path: parts.join('/') });
    const target = path.join(path.dirname(item.full), name);
    const sameDir = target.toLowerCase() === item.full.toLowerCase(); // hanya ganti huruf besar/kecil
    if (fs.existsSync(target) && !sameDir) {
      return sendJson(res, 409, { error: `Sudah ada "${name}" di folder ini` });
    }

    if (isFile) {
      // Folder lampiran ikut diganti namanya (_lampiran/<nama-lama> -> _lampiran/<nama-baru>).
      const oldAtt = attDirOf(item.full);
      const newAtt = attDirOf(target);
      const hasAtt = isDirSafe(oldAtt);
      if (hasAtt && fs.existsSync(newAtt) && oldAtt.toLowerCase() !== newAtt.toLowerCase()) {
        return sendJson(res, 409, { error: 'Folder lampiran dengan nama itu sudah ada' });
      }
      fs.renameSync(item.full, target);
      if (hasAtt) fs.renameSync(oldAtt, newAtt);
      // Tautan lampiran di isi catatan ikut diperbarui.
      const oldBase = parts[parts.length - 1].replace(/\.md$/i, '');
      const newBase = name.replace(/\.md$/i, '');
      try {
        const text = fs.readFileSync(target, 'utf8');
        const encOld = encodeURIComponent(oldBase);
        let out = text.split(`_lampiran/${oldBase}/`).join(`_lampiran/${newBase}/`);
        if (encOld !== oldBase) out = out.split(`_lampiran/${encOld}/`).join(`_lampiran/${encodeURIComponent(newBase)}/`);
        if (out !== text) {
          out = out.replace(/^diubah:.*$/m, `diubah: ${formatDate(Date.now())}`);
          fs.writeFileSync(target, out, 'utf8');
        }
      } catch {}
    } else {
      fs.renameSync(item.full, target);
    }
    try {
      H.move(ROOT, parts.join('/'), [...parentParts, name].join('/'));
    } catch {}
    sendJson(res, 200, { ok: true, path: [...parentParts, name].join('/') });
  });
}

// "Hapus" memindahkan ke _trash/<id>/ (tidak terbaca aplikasi), lengkap dengan lokasi asal, supaya bisa dipulihkan.
function handleDelete(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (b) => {
    const parts = safeParts(b.path);
    if (!parts) return sendJson(res, 400, { error: 'Path tidak valid' });
    const item = statItem(parts);
    if (!item) return sendJson(res, 404, { error: 'Item tidak ditemukan' });

    const trashDir = path.join(ROOT, TRASH);
    fs.mkdirSync(trashDir, { recursive: true });
    const stamp = formatDate(Date.now()).replace(/-/g, '').replace(' ', '-').replace(':', '');
    let container;
    do {
      container = path.join(trashDir, `${stamp}-${Math.random().toString(16).slice(2, 6)}`);
    } while (fs.existsSync(container));
    fs.mkdirSync(container);
    fs.writeFileSync(
      path.join(container, '.meta.json'),
      JSON.stringify({ from: parts.join('/'), deleted: Date.now() }),
      'utf8',
    );
    fs.renameSync(item.full, path.join(container, parts[parts.length - 1]));
    try {
      H.moveTo(ROOT, parts.join('/'), path.join(container, '.riwayat'));
    } catch {}
    if (item.st.isFile()) {
      const att = attDirOf(item.full);
      if (isDirSafe(att)) moveAttachments(att, path.join(container, '.lampiran'));
    }
    sendJson(res, 200, { ok: true });
  });
}

// ---------- Sampah (_trash): daftar, pulihkan, hapus permanen ----------

function trashCount() {
  try {
    return fs.readdirSync(path.join(ROOT, TRASH)).filter((n) => !n.startsWith('.')).length;
  } catch {
    return 0;
  }
}

function countMd(dir) {
  let n = 0;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    if (e.isDirectory()) n += countMd(path.join(dir, e.name));
    else if (e.isFile() && /\.md$/i.test(e.name)) n++;
  }
  return n;
}

function titleOf(file, fallback) {
  try {
    const { body } = parseFrontmatter(fs.readFileSync(file, 'utf8').slice(0, 8192));
    const m = body.match(/^#\s+(.+)$/m);
    if (m) return m[1].trim();
  } catch {}
  return fallback.replace(/\.md$/i, '');
}

function trashEntries() {
  const dir = path.join(ROOT, TRASH);
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const out = [];
  for (const id of names) {
    if (id.startsWith('.')) continue;
    const full = path.join(dir, id);
    let st;
    try {
      st = fs.statSync(full);
    } catch {
      continue;
    }

    let meta = null;
    let itemPath = full;
    let name = id;
    if (st.isDirectory()) {
      try {
        meta = JSON.parse(fs.readFileSync(path.join(full, '.meta.json'), 'utf8'));
      } catch {}
      if (meta) {
        const inner = fs.readdirSync(full).find((n) => !n.startsWith('.'));
        if (!inner) continue;
        itemPath = path.join(full, inner);
        name = inner;
      }
    }

    let from;
    let deleted;
    if (meta && typeof meta.from === 'string') {
      from = meta.from;
      deleted = Number(meta.deleted) || st.mtimeMs;
    } else {
      // Format lama: 20261029-1721__folder__catatan.md
      const m = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(?:\d{2})?__(.+)$/.exec(id);
      from = m ? m[6].split('__').join('/') : id;
      deleted = m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : st.mtimeMs;
      name = from.split('/').pop();
    }

    let ist;
    try {
      ist = fs.statSync(itemPath);
    } catch {
      continue;
    }
    const isDir = ist.isDirectory();
    out.push({
      id,
      itemPath,
      name,
      from,
      deleted,
      type: isDir ? 'dir' : 'file',
      notes: isDir ? countMd(itemPath) : 1,
      title: isDir ? name : titleOf(itemPath, name),
    });
  }
  out.sort((a, b) => b.deleted - a.deleted);
  return out;
}

function handleTrashRestore(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (b) => {
    const entry = trashEntries().find((e) => e.id === b.id);
    if (!entry) return sendJson(res, 404, { error: 'Item tidak ada di sampah' });
    const parts = safeParts(entry.from);
    if (!parts) return sendJson(res, 400, { error: 'Lokasi asal tidak valid' });

    const parentFull = resolveInside(parts.slice(0, -1));
    if (!parentFull) return sendJson(res, 400, { error: 'Lokasi asal tidak valid' });
    fs.mkdirSync(parentFull, { recursive: true });

    const name = parts[parts.length - 1];
    const ext = entry.type === 'file' ? path.extname(name) : '';
    const base = ext ? name.slice(0, -ext.length) : name;
    let target = path.join(parentFull, name);
    for (let n = 1; fs.existsSync(target); n++) {
      target = path.join(parentFull, `${base}-pulih${n > 1 ? '-' + n : ''}${ext}`);
    }
    fs.renameSync(entry.itemPath, target);

    const container = path.join(ROOT, TRASH, entry.id);
    const savedAtt = path.join(container, '.lampiran');
    if (entry.type === 'file' && isDirSafe(savedAtt)) {
      let dest = attDirOf(path.join(parentFull, name));
      if (fs.existsSync(dest)) dest = attDirOf(target);
      if (!fs.existsSync(dest)) {
        moveAttachments(savedAtt, dest);
        const origRef = `${ATT}/${name.replace(/\.md$/i, '')}/`;
        const newRef = `${ATT}/${path.basename(dest)}/`;
        if (origRef !== newRef) {
          try {
            const txt = fs.readFileSync(target, 'utf8');
            fs.writeFileSync(target, txt.split(origRef).join(newRef), 'utf8');
          } catch {}
        }
      }
    }
    const restoredRel = path.relative(ROOT, target).split(path.sep).join('/');
    try {
      H.moveFrom(ROOT, path.join(container, '.riwayat'), restoredRel);
    } catch {}
    if (container !== entry.itemPath) fs.rmSync(container, { recursive: true, force: true });

    sendJson(res, 200, { ok: true, path: restoredRel });
  });
}

function handleTrashPurge(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (b) => {
    const entries = trashEntries();
    const targets = b.all === true ? entries : entries.filter((e) => e.id === b.id);
    if (!targets.length) return sendJson(res, 404, { error: 'Item tidak ada di sampah' });
    for (const e of targets) {
      fs.rmSync(path.join(ROOT, TRASH, e.id), { recursive: true, force: true });
    }
    sendJson(res, 200, { ok: true, removed: targets.length });
  });
}

// Pulihkan catatan ke salah satu versi di riwayat. Isi sekarang disimpan dulu sebagai versi.
function handleHistoryRestore(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (b) => {
    const rel = String(b.path || '');
    const full = resolveNote(rel);
    if (!full) return sendJson(res, 400, { error: 'Path tidak valid' });
    let text = H.read(ROOT, rel, b.id);
    if (text === null) return sendJson(res, 404, { error: 'Versi tidak ditemukan' });
    try {
      H.record(ROOT, rel, 'luar');
    } catch {}
    if (/^---\r?\n[\s\S]*?\r?\n---/.test(text)) {
      text = text.replace(/^diubah:.*$/m, `diubah: ${formatDate(Date.now())}`);
    }
    const tmp = `${full}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, text, 'utf8');
    fs.renameSync(tmp, full);
    try {
      H.record(ROOT, rel, 'pulih');
    } catch {}
    sendJson(res, 200, { ok: true, version: fs.statSync(full).mtimeMs });
  });
}

// ==================== KANBAN BACKEND ====================
const KANBAN_DIR = path.join(ROOT, 'kanban');

function ensureKanbanDir() {
  if (!fs.existsSync(KANBAN_DIR)) {
    fs.mkdirSync(KANBAN_DIR, { recursive: true });
  }
}

function parseKanbanTicket(rel) {
  const full = path.join(ROOT, ...rel.split('/'));
  let st;
  let text;
  try {
    st = fs.statSync(full);
    text = fs.readFileSync(full, 'utf8');
  } catch {
    return null;
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const { meta, body } = parseFrontmatter(text);

  const VALID_STATUSES = ['new-task', 'fixing', 'testing', 'code-review', 'uat', 'production'];

  let status = String(meta.status || 'new-task').toLowerCase().trim();
  if (status === 'todo' || status === 'to-do' || status === 'antrean' || status === 'backlog' || status === 'new task dev' || status === 'new task') status = 'new-task';
  if (status === 'progress' || status === 'in progress' || status === 'in-progress' || status === 'ongoing' || status === 'fixing/analisa (dev)' || status === 'fixing') status = 'fixing';
  if (status === 'test' || status === 'qa') status = 'testing';
  if (status === 'review' || status === 'code review' || status === 'pr') status = 'code-review';
  if (status === 'uat' || status === 'staging') status = 'uat';
  if (status === 'done' || status === 'resolved' || status === 'selesai' || status === 'prod' || status === 'production') status = 'production';
  if (!VALID_STATUSES.includes(status)) status = 'new-task';

  const comments = [];
  const commentMatch = body.match(/##\s+Comments\r?\n([\s\S]*?)(?=\r?\n##\s+|$)/i);
  if (commentMatch) {
    const lines = commentMatch[1].split(/\r?\n/);
    for (const line of lines) {
      const cm = line.match(/^-\s+\*\*([^*]+)\*\*\s*(?:\(([^)]+)\))?:\s*(.+)$/);
      if (cm) {
        comments.push({
          author: cm[1].trim(),
          date: cm[2] ? cm[2].trim() : '',
          text: cm[3].trim(),
        });
      }
    }
  }

  const titleMatch = body.match(/^#\s+(.+)$/m);
  const baseName = path.basename(rel, '.md');
  const title = meta.judul || (titleMatch ? titleMatch[1].trim() : baseName);
  const id = (meta.id || meta.idnumber || baseName.split('-')[0]).toUpperCase();

  return {
    path: rel,
    id,
    title,
    status,
    type: meta.tipe || meta.type || 'task',
    client: meta.client || '',
    pic_ba: meta.pic_ba || meta.pic || '',
    developer: meta.developper || meta.developer || '',
    created: meta.dibuat || formatDate(st.birthtimeMs),
    modified: meta.diubah || formatDate(st.mtimeMs),
    gdrive: meta.gdrive || meta.link_google_drive || '',
    lokasi_app: meta.lokasi_app || meta['alamat/lokasi app'] || '',
    mini_description: meta.mini_description || meta.ringkasan || '',
    issue_date: meta.issue_date || '',
    comments,
    commentsCount: comments.length,
    rawMeta: meta,
    body: body,
    html: renderMd(body, (safeParts(rel) || []).slice(0, -1)),
  };
}

function handleKanbanGetBoards(req, res) {
  ensureKanbanDir();
  const boards = [];
  try {
    const entries = fs.readdirSync(KANBAN_DIR, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && !isHiddenName(e.name)) {
        const boardPath = path.join(KANBAN_DIR, e.name);
        const files = fs.readdirSync(boardPath, { withFileTypes: true })
          .filter((f) => f.isFile() && f.name.toLowerCase().endsWith('.md') && !f.name.startsWith('ATURAN-'));
        boards.push({
          id: e.name,
          name: e.name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          path: `kanban/${e.name}`,
          ticketCount: files.length,
        });
      }
    }
  } catch {}
  sendJson(res, 200, { boards: boards.sort((a, b) => a.name.localeCompare(b.name, 'id')) });
}

function handleKanbanGetBoard(req, res, url) {
  const rel = url.searchParams.get('path');
  const parts = safeParts(rel);
  if (!parts || parts[0] !== 'kanban') return sendJson(res, 400, { error: 'Path board tidak valid' });
  const boardDir = path.join(ROOT, ...parts);
  if (!fs.existsSync(boardDir) || !fs.statSync(boardDir).isDirectory()) {
    return sendJson(res, 404, { error: 'Board tidak ditemukan' });
  }

  let files = [];
  try {
    files = fs.readdirSync(boardDir, { withFileTypes: true })
      .filter((f) => f.isFile() && f.name.toLowerCase().endsWith('.md') && !f.name.startsWith('ATURAN-'))
      .map((f) => [...parts, f.name].join('/'));
  } catch {
    return sendJson(res, 500, { error: 'Gagal membaca board' });
  }

  const tickets = [];
  for (const f of files) {
    const t = parseKanbanTicket(f);
    if (t) tickets.push(t);
  }

  const boardName = parts[parts.length - 1];
  sendJson(res, 200, {
    board: {
      id: boardName,
      name: boardName.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      path: rel,
    },
    columns: [
      { id: 'new-task', name: 'New Task Dev', color: 'gray', dot: '#94a3b8' },
      { id: 'fixing', name: 'Fixing/Analisa (Dev)', color: 'blue', dot: '#38bdf8' },
      { id: 'testing', name: 'Testing', color: 'purple', dot: '#c084fc' },
      { id: 'code-review', name: 'Code Review', color: 'amber', dot: '#facc15' },
      { id: 'uat', name: 'UAT', color: 'crimson', dot: '#fb7185' },
      { id: 'production', name: 'Production', color: 'green', dot: '#4ade80' },
    ],
    tickets,
  });
}

function handleKanbanGetTicket(req, res, url) {
  const rel = url.searchParams.get('path');
  const parts = safeParts(rel);
  if (!parts || parts[0] !== 'kanban') return sendJson(res, 400, { error: 'Path tiket tidak valid' });
  const t = parseKanbanTicket(rel);
  if (!t) return sendJson(res, 404, { error: 'Tiket tidak ditemukan' });
  sendJson(res, 200, t);
}

function handleKanbanMove(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (b) => {
    const rel = String(b.path || '');
    const newStatus = String(b.status || '').toLowerCase().trim();
    const VALID = ['new-task', 'fixing', 'testing', 'code-review', 'uat', 'production'];
    if (!VALID.includes(newStatus)) {
      return sendJson(res, 400, { error: 'Status tidak valid' });
    }
    const full = resolveNote(rel);
    if (!full || !fs.existsSync(full)) return sendJson(res, 404, { error: 'Tiket tidak ditemukan' });

    let text = fs.readFileSync(full, 'utf8');
    const now = formatDate(Date.now());
    const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fmMatch) {
      let fmLines = fmMatch[1].split(/\r?\n/);
      let foundStatus = false;
      let foundDiubah = false;
      fmLines = fmLines.map((line) => {
        if (/^status\s*:/i.test(line)) {
          foundStatus = true;
          return `status: ${newStatus}`;
        }
        if (/^diubah\s*:/i.test(line)) {
          foundDiubah = true;
          return `diubah: ${now}`;
        }
        return line;
      });
      if (!foundStatus) fmLines.push(`status: ${newStatus}`);
      if (!foundDiubah) fmLines.push(`diubah: ${now}`);
      text = `---\n${fmLines.join('\n')}\n---` + text.slice(fmMatch[0].length);
    } else {
      text = `---\nstatus: ${newStatus}\ndiubah: ${now}\n---\n\n${text}`;
    }

    fs.writeFileSync(full, text, 'utf8');
    try {
      H.record(ROOT, rel, 'kanban-move');
    } catch {}
    sendJson(res, 200, { ok: true, status: newStatus, modified: now });
  });
}

function handleKanbanComment(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (b) => {
    const rel = String(b.path || '');
    const author = String(b.author || 'User').trim();
    const commentText = String(b.text || '').trim();
    if (!commentText) return sendJson(res, 400, { error: 'Komentar tidak boleh kosong' });

    const full = resolveNote(rel);
    if (!full || !fs.existsSync(full)) return sendJson(res, 404, { error: 'Tiket tidak ditemukan' });

    let text = fs.readFileSync(full, 'utf8');
    const now = formatDate(Date.now());
    const dateStr = now.split(' ')[0];
    const newCommentLine = `- **${author}** (${dateStr}): ${commentText}`;

    if (/##\s+Comments/i.test(text)) {
      const commentMatch = text.match(/##\s+Comments\r?\n([\s\S]*?)(?=\r?\n##\s+|$)/i);
      if (commentMatch) {
        const fullBlock = commentMatch[0];
        const updatedBlock = fullBlock.trimEnd() + '\n' + newCommentLine + '\n';
        text = text.replace(fullBlock, updatedBlock);
      } else {
        text = text.replace(/(##\s+Comments\r?\n)/i, `$1${newCommentLine}\n`);
      }
    } else {
      const fmEnd = text.indexOf('---', 3);
      if (fmEnd !== -1) {
        const afterFm = fmEnd + 3;
        text = text.slice(0, afterFm) + `\n\n## Comments\n${newCommentLine}\n` + text.slice(afterFm);
      } else {
        text = `## Comments\n${newCommentLine}\n\n` + text;
      }
    }

    text = text.replace(/^diubah:\s*.+$/m, `diubah: ${now}`);
    fs.writeFileSync(full, text, 'utf8');
    try {
      H.record(ROOT, rel, 'kanban-comment');
    } catch {}
    sendJson(res, 200, { ok: true, comment: { author, date: dateStr, text: commentText } });
  });
}

function handleKanbanCreateBoard(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (b) => {
    const rawName = String(b.name || '').trim();
    const clean = cleanName(rawName);
    if (!clean) return sendJson(res, 400, { error: 'Nama board tidak valid' });
    ensureKanbanDir();
    const boardDir = path.join(KANBAN_DIR, clean);
    if (fs.existsSync(boardDir)) {
      return sendJson(res, 409, { error: `Board "${clean}" sudah ada` });
    }
    fs.mkdirSync(boardDir, { recursive: true });
    sendJson(res, 200, { ok: true, id: clean, path: `kanban/${clean}`, name: clean });
  });
}

function handleKanbanCreateTicket(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (b) => {
    const boardPath = safeParts(b.boardPath);
    if (!boardPath || boardPath[0] !== 'kanban') return sendJson(res, 400, { error: 'Board path tidak valid' });
    const dir = path.join(ROOT, ...boardPath);
    if (!fs.existsSync(dir)) return sendJson(res, 404, { error: 'Board tidak ditemukan' });

    const id = (String(b.id || '').trim() || 'TASK-' + Math.floor(100 + Math.random() * 900)).toUpperCase();
    const title = String(b.title || '').trim();
    if (!title) return sendJson(res, 400, { error: 'Judul tiket tidak boleh kosong' });

    const slug = cleanName(title).slice(0, 40) || 'tiket';
    const filename = `${id.toLowerCase()}-${slug}.md`;
    const full = path.join(dir, filename);
    if (fs.existsSync(full)) return sendJson(res, 409, { error: `Tiket "${filename}" sudah ada` });

    const now = formatDate(Date.now());
    const status = String(b.status || 'new-task').toLowerCase();
    const type = b.type || 'task';
    const client = b.client || '';
    const pic_ba = b.pic_ba || '';
    const developper = b.developper || '';
    const gdrive = b.gdrive || '';
    const lokasi_app = b.lokasi_app || '';

    const content = `---
id: ${id}
judul: ${title}
status: ${status}
tipe: ${type}
client: ${client}
lokasi_app: ${lokasi_app}
pic_ba: ${pic_ba}
developper: ${developper}
dibuat: ${now}
diubah: ${now}
gdrive: ${gdrive}
idnumber: ${id}
mini_description: ${title}
issue_date: ${now.split(' ')[0]}
---

## Comments

## 💡 Tulis Detail issue di bawah sini!

Tuliskan detail permasalahan di sini...

## 💡 Suspect Awal tulis di bawah sini!

Tuliskan analisis awal penyebab masalah di sini...

## 💡 Solusi / Tindakan Perbaikan!

Tuliskan solusi atau perbaikan di sini...
`;

    fs.writeFileSync(full, content, 'utf8');
    const rel = [...boardPath, filename].join('/');
    try {
      H.record(ROOT, rel, 'kanban-new');
    } catch {}
    sendJson(res, 200, { ok: true, path: rel, id, title });
  });
}

// ---------- Login ----------
const PUBLIC_WHEN_LOGGED_OUT = new Set(['/login.html', '/login.js', '/login.css', '/style.css', '/theme.js', '/favicon.svg']);

function guardAuthRequest(req, res) {
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    sendJson(res, 403, { error: 'Origin tidak diizinkan' });
    return false;
  }
  if (req.headers['x-requested-with'] !== 'ai-note') {
    sendJson(res, 403, { error: 'Permintaan tidak valid' });
    return false;
  }
  return true;
}

function handleLogin(req, res) {
  if (!guardAuthRequest(req, res)) return;
  const ip = req.socket.remoteAddress || '?';
  const wait = Auth.lockedFor(ip);
  if (wait) return sendJson(res, 429, { error: `Terlalu banyak percobaan gagal. Coba lagi ${wait} detik lagi.` });

  const chunks = [];
  let size = 0;
  let aborted = false;
  req.on('data', (c) => {
    if (aborted) return;
    size += c.length;
    if (size > 4096) {
      aborted = true;
      sendJson(res, 413, { error: 'Permintaan terlalu besar' });
      return;
    }
    chunks.push(c);
  });
  req.on('end', () => {
    if (aborted) return;
    try {
      let payload;
      try {
        payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        return sendJson(res, 400, { error: 'JSON tidak valid' });
      }
      const username = payload && typeof payload.username === 'string' ? payload.username : '';
      const password = payload && typeof payload.password === 'string' ? payload.password : '';
      const user = Auth.verify(username, password);
      if (!user) {
        Auth.recordFail(ip);
        console.warn(`[login] gagal dari ${ip} (username "${username.slice(0, 40)}")`);
        const w = Auth.lockedFor(ip);
        return sendJson(res, w ? 429 : 401, {
          error: w ? `Terlalu banyak percobaan gagal. Coba lagi ${w} detik lagi.` : 'Username atau password salah.',
        });
      }
      Auth.recordOk(ip);
      res.setHeader('Set-Cookie', Auth.sessionCookie(Auth.makeToken(user)));
      return sendJson(res, 200, { ok: true, user });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: 'Gagal memproses login' });
    }
  });
}

function handleLogout(req, res) {
  if (!guardAuthRequest(req, res)) return;
  res.setHeader('Set-Cookie', Auth.clearCookie());
  return sendJson(res, 200, { ok: true });
}

let mermaidGz = null; // salinan gzip mermaid.min.js di memori (3,5 MB menjadi sekitar 1 MB)

const STATIC_FILES = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'application/javascript; charset=utf-8'],
  '/gsap.min.js': ['gsap.min.js', 'application/javascript; charset=utf-8'],
  '/theme.js': ['theme.js', 'application/javascript; charset=utf-8'],
  '/editor.js': ['editor.js', 'application/javascript; charset=utf-8'],
  '/editor-visual.js': ['editor-visual.js', 'application/javascript; charset=utf-8'],
  '/editor-visual.css': ['editor-visual.css', 'text/css; charset=utf-8'],
  '/kanban.js': ['kanban.js', 'application/javascript; charset=utf-8'],
  '/dialogs.js': ['dialogs.js', 'application/javascript; charset=utf-8'],
  '/kanban.css': ['kanban.css', 'text/css; charset=utf-8'],
  '/favicon.svg': ['favicon.svg', 'image/svg+xml'],
  '/manifest.json': ['manifest.json', 'application/manifest+json; charset=utf-8'],
  '/sw.js': ['sw.js', 'application/javascript; charset=utf-8'],
  '/icon-192.png': ['icon-192.png', 'image/png'],
  '/icon-512.png': ['icon-512.png', 'image/png'],
  '/login.html': ['login.html', 'text/html; charset=utf-8'],
  '/login.js': ['login.js', 'application/javascript; charset=utf-8'],
  '/login.css': ['login.css', 'text/css; charset=utf-8'],
};

const server = http.createServer((req, res) => {
  try {
    if (!ALLOWED_HOSTS.has(String(req.headers.host || '').toLowerCase())) return sendText(res, 403, 'Forbidden');
    const url = new URL(req.url, `http://${req.headers.host}`);
    const p = url.pathname;

    // Login: bila auth.json "enabled", semua permintaan butuh sesi yang sah (kecuali halaman login).
    if (Auth.isEnabled()) {
      const user = Auth.currentUser(req);
      if (!user) {
        if (req.method === 'POST' && p === '/api/login') return handleLogin(req, res);
        const open = (req.method === 'GET' || req.method === 'HEAD') && PUBLIC_WHEN_LOGGED_OUT.has(p);
        if (!open) {
          if (p.startsWith('/api/')) return sendJson(res, 401, { error: 'Belum masuk. Silakan login.', login: true });
          res.writeHead(302, { Location: '/login.html', 'Cache-Control': 'no-store', ...SEC_HEADERS });
          return res.end();
        }
      } else {
        if (req.method === 'POST' && p === '/api/logout') return handleLogout(req, res);
        if (p === '/login.html') {
          res.writeHead(302, { Location: '/', 'Cache-Control': 'no-store', ...SEC_HEADERS });
          return res.end();
        }
      }
    }
    if (req.method === 'GET' && p === '/api/me') {
      const on = Auth.isEnabled();
      return sendJson(res, 200, { auth: on, user: on ? Auth.currentUser(req) : null });
    }
    if (req.method === 'POST' && p === '/api/logout') return sendJson(res, 200, { ok: true }); // login dimatikan

    if (req.method === 'PUT' && p === '/api/note') return handleSave(req, res, url);
    if (req.method === 'POST' && p === '/api/note/task') return handleToggleTask(req, res);
    if (req.method === 'POST' && p === '/api/preview') return handlePreview(req, res);
    if (req.method === 'POST' && p === '/api/create-note') return handleCreateNote(req, res);
    if (req.method === 'POST' && p === '/api/create-folder') return handleCreateFolder(req, res);
    if (req.method === 'POST' && p === '/api/move') return handleMove(req, res);
    if (req.method === 'POST' && p === '/api/delete') return handleDelete(req, res);
    if (req.method === 'POST' && p === '/api/rename') return handleRename(req, res);
    if (req.method === 'POST' && p === '/api/import') return handleImport(req, res);
    if (req.method === 'POST' && p === '/api/attachment') return handleAttachmentUpload(req, res, url);
    if (req.method === 'POST' && p === '/api/attachment/delete') return handleAttachmentDelete(req, res);
    if (req.method === 'POST' && p === '/api/restart') return handleRestart(req, res);
    if (req.method === 'POST' && p === '/api/history/restore') return handleHistoryRestore(req, res);
    if (req.method === 'POST' && p === '/api/trash/restore') return handleTrashRestore(req, res);
    if (req.method === 'POST' && p === '/api/trash/purge') return handleTrashPurge(req, res);
    if (req.method === 'POST' && p === '/api/kanban/move') return handleKanbanMove(req, res);
    if (req.method === 'POST' && p === '/api/kanban/comment') return handleKanbanComment(req, res);
    if (req.method === 'POST' && p === '/api/kanban/create-board') return handleKanbanCreateBoard(req, res);
    if (req.method === 'POST' && p === '/api/kanban/create-ticket') return handleKanbanCreateTicket(req, res);
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendText(res, 405, 'Method Not Allowed');

    if (p === '/api/kanban/boards') return handleKanbanGetBoards(req, res);
    if (p === '/api/kanban/board') return handleKanbanGetBoard(req, res, url);
    if (p === '/api/kanban/ticket') return handleKanbanGetTicket(req, res, url);

    if (p === '/api/settings') return sendJson(res, 200, { imageResize: SETTINGS.imageResize === true });

    if (p === '/api/tree') {
      const { notes, dirs } = scan();
      return sendJson(res, 200, {
        name: path.basename(ROOT),
        total: notes.length,
        trash: trashCount(),
        tree: buildTree(notes, dirs),
      });
    }

    if (p === '/api/trash/item') {
      const entry = trashEntries().find((e) => e.id === url.searchParams.get('id'));
      if (!entry) return sendJson(res, 404, { error: 'Item tidak ada di sampah' });
      const sub = url.searchParams.get('sub') || '';
      const parts = sub ? safeParts(sub) : [];
      if (!parts) return sendJson(res, 400, { error: 'Path tidak valid' });
      const target = path.resolve(entry.itemPath, ...parts);
      if (target !== entry.itemPath && !target.startsWith(entry.itemPath + path.sep)) {
        return sendJson(res, 400, { error: 'Path tidak valid' });
      }
      let st;
      try {
        st = fs.statSync(target);
      } catch {
        return sendJson(res, 404, { error: 'Tidak ditemukan di sampah' });
      }
      const info = { id: entry.id, name: entry.name, from: entry.from, deleted: entry.deleted, sub };

      if (st.isDirectory()) {
        const children = fs
          .readdirSync(target, { withFileTypes: true })
          .filter((e) => !isHiddenName(e.name) && (e.isDirectory() || (e.isFile() && /\.md$/i.test(e.name))))
          .map((e) => {
            const full = path.join(target, e.name);
            return e.isDirectory()
              ? { name: e.name, type: 'dir', notes: countMd(full) }
              : { name: e.name, type: 'file', title: titleOf(full, e.name) };
          })
          .sort((a, b) => (a.type !== b.type ? (a.type === 'dir' ? -1 : 1) : a.name.localeCompare(b.name, 'id')));
        return sendJson(res, 200, { ...info, type: 'dir', children });
      }

      if (!/\.md$/i.test(target)) return sendJson(res, 400, { error: 'Bukan catatan' });
      let text;
      try {
        text = fs.readFileSync(target, 'utf8');
      } catch {
        return sendJson(res, 404, { error: 'Tidak ditemukan di sampah' });
      }
      try {
        H.record(ROOT, rel, 'luar');
      } catch {}
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      const { meta, body } = parseFrontmatter(text);
      const m = body.match(/^#\s+(.+)$/m);
      const created = parseDate(meta.dibuat);
      const modified = parseDate(meta.diubah);
      return sendJson(res, 200, {
        ...info,
        type: 'file',
        title: m ? m[1].trim() : path.basename(target, '.md'),
        created: created ?? st.birthtimeMs,
        modified: modified ?? st.mtimeMs,
        hasMeta: created !== null && modified !== null,
        html: marked.parse(body, { async: false }),
      });
    }

    if (p === '/api/trash') {
      return sendJson(res, 200, {
        items: trashEntries().map(({ itemPath, ...rest }) => rest),
      });
    }

    if (p === '/api/export') return handleExport(url, res);

    if (p === '/api/search') {
      const q = (url.searchParams.get('q') || '').slice(0, 200);
      const { notes } = scan();
      const folder = (url.searchParams.get('folder') || '').slice(0, 300);
      return sendJson(res, 200, {
        q,
        folder,
        results: searchNotes(q, notes, { limit: 30, folder }).map(({ path: p, title, snippet }) => ({ path: p, title, snippet })),
      });
    }

    if (p === '/api/history' || p === '/api/history/version') {
      const rel = url.searchParams.get('path');
      const full = resolveNote(rel);
      if (!full) return sendJson(res, 400, { error: 'Path tidak valid' });
      try {
        H.record(ROOT, rel, 'luar');
      } catch {}
      if (p === '/api/history') {
        return sendJson(res, 200, { path: rel, versions: H.list(ROOT, rel) });
      }
      const content = H.read(ROOT, rel, url.searchParams.get('id'));
      if (content === null) return sendJson(res, 404, { error: 'Versi tidak ditemukan' });
      let current = '';
      try {
        current = fs.readFileSync(full, 'utf8');
      } catch {}
      return sendJson(res, 200, { id: url.searchParams.get('id'), content, current });
    }

    if (p === '/api/note') {
      const rel = url.searchParams.get('path');
      const full = resolveNote(rel);
      if (!full) return sendJson(res, 400, { error: 'Path tidak valid' });
      let text;
      let st;
      try {
        st = fs.statSync(full);
        text = fs.readFileSync(full, 'utf8');
      } catch {
        return sendJson(res, 404, { error: 'Catatan tidak ditemukan' });
      }
      if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
      const { meta, body } = parseFrontmatter(text);
      const m = body.match(/^#\s+(.+)$/m);
      const created = parseDate(meta.dibuat);
      const modified = parseDate(meta.diubah);
      return sendJson(res, 200, {
        path: rel,
        title: m ? m[1].trim() : path.basename(rel, path.extname(rel)),
        created: created ?? st.birthtimeMs,
        modified: modified ?? st.mtimeMs,
        hasMeta: created !== null && modified !== null,
        lingkungan: String(meta.lingkungan || '').toLowerCase(),
        ringkasan: meta.ringkasan || '',
        tag: parseTags(meta.tag || meta.tags),
        version: st.mtimeMs,
        markdown: body.replace(/^\s*\n/, ''),
        html: renderMd(body, (safeParts(rel) || []).slice(0, -1), false, true),
      });
    }

    if (p.startsWith('/files/')) {
      let rel;
      try {
        rel = decodeURIComponent(p.slice(7));
      } catch {
        return sendText(res, 400, 'Bad Request');
      }
      // Gambar lampiran disimpan di folder "_lampiran" (folder berawalan _ biasanya disembunyikan).
      const segs = rel.split('/');
      const parts =
        typeof rel === 'string' && !rel.includes('\0') && !rel.includes('\\') &&
        segs.every((x) => x && x !== '.' && x !== '..' && (x === '_lampiran' || !isHiddenName(x))) &&
        segs.filter((x) => x === '_lampiran').length <= 1 &&
        segs[0] !== '_lampiran' && segs.length >= 3 && segs.includes('_lampiran')
          ? segs
          : null;
      const ext = path.extname(rel).toLowerCase();
      const isImg = !!IMAGE_TYPES[ext];
      const type = parts && (IMAGE_TYPES[ext] || DOWNLOAD_TYPES[ext]);
      const full = parts && type ? resolveInside(parts) : null;
      if (!full) return sendText(res, 404, 'Not Found');
      let data;
      try {
        const real = fs.realpathSync(full);
        if (!real.startsWith(fs.realpathSync(ROOT) + path.sep)) return sendText(res, 404, 'Not Found');
        if (!fs.statSync(real).isFile()) return sendText(res, 404, 'Not Found');
        data = fs.readFileSync(real);
      } catch {
        return sendText(res, 404, 'Not Found');
      }
      res.writeHead(200, {
        ...SEC_HEADERS,
        'Content-Type': type,
        'Cache-Control': 'no-cache',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        ...(isImg ? {} : { 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(rel))}` }),
      });
      return res.end(req.method === 'HEAD' ? undefined : data);
    }

    // Pustaka mermaid (diagram) disajikan dari node_modules. Browser hanya memuatnya bila catatan punya blok mermaid.
    if (p === '/vendor/mermaid.min.js') {
      const file = path.join(__dirname, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js');
      let st;
      try {
        st = fs.statSync(file);
      } catch {
        return sendText(res, 404, 'Pustaka mermaid belum terpasang. Jalankan "npm install" di folder APP.');
      }
      const lastModified = st.mtime.toUTCString();
      const headers = { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache', 'Last-Modified': lastModified, ...SEC_HEADERS };
      if (req.headers['if-modified-since'] === lastModified) {
        res.writeHead(304, headers);
        return res.end();
      }
      if (!mermaidGz || mermaidGz.mtimeMs !== st.mtimeMs) mermaidGz = { mtimeMs: st.mtimeMs, data: require('zlib').gzipSync(fs.readFileSync(file), { level: 6 }) };
      if (/\bgzip\b/.test(String(req.headers['accept-encoding'] || ''))) {
        res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' });
        return res.end(req.method === 'HEAD' ? undefined : mermaidGz.data);
      }
      res.writeHead(200, headers);
      return res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(file));
    }

    const entry = STATIC_FILES[p];
    if (entry) {
      const data = fs.readFileSync(path.join(PUBLIC_DIR, entry[0]));
      const extraHeaders = p === '/sw.js' ? { 'Service-Worker-Allowed': '/' } : {};
      res.writeHead(200, { 'Content-Type': entry[1], 'Cache-Control': 'no-cache', ...SEC_HEADERS, ...extraHeaders });
      return res.end(req.method === 'HEAD' ? undefined : data);
    }

    return sendText(res, 404, 'Not Found');
  } catch (err) {
    console.error(err);
    return sendText(res, 500, 'Internal Server Error');
  }
});

let listenTries = 0;
server.on('error', (err) => {
  // Setelah "Mulai ulang", proses lama masih melepas port: coba lagi sebentar.
  if (err.code === 'EADDRINUSE' && process.env.AI_NOTE_RESTART && listenTries++ < 40) {
    return setTimeout(() => server.listen(PORT, HOST), 250);
  }
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} sudah dipakai. Tutup aplikasi lain atau jalankan dengan PORT=3001.`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

// Saat start: pastikan setiap catatan punya versi awal, dan catat perubahan yang terjadi saat aplikasi mati.
function baselineHistory() {
  let paths = [];
  try {
    paths = require('./notes-lib').listNotePaths(ROOT);
  } catch {}
  let i = 0;
  const step = () => {
    for (let n = 0; n < 25 && i < paths.length; n++, i++) {
      try {
        H.record(ROOT, paths[i], 'luar');
      } catch {}
    }
    if (i < paths.length) setImmediate(step);
  };
  setImmediate(step);
}

server.listen(PORT, HOST, () => {
  baselineHistory();
  const url = `http://localhost:${PORT}`;
  console.log(`AI Note berjalan di ${url}`);
  console.log(`Folder catatan: ${ROOT}`);
  if (HOST !== '127.0.0.1' && HOST !== '::1') {
    const lan = HOST_NAMES.filter((h) => /^\d+\.\d+\.\d+\.\d+$/.test(h) && !h.startsWith('127.'));
    console.log(`Dibuka ke jaringan (${HOST}). Dari perangkat lain: ${lan.map((h) => `http://${h}:${PORT}`).join(', ') || '(IP komputer ini)'}`);
  }
  if (Auth.isEnabled()) {
    console.log(`Login aktif (akun di ${Auth.AUTH_FILE})`);
    if (Auth.usesDefaultPassword() && HOST !== '127.0.0.1' && HOST !== '::1') {
      console.warn('PERINGATAN: password bawaan (admin / admin123) masih dipakai padahal aplikasi dibuka ke jaringan. Ganti di auth.json.');
    }
  } else {
    console.warn('PERINGATAN: login dimatikan ("enabled": false di auth.json).');
  }
  if (process.argv.includes('--open')) {
    const cmd =
      process.platform === 'win32'
        ? `start "" "${url}"`
        : process.platform === 'darwin'
          ? `open "${url}"`
          : `xdg-open "${url}"`;
    exec(cmd, () => {});
  }
});

function gracefulShutdown() {
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000);
}
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('message', (msg) => {
  if (msg === 'shutdown') gracefulShutdown();
});
