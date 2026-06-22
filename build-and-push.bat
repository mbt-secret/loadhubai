@echo off
cd /d "D:\CODEX PROJECTS\LoadHUBAI"
if exist ".git\index.lock" del /f /q ".git\index.lock"
echo === 1/3 BUILD frontend (vite) ===
call npm run build
if errorlevel 1 ( echo. ^& echo BUILD A ESUAT - trimite-mi ce scrie mai sus. ^& pause ^& exit /b 1 )
echo === 2/3 COMMIT ===
git add -A
git reset -- git-push.bat git-cleanup.bat build-and-push.bat 1>nul 2>nul
git commit -m "WhatsApp prin Baileys read-only (cod de asociere), fara Chromium + UI conectare + deps"
echo === 3/3 PUSH pe GitHub ===
git push origin main
echo.
echo ====== GATA. Codul nou (server + dist) e pe GitHub. ======
pause
