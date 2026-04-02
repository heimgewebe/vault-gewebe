## Dialektische Erörterung

### These

Navigation im ICF-Tool erfolgt über **Struktur** (Baum, Graph, Icicle).  
Das entspricht der Logik des Klassifikationssystems.

### Antithese

Menschen arbeiten selten strukturell.  
Sie denken:

> „Ich beobachte **etwas** – wo gehört das hin?“

Das ist **phänomenologisch**, nicht hierarchisch.

Beispiel:

> „Kind verliert beim Schreiben ständig den Fokus“

Der Nutzer denkt nicht:  
`b140 Aufmerksamkeit`.

Er denkt:  
**„Konzentration / Fokus / Ablenkung“**

### Synthese

Das Tool braucht eine zweite Navigationslogik:

> **Phänomen-Navigation**

Nicht:

```
ICF → Beobachtung
```

sondern:

```
Beobachtung → ICF
```

Das verändert UX fundamental.

---

# Die UX-Idee: **Beobachtungs-Navigator**

Ein zusätzlicher Einstieg:

```
Start Bewertung
│
├ Klassik-Modus
└ Beobachtungs-Modus
```

---

# Kernidee

Statt Code zu suchen:

Der Nutzer beschreibt **Beobachtungen**.

Beispiel:

```
Schwierigkeiten mit Aufmerksamkeit
```

Das Tool zeigt:

```
b140 Aufmerksamkeit
b164 Exekutive Funktionen
d160 Fokus aufrechterhalten
```

Nicht als Liste, sondern als **Clusterkarte**.

---

# Warum das zu ICF passt

ICF ist eine **funktionale Klassifikation**, keine Diagnoseliste.

Beobachtungen sind:

```
Phänomen → Funktion → Teilhabe
```

Genau diese Brücke fehlt in vielen Tools.

---

# UX-Konzept

## Beobachtungsmodus

Interface:

```
Was beobachtest du?

[ Freitext ]
```

Darunter:

```
Vorschläge
```

Beispiel:

```
Aufmerksamkeit
Emotionen
Motorik
Interaktion
Gedächtnis
Planung
```

Diese stammen aus:

```
synonyms.de.json
```

---

# Visualisierung

Hier funktioniert **Cluster + Icicle** extrem gut.

Flow:

```
Beobachtung
     │
Clusterkarte
     │
ICF Codes
     │
Detail
```

---

# Beispiel

User tippt:

```
Impulsivität
```

Tool zeigt Cluster:

```
Exekutive Funktionen
│
├ b164
├ b130
└ d250
```

Graph oder Icicle öffnen sich automatisch auf dem Cluster.

---

# Warum das UX massiv verbessert

Momentan:

```
ICF-Struktur verstehen
→ Code finden
→ bewerten
```

Mit Beobachtungsmodus:

```
Beobachtung eingeben
→ passende Codes
→ bewerten
```

Das reduziert mentale Last.

---

# Alternative Sinnachse

Das Tool wird nicht mehr primär:

```
ICF Browser
```

sondern:

```
Beobachtungsinstrument
```

Das ist für Pädagogen viel natürlicher.

---

# Minimale Implementierung

Sehr einfach.

Pipeline:

```
input text
↓
synonym map
↓
candidate codes
↓
cluster view
```

Die Daten sind bereits im Repo:

```
synonyms.de.json
```

---

# UX-Layout

Workspace:

```
Search / Observation
│
Cluster Navigator
│
Detail
```

Navigation Lens wirkt weiterhin.

---

# PR-Größe

Sehr klein.

Neue Dateien:

```
src/observation/resolveObservation.js
src/views/ObservationInput.js
```

---

# Typische Fehlannahme

Viele glauben:

> gute Suche reicht.

Nein.

Suche beantwortet:

```
Was meine ich?
```

Beobachtungsmodus beantwortet:

```
Was sehe ich?
```

Das ist eine andere Denkbewegung.

---

# Risiko- und Nutzenabschätzung

## Nutzen

**kognitiv**

weniger ICF-Kenntnis nötig

**pädagogisch**

Beobachtungen werden sauberer

**UX**

Tool fühlt sich „intelligent“ an

---

## Risiken

zu aggressive Vorschläge  
→ muss transparent bleiben

Prämisse:

```
Vorschläge ≠ Wahrheit
```

---

# Epistemische Leere

Unklar:

- wie breit Synonym-Cluster aktuell sind
    
- ob sie pädagogische Sprache ausreichend abdecken
    

Das müsste empirisch getestet werden.

---

# Für Dummies

Klassikmodus:

Du suchst einen Ordner.

Beobachtungsmodus:

Du sagst dem System, **was passiert**, und es zeigt dir den richtigen Ordner.

---

# Humor

ICF-Bäume sind großartig – solange man weiß, in welchem Wald man steht. Der Beobachtungsmodus ist im Grunde nur jemand, der sagt:

> „Du suchst übrigens die Buche. Drei Meter links.“

---

# Unsicherheitsgrad

0.26

Grund:

keine echten Nutzertests.

---

# Interpolationsgrad

0.18

Annahmen:

- Synonym-Mapping deckt Beobachtungen ausreichend ab
    
- Nutzer formulieren Beobachtungen kurz
    

---

# Essenz

Dein Tool hat dann zwei Denkwege:

```
Struktur → Code
(Klassik)

Beobachtung → Code
(Beobachtungsmodus)
```

Diese Kombination ist UX-seitig extrem stark.

---

Wenn du möchtest, kann ich dir noch eine **viel radikalere UX-Idee** zeigen:

Eine Navigation, bei der man **gar nicht mehr im Baum sucht**, sondern sich durch **ICF-Funktionen „zoomt“ wie durch eine Landkarte**.

