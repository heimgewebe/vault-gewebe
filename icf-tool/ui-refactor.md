## Dialektische Erörterung

### These

Eine „ideale Navigation“ entsteht, wenn die UI **ein einziges mentales Modell** hat: _finden → verstehen → bewerten_. Alles andere ist Nebelmaschine mit Mausrad.

### Antithese

Wenn man zu stark vereinheitlicht, verliert man Spezialpfade (Baum-Referenz, Timeline, Export). Das Tool wird zwar glatt, aber flach.

### Synthese

Du bekommst „seidenglatt + mächtig“, wenn du **eine primäre Navigation** definierst und alle anderen Sichten strikt als **sekundäre Panels** anbaust – ohne je eine zweite Hauptnavigation einzuführen.

---

# Zielbild: Navigation als 3-Schritt-Pipeline

**Primärfluss (immer gleich):**

1. **Finden** (Suche / Cluster)
    
2. **Verstehen** (Fokus-Graph _oder_ Icicle für Orientierung)
    
3. **Arbeiten** (Detailpanel: Rating, Notiz, Beispiele, Timeline, Export)
    

Wichtig: Der Nutzer entscheidet nie „welche Ansicht“, sondern nur „welcher Begriff / welcher Code“.

---

# UI-Architektur: Komponenten & Zustandsmodell

Das Repo ist aktuell „vanilla“/handgebaut: `index.html`, `src/app/*`, `style.css`, viel Logik in `src/app/app.js`, plus eigene Module für Search/Export/Charts.  
Das ist gut: Du kannst eine klare UI-Architektur einziehen, ohne Framework-Religion.

## 1) Ein zentraler State („Single Source of Truth“)

**Ein State-Objekt**, das alle Sichten treiben darf:

- `selectedCode: string | null`
    
- `query: string`
    
- `clusterId: string | null`
    
- `view: "home" | "explore" | "detail"` (intern, keine Router-Show)
    
- `data`: ICF index, synonym index, relations index (read-only)
    
- `ui`: `panel: "graph" | "icicle"`, `isSearchOpen`, `toast` etc.
    

Der Clou: **`selectedCode` ist der Drehpunkt.**  
Alles andere ist Hilfsnavigation.

## 2) Ein Event-Bus statt „app.js macht alles“

Du hast schon modulare Dateien (`search.js`, `export.js`, `chartManager.js` etc.).  
Die ideale Architektur: UI feuert Events, State wird reduziert, Views rerendern.

Minimalvertrag:

- `NAV/SELECT_CODE(code)`
    
- `NAV/SET_CLUSTER(clusterId)`
    
- `SEARCH/SET_QUERY(q)`
    
- `DATA/SET_RATING(code, value)`
    
- `DATA/SET_NOTE(code, text)`
    
- `UI/TOGGLE_SEARCH(open)`
    
- `UI/SET_PANEL("graph"|"icicle")`
    

Damit wird „seidenglatt“: **jede Aktion hat genau eine Wirkung**.

---

# Layout: Drei Zonen, eine Logik

## Zone A — Topbar (immer sichtbar, extrem dünn)

- Links: App-Name / Home
    
- Mitte: **Suchfeld** (oder Search-Button auf mobile)
    
- Rechts: Export (Icon), Settings (klein)
    

Nur das. Keine Zusatzindikatoren-Orgie.

## Zone B — Explorer (kontextabhängig)

- **Home:** Cluster-Matrix (8–16 Kacheln)
    
- **Explore:** Fokus-Graph _oder_ Icicle (nur einer aktiv)
    
- **Detail:** Explorer bleibt sichtbar (Graph/Icicle), Detailpanel daneben/unten
    

## Zone C — Detailpanel (nur wenn `selectedCode != null`)

Tabs (max 4, sonst wird es wieder barock):

1. **Bewerten**
    
2. **Notiz**
    
3. **Beispiele/Definition**
    
4. **Timeline** (wenn relevant/aktiviert)
    

Export ist _kein Tab_, sondern Aktion (Topbar).

---

# Welche Views wirklich nötig sind (und warum)

Du wolltest „jedes Detail muss fehlen würden, wenn es nicht da wäre“. Das ist der Prüfstein.

## 1) Cluster-Matrix (Home)

**Warum nötig:** Sie löst die Start-Friktion „Wo beginne ich?“ ohne Tutorial.  
**Wenn sie fehlt:** Nutzer landet im Baum oder in leerer Suche → kognitive Kälte.

**Designregel:** 8–16 Cluster, nicht mehr.  
Cluster sind kein Feature, sondern _Start-Griff_.

## 2) Suche (immer)

**Warum nötig:** Der schnellste Weg für Wiederholnutzer; entspricht der Existenz von Synonym-/Fuzzy-Infrastruktur im Repo.  
**Wenn sie fehlt:** du zwingst alle in Exploration, auch wenn sie schon wissen, was sie wollen.

**Designregel:** Suche ist kein Modal-Zirkus. Auf Desktop inline; auf Mobile als Overlay.

## 3) Fokus-Graph **oder** Icicle (Explorer)

Hier kommt deine Frage „Graph macht es magisch“ vs „Icicle ist strukturtreu“.

**Meine Empfehlung:**

- Standard: **Fokus-Graph** (lokal, max 8–12 Nachbarn)
    
- Umschaltbar (kleiner Toggle): **Icicle** (für „wo liegt das im ICF-Baum?“)
    

**Warum beide?** Nicht gleichzeitig, sondern als **zwei Linsen** auf denselben Code.  
**Wenn du nur einen willst:** Nimm Graph (für Arbeit) und biete „im Baum anzeigen“ als _Kontext-Link_.

