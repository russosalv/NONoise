#!/usr/bin/env bash
# Switch every active workspace sub-repository onto a specified branch.
# Part of the NONoise multi-repo workspace template.
#
# Usage:
#   ./scripts/switch-branch.sh <branch-name> [--base <base-branch>] [--fetch]
#
# Requires: git. Prefers `jq` for JSON parsing; falls back to python3 if
# jq is absent. Exits early if neither is available.

set -euo pipefail

# ============================================================================
# ARG PARSING
# ============================================================================

BRANCH_NAME=""
BASE_BRANCH=""
FETCH_FIRST=0

print_usage() {
    cat <<'EOF'
Usage: switch-branch.sh <branch-name> [--base <base-branch>] [--fetch]

Options:
  --base <branch>   Base branch used when creating a new branch.
                    Defaults to the current branch in each sub-repo.
  --fetch           Run `git fetch origin` before each operation.
  -h, --help        Show this help.
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
        -h|--help)
            print_usage; exit 0
            ;;
        --base)
            BASE_BRANCH="${2:-}"; shift 2
            ;;
        --fetch)
            FETCH_FIRST=1; shift
            ;;
        -*)
            echo "Unknown option: $1" >&2
            print_usage
            exit 2
            ;;
        *)
            if [ -z "$BRANCH_NAME" ]; then
                BRANCH_NAME="$1"
            else
                echo "Unexpected positional argument: $1" >&2
                print_usage
                exit 2
            fi
            shift
            ;;
    esac
done

if [ -z "$BRANCH_NAME" ]; then
    echo "Error: <branch-name> is required." >&2
    print_usage
    exit 2
fi

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_PATH="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$ROOT_PATH/repositories.json"
REPOS_ROOT="$ROOT_PATH/repos"

# ============================================================================
# HELPERS
# ============================================================================

if [ -t 1 ]; then
    C_CYAN="\033[36m"; C_GREEN="\033[32m"; C_BLUE="\033[34m"
    C_YELLOW="\033[33m"; C_RED="\033[31m"; C_RESET="\033[0m"
else
    C_CYAN=""; C_GREEN=""; C_BLUE=""; C_YELLOW=""; C_RED=""; C_RESET=""
fi

write_header()  { printf "\n${C_CYAN}========================================\n %s\n========================================${C_RESET}\n\n" "$1"; }
write_success() { printf "${C_GREEN}[OK]${C_RESET} %s\n" "$1"; }
write_info()    { printf "${C_BLUE}[..]${C_RESET} %s\n" "$1"; }
write_warn()    { printf "${C_YELLOW}[!!]${C_RESET} %s\n" "$1"; }
write_err()     { printf "${C_RED}[XX]${C_RESET} %s\n" "$1"; }

