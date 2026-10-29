---
dibuat: 2026-10-29 16:24
diubah: 2026-10-29 20:02
ringkasan: Standar lengkap penulisan dan pengelolaan catatan di AI Note: client, struktur folder, metadata, lampiran, keamanan, aplikasi, dan aturan untuk AI.
tag: standar, aturan, ai
---

# Standar Catatan AI

## Tujuan

Folder `D:\Rasimin\AI Note` menyimpan catatan yang ditulis AI atas permintaan Rasimin, seperti catatan teknis, akses sistem, dan hasil diskusi. Catatannya dipakai sebagai wiki pribadi yang bisa dicari.

Saat ini hanya Rasimin yang memakai folder ini.

Versi ringkas untuk AI ada di `ATURAN-AI.md` dan dibaca lebih dulu. File ini adalah standar lengkapnya, dibaca jika ada keraguan.

## Daftar client

Nama folder ditulis huruf kecil, kata dipisah tanda hubung. Kolom "Nama folder" adalah nama yang dipakai di `D:\Rasimin\AI Note\`.

### Bank

| Client | Nama folder |
|---|---|
| BSI | `bsi` |
| BTPN/SMBCI | `smbci` |
| CIMB | `cimb` |
| Ganesha | `ganesha` |
| HIBANK/Mayora | `hibank-mayora` |
| Mega | `mega` |
| NOBU | `nobu` |
| Permata | `permata` |
| Victoria | `victoria` |
| QNB | `qnb` |
| BMI (Muamalat Indonesia) | `bmi` |
| BTN | `btn` |

### Manager Investasi

| Client | Nama folder |
|---|---|
| ALLIANZ | `allianz` |
| BATAVIA | `batavia` |
| BNILIFE | `bnilife` |
| BRILIFE | `brilife` |
| BUKOPIN | `bukopin` |
| CAR | `car` |
| EASTSPRING | `eastspring` |
| MayBank | `maybank` |
| PANIN | `panin` |
| Schroder Investment | `schroder-investment` |
| TRIMEGAH | `trimegah` |
| Pertalife | `pertalife` |
| BNP Paribas | `bnp-paribas` |
| AXA | `axa` |

### History

| Client | Nama folder |
|---|---|
| Syailendra | `syailendra` |
| SEQUIS | `sequis` |

Aturan daftar client:
- Folder client dibuat saat catatan pertama untuk client itu ditulis. Tidak perlu membuat semua folder di awal.
- Rasimin boleh menyebut client dengan nama biasa (misalnya "SMBCI" atau "BTPN"). AI mencocokkannya ke nama folder di tabel ini.
- Client yang tidak ada di daftar ini ditambahkan ke daftar dulu sebelum foldernya dibuat. AI bertanya dulu ke Rasimin.

## Struktur folder

Level pertama adalah nama client. Level berikutnya **tidak lagi memakai folder environment tetap** (`prod`, `uat`, `local`). AI memilih sendiri folder yang paling relevan untuk isi catatannya. Ada dua jenis folder di dalam client:

1. **Folder kendala (laporan kendala).** Satu folder untuk satu laporan kendala atau kasus. Isinya semua catatan terkait kendala itu: ringkasan kasus, cara akses atau how-to untuk menanganinya, hak akses yang dibutuhkan, hasil investigasi, query SQL, dan capture untuk pengetahuan. Nama folder diawali kata kunci yang menjelaskan jenisnya dan isinya, misalnya `issue-cek-sre-insert-di-kemenkeu-tidak-update` atau `case-rdo-failure-14-10-2026`.
2. **Folder kategori umum.** Untuk catatan yang tidak terikat satu kendala dan dipakai berulang. Nama yang biasa dipakai: `akses` (cara akses, koneksi database, hak akses), `how-to`, `query` (SQL yang bisa dipakai ulang), `pengetahuan` (penjelasan alur, capture). AI boleh membuat nama kategori baru bila tidak ada yang cocok.

```text
D:\Rasimin\AI Note\
  victoria\
    akses\
      victoria-sbn-akses-db.md
    issue-cek-sre-insert-di-kemenkeu-tidak-update\
      case-sre-tidak-update-kemenkeu.md
      cek-nosrt-esbn-victoria.md
      _lampiran\
  smbci\
    query\
    rca-inquiry-customer-portfolio-999x\
  pribadi\
    smartsheet-akses.md
