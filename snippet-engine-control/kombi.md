## Dialektische Erörterung

**These:**  
Du brauchst für `snippet-engine-control` eine **richtige IDE-Architektur**, also mehr als einen Editor mit ein paar Buttons.

**Antithese:**  
Wenn man zu früh „IDE“ ruft, baut man leicht eine schwerfällige Miniversion von VS Code und verliert das Eigentliche: Snippets sicher modellieren, prüfen, simulieren und ausrollen. Das Repo ist im Kern bisher klar als **engine-neutraler Kern + Adapter + CLI + später UI** gedacht, also eher als Control-Plane denn als voll ausgebaute IDE.

**Synthese:**  
Die richtige Architektur ist **keine allgemeine Universal-IDE**, sondern eine **Snippet-IDE mit harter Diagnostik-Achse**:  
Editor + Projektmodell + Diagnose + Preview + Export/Apply + Engine-Adapter + lokale Laufzeit.  
Also: **IDE, aber domänenspezifisch und contract-first**.

---

# Begriffsklärung: IDE

**IDE** = _Integrated Development Environment_.  
**Etymologie:**

- **integrated** ← lat. _integrare_ / _integer_ = erneuern, ganz machen, unversehrt
    
- **development** ← altfrz. _desveloper_ = auswickeln, entfalten
    
- **environment** ← altfrz. _environner_ = umgeben
    

Für dein Projekt heißt das nicht „großer Code-Editor“, sondern:  
**eine integrierte Umgebung, in der Snippets nicht nur geschrieben, sondern als zusammenhängendes System entwickelt werden.**

---

# Alternative Sinnachse

Die wichtigste Zielverschiebung lautet:

Nicht:

```
Snippet-Editor
```

sondern:

```
Snippet-Workspace mit Analyse-, Simulations- und Ausrollkern
```

Der Unterschied ist brutal wichtig.

Ein Editor fragt:

> „Was steht im Textfeld?“

Eine IDE fragt:

> „Was bedeutet diese Änderung für Kollisionen, Grenzen, Engine-Kompatibilität, Preview, Diff und Rollout?“

Genau dort liegt dein Produktwert.

---

# Zielbild

Die Architektur sollte sieben klar getrennte Schichten haben:

```
1. Shell / Workbench
2. Editor Surface
3. Workspace Model
4. Language & Diagnostics Engine
5. Preview / Simulation Engine
6. Export / Apply Pipeline
7. Adapter Runtime Layer
```

Dazu zwei Querschnittsachsen:

```
A. Contracts / Schemas
B. Persistence / History / Snapshots
```

---

# Architekturentwurf: die richtige Snippet-IDE

## 1. Workbench Shell

Das ist die eigentliche IDE-Hülle.

**Aufgaben**

- Fensterlayout
    
- Panels
    
- Commands
    
- Tabs
    
- Statusbar
    
- Notifications
    
- Routing innerhalb der App
    

**Panels**

- Explorer: Snippet-Sets / Dateien / Gruppen
    
- Editor
    
- Diagnostics
    
- Preview
    
- Diff / Export Plan
    
- Runtime / Engine Status
    

**Warum nötig?**  
Weil eine IDE nicht aus einem einzigen Editorpanel besteht, sondern aus kooperierenden Sichten.

**Minimaler Aufbau**

```
Workbench
 ├─ Sidebar
 ├─ Main Editor Area
 ├─ Right Diagnostics/Preview Pane
 ├─ Bottom Output / Logs / Diff
 └─ Command Bar
```

---

## 2. Editor Surface

Das ist der direkte Bearbeitungsraum.

**Nicht nur Textarea.**

Er sollte drei Bearbeitungsmodi haben:

### a) Form Mode

Für normale Nutzer:

- Trigger
    
- Body
    
- Word boundary
    
- Tags
    
- Origin
    
- Scope/App-Constraints
    

### b) Structured Mode

