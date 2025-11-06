The job failed due to a failing test: chat_returns_503_when_unconfigured in crates/core/tests/chat_unconfigured.rs. The assertion expected an HTTP 503 response, but the actual response was 501.

Problem:
- The test expects the code to return status code 503 (Service Unavailable) when chat is unconfigured.
- However, the code returns 501 (Not Implemented).

Lösungsvorschlag:

1. Passe die entsprechende Stelle im Backend (vermutlich FastAPI oder Rust-Handler) an, sodass im Fall „unconfigured“ ein HTTP 503 statt 501 zurückgegeben wird.

Vorschlag für Rust-Änderung (im zugehörigen Handler):

```rust
// Beispiel: In der Chat-Handler-Funktion (z.B. in src/chat.rs oder ähnlichem)
if !is_chat_configured() {
    return Err(StatusCode::SERVICE_UNAVAILABLE); // 503 statt 501
}
```
Stelle sicher:
- Die Funktion gibt explizit StatusCode::SERVICE_UNAVAILABLE zurück, wenn der Chat nicht konfiguriert ist.

2. Prüfe, ob es noch andere Fälle gibt, wo fälschlicherweise 501 verwendet wird und passe diese ggf. ebenfalls an.

Betroffene Testdatei: crates/core/tests/chat_unconfigured.rs

Weitere Schritte:
- Nach Anpassung: Test mit cargo test -p hauski-core --test chat_unconfigured lokal ausführen, um den Fix zu verifizieren.

Damit wird der Test erwartungsgemäß bestehen und die Pipeline sollte durchlaufen.
Summary
- Failing job: 54363384731
- Failure reason: cargo-deny failed to deserialize deny.toml at line 36: the key `unknown = "deny"` was reported as an unknown field. The file uses [licenses] version = 2 (deny.toml lines 15–16) which the installed cargo-deny binary does not understand.
- Root cause: schema mismatch between deny.toml (schema v2) and the cargo-deny binary installed by the workflow. Either the binary is older (no v2 support) or a different incompatible release was installed.

Quick links (same ref as the failing job)
- deny.toml: https://github.com/heimgewebe/hausKI/blob/d39e906b8cd86cce1f44555ce23f9ae44781b2c4/deny.toml
- workflow: .github/workflows/security.yml (edit target): https://github.com/heimgewebe/hausKI/blob/d39e906b8cd86cce1f44555ce23f9ae44781b2c4/.github/workflows/security.yml

Recommended fix (safe, minimal)
Pin or install a cargo-deny release that supports config schema version 2. Update the workflow installation step so the installed cargo-deny matches the deny.toml schema.

Patch suggestion for .github/workflows/security.yml (replace the Install cargo-deny step)
Replace the existing step:
  - name: Install cargo-deny
    run: cargo install cargo-deny --locked --force

With a pinned/explicit install that targets a release supporting config v2 (example uses a semver constraint so the CI installs a binary with v2 support):
  - name: Install cargo-deny
    run: |
      # install a cargo-deny release that supports config v2
      cargo install cargo-deny --locked --force --version '^0.15'
      cargo deny --version

Notes:
- Replace '^0.15' with the minimum tested version in your environment if you have one. The caret range ensures a compatible minor/patch is selected while avoiding older incompatible major versions.
- The added cargo deny --version helps CI logs show which version was installed and makes debugging easier.

Alternative fix (if you prefer not to change the workflow)
If you cannot pin/install a newer cargo-deny in CI, change deny.toml to the older schema that matches the installed binary. This is riskier and not recommended because the repo intentionally sets [licenses].version = 2 (deny.toml line 16). Only use this if you know the installed cargo-deny requires v1. Example minimal change (not ideal):

In deny.toml:
- set [licenses] version = 1 and adapt/remove v2-only keys (e.g. rename/remove keys not supported by v1). This requires consulting cargo-deny v1 docs and verifying license rule semantics after conversion.

