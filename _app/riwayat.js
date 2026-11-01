#!/usr/bin/env node
'use strict';
// Skrip riwayat versi catatan untuk AI.
//   node _app/riwayat.js catat "<path.md>" ["<path2.md>" ...]   catat versi sekarang (jalankan setelah menulis/mengedit)
//   node _app/riwayat.js catat --semua                          catat semua catatan yang berubah
//   node _app/riwayat.js daftar "<path.md>"                     daftar versi catatan
const path = require('path');
const { ROOT, listNotePaths, isHiddenName } = require('./notes-lib');
const H = require('./riwayat-lib');

function usage() {
  console.log('Pemakaian:\n  node _app/riwayat.js catat "<path.md>" [...]\n  node _app/riwayat.js catat --semua\n  node _app/riwayat.js daftar "<path.md>"');
  process.exit(1);
}

function cleanRel(raw) {
  const rel = String(raw || '').replace(/\\/g, '/').replace(/^\.?\//, '');
  const segs = rel.split('/');
  if (!/\.md$/i.test(rel) || segs.some((s) => !s || s === '.' || s === '..' || isHiddenName(s))) return null;
  return rel;
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'catat') {
  const rels = args.includes('--semua') ? listNotePaths(ROOT) : args.map(cleanRel);
  if (!rels.length || rels.some((r) => !r)) usage();
  let n = 0;
  for (const rel of rels) {
    const r = H.record(ROOT, rel, 'luar');
    if (r.missing) console.log(`tidak ada: ${rel}`);
    else if (r.changed) {
      n++;
      console.log(`dicatat: ${rel}`);
    }
  }
  console.log(`${n} versi baru dicatat dari ${rels.length} catatan.`);
} else if (cmd === 'daftar') {
  const rel = cleanRel(args[0]);
  if (!rel) usage();
  const v = H.list(ROOT, rel);
  if (!v.length) console.log('Belum ada riwayat.');
  v.forEach((x, i) => {
    const d = new Date(x.time);
    const p = (n) => String(n).padStart(2, '0');
    console.log(`${i + 1}. ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}  ${x.label}  ${x.size} B`);
  });
} else usage();
