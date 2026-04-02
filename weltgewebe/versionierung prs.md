These: Der beste nächste Schritt ist ein kleiner, harter PR 1, der Weltgewebe eine eindeutige technische Versionswahrheit gibt.
Antithese: Man könnte sofort den ganzen ICF-Tool-Zauber portieren – Build-ID, UI-Diagnose, Polling, Reload-Flow, vielleicht gleich Service Worker dazu. Das wäre aber ein klassischer Fall von „Wir wollten den Wasserhahn entkalken und haben versehentlich das Bad kernsaniert“.
Synthese: Drei saubere PRs nacheinander. Erst Build-ID + kanonisches /version.json, dann sichtbare Diagnose im UI, dann Browser-Selbstaktualisierung.

Hier sind die drei PR-Erstellungsprompts – in sinnvoller Reihenfolge.

⸻

PR 1 — Build-ID + kanonisches /version.json + Header + Tests

Ziel:
Erstelle einen fokussierten PR für Weltgewebe, der eine eindeutige technische Versionssemantik für Frontend-Deploys einführt. Der PR soll die Grundlage schaffen, damit Browser- und Serverstände zuverlässig verglichen werden können. Es geht noch NICHT um aktive Browser-Selbstaktualisierung, sondern um eine kanonische technische Wahrheitsquelle.

Wichtige Leitplanken:
- Weltgewebe ist NICHT Heimgewebe. Keine Heimgewebe-spezifischen Reflexe oder Architekturmodule anwenden.
- Kein Aktionismus: Nur Änderungen, die direkt zur technischen Aktualitätssemantik beitragen.
- Keine Service-Worker-Einführung in diesem PR.
- Keine große UI-Überarbeitung in diesem PR.
- Kein Scope-Drift in angrenzende Themen.
- Vor jedem Patch zuerst Diagnose liefern.
- Null-Interpolation bei nachprüfbaren Repo-Fakten.

Arbeitsmodus:
1. Prüfe zuerst den Ist-Zustand in den relevanten Dateien.
2. Liefere vor Änderungen:
   - belegten Ist-Zustand
   - max. 3 konkrete Schwächen
   - Stop-Kriterium für den Patch
3. Dann Patch umsetzen.

Zu prüfen:
- Frontend-Build-/Deploy-Pfade
- Build-Output-Struktur
- Caddy-Auslieferung
- scripts/weltgewebe-up
- infra/caddy/Caddyfile.heim
- relevante Frontend-Build-Konfiguration
- bestehende Tests zu Deployment / Verify / Build
- ob bereits irgendein version.json oder ähnliches existiert

========================================
PHASE 1 — KANONISCHE BUILD-ID EINUFÜHREN
========================================

Ziel:
Jeder Frontend-Deploy bekommt eine technische Build-ID, die maschinenlesbar verfügbar ist und sich pro Deploy eindeutig ändert.

1. Build-ID-Quelle definieren
- Finde die sinnvollste bestehende Build-/Deploy-Stelle im Repo, an der eine technische Build-ID erzeugt werden kann.
- Bevorzuge eine stabile, nachvollziehbare Form:
  - commit SHA
  - optional plus timestamp
- Keine fachliche Produktversion als Ersatz missbrauchen.
- Die technische Build-ID muss bei realen neuen Builds/Deploys zuverlässig wechseln.

2. version.json kanonisch erzeugen
- Erzeuge einen stabilen Endpunkt für Frontend-Versionsdiagnose:
  - bevorzugt `/version.json`
- Inhalt mindestens:
  - build
  - built_at
  - optional commit
  - optional release, falls sinnvoll und bereits sauber ableitbar
- JSON muss sauber maschinenlesbar sein.
- Keine Platzhalter oder geratenen Werte.

3. Build-Ausgabe prüfen
- version.json muss im Build-/Serve-Modell tatsächlich dort landen, wo Caddy sie ausliefert.
- Nicht bloß generieren, sondern in die reale statische Auslieferung integrieren.

========================================
PHASE 2 — HEADER-SEMANTIK FÜR VERSIONSWAHRHEIT
========================================

Ziel:
`/version.json` darf nicht durch Browser-/Zwischencaches verfälscht werden.

4. Caddy-Regel ergänzen
- Ergänze in infra/caddy/Caddyfile.heim eine gezielte Regel für `/version.json`
- Erwartete Semantik:
  - `Cache-Control: no-store`
- Die bestehende Regelung für:
  - HTML/Root → `no-cache, must-revalidate`
  - `/_app/immutable/*` → `public, max-age=31536000, immutable`
  soll nicht kaputtgehen.
