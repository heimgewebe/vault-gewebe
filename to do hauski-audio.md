Das Problem im Job 54656800213 ist ein YAML-Lint-Fehler: Zahlreiche Zeilen in .github/workflows/contracts-validate.yml, .github/workflows/validate-audio-events.yml und .github/workflows/wgx-guard.yml überschreiten das erlaubte Limit von 80 Zeichen pro Zeile (siehe Logauszug).

**Lösung**:

1. Kürze in allen betroffenen Dateien jede Zeile, die über 80 Zeichen lang ist, durch Umbruch nach YAML-Syntax. Besonders häufig betroffen: lange Einrückungen in jobs, env-Variablen oder in workflows „with“‐ und „run“‐Feldern.
   - Beispiel für einen Umbruch bei langen Strings oder Listen:
     ```yaml
     with:
       schema_url: >
         https://raw.githubusercontent.com/heimgewebe/metarepo/contracts-v1/contracts/audio.events.schema.json
     ```
   - Lange Kommentare oder Listen können wie folgt umgebrochen werden:
     ```yaml
     - dies-ist-ein-teil
     - der-liste-umgebrochen
     ```

2. Setze in .github/workflows/contracts-validate.yml am Anfang die Dokumentstart-Markierung ---:
   ```yaml
   ---
   name: "contracts-validate"
   ...
   ```

3. Optional: Passe Zeilen an, die laut Linter wegen „truthy“-Werten oder fehlendem Dokumentstart „warning“ auslösen (siehe Zeile 11, contracts-validate.yml).

**Zusammengefasst:**  
Alle Zeilen mit Lint-Fehlern anhand des Logs auf maximal 80 Zeichen umbrechen und .github/workflows/contracts-validate.yml mit --- beginnen lassen. Damit sollte die Aktion erfolgreich durchlaufen.

→ [contracts-validate.yml (ref)](https://github.com/heimgewebe/hausKI-audio/blob/623aab797a57c6036f16efbf27e13156fdadb2b3/.github/workflows/contracts-validate.yml)  
→ [validate-audio-events.yml (ref)](https://github.com/heimgewebe/hausKI-audio/blob/623aab797a57c6036f16efbf27e13156fdadb2b3/.github/workflows/validate-audio-events.yml)  
→ [wgx-guard.yml (ref)](https://github.com/heimgewebe/hausKI-audio/blob/623aab797a57c6036f16efbf27e13156fdadb2b3/.github/workflows/wgx-guard.yml)


bitte das zeichenlimit auf 120 zeichen erhöhen im workflow! dementspechend obiges ggf ignorieren.

Summary
The job failed because the toolchain action in the workflow failed to parse its inputs (the action printed "'toolchain' is a required input" and exited), which prevented a clean toolchain install and led to CI failing (exit code 1). Even if the action runs, CI will also fail if code is not formatted or clippy reports warnings. Fixes:

1) Replace the problematic action (dtolnay/rust-toolchain@stable) with the well-maintained actions-rs toolchain action and pin a stable release.
2) Ensure components are passed in the expected format.
3) Run formatter and clippy locally, fix results, commit them.

Concrete changes

Update .github/workflows/rust-ci.yml (use ref 623aab797a57c6036f16efbf27e13156fdadb2b3):
- Current file: https://github.com/heimgewebe/hausKI-audio/blob/623aab797a57c6036f16efbf27e13156fdadb2b3/.github/workflows/rust-ci.yml

Replace the dtolnay step with actions-rs/toolchain@v1 and ensure components are space-separated. Example:

```yaml
name: rust-ci
on:
  push:
    branches: [ main ]
  pull_request:
    paths:
      - 'Cargo.toml'
      - 'Cargo.lock'
      - 'crates/backend/**'
      - 'Justfile'

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Use actions-rs/toolchain (pin to v1)
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          components: clippy rustfmt
          override: true
          profile: minimal

      - name: Cargo fmt
        run: cargo fmt --all -- --check

      - name: Cargo clippy
        run: cargo clippy --workspace --all-targets -- -D warnings

      - name: Cargo test
        run: cargo test --workspace
```

Why this change
- The logs show the toolchain action failed to parse inputs. Switching to actions-rs/toolchain@v1 removes the failing parsing behavior and is commonly used in Rust CI.
- Pinning to v1 avoids unexpected behavior from an unstable tag.
- Passing components as "clippy rustfmt" is the expected format for actions-rs.