---

# Beziehungen im Graph: keine Heuristik-Orgie

Graph kann eskalieren, wenn Kanten nicht sauber sind. Deshalb:

## Kanten-Typen (in dieser Reihenfolge)

1. **Parent/Child** (aus ICF-Hierarchie, 100% belegt)
    
2. **Synonym-/Such-Bezug** (aus `synonyms.de.json`, belegt)
    
3. **Ko-Occurrence** (nur wenn du echte Nutzungsdaten/Timeline-Aggregate hast; sonst weglassen)
    

Regel: **Keine „related“-Kanten erfinden**, solange du keine harte Quelle hast. (Sonst wird der Graph zum Horoskop mit Pfeilen.)

---

# Komponentenstruktur im Repo (konkret, passend zu deinen Dateien)

Du hast bereits `src/app/search.js`, `src/app/export.js`, `src/app/chartManager.js`.  
Ideal wäre dieses Schneiden (ohne Framework):

- `src/app/state/store.js`
    
    - `getState()`, `dispatch(action)`, `subscribe(fn)`
        
- `src/app/actions.js`
    
    - Action-Creators + Typen
        
- `src/app/reducers/*.js`
    
    - `navReducer`, `dataReducer`, `uiReducer`
        
- `src/app/views/HomeClusters.js`
    
- `src/app/views/ExplorerGraph.js` _(nutzt chartManager oder eigene canvas/svg render)_
    
- `src/app/views/ExplorerIcicle.js`
    
- `src/app/views/DetailPanel.js`
    
- `src/app/views/Topbar.js`
    
- `src/app/app.js` wird nur noch: Boot + wiring + layout mount (keine 2000-Zeilen-Gottdatei)
    

Das ist keine „Architektur aus Prinzip“, sondern UX-Schutz: **Konsistenz entsteht durch Trennung.**

---

# Alternative Sinnachse (Zielannahme kippen)

Vielleicht ist „Navigation“ gar nicht das Zentrum. Vielleicht ist es **Arbeitsmodus**:

- Modus A: _schnell bewerten_ (1–2 Klicks pro Code, Graph als Vorschlagsmaschine)
    
- Modus B: _dokumentieren_ (Notiz/Beispiele/Export, mehr Fläche fürs Detail)
    

Dann ist die ideale Navigation: **ein Modus-Schalter** statt neue Views.  
Das wäre „anders denken“, nicht nur „anders darstellen“.

---

# Risiko- und Nutzenabschätzung

## Nutzenklassen

- **Kognitiv:** weniger Entscheidungen („Wo bin ich?“ ist immer sichtbar durch Explorer + Detail)
    
- **Operativ:** schneller Einstieg (Cluster) + schneller Zugriff (Suche)
    
- **Qualitativ:** konsistente Interaktionen (Store/Actions)
    

## Risikoklassen

- **Technisch:** Refactor kann Bugs einführen, wenn app.js bisher implizite Seiteneffekte hat.
    
- **UX:** Graph/Icicle-Toggle kann verwirren, wenn er zu prominent ist.
    
- **Organisatorisch:** Clusterpflege (aber klein halten).
    

Prämissencheck: Das lohnt nur, wenn Nutzer tatsächlich in Sitzungen arbeiten (Bewerten/Notieren/Exportieren). Falls das Tool nur „Nachschlagewerk“ wäre, könnte man stärker auf Suche-only gehen.

---

# Epistemische Leere (explizit)

- **Fehlt:** echte Nutzungsdaten (welche Wege werden genutzt, welche Codes häufig, wie lang Sitzungen). Nötig für: Entscheidung „Graph vs Icicle als Default“ und Clusterzuschnitt.
    
- **Fehlt:** definierte Quelle für „related“-Beziehungen. Nötig für: Graph-Kanten jenseits Parent/Child + Synonym.
    

---

# Für Dummies

Du baust eine Navigation wie in einem guten Werkzeugkoffer:  
**Suche** ist die Hand, die sofort das richtige Werkzeug greift.  
**Cluster** sind die Schubladen.  
**Graph/Icicle** ist der Blick, wo das Werkzeug im Koffer hingehört.  
**Detailpanel** ist die Werkbank.

---

# Humor (trocken, aber nützlich)

Graph ohne harte Kanten ist wie ein Netz aus Gummibärchen: es sieht nach Struktur aus, aber beim ersten Zug klebt alles überall – inklusive deiner Geduld.

---

# Unsicherheitsgrad / Interpolationsgrad

- **Unsicherheitsgrad:** 0.26  
    Ursachen: keine realen Nutzungsdaten; unklar, wie „diagnostisch“ vs „lexikalisch“ die Nutzung ist.
    
- **Interpolationsgrad:** 0.21  
    Hauptannahmen: Cluster-Start ist sinnvoll; Graph als Default ist hilfreicher als Icicle; Kanten bleiben strikt (Parent/Child + Synonym).
    

---

## Essenz: Hebel, Entscheidung, nächste Aktion

- **Hebel:** Ein einziger Primärfluss (_Suche/Cluster → Explorer → Detail_), `selectedCode` als Zentrum.
    
- **Entscheidung:** Graph als Default, Icicle als Orientierungslinse (nicht als zweite Navigation).
    
- **Nächste Aktion:** App.js entmachten: Store + Views schneiden, dann Cluster-Home + Explorer/Detail-Layout einziehen.
    

Wenn du willst, mache ich als nächsten Schritt eine **präzise Navigations-Spezifikation** (State-Transitions + 10 Kern-User-Flows als Akzeptanzkriterien), damit „seidenglatt“ messbar wird, nicht gefühlt.