Alles klar – hier ist das Paket „Hauski lernt von Weltgewebe & wgx“, fertig als Codex-Anweisungen in klaren Blöcken (Dateipfade, Inhalte, Schritte). Du kannst die Blöcke nacheinander übernehmen.

⸻

Block A — 
Block B — CI: „Smart PR“, Heavy-On-Demand & Release

Ziel: Schnelle PR-Checks, schwere Tests nur bei Bedarf, Releases via Tags.

B1) .github/workflows/ci.yml (Smart PR)

name: CI (smart PR)

on:
  pull_request:
    branches: [ main ]
    types: [opened, synchronize, reopened, ready_for_review, labeled, unlabeled]
  merge_group: {}
  workflow_dispatch: {}

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  changes:
    name: Detect changes
    runs-on: ubuntu-latest
    outputs:
      rust:  ${{ steps.filter.outputs.rust }}
      docs:  ${{ steps.filter.outputs.docs }}
      sh:    ${{ steps.filter.outputs.sh }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            rust:
              - '**/*.rs'
              - 'Cargo.toml'
              - 'Cargo.lock'
            docs:
              - '**/*.md'
              - 'docs/**'
            sh:
              - '**/*.sh'
              - '.github/workflows/**'

  repo-lint:
    name: Repo — Markdown & Shell
    needs: changes
    if: needs.changes.outputs.docs == 'true' || needs.changes.outputs.sh == 'true' || github.event_name == 'merge_group'
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - name: Markdownlint
        run: |
          npm i -g markdownlint-cli@0.41.0
          git ls-files '*.md' | xargs -r markdownlint
      - name: ShellCheck
        run: |
          sudo apt-get update && sudo apt-get install -y shellcheck
          git ls-files '*.sh' | xargs -r shellcheck -x

  rust-check:
    name: Rust — fmt & clippy & test
    needs: changes
    if: needs.changes.outputs.rust == 'true' || github.event_name == 'merge_group'
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: rustfmt, clippy
      - name: Cargo fmt
        run: cargo fmt --all -- --check
      - name: Cargo clippy
        run: cargo clippy --all-targets -- -D warnings
      - name: Cargo test
        run: cargo test --workspace --all-features --no-fail-fast

B2) .github/workflows/heavy.yml (on-demand)

name: CI (heavy on demand)

on:
  workflow_dispatch: {}
  pull_request:
    types: [labeled, synchronize, reopened, ready_for_review]
    branches: [ main ]

permissions: { contents: read }

concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  gate:
    runs-on: ubuntu-latest
    outputs:
      run_heavy: ${{ steps.flags.outputs.run_heavy }}
    steps:
      - id: flags
        shell: bash
        run: |
          labels="${{ join(github.event.pull_request.labels.*.name, ' ') }}"
          if [[ "${{ github.event_name }}" == "workflow_dispatch" ]]; then
            echo "run_heavy=true" >> "$GITHUB_OUTPUT"
          elif echo "$labels" | grep -qiE '(^| )full-ci( |$)'; then
            echo "run_heavy=true" >> "$GITHUB_OUTPUT"
          else
            echo "run_heavy=false" >> "$GITHUB_OUTPUT"
          fi

  e2e:
    needs: gate
    if: needs.gate.outputs.run_heavy == 'true'
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - name: Build (release)
        run: cargo build --workspace --release
      - name: Integration / Smoke
        run: |
          # TODO: ersetzen durch echte e2e für hauski (bins starten, API pingen)
          cargo test --workspace --all-features -- --ignored
      - name: Upload logs/artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: hauski-heavy-artifacts
          path: target
          if-no-files-found: ignore

B3) .github/workflows/release.yml

