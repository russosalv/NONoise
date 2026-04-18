<#
.SYNOPSIS
    Switch every active workspace sub-repository onto a specified branch.

.DESCRIPTION
    This script checks out the given branch in every repository declared
    (with status "active") in repositories.json. If the branch does not
    exist locally, it is searched on the remote. If it does not exist
    on the remote either, it is created from the current branch (or
    from -BaseBranch if provided).

    Uncommitted changes are auto-stashed before the checkout.

.PARAMETER BranchName
    Name of the branch to switch onto.

.PARAMETER BaseBranch
    Base branch used when creating a new branch. Defaults to the current branch.

.PARAMETER FetchFirst
    If set, runs `git fetch` before every operation.

.EXAMPLE
    ./scripts/switch-branch.ps1 -BranchName "feature/123-new-feature"
    Switches all sub-repos onto feature/123-new-feature (creating it if missing).

.EXAMPLE
    ./scripts/switch-branch.ps1 -BranchName "feature/123-new-feature" -BaseBranch "develop" -FetchFirst
    Creates the branch from develop after fetching first.

.NOTES
    Part of the NONoise multi-repo workspace template.
    Requires: git installed and configured.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$BranchName,

    [Parameter(Mandatory = $false)]
    [string]$BaseBranch,

    [Parameter(Mandatory = $false)]
    [switch]$FetchFirst
)

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

function Switch-RepositoryBranch {
    param(
        [string]$Name,
        [string]$RepoPath,
        [string]$TargetBranch,
        [string]$Base,
        [bool]$Fetch
    )

    $fullPath = Join-Path $reposRoot $RepoPath

    if (-not (Test-Path (Join-Path $fullPath ".git"))) {
        Write-Warn "Not a git repository (skip): $Name [$fullPath]"
        return "skip"
    }

    Push-Location $fullPath
    try {
        # Check for uncommitted changes
        $status = git status --porcelain 2>&1
        if ($status) {
            Write-Warn "$Name - uncommitted changes, auto-stash"
            git stash push -m "auto-stash before switch to $TargetBranch" 2>&1 | Out-Null
        }

        # Fetch if requested
        if ($Fetch) {
            Write-Info "$Name - fetching..."
            git fetch origin 2>&1 | Out-Null
        }

        # Check for a local branch
        $localExists = git branch --list $TargetBranch 2>&1
        if ($localExists) {
            git checkout $TargetBranch 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "$Name -> $TargetBranch (local)"
                return "switched"
            }
            else {
                Write-Err "$Name - local checkout failed for $TargetBranch"
                return "error"
            }
        }

        # Check for a remote branch
        $remoteExists = git ls-remote --heads origin $TargetBranch 2>&1
        if ($remoteExists -match $TargetBranch) {
            git checkout -b $TargetBranch "origin/$TargetBranch" 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "$Name -> $TargetBranch (from remote)"
                return "tracked"
            }
            else {
                Write-Err "$Name - remote checkout failed for $TargetBranch"
                return "error"
            }
        }

        # Branch does not exist: create it
        if ($Base) {
            $baseLocalExists  = git branch --list $Base 2>&1
            $baseRemoteExists = git ls-remote --heads origin $Base 2>&1
            if ($baseLocalExists) {
                git checkout $Base 2>&1 | Out-Null
            }
            elseif ($baseRemoteExists -match $Base) {
                git checkout -b $Base "origin/$Base" 2>&1 | Out-Null
            }
            else {
                Write-Warn "$Name - base branch '$Base' not found, using current branch"
            }
        }

        git checkout -b $TargetBranch 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "$Name -> $TargetBranch (CREATED)"
            return "created"
        }
        else {
            Write-Err "$Name - failed to create branch $TargetBranch"
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

Write-Header "NONoise multi-repo - Switch Branch"

Write-Info "Target branch:  $BranchName"
if ($BaseBranch) { Write-Info "Base branch:    $BaseBranch" }
if ($FetchFirst) { Write-Info "Fetch:          enabled" }
Write-Info "Workspace root: $RootPath"

$repositories = Get-RepositoryConfiguration -ConfigPath $configFile
Write-Info "Active repositories: $($repositories.Count)"
Write-Host ""

$switched = 0
$tracked  = 0
$created  = 0
$skipped  = 0
$errors   = 0
$results  = @()

foreach ($repo in $repositories) {
    $result = Switch-RepositoryBranch `
        -Name $repo.Name `
        -RepoPath $repo.Path `
        -TargetBranch $BranchName `
        -Base $BaseBranch `
        -Fetch $FetchFirst.IsPresent

    $results += @{ Name = $repo.Name; Result = $result }

    switch ($result) {
        "switched" { $switched++ }
        "tracked"  { $tracked++ }
        "created"  { $created++ }
        "skip"     { $skipped++ }
        "error"    { $errors++ }
    }
}

Write-Header "Summary"
Write-Host "Branch: $BranchName" -ForegroundColor White
Write-Host "Repositories processed: $($repositories.Count)" -ForegroundColor White
Write-Host ""

if ($switched -gt 0) { Write-Success "Checkout local:    $switched" }
if ($tracked  -gt 0) { Write-Success "Checkout remote:   $tracked" }
if ($created  -gt 0) { Write-Success "Branches created:  $created" }
if ($skipped  -gt 0) { Write-Warn    "Skipped:           $skipped" }
if ($errors   -gt 0) { Write-Err     "Errors:            $errors" }

Write-Host ""

$errorRepos = $results | Where-Object { $_.Result -eq "error" }
if ($errorRepos) {
    Write-Warn "Repositories with errors:"
    foreach ($r in $errorRepos) {
        Write-Host "  - $($r.Name)" -ForegroundColor Red
    }
    Write-Host ""
}

if ($errors -eq 0) {
    Write-Host "All repositories are on '$BranchName'." -ForegroundColor Green
}

Write-Host ""
