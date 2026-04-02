These: Das Tool ist bereits deutlich besser als ein typisches „eine HTML-Datei und viel Hoffnung“-Projekt. Es hat eine erkennbare Produktidee, eine ausgebautere Search-Logik, Sanitizing/Validierung mit Tests, eine recht weit entwickelte Timeline-Funktion und eine saubere Deploy-/Versionierungslogik.  ￼

Antithese: Die größte Schwäche liegt nicht primär in fehlenden Features, sondern in der Architekturkonzentration: src/app/app.js ist mit rund 2775 Zeilen und vielen Verantwortlichkeiten faktisch ein Steuerzentrum, das Zustand, Rendering, Import/Export, Suche, Timeline, Persistenz und UI-Verhalten zusammenzieht. Dazu kommt, dass personenbezogene Beobachtungsdaten lokal im Browser gespeichert werden; technisch bequem, organisatorisch heikel. Gleichzeitig ist die Testlandschaft breit, aber nur teilweise systemisch automatisiert. Viele Browser-Verifikationen sind lokal-only und nicht CI-tauglich.  ￼

Synthese: Ich würde nicht „alles neu“ bauen. Ich würde das Projekt entlang seiner bereits vorhandenen Achsen härten: Zustandsmodell, Persistenz, Import/Export-Contracts, Rendering-Grenzen, CI-Verifikation und Sucharchitektur. Anders gesagt: nicht den Garten umgraben, sondern die Wurzeln freilegen, bevor der nächste schöne Ast wieder direkt aus app.js wächst. Die Datei ist derzeit weniger Modul als kommunale Mehrzweckhalle.

Was bereits stark ist

Belegt:
	•	Die Suchlogik ist nicht trivial, sondern deterministisch gerankt, synonymgestützt und mit fuzzy fallback versehen. Dafür existieren mehrere spezialisierte Tests.  ￼
	•	sanitizeHtmlStrict und validateInput sind vergleichsweise sorgfältig abgesichert; es gibt Tests für Scripts, iframes, event handlers, bösartige URI-Schemata, Malformed HTML und Fallback-Verhalten.  ￼
	•	Die Timeline ist kein Pseudo-Feature mehr, sondern hat Datenmodell, Deduplizierung, Importlogik, UI, Export und dokumentierten Status. Offen ist dort eher Verfeinerung als Existenz.  ￼
	•	Die Deploy-/Versionierungsseite ist klar gedacht: Build-ID für technische Frische, SemVer getrennt davon.  ￼

Fehlannahme, die ich aktiv korrigieren würde:
Das Projekt ist nicht „einfach unstrukturiert“. Es hat Struktur. Das Problem ist eher: Die Struktur ist funktional vorhanden, aber an entscheidenden Stellen noch zu stark in wenige große Dateien eingegossen.

⸻

Meine wichtigsten Verbesserungen, priorisiert

1) app.js in klar getrennte Schichten zerlegen

Belegt: app.js importiert Suche, Timeline, Export, HumanityCheck, ChartManager, Layout-Mode, Meta-Layer und TreeView und hält zugleich großen globalen UI- und Zustandsbesitz.  ￼

Empfehlung:
Zerlege in mindestens:
	•	app-state
	•	app-actions
	•	app-renderers
	•	app-persistence
	•	app-bootstrap

Nutzen: Wartbarkeit, Testbarkeit, geringere Kopplung.
Risiko: Mittleres Refactoring-Risiko; unklare Seiteneffekte beim Event-Wiring.
Prämisse: Es muss dir wichtiger sein, künftige Änderungen sicherer zu machen, als kurzfristig neue Features einzubauen.

Alternativpfad:
Nicht file-basiert zerlegen, sondern nach Use-Cases: assessment, timeline, search, settings, person-context. Das denkt nicht „Technikschichten“, sondern „Produktachsen“.

Optimierungsgrad: 0.78
	•	Was: Lesbarkeit, Änderbarkeit, Fehlerradius
	•	Wie: Extraktion von State-/Action-/Render-Grenzen
	•	Wodurch: weniger implizite Abhängigkeiten
	•	Wirkung: deutlich geringere Drift bei zukünftigen Features

