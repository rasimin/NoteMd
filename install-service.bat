@echo off
title Install AI Note as Windows Service
setlocal EnableDelayedExpansion
cd /d "%~dp0"

:: Cek hak akses Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ========================================================
    echo   AI NOTE - INSTALL WINDOWS SERVICE
    echo ========================================================
    echo [INFO] Memerlukan hak akses Administrator untuk menginstal Service.
    echo Membuka dialog UAC Windows...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath cmd.exe -ArgumentList '/k \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo ========================================================
echo   AI NOTE - INSTALL WINDOWS SERVICE
echo ========================================================
echo.

:: Pastikan Node.js terpasang
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Node.js tidak ditemukan di PATH sistem.
    echo Silakan instal Node.js terlebih dahulu dari https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: Cek apakah dependensi APP sudah terpasang
if not exist "node_modules\node-windows" (
    echo [INFO] Menginstal dependensi node-windows...
    cd /d "%~dp0."
    call npm.cmd install --omit=dev
    cd /d "%~dp0"
)

:: Jalankan script instalasi service
echo [INFO] Memasang service "AINote"...
node "service-install.js"

echo.
echo ========================================================
echo   SELESAI!
echo ========================================================
echo AI Note sekarang telah berjalan sebagai Windows Service.
echo Layanan ini akan OTOMATIS BERJALAN setiap kali komputer dinyalakan.
echo.
echo Akses aplikasi melalui browser:
echo    http://localhost:3001
echo.
echo Tekan sembarang tombol untuk menutup jendela ini...
pause >nul

