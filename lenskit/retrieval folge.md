These: Der nächste PR sollte nicht noch mehr Retrieval-Intelligenz auf Phase 5 stapeln.
Antithese: Man könnte jetzt weiter an Federation, Identity-Regeln oder Cross-Repo-Links bauen. Das klingt groß, ist aber für Nutzerwirkung gerade die falsche Baustelle.
Synthese: Der beste Folge-PR ist ein schmaler Contract-Härtungs-PR für Phase 6:
Agent Query Contract Roundtrip + echte API-Profil-Projektion.

Warum das der richtige Folge-PR ist

Der aktuelle PR schiebt neue output_profile-Werte ins System und testet die Projektionslogik isoliert. Das ist nützlich, aber noch nicht der belastbare Beweis für die echte Agentenoberfläche.

Der nächste Hebel ist deshalb nicht „mehr Features“, sondern Verifikation des realen Nutzpfads:
	•	Request kommt über /api/query
	•	output_profile wird validiert
	•	Query läuft
	•	Projektion wird wirklich angewendet
	•	Response-Form bleibt contract-stabil
	•	Roundtrip ist testbar

Damit schließt du Phase 6 Test 1 sinnvoll an und härtest gleichzeitig die Stelle, an der Agenten das System tatsächlich anfassen.

Warum nicht stattdessen Federation weitertreiben?

Weil das eine alternative Sinnachse ist:
Statt das Retrieval weiter aufzublasen, kann man zuerst die Steueroberfläche zuverlässig machen. Ein gutes Werkzeug wird nicht dadurch besser, dass es noch einen Laser bekommt, wenn der Einschaltknopf manchmal nur dekorativ ist.

Konkrete Empfehlung

Folge-PR Titel

PR: Agent Query Contract Roundtrip + API Projection Integration

Ziel

Den echten /api/query-Pfad so absichern, dass:
	•	output_profile=lookup_minimal korrekt projiziert
	•	output_profile=review_context korrekt projiziert
	•	Wrapper-/Non-Wrapper-Form sauber belegt ist
	•	Request/Response-Contract stabil und testbar ist

⸻

Prompt für den Agenten

Arbeite den nächsten PR als schmalen Contract-Härtungs-PR für Phase 6 aus.

Ziel:
Den realen Agenten-Nutzpfad über `/api/query` end-to-end absichern, statt weitere Retrieval-Features anzubauen.

Scope:
Agent Query Contract Roundtrip + API Projection Integration

Wichtig:
- Kein neuer Federation-Ausbau
- Keine neue Identity-/Conflict-Engine
- Keine große Refaktorierung
- Keine Zentralisierung von Enums/Literals in diesem PR, außer sie ist zwingend nötig
- Fokus: echter API-Contract, echte Projektion, echte Tests

Aufgaben:

1. Diagnose zuerst
Lies vollständig:
- merger/lenskit/service/models.py
- merger/lenskit/service/... (die Route für `/api/query`, finde den exakten Handler)
- merger/lenskit/retrieval/output_projection.py
- bestehende API-Tests, insbesondere test_api_query.py oder ähnliche
- ggf. cmd_query.py nur dann, wenn `/api/query` indirekt denselben Projektionspfad nutzt

Belege vor Änderungen:
- wie `/api/query` Request und Response aktuell strukturiert sind
- wo `output_profile` tatsächlich angewendet wird
- ob die neuen Profile `lookup_minimal` und `review_context` im echten API-Pfad schon korrekt projiziert werden oder nur in Unit-Tests von `project_output()`

2. Zielbild des PR
Dieser PR soll mindestens diese Lücke schließen:
- `test_agent_query_contract_roundtrip`
soll als echter API-naher Test implementiert werden

Zusätzlich sollen API-nahe Tests für die neuen Profile entstehen, damit nicht nur `project_output()` isoliert getestet ist, sondern die reale Route:
- Request -> Validation -> Query -> Projection -> Response

3. Konkrete Änderungen
Wenn der API-Pfad die Projektion noch nicht korrekt anwendet:
- korrigiere den API-Handler minimal
- bevorzuge Wiederverwendung von `project_output(...)`
- keine duplizierte Profil-Logik im Handler

