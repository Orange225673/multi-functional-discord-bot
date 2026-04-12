@echo off
set "output=Discord.zip"
:: Liệt kê các file và folder, cách nhau bằng dấu phẩy
set "items=src, data, main.js, .env, minecraft_bots"

echo Dang nen cac muc: %items% ...

:: Lệnh PowerShell chuẩn để nhận diện danh sách items
powershell -command "Compress-Archive -Path %items% -DestinationPath '%output%' -Update"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Hoan tat! File nen: %output%
) else (
    echo.
    echo [LOI] Co loi xay ra trong qua trinh nen.
)

pause
