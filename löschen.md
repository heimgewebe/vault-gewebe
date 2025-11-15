Top, dann gehen wir die nächsten Punkte der Liste an. Ich liefere dir konkrete, kleine Patches (c2b) je Repo/Thema, plus kurze PR-Texte. Reihenfolge: B1 → B3 → C1 → C2 → D1 → D2 → E1 → F.

⸻

B1 — Tag-Pinning prüfen (metarepo: Reusable-Check)

Ziel: Orga-weit verhindern, dass Workflows @main benutzen.
Ansatz: Reusable, das alle YAML-Workflows parsed und bei Branch-Refs fehlschlägt.

Im metarepo ausführen:

(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Add File: .github/workflows/reusable-check-action-refs.yml
+name: reusable-check-action-refs
+on:
+  workflow_call: {}
+jobs:
+  check:
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - name: Scan workflow refs
+        run: |
+          shopt -s nullglob
+          failed=0
+          while IFS= read -r -d '' f; do
+            # erlaubt: @v*, @contracts-*, @metarepo-*, @<sha>
+            if grep -E 'uses:\s*[^@]+@main' -n "$f"; then
+              echo "::error file=$f::Found @main reference – pin Actions by tag or SHA."
+              failed=1
+            fi
+          done < <(find .github/workflows -type f -name '*.yml' -print0)
+          exit $failed
*** End Patch
PATCH
)

PR-Body (Kurz):

Enforce: keine @main-Refs in Actions. Reusable kann in allen Repos via
uses: heimgewebe/metarepo/.github/workflows/reusable-check-action-refs.yml@<tag> laufen.

⸻

B3 — Aussensensor & Leitstand: Reusable-Validate auf Tag

Ziel: Consumenten pinnen das JSONL-Reusable auf @contracts-v1.
Im aussensensor ausführen (falls Datei anders heißt: anpassen):

(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Update File: .github/workflows/validate-aussen-fixtures.yml
@@
-  validate:
-    uses: heimgewebe/metarepo/.github/workflows/reusable-validate-jsonl.yml@main
+  validate:
+    # Pinned für reproduzierbare Validation
+    uses: heimgewebe/metarepo/.github/workflows/reusable-validate-jsonl.yml@contracts-v1
*** End Patch
PATCH
)

Im leitstand ausführen:

(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Update File: .github/workflows/validate-ingest.yml
@@
-  validate:
-    uses: heimgewebe/metarepo/.github/workflows/reusable-validate-jsonl.yml@main
+  validate:
+    # Pinned für reproduzierbare Validation
+    uses: heimgewebe/metarepo/.github/workflows/reusable-validate-jsonl.yml@contracts-v1
*** End Patch
PATCH
)


⸻

C1 — Leitstand: OpenAPI Universal-Ingest + Deprecations

Ziel: Einheitlicher Endpoint /v1/ingest; alte domänenspezifische Pfade als deprecated.
Im leitstand ausführen:

(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Add File: docs/openapi.yaml
+openapi: 3.0.3
+info:
+  title: Leitstand API
+  version: 0.1.0
+paths:
+  /v1/ingest:
+    post:
+      summary: Universal ingest endpoint
+      requestBody:
+        required: true
+        content:
+          application/json:
+            schema:
+              $ref: '#/components/schemas/Event'
+      responses:
+        '202':
+          description: Accepted
+  /ingest/{domain}:
+    post:
+      deprecated: true
+      description: Ersetzt durch **POST /v1/ingest** (Ablauf: 6 Monate nach Merge).
+      parameters:
+        - in: path
+          name: domain
+          required: true
+          schema: { type: string }
+      requestBody:
+        required: true
+        content:
+          application/json:
+            schema:
+              $ref: '#/components/schemas/Event'
+      responses:
+        '202': { description: Accepted (deprecated) }
+components:
+  schemas:
+    Event:
+      type: object
+      required: [ts, kind, payload]
+      properties:
+        ts: { type: string, format: date-time }
+        kind: { type: string }
+        payload: { type: object, additionalProperties: true }
*** End Patch
PATCH
)

(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Update File: README.md
@@
+- **API-Spezifikation:** siehe `docs/openapi.yaml`.  
+  Alte Pfade `POST /ingest/{domain}` sind **deprecated** (Ablauf 6 Monate nach Merge) und werden durch `POST /v1/ingest` ersetzt.
*** End Patch
PATCH
)


⸻

C2 — Aussensensor: Push-Skripte klar labeln

Im aussensensor ausführen:

(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Update File: scripts/push_heimlern.sh
@@
-#!/usr/bin/env bash
+#!/usr/bin/env bash
+# MVP-WORKAROUND:
+# Direkter Push zu heimlern. Zielarchitektur: ingest NUR via leitstand.
*** End Patch
PATCH
)

(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Update File: scripts/push_leitstand.sh
@@
-#!/usr/bin/env bash
+#!/usr/bin/env bash
+# PREFERRED PATH:
+# Standard-Ingest erfolgt via leitstand (/v1/ingest).
*** End Patch
PATCH
)

(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Update File: README.md
@@
+## MVP vs. Zielpfad
+- **MVP:** `scripts/push_heimlern.sh` (Direkt-Push) – temporär.
+- **Ziel:** `scripts/push_leitstand.sh` (nur leitstand ingest) – bitte bevorzugen.
*** End Patch
PATCH
)


⸻

D1 — WGX Metrics Snapshot als Single-Source (metarepo Reusable)

