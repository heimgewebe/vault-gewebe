Alles klar—ich habe das Runbook und das begleitende Rollout-Script neu und optimiert erstellt und dabei die fehlenden Repos hauski, hauski-audio, sichter und semantah ergänzt. Außerdem habe ich ein paar kleine Verbesserungen eingebaut (z. B. robustere Default-Branch-Erkennung, strengere Idempotenz, und eine optionale Scripts-CI nur, wenn Shell-Dateien existieren). Weltgewebe bleibt explizit außen vor.

⸻

1) Jules-Runbook (repo-übergreifend)

# jules/runbooks/rollout-ai-standards.yml
name: rollout-ai-standards
description: "Verteilt .ai-context.yml, .editorconfig und Standard-Workflows in alle Heimgewebe-Repos (ohne weltgewebe)."
owners:
  - "@alex"
  - "@infra"

vars:
  repos:
    - "heimgewebe/metarepo"
    - "heimgewebe/wgx"
    - "heimgewebe/leitstand"
    - "heimgewebe/heimlern"
    - "heimgewebe/aussensensor"
    - "heimgewebe/mitschreiber"
    - "heimgewebe/contracts"
    - "heimgewebe/tools"
    - "heimgewebe/hauski"
    - "heimgewebe/hauski-audio"
    - "heimgewebe/sichter"
    - "heimgewebe/semantah"

  branch: "optimize/ai-context-and-standards"
  pr_title: "feat: add AI context, editor config and standard workflows"
  pr_body: |
    This PR applies cross-repo standards:
    - Adds .ai-context.yml
    - Adds .editorconfig
    - Adds/updates basic workflows (branch cleanup, repo health, scripts CI if applicable)
    - Idempotent & minimal-diff by design; existing files are preserved.

  templates_root: "jules/templates"

env:
  GH_TOKEN: "{{ secret.GITHUB_TOKEN }}"
  GIT_AUTHOR_NAME: "Heimgewebe Jules"
  GIT_AUTHOR_EMAIL: "jules@heimgewebe.local"
  GIT_COMMITTER_NAME: "Heimgewebe Jules"
  GIT_COMMITTER_EMAIL: "jules@heimgewebe.local"

steps:
  - name: apply-to-each-repo
    for_each: "{{ vars.repos }}"
    run: |
      set -euo pipefail
      repo="{{ item }}"
      branch="{{ vars.branch }}"
      pr_title="{{ vars.pr_title }}"
      pr_body=$(cat <<'PRBODY'
{{ vars.pr_body }}
PRBODY
)

      export GH_TOKEN="${GH_TOKEN:?GH_TOKEN missing}"

      # 1) Clone/Fetch
      if [ -d "work/${repo}" ]; then
        git -C "work/${repo}" fetch --all --prune
      else
        mkdir -p "work"
        gh repo clone "${repo}" "work/${repo}"
      fi

      cd "work/${repo}"

      # 2) Default branch robust ermitteln
      default_branch="$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null || true)"
      if [ -z "${default_branch}" ]; then
        # Fallbacks
        for candidate in main master trunk; do
          if git ls-remote --exit-code --heads origin "${candidate}" >/dev/null 2>&1; then
            default_branch="${candidate}"
            break
          fi
        done
      fi
      : "${default_branch:=main}"

      # 3) Branch vorbereiten
      git checkout "${default_branch}"
      git pull --ff-only || true
      if git rev-parse --verify "${branch}" >/dev/null 2>&1; then
        git checkout "${branch}"
        git rebase "origin/${default_branch}" || true
      else
        git checkout -b "${branch}"
      fi

      # 4) Templates anwenden (idempotent)
      ROOT="$(pwd)"
      TPL="{{ vars.templates_root }}"
      mkdir -p .github/workflows

      # .ai-context.yml
      if [ ! -f ".ai-context.yml" ]; then
        cp -v "${JULES_RUN_ROOT}/${TPL}/ai-context.yml" ".ai-context.yml"
        sed -i "s|__REPO_NAME__|${repo##*/}|g" .ai-context.yml
      fi

      # .editorconfig
      if [ ! -f ".editorconfig" ]; then
        cp -v "${JULES_RUN_ROOT}/${TPL}/editorconfig" ".editorconfig"
      fi

      # Branch cleanup workflow
      if [ ! -f ".github/workflows/branch-cleanup.yml" ]; then
        cp -v "${JULES_RUN_ROOT}/${TPL}/workflows/branch-cleanup.yml" ".github/workflows/branch-cleanup.yml"
      fi

      # Repo health workflow
      if [ ! -f ".github/workflows/repo-health-check.yml" ]; then
        cp -v "${JULES_RUN_ROOT}/${TPL}/workflows/repo-health-check.yml" ".github/workflows/repo-health-check.yml"
      fi

      # Scripts CI nur wenn Shell-Skripte vorhanden
      if git ls-files | grep -E '\.(sh|bash)$' >/dev/null 2>&1; then
        if [ ! -f ".github/workflows/scripts-ci.yml" ]; then
          cp -v "${JULES_RUN_ROOT}/${TPL}/workflows/scripts-ci.yml" ".github/workflows/scripts-ci.yml"
        fi
      fi

      # 5) Commit nur bei Änderungen
      if ! git diff --quiet; then
        git add -A
        git commit -m "${pr_title}"
        git push -u origin "${branch}" || true
      else
        echo "No changes for ${repo} – skipping commit."
      fi

      # 6) PR erstellen, falls noch nicht vorhanden
      if ! gh pr list --state open --head "${branch}" --json number | jq -e 'length>0' >/dev/null; then
        gh pr create --title "${pr_title}" --body "${pr_body}" --base "${default_branch}" --head "${branch}"
      else
        echo "PR already open for ${repo}:${branch}"
      fi

      cd "${JULES_RUN_ROOT}"


