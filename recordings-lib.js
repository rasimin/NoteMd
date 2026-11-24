'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ALLOWED_TRACKS = new Set(['mic', 'system', 'combined']);
const CHUNK_TRACKS = new Set(['mic', 'system']);
const ID_RE = /^[a-zA-Z0-9_-]{4,120}$/;
const DATE_DIR_RE = /^\d{4}-\d{2}-\d{2}$/;
const TEXT_FILE_EXTS = new Set(['.md', '.txt', '.srt', '.vtt', '.json', '.csv', '.tsv', '.log', '.xml', '.yaml', '.yml']);
const MIME_BY_EXT = {
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.srt': 'text/plain; charset=utf-8',
  '.vtt': 'text/vtt; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.tsv': 'text/tab-separated-values; charset=utf-8',
  '.log': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.zip': 'application/zip',
  '.webm': 'audio/webm',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
};

function sanitizeFileName(name) {
  if (typeof name !== 'string') return '';
  let s = name.trim().replace(/[\x00-\x1f<>:"/\\|?*]+/g, '-').replace(/[. ]+$/, '');
  if (!s || s === '.' || s === '..' || s.startsWith('.')) return '';
  if (s.toLowerCase() === 'meta.json' || /\.tmp$/i.test(s)) return '';
  const base = path.parse(s).name;
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(base)) return '';
  if (s.length > 140) {
    const ext = path.extname(s).slice(0, 20);
    s = s.slice(0, 140 - ext.length) + ext;
  }
  return s;
}

function isCoreAudioFile(meta, fileName) {
  if (!meta || !fileName) return false;
  const lower = String(fileName).toLowerCase();
  const mic = meta.tracks && meta.tracks.mic && meta.tracks.mic.file ? path.basename(String(meta.tracks.mic.file)).toLowerCase() : '';
  const sys = meta.tracks && meta.tracks.system && meta.tracks.system.file ? path.basename(String(meta.tracks.system.file)).toLowerCase() : '';
  return (mic && lower === mic) || (sys && lower === sys);
}

function isAudioTrackName(meta, fileName) {
  if (!meta || !fileName) return null;
  const lower = String(fileName).toLowerCase();
  const mic = meta.tracks && meta.tracks.mic && meta.tracks.mic.file ? path.basename(String(meta.tracks.mic.file)).toLowerCase() : '';
  const sys = meta.tracks && meta.tracks.system && meta.tracks.system.file ? path.basename(String(meta.tracks.system.file)).toLowerCase() : '';
  const comb = meta.combined && meta.combined.file ? path.basename(String(meta.combined.file)).toLowerCase() : '';
  if (mic && lower === mic) return 'mic';
  if (sys && lower === sys) return 'system';
  if (comb && lower === comb) return 'combined';
  return null;
}

function isValidId(id) {
  return typeof id === 'string' && ID_RE.test(id);
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function resolveSessionDir(root, id) {
  if (!isValidId(id)) return null;
  const base = path.resolve(root);

  if (/^\d{4}-\d{2}-\d{2}_/.test(id)) {
    const dated = path.resolve(base, id.slice(0, 10), id);
    if (dated.startsWith(base + path.sep) && isDir(dated)) return dated;
  }

  const flat = path.resolve(base, id);
  if (flat.startsWith(base + path.sep) && isDir(flat)) return flat;

  try {
    const entries = fs.readdirSync(base, { withFileTypes: true });
    for (const ent of entries) {
      if (!ent.isDirectory() || !DATE_DIR_RE.test(ent.name)) continue;
      const cand = path.resolve(base, ent.name, id);
      if (cand.startsWith(base + path.sep) && isDir(cand)) return cand;
    }
  } catch {}

  return null;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function localDateKey(dateLike = new Date()) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike || Date.now());
  if (isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  }
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function localStamp(date = new Date()) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  return {
    idPrefix: `${y}-${m}-${d}_${hh}-${mm}`,
    titleDefault: `Meeting ${y}-${m}-${d} ${hh}:${mm}`,
  };
}

function slugify(text) {
  const s = String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return s || 'meeting';
}

function sanitizeLinkedNote(rel) {
  if (typeof rel !== 'string') return '';
  const trimmed = rel.trim().replace(/\\/g, '/');
  if (!trimmed || trimmed.includes('\0')) return '';
  const parts = trimmed.split('/').filter(Boolean);
  if (!parts.length || parts.some((p) => p === '.' || p === '..')) return '';
  return parts.join('/');
}

function safeStatSize(filePath) {
  try {
    const st = fs.statSync(filePath);
    return st.isFile() ? st.size : 0;
  } catch {
    return 0;
  }
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function readMeta(dir) {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
    return raw && typeof raw === 'object' ? raw : null;
  } catch {
    return null;
  }
}

function writeMeta(dir, meta) {
  const target = path.join(dir, 'meta.json');
  const tmp = path.join(dir, `meta.json.${process.pid}.${Date.now()}.tmp`);
  const data = JSON.stringify(meta, null, 2);
  try {
    fs.writeFileSync(tmp, data, 'utf8');
    fs.renameSync(tmp, target);
  } catch {
    try {
      fs.unlinkSync(tmp);
    } catch {}
    fs.writeFileSync(target, data, 'utf8');
  }
}

function enrichMeta(root, id, meta, knownDir = null) {
  const dir = knownDir || resolveSessionDir(root, id);
  if (!dir || !meta) return null;

  const tracks = {};
  const filePaths = {};
  let totalSize = 0;

  if (meta.tracks && meta.tracks.mic && meta.tracks.mic.file) {
    const f = path.basename(String(meta.tracks.mic.file));
    const full = path.join(dir, f);
    const size = safeStatSize(full);
    tracks.mic = {
      file: f,
      mime: String(meta.tracks.mic.mime || 'audio/webm'),
      size,
    };
    filePaths.mic = full;
    totalSize += size;
  }

  if (meta.tracks && meta.tracks.system && meta.tracks.system.file) {
    const f = path.basename(String(meta.tracks.system.file));
    const full = path.join(dir, f);
    const size = safeStatSize(full);
    tracks.system = {
      file: f,
      mime: String(meta.tracks.system.mime || 'audio/webm'),
      size,
    };
    filePaths.system = full;
    totalSize += size;
  }

  let combined = null;
  if (meta.combined && meta.combined.file) {
    const f = path.basename(String(meta.combined.file));
    const full = path.join(dir, f);
    if (fileExists(full)) {
      const size = safeStatSize(full);
      combined = {
        file: f,
        mime: String(meta.combined.mime || (f.endsWith('.wav') ? 'audio/wav' : 'audio/webm')),
        size,
        createdAt: meta.combined.createdAt || meta.updatedAt || meta.createdAt,
      };
      filePaths.combined = full;
      totalSize += size;
    }
  }

  let extraFilesCount = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (!ent.isFile()) continue;
      const n = ent.name;
      if (n.startsWith('.') || n.toLowerCase() === 'meta.json' || /\.tmp$/i.test(n)) continue;
      if (isAudioTrackName(meta, n)) continue;
      extraFilesCount++;
    }
  } catch {}

  const createdAt = meta.createdAt || new Date().toISOString();
  const dateKey =
    typeof meta.dateKey === 'string' && DATE_DIR_RE.test(meta.dateKey)
      ? meta.dateKey
      : /^\d{4}-\d{2}-\d{2}_/.test(meta.id || id)
        ? String(meta.id || id).slice(0, 10)
        : localDateKey(createdAt);

  return {
    id: meta.id || id,
    dateKey,
    title: String(meta.title || id),
    mode: meta.mode === 'online' ? 'online' : 'offline',
    status: meta.status || 'recording',
    transcriptStatus: meta.transcriptStatus || 'pending',
    createdAt,
    updatedAt: meta.updatedAt || createdAt,
    durationSec: Number.isFinite(Number(meta.durationSec)) && Number(meta.durationSec) >= 0 ? Number(meta.durationSec) : 0,
    linkedNote: sanitizeLinkedNote(meta.linkedNote || ''),
    tracks,
    combined,
    extraFilesCount,
    totalSize,
    dirPath: dir,
    filePaths,
  };
}

