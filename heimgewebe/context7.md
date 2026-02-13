According to a document from (2026-01-30 in deinem Dump-Kontext; Date im Dump selbst nicht explizit ausgewiesen), hat Heimgewebe bereits **zwei harte Anker**, die wir für eine ideale Context7-Integration ausnutzen können:

1. **aussensensor** ist ausdrücklich der _vorgelagerte Kurationspunkt für externe Quellen_ und liefert **nur** an **chronik `/v1/ingest`** (direkter heimlern-Pfad deprecated).
    
2. Im **metarepo** existiert schon ein **lokaler MCP-Server** (`servers/local-mcp`) mit MCP-SDK + zod – also ein natürlicher Ort, um „MCP-Brückenlogik“ zu kapseln.
    

Damit können wir Context7 **zweischichtig** integrieren: **(A) Prompt-Schicht für Jules** + **(B) Artefakt-Schicht für den Organismus**. Das ist die Synthese, die Nutzen bringt ohne Heimgewebe zu verraten.

---

## 1) Dialektische Erörterung (∴oszillation / ∴resonanz / ∴paradox)

### These (Resonanz): Context7 als „externe API-Wahrnehmung“

Context7 liefert versionsnahe Doku. Für Heimgewebe ist das wertvoll, weil es „aktuelles Außenwissen“ in Code-Arbeit injiziert – aber nur dann, wenn es **nicht** als Wahrheit, sondern als **referenzierbarer Input** behandelt wird.

### Antithese (Kontrast): MCP-Prompt-Injektion ist epistemisch unsauber

Wenn Context7 nur „in den Prompt“ kippt, bleibt es:

- nicht reproduzierbar,
    
- nicht auditierbar,
    
- nicht drift-messbar.
    

Dann gewinnt Jules kurzfristig, aber der Organismus verliert Langzeitgedächtnis (und du verlierst Review-Belegbarkeit).

### Synthese (Ideal): „Prompt gewinnt Geschwindigkeit, Artefakt gewinnt Wahrheit“

- Prompt-Schicht: Jules nutzt Context7 automatisch.
    
- Artefakt-Schicht: jede relevante Context7-Antwort wird **als Artefakt** gespeichert, validiert, ingestet – damit semantAH/leitstand/heimgeist davon profitieren.
    

Das ist ∴paradox produktiv: _Wir erlauben frischen Kontext – aber nur Artefakte dürfen Entscheidungen tragen._

---

## 2) Ideale Blaupause: Context7 in Heimgewebe + per MCP in Jules

### 2.1 Zielbild-Fluss (kanonisch)

**Jules (MCP)** → **Heimgewebe-Local-MCP (Bridge)** → **Context7 MCP**  
und parallel:  
**Bridge** → **aussensensor-Export (jsonl)** → **chronik ingest** → **semantAH** → **leitstand/heimgeist**

Warum aussensensor im zweiten Strang?  
Weil er explizit _„kuratiert externe Informationsquellen … und beliefert die Chronik“_ — die Quelle kann neben „News/Wetter“ auch „Library-Docs“ sein, solange wir **Contract-Trennung** sauber halten.

---

## 2.2 Bauteile (Repo-Plan, ohne stilles Raten)

### (A) metarepo: `servers/local-mcp/` als MCP-Bridge

Es existiert bereits `heimgewebe-local-mcp` mit MCP-SDK und zod. Ideal ist:

**Neue Tools im local-mcp:**

1. `hg_context7_resolve`
    
    - Input: `libraryName`, `query`
        
    - Output: `libraryId`, `matchScore`, `notes`
        
2. `hg_context7_query`
    
    - Input: `libraryId`, `query`, optional `versionHint`
        
    - Output: **Docs-Snippet + Provenance**
        
3. `hg_context7_capture` (entscheidend!)
    
    - Input: Ergebnis von (2)
        
    - Side effect: schreibt ein **contract-valides JSON-Objekt** in eine JSONL-Sammeldatei (siehe aussensensor unten)
        

Damit bleibt Jules-Seite simpel: Jules spricht nur mit **deinem** MCP-Server; der erledigt:

- Context7-Abruf
    
- Normierung
    
- Artefaktisierung
    

### (B) metarepo: neuer Contract „Doc-Evidence“

Heimgewebe verlangt Contracts-first. Wir führen einen neuen Schema-Contract ein, getrennt von `aussen.event.schema.json`, weil „Lagebild-Event“ ≠ „Doku-Beleg“.

