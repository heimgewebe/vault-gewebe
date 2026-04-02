These: PR 2 sollte das Persistenzverhalten zentralisieren, nicht erweitern. Der Ist-Zustand ist klar: layoutMode.js liest und schreibt direkt in localStorage, metaLayer.js löscht dort Präferenz-Keys direkt, und app.js bezieht den initialen layoutMode über loadLayoutMode(). Gleichzeitig sind die maßgeblichen Verify-Einstiege bereits vorhanden: tools/verify/run.mjs für Contracts/Daten und tools/verify/run_all.mjs für die test_*.mjs-Sammlung. Die Playwright-Skripte sind laut tools/verify/README.md lokal-only und nicht für CI gedacht.  ￼ ￼ ￼ ￼ ￼

Antithese: Die falsche Bewegung wäre, PR 2 schon zu einer „Privacy-/Workspace-/IndexedDB-Revolution“ aufzublasen. Dafür fehlt in den vorliegenden Dateien ein formales Storage-Schema; das ist eine epistemische Leere: Ein versioniertes Persistenzmodell fehlt, nötig für Migrationen und für eine belastbare Ausweitung auf weitere Datenklassen. Wer hier sofort alles speichert, migriert und abstrahiert, baut schnell eine elegante Kathedrale um zwei localStorage-Keys. Der Browser klatscht höflich, die Reviewbarkeit stirbt leise.

Synthese: Also: Storage-Gateway für Preferences only. Ziel ist ein kleines Modul appPersistence.js, das den bestehenden Präferenzpfad kapselt, ohne Verhalten zu ändern. layoutMode.js und metaLayer.js sollen nicht mehr direkt mit localStorage sprechen, sondern nur noch das Gateway nutzen. Keine Workspace-Persistenz, keine IndexedDB, keine Änderung am Reset-Semantik-Kern.

⸻

Korrekturprompt für PR 2

Aufgabe: PR 2 im icf-tool umsetzen – Präferenz-Persistenz zentralisieren, ohne Funktionsänderung.

Zielbild
- Führe ein einziges Storage-Gateway für UI-Präferenzen ein.
- Entferne direkte localStorage-Zugriffe aus src/app/ui/layoutMode.js und src/app/ui/metaLayer.js.
- Erhalte das bestehende Verhalten vollständig:
  - layoutMode wird weiterhin gelesen/validiert/gespeichert wie bisher.
  - resetAllPreferences() setzt weiterhin nur Layout-/View-Präferenzen zurück, nicht Nutzdaten.
- Kein Scope-Creep in Workspace-/Formular-/Rating-/Timeline-Persistenz.

Begründeter Kontext
- src/app/ui/layoutMode.js liest und schreibt aktuell direkt localStorage unter "icfTool.layoutMode" und validiert gegen ["auto", "split", "stacked"].
- src/app/ui/metaLayer.js entfernt aktuell direkt "icfTool.viewLens" und "icfTool.layoutMode".
- src/app/app.js initialisiert this.state.layoutMode über loadLayoutMode().
- tools/verify/run.mjs prüft contracts/data.
- tools/verify/run_all.mjs führt alle test_*.mjs unter tools/verify aus.
- tools/verify/README.md sagt explizit, dass Playwright-Verify lokal-only ist und nicht für CI gedacht ist.

Scope – exakt erlaubt
1. Neue Datei anlegen:
   - src/app/appPersistence.js

2. In src/app/appPersistence.js ein kleines Preferences-Gateway einführen, z. B. mit:
   - Konstanten für bekannte Keys
   - readPreference(key)
   - writePreference(key, value)
   - removePreference(key)
   - resetPreferenceKeys()
   - loadLayoutModePreference()
   - saveLayoutModePreference(mode)
   oder eine ähnlich kleine, klare API.

3. src/app/ui/layoutMode.js umbauen:
   - keine direkten localStorage-Aufrufe mehr
   - Logik für VALID_MODES und Default "auto" beibehalten
   - bevorzugt:
     - Validierung bleibt in layoutMode.js
     - rohe Speicherung/Entfernung läuft über appPersistence.js

4. src/app/ui/metaLayer.js umbauen:
   - keine direkten localStorage-Aufrufe mehr
   - resetAllPreferences() nutzt appPersistence.js
   - weiterhin nur viewLens + layoutMode zurücksetzen

5. app.js nur dann anfassen, wenn es für Imports oder API-Anpassung zwingend nötig ist.
   - Kein weiterer Refactor.

