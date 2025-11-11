/home/alex/vault-gewebe/schule/konflikte/martina.canvasuper — hier sind knackige, ausführbare Anweisungen für Jules. Ich habe sie in 2 PRs gegliedert (klein → groß), inkl. Branch-Namen, Shell-Snippets, Commit-Texte, DoD & Checks. PR 1 — „ci+context cleanup & schema checks“ Branch: feat/ci-context-and-schemas Ziele .ai-context.yml auf Rust korrigieren. eine konsolidierte Rust-CI (Clippy/Tests/Smoke). Schema-Validierung der JSON-Beispiele in CI. Schritte

Branch git checkout -b feat/ci-context-and-schemas
.ai-context.yml korrigieren primary_language: rust architecture.entrypoints auf Beispiele zeigen, z. B.: crates/heimlern-bandits/examples/decide.rs crates/heimlern-bandits/examples/integrate_hauski.rs (falls vorhanden) Minimalbeispiel: name: heimlern primary_language: rust architecture: entrypoints:

crates/heimlern-bandits/examples/decide.rs
crates/heimlern-bandits/src/lib.rs
CI konsolidieren Behalte/erstelle eine Datei, z. B. .github/workflows/rust.yml. Entferne die zweite, redundante CI (.github/workflows/ci.yml), falls sie das gleiche tut. Inhalt für rust.yml (anpassen, falls schon vorhanden): name: rust (cached)
on: push: pull_request:

jobs: build-test: runs-on: ubuntu-latest steps: - uses: actions/checkout@v4

  - uses: dtolnay/rust-toolchain@stable
    with:
      toolchain: stable
      components: clippy, rustfmt

  - name: Cache cargo
    uses: Swatinem/rust-cache@v2

  - name: fmt
    run: cargo fmt --all --check

  - name: clippy
    run: cargo clippy --all-targets -- -D warnings

  - name: test
    run: cargo test --all --locked --workspace --verbose

  - name: smoke: run decide example
    run: cargo run -p heimlern-bandits --example decide --quiet
schema-validate: runs-on: ubuntu-latest steps: - uses: actions/checkout@v4

  - name: Setup Python
    uses: actions/setup-python@v5
    with:
      python-version: '3.x'

  - name: Install jsonschema
    run: python -m pip install --upgrade pip jsonschema

  - name: Validate sample JSONs
    run: |
      python scripts/validate_json.py \
        --schemas contracts/ \
        --samples samples/
Falls scripts/validate_json.py andere Flags/Ordner erwartet: im Schritt oben die Pfade anpassen (Ordner contracts/ & samples/ sind Platzhalter für euren aktuellen Stand). 4) Commit & Push git add -A git commit -m "ci: consolidate rust workflow, add schema validation; fix .ai-context to Rust" git push -u origin feat/ci-context-and-schemas

PR eröffnen (Titel + Body) Titel: chore(ci): consolidate rust workflow + add schema validation; fix AI context Body (Kurzfassung): .ai-context.yml auf Rust korrigiert. Redundante CI zusammengeführt → ein Rust-Workflow. JSON-Schema-Validierung in CI ergänzt (jsonschema). Smoke-Run (examples/decide) bleibt enthalten. Definition of Done ✅ CI läuft grün (fmt, clippy, tests, smoke). ✅ Schema-Job validiert Beispiele. ✅ Keine doppelte CI mehr. ✅ .ai-context.yml zeigt auf Rust & gültige Entry-Points. PR 2 — „docs+release + extra smoke“ Branch: feat/docs-and-release Ziele Rust-Docs bauen & als CI-Artefakt anhängen. Zweiten Smoke-Run (z. B. integrate_hauski) ergänzen. Versionspflege & einfacher Release-Workflow (Tag → Artefakte). Schritte
Branch git checkout -b feat/docs-and-release
CI: Rust-Docs als Artefakt In .github/workflows/rust.yml neuen Job oder Step ergänzen: docs: runs-on: ubuntu-latest steps:

uses: actions/checkout@v4
uses: dtolnay/rust-toolchain@stable with: toolchain: stable
uses: Swatinem/rust-cache@v2
name: build docs run: cargo doc --no-deps --workspace
name: upload docs artifact uses: actions/upload-artifact@v4 with: name: rustdoc path: target/doc
CI: zweiter Smoke-Run Im vorhandenen Job (build-test) zusätzlichen Schritt:

