# AGENTS.md

Ini folder aplikasi AI Note (kode server, tampilan, skrip, dan .bat). Repo git sendiri (origin NoteMd). Folder catatan ada di `../Document` (repo git terpisah); letaknya diatur `notesDir` di `settings.json`.

- Aturan menulis dan mencari catatan ada di `../Document/ATURAN-AI.md`. Catatan tidak ditulis dari folder ini.
- Jangan menelusuri atau membaca `node_modules` dan `daemon`.
- Berkas utama: `server.js` (server dan API), `notes-lib.js` (pustaka catatan), `config.js` (settings.json dan notesDir), `auth.js` (login; akun di `auth.json`, jangan dibaca atau dicetak), `public/` (tampilan). Skrip: `cari.js`, `baca.js`, `riwayat.js`, `db.js`.
- Setelah mengubah kode server, minta Rasimin menjalankan `restart.bat`. Perubahan di `public/` cukup dimuat ulang browser (Ctrl+F5).
- **Git**: JANGAN PERNAH menjalankan `git commit` atau `git push` secara otomatis. Hanya jika ada perintah/instruksi eksplisit dari Rasimin.