- Reihenfolge der Caddy-Regeln so wählen, dass `/version.json` nicht versehentlich unter die allgemeine HTML-Regel fällt.

5. Deploy-Verify erweitern
- In scripts/weltgewebe-up oder bestehender Verify-Logik einen schlanken, robusten Diagnoseschritt ergänzen:
  - `/version.json` erreichbar?
  - HTTP 200?
  - Header enthält `no-store`?
  - JSON enthält brauchbare Build-ID?
- Das ist in diesem PR primär Diagnose-/Verifikationslogik, keine Browser-Update-Logik.

Wichtig:
- Wenn `/version.json` wegen Transport/TLS nicht erreichbar ist, sauber behandeln.
- Failure-Bundle-Disziplin einhalten.
- Keine unguarded curl-Aufrufe unter `set -euo pipefail`.

========================================
PHASE 3 — TESTS
========================================

Ziel:
Die neue Versionswahrheit und ihre Header-Politik werden reproduzierbar geprüft.

6. Tests ergänzen/erweitern
- Ergänze bestehende Deployment-/Verify-Tests minimal, aber wirksam:
  - `/version.json` fehlt → sinnvoller Fehler
  - `/version.json` ohne `no-store` → sinnvoller Fehler
  - `/version.json` mit gültiger Build-ID und Header → Erfolg
- Bestehende Cache-Tests nicht destabilisieren.
- Keine riesige Testarchitektur neu erfinden.

========================================
PHASE 4 — DOKUMENTATION
========================================

Ziel:
Die neue semantische Rolle von `/version.json` wird klar beschrieben, ohne zu viel Prosa.

7. docs/deployment.md präzisieren
- Kurz dokumentieren:
  - `/version.json` ist die technische Diagnosequelle für den aktuell ausgelieferten Frontend-Build
  - `no-store` ist bewusst gewählt
  - HTML- und immutable-Assets behalten ihre getrennte Cache-Politik
- Nichts über Browser-Selbstaktualisierung versprechen, was in diesem PR noch nicht existiert.

========================================
NICHT TUN IN DIESEM PR
========================================

- Keine aktive UI-Anzeige der Build-ID
- Kein Polling im Browser
- Kein Update-Banner
- Kein automatischer Reload
- Kein Service Worker
- Kein Architekturumbau auf Web-Container

========================================
AUSGABEFORMAT
========================================

Liefere in dieser Reihenfolge:

1. Diagnose
- belegter Ist-Zustand
- max. 3 Schwächen
- Stop-Kriterium

2. Umsetzung
- konkrete Änderungen je Datei
- kurze Begründung je Änderung

3. Risikoanalyse
- was verbessert wird
- was bewusst offen bleibt

4. PR-Einschätzung
- mergebar?
- was bleibt für PR 2 und PR 3?

5. Commit-/PR-Vorschlag
- Commit-Title
- PR-Titel
- kurze PR-Beschreibung

Qualitätsregeln:
- Keine Dummy-Änderungen
- Keine Deko-Kommentare nur für CI
- Keine Begriffsdrift
- Keine unnötigen Refactors
- Nur Änderungen, die die technische Aktualitätswahrheit sauber etablieren


⸻

PR 2 — Sichtbare Build-/Versionsdiagnose im UI

Ziel:
Erstelle einen fokussierten Folge-PR für Weltgewebe, der die in PR 1 eingeführte technische Versionswahrheit im Frontend sichtbar und diagnostisch nutzbar macht. Dieser PR soll noch keine aktive Browser-Selbstaktualisierung erzwingen, sondern zuerst Transparenz schaffen.

Wichtige Leitplanken:
- Weltgewebe ist NICHT Heimgewebe. Keine Heimgewebe-spezifischen Reflexe anwenden.
- Kein Service Worker in diesem PR.
- Kein automatischer Reload in diesem PR.
- Keine großen UI-Umbauten.
- Sichtbarkeit und Diagnose vor Automatisierung.
- Erst Diagnose, dann Patch.

Arbeitsmodus:
1. Prüfe den Ist-Zustand im aktuellen Frontend.
2. Liefere zuerst:
   - belegten Ist-Zustand
   - max. 3 Schwächen
   - Stop-Kriterium
3. Dann Patch umsetzen.

Zu prüfen:
- Frontend-Einstiegspunkte
- globale Layout-/Shell-Komponenten
- bestehende Settings-/Debug-/Footer-/Topbar-Bereiche
- ob bereits ein Platz für technische Build-Information existiert
- wie `/version.json` im Browser sauber abgefragt werden kann

========================================
PHASE 1 — VERSIONSDIAGNOSE IM FRONTEND
========================================

