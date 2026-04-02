## Dialektische Erörterung

**These:** Das Repo enthält bereits die Kernbestandteile eines Produkts:

- Core-Engine (IR, Diagnostik, Export)
    
- Adapter (Espanso)
    
- CLI
    
- Daemon + UI-Editor
    

Damit ist der **technische Kern vorhanden**. Es fehlt vor allem **Produktisierung**: Stabilität, Packaging, UX-Schärfung, reale Workflows.

**Antithese:** Ein funktionierender Stack ist **kein Produkt**.  
Typische Lücken, die ich im Code sehe:

1. **Packaging unsicher** (UI-Assets, CLI distribution).
    
2. **Kein persistenter Write-Back-Workflow** für Engines (nur Plan).
    
3. **Preview nicht engine-realistisch**.
    
4. **Keine E2E-Tests für reale Nutzung**.
    
5. **UI minimalistisch (MVP-Editor)**.
    

Das ist eher ein **Developer Tool Prototype**.

**Synthese:** Der richtige Weg ist **nicht „mehr Features“**, sondern:

> Stabilisierung → Workflow-Vollständigkeit → UX → Distribution.

---

# Zieldefinition (Produktkern)

Minimal brauchbares Produkt:

**Snippet Studio**

Ein Tool, das:

1. Snippets aus Engines laden kann (Espanso zuerst).
    
2. Snippets komfortabel editieren lässt.
    
3. Konflikte/Regeln live prüft.
    
4. echte Expansion simuliert.
    
5. Änderungen sicher zurückschreibt.
    
6. Änderungen diffbar exportiert.
    

---

# Produktplan (in 4 Phasen)

## Phase 1 — Stabilisierung (1–2 Wochen)

Ziel: **„Es läuft zuverlässig.“**

### 1 Packaging fixen

Problem:

```
uiDir = ../../../ui
```

Lösung:

```
packages/ui → dist/ui
packages/cli → dist
```

Build step:

```
ui build → dist/ui
cli serve dist/ui
```

Beispielstruktur:

```
dist/
  cli/
    index.js
    daemon.js
    ui/
      index.html
      app.js
```

---

### 2 E2E Tests

Aktuelle Tests prüfen nur API.

Fehlend:

```
CLI → daemon → UI → API → store → export
```

Testfälle:

```
start daemon
GET /
GET /app.js
POST /preview
PUT /snippets
DELETE /snippets
POST /export/dry-run
```

Werkzeug:

```
playwright
oder
node + fetch
```

---

### 3 Store-Semantik absichern

`fingerprint()` bestimmt IDs.

Testfälle:

```
edit trigger → neue ID
edit body → neue ID
edit constraints → neue ID
```

Verhindern:

```
id recursion
```

---

### 4 Preview stabilisieren

Aktuell:

```
return snippet.body
```

Minimum:

```
simulate:
  variables
  date
  clipboard
  placeholders
```

Sonst wird UI-Preview unbrauchbar.

---

# Phase 2 — Workflow komplett machen (2–3 Wochen)

Ziel: **„User kann echte Arbeit erledigen.“**

### 1 Engine-Writeback

Momentan:

```
export plan
```

Produkt braucht:

```
apply changes
```

Pipeline:

```
UI edit
 → store
 → export plan
 → apply
 → write engine files
```

Für Espanso:

```
match/*.yml
```

---

### 2 Snippet History

Minimum:

```
undo
redo
```

oder

```
snapshot store
```

---

### 3 Import-Stabilität

Espanso Adapter muss können:

```
nested includes
multiple match files
comments preservation
```

---

### 4 Conflict Resolution UI

Diagnostics existieren bereits.

UI fehlt:

```
highlight conflicting snippets
click → jump
```

---

# Phase 3 — UX (2 Wochen)

Ziel: **„Es fühlt sich wie ein Tool an.“**

UI aktuell: Editor + Liste.

Verbesserungen:

### 1 Search

```
trigger search
body search
tag search
```

---

### 2 Tagging

Snippet:

```
tags: ["email","signature"]
```

---

### 3 Multi-cursor editing

Batch:

```
edit trigger prefix
bulk rename
```

---

### 4 Snippet Preview Panel

Nicht nur:

```
preview body
```

sondern:

```
simulate expansion
show placeholders
```

---

# Phase 4 — Distribution (1 Woche)

Ziel: **„User kann es installieren.“**

### CLI Distribution

```
npm install -g sec
```

oder

```
brew install sec
```

---

### Binary Bundles

```
sec-macos
sec-linux
sec-win
```

via:

```
pkg
bun
nexe
```

---

### Start Command

```
sec ui
```

öffnet automatisch Browser.

---

# Architektur-Zielbild

```
CLI
 │
daemon
 │
UI
 │
API
 │
core
 │
adapters
 │
engines
```

Trennung bleibt sauber.

---

# Minimal Product Definition

Version **0.1**

Features:

```
load espanso
edit snippets
live diagnostics
live preview
save snippets
export diff
apply changes
```

Nicht enthalten:

```
multi-engine
plugin system
AI generation
```

---

# Risiken

### Technisch

1. ID-System (fingerprint) könnte schwierig werden.
    
2. Adapter müssen Engines exakt verstehen.
    
3. UI könnte bei großen Snippet-Sets langsam werden.
    

### Produkt

Gefahr:

> zu viel Plattform, zu wenig Editor.

---

# Alternativer Denkpfad

Statt:

**„Snippet-Engine-Control“**

könnte das Produkt sein:

**„Universal Snippet IDE“**

Also:

```
VSCode für Snippets
```

Mit:

```
lint
preview
engine adapters
versioning
```

Das wäre strategisch stärker.

---

# Konkrete nächste Schritte (empfohlen)

**1. UI-Serving fixen**  
Asset-Pfad + Build.

**2. End-to-End Tests schreiben**

**3. Espanso Writeback implementieren**

**4. Preview Engine erweitern**

Das sind die **vier größten Hebel**.

---

# Unsicherheitsgrad

0.21

Ursachen:

- tatsächliches Buildsystem unbekannt
    
- Espanso Adapter Umfang nicht komplett sichtbar
    

---

# Interpolationsgrad

0.18

Annahmen:

- Ziel ist ein echtes Produkt, nicht nur Library.
    

---

# Essenz

Das Repo ist **70 % Engine, 30 % Produkt**.

Der Weg zum benutzbaren Produkt ist:

```
Stabilität
→ Workflow
→ UX
→ Distribution
```

nicht:

```
mehr Features
```

---

Wenn du möchtest, kann ich auch noch:

- eine **Produkt-Roadmap (0.1 → 1.0)** entwickeln
    
- eine **Repo-Refactoring-Strategie** für langfristige Wartbarkeit
    
- oder eine **richtige Snippet-IDE Architektur** entwerfen, die dieses Projekt deutlich stärker macht.