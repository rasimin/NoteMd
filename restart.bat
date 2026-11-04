@echo off
title Restart AI Note
setlocal EnableDelayedExpansion
cd /d "%~dp0"

:: Cek hak akses Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ========================================================
    echo   AI NOTE - RESTART
    echo ========================================================
    echo [INFO] Memerlukan hak akses Administrator untuk me-restart Service.
    echo Membuka dialog UAC Windows...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath cmd.exe -ArgumentList '/k \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo ========================================================
echo   AI NOTE - RESTART
echo ========================================================
echo.

:: 1. Periksa apakah Windows Service "AINote" terdaftar di sistem
sc.exe query AINote >nul 2>&1
if %errorLevel% equ 0 (
    echo [INFO] Terdeteksi Windows Service "AINote".
    echo [1/2] Menghentikan service...
    net stop AINote
    timeout /t 2 /nobreak >nul

    echo [2/2] Menyalakan kembali service...
    net start AINote
    echo.
    echo --------------------------------------------------------
    node "_app\service-status.js"
    echo --------------------------------------------------------
    echo.
    echo [OK] Restart Windows Service selesai!
    echo.
    timeout /t 5
    exit /b 0
)

:: 2. Jika service belum terpasang, coba cari proses server yang sedang berjalan
echo [INFO] Windows Service "AINote" belum terpasang di sistem.
echo Mengecek apakah server berjalan manual di port 3001...

set PID_FOUND=
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do (
    set PID_FOUND=%%a
)

if defined PID_FOUND (
    echo [INFO] Menemukan proses server aktif dengan PID: !PID_FOUND!
    echo Menghentikan proses server...
    taskkill /F /PID !PID_FOUND! >nul 2>&1
    timeout /t 1 /nobreak >nul
    echo Memulai kembali server secara manual...
    start "AI Note" /D "%~dp0_app" cmd /c "node server.js"
    echo [OK] Server berhasil di-restart manual di port 3001!
    echo.
    timeout /t 4
    exit /b 0
)

:: 3. Jika tidak ada yang berjalan
echo [WARN] Tidak ada service atau server AI Note yang sedang berjalan.
echo Menjalankan AI Note sekarang...
start "AI Note" /D "%~dp0_app" cmd /c "node server.js"
echo [OK] Server telah dijalankan!
echo Buka di browser: http://localhost:3001
echo.
timeout /t 4

