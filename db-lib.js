'use strict';
// Pustaka untuk db.js: baca koneksi dari catatan, jaga query tetap baca-saja, format keluaran.
const lib = require('./notes-lib');

// ---------- Koneksi dari catatan ----------
// Format baku (lihat ATURAN-AI.md): blok kode berbahasa "koneksi" di catatan <client>/<folder>/*.md
//   nama, jenis, server, database, user, password (wajib); port, lingkungan, enkripsi,
//   percaya-sertifikat, tls-min (opsional). Satu baris "kunci: nilai". Nilai dibaca apa adanya
//   sampai akhir baris (password boleh berisi # atau spasi).
// Format lama (daftar "* source:", "* catalog:", "* user id:", "* password:") masih dibaca.
const WAJIB = ['nama', 'jenis', 'server', 'database', 'user', 'password'];
const ALIAS = {
  source: 'server', 'data source': 'server', host: 'server',
  catalog: 'database', 'initial catalog': 'database', db: 'database',
  'user id': 'user', uid: 'user', username: 'user',
  pwd: 'password', pass: 'password',
};

function bool(v, bawaan) {
  if (v === undefined || v === '') return bawaan;
  return /^(1|true|ya|yes|y)$/i.test(String(v).trim());
}

function bacaPasangan(teks) {
  const out = {};
  for (const baris of teks.split(/\r?\n/)) {
    const m = /^\s*[*-]?\s*([A-Za-z][A-Za-z -]*?)\s*:\s*(.*?)\s*$/.exec(baris);
    if (!m) continue;
    let k = m[1].toLowerCase();
    k = ALIAS[k] || k;
    if (!(k in out)) out[k] = m[2].replace(/^`(.*)`$/, '$1');
  }
  return out;
}

function bentuk(raw, note, formatLama) {
  const parts = note.path.split('/');
  const k = {
    nama: (raw.nama || '').trim().toLowerCase(),
    jenis: (raw.jenis || (formatLama ? 'sqlserver' : '')).trim().toLowerCase(),
    server: raw.server || '',
    port: raw.port || '',
    database: raw.database || '',
    user: raw.user || '',
    password: raw.password ?? '',
    lingkungan: (raw.lingkungan || note.env || '').trim().toLowerCase(),
    enkripsi: bool(raw.enkripsi, false),
    percayaSertifikat: bool(raw['percaya-sertifikat'], true),
    tlsMin: raw['tls-min'] || '',
    client: parts[0],
    path: note.path,
    formatLama: !!formatLama,
  };
  if (formatLama && !raw.nama) k.nama = parts[parts.length - 1].replace(/\.md$/i, '').toLowerCase();
  return k;
}

// Kembalikan { koneksi: [...], galat: [...] } dari seluruh catatan client (bukan catatan di akar folder).
function muatKoneksi(notes = lib.loadAllNotes()) {
  const koneksi = [];
  const galat = [];
  for (const note of notes) {
    if (note.path.split('/').length < 2) continue; // ATURAN-AI.md, STANDAR-CATATAN.md, dll. berisi contoh saja
    const sebelum = koneksi.length;
    const re = /^```koneksi[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gm;
    let m;
    while ((m = re.exec(note.text))) {
      const k = bentuk(bacaPasangan(m[1]), note, false);
      const kurang = WAJIB.filter((f) => !String(k[f] ?? '').length);
      if (kurang.length) galat.push(`${note.path}: blok koneksi${k.nama ? ' "' + k.nama + '"' : ''} kurang field: ${kurang.join(', ')}`);
      else koneksi.push(k);
    }
    if (koneksi.length === sebelum && !/^```koneksi/m.test(note.text)) {
      // Format lama: bagian "Koneksi" berisi daftar source/catalog/user id/password.
      const h = /^#{1,6}\s*koneksi\b.*$/im.exec(note.text);
      if (h) {
        const sisa = note.text.slice(h.index + h[0].length);
        const akhir = sisa.search(/^#{1,6}\s/m);
        const raw = bacaPasangan(akhir < 0 ? sisa : sisa.slice(0, akhir));
        if (raw.server && raw.database && raw.user) koneksi.push(bentuk(raw, note, true));
      }
    }
  }
  const lihat = new Map();
  for (const k of koneksi) {
    if (lihat.has(k.nama)) galat.push(`nama koneksi ganda "${k.nama}": ${lihat.get(k.nama)} dan ${k.path}`);
    else lihat.set(k.nama, k.path);
  }
  return { koneksi, galat };
}

