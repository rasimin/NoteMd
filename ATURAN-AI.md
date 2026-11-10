---
dibuat: 2026-10-29 19:26
diubah: 2026-11-10 17:17
ringkasan: Lembar ringkas aturan untuk AI (mencari, memilih folder, metadata, lampiran, riwayat, database klien lewat db.js). Dibaca lebih dulu; standar lengkap ada di STANDAR-CATATAN.md.
tag: aturan, ai, standar, database, db
---

# Aturan Singkat AI (baca ini dulu)

Folder: `D:\Rasimin\AI Note`. Standar lengkap: `STANDAR-CATATAN.md` (baca hanya jika ragu). Bahasa catatan mengikuti bahasa Rasimin.

## Mencari (sebelum menulis atau menjawab dari catatan)
1. Dari folder AI Note: `node _app/cari.js "kata kunci" [--client x] [--folder a/b] [--env prod|uat|local] [--tag x] [--diubah T] [--dibuat T] [--maks N]`.
   - `--client`: satu client (folder paling atas). `--folder`: satu folder beserta subfoldernya, misalnya `--folder victoria/akses`.
   - `--diubah` / `--dibuat`: filter tanggal, boleh tanpa kata kunci. T = `2026-10-29` | `2026-10-25..2026-10-30` | `2026-10` | `hari-ini` | `kemarin` | `minggu-ini` | `minggu-lalu` | `bulan-ini` | `7-hari`. Contoh: "catatan yang saya ubah kemarin" = `--diubah kemarin`.
   - Peta isi: `--daftar [--client x] [--folder a/b]`. Hanya nama folder dan jumlahnya: `--daftar-folder [--client x]`.
   - Filter bisa digabung. Jika hasil dipotong, tertulis "N dari M"; tambah `--maks`.
2. Baca seperlunya: `node _app/baca.js "<path>" --outline`, lalu `--bagian "<judul>"`. Baca utuh hanya untuk catatan pendek.
3. `cari.js` juga mencari di isi file teks lampiran (`.sql`, `.txt`, `.log`, ...) dan menampilkan path-nya di baris "file lampiran". Bacalah dengan `node _app/baca.js "<path-file-lampiran>"`.
4. **Jangan** memakai `grep -r`, `find`, `ls -R`, atau membaca semua file di folder ini. Ada ribuan file di `_app/node_modules`, jadi sangat lambat (bisa lebih dari 1 menit). Jangan membuka isi `_app`, `_trash`, dan `_riwayat`.

