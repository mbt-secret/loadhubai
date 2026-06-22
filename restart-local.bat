@echo off
cd /d "D:\CODEX PROJECTS\LoadHUBAI"
echo === 1/4 Opresc serverul de pe :4000 (daca ruleaza) ===
for /f "tokens=5" %%a in ('netstat -ano ^| findstr LISTENING ^| findstr :4000') do taskkill /F /PID %%a >nul 2>&1
echo === 2/4 npm install (baileys, qrcode) ===
call npm install
if errorlevel 1 ( echo. ^& echo npm install A ESUAT - trimite-mi ce scrie mai sus. ^& pause ^& exit /b 1 )
echo === 3/4 build interfata (vite) ===
call npm run build
if errorlevel 1 ( echo. ^& echo build A ESUAT - trimite-mi ce scrie mai sus. ^& pause ^& exit /b 1 )
echo === 4/4 Pornesc pe http://localhost:4000 ===
set PORT=4000
call npm start
