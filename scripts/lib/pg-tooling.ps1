# Shared preflight helpers for the scripts that talk to PostgreSQL and to the
# encrypted backup archives: backup-db.ps1 (writes them) and
# rehearse-migration.ps1 (reads them back).
#
# Dot-source it:  . (Join-Path $PSScriptRoot "lib\pg-tooling.ps1")
#
# It exists because both scripts need the same three answers — where the
# PostgreSQL client tools are, where 7-Zip is, and what is in .env.local — and
# two divergent copies of a preflight is exactly the drift that leaves one
# script working and the other failing with a message nobody has read in months.

function Read-EnvFile {
    param([Parameter(Mandatory)][string]$Path)

    if (-not (Test-Path $Path)) {
        throw ".env.local not found at $Path"
    }

    $vars = @{}
    foreach ($line in Get-Content $Path) {
        if ($line -match '^([^#][^=]*)=(.+)$') {
            $vars[$Matches[1].Trim()] = $Matches[2].Trim().Trim('"').Trim("'")
        }
    }
    return $vars
}

# Newest PostgreSQL install under Program Files, falling back to PATH.
# Returns the bin directory; throws with the install command if absent.
function Find-PgBin {
    $bin = Get-ChildItem "C:\Program Files\PostgreSQL" -ErrorAction SilentlyContinue |
           Sort-Object Name -Descending | Select-Object -First 1 |
           ForEach-Object { Join-Path $_.FullName "bin" }

    if (-not $bin -or -not (Test-Path "$bin\pg_dump.exe")) {
        $onPath = (Get-Command pg_dump -ErrorAction SilentlyContinue).Source
        if ($onPath) { $bin = Split-Path $onPath -Parent }
    }

    if (-not $bin -or -not (Test-Path "$bin\pg_dump.exe")) {
        throw @"
pg_dump not found. Install PostgreSQL client tools then retry:

    choco install postgresql -y          # requires admin PowerShell

If Chocolatey is not installed:
    winget install chocolatey.chocolatey
    choco install postgresql -y
"@
    }

    return $bin
}

function Find-SevenZip {
    $sevenZip = @(
        "C:\Program Files\7-Zip\7z.exe",
        "C:\Program Files (x86)\7-Zip\7z.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1

    if (-not $sevenZip) {
        $sevenZip = (Get-Command 7z -ErrorAction SilentlyContinue).Source
    }

    if (-not $sevenZip) {
        throw @"
7z not found. Install 7-Zip then retry:

    winget install 7zip.7zip

The archive step is not optional — an unencrypted dump must not leave this machine.
"@
    }

    return $sevenZip
}
