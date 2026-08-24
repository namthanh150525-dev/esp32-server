@echo off
echo ========================================================
echo DONG BO CODE SIMULATOR LEN GITHUB
echo ========================================================
echo.

echo [1/3] Dang copy code sang thu muc chua Git...
xcopy /E /Y /I "E:\Admin\Đồ án\màn hình đa năng di động\simulator" "E:\Admin\DO-AN\man-hinh-da-nang-di-dong\esp32-server\simulator" >nul

echo [2/3] Chuyen den thu muc Git va dong bo...
cd /d "E:\Admin\DO-AN\man-hinh-da-nang-di-dong\esp32-server"
git add simulator/
git commit -m "Auto update simulator from bat file"
git push

echo.
echo [3/3] HOAN TAT! Code da duoc day len GitHub.
echo Ban co the kiem tra lai trang web.
echo.
pause