6. Optional, aber nur wenn sehr schlank:
   - kleiner Verify-/Unit-Test für das neue Persistence-Gateway
   - z. B. Fallback bei fehlendem localStorage / Ausnahmefall

Nicht erlaubt
- Keine IndexedDB
- Keine neue Persistenz für ratings, notes, timeline, workspace, exporte oder Personendaten
- Kein Storage-Schema mit Migrationen in diesem PR
- Keine neue UX für Settings
- Kein Umbau von metaLayerManager.js außer falls ein Importpfad zwingend angepasst werden muss
- Keine Änderungen an Reset-Semantik
- Keine kosmetische Massenformatierung
- Kein „gleich noch app-state / app-actions mitnehmen“

Har­te Invarianten
- "icfTool.layoutMode" bleibt der gespeicherte Layout-Key.
- "icfTool.viewLens" bleibt durch resetAllPreferences() löschbar.
- Gültige Layout-Modi bleiben exakt:
  - "auto"
  - "split"
  - "stacked"
- Ungültige Werte dürfen nicht persistiert werden.
- Fallback bleibt "auto", auch wenn Lesen fehlschlägt.
- Warnverhalten bei Storage-Fehlern bleibt defensiv erhalten.
- resetAllPreferences() betrifft weiterhin nur Präferenzen, nicht user data oder stored ratings.
- Der bestehende Reset-Flow im UI darf funktional gleich bleiben.

Bevorzugte Architektur
- src/app/appPersistence.js ist bewusst klein und eng:
  - ein einziger Zugriffspunkt für localStorage-bezogene Preferences
  - keine DOM-Abhängigkeiten
  - keine App-State-Abhängigkeiten
- layoutMode.js bleibt Domänenmodul für:
  - erlaubte Modi
  - isValidLayoutMode
  - Default-/Fallback-Verhalten
- appPersistence.js ist Infrastrukturmodul, nicht Regelmodul.

Bevorzugte Ziel-API
Variante A (bevorzugt)
- appPersistence.js:
  - getPreference(key)
  - setPreference(key, value)
  - removePreference(key)
  - resetPreferences(keys)
- layoutMode.js:
  - hält VALID_MODES
  - ruft appPersistence.js auf
Vorteil:
- Trennung zwischen Speichermechanik und Layout-Regeln bleibt sauber.

Variante B
- appPersistence.js enthält spezifische Methoden:
  - loadLayoutModePreference()
  - saveLayoutModePreference(mode)
  - resetUiPreferences()
Nur zulässig, wenn die Datei trotzdem klein und nicht zu speziell wird.

Akzeptanzkriterien
1. src/app/ui/layoutMode.js enthält keine direkten localStorage-Zugriffe mehr.
2. src/app/ui/metaLayer.js enthält keine direkten localStorage-Zugriffe mehr.
3. Präferenzspeicherung läuft zentral über src/app/appPersistence.js.
4. Verhalten bleibt identisch:
   - gültiger gespeicherter layoutMode wird geladen
   - ungültiger oder nicht lesbarer Wert fällt auf "auto" zurück
   - resetAllPreferences() löscht nur die bisherigen Präferenz-Keys
5. tools/verify/run.mjs läuft weiterhin erfolgreich.
6. tools/verify/run_all.mjs läuft weiterhin erfolgreich.
7. Falls neue Tests ergänzt werden:
   - nur klein
   - nur persistence/preferences-bezogen
   - keine Browser-Pflicht

Gewünschte Commits
1. refactor(storage): add centralized preference persistence gateway
2. refactor(ui): route layout mode storage through appPersistence
3. refactor(ui): route preference reset through appPersistence
4. test(storage): add preference persistence fallback coverage
   - nur falls schlank und sinnvoll

Erwarteter Patch-Charakter
- klein
- mechanisch
- reviewbar
- keine Nebenachsen

Explizite Prüfpunkte nach Umsetzung
- Ist isValidLayoutMode weiterhin die Instanz der Wahrheit für erlaubte Modi?
- Bleibt der Fallback auf "auto" erhalten, wenn Lesen fehlschlägt oder Müll im Storage steht?
- Löscht resetAllPreferences() weiterhin exakt die bisherigen Präferenz-Keys?
- Wurden keine Ratings, Notes oder sonstigen App-Daten versehentlich mit in resetAllPreferences() hineingezogen?
- Gibt es irgendwo im UI-Modul-Bereich noch direkte localStorage-Aufrufe für diese Präferenzen?
- Wurde das Logging/Warnverhalten bei Storage-Fehlern unbeabsichtigt verändert?

