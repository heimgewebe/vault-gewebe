# Context7 Agent Guardrails

Status: operative Leitdatei für Agenten mit Context7-Zugriff  
Zweck: Diese Datei erzwingt korrektes Vorgehen bei repo-übergreifender Arbeit in Heimgewebe.  
Wichtig: Diese Datei ist **kein** Source of Truth für Implementierungsdetails. Sie beschreibt Denkregeln, Invarianten und Prüfpfade.

---

## 1. Geltungsbereich

Diese Regeln gelten für Aufgaben in den Repos:

- metarepo
- wgx
- hausKI
- hausKI-audio
- heimgeist
- heimlern
- chronik
- aussensensor
- semantAH
- leitstand
- weltgewebe
- mitschreiber
- plexer
- contracts-mirror
- heimserver
- lenskit
- leitwerk
- sichter
- heim-pc
- obsidian-bridge
- snippet-engine-control
- icf-tool
- agent-control-surface

---

## 2. Vorrangregeln der Wahrheit

Bei Konflikten gilt immer diese Priorität:

1. Contracts / Schemas
2. Runtime-Output / Logs / Tests / Artefakte
3. Code
4. Dokumentation
5. Context7-Fremddoku

Merksatz:
- Dokumentations-Wahrheit ist nicht System-Wahrheit.
- Context7 erklärt externe Libraries und Frameworks.
- Das Repo erklärt den tatsächlichen Systemzustand.

---

## 3. Nicht verhandelbare Invarianten

### 3.1 Contracts first
Aussagen über Formate, Zustände oder Schnittstellen müssen sich zuerst auf Contracts stützen.

### 3.2 Events sind nicht Commands
Events beschreiben Realität.
Commands verändern Realität.
Beides darf nicht vermischt werden.

### 3.3 Artefakt-Wahrheit
Nur explizite Artefakte, Outputs, Schemas oder belegte Snippets zählen als harte Evidenz.
Paraphrasen ohne Beleg sind Hypothesen.

### 3.4 Epistemische Explizitheit
Unsicherheit, Widerspruch, Kontextlücken und Interpolation müssen sichtbar bleiben.
Nichts still glätten.

### 3.5 Enforcement vor Vertrauen
CI, Guards und Validierer definieren operative Wahrheit.
Annahmen ohne Guard-/Test-/Output-Bezug gelten nicht als verlässlich.

---

## 4. Wann Context7 zwingend zu verwenden ist

Context7 MUSS verwendet werden bei:

- externen Libraries
- Frameworks
- APIs
- Tooling-Verhalten, das nicht aus dem Repo selbst folgt
- aktueller Best Practice externer Systeme
- Syntax-/API-Fragen zu SvelteKit, Playwright, Vite, MapLibre, Rust-Crates, GitHub Actions, Docker-Tools, Python-Packages, Node-Packages usw.

Pflichtreihenfolge:

1. ZUERST Context7 für die externe Technologie verwenden
2. DANN mit dem aktuellen Repo-Zustand vergleichen
3. DANN Unterschiede, Risiken oder Drift benennen
4. ERST DANACH Diagnose oder Vorschlag formulieren

Wenn Context7 nicht verwendet wird, obwohl eine externe Technologie betroffen ist:
- explizit begründen

---

## 5. Wann Context7 NICHT zu verwenden ist

Context7 NICHT als Primärquelle verwenden für:

- Domänenlogik
- Architekturentscheidungen des Organismus
- UI-Philosophie
- Repo-spezifische Wahrheit, wenn diese bereits durch Contracts, Runbooks, ADRs, CI oder belegten Code gegeben ist

Beispiele:
- Heimgewebe-Systeminvarianten
- Repo-Rollen
- Artefaktflüsse
- Organismus-Grenzen
- Weltgewebe-UI-Philosophie
- Heimserver-Betriebswahrheiten, wenn diese im Repo dokumentiert und contractuell eingebettet sind

---

## 6. Diagnose-Gate vor jeder Änderung

Keine Codeänderung ohne klare Diagnose.

Vor jeder vorgeschlagenen Änderung MUSS geliefert werden:

### 6.1 Belegter Ist-Zustand
- exakter Codeblock, Log, Test-Output oder Runtime-Snippet
- keine Paraphrase als Ersatz

### 6.2 Höchstens drei Hypothesen
- klar getrennt
- keine Hypothesenflut

### 6.3 Minimaler Beweisplan
- 2 bis 5 konkrete Checks
- reproduzierbar
- idealerweise direkt ausführbar

### 6.4 Stop-Kriterium
- welche Beobachtung erlaubt einen Patch?
- ohne Stop-Kriterium kein Patch

### 6.5 Patch requires target proof
Änderungen sind nur zulässig bei mindestens einem der folgenden Belege:
- exakter Codeblock mit Zielstelle
- Treffer mit Kontext
- Runtime-Output, der den betroffenen Pfad eindeutig macht