name: smoke: run integrate_hauski example run: cargo run -p heimlern-bandits --example integrate_hauski --quiet
Falls das Beispiel noch nicht existiert oder temporär fehlschlägt, als || true markieren und Issue anlegen – ideal ist aber: Beispiel funktionsfähig halten. 4) Versionen & Changelog In beiden Cargo.toml (workspace/crates) Version anheben (patch/minor). CHANGELOG.md hinzufügen (Keep a Changelog-Stil reicht). Optional: workspace.package (falls genutzt) angleichen. 5) Release-Workflow (optional aber nützlich) .github/workflows/release.yml: name: release

on: push: tags: - 'v*..'

jobs: build-and-artifacts: runs-on: ubuntu-latest steps: - uses: actions/checkout@v4 with: { fetch-depth: 0 } - uses: dtolnay/rust-toolchain@stable - uses: Swatinem/rust-cache@v2 - run: cargo test --all --locked --workspace --verbose - run: cargo build --release --workspace - name: Upload binaries uses: actions/upload-artifact@v4 with: name: binaries path: target/release/ - name: Build docs run: cargo doc --no-deps --workspace - name: Upload docs uses: actions/upload-artifact@v4 with: name: rustdoc path: target/doc

Commit & Push git add -A git commit -m "docs(ci): publish rustdoc as artifact; add extra smoke; prep release workflow + changelog" git push -u origin feat/docs-and-release
PR eröffnen Titel: feat(docs/release): rustdoc artifacts, extra smoke, versions & changelog Body (Kurzfassung): Rust-Docs als CI-Artefakte. Zweiter Smoke-Run für Haus-Integration. Versionen aktualisiert + CHANGELOG. Release-Workflow (on tag) vorbereitet. Definition of Done ✅ Beide PRs grün. ✅ decide und integrate_hauski laufen als Smoke. ✅ Docs-Artefakte sind im CI downloadbar. ✅ Version/Changelog konsistent. Nach dem Merge (Mini-Runbook) Tag setzen, um Release-Workflow zu triggern: git checkout main git pull git tag v0.1.0 git push origin v0.1.0
In der PR-Diskussion kurz dokumentieren, wie Schema-Beispiele erweitert werden (einfach neue JSON unter samples/ droppen → CI validiert automatisch). Optional: README-Badges aktualisieren („CI“, „Docs artifact“ Link in PR-Beschreibung). Wenn du möchtest, schreibe ich direkt die PR-Beschreibung als Markdown (ready-to-paste) und reiche die gezeigten YAML-Snippets als Patches mit ein.

perfekt — hier kommt alles für Jules ready-to-paste (PR-Texte + fertige Patch-Snippets).Ziel: beide PRs lassen sich ohne Nachfragen einspielen und sofort mergen, sobald CI grün läuft. 🧩 PR 1 — feat/ci-context-and-schemas 📋 PR-Beschreibung (copy-ready)

chore(ci): consolidate rust workflow + add schema validation; fix AI context

✨ Änderungen

.ai-context.yml korrigiert → Rust als primary_language.
CI konsolidiert: nur noch eine rust.yml.
JSON-Schema-Validierung eingebaut (über scripts/validate_json.py).
Beispiel-Smoke (heimlern-bandits/examples/decide.rs) bleibt enthalten.
✅ Definition of Done

CI läuft grün (fmt, clippy, test, smoke)
Schema-Job validiert Beispiel-Daten
.ai-context.yml zeigt auf Rust-Entry-Points
🧠 Patch 1 – .ai-context.yml korrigieren (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' *** Begin Patch *** Update File: .ai-context.yml @@ project:

name: heimlern
summary: Semantic ingest/index & retrieval services.
role: knowledge_index_retrieval
primary_language: python
visibility: internal
-architecture:

entrypoints:
src/main.py
name: heimlern
summary: Reinforcement-/Bandit-Policy-Framework (Rust)
role: policy_engine
primary_language: rust
visibility: internal
+architecture:

entrypoints:
crates/heimlern-bandits/examples/decide.rs
crates/heimlern-bandits/src/lib.rs *** End Patch EOF )
🧠 Patch 2 – CI Workflow (zusammengeführt) (cd "$(git rev-parse --show-toplevel)" && mkdir -p .github/workflows && git apply --3way <<'EOF' *** Begin Patch *** Add File: .github/workflows/rust.yml +name: rust (cached) + +on:

push:
pull_request:
+jobs:

build-test:
runs-on: ubuntu-latest
steps:
 - uses: actions/checkout@v4
 - uses: dtolnay/rust-toolchain@stable
   with:
     toolchain: stable
     components: clippy, rustfmt
 - name: Cache cargo
   uses: Swatinem/rust-cache@v2
 - name: fmt
   run: cargo fmt --all --check
 - name: clippy
   run: cargo clippy --all-targets -- -D warnings
 - name: test
   run: cargo test --all --locked --workspace --verbose
 - name: smoke: run decide example
   run: cargo run -p heimlern-bandits --example decide --quiet
schema-validate:
runs-on: ubuntu-latest
steps:
 - uses: actions/checkout@v4
 - name: Setup Python
   uses: actions/setup-python@v5
   with:
     python-version: '3.x'
 - name: Install jsonschema
   run: python -m pip install --upgrade pip jsonschema
 - name: Validate sample JSONs
   run: |
     python scripts/validate_json.py \
       --schemas contracts/ \
       --samples samples/
*** End Patch EOF )

