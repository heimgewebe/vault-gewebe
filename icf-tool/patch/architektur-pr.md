## Dialektische Erörterung

### These

Die Änderung sollte **inkrementell** erfolgen: neue Navigationsarchitektur einführen, ohne bestehende Funktionalität (Klassik-Baum + Bewertung) zu brechen.

### Antithese

Ein großer Refactor („UI neu bauen“) wäre technisch sauberer, aber im aktuellen Repo riskant:

- UI-Logik ist verteilt (`src/app/app.js`, `search.js`, `chartManager.js`, `export.js`).
    
- Viele Verifikationsskripte greifen implizit auf bestehende UI-Struktur zu.
    

Ein Big-Bang-Umbau würde Regressionen erzeugen.

### Synthese

Die PR führt **eine neue Navigationsschicht („view lens“) ein**, ohne die bestehenden Views zu entfernen.

Kernidee:

```
selectedCode
+ viewLens
→ bestimmt Darstellung
```

Der Rest der App bleibt unverändert.

---

# PR-Erstellungsprompt

Du kannst diesen Prompt praktisch direkt für Copilot/Jules verwenden.

---

Title  
Introduce view-lens navigation (Tree / Graph / Icicle) with unified code selection state

Summary  
This PR introduces a new **view-lens navigation system** that allows users to switch between different visualizations of the same ICF data:

- Tree (existing classic navigation)
    
- Graph (local relationship exploration)
    
- Icicle (focus+context hierarchy)
    

The core idea is that **navigation and data selection are separated**.  
All views operate on the same central state: `selectedCode`.

This allows the UI to switch perspectives without changing the underlying workflow.

The existing classic navigation remains unchanged and becomes the **Tree view lens**.

---

Architecture Concept

Instead of introducing a second "mode", the UI now supports **multiple lenses** over the same dataset.

```
selectedCode
   ↓
viewLens
   ↓
rendered navigation
```

Available lenses:

- `"tree"`
    
- `"graph"`
    
- `"icicle"`
    

The UI can switch lenses without resetting the workflow.

---

Key Changes

1. Introduce view lens state
    

Add a global UI state variable:

```
viewLens: "tree" | "graph" | "icicle"
```

Default:

```
viewLens = "tree"
```

---

2. Add "View" switcher in top navigation
    

UI element:

```
[View ▼]

Tree
Graph
Icicle
```

Selecting an option triggers:

```
dispatch({ type: "UI/SET_VIEW_LENS", lens })
```

---

3. Extract navigation rendering into modular views
    

Create new files:

```
src/app/views/
  TreeView.js
  GraphView.js
  IcicleView.js
```

Each module exports:

```
render(container, state)
```

---

4. TreeView (existing functionality)
    

TreeView wraps the existing classic navigation logic.

Implementation:

- move existing tree rendering code from `app.js` into `TreeView`
    
- preserve all current behaviour
    
- ensure compatibility with search results
    

No functional changes.

---

5. IcicleView implementation
    

Purpose: show hierarchical context without deep scrolling.

Data source:

```
data/icf.json
```

Rendering rules:

- show up to 4 hierarchy levels
    
- highlight `selectedCode`
    
- clicking a bar triggers:
    

```
dispatch({ type: "NAV/SELECT_CODE", code })
```

Layout:

horizontal stacked bars representing hierarchy depth.

---

6. GraphView implementation
    

Purpose: explore local functional relationships.

Graph rules:

Center node:

```
selectedCode
```

Edges derived from:

1. parent / child relations
    
2. synonym clusters (`synonyms.de.json`)
    

Limit:

```
maxNodes = 10
```

Click behaviour:

```
dispatch({ type: "NAV/SELECT_CODE", code })
```

Graph recenters on the new node.

---

7. Rendering router
    

Modify `src/app/app.js` so navigation rendering depends on the active lens.

Pseudo-logic:

```
switch (state.viewLens) {

  case "tree":
    TreeView.render(container, state)
    break

  case "graph":
    GraphView.render(container, state)
    break

  case "icicle":
    IcicleView.render(container, state)
    break
}
```

---

8. Preserve existing workflow
    

Important invariant:

```
selectedCode → always drives the detail panel
```

This ensures:

- ratings
    
- notes
    
- timeline
    
- export
    

work identically across all views.

---

UI Layout

No structural changes to the main UI.

Layout remains:

```
Search bar
Navigation panel
Detail panel
```

Only the navigation panel content changes based on the lens.

---

Backward Compatibility

The default lens is `"tree"`.

Therefore existing users experience **no behavioural change** unless they switch views.

---

Future Extensions (not part of this PR)

Possible later additions:

- split view (Graph + Icicle toggle)
    
- graph edge weighting based on usage patterns
    
- user-defined clusters
    

These are intentionally excluded to keep this PR minimal.

---

Testing

Verify the following flows:

1. Search → select code → switch view → code remains selected
    
2. Tree → Graph → Icicle transitions maintain context
    
3. Clicking nodes updates detail panel
    
4. Ratings persist when switching lenses
    

---

Acceptance Criteria

- The UI includes a "View" selector.
    
- Tree navigation behaves exactly as before.
    
- Graph and Icicle views render without breaking existing features.
    
- `selectedCode` remains the central navigation state.
    
- All views update the detail panel consistently.
    

---

Why this change?

ICF navigation has two fundamentally different use cases:

1. **Reference navigation** (tree hierarchy)
    
2. **Exploration** (functional relationships)
    

The view-lens system allows both without introducing separate "modes" or duplicating workflows.

---

Implementation Strategy

This PR intentionally introduces only the minimal architecture required to support additional lenses.

The goal is to make future navigation experiments possible **without rewriting the application again**.

---

# Risiko- und Nutzenabschätzung

## Nutzen

- Navigation wird modular
    
- Exploration möglich ohne Workflow-Bruch
    
- Grundlage für spätere UI-Experimente
    

## Risiken

- Graph-Rendering Performance
    
- mögliche UI-State-Inkonsistenzen
    

Begrenzung durch:

```
nodeLimit = 10
```

---

# Unsicherheitsgrad

0.19

Ursachen:

- tatsächliche Graph-Lesbarkeit noch nicht empirisch getestet.
    

---

# Interpolationsgrad

0.14

Annahmen:

- `selectedCode` kann zentraler State bleiben
    
- vorhandene UI lässt sich modularisieren ohne große Konflikte
    

---

# Essenz

Die PR sollte **nicht eine neue Navigation bauen**, sondern **eine Navigationsarchitektur einführen**:

```
viewLens
+
selectedCode
=
alle Ansichten
```

Damit kann dein Tool später problemlos erweitern:

```
Tree
Graph
Icicle
Timeline
Cluster
```

ohne jedes Mal die UI neu zu schreiben.

---

Wenn du willst, kann ich dir zusätzlich noch einen **zweiten PR-Prompt für die Graph-Implementierung selbst** schreiben – der ist deutlich heikler als die Architekturänderung.