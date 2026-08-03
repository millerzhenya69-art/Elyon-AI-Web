# push_release.ps1 — безопасно кладёт новые билды в downloads/ и пушит сайт.
#
# Использование:
#   .\push_release.ps1 -Version "1.0.2" -ArtifactsDir "C:\Users\Комп\Downloads\elyon-release"
#
# Ожидает, что в ArtifactsDir лежат файлы (имена ГИБКИЕ — скрипт сам находит по
# расширению/шаблону, чтобы не зависеть от точных имён, которые раздаёт GitHub Actions):
#   *.zip                (Windows)
#   *arm64*.apk          (Android 64-bit)
#   *arm32*.apk или *armeabi*.apk (Android 32-bit)
#   *.tar.gz             (Linux)
#   *.dmg                (macOS)

param(
    [Parameter(Mandatory=$true)][string]$Version,
    [Parameter(Mandatory=$true)][string]$ArtifactsDir
)

$ErrorActionPreference = "Stop"
$RepoDir = $PSScriptRoot
$DownloadsDir = Join-Path $RepoDir "downloads"

if ($Version -notmatch '^\d+\.\d+(\.\d+)?$') {
    Write-Error "Версия '$Version' не похожа на номер версии (ожидалось что-то вроде 1.0.2 или 2.0). Прервано."
    exit 1
}

# Карта: целевое имя файла в downloads/ -> паттерн поиска в ArtifactsDir
$FileMap = @{
    "elyon-ai-windows.zip"        = "*.zip"
    "elyon-ai-android-arm64.apk"  = "*arm64*.apk"
    "elyon-ai-android-arm32.apk"  = "*armeabi*.apk", "*arm32*.apk"
    "elyon-ai-linux.tar.gz"       = "*.tar.gz"
    "elyon-ai-macos.dmg"          = "*.dmg"
}

# Минимальные размеры (байт) — грубая, но надёжная защита от пустых/битых файлов,
# из-за которых в прошлый раз в репозиторий попали невалидные версии.
$MinSizes = @{
    "elyon-ai-windows.zip"        = 5MB
    "elyon-ai-android-arm64.apk"  = 5MB
    "elyon-ai-android-arm32.apk"  = 5MB
    "elyon-ai-linux.tar.gz"       = 5MB
    "elyon-ai-macos.dmg"          = 5MB
}

Write-Host "== Ищу файлы в $ArtifactsDir ==" -ForegroundColor Cyan
$resolved = @{}
foreach ($target in $FileMap.Keys) {
    $patterns = $FileMap[$target]
    $found = $null
    foreach ($pattern in $patterns) {
        $match = Get-ChildItem -Path $ArtifactsDir -Recurse -Filter $pattern -File -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($match) { $found = $match; break }
    }
    if (-not $found) {
        Write-Error "Не нашёл файл для '$target' (искал: $($patterns -join ', ')) в $ArtifactsDir. Прервано, ничего не изменено."
        exit 1
    }
    $sizeOk = $found.Length -ge $MinSizes[$target]
    $sizeMb = [math]::Round($found.Length / 1MB, 1)
    $minMb  = [math]::Round($MinSizes[$target] / 1MB, 1)
    if (-not $sizeOk) {
        Write-Error "Файл для '$target' ($($found.Name)) весит всего $sizeMb МБ — подозрительно мало (ожидал минимум $minMb МБ). Похоже на битый/неполный файл. Прервано, ничего не изменено."
        exit 1
    }
    Write-Host "  OK: $target  <-  $($found.Name)  ($sizeMb МБ)" -ForegroundColor Green
    $resolved[$target] = $found.FullName
}

Write-Host "`n== Все файлы найдены и прошли проверку размера. Копирую в downloads/ ==" -ForegroundColor Cyan
foreach ($target in $resolved.Keys) {
    Copy-Item -Path $resolved[$target] -Destination (Join-Path $DownloadsDir $target) -Force
    Write-Host "  Скопировано: $target"
}

Write-Host "`n== Обновляю downloads/version.json ==" -ForegroundColor Cyan
$versionJsonPath = Join-Path $DownloadsDir "version.json"
$json = Get-Content $versionJsonPath -Raw | ConvertFrom-Json
$oldVersion = $json.version
$json.version = $Version
$json | ConvertTo-Json -Depth 5 | Set-Content -Path $versionJsonPath -Encoding utf8
Write-Host "  Версия: $oldVersion -> $Version"

Write-Host "`n== git add / commit / push ==" -ForegroundColor Cyan
Push-Location $RepoDir
try {
    & git add downloads/
    & git commit -m "release: v$Version"
    & git push
} finally {
    Pop-Location
}

Write-Host "`nГотово. Приложения подхватят v$Version при следующей проверке обновлений." -ForegroundColor Green
