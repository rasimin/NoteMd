'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec, spawn } = require('child_process');
const { marked } = require('marked');
const exporter = require('./exporter');
const H = require('./riwayat-lib');
const Pub = require('./publish-lib');
const Rec = require('./recordings-lib');
const Auth = require('./auth');
const { ensureHttpToken, handleMcpHttp } = require('./mcp/mcp-http');
ensureHttpToken();
const { parseFrontmatter, formatDate, parseDate, parseNote, parseTags, searchNotes, attachmentsOf } = require('./notes-lib');
const hljs = require('highlight.js/lib/common');
for (const extra of ['powershell', 'dos', 'http']) {
  try {
    hljs.registerLanguage(extra, require(`highlight.js/lib/languages/${extra}`));
  } catch {}
}

// Pengaturan di settings.json (contoh: {"port": 3001}), dibaca lewat config.js. Variabel lingkungan PORT mengalahkan file ini.
// "notesDir": letak folder catatan (relatif terhadap folder aplikasi atau path absolut). Variabel lingkungan NOTES_DIR mengalahkannya.
// "imageResize": true menyalakan ubah ukuran gambar di editor visual (bawaan: mati). Perlu restart server.
const { NOTES_DIR: ROOT, RECORDINGS_DIR, ensureRecordingsDir, SETTINGS } = require('./config');
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
const SHARE_ORIGIN = (() => {
  if (HOST === '127.0.0.1' || HOST === '::1') return null;
  if (HOST !== '0.0.0.0' && HOST !== '::') return `http://${HOST}:${PORT}`;
  const ips = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) {
      if ((i.family === 'IPv4' || i.family === 4) && !i.internal && i.address) ips.push(i.address);
    }
  }
  const pref =
    ips.find((ip) => ip.startsWith('192.168.')) ||
    ips.find((ip) => ip.startsWith('10.')) ||
    ips.find((ip) => /^172\.(1[6-9]|2\d|3[01])\./.test(ip)) ||
    ips[0];
  return pref ? `http://${pref}:${PORT}` : null;
})();

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

// Lampiran teks/kode: bisa diunduh dan ditampilkan sebagai kode berhighlight di popup/penampil.
const TEXT_EXT_LANG = {
  '.sql': 'sql',
  '.txt': 'plaintext',
  '.log': 'plaintext',
  '.csv': 'plaintext',
  '.tsv': 'plaintext',
  '.json': 'json',
  '.xml': 'xml',
  '.html': 'xml',
  '.htm': 'xml',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.tsx': 'typescript',
  '.py': 'python',
  '.cs': 'csharp',
  '.java': 'java',
  '.go': 'go',
  '.php': 'php',
  '.rb': 'ruby',
  '.rs': 'rust',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.hpp': 'cpp',
  '.sh': 'bash',
  '.bash': 'bash',
  '.ps1': 'powershell',
  '.bat': 'dos',
  '.cmd': 'dos',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'ini',
  '.ini': 'ini',
  '.conf': 'ini',
  '.env': 'ini',
  '.properties': 'ini',
  '.md': 'markdown',
  '.diff': 'diff',
  '.patch': 'diff',
  '.http': 'http',
};

