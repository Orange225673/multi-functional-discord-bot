@echo off
chcp 65001 > nul

echo Starting Discord Bot...
echo.

npm start

if %errorlevel% neq 0 (
    echo Error detected.
)
pause
