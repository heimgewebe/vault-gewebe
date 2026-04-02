## Dialektische Erörterung

### These

Der **Meta-Layer (Layer 1)** muss alle „steuernden“ Elemente aufnehmen: Einstellungen, Aktivität, personenbezogene Daten. Dadurch bleibt der Hauptlayer radikal klar und arbeitsorientiert.

### Antithese

Ein Meta-Layer wird oft zum „Einstellungsfriedhof“:  
zu viele Optionen → kognitive Reibung → Nutzer verstehen das System nicht mehr.

### Synthese

Der Meta-Layer wird **kein Settings-Menü**, sondern eine **Arbeits-Konsole** mit exakt vier Blöcken:

1. **Aktivität**
    
2. **Person / Kontext**
    
3. **Ansicht & Layout**
    
4. **System**
    

Alles andere bleibt draußen.

Regel:

> Wenn ein Element nicht direkt das Arbeiten mit ICF verändert → gehört es nicht hinein.

---

# PR-Erstellungsprompt

## Meta-Layer Settings UX

---

Title  
Introduce structured Meta Layer (Activity / Person / View / System)

Summary

This PR introduces a structured **Meta Layer UI** that contains all configuration and contextual controls for the ICF tool.

The main workspace remains dedicated to **navigation and evaluation**, while the Meta Layer handles:

- activity context
    
- person data
    
- view preferences
    
- system resets
    

The goal is to maintain a **frictionless main interface** while keeping all necessary configuration accessible.

---

Meta Layer Principles

1. Configuration must never clutter the main workspace.
    
2. The Meta Layer should feel like a **control surface**, not a settings page.
    
3. Every section must directly influence the working context.
    
4. No speculative or decorative options.
    

---

Structure

The Meta Layer contains four sections:

```text
Activity
Person
View & Layout
System
```

Each section is collapsible.

Default state: collapsed.

---

Activity Section

Purpose:

Define the context of the evaluation session.

Fields:

```text
Activity name
Activity description (optional)
Date / session
```

Example:

```text
Activity: Writing task
Context: classroom
```

The selected activity may influence which ICF domains are suggested or highlighted.

---

Person Section

Purpose:

Attach observations to a specific individual.

Fields:

```text
Name
Birth year (optional)
Notes
```

Privacy rule:

- data stored locally
    
- no external transmission
    

Implementation note:

Store data in:

```text
localStorage.icfTool.personContext
```

---

View & Layout Section

Central control point for UI behaviour.

Controls:

```text
Navigation view
  Tree
  Graph
  Icicle

Layout
  Auto
  Split
  Stacked
```

Buttons:

```text
Reset view preference
Reset layout preference
```

These interact with the existing persistence logic.

---

System Section

Minimal maintenance tools.

Controls:

```text
Reset all local preferences
Clear session data
```

This includes:

- viewLens
    
- layoutMode
    
- person context
    
- activity context
    

Implementation:

```text
localStorage.removeItem("icfTool.*")
```

Use explicit key list rather than wildcard removal.

---

UI Layout

Meta Layer opens as a **side drawer** or **overlay panel**.

Example structure:

```html
<div class="meta-layer">

<section>
<h3>Activity</h3>
...
</section>

<section>
<h3>Person</h3>
...
</section>

<section>
<h3>View & Layout</h3>
...
</section>

<section>
<h3>System</h3>
...
</section>

</div>
```

---

Trigger

Meta Layer is opened via:

```text
Top bar button: "Settings"
```

Icon suggestion:

```text
⚙
```

The drawer slides in from the right side.

---

Persistence Keys

```text
icfTool.viewLens
icfTool.layoutMode
icfTool.personContext
icfTool.activityContext
```

All values must be validated before use.

Fallback behaviour must always exist.

---

UX Safeguards

To prevent configuration overload:

1. sections collapsed by default
    
2. only one section expanded at a time
    
3. reset buttons require confirmation
    

Example:

```text
Reset all preferences?
[Cancel] [Reset]
```

---

Accessibility

Requirements:

- keyboard accessible
    
- ESC closes the panel
    
- focus trap while open
    

---

Testing

Manual checks:

1. Open meta layer → sections render correctly
    
2. Change view lens → navigation updates
    
3. Change layout → workspace layout updates
    
4. Add person context → persists after reload
    
5. Reset preferences → state cleared
    

---

Acceptance Criteria

- Meta Layer exists as a separate control surface.
    
- Main workspace remains free of configuration elements.
    
- All existing UI preferences are controlled here.
    
- Settings persist across sessions.
    
- Reset tools function correctly.
    

---

Out of Scope

- cloud sync
    
- user accounts
    
- multi-session history
    

The Meta Layer is intentionally minimal and local-first.

---

# UX-Bewertung des Gesamtsystems

Mit allen bisherigen PRs ergibt sich:

```
META LAYER
(Activity / Person / View / System)

MAIN WORKSPACE
Search
Navigation Lens (Tree / Graph / Icicle)
Detail Panel
```

Das ist ein **sauberes 2-Layer-Modell**.

---

# Alternative Sinnachse

Statt „Tool zum Durchklicken von Codes“ wird das System damit:

> ein **Arbeitsraum für Beobachtungen**.

Die Navigation (Tree/Graph/Icicle) wird nur das **Instrument**.

Das eigentliche Ziel ist:

```
Beobachtung → Einordnung → Dokumentation
```

---

# Risiko- und Nutzenabschätzung

## Nutzenklassen

**kognitiv**

- klare Trennung Kontext / Arbeit
    

**UX**

- Hauptlayer bleibt minimal
    

**architektonisch**

- UI-State sauber gekapselt
    

---

## Risiken

**Feature creep**

Meta-Layer könnte wachsen.

Gegenmaßnahme:

> Neue Option nur zulassen, wenn sie Arbeitskontext verändert.

---

# Typische Fehlannahme

Viele Tools versuchen:

```
Navigation + Bewertung + Settings
auf einer Oberfläche
```

Ergebnis:

UI-Chaos.

Die **Layer-Trennung** verhindert das.

---

# Für Dummies

Der Meta-Layer ist wie der Regieraum im Theater.  
Dort stellst du Licht, Bühne und Rollen ein.

Auf der Bühne selbst willst du nur eines sehen:

> das Stück.

---

# Humor

Ein gutes UI ist wie ein gutes Orchester:  
Wenn du während des Konzerts anfangen musst, nach der Lautstärkeregelung zu suchen, war der Dirigent vermutlich ein Frontend-Entwickler.

---

# Unsicherheitsgrad

0.19

Ursachen:

- tatsächliche Nutzerinteraktion unbekannt
    
- reale ICF-Workflows nicht empirisch getestet
    

---

# Interpolationsgrad

0.14

Annahmen:

- Nutzung erfolgt sitzend am Desktop (pädagogische Dokumentation)
    
- lokale Persistenz ausreichend
    

---

# Essenz

Das ideale Navigationssystem für dein Tool lautet:

```
Layer 1 (Meta)
Aktivität
Person
Ansicht
System

Layer 2 (Workspace)
Search
Navigation Lens
Detail Panel
```

Damit entsteht genau das, was du wolltest:

> ein **seidenglattes Werkzeug**, bei dem jedes Element fehlen würde, wenn es nicht da wäre.

---

Wenn du möchtest, kann ich dir noch etwas extrem Wertvolles zeigen:

**Eine überraschend starke UX-Idee für dein Tool, die kaum jemand nutzt — aber perfekt zu ICF passt.**

Sie würde die Navigation nochmal deutlich intelligenter machen.