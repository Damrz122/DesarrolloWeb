[CmdletBinding()]
param(
    [string]$BackupRoot = (Join-Path $env:USERPROFILE "ElectronixBackups"),
    [int]$KeepDays = 30,
    [string]$DbContainer = "electronix-postgres",
    [string]$AppContainer = "electronix-app"
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $BackupRoot $timestamp
$dumpName = "electronix-$timestamp.dump"
$dumpFile = Join-Path $backupDir $dumpName

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

try {
    docker inspect $DbContainer | Out-Null
    $database = (docker exec $DbContainer printenv POSTGRES_DB).Trim()
    if ([string]::IsNullOrWhiteSpace($database)) { throw "POSTGRES_DB no está definido en $DbContainer." }

    $dumpCommand = 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/' + $dumpName
    docker exec $DbContainer sh -c $dumpCommand
    if ($LASTEXITCODE -ne 0) { throw "pg_dump falló." }
    docker cp "${DbContainer}:/tmp/$dumpName" $dumpFile
    if ($LASTEXITCODE -ne 0 -or !(Test-Path $dumpFile)) { throw "No se pudo copiar el respaldo de PostgreSQL." }
    docker exec $DbContainer rm -f "/tmp/$dumpName" | Out-Null

    $uploadsDir = Join-Path $backupDir "uploads"
    $hasUploads = $false
    docker inspect $AppContainer 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        docker exec $AppContainer sh -c 'test -d /app/uploads' | Out-Null
        $hasUploads = $LASTEXITCODE -eq 0
    }
    if ($hasUploads) {
        New-Item -ItemType Directory -Force -Path $uploadsDir | Out-Null
        docker cp "${AppContainer}:/app/uploads/." $uploadsDir
        if ($LASTEXITCODE -ne 0) { throw "No se pudo copiar los archivos subidos." }
    }

    [pscustomobject]@{
        createdAt = (Get-Date).ToString("o")
        database = $database
        databaseDump = $dumpName
        uploadsIncluded = (Test-Path $uploadsDir)
    } | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $backupDir "metadata.json")

    Get-ChildItem $BackupRoot -Directory |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } |
        Remove-Item -Recurse -Force

    Write-Host "Respaldo verificado: $backupDir" -ForegroundColor Green
} catch {
    if (Test-Path $backupDir) { Remove-Item -Recurse -Force $backupDir }
    throw
}
