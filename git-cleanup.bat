@echo off
cd /d "D:\CODEX PROJECTS\LoadHUBAI"
if exist ".git\index.lock" del /f /q ".git\index.lock"
echo === Elimin junk din tracking ===
git rm -r --cached --ignore-unmatch ".codex-remote-attachments"
git rm --cached --ignore-unmatch ".fuse_hidden*" "public/.fuse_hidden*" "src/client/.fuse_hidden*" "src/server/.fuse_hidden*"
git add .gitignore
echo === COMMIT cleanup ===
git commit -m "Cleanup: elimina .fuse_hidden si .codex-remote-attachments, update .gitignore"
echo === PUSH ===
git push origin main
echo.
echo ====== GATA cleanup. Inchide fereastra. ======
pause
