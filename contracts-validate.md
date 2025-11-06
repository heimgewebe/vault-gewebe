```yaml
name: "contracts-validate"

# Security: Minimal permissions - only read access for diff operations
permissions:
  contents: read

# Concurrency control: Cancel in-progress runs when new workflow is triggered
concurrency:
  group: ${{ github.workflow }}-${{ github.event_name }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

on:
  workflow_dispatch: {}
  push:
    paths:
      - "contracts/**"
      - "schemas/**"
      - ".github/workflows/contracts-validate.yml"
  pull_request:
    paths:
      - "contracts/**"
      - "schemas/**"
      - ".github/workflows/contracts-validate.yml"

defaults:
  run:
    shell: bash -euo pipefail {0}

env:
  FAIL_ON_NO_BASE: "1"
  ALLOW_REMOVALS: "0"
  FIXTURES_GLOB: ${{ vars.FIXTURES_GLOB || 'fixtures/**/*.jsonl' }}

jobs:
  version-sync-check:
    name: "Security: enforce static pin for contracts reusable workflow"
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Checkout (read-only)
        uses: actions/checkout@v4
        with:
          fetch-depth: 1
          persist-credentials: false

      - name: Verify 'uses:' pins for heimgewebe/contracts
        env:
          REQUIRED_REPO: "heimgewebe/contracts/.github/workflows/contracts-ajv-reusable.yml"
          REQUIRED_REF: "contracts-v1"
        run: |
          set -euo pipefail
          
          failed=0
          
          # Process all YAML workflow files
          for file in .github/workflows/*.{yml,yaml}; do
            [[ -f "$file" ]] || continue
            
            # Extract and validate 'uses:' lines
            while IFS= read -r line; do
              # Skip lines without 'uses:' or our required repo
              [[ "$line" == *"uses:"* ]] || continue
              [[ "$line" == *"$REQUIRED_REPO"* ]] || continue
              
              # Extract ref (everything after @)
              if [[ "$line" =~ @([a-zA-Z0-9._-]+) ]]; then
                ref="${BASH_REMATCH[1]}"
                
                # Security: Reject dynamic refs
                if [[ "$ref" == *'$'* ]]; then
                  echo "::error file=${file}::Dynamic ref not allowed: ${ref}" >&2
                  failed=1
                  continue
                fi
                
                # Enforce version pin
                if [[ "$ref" != "$REQUIRED_REF" ]]; then
                  echo "::error file=${file}::Pin mismatch: expected '${REQUIRED_REF}', got '${ref}'" >&2
                  failed=1
                fi
              fi
            done < "$file"
          done
          
          if (( failed )); then
            echo "::error::Version pin validation failed" >&2
            exit 1
          fi
          
          echo "::notice::✅ All version pins validated"

  guard:
    name: "Security: guard deletion policy (contracts/schemas)"
    runs-on: ubuntu-latest
    timeout-minutes: 8
    env:
      GH_DEFAULT_BRANCH: ${{ github.event.repository.default_branch || 'main' }}
      GH_PR_BASE_SHA: ${{ github.event.pull_request.base.sha }}
      GH_PUSH_BEFORE: ${{ github.event.before }}
    steps:
      - name: Checkout (full history for diff base)
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false

      - name: Enforce guard policy
        run: |
          set -euo pipefail

          # Helper: Check if value is truthy
          is_truthy() {
            case "${1:-0}" in
              1|true|yes|True|TRUE|Yes|YES) return 0 ;;
              *) return 1 ;;
            esac
          }

          echo "::notice::Policy: ALLOW_REMOVALS=${ALLOW_REMOVALS}, FAIL_ON_NO_BASE=${FAIL_ON_NO_BASE}"

          # Determine merge base (Priority: PR base → Push before → Default branch)
          base=""
          base_source=""
          
          # Try PR base commit
          if [[ -n "${GH_PR_BASE_SHA:-}" ]]; then
            if git rev-parse --verify "${GH_PR_BASE_SHA}^{commit}" &>/dev/null; then
              base="$GH_PR_BASE_SHA"
              base_source="pull_request"
            fi
          fi
          
          # Try push before commit
          if [[ -z "$base" && -n "${GH_PUSH_BEFORE:-}" && ! "${GH_PUSH_BEFORE}" =~ ^0+$ ]]; then
            if git rev-parse --verify "${GH_PUSH_BEFORE}^{commit}" &>/dev/null; then
              base="$GH_PUSH_BEFORE"
              base_source="push_before"
            fi
          fi
          
          # Fallback to default branch
          if [[ -z "$base" ]]; then
            if git ls-remote --exit-code --heads origin "${GH_DEFAULT_BRANCH}" &>/dev/null; then
              git fetch --quiet --depth=100 --no-tags origin \
                "refs/heads/${GH_DEFAULT_BRANCH}:refs/remotes/origin/${GH_DEFAULT_BRANCH}" || {
                echo "::error::Failed to fetch origin/${GH_DEFAULT_BRANCH}" >&2
                exit 1
              }
              base="origin/${GH_DEFAULT_BRANCH}"
              base_source="default_branch"
            fi
          fi
          
          # Verify base commit exists
          if [[ -z "$base" ]] || ! git rev-parse --verify "${base}^{commit}" &>/dev/null; then
            if is_truthy "$FAIL_ON_NO_BASE"; then
              echo "::error::Cannot determine base commit for diff comparison" >&2
              exit 1
            else
              echo "::notice::No base commit found - skipping guard check"
              exit 0
            fi
          fi

          echo "::notice::Analyzing diff from ${base:0:8}...HEAD (source: ${base_source})"

          # Check for deletions in protected directories
          # Using temporary file to capture results from subshell pipeline
          blocked_file=$(mktemp)
          trap "rm -f '$blocked_file'" EXIT
          
          git_exit=0
          git diff --name-status "${base}...HEAD" 2>&1 | {
            # Capture git exit code before grep
            exit_code=${PIPESTATUS[0]}
            
            # Git errors (exit 128+) are fatal
            if (( exit_code >= 128 )); then
              echo "::error::git diff failed with exit code ${exit_code}" >&2
              exit 1
            fi
            
            # Filter for deletions/renames and check protected paths
            grep -E '^[DR]' | while IFS=$'\t' read -r status path rest; do
              # Only check protected directories
              [[ "$path" =~ ^(contracts|schemas)/ ]] || continue
              
              # Skip if removals are allowed
              is_truthy "$ALLOW_REMOVALS" && continue
              
              # Record blocked operation
              case "$status" in
                D) echo "DELETE: ${path}" ;;
                R) echo "RENAME: ${path} → ${rest}" ;;
              esac
            done > "$blocked_file"
            
            exit 0
          } || git_exit=$?
          
          # Check if git diff had fatal errors
          if (( git_exit != 0 )); then
            exit "$git_exit"
          fi
          
          # Report violations if any
          if [[ -s "$blocked_file" ]]; then
            echo "::group::❌ Policy Violation: Deletions in Protected Directories"
            echo "The following operations are blocked by deletion policy:"
            echo ""
            sed 's/^/  • /' "$blocked_file" | sort -u
            echo ""
            echo "Protected directories: contracts/, schemas/"
            echo "To allow these changes, set ALLOW_REMOVALS=1"
            echo "::endgroup::"
            echo "::error::Guard policy violation detected (ALLOW_REMOVALS=${ALLOW_REMOVALS})" >&2
            exit 1
          fi

          echo "::notice::✅ Guard check passed - no policy violations"

  validate:
    name: "Validate fixtures via reusable workflow"
    needs: [version-sync-check, guard]
    uses: heimgewebe/contracts/.github/workflows/contracts-ajv-reusable.yml@contracts-v1
    secrets: inherit
    with:
      fixtures_glob: ${{ vars.FIXTURES_GLOB || 'fixtures/**/*.jsonl' }}
```