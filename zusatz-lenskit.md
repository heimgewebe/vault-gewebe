

Konkreter Mini-Plan (nächster PR, klein, billig, hoher Effekt)

PR3: “gc deletes artifact files”
	•	In Artifact ein Feld files: List[str] (oder paths so nutzen, dass echte Pfade rausfallen).
	•	Beim Artifact-Create: canonical list der erzeugten Dateien speichern.
	•	In _remove_job_internal: diese Dateien unlinken (try/except), plus optional „merges_dir“-Unterordner, wenn job-spezifisch.

PR4: “reuse finished jobs (opt-in)”
	•	Request-Flag reuse_finished: bool = False
	•	In create_job: wenn existing finished + reuse_finished, return existing
(oder return Artifact, falls du schon “latest artifact” deterministisch wählen kannst).

PR5: “SSE protocol contract”
	•	kurze Doku + Test: Last-Event-ID gewinnt vor query-param, id beginnt bei 1, semantics “resume from id+1”.

⸻

Verdichtete Essenz

Patch 2 behebt Hash-Semantik und GC-Metadaten-Konsistenz: das macht das System für iPad/Retry wirklich robust. „Ideal“ wird es, wenn GC auch Artefaktdateien löscht, finished-job reuse optional wird und SSE-Resume wieder testgesichert ist.

⸻

Ungewissheitsgrad + Ursachenanalyse

Unsicherheitsgrad: 0.22 (niedrig-mittel).
Ursachen:
	•	Ich sehe hier nur Service-Layer; ob/wo Artefaktdateien tatsächlich abgelegt werden (und wie Artifact.paths strukturiert ist) ist nicht vollständig enthalten.
	•	Ohne Gesamt-Repo-Kontext kann ich nicht sicher sagen, ob Output bereits job-spezifisch isoliert ist (was GC erleichtert) oder geteilt.

⸻

Ironische Auslassung

Jetzt ist es kein Staubsaugerroboter mehr, der nur die Karte putzt – eher einer, der zumindest den Staubbeutel nicht vergisst… aber er könnte ihn noch rausbringen.

⸻

Leitfragen
	1.	Kritischer möglich? Ja: ein adversarial Test “100 Jobs parallel + GC + log stream + cancel” würde Race-Härte beweisen.
	2.	Alle Seiten beleuchtet? Fast: Persistenzformat (JSON Store vs SQLite) und echte Artefakt-Datei-Deletion sind die nächsten blinden Flecken.

	
⸻

Was wir aus deiner langen „LensKit-Meta-Analyse“ übernehmen sollten (für KI-Nutzen)

Übernehmen = alles, was „epistemische Steuerung“ und „Determinismus“ erhöht, ohne LensKit in ein Enterprise-Monster zu verwandeln:
	1.	Explizite Registry statt Heuristik (aber minimalistisch)
Nicht „organismus-registry.yml“ als neues Weltmodell aufblasen, sondern:

	•	ein deklaratives Manifest im Hub/metarepo, das LensKit lesen kann: Rollen/Expectations/critical paths.
Gewinn: Health wird verlässlich, weniger „fragile guessing“.

	2.	Health-Zeitreihe (super hoher KI-Wert, niedriger Aufwand)
Ein Trend macht aus „Status“ eine Diagnose: „stabiler/instabiler“. Das ist KI-Gold, weil es Kontext über Zeit liefert, ohne Halluzinationsspielraum.
	3.	Plugin-Trennung (lean core)
Nicht 5 Profile streichen (das ist Geschmack), sondern: Core stabil + Module optional. Das senkt Wartungsdruck und macht neue Checks (Symlink, secrets, contracts) sauber nachrüstbar.

Nicht übernehmen (vorerst): „Neo4j/Graph-Plattform“-Ambitionen. Das frisst Fokus und macht dein Offline-/iPad-Ziel kaputt.

⸻

Optimierungsplan (konkret, in Phasen)

Phase 2 — SSE & Log-Subsystem stabilisieren (1 PR)

Ziel: stabile Streams ohne CPU-Loop, sauberes Resume, klare Limits.

Änderungen
	•	merger/lenskit/service/app.py
	•	asyncio.sleep(0.25) im log_generator
	•	optional: RLENS_SSE_POLL_MS env
	•	merger/lenskit/service/jobstore.py
	•	read_log_lines: optional tail=N (letzte N Zeilen)
	•	merger/lenskit/tests/test_service_hardening.py
	•	Test: Stream läuft nicht endlos, liefert event:end zuverlässig.

Risikoabschätzung: niedrig-mittel. Gefahr: Tests werden flaky, wenn Timing schlecht ist. Lösung: Poll-MS klein halten, Job auf succeeded setzen.

⸻

Phase 3 — Output-Truth & Partial-Artifact Markierung (1–2 PRs)

