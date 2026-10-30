---
dibuat: 2026-10-29 19:48
diubah: 2026-10-30 10:43
ringkasan: Petunjuk otomatis untuk AI yang membuka folder ini; mengarahkan ke ATURAN-AI.md dan skrip pencarian.
tag: aturan, ai, petunjuk
---

# CLAUDE.md

Ini folder catatan Rasimin (wiki pribadi). Sebelum mencari, membaca, atau menulis catatan:

1. Baca `ATURAN-AI.md` di folder ini (singkat). Standar lengkap ada di `STANDAR-CATATAN.md`, dibaca hanya jika ragu.
2. Untuk mencari, jalankan dari folder ini: `node _app/cari.js "kata kunci"` (opsi `--client`, `--folder`, `--env`, `--tag`, `--diubah`, `--dibuat`, `--daftar`, `--daftar-folder`). Untuk membaca: `node _app/baca.js "<path>" --outline` lalu `--bagian "<judul>"`.
3. Jangan memakai `grep -r`, `find`, atau `ls -R` di folder ini: ada ribuan file di `_app/node_modules`, sehingga sangat lambat.
