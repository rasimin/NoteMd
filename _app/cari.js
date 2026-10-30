#!/usr/bin/env node
'use strict';
// Cari catatan tanpa membuka aplikasi. Hasilnya ringkas (hemat token) dan memakai mesin pencarian yang sama dengan aplikasi.
//
//   node _app/cari.js "kata kunci"                 cari di judul, tag, ringkasan, path, dan isi
//   node _app/cari.js "kata" --client victoria     batasi ke satu client
//   node _app/cari.js "kata" --folder victoria/akses   batasi ke satu folder (termasuk subfolder di bawahnya)
//   node _app/cari.js "kata" --env prod            batasi ke satu lingkungan
//   node _app/cari.js --diubah minggu-ini          catatan yang diubah pada rentang itu (boleh tanpa kata kunci)
//   node _app/cari.js --dibuat 2026-10-29          catatan yang dibuat pada tanggal itu
//       format tanggal: 2026-10-29 | 2026-10-25..2026-10-30 | 2026-10 | hari-ini | kemarin | minggu-ini | minggu-lalu | bulan-ini | 7-hari
//   node _app/cari.js --tag sre                    batasi ke satu tag (boleh tanpa kata kunci)
//   node _app/cari.js --daftar [--client x] [--folder x]   peta isi: folder dan catatan beserta ringkasannya
//   node _app/cari.js --daftar-folder [--client x] daftar nama folder saja beserta jumlah catatan
//   node _app/cari.js "kata" --maks 5              jumlah hasil (bawaan 8)
const lib = require('./notes-lib');

const args = process.argv.slice(2);
const opt = {};
const words = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--daftar') opt.daftar = true;
  else if (a === '--daftar-folder') opt.daftarFolder = true;
  else if (['--client', '--env', '--tag', '--maks', '--folder', '--diubah', '--dibuat'].includes(a)) opt[a.slice(2)] = args[++i];
  else if (a === '-h' || a === '--help') opt.help = true;
  else words.push(a);
}

if (opt.help) {
  console.log('Pemakaian: node _app/cari.js "kata kunci" [--client x] [--folder a/b] [--env prod|uat|local] [--tag x] [--diubah T] [--dibuat T] [--maks N]\n           node _app/cari.js --daftar [--client x] [--folder a/b]\n           node _app/cari.js --daftar-folder [--client x]\n  T = 2026-10-29 | 2026-10-25..2026-10-30 | 2026-10 | hari-ini | kemarin | minggu-ini | minggu-lalu | bulan-ini | 7-hari');
  process.exit(0);
}

// File di akar folder (STANDAR-CATATAN.md, ATURAN-AI.md) adalah aturan, bukan catatan; tidak ikut dicari.
const notes = lib.loadAllNotes().filter((n) => n.path.includes('/'));
const day = (ms) => lib.formatDate(ms).slice(0, 10);
const one = (s, n = 160) => {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};

const bad = (name, v) => {
  console.error(`Nilai ${name} tidak dikenal: "${v}". Contoh: 2026-10-29 | 2026-10-25..2026-10-30 | 2026-10 | hari-ini | kemarin | minggu-ini | minggu-lalu | bulan-ini | 7-hari`);
  process.exit(1);
};
const diubah = opt.diubah ? lib.parseDateRange(opt.diubah) || bad('--diubah', opt.diubah) : null;
const dibuat = opt.dibuat ? lib.parseDateRange(opt.dibuat) || bad('--dibuat', opt.dibuat) : null;
const folder = opt.folder ? opt.folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '') : '';
const inScope = (n) =>
  (!opt.client || n.path.split('/')[0].toLowerCase() === opt.client.toLowerCase()) &&
  (!folder || n.path.toLowerCase().startsWith(folder.toLowerCase() + '/')) &&
  (!diubah || (n.modified >= diubah.from && n.modified < diubah.to)) &&
  (!dibuat || (n.created >= dibuat.from && n.created < dibuat.to));

