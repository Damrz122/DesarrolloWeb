[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$BackupRoot = (Join-Path $env:USERPROFILE "ElectronixBackups"),
    [int]$EveryMinutes = 15,
    [int]$KeepDays = 30,
    [string]$TaskName = "Electronix - respaldo automatico"
)

$ErrorActionPreference = "Stop"
if ($EveryMinutes -lt 5) { throw "EveryMinutes debe ser 5 o mayor." }

$scriptPath = Join-Path $PSScriptRoot "Backup-Electronix.ps1"
$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -BackupRoot `"$BackupRoot`" -KeepDays $KeepDays"
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument $arguments
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) -RepetitionDuration (New-TimeSpan -Days 3650)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew

if ($PSCmdlet.ShouldProcess($TaskName, "registrar respaldo cada $EveryMinutes minutos")) {
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
    Write-Host "Tarea instalada: $TaskName" -ForegroundColor Green
}
