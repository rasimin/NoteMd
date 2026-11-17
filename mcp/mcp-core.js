const fs = require('fs');
const path = require('path');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { z } = require('zod');

const APP_DIR = path.resolve(__dirname, '..');
const MCP_DIR = __dirname;
const CONFIG_FILE = path.join(MCP_DIR, 'mcp-config.json');
const RULES_FILE = path.join(MCP_DIR, 'ATURAN-MCP.md');

const { NOTES_DIR: ROOT } = require(path.join(APP_DIR, 'config'));
const lib = require(path.join(APP_DIR, 'notes-lib'));
const dbl = require(path.join(APP_DIR, 'db-lib'));
const riwayat = require(path.join(APP_DIR, 'riwayat-lib'));

function loadMcpConfig() {
  const defaults = {
    sourceRoots: [],
    excludeDirs: ['.git', 'node_modules', 'bin', 'obj', '.vs', 'dist', '_riwayat', '_trash'],
    blockedFiles: ['auth.json'],
    allowDbSelect: true,
    allowProd: false,
    maxDbRows: 100,
    maxReadChars: 30000,
    httpEnabled: true,
    httpAllowedIps: [],
  };
  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8').replace(/^\uFEFF/, ''));
    return { ...defaults, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch (err) {
    console.error('[ai-note-mcp] Gagal membaca mcp-config.json, memakai bawaan:', err.message);
    return defaults;
  }
}

function readRulesText() {
  try {
    return fs.readFileSync(RULES_FILE, 'utf8').replace(/^\uFEFF/, '');
  } catch {
    return 'Catatan utama Read-Only. Tulis hanya ke AutoCreateAI melalui save_autocreate_note.';
  }
}

function textResult(text, isError = false) {
  return {
    content: [{ type: 'text', text: String(text ?? '') }],
    ...(isError ? { isError: true } : {}),
  };
}

function clamp(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.round(v)));
}

function normalizeRel(rel) {
  return String(rel || '')
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
}

function resolveNotePath(rel, { allowAttachment = false } = {}) {
  const clean = normalizeRel(rel);
  const parts = clean.split('/').filter(Boolean);
  if (!parts.length) return null;
  const isAtt = allowAttachment && parts.length >= 4 && parts[parts.length - 3] === '_lampiran';
  const bad = parts.some((p, i) => {
    if (!p || p === '.' || p === '..') return true;
    if (lib.isHiddenName(p)) return !(isAtt && i === parts.length - 3 && p === '_lampiran');
    return false;
  });
  if (bad) return null;
  if (!isAtt && !clean.toLowerCase().endsWith('.md')) return null;
  if (isAtt && parts.slice(0, -3).includes('_lampiran')) return null;
  const full = path.resolve(ROOT, ...parts);
  if (!full.startsWith(ROOT + path.sep)) return null;
  return { rel: parts.join('/'), parts, full, isAtt };
}

function isSameOrInside(child, parent) {
  const c = process.platform === 'win32' ? child.toLowerCase() : child;
  const p = process.platform === 'win32' ? parent.toLowerCase() : parent;
  return c === p || c.startsWith(p.endsWith(path.sep) ? p : p + path.sep);
}

function resolveSourcePath(targetPath, cfg) {
  if (!targetPath || typeof targetPath !== 'string') return { error: 'Path wajib diisi.' };
  const roots = [];
  for (const r of cfg.sourceRoots || []) {
    try {
      const rp = fs.realpathSync(path.resolve(r));
      if (fs.statSync(rp).isDirectory()) roots.push(rp);
    } catch {}
  }
  if (!roots.length) {
    return { error: 'Tidak ada sourceRoots yang valid di APP/mcp/mcp-config.json.' };
  }
  let real;
  try {
    real = fs.realpathSync(path.resolve(targetPath));
  } catch {
    return { error: `Path tidak ditemukan: ${targetPath}` };
  }
  const matchedRoot = roots.find((r) => isSameOrInside(real, r));
  if (!matchedRoot) {
    return { error: `Akses ditolak: "${targetPath}" berada di luar sourceRoots pada mcp-config.json.` };
  }
  const relFromRoot = path.relative(matchedRoot, real);
  const segs = relFromRoot ? relFromRoot.split(path.sep).filter(Boolean) : [];
  const exSet = new Set((cfg.excludeDirs || []).map((s) => s.toLowerCase()));
  const blockedSet = new Set((cfg.blockedFiles || []).map((s) => s.toLowerCase()));
  for (const s of segs) {
    const low = s.toLowerCase();
    if (exSet.has(low) || blockedSet.has(low)) {
      return { error: `Akses ditolak untuk path terlindungi/dikecualikan: ${s}` };
    }
  }
  return { real, root: matchedRoot };
}

function isLikelyBinary(buf) {
  const len = Math.min(buf.length, 4096);
  for (let i = 0; i < len; i++) {
    if (buf[i] === 0) return true;
  }
  return false;
}