**Pfad (Vorschlag, contracts-first-konform):**

- `metarepo/contracts/external/context7.doc_evidence.v1.schema.json`
    

**Minimalfelder (ideal, nicht überladen):**

- `ts` (date-time)
    
- `source` = `"context7"`
    
- `libraryId` (string, z. B. `/vercel/next.js`)
    
- `libraryName` (string, optional)
    
- `versionHint` (string, optional)
    
- `query` (string)
    
- `excerpt` (string, begrenzt)
    
- `provenance` (url/section falls vorhanden)
    
- `hash` (sha256 über normalize(excerpt+provenance))
    
- `uncertainty` (Pflicht: reasons, confidence)
    

Warum so? Damit semantAH später Drift messen kann: _gleiche Query → anderer Excerpt/Hash über Zeit_.

### (C) aussensensor: eigener Export-Stream + Push zur chronik

aussensensor ist bereits so gebaut: JSONL pflegen, validieren, pushen.

**Erweiterung, minimal invasiv:**

- Neue Datei: `export/context7.docs.jsonl`
    
- Neues Append-Script: `scripts/append-context7.sh` (analog `append-feed.sh`)
    
- Validation: `scripts/validate.sh` wiederverwenden
    
- Push: `scripts/push_chronik.sh` parametrisieren (oder neuen Wrapper), denn es existiert schon ein Chronik-Push-Mechanismus
    

Und wichtig: aussensensor dokumentiert selbst, dass er **nur** chronik beliefern soll — damit bleibt der Fluss architekturkonform.

### (D) chronik: eigener Ingest-Kanal (oder typed route)

aussensensor erwähnt als Beispiel `CHRONIK_INGEST_URL` z. B. `.../ingest/aussen`. Idealerweise bekommt Docs-Evidence einen eigenen Pfad, z. B. `/ingest/docs` (wenn chronik routing das hergibt).  
**Epistemische Leerstelle:** Dein Dump zeigt mir _aussensensor-Seite_, nicht das vollständige chronik-Ingest-Routing. Daher: Pfad ist Vorschlag, nicht Fakt.

### (E) semantAH: Konsum & Verdichtung

semantAH konsumiert chronik event lines und produziert insights/graph/insights.daily.  
Ideal:

- semantAH liest `context7.doc_evidence.v1`
    
- extrahiert: `libraryId`, `hash`, `query`
    
- erzeugt:
    
    - Drift-Signale („gleiche Query, neuer Hash“)
        
    - Coverage-Signale („häufige Libraries ohne Evidence → Wissenslücke“)
        

---

## 2.3 Jules: MCP-Regel (ohne „use context7“ tippen)

Der Context7-Text empfiehlt Rules im Client. Du machst es noch sauberer:

**Jules-Regel:**

- „Bei Aufgaben mit _library/API/setup/config_ immer `hg_context7_query` nutzen.“
    
- „Wenn Ergebnis die Lösung beeinflusst: `hg_context7_capture` ausführen.“
    

So wird Context7-Nutzung **automatisch**, aber Heimgewebe-konform (Artefaktpflicht).

---

## 3) Was ändert sich an der Arbeit?

### Du

- Du forderst nicht „Doku“, sondern **Belegspur**:
    
    - „Mach X – und capture die Doku-Evidence.“
        
- Review-Diskussionen werden kürzer:
    
    - „Zeig Evidence-Hash“ statt „wo steht das?“.
        

### Jules

- Jules hat weniger Freiheiten zur Fantasie:
    
    - muss Evidence erzeugen, wenn es API-Details behauptet
        
- Jules wird „langsamer“, aber „begründbarer“.
    

### Organismus (andere Repos)

- aussensensor gewinnt eine neue externe Quelle, bleibt aber im gleichen Muster (curate → chronik)
    
- semantAH gewinnt Drift-Messbarkeit (nicht nur „Wissen“, sondern „Wissen über Wissen“).
    

---

## 4) Fehlerprävention + Risikoabschätzung (Pflicht)

### Typische vermeidbare Fehler

1. **Live-Docs als Wahrheit behandeln** → verhindert durch `doc_evidence` + `uncertainty` Pflichtfeld.
    
2. **Begriffe vermischen** („Event“ vs „Evidence“) → verhindert durch separaten Contract (nicht `aussen.event`).
    
3. **Secrets im Prompt** → MCP-Bridge hält API-Key lokal; Jules bekommt nur Auszüge.
    