// Lampiran non-gambar: hanya diunduh (Content-Disposition: attachment), tidak ditampilkan di halaman.
const DOWNLOAD_TYPES = {
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ...Object.fromEntries(
    Object.keys(TEXT_EXT_LANG).map((ext) => [
      ext,
      ext === '.json' ? 'application/json; charset=utf-8' : ext === '.csv' ? 'text/csv; charset=utf-8' : 'text/plain; charset=utf-8',
    ]),
  ),
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
  breaks: true,
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

function applyPayloadMeta(meta, rawMeta) {
  if (!rawMeta || typeof rawMeta !== 'object') return;
  const one = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
  const setOrDrop = (k, v) => {
    if (v) meta[k] = v;
    else delete meta[k];
  };
  if ('ringkasan' in rawMeta) setOrDrop('ringkasan', one(rawMeta.ringkasan).slice(0, 600));
  if ('tag' in rawMeta) setOrDrop('tag', parseTags(one(rawMeta.tag)).join(', '));
  if ('lingkungan' in rawMeta) {
    const env = one(rawMeta.lingkungan).toLowerCase();
    setOrDrop('lingkungan', /^[a-z0-9_-]{1,20}$/.test(env) ? env : '');
  }
}

function formatNoteContent(meta, content) {
  const firstKeys = ['dibuat', 'diubah', 'lingkungan', 'ringkasan', 'tag'].filter((k) => k in meta);
  const keys = [...firstKeys, ...Object.keys(meta).filter((k) => !firstKeys.includes(k))];
  const front = keys.map((k) => `${k}: ${meta[k]}`).join('\n');
  const body = String(content || '').replace(/\r\n/g, '\n').replace(/^\s*\n/, '').replace(/\s+$/, '');
  return `---\n${front}\n---\n\n${body}\n`;
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
      applyPayloadMeta(meta, payload.meta);

      const out = formatNoteContent(meta, payload.content);
      const isAutosave = payload.autosave === true;

      if (!isAutosave) {
        try {
          H.record(ROOT, rel, 'luar'); // simpan dulu isi yang ada (termasuk perubahan dari luar)
        } catch {}
      }
      const tmp = `${full}.tmp-${process.pid}`;
      fs.writeFileSync(tmp, out, 'utf8');
      fs.renameSync(tmp, full);
      cache.delete(rel);
      try {
        if (isAutosave) {
          const versions = H.list(ROOT, rel);
          if (!versions.length || Date.now() - versions[0].time >= 5 * 60 * 1000) {
            H.record(ROOT, rel, 'app');
          }
        } else {
          H.record(ROOT, rel, 'app');
        }
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

function readJsonBody(req, res, cb, limit = MAX_BODY) {
  const chunks = [];
  let size = 0;
  let aborted = false;
  req.on('data', (c) => {
    if (aborted) return;
    size += c.length;
    if (size > limit) {
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

const QUICK_FOLDER = 'Catatan Cepat';

function cleanQuickBase(raw) {
  const s = String(raw || '').replace(/\.md$/i, '').trim();
  const m = /^(\d{4}-\d{2}-\d{2}_\d{4})(?:-(.*))?$/.exec(s);
  if (m) {
    const slug = cleanName(m[2] || '').slice(0, 50).replace(/-+$/, '');
    return slug ? `${m[1]}-${slug}` : m[1];
  }
  return cleanName(s).slice(0, 80);
}

function uniqueMdName(dirFull, base) {
  let name = `${base}.md`;
  for (let n = 2; fs.existsSync(path.join(dirFull, name)); n++) name = `${base}-${n}.md`;
  return name;
}

function resolveQuickDir(folderRel) {
  const f = folderRel === undefined || folderRel === null || folderRel === '' ? QUICK_FOLDER : String(folderRel);
  if (f === QUICK_FOLDER) {
    fs.mkdirSync(path.join(ROOT, QUICK_FOLDER), { recursive: true });
  }
  return resolveDirPath(f);
}

function rewriteAttachmentLinks(filePath, oldBase, newBase) {
  if (!oldBase || !newBase || oldBase === newBase) return;
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    const encOld = encodeURIComponent(oldBase);
    let out = text.split(`_lampiran/${oldBase}/`).join(`_lampiran/${newBase}/`);
    if (encOld !== oldBase) out = out.split(`_lampiran/${encOld}/`).join(`_lampiran/${encodeURIComponent(newBase)}/`);
    if (out !== text) {
      out = out.replace(/^diubah:.*$/m, `diubah: ${formatDate(Date.now())}`);
      fs.writeFileSync(filePath, out, 'utf8');
    }
  } catch {}
}

function handleFolders(req, res) {
  const out = { dirs: [], files: [] };
  walk(ROOT, '', out);
  sendJson(res, 200, { ok: true, folders: out.dirs.sort((a, b) => a.localeCompare(b, 'id')) });
}

function handleQuickCreate(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (b) => {
    const dir = resolveQuickDir(b.folder);
    if (!dir) return sendJson(res, 400, { error: 'Folder tujuan tidak valid' });
    if (typeof b.content !== 'string') return sendJson(res, 400, { error: 'Isi catatan tidak valid' });
    const base = cleanQuickBase(b.baseName) || 'catatan';
    const name = uniqueMdName(dir.full, base);
    const now = Date.now();
    const stamp = formatDate(now);
    const meta = { dibuat: stamp, diubah: stamp };
    applyPayloadMeta(meta, b.meta);
    const out = formatNoteContent(meta, b.content);
    const full = path.join(dir.full, name);
    fs.writeFileSync(full, out, { encoding: 'utf8', flag: 'wx' });
    const rel = [...dir.parts, name].join('/');
    cache.delete(rel);
    try {
      H.record(ROOT, rel, 'baru');
    } catch {}
    sendJson(res, 200, {
      ok: true,
      path: rel,
      name,
      version: fs.statSync(full).mtimeMs,
      created: parseDate(meta.dibuat),
      modified: parseDate(meta.diubah),
    });
  });
}

function handleQuickRelocate(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (b) => {
    const parts = safeParts(b.path);
    if (!parts) return sendJson(res, 400, { error: 'Path tidak valid' });
    const item = statItem(parts);
    if (!item || !item.st.isFile()) return sendJson(res, 404, { error: 'Catatan tidak ditemukan' });

    const oldRel = parts.join('/');
    const oldFilename = parts[parts.length - 1];
    const oldBase = oldFilename.replace(/\.md$/i, '');
    const srcFolderRel = parts.slice(0, -1).join('/');
    const dest = b.folder !== undefined ? resolveQuickDir(b.folder) : resolveDirPath(srcFolderRel);
    if (!dest) return sendJson(res, 400, { error: 'Folder tujuan tidak valid' });

    let newBase = oldBase;
    if (b.name !== undefined && b.name !== null && String(b.name).trim() !== '') {
      newBase = cleanQuickBase(b.name);
      if (!newBase) return sendJson(res, 400, { error: 'Nama file tidak valid' });
    }

    let newFilename = `${newBase}.md`;
    let target = path.join(dest.full, newFilename);
    const sameFile = target === item.full;
    if (sameFile) {
      return sendJson(res, 200, { ok: true, path: oldRel, oldBase, newBase, version: item.st.mtimeMs, renamed: false });
    }
    const sameCaseOnly = target.toLowerCase() === item.full.toLowerCase();
    if (fs.existsSync(target) && !sameCaseOnly) {
      if (b.unique) {
        newFilename = uniqueMdName(dest.full, newBase);
        newBase = newFilename.replace(/\.md$/i, '');
        target = path.join(dest.full, newFilename);
      } else {
        return sendJson(res, 409, { error: `Sudah ada "${newFilename}" di folder tujuan` });
      }
    }

    const oldAtt = attDirOf(item.full);
    const newAtt = attDirOf(target);
    const hasAtt = isDirSafe(oldAtt);
    if (hasAtt && oldAtt !== newAtt && fs.existsSync(newAtt) && oldAtt.toLowerCase() !== newAtt.toLowerCase()) {
      return sendJson(res, 409, { error: `Folder lampiran "${ATT}/${path.basename(newAtt)}" sudah ada di folder tujuan` });
    }

    fs.renameSync(item.full, target);
    if (hasAtt && oldAtt !== newAtt) {
      if (path.dirname(oldAtt) === path.dirname(newAtt)) fs.renameSync(oldAtt, newAtt);
      else moveAttachments(oldAtt, newAtt);
    }
    if (oldBase !== newBase) rewriteAttachmentLinks(target, oldBase, newBase);

    const newRel = [...dest.parts, newFilename].join('/');
    try {
      H.move(ROOT, oldRel, newRel);
    } catch {}
    cache.delete(oldRel);
    cache.delete(newRel);
    sendJson(res, 200, {
      ok: true,
      path: newRel,
      oldBase,
      newBase,
      version: fs.statSync(target).mtimeMs,
      renamed: oldBase !== newBase,
    });
  });
}

function handleQuickRemoveEmpty(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (b) => {
    const rel = typeof b.path === 'string' ? b.path : '';
    const full = resolveNote(rel);
    if (!full) return sendJson(res, 400, { error: 'Path tidak valid' });
    try {
      if (!fs.statSync(full).isFile()) return sendJson(res, 404, { error: 'Catatan tidak ditemukan' });
    } catch {
      return sendJson(res, 404, { error: 'Catatan tidak ditemukan' });
    }
    fs.unlinkSync(full);
    const att = attDirOf(full);
    if (isDirSafe(att)) {
      fs.rmSync(att, { recursive: true, force: true });
      const attParent = path.dirname(att);
      try {
        if (!fs.readdirSync(attParent).length) fs.rmdirSync(attParent);
      } catch {}
    }
    const hdir = H.histDir(ROOT, rel);
    if (isDirSafe(hdir)) {
      fs.rmSync(hdir, { recursive: true, force: true });
      const histStop = path.join(ROOT, H.HIST);
      let cur = path.dirname(hdir);
      while (cur.startsWith(histStop + path.sep)) {
        try {
          if (fs.readdirSync(cur).length) break;
          fs.rmdirSync(cur);
        } catch {
          break;
        }
        cur = path.dirname(cur);
      }
    }
    cache.delete(rel);
    sendJson(res, 200, { ok: true });
  });
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

// ---------- Lampiran dari editor (tempel / seret / tombol Lampirkan) ----------
// POST /api/attachment?note=<path.md>&desc=<deskripsi>  (gambar) atau &name=<nama-file> (file umum, maks 50 MB)
//   -> disimpan ke <folder catatan>/_lampiran/<nama-catatan>/NN-<nama>.<ext>
// POST /api/attachment/delete  { note, files: [nama] }  hapus lampiran (dipakai saat edit dibatalkan)
const MAX_UPLOAD = 10 * 1024 * 1024;
const MAX_FILE_UPLOAD = 50 * 1024 * 1024;
const UPLOAD_TYPES = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp' };
const UPLOAD_NAME = /^\d{2,4}-[a-z0-9][a-z0-9.-]*\.[a-z0-9]{1,12}$/;

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

function resolveAttachmentFile(rel) {
  if (typeof rel !== 'string' || !rel || rel.includes('\0') || rel.includes('\\')) return null;
  const segs = rel.split('/');
  const ok =
    segs.every((x) => x && x !== '.' && x !== '..' && (x === '_lampiran' || !isHiddenName(x))) &&
    segs.filter((x) => x === '_lampiran').length <= 1 &&
    segs[0] !== '_lampiran' &&
    segs.length >= 3 &&
    segs.includes('_lampiran');
  if (!ok) return null;
  const ext = path.extname(rel).toLowerCase();
  const type = IMAGE_TYPES[ext] || DOWNLOAD_TYPES[ext];
  const full = type ? resolveInside(segs) : null;
  if (!full) return null;
  try {
    const real = fs.realpathSync(full);
    if (!real.startsWith(fs.realpathSync(ROOT) + path.sep)) return null;
    const st = fs.statSync(real);
    if (!st.isFile()) return null;
    return { real, ext, type, size: st.size };
  } catch {
    return null;
  }
}

function splitHighlightedLines(html, expectedCount) {
  const rawLines = String(html).replace(/\r\n?/g, '\n').split('\n');
  const stack = [];
  const out = rawLines.map((line) => {
    const prefix = stack.join('');
    const tagRe = /<\/?span(?:\s+[^>]*)?>/g;
    let m;
    while ((m = tagRe.exec(line)) !== null) {
      if (m[0].startsWith('</')) stack.pop();
      else stack.push(m[0]);
    }
    return prefix + line + '</span>'.repeat(stack.length);
  });
  while (typeof expectedCount === 'number' && out.length < expectedCount) out.push('');
  return out;
}

function highlightCodeText(text, ext) {
  const norm = String(text || '').replace(/\r\n?/g, '\n');
  const plain = norm.split('\n');
  const lang = TEXT_EXT_LANG[ext] || 'plaintext';
  if (lang !== 'plaintext' && hljs.getLanguage(lang) && norm.length <= 512 * 1024) {
    const highlighted = hljs.highlight(norm, { language: lang, ignoreIllegals: true }).value;
    return { lang, linesHtml: splitHighlightedLines(highlighted, plain.length) };
  }
  return { lang, linesHtml: plain.map((l) => escapeHtml(l)) };
}

function handleAttachmentUpload(req, res, url) {
  if (!guardMutation(req, res)) return;
  const noteRel = url.searchParams.get('note') || '';
  const full = noteFileOf(noteRel);
  if (!full) return sendJson(res, 404, { error: 'Catatan tidak ditemukan' });
  const origName = path.basename(url.searchParams.get('name') || '');
  const reqExt = path.extname(origName).toLowerCase();
  const ctype = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const imgExt = UPLOAD_TYPES[ctype] || null;
  const isNamedFile = !!origName;
  if (!isNamedFile && !imgExt) return sendJson(res, 415, { error: 'Hanya gambar PNG, JPG, GIF, atau WebP' });
  if (isNamedFile && !IMAGE_TYPES[reqExt] && !DOWNLOAD_TYPES[reqExt]) {
    return sendJson(res, 415, { error: `Jenis file "${reqExt || 'tanpa ekstensi'}" tidak didukung.` });
  }
  const limit = isNamedFile && !imgExt ? MAX_FILE_UPLOAD : MAX_UPLOAD;
  const chunks = [];
  let size = 0;
  let aborted = false;
  req.on('data', (c) => {
    if (aborted) return;
    size += c.length;
    if (size > limit) {
      aborted = true;
      sendJson(res, 413, { error: `File terlalu besar (maks ${Math.round(limit / 1048576)} MB)` });
      req.destroy();
      return;
    }
    chunks.push(c);
  });
  req.on('end', () => {
    if (aborted) return;
    try {
      const buf = Buffer.concat(chunks);
      if (!buf.length) return sendJson(res, 400, { error: 'File kosong' });
      let finalExt;
      let kind = 'file';
      if (!isNamedFile || (imgExt && IMAGE_TYPES[reqExt] && reqExt !== '.svg')) {
        const real = sniffImage(buf);
        if (!real) return sendJson(res, 415, { error: 'Isi file bukan gambar yang dikenali' });
        finalExt = real;
        kind = 'image';
      } else {
        finalExt = reqExt;
        kind = IMAGE_TYPES[reqExt] ? 'image' : 'file';
      }
      const dir = attDirOf(full);
      fs.mkdirSync(dir, { recursive: true });
      const rawLabel = isNamedFile ? path.basename(origName, reqExt) : url.searchParams.get('desc') || '';
      const slug = cleanName(rawLabel).replace(/\./g, '-').slice(0, 60).replace(/-+$/, '') || (kind === 'image' ? 'gambar' : 'lampiran');
      let n = 0;
      for (const f of fs.readdirSync(dir)) {
        const m = /^(\d+)-/.exec(f);
        if (m) n = Math.max(n, parseInt(m[1], 10));
      }
      let name;
      for (let i = 0; i < 20; i++) {
        name = `${String(n + 1 + i).padStart(2, '0')}-${slug}${finalExt}`;
        try {
          fs.writeFileSync(path.join(dir, name), buf, { flag: 'wx' });
          break;
        } catch (err) {
          if (err.code !== 'EEXIST' || i === 19) throw err;
        }
      }
      const noteBase = path.basename(full).replace(/\.md$/i, '');
      sendJson(res, 200, { ok: true, name, originalName: origName || name, path: `${ATT}/${noteBase}/${name}`, ext: finalExt, size: buf.length, kind });
    } catch (err) {
      console.error(err);
      sendJson(res, 500, { error: 'Gagal menyimpan lampiran' });
    }
  });
}

// Encoding file teks lampiran dikenali dari BOM. File SSMS umumnya UTF-16 LE (BOM FF FE);
// kalau dibaca sebagai UTF-8, CRLF-nya pecah menjadi dua ganti baris.
function detectTextEncoding(buf) {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return 'utf16le';
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) return 'utf16be';
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return 'utf8bom';
  return 'utf8';
}

function swapBytes16(buf) {
  const out = Buffer.from(buf.subarray(0, buf.length - (buf.length % 2)));
  return out.swap16();
}

function decodeTextBuffer(buf) {
  const enc = detectTextEncoding(buf);
  let text;
  if (enc === 'utf16le') text = buf.subarray(2).toString('utf16le');
  else if (enc === 'utf16be') text = swapBytes16(buf.subarray(2)).toString('utf16le');
  else text = buf.toString('utf8').replace(/^﻿/, '');
  return { text, enc };
}

function encodeTextBuffer(text, enc) {
  if (enc === 'utf16le') return Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]);
  if (enc === 'utf16be') return Buffer.concat([Buffer.from([0xfe, 0xff]), swapBytes16(Buffer.from(text, 'utf16le'))]);
  if (enc === 'utf8bom') return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text, 'utf8')]);
  return Buffer.from(text, 'utf8');
}