## Menulis catatan
- Cek dulu dengan `cari.js`. Topik sama sudah ada: perbarui file itu, jangan buat baru.
- **Tanya dulu** jika client tidak jelas, tidak ada di daftar, atau nama file ambigu. Jangan menebak client.
- Client (folder, huruf kecil): bsi, smbci (BTPN/SMBCI), cimb, ganesha, hibank-mayora, mega, nobu, permata, victoria, qnb, bmi, btn, allianz, batavia, bnilife, brilife, bukopin, car, eastspring, maybank, panin, schroder-investment, trimegah, pertalife, bnp-paribas, axa, syailendra, sequis. Catatan pribadi: `pribadi/` (datar, tanpa subfolder). Catatan umum yang bukan milik client mana pun (dokumen/spesifikasi resmi, pengetahuan lintas client): `umum/<kategori>/<nama-file>.md` (contoh `umum/sbn-gateway/`). Kalau info jelas umum, tidak perlu bertanya client.
- Lokasi: `<client>/<folder>/<nama-file>.md`, tidak langsung di folder client. Satu kendala = satu folder (`issue-...` atau `case-...`, isinya semua catatan kendala itu). Bukan kendala: `akses`, `how-to`, `query`, `pengetahuan`, atau kategori baru yang relevan. AI memilih sendiri dan menyebut foldernya di jawaban.
- Nama file: huruf kecil, tanda hubung, `.md`, menggambarkan isi.
- Bagian atas file: `dibuat`, `diubah`, `lingkungan` (prod/uat/local, bila relevan), `ringkasan` (1-2 kalimat, tanpa password), `tag` (3-7 kata kunci huruf kecil, dipisah koma). Lalu baris kosong dan `# Judul`.
- Waktu: `TZ=Asia/Bangkok date '+%Y-%m-%d %H:%M'`. Baru: `dibuat` = `diubah`. Edit: hanya `diubah` yang berubah (dan perbarui `ringkasan`/`tag` jika isinya berubah). `dibuat` tidak pernah diubah.
- Blok kode wajib bernama bahasa (```sql). Password ditulis apa adanya (keputusan Rasimin).
- Satu catatan satu topik. Log atau output besar jadi lampiran dan dirujuk dari catatan, jangan ditempel utuh.
- Sebut sumber jika informasinya bisa berubah.

## Riwayat versi
- Aplikasi menyimpan versi lama catatan di `_riwayat/` (tidak boleh dibuka atau diubah AI). Perubahan lewat aplikasi tercatat otomatis.
- **Setelah AI membuat atau mengedit catatan lewat file, jalankan** `node _app/riwayat.js catat "<path.md>"` (boleh beberapa path, atau `--semua`). Tanpa ini, perubahan baru tercatat saat catatan dibuka di aplikasi.
- Jangan memindah atau mengganti nama catatan atau folder lewat file; riwayat dan lampirannya tidak ikut. Minta Rasimin memakai aplikasi.
- Melihat versi: `node _app/riwayat.js daftar "<path.md>"`. Memulihkan versi lama dilakukan Rasimin lewat menu "Riwayat" di aplikasi.

## Database klien (skema dan SELECT)
Untuk melihat skema atau SELECT ke database client, pakai `node _app/db.js`. Kredensial dibaca skrip dari catatan client dengan format baku di bawah; jangan mencari atau menyalin password secara manual.

**Menulis catatan koneksi (format baku)**
- Lokasi: `<client>/akses/<client>-<sistem>-akses-db.md`, satu catatan per sistem dan lingkungan, dengan `lingkungan:` (prod/uat/local) di metadata. Catatan di akar folder tidak dibaca skrip.
- Koneksi ditulis hanya lewat blok kode berbahasa `koneksi`, satu blok per database, satu baris `kunci: nilai`:

````markdown
```koneksi
nama: victoria-sbn-local
jenis: sqlserver
server: 192.168.26.30
database: VICTORIA_SBN
user: appims
password: P4ssw0rd
```
````

- Wajib: `nama`, `jenis`, `server`, `database`, `user`, `password`. Opsional: `port`, `lingkungan` (menimpa metadata), `enkripsi` (true/false, bawaan false), `percaya-sertifikat` (bawaan true), `tls-min` (`TLSv1` untuk server lama).
- `nama` harus unik di seluruh catatan: `<client>-<sistem>-<lingkungan>`, huruf kecil, tanda hubung. `jenis` sekarang hanya `sqlserver`; jenis lain menyusul sebagai driver di `_app/db-driver/`.
- Nilai ditulis apa adanya sampai akhir baris: tanpa tanda kutip, tanpa komentar. Instance SQL Server: `host\instance`.
- Format lama (daftar `* source:`, `* catalog:`, `* user id:`, `* password:` di bawah heading "Koneksi") masih terbaca, tetapi catatan baru wajib memakai blok `koneksi`. Connection string di catatan source code tidak dibaca skrip.
- Setelah menulis, jalankan `node _app/db.js koneksi <nama-client>`: koneksi harus muncul dan bagian "Perlu diperbaiki" kosong. Lalu jalankan `riwayat.js catat`.

**Perintah** (dari folder AI Note; `<nama>` boleh sebagian asal cocok satu koneksi)
- `node _app/db.js koneksi [kata] [--client x] [--env uat]`: daftar koneksi, password tidak ditampilkan.
- `node _app/db.js uji <nama>`: tes koneksi.
- `node _app/db.js skema <nama> --cari kata [--isi]`: cari tabel, kolom, sp, view (`--isi`: juga di dalam kode sp/view).
- `node _app/db.js skema <nama> --tabel dbo.Nasabah`: kolom, PK, FK, indeks (boleh diulang, juga view).
- `node _app/db.js skema <nama>`: daftar semua tabel. `--sp [nama]`, `--view [nama]`, `--fungsi [nama]`: daftar atau definisi kode (nama boleh beberapa, pisah koma).
- Tambah `--keluar <berkas>` pada perintah apa pun untuk menyimpan hasil ke berkas UTF-8 (terminal hanya menampilkan ringkasan).
- `node _app/db.js query <nama> "SELECT TOP 20 ..." [--file x.sql] [--maks 100] [--lebar 200] [--json]`.

**Aturan pakai**
1. Cek catatan dulu (`cari.js`); skema yang sudah tercatat dipakai ulang. Gunakan `--cari` dan `--tabel` lebih dulu daripada daftar penuh (hemat token).
2. Skrip hanya menerima satu SELECT (atau WITH ... SELECT) dan memotong hasil di 100 baris. Batasi dengan `TOP`/`WHERE`. INSERT, UPDATE, DELETE, DDL, dan EXEC tidak dijalankan lewat skrip; perubahan data ditulis sebagai SQL di catatan untuk dijalankan Rasimin.
3. Lingkungan `prod` ditolak kecuali memakai `--izinkan-prod`; pakai hanya bila Rasimin memintanya.
4. Jangan menulis password di jawaban. Hasil query berisi data nasabah: tampilkan secukupnya dan jangan salin utuh ke catatan. Skema yang layak disimpan ditulis ringkas ke catatan `pengetahuan` client.
5. Gagal konek: laporkan galatnya apa adanya dan tanya Rasimin. Jangan menebak server atau password lain.
6. Prasyarat sekali: `cd _app && npm install` (paket `mssql`).
7. Skrip hanya bisa konek dari komputer yang menjangkau server database. Sesi AI di cloud atau VM biasanya tidak bisa (galat "Network is unreachable" atau "Failed to connect ... 10000ms"). Jika begitu, jangan mengarang isi; beri Rasimin perintahnya dengan `--keluar` ke `<folder-catatan>/_lampiran/<nama-catatan>/<nama>.txt`, lalu baca berkasnya dengan `baca.js`.

## Lampiran
- Gambar dan file pendukung: `<folder catatan>/_lampiran/<nama-file-catatan>/01-deskripsi.png`. Di catatan: `![ket](_lampiran/<nama-file-catatan>/01-deskripsi.png)`.
- Dokumen asli (PDF, docx, xlsx, zip) boleh jadi lampiran. Tautkan dengan `[nama](_lampiran/<nama-file-catatan>/dokumen-asli.pdf)` (di aplikasi jadi tombol unduh). Untuk PDF, simpan juga teks hasil ekstraksi sebagai `teks-lengkap.txt` di folder lampiran yang sama (`pdftotext -layout`) supaya bisa dicari dan dibaca `baca.js`; catatan `.md` tetap berisi ringkasan inti, bukan salinan utuh. Tandai dokumen rahasia di catatan.
- Memindah atau menghapus catatan lewat file: lampirannya ikut diperlakukan sama.

## Git
- **Jangan auto git commit & push**: JANGAN PERNAH menjalankan `git commit` maupun `git push` secara otomatis. Hanya jalankan `git commit` dan `git push` apabila ada perintah/instruksi eksplisit dari Rasimin.
