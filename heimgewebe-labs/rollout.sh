#!/usr/bin/env bash
set -euo pipefail

: "${GH_TOKEN:?GH_TOKEN required}"

REPOS=(
  "heimgewebe/metarepo"
  "heimgewebe/wgx"
  "heimgewebe/leitstand"
  "heimgewebe/heimlern"
  "heimgewebe/aussensensor"
  "heimgewebe/mitschreiber"
  "heimgewebe/contracts"
  "heimgewebe/tools"
  "heimgewebe/hauski"
  "heimgewebe/hauski-audio"
  "heimgewebe/sichter"
  "heimgewebe/semantah"
)
BRANCH="optimize/ai-context-and-standards"
# Determine absolute path to templates regardless of where script is run from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_ROOT="${SCRIPT_DIR}/templates"

mkdir -p work

for REPO in "${REPOS[@]}"; do
  echo "===> ${REPO}"
  if [ -d "work/${REPO}" ]; then
    git -C "work/${REPO}" fetch --all --prune
  else
    gh repo clone "${REPO}" "work/${REPO}"
  fi

  pushd "work/${REPO}" >/dev/null

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

  if git rev-parse --verify "${BRANCH}" >/dev/null 2>&1; then
    git checkout "${BRANCH}"
    git rebase "origin/${DEFAULT_BRANCH}" || true
  else
    git checkout -b "${BRANCH}"
  fi

  # Idempotente Anwendung
  [ -f ".ai-context.yml" ] || {
      cp -v "${TEMPLATES_ROOT}/ai-context.yml" ".ai-context.yml"
      sed "s|__REPO_NAME__|${REPO##*/}|g" .ai-context.yml > .ai-context.yml.tmp && mv .ai-context.yml.tmp .ai-context.yml
  }
  [ -f ".editorconfig" ] || cp -v "${TEMPLATES_ROOT}/editorconfig" ".editorconfig"

  mkdir -p .github/workflows
  [ -f ".github/workflows/branch-cleanup.yml" ] || cp -v "${TEMPLATES_ROOT}/workflows/branch-cleanup.yml" ".github/workflows/branch-cleanup.yml"
  [ -f ".github/workflows/repo-health-check.yml" ] || cp -v "${TEMPLATES_ROOT}/workflows/repo-health-check.yml" ".github/workflows/repo-health-check.yml"

  if git ls-files | grep -E '\.(sh|bash)$' >/dev/null 2>&1; then
    [ -f ".github/workflows/scripts-ci.yml" ] || cp -v "${TEMPLATES_ROOT}/workflows/scripts-ci.yml" ".github/workflows/scripts-ci.yml"
  fi

  if ! git diff --quiet; then
    git add -A
    git commit -m "feat: add AI context, editor config and standard workflows"
    git push -u origin "${BRANCH}" || true
  fi

  if ! gh pr list --state open --head "${BRANCH}" --json number | jq -e 'length>0' >/dev/null; then
    gh pr create \
      --title "feat: add AI context, editor config and standard workflows" \
      --body "Automated rollout via script." \
      --base "${DEFAULT_BRANCH}" \
      --head "${BRANCH}"
  fi

  popd >/dev/null
done
