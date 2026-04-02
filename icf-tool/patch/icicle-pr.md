## Dialektische Erörterung

### These

Icicle ist die „beste“ Hierarchie-Alternative, weil sie **strukturtreu** ist und gleichzeitig **Kontext zeigt** (Focus+Context). Für ICF (klarer Parent/Child-Baum) passt das hervorragend.

### Antithese

Icicle scheitert oft an zwei Dingen:

1. zu viel Tiefe → visueller Wald
    
2. komplizierte D3-Layouts → fragil, schwer wartbar
    

### Synthese

Du baust eine **deterministische Mini-Icicle** ohne D3:

- nur Teilbaum rund um `selectedCode`
    
- maximal 4 Ebenen
    
- simple, berechenbare Balkenbreiten
    
- Klick = Fokus / Auswahl
    

Damit bekommst du „seidenglatt“ statt „DataViz-Kunstprojekt“.

---

# PR-Erstellungsprompt (Icicle-View, <150 LoC möglich)

Baut auf der view-lens PR auf.

---

Title  
Add IcicleView lens (focus+context hierarchy) with deterministic layout

Summary  
This PR adds a new navigation lens: **IcicleView**.

IcicleView provides a **focus-plus-context** representation of the ICF hierarchy without deep scrolling and without introducing complex visualization dependencies.

The implementation is intentionally simple and deterministic:

- shows a limited hierarchy slice (max 4 levels)
    
- uses straightforward proportional bar widths
    
- clicking a bar selects/focuses a code
    
- detail panel continues to be driven by `selectedCode`
    

This PR is designed to be maintainable and "frictionless", not an experimental data viz.

---

Design Principles

IcicleView must be:

1. deterministic (no force simulations)
    
2. bounded (no full-tree render)
    
3. structure-true (only parent/child relations)
    
4. consistent with existing navigation state
    

---

State Integration

IcicleView uses:

- `state.selectedCode` as current focus
    
- `state.viewLens === "icicle"` to activate
    

Add local Icicle state:

```id="i_state"
icicleFocusCode: string | null
```

Default:

- if `icicleFocusCode` is null, use `selectedCode`
    
- if `selectedCode` is null, start at root
    

Focus is purely visual; selection continues to drive details.

---

Files Added

```id="files"
src/app/views/IcicleView.js
src/app/icicle/buildSlice.js
src/app/icicle/renderIcicle.js
```

Responsibilities:

buildSlice.js  
→ compute the limited hierarchy slice around focus

renderIcicle.js  
→ render slice to DOM (div-based bars)

IcicleView.js  
→ integration & event handling

---

Hierarchy Slice Logic

We do NOT render the entire ICF tree.

Instead we render a bounded slice:

- show the ancestor path (breadcrumb levels)
    
- show children at each level
    
- show up to 4 levels total (including focus level)
    

Algorithm:

1. compute ancestors of focusCode (root → ... → focus)
    
2. determine start level so that focus is visible within 4 levels
    
3. for each displayed level:
    
    - list sibling nodes at that level (or children of the chosen parent)
        
    - highlight the node on the focus path
        

Depth limit:

```id="depth"
MAX_LEVELS = 4
```

---

Layout Strategy (Div-based Icicle)

Each level is one row.

Each row contains bars for nodes at that level.

Bar width is proportional to the node's subtree size (number of descendants) OR, if that is too expensive, proportional to number of direct children.

Choose a deterministic approach:

Option A (preferred):

- precompute `subtreeSize[node]` once during data load
    

Option B (fallback):

- use `childCount` as bar width proxy
    

Implementation must remain fast and simple.

---

Rendering Details

Render structure:

```id="dom"
<div class="icicle">
  <div class="icicle-level" data-level="0">
    <button class="icicle-bar" data-code="b1">Mentale Funktionen</button>
    ...
  </div>
  <div class="icicle-level" data-level="1"> ... </div>
</div>
```

Each bar shows:

- short label (title)
    
- optional code on hover/title attribute
    

---

Interaction

Click on a bar:

- sets `icicleFocusCode` to clicked code (for navigation)
    
- also selects that code for details:
    

```id="click"
dispatch({ type: "NAV/SELECT_CODE", code })
```

Secondary interaction:

- clicking the already-selected focus bar toggles "zoom":
    
    - if bar is on focus path, zoom into it (focus = that bar)
        
    - if bar is ancestor, focus = that ancestor
        