JSON/IR-orientiert:

- vollständige Snippet-Struktur

### c) Raw Engine Mode

Espanso-YAML-Ansicht:

- nur zur Inspektion / Vergleich / Notfallbearbeitung

**Prinzip:**  
Bearbeitung geschieht **im IR**, nicht direkt in Engine-Dateien.

Das passt exakt zur bisherigen Repo-Idee:  
Core IR → Analyzer → ExportPlan → Adapter.

---

## 3. Workspace Model

Das ist der eigentliche Innenkörper der IDE.

Nicht einzelne Snippets sind primär, sondern ein **Workspace**.

## Vorschlag: Kanonisches Modell

```
type Workspace = {
  id: string
  engineTarget: "espanso"
  snippetSets: SnippetSet[]
  activeDocumentId?: string
  diagnostics: DiagnosticState
  previewState: PreviewState
  exportState: ExportState
  runtimeState: RuntimeState
  history: WorkspaceHistory
}
```

```
type SnippetSet = {
  id: string
  name: string
  source: SourceRef
  snippets: SnippetDocument[]
}
```

```
type SnippetDocument = {
  stableId: string
  revisionId: string
  ir: Snippet
  dirty: boolean
  derived: {
    diagnostics?: Diagnostic[]
    preview?: PreviewResult
    exportImpact?: ExportImpact
  }
}
```

## Warum `stableId` + `revisionId`?

Weil dein aktuelles fingerprint-basiertes ID-Modell produktseitig riskant ist.  
Eine IDE braucht:

- **stabile Objektidentität** für Selektion, Referenzen, UI-State
    
- **separate Revisionsidentität** für Änderungsnachweis
    

Sonst springt die Identität beim Editieren, und die IDE benimmt sich wie ein Goldfisch mit Kurzzeitgedächtnis.

**Empfehlung:**

- `stableId`: dauerhaft
    
- `revisionId`: aus Fingerprint ableitbar
    

---

## 4. Language & Diagnostics Engine

Das ist das Herzstück.  
Nicht „Syntax-Highlighting“, sondern **Snippet-Semantikdienst**.

### Funktionen

- Konfliktanalyse
    
- Boundary-Analyse
    
- Encoding-Analyse
    
- Engine-Kompatibilitätsprüfung
    
- Schema-Validation
    
- Cross-snippet-Referenzprüfung
    
- Duplicate-/Shadow-Detection
    

### Architektur

```
Workspace change
 → incremental analysis scheduler
 → analyzers
 → diagnostics registry
 → UI projections
```

### Komponenten

```
DiagnosticCoordinator
 ├─ SchemaValidator
 ├─ ConflictAnalyzer
 ├─ BoundaryAnalyzer
 ├─ EncodingAnalyzer
 ├─ EngineCapabilityAnalyzer
 └─ ProjectConsistencyAnalyzer
```

### Wichtig

Die Diagnostik darf **inkrementell** sein.  
Nicht bei jedem Tastendruck alles neu rechnen.

### Pipeline

```
edit event
 → debounce
 → analyze changed snippet
 → analyze affected neighbors
 → update diagnostics graph
```

---

## 5. Preview / Simulation Engine

Aktuell ist Preview nur „Body zurückgeben“. Das ist für eine IDE zu wenig.

Eine richtige IDE braucht **Simulationsebenen**:

### Ebene 1 — Static Preview

- finaler Body
    
- Triggerliste
    
- Flags
    

### Ebene 2 — Template Preview

- Placeholder-Auflösung
    
- Variablen
    
- Datum/Zeit
    
- Clipboard-Platzhalter als Mock
    
- Cursorposition
    

### Ebene 3 — Engine-aware Preview

- Espanso-Regeln
    
- word-boundary Verhalten
    
- multiline Verhalten
    
- App-Scope
    

### Ebene 4 — Expansion Trace

Zeigt:

```
trigger
→ matcher
→ transforms
→ expansion output
→ engine constraints
```

