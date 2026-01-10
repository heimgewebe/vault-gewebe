Du hast recht – ich hatte vorher nicht alle Repos auf dem Schirm. Jetzt gehe ich explizit über die aktuelle Repo-Matrix und die zugehörigen Docs, inkl. Roadmap und Schichtenmodell, und liste wirklich alles, was dort als Fleet-Core auftaucht – plus die wichtigsten Satelliten wie sichter und mitschreiber.

Ich nutze dabei deine eigene Status-Skala (stabil, aktiv, MVP, Aufbau, Experiment, Docs-only, geplant, kuratiert) als Grundlage für eine grobe Prozentabschätzung.

⸻

1. Fleet-Core – alle 12 Repos mit Umsetzungsgrad und nächstem Schritt

Legende der Prozentwerte
	•	stabil → ~80–90 %
	•	aktiv → ~70–80 %
	•	Aufbau → ~60–70 %
	•	MVP → ~50–60 %
	•	Experiment → ~30–40 %
	•	Docs-only / geplant → ~10–30 %
	•	kuratiert → ~60–70 % (funktional, aber Open End nach oben)

Quelle der Statuswerte: Repo-Matrix in docs/repo-matrix.md im metarepo.

⸻

1.1 metarepo
	•	Rolle: Control-Plane (Templates, Reusables, Contracts).
	•	Status (laut Matrix): stabil
	•	Geschätzter Umsetzungsgrad: ~80–85 %
Begründung:
	•	ADRs zu Distribution/Drift, CI-Reusables, .wgx/profile.yml, Evidence-Packs und Leitstand-Umbenennung sind vorhanden und angenommen bzw. vorgeschlagen.
	•	Contracts und CI sind explizit als erster Schritt der Gesamt-Roadmap gesetzt.
Nächster Schritt:
	•	Contracts v1 wirklich „zu machen“: alle Schemas konsequent mit AJV und Reusable-Workflows verdrahten, inkl. tagbasiertem Release (contracts-v1).
	•	WGX-Integration härten: sicherstellen, dass jede Fleet-Repo ein sauberes .wgx/profile.yml hat, das metarepo-Templates nutzt (Guard/Smoke).

⸻

1.2 wgx
	•	Rolle: Orchestrator (CLI, Motorik, PC-Wartung, Metrics).
	•	Status: aktiv
	•	Geschätzter Umsetzungsgrad: ~70–80 %
Begründung:
	•	Als „Motorik & PC-Wartung“ bereits im Betriebs-Takt verankert (wgx Metrics Snapshot stündlich + on-demand).
	•	ADR-004 definiert deterministisches Verhalten über .wgx/profile.yml (Pflichtfelder, Evolutionsplan).
Nächster Schritt:
	•	WGX als kanonische Engine fertig ziehen: v1 der CLI stabilisieren (subcommands für guard/smoke/metrics), strenge Versionierung (requiredWgx im Profile) und bessere Fehlermeldungen, wenn Profile fehlen oder fehlerhaft sind.
	•	Fleet-weit durchziehen: sicherstellen, dass alle Core-Repos WGX-Guard/Smoke in der CI referenzieren (statt lokalen Speziallösungen).

⸻

1.3 hausKI
	•	Rolle: KI-Orchestrator (Rust, GPU, Offline, Entscheider mit Gedächtnis).
	•	Status: aktiv
	•	Geschätzter Umsetzungsgrad: ~70 %
Begründung:
	•	Speicherpfade und Datenstrukturen sind definiert (~/.hauski/state/hauski.db, Events JSONL).
	•	In der Roadmap klar verankert: Persistenz + Playbooks + heimlern-Hook als nächster Meilenstein.
Nächster Schritt:
	•	Persistenz „richtig“ machen: weg von unwrap()-Land hin zu robustem Fehlerhandling, Migrationen und klaren Recovery-Pfaden.
	•	Playbooks & heimlern-Hook implementieren: hausKI-Entscheidungen explizit mit Policies verbinden und Feedback-Loops für heimlern anlegen.

⸻

1.4 hausKI-audio
	•	Rolle: Audio-Pipeline (Eingang für Audio-Telemetrie, später Dialog-Schicht).
	•	Status: MVP
	•	Geschätzter Umsetzungsgrad: ~50–60 %
