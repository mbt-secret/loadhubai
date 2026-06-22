@echo off
rem Restart TIRGo on port 4000 cu codul actualizat
echo Opresc orice server pe portul 4000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr LISTENING ^| findstr :4000') do taskkill /F /PID %%a >nul 2>&1
cd /d "D:\CODEX PROJECTS\LoadHUBAI"
set PORT=4000
echo Pornesc TIRGo pe http://localhost:4000 ...
call npm start
