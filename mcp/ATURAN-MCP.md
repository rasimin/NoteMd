# Aturan AI Note MCP

Aturan ini berlaku khusus untuk AI client (Antigravity, Claude Code, Codex) yang mengakses catatan Rasimin melalui MCP Server.

## 1. Hak Akses & Prinsip Utama
- **Catatan utama (`Document/`) bersifat Read-Only** melalui MCP. AI tidak mengubah catatan utama secara langsung.
- **Satu-satunya area tulis** melalui MCP adalah folder `AutoCreateAI` (`<client>/AutoCreateAI/<slug>.md`, `<client>/AutoCreateAI/FromMCP/<slug>.md`, atau di bawah `umum/AutoCreateAI/`) melalui tool `save_autocreate_note`.
- **Source Code bersifat Read-Only** dan dibatasi hanya ke folder yang terdaftar pada `sourceRoots` di `mcp-config.json`.
- **Database bersifat Read-Only** (skema dan `SELECT` terbatas bila `allowDbSelect` aktif).

## 2. Alur Menjawab (Wajib Catatan Dulu)
1. **Cari di catatan dulu** memakai `search_notes` / `list_folders` (termasuk `AutoCreateAI` dan `AutoCreateAI/FromMCP`), lalu baca ringkas memakai `read_note` mode `outline` atau `section` agar hemat token. Setiap menyajikan informasi dari catatan atau lampiran, **wajib sebutkan `path` catatan beserta tanggal dibuat (`dibuat`) dan terakhir diubah (`diubah`) jika tersedia**, agar user tahu apakah informasinya masih terbaru atau catatan lama.
2. **Jika catatan tidak ditemukan atau tidak menyebut path source code:** **BERHENTI di sini dan katakan terus terang** bahwa catatannya belum ada atau tidak mencantumkan path source code. **DILARANG** langsung memanggil `list_source_dir`, `search_source_code`, atau `read_source_file` untuk menebak atau menyisir folder di disk, kecuali Rasimin secara eksplisit menyebut path/folder yang harus dicek.
3. **Ikuti hanya path dari catatan:** jika di catatan `.md` memang tercantum path source code tertentu (atau Rasimin memerintahkan path tertentu secara eksplisit), barulah telusuri **hanya path yang dirujuk tersebut** menggunakan `list_source_dir`, `search_source_code`, dan `read_source_file`. Jangan menyisir folder root lain yang tidak ada kaitannya.
4. **Cek Database**:
   - Gunakan `list_db_connections` terlebih dahulu (password tidak pernah ditampilkan).
   - Utamakan `get_db_schema` (`mode: "search"`, `"table"`, `"sp"`, `"view"`, `"function"`, atau `"tables"`) sebelum menjalankan `run_db_select`.
   - Lingkungan `prod` default diblokir; jangan mengakses `prod` tanpa perintah eksplisit Rasimin.
   - Jangan menyalin data sensitif/nasabah mentah atau password ke jawaban maupun catatan.

## 3. Menulis Catatan Mandiri (`AutoCreateAI` & `AutoCreateAI/FromMCP`)
- **Temuan AI sendiri** (dari source code, lampiran, atau skema database yang memang penting untuk mempercepat pertanyaan berulang di masa depan): simpan ke `<client>/AutoCreateAI/<slug>.md` (`fromMcp: false` atau dikosongkan).
- **Informasi dari user lewat MCP** (jika dalam sesi MCP user memberikan informasi tambahan yang berguna dan terpakai setelah pengecekan — misalnya rumus perhitungan, perilaku/aturan khusus di suatu client, atau klarifikasi bisnis): simpan ke `<client>/AutoCreateAI/FromMCP/<slug>.md` dengan menyetel **`fromMcp: true`** pada `save_autocreate_note`.
- Gunakan `client` yang jelas (mis. `victoria`, `btn`, `smbci`, dll.) atau `"umum"` jika lintas client (atau foldernya belum ada). Jangan memakai `pribadi`.
- Cek dulu dengan `search_notes` di folder `<client>/AutoCreateAI` (termasuk `FromMCP`) agar tidak membuat file duplikat untuk topik yang sama; jika sudah ada, perbarui `slug` tersebut.
- Sertakan sumber (`source`, misalnya path file/tabel/SP untuk temuan AI, atau `"Informasi user via MCP"` untuk `FromMCP`) dan tandai dengan tag `autocreate-ai` (serta `from-mcp` bila `fromMcp: true`, otomatis ditambahkan).
- Selalu sebutkan path catatan `AutoCreateAI` / `FromMCP` yang dibuat atau diperbarui pada jawaban ke Rasimin agar bisa ditinjau.