async function extractDocxText(fullPath) {
  const JSZip = require(path.join(APP_DIR, 'node_modules', 'jszip'));
  const data = fs.readFileSync(fullPath);
  const zip = await JSZip.loadAsync(data);
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('word/document.xml tidak ditemukan di .docx');
  const xml = await docFile.async('string');
  const decodeXml = (s) =>
    s
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  const paras = xml.split(/<\/w:p>/);
  const lines = [];
  for (const p of paras) {
    const chunks = [];
    const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br[^/]*\/>/g;
    let m;
    while ((m = re.exec(p))) {
      if (m[1] !== undefined) chunks.push(decodeXml(m[1]));
      else if (m[0].startsWith('<w:tab')) chunks.push('\t');
      else chunks.push('\n');
    }
    const line = chunks.join('').trimEnd();
    if (line || (lines.length && lines[lines.length - 1] !== '')) lines.push(line);
  }
  return lines.join('\n').trim();
}

function loadDriver(jenis) {
  if (!/^[a-z0-9]+$/.test(jenis)) throw new Error(`Jenis database tidak valid: ${jenis}`);
  const file = path.join(APP_DIR, 'db-driver', jenis + '.js');
  if (!fs.existsSync(file)) throw new Error(`Driver database belum tersedia untuk jenis "${jenis}".`);
  return require(file);
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\.md$/i, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function createMcpServer() {
  const server = new McpServer(
    { name: 'ai-note', version: '1.0.0' },
    { instructions: readRulesText() },
  );

// 1. Rules
server.registerTool(
  'get_rules',
  {
    description: 'Baca aturan khusus MCP (ATURAN-MCP.md) dan opsional aturan umum catatan (ATURAN-AI.md).',
    inputSchema: {
      includeGeneral: z.boolean().optional().describe('Sertakan Document/ATURAN-AI.md juga (default false)'),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ includeGeneral }) => {
    let out = readRulesText();
    if (includeGeneral) {
      try {
        out += '\n\n---\n\n' + fs.readFileSync(path.join(ROOT, 'ATURAN-AI.md'), 'utf8');
      } catch {}
    }
    return textResult(out);
  },
);

// 2. List folders
server.registerTool(
  'list_folders',
  {
    description: 'Daftar folder catatan di AI Note beserta jumlah catatannya.',
    inputSchema: {
      client: z.string().optional().describe('Filter satu client, mis. victoria, btn, umum'),
      folder: z.string().optional().describe('Filter folder tertentu, mis. victoria/akses'),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ client, folder }) => {
    const notes = lib.loadAllNotes().filter((n) => n.path.includes('/'));
    const fClean = folder ? normalizeRel(folder).toLowerCase() : '';
    const cClean = client ? client.trim().toLowerCase() : '';
    const counts = new Map();
    for (const n of notes) {
      if (cClean && n.path.split('/')[0].toLowerCase() !== cClean) continue;
      if (fClean && !n.path.toLowerCase().startsWith(fClean + '/')) continue;
      const segs = n.path.split('/').slice(0, -1);
      for (let i = 1; i <= segs.length; i++) {
        const p = segs.slice(0, i).join('/');
        counts.set(p, (counts.get(p) || 0) + 1);
      }
    }
    if (!counts.size) return textResult('(tidak ada folder yang cocok)');
    const lines = [`${counts.size} folder:`];
    for (const p of [...counts.keys()].sort((a, b) => a.localeCompare(b, 'id'))) {
      const depth = p.split('/').length - 1;
      lines.push(`${'  '.repeat(depth)}${p.split('/').pop()}/  (${counts.get(p)} catatan)  ${p}`);
    }
    return textResult(lines.join('\n'));
  },
);

// 3. Search notes
server.registerTool(
  'search_notes',
  {
    description: 'Cari catatan dan lampiran teks di Document/ (termasuk AutoCreateAI). Kosongkan query untuk melihat daftar catatan terbaru/per filter.',
    inputSchema: {
      query: z.string().optional().describe('Kata kunci pencarian'),
      client: z.string().optional().describe('Batasi ke satu client (mis. victoria, btn, umum)'),
      folder: z.string().optional().describe('Batasi ke subfolder tertentu (mis. victoria/AutoCreateAI)'),
      env: z.string().optional().describe('Batasi ke lingkungan: prod | uat | local'),
      tag: z.string().optional().describe('Batasi ke satu tag'),
      modifiedRange: z.string().optional().describe('Filter tanggal diubah: hari-ini, kemarin, minggu-ini, bulan-ini, 7-hari, YYYY-MM-DD, YYYY-MM, atau A..B'),
      createdRange: z.string().optional().describe('Filter tanggal dibuat dengan format yang sama'),
      max: z.number().optional().describe('Maksimal hasil (default 10, maks 40)'),
    },
    annotations: { readOnlyHint: true },
  },
  async (args) => {
    const diubah = args.modifiedRange ? lib.parseDateRange(args.modifiedRange) : null;
    if (args.modifiedRange && !diubah) return textResult(`Format modifiedRange tidak dikenal: ${args.modifiedRange}`, true);
    const dibuat = args.createdRange ? lib.parseDateRange(args.createdRange) : null;
    if (args.createdRange && !dibuat) return textResult(`Format createdRange tidak dikenal: ${args.createdRange}`, true);

    const notes = lib.loadAllNotes().filter((n) => n.path.includes('/'));
    const limit = clamp(args.max, 1, 40, 10);
    const hits = lib.searchNotes(args.query || '', notes, {
      client: args.client,
      folder: args.folder ? normalizeRel(args.folder) : undefined,
      env: args.env,
      tag: args.tag,
      diubah,
      dibuat,
      limit,
    });
    if (!hits.length) return textResult('Tidak ada catatan yang cocok.');
    const lines = [`Ditemukan ${hits.length} catatan:`];
    for (const h of hits) {
      const createdStr = h.created ? `dibuat: ${lib.formatDate(h.created)}` : '';
      const modifiedStr = h.modified ? `diubah: ${lib.formatDate(h.modified)}` : '';
      const dateStr = [createdStr, modifiedStr].filter(Boolean).join(', ');
      const meta = [h.env, h.tags && h.tags.length ? h.tags.map((t) => '#' + t).join(' ') : '', dateStr]
        .filter(Boolean)
        .join(' · ');
      lines.push(`\n- **${h.title}**  \`${h.path}\`${meta ? `  (${meta})` : ''}`);
      if (h.summary) lines.push(`  Ringkasan: ${h.summary}`);
      if (h.snippet) lines.push(`  Cuplikan${h.inAtt ? ` [${h.inAtt}]` : ''}: ${h.snippet}`);
      if (h.att && h.att.length) lines.push(`  Lampiran: ${h.att.map((a) => a.path).join(', ')}`);
    }
    return textResult(lines.join('\n'));
  },
);

// 4. Read note
server.registerTool(
  'read_note',
  {
    description: 'Baca satu catatan .md (mode outline untuk daftar heading, section untuk satu bagian saja, atau full).',
    inputSchema: {
      path: z.string().describe('Path relatif catatan dari search_notes, mis. victoria/akses/x.md'),
      mode: z.enum(['outline', 'section', 'full']).optional().describe('Mode baca (default full)'),
      section: z.string().optional().describe('Judul bagian yang dicari saat mode="section"'),
      maxChars: z.number().optional().describe('Batas karakter output (default 8000)'),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ path: rel, mode = 'full', section, maxChars }) => {
    const cfg = loadMcpConfig();
    const resolved = resolveNotePath(rel, { allowAttachment: false });
    if (!resolved) return textResult(`Path catatan tidak valid: ${rel}`, true);
    let text;
    let st;
    try {
      st = fs.statSync(resolved.full);
      text = fs.readFileSync(resolved.full, 'utf8');
    } catch {
      return textResult(`Catatan tidak ditemukan: ${resolved.rel}`, true);
    }
    const note = lib.parseNote(resolved.rel, text, st);
    const atts = lib.attachmentsOf(ROOT, resolved.rel);
    const dateLine = [
      note.created ? `dibuat: ${lib.formatDate(note.created)}` : '',
      note.modified ? `diubah: ${lib.formatDate(note.modified)}` : '',
    ]
      .filter(Boolean)
      .join(' | ');
    const header = [
      `# ${note.title}`,
      `path: ${resolved.rel}`,
      note.env ? `lingkungan: ${note.env}` : '',
      note.tags.length ? `tag: ${note.tags.join(', ')}` : '',
      note.summary ? `ringkasan: ${note.summary}` : '',
      dateLine,
      atts.length ? `lampiran: ${atts.map((a) => a.path).join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const body = note.text.replace(/^\s*\n/, '');
    if (mode === 'outline') {
      const { heads } = lib.outline(body);
      const out = heads.length
        ? heads.map((h) => `${'  '.repeat(h.level - 1)}${'#'.repeat(h.level)} ${h.text}  (${h.chars} kar.)`).join('\n')
        : `(tidak ada heading; ${body.length} karakter)`;
      return textResult(`${header}\n---\n${out}\n\nTotal ${body.length} karakter.`);
    }
    const lim = clamp(maxChars, 500, cfg.maxReadChars || 30000, 8000);
    if (mode === 'section') {
      if (!section) return textResult('Parameter "section" wajib diisi saat mode="section".', true);
      const sec = lib.section(body, section);
      if (!sec) return textResult(`Bagian "${section}" tidak ditemukan di ${resolved.rel}. Pakai mode="outline" untuk melihat daftar judul.`, true);
      const bodyOut = sec.text.length > lim ? sec.text.slice(0, lim) + `\n\n[... dipotong, ${sec.text.length - lim} karakter lagi]` : sec.text;
      return textResult(`${header}\n---\n${bodyOut}`);
    }
    const bodyOut = body.length > lim ? body.slice(0, lim) + `\n\n[... dipotong, ${body.length - lim} karakter lagi. Gunakan mode="outline" atau "section"]` : body;
    return textResult(`${header}\n---\n${bodyOut}`);
  },
);

// 5. Read attachment (.sql, .txt, .json, .docx, .doc, etc.)
server.registerTool(
  'read_attachment',
  {
    description: 'Baca isi file lampiran teks/kode (.sql, .txt, .csv, .json, .html, dll.) atau dokumen Word (.docx/.doc) di dalam folder _lampiran/.',
    inputSchema: {
      path: z.string().describe('Path relatif lampiran, mis. victoria/issue-x/_lampiran/patching/01-rollback.sql'),
      offset: z.number().optional().describe('Offset karakter awal (default 0)'),
      maxChars: z.number().optional().describe('Maksimal karakter yang dibaca (default 8000)'),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ path: rel, offset = 0, maxChars }) => {
    const cfg = loadMcpConfig();
    const resolved = resolveNotePath(rel, { allowAttachment: true });
    if (!resolved || !resolved.isAtt) {
      return textResult(`Path lampiran tidak valid (harus di dalam _lampiran/): ${rel}`, true);
    }
    let st;
    try {
      st = fs.statSync(resolved.full);
      if (!st.isFile()) return textResult(`Lampiran bukan file: ${resolved.rel}`, true);
    } catch {
      return textResult(`Lampiran tidak ditemukan: ${resolved.rel}`, true);
    }
    const ext = path.extname(resolved.full).toLowerCase();
    let content;
    try {
      if (ext === '.docx') {
        content = await extractDocxText(resolved.full);
      } else if (ext === '.doc') {
        const WordExtractor = require(path.join(APP_DIR, 'node_modules', 'word-extractor'));
        const doc = await new WordExtractor().extract(resolved.full);
        content = [doc.getHeaders({ includeFooters: false }), doc.getBody(), doc.getTextboxes(), doc.getFootnotes(), doc.getEndnotes()]
          .filter((x) => x && x.trim())
          .join('\n\n');
      } else {
        const buf = fs.readFileSync(resolved.full);
        if (isLikelyBinary(buf)) {
          return textResult(`Lampiran "${resolved.rel}" adalah file biner (${ext || 'unknown'}, ${st.size} byte) dan tidak didukung untuk dibaca sebagai teks.`, true);
        }
        content = buf.toString('utf8');
      }
    } catch (err) {
      return textResult(`Gagal membaca lampiran "${resolved.rel}": ${err.message}`, true);
    }
    const start = Math.max(0, Math.round(offset || 0));
    const lim = clamp(maxChars, 500, cfg.maxReadChars || 30000, 8000);
    const slice = content.slice(start, start + lim);
    const more = content.length - (start + slice.length);
    const attDateLine = [
      st.birthtimeMs ? `dibuat: ${lib.formatDate(st.birthtimeMs)}` : '',
      st.mtimeMs ? `diubah: ${lib.formatDate(st.mtimeMs)}` : '',
    ]
      .filter(Boolean)
      .join(' | ');
    return textResult(
      `# lampiran: ${resolved.rel} (${content.length} karakter, mulai ${start})${attDateLine ? `\n${attDateLine}` : ''}\n---\n${slice}${more > 0 ? `\n\n[... ${more} karakter lagi. Pakai offset=${start + slice.length}]` : ''}`,
    );
  },
);

// 6. Note history
server.registerTool(
  'note_history',
  {
    description: 'Lihat daftar riwayat versi sebuah catatan di _riwayat/.',
    inputSchema: {
      path: z.string().describe('Path relatif catatan .md'),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ path: rel }) => {
    const resolved = resolveNotePath(rel, { allowAttachment: false });
    if (!resolved) return textResult(`Path catatan tidak valid: ${rel}`, true);
    const list = riwayat.list(ROOT, resolved.rel);
    if (!list.length) return textResult(`Belum ada riwayat versi untuk ${resolved.rel}.`);
    const lines = [`${list.length} versi untuk ${resolved.rel}:`];
    for (const v of list.slice(0, 25)) {
      lines.push(`- ${lib.formatDate(v.time)}  [${v.label}]  id=${v.id}  (${v.size} byte)`);
    }
    return textResult(lines.join('\n'));
  },
);

// 7. Save AutoCreateAI note (ONLY writable area in Document/)
server.registerTool(
  'save_autocreate_note',
  {
    description:
      'Buat atau perbarui catatan di folder AutoCreateAI (<client>/AutoCreateAI/<slug>.md atau <client>/AutoCreateAI/FromMCP/<slug>.md, atau di client "umum"). Set fromMcp=true jika informasi berasal dari user yang memberi keterangan lewat MCP (mis. rumus atau perilaku khusus client). Tidak dapat menulis ke folder lain. Otomatis mengisi frontmatter & mencatat ke _riwayat.',
    inputSchema: {
      client: z.string().describe('Nama folder client (mis. victoria, btn, smbci) atau "umum"'),
      slug: z.string().describe('Nama file tanpa .md (huruf kecil dan tanda hubung), mis. alur-insert-sre-victoria'),
      title: z.string().describe('Judul utama catatan (# Judul)'),
      summary: z.string().describe('Ringkasan 1-2 kalimat tanpa password'),
      tags: z.array(z.string()).optional().describe('Daftar tag (autocreate-ai otomatis ditambahkan; from-mcp ikut ditambahkan jika fromMcp=true)'),
      env: z.enum(['prod', 'uat', 'local', '']).optional().describe('Lingkungan bila relevan'),
      source: z.string().describe('Sumber temuan (path file source code, nama tabel/SP, catatan rujukan, atau "Informasi user via MCP")'),
      body: z.string().describe('Isi Markdown catatan (tanpa frontmatter dan tanpa # Judul berulang)'),
      fromMcp: z.boolean().optional().describe('Set true untuk menyimpan ke subfolder AutoCreateAI/FromMCP/ bila informasinya diberikan langsung oleh user lewat MCP (mis. rumus atau kondisi khusus client)'),
    },
    annotations: { readOnlyHint: false, idempotentHint: true },
  },
  async ({ client, slug, title, summary, tags = [], env = '', source, body, fromMcp = false }) => {
    const cSlug = slugify(client);
    const fSlug = slugify(slug);
    if (!cSlug || cSlug === 'pribadi' || cSlug.startsWith('_')) {
      return textResult(`Client tidak valid untuk AutoCreateAI: "${client}". Gunakan nama client atau "umum".`, true);
    }
    if (!fSlug) return textResult('Parameter "slug" tidak valid.', true);
    const clientDir = path.join(ROOT, cSlug);
    if (cSlug !== 'umum' && !fs.existsSync(clientDir)) {
      return textResult(`Folder client "${cSlug}" belum ada di Document/. Gunakan client yang sudah ada atau "umum".`, true);
    }

    const subSegs = fromMcp ? ['AutoCreateAI', 'FromMCP'] : ['AutoCreateAI'];
    const rel = `${cSlug}/${subSegs.join('/')}/${fSlug}.md`;
    const full = path.join(ROOT, cSlug, ...subSegs, `${fSlug}.md`);
    if (!full.startsWith(ROOT + path.sep)) return textResult('Path tidak valid.', true);

    const nowStr = lib.formatDate(Date.now());
    let createdStr = nowStr;
    let isUpdate = false;
    if (fs.existsSync(full)) {
      isUpdate = true;
      try {
        const oldText = fs.readFileSync(full, 'utf8');
        const parsed = lib.parseFrontmatter(oldText);
        if (parsed.meta && parsed.meta.dibuat) createdStr = parsed.meta.dibuat;
      } catch {}
    }

    const baseTags = fromMcp ? ['autocreate-ai', 'from-mcp'] : ['autocreate-ai'];
    const cleanTags = [...new Set([...baseTags, ...tags.map((t) => String(t).trim().replace(/^#/, '').toLowerCase()).filter(Boolean)])];
    const cleanSummary = String(summary || '').replace(/[\r\n]+/g, ' ').trim();
    const cleanTitle = String(title || fSlug).replace(/[\r\n]+/g, ' ').trim();
    const cleanBody = String(body || '').replace(/^#\s+[^\n]*\n+/, '').trim();

    const fm = [
      '---',
      `dibuat: ${createdStr}`,
      `diubah: ${nowStr}`,
      env ? `lingkungan: ${env}` : null,
      `ringkasan: ${cleanSummary}`,
      `tag: ${cleanTags.join(', ')}`,
      '---',
    ]
      .filter(Boolean)
      .join('\n');

    const finalBody = cleanBody.includes('sumber:') || cleanBody.includes('Sumber:')
      ? cleanBody
      : `> Sumber: ${String(source || '').trim()}\n\n${cleanBody}`;

    const fullContent = `${fm}\n\n# ${cleanTitle}\n\n${finalBody}\n`;
    fs.mkdirSync(path.dirname(full), { recursive: true });
    const tmp = `${full}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tmp, fullContent, 'utf8');
    fs.renameSync(tmp, full);
    const hist = riwayat.record(ROOT, rel, isUpdate ? 'luar' : 'baru');

    return textResult(
      `${isUpdate ? 'Diperbarui' : 'Dibuat'}: ${rel}\nRiwayat: ${hist.changed ? hist.id : 'tidak berubah'}`,
    );
  },
);

// 8. List source code directory (Read-Only)
server.registerTool(
  'list_source_dir',
  {
    description:
      'Lihat isi folder source code (Read-Only, dibatasi ke sourceRoots di mcp-config.json). ATURAN WAJIB: cari di catatan dulu; HANYA panggil untuk path yang tercantum di catatan (atau diminta eksplisit oleh user). Jika catatan tidak ditemukan atau tidak menyebut path, DILARANG memanggil tool ini.',
    inputSchema: {
      path: z.string().describe('Path absolut folder source code yang dirujuk oleh catatan atau user'),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ path: dirPath }) => {
    const cfg = loadMcpConfig();
    if (!dirPath || !String(dirPath).trim()) {
      return textResult(
        'Parameter "path" wajib diisi dari path yang ditemukan di catatan atau disebut eksplisit oleh user. Jangan menyisir folder source code jika catatan belum ditemukan.',
        true,
      );
    }
    const check = resolveSourcePath(dirPath, cfg);
    if (check.error) return textResult(check.error, true);
    let st;
    try {
      st = fs.statSync(check.real);
    } catch {
      return textResult(`Tidak ditemukan: ${dirPath}`, true);
    }
    if (!st.isDirectory()) return textResult(`Bukan folder: ${dirPath}`, true);

    const exSet = new Set((cfg.excludeDirs || []).map((s) => s.toLowerCase()));
    const blockedSet = new Set((cfg.blockedFiles || []).map((s) => s.toLowerCase()));
    const entries = fs.readdirSync(check.real, { withFileTypes: true });
    const dirs = [];
    const files = [];
    for (const e of entries) {
      const low = e.name.toLowerCase();
      if (e.isDirectory()) {
        if (!exSet.has(low)) dirs.push(e.name + '/');
      } else if (e.isFile()) {
        if (!blockedSet.has(low)) {
          let sz = 0;
          try { sz = fs.statSync(path.join(check.real, e.name)).size; } catch {}
          files.push(`${e.name}  (${sz} B)`);
        }
      }
    }
    dirs.sort((a, b) => a.localeCompare(b));
    files.sort((a, b) => a.localeCompare(b));
    const lines = [`Isi ${check.real}:`, ...dirs.map((d) => `[DIR]  ${d}`), ...files.map((f) => `[FILE] ${f}`)];
    return textResult(lines.join('\n'));
  },
);

// 9. Search inside source code (Read-Only)
server.registerTool(
  'search_source_code',
  {
    description:
      'Cari teks/simbol di dalam folder source code (Read-Only, dibatasi ke sourceRoots di mcp-config.json). ATURAN WAJIB: cari di catatan dulu; HANYA gunakan pada path yang dirujuk catatan (atau diminta eksplisit oleh user). Jika catatan tidak ada, DILARANG menyisir source code.',
    inputSchema: {
      dirPath: z.string().describe('Path absolut folder source code yang akan dicari'),
      query: z.string().describe('Teks atau kata kunci yang dicari (case-insensitive)'),
      extFilter: z.string().optional().describe('Opsional filter ekstensi dipisah koma, mis. .cs,.sql,.js'),
      maxResults: z.number().optional().describe('Maksimal baris cocok (default 40, maks 100)'),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ dirPath, query, extFilter, maxResults }) => {
    const cfg = loadMcpConfig();
    const check = resolveSourcePath(dirPath, cfg);
    if (check.error) return textResult(check.error, true);
    const q = String(query || '').trim();
    if (!q) return textResult('Parameter "query" wajib diisi.', true);
    const ql = q.toLowerCase();
    const exts = extFilter
      ? new Set(extFilter.split(',').map((s) => (s.trim().startsWith('.') ? s.trim().toLowerCase() : '.' + s.trim().toLowerCase())).filter((x) => x.length > 1))
      : null;
    const exSet = new Set((cfg.excludeDirs || []).map((s) => s.toLowerCase()));
    const blockedSet = new Set((cfg.blockedFiles || []).map((s) => s.toLowerCase()));
    const maxHits = clamp(maxResults, 1, 100, 40);
    const hits = [];
    let scanned = 0;
    const MAX_FILES = 5000;

    function walk(dir) {
      if (hits.length >= maxHits || scanned >= MAX_FILES) return;
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        if (hits.length >= maxHits || scanned >= MAX_FILES) break;
        const low = e.name.toLowerCase();
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (!exSet.has(low)) walk(full);
        } else if (e.isFile()) {
          if (blockedSet.has(low)) continue;
          if (exts && !exts.has(path.extname(low))) continue;
          scanned++;
          let st;
          try {
            st = fs.statSync(full);
          } catch {
            continue;
          }
          if (st.size > 1024 * 1024) continue;
          let buf;
          try {
            buf = fs.readFileSync(full);
          } catch {
            continue;
          }
          if (isLikelyBinary(buf)) continue;
          const lines = buf.toString('utf8').split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(ql)) {
              const snippet = lines[i].trim().slice(0, 180);
              hits.push(`${path.relative(check.real, full)}:${i + 1}: ${snippet}`);
              if (hits.length >= maxHits) break;
            }
          }
        }
      }
    }
    walk(check.real);
    if (!hits.length) return textResult(`Tidak ditemukan "${q}" di ${check.real} (${scanned} file dipindai).`);
    return textResult(`${hits.length} kecocokan di ${check.real} (${scanned} file dipindai):\n${hits.join('\n')}`);
  },
);

// 10. Read source file (Read-Only)
server.registerTool(
  'read_source_file',
  {
    description:
      'Baca baris dari file source code (Read-Only, dibatasi ke sourceRoots di mcp-config.json). ATURAN WAJIB: cari di catatan dulu; HANYA gunakan pada file/path yang dirujuk catatan (atau diminta eksplisit oleh user).',
    inputSchema: {
      filePath: z.string().describe('Path absolut file source code'),
      startLine: z.number().optional().describe('Baris awal (1-based, default 1)'),
      endLine: z.number().optional().describe('Baris akhir inklusif (default 250)'),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ filePath, startLine = 1, endLine = 250 }) => {
    const cfg = loadMcpConfig();
    const check = resolveSourcePath(filePath, cfg);
    if (check.error) return textResult(check.error, true);
    let st;
    try {
      st = fs.statSync(check.real);
      if (!st.isFile()) return textResult(`Bukan file: ${filePath}`, true);
    } catch {
      return textResult(`File tidak ditemukan: ${filePath}`, true);
    }
    if (st.size > 4 * 1024 * 1024) return textResult(`File terlalu besar (${Math.round(st.size / 1048576)} MB).`, true);
    const buf = fs.readFileSync(check.real);
    if (isLikelyBinary(buf)) return textResult(`File biner tidak dapat dibaca sebagai teks: ${filePath}`, true);
    const lines = buf.toString('utf8').split(/\r?\n/);
    const start = Math.max(1, Math.round(startLine || 1));
    const end = Math.min(lines.length, Math.max(start, Math.round(endLine || start + 249)));
    const lim = cfg.maxReadChars || 30000;
    const body = lines
      .slice(start - 1, end)
      .map((l, i) => `${start + i}: ${l}`)
      .join('\n');
    const out = body.length > lim ? body.slice(0, lim) + '\n[... dipotong karena batas karakter]' : body;
    return textResult(`# ${check.real} (baris ${start}-${end} dari ${lines.length})\n---\n${out}`);
  },
);

// 11. List DB connections (no passwords!)
server.registerTool(
  'list_db_connections',
  {
    description: 'Daftar koneksi database dari blok ```koneksi di catatan client (password selalu disembunyikan).',
    inputSchema: {
      query: z.string().optional().describe('Filter kata pada nama/path koneksi'),
      client: z.string().optional().describe('Filter satu client'),
      env: z.string().optional().describe('Filter lingkungan: prod | uat | local'),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ query, client, env }) => {
    const { koneksi, galat } = dbl.muatKoneksi();
    const { hasil } = dbl.pilihKoneksi(koneksi, query, { client, env });
    const lines = [];
    if (!hasil.length) {
      lines.push('Tidak ada koneksi yang cocok.');
    } else {
      lines.push(`${hasil.length} koneksi (password disembunyikan):`);
      lines.push(
        dbl.tabel(
          ['nama', 'jenis', 'lingkungan', 'server', 'database', 'user', 'catatan'],
          hasil.map((k) => [k.nama, k.jenis, k.lingkungan || '-', k.server + (k.port ? ':' + k.port : ''), k.database, k.user, k.path]),
        ),
      );
    }
    if (galat.length) lines.push('\nPerlu diperbaiki:\n' + galat.map((g) => '- ' + g).join('\n'));
    return textResult(lines.join('\n'));
  },
);

async function withDbConn(args, fn) {
  const cfg = loadMcpConfig();
  const { koneksi } = dbl.muatKoneksi();
  const { hasil, tunggal } = dbl.pilihKoneksi(koneksi, args.connection, { client: args.client, env: args.env });
  if (!tunggal) {
    if (!hasil.length) return textResult(`Koneksi "${args.connection}" tidak ditemukan. Cek dengan list_db_connections.`, true);
    return textResult(
      `Nama "${args.connection}" cocok dengan ${hasil.length} koneksi, sebutkan nama lengkap:\n` +
        hasil.map((k) => `- ${k.nama} [${k.lingkungan || '-'}] (${k.path})`).join('\n'),
      true,
    );
  }
  const k = tunggal;
  if (k.lingkungan === 'prod' && (!cfg.allowProd || !args.allowProd)) {
    return textResult(
      `Koneksi "${k.nama}" adalah PROD dan diblokir secara default di MCP. Pastikan ada izin eksplisit Rasimin dan "allowProd": true di mcp-config.json.`,
      true,
    );
  }
  let driver;
  let conn;
  try {
    driver = loadDriver(k.jenis);
    conn = await driver.connect(k);
    const info = await driver.info(conn);
    const head = `# ${k.nama} [${k.lingkungan || '-'}] ${info.server} / ${info.db} sebagai ${info.login}`;
    return await fn(driver, conn, k, head, cfg);
  } catch (err) {
    return textResult(`Galat DB (${k.nama}): ${dbl.samarkan(err && err.message ? err.message : String(err), k)}`, true);
  } finally {
    if (driver && conn) await driver.tutup(conn).catch(() => {});
  }
}

// 12. Get DB schema
server.registerTool(
  'get_db_schema',
  {
    description: 'Ambil skema database client (daftar tabel, detail kolom/PK/FK/indeks, cari objek, atau definisi SP/View/Function).',
    inputSchema: {
      connection: z.string().describe('Nama koneksi (atau sebagian unik) dari list_db_connections'),
      mode: z.enum(['tables', 'search', 'table', 'sp', 'view', 'function']).describe('Jenis pemeriksaan skema'),
      target: z.string().optional().describe('Kata pencarian (mode=search), nama tabel/view (mode=table), atau nama sp/view/function (pisahkan koma bila lebih dari satu; kosongkan untuk daftar semua)'),
      searchBody: z.boolean().optional().describe('Khusus mode=search: cari juga di dalam isi kode SP/view'),
      client: z.string().optional(),
      env: z.string().optional(),
      allowProd: z.boolean().optional().describe('Wajib true + allowProd=true di config + izin Rasimin untuk prod'),
    },
    annotations: { readOnlyHint: true },
  },
  async (args) =>
    withDbConn(args, async (driver, conn, _k, head) => {
      const out = [head];
      if (args.mode === 'tables') {
        const r = await driver.daftarTabel(conn);
        out.push(`\n${r.length} tabel:`);
        out.push(dbl.tabel(['tabel', 'kolom', '±baris'], r.slice(0, 300).map((x) => [x.skema + '.' + x.tabel, x.kolom, x.baris ?? 0])));
        if (r.length > 300) out.push(`... ${r.length - 300} lagi. Gunakan mode="search".`);
      } else if (args.mode === 'search') {
        if (!args.target) return textResult('Parameter "target" wajib diisi untuk mode="search".', true);
        const r = await driver.cari(conn, args.target, { isi: !!args.searchBody });
        out.push(`\n${r.length} hasil untuk "${args.target}":`);
        out.push(dbl.tabel(['jenis', 'objek', 'kolom'], r.slice(0, 300).map((x) => [x.jenis, x.objek, x.kolom])));
        if (r.length > 300) out.push(`... ${r.length - 300} lagi.`);
      } else if (args.mode === 'table') {
        if (!args.target) return textResult('Parameter "target" (mis. dbo.Nasabah) wajib diisi untuk mode="table".', true);
        const r = await driver.detailObjek(conn, args.target);
        if (!r.length) out.push(`\n"${args.target}" tidak ditemukan.`);
        for (const x of r) {
          out.push(`\n## ${x.objek} (${x.jenis}${x.baris != null ? `, ±${x.baris} baris` : ''})`);
          for (const c of x.kolom) {
            const tambah = [c.pk, c.ket].filter(Boolean).join(', ');
            out.push(`${c.no}. ${c.nama} ${c.tipe} ${c.nullable}${tambah ? ' [' + tambah + ']' : ''}${c.bawaan ? ' = ' + c.bawaan : ''}`);
          }
          if (x.fkKeluar.length) out.push('FK keluar:\n' + x.fkKeluar.map((f) => `- ${f.fk}: (${f.kolomDari}) -> ${f.ke}(${f.kolomKe})`).join('\n'));
          if (x.fkMasuk.length) out.push('FK masuk:\n' + x.fkMasuk.map((f) => `- ${f.fk}: ${f.dari}(${f.kolomDari}) -> (${f.kolomKe})`).join('\n'));
          if (x.indeks.length) out.push('Indeks:\n' + x.indeks.map((i) => `- ${i.indeks}: ${i.tipe}${i.uniq ? ', unique' : ''}${i.pk ? ', PK' : ''} (${i.kolom})`).join('\n'));
        }
      } else {
        const jenisMap = { sp: 'sp', view: 'view', function: 'fungsi' };
        const jenis = jenisMap[args.mode];
        if (!args.target) {
          const r = await driver.daftarKode(conn, jenis);
          out.push(`\n${r.length} ${args.mode}:`);
          out.push(dbl.tabel(['objek', 'diubah'], r.slice(0, 500).map((x) => [x.objek, x.diubah])));
        } else {
          for (const nm of args.target.split(',').map((s) => s.trim()).filter(Boolean)) {
            const r = await driver.definisiKode(conn, jenis, nm);
            if (!r.length) out.push(`\n${args.mode} "${nm}" tidak ditemukan.`);
            for (const x of r) out.push(`\n## ${x.objek}\n${x.definisi ?? '(definisi terenkripsi atau tidak dapat dibaca)'}`);
          }
        }
      }
      return textResult(out.join('\n'));
    }),
);

// 13. Run DB SELECT (read-only)
server.registerTool(
  'run_db_select',
  {
    description: 'Jalankan satu query SELECT read-only ke database client (dibatasi maksimal 100 baris; INSERT/UPDATE/DELETE/DDL ditolak).',
    inputSchema: {
      connection: z.string().describe('Nama koneksi dari list_db_connections'),
      sql: z.string().describe('Satu query SELECT atau WITH ... SELECT'),
      maxRows: z.number().optional().describe('Batas baris (default 50, maks 100)'),
      client: z.string().optional(),
      env: z.string().optional(),
      allowProd: z.boolean().optional(),
    },
    annotations: { readOnlyHint: true },
  },
  async (args) => {
    const cfg = loadMcpConfig();
    if (!cfg.allowDbSelect) {
      return textResult('run_db_select dinonaktifkan di APP/mcp/mcp-config.json (allowDbSelect: false).', true);
    }
    const reason = dbl.periksaQuery(args.sql);
    if (reason) return textResult(`Query ditolak: ${reason}`, true);
    return withDbConn(args, async (driver, conn, _k, head) => {
      const maks = clamp(args.maxRows, 1, cfg.maxDbRows || 100, 50);
      const sets = await driver.query(conn, args.sql, { maks });
      const out = [head];
      if (!sets.length) out.push('(tidak ada hasil)');
      for (const s of sets) {
        out.push(dbl.tabel(s.kolom, s.baris, 200));
        out.push(`(${s.baris.length} baris${s.terpotong ? `, dipotong di ${maks}` : ''})`);
      }
      return textResult(out.join('\n'));
    });
  },
);

  return server;
}

module.exports = {
  APP_DIR,
  MCP_DIR,
  CONFIG_FILE,
  RULES_FILE,
  loadMcpConfig,
  readRulesText,
  createMcpServer,
};
