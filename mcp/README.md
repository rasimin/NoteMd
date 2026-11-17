# AI Note MCP Server

MCP server untuk menghubungkan catatan **AI Note**, lampiran, source code lokal (read-only), skema database client, dan folder `AutoCreateAI` ke **Antigravity**, **Claude Code**, dan **Codex** di Windows — baik secara **lokal (`stdio`)** maupun lewat **intranet / LAN (`http://<IP-LAPTOP>:<PORT>/mcp`)**.

## Isi Folder `APP/mcp/`
- `mcp-core.js` — definisi bersama 13 tool MCP, loader aturan, dan keamanan path/DB.
- `mcp.js` — entrypoint MCP lokal via `stdio`.
- `mcp-http.js` — handler Remote MCP (`Streamable HTTP`) untuk endpoint `/mcp` di `server.js`, lengkap dengan otentikasi Bearer token dan opsional IP allowlist.
- `mcp-config.json` — pengaturan `sourceRoots`, `excludeDirs`, `blockedFiles`, `allowDbSelect`, `allowProd`, `httpEnabled`, dan `httpAllowedIps`.
- `mcp-secret.json` — otomatis dibuat (dan masuk `.gitignore`) berisi Bearer token acak untuk akses intranet `/mcp`.
- `ATURAN-MCP.md` — aturan khusus untuk AI saat menggunakan MCP (dikirim otomatis saat *handshake* MCP & lewat tool `get_rules`).

## Pengaturan Cepat
Edit [mcp-config.json](mcp-config.json):
- `sourceRoots`: daftar folder Windows yang boleh dibaca source code-nya oleh tool MCP (Read-Only).
- `allowDbSelect`: `true` untuk mengizinkan `SELECT` terbatas (maks 100 baris), atau `false` jika hanya ingin skema saja.
- `allowProd`: `false` (default memblokir koneksi database `prod`).
- `httpEnabled`: `true` untuk mengaktifkan endpoint Remote MCP `/mcp` di `server.js`.
- `httpAllowedIps`: `[]` (semua IP intranet dengan token yang sah boleh masuk) atau isi daftar IP tertentu, misalnya `["192.168.1.25", "127.0.0.1"]`.

---

## Cara Pasang di Windows

### 1. Antigravity
Tambahkan ke file konfigurasi MCP Antigravity (`C:\Users\<USER>\.gemini\antigravity\mcp_config.json` atau lewat menu **MCP Servers**):

```json
{
  "mcpServers": {
    "ai-note": {
      "command": "node",
      "args": ["D:\\Rasimin\\AI Note\\APP\\mcp\\mcp.js"]
    }
  }
}
```

### 2. Claude Code
Jalankan di PowerShell / terminal:

```powershell
claude mcp add ai-note -- node "D:\Rasimin\AI Note\APP\mcp\mcp.js"
```

Atau tambahkan ke `~/.claude.json`:

```json
{
  "mcpServers": {
    "ai-note": {
      "command": "node",
      "args": ["D:\\Rasimin\\AI Note\\APP\\mcp\\mcp.js"]
    }
  }
}
```

### 3. Codex (CLI / Extension)
Tambahkan ke `%USERPROFILE%\.codex\config.toml`:

```toml
[mcp_servers.ai_note]
command = "node"
args = ["D:\\Rasimin\\AI Note\\APP\\mcp\\mcp.js"]
```

---

## Akses Intranet / Laptop Lain (`Remote HTTP /mcp`)

Jika ingin mengakses MCP AI Note dari **laptop lain dalam satu jaringan intranet / LAN** (menggunakan Streamable HTTP di `http://<IP-LAPTOP-SERVER>:<PORT>/mcp`):

### 1. Persiapan di Laptop Server AI Note
1. Pastikan `APP/settings.json` menggunakan `"host": "0.0.0.0"` (agar server mendengar di semua interface LAN; cek juga port-nya, default `3001`).
2. Pastikan Windows Firewall mengizinkan port `3001` (atau port di `settings.json`) pada profil **Private** / intranet.
3. Restart AI Note lewat `APP/restart.bat` agar `server.js` memuat endpoint `/mcp`.
4. Ambil Bearer token Anda dari file `APP/mcp/mcp-secret.json` (otomatis dibuat saat server dijalankan; jangan bagikan/commit token ini).
   - Opsional: Anda juga bisa menimpa token dengan environment variable `AI_NOTE_MCP_TOKEN`, atau membatasi IP client lewat `httpAllowedIps` di `APP/mcp/mcp-config.json`.

Ganti `<IP-SERVER>` dan `<TOKEN_MCP_ANDA>` di contoh konfigurasi laptop client di bawah:

### 2. Laptop Client — Antigravity
Tambahkan ke `mcp_config.json`:

```json
{
  "mcpServers": {
    "ai-note": {
      "serverUrl": "http://<IP-SERVER>:3001/mcp",
      "headers": {
        "Authorization": "Bearer <TOKEN_MCP_ANDA>"
      }
    }
  }
}
```

### 3. Laptop Client — Claude Code
Jalankan di PowerShell laptop client:

```powershell
claude mcp add --transport http ai-note http://<IP-SERVER>:3001/mcp --header "Authorization: Bearer <TOKEN_MCP_ANDA>"
```

Atau tambahkan ke `~/.claude.json`:

```json
{
  "mcpServers": {
    "ai-note": {
      "type": "http",
      "url": "http://<IP-SERVER>:3001/mcp",
      "headers": {
        "Authorization": "Bearer <TOKEN_MCP_ANDA>"
      }
    }
  }
}
```

### 4. Laptop Client — Codex (CLI / Extension)
Set environment variable `AI_NOTE_MCP_TOKEN=<TOKEN_MCP_ANDA>` di laptop client, lalu tambahkan ke `%USERPROFILE%\.codex\config.toml`:

```toml
[mcp_servers.ai_note]
url = "http://<IP-SERVER>:3001/mcp"
bearer_token_env_var = "AI_NOTE_MCP_TOKEN"
```