function createSession(root, opts = {}) {
  const base = path.resolve(root);
  fs.mkdirSync(base, { recursive: true });

  const now = new Date();
  const dateKey = localDateKey(now);
  const { idPrefix, titleDefault } = localStamp(now);
  const title = typeof opts.title === 'string' && opts.title.trim() ? opts.title.trim().slice(0, 140) : titleDefault;
  const mode = opts.mode === 'online' ? 'online' : 'offline';
  const linkedNote = sanitizeLinkedNote(opts.linkedNote || '');
  const hex = crypto.randomBytes(2).toString('hex');
  const id = `${idPrefix}_${slugify(title)}-${hex}`;
  if (!isValidId(id)) throw new Error('ID sesi rekaman tidak valid');

  const dateDir = path.resolve(base, dateKey);
  const dir = path.resolve(dateDir, id);
  if (!dir.startsWith(dateDir + path.sep)) throw new Error('Path sesi rekaman tidak valid');

  fs.mkdirSync(dir, { recursive: true });

  const micMime = typeof opts.micMime === 'string' && opts.micMime.trim() ? opts.micMime.trim() : 'audio/webm';
  const systemMime = typeof opts.systemMime === 'string' && opts.systemMime.trim() ? opts.systemMime.trim() : 'audio/webm';
  const isoNow = now.toISOString();

  const meta = {
    id,
    dateKey,
    title,
    mode,
    status: 'recording',
    transcriptStatus: 'pending',
    createdAt: isoNow,
    updatedAt: isoNow,
    durationSec: 0,
    linkedNote,
    tracks: {
      mic: { file: 'mic.webm', mime: micMime, size: 0 },
      ...(mode === 'online' ? { system: { file: 'system.webm', mime: systemMime, size: 0 } } : {}),
    },
    combined: null,
  };

  writeMeta(dir, meta);
  return enrichMeta(base, id, meta, dir);
}

