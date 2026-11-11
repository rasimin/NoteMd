@echo off
title Uninstall AI Note Windows Service
setlocal EnableDelayedExpansion
cd /d "%~dp0"

:: Cek hak akses Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ========================================================
    echo   AI NOTE - UNINSTALL WINDOWS SERVICE
    echo ========================================================
    echo [INFO] Memerlukan hak akses Administrator untuk mencopot Service.
    echo Membuka dialog UAC Windows...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath cmd.exe -ArgumentList '/k \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo ========================================================
echo   AI NOTE - UNINSTALL WINDOWS SERVICE
echo ========================================================
echo.

:: Hentikan service jika sedang berjalan
echo [INFO] Menghentikan service "AINote" jika sedang aktif...
net stop AINote >nul 2>&1

:: Jalankan script pencopotan service
echo [INFO] Menghapus pendaftaran service "AINote"...
node "service-uninstall.js"

:: Hapus via sc jika masih tersisa
sc delete AINote >nul 2>&1

echo.
echo ========================================================
echo   SELESAI!
echo ========================================================
echo Service "AINote" telah berhasil dicopot dari Windows.
echo.
pause

