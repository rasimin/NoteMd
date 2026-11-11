#!/usr/bin/env node
'use strict';
// Ambil skema atau jalankan SELECT ke database klien. Kredensial dibaca dari catatan (blok ```koneksi,
// lihat ATURAN-AI.md bagian "Database klien"). Password tidak pernah dicetak.
//
//   node ../APP/db.js koneksi [kata] [--client x] [--env prod|uat|local]
//   node ../APP/db.js uji    <nama>
//   node ../APP/db.js skema  <nama>                          daftar tabel (kolom, perkiraan baris)
//   node ../APP/db.js skema  <nama> --tabel dbo.Nasabah      kolom, PK, FK, indeks (boleh diulang; juga view)
//   node ../APP/db.js skema  <nama> --cari kata [--isi]      cari nama tabel/kolom/sp/view (--isi: juga di isi kode)
//   node ../APP/db.js skema  <nama> --sp [nama,nama2]        daftar stored procedure / definisinya (boleh beberapa, pisah koma)
//   node ../APP/db.js skema  <nama> --view [nama]            daftar view / definisinya
//   node ../APP/db.js skema  <nama> --fungsi [nama]          daftar fungsi / definisinya
//   node ../APP/db.js query  <nama> "SELECT ..." [--file x.sql] [--maks 100] [--lebar 200] [--json]
//   Tambah --keluar <berkas> pada perintah apa pun: hasil disimpan ke berkas (UTF-8), terminal hanya menampilkan ringkasan.
// Koneksi ke lingkungan prod wajib memakai --izinkan-prod (hanya bila Rasimin memintanya).
const fs = require('fs');
const path = require('path');
const dbl = require('./db-lib');

const NILAI = new Set(['client', 'env', 'cari', 'file', 'maks', 'lebar', 'keluar']);
const NILAI_OPSIONAL = new Set(['sp', 'view', 'fungsi']);
const ULANG = new Set(['tabel']);

function bacaArgumen(argv) {
  const pos = [];
  const o = { tabel: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { pos.push(a); continue; }
    const k = a.slice(2);
    if (NILAI.has(k)) o[k] = argv[++i];
    else if (ULANG.has(k)) o[k].push(argv[++i]);
    else if (NILAI_OPSIONAL.has(k)) o[k] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    else o[k] = true;
  }
  return { pos, o };
}

function bantuan(kode = 0) {
  const t = fs.readFileSync(__filename, 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3));
  console.log(t.join('\n'));
  process.exit(kode);
}

function gagal(pesan, kode = 1) {
  console.error(pesan);
  process.exit(kode);
}

function muatDriver(jenis) {
  if (!/^[a-z0-9]+$/.test(jenis)) gagal(`Jenis database tidak valid: ${jenis}`);
  const file = path.join(__dirname, 'db-driver', jenis + '.js');
  if (!fs.existsSync(file)) {
    const ada = fs.readdirSync(path.join(__dirname, 'db-driver')).map((f) => f.replace(/\.js$/, ''));
    gagal(`Belum ada driver untuk jenis "${jenis}". Driver tersedia: ${ada.join(', ')}. Tambah berkas APP/db-driver/${jenis}.js (lihat db-driver/sqlserver.js).`);
  }
  return require(file);
}

function pilih(nama, o, daftar) {
  if (!nama) gagal('Sebutkan nama koneksi. Lihat daftar: node ../APP/db.js koneksi', 1);
  const { hasil, tunggal } = dbl.pilihKoneksi(daftar, nama, { client: o.client, env: o.env });
  if (tunggal) return tunggal;
  if (!hasil.length) gagal(`Koneksi "${nama}" tidak ditemukan. Lihat daftar: node ../APP/db.js koneksi`);
  gagal(`Nama "${nama}" cocok dengan ${hasil.length} koneksi, pilih satu (nama lengkap):\n` + hasil.map((k) => `  ${k.nama}  [${k.lingkungan || '-'}]  ${k.path}`).join('\n'), 2);
}

