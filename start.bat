@echo off
chcp 65001 > nul

echo Starting Discord Bot...
echo.

node main

if %errorlevel% neq 0 (
    echo Error detected.
)
pause
