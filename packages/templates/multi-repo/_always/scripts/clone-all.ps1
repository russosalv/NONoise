<#
.SYNOPSIS
    Clone every active sub-repository declared in repositories.json.

.DESCRIPTION
    Reads repositories.json at the workspace root, iterates the repositories
    whose status is "active", and clones each one under repos/<path>.
    Sub-repos already cloned are skipped (detected via a .git directory).

.EXAMPLE
    ./scripts/clone-all.ps1

.NOTES
    Part of the NONoise multi-repo workspace template.
    Workspace-centric: this script never writes skill files inside the
    cloned sub-repositories.
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
                Url    = $repo.url
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

function Clone-Repository {
    param(
        [string]$Name,
        [string]$Url,
        [string]$RepoPath,
        [string]$Branch
    )

    $fullPath = Join-Path $reposRoot $RepoPath

    if (Test-Path (Join-Path $fullPath ".git")) {
        Write-Warn "$Name - already cloned (skip): repos/$RepoPath"
        return "skip"
    }

    $parentDir = Split-Path -Parent $fullPath
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }

    Write-Info "$Name - cloning $Url -> repos/$RepoPath (branch $Branch)"
    if ($Branch) {
        git clone -b $Branch $Url $fullPath 2>&1 | Out-Null
    } else {
        git clone $Url $fullPath 2>&1 | Out-Null
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Success "$Name - cloned"
        return "cloned"
    } else {
        Write-Err "$Name - clone failed"
        return "error"
    }
}

# ============================================================================
# MAIN
# ============================================================================

Write-Header "NONoise multi-repo - Clone All"

Write-Info "Workspace root: $RootPath"
Write-Info "Config file:    $configFile"
Write-Info "Repos root:     $reposRoot"

if (-not (Test-Path $reposRoot)) {
    New-Item -ItemType Directory -Path $reposRoot -Force | Out-Null
}

$repositories = Get-RepositoryConfiguration -ConfigPath $configFile
Write-Info "Active repositories: $($repositories.Count)"
Write-Host ""

$cloned  = 0
$skipped = 0
$errors  = 0
$errorNames = @()

foreach ($repo in $repositories) {
    $result = Clone-Repository -Name $repo.Name -Url $repo.Url -RepoPath $repo.Path -Branch $repo.Branch
    switch ($result) {
        "cloned" { $cloned++ }
        "skip"   { $skipped++ }
        "error"  { $errors++; $errorNames += $repo.Name }
    }
}

Write-Header "Summary"
Write-Host "Workspace:            $RootPath" -ForegroundColor White
Write-Host "Repositories scanned: $($repositories.Count)" -ForegroundColor White
Write-Host ""
if ($cloned  -gt 0) { Write-Success "Cloned:  $cloned" }
if ($skipped -gt 0) { Write-Warn    "Skipped: $skipped" }
if ($errors  -gt 0) { Write-Err     "Errors:  $errors" }

if ($errorNames.Count -gt 0) {
    Write-Host ""
    Write-Warn "Repositories with errors:"
    foreach ($n in $errorNames) { Write-Host "  - $n" -ForegroundColor Red }
}

Write-Host ""
if ($errors -eq 0) {
    Write-Host "All active repositories are cloned." -ForegroundColor Green
}
Write-Host ""