```

Aturan memilih folder:
- Jika catatan bagian dari sebuah kendala atau kasus, masuk ke folder kendala itu. Jika kendalanya belum punya folder, AI membuatnya. Catatan baru tentang kendala yang sama masuk ke folder yang sama.
- Jika bukan bagian dari kendala, masuk ke folder kategori umum yang paling relevan.
- Catatan tidak diletakkan langsung di folder client (tanpa subfolder).
- Folder ditentukan AI berdasarkan isi catatan. AI **tidak perlu bertanya** soal ini, tetapi harus menyebut folder yang dipilih di jawabannya agar Rasimin bisa memindahkannya kalau kurang pas.
- AI tetap bertanya dulu jika **client** tidak jelas atau tidak ada di daftar client, atau jika nama kendalanya benar-benar tidak bisa disimpulkan.

### Environment (prod / uat / local)

Environment sekarang menjadi atribut catatan, bukan folder. Jika catatan terkait environment tertentu, tulis di metadata: `lingkungan: prod`, `lingkungan: uat`, atau `lingkungan: local`. Tampil sebagai lencana di bagian atas catatan. Satu kendala yang menyentuh beberapa environment boleh punya catatan dengan `lingkungan` berbeda di folder yang sama. Jika tidak terkait environment tertentu, baris `lingkungan` tidak ditulis. Jika environment tidak jelas padahal penting (misalnya ada kredensial atau koneksi), AI bertanya.

### Folder pribadi

- Catatan pribadi yang bukan untuk client ada di `D:\Rasimin\AI Note\pribadi\`.
- Folder `pribadi` tidak memakai folder kendala atau kategori. Catatan langsung di dalam `pribadi\`.
- Contoh: `pribadi\smartsheet-akses.md`.

## Format catatan

- Format file: Markdown (`.md`), UTF-8.
- Nama file: huruf kecil, kata dipisah tanda hubung, dan menggambarkan isi. Contoh: `victoria-sbn-akses-db.md`.
- Setiap file diawali metadata, lalu baris kosong, lalu judul `# Judul`. Metadata: `dibuat` dan `diubah` (wajib), `lingkungan` (opsional, lihat di atas), `ringkasan` dan `tag` (wajib untuk catatan baru).
- Format tanggal metadata: `YYYY-MM-DD HH:mm`, waktu lokal Rasimin (Asia/Bangkok).
- Bahasa mengikuti bahasa yang dipakai Rasimin saat meminta catatan.

Contoh bagian atas file:

```markdown
---
dibuat: 2026-10-29 16:26
diubah: 2026-10-29 17:02
lingkungan: local
ringkasan: Koneksi database Victoria SBN di lingkungan local: server, catalog, dan user.
tag: akses, database, sbn, koneksi
---

# Database Victoria SBN (local)
```

### Ringkasan dan tag

- `ringkasan`: satu atau dua kalimat, satu baris, tentang isi catatan. Tidak berisi password atau data rahasia. Dipakai supaya AI bisa menilai relevansi catatan tanpa membukanya.
- `tag`: 3 sampai 7 kata kunci, huruf kecil, dipisah koma, tanpa tanda `#`. Pakai istilah yang mungkin dicari nanti, termasuk singkatan dan nama sistem (misalnya `rdo, siar, wms`). Gunakan tag yang sudah ada bila ada yang cocok (lihat `node _app/cari.js --daftar`).
- Contoh: `ringkasan: Sync Redemption ke SIAR gagal pada RDO WMS 14 Okt 2026.` dan `tag: rdo, siar, wms, redemption, rca`.
- Saat isi catatan berubah cukup banyak, `ringkasan` dan `tag` diperbarui juga. Catatan lama tanpa keduanya dilengkapi saat diubah.
- Di aplikasi, ringkasan tampil di bawah baris metadata dan tag tampil sebagai label. Pencarian juga mencari di keduanya, dengan bobot lebih tinggi daripada isi.

### Aturan metadata

- Saat membuat catatan baru, AI mengisi `dibuat` dan `diubah` dengan waktu yang sama.
- Saat mengubah catatan yang sudah ada, AI hanya memperbarui `diubah`. Nilai `dibuat` tidak pernah diubah.
- Jika file lama belum punya metadata, AI menambahkannya saat file itu diubah. `dibuat` diisi dari tanggal file yang ada.
- Waktu diambil dari jam saat catatan ditulis, bukan ditebak.

### Aturan lampiran (gambar)

- Gambar atau screenshot **tidak boleh** disimpan di folder biasa dan **tidak boleh** dibuatkan folder baru yang tampil sebagai kategori.
- Semua lampiran disimpan di folder `_lampiran` di dalam folder tempat catatannya berada (folder kendala atau kategori), satu subfolder per catatan:
  `<client>/<folder-kendala-atau-kategori>/_lampiran/<nama-file-catatan>/01-deskripsi-singkat.png`