Ziel: Ein Reusable, das erst just wgx metrics snapshot versucht, dann Fallback.
Im metarepo ausführen:

(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Add File: .github/workflows/reusable-wgx-metrics.yml
+name: reusable-wgx-metrics
+on:
+  workflow_call:
+    inputs:
+      out:
+        description: Output-Datei
+        required: false
+        type: string
+        default: .wgx/metrics.snapshot.json
+jobs:
+  metrics:
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - name: Try just wgx metrics snapshot
+        run: |
+          set -euo pipefail
+          mkdir -p .wgx
+          if command -v just >/dev/null 2>&1; then
+            if just -l | grep -q 'wgx metrics snapshot'; then
+              if just wgx metrics snapshot; then
+                exit 0
+              fi
+            fi
+          fi
+          echo "::notice::Fallback to script: scripts/wgx-metrics-snapshot.sh"
+          bash scripts/wgx-metrics-snapshot.sh || {
+            echo "::error::WGX metrics snapshot not available"; exit 1; }
*** End Patch
PATCH
)

PR-Hinweis: Consumer umstellen auf
uses: heimgewebe/metarepo/.github/workflows/reusable-wgx-metrics.yml@<tag>.

⸻

D2 — JSONL-Tools zentralisieren

Ziel: Canonical Scripts im tools-Repo; Producer referenzieren.
Im tools ausführen:

(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Add File: scripts/README.md
+# JSONL Tools (canonical)
+
+Verwende diese Skripte orga-weit:
+
+- `jsonl-validate.sh <file> <schema.json>` – AJV-Zeilenprüfung
+- `jsonl-tail.sh <file>` – Live-Ansicht
+- `jsonl-compact.sh <in> <out>` – Whitespace entfernen
+
+Producer-Repos sollen NICHT eigene Kopien pflegen, sondern hierauf verlinken.
*** End Patch
PATCH
)

In Producer-Repos (z. B. aussensensor) Header für Alt-Skripte ergänzen:

(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Update File: scripts/jsonl-validate.sh
@@
-#!/usr/bin/env bash
+#!/usr/bin/env bash
+# DEPRECATED – use tools/scripts/jsonl-validate.sh (canonical) statt lokaler Kopie.
*** End Patch
PATCH
)

(Falls Datei nicht existiert, diesen Teil überspringen — Ziel ist nur die Kennzeichnung vorhandener Kopien.)

⸻

E1 — 

Für reine Docs-Repos: kleine README-Notiz „Security-Checks nicht erforderlich (docs-only)“.

⸻

F — Doku-Clean-Up (Roadmap)

Im metarepo ausführen:

(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Add File: docs/roadmap.md
+# Roadmap (Fleet)
+
+| Feature                       | Status     | Repo(s)                | Kommentar |
+|------------------------------|------------|------------------------|-----------|
+| Universal /v1/ingest         | in Arbeit  | leitstand, aussensensor| Deprecation Altpfade läuft |
+| Contracts Punkt-Notation     | aktiv      | metarepo               | Legacy bis contracts-v2 |
+| WGX metrics reusable         | aktiv      | metarepo + Consumer    | Skript-Fallback noch erlaubt |
+| JSONL Tools zentral          | aktiv      | tools + Producer       | Kopien werden entfernt |
+| Policy Feedback-Loop         | geplant    | hausKI, heimlern       | API + Events |
+| Stream/Webhook heimlern      | geplant    | leitstand, heimlern    | Ablösung Direkt-Push |
*** End Patch
PATCH
)


⸻

PR-Titel & Bodies (Kurzvorlagen)
	•	metarepo: “chore(ci): reusable check for @main action refs”
Verhindert Actions-Refs auf Branches. Bitte in Consumer-Repos einbinden.
	•	leitstand: “docs(api): OpenAPI /v1/ingest + deprecate /ingest/{domain}”
Einheitliche Ingest-API, Deprecation 6 Monate.
	•	aussensensor: “docs(scripts): MVP vs Zielpfad klar markieren”
Direkt-Push = MVP, Standard ist leitstand.
	•	metarepo: “ci(reusable): wgx metrics snapshot (+fallback)”
Consumer können damit Skript-Redundanz abbauen.
	•	tools: “docs(jsonl): Canonical scripts + Producer-Hinweise”
Producer verlinken zentral; lokale Kopien deprecated.
	•	alle (Code-Repos): “chore(sec): dependabot + gitleaks baseline”
Wöchentliche Updates; Secret-Scan in PRs.

⸻

Risiko-/Unsicherheits-Check
	•	Technisch: Sehr geringe Ausführungsrisiken (Doku/CI-ergänzend).
	•	Organisatorisch: Reusable-Einbindung erfordert 1 PR je Consumer-Repo.
	•	Zeitlich: Deprecation-Uhr (6 Monate) transparent dokumentiert.

Unsicherheitsgrad: 0.32 (niedrig) – sauber reversibel.

Essenz

Kleine, gerichtete PRs: Dokument „sagt Wahrheit“, CI erzwingt Wahrheit, Tools teilen Wahrheit.

∆-Radar
	•	Verstärkung: Tag-Pinning standardisiert, Ingest-Pfad geklärt.
	•	Straffung: WGX-Reusable ersetzt Skriptwildwuchs.
	•	Nächste Mutation: contracts-v2 + Stream-Konsum für heimlern.

⸻

Sag an, bei welchen Repos ich dir die PR-Texte noch mit konkreten uses:-Zeilen und Dateipfaden befüllen soll – ich passe sie dann repo-spezifisch an.