---

## 7. Interpolationsdisziplin

Interpolation ist nur zulässig, wenn:

- die Information nicht direkt aus Repo, Contract, Log, Test oder Output gewonnen werden kann
- die Interpolation explizit markiert wird
- mindestens ein Alternativpfad genannt wird
- der Unsicherheitsgrad erhöht wird

Verboten:
- implizite Vervollständigung fehlender Repo-Fakten
- heuristische Fixes bei leicht nachlieferbaren Informationen
- Scheinkohärenz ohne Beleg

---

## 8. Repo-übergreifende Arbeitslogik

### 8.1 Metarepo ist Control Plane
Wenn Unklarheit über Fleet, Rollen, Templates, Guards oder contracts-first besteht:
- metarepo zuerst prüfen

### 8.2 WGX ist Enforcement- und Fleet-Motorik
Wenn es um Guard, Smoke, Metrics, Profile oder wiederverwendbare CI geht:
- wgx zuerst prüfen

### 8.3 contracts-mirror spiegelt externe Contracts
Externe oder gespiegelte API-Contracts dort prüfen.
Interne Organismus-Contracts liegen nicht dort, sondern in der Control Plane.

### 8.4 Repo-Rollen grob
- chronik = Event-Backbone
- aussensensor = Außensignale / Ingest
- semantAH = Semantik / Observatory / Index
- heimgeist = Knowledge / Self-State / Insight-Artefakte
- hausKI = Orchestrierung / Entscheidungen / Tools
- heimlern = Lern- und Feedbacksystem
- plexer = Event-Routing / Delivery
- mitschreiber = OS-Kontext / Reduktion / Embedding
- leitstand = UI / Beobachtung / Rendering von Artefakten
- weltgewebe = kartenbasierte Kollektivgüter- und Interaktionsoberfläche
- heimserver = Infrastruktur- und Edge-Betrieb
- lenskit = Snapshot / Retrieval / RepoLens / Atlas
- leitwerk = Agenten- und Artefakt-Interfaces
- sichter = Review- und PR-Automation

Diese Rollen sind Orientierung, nicht Ersatz für Repo-Prüfung.

---

## 9. Anti-Patterns, die aktiv zu vermeiden sind

### 9.1 Halluzinierte Struktur
Keine erfundenen Dateien, APIs, Pfade oder Module.

### 9.2 Patch ohne Beweis
Keine Änderungen ohne Zielbeleg.

### 9.3 Stille Glättung
Widersprüche nicht „wegmoderieren“.

### 9.4 Fremddoku als Systemwahrheit
SvelteKit-, Playwright- oder Rust-Doku beschreibt nicht automatisch den Zustand des Repos.

### 9.5 Cross-Repo-Verwechslung
Keine Regeln eines Repos ungeprüft auf ein anderes übertragen.

### 9.6 Command/Event-Vermischung
Keine Analyse-Antwort so formulieren, dass Handlung als Beobachtung ausgegeben wird.

### 9.7 Repo-spezifische Drift durch generische Best Practices
Externe Best Practice immer gegen Repo-Invarianten prüfen.

---

## 10. Antwortpflichten für Agenten

Bei jeder relevanten technischen Antwort MUSS sichtbar sein:

- ob Context7 verwendet wurde
- für welche externe Technologie Context7 verwendet wurde
- welche repo-spezifischen Abweichungen gefunden wurden
- welche Risiken oder Drift-Hinweise daraus folgen
- welche Information belegt ist
- welche Information plausibel ist
- welche Information spekulativ bleibt

Wenn relevante Information fehlt:
- explizit benennen, was fehlt und wofür es nötig ist

Formel:
- belegt
- plausibel
- spekulativ

---

## 11. Standardablauf für technische Tasks

1. Scope bestimmen: welches Repo oder welche Repos sind betroffen?
2. Externe Technologie identifizieren
3. Falls extern: Context7 laden
4. Repo-Zustand prüfen
5. Contracts und Guards prüfen
6. Ist-Zustand belegen
7. Hypothesen bilden
8. Beweisplan angeben
9. Erst danach Änderung oder Empfehlung formulieren

---

## 12. Kurzregel für Agenten

- Erst nachschlagen
- Dann vergleichen
- Dann diagnostizieren
- Dann handeln

Nicht:
- erst raten
- dann fixen
- dann hoffen

---

## 13. Schlussklausel

Diese Datei soll Agenten disziplinieren, nicht Repo-Wahrheit ersetzen.

Wenn diese Leitdatei mit:
- Contracts
- Runtime-Output
- Tests
- Guards
- Repo-Snippets

kollidiert, dann gewinnen immer die näheren Primärquellen.

Context7 ist Hilfsmittel.
Der Organismus selbst bleibt Maßstab.
