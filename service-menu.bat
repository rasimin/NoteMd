@echo off
title AI Note - Windows Service Manager
setlocal EnableDelayedExpansion
cd /d "%~dp0"

:: Cek hak akses Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath cmd.exe -ArgumentList '/k \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

:MENU
cls
echo ========================================================
echo        AI NOTE - WINDOWS SERVICE MANAGER
echo ========================================================
echo.
echo  [1] Cek Status Service
echo  [2] Jalankan Service (Start)
echo  [3] Hentikan Service (Stop)
echo  [4] Restart Service
echo  [5] Buka AI Note di Browser (http://localhost:3001)
echo  [6] Pasang Service Baru (Install)
echo  [7] Copot Service (Uninstall)
echo  [8] Keluar
echo.
echo ========================================================
set /p choice="Pilih menu [1-8]: "

if "%choice%"=="1" goto STATUS
if "%choice%"=="2" goto START
if "%choice%"=="3" goto STOP
if "%choice%"=="4" goto RESTART
if "%choice%"=="5" goto OPEN_BROWSER
if "%choice%"=="6" goto INSTALL
if "%choice%"=="7" goto UNINSTALL
if "%choice%"=="8" goto EXIT

echo Pilihan tidak valid. Silakan coba lagi.
timeout /t 2 >nul
goto MENU

:STATUS
cls
echo ========================================================
echo   STATUS SERVICE AI NOTE
echo ========================================================
node "service-status.js"
echo.
pause
goto MENU

:START
cls
echo ========================================================
echo   MENJALANKAN SERVICE AI NOTE
echo ========================================================
net start AINote
echo.
pause
goto MENU

:STOP
cls
echo ========================================================
echo   MENGHENTIKAN SERVICE AI NOTE
echo ========================================================
net stop AINote
echo.
pause
goto MENU

:RESTART
cls
echo ========================================================
echo   RESTART SERVICE AI NOTE
echo ========================================================
echo Menghentikan service...
net stop AINote >nul 2>&1
timeout /t 2 >nul
echo Memulai kembali service...
net start AINote
echo.
pause
goto MENU

:OPEN_BROWSER
start "" "http://localhost:3001"
goto MENU

:INSTALL
cls
echo ========================================================
echo   INSTALL SERVICE AI NOTE
echo ========================================================
node "service-install.js"
echo.
pause
goto MENU

:UNINSTALL
cls
echo ========================================================
echo   UNINSTALL SERVICE AI NOTE
echo ========================================================
net stop AINote >nul 2>&1
node "service-uninstall.js"
sc delete AINote >nul 2>&1
echo.
pause
goto MENU

:EXIT
exit

