'use strict';

const path = require('path');
const fs = require('fs');
const { Service } = require('node-windows');

const serverScript = path.join(__dirname, 'server.js');

if (!fs.existsSync(serverScript)) {
  console.error(`Error: File server.js tidak ditemukan di ${serverScript}`);
  process.exit(1);
}

const svc = new Service({
  name: 'AINote',
  description: 'AI Note - Personal Markdown Wiki & Kanban Board Service',
  script: serverScript,
  workingDirectory: __dirname,
  nodeOptions: ['--harmony'],
  stopparentfirst: false
});

svc.on('install', () => {
  console.log('----------------------------------------------------');
  console.log('✅ Service "AINote" berhasil diinstal ke Windows!');
  console.log('Sedang memulai service...');
  console.log('----------------------------------------------------');
  svc.start();
});

svc.on('alreadyinstalled', () => {
  console.log('----------------------------------------------------');
  console.log('ℹ️  Service "AINote" sudah terinstal sebelumnya.');
  console.log('Sedang memastikan service berjalan...');
  console.log('----------------------------------------------------');
  svc.start();
});

svc.on('start', () => {
  console.log('----------------------------------------------------');
  console.log('🚀 Service "AINote" sekarang AKTIF dan berjalan di background!');
  console.log('Aplikasi akan otomatis berjalan setiap kali Windows menyala (startup).');
  console.log('');
  console.log('Buka browser di: http://localhost:3001');
  console.log('----------------------------------------------------');
});

svc.on('error', (err) => {
  console.error('❌ Terjadi kesalahan pada service:', err);
});

console.log('Sedang mendaftarkan AI Note sebagai Windows Service...');
svc.install();

