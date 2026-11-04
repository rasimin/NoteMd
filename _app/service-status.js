'use strict';

const http = require('http');
const { exec } = require('child_process');

exec('sc query AINote', (err, stdout) => {
  console.log('=== Status Windows Service AINote ===');
  if (err || stdout.includes('FAILED 1060')) {
    console.log('❌ Service "AINote" BELUM TERPASANG di sistem.');
    console.log('Jalankan "install-service.bat" untuk memasangnya.');
    return;
  }

  const isRunning = stdout.includes('RUNNING');
  const isStopped = stdout.includes('STOPPED');

  if (isRunning) {
    console.log('✅ Status Service: RUNNING (Aktif di background)');
  } else if (isStopped) {
    console.log('⏸️  Status Service: STOPPED (Berhenti)');
  } else {
    console.log('ℹ️  Status Service:\n' + stdout.trim());
  }

  const req = http.get('http://127.0.0.1:3001/api/tree', (res) => {
    if (res.statusCode === 200) {
      console.log('🌐 Web Server: AKTIF & Merespons di http://localhost:3001');
    } else {
      console.log(`⚠️  Web Server merespons dengan HTTP ${res.statusCode}`);
    }
  });

  req.on('error', (e) => {
    console.log(`❌ Web Server tidak dapat dihubungi (${e.message})`);
  });
});

