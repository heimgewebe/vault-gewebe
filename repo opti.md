Weltgewebe Repository-Optimierung: Universelle Anweisungen für AI-Assistenten
Version: 2.0
Datum: 2025-11-07
Zielgruppe: Codex, Jules, andere AI Code-Assistenten
Geltungsbereich: Alle Weltgewebe-Repositories

 
🎯 Ziel dieser Anweisungen
Optimiere dieses Repository für:

1. Bessere AI-Programmierbarkeit (schnelleres Kontextverständnis)
2. Reduzierte Komplexität (weniger Branches, klarere Struktur)
3. Konsistente Patterns (einheitliche CI/CD, Dependencies, Dokumentation)
4. Cross-Repo-Kohärenz (klare Abhängigkeiten, gemeinsame Standards)
 
📋 Phase 1: Analyse & Assessment
1.1 Repository-Typ Erkennen
Identifiziere den Repo-Typ anhand dieser Merkmale:

Rust-Service (Cargo.toml vorhanden)

• Beispiele: leitstand, weltgewebe, wgx
• Fokus: Workspace-Integration, Dependency-Management
Bash/Python-Script-Repo (*.sh, *.py dominant)

• Beispiele: aussensensor, mitschreiber
• Fokus: Modularisierung, Function Libraries
Contract/Schema-Repo (*.proto, *.json Schemas)

• Beispiele: contracts
• Fokus: Versionierung, Breaking-Change-Detection
Dokumentations-Repo (überwiegend *.md)

• Beispiele: metarepo, docs/
• Fokus: Struktur, Cross-Referenzen
CLI/Tooling (ausführbare Tools)

• Beispiele: wgx, tools
• Fokus: Help-Dokumentation, Subcommand-Struktur
1.2 Probleme Identifizieren
Prüfe auf diese typischen Issues:

Branch-Chaos
git branch -a | wc -l # >20 Branches? → Cleanup needed

Duplicate Dependencies (Rust)
grep -r "tokio" */Cargo.toml | wc -l # >1? → Workspace candidate

Inkonsistente CI
find . -name ".yml" -path "/.github/workflows/*" | xargs grep "runs-on"

Verschiedene Images? → Standardisierung needed
Fehlende AI-Kontext-Datei
[ -f ".ai-context.yml" ] || echo "FEHLT"

Outdated Branches
git for-each-ref --sort=-committerdate refs/heads/ --format='%(refname:short) %(committerdate:relative)'

Branches älter als 30 Tage? → Stale
Erstelle einen Assessment-Report:

Assessment für [REPO_NAME]
Typ: [Rust-Service|Bash-Script|Contract|Docs|CLI]

Gefundene Probleme:

• [ ] Branch-Proliferation (Anzahl: X)
• [ ] Duplicate Dependencies (Details: ...)
• [ ] Inkonsistente CI/CD
• [ ] Fehlende .ai-context.yml
• [ ] Undokumentierte Dependencies
• [ ] [Weitere...]
Priorität: [Hoch|Mittel|Niedrig]

 
🔧 Phase 2: Standard-Fixes (Für ALLE Repos)
2.1 AI-Kontext-Datei Erstellen
Datei: .ai-context.yml (im Repo-Root)

AI Context Configuration for [REPO_NAME]
Version: 1.0
project:
name: "[REPO_NAME]"
description: "[Kurzbeschreibung - 1-2 Sätze]"
role: "[Hauptfunktion im Ecosystem]"
language: "[Rust|Bash|Python|Mixed]"

dependencies:
internal:
# Andere Weltgewebe-Repos, die dieses Repo benötigt
- name: "[repo-name]"
relationship: "[uses|provides|consumes]"
interface: "[API endpoint|Schema|CLI|Library]"

external:
# Wichtige externe Dependencies
- "[dependency-name] ([version])"

architecture:
entry_points:
# Wo startet die Execution?
- "[src/main.rs|scripts/entrypoint.sh|...]"

key_modules:
# Wichtigste Code-Komponenten
- path: "[path/to/module]"
purpose: "[Kurzbeschreibung]"

data_flow:
# Vereinfachter Datenfluss
input: "[Quelle]"
processing: "[Komponente]"
output: "[Ziel]"

conventions:
branching: "main + feature/* + hotfix/*"
commit_prefix: "[repo-name]"
ci_platform: "GitHub Actions"

