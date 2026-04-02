These: PR 1 sollte klein, mechanisch und reversibel sein: nur den initialen App-State aus src/app/app.js herausziehen, ohne Verhalten, Persistenz oder DOM-Wiring zu ändern. Das ist sinnvoll, weil ICFApp aktuell bereits im Konstruktor den Kernzustand aufbaut und zugleich viele weitere Verantwortlichkeiten trägt.  ￼

Antithese: Ein zu ehrgeiziger „State-PR“ kippt schnell in einen halben Architekturumbau. Sobald in diesem Schritt schon Actions, Persistenz oder UI-Refs mitgezogen werden, wächst aus einer sauberen Extraktion ein verdeckter Systemeingriff. Die verstreuten localStorage-Zugriffe in layoutMode.js und metaLayer.js sind real, aber sie gehören in PR 2, nicht hier.  ￼  ￼

Synthese: PR 1 = State-Factory only. Kein Storage-Umbau, keine Verhaltensänderung, kein Refactor-Feuerwerk. Danach muss tools/verify/run.mjs weiter grün bleiben, und auch die Node-Test-Sammlung aus tools/verify/run_all.mjs darf nicht brechen; die lokalen Playwright-Verifikationen sind laut Repo ohnehin nicht der primäre CI-Maßstab.  ￼  ￼  ￼

⸻

Korrekturprompt für PR 1

Aufgabe: PR 1 im icf-tool umsetzen – initialen App-State aus src/app/app.js extrahieren, ohne Funktionsänderung.

Zielbild
- Extrahiere ausschließlich den initialen Zustand von ICFApp aus src/app/app.js in ein neues Modul src/app/appState.js.
- ICFApp soll den State nicht mehr inline im constructor deklarieren, sondern aus einer Factory-Funktion beziehen.
- Verhalten muss bit-identisch bzw. funktional identisch bleiben.
- Kein Scope-Creep.

Begründeter Kontext
- src/app/app.js ist sehr groß und bündelt viele Verantwortlichkeiten; bereits der constructor baut den Hauptzustand inline auf.
- Der initiale State enthält u. a. ratings, layoutMode via loadLayoutMode(), icfTree, flatCategories, codeMap, selectedCategory, expandedNodes, pendingSelectedCategoryCode, activeDatasetKey, nodeMap, theme, fontSize und viewMode.
- Verify ist bereits zweigeteilt vorhanden:
  - tools/verify/run.mjs für contracts/data
  - tools/verify/run_all.mjs für test_*.mjs
- Die Playwright-Verifikation in tools/verify/README.md ist lokal-only und nicht der primäre CI-Maßstab.

Scope – exakt erlaubt
1. Neue Datei anlegen:
   - src/app/appState.js

2. In src/app/appState.js eine Factory exportieren, z. B.:
   - export function createInitialAppState({ layoutMode } = {}) { ... }
   oder
   - export function createInitialAppState() { ... }
   Entscheidend: sauber, klein, testbar.

3. src/app/app.js minimal anpassen:
   - Inline-State im constructor entfernen
   - Factory importieren
   - State darüber initialisieren

4. Optional, aber nur wenn es sauber bleibt:
   - kleine JSDoc-Kommentare
   - ein sehr kleiner Verify-/Testfall für die Factory

Nicht erlaubt
- Keine Storage-Refactors
- Keine Änderungen an src/app/ui/layoutMode.js
- Keine Änderungen an src/app/ui/metaLayer.js
- Keine Actions extrahieren
- Keine DOM-Refs auslagern
- Keine Methodensignaturen ändern
- Keine Funktionsnamen in app.js großflächig umbauen
- Keine TypeScript-Einführung
- Keine kosmetische Massenformatierung
- Kein „while we are here“-Refactor

Har­te Invarianten
- layoutMode muss weiterhin aus loadLayoutMode() stammen wie bisher.
- expandedNodes bleibt ein Set.
- codeMap und nodeMap bleiben Map-Instanzen.
- activeDatasetKey bleibt "ICF-WHO-2005".
- theme bleibt "dark".
- fontSize bleibt "normal".
- viewMode bleibt "intro".
- Alle bisherigen Defaults bleiben semantisch identisch.
- Constructor-Nebenfelder wie _saveStateIdleId, _isDirty, _searchIsLoading, nodeIdCounter, chartManager, ui, debounced handler etc. bleiben unverändert in src/app/app.js.

Empfohlene Zielstruktur
- src/app/appState.js enthält nur State-nahe Logik, z. B.:
  - createInitialAppState(...)
  - optional: kleine pure Helfer, falls wirklich nötig
- Keine Imports aus DOM-/View-Modulen.
- Wenn layoutMode injiziert wird, dann nur als Wert; wenn loadLayoutMode() in der Factory selbst aufgerufen wird, dann ebenfalls nur dort – aber nicht beides mischen.

Bevorzugte Variante
- Bevorzugt: createInitialAppState({ layoutMode = loadLayoutMode() } = {})
  Vorteil:
  - klar testbar
  - keine versteckte globale Abhängigkeit im Test
  - spätere PRs können kontrollierter migrieren

