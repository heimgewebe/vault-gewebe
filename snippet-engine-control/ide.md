## Dialektische Erörterung

**These:**  
Du brauchst für `snippet-engine-control` eine **richtige IDE-Architektur**, also mehr als einen Editor mit ein paar Buttons.

**Antithese:**  
Wenn man zu früh „IDE“ ruft, baut man leicht eine schwerfällige Miniversion von VS Code und verliert das Eigentliche: Snippets sicher modellieren, prüfen, simulieren und ausrollen. Das Repo ist im Kern bisher klar als **engine-neutraler Kern + Adapter + CLI + später UI** gedacht, also eher als Control-Plane denn als voll ausgebaute IDE.

**Synthese:**  
Die richtige Architektur ist **keine allgemeine Universal-IDE**, sondern eine **Snippet-IDE mit harter Diagnostik-Achse**:  
Editor + Projektmodell + Diagnose + Preview + Export/Apply + Engine-Adapter + lokale Laufzeit.  
Also: **IDE, aber domänenspezifisch und contract-first**.

---

# Begriffsklärung: IDE

**IDE** = _Integrated Development Environment_.  
**Etymologie:**

- **integrated** ← lat. _integrare_ / _integer_ = erneuern, ganz machen, unversehrt
    
- **development** ← altfrz. _desveloper_ = auswickeln, entfalten
    
- **environment** ← altfrz. _environner_ = umgeben
    

Für dein Projekt heißt das nicht „großer Code-Editor“, sondern:  
**eine integrierte Umgebung, in der Snippets nicht nur geschrieben, sondern als zusammenhängendes System entwickelt werden.**

---

# Alternative Sinnachse

Die wichtigste Zielverschiebung lautet:

Nicht:

```text
Snippet-Editor
```

sondern:

```text
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

```text
1. Shell / Workbench
2. Editor Surface
3. Workspace Model
4. Language & Diagnostics Engine
5. Preview / Simulation Engine
6. Export / Apply Pipeline
7. Adapter Runtime Layer
```

Dazu zwei Querschnittsachsen:

```text
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

```text
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
Bearbeitung geschieht **im IR**, nicht direkt in Engine-Dateien.

Das passt exakt zur bisherigen Repo-Idee:  
Core IR → Analyzer → ExportPlan → Adapter.

---

## 3. Workspace Model

Das ist der eigentliche Innenkörper der IDE.

Nicht einzelne Snippets sind primär, sondern ein **Workspace**.

## Vorschlag: Kanonisches Modell

```ts
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

```ts
type SnippetSet = {
  id: string
  name: string
  source: SourceRef
  snippets: SnippetDocument[]
}
```

```ts
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

## Warum `stableId` + `revisionId`?

Weil dein aktuelles fingerprint-basiertes ID-Modell produktseitig riskant ist.  
Eine IDE braucht:

- **stabile Objektidentität** für Selektion, Referenzen, UI-State
    
- **separate Revisionsidentität** für Änderungsnachweis
    

Sonst springt die Identität beim Editieren, und die IDE benimmt sich wie ein Goldfisch mit Kurzzeitgedächtnis.

**Empfehlung:**

- `stableId`: dauerhaft
    
- `revisionId`: aus Fingerprint ableitbar
    

---

## 4. Language & Diagnostics Engine

Das ist das Herzstück.  
Nicht „Syntax-Highlighting“, sondern **Snippet-Semantikdienst**.

### Funktionen

- Konfliktanalyse
    
- Boundary-Analyse
    
- Encoding-Analyse
    
- Engine-Kompatibilitätsprüfung
    
- Schema-Validation
    
- Cross-snippet-Referenzprüfung
    
- Duplicate-/Shadow-Detection
    

### Architektur

```text
Workspace change
 → incremental analysis scheduler
 → analyzers
 → diagnostics registry
 → UI projections