function handleAttachmentSave(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(
    req,
    res,
    (body) => {
      const rel = typeof body.file === 'string' ? body.file : '';
      const content = typeof body.content === 'string' ? body.content : null;
      if (content === null) return sendJson(res, 400, { error: 'Isi file tidak valid.' });
      const info = resolveAttachmentFile(rel);
      if (!info || !TEXT_EXT_LANG[info.ext]) {
        return sendJson(res, 404, { error: 'File tidak ditemukan atau bukan file teks/kode.' });
      }
      try {
        // Pertahankan encoding asli file (mis. UTF-16 dari SSMS).
        let enc = 'utf8';
        try {
          const fd = fs.openSync(info.real, 'r');
          const head = Buffer.alloc(3);
          const n = fs.readSync(fd, head, 0, 3, 0);
          fs.closeSync(fd);
          enc = detectTextEncoding(head.subarray(0, n));
        } catch {}
        const tmp = `${info.real}.tmp-${process.pid}-${Date.now()}`;
        fs.writeFileSync(tmp, encodeTextBuffer(content, enc));
        fs.renameSync(tmp, info.real);
        const st = fs.statSync(info.real);
        const { lang, linesHtml } = highlightCodeText(content, info.ext);
        sendJson(res, 200, { ok: true, size: st.size, lang, linesHtml });
      } catch (err) {
        console.error(err);
        sendJson(res, 500, { error: 'Gagal menyimpan file: ' + (err && err.message ? err.message : err) });
      }
    },
    10 * 1024 * 1024,
  );
}

function handleCodeHighlight(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(
    req,
    res,
    (body) => {
      const ext = typeof body.ext === 'string' ? body.ext.toLowerCase() : '.txt';
      const text = typeof body.text === 'string' ? body.text : '';
      const { lang, linesHtml } = highlightCodeText(text, ext);
      sendJson(res, 200, { ok: true, lang, linesHtml });
    },
    2 * 1024 * 1024,
  );
}

function handleAttachmentReveal(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (body) => {
    const rel = typeof body.file === 'string' ? body.file : '';
    const info = resolveAttachmentFile(rel);
    const openTarget = (target, isFile) => {
      try {
        if (process.platform === 'win32') {
          if (isFile && !target.includes('"')) {
            spawn('explorer.exe', [`/select,"${target}"`], { detached: true, stdio: 'ignore', windowsVerbatimArguments: true }).unref();
          } else {
            spawn('explorer.exe', [isFile ? path.dirname(target) : target], { detached: true, stdio: 'ignore' }).unref();
          }
        } else if (process.platform === 'darwin') {
          spawn('open', isFile ? ['-R', target] : [target], { detached: true, stdio: 'ignore' }).unref();
        } else {
          spawn('xdg-open', [isFile ? path.dirname(target) : target], { detached: true, stdio: 'ignore' }).unref();
        }
        return true;
      } catch {
        return false;
      }
    };
    if (info && info.real) {
      if (!openTarget(info.real, true)) return sendJson(res, 500, { error: 'Gagal membuka folder lokasi file.' });
      return sendJson(res, 200, { ok: true, path: info.real });
    }
    // Jika file sudah terhapus, coba buka folder _lampiran induknya bila masih ada.
    const segs = rel.split('/');
    const ok =
      typeof rel === 'string' &&
      !rel.includes('\0') &&
      !rel.includes('\\') &&
      segs.every((x) => x && x !== '.' && x !== '..' && (x === '_lampiran' || !isHiddenName(x))) &&
      segs.filter((x) => x === '_lampiran').length <= 1 &&
      segs[0] !== '_lampiran' &&
      segs.length >= 3 &&
      segs.includes('_lampiran');
    const dirFull = ok ? resolveInside(segs.slice(0, -1)) : null;
    if (dirFull) {
      try {
        const realDir = fs.realpathSync(dirFull);
        if (realDir.startsWith(fs.realpathSync(ROOT) + path.sep) && fs.statSync(realDir).isDirectory()) {
          if (!openTarget(realDir, false)) return sendJson(res, 500, { error: 'Gagal membuka folder.' });
          return sendJson(res, 200, { ok: true, path: realDir, folderOnly: true });
        }
      } catch {}
    }
    return sendJson(res, 404, { error: 'File atau folder lokasi tidak ditemukan.' });
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

// PDF hasil ekspor disimpan sebentar di memori supaya bisa ditampilkan di penampil PDF (iframe satu asal) lalu diunduh dari sana.
const exportTmp = new Map();
function stashExport(buf, name) {
  const now = Date.now();
  for (const [k, v] of exportTmp) if (v.exp < now) exportTmp.delete(k);
  while (exportTmp.size >= 20) exportTmp.delete(exportTmp.keys().next().value);
  const id = require('crypto').randomBytes(16).toString('hex');
  exportTmp.set(id, { buf, name, exp: now + 15 * 60 * 1000 });
  return id;
}

// GET /api/export/file?id=...[&dl=1]  tampil (inline) di penampil, atau unduh bila dl=1
function handleExportFile(req, res, url) {
  const id = url.searchParams.get('id') || '';
  const e = /^[a-f0-9]{32}$/.test(id) ? exportTmp.get(id) : null;
  if (!e || e.exp < Date.now()) return sendText(res, 404, 'Not Found');
  const dl = url.searchParams.get('dl') === '1';
  res.writeHead(200, {
    ...SEC_HEADERS,
    'Content-Type': 'application/pdf',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': dl ? "default-src 'none'; sandbox" : "frame-ancestors 'self'",
    ...(dl
      ? { 'Content-Disposition': contentDisposition(e.name) }
      : { 'X-Frame-Options': 'SAMEORIGIN', 'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(e.name)}` }),
  });
  res.end(req.method === 'HEAD' ? undefined : e.buf);
}

// POST /api/export  { path, format: 'pdf'|'docx', mermaid: [{png,w,h}|null, ...] }
// pdf -> { id, name } (ditampilkan di penampil); docx -> berkas langsung diunduh.
// mermaid[i] = gambar diagram untuk blok mermaid ke-i bila pengguna memilih tampilan Diagram; null = kode mentah.
function handleExportPost(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(
    req,
    res,
    (b) => {
      const u = new URL('http://local/api/export');
      u.searchParams.set('path', String(b.path || ''));
      u.searchParams.set('format', String(b.format || ''));
      const draft = typeof b.content === 'string' ? { content: b.content, name: b.name } : null; // Live Preview: tanpa file
      handleExport(u, res, Array.isArray(b.mermaid) ? b.mermaid : [], b.format === 'pdf', b.theme === 'dark', b.orientation === 'landscape', draft);
    },
    40 * 1024 * 1024,
  );
}

// Ekspor catatan: ?path=...&format=md|html|pdf|docx|print
async function handleExport(url, res, diagrams = [], stash = false, dark = false, landscape = false, draft = null) {
  const format = url.searchParams.get('format');
  let rel, raw, st;
  if (draft) {
    // Live Preview Markdown: isi dikirim langsung dari editor, tidak ada file di disk.
    const nm = String(draft.name || '').replace(/[\\/:*?"<>|\r\n\t]+/g, ' ').trim().slice(0, 120) || 'live-preview';
    rel = nm + '.md';
    raw = Buffer.from(String(draft.content), 'utf8');
    st = { birthtimeMs: Date.now(), mtimeMs: Date.now() };
  } else {
    rel = url.searchParams.get('path');
    const full = resolveNote(rel);
    if (!full) return sendJson(res, 400, { error: 'Path tidak valid' });
    try {
      st = fs.statSync(full);
      raw = fs.readFileSync(full);
    } catch {
      return sendJson(res, 404, { error: 'Catatan tidak ditemukan' });
    }
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
  const withDiagrams = (maxW) => exporter.applyDiagrams(bodyHtml, diagrams, maxW);

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
      const pdf = await exporter.makePdf(
        exporter.htmlDocument({ title, meta: info, bodyHtml: withDiagrams(landscape ? 1000 : 700), dark, landscape }),
      );
      const pdfName = baseName + (landscape ? '-lanskap' : '') + '.pdf';
      if (stash) return sendJson(res, 200, { id: stashExport(pdf, pdfName), name: pdfName });
      return send('application/pdf', pdf, '.pdf');
    }
    if (format === 'docx') {
      const docx = await exporter.makeDocx(exporter.htmlDocument({ title, meta: info, bodyHtml: withDiagrams(600) }));
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

// ---------- Dashboard: statistik folder catatan, hanya dihitung saat pengguna menekan "Scan" ----------
function scanDashboard() {
  const t0 = Date.now();
  const DAY = 86400000;
  const now = Date.now();
  const totals = { clients: 0, folders: 0, notes: 0, attachments: 0, attachmentBytes: 0, issues: 0, autoCreate: 0, words: 0 };
  const clients = new Map();
  const created = {};
  const createdDay = {};
  const modified = {};
  const tags = {};
  const env = {};
  const recent = [];
  const issueList = [];
  let changed7 = 0;
  let changed30 = 0;

  const clientOf = (name) => {
    if (!clients.has(name)) {
      clients.set(name, { name, notes: 0, folders: 0, issues: 0, autoCreate: 0, attachments: 0, bytes: 0, noteBytes: 0, attachmentBytes: 0 });
    }
    return clients.get(name);
  };
  const dayKey = (ms) => formatDate(ms).slice(0, 10);
  const monthKey = (ms) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  const countAttachments = (dir, c) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) countAttachments(f, c);
      else if (e.isFile()) {
        totals.attachments++;
        if (c) c.attachments++;
        try {
          const size = fs.statSync(f).size;
          totals.attachmentBytes += size;
          if (c) {
            c.attachmentBytes += size;
            c.bytes += size;
          }
        } catch {}
      }
    }
  };
  const walk = (dir, parts) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const c = parts.length ? clientOf(parts[0]) : null;
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === ATT) {
          countAttachments(full, c);
          continue;
        }
        if (isHiddenName(e.name)) continue;
        if (!parts.length) {
          totals.clients++;
          clientOf(e.name);
        } else {
          totals.folders++;
          c.folders++;
          if (parts.length === 2 && parts[1] === 'issue' && /^\d{3}-/.test(e.name)) {
            totals.issues++;
            c.issues++;
            issueList.push({ client: parts[0], name: e.name, path: [...parts, e.name].join('/') });
          }
        }
        walk(full, [...parts, e.name]);
      } else if (e.isFile() && /\.md$/i.test(e.name) && parts.length) {
        let text = '';
        let st;
        try {
          st = fs.statSync(full);
          text = fs.readFileSync(full, 'utf8');
        } catch {
          continue;
        }
        if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
        const { meta, body } = parseFrontmatter(text);
        const cMs = parseDate(meta.dibuat) ?? st.birthtimeMs;
        const mMs = parseDate(meta.diubah) ?? st.mtimeMs;
        totals.notes++;
        c.notes++;
        c.noteBytes += st.size;
        c.bytes += st.size;
        totals.noteBytes = (totals.noteBytes || 0) + st.size;
        totals.words += (body.match(/\S+/g) || []).length;
        if (parts.includes('AutoCreateAI')) {
          totals.autoCreate++;
          c.autoCreate++;
        }
        created[monthKey(cMs)] = (created[monthKey(cMs)] || 0) + 1;
        createdDay[dayKey(cMs)] = (createdDay[dayKey(cMs)] || 0) + 1;
        modified[monthKey(mMs)] = (modified[monthKey(mMs)] || 0) + 1;
        if (now - mMs <= 7 * DAY) changed7++;
        if (now - mMs <= 30 * DAY) changed30++;
        for (const t of parseTags(meta.tag)) tags[t] = (tags[t] || 0) + 1;
        for (const v of String(meta.lingkungan || '').split(/[,;]/).map((x) => x.trim().toLowerCase()).filter(Boolean)) {
          env[v] = (env[v] || 0) + 1;
        }
        if (!meta.lingkungan) env['(tidak diisi)'] = (env['(tidak diisi)'] || 0) + 1;
        const tm = body.match(/^#\s+(.+)$/m);
        recent.push({ path: [...parts, e.name].join('/'), title: tm ? tm[1].trim() : e.name.replace(/\.md$/i, ''), modified: mMs });
      }
    }
  };
  walk(ROOT, []);

  // Catatan langsung di akar (AGENTS.md, ATURAN-AI.md, ...) tidak dihitung sebagai milik client.
  recent.sort((a, b) => b.modified - a.modified);
  return {
    version: 2, // naikkan bila bentuk data berubah, supaya hasil scan lama di browser tidak dipakai
    scannedAt: now,
    durationMs: Date.now() - t0,
    totals: { ...totals, trash: trashCount(), changed7, changed30 },
    clients: [...clients.values()].sort((a, b) => b.notes - a.notes || a.name.localeCompare(b.name, 'id')),
    createdByMonth: created,
    createdByDay: createdDay,
    modifiedByMonth: modified,
    tags: Object.entries(tags)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'id')),
    env: Object.entries(env)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    recent: recent.slice(0, 30),
    issueList: issueList.sort((a, b) => a.client.localeCompare(b.client, 'id') || a.name.localeCompare(b.name, 'id')),
  };
}

