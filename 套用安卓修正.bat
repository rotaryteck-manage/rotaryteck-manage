@echo off
cd /d "%~dp0"
node apply-android-v80.mjs
if errorlevel 1 goto end
call npm run build
:end
pause