**Das ist der eigentliche IDE-Moment.**  
Nicht „was steht da“, sondern „wie entfaltet es sich“.

---

## 6. Export / Apply Pipeline

Die IDE braucht eine **Build-Achse**.

Nicht:

```
Save = Datei schreiben
```

sondern:

```
Save = Workspace speichern
Apply = Engine-Artefakte erzeugen + schreiben
```

## Zweistufiges Modell

### a) Save

- persistiert Workspace / Dokumentzustand
    
- noch kein Engine-Schreiben
    

### b) Apply

- baut ExportPlan
    
- zeigt Diff
    
- validiert nochmal
    
- schreibt Engine-Dateien
    
- optional Restart / Reload
    

## Pipeline

```
Workspace IR
 → Export Planner
 → Engine Artifact Graph
 → Diff Renderer
 → Apply Executor
 → Post-Apply Verification
```

### Components

```
ExportOrchestrator
 ├─ PlanBuilder
 ├─ DiffProjector
 ├─ ApplyExecutor
 ├─ BackupManager
 └─ VerificationStep
```

## Warum BackupManager?

Weil ein Produkt ohne Rücksicherung nur solange elegant ist, bis der erste Nutzer „ups“ sagt.

---

## 7. Adapter Runtime Layer

Die Adapter-Schicht bleibt streng getrennt.

Das Repo sagt selbst:  
Adapter darf engine-spezifisches Wissen enthalten, aber keine UI-Logik.

Das muss unbedingt bleiben.

## Adapter-Interfaces

```
interface EngineAdapter {
  discover(): Promise<EngineLocation[]>
  importWorkspace(source: SourceRef): Promise<SnippetSet[]>
  validate(ir: Snippet[]): Promise<EngineDiagnostic[]>
  buildArtifacts(ir: Snippet[]): Promise<ArtifactSet>
  apply(artifacts: ArtifactSet): Promise<ApplyResult>
  preview(snippet: Snippet, ctx: PreviewContext): Promise<PreviewResult>
  health(): Promise<RuntimeHealth>
}
```

### Espanso Adapter V1

- discover config
    
- read snippets
    
- map into IR
    
- build YAML artifacts
    
- dry-run diff
    
- write files
    
- optional restart/status/log
    

---

# Architekturprinzip: Frontend nicht direkt an Core koppeln

Die UI sollte **nicht** wild `core` importieren und selbst alles rechnen.  
Besser:

```
UI
 ↕
IDE Application Service
 ↕
Workspace / Diagnostics / Export Services
 ↕
Core + Adapters
```

## Application Layer

```
IDEApplicationService
 ├─ openWorkspace()
 ├─ saveDocument()
 ├─ validateDocument()
 ├─ previewDocument()
 ├─ applyWorkspace()
 └─ revertRevision()
```

Das verhindert, dass die UI später zum Spaghettimonster wird, das halb Engine, halb View, halb Trauerspiel ist.

---

# Persistenzarchitektur

Du brauchst zwei Speicherarten:

## 1. Workspace State

IDE-intern:

- offene Tabs
    
- Selektion
    
- Editor-Zustände
    
- History
    
- Drafts
    

## 2. Engine State

Externe Wahrheit:

- Espanso-Dateien
    
- generierte Artefakte
    

### Empfehlung

```
.local workspace state
+
import/export to engine
```

Nicht sofort bidirektionale Live-Synchronisation erzwingen.  
Sonst baust du zuerst Synchronisationshölle und erst danach Produkt.

---

# Event-Modell der IDE

Für so ein Tool lohnt ein sauberes Event-System:

```
DocumentOpened
DocumentChanged
DiagnosticsUpdated
PreviewUpdated
ExportPlanBuilt
ApplyStarted
ApplyCompleted
RuntimeHealthChanged
```

Das ist keine Spielerei, sondern hilft bei:

- Undo/Redo
    
