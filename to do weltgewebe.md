Alles klar. Hier sind präzise **Anweisungen für Codex** (nur Delta, copy-paste-fertig). Jede Einheit: Ziel → Änderungen → Patch/Commands → Checks.

---

# 1) ```

---

# 2) Observability: Prometheus-Config anlegen (passt zur Compose)

**Ziel:** Fehlendes Mount-Target für Prometheus bereitstellen.

**Datei:** `infra/compose/monitoring/prometheus.yml`

**Patch:**

```bash
mkdir -p infra/compose/monitoring
cat > infra/compose/monitoring/prometheus.yml <<'YAML'
global:
  scrape_interval: 10s

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: ["prometheus:9090"]
YAML
git add infra/compose/monitoring/prometheus.yml
```

**Check:**

```bash
docker compose -f infra/compose/compose.observ.yml config >/dev/null && echo "OK: observ profile valid"
```

---

# 3) Semantik-Contracts: minimale Schemas spiegeln (bis Upstream gespiegelt ist)

**Ziel:** `semantics-intake` Workflow soll Dateien validieren können, auch ohne Upstream-Spiegel.

**Dateien:**

- `contracts/semantics/node.schema.json`
    
- `contracts/semantics/edge.schema.json`
    
- `.gewebe/in/.gitkeep`
    

**Patch:**

```bash
mkdir -p contracts/semantics .gewebe/in
cat > contracts/semantics/node.schema.json <<'JSON'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Node",
  "type": "object",
  "additionalProperties": true,
  "required": ["id", "type"],
  "properties": {
    "id": { "type": "string" },
    "type": { "type": "string" }
  }
}
JSON

cat > contracts/semantics/edge.schema.json <<'JSON'
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Edge",
  "type": "object",
  "additionalProperties": true,
  "required": ["from", "to", "rel"],
  "properties": {
    "from": { "type": "string" },
    "to": { "type": "string" },
    "rel": { "type": "string" }
  }
}
JSON

touch .gewebe/in/.gitkeep
git add contracts/semantics/node.schema.json contracts/semantics/edge.schema.json .gewebe/in/.gitkeep
```

**Check:**

```bash
jq -e . contracts/semantics/node.schema.json >/dev/null && jq -e . contracts/semantics/edge.schema.json >/dev/null && echo "OK: schemas syntaktisch valide"
```

---

# 4) Vale-Setup säubern (Namespace „Weltgewebe“ konsolidieren)

**Ziel:** Keine alten `wgxlint`-Reste; `BasedOnStyles = Weltgewebe`; fehlende Prosa-Regel ergänzen.

**Änderungen:**

- `BasedOnStyles = Weltgewebe` sicherstellen.
    
- Stil-Datei `GermanProse.yml` unter `Weltgewebe/` ergänzen.
    
- Alte `.vale/styles/wgxlint` (falls vorhanden) entfernen.
    

**Patch:**

```bash
mkdir -p .vale/styles/Weltgewebe
# .vale.ini hartstellen
cat > .vale.ini <<'INI'
StylesPath = .vale/styles
MinAlertLevel = suggestion

[*.md]
BasedOnStyles = Weltgewebe
INI

# GermanProse-Regel ergänzen
cat > .vale/styles/Weltgewebe/GermanProse.yml <<'YAML'
extends: substitution
level: suggestion
ignorecase: true
message: "Begriff prüfen: '%s' – konsistente Schreibweise wählen."
swap:
  "bspw.": "z. B."
  "u.a.": "u. a."
YAML

# optional Altlasten
rm -rf .vale/styles/wgxlint 2>/dev/null || true

git add .vale.ini .vale/styles/Weltgewebe/GermanProse.yml
```

**Check:**

```bash
grep -q 'BasedOnStyles = Weltgewebe' .vale.ini && echo "OK: Vale konfig"
```

---

# 5) Docs-Runbook Pfad konsistent

**Ziel:** Policies erwarteten `docs/runbooks/observability.md`; vorhanden war `docs/runbook.observability.md`. Wir vereinheitlichen auf `docs/runbooks/observability.md`.

**Patch (Move + Linkfix):**

```bash
mkdir -p docs/runbooks
if [ -f docs/runbook.observability.md ]; then
  git mv docs/runbook.observability.md docs/runbooks/observability.md
fi
# Policies ggf. auf neuen Pfad heben
if grep -q 'docs/runbooks/observability.md' policies/limits.yaml 2>/dev/null; then
  : # schon korrekt
else
  sed -i 's#observability.md#observability.md#g' policies/limits.yaml 2>/dev/null || true
fi
git add -A
```

**Check:**

```bash
test -f docs/runbooks/observability.md && echo "OK: Runbook vorhanden"
```

---

# 6) API-Config: ohne `serde_yaml` (eigener Parser) – Sicherstellen

**Ziel:** `apps/api/Cargo.toml` ohne `serde_yaml`; `config.rs` nutzt `parse_config`.

**Patch (nur falls nötig):**

```bash
applypatch <<'PATCH'
*** Begin Patch
*** Update File: apps/api/Cargo.toml
@@
- serde_json = "1"
- serde_yaml = "0.9"
+ serde_json = "1"
*** End Patch
PATCH
```

> Falls `apps/api/src/config.rs` noch `serde_yaml::from_str` nutzt: auf `parse_config`-Variante wechseln (du hast die manuelle Parser-Implementierung bereits eingespielt; kein weiterer Patch nötig, wenn `parse_config` vorhanden ist).