function cetakKoneksi(daftar, galat, kata, o) {
  const { hasil } = dbl.pilihKoneksi(daftar, kata, { client: o.client, env: o.env });
  if (!hasil.length) console.log('Tidak ada koneksi yang cocok.');
  else {
    console.log(`${hasil.length} koneksi (password disembunyikan):`);
    console.log(dbl.tabel(['nama', 'jenis', 'lingkungan', 'server', 'database', 'user', 'catatan'],
      hasil.map((k) => [k.nama, k.jenis, k.lingkungan || '-', k.server + (k.port ? ':' + k.port : ''), k.database, k.user, k.path + (k.formatLama ? ' (format lama)' : '')])));
  }
  if (galat.length) console.log('\nPerlu diperbaiki:\n' + galat.map((g) => '- ' + g).join('\n'));
}

const asliLog = console.log;
const tampung = [];

async function main() {
  const { pos, o } = bacaArgumen(process.argv.slice(2));
  if (o.keluar) console.log = (...a) => tampung.push(a.join(' '));
  const cmd = pos[0];
  if (!cmd || o.h || o.help || cmd === '-h') bantuan(cmd ? 0 : 1);

  const { koneksi: daftar, galat } = dbl.muatKoneksi();
  if (cmd === 'koneksi') return cetakKoneksi(daftar, galat, pos[1], o);
  if (!['uji', 'skema', 'query'].includes(cmd)) bantuan(1);

  const k = pilih(pos[1], o, daftar);
  if (k.lingkungan === 'prod' && !o['izinkan-prod']) {
    gagal(`Koneksi "${k.nama}" adalah PROD. Jalankan hanya bila Rasimin memintanya, dengan menambah --izinkan-prod.`, 3);
  }
  const maks = Math.min(Math.max(parseInt(o.maks, 10) || 100, 1), 5000);
  const lebar = o.lebar === undefined ? 200 : Math.max(parseInt(o.lebar, 10) || 0, 0);

  let sqlQuery = '';
  if (cmd === 'query') {
    sqlQuery = o.file ? fs.readFileSync(path.resolve(o.file), 'utf8') : pos.slice(2).join(' ');
    const alasan = dbl.periksaQuery(sqlQuery);
    if (alasan) gagal('Query ditolak. ' + alasan, 4);
  }

  const driver = muatDriver(k.jenis);
  let conn;
  try {
    conn = await driver.connect(k);
  } catch (e) {
    gagal(`Gagal konek ke ${k.nama} (${k.server}/${k.database}): ${dbl.samarkan(e.message, k)}`, 5);
  }
  try {
    const i = await driver.info(conn);
    const kepala = `# ${k.nama} [${k.lingkungan || '-'}] ${i.server} / ${i.db} sebagai ${i.login}`;
    if (cmd === 'uji') {
      console.log(kepala + '\nOK. ' + String(i.versi).split('\n')[0]);
    } else if (cmd === 'skema') {
      console.log(kepala);
      await skema(driver, conn, o, maks);
    } else {
      const sets = await driver.query(conn, sqlQuery, { maks });
      if (o.json) {
        console.log(JSON.stringify(sets.map((s) => ({ kolom: s.kolom, terpotong: s.terpotong, baris: s.baris })), (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
      } else {
        console.log(kepala);
        if (!sets.length) console.log('(tidak ada hasil)');
        for (const s of sets) {
          console.log(dbl.tabel(s.kolom, s.baris, lebar));
          console.log(`(${s.baris.length} baris${s.terpotong ? `, dipotong di ${maks}; tambah --maks atau persempit query` : ''})`);
        }
      }
    }
  } catch (e) {
    gagal('Galat: ' + dbl.samarkan(e.message, k), 6);
  } finally {
    await driver.tutup(conn);
  }
}

async function skema(driver, conn, o, maks) {
  const judulKode = { sp: 'stored procedure', view: 'view', fungsi: 'fungsi' };
  for (const jenis of ['sp', 'view', 'fungsi']) {
    if (!o[jenis]) continue;
    if (o[jenis] === true) {
      const r = await driver.daftarKode(conn, jenis);
      console.log(`\n${r.length} ${judulKode[jenis]}:`);
      console.log(dbl.tabel(['objek', 'diubah'], r.slice(0, 500).map((x) => [x.objek, x.diubah])));
      if (r.length > 500) console.log(`... ${r.length - 500} lagi, pakai --cari`);
    } else {
      for (const nm of String(o[jenis]).split(',').map((x) => x.trim()).filter(Boolean)) {
        const r = await driver.definisiKode(conn, jenis, nm);
        if (!r.length) console.log(`\n${judulKode[jenis]} "${nm}" tidak ditemukan.`);
        for (const x of r) console.log(`\n## ${x.objek}\n${x.definisi ?? '(definisi terenkripsi atau tidak bisa dibaca)'}`);
      }
    }
  }
  if (o.cari) {
    const r = await driver.cari(conn, o.cari, { isi: !!o.isi });
    console.log(`\n${r.length} hasil untuk "${o.cari}":`);
    console.log(dbl.tabel(['jenis', 'objek', 'kolom'], r.slice(0, 300).map((x) => [x.jenis, x.objek, x.kolom])));
    if (r.length > 300) console.log(`... ${r.length - 300} lagi, persempit kata kunci`);
  }
  for (const nama of o.tabel) {
    const r = await driver.detailObjek(conn, nama);
    if (!r.length) console.log(`\n"${nama}" tidak ditemukan. Coba: --cari ${String(nama).split('.').pop()}`);
    for (const x of r) {
      console.log(`\n## ${x.objek}  (${x.jenis}${x.baris != null ? `, ±${x.baris} baris` : ''})`);
      for (const c of x.kolom) {
        const tambah = [c.pk, c.ket].filter(Boolean).join(', ');
        console.log(`${c.no}. ${c.nama} ${c.tipe} ${c.nullable}${tambah ? ' [' + tambah + ']' : ''}${c.bawaan ? ' = ' + c.bawaan : ''}`);
      }
      if (x.fkKeluar.length) console.log('FK keluar:\n' + x.fkKeluar.map((f) => `- ${f.fk}: (${f.kolomDari}) -> ${f.ke}(${f.kolomKe})`).join('\n'));
      if (x.fkMasuk.length) console.log('FK masuk (dirujuk oleh):\n' + x.fkMasuk.map((f) => `- ${f.fk}: ${f.dari}(${f.kolomDari}) -> (${f.kolomKe})`).join('\n'));
      if (x.indeks.length) console.log('Indeks:\n' + x.indeks.map((i) => `- ${i.indeks}: ${i.tipe}${i.uniq ? ', unique' : ''}${i.pk ? ', PK' : ''} (${i.kolom})`).join('\n'));
    }
  }
  if (!o.tabel.length && !o.cari && !o.sp && !o.view && !o.fungsi) {
    const r = await driver.daftarTabel(conn);
    console.log(`\n${r.length} tabel:`);
    console.log(dbl.tabel(['tabel', 'kolom', '±baris'], r.slice(0, Math.max(maks, 300)).map((x) => [x.skema + '.' + x.tabel, x.kolom, x.baris ?? 0])));
    if (r.length > Math.max(maks, 300)) console.log(`... ${r.length - Math.max(maks, 300)} lagi. Pakai --cari kata atau --tabel nama.`);
    console.log('\nDetail satu tabel: --tabel skema.nama | cari: --cari kata | kode: --sp / --view / --fungsi');
  }
}

function simpan() {
  const { o } = bacaArgumen(process.argv.slice(2));
  if (!o.keluar) return;
  const f = path.resolve(o.keluar);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, tampung.join('\n') + '\n', 'utf8');
  asliLog(`Tersimpan: ${f} (${tampung.join('\n').length} karakter)`);
}

main().then(() => { simpan(); process.exit(0); }, (e) => gagal('Galat: ' + e.message, 6));
