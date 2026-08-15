# Dumps Supabase Postgres (roles + schema + data) to db-backups/<timestamp>/,
# then packs that folder into an AES-256 encrypted archive db-backups/<timestamp>.7z.
# Reads SUPABASE_DB_URL from .env.local (session-pooler URI, port 5432).
# Keeps the 2 most recent backups (folder + archive); prunes older ones automatically.
#
# THE ARCHIVE IS THE ARTIFACT — upload it, not the folder. A full dump carries
# `auth.users`, so it holds the email address of every player who signed in with
# Google, next to their scores and device UUIDs. That is why it is encrypted and why
# `db-backups/` is in .gitignore. THIS REPOSITORY IS PUBLIC: never commit a dump or
# an archive, and never `git add -f` your way past the ignore rule — git history
# survives a delete, so a single mistaken commit publishes those emails permanently.
# Destination is a private Google Drive folder (TICKET-11 / ISSUE-01).
#
# Prerequisites:
#   - PostgreSQL client tools installed (pg_dump / pg_dumpall in Program Files)
#     Installed via: choco install postgresql -y
#   - 7-Zip installed (7z.exe) — winget install 7zip.7zip
#   - SUPABASE_DB_URL set in .env.local
#     (Supabase Dashboard → Settings → Database → Connect → Session pooler → URI)
#   - BACKUP_ARCHIVE_PASSWORD set in .env.local, and stored somewhere that is NOT
#     this machine (a password manager). An encrypted archive whose password died
#     with the laptop is a brick.
#
# Usage:  npm run db:backup
#         pwsh -File scripts/backup-db.ps1

$ErrorActionPreference = "Stop"

$RepoRoot  = Split-Path $PSScriptRoot -Parent
$EnvFile   = Join-Path $RepoRoot ".env.local"

# --- Preflight: locate pg_dump / pg_dumpall ---
$PgBin = Get-ChildItem "C:\Program Files\PostgreSQL" -ErrorAction SilentlyContinue |
         Sort-Object Name -Descending | Select-Object -First 1 |
         ForEach-Object { Join-Path $_.FullName "bin" }

# Fall back to PATH if not found under Program Files
if (-not $PgBin -or -not (Test-Path "$PgBin\pg_dump.exe")) {
    $PgBin = Split-Path (Get-Command pg_dump -ErrorAction SilentlyContinue).Source -Parent
}

if (-not $PgBin -or -not (Test-Path "$PgBin\pg_dump.exe")) {
    throw @"
pg_dump not found. Install PostgreSQL client tools then retry:

    choco install postgresql -y          # requires admin PowerShell

If Chocolatey is not installed:
    winget install chocolatey.chocolatey
    choco install postgresql -y
"@
}

$PgDump    = "$PgBin\pg_dump.exe"
$PgDumpAll = "$PgBin\pg_dumpall.exe"

if (-not (Test-Path $PgDumpAll)) {
    throw "pg_dumpall not found at $PgDumpAll — PostgreSQL install appears incomplete. Try: choco install postgresql -y"
}

# --- Preflight: locate 7-Zip ---
# Checked BEFORE the dumps run, not after: failing at the end would leave three
# plaintext .sql files on disk and report an error, which is the worst of both.
$SevenZip = @(
    "C:\Program Files\7-Zip\7z.exe",
    "C:\Program Files (x86)\7-Zip\7z.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $SevenZip) {
    $SevenZip = (Get-Command 7z -ErrorAction SilentlyContinue).Source
}

if (-not $SevenZip) {
    throw @"
7z not found. Install 7-Zip then retry:

    winget install 7zip.7zip

The archive step is not optional — an unencrypted dump must not leave this machine.
"@
}

# --- Read connection string ---
if (-not (Test-Path $EnvFile)) {
    throw ".env.local not found at $EnvFile`nAdd:  SUPABASE_DB_URL=<session-pooler-url>"
}

$Vars = @{}
foreach ($line in Get-Content $EnvFile) {
    if ($line -match '^([^#][^=]*)=(.+)$') {
        $Vars[$Matches[1].Trim()] = $Matches[2].Trim().Trim('"').Trim("'")
    }
}

$Conn = $Vars["SUPABASE_DB_URL"]
if (-not $Conn) { throw "SUPABASE_DB_URL not found in .env.local" }

$PgPass = $Vars["PGPASSWORD"]
if (-not $PgPass) { throw "PGPASSWORD not found in .env.local" }