Akzeptanzkriterien
1. src/app/app.js ist kleiner und enthält keinen inline definierten Komplett-State mehr.
2. Der initiale Zustand ist vollständig in src/app/appState.js abgebildet.
3. Es gibt keine Verhaltensänderung.
4. tools/verify/run.mjs läuft weiterhin erfolgreich.
5. tools/verify/run_all.mjs läuft weiterhin erfolgreich.
6. Falls ein neuer Test ergänzt wird:
   - nur klein
   - nur für Factory-Defaults
   - keine Browser-Abhängigkeit

Gewünschte Commits
1. refactor(app): extract initial app state factory
2. refactor(app): use extracted app state in ICFApp constructor
3. test(app): add app state default coverage
   - nur falls wirklich sinnvoll und schlank

Erwarteter Patch-Charakter
- klein
- lesbar
- reviewbar
- keine Nebenkriegsschauplätze

Explizite Prüfpunkte nach Umsetzung
- Ist expandedNodes wirklich noch ein Set und nicht versehentlich ein Array?
- Sind codeMap und nodeMap weiterhin echte Map-Objekte?
- Wird layoutMode weiterhin korrekt initialisiert?
- Gibt es irgendwo versehentlich geteilten mutable State außerhalb der Factory?
- Wurde wirklich nichts an Save-/Load-/DOM-Logik mitgezogen?

Gewünschtes Ergebnisformat
- Liefere:
  1. kurze Änderungszusammenfassung
  2. betroffene Dateien
  3. diff / Patch
  4. welche Verify-Befehle ausgeführt werden sollen
  5. kurze Rest-Risiken

Verifikationsbefehle
- node tools/verify/run_all.mjs
- node tools/verify/run.mjs

Stop-Kriterium
- Sobald die State-Factory sauber extrahiert ist und alle Verifikationen grün sind, aufhören.
- Nicht „vorsorglich“ mit PR 2 anfangen.


⸻

Kurzbegründung zum Prompt

Warum dieser Zuschnitt richtig ist:
Der Konstruktor in ICFApp enthält den vollständigen Initialzustand bereits offen sichtbar; genau das ist der ideale erste Schnitt. Gleichzeitig zeigen run.mjs und run_all.mjs, dass das Repo schon zwei klare Verifikationspfade besitzt, die als Patch-Gate taugen. Die lokal-only Playwright-Hinweise sind nützlich, aber nicht die primäre Bremse für diesen PR.  ￼  ￼  ￼  ￼

Typische Fehlannahme, die ich hier aktiv korrigiere

„Wenn wir schon State anfassen, können wir layoutMode/localStorage gleich mit bereinigen.“
Nein. Genau so werden kleine PRs zu schlecht reviewbaren Tarnkappen-Umbauten. layoutMode.js und metaLayer.js zeigen zwar echte Storage-Verstreuung, aber gerade deshalb gehören sie in einen eigenen, späteren Schnitt.  ￼  ￼

Alternativer Denkpfad

Statt file-basiert zu schneiden, könnte man use-case-basiert schneiden: zuerst nur preferences state, später assessment state, dann timeline state. Das wäre konzeptionell sauberer, aber für PR 1 riskanter, weil damit stillschweigend schon Domänengrenzen neu gezogen würden. Für den ersten Schlag ist die stumpfere Methode die klügere. Das Skalpell kommt später; zuerst den Tumor markieren, nicht die ganze Anatomie neu erfinden.

⸻

Risiko-/Nutzenabschätzung

Nutzenklassen
	•	technische Wartbarkeit
	•	Reviewbarkeit
	•	spätere Testbarkeit
	•	geringerer Diff-Radius für Folge-PRs

Risikoklassen
	•	technisch: versehentlich falsche Default-Typen
	•	semantisch: layoutMode wird anders initialisiert als vorher
	•	organisatorisch: Scope-Creep in Persistenz oder Actions

Was müsste wahr sein, damit diese Empfehlung gilt?
	•	Dass das Ziel wirklich ein kleiner erster Entflechtungsschnitt ist, nicht schon ein halber Architekturumbau.
	•	Dass du Folge-PRs planst und nicht alles in einen PR pressen willst.
	•	Dass Reviewbarkeit höher gewichtet wird als kurzfristige „Mitnahmeeffekte“.

⸻

Essenz

Hebel:
Nur den Initial-State aus app.js herausziehen.

Entscheidung:
PR 1 strikt klein halten, Storage und Actions unangetastet lassen.

Nächste Aktion:
Diesen Prompt 1:1 als Korrekturauftrag verwenden.

Unsicherheitsgrad: 0.12
Ursachen: Gering; der Scope ist eng und der Befund im Dump klar.

Interpolationsgrad: 0.11
Hauptquellen: leichte Annahme über bevorzugte Factory-Signatur und optionalen Testzuschnitt.

Wenn du willst, formuliere ich dir direkt im nächsten Schritt den Korrekturprompt für PR 2 (app-persistence) im exakt gleichen Format.