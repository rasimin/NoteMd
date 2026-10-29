#!/usr/bin/env node
'use strict';
// Cari catatan tanpa membuka aplikasi. Hasilnya ringkas (hemat token) dan memakai mesin pencarian yang sama dengan aplikasi.
//
//   node _app/cari.js "kata kunci"                 cari di judul, tag, ringkasan, path, dan isi
//   node _app/cari.js "kata" --client victoria     batasi ke satu client
//   node _app/cari.js "kata" --env prod            batasi ke satu lingkungan
//   node _app/cari.js --tag sre                    batasi ke satu tag (boleh tanpa kata kunci)
//   node _app/cari.js --daftar [--client x]        peta isi: folder dan catatan beserta ringkasannya
//   node _app/cari.js "kata" --maks 5              jumlah hasil (bawaan 8)
const lib = require('./notes-lib');

const args = process.argv.slice(2);
const opt = {};
const words = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--daftar') opt.daftar = true;
  else if (a === '--client' || a === '--env' || a === '--tag' || a === '--maks') opt[a.slice(2)] = args[++i];
  else if (a === '-h' || a === '--help') opt.help = true;
  else words.push(a);
}

if (opt.help) {
  console.log('Pemakaian: node _app/cari.js "kata kunci" [--client x] [--env prod|uat|local] [--tag x] [--maks N]\n           node _app/cari.js --daftar [--client x]');
  process.exit(0);
}

// File di akar folder (STANDAR-CATATAN.md, ATURAN-AI.md) adalah aturan, bukan catatan; tidak ikut dicari.
const notes = lib.loadAllNotes().filter((n) => n.path.includes('/'));
const day = (ms) => lib.formatDate(ms).slice(0, 10);
const one = (s, n = 160) => {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};

if (opt.daftar) {
  const pool = notes.filter((n) => !opt.client || n.path.split('/')[0].toLowerCase() === opt.client.toLowerCase());
  if (!pool.length) {
    console.log('(tidak ada catatan)');
    process.exit(0);
  }
  const groups = new Map();
  for (const n of pool) {
    const dir = n.path.split('/').slice(0, -1).join('/') || '(root)';
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir).push(n);
  }
  console.log(`${pool.length} catatan`);
  for (const [dir, list] of groups) {
    console.log(`\n${dir}/ (${list.length})`);
    for (const n of list) {
      const bits = [n.path.split('/').pop(), n.title];
      if (n.env) bits.push(n.env);
      if (n.tags.length) bits.push('tag: ' + n.tags.join(','));
      console.log('  - ' + bits.join(' | '));
      if (n.summary) console.log('      ' + one(n.summary, 140));
    }
  }
  process.exit(0);
}

const q = words.join(' ');
if (!q && !opt.tag) {
  console.log('Isi kata kunci, atau pakai --tag / --daftar. Bantuan: node _app/cari.js --help');
  process.exit(1);
}
const max = Math.max(1, Math.min(30, parseInt(opt.maks, 10) || 8));
const filters = { client: opt.client, env: opt.env, tag: opt.tag };
let results = lib.searchNotes(q, notes, { ...filters, limit: max });
let partial = false;
if (!results.length && q.split(/\s+/).length > 1) {
  results = lib.searchNotes(q, notes, { ...filters, limit: max, any: true });
  partial = results.length > 0;
}
if (!results.length) {
  console.log(`Tidak ada hasil untuk "${q}"${opt.client ? ' di client ' + opt.client : ''}. Coba kata lain, atau: node _app/cari.js --daftar`);
  process.exit(0);
}
console.log(`${results.length} hasil${partial ? ' (cocok sebagian: tidak ada catatan yang memuat semua kata)' : ''}`);
results.forEach((r, i) => {
  console.log(`\n${i + 1}. ${r.path}${r.env ? '  [' + r.env + ']' : ''}  (${day(r.modified)})`);
  console.log(`   ${r.title}`);
  if (r.summary) console.log(`   ringkasan: ${one(r.summary, 220)}`);
  if (r.tags.length) console.log(`   tag: ${r.tags.join(', ')}`);
  if (r.snippet && !r.snippet.includes(r.title.slice(0, 30))) console.log(`   ${r.inAtt ? '[di lampiran ' + r.inAtt + '] ' : ''}${one(r.snippet, 160)}`);
  const files = (r.att || []).filter((a) => lib.TEXT_EXT.has(a.name.slice(a.name.lastIndexOf('.')).toLowerCase()));
  if (files.length) console.log(`   file lampiran: ${files.slice(0, 6).map((a) => a.path).join(' ; ')}`);
});
console.log('\nBaca: node _app/baca.js "<path>" --outline   lalu   --bagian "<judul>"');
