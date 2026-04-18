#!/usr/bin/env bash
# Clone every active sub-repository declared in repositories.json.
# Part of the NONoise multi-repo workspace template.
# Workspace-centric: this script never writes skill files inside cloned sub-repos.

set -euo pipefail

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

# ============================================================================
# JSON PARSING
# ============================================================================
# Prefers `jq` if available. Falls back to a portable python3 parser.
# If neither is available, exits with an actionable error.

parse_repositories() {
    # Emits one TSV line per active repository: name<TAB>url<TAB>path<TAB>branch
    if command -v jq >/dev/null 2>&1; then
        jq -r '.repositories[]
               | select((.status // "active") == "active")
               | [.name, .url, .path, (.branch // "")]
               | @tsv' "$CONFIG_FILE"
    elif command -v python3 >/dev/null 2>&1; then
        python3 - "$CONFIG_FILE" <<'PY'
import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    cfg = json.load(f)
for r in cfg.get("repositories", []):
    if r.get("status", "active") != "active":
        continue
    print("\t".join([r.get("name",""), r.get("url",""), r.get("path",""), r.get("branch","")]))
PY
    else
        write_err "Neither 'jq' nor 'python3' is available. Install one to parse repositories.json."
        exit 1
    fi
}

# ============================================================================
# MAIN
# ============================================================================

write_header "NONoise multi-repo - Clone All"

write_info "Workspace root: $ROOT_PATH"
write_info "Config file:    $CONFIG_FILE"
write_info "Repos root:     $REPOS_ROOT"

if [ ! -f "$CONFIG_FILE" ]; then
    write_err "Configuration file not found: $CONFIG_FILE"
    exit 1
fi

mkdir -p "$REPOS_ROOT"

cloned=0
skipped=0
errors=0
error_names=()
total=0

while IFS=$'\t' read -r name url path branch; do
    [ -z "${name:-}" ] && continue
    total=$((total + 1))

    full_path="$REPOS_ROOT/$path"

    if [ -d "$full_path/.git" ]; then
        write_warn "$name - already cloned (skip): repos/$path"
        skipped=$((skipped + 1))
        continue
    fi

    parent_dir="$(dirname "$full_path")"
    mkdir -p "$parent_dir"

    write_info "$name - cloning $url -> repos/$path (branch ${branch:-default})"
    if [ -n "${branch:-}" ]; then
        if git clone -b "$branch" "$url" "$full_path" >/dev/null 2>&1; then
            write_success "$name - cloned"
            cloned=$((cloned + 1))
        else
            write_err "$name - clone failed"
            errors=$((errors + 1))
            error_names+=("$name")
        fi
    else
        if git clone "$url" "$full_path" >/dev/null 2>&1; then
            write_success "$name - cloned"
            cloned=$((cloned + 1))
        else
            write_err "$name - clone failed"
            errors=$((errors + 1))
            error_names+=("$name")
        fi
    fi
done < <(parse_repositories)

write_header "Summary"
echo "Workspace:            $ROOT_PATH"
echo "Repositories scanned: $total"
echo ""
[ "$cloned"  -gt 0 ] && write_success "Cloned:  $cloned"
[ "$skipped" -gt 0 ] && write_warn    "Skipped: $skipped"
[ "$errors"  -gt 0 ] && write_err     "Errors:  $errors"

if [ "${#error_names[@]}" -gt 0 ]; then
    echo ""
    write_warn "Repositories with errors:"
    for n in "${error_names[@]}"; do printf "  - ${C_RED}%s${C_RESET}\n" "$n"; done
fi

echo ""
if [ "$errors" -eq 0 ]; then
    printf "${C_GREEN}All active repositories are cloned.${C_RESET}\n"
fi
echo ""
