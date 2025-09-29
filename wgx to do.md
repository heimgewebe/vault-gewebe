alles klar. Hier kommen **präzise Anweisungen für Codex** (kopierfertig), um die letzten Lücken zu schließen: `validate`-Subcommand, Flag-Harmonisierung, einheitliche CI-Action und Manifest-Doku v1.1.

---

# Anweisungen für Codex

## Block B — 
## Block C — wgx: CI-Action vereinheitlichen

### C1) `.github/actions/wgx-check/action.yml` ersetzen/patchen

```yaml
# path: .github/actions/wgx-check/action.yml
name: wgx-check
description: "Prüft ein Ziel-Repo gegen wgx"
inputs:
  repo:
    required: true
  ref:
    required: false
    default: "main"
  wgx_ref:
    required: false
    default: "main"
runs:
  using: "composite"
  steps:
    - name: Checkout target
      uses: actions/checkout@v4
      with:
        repository: ${{ inputs.repo }}
        ref: ${{ inputs.ref }}

    - name: Checkout wgx (pinned)
      uses: actions/checkout@v4
      with:
        repository: alexdermohr/wgx
        ref: ${{ inputs.wgx_ref }}
        path: .wgx-tool

    - name: Link wgx
      shell: bash
      run: |
        chmod +x .wgx-tool/wgx
        echo "${PWD}/.wgx-tool" >> $GITHUB_PATH

    - name: Install basics
      shell: bash
      run: |
        set -euxo pipefail
        sudo apt-get update -y
        sudo apt-get install -y bash coreutils git jq
        # Rust (für cargo-basierte Tasks)
        curl -sSf https://sh.rustup.rs | sh -s -- -y || true
        echo "$HOME/.cargo/bin" >> $GITHUB_PATH
        # Node/pnpm heuristisch (nur wenn im Manifest-Ordner Strings darauf hinweisen)
        if grep -RiqE 'pnpm|node|npm' .wgx 2>/dev/null || grep -RiqE 'pnpm|node|npm' . 2>/dev/null; then
          curl -fsSL https://get.pnpm.io/install.sh | sh -
          echo "$HOME/.local/share/pnpm" >> $GITHUB_PATH
        fi

    - name: Validate manifest
      shell: bash
      run: |
        wgx validate --json | jq -e '.ok==true' >/dev/null

    - name: Run safe tasks (doctor/test wenn vorhanden)
      shell: bash
      run: |
        set -euo pipefail
        tasks_json="$(wgx tasks --json)"
        if echo "$tasks_json" | jq -e '.tasks[] | select(.name=="doctor")' >/dev/null; then wgx task doctor || true; fi
        if echo "$tasks_json" | jq -e '.tasks[] | select(.name=="test")'   >/dev/null; then wgx task test;   fi
```

### C2) `compat.yml` bleibt, nutzt jetzt die **eine** vereinheitlichte Action

> Falls zwei Varianten existieren: nur diese verwenden; optional `wgx_ref` auf Tag/SHA pinnen.

---

## Block D — hauski: CI-Flag korrigieren & Validate einbauen

### D1) `.github/workflows/wgx-smoke.yml` patchen

```yaml
# path: .github/workflows/wgx-smoke.yml
name: wgx-smoke
on:
  pull_request:
  push:
    branches: [ "main" ]

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Checkout pinned wgx
        uses: actions/checkout@v4
        with:
          repository: alexdermohr/wgx
          ref: main   # TODO: auf Tag/SHA pinnen
          path: .wgx-tool

      - name: Link wgx
        run: |
          chmod +x .wgx-tool/wgx
          echo "${PWD}/.wgx-tool" >> $GITHUB_PATH

      - name: Validate
        run: wgx validate --json | jq -e '.ok==true'

      - name: Doctor (optional)
        run: |
          set -e
          if wgx tasks | grep -qx doctor; then wgx task doctor || true; fi
```

> Wichtig: **Kein** `wgx task doctor --json` mehr hier. Nur `wgx tasks --json` nutzen, wenn ihr JSON braucht (z. B. fürs Filtern).

---

## Block E — weltgewebe: CI analog korrigieren

### E1) `.github/workflows/wgx-smoke.yml` patchen

```yaml
# path: .github/workflows/wgx-smoke.yml
name: wgx-smoke
on:
  pull_request:
  push:
    branches: [ "main" ]

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Checkout pinned wgx
        uses: actions/checkout@v4
        with:
          repository: alexdermohr/wgx
          ref: main   # TODO: auf Tag/SHA pinnen
          path: .wgx-tool

      - name: Link wgx
        run: |
          chmod +x .wgx-tool/wgx
          echo "${PWD}/.wgx-tool" >> $GITHUB_PATH

      - name: Validate
        run: wgx validate --json | jq -e '.ok==true'

      - name: Doctor (optional)
        run: |
          set -e
          if wgx tasks | grep -qx doctor; then wgx task doctor || true; fi
```

---

## Block F — wgx: README-Doku zum Manifest v1.1 ergänzen

### F1) `README.md` Abschnitt hinzufügen/aktualisieren

````md
## .wgx/profile (v1 / v1.1)