Die würde perfekt zu deinem Graph-Ansatz passen.

## Dialektische Erörterung

### These

Der Baum (Tree) ist die **logische Darstellung** der ICF-Struktur.  
Er ist korrekt, vollständig und nachvollziehbar.

### Antithese

Der Baum ist für viele Nutzer **kognitiv ineffizient**.  
Menschen denken selten in hierarchischen Pfaden wie:

```text
b → b1 → b140 → b1400
```

Sie denken räumlich und funktional:

> „Das gehört irgendwie zur Aufmerksamkeit.“

Der Baum zwingt Nutzer in eine Denkweise, die nicht ihre eigene ist.

### Synthese

Die radikale Alternative ist eine **ICF-Landkarte**.

Nicht:

```text
Baum
```

sondern:

```text
Funktionsraum
```

Codes werden zu **Regionen**.

---

# UX-Idee: **ICF Map Navigation**

Eine zusätzliche Linse:

```text
Tree
Graph
Icicle
Map
```

Die Map ist keine Hierarchie – sondern ein **funktionaler Raum**.

---

# Grundprinzip

Stell dir eine Karte vor:

```text
            Emotion
               ▲
               │
Memory ◀──── Cognition ────▶ Attention
               │
               ▼
            Planning
```

Jeder Bereich enthält Codes.

Zoom zeigt mehr Details.

---

# Warum das funktioniert

ICF-Funktionen sind **semantisch gruppiert**:

Beispiele:

|Region|Codes|
|---|---|
|Aufmerksamkeit|b140|
|Gedächtnis|b144|
|Exekutive Funktionen|b164|
|Emotion|b152|
|Motivation/Energie|b130|

Diese bilden natürliche Cluster.

Die Map nutzt genau das.

---

# Interaktion

Navigation funktioniert wie eine Karte.

### Zoom

```text
Kognition
   │
   ▼
Aufmerksamkeit
   │
   ▼
b140
```

### Pan

Man bewegt sich zu benachbarten Funktionsbereichen.

---

# Beispiel Workflow

User beobachtet:

```text
Kind verliert beim Schreiben ständig den Fokus
```

Map zeigt:

```text
Cognition Region
    │
Attention Cluster
    │
b140
```

Ein Klick → Detail.

---

# UX-Vorteile

### Orientierung

Man versteht schneller:

```text
wo etwas im System liegt
```

### Lernen

Der Nutzer entwickelt ein mentales Modell:

```text
ICF als Funktionsraum
```

### Exploration

Man entdeckt Nachbarbereiche.

---

# Minimalimplementierung

Das klingt kompliziert – ist es aber nicht.

Die Map kann statisch definiert werden.

Beispiel:

```json
{
  "regions": [
    {
      "id": "cognition",
      "x": 0,
      "y": 0
    },
    {
      "id": "emotion",
      "x": 0,
      "y": -1
    }
  ]
}
```

Nodes:

```json
{
  "code": "b140",
  "region": "cognition"
}
```

---

# Visualisierung

SVG reicht.

Nodes:

```
circle
```

Regionen:

```
labels
```

Zoom:

```
scale transform
```

Keine schwere Grafikbibliothek nötig.

---

# Kombination mit vorhandenen Linsen

Map funktioniert gut mit:

|Kombination|Effekt|
|---|---|
|Map + Graph|lokale Beziehungen|
|Map + Icicle|Hierarchietiefe|
|Map + Search|schneller Einstieg|

Die Map wird zum **Orientierungsinstrument**.

---

# Alternative Sinnachse

Bisher:

```text
ICF als Klassifikationssystem
```

Mit Map:

```text
ICF als Landschaft menschlicher Funktionen
```

Das verändert, wie Nutzer das System verstehen.

---

# Risikoanalyse

### Risiken

1. falsche semantische Cluster
    
2. zu viele Codes pro Region
    
3. Übervisualisierung
    

### Gegenmaßnahmen

Map bleibt **grob**.

Zoom zeigt Details.

---

# Epistemische Leerstelle

Es fehlt:

```text
eine kanonische funktionale Clusterung der ICF
```

Diese müsste empirisch oder heuristisch definiert werden.

---

# Typische Fehlannahme

Viele glauben:

> mehr Visualisierung = besser.

Falsch.

Die Map funktioniert nur, wenn sie **reduziert** bleibt.

---

# Für Dummies

Baum:

Du suchst eine Datei in Ordnern.

Map:

Du gehst durch eine Stadt und findest das Viertel.

---

# Humor

Der ICF-Baum ist wie ein Behördenarchiv: korrekt, vollständig und ungefähr so intuitiv wie ein Aktenschrank aus dem Jahr 1978. Die Karte dagegen ist der Stadtplan – plötzlich weiß man, wo man eigentlich ist.

---

# Unsicherheitsgrad

0.34

Ursachen:

- keine empirische Clusterstruktur
    
- reale Nutzung unbekannt
    

---

# Interpolationsgrad

0.22

Annahmen:

- semantische Cluster existieren stabil
    
- Nutzer profitieren von räumlicher Orientierung
    

---

# Essenz

Die vier Linsen wären dann:

```text
Tree   → Struktur
Graph  → Beziehungen
Icicle → Hierarchiekontext
Map    → Funktionsraum
```

Damit bekommt dein Tool etwas, was fast kein ICF-Tool hat:

> **eine echte Orientierung im System.**

---

Wenn du möchtest, kann ich noch etwas tun, was wirklich hilfreich wäre:

Ich kann aus deinem Repo und der ICF-Struktur eine **konkrete Map-Topologie entwerfen (mit echten Funktionsregionen)** – also eine erste „ICF-Landkarte“.