// Gambar di catatan yang ada di Sampah. Route /files/ tidak melayani _trash, jadi gambar disisipkan
// sebagai data URI. Lampiran catatan yang dihapus sendirian tersimpan di _trash/<id>/.lampiran/,
// sedangkan isi catatan tetap merujuk _lampiran/<nama-catatan>/<file>.
function trashImageSrc(entry, noteFile, src) {
  const raw = String(src || '');
  if (!raw || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(raw)) return raw;
  let dec;
  try {
    dec = decodeURIComponent(raw.split(/[?#]/)[0]).replace(/\\/g, '/');
  } catch {
    return raw;
  }
  const type = IMAGE_TYPES[path.extname(dec).toLowerCase()];
  if (!type) return raw;
  const container = path.join(ROOT, TRASH, entry.id);
  const inside = (f) => f === container || f.startsWith(container + path.sep);
  const candidates = [path.resolve(path.dirname(noteFile), dec)];
  const m = /^(?:\.\/)?_lampiran\/([^/]+)\/(.+)$/.exec(dec);
  if (m && m[1] === path.basename(noteFile, path.extname(noteFile))) {
    candidates.push(path.resolve(container, '.lampiran', m[2]));
  }
  for (const f of candidates) {
    if (!inside(f)) continue;
    try {
      const st = fs.statSync(f);
      if (st.isFile() && st.size <= 15 * 1024 * 1024) return `data:${type};base64,${fs.readFileSync(f).toString('base64')}`;
    } catch {}
  }
  return raw;
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

// Pulihkan catatan ke salah satu versi di riwayat: timpa catatan ini (default) atau buat catatan baru (mode: 'new').
function handleHistoryRestore(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (b) => {
    const rel = String(b.path || '');
    const full = resolveNote(rel);
    if (!full) return sendJson(res, 400, { error: 'Path tidak valid' });
    let text = H.read(ROOT, rel, b.id);
    if (text === null) return sendJson(res, 404, { error: 'Versi tidak ditemukan' });

    if (b.mode === 'new') {
      const dir = resolveDirPath(b.folder ?? '');
      if (!dir) return sendJson(res, 400, { error: 'Folder tujuan tidak valid' });
      const title = String(b.title || '').replace(/\s+/g, ' ').trim().slice(0, 200);
      if (!title) return sendJson(res, 400, { error: 'Nama file wajib diisi' });

      const base = cleanName(title) || 'catatan';
      let name = `${base}.md`;
      for (let n = 2; fs.existsSync(path.join(dir.full, name)); n++) name = `${base}-${n}.md`;
      const targetRel = [...dir.parts, name].join('/');
      const targetFull = path.join(dir.full, name);

      let outText = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
      const oldAtt = attDirOf(full);
      const newAtt = attDirOf(targetFull);
      const oldBase = path.basename(full).replace(/\.md$/i, '');
      const newBase = name.replace(/\.md$/i, '');
      const encOld = encodeURIComponent(oldBase);
      const hasRef = outText.includes(`_lampiran/${oldBase}/`) || (encOld !== oldBase && outText.includes(`_lampiran/${encOld}/`));
      if (hasRef && isDirSafe(oldAtt)) {
        try {
          for (const entry of fs.readdirSync(oldAtt)) {
            const srcFile = path.join(oldAtt, entry);
            if (!fs.statSync(srcFile).isFile()) continue;
            if (!outText.includes(entry) && !outText.includes(encodeURIComponent(entry))) continue;
            fs.mkdirSync(newAtt, { recursive: true });
            fs.copyFileSync(srcFile, path.join(newAtt, entry));
          }
        } catch {}
        outText = outText.split(`_lampiran/${oldBase}/`).join(`_lampiran/${newBase}/`);
        if (encOld !== oldBase) outText = outText.split(`_lampiran/${encOld}/`).join(`_lampiran/${encodeURIComponent(newBase)}/`);
      }

      const { meta, body } = parseFrontmatter(outText);
      const now = formatDate(Date.now());
      meta.dibuat = now;
      meta.diubah = now;
      const firstKeys = ['dibuat', 'diubah', 'lingkungan', 'ringkasan', 'tag'].filter((k) => k in meta);
      const keys = [...firstKeys, ...Object.keys(meta).filter((k) => !firstKeys.includes(k))];
      const front = keys.map((k) => `${k}: ${meta[k]}`).join('\n');
      const cleanBody = body.replace(/^\s*\n/, '').replace(/\s+$/, '');
      const bodyLines = cleanBody.split('\n');
      let fence = null;
      let h1Idx = -1;
      for (let i = 0; i < bodyLines.length; i++) {
        const fm = bodyLines[i].match(/^\s*(`{3,}|~{3,})/);
        if (fm) {
          if (!fence) fence = fm[1][0];
          else if (fm[1][0] === fence) fence = null;
          continue;
        }
        if (!fence && /^#\s+\S/.test(bodyLines[i])) {
          h1Idx = i;
          break;
        }
      }
      if (h1Idx >= 0) bodyLines[h1Idx] = `# ${title}`;
      const titledBody = h1Idx >= 0 ? bodyLines.join('\n') : (cleanBody ? `# ${title}\n\n${cleanBody}` : `# ${title}`);
      const finalOut = `---\n${front}\n---\n\n${titledBody}\n`;

      fs.writeFileSync(targetFull, finalOut, { encoding: 'utf8', flag: 'wx' });
      try {
        H.record(ROOT, targetRel, 'baru');
      } catch {}
      return sendJson(res, 200, { ok: true, path: targetRel });
    }

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

// ---------- Rekaman Meeting ----------

function handleRecordingStart(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (body) => {
    const linkedNote = typeof body.linkedNote === 'string' && body.linkedNote.trim() ? body.linkedNote.trim() : '';
    if (linkedNote && !resolveNote(linkedNote)) {
      return sendJson(res, 400, { error: 'Path catatan tertaut tidak valid' });
    }
    ensureRecordingsDir();
    const item = Rec.createSession(RECORDINGS_DIR, {
      title: typeof body.title === 'string' ? body.title : '',
      mode: body.mode === 'online' ? 'online' : 'offline',
      linkedNote,
      micMime: typeof body.micMime === 'string' ? body.micMime : 'audio/webm',
      systemMime: typeof body.systemMime === 'string' ? body.systemMime : 'audio/webm',
    });
    return sendJson(res, 200, { ok: true, item });
  });
}

function handleRecordingChunk(req, res, url) {
  if (!guardMutation(req, res)) return;
  const id = url.searchParams.get('id') || '';
  const track = url.searchParams.get('track') || '';
  if (!Rec.isValidId(id) || !Rec.CHUNK_TRACKS.has(track)) {
    return sendJson(res, 400, { error: 'Parameter rekaman tidak valid' });
  }
  const MAX_CHUNK = 10 * 1024 * 1024;
  const chunks = [];
  let size = 0;
  let aborted = false;
  req.on('data', (c) => {
    if (aborted) return;
    size += c.length;
    if (size > MAX_CHUNK) {
      aborted = true;
      sendJson(res, 413, { error: 'Potongan audio terlalu besar' });
      return;
    }
    chunks.push(c);
  });
  req.on('end', () => {
    if (aborted) return;
    try {
      const buf = Buffer.concat(chunks);
      const totalSize = Rec.appendChunk(RECORDINGS_DIR, id, track, buf);
      if (totalSize === null) return sendJson(res, 404, { error: 'Sesi rekaman tidak ditemukan' });
      return sendJson(res, 200, { ok: true, size: totalSize });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: 'Gagal menyimpan potongan audio' });
    }
  });
}

function handleRecordingFinish(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (body) => {
    const id = typeof body.id === 'string' ? body.id : '';
    if (!Rec.isValidId(id)) return sendJson(res, 400, { error: 'ID rekaman tidak valid' });
    const opts = { durationSec: body.durationSec };
    if (typeof body.title === 'string') opts.title = body.title;
    if (typeof body.linkedNote === 'string') {
      const ln = body.linkedNote.trim();
      if (ln && !resolveNote(ln)) return sendJson(res, 400, { error: 'Path catatan tertaut tidak valid' });
      opts.linkedNote = ln;
    }
    const item = Rec.finishSession(RECORDINGS_DIR, id, opts);
    if (!item) return sendJson(res, 404, { error: 'Sesi rekaman tidak ditemukan' });
    return sendJson(res, 200, { ok: true, item });
  });
}

function handleRecordingUpdate(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (body) => {
    const id = typeof body.id === 'string' ? body.id : '';
    if (!Rec.isValidId(id)) return sendJson(res, 400, { error: 'ID rekaman tidak valid' });
    const opts = {};
    if (typeof body.title === 'string') opts.title = body.title;
    if (body.linkedNote !== undefined) {
      const ln = typeof body.linkedNote === 'string' ? body.linkedNote.trim() : '';
      if (ln && !resolveNote(ln)) return sendJson(res, 400, { error: 'Path catatan tertaut tidak valid' });
      opts.linkedNote = ln;
    }
    if (typeof body.transcriptStatus === 'string') opts.transcriptStatus = body.transcriptStatus;
    const item = Rec.updateRecording(RECORDINGS_DIR, id, opts);
    if (!item) return sendJson(res, 404, { error: 'Sesi rekaman tidak ditemukan' });
    return sendJson(res, 200, { ok: true, item });
  });
}

function handleRecordingDelete(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (body) => {
    const id = typeof body.id === 'string' ? body.id : '';
    if (!Rec.isValidId(id)) return sendJson(res, 400, { error: 'ID rekaman tidak valid' });
    const ok = Rec.deleteRecording(RECORDINGS_DIR, id);
    if (!ok) return sendJson(res, 404, { error: 'Rekaman tidak ditemukan' });
    return sendJson(res, 200, { ok: true });
  });
}

function handleRecordingCombine(req, res, url) {
  if (!guardMutation(req, res)) return;
  const id = url.searchParams.get('id') || '';
  const rawExt = (url.searchParams.get('ext') || 'wav').toLowerCase();
  const ext = rawExt === 'webm' ? 'webm' : 'wav';
  const dir = Rec.resolveSessionDir(RECORDINGS_DIR, id);
  if (!dir || !Rec.getRecording(RECORDINGS_DIR, id)) {
    return sendJson(res, 404, { error: 'Sesi rekaman tidak ditemukan' });
  }

  const fileName = `combined.${ext}`;
  const finalPath = path.join(dir, fileName);
  const tmpPath = path.join(dir, `${fileName}.${process.pid}.${Date.now()}.tmp`);
  const MAX_COMBINE = 250 * 1024 * 1024;
  const ws = fs.createWriteStream(tmpPath);
  let size = 0;
  let failed = false;
  let completed = false;

  const cleanupTmp = () => {
    try {
      fs.unlinkSync(tmpPath);
    } catch {}
  };

  const failWith = (code, msg) => {
    if (failed || completed) return;
    failed = true;
    ws.destroy();
    cleanupTmp();
    if (!res.headersSent) sendJson(res, code, { error: msg });
  };

  req.on('data', (chunk) => {
    if (failed) return;
    size += chunk.length;
    if (size > MAX_COMBINE) {
      failWith(413, 'File gabungan melebihi batas 250 MB');
      req.destroy();
      return;
    }
    if (!ws.write(chunk)) {
      req.pause();
    }
  });
  ws.on('drain', () => {
    if (!failed) req.resume();
  });
  req.on('aborted', () => failWith(499, 'Upload dibatalkan'));
  req.on('error', () => failWith(500, 'Gagal menerima file gabungan'));
  ws.on('error', () => failWith(500, 'Gagal menulis file gabungan'));
  req.on('end', () => {
    if (!failed) ws.end();
  });
  ws.on('finish', () => {
    if (failed) return;
    completed = true;
    try {
      fs.renameSync(tmpPath, finalPath);
      const item = Rec.saveCombinedMeta(RECORDINGS_DIR, id, {
        file: fileName,
        mime: ext === 'wav' ? 'audio/wav' : 'audio/webm',
        size,
      });
      if (!item) {
        cleanupTmp();
        return sendJson(res, 404, { error: 'Sesi rekaman tidak ditemukan' });
      }
      return sendJson(res, 200, { ok: true, item });
    } catch (err) {
      console.error(err);
      cleanupTmp();
      return sendJson(res, 500, { error: 'Gagal menyimpan file gabungan' });
    }
  });
}

function handleRecordingAudio(req, res, url) {
  const id = url.searchParams.get('id') || '';
  const track = url.searchParams.get('track') || '';
  const isDownload = url.searchParams.get('download') === '1';
  const info = Rec.resolveTrackFile(RECORDINGS_DIR, id, track);
  if (!info) return sendText(res, 404, 'Not Found');

  const { fullPath, fileName, mime, size } = info;
  const downloadName = encodeURIComponent(`${id}_${fileName}`);
  const dispHeader = isDownload ? { 'Content-Disposition': `attachment; filename*=UTF-8''${downloadName}` } : {};

  if (size === 0) {
    if (req.headers.range) {
      res.writeHead(416, { 'Content-Range': 'bytes */0', ...SEC_HEADERS });
      return res.end();
    }
    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': 0,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
      ...dispHeader,
      ...SEC_HEADERS,
    });
    return res.end();
  }

  const rangeHeader = req.headers.range;
  if (rangeHeader && !isDownload) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(String(rangeHeader).trim());
    if (!m || (!m[1] && !m[2])) {
      res.writeHead(416, { 'Content-Range': `bytes */${size}`, ...SEC_HEADERS });
      return res.end();
    }
    let start;
    let end;
    if (!m[1]) {
      const suffix = parseInt(m[2], 10);
      start = Math.max(0, size - suffix);
      end = size - 1;
    } else {
      start = parseInt(m[1], 10);
      end = m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || end >= size) {
      res.writeHead(416, { 'Content-Range': `bytes */${size}`, ...SEC_HEADERS });
      return res.end();
    }
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': mime,
      'Cache-Control': 'no-store',
      ...SEC_HEADERS,
    });
    if (req.method === 'HEAD') return res.end();
    const rs = fs.createReadStream(fullPath, { start, end });
    rs.on('error', () => {
      if (!res.headersSent) sendText(res, 500, 'Read Error');
      else res.destroy();
    });
    return rs.pipe(res);
  }

  res.writeHead(200, {
    'Content-Type': mime,
    'Content-Length': size,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
    ...dispHeader,
    ...SEC_HEADERS,
  });
  if (req.method === 'HEAD') return res.end();
  const rs = fs.createReadStream(fullPath);
  rs.on('error', () => {
    if (!res.headersSent) sendText(res, 500, 'Read Error');
    else res.destroy();
  });
  return rs.pipe(res);
}