# Read the archive password up front and refuse to continue without it. Falling
# back to an unencrypted archive would be the dangerous kind of convenience: the
# backup would look successful and would be readable by anyone who reached it.
$ArchivePass = $Vars["BACKUP_ARCHIVE_PASSWORD"]
if (-not $ArchivePass) {
    throw @"
BACKUP_ARCHIVE_PASSWORD not found in .env.local.

Add a strong password there, and store the same password in a password manager —
NOT only on this machine. The archive is unrecoverable without it.
"@
}

# Parse host/port/user/db from the URI
if ($Conn -match '^postgresql://([^:]+):[^@]+@([^:]+):(\d+)/(.+)$') {
    $PgUser = $Matches[1]
    $PgHost = $Matches[2]
    $PgPort = $Matches[3]
    $PgDb   = $Matches[4]
} else {
    throw "SUPABASE_DB_URL is not a valid postgresql:// URI"
}

$env:PGPASSWORD = $PgPass

# --- Create timestamped folder ---
$TS        = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = Join-Path $RepoRoot "db-backups\$TS"
New-Item -ItemType Directory -Path $BackupDir | Out-Null
Write-Host "Backing up to: $BackupDir"

# --- Run the three dumps ---
$ConnArgs = @("-h", $PgHost, "-p", $PgPort, "-U", $PgUser, "-d", $PgDb)

$Dumps = @(
    @{ Cmd = $PgDumpAll; Args = (@("-h", $PgHost, "-p", $PgPort, "-U", $PgUser, "--roles-only", "--no-role-passwords")); File = "roles.sql"  }
    @{ Cmd = $PgDump;    Args = (@($ConnArgs) + "--schema-only");                                                          File = "schema.sql" }
    @{ Cmd = $PgDump;    Args = (@($ConnArgs) + "--data-only");                                                            File = "data.sql"   }
)

foreach ($d in $Dumps) {
    $OutFile = Join-Path $BackupDir $d.File
    Write-Host "  Dumping $($d.File)..."

    $dArgs = $d.Args
    & $d.Cmd @dArgs -f $OutFile

    if ($LASTEXITCODE -ne 0) { throw "$($d.File) dump failed (exit $LASTEXITCODE)" }

    $Bytes = (Get-Item $OutFile).Length
    if ($Bytes -lt 100) { throw "$($d.File) is suspiciously small ($Bytes bytes) — check the connection string" }
    Write-Host "    OK ($Bytes bytes)"
}

$env:PGPASSWORD = ""
Write-Host "Backup complete: $BackupDir"

# --- Encrypt: one AES-256 archive of the whole folder ---
# -mhe=on encrypts the HEADER as well as the contents. Without it the file names
# and sizes stay readable in the archive listing, which advertises exactly what is
# inside to anyone who gets hold of it.
$BackupsRoot = Join-Path $RepoRoot "db-backups"
$Archive     = Join-Path $BackupsRoot "$TS.7z"

Write-Host "  Encrypting archive..."
& $SevenZip a -t7z -mhe=on "-p$ArchivePass" $Archive $BackupDir | Out-Null

if ($LASTEXITCODE -ne 0) { throw "7z archive failed (exit $LASTEXITCODE)" }
if (-not (Test-Path $Archive)) { throw "7z reported success but $Archive does not exist" }

$ArchiveBytes = (Get-Item $Archive).Length
Write-Host "    OK ($ArchiveBytes bytes)"

# --- Prune: keep only the 2 most recent, folders and archives alike ---
$All = Get-ChildItem -Directory $BackupsRoot | Sort-Object Name -Descending
if ($All.Count -gt 2) {
    $All | Select-Object -Skip 2 | ForEach-Object {
        Write-Host "Pruning old backup: $($_.Name)"
        Remove-Item -Recurse -Force $_.FullName
    }
}

# Archives prune on the same keep-2 rule. Kept as a separate pass rather than
# folded into the loop above, because a folder and its archive can go missing
# independently — a folder deleted by hand must not strand its archive forever.
$AllArchives = Get-ChildItem -File -Filter "*.7z" $BackupsRoot | Sort-Object Name -Descending
if ($AllArchives.Count -gt 2) {
    $AllArchives | Select-Object -Skip 2 | ForEach-Object {
        Write-Host "Pruning old archive: $($_.Name)"
        Remove-Item -Force $_.FullName
    }
}

Write-Host ""
Write-Host "NEXT: upload this archive to the private Google Drive backup folder —"
Write-Host "      $Archive"
Write-Host "      Nothing here leaves the machine on its own, and a dump that stays"
Write-Host "      on the machine it protects is not a backup."
