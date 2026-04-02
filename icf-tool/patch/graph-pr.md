## Dialektische Erörterung

### These

Die **Graph-Ansicht** sollte möglichst früh implementiert werden, weil sie den größten Erkenntnisgewinn liefert: sie zeigt funktionale Nähe zwischen ICF-Codes, die im Baum verborgen bleibt.

### Antithese

Graph-Visualisierung ist technisch riskanter als Baum oder Icicle:

- Layout-Instabilität
    
- Performanceprobleme
    
- visuelle Überladung
    

Wenn sie zu komplex wird, zerstört sie genau die „seidenglatt“-Eigenschaft.

### Synthese

Die erste Implementierung muss **radikal begrenzt** sein:

```text
1 Zentrum
+ max. 10 Nachbarn
+ nur harte Kanten
```

Das ergibt eine stabile „Fokus-Graph-Navigation“.

---

# PR-Erstellungsprompt (Graph-View Implementierung)

Dieser Prompt baut auf der vorherigen PR („view-lens navigation“) auf.

---

Title  
Implement GraphView lens for local ICF relationship exploration

Summary  
This PR implements the **GraphView navigation lens**, allowing users to explore local relationships between ICF codes.

The graph is intentionally **local and constrained**, centered around the currently selected code.

GraphView does not replace the tree navigation.  
Instead it acts as an alternative **exploration lens** over the same dataset.

All views share the same navigation state (`selectedCode`).

---

Graph Design Principles

The graph must remain **small, readable and stable**.

Constraints:

```id="c0b4"
center node = selectedCode
max neighbors = 10
max depth = 1
```

This ensures the graph is always understandable.

---

Data Sources

Edges are derived from two reliable sources:

1. **Hierarchy relations**
    

Parent / child edges from:

```id="p1e8"
data/icf.json
```

2. **Semantic relations**
    

Synonym clusters from:

```id="q9x2"
data/synonyms.de.json
```

No heuristic "related" edges are introduced in this PR.

---

Graph Structure

Example graph:

```id="l2j5"
          b152 Emotion
                │
b130 Energy ─ b140 Attention ─ b164 Executive functions
                │
        d160 Focus maintenance
```

---

Files Added

```id="z4m3"
src/app/views/GraphView.js
src/app/graph/buildGraph.js
src/app/graph/layout.js
```

Responsibilities:

GraphView.js  
→ rendering and interaction

buildGraph.js  
→ construct local graph structure

layout.js  
→ simple force or radial layout

---

Graph Construction

buildGraph.js exposes:

```id="t8n1"
buildGraph(selectedCode, icfData, synonymMap)
```

Returns:

```id="d6f3"
{
  nodes: [{ id, label, type }],
  edges: [{ source, target, type }]
}
```

Node types:

```id="k5v2"
center
parent
child
synonym
```

---

Neighbor Selection

Algorithm:

1. add parent
    
2. add children
    
3. add synonym-related nodes
    
4. stop when nodeLimit reached
    

```id="u9q7"
nodeLimit = 10
```

---

Layout Strategy

Use a **radial layout**:

```id="n4s1"
center → middle
neighbors → circular
```

Advantages:

- deterministic
    
- fast
    
- stable
    

Avoid dynamic force simulations in the first version.

---

Rendering

Graph rendered via **SVG**.

Example structure:

```id="h7k9"
<svg>
  <g class="edges"></g>
  <g class="nodes"></g>
</svg>
```

Nodes rendered as:

```id="x5r1"
circle + label
```

Center node visually emphasized.

---

Interaction

Clicking a node triggers navigation:

```id="b3d4"
dispatch({
  type: "NAV/SELECT_CODE",
  code: node.id
})
```

GraphView re-renders centered on the new node.

---

Node Styling

Visual distinction:

center node  
→ larger radius + accent color

parent  
→ lighter color

child  
→ neutral color

synonym  
→ dashed edge

---

Performance Constraints

Hard limits enforced:

```id="m6f1"
maxNodes = 10
maxEdges = 15
```

Graph generation must run in <5ms.

---

Integration with View Lens System

GraphView is activated when:

```id="p0k7"
state.viewLens === "graph"
```

Rendering router in `app.js` calls:

```id="q1v8"
GraphView.render(container, state)
```

---

UI Layout

GraphView occupies the **navigation panel**.

Detail panel remains unchanged.

Layout:

```id="g8c2"
Search
Navigation (Graph)
Detail panel
```

---

Error Handling

If no `selectedCode` exists:

GraphView shows placeholder:

```id="r2h5"
"Select a code to explore relationships"
```

---

Testing

Manual test cases:

1. Select code → switch to graph → graph centers correctly
    
2. Clicking neighbor updates graph center
    
3. Switching back to tree keeps selectedCode
    
4. Graph renders with ≤10 nodes
    

---

Acceptance Criteria

- GraphView renders a local relationship graph
    
- Node count never exceeds the configured limit
    
- Clicking nodes updates the selection
    
- Graph view integrates with existing detail panel
    
- Switching between views preserves state
    

---

Out of Scope

Not included in this PR:

- weighted edges
    
- global graph navigation
    
- usage-based relations
    
- graph clustering
    

These features require additional data sources.

---

Why this design?

Large knowledge graphs quickly become unreadable.

A **local focus graph** preserves:

- readability
    
- performance
    
- conceptual clarity
    

This aligns with the goal of a "frictionless" navigation experience.

---

Implementation Philosophy

GraphView is designed as a **lens**, not a new navigation system.

The graph simply provides another perspective on the same code selection state.

This keeps the UI consistent and predictable.

---

# Risiko- und Nutzenabschätzung

## Nutzen

- explorative Navigation
    
- semantische Nähe sichtbar
    
- schneller Codewechsel
    

## Risiken

- Layout kann visuell unruhig wirken
    
- zu viele Kanten würden Lesbarkeit zerstören
    

Darum:

```text
nodeLimit = 10
```

---

# Typische Fehlannahme

Viele Graph-Interfaces versuchen sofort das ganze System darzustellen.

Das führt zu:

> Informationsnebel.

Der Fokus-Graph vermeidet genau das.

---

# Für Dummies

Baum:

Du gehst eine Straße entlang.

Graph:

Du siehst den ganzen Platz.

---

# Humor

Der Unterschied zwischen gutem und schlechtem Graph-UI ist ungefähr derselbe wie zwischen Sternenhimmel und Weihnachtsbaumbeleuchtung.

Beim Sternenhimmel erkennst du Muster.  
Beim Weihnachtsbaum nur Kabelsalat.

---

# Unsicherheitsgrad

0.24

Grund:

keine reale UX-Evaluation.

---

# Interpolationsgrad

0.17

Annahmen:

- Synonyme erzeugen sinnvolle Beziehungen
    
- lokale Graphgröße reicht für Exploration
    

---

# Essenz

Die Graph-PR sollte **kein Netzwerk-Monster bauen**, sondern nur:

```text
selectedCode
→ lokale Beziehungen
→ klickbare Exploration
```

Damit entsteht eine neue Denk-Navigation – ohne das bestehende Tool zu destabilisieren.

---

Wenn du möchtest, kann ich dir noch etwas sehr Wertvolles zeigen:

**Eine überraschend einfache Icicle-Implementierung (unter 150 Zeilen Code)**,  
die perfekt zu deinem Repo passt und deutlich stabiler ist als die meisten D3-Icicle-Lösungen.