if (opt.daftarFolder) {
  const pool = notes.filter(inScope);
  const counts = new Map();
  for (const n of pool) {
    const segs = n.path.split('/').slice(0, -1);
    for (let i = 1; i <= segs.length; i++) {
      const p = segs.slice(0, i).join('/');
      const c = counts.get(p) || { total: 0, direct: 0 };
      c.total++;
      if (i === segs.length) c.direct++;
      counts.set(p, c);
    }
  }
  if (!counts.size) {
    console.log('(tidak ada folder)');
    process.exit(0);
  }
  console.log(`${counts.size} folder`);
  [...counts.keys()].sort((a, b) => a.localeCompare(b, 'id')).forEach((p) => {
    const depth = p.split('/').length - 1;
    console.log(`${'  '.repeat(depth)}${p.split('/').pop()}/  (${counts.get(p).total} catatan)  ${p}`);
  });
  process.exit(0);
}

if (opt.daftar) {
  const pool = notes.filter(inScope);
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
if (!q && !opt.tag && !diubah && !dibuat && !folder) {
  console.log('Isi kata kunci, atau pakai --tag / --folder / --diubah / --dibuat / --daftar. Bantuan: node _app/cari.js --help');
  process.exit(1);
}
const max = Math.max(1, Math.min(30, parseInt(opt.maks, 10) || 8));
const filters = { client: opt.client, env: opt.env, tag: opt.tag, folder, diubah, dibuat };
const all = lib.searchNotes(q, notes, { ...filters, limit: 1000 });
let results = all.slice(0, max);
let total = all.length;
let partial = false;
if (!results.length && q.split(/\s+/).length > 1) {
  const any = lib.searchNotes(q, notes, { ...filters, limit: 1000, any: true });
  results = any.slice(0, max);
  total = any.length;
  partial = results.length > 0;
}
if (!results.length) {
  const f = [opt.client && 'client ' + opt.client, folder && 'folder ' + folder, opt.diubah && 'diubah ' + opt.diubah, opt.dibuat && 'dibuat ' + opt.dibuat, opt.tag && 'tag ' + opt.tag, opt.env && 'lingkungan ' + opt.env].filter(Boolean).join(', ');
  console.log(`Tidak ada hasil${q ? ' untuk "' + q + '"' : ''}${f ? ' (' + f + ')' : ''}. Coba kata lain atau longgarkan filter, atau: node _app/cari.js --daftar`);
  process.exit(0);
}
console.log(`${total > results.length ? `${results.length} dari ${total}` : results.length} hasil${total > results.length ? ' (tambah --maks N untuk lebih banyak, maks 30)' : ''}${partial ? ' (cocok sebagian: tidak ada catatan yang memuat semua kata)' : ''}`);
results.forEach((r, i) => {
  console.log(`\n${i + 1}. ${r.path}${r.env ? '  [' + r.env + ']' : ''}  (diubah ${day(r.modified)}${dibuat ? ', dibuat ' + day(r.created) : ''})`);
  console.log(`   ${r.title}`);
  if (r.summary) console.log(`   ringkasan: ${one(r.summary, 220)}`);
  if (r.tags.length) console.log(`   tag: ${r.tags.join(', ')}`);
  if (r.snippet && !r.snippet.includes(r.title.slice(0, 30))) console.log(`   ${r.inAtt ? '[di lampiran ' + r.inAtt + '] ' : ''}${one(r.snippet, 160)}`);
  const files = (r.att || []).filter((a) => lib.TEXT_EXT.has(a.name.slice(a.name.lastIndexOf('.')).toLowerCase()));
  if (files.length) console.log(`   file lampiran: ${files.slice(0, 6).map((a) => a.path).join(' ; ')}`);
});
console.log('\nBaca: node _app/baca.js "<path>" --outline   lalu   --bagian "<judul>"');