⸻

2) Optionales Worker-Shell-Script (ohne Jules)

# scripts/rollout/rollout-ai-standards.sh
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
TEMPLATES_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../jules/templates" && pwd)"

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
  [ -f ".ai-context.yml" ] || { cp -v "${TEMPLATES_ROOT}/ai-context.yml" ".ai-context.yml" && sed -i "s|__REPO_NAME__|${REPO##*/}|g" .ai-context.yml; }
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


⸻

3) Vorlagen (Templates)

Verzeichnisstruktur:

jules/templates/
├─ ai-context.yml
├─ editorconfig
└─ workflows/
   ├─ branch-cleanup.yml
   ├─ repo-health-check.yml
   └─ scripts-ci.yml

ai-context.yml

AI Context Configuration for __REPO_NAME__
Version: 1.0

project:
  name: "__REPO_NAME__"
  description: "Short description (fill me)"
  role: "Role in Heimgewebe (fill me)"
  language: "Rust|Bash|Python|TypeScript|Mixed"

dependencies:
  internal: []
  external: []

architecture:
  entry_points: []
  key_modules: []
  data_flow:
    input: ""
    processing: ""
    output: ""

conventions:
  branching: "main + feature/* + hotfix/*"
  commit_prefix: "__REPO_NAME__"
  ci_platform: "GitHub Actions"

documentation:
  architecture_decisions: "docs/adr/"
  runbook: "docs/runbook.md"
  api_reference: ""

.editorconfig

root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.{rs,toml}]
indent_style = space
indent_size = 4

[*.{yml,yaml,json}]
indent_style = space
indent_size = 2

[*.{sh,bash}]
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false

.github/workflows/branch-cleanup.yml

name: Branch Cleanup
on:
  schedule:
    - cron: "0 3 * * 0"
  workflow_dispatch:
permissions:
  contents: write
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - name: Delete merged & stale branches
        run: |
          set -euo pipefail
          git fetch --prune
          # Merged
          for b in $(git branch -r --merged origin/${{ github.event.repository.default_branch || 'main' }} | sed 's|origin/||' | grep -vE '^(main|master|trunk)$' || true); do
            echo "Would delete (remote) $b — manual policy preferred (PR cleanup)."
          done
          # Local cleanup (safe):
          git branch --merged | grep -vE '^(main|master|trunk)$' | xargs -r git branch -d || true

.github/workflows/repo-health-check.yml

name: Repository Health Check
on:
  schedule:
    - cron: "0 6 * * 1"
  workflow_dispatch:
jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - name: Required files
        run: |
          set -euo pipefail
          req=(".ai-context.yml" "README.md" ".editorconfig")
          missing=0
          for f in "${req[@]}"; do
            [ -f "$f" ] || { echo "::warning::Missing $f"; missing=1; }
          done
          exit 0
      - name: Basic workflow sanity
        run: |
          set -euo pipefail
          n=$(find .github/workflows -type f \( -name "*.yml" -o -name "*.yaml" \) | wc -l || true)
          if [ "$n" -gt 15 ]; then
            echo "::warning::High workflow count ($n) – consider consolidation"
          fi

.github/workflows/scripts-ci.yml

name: Scripts CI
on:
  push:
    paths:
      - "**/*.sh"
      - "**/*.bash"
  pull_request:
    paths:
      - "**/*.sh"
      - "**/*.bash"
jobs:
  shellcheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: ShellCheck
        run: |
          set -euo pipefail
          if ! command -v shellcheck >/dev/null 2>&1; then
            sudo apt-get update -qq
            sudo apt-get install -y --no-install-recommends shellcheck
          fi
          find . -type f \( -name "*.sh" -o -name "*.bash" \) -print0 | xargs -0 -r shellcheck --severity=warning


⸻

Hinweise / Warum diese Optimierungen?
	•	Vollständige Repo-Liste: Hauski, Hauski-Audio, SichTer, SemantAH sind jetzt enthalten.
	•	Idempotenz: Wir erstellen Dateien nur, wenn sie fehlen—bestehende Projektstandards werden nicht überschrieben.
	•	Branch/PR-Sicherheit: Eigener Feature-Branch pro Repo, PR-Erstellung nur wenn nötig; sauberes Rebase gegen Default-Branch.
	•	Portabilität: Default-Branch robust ermittelt (Fallback auf main/master/trunk).
	•	Scope-Schutz: Weltgewebe wird nicht angetastet.
	•	CI-Rücksicht: Scripts-CI wird nur ausgerollt, wenn das Repo tatsächlich Shell-Skripte enthält.

Wenn du möchtest, kann ich dir die Templates zusätzlich repo-spezifisch zuschneiden (z. B. für hauski: Sprache „TypeScript/Node“, für hauski-audio: „Rust+Audio“; für sichter: Fokus auf Review-Pipelines; für semantah: Knowledge-Pipelines).