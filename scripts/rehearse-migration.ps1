# Rehearses the pending migrations against a local copy of the real production
# rows, so a `db push` is never the first time a migration meets real data.
#
# ADR 0024 chose this over a second Supabase project. The failures it exists to
# catch are data-shape failures — SET NOT NULL against a column that has nulls,
# a UNIQUE index against rows that are duplicated, a FK or CHECK that existing
# rows violate. Every one of those passes against an empty database, which is
# why the rehearsal restores a real dump instead of a fixture.
#
# What a pass means: the migration APPLIES. It is not a green test suite —
# rlsInvariantsLiveDb and cleanupScoresLiveDb go through Supabase's HTTP API,
# which a bare PostgreSQL does not have. It is also not a statement about
# planner behaviour: the local server is PostgreSQL 18, the hosted one is 17.
#
# Prerequisites:
#   - A local PostgreSQL server, running. Installed for pg_dump already.
#   - An encrypted backup archive in db-backups/ — run `npm run db:backup` first.
#   - .env.local: BACKUP_ARCHIVE_PASSWORD (to open the archive) and
#     LOCAL_PGPASSWORD (the local postgres superuser). REHEARSAL_DB_URL overrides
#     the assumed postgresql://postgres@localhost:5432/postgres if the local
#     server lives somewhere else.
#
# This script never touches the hosted project. Its only relationship to
# production is reading an archive that already exists on this disk.
#
# Usage:  npm run db:rehearse
#         pwsh -File scripts/rehearse-migration.ps1
#         pwsh -File scripts/rehearse-migration.ps1 -ExtraMigration path\to\poison.sql

