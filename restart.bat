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
:: (node-windows memakai nama kunci "ainote.exe", nama tampilan "AINote"; cek keduanya)
set SVC_FOUND=
sc.exe query ainote.exe >nul 2>&1 && set SVC_FOUND=1
sc.exe query AINote >nul 2>&1 && set SVC_FOUND=1
if defined SVC_FOUND (
    echo [INFO] Terdeteksi Windows Service "AINote".
    echo [1/2] Menghentikan service...
    net stop AINote
    timeout /t 2 /nobreak >nul
    rem Tutup semua proses node lama yang menjalankan server.js. Netstat kadang melaporkan PID 0
    rem untuk port yang masih dipegang proses lama, jadi proses dicari lewat command line-nya.
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process -Filter 'Name=''node.exe''' | Where-Object { $_.CommandLine -like '*\APP\server.js*' } | ForEach-Object { Write-Host ('[INFO] Menutup proses node lama PID ' + $_.ProcessId); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
    timeout /t 1 /nobreak >nul
    rem Tutup proses sisa yang masih memegang port 3001, misalnya server lama yang tidak ikut berhenti
    for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do (
        if not "%%p"=="0" (
            echo [INFO] Menutup proses sisa di port 3001 ^(PID %%p^)...
            taskkill /PID %%p /F /T >nul 2>&1
        )
    )
    timeout /t 1 /nobreak >nul

    echo [2/2] Menyalakan kembali service...
    net start AINote
    echo.
    echo --------------------------------------------------------
    node "service-status.js"
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
    if not "%%a"=="0" (
        set PID_FOUND=%%a
        echo [INFO] Menemukan proses server aktif dengan PID: %%a
        echo Menghentikan proses server...
        taskkill /F /T /PID %%a >nul 2>&1
    )
)

if defined PID_FOUND (
    timeout /t 1 /nobreak >nul
    echo Memulai kembali server secara manual...
    start "AI Note" /D "%~dp0." cmd /c "node server.js"
    echo [OK] Server berhasil di-restart manual di port 3001!
    echo.
    timeout /t 4
    exit /b 0
)

:: 3. Jika tidak ada yang berjalan
echo [WARN] Tidak ada service atau server AI Note yang sedang berjalan.
echo Menjalankan AI Note sekarang...
start "AI Note" /D "%~dp0." cmd /c "node server.js"
echo [OK] Server telah dijalankan!
echo Buka di browser: http://localhost:3001
echo.
timeout /t 4