parse_repositories() {
    # Emits one TSV line per active repository: name<TAB>path<TAB>branch
    if command -v jq >/dev/null 2>&1; then
        jq -r '.repositories[]
               | select((.status // "active") == "active")
               | [.name, .path, (.branch // "")]
               | @tsv' "$CONFIG_FILE"
    elif command -v python3 >/dev/null 2>&1; then
        python3 - "$CONFIG_FILE" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    cfg = json.load(f)
for r in cfg.get("repositories", []):
    if r.get("status", "active") != "active":
        continue
    print("\t".join([r.get("name",""), r.get("path",""), r.get("branch","")]))
PY
    else
        write_err "Neither 'jq' nor 'python3' is available. Install one to parse repositories.json."
        exit 1
    fi
}

switch_repository_branch() {
    local name="$1" repo_path="$2" target="$3"
    local full_path="$REPOS_ROOT/$repo_path"

    if [ ! -d "$full_path/.git" ]; then
        write_warn "Not a git repository (skip): $name [$full_path]"
        echo "skip"
        return 0
    fi

    (
        cd "$full_path"

        # Uncommitted changes -> auto-stash
        if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
            write_warn "$name - uncommitted changes, auto-stash" >&2
            git stash push -m "auto-stash before switch to $target" >/dev/null 2>&1 || true
        fi

        if [ "$FETCH_FIRST" -eq 1 ]; then
            write_info "$name - fetching..." >&2
            git fetch origin >/dev/null 2>&1 || true
        fi

        # Local branch?
        if [ -n "$(git branch --list "$target" 2>/dev/null)" ]; then
            if git checkout "$target" >/dev/null 2>&1; then
                write_success "$name -> $target (local)" >&2
                echo "switched"; return 0
            else
                write_err "$name - local checkout failed for $target" >&2
                echo "error"; return 0
            fi
        fi

        # Remote branch?
        if git ls-remote --heads origin "$target" 2>/dev/null | grep -q "$target"; then
            if git checkout -b "$target" "origin/$target" >/dev/null 2>&1; then
                write_success "$name -> $target (from remote)" >&2
                echo "tracked"; return 0
            else
                write_err "$name - remote checkout failed for $target" >&2
                echo "error"; return 0
            fi
        fi

        # Branch does not exist: create it
        if [ -n "$BASE_BRANCH" ]; then
            if [ -n "$(git branch --list "$BASE_BRANCH" 2>/dev/null)" ]; then
                git checkout "$BASE_BRANCH" >/dev/null 2>&1 || true
            elif git ls-remote --heads origin "$BASE_BRANCH" 2>/dev/null | grep -q "$BASE_BRANCH"; then
                git checkout -b "$BASE_BRANCH" "origin/$BASE_BRANCH" >/dev/null 2>&1 || true
            else
                write_warn "$name - base branch '$BASE_BRANCH' not found, using current branch" >&2
            fi
        fi

        if git checkout -b "$target" >/dev/null 2>&1; then
            write_success "$name -> $target (CREATED)" >&2
            echo "created"; return 0
        else
            write_err "$name - failed to create branch $target" >&2
            echo "error"; return 0
        fi
    )
}

# ============================================================================
# MAIN
# ============================================================================

write_header "NONoise multi-repo - Switch Branch"

write_info "Target branch:  $BRANCH_NAME"
[ -n "$BASE_BRANCH" ] && write_info "Base branch:    $BASE_BRANCH"
[ "$FETCH_FIRST" -eq 1 ] && write_info "Fetch:          enabled"
write_info "Workspace root: $ROOT_PATH"

if [ ! -f "$CONFIG_FILE" ]; then
    write_err "Configuration file not found: $CONFIG_FILE"
    exit 1
fi

switched=0
tracked=0
created=0
skipped=0
errors=0
error_names=()
total=0

while IFS=$'\t' read -r name repo_path branch; do
    [ -z "${name:-}" ] && continue
    total=$((total + 1))

    result="$(switch_repository_branch "$name" "$repo_path" "$BRANCH_NAME")"
    case "$result" in
        switched) switched=$((switched + 1)) ;;
        tracked)  tracked=$((tracked + 1)) ;;
        created)  created=$((created + 1)) ;;
        skip)     skipped=$((skipped + 1)) ;;
        error)    errors=$((errors + 1)); error_names+=("$name") ;;
    esac
done < <(parse_repositories)

write_header "Summary"
echo "Branch: $BRANCH_NAME"
echo "Repositories processed: $total"
echo ""
[ "$switched" -gt 0 ] && write_success "Checkout local:    $switched"
[ "$tracked"  -gt 0 ] && write_success "Checkout remote:   $tracked"
[ "$created"  -gt 0 ] && write_success "Branches created:  $created"
[ "$skipped"  -gt 0 ] && write_warn    "Skipped:           $skipped"
[ "$errors"   -gt 0 ] && write_err     "Errors:            $errors"

if [ "${#error_names[@]}" -gt 0 ]; then
    echo ""
    write_warn "Repositories with errors:"
    for n in "${error_names[@]}"; do printf "  - ${C_RED}%s${C_RESET}\n" "$n"; done
fi

echo ""
if [ "$errors" -eq 0 ]; then
    printf "${C_GREEN}All repositories are on '%s'.${C_RESET}\n" "$BRANCH_NAME"
fi
echo ""