⸻

2) Persistenz neu denken: weg von „ein JSON in localStorage reicht schon“

Belegt: Das Tool speichert Aktivität, Alias, Referenz, Geburtsdatum, Alter, Geschlecht, Sprachen, Eindruck, Diagnose, Sonstiges und Ratings in localStorage. Bei Quota-Problemen kommt nur ein Alert.  ￼

Mein Urteil: Das ist die wichtigste fachliche Schwachstelle.

Verbessern würde ich:
	•	Versionsfeld für gespeicherten Zustand
	•	Migrationslogik
	•	expliziten „temporären Modus“ ohne Persistenz
	•	optional IndexedDB statt localStorage
	•	sichtbare Lösch-/Retention-Funktion
	•	klare Export-vor-Speichern-Hinweise bei personenbezogenen Daten

Nutzen: Robustheit, Datenschutzklarheit, weniger Datenverlust.
Risiko: Höherer Implementierungsaufwand; Migration alter States nötig.
Prämisse: Das Tool soll real pädagogisch/praktisch genutzt werden, nicht nur experimentell.

Alternative Sinnachse:
Vielleicht ist gar nicht „mehr Persistenz“ das Ziel, sondern weniger: standardmäßig ephemer arbeiten und nur explizit exportieren. Das wäre nicht nur anders gemacht, sondern anders gedacht.

⸻

3) Import-/Export-Contracts formalisieren

Belegt: Timeline-Imports unterstützen .html und .json, erkennen Timeline-Exports und deduplizieren per ContentHash + CapturedAt + Filename. Export existiert als HTML und Markdown.  ￼

Was fehlt, nötig für belastbare Weiterentwicklung:
Ein expliziter, versionierter Contract für:
	•	Assessment State
	•	Timeline Export
	•	Re-Import HTML payload
	•	Qualitätswarnungen / Parsing-Warnungen

Warum wichtig:
Gerade weil das Tool browser-first ist, wird das Exportformat faktisch zur API.

Risiko-Nutzen:
	•	Nutzen: saubere Evolution, weniger kaputte Re-Imports
	•	Risiko: kurzfristig Dokumentations- und Validator-Arbeit

⸻

4) Search stabilisieren, nicht neu erfinden

Belegt: search.js ist schon eigenständig und kommentiert performant gedacht; die Levenshtein-Buffers sind allerdings modulglobal und explizit nur unter synchroner/nicht-reentranter Annahme sicher.  ￼

Verbessern würde ich:
	•	modulglobale Scratch-Buffer optional instanzscoped machen
	•	Ranking in klaren Phasen ausgeben: exact / prefix / synonym / fuzzy
	•	Goldensatz für Suchqualität anlegen
	•	Synonym-Vorschläge nicht nur dokumentieren, sondern auditierbar verwalten

Kontrastprüfung:
	•	Deutung A: Die Search ist schon stark; also nur feinjustieren.
	•	Deutung B: Die Search wird mit wachsendem Synonym-Korpus semantisch unruhig und braucht Governance.
	•	Meine Synthese: A kurzfristig, B strategisch.

⸻

5) Rendering härten und innerHTML-Fläche weiter reduzieren

Belegt: Es gibt gute Sanitizing-Logik, aber das Projekt arbeitet an mehreren Stellen mit DOM-String-Rendering; zugleich existieren bereits harte Sanitizing-Utilities.  ￼

Plausibel:
Die wahre Gefahr ist hier nicht ein akuter Sicherheits-GAU, sondern inkonsistente Renderpfade.

Empfehlung:
	•	zentrale DOM-Factory-Helfer
	•	textContent/Element-APIs als Default
	•	innerHTML nur hinter einer kleinen, kontrollierten Render-Grenze
	•	optional CSP/Trusted-Types vorbereiten

Was fehlt, nötig für harte XSS-Bewertung:
CSP-Stand, tatsächliche Renderpfade und alle HTML-Einspeisepunkte.

⸻

6) Testbreite in Testtiefe überführen

Belegt: Es gibt viele test_*.mjs, aber die Playwright-/Browser-Verifikation ist laut Doku lokal-only und nicht für CI gedacht. run_all.mjs ruft Node-Tests auf; run.mjs fährt nur Vertrags-/Datenchecks.  ￼