Add a small "Up" breadcrumb button to move focus to parent.

---

Styling

Add minimal CSS:

- rows stacked vertically
    
- bars with small padding
    
- selected path highlighted
    
- hover effect
    
- ensure mobile works via horizontal scroll if needed
    

No complex theming added in this PR.

---

Performance

Requirements:

- no full-tree DOM render
    
- max bars per level can be limited (optional):
    
    - if a level has > N nodes, show "More…" or collapse to categories
        
    - for initial PR, keep it simple and rely on the fact that only a slice is rendered
        

Expected runtime:

- buildSlice: O(depth + siblings + children) bounded
    
- render: bounded by visible bars
    

---

Testing (Manual Acceptance)

1. Select a code in Tree view
    
2. Switch to Icicle view → focus shows correct hierarchy context
    
3. Click a sibling/child bar → selection updates, detail panel updates
    
4. Click breadcrumb/up → focus moves to parent
    
5. Switch back to Tree/Graph → selectedCode preserved
    

---

Acceptance Criteria

- A new "Icicle" option exists in the view selector.
    
- IcicleView renders a focus+context hierarchy slice.
    
- Clicking bars updates `selectedCode` and detail panel.
    
- IcicleView never renders the full tree (bounded depth).
    
- Default behavior requires no user configuration.
    

---

Out of Scope

Not included:

- D3 hierarchical layout
    
- animated transitions
    
- global zoom history
    
- multi-panel combos
    

Those can be added later if needed, but this PR focuses on stability and maintainability.

---

Why this design?

ICF is a strict hierarchy; users mainly need:

- where am I in the hierarchy?
    
- what is adjacent at this level?
    
- what are the children?
    

IcicleView answers these with minimal UI and minimal code.

---

# Implementationshinweise (damit es wirklich <150 LoC bleibt)

**Der Trick**: keine Subtree-Größen berechnen, wenn du es nicht brauchst.

Minimal-Variante:

- Barbreite = `minWidth + k * childCount`
    
- und `flex-grow` nutzen
    

Damit bekommst du eine visuell brauchbare Icicle ohne Vorberechnungen.

Wenn du später echte Subtree-Sizes willst, kannst du sie einmalig beim Laden von `icf.json` berechnen (Memoization).

---

# Risiko- und Nutzenabschätzung

## Nutzen

- Hierarchieorientierung ohne Baumscroll
    
- sehr wartbar
    
- keine D3-Abhängigkeit
    

## Risiken

- bei Ebenen mit vielen Geschwistern kann es unruhig werden  
    → Mit `MAX_BARS_PER_LEVEL` (optional) später entschärfen.
    

Prämisse: Icicle ist eine **Lupenansicht**, nicht ein Vollständigkeits-Viewer.

---

# Epistemische Leere

- Es fehlt: Verteilung der sibling counts im ICF-Datensatz (welche Ebenen sind breit?). Nötig, um `MAX_BARS_PER_LEVEL` sinnvoll zu setzen.
    

---

# Für Dummies

Baum ist wie Ordner anklicken.

Icicle ist wie ein Regal mit Etiketten auf jeder Ebene – du siehst gleichzeitig, wo du stehst und was daneben liegt.

---

# Humor

D3 ist großartig, wenn man eine Doktorarbeit über Balken schreiben will. Für ein seidenglattes Tool ist „div + flex“ oft die erwachsenere Form von Magie.

---

# Unsicherheitsgrad / Interpolationsgrad

- **Unsicherheitsgrad:** 0.18  
    Ursache: Breite der Ebenen (sibling counts) nicht empirisch geprüft.
    
- **Interpolationsgrad:** 0.12  
    Annahmen: Teilbaum-Slice + Flex-Layout genügt als erste Version.
    

---

## Essenz

Die Icicle-PR sollte genau das liefern:

- **bounded slice**
    
- **deterministische Balken**
    
- **klickbar**
    
- **selectedCode treibt alles**
    

Kein D3, kein Full-Tree, kein Drama.

Wenn du magst, schreibe ich dir als Nächstes noch einen dritten Prompt für **„Ansicht wechseln“-UI + Persistenz** (localStorage), damit Nutzer ihre bevorzugte Linse behalten – ohne den Meta-Layer zu belasten.