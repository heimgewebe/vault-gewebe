## Dialektische Erörterung

### These

Die **beste Navigation für ein ICF-Tool** ist eine **Graph-Navigation** (Beziehungsnetz) kombiniert mit Suche und Detailpanel.

Begründung:

- ICF ist zwar hierarchisch modelliert,
    
- **praktische Diagnostik ist jedoch relational**.
    

Beispiel:

```
Impulsivität
→ Emotion
→ Aufmerksamkeit
→ Exekutive Funktionen
```

Das ist **kein Baum**, sondern ein **Netzwerk von Funktionen**.

---

### Antithese

Graph-Navigation kann schnell unübersichtlich werden:

Probleme:

- visuelle Überlastung
    
- schwer zu steuern
    
- Layout-Chaos
    

Viele Graph-Tools scheitern daran.

---

### Synthese

Die ideale Navigation ist ein **Hybridmodell**:

```
Suche
→ Fokus-Graph
→ Detailpanel
```

Der Graph zeigt **nur lokale Beziehungen**, nicht das ganze System.

---

# Ideale Navigation für dein ICF-Tool

## 1 — Einstieg: Suchfeld

Großes Suchfeld.

```
[ Aufmerksamkeit ]
```

Treffer:

```
b140 Aufmerksamkeit
b164 Höhere kognitive Funktionen
b152 Emotion
```

---

## 2 — Fokus-Graph

Wenn ein Code ausgewählt wird:

```
            b152 Emotion
                 │
b130 Energie ─ b140 Aufmerksamkeit ─ b164 Exekutive Funktionen
                 │
          d160 Fokus halten
```

Das zeigt:

- Nachbarn
    
- Zusammenhänge
    
- funktionale Nähe
    

Der Nutzer sieht sofort:

> Aufmerksamkeit hängt mit Emotion und Exekutivfunktionen zusammen.

---

## 3 — Detailpanel

Rechts:

```
b140 Aufmerksamkeit
-------------------

Beschreibung

Beispiele

Beobachtung

Timeline
```

---

# Navigation in der Praxis

User flow:

```
Suche
↓
Graph-Fokus
↓
Detail
```

Der Graph bleibt immer sichtbar.

---

# Warum das für ICF ideal ist

ICF-Codes sind in Realität:

- **funktional gekoppelt**
    
- **kontextabhängig**
    

Beispiel:

```
Emotion ↔ Aufmerksamkeit
```

Baum kann diese Beziehungen **nicht darstellen**.

Graph kann es.

---

# Integration mit deiner bestehenden Architektur

Im Repo existiert bereits:

```
chartManager.js
```

Das ist ein guter Einstiegspunkt für Graph-Visualisierung.

---

Die Daten liegen bereits strukturiert vor:

```
data/icf.json
```

Das kann relativ einfach in Graphkanten umgewandelt werden.

---

# Minimales Graphmodell

Nodes:

```
ICF codes
```

Edges:

```
parent
related
synonym
```

Beispiel:

```
b140 → parent → b1
b140 → related → b164
b140 → synonym → Konzentration
```

---

# UI-Layout

Optimal wäre:

```
┌──────────────────────────────┐
│            Suche             │
└──────────────────────────────┘

┌───────────────┬──────────────┐
│               │              │
│    Graph      │   Detail     │
│               │              │
│               │              │
└───────────────┴──────────────┘
```

---

# Bonusfunktion (sehr mächtig)

**Problem-Graph**

User klickt:

```
Impulsivität
```

Graph zeigt:

```
Emotion
Aufmerksamkeit
Selbstregulation
Exekutive Funktionen
```

Das ist für Diagnostik extrem hilfreich.

---

# Alternative Sinnachse (wichtige Denkbewegung)

Vielleicht sollte Navigation **gar nicht codezentriert sein**.

Stattdessen:

```
Kind beobachten
↓
Eigenschaften auswählen
↓
ICF Codes entstehen automatisch
```

Beispiel:

User klickt:

```
Impulsiv
unruhig
unterbricht andere
```

Tool schlägt vor:

```
b152 Emotion
b164 Exekutive Funktionen
```

Das wäre eine **diagnostische Navigation** statt Klassifikationsnavigation.

---

# Resonanzprüfung

### Interpretation A

ICF-Tool = Klassifikationsbrowser.

### Interpretation B

ICF-Tool = Diagnostisches Denkwerkzeug.

Wenn B stimmt, ist Graph-Navigation deutlich stärker.

---

# Typische Fehlannahme

Viele denken:

> Navigation muss der Datenstruktur folgen.

Das stimmt selten.

Navigation sollte der **Denkstruktur der Nutzer** folgen.

---

# Risikoanalyse

## Risiko

Graph-UI kann kompliziert werden.

## Gegenmaßnahme

Graph immer **lokal begrenzen**:

```
1 Code + 8 Nachbarn
```

---

# Für Dummies

Stell dir ICF wie ein Spinnennetz vor.

Baum:

Du läufst nur entlang eines Fadens.

Graph:

Du siehst das ganze Netz.

---

# Humor

Der klassische ICF-Baum ist ein bisschen wie ein Telefonbuch.

Sehr systematisch.

Aber wenn du wissen willst, warum ein Kind heute impulsiv war,  
hilft dir ein Telefonbuch ungefähr so viel wie eine Landkarte des Mondes.

---

# Unsicherheitsgrad

0.31

Ursachen:

- keine Nutzungsdaten
    
- Graphbeziehungen müssten teilweise heuristisch erzeugt werden
    

---

# Interpolationsgrad

0.34

Annahmen:

- diagnostische Nutzung
    
- funktionale Beziehungen zwischen Codes
    

---

# Essenz

Die wahrscheinlich **beste Navigation für dein Tool** wäre:

```
Suche
+
Fokus-Graph
+
Detailpanel
```

Optional zusätzlich:

```
Cluster-Startseite
```

---

Wenn du möchtest, kann ich dir noch etwas sehr Nützliches zeigen:

**Eine konkrete UI-Architektur (inkl. Komponentenstruktur)**  
für dein Repo — so, dass du sie direkt implementieren kannst.