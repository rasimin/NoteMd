@echo off
cd /d "%~dp0"
if not exist node_modules\html-to-docx (
  echo Menginstal dependensi...
  call npm install --omit=dev
)
node server.js --open
pause