// Cari satu koneksi: nama persis, atau nama/path yang memuat kata itu. Null bila tidak tunggal.
function pilihKoneksi(daftar, q, { client, env } = {}) {
  let d = daftar;
  if (client) d = d.filter((k) => k.client === client.toLowerCase());
  if (env) d = d.filter((k) => k.lingkungan === env.toLowerCase());
  const key = String(q || '').toLowerCase();
  if (!key) return { hasil: d, tunggal: null };
  const persis = d.filter((k) => k.nama === key);
  if (persis.length === 1) return { hasil: persis, tunggal: persis[0] };
  const mirip = d.filter((k) => k.nama.includes(key) || k.path.toLowerCase().includes(key));
  return { hasil: mirip, tunggal: mirip.length === 1 ? mirip[0] : null };
}

// ---------- Penjaga query: hanya SELECT ----------
// Ini pagar kenyamanan, bukan keamanan. Perlindungan sebenarnya: pakai user database yang hanya punya hak baca.
function bersihkanSql(sql) {
  let out = '';
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    const d = sql[i + 1];
    if (c === '-' && d === '-') { while (i < n && sql[i] !== '\n') i++; out += ' '; continue; }
    if (c === '/' && d === '*') { const e = sql.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; out += ' '; continue; }
    if (c === "'" || c === '"' || c === '[') {
      const tutup = c === '[' ? ']' : c;
      i++;
      while (i < n) {
        if (sql[i] === tutup) { if (sql[i + 1] === tutup) { i += 2; continue; } break; }
        i++;
      }
      i++;
      out += ' ? ';
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

const DILARANG = ['INSERT', 'UPDATE', 'DELETE', 'MERGE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'EXEC', 'EXECUTE', 'GRANT', 'REVOKE', 'DENY',
  'INTO', 'BACKUP', 'RESTORE', 'SHUTDOWN', 'OPENROWSET', 'OPENQUERY', 'OPENDATASOURCE', 'BULK', 'WAITFOR', 'DBCC', 'KILL', 'RECONFIGURE',
  'USE', 'SET', 'DECLARE', 'BEGIN', 'COMMIT', 'ROLLBACK', 'CALL'];

// Kembalikan null bila aman, atau pesan alasan penolakan.
function periksaQuery(sql) {
  const b = bersihkanSql(sql).trim().replace(/;+\s*$/, '');
  if (!b) return 'Query kosong.';
  if (b.includes(';')) return 'Hanya satu pernyataan per query (tanda ; di tengah ditolak).';
  if (!/^(SELECT|WITH)\b/i.test(b)) return 'Hanya SELECT atau WITH ... SELECT yang diizinkan.';
  const kena = DILARANG.filter((w) => new RegExp('\\b' + w + '\\b', 'i').test(b));
  if (/\bNEXT\s+VALUE\s+FOR\b/i.test(b)) kena.push('NEXT VALUE FOR');
  if (/\bXP_\w+/i.test(b)) kena.push('xp_*');
  return kena.length ? 'Kata terlarang untuk query baca-saja: ' + kena.join(', ') + '.' : null;
}

// ---------- Format keluaran ----------
function sel(v, lebar) {
  if (v === null || v === undefined) return 'NULL';
  let s;
  if (v instanceof Date) s = isNaN(v) ? 'invalid-date' : v.toISOString().replace('T', ' ').replace(/(\.000)?Z$/, '');
  else if (Buffer.isBuffer(v)) s = '0x' + v.toString('hex').slice(0, 40) + (v.length > 20 ? `…(${v.length} byte)` : '');
  else if (typeof v === 'bigint') s = v.toString();
  else if (typeof v === 'object') s = JSON.stringify(v);
  else s = String(v);
  s = s.replace(/\r?\n/g, '↵').replace(/\|/g, '¦');
  if (lebar > 0 && s.length > lebar) s = s.slice(0, lebar) + `…(${s.length} kar)`;
  return s;
}

function tabel(kolom, baris, lebar = 200) {
  const out = [kolom.join(' | ')];
  for (const r of baris) out.push(r.map((v) => sel(v, lebar)).join(' | '));
  return out.join('\n');
}

// Samarkan password pada teks galat.
function samarkan(teks, k) {
  let s = String(teks);
  if (k && k.password) s = s.split(k.password).join('***');
  return s;
}

module.exports = { muatKoneksi, pilihKoneksi, periksaQuery, bersihkanSql, sel, tabel, samarkan };
