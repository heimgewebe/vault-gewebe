SYSTEM-REGEL:

Bei jeder Nutzung externer Libraries, Frameworks oder APIs:
→ ZUERST Context7 verwenden, um die aktuelle Dokumentation zu laden
→ DANN mit dem aktuellen Repo-Zustand vergleichen
→ ERST DANACH antworten

Die Antwort MUSS:
	•	Context7-Erkenntnisse explizit benennen
	•	Abweichungen zwischen Doku und Repo explizit benennen
	•	Risiken dieser Abweichungen benennen
	•	falls Context7 hier nicht relevant ist, das kurz begründen

WICHTIG:
	•	Context7 ist nur für Framework-/Tool-/API-Dokumentation da
	•	NICHT für Domänenlogik, Architekturphilosophie oder Repo-Sollbilder missbrauchen
	•	Repo-Wahrheit bleibt Repo-Wahrheit, Doku-Wahrheit bleibt Doku-Wahrheit

⸻

AUFGABE:

Härtung von reusable Workflow-Refs in Consumer-Repos.

Ziel:
	•	reproduzierbare CI durch unveränderliche Refs
	•	minimale, präzise PRs
	•	keine Scope-Ausweitung

⸻

WICHTIGE REGELN:
	•	Diagnose vor Patch (zwingend)
	•	Kein Patch ohne bekannten Ziel-Ref
	•	Kein repo-weites Search/Replace
	•	Keine Ref-Raterei
	•	KEINE Guards hinzufügen
	•	Keine lokalen Workflow-Umbauten
	•	Keine AGENTS.md-Änderungen
	•	Keine Docs-Umbauschlacht
	•	metarepo bleibt Source of Truth

⸻

DIAGNOSE-PHASE (pflicht):
	1.	IST-ZUSTAND (belegt)

	•	Liste alle .github/workflows/*.yml, die enthalten:
	•	uses: heimgewebe/metarepo/.github/workflows/...
	•	uses: heimgewebe/wgx/.github/workflows/...
	•	Zeige jeweils:
	•	exakten uses:-Wert
	•	Ref-Typ (@main, @tag, @sha)

Für Metrics-Workflow zusätzlich:
	•	existiert with.metarepo_ref?
	•	aktueller Wert

⸻

	2.	HYPOTHESEN (max. 3)
Beispiel:

	•	H1: Workflow nutzt @main → driftanfällig
	•	H2: Metrics-Wrapper inkonsistent (uses vs metarepo_ref)
	•	H3: andere Workflows bereits korrekt gepinnt

⸻

	3.	BEWEISPLAN

	•	rg nach:
	•	uses: heimgewebe/metarepo/.github/workflows
	•	uses: heimgewebe/wgx/.github/workflows
	•	YAML-Struktur der betroffenen Dateien prüfen
	•	Verifizieren, dass Ziel-Ref (Tag oder SHA) existiert und korrekt ist

⸻

	4.	STOP-KRITERIUM
Patch nur wenn:

	•	konkreter unveränderlicher Ref bekannt ist
	•	Workflow aktuell @main oder driftenden Ref nutzt
	•	bei Metrics klar ist, wie metarepo_ref gesetzt werden muss

⸻

PATCH-PHASE:

A) metarepo Workflows
Ersetze:
uses: heimgewebe/metarepo/.github/workflows/.yml@main

durch:
uses: heimgewebe/metarepo/.github/workflows/.yml@<IMMUTABLE_REF>

⸻

B) Metrics-Workflow (wgx-metrics.yml)
	•	uses: auf denselben @<IMMUTABLE_REF> setzen
	•	metarepo_ref:
	•	falls vorhanden → auf denselben Ref setzen
	•	falls fehlt → ergänzen:
metarepo_ref: “<IMMUTABLE_REF>”
	•	schema_ref:
	•	nur entfernen, wenn sicher obsolet
	•	sonst unverändert lassen

⸻

C) wgx Workflows
	•	nur pinnen, wenn sicherer unveränderlicher Ref bekannt
	•	sonst NICHT ändern, sondern als Folgearbeit markieren

⸻

NICHT TUN:
	•	keine Guards hinzufügen
	•	keine CI-Refactorings
	•	keine funktionalen Änderungen
	•	keine zusätzlichen Checks
	•	keine Contract-Änderungen

⸻

AUSGABEFORMAT PRO REPO:
	1.	Diagnose
	2.	Betroffene Dateien
	3.	Erwartete Outputs (positiv/negativ)
	4.	Minimaler Patch
	5.	Verifikation
	6.	Was bewusst unberührt blieb

⸻

ENTSCHEIDUNGSPRINZIP:

Perfekt = minimal + reproduzierbar + konsistent

Wenn Ref unsicher:
→ NICHT patchen
→ als Folgearbeit markieren