- Telemetrie lokal
    
- Logs
    
- spätere Pluginfähigkeit
    

---

# Plugin-/Extension-Achse

Noch nicht sofort bauen.  
Aber die Architektur sollte sie erlauben.

## Plugin-fähige Erweiterungspunkte

- neue Engine-Adapter
    
- neue Analyzer
    
- neue Preview-Resolver
    
- neue Exportformate
    
- neue Panels
    

### Nicht jetzt

Kein Marketplace, kein Plugin-Loader V1.  
Nur **interne Erweiterungspunkte** definieren.

---

# Empfohlene Repo-Struktur

```
packages/
  core/                  # IR, analyzers, export model
  adapter-espanso/       # espanso runtime + artifact generation
  cli/                   # commands + daemon bootstrap
  ide-app/               # application services / workspace orchestration
  ui/                    # workbench + panels + editors
  contracts/             # shared typed contracts / schemas
  test-e2e/              # browser / daemon / apply tests
```

## Warum `ide-app`?

Weil `ui` nicht direkt Business-Logik tragen sollte.

**Faustregel:**

- `core` = domänische Wahrheit
    
- `ide-app` = Anwendungsfluss
    
- `ui` = Darstellung + Interaktion
    
- `adapter-*` = Engine-Wirklichkeit
    

---

# Versionierter Entwicklungsplan

## V0.1 — Benutzbare IDE-Basis

- Workbench
    
- Snippet List
    
- Editor
    
- Diagnostics
    
- Preview
    
- Dry-run Diff
    
- Apply
    
- realer Espanso-Import/Export
    

## V0.2 — Vertrauenswürdige IDE

- Undo/Redo
    
- Snapshots
    
- Backups
    
- runtime verification
    
- better preview
    
- search/filter
    

## V0.3 — Gute IDE

- multi-file explorer
    
- grouping/tags
    
- conflict navigation
    
- settings
    
- template snippets
    

## V1.0 — Produkt

- packaging
    
- stable updates
    
- docs
    
- onboarding
    
- migration path
    
- robust tests
    

---

# Größte Fehlannahmen, die ich aktiv korrigiere

## Fehlannahme 1

**„IDE = schöner Editor.“**  
Nein. IDE = Editor + Modell + Semantik + Simulation + Build/Apply.

## Fehlannahme 2

**„Save und Apply sind dasselbe.“**  
Nein. Das muss getrennt sein, sonst wird die UI nervös und gefährlich.

## Fehlannahme 3

**„Fingerprint-ID reicht als Objektidentität.“**  
Für Compiler ok, für IDE meistens schlecht.

## Fehlannahme 4

**„UI kann direkt Core aufrufen, spart Schichten.“**  
Kurzfristig ja, langfristig baut das einen Klebstoffhaufen.

---

# Risiko-/Nutzenabschätzung

## Nutzen

- klares Produktprofil
    
- echte IDE statt Admin-UI
    
- sauber erweiterbar
    
- bessere Testbarkeit
    
- bessere Engine-Trennung
    

## Risiken

- zu viel Architektur vor echtem Produkt
    
- Event-/Service-Layer kann überdesignt werden
    
- Preview-Simulation kann ausufern
    

## Gegenmittel

Nur das bauen, was direkt einen Nutzerfluss stabilisiert:

```
open → edit → diagnose → preview → diff → apply
```

Alles andere ist nachgeordnet.

---

# Mein konkreter Architekturvorschlag in einem Satz

> Baue `snippet-engine-control` als **domänenspezifische Snippet-IDE** mit `core` als semantischem Motor, `ide-app` als Orchestrierungsschicht, `ui` als Workbench, `adapter-espanso` als Engine-Brücke und strikt getrenntem `save`- vs.-`apply`-Modell.

---

# Essenz

