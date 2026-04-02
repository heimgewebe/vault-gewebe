## Dialektische Erörterung

### These

Ein **Split-Layout (Explorer + Detail)** macht das Tool „arbeitstauglich“: Kontext bleibt sichtbar, während man bewertet/notiert.

### Antithese

Split kann auf kleinen Screens nerven (zu wenig Platz), und als zusätzliche Option im Hauptlayer kann es „UI-Smog“ erzeugen.

### Synthese

Split wird **keine neue Ansicht**, sondern ein **Layout-Schalter**, der:

- automatisch nach Breakpoints entscheidet (Mobile = stacked)
    
- optional als Einstellung im Meta-Layer persistiert wird
    
- im Hauptlayer nur als minimaler Toggle angeboten wird (oder gar nicht, wenn Auto reicht)
    

Damit bleibt es seidenglatt.

---

# PR-Erstellungsprompt: Split-Layout + Persistenz

Baut auf:

- view-lens State (`viewLens`)
    
- View Selector UI + Persistenz PR
    

und hält die Regel ein: Einstellungen gehören in Layer 1.

---

Title  
Add responsive split layout (Explorer + Detail) with optional persisted preference

Summary  
This PR introduces a **responsive split layout** that keeps the navigation explorer (Tree/Graph/Icicle) visible while working in the detail panel (rating, notes, timeline).

Split is implemented as a **layout preference**, not a new view lens.

- Desktop/tablet: side-by-side (Explorer left, Detail right)
    
- Mobile: stacked (Explorer above Detail) with optional collapsible sections
    
- Preference can be persisted locally and reset from the meta/settings layer
    

The goal is to improve workflow smoothness without increasing conceptual complexity.

---

Design Principles

1. Split is a layout, not a mode and not a lens
    
2. Default behavior must remain simple and unsurprising
    
3. Layout must be responsive and usable on mobile
    
4. All advanced control belongs to the meta/settings layer
    

---

State & Persistence

Add layout state:

```id="state"
layoutMode: "auto" | "split" | "stacked"
```

Defaults:

- `layoutMode = "auto"`
    

Persistence key:

```id="ls"
icfTool.layoutMode
```

Initialization:

- read localStorage
    
- validate value
    
- fallback to "auto"
    

Save on change.

---

Layout Behavior

In "auto":

- if viewport >= BREAKPOINT (e.g. 900px): render split
    
- else: render stacked
    

In "split":

- always split (except extremely narrow screens where we force stacked for safety)
    

In "stacked":

- always stacked
    

Breakpoint is defined in one place (CSS custom property or JS constant) to avoid drift.

---

UI Placement

Main layer:

- NO additional clutter by default
    
- Optional: a small icon toggle near the View selector only when viewport is wide enough
    
    - Tooltip: “Toggle split layout”
        
    - This is purely convenience; not required for controlling layout
        

Meta/settings layer:

- Add a "Layout" section:
    
    - Auto / Split / Stacked
        
    - Reset layout preference button
        

This keeps the main layer clean and aligns with the rule: configuration lives in layer 1.

---

CSS Implementation

Introduce a layout container:

```id="dom"
<div class="workspace" data-layout="split|stacked">
  <aside class="workspace-explorer">...</aside>
  <main class="workspace-detail">...</main>
</div>
```

CSS rules:

- For split:
    
    - `display: grid`
        
    - `grid-template-columns: minmax(280px, 40%) 1fr`
        
    - `gap: var(--space-...)`
        
    - `min-height: 0` for scroll containers
        
- For stacked:
    
    - `display: block` (or `grid-template-columns: 1fr`)
        
    - explorer collapsible optional (not required in this PR)
        

Scrolling:

- Explorer and Detail panels should scroll independently on desktop
    
- On mobile stacked, page scroll is acceptable, but ensure focus/anchors work
    

---

JS Wiring

Add module:

```id="files"
src/app/ui/layoutMode.js
```

Exports:

- `loadLayoutMode()`
    
- `saveLayoutMode(mode)`
    
- `isValidLayoutMode(value)`
    

In app bootstrap:

- initialize `layoutMode`
    

Add actions:

```id="actions"
{ type: "UI/SET_LAYOUT_MODE", mode }
```

A small subscription persists changes.

---

No Surprise Rules

- Default is "auto"
    
- If no preference exists, rely on breakpoint behavior
    
- If forced "split" on a too-small viewport, automatically fall back to stacked and keep user preference unchanged (or show a subtle hint in settings, not a main-layer toast)
    

---

Testing (Manual)

1. Desktop width → split layout active in auto
    
2. Mobile width → stacked layout active in auto
    
3. Force split in settings → desktop stays split; mobile falls back to stacked if too narrow
    
4. Switch view lens (tree/graph/icicle) → layout stays stable
    
5. Reload → layout preference restored
    
6. Reset in settings → layout returns to auto
    

---

Acceptance Criteria

- `layoutMode` exists with values auto/split/stacked
    
- Layout responds to viewport size in auto mode
    
- Split shows Explorer + Detail simultaneously on wide viewports
    
- Stacked works cleanly on mobile
    
- Preference can be changed and reset in meta/settings layer
    
- No significant new clutter in the main layer
    

---

Out of Scope

- complex resizable splitters
    
- drag-to-resize
    
- multi-panel (Graph + Icicle side-by-side)
    
- animations
    

This PR aims for stable, minimal workflow improvement.

---

# Risiko- und Nutzenabschätzung

## Nutzen

- weniger Kontextverlust beim Bewerten/Notieren
    
- weniger Hin- und Her zwischen Navigation und Detail
    
- passt perfekt zur „View lens“-Idee
    

## Risiken

- Scroll-/Height-Bugs in CSS Grid (klassischer Stolperdraht)
    
- Mobile kann zu eng wirken
    

Gegenmaßnahme:

- Default auto
    
- harte Breakpoint-Regeln
    
- keine Resizer im ersten Schritt
    

---

# Epistemische Leere

- Es fehlt: aktuelles CSS/DOM-Layout im Detail (Scrollcontainer-Struktur). Nötig, um Grid-Scroll sauber zu machen, ohne Nebenwirkungen.
    

---

# Für Dummies

Split heißt: links suchst du, rechts arbeitest du. Wie beim Texteditor: Dateibaum links, Datei rechts.

---

# Humor

Split-Layout ist wie zwei Augen: eins behält den Kontext, eins macht die Arbeit. Stacked ist wie mit einem Auge blinzeln – geht auch, aber man stolpert eher über den eigenen Gedankengang.

---

# Unsicherheitsgrad / Interpolationsgrad

- **Unsicherheitsgrad:** 0.20  
    Ursache: CSS-Scroll/Height-Details im aktuellen DOM nicht vollständig auditierbar ohne gezielte Stellen im Dump.
    
- **Interpolationsgrad:** 0.15  
    Annahmen: Meta-Layer hat eine Settings-Sektion; Layoutcontainer kann eingeführt werden ohne größere DOM-Kollision.
    

---

## Essenz

Split ist kein neuer Modus, keine neue Ansicht:

- **LayoutMode (auto/split/stacked)**
    
- Default auto
    
- Steuerung im Meta-Layer
    
- optionaler Quick-Toggle auf Desktop
    

Wenn du willst, kann ich dir als nächstes einen **PR-Prompt für „Meta-Layer Settings UX“** schreiben, der alle neuen Einstellungen (View lens, Layout) sauber und minimal unterbringt.