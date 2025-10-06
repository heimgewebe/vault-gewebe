Alright, Alex — ich geh systematisch ran und liefere dir konkrete, **merge-fertige** Verbesserungen in kleinen, klaren Schritten. Du kannst jeden Block direkt „c2b“ auf deiner Maschine laufen lassen oder über Codex ins Repo schieben. Ich erkläre dabei kurz, **warum** wir das tun und **was** es bringt (auch „für Dummies“).

Ich hab dein Repo offen und die aktuelle Struktur + README gescannt ([GitHub](https://github.com/alexdermohr/wgx "GitHub - alexdermohr/wgx: wgx – Weltgewebe CLI (Termux/WSL/Linux/macOS), privat")). Unten starte ich mit 6 schnellen, hochwirksamen Verbesserungen. Wenn du die drin hast, schiebe ich die nächsten nach.

---


---

# 2) CI „wgx-shells“: schnelles Lint + Tests (Bats) + Docs-Checks

**Warum:** Spiegelt lokale Checks in GitHub Actions, inkl. shfmt/shellcheck/bats + markdownlint/Vale.  
**Für Dummies:** Das ist die Roboter-Version deiner „Checkliste“, die bei jedem Push/PR läuft.

```bash
# c2b: CI-Workflow für Shell & Docs
(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Add File: .github/workflows/ci.yml
+name: ci
+on:
+  push:
+    branches: [ main ]
+  pull_request:
+    branches: [ main ]
+  workflow_dispatch:
+
+jobs:
+  shell-and-docs:
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - name: Install deps
+        run: |
+          sudo apt-get update
+          sudo apt-get install -y shellcheck shfmt bats
+          npm install -g markdownlint-cli@0.43.0
+          curl -Ls https://github.com/errata-ai/vale/releases/download/v3.8.0/vale_3.8.0_Linux_64-bit.tar.gz \
+            | tar xz && sudo mv vale /usr/local/bin/vale
+      - name: Lint shells
+        run: |
+          bash -n $(git ls-files '*.sh' '*.bash')
+          shfmt -d $(git ls-files '*.sh' '*.bash')
+          shellcheck -S style $(git ls-files '*.sh' '*.bash')
+      - name: Test (bats)
+        run: bats -r tests
+      - name: Lint markdown
+        run: markdownlint $(git ls-files '*.md' '*.mdx')
+      - name: Vale style
+        run: vale .
*** End Patch
PATCH
)
```

---

# 3) UV-Tooling in CI absichern (frozen sync) + Template für `.wgx/profile.yml`

**Warum:** Dein README verweist auf uv/Contracts — wir machen das unmittelbar nutzbar und prüfen’s in CI.  
**Für Dummies:** uv ist ein schneller Python-Manager. „frozen“ stellt sicher: exakt dieselben Versionen überall.

```bash
# c2b: UV-Job + Profile-Template
(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Update File: .github/workflows/ci.yml
@@
   shell-and-docs:
     runs-on: ubuntu-latest
@@
       - name: Vale style
         run: vale .
+
+  python-uv:
+    runs-on: ubuntu-latest
+    if: ${{ hashFiles('uv.lock') != '' }}
+    steps:
+      - uses: actions/checkout@v4
+      - name: Install uv
+        run: |
+          curl -LsSf https://astral.sh/uv/install.sh | sh
+          echo "$HOME/.local/bin" >> $GITHUB_PATH
+      - name: Cache uv
+        uses: actions/cache@v4
+        with:
+          path: ~/.cache/uv
+          key: uv-${{ runner.os }}-${{ hashFiles('**/pyproject.toml', '**/uv.lock') }}
+      - name: Sync deps (frozen)
+        run: uv sync --frozen
+      - name: Smoke run
+        run: uv run python -c "print('uv ok')"
*** End Patch
PATCH
)

# Template für .wgx/profile.yml
(cat > templates/profile.template.yml <<'YAML'
wgx:
  apiVersion: v1.1
  requiredWgx:
    range: "^2.0"
    min: "2.0.0"
    caps: ["task-array","status-dirs"]
  repoKind: "generic"
  envDefaults:
    RUST_BACKTRACE: "1"
  tasks:
    doctor: { desc: "Sanity-Checks", safe: true, cmd: ["wgx","doctor"] }
    test:   { desc: "Run Bats",        safe: true, cmd: ["bats","-r","tests"] }
python:
  manager: uv
  version: "3.12"
  lock: true
  tools: [ "ruff", "pyright" ]
contracts:
  uv_lock_present: true
  uv_sync_frozen: true
YAML
git add templates/profile.template.yml
)
```

---

# 4) Runbook-Stub + „guard“-Checkliste

**Warum:** README verweist auf ein Runbook; wir liefern einen soliden Stub + CLI-Checkliste „wgx guard“.  
**Für Dummies:** Runbook = Spickzettel zur Bedienung. „guard“ prüft, ob Mindest-Standards im Repo erfüllt sind.

```bash
# c2b: Runbook + guard
(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Add File: docs/Runbook.md
+# WGX Runbook (Kurzfassung)
+
+## Erstlauf
+1. `wgx doctor` ausführen → prüft Umgebung (bash, git, shellcheck, shfmt, bats).
+2. `wgx init` → legt `~/.config/wgx/config` an (aus `etc/config.example`).
+3. `wgx sync` → holt Updates; `wgx send "msg"` → Commit & Push Helper.
+
+## Python (uv)
+* `wgx py up` / `wgx py sync --frozen` / `wgx py run <cmd>`
+
+## Guard-Checks (Mindest-Standards)
+* `uv.lock` committed
+* CI mit shellcheck/shfmt/bats
+* Markdownlint + Vale
+* templates/profile.template.yml vorhanden
+
+## Troubleshooting
+* `wgx selftest` starten; Logs unter `~/.local/state/wgx/`.
+
*** End Patch
PATCH
)

# Minimaler guard-Command (falls nicht vorhanden)
test -f cmd/guard || cat > cmd/guard <<'BASH'
#!/usr/bin/env bash
set -euo pipefail
ok=true
note(){ printf "• %s\n" "$*"; }
fail(){ printf "✗ %s\n" "$*" >&2; ok=false; }

# Checks
test -f "uv.lock" && note "uv.lock vorhanden" || fail "uv.lock fehlt"
test -f ".github/workflows/ci.yml" && note "CI vorhanden" || fail "CI fehlt"
test -f "templates/profile.template.yml" && note "Profile-Template vorhanden" || fail "Profile-Template fehlt"

$ok && { echo "✅ guard: OK"; exit 0; } || { echo "❌ guard: FAIL"; exit 1; }
BASH
chmod +x cmd/guard
git add cmd/guard
```

---

# 5) Versionskommando + CHANGELOG-Stub

**Warum:** „wgx --version“ + SemVer hilft dir und Helfern, kompatible Profile/Contracts zu erzwingen.  
**Für Dummies:** Eine sichtbare Versionsnummer macht Updates nachvollziehbar; CHANGELOG erklärt Änderungen in Klartext.

```bash
# c2b: Version + Changelog
(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Add File: CHANGELOG.md
+# Changelog
+
+## 2.0.0 (YYYY-MM-DD)
+- Initiale modulare Struktur; Shell & Docs CI; UV-Frozen-Sync in CI; guard-Checks; Runbook-Stub.
*** End Patch
PATCH
)

# wgx --version: falls noch nicht da, simpler Handler
grep -q "case \$1 in" cli/wgx || true
awk '1' cli/wgx > /tmp/wgx.tmp && mv /tmp/wgx.tmp cli/wgx

# Append Version Handler idempotent
grep -q "__WGX_VERSION__" cli/wgx || cat >> cli/wgx <<'BASH'

# == version ==
__WGX_VERSION__="2.0.0"
if [ "${1:-}" = "--version" ] || [ "${1:-}" = "-V" ]; then
  echo "wgx ${__WGX_VERSION__}"
  exit 0
fi
BASH

git add CHANGELOG.md cli/wgx
)
```

---

# 6) Quick-Doc in CONTRIBUTING: Just-Alias + Local-CI

**Warum:** Contributor sehen sofort die lokalen Kommandos, die CI spiegeln.  
**Für Dummies:** „just“ ist wie ein kleines Menü. „just test“ → Tests, „just lint“ → Linter.

```bash
# c2b: CONTRIBUTING Update (Kurzblock anhängen)
(cd "$(git rev-parse --show-toplevel)" && awk '
  {print} END {
    print "\n## Lokale Checks (Spiegel der CI)\n"
    print "```bash"
    print "bash -n $(git ls-files \"*.sh\" \"*.bash\")"
    print "shfmt -d $(git ls-files \"*.sh\" \"*.bash\")"
    print "shellcheck -S style $(git ls-files \"*.sh\" \"*.bash\")"
    print "bats -r tests"
    print "markdownlint $(git ls-files \"*.md\" \"*.mdx\")"
    print "vale ."
    print "```"
    print "\n> Tipp: `pre-commit install` setzt das als Hook vor jeden Commit."
  }' CONTRIBUTING.md > /tmp/CONTRIB && mv /tmp/CONTRIB CONTRIBUTING.md && git add CONTRIBUTING.md)
```

---

## Was als Nächstes (wenn du „weiter“ sagst):

7. **doctor-Subcommand erweitern** (Termux/WSL/Codespaces Erkennung + Detailchecks)
    
8. **etc/config.example** nachschärfen (Log-Pfad, Telemetrie=aus, Timeouts)
    
9. **bats-Tests** für `wgx sync|reload|guard` (Happy/Fail-Pfad)
    
10. **Release-Draht** (`.github/release.yml` + Tag-Konvention)
    
11. **Templates** (PR-Body, Issue-Vorlagen)
    
12. **docs/ADR-Aufräumung** (Querverweise aus README/Runbook konsistent)
    

Sag einfach: „weiter“ – dann kommt die nächste Tranche (auch wieder als c2b-Patches).

---

## Verdichtete Essenz

6 konkrete, sofort nutzbare Schritte: **Pre-commit**, **CI für Shell+Docs**, **UV-CI + Profile-Template**, **Runbook + guard**, **Version + Changelog**, **CONTRIBUTING-Boost**. Alles in c2b-Blöcken.

## Ironische Auslassung

Wir setzen deinem Repo jetzt den Fahrradhelm auf: sieht vielleicht spießig aus, aber rettet dir im Sturzflug die Releases. 🚴‍♂️💥

## ∆-Radar

Wir bewegen uns von „funktioniert bei mir“ → „reproduzierbar und überprüft“. Klare Straffung, weniger implizites Wissen, mehr Automatik.

## Unsicherheitsgrad

**∴fores-Unsicherheit: niedrig–mittel.**  
**Ursachen:** GitHub-Webansicht hatte zwischendurch Ladefehler; ich habe keine _alle_ Dateien einzeln geöffnet, sondern die Top-Struktur + README/Verlinkungen geprüft ([GitHub](https://github.com/alexdermohr/wgx "GitHub - alexdermohr/wgx: wgx – Weltgewebe CLI (Termux/WSL/Linux/macOS), privat")). Einzelne bereits vorhandene Files (z. B. ein bestehendes `Runbook` oder bereits vorhandene CI) könnten partiell existieren. Die Patches sind idempotent bzw. additive Stubs; falls es Konflikte gibt, passe ich sie sofort an.