alles klar — ich lege dir die konkreten Mini-Patches hin, so dass du sie 1:1 in die jeweiligen Repos übernehmen kannst. Ich decke damit die Punkte C1 (leitstand, OpenAPI+Deprecation), C2 (aussensensor, MVP-Labeling), E1 (Dependabot-Baseline) sowie die nützlichen Guards (B1) und Validate-Jobs (B3) ab.

⸻

▶️ 
⸻

▶️ Repo: 

⸻

▶️ Repos: 


⸻

▶️ Alle Fleet-Repos — B1 Guard gegen Branch-Pins

*** Begin Patch
*** Add File: .github/workflows/guard-workflow-pins.yml
+name: guard-workflow-pins
+on:
+  pull_request:
+    paths: ['.github/workflows/*.yml']
+  workflow_dispatch:
+
+jobs:
+  check:
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - name: Fail on branch refs in uses:
+        run: |
+          set -euo pipefail
+          pat='uses:\s*.+@([A-Za-z]+|main|master|dev|HEAD)'
+          if rg -n "$pat" .github/workflows/*.yml; then
+            echo "::error::Branch refs in workflow 'uses:' detected. Pin to tag or SHA."
+            exit 1
+          fi
*** End Patch


⸻

▶️ Security-Baseline — E1 Dependabot (mind. hausKI, wgx, leitstand, aussensensor, heimlern)

Lege diese Datei in jedem der genannten Repos an und streiche nicht zutreffende Ökosysteme (z. B. npm entfernen, wenn nicht genutzt).

*** Begin Patch
*** Add File: .github/dependabot.yml
+version: 2
+updates:
+  - package-ecosystem: github-actions
+    directory: "/"
+    schedule: { interval: weekly }
+  - package-ecosystem: cargo
+    directory: "/"
+    schedule: { interval: weekly }
+  - package-ecosystem: npm
+    directory: "/"
+    schedule: { interval: weekly }
*** End Patch

Optionaler README-Zusatz, falls GHAS/Secret-Scanning nicht aktivierbar ist:

*** Begin Patch
*** Update File: README.md
@@
 > Security
-> Hinweise folgen
+> Secret-Scanning/GHAS ist auf diesem Repo derzeit nicht aktiviert (Plan/Lizenz). Wir halten Dependabot aktuell und prüfen PRs manuell.
*** End Patch


⸻

🔎 Abnahme-Checkliste (kurz)
	•	leitstand: docs/openapi.yaml existiert, CI-Lint grün, README Deprecation-Hinweis.
	•	aussensensor: Script-Header sauber, README MVP vs Zielpfad Abschnitt drin.
	•	Beide (leitstand, aussensensor): validate-aussen.yml pinned to @contracts-v1.
	•	Alle Kern-Repos: guard-workflow-pins.yml vorhanden.
	•	Dependabot in den fünf Repos liegt und erzeugt mind. Actions-PRs.

⸻

Wenn du willst, liefere ich als Nächstes die Fixtures + CI für heimlern (Policy-Decisions, B2) sowie einen kleinen tools/-Drop mit jsonl-validate.sh und jsonl-tail.sh (D2).