**Hebel:** Trenne sauber zwischen **Darstellung**, **Anwendungsfluss**, **Domänenlogik** und **Engine-Ausführung**.  
**Entscheidung:** Nicht „mehr Editor“, sondern **richtige Snippet-IDE mit Workspace-Modell**.  
**Nächste Aktion:** Ich würde als erstes `ide-app` + `Workspace` + `stableId/revisionId` + `save/apply`-Trennung festziehen.

**Unsicherheitsgrad:** 0.19  
Ursachen: Build-/Packaging-Details, tatsächliche Fingerprint-Logik und langfristige Produktziele sind nicht vollständig belegt.

**Interpolationsgrad:** 0.24  
Hauptannahmen: Du willst wirklich ein Produkt und nicht nur ein Entwicklerwerkzeug; Undo/History/Workspace werden später wichtig; Pluginfähigkeit soll vorbereitet, aber nicht sofort gebaut werden.

Trockener Humor: Eine IDE ohne Workspace-Modell ist wie ein Krankenhaus mit sehr guten Stiften. Man kann viel notieren, aber die Operation wird unerquicklich.

## Dialektische Erörterung

**These:** Das Repo ist bereits **sauber genug getrennt**, um langfristig wartbar zu werden: `core`, `adapter-espanso`, `cli`, `ui`, dazu Contracts und Architektur-/ADR-Doku. Die Grundidee ist explizit: **Core ≠ Adapter ≠ UI**, contract-first, Diagnose vor Anwendung, diffbarer ExportPlan.

**Antithese:** Gerade diese frühe Mehrschichtigkeit birgt Drift-Risiko: Das Repo versteht sich zugleich als engine-neutrale Kontrollschicht, CLI-Tool, lokaler Daemon und künftige UI. Die UI ist offiziell weiter „Phase 2“, spricht aber schon mit lokalem Backend; zugleich wächst ein eigener UI-API-Contract. Das ist der typische Moment, in dem Wartbarkeit kippt: nicht wegen zu wenig Struktur, sondern wegen **halbfertiger zweiter Wahrheiten**.

**Synthese:** Die richtige Refactoring-Strategie ist **nicht** „groß umbauen“, sondern:

1. **eine kanonische Domänenachse festzurren**,
2. **Anwendungslogik aus UI/CLI herausziehen**,
3. **Engine-spezifische Seiteneffekte härter kapseln**,
4. **Contracts und Runtime wieder aufeinander einrasten lassen**.

Die Leitfrage lautet also nicht:

> „Wie machen wir das Repo schöner?“

sondern:

> „Welche Grenze muss kanonisch werden, damit spätere Features nicht jede Schicht gleichzeitig verbiegen?“

---

# Repo-Lage, knapp geordnet

Aktuelle Struktur und Rollen sind bereits sichtbar:

- `packages/core` für engine-neutrales Modell, Analysen und Export-IR
- `packages/adapter-espanso` für Espanso-spezifische Import/Export/Runtime-Operationen
- `packages/cli` als Devtool und Daemon-Einstieg
- `packages/ui` als vorbereitete lokale Web-UI
- `contracts/` für `snippet`, `engine`, `diagnostics`, inzwischen auch `ui-api`
- Doku/ADRs für Architektur, Datenmodell und ExportPlan

Das ist eine gute Ausgangsbasis. Der Kernkonflikt ist nicht „fehlende Struktur“, sondern **fehlende Priorisierung der Struktur**.

---

# Alternative Sinnachse

Die stärkste alternative Denkbewegung ist diese:

Nicht primär nach **Technikschichten** refactoren (`core` / `cli` / `ui` / `adapter`),

sondern nach **Wahrheitsarten**:

1. **Domänenwahrheit** – Was ist ein Snippet, eine Diagnose, ein ExportPlan?
2. **Anwendungswahrheit** – Welche Nutzeraktion bewirkt welche Orchestrierung?
3. **Enginewahrheit** – Was darf Espanso konkret lesen, schreiben, ausführen?
4. **Darstellungswahrheit** – Wie erscheint das in CLI oder UI?