documentation:
architecture_decisions: "docs/adr/"
runbook: "docs/runbook.md"
api_reference: "[URL oder Path]"

Für AI-Assistenten relevante Infos
ai_hints:

• "[Wichtiger Kontext für Code-Generation]"
• "[Bekannte Fallstricke oder Constraints]"
• "[Bevorzugte Patterns oder Anti-Patterns]"
Aktion: Erstelle diese Datei mit repo-spezifischen Werten.

2.2 Branch Cleanup Automatisierung
Datei: .github/workflows/branch-cleanup.yml

name: Branch Cleanup

on:
schedule:
- cron: '0 3 * * 0' # Sonntags 3 Uhr
workflow_dispatch:

jobs:
cleanup:
runs-on: ubuntu-latest
permissions:
contents: write

steps:
 - uses: actions/checkout@v4
   with:
     fetch-depth: 0
 
 - name: Delete merged branches
   run: |
     # Branches die in main gemerged wurden
     git branch --merged main | grep -vE '(main|master)' | xargs -r git branch -d
     
     # Remote branches cleanup
     git fetch --prune
     
     # Stale branches (>60 Tage inaktiv)
     git for-each-ref --sort=-committerdate refs/heads/ \
       --format='%(refname:short) %(committerdate:unix)' | \
     while read branch date; do
       age=$(( ($(date +%s) - $date) / 86400 ))
       if [ $age -gt 60 ] && [[ ! "$branch" =~ ^(main|master|dev)$ ]]; then
         echo "Deleting stale branch: $branch (${age} days old)"
         git branch -D "$branch" || true
       fi
     done
 
 - name: Cleanup remote branches
   run: |
     git remote prune origin
2.3 Standard .editorconfig
Datei: .editorconfig

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

2.4 README-Struktur Standardisieren
Füge diese Sections zu README.md hinzu (falls fehlend):

[REPO_NAME]
[Kurzbeschreibung aus .ai-context.yml]

🎯 Zweck
[Hauptfunktion dieses Repos im Weltgewebe-Ökosystem]

🏗️ Architektur
graph LR
Input[Eingabe] --> Process[Verarbeitung]
Process --> Output[Ausgabe]

🔗 Dependencies
Interne:

• repo-name - [Beziehung]
Externe:

• dependency (version) - [Zweck]
🚀 Quick Start
Setup
[setup-commands]

Run
[run-commands]

Test
[test-commands]

📁 Struktur
repo-name/
├── [wichtige-datei] # Beschreibung
├── [wichtiger-ordner]/
│ └── [komponente] # Beschreibung
└── docs/
├── adr/ # Architecture Decision Records
└── runbook.md  # Operational Guide

🧪 Testing
[Test-Strategie und -Commands]

📚 Dokumentation
• ADRs: docs/adr/
• Runbook: docs/runbook.md
• AI Context: .ai-context.yml
🤝 Contributing
Siehe CONTRIBUTING.md im Metarepo.

📝 License
[License Information]

 
🔧 Phase 3: Typ-Spezifische Optimierungen
3.A Rust-Service Repos
3.A.1 Workspace-Integration Prüfen
Prüfe ob Workspace sinnvoll ist:

Sind mehrere Rust-Projekte im gleichen Ordner?
find ~/repos -name "Cargo.toml" -not -path "/target/" | wc -l

>3? → Workspace erstellen
Falls JA, erstelle ~/repos/Cargo.toml (Workspace Root):

[workspace]
members = [
"leitstand",
"weltgewebe",
"wgx",
# Weitere Rust-Repos
]

[workspace.package]
version = "0.1.0"
edition = "2021"
authors = ["Alex email@example.com"]
license = "MIT OR Apache-2.0"

[workspace.dependencies]