Mein Punkt:
Die Testlandschaft ist breit genug, um Vertrauen zu erzeugen, aber noch nicht geschlossen genug, um Architekturumbauten entspannt zu machen.

Verbessern würde ich:
	•	1–2 echte Headless-Browser-Smoke-Tests in CI
	•	golden export/reimport roundtrip tests
	•	performance budget tests für Suche und Initial-Load
	•	migration tests für gespeicherten Zustand

⸻

7) Timeline sauber fertigziehen

Belegt: Offen sind laut Doku u. a. CSS-Refactoring in TimelineView und ICF-CY-Support. Die Timeline ist funktional stark, aber noch nicht ganz architektonisch auspoliert.  ￼

Empfehlung:
	•	Inline-Stile raus aus der View
	•	View-Model für Tabellen- und Chartdaten
	•	einheitliche Warnungsobjekte statt ad-hoc Bannerlogik
	•	ICF-CY als Dataset-Plugin statt Sonderfall im Hauptcode

⸻

8) Versioning-Policy kritisch prüfen

Belegt: SemVer wird pfadbasiert aus GitHub Actions bestimmt; Major bei contracts/**, Minor bei hinzugefügten/umbenannten Dateien in Feature-Pfaden, sonst Patch. Build-Frische läuft separat über Build-ID.  ￼

These: Praktisch und diszipliniert.
Antithese: Pfade sind nur ein Proxy für Semantik. Eine kompatibilitätsbrechende Verhaltensänderung kann auch ohne contracts/** passieren.
Synthese: Beibehalten, aber mit Manual-Override oder Contract-Delta-Checks ergänzen.

⸻

Belegt / plausibel / spekulativ

Belegt
	•	God-object-Tendenz in app.js
	•	localStorage als zentrale Persistenz für personenbezogene Felder
	•	starke Sanitizing-/Validation-Tests
	•	viele lokale Verify-Skripte, aber Browser-Verifikation nicht CI-first
	•	Timeline ist implementiert, aber mit benannter Restschuld
	•	Search hat bewusste Performance-Optimierung mit Reentrancy-Hinweis

Plausibel
	•	Wartungsaufwand wird künftig stärker durch Kopplung als durch fehlende Features begrenzt
	•	Persistenzmodell wird bei realem Einsatz früher oder später organisatorisch problematisch
	•	Suchqualität wird ohne kuratierten Evaluationskorpus schleichend driften

Spekulativ
	•	Dass eine komplette Framework-Migration sinnvoll wäre
Davon sehe ich keinen belastbaren Nachweis. Ein Rewrite wäre hier der klassische Fall von „wir renovieren das Haus, indem wir den Stadtteil sprengen“.

⸻

Blinde Flecken

X fehlt, nötig für Y:
	•	Laufzeitmetriken fehlen, nötig für belastbare Performance-Priorisierung.
	•	Reale Nutzungsdaten fehlen, nötig für seriöse UX-Priorisierung.
	•	Vollständige Renderpfad-Analyse fehlt, nötig für harte Sicherheitsbewertung.
	•	Explizite Datenklassifikation fehlt, nötig für saubere Datenschutzarchitektur.

⸻

Essenz

Hebel:
	1.	app.js entkoppeln
	2.	Persistenzmodell professionalisieren
	3.	Import/Export versionieren
	4.	CI-Browser-Tests ergänzen
	5.	Timeline-UI-Schulden abbauen

Entscheidung:
Nicht neu schreiben. Gezielt entflechten.

Nächste Aktion:
Ich würde als erstes einen kleinen Architektur-PR planen:
app-state + app-persistence extrahieren, Storage-Schema versionieren und dafür Roundtrip-Tests bauen. Das ist der höchste Nutzen pro Eingriff.

Unsicherheitsgrad: 0.28
Ursachen: keine Laufzeitdaten, keine echte Nutzerbeobachtung, nur Repo-/Doku-Sicht.

Interpolationsgrad: 0.34
Hauptquellen: Architekturableitung aus Dateigröße, Imports, Dokumentation und Testlandschaft statt Live-Ausführung.