function appendChunk(root, id, track, buffer) {
  if (!CHUNK_TRACKS.has(track)) return null;
  const dir = resolveSessionDir(root, id);
  if (!dir) return null;
  const meta = readMeta(dir);
  if (!meta) return null;
  const trackInfo = meta.tracks && meta.tracks[track];
  const fileName = trackInfo && trackInfo.file ? path.basename(String(trackInfo.file)) : `${track}.webm`;
  const target = path.join(dir, fileName);
  fs.appendFileSync(target, buffer);
  return safeStatSize(target);
}

function finishSession(root, id, opts = {}) {
  const dir = resolveSessionDir(root, id);
  if (!dir) return null;
  const meta = readMeta(dir);
  if (!meta) return null;

  meta.status = 'completed';
  if (opts.durationSec !== undefined) {
    const dur = Number(opts.durationSec);
    if (Number.isFinite(dur) && dur >= 0) meta.durationSec = Math.round(dur);
  }
  if (typeof opts.title === 'string' && opts.title.trim()) {
    meta.title = opts.title.trim().slice(0, 140);
  }
  if (typeof opts.linkedNote === 'string') {
    meta.linkedNote = sanitizeLinkedNote(opts.linkedNote);
  }

  if (meta.tracks && meta.tracks.mic) {
    meta.tracks.mic.size = safeStatSize(path.join(dir, path.basename(String(meta.tracks.mic.file || 'mic.webm'))));
  }
  if (meta.tracks && meta.tracks.system) {
    meta.tracks.system.size = safeStatSize(path.join(dir, path.basename(String(meta.tracks.system.file || 'system.webm'))));
  }

  meta.updatedAt = new Date().toISOString();
  writeMeta(dir, meta);
  return enrichMeta(root, id, meta);
}