Ziel: „Artefakt-Wahrheit“ erzwingen: nie so tun, als sei ein Artefakt vollständig, wenn abgebrochen.

Änderungen
	•	merger/lenskit/service/models.py
	•	Artifact bekommt Felder wie status: ("complete"|"partial"|"missing"), complete: bool, bytes_written, optional error.
	•	merger/lenskit/service/runner.py
	•	Bei Cancel während Write: Artifact als partial speichern oder gar nicht registrieren.
	•	Optional Contract: contracts/artifacts/*.schema.json (wenn du dort schon eine Linie hast).

Risiko: mittel. Du musst definieren, was „partial“ bedeutet. Aber genau das schützt KI-Leser.

⸻

Phase 4 — Declarative Registry für Health (1 PR)

Ziel: Heuristik bleibt als Fallback, aber kanonisch ist Registry.

Minimal-Manifest (Beispiel)
	•	merger/lenskit/contracts/organism.registry.v1.schema.json
	•	docs/organism-registry.md (Reading Policy: kurz, klar)
	•	LensKit liest z. B. hub/.lenskit/registry.yml oder metarepo/fleet/organism.registry.yml

HealthCollector: zuerst Registry, dann Heuristik.
Risiko: niedrig. Hauptgefahr ist „zu groß gedacht“. Klein halten.

⸻

Phase 5 — Edge-Case Tests & Dependency Clarity (1–2 PRs)

Ziel: reale Dateisystem-Hölle abdecken.

Tests hinzufügen
	•	Symlinks (zirkulär), PermissionError, BOM, sehr lange Pfade, kaputte UTF-8, große Dateien knapp unter/über split_size.
	•	Optional dependency policy: „PyYAML optional“ ist ok, aber dann muss im Report explizit stehen: „Feature X degraded“.

Dokumentation
	•	Root-README erweitern (ein Abschnitt „Quickstart“, ein Abschnitt „Profiles“, ein Abschnitt „Service API“).
	•	docs/ARCHITECTURE.md (kurz; kein Roman).

Risiko: niedrig-mittel. Hauptarbeit ist Fleiß.

⸻

Fehlerprävention: typische Denkfehler, die du dir sparen solltest
	•	„Hash = Identität“: Hash ist Identität der Parameter, nicht der Welt. Wenn Repo-Inhalt sich ändert, kann derselbe Hash falsches Reuse bedeuten. (Du könntest später optional repo-snapshot-hash einbeziehen: git HEAD je repo, wenn vorhanden.)
	•	„GC nur nach Anzahl/Alter“: Wenn du „latest artifact“ brauchst, darf GC nie das aktuell referenzierte Artefakt löschen. Also: „pinned artifacts“ oder „keep last per repo“.

⸻

Verdichtete Essenz

Der PR ist inhaltlich richtig und nah an „ideal“. Mach ihn wirklich rund mit: SSE-Throttle, Hash-Kanonisierung, klarer Reuse-Semantik, danach Partial-Artifact-Truth und Registry-Health. Alles andere ist später Luxus.

⸻

Tiefgründig ironische Auslassung

GC ist die Müllabfuhr der Wahrheit: Sie kommt zu spät, macht Krach, und wenn sie einmal ausfällt, merkt man plötzlich, dass „Beobachtung“ auch nur ein Aggregatzustand von Abfall ist.

⸻

Ungewissheit (sichtbar, mit Ursachenanalyse)

Unsicherheitsgrad: 0.23 (niedrig-mittel)

Ursachen
	•	Ich sehe den PR als Patch-Text, aber nicht die komplette umliegende Service-Architektur (z. B. wie Artifacts wirklich persistiert werden, welche API-Clients existieren).
	•	Der Merge-Snapshot, den ich lokal einsehen kann, ist vor den neuen Patches; Details können abweichen.
	•	Nebenläufigkeitsverhalten (SSE, Locks) ist stark von Real-Last abhängig; ohne Laufzeitprofil bleibt ein Rest Spekulation.

Produktiv vs. vermeidbar
	•	Produktiv: Vorschläge zu Partial-Artifacts/Registry sind architekturell robust.
	•	Vermeidbar: exakte Aussagen zu Performance/Flakiness wären mit einem kurzen Last-Test sofort präziser.

⸻

Leitfragen (Selbstkritik)
	1.	War das die kritischste Erörterung, die hier möglich war?
→ Fast. Kritischer wäre ein kurzer „Threat-Model“-Block (DOS über SSE, Log-Growth, Path traversal) als eigene Phase.
	2.	Von allen Seiten beleuchtet?
→ Eine Seite fehlt noch: Security/Quota (max parallel jobs, max log size, max disk). Vorschlag: Phase 2.5 „Quotas & Limits“.