- **Datei**: `.wgx/profile.yml` (oder `.yaml` / `.json`)
- **apiVersion**:
  - `v1`: einfache Strings für `tasks.<name>`
  - `v1.1`: reichere Spezifikation (Arrays, desc/group/safe, envDefaults/Overrides, requiredWgx-Objekt)

### Minimales Beispiel (v1)
```yaml
wgx:
  apiVersion: v1
  requiredWgx: "^2.0"
  repoKind: "generic"
  tasks:
    test: "cargo test --workspace"
````

### Erweitertes Beispiel (v1.1)

```yaml
wgx:
  apiVersion: v1.1
  requiredWgx:
    range: "^2.0"
    min: "2.0.3"
    caps: ["task-array","status-dirs"]
  repoKind: "hauski"
  dirs: { web: "", api: "crates", data: ".local/state/hauski" }
  env:
    RUST_LOG: "info,hauski=debug"
  envDefaults:
    RUST_BACKTRACE: "1"
  envOverrides: {}
  tasks:
    doctor: { desc: "Sanity checks", safe: true, cmd: ["cargo","run","-p","hauski-cli","--","doctor"] }
    test:   { desc: "Workspace tests", safe: true, cmd: ["cargo","test","--workspace","--","--nocapture"] }
    serve:  { desc: "Dev server",      cmd: ["cargo","run","-p","hauski-cli","--","serve"] }
```

### CLI

- `wgx validate [--json]` → prüft Manifest, Version-Range, Mindestversion; JSON: `{ ok, errors[] }`.
    
- `wgx tasks [--json]` → listet Tasks; JSON: `{ tasks: [{name,desc,group,safe}] }`.
    
- `wgx task <name> [...]` → führt Task aus; **Array-Tasks ohne eval**, String-Tasks via `bash -lc`.
    
- `wgx status` → zeigt `repoKind` und `dirs.*` (existiert/nicht).
    

### Version & Capabilities

- `requiredWgx: "^2.0"` entspricht `>=2.0.0 <3.0.0`.
    
- `requiredWgx.min` erzwingt Mindestversion.
    
- `requiredWgx.caps` listet Fähigkeiten (z. B. `task-array`, `status-dirs`), die das Repo erwartet.
    

````

---

## Block G — Copy-to-Bash (lokal anwenden)

```bash
# wgx: validate-Subcommand + Router-Hook
cd ~/code/wgx
git checkout -b feat/wgx-validate
mkdir -p cmd
cat > cmd/validate.bash <<'EOF'
# (füge hier den Inhalt aus Block A1 ein)
EOF

# Router patchen (Block A2): SUB-Switch in wgx erweitern
# (manuell oder mit sed, je nach Struktur)
git add -A
git commit -m "feat(validate): add validate subcommand (human/JSON) + router hook"

# Action vereinheitlichen (Block C1)
mkdir -p .github/actions/wgx-check
cat > .github/actions/wgx-check/action.yml <<'EOF'
# (füge hier die vereinheitlichte Action aus Block C1 ein)
EOF
git add -A
git commit -m "ci(wgx-check): unify reusable action; add validate and safe tasks"

git push -u origin feat/wgx-validate

# hauski: Smoke-Workflow korrigieren (Block D1)
cd ~/code/hauski
git checkout -b chore/wgx-smoke-validate
# ersetze wgx-smoke.yml mit Block D1
git add -A
git commit -m "chore(ci): use wgx validate; remove unsupported task --json"
git push -u origin chore/wgx-smoke-validate

# weltgewebe: Smoke-Workflow korrigieren (Block E1)
cd ~/code/weltgewebe
git checkout -b chore/wgx-smoke-validate
# ersetze wgx-smoke.yml mit Block E1
git add -A
git commit -m "chore(ci): use wgx validate; align smoke workflow"
git push -u origin chore/wgx-smoke-validate
````

---

## Verdichtete Essenz

Drei Schrauben, große Wirkung: `wgx validate` implementieren, CI auf `validate` + `tasks --json` umstellen, Manifest v1.1 offiziell dokumentieren. Damit ist die wgx-Integration **konsistent, prüfbar und zukunftsfest**.

## Prof. Dr. Kranich – ironische Auslassung

„Erst wenn das Gesetz (`validate`) geschrieben ist, hört die Willkür (`--json` überall) auf zu tanzen. Ordnung ist die höfliche Schwester der Macht.“

## ∆-Radar

- **Verstärkung:** Einheitliche CI-Action; klares `validate`; Doku v1.1.
    
- **Abbau:** Flag-Drift (`task --json`) eliminiert; Doppel-Actions konsolidiert.
    
- **Seitwärts:** Heuristik für Node/pnpm in CI – reicht fürs Erste, künftig Pinning pro Repo sinnvoll.
    

## ∴fores Ungewissheit (0.18 — niedrig)

- **Tooling-Verfügbarkeit** (jq, rustup, pnpm) im CI durch Heuristik, aber nicht hart garantiert → bei exotischen Repos ggf. `ci.setup` ergänzen.
    
- **Router-Hook-Position** abhängig von deiner `wgx`-Dateistruktur → ggf. minimal manuell anpassen.