function saveCombinedMeta(root, id, { file, mime, size }) {
  const dir = resolveSessionDir(root, id);
  if (!dir) return null;
  const meta = readMeta(dir);
  if (!meta) return null;
  const safeFile = path.basename(String(file || 'combined.wav'));
  const now = new Date().toISOString();
  meta.combined = {
    file: safeFile,
    mime: String(mime || (safeFile.endsWith('.wav') ? 'audio/wav' : 'audio/webm')),
    size: Number.isFinite(Number(size)) ? Number(size) : safeStatSize(path.join(dir, safeFile)),
    createdAt: now,
  };
  meta.updatedAt = now;
  writeMeta(dir, meta);
  return enrichMeta(root, id, meta);
}

function listRecordings(root) {
  const base = path.resolve(root);
  let entries;
  try {
    entries = fs.readdirSync(base, { withFileTypes: true });
  } catch {
    return [];
  }

  const items = [];
  const seen = new Set();
  const tryPush = (dir, id) => {
    if (!isValidId(id) || seen.has(id)) return;
    const meta = readMeta(dir);
    if (!meta) return;
    seen.add(id);
    const item = enrichMeta(base, id, meta, dir);
    if (item) items.push(item);
  };

  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    if (DATE_DIR_RE.test(ent.name)) {
      const dateDir = path.resolve(base, ent.name);
      if (!dateDir.startsWith(base + path.sep)) continue;
      let children = [];
      try {
        children = fs.readdirSync(dateDir, { withFileTypes: true });
      } catch {}
      for (const sub of children) {
        if (!sub.isDirectory() || !isValidId(sub.name)) continue;
        const subDir = path.resolve(dateDir, sub.name);
        if (subDir.startsWith(dateDir + path.sep)) tryPush(subDir, sub.name);
      }
    } else if (isValidId(ent.name)) {
      const flatDir = path.resolve(base, ent.name);
      if (flatDir.startsWith(base + path.sep)) tryPush(flatDir, ent.name);
    }
  }

  items.sort((a, b) => {
    const ta = Date.parse(a.createdAt) || 0;
    const tb = Date.parse(b.createdAt) || 0;
    return tb - ta;
  });
  return items;
}

function getRecording(root, id) {
  const dir = resolveSessionDir(root, id);
  if (!dir) return null;
  const meta = readMeta(dir);
  if (!meta) return null;
  return enrichMeta(root, id, meta);
}

function updateRecording(root, id, opts = {}) {
  const dir = resolveSessionDir(root, id);
  if (!dir) return null;
  const meta = readMeta(dir);
  if (!meta) return null;

  if (typeof opts.title === 'string' && opts.title.trim()) {
    meta.title = opts.title.trim().slice(0, 140);
  }
  if (opts.linkedNote !== undefined) {
    meta.linkedNote = sanitizeLinkedNote(String(opts.linkedNote || ''));
  }
  if (typeof opts.transcriptStatus === 'string' && ['pending', 'processing', 'done'].includes(opts.transcriptStatus)) {
    meta.transcriptStatus = opts.transcriptStatus;
  }
  meta.updatedAt = new Date().toISOString();
  writeMeta(dir, meta);
  return enrichMeta(root, id, meta);
}

function deleteRecording(root, id) {
  const dir = resolveSessionDir(root, id);
  if (!dir) return false;
  let exists = false;
  try {
    exists = fs.statSync(dir).isDirectory();
  } catch {}
  if (!exists) return false;
  fs.rmSync(dir, { recursive: true, force: true });

  const base = path.resolve(root);
  const parent = path.dirname(dir);
  if (parent !== base && parent.startsWith(base + path.sep) && DATE_DIR_RE.test(path.basename(parent))) {
    try {
      if (fs.readdirSync(parent).length === 0) fs.rmdirSync(parent);
    } catch {}
  }
  return true;
}