Local reproduction & fixes (run before pushing)
- Reproduce the CI steps locally to see exact causes:
  - Install toolchain locally (rustup default stable)
  - Run formatter:
    - cargo fmt --all -- --check
    - If it fails: cargo fmt --all && git add -A && git commit -m "format: rustfmt"
  - Run clippy:
    - cargo clippy --workspace --all-targets
    - Fix warnings OR if you must unblock CI temporarily, relax -D warnings to -A clippy::some_lint (prefer fixing)
  - Run tests:
    - cargo test --workspace

If CI still fails after switching action
- Capture the full CI log for the first failing step (cargo fmt or clippy) and share it. The log snippet in the run shows a lazy_static snippet but not the full compiler/clippy error — we need the full compiler/clippy output to give exact code fixes.
- Typical fixes:
  - fmt errors: run cargo fmt and commit formatted files
  - clippy warnings: fix per-lint (often simple refactors)
  - test failures: inspect failing test trace and fix code or test expectation

Small additional recommendations
- Pin actions explicitly (actions/checkout@v4 and actions-rs/toolchain@v1) to avoid surprises.
- Add a reproducible CI matrix with rust version if you need to test multiple toolchains.
- Optionally add a cache action for cargo to speed CI.

If you want, I can:
- produce a patch (diff) for .github/workflows/rust-ci.yml replacing the action (I already showed the snippet).
- analyze the full cargo/clippy output if you paste the complete failing log lines for the cargo step.

— GitHub Copilot Chat Assistant




Failure reason
- The job failed on the assertion "description mismatch" in the WGX guard step that validates .wgx/profile.yml.
- Failing check location: .github/workflows/wgx-guard.yml (ref 623aab797a57c6036f16efbf27e13156fdadb2b3), the assertion is at lines that compare data.get('description') to 'Local audio orchestration layer for HausKI'.
- See workflow and profile locations:
  - Workflow: https://github.com/heimgewebe/hausKI-audio/blob/623aab797a57c6036f16efbf27e13156fdadb2b3/.github/workflows/wgx-guard.yml
  - Profile (needs fix or inspection): https://github.com/heimgewebe/hausKI-audio/blob/623aab797a57c6036f16efbf27e13156fdadb2b3/.wgx/profile.yml

Recommended fix (preferred)
- Make the profile description exactly match the expectation in the guard script.
- Update .wgx/profile.yml so the description field equals:
  Local audio orchestration layer for HausKI

Patch (apply in repository root)
- Example diff to commit:

--- a/.wgx/profile.yml
+++ b/.wgx/profile.yml
@@
-profile: hauski-audio
-description: "CURRENT WRONTO DESCRIPTION"
+profile: hauski-audio
+description: 'Local audio orchestration layer for HausKI'
 lang: python
 wgx-version: '>=0.3'
 meta:
   repo: alexdermohr/hauski-audio
   maintainer: alexdermohr@gmail.com
   tags:
     - audio
     - motu
     - qobuz
     - hauski
     - wgx
 env:
   PYTHONUNBUFFERED: '1'
   UV_PIP_VERSION: '24.0'

- Commit message suggestion:
  "wgx(profile): fix description to match guard expectation"

How to apply and test locally
- Edit .wgx/profile.yml to the value above.
- Run the guard check locally (replicating the action steps):
  1. Ensure Python ≥3.12 is active.
  2. From repo root:
     - python - <<'PY'
       from pathlib import Path
       import yaml
       data = yaml.safe_load(Path('.wgx/profile.yml').read_text(encoding='utf-8'))
       assert data.get('description') == 'Local audio orchestration layer for HausKI', "description mismatch"
       print("description OK")
       PY
- Push change in a branch and open a PR; GitHub Actions will re-run the WGX Guard job automatically.

Alternative fix (only if the profile description is intentionally different)
- Relax the workflow assertion to accept the intended wording or to test less strictly (for example, test substring or lowercase equality). Modify the guard snippet in .github/workflows/wgx-guard.yml:

Replace:
  assert data.get('description') == (
      'Local audio orchestration layer for HausKI'
  ), "description mismatch"

With a relaxed check, e.g.:
  desc = (data.get('description') or '').strip().lower()
  assert 'local audio' in desc and 'hauski' in desc, "description must mention 'local audio' and 'hauski'"

- Commit message suggestion:
  "wgx(guard): relax profile description check to allow minor wording differences"

Notes
- Preferred option is to make the profile match the guard to keep the check strict and reproducible.
- After applying either fix, re-run the failing workflow (push commit to the PR or branch). The job id in the logs: 54656800214 — the guard will run again on the next push/PR update.