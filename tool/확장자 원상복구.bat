@echo off
chcp 65001 >nul
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo  파일 확장자 숨기기 (원상복구)
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 파일 확장자를 숨기도록 설정합니다...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v HideFileExt /t REG_DWORD /d 1 /f >nul
echo.
echo ✅ 원상복구가 완료되었습니다!
echo.
echo 📌 탐색기를 새로고침(F5)하거나 다시 열어주세요.
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
pause