function handleRecordingFilesList(req, res, url) {
  const id = url.searchParams.get('id') || '';
  const item = Rec.getRecording(RECORDINGS_DIR, id);
  if (!item) return sendJson(res, 404, { error: 'Rekaman tidak ditemukan' });
  const files = Rec.listSessionFiles(RECORDINGS_DIR, id);
  if (!files) return sendJson(res, 404, { error: 'Rekaman tidak ditemukan' });
  return sendJson(res, 200, { ok: true, id, dirPath: item.dirPath, files });
}

function handleRecordingFileTextGet(req, res, url) {
  const id = url.searchParams.get('id') || '';
  const name = url.searchParams.get('name') || '';
  const result = Rec.readSessionTextFile(RECORDINGS_DIR, id, name);
  if (!result) return sendJson(res, 404, { error: 'File teks tidak ditemukan' });
  if (result.tooLarge) return sendJson(res, 413, { error: 'File teks terlalu besar untuk dibuka di popup' });
  return sendJson(res, 200, { ok: true, file: result });
}

function handleRecordingFileTextSave(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(
    req,
    res,
    (body) => {
      const id = typeof body.id === 'string' ? body.id : '';
      const name = typeof body.name === 'string' ? body.name : '';
      const content = typeof body.content === 'string' ? body.content : '';
      const overwrite = body.overwrite === true;
      const out = Rec.writeSessionTextFile(RECORDINGS_DIR, id, name, content, { overwrite });
      if (out.conflict) return sendJson(res, 409, { error: `File "${out.name}" sudah ada.`, conflict: true, name: out.name });
      if (out.error) return sendJson(res, out.code || 400, { error: out.error });
      return sendJson(res, 200, { ok: true, file: out.file });
    },
    4 * 1024 * 1024,
  );
}

