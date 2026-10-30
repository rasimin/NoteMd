'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { marked } = require('marked');
const exporter = require('./exporter');
const { parseFrontmatter, formatDate, parseDate, parseNote, parseTags, searchNotes, attachmentsOf } = require('./notes-lib');
const hljs = require('highlight.js/lib/common');

const ROOT = path.resolve(process.env.NOTES_DIR || path.join(__dirname, '..'));
const PORT = Number(process.env.PORT) || 3000;
const HOST = '127.0.0.1';
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
const ALLOWED_ORIGINS = new Set([`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`]);

const ALLOWED_HOSTS = new Set([
  `localhost:${PORT}`,
  `127.0.0.1:${PORT}`,
  `[::1]:${PORT}`,
]);

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// HTML mentah di dalam Markdown ditampilkan sebagai teks, tidak dieksekusi.
// Folder catatan yang sedang di-render (untuk alamat gambar relatif). Array bagian path.
let renderDir = null;
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

function renderMd(text, dirParts, inline = false) {
  renderDir = dirParts || null;
  renderInline = inline;
  try {
    return marked.parse(text, { async: false });
  } finally {
    renderDir = null;
    renderInline = false;
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
    if (isHiddenName(e.name)) continue;
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
      cache.set(rel, c);
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

      const tmp = `${full}.tmp-${process.pid}`;
      fs.writeFileSync(tmp, out, 'utf8');
      fs.renameSync(tmp, full);

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
    sendJson(res, 200, { ok: true, path: [...dir.parts, name].join('/') });
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
    if (!item || !item.st.isDirectory()) return sendJson(res, 404, { error: 'Folder tidak ditemukan' });
    const name = cleanName(b.name);
    if (!name) return sendJson(res, 400, { error: 'Nama folder tidak valid' });

    const parentParts = parts.slice(0, -1);
    if (name === parts[parts.length - 1]) return sendJson(res, 200, { ok: true, path: parts.join('/') });
    const target = path.join(path.dirname(item.full), name);
    const sameDir = target.toLowerCase() === item.full.toLowerCase(); // hanya ganti huruf besar/kecil
    if (fs.existsSync(target) && !sameDir) {
      return sendJson(res, 409, { error: `Sudah ada "${name}" di folder ini` });
    }
    fs.renameSync(item.full, target);
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
    if (container !== entry.itemPath) fs.rmSync(container, { recursive: true, force: true });

    sendJson(res, 200, { ok: true, path: path.relative(ROOT, target).split(path.sep).join('/') });
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

const STATIC_FILES = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'application/javascript; charset=utf-8'],
  '/theme.js': ['theme.js', 'application/javascript; charset=utf-8'],
  '/editor.js': ['editor.js', 'application/javascript; charset=utf-8'],
  '/editor-visual.js': ['editor-visual.js', 'application/javascript; charset=utf-8'],
  '/editor-visual.css': ['editor-visual.css', 'text/css; charset=utf-8'],
  '/favicon.svg': ['favicon.svg', 'image/svg+xml'],
};

const server = http.createServer((req, res) => {
  try {
    if (!ALLOWED_HOSTS.has(req.headers.host || '')) return sendText(res, 403, 'Forbidden');
    const url = new URL(req.url, `http://${req.headers.host}`);
    const p = url.pathname;

    if (req.method === 'PUT' && p === '/api/note') return handleSave(req, res, url);
    if (req.method === 'POST' && p === '/api/preview') return handlePreview(req, res);
    if (req.method === 'POST' && p === '/api/create-note') return handleCreateNote(req, res);
    if (req.method === 'POST' && p === '/api/create-folder') return handleCreateFolder(req, res);
    if (req.method === 'POST' && p === '/api/move') return handleMove(req, res);
    if (req.method === 'POST' && p === '/api/delete') return handleDelete(req, res);
    if (req.method === 'POST' && p === '/api/rename') return handleRename(req, res);
    if (req.method === 'POST' && p === '/api/trash/restore') return handleTrashRestore(req, res);
    if (req.method === 'POST' && p === '/api/trash/purge') return handleTrashPurge(req, res);
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendText(res, 405, 'Method Not Allowed');

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
        html: renderMd(body, (safeParts(rel) || []).slice(0, -1)),
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

    const entry = STATIC_FILES[p];
    if (entry) {
      const data = fs.readFileSync(path.join(PUBLIC_DIR, entry[0]));
      res.writeHead(200, { 'Content-Type': entry[1], 'Cache-Control': 'no-cache', ...SEC_HEADERS });
      return res.end(req.method === 'HEAD' ? undefined : data);
    }

    return sendText(res, 404, 'Not Found');
  } catch (err) {
    console.error(err);
    return sendText(res, 500, 'Internal Server Error');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} sudah dipakai. Tutup aplikasi lain atau jalankan dengan PORT=3001.`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`AI Note berjalan di ${url}`);
  console.log(`Folder catatan: ${ROOT}`);
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
