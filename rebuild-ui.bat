@echo off
cd /d "D:\CODEX PROJECTS\LoadHUBAI"
echo === Build interfata (vite) ===
call npm run build
if errorlevel 1 ( echo. ^& echo BUILD A ESUAT - trimite-mi ce scrie. ^& pause ^& exit /b 1 )
echo === Restart server pe :4000 ===
for /f "tokens=5" %%a in ('netstat -ano ^| findstr LISTENING ^| findstr :4000') do taskkill /F /PID %%a >nul 2>&1
set PORT=4000
call npm start
