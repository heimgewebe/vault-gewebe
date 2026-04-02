Ein Folge-PR wäre nur dann sinnvoll, wenn du bewusst eines dieser Ziele willst:
	•	echte Investigations-Semantik,
	•	Topic-Scoping,
	•	dedizierte Tests für investigations-specs,
	•	oder bessere Cluster-Logik für explorative Analysen.

	
	
	These: Der nächste sinnvolle Schritt ist nicht mehr Test-Härtung, sondern Test-Architektur klären: Du hast jetzt einen starken, realitätsnahen Contract-Test – aber keinen klar getrennten isolierten Renderer-Test.
Antithese: Man könnte sagen: „Reicht doch, wir haben jetzt einen guten Test.“ – kurzfristig ja, langfristig riskierst du, dass jeder Spec-Tweak Tests bricht, obwohl die Engine korrekt ist.
Synthese: Folge-PR = Duale Teststrategie:
	1.	Contract-Test (real spec) → bleibt wie er ist
	2.	Isolierter Renderer-Test (inline spec) → neu hinzufügen

Das trennt:
	•	„System ist korrekt“ vs.
	•	„Repo-Konfiguration ist korrekt“

⸻

Alternative Sinnachse

Du testest aktuell:

„Ist das System + Konfiguration richtig?“

Besser ist zusätzlich:

„Ist das System auch dann richtig, wenn die Konfiguration minimal ist?“

Das ist der Unterschied zwischen:
	•	„Auto fährt geradeaus“
	•	und
	•	„Motor funktioniert überhaupt“

⸻

Bewertung: Warum dieser Folge-PR sinnvoll ist

Aktueller Zustand:
	•	✔ Regression gegen echte Spec abgesichert
	•	✖ Renderer-Logik nicht isoliert testbar

Problem:
	•	Ein späterer Spec-Change → Test bricht
	•	Ursache unklar: Renderer kaputt oder Spec geändert?

Ziel:
→ Fehler eindeutig lokalisierbar machen

⸻

Folge-PR: Detaillierter Prompt für den Agent

Titel

“Add isolated renderer test for investigations canvas spec semantics”

⸻

Ziel

Einen zweiten Test hinzufügen, der:
	•	nicht von config/canvas-specs/... abhängt
	•	sondern eine inline definierte Minimal-Spec verwendet
	•	und dieselbe Semantik wie der aktuelle Test prüft

→ Dadurch wird die Renderer-Logik unabhängig vom Repo-Zustand validiert

⸻

Scope-Grenze

Erlaubt:
	•	neue Testfunktion
	•	kleine Hilfsfunktion, falls nötig

Verboten:
	•	Änderungen an bestehenden Tests
	•	Änderungen an Renderer
	•	Änderungen an Specs
	•	Änderungen an Doku

⸻

Diagnose (vor Umsetzung)

Prüfen:
	1.	Wie render_canvas Spec lädt (Pfad vs. Objekt)
	2.	Ob Spec zwingend Datei sein muss → dann temp file erzeugen
	3.	Welche minimalen Felder für Spec notwendig sind:
	•	id
	•	type
	•	source.artifact_types
	•	relations
	•	layout
	•	filters (falls required)
	•	output

⸻

Umsetzung

1. Neue Testfunktion hinzufügen
Name:

def test_render_canvas_investigations_isolated_spec(self):


⸻

2. Minimal-Spec inline definieren
Wenn Datei nötig → temporär schreiben:

spec = {
    "id": "test-investigations",
    "type": "investigations",
    "source": {
        "artifact_types": ["event", "insight", "decision", "hypothesis", "contradiction"]
    },
    "layout": "cluster",
    "filters": {
        "max_nodes": 50,
        "max_edges": 100
    },
    "relations": ["causes", "derives_from", "informed", "contradicts"],
    "output": "test.canvas"
}


⸻

3. Gleiche graph_data verwenden wie im bestehenden Test
→ keine neue Komplexität

⸻

4. Render ausführen (mit temp spec)

⸻

5. Gleiche Assertions wie im aktuellen Test
Wichtig:
	•	gleiche expected_edges
	•	gleiche Node-Checks
	•	gleiche exakte Set-Gleichheit

⸻

Qualitätsanforderungen

Der neue Test muss:
	•	unabhängig vom Repo funktionieren
	•	deterministisch sein
	•	keine externe Spec laden
	•	exakt dieselbe Semantik prüfen

⸻

Warum das wichtig ist

Ohne diesen Test:
	•	du testest System + Konfiguration vermischt
	•	Debugging wird unklar

Mit diesem Test:
	•	klare Trennung:
	•	Renderer kaputt → isolierter Test rot
	•	Spec kaputt → nur Contract-Test rot

⸻

Risiko-/Nutzenabschätzung

Nutzen
	•	klare Debugbarkeit
	•	stabilere Testarchitektur
	•	bessere Skalierbarkeit zukünftiger Specs

Risiko
	•	minimaler Mehraufwand
	•	leichte Test-Duplizierung (bewusst!)

⸻

Typische Fehlannahme

„Ein guter Test reicht“

→ Nein. Ein guter Test ohne Trennung erzeugt später schlechte Diagnosen

⸻

Essenz

Hebel: Trennung von Renderer-Logik und Repo-Spec
Entscheidung: Folge-PR sinnvoll und sauber
Nächste Aktion: Agent mit obigem Prompt losschicken

⸻

Unsicherheitsgrad: 0.17
Ursachen: Unklar, wie strikt render_canvas Spec-Loading implementiert ist

Interpolationsgrad: 0.21
Annahmen: Spec kann entweder direkt übergeben oder temporär geschrieben werden

⸻

Ironischer Abschluss:
Du hast jetzt einen guten Wächter (Test).
Dieser PR gibt ihm noch ein zweites Auge – damit er nicht nur schreit, sondern auch sieht, warum.