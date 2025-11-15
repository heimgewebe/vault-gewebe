Top, dann gehen wir die nächsten Punkte der Liste an. Ich liefere dir konkrete, kleine Patches (c2b) je Repo/Thema, plus kurze PR-Texte. Reihenfolge: B1 → B3 → C1 → C2 → D1 → D2 → E1 → F.

⸻

B1 — 

B3 — 


⸻

C2 — 

D1 — 

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

E1 — Security Baseline (Dependabot + Gitleaks)

Ziel: 

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