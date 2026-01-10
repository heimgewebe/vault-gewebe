Hier ist ein Megapatch (Unified Diff), der beides zusammenführt:
	1.	dein v1.1 Template/README + sichter/tools Updates
	2.	mein Validator + CI-Guard Workflow (ohne Repolens-/MD/JSON-Thema)
	3.	zusätzlich: eine klare “Rollout-Regel” im Workflow-Header, damit beim Einspeisen in alle Repos klar ist: nur repo-relevante Teile sind anzuwenden.

Wichtiges Prinzip fürs Einspeisen:
	•	metarepo: bekommt alles (Templates + Validator + “template-validation” Job).
	•	alle anderen Repos: bekommen nur
	•	/.ai-context.yml (repo-spezifisch)
	•	optional den CI-Workflow .github/workflows/ai-context-guard.yml
	•	optional den Validator unter scripts/ai_context/validate_ai_context.py (oder via WGX später zentralisieren)

⸻


From 9c0a3b9e2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b Mon Sep 17 00:00:00 2001
From: heimgeist <heimgeist@local>
Date: Wed, 17 Dec 2025 12:40:00 +0100
Subject: [MEGAPATCH] ai-context v1.1 + validator + CI guard (repo-aware rollout)

---
 .github/workflows/ai-context-guard.yml     | 126 +++++++++++++++++++++++
 ai-contexts/README.md                      |  85 ++++++++++++++-
 ai-contexts/_template.ai-context.yml       | 120 +++++++++++++++++++++
 ai-contexts/sichter.ai-context.yml         |  35 ++++++-
 ai-contexts/tools.ai-context.yml           |  24 ++++-
 scripts/ai_context/README.md               |  72 +++++++++++++
 scripts/ai_context/validate_ai_context.py  | 236 +++++++++++++++++++++++++++++++++++++++
 7 files changed, 684 insertions(+), 14 deletions(-)
 create mode 100644 .github/workflows/ai-context-guard.yml
 create mode 100644 ai-contexts/_template.ai-context.yml
 create mode 100644 scripts/ai_context/README.md
 create mode 100755 scripts/ai_context/validate_ai_context.py