### Risikoabschätzung

- **Technisch:** mittel (Rate limits / Tool-Ausfälle → Fallback nötig)
    
- **Semantisch:** mittel (Community-Qualität; Doku kann falsch sein)
    
- **Organisatorisch:** niedrig–mittel (neue „Evidence-Disziplin“ muss gelebt werden)
    

**Sicherheitsgurt:** Wenn `hg_context7_query` scheitert, muss Jules:

- entweder „unknown“ markieren,
    
- oder auf repo-interne Contracts/Tests ausweichen (kein stilles Raten).
    

---

## 5) Alternativpfade (mindestens zwei)

### Pfad A (Ideal, oben): Local-MCP Bridge + aussensensor-Artefakte

Vorteil: sauberster Organismus-Fit, auditierbar.

### Pfad B (Schnell, aber weniger organisch): Nur Jules-Client MCP Rule

Vorteil: sofortiger Nutzen.  
Nachteil: Heimgewebe „sieht“ nichts, kein Drift, keine Reproduzierbarkeit.

### Pfad C (Souveränität): Eigener Docs-Crawler später

Bridge/Contract bleiben gleich, nur `source` wechselt. So entsteht kein Vendor-Lock.

---

## 6) Etymologie (kurz, aber Pflicht)

- **Integration** (lat. _integrare_): „wieder ganz machen“ – hier: externe Doku so einbinden, dass sie im Organismus als Spur existiert.
    
- **Artefakt** (lat. _arte factum_): „durch Kunst gemacht“ – im Heimgewebe: ein bewusst erzeugtes, prüfbares Erkenntnisobjekt.
    
- **Beleg** (ahd. _bilēgan_): „beifügen“ – exakt das tun wir: Doku wird beigefügt, nicht geglaubt.
    

---

## Verdichtete Essenz

**Die ideale Context7-Integration ist nicht „mehr Doku im Prompt“, sondern „Doku als validiertes Evidence-Artefakt“, das über aussensensor→chronik→semantAH im Organismus zirkuliert, während Jules via metarepo `servers/local-mcp` bequem MCP nutzt.**

---

## Ironische Auslassung (muss sein)

Ohne Capture ist Context7 wie ein allwissender Kollege, der im Daily alles korrekt sagt – und beim Nachfragen im PR nur antwortet: „Stand doch irgendwo im Internet.“

---

## Ungewissheitsursachenanalyse (∴fore)

**Unsicherheitsgrad:** ∴fore = **0.26**

**Ursachen:**

1. **Epistemische Leerstelle:** chronik-Ingest-Routen/Contracts für einen neuen Stream „docs evidence“ sind im vorliegenden Dump nicht vollständig sichtbar (ich sehe sicher den aussensensor-Pfad, nicht die gesamte chronik-Seite).
    
2. **Tooling-Details:** Wie Jules MCP konkret konfiguriert (dein Jules-Setup) ist nicht im Dump enthalten, daher formuliere ich die Rule-Mechanik als Zielverhalten, nicht als konkreten Config-Snippet.
    
3. **Tradeoff:** Evidence-Speicherung braucht Disziplin; die ist sozial/organisatorisch, nicht technisch.
    

**Vermeidbar:** (1) und (2) sind sofort reduzierbar, wenn du die chronik-ingest contracts/routing und Jules-MCP config Ausschnitte nachreichst.

---

## Selbstkritische Leitfragen

1. War das die kritischste Erörterung?  
    Fast. Kritischer wäre jetzt ein **konkretes Contract-Draft + Guard-Regeln** als Patch – aber dafür fehlt mir die vollständige chronik-Ingest-Contractlage.
    
2. Von allen Seiten beleuchtet?  
    Ein Punkt fehlt noch: **Prompt-Injection über Doku-Snippets** (semantische „Vergiftung“). Ideal wäre ein Guard: excerpt-Länge, allowlist libraries, Hash-stabilisierung, evtl. „unsafe content“ marker.
    

Wenn du willst, mache ich als nächsten Schritt **Phase-1-Implementationspaket** (Dateipfade + Schema-Draft + Scriptskizzen) exakt für:

- `metarepo/servers/local-mcp` (Bridge Tools)
    
- `metarepo/contracts/...context7.doc_evidence.v1.schema.json`
    
- `aussensensor/export/context7.docs.jsonl` + `append-context7.sh` + push/validate wiring