- File pendukung lain (misalnya `.sql` atau `.log`) boleh disimpan di subfolder lampiran yang sama. Aplikasi hanya menampilkan gambar di dalam catatan, jadi isi SQL yang penting tetap ditulis juga sebagai blok kode ```` ```sql ```` di catatan supaya bisa dicari dan disalin.
- Nama file gambar: huruf kecil, pakai tanda hubung, diawali nomor urut (`01-`, `02-`, ...), format png/jpg/gif/webp.
- Di dalam catatan, gambar dipanggil dengan alamat relatif dari file catatan:
  `![keterangan gambar](_lampiran/<nama-file-catatan>/01-deskripsi-singkat.png)`
- Folder `_lampiran` tidak tampil sebagai kategori di aplikasi; gambar hanya muncul di dalam catatan.
- Jika client catatan belum jelas, AI bertanya dulu sebelum menyimpan gambar (aturan yang sama dengan catatan).
- Lampiran selalu ikut catatannya:
  - Dipindah (di aplikasi atau oleh AI): subfolder lampiran ikut pindah ke `_lampiran` di folder tujuan. Jika `_lampiran` di sana belum ada, dibuat otomatis. Folder `_lampiran` lama dihapus kalau jadi kosong.
  - Dihapus: lampiran ikut masuk ke sampah dan ikut kembali saat catatan dipulihkan.
  - Jika AI memindahkan atau menghapus catatan lewat file langsung (bukan lewat aplikasi), AI wajib memperlakukan lampirannya dengan cara yang sama.
  - Jika folder lampiran dengan nama yang sama sudah ada di tujuan, pemindahan ditolak dan AI bertanya dulu.
- Di aplikasi, klik gambar di catatan untuk memperbesar (klik lagi untuk ukuran asli, Esc untuk menutup).

## Keamanan

- Password asli ditulis di file catatan, sesuai keputusan Rasimin untuk standar folder ini.
- Host, catalog, dan user ID boleh ditulis apa adanya.
- Folder ini tidak boleh masuk repo git publik atau cloud sync yang dibagikan, karena file bisa berisi password.
- Aplikasi pencarian hanya berjalan di `localhost`, tidak bisa diakses dari jaringan lain.
- AI menulis password asli ke catatan sesuai standar folder ini.

## Aplikasi pencarian

- Dibuat sendiri dengan Node.js, tanpa database.
- Server membaca semua file `.md` di folder, termasuk subfolder, lalu membuat indeks pencarian di memori.
- Pencarian mencakup judul, isi catatan, dan nama file. Hasil menampilkan potongan teks yang cocok.
- Kategori di menu kiri mengikuti struktur folder.
- Metadata `dibuat` dan `diubah` tampil di bagian atas setiap catatan. File tanpa metadata diberi tanda "Tanpa metadata". Jika ada `lingkungan` (prod, uat, local), tampil sebagai lencana di samping nama client.
- Kode ada di folder `_app`. Folder yang berawalan `_` atau `.` tidak ikut dibaca sebagai catatan.
- Dijalankan dengan klik dua kali `_app\start.bat` (atau `node server.js` di folder `_app`), lalu dibuka di `http://localhost:3000`.
- Tampilan mengikuti gaya shadcn/ui: sidebar kategori, pencarian `Ctrl K`, mode gelap, dan tombol salin di blok kode.
- Catatan bisa diedit langsung lewat tombol Edit (editor CodeMirror 6). Saat disimpan, `diubah` diperbarui otomatis dan `dibuat` tetap. `Ctrl B` menyembunyikan atau menampilkan sidebar.
- Dari aplikasi, Rasimin bisa membuat catatan baru (nama file dibuat otomatis dari judul), membuat folder, memindahkan catatan atau folder dengan seret dan lepas di sidebar, mengganti nama folder (ikon pensil), dan menghapus. Ikon di atas daftar sidebar membuka atau menutup semua folder sekaligus.
- "Hapus" tidak menghapus permanen. File atau folder dipindahkan ke `_trash` di dalam `D:\Rasimin\AI Note`. Isinya bisa dilihat lewat ikon tempat sampah di pojok kiri bawah aplikasi (di samping tombol mode gelap/terang), lalu dipulihkan ke lokasi asal, dihapus permanen satu per satu, atau dikosongkan sekaligus.
- AI tidak membaca isi atau menulis ke `_trash` dan `_app`. Pengecualian: AI boleh menjalankan `_app/cari.js` dan `_app/baca.js` sesuai bagian di atas.
- Lebar sidebar kiri bisa diubah dengan menyeret garis tepinya (klik dua kali pada garis atau tombol panah melingkar di atas daftar untuk kembali ke lebar default). Lebar disimpan di browser.
- Aksi catatan dan folder dikumpulkan di tombol titik tiga (di kanan atas): untuk catatan berisi Edit, Ekspor, dan Hapus; untuk folder berisi Catatan baru, Folder baru, Ganti nama, dan Hapus folder.
- Tombol **Ekspor** di setiap catatan mengunduh catatan sebagai Markdown (.md), HTML (.html, gambar ikut tertanam), PDF (.pdf), atau Word (.docx). PDF dibuat lewat Edge atau Chrome yang terpasang di komputer; Word memakai pustaka `html-to-docx` yang dipasang otomatis oleh `start.bat`.

