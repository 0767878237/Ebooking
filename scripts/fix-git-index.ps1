# Script khac phuc loi .git/index 0KB va dong bo trang thai Git
$ErrorActionPreference = "Continue"

$gitDir = Join-Path $PSScriptRoot "..\.git"
$indexPath = Join-Path $gitDir "index"
$backupPath = Join-Path $gitDir "index.backup"

Write-Host "Dang kiem tra trang thai file .git/index..." -ForegroundColor Cyan

$needFix = $false

if (-not (Test-Path $indexPath)) {
    Write-Host "Phat hien: File .git/index khong ton tai!" -ForegroundColor Yellow
    $needFix = $true
} else {
    $size = (Get-Item $indexPath).Length
    if ($size -eq 0) {
        Write-Host "Phat hien: File .git/index bi 0KB (corrupted)!" -ForegroundColor Red
        $needFix = $true
    } else {
        Write-Host "File .git/index binh thuong ($size bytes)." -ForegroundColor Green
    }
}

if ($needFix) {
    if ((Test-Path $backupPath) -and ((Get-Item $backupPath).Length -gt 0)) {
        Write-Host "Dang khoi phuc tu file backup: $backupPath..." -ForegroundColor Cyan
        Copy-Item $backupPath $indexPath -Force
    } else {
        Write-Host "Dang tai tao index tu HEAD bang git reset..." -ForegroundColor Cyan
        if (Test-Path $indexPath) {
            Remove-Item $indexPath -Force -ErrorAction SilentlyContinue
        }
        git reset
    }

    $newSize = (Get-Item $indexPath -ErrorAction SilentlyContinue).Length
    Write-Host "Da khoi phuc .git/index thanh cong! Kich thuoc moi: $newSize bytes." -ForegroundColor Green
}

# Sao luu index hien tai de du phong
if ((Test-Path $indexPath) -and ((Get-Item $indexPath).Length -gt 0)) {
    Copy-Item $indexPath $backupPath -Force
    Write-Host "Da cap nhat ban sao luu tai .git/index.backup." -ForegroundColor DarkGray
}

Write-Host "`nTrang thai Git hien tai:" -ForegroundColor Cyan
git status --short