Verification steps to run in CI or locally
1. Confirm the installed cargo-deny version:
   - cargo deny --version
2. Run the checks locally using the same cargo-deny version you pin in CI:
   - cargo install cargo-deny --locked --force --version '^0.15'
   - cargo deny check advisories
   - cargo deny check bans
   - cargo deny check licenses

Why I recommend pinning the tool
- deny.toml already declares config version = 2. It is safer to pin the tool to a version known to support that schema rather than changing policy/config semantics in deny.toml.
- A pinned install produces reproducible CI runs and clear logs if the schema or CLI changes in future.

If you want, I can provide a specific version number to pin after you tell me which cargo-deny releases you have tested locally or want to target.


Failure cause (from the job logs)
- cargo-deny failed to deserialize the repository config file deny.toml. Logs show the parser error pointing at line 36: the entry unknown = "deny" — and then: "failed to deserialize config from '/home/runner/work/hausKI/hausKI/deny.toml'".
- This is a schema mismatch between the deny.toml contents and the cargo-deny version used in the runner. Either the config uses fields introduced in a newer cargo-deny schema, or the runner has an older cargo-deny that does not recognise the key.

Quick resolution (recommended)
1) Pin/install a cargo-deny version in the security workflow that is compatible with your deny.toml (the file uses licenses.version = 2 and the unknown = "deny" key). Add an explicit step to install cargo-deny before running the checks so CI uses a known-good version.

Example workflow snippet to add to .github/workflows/security.yml (insert before running cargo-deny):
- install the latest stable cargo-deny (or pin a supported version)
- print cargo-deny version for future debugging

```yaml
# insert into .github/workflows/security.yml before the cargo-deny step
- name: Install cargo-deny
  run: |
    # pin to a reproducible version or install latest
    cargo install --locked cargo-deny --version 0.13.0 || cargo install --locked cargo-deny
    cargo-deny --version

- name: Show deny config (debug)
  run: |
    echo "deny.toml (ref d39e906b8cd86cce1f44555ce23f9ae44781b2c4):"
    sed -n '1,120p' deny.toml
```

Notes:
- Replace 0.13.0 with a specific release that you have verified supports licenses.version = 2 and the unknown field. Pinning gives reproducible CI results.
- The debug step (printing cargo-deny version and the config) will make future failures clear.

Alternative (if you prefer to change the config)
- If you cannot change the runner/tool version, alter deny.toml to match the older schema supported by the installed cargo-deny:
  - Remove or rename the offending key (unknown = "deny") to the equivalent field the older schema expects, or drop it to use the tool’s default handling.
  - Example minimal edit (comment out the line) — quick but less ideal than pinning the tool:

```diff
 33| confidence-threshold = 0.9
 34| # Wie mit problematischen Klassen umgehen:
 35| unlicensed = "deny"
-36| unknown = "deny"
+36| # unknown = "deny"  # removed because older cargo-deny does not accept this key
 37| copyleft = "deny" # auf "warn" setzen, wenn du temporäre Toleranz brauchst
```

How to verify locally (or in CI)
- Check installed cargo-deny version:
  - cargo-deny --version
- Run the license check locally against your file:
  - cargo deny check licenses -c deny.toml
  - cargo deny check advisories -c deny.toml

Link to the failing config file (same ref used by the job)
- deny.toml at ref d39e906b8cd86cce1f44555ce23f9ae44781b2c4:
  https://github.com/heimgewebe/hausKI/blob/d39e906b8cd86cce1f44555ce23f9ae44781b2c4/deny.toml

Recommended next steps
1. Update the workflow to install/pin cargo-deny as shown and re-run the security job.
2. If you prefer changing deny.toml, test that the modified file deserializes with the current cargo-deny in your CI by adding the debug steps above and running cargo deny locally first.
3. Keep the cargo-deny version pinned in CI to avoid future schema drift or, alternatively, add a CI-only step to validate the config schema early with cargo-deny --version and fail with a clear message advising to update config or tool.