param(
    # A throwaway .sql applied after the pending migrations and never recorded
    # in the ledger. supabase/migrations/ is frozen until release day (ISSUE-05),
    # so this is how the loop is proven to be able to fail.
    [string]$ExtraMigration
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib\pg-tooling.ps1")

$RepoRoot      = Split-Path $PSScriptRoot -Parent
$EnvFile       = Join-Path $RepoRoot ".env.local"
$BackupsRoot   = Join-Path $RepoRoot "db-backups"
$MigrationsDir = Join-Path $RepoRoot "supabase\migrations"
$ShimFile      = Join-Path $PSScriptRoot "lib\rehearsal\auth-shim.sql"
$ScratchDb     = "greek_rehearsal"

# --- Preflight: client tools ---
$PgBin    = Find-PgBin
$Psql     = Join-Path $PgBin "psql.exe"
$SevenZip = Find-SevenZip

if (-not (Test-Path $Psql)) {
    throw "psql not found at $Psql — the PostgreSQL install appears incomplete. Try: choco install postgresql -y"
}

# --- Preflight: connection details ---
$Vars = Read-EnvFile $EnvFile

$ArchivePass = $Vars["BACKUP_ARCHIVE_PASSWORD"]
if (-not $ArchivePass) {
    throw "BACKUP_ARCHIVE_PASSWORD not found in .env.local — it is the password the backup archives were written with."
}

# Deliberately NOT SUPABASE_DB_URL / PGPASSWORD. Those point at production, and
# this script drops and recreates a database. Reading a different variable means
# a copy-paste slip cannot aim the DROP at the hosted project.
$AdminUrl = $Vars["REHEARSAL_DB_URL"]
if (-not $AdminUrl) {
    $localPass = $Vars["LOCAL_PGPASSWORD"]
    if ($localPass) {
        $AdminUrl = "postgresql://postgres:$localPass@localhost:5432/postgres"
    }
}
if (-not $AdminUrl) {
    throw @"
Neither LOCAL_PGPASSWORD nor REHEARSAL_DB_URL found in .env.local.

Add the local PostgreSQL superuser password (never the Supabase one — this script
drops a database):

    LOCAL_PGPASSWORD=<local-postgres-password>

Or, if the local server is not the default postgres@localhost:5432, set the whole
connection string instead:

    REHEARSAL_DB_URL=postgresql://postgres:<local-password>@localhost:5432/postgres
"@
}

if ($AdminUrl -notmatch '^postgresql://[^@]*@(localhost|127\.0\.0\.1)[:/]') {
    throw "REHEARSAL_DB_URL must point at localhost. Refusing to run against '$AdminUrl'."
}

$ScratchUrl = ($AdminUrl -replace '/[^/]+$', "/$ScratchDb")

$PsqlBase = @("--no-psqlrc", "-v", "ON_ERROR_STOP=1", "-P", "pager=off", "-q")

function Invoke-Psql {
    param(
        [Parameter(Mandatory)][string]$Url,
        [string]$Command,
        [string]$File,
        [switch]$SingleTransaction,
        [switch]$Tuples
    )

    $psqlArgs = @($PsqlBase)
    if ($SingleTransaction) { $psqlArgs += "--single-transaction" }
    if ($Tuples)            { $psqlArgs += @("-t", "-A") }
    if ($Command)           { $psqlArgs += @("-c", $Command) }
    if ($File)              { $psqlArgs += @("-f", $File) }

    # -w: never prompt. A missing password must fail with a message, not hang
    # behind an invisible prompt for a password nobody is there to type.
    $psqlArgs += @("-w", $Url)

    return (& $Psql @psqlArgs 2>&1)
}

# --- Preflight: is the local server actually up? ---
Write-Host "Rehearsing migrations against local PostgreSQL..."
$probe = Invoke-Psql -Url $AdminUrl -Command "SELECT 1" -Tuples
if ($LASTEXITCODE -ne 0) {
    throw @"
Cannot reach the local PostgreSQL server with REHEARSAL_DB_URL.

$($probe -join "`n")

Check the service is running:  Get-Service postgresql*
"@
}

# --- Locate the newest archive ---
$Archive = Get-ChildItem -File -Filter "*.7z" $BackupsRoot -ErrorAction SilentlyContinue |
           Sort-Object Name -Descending | Select-Object -First 1

if (-not $Archive) {
    throw @"
No .7z archive found in db-backups/.

Take a backup first:  npm run db:backup

A rehearsal against anything other than real production rows would pass exactly
the migrations that hurt, which is the whole reason this script exists.
"@
}

$Extracted = Join-Path ([System.IO.Path]::GetTempPath()) ("greek-rehearsal-" + [guid]::NewGuid().ToString("N"))

try {
    Write-Host "  Archive: $($Archive.Name)"
    & $SevenZip x "-p$ArchivePass" "-o$Extracted" $Archive.FullName -y | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "7z extraction failed (exit $LASTEXITCODE) — wrong BACKUP_ARCHIVE_PASSWORD?" }

    $SchemaSql = Get-ChildItem -Recurse -Filter "schema.sql" $Extracted | Select-Object -First 1
    $DataSql   = Get-ChildItem -Recurse -Filter "data.sql"   $Extracted | Select-Object -First 1
    if (-not $SchemaSql -or -not $DataSql) { throw "The archive does not contain schema.sql and data.sql." }

    # --- Selective restore ---
    # The dump is not schema-filtered: it carries auth, storage, realtime, vault
    # and Supabase-only CREATE EXTENSION lines that a stock PostgreSQL cannot
    # run. Replaying the whole file and tolerating the errors would be worse
    # than useless — a restore that prints expected errors is a restore that
    # hides unexpected ones. So the blocks are filtered by the schema named in
    # pg_dump's own object headers, and everything applies with ON_ERROR_STOP.
    function Select-DumpBlocks {
        param(
            [Parameter(Mandatory)][string]$Path,
            [Parameter(Mandatory)][string[]]$Schemas,
            [string[]]$SkipTypes = @()
        )

        $lines = Get-Content -LiteralPath $Path
        $out   = New-Object System.Collections.Generic.List[string]
        $keep  = $true   # the SET preamble, before the first object header

        for ($i = 0; $i -lt $lines.Count; $i++) {
            $line = $lines[$i]

            # pg_dump delimits every object with a three-line comment:
            #   --
            #   -- Name: foo; Type: TABLE; Schema: public; Owner: postgres
            #   --
            if ($line -eq '--' -and ($i + 2) -lt $lines.Count -and $lines[$i + 2] -eq '--' -and
                $lines[$i + 1] -match '^--.*Type: (?<type>[^;]+); Schema: (?<schema>[^;]+)') {
                $type   = $Matches['type'].Trim()
                $schema = $Matches['schema'].Trim()
                $keep   = ($Schemas -contains $schema) -and ($SkipTypes -notcontains $type)
                $i += 2
                continue
            }

            # \restrict / \unrestrict are psql meta-commands pg_dump 18 wraps the
            # file in; the closing one lives in a block we may have dropped.
            if ($line -like '\restrict*' -or $line -like '\unrestrict*') { continue }

            if ($keep) {
                # Ownership is a hosted-project concern. Locally these roles do
                # not exist and nothing about a data-shape failure depends on them.
                if ($line -match '^ALTER .+ OWNER TO ') { continue }
                $out.Add($line)
            }
        }

        return $out
    }

    Write-Host "  Recreating scratch database '$ScratchDb'..."
    Invoke-Psql -Url $AdminUrl -Command "DROP DATABASE IF EXISTS $ScratchDb WITH (FORCE)" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not drop $ScratchDb." }
    Invoke-Psql -Url $AdminUrl -Command "CREATE DATABASE $ScratchDb" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not create $ScratchDb." }

    Write-Host "  Applying the auth shim..."
    $shimOut = Invoke-Psql -Url $ScratchUrl -File $ShimFile
    if ($LASTEXITCODE -ne 0) { throw "Shim failed:`n$($shimOut -join "`n")" }

    $RestoreSchema = Join-Path $Extracted "restore-schema.sql"
    $RestoreData   = Join-Path $Extracted "restore-data.sql"
    $RestoreUsers  = Join-Path $Extracted "restore-auth-users.sql"

    Select-DumpBlocks -Path $SchemaSql.FullName -Schemas @("public", "supabase_migrations") `
                      -SkipTypes @("ACL", "DEFAULT ACL", "COMMENT") |
        Set-Content -LiteralPath $RestoreSchema -Encoding utf8

    Select-DumpBlocks -Path $DataSql.FullName -Schemas @("public", "supabase_migrations") |
        Set-Content -LiteralPath $RestoreData -Encoding utf8

    # The ids behind every auth.users foreign key, and nothing else. Column 2 of
    # the COPY is `id`; the emails in column 5 stay in the archive where they
    # belong. Without these rows the public data would fail its own FKs.
    $userIds = New-Object System.Collections.Generic.List[string]
    $inUsers = $false
    foreach ($line in Get-Content -LiteralPath $DataSql.FullName) {
        if ($line -match '^COPY auth\.users \(') { $inUsers = $true; continue }
        if ($inUsers) {
            if ($line -eq '\.') { break }
            $fields = $line -split "`t"
            if ($fields.Count -gt 1 -and $fields[1] -match '^[0-9a-fA-F-]{36}$') {
                $userIds.Add("INSERT INTO auth.users (id) VALUES ('$($fields[1])') ON CONFLICT DO NOTHING;")
            }
        }
    }
    Set-Content -LiteralPath $RestoreUsers -Value $userIds -Encoding utf8

    Write-Host "  Restoring public schema..."
    $schemaOut = Invoke-Psql -Url $ScratchUrl -File $RestoreSchema
    if ($LASTEXITCODE -ne 0) { throw "Schema restore failed:`n$($schemaOut -join "`n")" }

    Write-Host "  Restoring $($userIds.Count) auth.users id(s)..."
    $usersOut = Invoke-Psql -Url $ScratchUrl -File $RestoreUsers
    if ($LASTEXITCODE -ne 0) { throw "auth.users restore failed:`n$($usersOut -join "`n")" }

    Write-Host "  Restoring public data..."
    $dataOut = Invoke-Psql -Url $ScratchUrl -File $RestoreData
    if ($LASTEXITCODE -ne 0) { throw "Data restore failed:`n$($dataOut -join "`n")" }

    # --- Which migrations has the restored database not seen? ---
    $applied = Invoke-Psql -Url $ScratchUrl -Tuples `
                           -Command "SELECT version FROM supabase_migrations.schema_migrations" |
               Where-Object { $_ -match '^\d+$' }
    if ($LASTEXITCODE -ne 0) { throw "Could not read the migration ledger." }

    $pending = Get-ChildItem -File -Filter "*.sql" $MigrationsDir | Sort-Object Name | Where-Object {
        $version = ($_.Name -split '_')[0]
        $applied -notcontains $version
    }

    Write-Host ""
    Write-Host "Restored: $($applied.Count) migration(s) already applied. Pending: $($pending.Count)."

    # --- Apply the pending migrations, each in its own transaction ---
    # Each on its own so a failure rolls back cleanly and the ones before it
    # stay applied — the report then says exactly how far the release-day queue
    # would have got before it stopped.
    $Failed = $null
    foreach ($m in $pending) {
        Write-Host "  Applying $($m.Name)..."
        $out = Invoke-Psql -Url $ScratchUrl -File $m.FullName -SingleTransaction
        if ($LASTEXITCODE -ne 0) {
            $Failed = @{ Name = $m.Name; Path = $m.FullName; Output = $out }
            break
        }
        $version = ($m.Name -split '_')[0]
        Invoke-Psql -Url $ScratchUrl -Command @"
INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('$version')
ON CONFLICT DO NOTHING
"@ | Out-Null
    }

    if (-not $Failed -and $ExtraMigration) {
        if (-not (Test-Path $ExtraMigration)) { throw "-ExtraMigration not found: $ExtraMigration" }
        $extra = Get-Item $ExtraMigration
        Write-Host "  Applying throwaway migration $($extra.Name)..."
        $out = Invoke-Psql -Url $ScratchUrl -File $extra.FullName -SingleTransaction
        if ($LASTEXITCODE -ne 0) {
            $Failed = @{ Name = $extra.Name; Path = $extra.FullName; Output = $out }
        }
    }

    Write-Host ""
    if ($Failed) {
        Write-Host "REHEARSAL FAILED — $($Failed.Name)" -ForegroundColor Red
        Write-Host ""
        Write-Host ($Failed.Output -join "`n")

        # psql reports the file and line; turn that into the statement itself,
        # because "line 14 of a migration you have not opened" is not an answer.
        $lineNo = ($Failed.Output | ForEach-Object {
            if ($_ -match ':(\d+): ERROR') { [int]$Matches[1] }
        } | Select-Object -First 1)

        if ($lineNo) {
            $sql   = Get-Content -LiteralPath $Failed.Path
            $start = $lineNo - 1
            while ($start -gt 0 -and $sql[$start - 1] -notmatch ';\s*$') { $start-- }
            $end = $lineNo - 1
            while ($end -lt ($sql.Count - 1) -and $sql[$end] -notmatch ';\s*$') { $end++ }

            # Leading comment lines belong to whatever came before; the statement
            # starts at the first line that is actually SQL.
            $statement = $sql[$start..$end] | Where-Object { $_.Trim() }
            while ($statement.Count -gt 1 -and $statement[0].TrimStart().StartsWith('--')) {
                $statement = $statement[1..($statement.Count - 1)]
            }

            Write-Host "Failing statement ($($Failed.Name), line $lineNo):" -ForegroundColor Red
            Write-Host ($statement -join "`n")
        }

        Write-Host ""
        Write-Host "Do not push this migration. Fix it, then rehearse again."
        exit 1
    }

    Write-Host "REHEARSAL PASSED — every pending migration applied against real rows."
    Write-Host "This means the migrations APPLY. It is not a statement about RLS behaviour"
    Write-Host "or query plans; the local server is PostgreSQL 18 and the hosted one is 17."
}
finally {
    # On failure too. The archive is encrypted precisely so its contents — every
    # player's email among them — do not sit unencrypted in a temp directory.
    if (Test-Path $Extracted) {
        Remove-Item -Recurse -Force $Extracted
        Write-Host ""
        Write-Host "Extracted dump deleted: $Extracted"
    }
}