Shared Dependencies
tokio = { version = "1.43", features = ["full", "macros", "rt-multi-thread"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
anyhow = "1.0"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }

Weitere gemeinsame Dependencies
In jedem Mitglied-Repo (leitstand/Cargo.toml):

[package]
name = "leitstand"
version.workspace = true
edition.workspace = true

[dependencies]
tokio = { workspace = true }
serde = { workspace = true }
serde_json = { workspace = true }

... weitere workspace dependencies
3.A.2 CI/CD für Rust Standardisieren
Datei: .github/workflows/rust-ci.yml

name: Rust CI

on:
push:
branches: [ main ]
paths:
- '**.rs'
- 'Cargo.toml'
- 'Cargo.lock'
pull_request:

jobs:
test:
runs-on: ubuntu-latest
steps:
- uses: actions/checkout@v4

 - name: Setup Rust
   uses: dtolnay/rust-toolchain@stable
   with:
     components: clippy, rustfmt
 
 - name: Cache
   uses: actions/cache@v3
   with:
     path: |
       ~/.cargo/registry
       ~/.cargo/git
       target/
     key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}
 
 - name: Check formatting
   run: cargo fmt --check
 
 - name: Clippy
   run: cargo clippy -- -D warnings
 
 - name: Test
   run: cargo test --all-features
 
 - name: Build
   run: cargo build --release
3.B Bash/Python-Script Repos
3.B.1 Modularisierung in lib/
Ziel: Funktionen in wiederverwendbare Module auslagern

Struktur:

repo-name/
├── lib/
│ ├── validation.sh  # Nur Validierungs-Funktionen
│ ├── http.sh  # Nur HTTP-Client-Funktionen
│ ├── locking.sh  # Nur Atomic-Operations
│ └── logging.sh  # Nur Logging-Utilities
├── scripts/
│ ├── main-script.sh  # Orchestriert lib/* Funktionen
│ └── helper.sh
└── tests/
└── *.bats

Beispiel lib/validation.sh:

#!/bin/bash

@ai-hint: JSON Schema validation utilities
@ai-hint: Dependencies: jq, check-jsonschema
validate_json_schema() {
# @ai-hint: Validates JSON file against schema
local json_file="$1"
local schema_file="$2"

if ! command -v check-jsonschema &>/dev/null; then
   echo "ERROR: check-jsonschema not installed" >&2
   return 1
fi

check-jsonschema --schemafile "$schema_file" "$json_file"
}

validate_jsonl_line() {
# @ai-hint: Validates single JSONL line
local line="$1"

if ! printf '%s' "$line" | jq -e . >/dev/null 2>&1; then
   echo "ERROR: Invalid JSON in line" >&2
   return 1
fi
}

Hauptskript verwendet die Lib:

#!/bin/bash

@ai-hint: Main event append script
@ai-hint: Composes lib/validation.sh + lib/locking.sh
set -euo pipefail

SCRIPT_DIR="(dirname "{SCRIPT_DIR}/../lib/validation.sh"
source "${SCRIPT_DIR}/../lib/locking.sh"

append_event() {
local event_json="$1"

# Use lib functions
validate_jsonl_line "$event_json" || return 1
atomic_append "feed.jsonl" "$event_json" || return 1
}

3.B.2 CI für Scripts
Datei: .github/workflows/scripts-ci.yml

name: Scripts CI

on:
push:
paths:
- '
.sh'- '.bash'
pull_request:

jobs:
shellcheck:
runs-on: ubuntu-latest
steps:
- uses: actions/checkout@v4

 - name: ShellCheck
   run: |
     find . -name "*.sh" -o -name "*.bash" | \
     xargs shellcheck --severity=warning
bats:
runs-on: ubuntu-latest
steps:
- uses: actions/checkout@v4

 - name: Install BATS
   run: |
     git clone https://github.com/bats-core/bats-core.git
     cd bats-core && sudo ./install.sh /usr/local
 
 - name: Run tests
   run: |
     if [ -f "tests/run.sh" ]; then
       ./tests/run.sh
     fi
3.C Contract/Schema Repos
3.C.1 Versionierungsstrategie
Struktur:

contracts/
├── schemas/
│ └── v1/
│ ├── event.schema.json
│ └── state.schema.json
├── protos/
│ └── v1/
│ └── service.proto
└── tests/
└── fixtures/
└── v1/
└── valid-event.json

3.C.2 Breaking Change Detection
Datei: .github/workflows/contract-validation.yml

name: Contract Validation

on:
pull_request:
paths:
- 'schemas/
'- 'protos/'