function resolveTrackFile(root, id, track) {
  if (!ALLOWED_TRACKS.has(track)) return null;
  const dir = resolveSessionDir(root, id);
  if (!dir) return null;
  const meta = readMeta(dir);
  if (!meta) return null;

  let info = null;
  if (track === 'combined') {
    info = meta.combined;
  } else if (meta.tracks && meta.tracks[track]) {
    info = meta.tracks[track];
  }
  if (!info || !info.file) return null;

  const fileName = path.basename(String(info.file));
  const fullPath = path.resolve(dir, fileName);
  if (!fullPath.startsWith(dir + path.sep)) return null;

  let st;
  try {
    st = fs.statSync(fullPath);
  } catch {
    return null;
  }
  if (!st.isFile()) return null;

  return {
    fullPath,
    fileName,
    mime: String(info.mime || (fileName.endsWith('.wav') ? 'audio/wav' : 'audio/webm')),
    size: st.size,
  };
}

function listSessionFiles(root, id) {
  const dir = resolveSessionDir(root, id);
  if (!dir) return null;
  const meta = readMeta(dir);
  if (!meta) return null;

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const audioOrder = { mic: 0, system: 1, combined: 2 };
  const files = [];
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    const name = ent.name;
    if (name.startsWith('.') || name.toLowerCase() === 'meta.json' || /\.tmp$/i.test(name)) continue;
    const fullPath = path.join(dir, name);
    let st;
    try {
      st = fs.statSync(fullPath);
    } catch {
      continue;
    }
    if (!st.isFile()) continue;

    const ext = path.extname(name).toLowerCase();
    const track = isAudioTrackName(meta, name);
    const isText = TEXT_FILE_EXTS.has(ext);
    const isCoreAudio = isCoreAudioFile(meta, name);
    const kind = track || ['.webm', '.wav', '.mp3', '.m4a', '.ogg'].includes(ext) ? 'audio' : isText ? 'text' : 'file';

    files.push({
      name,
      size: st.size,
      mtimeMs: st.mtimeMs,
      ext,
      isText,
      isCoreAudio,
      track,
      kind,
      fullPath,
    });
  }

  files.sort((a, b) => {
    const rank = (f) => (f.track ? 0 : f.kind === 'audio' ? 1 : f.isText ? 2 : 3);
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 0) return (audioOrder[a.track] ?? 9) - (audioOrder[b.track] ?? 9);
    return a.name.localeCompare(b.name, 'id');
  });

  return files;
}

function resolveSessionFile(root, id, fileName) {
  const dir = resolveSessionDir(root, id);
  if (!dir) return null;
  const safeName = sanitizeFileName(fileName);
  if (!safeName || safeName !== fileName) return null;
  const fullPath = path.resolve(dir, safeName);
  if (!fullPath.startsWith(dir + path.sep)) return null;

  let st;
  try {
    st = fs.statSync(fullPath);
  } catch {
    return null;
  }
  if (!st.isFile()) return null;

  const ext = path.extname(safeName).toLowerCase();
  return {
    fullPath,
    name: safeName,
    size: st.size,
    mtimeMs: st.mtimeMs,
    ext,
    isText: TEXT_FILE_EXTS.has(ext),
    mime: MIME_BY_EXT[ext] || 'application/octet-stream',
  };
}

function readSessionTextFile(root, id, fileName, maxBytes = 4 * 1024 * 1024) {
  const info = resolveSessionFile(root, id, fileName);
  if (!info || !info.isText) return null;
  if (info.size > maxBytes) return { tooLarge: true, size: info.size, name: info.name };
  const content = fs.readFileSync(info.fullPath, 'utf8');
  return {
    name: info.name,
    size: info.size,
    mtimeMs: info.mtimeMs,
    fullPath: info.fullPath,
    content,
  };
}

