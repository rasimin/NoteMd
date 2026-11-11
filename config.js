'use strict';
// Konfigurasi bersama (server.js, notes-lib.js, skrip baris perintah, dan service).
// Letak folder catatan (Document) diatur di settings.json: "notesDir".
//   - relatif: dihitung dari folder aplikasi ini (folder tempat settings.json), contoh "../Document"
//   - absolut: contoh "D:\\Rasimin\\Document"
// Urutan prioritas: variabel lingkungan NOTES_DIR, lalu settings.json, lalu bawaan "../Document".
const fs = require('fs');
const path = require('path');

const APP_DIR = __dirname;
const SETTINGS_FILE = path.join(APP_DIR, 'settings.json');
const DEFAULT_NOTES_DIR = '../Document';

function loadSettings() {
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8').replace(/^\uFEFF/, ''));
    return raw && typeof raw === 'object' ? raw : {};
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('settings.json tidak bisa dibaca, memakai bawaan:', err.message);
    return {};
  }
}

const SETTINGS = loadSettings();
const rawDir = process.env.NOTES_DIR || (typeof SETTINGS.notesDir === 'string' && SETTINGS.notesDir.trim()) || DEFAULT_NOTES_DIR;
const NOTES_DIR = path.resolve(APP_DIR, rawDir.trim());

// Hentikan dengan pesan jelas jika folder catatan tidak ada (jangan membuat folder kosong diam-diam).
function ensureNotesDir() {
  let st = null;
  try {
    st = fs.statSync(NOTES_DIR);
  } catch {}
  if (!st || !st.isDirectory()) {
    console.error(`Folder catatan tidak ditemukan: ${NOTES_DIR}`);
    console.error(`Atur "notesDir" di ${SETTINGS_FILE} (relatif terhadap folder aplikasi, atau path absolut).`);
    process.exit(1);
  }
}

module.exports = { APP_DIR, SETTINGS_FILE, SETTINGS, NOTES_DIR, DEFAULT_NOTES_DIR, ensureNotesDir };