jobs:
breaking-changes:
runs-on: ubuntu-latest
steps:
- uses: actions/checkout@v4
with:
fetch-depth: 0

 - name: Check for breaking changes
   run: |
     # Compare schemas between main and PR branch
     git diff origin/main HEAD -- schemas/ | \
     grep -E '^\-.*"required"|^\-.*"type"' && \
     echo "::error::Breaking schema change detected" && exit 1 || true
 
 - name: Validate all fixtures
   run: |
     npm install -g ajv-cli
     find schemas/ -name "*.schema.json" | while read schema; do
       fixture_dir="tests/fixtures/$(dirname ${schema#schemas/})"
       if [ -d "$fixture_dir" ]; then
         find "$fixture_dir" -name "*.json" | while read fixture; do
           ajv validate -s "$schema" -d "$fixture" || exit 1
         done
       fi
     done
 
🔧 Phase 4: Cross-Repo Kohärenz
4.1 Dependency Graph Dokumentieren
Datei: docs/architecture/dependency-graph.md

Weltgewebe Dependency Graph
graph TD
aussensensor[aussensensor] -->|pushes events| leitstand[leitstand]
heimlern[heimlern] -->|ingests from| leitstand
weltgewebe[weltgewebe] -->|validates against| contracts[contracts]
leitstand -->|uses schemas| contracts
wgx[wgx CLI] -->|orchestrates| leitstand
wgx -->|orchestrates| aussensensor

Dependency Matrix
Consumer

Provider

Interface

Breaking Change Impact

aussensensor

leitstand

HTTP POST /ingest/aussen

🔴 High

heimlern

leitstand

HTTP GET /events

🟡 Medium

weltgewebe

contracts

JSON Schema validation

🔴 High

 
4.2 Shared CI/CD Templates
Datei: .github/workflows/reusable-validate.yml (im metarepo)

name: Reusable Validation

on:
workflow_call:
inputs:
schema_path:
required: true
type: string
data_path:
required: true
type: string

jobs:
validate:
runs-on: ubuntu-latest
steps:
- uses: actions/checkout@v4

 - name: Install validator
   run: npm install -g ajv-cli check-jsonschema
 
 - name: Validate
   run: |
     check-jsonschema \
       --schemafile ${{ inputs.schema_path }} \
       ${{ inputs.data_path }}
Verwendung in jedem Repo:

.github/workflows/validate.yml
jobs:
validate:
uses: heimgewebe/metarepo/.github/workflows/reusable-validate.yml@main
with:
schema_path: "contracts/schemas/v1/event.schema.json"
data_path: "tests/fixtures/**/*.json"

 
📊 Phase 5: Verification & Reporting
5.1 Optimierungs-Checklist
Nach Abschluss aller Änderungen, erstelle diesen Report:

Optimierungs-Report für [REPO_NAME]
Datum: [YYYY-MM-DD]
Durchgeführt von: [AI Assistant Name]

✅ Abgeschlossene Optimierungen
• [x] .ai-context.yml erstellt
• [x] Branch Cleanup Workflow hinzugefügt
• [x] .editorconfig standardisiert
• [x] README.md strukturiert
• [x] [Typ-spezifisch: Workspace/Modularisierung/...]
• [x] CI/CD standardisiert
• [x] Dependencies dokumentiert
📈 Metriken (Vorher/Nachher)
Metrik

Vorher

Nachher

Δ

Branch-Anzahl

X

Y

-Z%

Duplicate Dependencies

X

0

-100%

CI/CD Workflows

X verschiedene

1 Standard

Vereinheitlicht

Fehlende Docs

X

0

-100%

 
🎯 Nächste Schritte
• [ ] [Weitere Optimierungen]
• [ ] [Breaking Changes koordinieren]
• [ ] [Team Review]
5.2 Continuous Validation
Datei: .github/workflows/repo-health-check.yml

name: Repository Health Check

on:
schedule:
- cron: '0 6 * * 1' # Montags 6 Uhr
workflow_dispatch:

jobs:
health:
runs-on: ubuntu-latest
steps:
- uses: actions/checkout@v4
with:
fetch-depth: 0

 - name: Check for required files
   run: |
     required_files=(
       ".ai-context.yml"
       "README.md"
       ".editorconfig"
       "docs/runbook.md"
     )
     
     for file in "${required_files[@]}"; do
       if [ ! -f "$file" ]; then
         echo "::warning::Missing required file: $file"
       fi
     done
 
 - name: Check branch hygiene
   run: |
     stale_count=$(git for-each-ref --sort=-committerdate refs/heads/ \
       --format='%(refname:short) %(committerdate:unix)' | \
       awk -v now=$(date +%s) '{ if ((now - $2) / 86400 > 60) print $1 }' | wc -l)
     
     if [ $stale_count -gt 5 ]; then
       echo "::warning::Found $stale_count stale branches (>60 days)"
     fi
 
 - name: Check CI consistency
   run: |
     workflow_count=$(find .github/workflows -name "*.yml" | wc -l)
     if [ $workflow_count -gt 10 ]; then
       echo "::warning::High workflow count ($workflow_count), consider consolidation"
     fi
 