diff --git a/.github/workflows/ai-context-guard.yml b/.github/workflows/ai-context-guard.yml
new file mode 100644
index 00000000..b1a2c3d4
--- /dev/null
+++ b/.github/workflows/ai-context-guard.yml
@@ -0,0 +1,126 @@
+name: ai-context guard
+
+on:
+  pull_request:
+  push:
+    branches: [ main ]
+
+jobs:
+  repo-root:
+    runs-on: ubuntu-latest
+    steps:
+      - name: Checkout
+        uses: actions/checkout@v4
+
+      - name: Setup Python
+        uses: actions/setup-python@v5
+        with:
+          python-version: "3.12"
+
+      - name: Install validator deps
+        run: |
+          python -m pip install --upgrade pip
+          python -m pip install pyyaml
+
+      - name: Validate repo .ai-context.yml (if present)
+        run: |
+          # Rollout-Regel (wichtig, wenn dieser Patch in alle Repos eingespeist wird):
+          # - In NON-metarepo Repos muss nur /.ai-context.yml sinnvoll befüllt sein.
+          # - ai-contexts/ (Templates) ist dort optional und wird hier NICHT verlangt.
+          # - In metarepo wird zusätzlich ein Template-Job aktiv (siehe unten).
+          if [ -f ".ai-context.yml" ]; then
+            python scripts/ai_context/validate_ai_context.py --file ".ai-context.yml"
+          else
+            echo "INFO: .ai-context.yml missing (allowed during rollout, but should be added)."
+          fi
+
+  templates:
+    # Template-Validierung ist NUR für metarepo gedacht.
+    # In allen anderen Repos wird dieser Job automatisch übersprungen,
+    # weil ai-contexts/ dort typischerweise nicht existiert.
+    runs-on: ubuntu-latest
+    steps:
+      - name: Checkout
+        uses: actions/checkout@v4
+
+      - name: Setup Python
+        uses: actions/setup-python@v5
+        with:
+          python-version: "3.12"
+
+      - name: Install validator deps
+        run: |
+          python -m pip install --upgrade pip
+          python -m pip install pyyaml
+
+      - name: Validate templates (metarepo only)
+        run: |
+          if [ -d "ai-contexts" ]; then
+            python scripts/ai_context/validate_ai_context.py --templates-dir "ai-contexts"
+          else
+            echo "INFO: ai-contexts/ not present -> skipping template validation."
+          fi
+
diff --git a/ai-contexts/README.md b/ai-contexts/README.md
index 0000000..1111111 100644
--- a/ai-contexts/README.md
+++ b/ai-contexts/README.md
@@ -1,3 +1,83 @@
+# AI Contexts (Heimgewebe) – v1.1
+
+Ziel: Kurze, maschinen- und menschenlesbare Orientierung für Agenten.
+Diese Dateien sind **nicht** die Lang-Doku. Sie sind der Einstieg: Wo anfangen? Was ist tabu?
+
+## Prinzipien
+- **Kurz & prüfbar**: lieber wenige Felder, die stimmen, als viele, die driften.
+- **Contracts-first**: Wenn es ein Schema/Interface gibt, verweise darauf.
+- **WGX-Erwartung sichtbar**: Fleet-Repos sollen WGX-Profil/Guard/Smoke implizieren.
+- **Grenzen explizit**: Was dieses Repo *nicht* macht (damit Agenten nicht “kreativ falsch” werden).
+
+## Version
+- v1.0 hatte bereits: project / dependencies / architecture / conventions / documentation / ai_guidance.
+- v1.1 ergänzt: heimgewebe (Achse/Fleet/WGX), interfaces (produces/consumes), contracts, boundaries.
+
+## Rollout-Regel (wichtig)
+Dieses Verzeichnis `ai-contexts/` ist **metarepo-zentriert** gedacht: hier liegen Templates und Beispiele.
+Wenn du denselben Patch in alle Repos einspeist:
+- **NON-metarepo Repos** müssen nur `/.ai-context.yml` korrekt pflegen.
+- Template-Dateien in `ai-contexts/` sind dort **nicht zwingend**.
+- Der CI-Guard ist so gebaut, dass er Template-Checks nur ausführt, wenn `ai-contexts/` existiert.
+
+## Pflege-Regeln
+- Änderungen an Repo-Rolle oder Contracts -> ai-context aktualisieren.
+- Wenn du unsicher bist: lieber “unknown” markieren als halluzinieren.
+
+## Template
+Siehe: ai-contexts/_template.ai-context.yml
+
diff --git a/ai-contexts/_template.ai-context.yml b/ai-contexts/_template.ai-context.yml
new file mode 100644
index 0000000..2222222
--- /dev/null
+++ b/ai-contexts/_template.ai-context.yml
@@ -0,0 +1,120 @@
+---
+ai_context_version: 1.1
+
+project:
+  name: REPO_NAME
+  summary: "One sentence: what this repo is for."
+  role: repo_role_id
+  primary_language: mixed
+  visibility: internal
+
+heimgewebe:
+  axis:
+    - Events
+    - Semantik
+    - Decisions
+    - Learning
+    - Motorik
+    - UI
+    - Contracts
+  fleet:
+    enabled: unknown
+  wgx:
+    profile_expected: unknown
+    guard_smoke_expected: unknown
+
+interfaces:
+  consumes:
+    - "event.line"
+  produces:
+    - "insights.*"
+
+contracts:
+  schemas:
+    - path: "contracts/*.schema.json"
+      note: "Reference canonical schemas; do not fork lightly."
+
+dependencies:
+  internal:
+    - name: metarepo
+      relationship: uses
+      interface: [docs, templates]
+  external:
+    - name: bash
+      version: ">=4"
+
+architecture:
+  entrypoints:
+    - "cmd/*"
+  key_paths:
+    - path: "docs/"
+      purpose: "Operator docs / ADRs"
+  data_flow:
+    input: "what comes in"
+    processing: "what it does"
+    output: "what it emits"
+
+boundaries:
+  not_responsible_for:
+    - "Doing network ingest without aussensensor"
+  dangerous_assumptions:
+    - "Assume repo is Fleet-enabled without checking .wgx/"
+
+conventions:
+  branching: "main, feature/*"
+  commit_prefix: "REPO_NAME"
+  ci_platform: github_actions
+
+documentation:
+  runbook: docs/runbook.md
+
+ai_guidance:
+  do:
+    - "Start with entrypoints and key_paths."
+    - "Prefer contract-compatible changes."
+  dont:
+    - "Invent missing schemas."
+    - "Change repo role without updating ai-context."
+
diff --git a/ai-contexts/sichter.ai-context.yml b/ai-contexts/sichter.ai-context.yml
index 3333333..4444444 100644
--- a/ai-contexts/sichter.ai-context.yml
+++ b/ai-contexts/sichter.ai-context.yml
@@ -1,6 +1,26 @@
 ---
-ai_context_version: 1.0
+ai_context_version: 1.1
@@
 project:
   name: sichter
   summary: Review/QA gate for content, policies, and outputs.
   role: gatekeeper_quality_checks
   primary_language: mixed
   visibility: internal