Wenn der API-Pfad bereits korrekt ist:
- keine unnötigen Runtime-Änderungen
- nur Testbelege ergänzen

4. Pflicht-Tests
Ergänze belastbare API-nahe Tests für mindestens folgende Fälle:

A) test_agent_query_contract_roundtrip
- Request an `/api/query` mit realistischem Payload
- Response ist strukturell valide
- zentrale Felder sind vorhanden
- `output_profile` wird berücksichtigt
- Contract bleibt maschinenlesbar

B) lookup_minimal über echten API-Pfad
- mit Output-Profil `lookup_minimal`
- belegen, dass `explain`, `graph_context`, `surrounding_context` entfernt sind

C) review_context über echten API-Pfad
- mit Output-Profil `review_context`
- belegen, dass `explain` erhalten bleibt
- `graph_context` entfernt ist
- `surrounding_context` nur erhalten bleibt, wenn befüllt

D) Wenn der Response-Pfad zwei Formen haben kann (Wrapper mit `query_trace` vs direkte Bundle-Form):
- diese Form explizit belegen
- Tests dürfen die Form nicht nur implizit erraten, sondern sollen sie bewusst prüfen

5. Dokumentation / Blaupause
Kalibriere docs/lenskit-upgrade-blaupause.md nur dort, wo es wirklich durch Tests belegt ist:
- `test_agent_query_contract_roundtrip` nur dann abhaken, wenn wirklich umgesetzt
- Agent Query Contract Deliverable nur dann höher markieren, wenn der echte API-Pfad belegt ist
- keine überzogenen Phase-6-Häkchen setzen

6. Verifikation
Führe gezielt die relevanten Tests aus.
Nenne am Ende:
- welche Runtime-Dateien geändert wurden
- welche Tests neu sind
- ob eine echte Runtime-Lücke gefunden wurde oder nur Testlücke
- welche Contract-Aussage jetzt belastbar belegt ist

Stop-Kriterium:
Der PR ist fertig, wenn der echte `/api/query`-Pfad für mindestens einen Roundtrip-Test und die zwei neuen Output-Profile belastbar abgesichert ist, ohne Scope-Ausweitung in Federation oder größere Architekturumbauten.


⸻

Was dieser Folge-PR idealerweise liefert

Belegt
	•	Agentenoberfläche ist real nutzbar, nicht nur theoretisch modelliert
	•	neue Profile wirken im echten API-Pfad
	•	Response-Form ist überprüft

Plausibel, aber noch offen
	•	bounded tool surface
	•	maschinenlesbare uncertainty-Felder
	•	agent session trace
	•	conflict warnings

Spekulativ / jetzt nicht
	•	große Vereinheitlichung aller Profile/Enums
	•	tiefere Agentensteuerung
	•	weitere Federation-Semantik

Risiko-/Nutzenabschätzung

Nutzen
	•	hoher Architekturwert pro kleinem PR
	•	schließt reale Contract-Lücke
	•	reduziert falsche Sicherheitsgefühle aus reinen Unit-Tests

Risiken
	•	geringe Scope-Drift Richtung API-Refactor
	•	Versuchung, nebenbei CLI und API zu vereinheitlichen
	•	Dokumentations-Häkchen könnten wieder zu früh gesetzt werden

Gegenmaßnahme
	•	nur /api/query-Pfad härten
	•	keine Architekturkosmetik
	•	Beleg vor Behauptung

Essenz

Hebel: Nicht mehr Retrieval, sondern echter Agenten-Contract.
Entscheidung: Folge-PR = Agent Query Contract Roundtrip + API Projection Integration.
Nächste Aktion: Den obigen Prompt an Jules geben.

Unsicherheitsgrad: 0.14
Ursachen: Ich sehe den aktuellen Threadstand, aber nicht den exakten Inhalt der API-Route-Datei.

Interpolationsgrad: 0.12
Hauptannahmen: Dass /api/query der zentrale reale Agentenpfad ist und dass Phase 6 damit sinnvoll vertikal geschlossen wird.