function writeSessionTextFile(root, id, rawName, content, { overwrite = false } = {}) {
  const dir = resolveSessionDir(root, id);
  if (!dir) return { error: 'ID rekaman tidak valid', code: 400 };
  const meta = readMeta(dir);
  if (!meta) return { error: 'Sesi rekaman tidak ditemukan', code: 404 };

  let safeName = sanitizeFileName(rawName);
  if (!safeName) return { error: 'Nama file tidak valid', code: 400 };
  if (!path.extname(safeName)) {
    safeName = sanitizeFileName(`${safeName}.md`);
    if (!safeName) return { error: 'Nama file tidak valid', code: 400 };
  }
  const comb = meta.combined && meta.combined.file ? path.basename(String(meta.combined.file)).toLowerCase() : '';
  if (isCoreAudioFile(meta, safeName) || (comb && safeName.toLowerCase() === comb)) {
    return { error: 'Nama file bentrok dengan file audio rekaman', code: 400 };
  }

  const target = path.resolve(dir, safeName);
  if (!target.startsWith(dir + path.sep)) return { error: 'Path file tidak valid', code: 400 };
  if (!overwrite && fileExists(target)) {
    return { conflict: true, name: safeName };
  }

  fs.writeFileSync(target, String(content ?? ''), 'utf8');
  meta.updatedAt = new Date().toISOString();
  writeMeta(dir, meta);
  return { ok: true, file: resolveSessionFile(root, id, safeName) };
}

function uniqueUploadFileName(dir, meta, rawName) {
  const safeName = sanitizeFileName(rawName);
  if (!safeName || isCoreAudioFile(meta, safeName)) return '';
  const comb = meta && meta.combined && meta.combined.file ? path.basename(String(meta.combined.file)).toLowerCase() : '';
  if (!fileExists(path.join(dir, safeName)) && (!comb || safeName.toLowerCase() !== comb)) {
    return safeName;
  }
  const ext = path.extname(safeName);
  const stem = safeName.slice(0, safeName.length - ext.length) || 'file';
  for (let i = 2; i < 1000; i++) {
    const candidate = sanitizeFileName(`${stem}-${i}${ext}`);
    if (candidate && !fileExists(path.join(dir, candidate)) && (!comb || candidate.toLowerCase() !== comb)) {
      return candidate;
    }
  }
  return '';
}

function deleteSessionFile(root, id, fileName) {
  const dir = resolveSessionDir(root, id);
  if (!dir) return false;
  const meta = readMeta(dir);
  if (!meta) return false;
  const info = resolveSessionFile(root, id, fileName);
  if (!info || isCoreAudioFile(meta, info.name)) return false;

  fs.unlinkSync(info.fullPath);
  if (meta.combined && meta.combined.file && path.basename(String(meta.combined.file)).toLowerCase() === info.name.toLowerCase()) {
    meta.combined = null;
  }
  meta.updatedAt = new Date().toISOString();
  writeMeta(dir, meta);
  return true;
}

function touchSession(root, id) {
  const dir = resolveSessionDir(root, id);
  if (!dir) return null;
  const meta = readMeta(dir);
  if (!meta) return null;
  meta.updatedAt = new Date().toISOString();
  writeMeta(dir, meta);
  return enrichMeta(root, id, meta);
}

module.exports = {
  ALLOWED_TRACKS,
  CHUNK_TRACKS,
  TEXT_FILE_EXTS,
  isValidId,
  resolveSessionDir,
  sanitizeLinkedNote,
  sanitizeFileName,
  isCoreAudioFile,
  createSession,
  appendChunk,
  finishSession,
  saveCombinedMeta,
  listRecordings,
  getRecording,
  updateRecording,
  deleteRecording,
  resolveTrackFile,
  listSessionFiles,
  resolveSessionFile,
  readSessionTextFile,
  writeSessionTextFile,
  uniqueUploadFileName,
  deleteSessionFile,
  touchSession,
};