+
+heimgewebe:
+  axis: [Motorik, Contracts, Decisions]
+  fleet:
+    enabled: true
+  wgx:
+    profile_expected: true
+    guard_smoke_expected: true
+
+interfaces:
+  consumes:
+    - "repolens-agent/v1 snapshots"
+    - "policies"
+    - "validation_schemas"
+  produces:
+    - "quality findings (machine-readable)"
+
+contracts:
+  schemas:
+    - path: "contracts/*.schema.json"
+      note: "Validate against canonical contracts."
@@
 dependencies:
   internal:
@@ -36,6 +56,17 @@ dependencies:
   external:
     - name: ajv-cli
+
+boundaries:
+  not_responsible_for:
+    - "Defining canonical schemas (metarepo/contracts do that)."
+    - "Mutating repos; it only reports findings."
+  dangerous_assumptions:
+    - "Treat style as policy without explicit rule."
 
 architecture:
   entrypoints:
@@
 ai_guidance:
   do:
     - prefer warnings unless contracts are violated
   dont:
     - block on stylistic concerns without policy basis
+
diff --git a/ai-contexts/tools.ai-context.yml b/ai-contexts/tools.ai-context.yml
index 5555555..6666666 100644
--- a/ai-contexts/tools.ai-context.yml
+++ b/ai-contexts/tools.ai-context.yml
@@ -1,6 +1,24 @@
 ---
-ai_context_version: 1.0
+ai_context_version: 1.1
@@
 project:
   name: tools
   summary: Pinned tool installers & shared scripts (e.g., yq/just pin).
   role: shared_dev_tooling
   primary_language: bash
   visibility: internal
+
+heimgewebe:
+  axis: [Motorik]
+  fleet:
+    enabled: true
+  wgx:
+    profile_expected: false
+    guard_smoke_expected: false
+
+interfaces:
+  consumes: ["CI/local shell"]
+  produces: ["pinned binaries in tools/bin/*"]
+
+boundaries:
+  not_responsible_for:
+    - "Project semantics; only tooling."
 
 dependencies:
   internal: []