Ziel:
Das Frontend kennt seine technische Build-Identität und kann sie anzeigen.

1. `/version.json` im Browser abrufen
- Baue eine kleine, robuste Client-Funktion:
  - fetch `/version.json`
  - explizit mit `cache: 'no-store'`
- Fehler dürfen die App nicht zerlegen.
- Bei Fehlern sauber degradieren:
  - z. B. “Version unbekannt”

2. Diagnosemodell definieren
- Mindestens darstellen:
  - build
  - optional built_at
  - optional release
- Sauber typisieren/strukturieren, falls TypeScript vorhanden ist.

========================================
PHASE 2 — SICHTBARKEIT IM UI
========================================

Ziel:
Man kann in Weltgewebe sofort erkennen, welche Build-ID ein Browser gerade sieht.

3. Geeignete UI-Stelle wählen
- Nutze eine kleine, diskrete, aber gut auffindbare Stelle:
  - z. B. Settings, Footer, About, Debug-Bereich oder eine kleine Statuszeile
- Nicht prominent genug, um UX zu stören
- Aber sichtbar genug, um Divergenz schnell zu erkennen

4. Darstellung gestalten
- Beispiel:
  - Release X · Build abc1234
  - oder nur Build abc1234, wenn release nicht sinnvoll vorhanden ist
- Keine unnötige Design-Spielerei
- Hauptziel ist Diagnose, nicht Branding

5. Optional: „Zuletzt geprüft“
- Nur wenn leicht und sinnvoll integrierbar
- Keine Zeit-Orgie

========================================
PHASE 3 — MANUELLE AKTUALITÄTSPRÜFUNG
========================================

Ziel:
Diagnose verbessern, ohne schon Automatik-Update einzubauen.

6. Optionalen manuellen Refresh-/Check-Hook prüfen
- Wenn es sich sauber einfügt:
  - kleiner Button oder Aktion „Version neu prüfen“
- Kein Hard-Reload in diesem PR
- Nur Neuabruf der Diagnosequelle

Nur umsetzen, wenn:
- die bestehende UI bereits einen klaren Ort dafür hat
- kein Scope-Drift entsteht

========================================
PHASE 4 — TESTS
========================================

7. Frontend-Tests minimal ergänzen
- Erfolgsfall: `/version.json` liefert Build-ID → Anzeige korrekt
- Fehlerfall: Fetch scheitert → UI bleibt stabil, zeigt Fallback
- Keine aufwendige E2E-Orgie, wenn vorhandene Teststruktur das nicht nahelegt

========================================
PHASE 5 — DOKUMENTATION
========================================

8. docs/deployment.md oder passende Frontend-Doku knapp ergänzen
- Build-ID ist nun nicht nur serverseitig prüfbar, sondern auch im Client sichtbar
- Hauptnutzen:
  - Browser A vs Browser B direkt vergleichbar

========================================
NICHT TUN IN DIESEM PR
========================================

- Kein Polling
- Kein automatischer Reload
- Kein Update-Banner mit Versionswechsel-Workflow
- Kein Service Worker
- Kein vollständiges Self-Update-System

========================================
AUSGABEFORMAT
========================================

1. Diagnose
2. Umsetzung je Datei
3. Risikoanalyse
4. PR-Einschätzung
5. Commit-/PR-Vorschlag

Qualitätsregeln:
- Sichtbarkeit statt Überbau
- Kein unnötiger UI-Lärm
- Keine „Debug-Hölle“
- Nur das umsetzen, was Divergenz sichtbar macht


⸻

PR 3 — Browser-Selbstaktualisierung ohne Service Worker

Ziel:
Erstelle einen fokussierten Folge-PR für Weltgewebe, der eine kontrollierte Browser-Selbstaktualisierung auf Basis von `/version.json` einführt – ohne Service Worker. Ziel ist, dass Browser neue Deploys aktiv erkennen und geordnet übernehmen können.

Wichtige Leitplanken:
- Weltgewebe ist NICHT Heimgewebe.
- Kein Service Worker in diesem PR.
- Kein großer Architekturumbau.
- Die bereits bestehende Server-/Header-/Versionslogik aus PR 1 und PR 2 wird genutzt, nicht neu erfunden.
- Erst Diagnose, dann Patch.

Arbeitsmodus:
1. Prüfe den Ist-Zustand nach PR 1 und PR 2.
2. Liefere zuerst:
   - belegten Ist-Zustand
   - max. 3 Schwächen
   - Stop-Kriterium
3. Dann Patch umsetzen.

Zu prüfen:
- Wo die App global initialisiert wird
- Wie Client-State gehalten wird
- Ob es bereits globale Notification-/Banner-/Toast-Mechanik gibt
- Ob Lifecycle-Hooks/Visibility-Handling existieren

