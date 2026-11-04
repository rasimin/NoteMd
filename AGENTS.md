---
dibuat: 2026-10-29 19:48
diubah: 2026-11-04 22:49
ringkasan: Petunjuk otomatis untuk AI yang membuka folder ini; mengarahkan ke ATURAN-AI.md, skrip pencarian, dan larangan auto git commit/push.
tag: aturan, ai, petunjuk, git
---

# AGENTS.md

Ini folder catatan Rasimin (wiki pribadi). Sebelum mencari, membaca, atau menulis catatan:

1. Baca `ATURAN-AI.md` di folder ini (singkat). Standar lengkap ada di `STANDAR-CATATAN.md`, dibaca hanya jika ragu.
2. Untuk mencari, jalankan dari folder ini: `node _app/cari.js "kata kunci"` (opsi `--client`, `--folder`, `--env`, `--tag`, `--diubah`, `--dibuat`, `--daftar`, `--daftar-folder`). Untuk membaca: `node _app/baca.js "<path>" --outline` lalu `--bagian "<judul>"`.
3. Jangan memakai `grep -r`, `find`, atau `ls -R` di folder ini: ada ribuan file di `_app/node_modules`, sehingga sangat lambat.
4. Setelah membuat atau mengedit catatan lewat file, jalankan `node _app/riwayat.js catat "<path.md>"` agar versinya tercatat di riwayat. Jangan memindah atau mengganti nama catatan lewat file, dan jangan membuka `_riwayat`.
5. **Git Commit & Push**: JANGAN PERNAH menjalankan `git commit` atau `git push` secara otomatis. Hanya jalankan `git commit` dan `git push` apabila ada perintah/instruksi eksplisit dari Rasimin.
