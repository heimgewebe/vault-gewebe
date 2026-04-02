## Dialektische Erörterung

### These

„Ansicht wechseln“ ist nur dann seidenglatt, wenn die Auswahl **immer erreichbar**, **sofort wirksam** und **persistiert** ist. Sonst ist es ein Spielzeugknopf.

### Antithese

Persistenz kann stören: Wenn jemand einmal „Graph“ ausprobiert, später zurückkommt und überrascht wird („Warum sieht das anders aus?“), erzeugt das Friktion.

### Synthese

Persistiere **die Linse**, aber mit zwei Sicherungen:

1. Default bleibt **Tree** (konservativ)
    
2. Persistenz gilt **pro Gerät/Browser** (localStorage) und wird im Meta-Layer zurücksetzbar
    

Damit ist es „glatt“ und kontrollierbar.

---

# PR-Erstellungsprompt: View Switcher UI + Persistenz

Baut auf der view-lens PR auf (State `viewLens` existiert bereits).

---

Title  
Add “View” selector UI and persist navigation lens (tree/graph/icicle) via localStorage

Summary  
This PR adds a compact **View selector** to the main UI, enabling users to switch between navigation lenses:

- Tree
    
- Graph
    
- Icicle
    

The selected lens is **persisted locally** (localStorage) so the UI feels consistent across sessions.

The existing meta/settings layer remains the place for advanced configuration and reset controls. The main layer stays clean.

---

Goals

1. Provide a frictionless way to switch navigation lenses
    
2. Ensure switching does not disrupt the current workflow (`selectedCode` stays stable)
    
3. Persist user choice across sessions without introducing UI clutter
    
4. Provide a reset path via the meta/settings layer
    

---

UI Changes

Add a "View" control to the top bar.

Requirements:

- visible on desktop
    
- minimal footprint on mobile
    

Desktop layout:

```id="ui1"
[ View ▾ ]
```

Dropdown items:

```id="ui2"
Tree
Graph
Icicle
```

Mobile layout:

- same control, but as an icon button (e.g. “eye” / “layers”) with a small label "View" if space allows
    

---

State & Persistence

State key:

```id="state"
viewLens: "tree" | "graph" | "icicle"
```

Persistence key:

```id="ls_key"
icfTool.viewLens
```

Initialization:

- on app startup, read localStorage
    
- validate value is one of the allowed lenses
    
- fallback to "tree" if invalid/missing
    

Pseudo:

```id="init"
const saved = localStorage.getItem("icfTool.viewLens")
if (saved in ["tree","graph","icicle"]) viewLens = saved
else viewLens = "tree"
```

On lens change:

- update state
    
- write localStorage
    

```id="persist"
localStorage.setItem("icfTool.viewLens", lens)
```

---

No Surprise Rule (Safety)

To prevent “I forgot I was in Graph” confusion:

Option A (recommended, minimal):

- keep Tree as default when there is no saved preference
    

Option B (optional, later):

- show a subtle one-time hint in the meta-layer: “Current view: Graph” (NOT a main-layer toast)
    

This PR implements Option A only.

---

Files / Modules

Add a small module:

```id="files"
src/app/ui/viewLens.js
```

Exports:

- `loadViewLens()`
    
- `saveViewLens(lens)`
    
- `isValidLens(value)`
    

Integrate into app bootstrap (likely `src/app/app.js`).

Add UI component:

```id="comp"
src/app/views/ViewSelector.js
```

Responsibilities:

- render dropdown
    
- handle click
    
- dispatch `UI/SET_VIEW_LENS`
    
- reflect current lens
    

---

Reducer / Actions

Add action:

```id="action"
{ type: "UI/SET_VIEW_LENS", lens }
```

Reducer updates:

- `state.viewLens = lens`
    

Add side-effect hook:

- when state.viewLens changes, call `saveViewLens(lens)`
    

If the architecture avoids side effects in reducers, implement persistence in the app-level dispatch wrapper or a small subscription.

---

Behavioral Requirements

1. Switching view does not alter `selectedCode`.
    
2. Switching view triggers a rerender of the navigation panel only.
    
3. When app reloads, last lens is restored (if valid).
    
4. If localStorage contains invalid value, fallback to Tree.
    

---

Meta Layer Integration (Reset)

Add a simple control in the settings/meta layer:

- "Reset view preference" button
    

Behavior:

- remove localStorage key `icfTool.viewLens`
    
- set lens back to Tree
    

This keeps main layer uncluttered and aligns with the project rule: configuration belongs to layer 1.

---

Testing

Manual test cases:

1. Change lens → reload page → lens restored
    
2. Select code in Tree → switch lens → detail remains on same code
    
3. Clear localStorage → reload → Tree default
    
4. Put invalid value in localStorage → reload → Tree default
    
5. Use settings/meta reset → reload → Tree default
    

---

Acceptance Criteria

- A View selector exists in the main UI topbar.
    
- View selection changes navigation lens immediately.
    
- Lens persists via localStorage.
    
- Default is Tree when no preference exists.
    
- Preference can be reset from the meta/settings layer.
    
- No additional clutter is introduced in the main layer.
    

---

Out of Scope

- per-activity lens preferences
    
- split view persistence
    
- analytics/telemetry
    

This PR is intentionally minimal and strictly UX-driven.

---

# Risiko- und Nutzenabschätzung

## Nutzenklassen

- Konsistenz: Nutzer kommen zurück und sehen „ihre“ Linse
    
- Geschwindigkeit: 1 Klick statt Umwege
    
- Wartbarkeit: klarer State, klarer Persistenz-Key
    

## Risikoklassen

- „Überraschung“ nach langer Pause  
    → abgefedert durch Default Tree und Reset im Meta-Layer
    

Prämissencheck: Persistenz lohnt, wenn Nutzer wiederkehren (typisch) und wenn die Linse eine echte Arbeitspräferenz ist (ja, weil „Baum vs Graph“ Denkstil ist).

---

# Epistemische Leere

- Es fehlt: ob du bereits andere localStorage Keys verwendest und wie sie benannt sind. Nötig, um Key-Namenskonventionen exakt einzuhalten.
    

---

# Für Dummies

Das ist wie „Ansicht: Liste / Kacheln“ im Dateimanager. Du willst nicht jedes Mal neu einstellen, wie du gucken willst.

---

# Humor

localStorage ist die Schublade, in die Nutzer ihre Brille legen. Du willst nur verhindern, dass sie nach drei Monaten die Taucherbrille aufsetzen und sich wundern, warum alles so… blau wirkt.

---

# Unsicherheitsgrad / Interpolationsgrad

- **Unsicherheitsgrad:** 0.16  
    Ursache: bestehende Persistenzkonventionen im Repo nicht explizit geprüft.
    
- **Interpolationsgrad:** 0.11  
    Annahmen: localStorage ist bereits akzeptiert (du speicherst schon andere Dinge lokal) und Meta-Layer hat einen Settings-Bereich.
    

---

## Essenz

PR liefert:

- View-Button
    
- `viewLens`-Persistenz
    
- Reset im Meta-Layer
    
- Null Workflow-Bruch (`selectedCode` bleibt)
    

Wenn du willst, schreibe ich dir als nächstes einen **kompakten PR-Prompt für „Split layout“** (Explorer + Detail fix), aber nur falls du das wirklich brauchst – sonst ist es Feature-Wuchs wie Efeu am Altbau.