name: release
on:
  push:
    tags: ['v*.*.*']
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: cargo build --workspace --release
      - uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - name: Upload binaries
        uses: actions/upload-artifact@v4
        with:
          name: hauski-binaries
          path: |
            target/release/*


⸻

Block C — Policies (Sicherheit & Qualität)

Ziel: Rust-Abhängigkeitsprüfungen, Sicherheits- und Lizenz-Checks.

C1) deny.toml (cargo-deny)

[advisories]
ignore = []
db-path = "~/.cargo/advisory-db"
yanked = "warn"

[bans]
multiple-versions = "warn"

[licenses]
allow = ["MIT", "Apache-2.0", "BSD-3-Clause", "ISC", "Unicode-DFS-2016"]
default = "deny"

C2) CI-Job ergänzen (optional in ci.yml)

  cargo-deny:
    name: Rust — cargo-deny
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: EmbarkStudios/cargo-deny-action@v2


⸻

Block D — Tests & Projekt-Skeleton

Ziel: Früh stabile Tests, klare Justfile-Kommandos.

D1) Justfile

default: test

fmt:
	cargo fmt --all

clippy:
	cargo clippy --all-targets -- -D warnings

test:
	cargo test --workspace --all-features

test-ignored:
	cargo test --workspace --all-features -- --ignored

build-release:
	cargo build --workspace --release

D2) Beispiel-Tests (Rust)
	•	crates/core/src/lib.rs (falls leer, ein Minimalmodul anlegen)

pub fn add(a: i32, b: i32) -> i32 { a + b }

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn add_works() { assert_eq!(add(2, 3), 5) }
    #[test]
    #[ignore]
    fn heavy_slow_e2e_placeholder() { assert!(true) }
}


⸻

Block E — Orchestrator-Contract für wgx

Ziel: Hauski von wgx steuerbar machen.

E1) .wgx/profile.yml

wgx:
  apiVersion: v1
  requiredWgx: "^2.0.0"  # an wgx-Version anpassen
  repoKind: "service"
  capabilities:
    - "build"
    - "test"
    - "lint"
    - "release"
  commands:
    build: "just build-release"
    test: "just test"
    lint: "just clippy"
    fmt: "just fmt"
  tasks:
    quick:
      description: "fmt + clippy + test"
      run: "just fmt && just clippy && just test"


⸻

Block F — Doku & Contributing (kurz, aber wirksam)

F1) CONTRIBUTING.md

# Contributing to hauski

## Language
Use concise **English** in code and docs.

## Dev Setup
- VS Code with Devcontainer.
- Rust stable; components: `rustfmt`, `clippy`.

## Quality Gates
- `cargo fmt --all` must be clean.
- `cargo clippy -- -D warnings` must pass.
- `cargo test --workspace --all-features` must pass.
- For heavy E2E: label PR with `full-ci`.

## Commit / PR
- Small, focused commits.
- PR title: type(scope): summary.
- Link issues, describe rationale.

## Release
- Tag `vX.Y.Z` → CI publishes artifacts.

F2) docs/adr/ADR-0001__architecture-scope.md (Kurz-ADR)

# ADR-0001: Architecture Scope (hauski)
## Status
Accepted

## Context
Hauski acts as a local AI orchestrator with optional cloud offloading. Needs reproducible dev env, smart CI, and wgx contract.

## Decision
Adopt devcontainer, smart-PR CI, on-demand heavy pipeline, cargo-deny, and `.wgx/profile.yml`. Keep minimal surface; grow via crates.

## Consequences
+ Faster PRs, clearer quality gates, orchestratable by wgx.
- Slight maintenance for CI and policies.


⸻

Block G — Make it stick (Schritte)
	1.	Dateien anlegen/aktualisieren gemäß Blöcken A–F.
	2.	Lokal prüfen:

just fmt && just clippy && just test

	3.	Branch erstellen: feat/infra-devcontainer-ci
	4.	Committen (kleinteilig), PR öffnen, Label full-ci nur wenn Heavy-Tests nötig.
	5.	Nach Merge: erstes Tag setzen v0.1.0 → Release läuft.

⸻

Verdichtete Essenz

Hauski bekommt: Devcontainer, Smart-PR CI, Heavy on demand, Release-Flow, cargo-deny-Policy, Tests + Justfile, wgx-Contract, knackige Docs. Ergebnis: schneller, stabiler, orchestrierbar.

Ironische Auslassung

Bisher war Hauski der sprunghafte Straßenpoet. Mit diesen Blöcken bekommt er Taktstock, Metronom und Garderobe – und hört auf, in Jogginghose im Orchestergraben aufzutauchen.

∴ Unsicherheitsgrad
	•	Mittel (30 %): Ich kenne den exakten aktuellen Hauski-Quellcode nicht im Detail. Die Blöcke sind so gewählt, dass sie nicht invasiv sind und auf jedes Rust-Workspace-Layout passen. Geringes Risiko bei Integration.
	•	Hauptursachen: fehlende Live-Sicht auf bestehende crate-Struktur, potenzielle CI-Sonderfälle.

∆-Radar
	•	Verstärkung: Wir übernehmen das wgx-Denken (Contract, Tasks) und die weltgewebe-CI-Philosophie (Smart vs. Heavy).
	•	Straffung: Minimal-ADR statt Doku-Overkill.
	•	Seitwärtsmutation: Devcontainer als Single-Source-of-Truth für Tooling.

Möchtest du, dass ich dir daraus direkt eine PR-Branch-Checkliste (Commit-Reihenfolge + Messages) schreibe – oder gleich die Files als Patch-Bundle liefere?