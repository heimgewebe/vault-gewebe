Ich habe den Dump und die Architekturartefakte geprüft. Grundlage sind u. a.:

- (kompletter Repo-Merge)
    
- (Architektur-Snapshot)
    
- (Retrieval-Evaluation)
    

Der Dump zeigt grob folgende Struktur:

- **UI-Layer**: `index.html`, `src/app/*`, `style.css`
    
- **Navigation/Interaktion**: `chartManager.js`, `search.js`
    
- **Datenmodell**: `data/icf.json`, `synonyms.de.json`
    
- **Timeline-Subsystem**: `src/timeline/*`
    
- **Verifikation**: `tools/verify/*` (umfangreiche Tests)
    

Das ist wichtig, weil die Navigation **nicht nur UX**, sondern auch **Datenstruktur + Retrieval** berücksichtigen muss.

---

# Dialektische Analyse der Navigation

## These

Die beste Navigation für das ICF-Tool ist **hierarchisch (Baum)**.

Argumente:

- ICF selbst ist eine Hierarchie
    
- Codes sind parent-child organisiert
    
- Baum spiegelt das Datenmodell direkt
    

---

## Antithese

Baum-Navigation ist **kognitiv ineffizient**.

Realität bei ICF:

- > 1400 Codes
    
- Tiefe Hierarchie
    
- Nutzer kennen Codes selten
    

Ergebnis:

> Menschen navigieren über **Bedeutung**, nicht über Struktur.

Darum existiert im Repo auch:

- Synonym-Mapping
    
- Fuzzy-Search
    
- Morphologie-Tests
    

Das ist ein klares Signal der Architektur.

---

## Synthese

Die ideale Navigation ist **nicht Baum**, sondern ein **dreistufiges Modell**:

```
Suche
Cluster
Detail
```

Die Hierarchie wird **nur als Orientierung** verwendet.

---

# Architekturbeobachtung aus dem Repo

Das Tool hat bereits Bausteine dafür:

### 1. Synonym-Suche

`data/synonyms.de.json`

→ Semantische Suche ist bereits Kernfunktion.

---

### 2. Search Engine

`src/app/search.js`

→ Navigation über Sprache.

---

### 3. Chart / Graph

`chartManager.js`

→ visuelle Exploration möglich.

---

### 4. Timeline

`src/timeline/*`

→ Zeitliche Nutzung von Codes.

---

**Schlussfolgerung**

Das Tool ist implizit bereits **semantisch navigiert**, nicht strukturell.

Die UI nutzt das noch nicht vollständig.

---

# Ideale Navigation (für dieses Repo)

Ich empfehle eine **3-Schichten-Navigation**.

---

# 1 — Einstieg: semantische Suche

Großes Suchfeld.

Beispiel:

```
"Impulsivität"
```

System zeigt:

```
b130 Energie und Antrieb
b152 Emotion
b164 Höhere kognitive Funktionen
```

Grund:

Menschen denken in **Begriffen**, nicht Codes.

---

# 2 — Cluster-Navigation

Nach Suche oder Start.

Cluster basieren auf ICF-Kapitel:

```
Mentale Funktionen
Sinnesfunktionen
Motorik
Selbstversorgung
Interaktion
Lernen
```

Das reduziert 1400 Codes auf ~20 Cluster.

---

# 3 — Icicle-Navigation im Cluster

Wenn Nutzer z. B. klickt:

```
Mentale Funktionen
```

Dann erscheint:

```
b1 Mentale Funktionen
   b110 Bewusstsein
   b130 Energie
   b140 Aufmerksamkeit
   b152 Emotion
```

Hier funktioniert Icicle perfekt.

Warum?

- zeigt Hierarchie
    
- braucht wenig Platz
    
- gute Orientierung
    

---

# Ergebnisnavigation

```
Search
   ↓
Cluster
   ↓
Icicle
   ↓
Detail
```

---

# Visualisierung

So würde die Navigation aussehen:

```
┌──────────────────────┐
│        Suche         │
└──────────────────────┘

        ↓

┌───────────────────────────┐
│  Mentale Funktionen       │
│  Motorik                  │
│  Kommunikation            │
│  Selbstregulation         │
└───────────────────────────┘

        ↓

┌───────────────────────────┐
│ b1 Mentale Funktionen     │
│   b130 Energie            │
│   b140 Aufmerksamkeit     │
│   b152 Emotion            │
└───────────────────────────┘

        ↓

┌───────────────────────────┐
│ b152 Emotion              │
│ Bewertung                 │
│ Notizen                   │
│ Timeline                  │
└───────────────────────────┘
```

---

# Wichtiger Architekturpunkt

Die Navigation sollte **Code-zentriert** sein.

Der zentrale State ist:

```
currentICFCode
```

Alle Views reagieren darauf:

- Timeline
    
- Chart
    
- Detail
    
- Export
    

Das passt gut zu deiner aktuellen Architektur.

---

# Alternativer Denkpfad (Zielannahme kippen)

Vielleicht sollte Navigation **nicht über Kategorien**, sondern über **Probleme** laufen.

Beispiel:

Startseite:

```
Emotion
Aufmerksamkeit
Motorik
Impulsivität
Kommunikation
```

Das wären **pädagogische Einstiegspunkte**.

ICF-Codes sind dann nur **Mapping**.

Das könnte für Schule/Diagnostik viel intuitiver sein.

---

# Risikoanalyse

## Risiko

Zu viele Navigationssysteme:

- Baum
    
- Cluster
    
- Graph
    
- Timeline
    
- Suche
    

→ UI-Chaos

---

## Empfehlung

Nur drei sichtbar:

```
Suche
Cluster
Detail
```

Alles andere sekundär.

---

# Typischer UX-Fehler

Viele Tools zeigen sofort den Baum.

Das führt zu:

> kognitivem Overload.

---

# Für Dummies

Stell dir ICF wie eine Bibliothek vor.

Baum-Navigation:

Du läufst durch Regale.

Suchnavigation:

Du fragst den Bibliothekar.

Cluster:

Er zeigt dir den richtigen Raum.

---

# Humor (erkenntnisfördernd)

Der ICF-Baum ist wie ein Stammbaum.

Sehr beeindruckend.

Aber wenn du wissen willst, warum Paul heute impulsiv war,  
hilft dir der Stammbaum ungefähr so sehr wie ein Ahnenpass beim Zahnarzt.

---

# Essenz

Die **beste Navigation für dein Repo** wäre:

```
Suche
→ Cluster
→ Icicle
→ Detail
```

Baum bleibt intern.

---

# Unsicherheitsgrad

0.23

Ursachen:

- keine realen Nutzerstudien
    
- UX basiert auf Architektur + ICF-Struktur
    

---

# Interpolationsgrad

0.27

Annahmen:

- Nutzer sind Pädagogen / Diagnostiker
    
- Codes werden selten direkt gesucht
    

---

# Wenn du möchtest, kann ich dir noch etwas extrem Wertvolles zeigen:

**Die wahrscheinlich beste Navigation für ICF überhaupt (die ich bisher gesehen habe)** —  
eine Mischung aus

```
Graph
+
Suche
+
Code-Detail
```

Sie ist radikal intuitiv und würde dein Tool wahrscheinlich **10× besser machen**.