Warum ist das besser? Weil Schichten oft technisch sauber klingen, aber fachlich kleben. Wahrheitsarten entlarven schneller, wo Logik falsch liegt.

---

# Zielbild für langfristige Wartbarkeit

## Kanonisches Zielmodell

```
contracts + core
    ↓
application layer
    ↓
ports/interfaces
    ↓
adapter-espanso / cli / ui
```

Oder präziser:

```
1. Domain
2. Application
3. Ports
4. Adapters
5. Presentation
```

Das Repo hat aktuell **Domain + Adapters + Presentation**, aber die **Application-Schicht** ist noch zu implizit.

Genau dort entsteht später die Wartungshölle.

---

# Refactoring-Strategie in 5 Phasen

## Phase 1 — Kanonische Wahrheit festziehen

### Ziel

`contracts` + `core` werden die einzige semantische Quelle der Wahrheit.

### Maßnahmen

- `Snippet`, `Diagnostics`, `EngineCapabilities`, `ExportPlan` bleiben ausschließlich in `core`/`contracts` definiert
- Keine zweite Modelllogik in `ui` oder `cli`
- `ui-api.schema.json` darf **nur Transportformen** beschreiben, keine neue Domäne

### Konkreter Refactor

Einführen einer Regel:

```
packages/ui/          → keine Domänentypdefinitionen
packages/cli/         → keine Domänentypdefinitionen
packages/adapter-*    → keine alternativen Snippet-Modelle
```

### Nutzen

- weniger Drift
- weniger stilles Auseinanderlaufen von Schema, UI und Code

### Risiko

- kurzfristig mehr Imports aus `core`
- manche UI-Helfer müssen umgebaut werden

---

## Phase 2 — Application Layer herausziehen

### Problem

Aktuell sitzen Orchestrierungsschritte teils in CLI/Daemon/UI-Flows: Laden, Validieren, Preview, Dry-run, Save, Delete. Das sind keine Darstellungsdetails, sondern **Anwendungslogik**.

### Ziel

Eine neue Schicht, z. B.:

```
packages/app/
```

oder

```
packages/ide-app/
```

### Inhalt

- `openWorkspace()`
- `loadSnippets()`
- `updateSnippet()`
- `validateSnippet()`
- `previewSnippet()`
- `buildDryRunPlan()`
- `applyWorkspace()`

### Beispiel

Statt:

```
ui → daemon → direkt core + adapter + temp file hacks
```

besser:

```
ui/cli → application service → core + adapter
```

### Warum das der größte Hebel ist

Weil du dann:

- UI austauschen kannst
- CLI schlank halten kannst
- Tests gegen stabile Use-Cases schreiben kannst

### Nutzen

hoch

### Aufwand

mittel

### Empfehlung

**als erste größere Refactoring-Maßnahme**

---

## Phase 3 — Ports und Seiteneffekte trennen

### Problem

Espanso-spezifische Runtime-Operationen wie discover/read/write/restart sind richtig im Adapter, aber die Orchestrierung von „was wird wann gelesen/geschrieben“ droht sich in CLI/Daemon zu verteilen.

### Ziel

`core` kennt keine Seiteneffekte. `application` kennt nur Ports. Adapter implementieren diese Ports.

### Beispiel-Port-Interfaces

```
interface SnippetRepositoryPort {
  load(): Promise<Snippet[]>
  save(snippets: Snippet[]): Promise<void>
}

interface PreviewPort {
  preview(snippet: Snippet): Promise<PreviewResult>
}

interface RuntimeHealthPort {
  doctor(): Promise<HealthReport>
}
```

### Nutzen

- Espanso später austauschbar
- Tests ohne echte Dateien/Daemon möglich
- weniger Tempfile-/Pfadmagie

### Risiko

- Anfangs etwas „zu akademisch“, wenn man Ports inflationär baut

### Gegenmittel

