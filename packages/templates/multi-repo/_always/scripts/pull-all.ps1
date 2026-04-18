<#
.SYNOPSIS
    Fast-forward pull every active workspace sub-repository.

.DESCRIPTION
    Iterates the active repositories declared in repositories.json and
    runs `git pull --ff-only` in each one. Sub-repos that are not
    initialized (no .git directory) are skipped.

.EXAMPLE
    ./scripts/pull-all.ps1

.NOTES
    Part of the NONoise multi-repo workspace template.
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

# ============================================================================
# CONFIGURATION
# ============================================================================

$RootPath   = Split-Path -Parent $PSScriptRoot
$configFile = Join-Path $RootPath "repositories.json"
$reposRoot  = Join-Path $RootPath "repos"

# ============================================================================
# HELPERS
# ============================================================================

function Write-Header {
    param([string]$Text)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " $Text" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
}

function Write-Success { param([string]$Text) Write-Host "[OK] $Text" -ForegroundColor Green }
function Write-Info    { param([string]$Text) Write-Host "[..] $Text" -ForegroundColor Blue }
function Write-Warn    { param([string]$Text) Write-Host "[!!] $Text" -ForegroundColor Yellow }
function Write-Err     { param([string]$Text) Write-Host "[XX] $Text" -ForegroundColor Red }

function Get-RepositoryConfiguration {
    param([string]$ConfigPath)

    if (-not (Test-Path $ConfigPath)) {
        Write-Err "Configuration file not found: $ConfigPath"
        exit 1
    }

    try {
        $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
        $repositories = @()
        foreach ($repo in $config.repositories) {
            if ($repo.status -and $repo.status -ne "active") { continue }
            $repositories += @{
                Name   = $repo.name
                Path   = $repo.path
                Branch = $repo.branch
            }
        }
        return $repositories
    }
    catch {
        Write-Err "Error parsing configuration file: $_"
        exit 1
    }
}

function Pull-Repository {
    param(
        [string]$Name,
        [string]$RepoPath
    )

    $fullPath = Join-Path $reposRoot $RepoPath

    if (-not (Test-Path (Join-Path $fullPath ".git"))) {
        Write-Warn "$Name - not a git repository (skip): repos/$RepoPath"
        return "skip"
    }

    Push-Location $fullPath
    try {
        Write-Info "$Name - pulling..."
        git pull --ff-only 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "$Name - up to date"
            return "pulled"
        } else {
            Write-Err "$Name - pull failed"
            return "error"
        }
    }
    catch {
        Write-Err "$Name - exception: $_"
        return "error"
    }
    finally {
        Pop-Location
    }
}

# ============================================================================
# MAIN
# ============================================================================

Write-Header "NONoise multi-repo - Pull All"

Write-Info "Workspace root: $RootPath"

$repositories = Get-RepositoryConfiguration -ConfigPath $configFile
Write-Info "Active repositories: $($repositories.Count)"
Write-Host ""

$pulled  = 0
$skipped = 0
$errors  = 0
$errorNames = @()

foreach ($repo in $repositories) {
    $result = Pull-Repository -Name $repo.Name -RepoPath $repo.Path
    switch ($result) {
        "pulled" { $pulled++ }
        "skip"   { $skipped++ }
        "error"  { $errors++; $errorNames += $repo.Name }
    }
}

Write-Header "Summary"
Write-Host "Repositories processed: $($repositories.Count)" -ForegroundColor White
Write-Host ""
if ($pulled  -gt 0) { Write-Success "Pulled:  $pulled" }
if ($skipped -gt 0) { Write-Warn    "Skipped: $skipped" }
if ($errors  -gt 0) { Write-Err     "Errors:  $errors" }

if ($errorNames.Count -gt 0) {
    Write-Host ""
    Write-Warn "Repositories with errors:"
    foreach ($n in $errorNames) { Write-Host "  - $n" -ForegroundColor Red }
}

Write-Host ""
if ($errors -eq 0) {
    Write-Host "All active repositories are up to date." -ForegroundColor Green
}
Write-Host ""
