#!/usr/bin/env bash
set -euo pipefail

# === Dependencies & Auth Check ===
check_deps() {
  local missing=0
  for cmd in gh jq; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      echo "Error: Required command '$cmd' not found."
      missing=1
    fi
  done
  if [ "$missing" -eq 1 ]; then
    echo "Please install missing dependencies before running this script."
    exit 1
  fi

  # Auth Check: GH_TOKEN or gh auth status
  if [ -n "${GH_TOKEN:-}" ]; then
    echo "Using GH_TOKEN environment variable."
  elif gh auth status >/dev/null 2>&1; then
    echo "Using existing 'gh' authentication session."
  else
    echo "Error: No GitHub authentication found. Set GH_TOKEN or run 'gh auth login'."
    exit 1
  fi
}

check_deps

# === Configuration ===
# Default to a safe Pilot list (to prevent mass-PR accidents)
DEFAULT_REPOS=(
  "heimgewebe/tools"
  "heimgewebe/mitschreiber"
)

# Allow overriding REPOS via a file 'repos.txt' if present, or argument
if [ -f "repos.txt" ]; then
  # Read file, stripping comments and empty lines
  mapfile -t REPOS < <(grep -vE '^\s*#|^\s*$' repos.txt)
else
  REPOS=("${DEFAULT_REPOS[@]}")
fi

# Validation: Ensure REPOS are valid slugs
for repo in "${REPOS[@]}"; do
  if [[ ! "$repo" =~ ^[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+$ ]]; then
    echo "Error: Invalid repo slug found: '$repo'. Must be in format 'owner/repo'."
    exit 1
  fi
done

BRANCH="optimize/ai-context-and-standards-pilot"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_ROOT="${SCRIPT_DIR}/templates"

echo "=== Heimgewebe Rollout Pilot ==="
echo "Target Repos: ${REPOS[*]}"
echo "Branch: ${BRANCH}"
echo "--------------------------------"

mkdir -p work

for REPO in "${REPOS[@]}"; do
  echo "===> Processing ${REPO}"

  # Ensure clean work state
  if [ -d "work/${REPO}" ]; then
    echo "Updating existing clone..."
    git -C "work/${REPO}" fetch --all --prune || { echo "Fetch failed for ${REPO}, skipping."; continue; }
  else
    echo "Cloning..."
    gh repo clone "${REPO}" "work/${REPO}" || { echo "Clone failed for ${REPO} (check slug/auth?), skipping."; continue; }
  fi

  pushd "work/${REPO}" >/dev/null

  # Robust default branch detection
  DEFAULT_BRANCH="$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null || true)"
  if [ -z "${DEFAULT_BRANCH}" ]; then
    for candidate in main master trunk; do
      if git ls-remote --exit-code --heads origin "${candidate}" >/dev/null 2>&1; then
        DEFAULT_BRANCH="${candidate}"
        break
      fi
    done
  fi
  : "${DEFAULT_BRANCH:=main}"

  git checkout "${DEFAULT_BRANCH}"
  git pull --ff-only || true

  # Branch handling
  if git rev-parse --verify "${BRANCH}" >/dev/null 2>&1; then
    git checkout "${BRANCH}"
    git rebase "origin/${DEFAULT_BRANCH}" || true
  else
    git checkout -b "${BRANCH}"
  fi

  # === Apply Templates (Idempotent) ===

  # .ai-context.yml (Strict YAML version)
  if [ ! -f ".ai-context.yml" ]; then
    cp -v "${TEMPLATES_ROOT}/ai-context.yml" ".ai-context.yml"
    # Portable sed (using temp file)
    sed "s|__REPO_NAME__|${REPO##*/}|g" .ai-context.yml > .ai-context.yml.tmp && mv .ai-context.yml.tmp .ai-context.yml
  fi

  # .editorconfig
  [ -f ".editorconfig" ] || cp -v "${TEMPLATES_ROOT}/editorconfig" ".editorconfig"

  # Workflows
  mkdir -p .github/workflows
  [ -f ".github/workflows/branch-cleanup.yml" ] || cp -v "${TEMPLATES_ROOT}/workflows/branch-cleanup.yml" ".github/workflows/branch-cleanup.yml"
  [ -f ".github/workflows/repo-health-check.yml" ] || cp -v "${TEMPLATES_ROOT}/workflows/repo-health-check.yml" ".github/workflows/repo-health-check.yml"

  # Scripts CI only if scripts exist
  if git ls-files | grep -E '\.(sh|bash)$' >/dev/null 2>&1; then
    [ -f ".github/workflows/scripts-ci.yml" ] || cp -v "${TEMPLATES_ROOT}/workflows/scripts-ci.yml" ".github/workflows/scripts-ci.yml"
  fi

  # === Commit & PR ===
  if ! git diff --quiet; then
    git add -A
    git commit -m "feat: add AI context, editor config and standard workflows (Pilot)"
    git push -u origin "${BRANCH}" || true
  else
    echo "No changes needed for ${REPO}."
  fi

  # Check if PR exists
  if ! gh pr list --state open --head "${BRANCH}" --json number | jq -e 'length>0' >/dev/null; then
    gh pr create \
      --title "feat: add AI context, editor config and standard workflows (Pilot)" \
      --body "Automated rollout (Pilot Phase). Adds basic AI context and standard workflows." \
      --base "${DEFAULT_BRANCH}" \
      --head "${BRANCH}"
  else
    echo "PR already open."
  fi

  popd >/dev/null
done

echo "=== Pilot Run Complete ==="