**Check:**

```bash
! grep -q 'serde_yaml' apps/api/Cargo.toml && echo "OK: keine serde_yaml in Cargo.toml"
rg -n "parse_config\\(|serde_yaml" apps/api/src/config.rs
```

---

# 7) API-Smoke-Workflow robuster: `jq` sicher installieren

**Ziel:** `api-smoke.yml` soll `jq` nicht voraussetzen.

**Patch:**

```bash
applypatch <<'PATCH'
*** Begin Patch
*** Update File: .github/workflows/api-smoke.yml
@@
       - name: Wait for API health endpoint
         run: |
           ok=0
           for i in {1..60}; do
             if curl -fsS http://127.0.0.1:8787/health/live; then ok=1; break; fi
             sleep 0.5
           done
           [ "$ok" -eq 1 ] || { echo "health/live not ready in time"; exit 1; }
+      - name: Ensure jq present
+        run: |
+          sudo apt-get update -y
+          sudo apt-get install -y jq
       - name: Probe /health and /metrics
         run: |
           set -euxo pipefail
           curl -fsS http://127.0.0.1:8787/health/live
           curl -fsS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8787/health/ready | grep -E '^(200|503)$'
*** End Patch
PATCH
```

**Check:** CI-Run des Jobs muss ohne „jq not found“ durchlaufen.

---

# 8) Devcontainer: Script ausführbar + LF-EOL

**Ziel:** `.devcontainer/post-create.sh` mit Exec-Bit und LF.

**Commands:**

```bash
chmod +x .devcontainer/post-create.sh
git add --chmod=+x .devcontainer/post-create.sh
```

(EOL ist bereits über `.gitattributes` auf `LF` für `*.sh` gesetzt.)

**Check:**

```bash
git ls-files -s .devcontainer/post-create.sh | awk '{print $1, $2, $4}'
# Mode sollte 100755 anzeigen
```

---

# 9) Python-Tooling Workflow: final (mit setup-uv, Cache, Manifesterkennung)

**Ziel:** Zusammengeführte, saubere Fassung nutzen.

**Datei:** `.github/workflows/python-tooling.yml`

**Patch (vollständig überschreiben):**

```bash
cat > .github/workflows/python-tooling.yml <<'YAML'
name: python-tooling

on:
  pull_request:
    branches: [ main ]
    paths:
      - "**/*.py"
      - ".github/workflows/python-tooling.yml"
      - "tools/py/**"
      - "uv.lock"
      - "pyproject.toml"
      - "**/requirements*.txt"
  push:
    branches: [ main ]
    paths:
      - "**/*.py"
      - ".github/workflows/python-tooling.yml"
      - "tools/py/**"
      - "uv.lock"
      - "pyproject.toml"
      - "**/requirements*.txt"
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: python-tooling-${{ github.ref }}
  cancel-in-progress: true

jobs:
  uv-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Set up uv
        uses: astral-sh/setup-uv@v1

      - name: Cache uv cache dir
        uses: actions/cache@v4
        with:
          path: ~/.cache/uv
          key: uv-${{ runner.os }}-${{ hashFiles('**/pyproject.toml', '**/requirements*.txt', '**/uv.lock') }}
          restore-keys: |
            uv-${{ runner.os }}-

      - name: Sync dependencies (all manifests)
        shell: bash
        run: |
          set -euo pipefail
          UV=uv
          found=0
          while IFS= read -r dir; do
            found=1
            if [ -f "$dir/uv.lock" ]; then
              echo "::group::uv sync (locked) in $dir"
              (cd "$dir" && $UV sync --locked)
              echo "::endgroup::"
            elif [ -f "$dir/requirements.txt" ]; then
              echo "::group::uv pip sync in $dir"
              (cd "$dir" && $UV pip sync requirements.txt)
              echo "::endgroup::"
            elif [ -f "$dir/pyproject.toml" ]; then
              echo "::group::uv sync in $dir"
              (cd "$dir" && $UV sync)
              echo "::endgroup::"
            fi
          done < <(find . -type f \( -name "uv.lock" -o -name "requirements.txt" -o -name "pyproject.toml" \) -exec dirname {} \; | sort -u)
          if [ "$found" -eq 0 ]; then
            echo "No Python dependency manifest found. Skipping sync."
          fi

      - name: Python sanity check
        run: python -c "import sys; print('python ok:', sys.version)"
YAML
git add .github/workflows/python-tooling.yml
```

**Check:** Workflow lädt, zeigt `uv --version` (implizit), synct ggf. Manifeste ohne Fehler.

---

# 10) Abschluss-Checks (lokal)

```bash
# Rust
cargo fmt --all -- --check
cargo clippy --all-targets -- -D warnings
cargo test --workspace -q

# API quick check
RUST_LOG=info cargo run -p weltgewebe-api & pid=$!; sleep 1
curl -fsS localhost:8787/health/live >/dev/null
curl -fsS localhost:8787/version | jq -e '.version and .commit and .build_timestamp' >/dev/null
kill $pid 2>/dev/null || true

# Vale soft check (nur Hinweise)
vale --minAlertLevel=suggestion docs || true

# Compose observability
docker compose -f infra/compose/compose.observ.yml config >/dev/null
```

Fertig.