# Dumps Supabase Postgres (roles + schema + data) to db-backups/<timestamp>/.
# Reads SUPABASE_DB_URL from .env.local (session-pooler URI, port 5432).
# Keeps the 2 most recent backup folders; prunes older ones automatically.
#
# Prerequisites:
#   - PostgreSQL client tools installed (pg_dump / pg_dumpall in Program Files)
#     Installed via: choco install postgresql -y
#   - SUPABASE_DB_URL set in .env.local
#     (Supabase Dashboard → Settings → Database → Connect → Session pooler → URI)
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

# --- Prune: keep only the 2 most recent ---
$BackupsRoot = Join-Path $RepoRoot "db-backups"
$All = Get-ChildItem -Directory $BackupsRoot | Sort-Object Name -Descending
if ($All.Count -gt 2) {
    $All | Select-Object -Skip 2 | ForEach-Object {
        Write-Host "Pruning old backup: $($_.Name)"
        Remove-Item -Recurse -Force $_.FullName
    }
}