Nur Ports für echte Seiteneffekte einführen:

- lesen
- schreiben
- preview engine
- runtime health

---

## Phase 4 — UI und CLI als reine Präsentationsschichten disziplinieren

### UI

Die UI ist laut Doku lokal und soll nur mit lokalem Backend sprechen. Das ist gut. Aber sie sollte keinerlei eigene Semantik erzeugen.

### CLI

Die CLI war laut Repo lange der primäre Fokus: `validate / export / apply / doctor`. Sie sollte künftig nur noch:

- Kommandos parsen
- Application Services aufrufen
- Ergebnisse rendern

### Refactoring-Regel

In `packages/cli/src/*.ts` und `packages/ui/app.js` darf keine Logik leben, die fachlich auch in einem Test ohne UI/CLI gebraucht würde.

Das ist die einfachste und brutalste Wartbarkeitsregel.

---

## Phase 5 — Tests entlang der Architektur neu sortieren

### Aktuell

Es gibt Tests in Core, CLI, Adapter und inzwischen Daemon/UI-Nähe.

### Problem

Wenn Tests nur Paketgrenzen spiegeln, nicht Nutzerflüsse, übersiehst du Drift im System.

### Ziel-Testpyramide

#### 1. Domain-Tests

- `core`
- analyzers
- export plan
- fingerprint/store

#### 2. Application-Tests

- `load → edit → validate → preview → dry-run`
- ohne echte UI

#### 3. Adapter-Tests

- Espanso roundtrip
- file safety
- restart/doctor

#### 4. Presentation-Tests

- CLI usage parsing
- daemon auth/origin
- UI smoke

### Größter Hebel

**Use-case Tests** einführen. Nicht nur:

> „Store CRUD funktioniert“

sondern:

> „Ein Nutzer ändert Trigger X, bekommt Konfliktdiagnose Y, Dry-run zeigt Z.“

---

# Konkrete Repo-Umstrukturierung

## Vorschlag

```
packages/
  core/                # Domäne + Analyzer + Export-IR
  app/                 # Use-cases / orchestration / application services
  adapter-espanso/     # Espanso ports implementation
  cli/                 # command parsing + console presentation + daemon bootstrap
  ui/                  # browser presentation only
```

### Was bleibt wo?

#### `core`

- model/
- ir/
- analyzers/
- export/
- keine I/O

#### `app`

- workspace service
- snippet service
- validation service
- preview service
- export/apply orchestration

#### `adapter-espanso`

- discover/read/write/restart/doctor
- artifact mapping

#### `cli`

- `sec validate`
- `sec export`
- `sec apply`
- `sec ui`
- nur Delegation + Ausgabe

#### `ui`

- panels
- state projection
- events
- rendering

---

# Priorisierte Refactoring-Schritte

## Schritt 1 — `packages/app` einführen

**Hebel:** maximal **Warum:** entkoppelt sofort UI/CLI von Domain und Adapter-I/O

## Schritt 2 — Preview-/Validation-Use-Cases aus Daemon/UI herausziehen

**Hebel:** sehr hoch **Warum:** verhindert doppelte Semantik

## Schritt 3 — Save vs Apply hart trennen

Das Repo betont ohnehin Diagnose und ExportPlan vor Anwendung. Diese Trennung muss architektonisch sichtbar werden:

```
saveDraft()
buildPlan()
applyPlan()
```

nicht:

```
saveAndMaybeAlsoWriteFiles()
```

## Schritt 4 — Packaging-/Asset-Serving sauber binden

Ich bleibe dabei: Das ist wahrscheinlich ein künftiger Wartungsherd, wenn UI-Assets und CLI-Distribution nicht klar gekoppelt werden. X fehlt, nötig für Y: konkreter Build-Output/Installationspfad fehlt, nötig um den richtigen Packaging-Refactor zu entscheiden.

## Schritt 5 — StableId vs RevisionId prüfen

