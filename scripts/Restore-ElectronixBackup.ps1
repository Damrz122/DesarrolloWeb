[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)]
    [string]$Backup,
    [string]$DbContainer = "electronix-postgres",
    [string]$AppContainer = "electronix-app"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
$backupDir = (Resolve-Path $Backup).Path
$metadata = Get-Content (Join-Path $backupDir "metadata.json") -Raw | ConvertFrom-Json
$dumpFile = Join-Path $backupDir $metadata.databaseDump
if (!(Test-Path $dumpFile)) { throw "No se encontró el dump indicado en metadata.json." }

Push-Location $projectRoot
try {
    docker compose stop ecommerce-app | Out-Host
    docker compose up -d ecommerce-postgres | Out-Host
    docker inspect $DbContainer | Out-Null
    $database = (docker exec $DbContainer printenv POSTGRES_DB).Trim()
    if ($database -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') { throw "Nombre de base de datos no válido." }

    if ($PSCmdlet.ShouldProcess("la base '$database' y los uploads actuales", "restaurar $backupDir")) {
        $sql = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$database' AND pid <> pg_backend_pid();`nDROP DATABASE IF EXISTS `"$database`";`nCREATE DATABASE `"$database`";"
        $sql | docker exec -i $DbContainer sh -c 'psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1'
        if ($LASTEXITCODE -ne 0) { throw "No se pudo recrear la base de datos." }

        $dumpName = Split-Path $dumpFile -Leaf
        docker cp $dumpFile "${DbContainer}:/tmp/$dumpName"
        if ($LASTEXITCODE -ne 0) { throw "No se pudo copiar el dump al contenedor." }
        docker exec $DbContainer sh -c ('pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --exit-on-error /tmp/' + $dumpName)
        if ($LASTEXITCODE -ne 0) { throw "La restauración PostgreSQL falló." }
        docker exec $DbContainer rm -f "/tmp/$dumpName" | Out-Null

        $uploads = Join-Path $backupDir "uploads"
        if (Test-Path $uploads) {
            # Crea el contenedor sin arrancar Spring: así una base vacía no
            # puede sembrarse antes de que el dump termine de restaurarse.
            docker compose create ecommerce-app | Out-Host
            docker run --rm --volumes-from $AppContainer alpine sh -c 'rm -rf /app/uploads/*'
            if ($LASTEXITCODE -ne 0) { throw "No se pudo limpiar el volumen de uploads." }
            Get-ChildItem $uploads -Force | ForEach-Object {
                docker cp $_.FullName "${AppContainer}:/app/uploads/"
                if ($LASTEXITCODE -ne 0) { throw "No se pudo restaurar el upload $($_.Name)." }
            }
        }
        docker compose up -d ecommerce-app ecommerce-adminer | Out-Host
        Write-Host "Restauración terminada. Verifica el login y los conteos." -ForegroundColor Green
    }
} finally {
    Pop-Location
}
