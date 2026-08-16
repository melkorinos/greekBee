# Registers a weekly Windows Scheduled Task that runs scripts/backup-db.ps1.
# Run once per machine, as Administrator.
#
# Usage:  npm run db:backup:schedule-weekly
#
# Run this only AFTER BACKUP_ARCHIVE_PASSWORD is set in .env.local and one manual
# `npm run db:backup` has produced an archive you have opened. Registering it first
# creates a job that fails every Sunday at 02:00 unattended, which is worse than no
# job at all — it looks like coverage.
#
# To remove:  Unregister-ScheduledTask -TaskName "GreekWordGames-DB-Backup" -Confirm:$false

$ErrorActionPreference = "Stop"

$RepoRoot  = Split-Path $PSScriptRoot -Parent
$TaskName  = "GreekWordGames-DB-Backup"
$ScriptPath = Join-Path $RepoRoot "scripts\backup-db.ps1"

if (-not (Test-Path $ScriptPath)) {
    throw "Backup script not found at $ScriptPath"
}

$Action   = New-ScheduledTaskAction `
              -Execute "pwsh" `
              -Argument "-NonInteractive -File `"$ScriptPath`"" `
              -WorkingDirectory $RepoRoot

$Trigger  = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "02:00"

$Settings = New-ScheduledTaskSettingsSet `
              -StartWhenAvailable `
              -ExecutionTimeLimit (New-TimeSpan -Minutes 15)

if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Replaced existing task."
}

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action   $Action `
  -Trigger  $Trigger `
  -Settings $Settings `
  -RunLevel Highest | Out-Null

Write-Host "Scheduled task '$TaskName' registered — runs every Sunday at 02:00."
Write-Host "To remove:  Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