Das Datenmodell-Dokument nennt `id (stabil)`. Wenn der laufende Code IDs aus Fingerprints regeneriert, droht ein semantischer Widerspruch. Das sollte langfristig bereinigt werden, aber erst nach Target-Proof im Code. Das ist **kein Sofort-Refactor**, aber ein wichtiger Architektur-Check.

---

# Was ich ausdrücklich nicht sofort refactoren würde

## Nicht sofort: Plugin-System

Zu früh. Wartbarkeit steigt dadurch jetzt nicht.

## Nicht sofort: Multi-Engine-Abstraktion aufblasen

Espanso first ist explizit so gewollt. Abstraktion ohne zweiten echten Adapter ist Design-Kosmetik.

## Nicht sofort: UI-Framework-Wechsel

Völlig irrelevant für langfristige Wartbarkeit, solange Anwendungslogik nicht im UI klebt.

---

# Typische Fehlannahmen

## Fehlannahme 1

**„Mehr Schichten = mehr Wartbarkeit.“** Nein. Mehr Schichten helfen nur, wenn sie verschiedene Wahrheiten trennen.

## Fehlannahme 2

**„Die UI muss jetzt zum Zentrum werden.“** Nein. Das Repo ist laut eigener Beschreibung weiterhin primär Kontroll- und Diagnoseschicht, nicht bloß Editor.

## Fehlannahme 3

**„Contracts lösen Drift automatisch.“** Nein. Contracts ohne klare Ownership und ohne Application Layer führen zu formal sauberem Chaos.

---

# Risiko- und Nutzenabschätzung

## Nutzen

- weniger Kopplung
- klarere Testbarkeit
- bessere Erweiterbarkeit
- UI/CLI werden austauschbar
- Adapter bleiben klein und ehrlich

## Risiken

- temporär mehr Pakete/mehr Imports
- Gefahr eines überkonstruierten `app/`-Pakets
- Refactor kann Momentum bremsen, wenn zu breit angelegt

## Gegenmittel

Refactor in **vertikalen Schnitten**:

1. load/edit/validate
2. preview
3. dry-run/apply

Nicht alles gleichzeitig.

---

# Konkreter Umsetzungsplan in 3 PRs

## PR 1 — Application Layer Basis

- `packages/app` anlegen
- `loadSnippets`, `validateSnippet`, `previewSnippet`, `buildDryRunPlan`
- CLI und Daemon delegieren dahin

## PR 2 — Adapter-Ports sauber ziehen

- read/write/doctor/restart hinter Ports
- App hängt nicht mehr direkt an Espanso-Funktionen

## PR 3 — UI/CLI Entfettung

- Presentation only
- keine Domänenlogik außerhalb `core` + `app`

Das wäre die wartbarste Sequenz mit gutem Fortschritt.

---

# Essenz

**Hebel:** Einführung einer echten **Application-Schicht** zwischen `core` und `ui/cli/adapter`. **Entscheidung:** Nicht großflächig „schönmachen“, sondern die eine fehlende Grenze einziehen, die fast alle späteren Wartungsprobleme verhindert. **Nächste Aktion:** PR 1 planen: `packages/app` + erste 4 Use-Cases + Delegation aus CLI/Daemon.

**Unsicherheitsgrad:** 0.20 Ursachen: konkrete Build-/Packaging-Wege und die reale Fingerprint-Logik sind hier nicht vollständig belegt.

**Interpolationsgrad:** 0.16 Hauptannahmen: dass du UI und CLI langfristig parallel behalten willst; dass Espanso vorerst einziger echter Adapter bleibt; dass Drift bereits jetzt die größere Gefahr ist als fehlende Features.

Trockener Humor: Ein Repo ohne Application Layer ist wie ein Rathaus, in dem Bürgeramt, Bauamt und Orchester dieselbe Kaffeemaschine teilen. Es funktioniert – bis jemand wirklich etwas bauen will.