Gewünschtes Ergebnisformat
- Liefere:
  1. kurze Änderungszusammenfassung
  2. betroffene Dateien
  3. diff / Patch
  4. welche Verify-Befehle ausgeführt werden sollen
  5. kurze Rest-Risiken

Verifikationsbefehle
- node tools/verify/run.mjs
- node tools/verify/run_all.mjs

Optional lokaler Zusatzcheck
- nur falls manuell sinnvoll:
  - python3 -m http.server 8000
  - manuell Layout-Modus ändern, Seite neu laden, Reset auslösen
- Aber: nicht als CI-Annahme einbauen.

Stop-Kriterium
- Sobald die Präferenz-Persistenz zentralisiert ist und direkte localStorage-Zugriffe aus layoutMode.js und metaLayer.js entfernt sind, aufhören.
- Nicht mit Workspace-Persistenz, IndexedDB, Schema-Versionierung oder PR 3 weitermachen.


⸻

Warum dieser Zuschnitt stimmt

layoutMode.js ist heute ein kleines Regel+Speicher-Modul: Es definiert den Key icfTool.layoutMode, validiert gegen drei erlaubte Modi und nutzt localStorage direkt mit defensivem Fallback auf "auto". metaLayer.js löscht direkt icfTool.viewLens und icfTool.layoutMode. Genau diese beiden Punkte bilden den sauberen Scope für PR 2. app.js hängt nur insofern daran, als der initiale State layoutMode: loadLayoutMode() verwendet; das ist ein Grund, am Verhalten nichts zu ändern.  ￼ ￼

Die Verify-Gates sind ebenfalls klar: run.mjs fährt scripts/validate_contracts.py und scripts/validate_data.py; run_all.mjs iteriert über alle test_*.mjs. Die Playwright-Verifikation ist laut tools/verify/README.md explizit lokal-only und nicht für CI. Genau deshalb sollte PR 2 sich auf die beiden Node-/Python-Einstiege stützen und keine Browserpflicht einbauen.  ￼ ￼ ￼

⸻

Resonanz- und Kontrastprüfung

Deutung A: PR 2 ist reine Infrastrukturkosmetik.
Deutung B: PR 2 ist die Voraussetzung dafür, dass spätere Privacy-/Schema-/Workspace-Arbeit nicht wieder in verstreuten UI-Dateien endet.

Einordnung: B ist tragfähiger. Klein im Diff, groß in der Folgewirkung.

⸻

Typische Fehlannahme, die ich hier aktiv korrigiere

„Wenn wir schon ein Persistence-Modul einführen, sollten wir gleich alles darüber routen.“
Nein. Das wäre gerade der klassische Fehler: kleine Strukturreparatur in eine halbe Plattformmigration verwandeln. Aus zwei lokalen localStorage-Stellen wird sonst eine metaphysische Speicherphilosophie. Browser lieben so etwas ungefähr so sehr wie Katzen die Badewanne.

⸻

Risiko-/Nutzenabschätzung

Nutzenklassen
	•	technische Kohärenz
	•	geringerer Seiteneffekt-Radius
	•	bessere Reviewbarkeit
	•	sauberer Ansatzpunkt für spätere Storage-Migration

Risikoklassen
	•	technisch: Fallback- oder Validierungsverhalten driftet unbemerkt
	•	organisatorisch: Scope-Creep in Workspace-/Datenspeicherung
	•	semantisch: Reset löscht mehr oder weniger als bisher

Prämissencheck
Diese Empfehlung gilt, wenn:
	•	du PR 2 bewusst klein halten willst,
	•	PR 3/4 später noch folgen dürfen,
	•	und du Verhaltensidentität höher gewichtest als „gleich alles schön machen“.

⸻

Essenz

Hebel:
Direkte localStorage-Zugriffe aus layoutMode.js und metaLayer.js herausziehen.

Entscheidung:
PR 2 als Preferences-Gateway only.

Nächste Aktion:
Diesen Prompt 1:1 als Korrekturauftrag verwenden.

Unsicherheitsgrad: 0.11
Ursachen: Gering; die relevanten Dateien und Verify-Pfade sind im Dump klar sichtbar. Höhere Unsicherheit bestünde erst bei späterer Ausweitung auf Workspace-/Nutzdaten.

Interpolationsgrad: 0.14
Hauptquellen: bevorzugte API-Form des Gateways und die genaue Trennung zwischen Regelmodul (layoutMode.js) und Infrastrukturmodul (appPersistence.js) sind Designentscheidungen, nicht direkt vorgegeben.

Wenn du willst, formuliere ich dir als Nächstes den Korrekturprompt für PR 3 (app-actions) im selben Format.