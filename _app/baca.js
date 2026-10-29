#!/usr/bin/env node
'use strict';
// Baca satu catatan seperlunya (hemat token).
//
//   node _app/baca.js "<path>" --outline          daftar judul + ukuran tiap bagian
//   node _app/baca.js "<path>" --bagian "Query"   hanya bagian dengan judul itu
//   node _app/baca.js "<path>"                    seluruh catatan (dipotong bila panjang)
//   node _app/baca.js "<folder>/_lampiran/<catatan>/file.sql"   isi file teks lampiran
//   node _app/baca.js "<path>" --maks 20000       ubah batas karakter (bawaan 6000)
const fs = require('fs');
const path = require('path');
const lib = require('./notes-lib');

const args = process.argv.slice(2);
const opt = {};
let rel = null;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--outline') opt.outline = true;
  else if (a === '--bagian' || a === '--maks') opt[a.slice(2)] = args[++i];
  else if (a === '-h' || a === '--help') opt.help = true;
  else if (!rel) rel = a;
}
if (opt.help || !rel) {
  console.log('Pemakaian: node _app/baca.js "<path/catatan.md>" [--outline] [--bagian "judul"] [--maks N]');
  process.exit(opt.help ? 0 : 1);
}

rel = rel.replace(/\\/g, '/').replace(/^\.?\//, '');
const parts = rel.split('/');
const isAtt = parts.length >= 4 && parts[parts.length - 3] === '_lampiran' && lib.TEXT_EXT.has(path.extname(rel).toLowerCase());
const badSeg = parts.some((p, i) => !p || p === '.' || p === '..' || (lib.isHiddenName(p) && !(isAtt && i === parts.length - 3 && p === '_lampiran')));
if ((!/\.md$/i.test(rel) && !isAtt) || badSeg || parts.slice(0, -3).includes('_lampiran')) {
  console.error('Path tidak valid. Pakai path relatif dari hasil cari.js, contoh: victoria/akses/victoria-sbn-akses-db.md');
  process.exit(1);
}
const full = path.resolve(lib.ROOT, ...parts);
if (!full.startsWith(lib.ROOT + path.sep)) {
  console.error('Path di luar folder catatan');
  process.exit(1);
}
let text;
let st;
try {
  st = fs.statSync(full);
  text = fs.readFileSync(full, 'utf8');
} catch {
  console.error('File tidak ditemukan: ' + rel);
  process.exit(1);
}

if (isAtt) {
  // File teks lampiran (.sql, .txt, ...): tampilkan isinya, dipotong bila panjang.
  const lim = Math.max(500, parseInt(opt.maks, 10) || 6000);
  console.log(`# lampiran: ${rel} (${text.length} karakter)\n---`);
  console.log(text.length > lim ? text.slice(0, lim) + `\n\n[... dipotong, ${text.length - lim} karakter lagi. Pakai --maks ${text.length}]` : text);
  process.exit(0);
}

const note = lib.parseNote(rel, text, st);
const day = (ms) => lib.formatDate(ms);
const head = [`# ${note.title}`, `path: ${rel}`];
if (note.env) head.push(`lingkungan: ${note.env}`);
if (note.tags.length) head.push(`tag: ${note.tags.join(', ')}`);
if (note.summary) head.push(`ringkasan: ${note.summary}`);
head.push(`dibuat: ${day(note.created)} | diubah: ${day(note.modified)}`);
console.log(head.join('\n') + '\n---');

const body = note.text.replace(/^\s*\n/, '');
if (opt.outline) {
  const { heads } = lib.outline(body);
  if (!heads.length) console.log(`(tidak ada judul bagian; ${body.length} karakter)`);
  for (const h of heads) console.log(`${'  '.repeat(h.level - 1)}${'#'.repeat(h.level)} ${h.text}  (${h.chars} kar.)`);
  console.log(`\nTotal ${body.length} karakter. Ambil bagian: node _app/baca.js "${rel}" --bagian "<judul>"`);
  process.exit(0);
}

const max = Math.max(500, parseInt(opt.maks, 10) || 6000);
let out;
if (opt.bagian) {
  const sec = lib.section(body, opt.bagian);
  if (!sec) {
    console.error(`Bagian "${opt.bagian}" tidak ada. Lihat daftar judul: node _app/baca.js "${rel}" --outline`);
    process.exit(1);
  }
  out = sec.text;
} else {
  out = body;
}
if (out.length > max) {
  out = out.slice(0, max) + `\n\n[... dipotong, ${out.length - max} karakter lagi. Pakai --outline lalu --bagian "<judul>", atau --maks ${out.length}]`;
}
console.log(out);
