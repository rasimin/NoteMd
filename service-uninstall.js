'use strict';

const path = require('path');
const { Service } = require('node-windows');

const serverScript = path.join(__dirname, 'server.js');

const svc = new Service({
  name: 'AINote',
  script: serverScript
});

svc.on('uninstall', () => {
  console.log('----------------------------------------------------');
  console.log('✅ Service "AINote" berhasil dicopot (uninstalled)!');
  console.log('Service tidak akan berjalan lagi di background Windows.');
  console.log('----------------------------------------------------');
});

svc.on('alreadyuninstalled', () => {
  console.log('----------------------------------------------------');
  console.log('ℹ️  Service "AINote" sudah tidak terpasang di sistem.');
  console.log('----------------------------------------------------');
});

svc.on('error', (err) => {
  console.error('❌ Terjadi kesalahan saat mencopot service:', err);
});

console.log('Sedang menghentikan dan mencopot service "AINote"...');
svc.uninstall();

