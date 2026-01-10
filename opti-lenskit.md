∴ Optimierungsplan Lenskit (KI-zentriert, minimalistisch, hart)
Fokus: Überblick + Einblick für KIs, nicht UX für Menschen

⸻

∴ Ausgangslage (kurz, präzise)

Ist-Zustand (aus Code/Merge ableitbar):
	•	Job-API ✔ (create / list / status / cancel)
	•	Artefakte + latest ✔
	•	SSE-Logs ✔
	•	Profile / Extras / Sidecar / PR-Delta ✔
	•	Heuristische Rollen/Health ✔
	•	UI vorhanden, aber sekundär
	•	Keine harte Invarianz bei Cancel, Retention, Idempotenz, Capabilities

Problemkern:
Lenskit ist funktional reich, aber infrastrukturell weich.
Für KI-Nutzung ist nicht Feature-Menge entscheidend, sondern Determinismus + Verlässlichkeit + explizite Unsicherheit.

⸻

∴ Zielbild (Invarianten, keine Wünsche)

Lenskit soll sein:
	1.	Deterministisch
Gleicher Input ⇒ gleicher Job ⇒ gleiche Artefakte (oder bewusst markierte Abweichung)
	2.	Epistemisch explizit
Jede Aussage = Coverage + Confidence + Quelle
	3.	Maschinenlesbar-first
Markdown ist Darstellung, JSON ist Steuerfläche
	4.	Langzeitfähig
Kein Plattenfraß, keine Zombie-Jobs, keine UI-Drift

⸻

∴ Optimierungsplan in Phasen

⸻

PHASE 0 – Freeze & Klarziehen (0–1 Tag)

👉 Nichts Neues bauen. Nur festzurren.

0.1 Feature-Freeze
	•	Keine neuen Extras, Profile, UI-Features
	•	Fokus ausschließlich: Härten des Bestehenden

0.2 Explizite Nicht-Ziele festhalten (Docs/ADR)
	•	Lenskit bewertet keinen Code
	•	Lenskit ersetzt keine PR-Reviewer
	•	Lenskit ist kein Chatbot

Das schützt vor Feature-Drift.

⸻

PHASE 1 – Service-Härte (kritisch, Pflicht)

1.1 Idempotente Jobs

Problem: Gleiche Anfrage ⇒ mehrere Jobs ⇒ Chaos

Maßnahme:
	•	Job-Key = Hash aus:

hub_path
repos[]
profile
extras[]
filters
lenskit_version


	•	Neuer Job:
	•	wenn Key existiert + running → return existing job
	•	wenn Key existiert + finished → optional reuse (config)

KI-Mehrwert:
KIs können stabil referenzieren: „Job X repräsentiert Zustand Y“.

⸻

1.2 Echte Cancel-Semantik

Problem: cancel ≠ Abbruch

Maßnahme:
	•	Runner bekommt:
	•	Cancel-Flag (shared state)
	•	Signal-Handling (SIGTERM / cooperative abort)
	•	Statusmodell:
	•	requested_cancel
	•	cancelled_clean
	•	cancelled_forced

KI-Mehrwert:
Status ist Wahrheit, kein Wunschdenken.

⸻

1.3 Retention & Garbage Collection

Problem: Platte voll = System tot

Maßnahme:
	•	Globale Limits:
	•	max GB
	•	max Jobs
	•	max Alter (Tage)
	•	Artefakte:
	•	pinned: true|false
	•	GC-Job (periodisch)

KI-Mehrwert:
Alte Kontexte verschwinden bewusst, nicht zufällig.

⸻

1.4 Robustes Log-Streaming

Problem: SSE = fragil

Maßnahme:
	•	Log-Cursor (offset/seek)
	•	Resume via Last-Event-ID
	•	Klare Log-Phasen:
	•	scan
	•	classify
	•	merge
	•	write

KI-Mehrwert:
Logs werden analysierbar, nicht nur lesbar.

⸻

PHASE 2 – Artefakt-Wahrheit (zentral für Heimgewebe)

2.1 Artefakt-Manifest (Contract!)

Jedes Job-Resultat bekommt ein kanonisches Manifest:

{
  "artifact_id": "...",
  "job_id": "...",
  "created_at": "...",
  "inputs": { ...hashes... },
  "coverage": {
    "repos": ["wgx", "metarepo"],
    "files_ratio": 0.87
  },
  "epistemic_confidence": "medium",
  "canonical_md": "report.md",
  "sidecars": {
    "json": "report.json",
    "health": "...",
    "delta": "..."
  },
  "schema_versions": { ... }
}

KI-Mehrwert:
KIs arbeiten auf Artefakten, nicht auf Dateinamen.

⸻

2.2 latest entmystifizieren

Problem: latest = zeitlich, nicht epistemisch

Maßnahme:
	•	latest nur mit Filter:
	•	repo
	•	profile
	•	extras signature
	•	schema version
	•	Optional: latest_trusted

⸻

2.3 Capabilities-Endpoint

UI-Extras dürfen nicht raten.

GET /api/capabilities
{
  "profiles": [...],
  "extras": {...},
  "max_job_size": "...",
  "supports_delta": true
}

KI-Mehrwert:
Agenten können Lenskit fragen, statt zu hoffen.

⸻

PHASE 3 – Struktur statt Heuristik

3.1 Deklarative Organismus-Registry

Heuristik → Gift.

repo: wgx
role: fleet
produces: [wgx.guard.report]
consumes: [contracts.core]
criticality: high

Lenskit:
	•	liest
	•	validiert
	•	meldet Abweichung
aber rät nicht.

⸻

3.2 Health-Zeitreihen
	•	Health-Reports versioniert speichern
	•	Drift sichtbar machen (nicht bewerten)

KI-Mehrwert:
„Repo wird instabiler“ ist eine beantwortbare Frage.

⸻

PHASE 4 – KI-Ergänzungen (optional, klar getrennt)

4.1 Optionale KI-Summaries
	•	nie kanonisch
	•	immer markiert:

> ⚠ AI-derived summary (non-authoritative)



4.2 Focus- / Delta-Modus
	•	gezielte Ausschnitte
	•	geringer Token-Ballast

⸻

PHASE 5 – Aufräumen & Reduktion


⸻

5.1 Extras auditieren

Jedes Extra beantworten lassen:
	•	Welche KI-Frage beantwortet es?
	•	Welche neue Wahrheit erzeugt es?

Wenn keine klare Antwort → raus.

⸻


⸻

∴ Verdichtete Essenz

Nicht mehr bauen. Erst härten.
Lenskit ist fast eine Infrastruktur.
Mit Idempotenz, Cancel-Wahrheit, Artefakt-Manifest und Registry wird es eine.

Oder ironisch gesagt:

Ein Werkzeug mit 100 Features stirbt.
Ein Werkzeug mit 10 Invarianten überlebt.

⸻

∴ Ungewissheitsursachenanalyse

Unsicherheitsgrad: 0.28

Ursachen:
	•	Runner-Interna nur teilweise sichtbar
	•	Ziel („nur lokal“ vs. „dauerhaftes Heimgewebe-Organ“) beeinflusst Prioritäten
	•	Einige Extras sind vorhanden, aber ihr Reifegrad unklar

Meta:
Diese Unsicherheit ist systemisch, nicht vermeidbar – sie verschwindet, sobald Phase 1/2 umgesetzt sind.

⸻