✅ PR-Workflow git checkout -b feat/ci-context-and-schemas git add -A git commit -m "ci: consolidate rust workflow, add schema validation; fix .ai-context to Rust" git push -u origin feat/ci-context-and-schemas

🧩 PR 2 — feat/docs-and-release 📋 PR-Beschreibung (copy-ready)

feat(docs/release): rustdoc artifacts, extra smoke, versions & changelog

✨ Änderungen

CI erzeugt und veröffentlicht Rust-Dokumentation als Artefakt.
Zweiter Smoke-Run (integrate_hauski) ergänzt.
Versionen + CHANGELOG.md hinzugefügt.
Release-Workflow (Tag → Build + Docs) vorbereitet.
✅ Definition of Done

decide und integrate_hauski laufen als Smoke.
Rust-Docs als CI-Artefakt downloadbar.
Changelog + Versionen konsistent.
🧠 Patch 1 – zusätzliche Smoke-Steps + Docs (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' *** Begin Patch *** Update File: .github/workflows/rust.yml @@ - name: smoke: run decide example run: cargo run -p heimlern-bandits --example decide --quiet +

 - name: smoke: run integrate_hauski example
   run: cargo run -p heimlern-bandits --example integrate_hauski --quiet
docs:
runs-on: ubuntu-latest
steps:
 - uses: actions/checkout@v4
 - uses: dtolnay/rust-toolchain@stable
   with:
     toolchain: stable
 - uses: Swatinem/rust-cache@v2
 - name: build docs
   run: cargo doc --no-deps --workspace
 - name: upload docs artifact
   uses: actions/upload-artifact@v4
   with:
     name: rustdoc
     path: target/doc
*** End Patch EOF )

🧠 Patch 2 – Release-Workflow (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' *** Begin Patch *** Add File: .github/workflows/release.yml +name: release + +on:

push:
tags:
 - 'v*.*.*'
+jobs:

build-and-artifacts:
runs-on: ubuntu-latest
steps:
 - uses: actions/checkout@v4
   with:
     fetch-depth: 0
 - uses: dtolnay/rust-toolchain@stable
 - uses: Swatinem/rust-cache@v2
 - name: Run tests
   run: cargo test --all --locked --workspace --verbose
 - name: Build release
   run: cargo build --release --workspace
 - name: Upload binaries
   uses: actions/upload-artifact@v4
   with:
     name: binaries
     path: target/release/
 - name: Build docs
   run: cargo doc --no-deps --workspace
 - name: Upload docs
   uses: actions/upload-artifact@v4
   with:
     name: rustdoc
     path: target/doc
*** End Patch EOF )

🧠 Patch 3 – Changelog & Version-Bump (Minimal) (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' *** Begin Patch *** Add File: CHANGELOG.md +## v0.1.0 – Initial release candidate +- Consolidated CI & schema validation. +- Added dual smoke tests (decide, integrate_hauski). +- Added doc build and release workflow. *** End Patch EOF )

✅ PR-Workflow git checkout -b feat/docs-and-release git add -A git commit -m "docs(ci): publish rustdoc artifacts; add extra smoke; prep release workflow + changelog" git push -u origin feat/docs-and-release

🧭 Nach Merge git checkout main git pull git tag v0.1.0 git push origin v0.1.0

→ Release-Workflow startet automatisch→ Artefakte: binaries + rustdoc im Actions-Tab Nächster logischer Schritt nach diesen beiden PRs:Sichter-Dashboard oder HausKI-Integration kann die Heimlern-Policy live abrufen. Dafür lohnt sich danach ein policy/decide-HTTP-Handler + kurze JSON-Schema-Erweiterung (Phase 3).