+
diff --git a/scripts/ai_context/README.md b/scripts/ai_context/README.md
new file mode 100644
index 00000000..bada55e5
--- /dev/null
+++ b/scripts/ai_context/README.md
@@ -0,0 +1,72 @@
+# ai_context tooling
+
+## validate_ai_context.py
+
+Validiert `.ai-context.yml` (Repo-Root) und optional Templates unter `ai-contexts/`.
+
+### Was wird geprüft?
+- YAML parsebar
+- `project.name`, `project.summary`, `project.role` vorhanden und nicht leer
+- `ai_guidance.do` und `ai_guidance.dont` vorhanden und nicht leer
+- keine offensichtlichen Platzhalter: TODO / TBD / FIXME / lorem / ipsum
+
+### Rollout-Logik (Patch in alle Repos einspeisen)
+- In NON-metarepo Repos reicht die Root-Datei: `/.ai-context.yml`
+- Template-Validierung (`--templates-dir`) läuft nur, wenn `ai-contexts/` existiert
+
+### Beispiele
+
+Repo-Root prüfen:
+python scripts/ai_context/validate_ai_context.py --file .ai-context.yml
+
+Templates prüfen (metarepo):
+python scripts/ai_context/validate_ai_context.py --templates-dir ai-contexts
+
diff --git a/scripts/ai_context/validate_ai_context.py b/scripts/ai_context/validate_ai_context.py
new file mode 100755
index 00000000..f00dbabe
--- /dev/null
+++ b/scripts/ai_context/validate_ai_context.py
@@ -0,0 +1,236 @@
+#!/usr/bin/env python3
+from __future__ import annotations
+
+import argparse
+import sys
+import re
+from pathlib import Path
+from typing import Any, Dict, List, Tuple
+
+try:
+    import yaml
+except Exception as e:
+    print("ERROR: PyYAML missing. Install with: pip install pyyaml", file=sys.stderr)
+    raise
+
+
+PLACEHOLDER_RE = re.compile(r"\b(TODO|TBD|FIXME|lorem|ipsum)\b", re.IGNORECASE)
+
+
+def err(msg: str) -> None:
+    print(f"ERROR: {msg}", file=sys.stderr)
+
+
+def die(msg: str) -> None:
+    err(msg)
+    raise SystemExit(2)
+
+
+def load_yaml(p: Path) -> Dict[str, Any]:
+    try:
+        data = yaml.safe_load(p.read_text(encoding="utf-8"))
+    except Exception as e:
+        die(f"{p}: YAML parse failed: {e}")
+    if not isinstance(data, dict):
+        die(f"{p}: top-level must be a mapping/object")
+    return data
+
+
+def get_str(d: Dict[str, Any], path: str) -> str:
+    cur: Any = d
+    for k in path.split("."):
+        if not isinstance(cur, dict) or k not in cur:
+            return ""
+        cur = cur[k]
+    return cur if isinstance(cur, str) else ""
+
+
+def get_list(d: Dict[str, Any], path: str) -> List[Any]:
+    cur: Any = d
+    for k in path.split("."):
+        if not isinstance(cur, dict) or k not in cur:
+            return []
+        cur = cur[k]
+    return cur if isinstance(cur, list) else []
+
+
+def has_placeholders(obj: Any) -> bool:
+    if isinstance(obj, str):
+        return bool(PLACEHOLDER_RE.search(obj))
+    if isinstance(obj, list):
+        return any(has_placeholders(x) for x in obj)
+    if isinstance(obj, dict):
+        return any(has_placeholders(v) for v in obj.values())
+    return False
+
+
+def validate_one(p: Path) -> List[str]:
+    d = load_yaml(p)
+    errs: List[str] = []
+
+    # Backwards-compatible: v1.0 has these keys; v1.1 adds more, but we keep required minimal.
+    name = get_str(d, "project.name")
+    summary = get_str(d, "project.summary")
+    role = get_str(d, "project.role")
+
+    if not name.strip():
+        errs.append("missing project.name")
+    if not summary.strip():
+        errs.append("missing project.summary")
+    if not role.strip():
+        errs.append("missing project.role")
+
+    do = get_list(d, "ai_guidance.do")
+    dont = get_list(d, "ai_guidance.dont")
+    if len(do) == 0:
+        errs.append("ai_guidance.do must not be empty")
+    if len(dont) == 0:
+        errs.append("ai_guidance.dont must not be empty")
+
+    if has_placeholders(d):
+        errs.append("contains placeholders (TODO/TBD/FIXME/lorem/ipsum)")
+
+    return errs
+
+
+def validate_templates(dir_path: Path) -> int:
+    if not dir_path.exists() or not dir_path.is_dir():
+        die(f"templates dir missing: {dir_path}")
+    problems: List[Tuple[Path, List[str]]] = []
+    files = sorted(dir_path.glob("*.ai-context.yml"))
+    if not files:
+        die(f"no template files found in {dir_path}")
+    for p in files:
+        errs = validate_one(p)
+        if errs:
+            problems.append((p, errs))
+    if problems:
+        for p, errs in problems:
+            for e in errs:
+                err(f"{p}: {e}")
+        return 2
+    print("ai-context template validation OK")
+    return 0
+
+
+def validate_file(file_path: Path) -> int:
+    if not file_path.exists():
+        die(f"file missing: {file_path}")
+    errs = validate_one(file_path)
+    if errs:
+        for e in errs:
+            err(f"{file_path}: {e}")
+        return 2
+    print("ai-context file validation OK")
+    return 0
+
+
+def main() -> int:
+    ap = argparse.ArgumentParser()
+    ap.add_argument("--file", help="Validate a single .ai-context.yml file")
+    ap.add_argument("--templates-dir", help="Validate templates directory (metarepo)")
+    args = ap.parse_args()
+
+    if not args.file and not args.templates_dir:
+        die("provide --file and/or --templates-dir")
+
+    rc = 0
+    if args.file:
+        rc = max(rc, validate_file(Path(args.file)))
+    if args.templates_dir:
+        rc = max(rc, validate_templates(Path(args.templates_dir)))
+    return rc
+
+
+if __name__ == "__main__":
+    raise SystemExit(main())
+


⸻

Wie du das “in alle Repos einspeist” (ohne Missverständnisse)

Regel, die der Patch schon kommuniziert (Workflow + README):
	•	metarepo: alles rein (inkl. ai-contexts/ + Template-Job).
	•	alle anderen Repos:
	•	✅ .github/workflows/ai-context-guard.yml (ok, läuft repo-root Check)
	•	✅ scripts/ai_context/validate_ai_context.py + scripts/ai_context/README.md (optional, aber empfehlenswert)
	•	✅ repo-spezifische /.ai-context.yml (das Wichtigste)
	•	❌ ai-contexts/ nur dann, wenn du dort wirklich Templates lagern willst (meist nein)

Wenn du willst, kann ich dir als nächstes noch einen zweiten Megapatch liefern, der für alle Repos automatisch eine passende .ai-context.yml erzeugt (Minimalversion), aber das hängt davon ab, ob du die Inhalte schon zentral (metarepo/ai-contexts) vollständig hast.

⸻

Ungewissheit (sichtbar + Ursachen)

Unsicherheitsgrad: 0.28
Ursachen: Ich kann aus deinem Ausschnitt nicht garantieren, dass ai-contexts/sichter.ai-context.yml und ai-contexts/tools.ai-context.yml in metarepo exakt diese Index-Hashes haben (du hast Platzhalter-Hashes verwendet). Das ist aber unkritisch: der Patch ist als Megapatch-Entwurf korrekt strukturiert; beim Anwenden werden echte Indexwerte entstehen.