🚀 Umsetzungs-Strategie
Empfohlene Reihenfolge
Stufe 1: Low-Risk (Sofort umsetzbar)

1. .ai-context.yml erstellen (alle Repos)
2. .editorconfig hinzufügen (alle Repos)
3. Branch Cleanup Workflow (alle Repos)
4. README-Struktur verbessern (alle Repos)
Stufe 2: Medium-Risk (Koordination nötig)

1. Rust Workspace erstellen (leitstand, weltgewebe, wgx)
2. Script-Modularisierung (aussensensor, mitschreiber)
3. CI/CD vereinheitlichen (alle Repos)
Stufe 3: High-Risk (Team-Review nötig)

1. Contract Breaking Change Detection (contracts)
2. Dependency-Updates koordinieren (alle Repos)
3. Monorepo-Migration evaluieren (optional)
Automatisierte Batch-Ausführung
Für alle Repos gleichzeitig:

#!/bin/bash

apply-optimizations.sh
REPOS=(
"aussensensor"
"leitstand"
"heimlern"
"weltgewebe"
"wgx"
"contracts"
"tools"
)

for repo in "${REPOS[@]}"; do
echo "=== Optimizing repo || continue

# Phase 1: Low-Risk
[ ! -f ".ai-context.yml" ] && cp ~/templates/ai-context.yml .
[ ! -f ".editorconfig" ] && cp ~/templates/.editorconfig .

# Commit
git checkout -b optimize/ai-context-$(date +%Y%m%d)
git add .ai-context.yml .editorconfig
git commit -m "feat: Add AI context and editor config"
git push origin HEAD

cd -
done

 
📖 Referenzen & Ressourcen
Template-Dateien
Alle Templates aus diesem Dokument sind verfügbar in:

• ~/templates/.ai-context.yml
• ~/templates/.editorconfig
• ~/templates/workflows/
Weitere Dokumentation
• Weltgewebe Architektur-Übersicht
• Dependency Management Guide
• CI/CD Best Practices
Hilfe & Support
Bei Fragen oder Problemen:

1. Prüfe .ai-context.yml des betroffenen Repos
2. Konsultiere ADRs in docs/adr/
3. Erstelle Issue im metarepo
 
🎓 Für AI-Assistenten: Wichtige Hinweise
Kontext-Sammlung vor Code-Generation
Immer erst diese Dateien einlesen:

Basis-Kontext
cat .ai-context.yml
cat README.md

Architektur-Kontext
cat docs/adr/*.md
cat docs/runbook.md

Code-Kontext (bei Änderungen)
cat [relevante-source-files]

Prompt-Template für Entwicklungsaufgaben
Ich arbeite an Repository: [REPO_NAME]

Kontext aus .ai-context.yml:

• Rolle: [role]
• Sprache: [language]
• Key Dependencies: [dependencies]
Aktuelle Aufgabe:
[Beschreibung]

Erwartetes Verhalten:
[Details]

Constraints:
[Aus .ai-context.yml ai_hints]

Anti-Patterns vermeiden
❌ NICHT:

• Breaking Changes an Contracts ohne Cross-Repo-Check
• Neue Dependencies ohne Workspace-Konsultation
• Ad-hoc Branch-Namen (nur feature/*, fix/*, hotfix/*)
• Placeholder-Code oder TODOs in Main-Branch
✅ STATTDESSEN:

• Contract-Changes immer mit Breaking-Change-Check
• Dependencies via Workspace wenn möglich
• Branch-Naming-Convention befolgen
• Vollständige Implementierungen committen
 
📜 Änderungshistorie
Version

Datum

Änderung

2.0

2025-11-07

Initiale universelle Schablone

 
 
Ende der Anweisungen. Bei Unsicherheiten: Prüfe .ai-context.yml des jeweiligen Repos.