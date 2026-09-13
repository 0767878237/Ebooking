# Script khac phuc triet de loi .git/index 0KB tren Windows
# Luu va tai tao truc tiep vao file .git/index bang Git native thay vi dung file index.backup
$ErrorActionPreference = "Continue"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$gitDir = Join-Path $repoRoot ".git"
$indexPath = Join-Path $gitDir "index"
$lockPath = Join-Path $gitDir "index.lock"
$backupPath = Join-Path $gitDir "index.backup"

Write-Host "=== KIEM TRA VA KHAC PHUC .GIT/INDEX ===" -ForegroundColor Cyan

# 1. Xoa file backup cu de tranh gay nham lan hoac phuc hoi du lieu loi thoi
if (Test-Path $backupPath) {
    Remove-Item $backupPath -Force -ErrorAction SilentlyContinue
    Write-Host "[Info] Da xoa file .git/index.backup cu de luu truc tiep vao git index." -ForegroundColor DarkGray
}

# 2. Xoa file lock treo neu co (nguyen nhan khien index bi loi)
if (Test-Path $lockPath) {
    Remove-Item $lockPath -Force -ErrorAction SilentlyContinue
    Write-Host "[Canh bao] Phat hien va da xoa file treo .git/index.lock!" -ForegroundColor Yellow
}

# 3. Kiem tra file index
$needRebuild = $false
if (-not (Test-Path $indexPath)) {
    Write-Host "[Loi] File .git/index khong ton tai!" -ForegroundColor Red
    $needRebuild = $true
} else {
    $size = (Get-Item $indexPath).Length
    if ($size -eq 0) {
        Write-Host "[Loi] File .git/index bi 0KB (corrupted)!" -ForegroundColor Red
        $needRebuild = $true
    } else {
        # Kiem tra thu git co doc duoc index khong
        $testStatus = git status 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[Loi] Git khong doc duoc file index hien tai!" -ForegroundColor Red
            $needRebuild = $true
        } else {
            Write-Host "[OK] File .git/index dang hoat dong binh thuong ($size bytes)." -ForegroundColor Green
        }
    }
}

# 4. Tai tao truc tiep file .git/index tu HEAD
if ($needRebuild) {
    Write-Host "Dang tai tao truc tiep .git/index tu commit HEAD..." -ForegroundColor Cyan
    if (Test-Path $indexPath) {
        Remove-Item $indexPath -Force -ErrorAction SilentlyContinue
    }
    
    # Su dung git reset de Git tu tao lai toan bo index chuan xac
    git reset HEAD
    
    if (Test-Path $indexPath) {
        $newSize = (Get-Item $indexPath).Length
        Write-Host "[Thanh cong] Da tai tao .git/index truc tiep! Kich thuoc: $newSize bytes." -ForegroundColor Green
    } else {
        Write-Host "[Loi] Khong the tai tao index, vui long kiem tra HEAD!" -ForegroundColor Red
    }
}

# 5. Cau hinh toi uu tranh loi 0KB tren Windows
try {
    # Go bo core.fsync tranh conflict khoa file tren NTFS khi co antivirus/OneDrive/IDE
    git config --local --unset core.fsync 2>$null
    git config --local --unset core.preloadindex 2>$null
    git config --local core.fscache true 2>$null
} catch {}

Write-Host "`nTrang thai Git hien tai:" -ForegroundColor Cyan
git status --short