function handleRecordingFileUpload(req, res, url) {
  if (!guardMutation(req, res)) return;
  const id = url.searchParams.get('id') || '';
  const rawName = url.searchParams.get('name') || '';
  const dir = Rec.resolveSessionDir(RECORDINGS_DIR, id);
  const item = dir ? Rec.getRecording(RECORDINGS_DIR, id) : null;
  if (!dir || !item) return sendJson(res, 404, { error: 'Sesi rekaman tidak ditemukan' });

  const targetName = Rec.uniqueUploadFileName(dir, item, rawName);
  if (!targetName) return sendJson(res, 400, { error: 'Nama file tidak valid' });

  const finalPath = path.join(dir, targetName);
  const tmpPath = path.join(dir, `${targetName}.${process.pid}.${Date.now()}.tmp`);
  const MAX_UPLOAD = 100 * 1024 * 1024;
  const ws = fs.createWriteStream(tmpPath);
  let size = 0;
  let failed = false;
  let completed = false;

  const cleanupTmp = () => {
    try {
      fs.unlinkSync(tmpPath);
    } catch {}
  };

  const failWith = (code, msg) => {
    if (failed || completed) return;
    failed = true;
    ws.destroy();
    cleanupTmp();
    if (!res.headersSent) sendJson(res, code, { error: msg });
  };

  req.on('data', (chunk) => {
    if (failed) return;
    size += chunk.length;
    if (size > MAX_UPLOAD) {
      failWith(413, 'Ukuran file melebihi batas 100 MB');
      req.destroy();
      return;
    }
    if (!ws.write(chunk)) {
      req.pause();
    }
  });
  ws.on('drain', () => {
    if (!failed) req.resume();
  });
  req.on('aborted', () => failWith(499, 'Upload dibatalkan'));
  req.on('error', () => failWith(500, 'Gagal menerima file'));
  ws.on('error', () => failWith(500, 'Gagal menulis file'));
  req.on('end', () => {
    if (!failed) ws.end();
  });
  ws.on('finish', () => {
    if (failed) return;
    completed = true;
    try {
      fs.renameSync(tmpPath, finalPath);
      Rec.touchSession(RECORDINGS_DIR, id);
      const file = Rec.resolveSessionFile(RECORDINGS_DIR, id, targetName);
      return sendJson(res, 200, { ok: true, file });
    } catch (err) {
      console.error(err);
      cleanupTmp();
      return sendJson(res, 500, { error: 'Gagal menyimpan file' });
    }
  });
}

function handleRecordingFileDelete(req, res) {
  if (!guardMutation(req, res)) return;
  readJsonBody(req, res, (body) => {
    const id = typeof body.id === 'string' ? body.id : '';
    const name = typeof body.name === 'string' ? body.name : '';
    if (!Rec.isValidId(id) || !name) return sendJson(res, 400, { error: 'Parameter tidak valid' });
    const ok = Rec.deleteSessionFile(RECORDINGS_DIR, id, name);
    if (!ok) return sendJson(res, 400, { error: 'File tidak ditemukan atau tidak boleh dihapus' });
    return sendJson(res, 200, { ok: true });
  });
}

function handleRecordingFileDownload(req, res, url) {
  const id = url.searchParams.get('id') || '';
  const name = url.searchParams.get('name') || '';
  const info = Rec.resolveSessionFile(RECORDINGS_DIR, id, name);
  if (!info) return sendText(res, 404, 'Not Found');
  const fname = encodeURIComponent(info.name);
  res.writeHead(200, {
    'Content-Type': info.mime,
    'Content-Length': info.size,
    'Cache-Control': 'no-store',
    'Content-Disposition': `attachment; filename*=UTF-8''${fname}`,
    ...SEC_HEADERS,
  });
  if (req.method === 'HEAD') return res.end();
  const rs = fs.createReadStream(info.fullPath);
  rs.on('error', () => {
    if (!res.headersSent) sendText(res, 500, 'Read Error');
    else res.destroy();
  });
  return rs.pipe(res);
}

// ---------- Login ----------
// manifest.json dan ikon PWA diambil browser tanpa cookie, jadi harus bisa dibuka tanpa login (isinya tidak rahasia).
const PUBLIC_WHEN_LOGGED_OUT = new Set([
  '/login.html',
  '/login.js',
  '/login.css',
  '/style.css',
  '/theme.js',
  '/favicon.svg',
  '/public-view.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]);

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
      return sendJson(res, 200, { ok: true, user, role: Auth.roleOf(user), readOnly: Auth.isReadOnly(user) });
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
  '/dialogs.js': ['dialogs.js', 'application/javascript; charset=utf-8'],
  '/recordings.js': ['recordings.js', 'application/javascript; charset=utf-8'],
  '/recordings.css': ['recordings.css', 'text/css; charset=utf-8'],
  '/dashboard.js': ['dashboard.js', 'application/javascript; charset=utf-8'],
  '/dashboard.css': ['dashboard.css', 'text/css; charset=utf-8'],
  '/pwa.js': ['pwa.js', 'application/javascript; charset=utf-8'],
  '/favicon.svg': ['favicon.svg', 'image/svg+xml'],
  '/manifest.json': ['manifest.json', 'application/manifest+json; charset=utf-8'],
  '/sw.js': ['sw.js', 'application/javascript; charset=utf-8'],
  '/icon-192.png': ['icon-192.png', 'image/png'],
  '/icon-512.png': ['icon-512.png', 'image/png'],
  '/login.html': ['login.html', 'text/html; charset=utf-8'],
  '/login.js': ['login.js', 'application/javascript; charset=utf-8'],
  '/login.css': ['login.css', 'text/css; charset=utf-8'],
  '/public-view.js': ['public-view.js', 'application/javascript; charset=utf-8'],
  '/cepat': ['cepat.html', 'text/html; charset=utf-8'],
  '/cepat.html': ['cepat.html', 'text/html; charset=utf-8'],
  '/cepat.css': ['cepat.css', 'text/css; charset=utf-8'],
  '/cepat.js': ['cepat.js', 'application/javascript; charset=utf-8'],
};

function renderPublicStatusHtml(title, message) {
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · AI Note</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <script src="/theme.js"></script>
  <link rel="stylesheet" href="/style.css">
</head>
<body class="pub-body">
  <main class="pub-wrap">
    <div class="pub-empty">
      <h1>${escapeHtml(title)}</h1>
      <p class="muted">${escapeHtml(message)}</p>
    </div>
  </main>
</body>
</html>`;
}

function folderLampiranPrefix(rel) {
  const parts = safeParts(rel) || [];
  const dirSegs = parts.slice(0, -1);
  if (!dirSegs.length) return null;
  return [...dirSegs, '_lampiran'].join('/') + '/';
}

function isolatePublicHtml(html, rel, token) {
  const folderAttPrefix = folderLampiranPrefix(rel);
  const assetUrl = (rawPath) => {
    if (!folderAttPrefix) return null;
    let dec;
    try {
      dec = decodeURIComponent(rawPath);
    } catch {
      return null;
    }
    if (!dec.startsWith(folderAttPrefix)) return null;
    const sub = dec.slice(folderAttPrefix.length);
    if (!sub || sub.includes('..')) return null;
    return `/p/${encodeURIComponent(token)}/asset/${sub.split('/').map(encodeURIComponent).join('/')}`;
  };

  let out = String(html || '').replace(/<img\b([^>]*?)\bsrc="([^"]*)"([^>]*)>/gi, (m, pre, src, post) => {
    if (!src.startsWith('/files/')) return m;
    const next = assetUrl(src.slice(7));
    if (!next) return '<span class="pub-link-disabled">[gambar internal]</span>';
    return `<img${pre}src="${escapeHtml(next)}"${post}>`;
  });

  out = out.replace(/<a\b([^>]*?)\bhref="([^"]*)"([^>]*)>([\s\S]*?)<\/a>/gi, (m, pre, href, post, inner) => {
    if (href.startsWith('/files/')) {
      const next = assetUrl(href.slice(7));
      if (!next) return `<span class="pub-link-disabled" title="Lampiran di luar halaman ini tidak dibagikan">${inner}</span>`;
      const dlAttr = /\bdownload\b/i.test(pre + post) ? '' : ' download';
      return `<a${pre}href="${escapeHtml(next)}"${dlAttr}${post}>${inner}</a>`;
    }
    if (/^(?:https?:\/\/|mailto:|#)/i.test(href)) {
      if (/^https?:\/\//i.test(href) && !/\btarget=/i.test(pre + post)) {
        return `<a${pre}href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"${post}>${inner}</a>`;
      }
      return m;
    }
    return `<span class="pub-link-disabled" title="Tautan ke catatan internal tidak tersedia di mode publik">${inner}</span>`;
  });
  return out;
}

function referencedPublicAssets(full, rel) {
  const folderAttPrefix = folderLampiranPrefix(rel);
  const out = new Set();
  if (!folderAttPrefix) return out;
  let text;
  try {
    text = fs.readFileSync(full, 'utf8');
  } catch {
    return out;
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const { body } = parseFrontmatter(text);
  const parts = safeParts(rel) || [];
  const html = renderMd(body, parts.slice(0, -1), false, false);
  const re = /(?:src|href)="\/files\/([^"]*)"/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const dec = decodeURIComponent(m[1]);
      if (dec.startsWith(folderAttPrefix)) out.add(dec);
    } catch {}
  }
  return out;
}

