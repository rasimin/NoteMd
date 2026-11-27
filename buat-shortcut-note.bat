@echo off
setlocal
cd /d "%~dp0"

set "APP_DIR=%~dp0"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"
set "LNK_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Note Cepat.lnk"
set "VBS_PATH=%APP_DIR%\buka-note-cepat.vbs"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut($env:LNK_PATH); $s.TargetPath = 'wscript.exe'; $s.Arguments = '//nologo \"' + $env:VBS_PATH + '\"'; $s.WorkingDirectory = $env:APP_DIR; $s.IconLocation = ($env:APP_DIR + '\public\favicon-cepat.ico,0'); $s.Description = 'Note Cepat - Catatan cepat AI Note'; $s.Save()"

if %errorLevel% neq 0 (
    echo [ERROR] Gagal membuat shortcut Start Menu.
    if /i not "%~1"=="--silent" pause
    exit /b 1
)

echo [OK] Shortcut dibuat: %LNK_PATH%
if /i not "%~1"=="--silent" (
    echo Tekan Windows lalu ketik "note" untuk membuka Note Cepat.
    pause
)