## Cara AI mencari dan membaca (hemat token)

Tujuannya: menemukan catatan yang tepat tanpa membuka banyak file. Urutan yang wajib dipakai:

1. **Cari:** dari folder `D:\Rasimin\AI Note` jalankan `node _app/cari.js "kata kunci"`. Opsi: `--client <folder client>`, `--env prod|uat|local`, `--tag <tag>`, `--maks N` (bawaan 8). Pencarian mencakup judul, tag, ringkasan, path, isi catatan, dan isi file teks di lampiran (`.sql`, `.txt`, `.log`, dan sejenisnya). Hasilnya ringkas: path, judul, lingkungan, ringkasan, tag, potongan teks, dan path file lampiran yang terkait. Jika tidak ada catatan yang memuat semua kata, hasil yang cocok sebagian ditampilkan dan diberi tanda.
2. **Peta isi:** `node _app/cari.js --daftar [--client x]` menampilkan folder dan catatan beserta ringkasannya. Dipakai untuk memilih folder tujuan dan memeriksa apakah topiknya sudah ada.
3. **Baca sebagian:** `node _app/baca.js "<path>" --outline` menampilkan daftar judul beserta ukuran bagiannya. Lalu `node _app/baca.js "<path>" --bagian "<judul>"` untuk satu bagian saja. Tanpa opsi, seluruh catatan ditampilkan, dipotong di 6000 karakter (ubah dengan `--maks N`). File teks lampiran dibaca dengan path lengkapnya, contoh: `node _app/baca.js "permata/case-x/_lampiran/case-x/cek.sql"`.
4. **Jangan** memakai `grep -r`, `find`, atau `ls -R` di folder ini. Ada ribuan file di `_app/node_modules` sehingga pencarian seperti itu bisa memakan lebih dari satu menit, sedangkan `cari.js` selesai dalam kurang dari satu detik. Jangan juga membaca semua file atau seluruh catatan panjang bila satu bagian cukup.

Skrip ini membaca file langsung, tidak perlu menjalankan aplikasi, dan memakai mesin pencarian yang sama dengan aplikasi.

Kebiasaan menulis yang menjaga pencarian tetap murah:
- Satu catatan satu topik. Kendala besar dipecah jadi beberapa catatan di satu folder kendala.
- Judul bagian (`##`) yang jelas, supaya `--bagian` bisa mengambil bagian yang tepat.
- Log, output query yang panjang, dan dump besar disimpan sebagai lampiran (misalnya `.txt` atau `.sql` di `_lampiran`) dan cukup diringkas atau dirujuk dari catatan.
- Blok kode selalu diberi nama bahasa (```` ```sql ````, ```` ```json ````, ```` ```bash ````, dan seterusnya) agar tampil berwarna di aplikasi.

## Aturan untuk AI

- Sebelum menulis catatan baru, AI cek dulu apakah sudah ada catatan dengan topik yang sama. Jika ada, perbarui file itu, jangan buat file baru.
- Catatan ditulis ke folder client, lalu ke folder kendala atau kategori yang paling relevan (lihat "Struktur folder"). AI memilih folder itu sendiri dan menyebutkannya di jawaban.
- Jika **client** atau nama file belum jelas, AI bertanya dulu sebelum menulis. AI tidak menebak client. Pertanyaan diajukan singkat, dengan pilihan yang sudah ada di daftar client.
- Environment (`prod`, `uat`, `local`) ditulis di metadata `lingkungan` bila relevan. Jika perlu tetapi tidak jelas, AI bertanya.
- Satu kendala = satu folder. Catatan baru tentang kendala yang sudah punya folder dimasukkan ke folder itu, bukan membuat folder kendala baru.
- Setiap catatan mengikuti aturan metadata di atas, termasuk `ringkasan` dan `tag`.
- AI mencari dengan `cari.js` dan membaca dengan `baca.js` (lihat "Cara AI mencari dan membaca"), bukan dengan membuka banyak file.
- Blok kode selalu diberi nama bahasa.
- Data sensitif mengikuti aturan di bagian Keamanan.
- Setiap catatan menyebut sumber jika berisi informasi yang bisa berubah.