========================================
PHASE 1 — LOKALE BUILD-ID GEGEN SERVER-BUILD-ID VERGLEICHEN
========================================

Ziel:
Der Browser erkennt, wenn der Server eine neuere Build-ID ausliefert.

1. Lokale Build-Identität bestimmen
- Nutze die in PR 2 verfügbare lokale Diagnosebasis
- Vergleiche sie mit frischem Fetch von `/version.json`
- Fetch explizit mit `cache: 'no-store'`

2. Triggerpunkte definieren
- Mindestens:
  - beim App-Start
  - bei Rückkehr in den Tab (`visibilitychange`)
- Optional:
  - periodischer Check in sinnvollem Intervall
- Intervall nur, wenn wirklich nötig und nicht aufdringlich

========================================
PHASE 2 — UPDATE-HINWEIS
========================================

Ziel:
Bei erkannter neuer Version bekommt der Nutzer einen klaren Hinweis.

3. Update-Banner / Toast / Hinweis
- Wenn Server-Build-ID ≠ lokale Build-ID:
  - zeige nichtinvasiven Hinweis
  - z. B. „Neue Version verfügbar“
- Kein stiller automatischer Reload ohne Nutzerkontext

4. Handlung anbieten
- Button/Aktion:
  - „Neu laden“
- Diese Aktion führt einen harten Reload durch
- Ziel: sichere Übernahme der neuen HTML-Shell

========================================
PHASE 3 — KONTROLLIERTE ÜBERNAHME
========================================

Ziel:
Neue Versionen werden bewusst und robust übernommen.

5. Reload-Strategie
- Nutze einfachen, kontrollierten Reload
- Keine wilden Cache-Busting-Hacks, außer repo-belegt nötig
- Falls nötig:
  - klare Reload-Funktion zentral kapseln

6. Zustandssicherheit bedenken
- Prüfe, ob es kritische ungespeicherte Zustände gibt
- Falls ja:
  - Bannertext entsprechend vorsichtig formulieren
- Kein komplexes Draft-Management neu erfinden, wenn im Repo nicht vorhanden

========================================
PHASE 4 — TESTS
========================================

7. Tests ergänzen
- Gleiche Build-ID → kein Hinweis
- Andere Build-ID → Hinweis erscheint
- Klick auf Reload-Aktion → erwarteter Flow wird ausgelöst
- Fehler beim Check → App bleibt stabil

========================================
PHASE 5 — DOKUMENTATION
========================================

8. Doku knapp ergänzen
- Weltgewebe erkennt neue Deploys nun auch im Browser
- Versionserkennung basiert auf `/version.json`
- Update-Übernahme ist kontrolliert, nicht zufällig

========================================
NICHT TUN IN DIESEM PR
========================================

- Kein Service Worker
- Kein Offline-/PWA-Umbau
- Kein Versions-Hexenwerk mit mehreren konkurrierenden Update-Quellen
- Kein Architekturumbau auf Web-Container

========================================
OPTIONALER AUSBLICK, ABER NICHT UMSETZEN
========================================

- Nur wenn sinnvoll kurz dokumentieren:
  - Service Worker wäre später ein separater, eigenständiger Architekturpfad
- Keine Implementierung

========================================
AUSGABEFORMAT
========================================

1. Diagnose
2. Umsetzung je Datei
3. Risikoanalyse
4. PR-Einschätzung
5. Commit-/PR-Vorschlag

Qualitätsregeln:
- Klare, kontrollierte Selbstaktualisierung
- Keine Magie
- Keine unnötige Komplexität
- Nutzer soll sehen, was passiert


⸻

Reihenfolgeempfehlung
	1.	PR 1 zuerst
	2.	PR 2 direkt danach
	3.	PR 3 im Anschluss

So bleibt jede Stufe prüfbar und rückbaubar.

Essenz

Hebel: Erst technische Versionswahrheit, dann Sichtbarkeit, dann Selbstaktualisierung.
Entscheidung: Drei kleine PRs statt eines großen Update-Molochs.
Nächste Aktion: PR 1 an Jules geben.

Unsicherheitsgrad: 0.09
Ursachen: Gering; die Stufung ist aus dem bisherigen Problemverlauf gut ableitbar. Offen bleibt nur, welche konkreten Frontend-Dateien Weltgewebe aktuell für globale UI-/Init-Logik nutzt.

Interpolationsgrad: 0.14
Hauptannahmen: Dass du die gestufte Portierung weiter bevorzugst und dass Weltgewebe aktuell noch keine gleichwertige clientseitige Update-Mechanik besitzt.