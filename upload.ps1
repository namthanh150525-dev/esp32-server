Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "      DONG BO CODE SIMULATOR LEN GITHUB (UPLOAD)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Dang copy code sang thu muc chua Git..." -ForegroundColor Yellow
$source = "E:\Admin\Đồ án\màn hình đa năng di động\simulator"
$dest = "E:\Admin\DO-AN\man-hinh-da-nang-di-dong\esp32-server\simulator"

# Kiem tra thu muc source ton tai truoc khi copy
if (Test-Path $source) {
    Copy-Item -Path "$source\*" -Destination $dest -Recurse -Force
}

Write-Host "[2/3] Chuyen den thu muc Git va dong bo..." -ForegroundColor Yellow
Set-Location "E:\Admin\DO-AN\man-hinh-da-nang-di-dong\esp32-server"
git add .
git commit -m "Auto update from ./upload command"
git push

Write-Host ""
Write-Host "[3/3] HOAN TAT! Code da duoc day len GitHub." -ForegroundColor Green
Write-Host "Ban co the kiem tra lai trang web tren Netlify hoac GitHub." -ForegroundColor Green
Write-Host ""
