@echo off
chcp 65001 >nul
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo  파일 확장자 보이기 설정
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 파일 확장자를 보이게 설정합니다...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" /v HideFileExt /t REG_DWORD /d 0 /f >nul
echo.
echo ✅ 설정이 완료되었습니다!
echo.
echo 📌 탐색기를 새로고침(F5)하거나 다시 열어주세요.
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
pause