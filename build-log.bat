@echo off
cd /d "D:\CODEX PROJECTS\LoadHUBAI"
echo ==== BUILD START %DATE% %TIME% ==== > build-log.txt
call npm run build >> build-log.txt 2>&1
echo ==== BUILD END errorlevel=%errorlevel% %TIME% ==== >> build-log.txt
