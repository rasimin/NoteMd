---
dibuat: 2026-10-29 19:26
diubah: 2026-10-29 19:48
ringkasan: Lembar ringkas aturan untuk AI (mencari, memilih folder, metadata, lampiran). Dibaca lebih dulu; standar lengkap ada di STANDAR-CATATAN.md.
tag: aturan, ai, standar
---

# Aturan Singkat AI (baca ini dulu)

Folder: `D:\Rasimin\AI Note`. Standar lengkap: `STANDAR-CATATAN.md` (baca hanya jika ragu). Bahasa catatan mengikuti bahasa Rasimin.

## Mencari (sebelum menulis atau menjawab dari catatan)
1. Dari folder AI Note: `node _app/cari.js "kata kunci" [--client x] [--env prod|uat|local] [--tag x] [--maks N]`. Peta isi: `node _app/cari.js --daftar [--client x]`.
2. Baca seperlunya: `node _app/baca.js "<path>" --outline`, lalu `--bagian "<judul>"`. Baca utuh hanya untuk catatan pendek.
3. `cari.js` juga mencari di isi file teks lampiran (`.sql`, `.txt`, `.log`, ...) dan menampilkan path-nya di baris "file lampiran". Bacalah dengan `node _app/baca.js "<path-file-lampiran>"`.
4. **Jangan** memakai `grep -r`, `find`, `ls -R`, atau membaca semua file di folder ini. Ada ribuan file di `_app/node_modules`, jadi sangat lambat (bisa lebih dari 1 menit). Jangan membuka isi `_app` dan `_trash`.

## Menulis catatan
- Cek dulu dengan `cari.js`. Topik sama sudah ada: perbarui file itu, jangan buat baru.
- **Tanya dulu** jika client tidak jelas, tidak ada di daftar, atau nama file ambigu. Jangan menebak client.
- Client (folder, huruf kecil): bsi, smbci (BTPN/SMBCI), cimb, ganesha, hibank-mayora, mega, nobu, permata, victoria, qnb, bmi, btn, allianz, batavia, bnilife, brilife, bukopin, car, eastspring, maybank, panin, schroder-investment, trimegah, pertalife, bnp-paribas, axa, syailendra, sequis. Catatan pribadi: `pribadi/` (datar, tanpa subfolder).
- Lokasi: `<client>/<folder>/<nama-file>.md`, tidak langsung di folder client. Satu kendala = satu folder (`issue-...` atau `case-...`, isinya semua catatan kendala itu). Bukan kendala: `akses`, `how-to`, `query`, `pengetahuan`, atau kategori baru yang relevan. AI memilih sendiri dan menyebut foldernya di jawaban.
- Nama file: huruf kecil, tanda hubung, `.md`, menggambarkan isi.
- Bagian atas file: `dibuat`, `diubah`, `lingkungan` (prod/uat/local, bila relevan), `ringkasan` (1-2 kalimat, tanpa password), `tag` (3-7 kata kunci huruf kecil, dipisah koma). Lalu baris kosong dan `# Judul`.
- Waktu: `TZ=Asia/Bangkok date '+%Y-%m-%d %H:%M'`. Baru: `dibuat` = `diubah`. Edit: hanya `diubah` yang berubah (dan perbarui `ringkasan`/`tag` jika isinya berubah). `dibuat` tidak pernah diubah.
- Blok kode wajib bernama bahasa (```sql). Password ditulis apa adanya (keputusan Rasimin).
- Satu catatan satu topik. Log atau output besar jadi lampiran dan dirujuk dari catatan, jangan ditempel utuh.
- Sebut sumber jika informasinya bisa berubah.

## Lampiran
- Gambar dan file pendukung: `<folder catatan>/_lampiran/<nama-file-catatan>/01-deskripsi.png`. Di catatan: `![ket](_lampiran/<nama-file-catatan>/01-deskripsi.png)`.
- Memindah atau menghapus catatan lewat file: lampirannya ikut diperlakukan sama.