Begründung:
	•	MVP heißt: Grundpfad steht, aber Robustheit, Monitoring und Integration in hausKI/chronik sind noch ausbaufähig.
	•	In der Roadmap taucht „Audio-Telemetrie“ erst in Schritt 5 auf (späterer Ausbau).
Nächster Schritt:
	•	Saubere Event-Kette: Audio-Ereignisse als Events nach chronik bringen (z. B. „audio.session.started“, „audio.transcribed“) und semantAH-Hooks vorbereiten.
	•	Monitoring: einfache Metriken (Latenz, Fehlerraten) über wgx-guard/smoke sichtbar machen.

⸻

1.5 semantAH
	•	Rolle: Semantik & Graph (Index, Insights, „Sinnschicht“).
	•	Status: Aufbau
	•	Geschätzter Umsetzungsgrad: ~60–70 %
Begründung:
	•	Speicherpfade sind definiert: vault/.gewebe/index/*, vault/.gewebe/insights/*, explizit als rebuildbar markiert.
	•	Roadmap-Kette „Contracts & CI → wgx metrics → semantAH insights“ verortet semantAH explizit als nächsten Sprung nach Metrics.
Nächster Schritt:
	•	Standardisierte Insight-Formate: Contracts für Insights (insights.schema.json) konsequent verwenden und in semantAH-Pipeline integrieren.
	•	Graph-API nach außen: minimalen Query-Endpunkt bauen (z. B. „ähnliche Dateien/Events“, „Hotspots“) für hausKI und sichter.

⸻

1.6 chronik
	•	Rolle: Event-Ingest + Persistenz/Audit – „Gedächtnis“.
	•	Status: stabil
	•	Geschätzter Umsetzungsgrad: ~80 %
Begründung:
	•	Event-Speicherpfade definiert (data/*.jsonl).
	•	ADR-006 hat die Rolle klar von leitstand getrennt (chronik = Backend/Gedächtnis).
Nächster Schritt:
	•	Ingest-Pfade anreichern: mehr Quellen (hausKI, semantAH, aussensensor, heimlern) konsequent als Events in chronik schreiben.
	•	Query-Schnittstelle: einfache Zeitbereich- und Filterabfragen (z. B. „Events der letzten 24h für Repo X“) definieren.

⸻

1.7 leitstand
	•	Rolle: UI/Dashboard (Kontrollraum, Panels, Digests).
	•	Status: geplant
	•	Geschätzter Umsetzungsgrad: ~10–20 %
Begründung:
	•	Konzeption ist klar (Dashboard, Digest digest/*.md, täglicher Takt 08:00).
	•	Es gibt bereits ein Dashboard-Sketch (TypeScript-Beispiel).
Nächster Schritt:
	•	Minimal-Dashboard: ein erstes Panel, das nur drei Dinge zeigt: jüngste Events aus chronik, letzte semantAH-Insights, Health der Fleet (wgx metrics).
	•	Digest-Pipeline: täglichen Markdown-Digest aus chronik/semantAH generieren und im Repo ablegen.

⸻

1.8 aussensensor
	•	Rolle: Feeds → chronik (kuratierte Außenquellen).
	•	Status: aktiv (Daemon geplant)
	•	Geschätzter Umsetzungsgrad: ~70 %
Begründung:
	•	Als „Boundary außen“ in der Sicherheitssektion klar markiert, nur kuratierte Feeds gehen hinein.
	•	Feeds landen bereits in chronik, der fehlende Baustein ist ein dauerhafter Daemon.
Nächster Schritt:
	•	Daemon implementieren: systemd- oder wgx-gesteuerter Loop, der Feeds periodisch zieht, validiert (Contracts!) und als Events in chronik schreibt.
	•	Feed-Policy: kleine Policy-Sprache, welche Feeds wann und wie tief laufen dürfen (Throttling, Risikostufen).

⸻

1.9 heimlern
	•	Rolle: Policies/Bandit, politisch-adaptive Schicht – verbessert Entscheidungen.
	•	Status: Experiment
	•	Geschätzter Umsetzungsgrad: ~30–40 %
Begründung:
	•	Klar in Schichtenmodell als politisch-adaptiv verankert, aber noch eher konzeptionell als vollständig operativ.
Nächster Schritt:
	•	Ein echter Closed Loop: mind. einen realen Policy-Fall aufspannen (z. B. „wann wgx-smoke anwerfen“, „wann PR-Review vertiefen“), der über heimlern adaptiv gesteuert wird.
	•	Eval-Logging: Lernentscheidungen als Events in chronik schreiben, damit du später nachvollziehen kannst, warum der Bandit etwas bevorzugt.

⸻

1.10 weltgewebe
	•	Rolle: Web (SvelteKit, Rust/Axum, Postgres+Outbox, JetStream, Caddy), eigenständiges Projekt mit Docs-first-Ansatz.
	•	Status: Docs-only
	•	Geschätzter Umsetzungsgrad: ~30 %
Begründung:
	•	Umfangreiche Dokumentation (Vision, Ethik/UX, Architekturstruktur, Gates A–D), aber Code ist noch im „Preview“-Modus und bewusst nicht als Teil der Fleet gedacht.
Nächster Schritt:
	•	Gate-C-Pfad wirklich gehen: einen minimalen „Gate-C“-Stack aktivieren (lokales Docker-Setup) und klar definieren, wie leitstand-Widgets lesen dürfen (nur über Leitstand-Gateway).
	•	Schnittstelle zur Fleet: definieren, welche Daten aus leitstand in weltgewebe visualisiert werden dürfen (kein Direktzugriff auf JSONL, nur UI-Level).

⸻

1.11 tools
	•	Rolle: Hilfsskripte & Shared Utilities (z. B. wc-merger, org-Assets, Checks).
	•	Status: aktiv
	•	Geschätzter Umsetzungsgrad: ~70 %
Begründung:
	•	Wird bereits zur Generierung der Org-Assets eingesetzt (Tabelle aus repos.yml usw.).
	•	wc-merger, repomerger etc. sind im Einsatz, aber du arbeitest noch aktiv an ihrer Qualität.
Nächster Schritt:
	•	Merger-Kanon definieren: festlegen, welche Merger (repomerger vs. wc-merger) für welche Aufgaben gelten und diese Logik im tools-Repo dokumentieren.
	•	Tests: einfache Regressionstests (Merges von Beispiel-Repos) einführen, um Layout-/Inhaltsregressionen früh zu erkennen.

⸻

1.12 vault-gewebe
	•	Rolle: Obsidian Vault – Memorativschicht für Text, Gedanken, Langzeitkontext.
	•	Status: kuratiert
	•	Geschätzter Umsetzungsgrad: ~60–70 %
Begründung:
	•	Ist bereits als Teil des Betriebs-Takts eingebunden (Datei-Sync, Git-Snapshot, semantAH-Index).
	•	Funktioniert als Wissensspeicher, aber Kuratierung und Strukturierung sind naturgemäß „nie fertig“.
Nächster Schritt:
	•	Index-Qualität erhöhen: semantAH-Indexierung gezielt auf „Arbeitsbereiche“ trimmen (Heimgewebe, Ausbildung, Hardware etc.), statt alles gleich stark zu behandeln.
	•	Playbooks aus dem Vault: wiederkehrende Abläufe (z. B. „neues Repo in Fleet aufnehmen“, „Release fahren“) als markierte Playbooks ablegen, die wgx dann referenzieren kann.

⸻

2. Zentrale Satelliten (Nicht-Fleet, aber systemrelevant)

Die Fleet-Matrix nennt explizit zusätzliche Repos: sichter (Reflexionsschicht), mitschreiber, hausKI-audio (schon oben), heimgeist, plexer etc.

Hier eine kompakte Einschätzung:

Repo	Rolle	Umsetzungsgrad (grober Schätzwert)	Nächster Schritt
sichter	PR-Reflexion, Code-Checks, Review-Automation	~60–70 % – Config, Policies und Docs sind recht weit	CI-Integration in allen Fleet-Repos vereinheitlichen (einheitliche „sichter“-Jobs, einheitliche Commands) und Heuristiken schrittweise operationalisieren.
mitschreiber	Dialogisch-semantische Schicht, Notizen/Protokolle, KI-Schreibassistenz	~40–50 % – Runbook, Privacy und Contracts sind da, aber Orchestrierung mit hausKI/semantAH noch nicht überall verdrahtet.	Einen durchgängigen Flow definieren: „Event/Insight in chronik → Schreibauftrag in mitschreiber → Ergebnis wieder als Event zurück“.
heimgeist	Meta-Reflexionsinstanz, Insight-Generator, „Bewusstseinsschimmer“	~30–40 % – taucht in Dashboard-Skizzen auf, aber noch eher konzeptionell als voll integriert.	AI-Context und Contracts schärfen; mind. eine reale Insight-Pipeline zu semantAH/chronik ausbauen.
plexer	Brücke / Dispatcher, der Ströme bündelt	~20–30 % – README existiert, aber Rolle im Gesamtfluss noch nicht vollständig operationalisiert.	Klar festschreiben: In welchen Szenarien plexer statt wgx/hausKI die Schaltstelle ist (z. B. Cross-Repo-Befehle, Aggregation aus verschiedenen Quellen).


⸻

3. Typische Fehlerquellen und wie du sie vermeiden kannst

Prämissencheck:
	•	Gefahr 1: „stabil“ wird als „feature complete“ missverstanden. In der Matrix heißt „stabil“ eher „tragfähig & im Alltag benutzbar“, nicht „fertig für alle Ewigkeit“.
	•	Gefahr 2: weltgewebe als Teil der operativen Fleet zu betrachten – laut Docs ist es explizit eigenständig und nur via Leitstand-Gateway angebunden.
	•	Gefahr 3: Satelliten wie sichter/mitschreiber zu unterschätzen: sie sind für den „autopoetischen Organismus“ kritische Reflexionsteile, obwohl sie nicht in repos.yml als Fleet-Core stehen.

Alternativweg:

Statt weiter an allen Repos ein bisschen zu drehen, könntest du:
	1.	„Vertical Slice“ wählen: z. B. einen kompletten Pfad von aussensensor → chronik → semantAH → hausKI → leitstand wirklich produktionsreif machen (inkl. Tests, Monitoring, CI) – und alle anderen Repos vorerst einfrieren.
	2.	Oder: Zuerst die Control-Plane perfektionieren (metarepo + wgx + contracts), bis jede Änderung dort mit maximaler Klarheit und Minimal-Reibung in der Fleet landet – dann erst die Fachlogik-Repos iterativ hochziehen.

Beide Wege sind legitim; der erste gibt dir ein Ende-zu-Ende-Erfolgserlebnis, der zweite macht das System langfristig pflegeleichter.

⸻

4. Verdichtete Essenz
	•	Dein Heimgewebe besteht aktuell aus 12 klar gerasterten Core-Repos plus ein paar sehr wichtigen Satelliten.
	•	Zwei Achsen sind entscheidend:
	1.	Control-Plane (metarepo + wgx + contracts)
	2.	Gedächtnis- und Sinnschicht (chronik + semantAH + hausKI + leitstand)
	•	Der große Hebel: nicht neue Repos erfinden, sondern
	•	Contracts,
	•	WGX-Profile
	•	und den Event-Fluss (aussensensor → chronik → semantAH → hausKI → leitstand) so sauber machen, dass das Heimgewebe tatsächlich als autopoetischer KI-Organismus funktioniert – also sich selbst beobachtet, reguliert und verbessert.

Oder kurz in ironisch:
Im Moment ist Heimgewebe ein ziemlich intelligenter Körper mit leichten Koordinationsproblemen – das Gehirn denkt schnell, aber manchmal weiß der Fuß nicht, dass er schon losgelaufen ist.

⸻

5. Ungewissheitsanalyse

Unsicherheitsgrad: ca. 0,25 (auf einer Skala 0 = sicher, 1 = Nebelwand).

Hauptursachen:
	•	Status-Tags sind qualitativ, nicht quantitativ – die Prozentwerte sind bewusst grobe Heuristiken.
	•	Repo-Inhalte sind nur in einem Merge-Snapshot sichtbar, nicht der tatsächliche aktuelle Stand aller Branches. Es kann inzwischen neue Commits/Refactorings geben, die der Snapshot noch nicht kennt.
	•	Einige Satelliten (heimgeist, plexer) sind im Merge nur punktuell sichtbar, deshalb ist der Umsetzungsgrad dort stärker geraten als gemessen.

Wenn du willst, kann ich als nächsten Schritt eine explizite „progress.yml“/„health.yml“-Struktur vorschlagen, die du pro Repo pflegst, damit diese Einschätzungen künftig programmatisch und nicht nur aus den Docs heraus ableitbar sind.