function handlePublicShare(req, res, p) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendText(res, 405, 'Method Not Allowed');
  const segs = p.slice(3).split('/');
  const token = segs[0] || '';
  const rel = Pub.resolveToken(token);
  const full = rel ? resolveNote(rel) : null;
  if (!rel || !full || !fs.existsSync(full)) {
    const html = renderPublicStatusHtml('Halaman tidak tersedia', 'Link publik ini tidak ditemukan atau sudah dibatalkan oleh pemiliknya.');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...SEC_HEADERS });
    return res.end(req.method === 'HEAD' ? undefined : html);
  }

  if (segs.length === 2 && segs[1] === 'mermaid.min.js') {
    const file = path.join(__dirname, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js');
    let st;
    try {
      st = fs.statSync(file);
    } catch {
      return sendText(res, 404, 'Mermaid tidak tersedia');
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

  if (segs.length >= 3 && segs[1] === 'asset') {
    let sub;
    try {
      sub = segs.slice(2).map((s) => decodeURIComponent(s)).join('/');
    } catch {
      return sendText(res, 400, 'Bad Request');
    }
    const prefix = folderLampiranPrefix(rel);
    if (!prefix || !sub || sub.includes('..')) return sendText(res, 404, 'Not Found');
    const attRel = prefix + sub;
    const allowed = referencedPublicAssets(full, rel);
    if (!allowed.has(attRel)) return sendText(res, 404, 'Not Found');
    const info = resolveAttachmentFile(attRel);
    if (!info) return sendText(res, 404, 'Not Found');
    let data = null;
    if (req.method !== 'HEAD') {
      try {
        data = fs.readFileSync(info.real);
      } catch {
        return sendText(res, 404, 'Not Found');
      }
    }
    const isImg = !!IMAGE_TYPES[info.ext];
    const fname = encodeURIComponent(path.basename(attRel));
    res.writeHead(200, {
      ...SEC_HEADERS,
      'Content-Type': info.type,
      'Content-Length': data ? data.length : info.size,
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      ...(isImg ? {} : { 'Content-Disposition': `attachment; filename*=UTF-8''${fname}` }),
    });
    return res.end(req.method === 'HEAD' ? undefined : data);
  }

  if (!(segs.length === 1 || (segs.length === 2 && segs[1] === ''))) {
    return sendText(res, 404, 'Not Found');
  }

  let text;
  let st;
  try {
    st = fs.statSync(full);
    text = fs.readFileSync(full, 'utf8');
  } catch {
    const html = renderPublicStatusHtml('Halaman tidak tersedia', 'Catatan sudah dihapus atau dipindahkan.');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...SEC_HEADERS });
    return res.end(req.method === 'HEAD' ? undefined : html);
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const { meta, body } = parseFrontmatter(text);
  const m = body.match(/^#\s+(.+)$/m);
  const title = m ? m[1].trim() : path.basename(rel, path.extname(rel));
  const created = parseDate(meta.dibuat) ?? st.birthtimeMs;
  const modified = parseDate(meta.diubah) ?? st.mtimeMs;
  const env = String(meta.lingkungan || '').toLowerCase();
  const tags = parseTags(meta.tag || meta.tags);
  const summary = meta.ringkasan || '';
  const parts = safeParts(rel) || [];
  const clientBadge = parts.length > 1 ? `<span class="badge badge-default">${escapeHtml(parts[0])}</span>` : '';
  const envBadge = env
    ? `<span class="badge ${env === 'prod' ? 'badge-destructive' : env === 'uat' ? 'badge-secondary' : 'badge-outline'}">${escapeHtml(env)}</span>`
    : '';
  const summaryHtml = summary ? `<p class="note-summary">${escapeHtml(summary)}</p>` : '';
  const tagsHtml = tags.length ? `<div class="note-tags">${tags.map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}</div>` : '';
  const rawHtml = renderMd(body, parts.slice(0, -1), false, false);
  const safeBodyHtml = isolatePublicHtml(rawHtml, rel, token);

  const pageHtml = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · AI Note</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <script src="/theme.js"></script>
  <link rel="stylesheet" href="/style.css">
</head>
<body class="pub-body" data-pub-token="${escapeHtml(token)}">
  <header class="pub-topbar">
    <div class="pub-topbar-inner">
      <div class="pub-brand">
        <strong>AI Note</strong>
        <span class="badge badge-outline">Publik · Hanya Baca</span>
      </div>
      <button class="btn btn-ghost btn-icon btn-sm" id="pub-theme-toggle" type="button" aria-label="Ganti tema" title="Ganti tema"></button>
    </div>
  </header>
  <main class="pub-wrap">
    <article class="note-view">
      <div class="note-meta">
        ${clientBadge}${envBadge}
        <span class="muted">Dibuat ${escapeHtml(formatDate(created))}</span>
        <span class="muted">·</span>
        <span class="muted">Diubah ${escapeHtml(formatDate(modified))}</span>
      </div>
      ${summaryHtml}
      ${tagsHtml}
      <div class="prose">${safeBodyHtml}</div>
    </article>
  </main>
  <script src="/public-view.js"></script>
</body>
</html>`;

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...SEC_HEADERS });
  return res.end(req.method === 'HEAD' ? undefined : pageHtml);
}

const GUEST_BLOCKED_POST = new Set([
  '/api/publish',
  '/api/note/task',
  '/api/create-note',
  '/api/create-folder',
  '/api/move',
  '/api/delete',
  '/api/rename',
  '/api/import',
  '/api/attachment',
  '/api/attachment/delete',
  '/api/attachment/reveal',
  '/api/attachment/save',
  '/api/restart',
  '/api/history/restore',
  '/api/trash/restore',
  '/api/trash/purge',
  '/api/recordings/start',
  '/api/recordings/chunk',
  '/api/recordings/finish',
  '/api/recordings/update',
  '/api/recordings/delete',
  '/api/recordings/combine',
  '/api/recordings/files/text',
  '/api/recordings/files/upload',
  '/api/recordings/files/delete',
  '/api/quick/create',
  '/api/quick/relocate',
  '/api/quick/remove-empty',
]);

const server = http.createServer((req, res) => {
  try {
    if (!ALLOWED_HOSTS.has(String(req.headers.host || '').toLowerCase())) return sendText(res, 403, 'Forbidden');
    const url = new URL(req.url, `http://${req.headers.host}`);
    const p = url.pathname;

    // Endpoint Remote MCP (Streamable HTTP) dengan otentikasi Bearer token terpisah dari cookie login web.
    if (p === '/mcp') {
      handleMcpHttp(req, res).catch((err) => {
        console.error(err);
        if (!res.headersSent) sendText(res, 500, 'Internal Server Error');
      });
      return;
    }

    // Halaman publik satu catatan (tanpa login), hanya untuk link ber-token yang di-publish admin.
    if (p.startsWith('/p/')) {
      return handlePublicShare(req, res, p);
    }

    // Login: bila auth.json "enabled", semua permintaan butuh sesi yang sah (kecuali halaman login).
    let reqUser = null;
    if (Auth.isEnabled()) {
      const user = Auth.currentUser(req);
      if (!user) {
        if (req.method === 'POST' && p === '/api/login') return handleLogin(req, res);
        const open = (req.method === 'GET' || req.method === 'HEAD') && PUBLIC_WHEN_LOGGED_OUT.has(p);
        if (!open) {
          if (p.startsWith('/api/')) return sendJson(res, 401, { error: 'Belum masuk. Silakan login.', login: true });
          const nextUrl = req.url && req.url !== '/' ? req.url : '';
          const loc = nextUrl ? '/login.html?next=' + encodeURIComponent(nextUrl) : '/login.html';
          res.writeHead(302, { Location: loc, 'Cache-Control': 'no-store', ...SEC_HEADERS });
          return res.end();
        }
      } else {
        reqUser = user;
        if (req.method === 'POST' && p === '/api/logout') return handleLogout(req, res);
        if (p === '/login.html') {
          const nextParam = url.searchParams.get('next') || '';
          const safeNext = /^\/(?!\/)/.test(nextParam) && !nextParam.startsWith('/login.html') ? nextParam : '/';
          res.writeHead(302, { Location: safeNext, 'Cache-Control': 'no-store', ...SEC_HEADERS });
          return res.end();
        }
      }
    }
    const isGuest = !!(reqUser && Auth.isReadOnly(reqUser));
    if (req.method === 'GET' && p === '/api/me') {
      const on = Auth.isEnabled();
      return sendJson(res, 200, {
        auth: on,
        user: on ? reqUser : null,
        role: on && reqUser ? Auth.roleOf(reqUser) : null,
        readOnly: on && isGuest,
      });
    }
    if (req.method === 'POST' && p === '/api/logout') return sendJson(res, 200, { ok: true }); // login dimatikan

    if (isGuest && (req.method === 'PUT' || (req.method === 'POST' && GUEST_BLOCKED_POST.has(p)))) {
      return sendJson(res, 403, { error: 'Akun guest hanya memiliki akses baca (read-only).' });
    }

    if (req.method === 'PUT' && p === '/api/note') return handleSave(req, res, url);
    if (req.method === 'POST' && p === '/api/export') return handleExportPost(req, res);
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
    if (req.method === 'POST' && p === '/api/attachment/reveal') return handleAttachmentReveal(req, res);
    if (req.method === 'POST' && p === '/api/attachment/save') return handleAttachmentSave(req, res);
    if (req.method === 'POST' && p === '/api/code/highlight') return handleCodeHighlight(req, res);
    if (req.method === 'POST' && p === '/api/restart') return handleRestart(req, res);
    if (req.method === 'POST' && p === '/api/history/restore') return handleHistoryRestore(req, res);
    if (req.method === 'POST' && p === '/api/trash/restore') return handleTrashRestore(req, res);
    if (req.method === 'POST' && p === '/api/trash/purge') return handleTrashPurge(req, res);
    if (req.method === 'POST' && p === '/api/recordings/start') return handleRecordingStart(req, res);
    if (req.method === 'POST' && p === '/api/recordings/chunk') return handleRecordingChunk(req, res, url);
    if (req.method === 'POST' && p === '/api/recordings/finish') return handleRecordingFinish(req, res);
    if (req.method === 'POST' && p === '/api/recordings/update') return handleRecordingUpdate(req, res);
    if (req.method === 'POST' && p === '/api/recordings/delete') return handleRecordingDelete(req, res);
    if (req.method === 'POST' && p === '/api/recordings/combine') return handleRecordingCombine(req, res, url);
    if (req.method === 'POST' && p === '/api/recordings/files/text') return handleRecordingFileTextSave(req, res);
    if (req.method === 'POST' && p === '/api/recordings/files/upload') return handleRecordingFileUpload(req, res, url);
    if (req.method === 'POST' && p === '/api/recordings/files/delete') return handleRecordingFileDelete(req, res);
    if (req.method === 'POST' && p === '/api/quick/create') return handleQuickCreate(req, res);
    if (req.method === 'POST' && p === '/api/quick/relocate') return handleQuickRelocate(req, res);
    if (req.method === 'POST' && p === '/api/quick/remove-empty') return handleQuickRemoveEmpty(req, res);
    if (req.method === 'POST' && p === '/api/publish') {
      if (!guardMutation(req, res)) return;
      return readJsonBody(req, res, (body) => {
        const rel = typeof body.path === 'string' ? body.path : '';
        const full = resolveNote(rel);
        if (!full || !fs.existsSync(full)) return sendJson(res, 404, { error: 'Catatan tidak ditemukan' });
        const st = body.publish ? Pub.publish(rel) : Pub.unpublish(rel);
        return sendJson(res, 200, {
          ok: true,
          published: st.published,
          token: st.token,
          urlPath: st.token ? `/p/${st.token}` : null,
        });
      });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendText(res, 405, 'Method Not Allowed');

    if (p === '/api/publish') {
      const rel = url.searchParams.get('path') || '';
      const full = resolveNote(rel);
      if (!full || !fs.existsSync(full)) return sendJson(res, 404, { error: 'Catatan tidak ditemukan' });
      const st = Pub.getStatus(rel);
      return sendJson(res, 200, {
        published: st.published,
        token: st.token,
        urlPath: st.token ? `/p/${st.token}` : null,
      });
    }


    if (p === '/api/recordings') return sendJson(res, 200, { ok: true, recordingsDir: RECORDINGS_DIR, items: Rec.listRecordings(RECORDINGS_DIR) });
    if (p === '/api/recordings/item') {
      const id = url.searchParams.get('id') || '';
      const item = Rec.getRecording(RECORDINGS_DIR, id);
      if (!item) return sendJson(res, 404, { error: 'Rekaman tidak ditemukan' });
      return sendJson(res, 200, { ok: true, item });
    }
    if (p === '/api/recordings/audio') return handleRecordingAudio(req, res, url);
    if (p === '/api/recordings/files') return handleRecordingFilesList(req, res, url);
    if (p === '/api/recordings/files/text') return handleRecordingFileTextGet(req, res, url);
    if (p === '/api/recordings/files/download') return handleRecordingFileDownload(req, res, url);

    if (p === '/api/settings') return sendJson(res, 200, { imageResize: SETTINGS.imageResize === true, notesDir: ROOT, recordingsDir: RECORDINGS_DIR, sep: path.sep, shareOrigin: SHARE_ORIGIN });

    if (p === '/api/folders') return handleFolders(req, res);

    if (p === '/api/tree') {
      const { notes, dirs } = scan();
      return sendJson(res, 200, {
        name: path.basename(ROOT),
        total: notes.length,
        trash: isGuest ? 0 : trashCount(),
        tree: buildTree(notes, dirs),
      });
    }

    if (p === '/api/trash/item') {
      if (isGuest) return sendJson(res, 403, { error: 'Akun guest hanya memiliki akses baca (read-only).' });
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
        html: marked
          .parse(body, { async: false })
          .replace(/(<img\b[^>]*?\ssrc=")([^"]*)(")/gi, (all, a, src, c) => {
            // Renderer global (marked.use) sudah mengubah alamat relatif jadi /files/<alamat>
            // (renderDir null di sini), jadi kembalikan dulu ke bentuk relatif.
            let s = src.replace(/&amp;/g, '&');
            if (s.startsWith('/files/')) s = s.slice(7);
            const out = trashImageSrc(entry, target, s);
            return out.startsWith('data:') ? a + out + c : all;
          }),
      });
    }

    // Dashboard: dihitung hanya saat diminta (tombol Scan), tidak saat aplikasi dibuka.
    if (p === '/api/dashboard/scan') {
      try {
        return sendJson(res, 200, scanDashboard());
      } catch (e) {
        return sendJson(res, 500, { error: 'Gagal scan: ' + e.message });
      }
    }

    if (p === '/api/trash') {
      if (isGuest) return sendJson(res, 403, { error: 'Akun guest hanya memiliki akses baca (read-only).' });
      return sendJson(res, 200, {
        items: trashEntries().map(({ itemPath, ...rest }) => rest),
      });
    }

    if (p === '/api/export') return handleExport(url, res);
    if (p === '/api/export/file') return handleExportFile(req, res, url);

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

    if (p === '/api/doc') {
      const rel = url.searchParams.get('file') || '';
      const info = resolveAttachmentFile(rel);
      if (!info || info.ext !== '.doc') return sendJson(res, 404, { error: 'File .doc tidak ditemukan.' });
      if (info.size > 25 * 1024 * 1024) {
        return sendJson(res, 413, { error: 'File terlalu besar untuk ditampilkan (' + Math.round(info.size / 1048576) + ' MB). Silakan unduh.' });
      }
      let WordExtractor;
      try {
        WordExtractor = require('word-extractor');
      } catch {
        return sendJson(res, 501, { error: 'Pustaka word-extractor belum terpasang. Jalankan "npm install" di folder APP.' });
      }
      const extractor = new WordExtractor();
      return extractor
        .extract(info.real)
        .then((doc) => {
          sendJson(res, 200, {
            ok: true,
            name: path.basename(rel),
            size: info.size,
            header: doc.getHeaders({ includeFooters: false }) || '',
            body: doc.getBody() || '',
            footnotes: doc.getFootnotes() || '',
            endnotes: doc.getEndnotes() || '',
            textboxes: doc.getTextboxes() || '',
          });
        })
        .catch((err) => {
          console.error(err);
          sendJson(res, 500, { error: 'Gagal membaca file .doc: ' + (err && err.message ? err.message : err) });
        });
    }

    if (p === '/api/code') {
      const rel = url.searchParams.get('file') || '';
      const info = resolveAttachmentFile(rel);
      if (!info || !TEXT_EXT_LANG[info.ext]) return sendJson(res, 404, { error: 'File tidak ditemukan atau bukan file teks/kode.' });
      let data;
      try {
        data = fs.readFileSync(info.real);
      } catch {
        return sendJson(res, 404, { error: 'File tidak dapat dibaca.' });
      }
      if (data.length > 8 * 1024 * 1024) {
        return sendJson(res, 413, { error: 'File terlalu besar untuk ditampilkan (' + Math.round(data.length / 1048576) + ' MB). Silakan unduh.' });
      }
      const { text, enc } = decodeTextBuffer(data);
      const { lang, linesHtml } = highlightCodeText(text, info.ext);
      return sendJson(res, 200, {
        ok: true,
        name: path.basename(rel),
        ext: info.ext,
        lang,
        size: data.length,
        encoding: enc,
        text,
        linesHtml,
      });
    }

    if (p.startsWith('/files/')) {
      let rel;
      try {
        rel = decodeURIComponent(p.slice(7));
      } catch {
        return sendText(res, 400, 'Bad Request');
      }
      const info = resolveAttachmentFile(rel);
      if (!info) return sendText(res, 404, 'Not Found');
      const { real, ext, type, size } = info;
      const isImg = !!IMAGE_TYPES[ext];
      let data = null;
      if (req.method !== 'HEAD') {
        try {
          data = fs.readFileSync(real);
        } catch {
          return sendText(res, 404, 'Not Found');
        }
      }
      // ?view=1 untuk PDF: ditampilkan (inline) di penampil lampiran aplikasi, boleh dibingkai dari halaman sendiri.
      const inlinePdf = ext === '.pdf' && url.searchParams.get('view') === '1';
      const fname = encodeURIComponent(path.basename(rel));
      res.writeHead(200, {
        ...SEC_HEADERS,
        'Content-Type': type,
        'Content-Length': data ? data.length : size,
        'Cache-Control': 'no-cache',
        'Content-Security-Policy': inlinePdf ? "frame-ancestors 'self'" : "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        ...(inlinePdf
          ? { 'X-Frame-Options': 'SAMEORIGIN', 'Content-Disposition': `inline; filename*=UTF-8''${fname}` }
          : isImg
            ? {}
            : { 'Content-Disposition': `attachment; filename*=UTF-8''${fname}` }),
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

    // pdf.js untuk penampil PDF, serta jszip + docx-preview untuk penampil .docx, disajikan dari node_modules.
    if (p === '/vendor/pdf.min.js' || p === '/vendor/pdf.worker.min.js') {
      const file = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'build', p.slice('/vendor/'.length));
      let data;
      try {
        data = fs.readFileSync(file);
      } catch {
        return sendText(res, 404, 'Pustaka pdf.js belum terpasang. Jalankan "npm install" di folder APP.');
      }
      res.writeHead(200, { ...SEC_HEADERS, 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(req.method === 'HEAD' ? undefined : data);
    }

    if (p === '/vendor/jszip.min.js' || p === '/vendor/docx-preview.min.js') {
      const file =
        p === '/vendor/jszip.min.js'
          ? path.join(__dirname, 'node_modules', 'jszip', 'dist', 'jszip.min.js')
          : path.join(__dirname, 'node_modules', 'docx-preview', 'dist', 'docx-preview.min.js');
      let data;
      try {
        data = fs.readFileSync(file);
      } catch {
        return sendText(res, 404, 'Pustaka docx-preview belum terpasang. Jalankan "npm install" di folder APP.');
      }
      res.writeHead(200, { ...SEC_HEADERS, 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache' });
      return res.end(req.method === 'HEAD' ? undefined : data);
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
  try {
    ensureRecordingsDir();
  } catch (err) {
    console.error('Gagal menyiapkan folder rekaman:', err.message);
  }
  baselineHistory();
  const url = `http://localhost:${PORT}`;
  console.log(`AI Note berjalan di ${url}`);
  console.log(`Folder catatan: ${ROOT}`);
  console.log(`Folder rekaman: ${RECORDINGS_DIR}`);
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