```

### Komponenten

```text
DiagnosticCoordinator
 ├─ SchemaValidator
 ├─ ConflictAnalyzer
 ├─ BoundaryAnalyzer
 ├─ EncodingAnalyzer
 ├─ EngineCapabilityAnalyzer
 └─ ProjectConsistencyAnalyzer
```

### Wichtig

Die Diagnostik darf **inkrementell** sein.  
Nicht bei jedem Tastendruck alles neu rechnen.

### Pipeline

```text
edit event
 → debounce
 → analyze changed snippet
 → analyze affected neighbors
 → update diagnostics graph
```

---

## 5. Preview / Simulation Engine

Aktuell ist Preview nur „Body zurückgeben“. Das ist für eine IDE zu wenig.

Eine richtige IDE braucht **Simulationsebenen**:

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

```text
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

Die IDE braucht eine **Build-Achse**.

Nicht:

```text
Save = Datei schreiben
```

sondern:

```text
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

```text
Workspace IR
 → Export Planner
 → Engine Artifact Graph
 → Diff Renderer
 → Apply Executor
 → Post-Apply Verification
```

### Components

```text
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

```ts
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

Die UI sollte **nicht** wild `core` importieren und selbst alles rechnen.  
Besser:

```text
UI
 ↕
IDE Application Service
 ↕
Workspace / Diagnostics / Export Services
 ↕
Core + Adapters
```

## Application Layer

```text
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

```text
.local workspace state
+
import/export to engine
```

Nicht sofort bidirektionale Live-Synchronisation erzwingen.  
Sonst baust du zuerst Synchronisationshölle und erst danach Produkt.

---

# Event-Modell der IDE

Für so ein Tool lohnt ein sauberes Event-System:

```text
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
Nur **interne Erweiterungspunkte** definieren.

---

# Empfohlene Repo-Struktur

```text
packages/
  core/                  # IR, analyzers, export model
  adapter-espanso/       # espanso runtime + artifact generation
  cli/                   # commands + daemon bootstrap
  ide-app/               # application services / workspace orchestration
  ui/                    # workbench + panels + editors
  contracts/             # shared typed contracts / schemas
  test-e2e/              # browser / daemon / apply tests
```

## Warum `ide-app`?

Weil `ui` nicht direkt Business-Logik tragen sollte.

**Faustregel:**

- `core` = domänische Wahrheit
    
- `ide-app` = Anwendungsfluss
    
- `ui` = Darstellung + Interaktion
    
- `adapter-*` = Engine-Wirklichkeit
    

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

```text
open → edit → diagnose → preview → diff → apply
```

Alles andere ist nachgeordnet.

---

# Mein konkreter Architekturvorschlag in einem Satz

> Baue `snippet-engine-control` als **domänenspezifische Snippet-IDE** mit `core` als semantischem Motor, `ide-app` als Orchestrierungsschicht, `ui` als Workbench, `adapter-espanso` als Engine-Brücke und strikt getrenntem `save`- vs.-`apply`-Modell.

---

# Essenz

**Hebel:** Trenne sauber zwischen **Darstellung**, **Anwendungsfluss**, **Domänenlogik** und **Engine-Ausführung**.  
**Entscheidung:** Nicht „mehr Editor“, sondern **richtige Snippet-IDE mit Workspace-Modell**.  
**Nächste Aktion:** Ich würde als erstes `ide-app` + `Workspace` + `stableId/revisionId` + `save/apply`-Trennung festziehen.

**Unsicherheitsgrad:** 0.19  
Ursachen: Build-/Packaging-Details, tatsächliche Fingerprint-Logik und langfristige Produktziele sind nicht vollständig belegt.

**Interpolationsgrad:** 0.24  
Hauptannahmen: Du willst wirklich ein Produkt und nicht nur ein Entwicklerwerkzeug; Undo/History/Workspace werden später wichtig; Pluginfähigkeit soll vorbereitet, aber nicht sofort gebaut werden.

Trockener Humor: Eine IDE ohne Workspace-Modell ist wie ein Krankenhaus mit sehr guten Stiften. Man kann viel notieren, aber die Operation wird unerquicklich.