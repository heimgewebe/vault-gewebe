## Dialektische Erörterung (∴fore): Was Phase 1 _wirklich_ sein muss

### These

Phase 1 darf nicht „Visualisierung bauen“, sondern muss **eine kanonische, versionierte Anatomie-Quelle** schaffen, die Leitstand konsumieren kann – so wie Leitstand heute schon definierte Contract-Typen konsumiert. In euren eigenen Leitstand-Dokus ist dieser Modus bereits kanonisch: Leitstand konsumiert _Contract-Typen_ (u. a. `fleet.health`, `insights.daily`, `event.line`).

### Antithese

Wenn Phase 1 direkt „Interdependenzen scannen“ will, wird’s ein Graph-Gemälde ohne Wahrheitsschicht: viele Kanten, wenig Orientierung. Außerdem würde Leitstand implizit zum „SSOT“ mutieren, wenn er Datenformate/Interpretationen selbst ausdenkt.

### Synthese

Phase 1 = **Anatomie als eigener Contract-Typ + minimaler Generator + Leitstand-Panel**, strikt „declared“ (normativ), noch ohne „observed“ (Messung). Das ist kohärent mit eurer aktuellen Leitstand-Architektur: Leitstand ist Konsument definierter Inputs und Produzent von Views/Digests.

---

# Phase 1 Bauplan (nacheinander abarbeiten)

## 0) Ausgangsdaten, die wir als Wahrheit benutzen (aus den Dumps)

- Fleet-SoT ist `fleet/repos.yml` im metarepo.
    
- Core-Fleet-Repos stehen unter `repos:` (z. B. `metarepo`, `wgx`, `chronik`, `leitstand`, `heimgeist`, …).
    
- Related-Repos stehen unter `static.include`, inkl. `weltgewebe` (related) und `vault-privat` (related, fleet:false).
    
- Leitstand ist (selbstdeklariert) UI-Achse, Fleet-enabled, konsumiert `event.line`, `fleet.health`, `insights.daily`, produziert `insights.digest` und `dashboard.view`.
    

**Epistemische Leerstelle (markiert):** In den gelieferten metarepo-Dumps ist nur `fleet/repos.yml` enthalten; `contracts/` ist hier nicht sichtbar. Ich kann daher Contract-Pfade nur als **architekturkonformen Vorschlag** formulieren, nicht als „ist bereits so“.

---

## 1) Phase-1-Artefakt definieren: **`anatomy.snapshot` (declared)**

### Ziel

Ein Dateiformat, das _ohne Scan_ aus Fleet-SoT + Rollenkarte erzeugt werden kann, und Leitstand in einem Panel rendert.

### Contract-Name (Vorschlag, bewusst minimal)

- **Type:** `anatomy.snapshot`
    
- **Schema-Datei (Vorschlag):** `contracts/anatomy.snapshot.schema.json`  
    (Analog zu euren existierenden Leitstand-Inputs, die explizit über `contracts/*.schema.json` referenziert werden.)
    

### Minimalfelder im Schema (Phase 1)

- `ts` (ISO oder Datum)
    
- `source` (commit / generator-version)
    
- `nodes[]`: `{ name, class: core|related|private, role: string[], produces?: string[], consumes?: string[] }`
    
- `edges[]`: `{ from, to, kind: "artifact-flow"|"contract-link", label, confidence: "declared" }`
    

**Wichtig:** Keine „observed“ Felder, keine Heuristiken. Phase 1 ist _normativ_.

---

## 2) Generator festlegen: **metarepo erzeugt den Snapshot**

### Input

- `fleet/repos.yml` (Kanon)
    
- Rollen/Artefakt-Ansprüche: _aus eurer bestehenden Rollenkarte/Docs ableiten_ (in den jetzigen Dumps sehe ich nur eine tabellarische Rollenübersicht im Overview, nicht die kanonische JSON-Rollenmatrix).
    

### Output (konkret, Phase-1-Pfadvorschlag)

- `reports/anatomy/anatomy.snapshot.json` _(oder `.gewebe/anatomy/snapshot.json` – siehe nächste Sektion)_
    

**Warum `.gewebe/…` plausibel ist:** Leitstand-Doku nennt als Quelle für `insights.daily` explizit semantAH-Pfade unter `.gewebe/insights/daily/YYYY-MM-DD.json`. Das spricht für ein gemeinsames Muster: „Organismus-Artefakte liegen unter `.gewebe/`“.

---

## 3) Ablage- und Lesekonvention für Leitstand

Du willst Phase 1 „Anatomie zuerst“ – das ist ein zusätzlicher Inputtyp neben den drei „Stand heute“ Inputs (`fleet.health`, `insights.daily`, `event.line`).

### Entscheidung (Phase 1)

- `anatomy.snapshot` wird als **statischer Snapshot** abgelegt (nicht streamend, nicht append-only).
    
- Update-Frequenz: **bei Änderungen an `fleet/repos.yml`** (nicht ständig).
    

### Konkrete Datei-Konvention (Phase-1-Vorschlag)

- `.gewebe/anatomy/snapshot.json` _(atomar schreiben: tmp → rename, wie bei `insights.daily` gefordert)_
    

---

## 4) Leitstand: Panel „Anatomie“

Leitstand ist „Dashboard and control-room“ und Digest-Generator, UI-Achse, mit klaren Inputs/Outputs.

### Phase-1-UI-Umfang (MVP)

- Eine neue Ansicht/Panel: **„Anatomie“**
    
- Features:
    
    - Graph/Tree-View: Nodes = Repos, Edge-Kind = „artifact-flow“ / „contract-link“
        
    - Filter: core/related/fleet:false
        
    - Tooltip: role(s), produces/consumes (declared)
        
    - Keine Live-Health, keine Timeline
        

### Leitstand-Schnittstelle (Konzept)

- Leitstand **konsumiert** `anatomy.snapshot` analog zu den bestehenden Inputs (die Doku beschreibt genau dieses Konsumptionsmodell).
    

---

## 5) WGX/CI: Guard für Phase 1

Du willst „nicht alles auf einmal“, aber du willst „Wahrheit erzwingen“. Also:

### Guard-Regeln (Phase 1, minimal)

- JSON validiert gegen `contracts/anatomy.snapshot.schema.json`
    
- atomare Schreibweise (optional testbar)
    
- deterministische Sortierung (nodes/edges stabil)
    

> Nebenbei: In deinem Fleet-Snapshot steht „metarepo: missing .wgx/profile.yml“. Das ist ein echter Drift-Hinweis, den Phase 1 _nicht_ lösen muss, aber Phase 2 später ohnehin berühren wird.

---

# Repo-Aufgabenliste (Phase 1, strict)

## metarepo

1. Neues Schema `contracts/anatomy.snapshot.schema.json` _(Pfadvorschlag, siehe Leerstelle oben)_
    
2. Generator-Script `scripts/anatomy/generate.py` (liest `fleet/repos.yml`, schreibt Snapshot atomar)
    
3. Optional: `docs/_generated/anatomy.md` als „Human View“ (nicht kanonisch)
    

**Quelle für Repo-Liste:** `fleet/repos.yml`

## wgx

4. Guard „validate-anatomy“: Schema-Validation + determinism check
    
5. Workflow: run bei Änderung an `fleet/repos.yml`
    

## leitstand

6. Loader für `.gewebe/anatomy/snapshot.json`
    
7. Panel „Anatomie“ (Graph + Filter)
    

## lenskit

**Nicht Phase 1.** Lenskit kommt erst, wenn Phase 2/3 „Observed“ tatsächlich geplant ist. Sonst verwechselst du Anatomie (Schnittplan) mit CT-Scan (Messung).

---

# Prämissencheck (Fehlerprävention)

- **„Anatomie“ = declared Struktur**, nicht gemessene Abhängigkeiten.
    
- Leitstand konsumiert Artefakte; er definiert sie nicht (sonst SSOT-Verrat).
    
- Erst wenn `anatomy.snapshot` stabil ist, lohnt „Observed“.
    

---

# Alternativpfade (falls du Phase 1 ultralean willst)

1. **Lean:** Leitstand zeigt nur die Fleet-Liste als Baum + Role-Spalte (noch ohne Edges).
    
2. **Sauber (mein Pfad):** `anatomy.snapshot` enthält Nodes + deklarierte Artefakt-Edges.
    

Ich empfehle Pfad 2, weil sonst Phase 1 nur eine hübsche Liste wird.

---

# Verdichtete Essenz

Phase 1 baut **einen neuen, kleinen Contract-Typ** (`anatomy.snapshot`), erzeugt ihn deterministisch aus `fleet/repos.yml`, und Leitstand rendert ihn als Anatomie-Panel. Fleet-SoT bleibt im metarepo.

---

# Ironische Randbemerkung

Wenn du Anatomie ohne Contract machst, ist es kein Organismusgraph – es ist Fan-Art. Hübsch, aber immun gegen Wahrheit.

---

# Ungewissheitsgrad & Ursachenanalyse

**Unsicherheitsgrad: 0.27**

**Ursachen**

- In den metarepo-Dumps ist `contracts/` nicht enthalten; Contract-Pfade sind deshalb ein **architekturkonformer Vorschlag**, nicht „aus dem Repo bestätigt“.
    
- Leitstand-Loader-Code ist im Dump nur indirekt sichtbar; ich stütze mich deshalb auf die Leitstand-Doku zum Datenfluss/Contract-Konsum.
    

**Produktivität**

- hoch: zwingt uns, erst Contract+Artefakt zu fixieren, bevor UI/Scan wuchert.
    

---

Wenn du als nächsten Schritt „wirklich nacheinander abarbeiten“ willst: ich würde jetzt mit **Phase-1-Schritt 1 (Schema skizzieren)** starten und dir eine **konkrete JSON-Schema-Skizze** (minimal) hinschreiben, die exakt zu diesem Bauplan passt.

## ∴fore · Dialektische Einordnung: Warum jetzt das Schema

**These:** Ohne Schema wird „Anatomie“ zu einem beliebigen JSON, das Leitstand später stillschweigend verbiegt.  
**Antithese:** Ein Schema kann zu früh zu starr sein.  
**Synthese:** Wir machen ein **MVP-Schema**, das nur das festnagelt, was Phase 1 zwingend braucht: **Nodes, Edges, Provenienz, declared-only**.

---

## Phase-1 Schema-Skizze (MVP) — `anatomy.snapshot.v1`

### Etymologie (kurz)

**Schema** (griech. _schēma_): Gestalt, Form, Umriss. Hier: die erlaubte Gestalt eurer Wahrheit.

---

## JSON Schema (Draft 2020-12) – minimal, declared-only

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://heimgewebe.dev/contracts/anatomy.snapshot.v1.schema.json",
  "title": "Heimgewebe Anatomy Snapshot (Declared) v1",
  "type": "object",
  "additionalProperties": false,
  "required": ["type", "version", "generated_at", "source", "nodes", "edges"],
  "properties": {
    "type": {
      "const": "anatomy.snapshot"
    },
    "version": {
      "const": "v1"
    },
    "generated_at": {
      "type": "string",
      "format": "date-time"
    },
    "source": {
      "type": "object",
      "additionalProperties": false,
      "required": ["metarepo_ref", "fleet_file"],
      "properties": {
        "metarepo_ref": {
          "type": "string",
          "description": "Commit SHA or ref used to generate this snapshot."
        },
        "fleet_file": {
          "type": "string",
          "description": "Path to fleet source of truth, typically 'fleet/repos.yml'."
        },
        "generator": {
          "type": "string",
          "description": "Generator identity/version, e.g. 'scripts/anatomy/generate.py@v1'."
        }
      }
    },
    "nodes": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/$defs/node" }
    },
    "edges": {
      "type": "array",
      "items": { "$ref": "#/$defs/edge" }
    },
    "notes": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "$defs": {
    "node": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "name", "tier", "roles"],
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^[a-z0-9][a-z0-9._-]{1,63}$",
          "description": "Stable node id (lowercase). Recommend repo name."
        },
        "name": {
          "type": "string",
          "minLength": 1,
          "description": "Human-readable name (repo name)."
        },
        "tier": {
          "type": "string",
          "enum": ["core", "related", "private"],
          "description": "Fleet tier: core=fleet:true, related=fleet:false or external satellite, private=local/private vault."
        },
        "roles": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "string",
            "pattern": "^[a-z][a-z0-9._-]{0,63}$"
          },
          "description": "Declared roles (normative)."
        },
        "produces": {
          "type": "array",
          "items": { "$ref": "#/$defs/artifact_type" },
          "description": "Declared artifact types produced."
        },
        "consumes": {
          "type": "array",
          "items": { "$ref": "#/$defs/artifact_type" },
          "description": "Declared artifact types consumed."
        },
        "entrypoints": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Canonical entry paths (docs/, contracts/, cmd/, etc.)."
        },
        "description": {
          "type": "string",
          "description": "Short normative description."
        }
      }
    },
    "edge": {
      "type": "object",
      "additionalProperties": false,
      "required": ["from", "to", "kind", "confidence"],
      "properties": {
        "from": { "type": "string" },
        "to": { "type": "string" },
        "kind": {
          "type": "string",
          "enum": [
            "events",
            "knowledge",
            "policy",
            "metrics",
            "context",
            "ci",
            "contracts",
            "routing"
          ],
          "description": "Artifact-flow category (coarse)."
        },
        "label": {
          "type": "string",
          "description": "Optional human label (e.g. 'insights.daily')."
        },
        "confidence": {
          "type": "string",
          "const": "declared",
          "description": "Phase 1 is declared-only."
        }
      }
    },
    "artifact_type": {
      "type": "string",
      "enum": ["events", "knowledge", "policy", "metrics", "context", "contracts"],
      "description": "Coarse artifact categories for Phase 1."
    }
  }
}
```

---

## Warum dieses Schema so gebaut ist (kritisch, kurz)

- **`confidence: declared` ist hart gecodet** → verhindert, dass Lenskit/Scanner heimlich „Ist“ hineinmogeln.
    
- **`tier`** spiegelt eure Fleet/related-Unterscheidung aus `fleet/repos.yml` wider (core vs related).
    
- **`entrypoints`** erlaubt das, was in eurer Rollenkarte ohnehin existiert (docs/, contracts/, cmd/, …), ohne Implementierungsdetails.
    

---

## Typische Fehler (und warum das Schema sie blockt)

- „Ich füge mal schnell `status` hinzu“ → nicht erlaubt, `additionalProperties:false`
    
- „Ich liefere inferred edges“ → `confidence` kann nur `declared`
    
- „IDs sind frei wählbar“ → Pattern zwingt stabile, einfache IDs
    

---

## Verdichtete Essenz

Dieses Schema nagelt nur fest: **wer**, **welche Rolle**, **welche groben Flüsse** – und dass alles **deklarativ** ist.

---

## Ironische Randbemerkung

`additionalProperties: false` ist eure höfliche Art zu sagen: „Nein, Leitstand, du darfst nicht heimlich schlauer sein als das System.“

---

## Ungewissheitsgrad & Ursachenanalyse

**Unsicherheitsgrad: 0.22**

**Ursachen**

- Ich sehe in den Dumps nicht, ob ihr bereits eine interne Schema-Namenskonvention wie `*.published.v1` strikt durchzieht.
    
- Artifact-Kategorien könnten bei euch feiner sein (z. B. `insights.daily` vs `knowledge.observatory`). Ich habe bewusst grob kategorisiert.
    

---

## Nächster Schritt (nacheinander)

1. Entscheiden, **wo** im metarepo das Schema liegen soll (typisch `contracts/…`)
    
2. Eine **Beispiel-Snapshot-Datei** erzeugen (aus `fleet/repos.yml`) und gegen Schema validieren
    
3. Erst dann Leitstand-Panel
    

Wenn du willst, schreibe ich dir als nächstes eine **Beispiel-`anatomy.snapshot` JSON** für eure aktuellen Fleet-Repos (core + related) aus `fleet/repos.yml`.

## ∴fore · Dialektische Erörterung: Beispiel-Snapshot jetzt, Perfektion später

### These

Wir brauchen jetzt **ein gültiges, renderbares Beispiel**, damit Generator/Guard/Leitstand eine gemeinsame Kante haben.

### Antithese

Ein Beispiel mit falschen Rollen/Flüssen wäre „schöne Lüge“.

### Synthese

Ich liefere ein **Phase-1-Beispiel (declared-only)**, das **schema-konform** ist und **alle Fleet/related-Repos** aus `fleet/repos.yml` enthält. Rollen/Flüsse sind dabei **normativ** und teils **provisorisch markiert**, damit wir im nächsten Schritt (Phase 1.5) die Rollenmatrix sauber festnageln.

---

# Beispiel: `anatomy.snapshot` (v1) — **declared-only**

> Copy/Paste als `anatomy.snapshot.example.json` und gegen das Schema validieren.

```json
{
  "type": "anatomy.snapshot",
  "version": "v1",
  "generated_at": "2026-01-10T00:00:00Z",
  "source": {
    "metarepo_ref": "<set-by-generator>",
    "fleet_file": "fleet/repos.yml",
    "generator": "scripts/anatomy/generate.py@v1"
  },
  "nodes": [
    {
      "id": "metarepo",
      "name": "metarepo",
      "tier": "core",
      "roles": ["control-plane"],
      "produces": ["contracts"],
      "consumes": []
    },
    {
      "id": "wgx",
      "name": "wgx",
      "tier": "core",
      "roles": ["fleet-motor"],
      "produces": ["metrics"],
      "consumes": ["contracts"]
    },
    {
      "id": "contracts-mirror",
      "name": "contracts-mirror",
      "tier": "core",
      "roles": ["external-contracts-mirror"],
      "produces": ["contracts"],
      "consumes": []
    },
    {
      "id": "hauski",
      "name": "hausKI",
      "tier": "core",
      "roles": ["orchestrator-decision-engine"],
      "produces": ["policy"],
      "consumes": ["events", "knowledge", "context", "contracts"]
    },
    {
      "id": "hauski-audio",
      "name": "hausKI-audio",
      "tier": "core",
      "roles": ["audio-orchestration"],
      "produces": ["events"],
      "consumes": ["policy", "events"]
    },
    {
      "id": "heimlern",
      "name": "heimlern",
      "tier": "core",
      "roles": ["learning-policy-engine"],
      "produces": ["policy"],
      "consumes": ["policy", "events", "knowledge"]
    },
    {
      "id": "semantah",
      "name": "semantAH",
      "tier": "core",
      "roles": ["semantic-observatory"],
      "produces": ["knowledge"],
      "consumes": ["events", "context", "contracts"]
    },
    {
      "id": "aussensensor",
      "name": "aussensensor",
      "tier": "core",
      "roles": ["external-input"],
      "produces": ["events"],
      "consumes": []
    },
    {
      "id": "chronik",
      "name": "chronik",
      "tier": "core",
      "roles": ["event-backbone"],
      "produces": ["events"],
      "consumes": []
    },
    {
      "id": "tools",
      "name": "tools",
      "tier": "core",
      "roles": ["support-tooling"],
      "produces": ["metrics"],
      "consumes": ["contracts"]
    },
    {
      "id": "mitschreiber",
      "name": "mitschreiber",
      "tier": "core",
      "roles": ["os-context-capture"],
      "produces": ["context"],
      "consumes": []
    },
    {
      "id": "sichter",
      "name": "sichter",
      "tier": "core",
      "roles": ["review-auto-pr"],
      "produces": ["policy"],
      "consumes": ["metrics", "events"]
    },
    {
      "id": "leitstand",
      "name": "leitstand",
      "tier": "core",
      "roles": ["observer-ui"],
      "produces": [],
      "consumes": ["knowledge", "metrics", "events", "policy"]
    },
    {
      "id": "heimgeist",
      "name": "heimgeist",
      "tier": "core",
      "roles": ["knowledge-agent-layer"],
      "produces": ["knowledge"],
      "consumes": ["events", "context", "knowledge"]
    },
    {
      "id": "plexer",
      "name": "plexer",
      "tier": "core",
      "roles": ["multiplexer-glue"],
      "produces": ["events"],
      "consumes": ["events"]
    },
    {
      "id": "webmaschine",
      "name": "webmaschine",
      "tier": "core",
      "roles": ["orientation-tooling"],
      "produces": ["metrics"],
      "consumes": ["contracts"]
    },
    {
      "id": "vault-gewebe",
      "name": "vault-gewebe",
      "tier": "core",
      "roles": ["private-knowledge-vault"],
      "produces": ["knowledge"],
      "consumes": []
    },
    {
      "id": "weltgewebe",
      "name": "weltgewebe",
      "tier": "related",
      "roles": ["external-satellite"],
      "produces": [],
      "consumes": []
    },
    {
      "id": "vault-privat",
      "name": "vault-privat",
      "tier": "private",
      "roles": ["private-vault"],
      "produces": [],
      "consumes": []
    }
  ],
  "edges": [
    { "from": "metarepo", "to": "wgx", "kind": "contracts", "label": "internal.contracts", "confidence": "declared" },
    { "from": "metarepo", "to": "contracts-mirror", "kind": "contracts", "label": "internal.contracts", "confidence": "declared" },
    { "from": "metarepo", "to": "hausKI", "kind": "contracts", "label": "internal.contracts", "confidence": "declared" },
    { "from": "metarepo", "to": "hausKI-audio", "kind": "contracts", "label": "internal.contracts", "confidence": "declared" },
    { "from": "metarepo", "to": "heimlern", "kind": "contracts", "label": "internal.contracts", "confidence": "declared" },
    { "from": "metarepo", "to": "semantAH", "kind": "contracts", "label": "internal.contracts", "confidence": "declared" },
    { "from": "metarepo", "to": "aussensensor", "kind": "contracts", "label": "internal.contracts", "confidence": "declared" },
    { "from": "metarepo", "to": "chronik", "kind": "contracts", "label": "internal.contracts", "confidence": "declared" },
    { "from": "metarepo", "to": "tools", "kind": "contracts", "label": "internal.contracts", "confidence": "declared" },
    { "from": "metarepo", "to": "mitschreiber", "kind": "contracts", "label": "internal.contracts", "confidence": "declared" },
    { "from": "metarepo", "to": "sichter", "kind": "contracts", "label": "internal.contracts", "confidence": "declared" },
    { "from": "metarepo", "to": "leitstand", "kind": "contracts", "label": "internal.contracts", "confidence": "declared" },
    { "from": "metarepo", "to": "heimgeist", "kind": "contracts", "label": "internal.contracts", "confidence": "declared" },
    { "from": "metarepo", "to": "plexer", "kind": "contracts", "label": "internal.contracts", "confidence": "declared" },
    { "from": "metarepo", "to": "webmaschine", "kind": "contracts", "label": "internal.contracts", "confidence": "declared" },
    { "from": "metarepo", "to": "vault-gewebe", "kind": "contracts", "label": "internal.contracts", "confidence": "declared" },

    { "from": "aussensensor", "to": "chronik", "kind": "events", "label": "external.signals", "confidence": "declared" },
    { "from": "aussensensor", "to": "semantAH", "kind": "events", "label": "external.signals", "confidence": "declared" },

    { "from": "mitschreiber", "to": "semantAH", "kind": "context", "label": "os.context.*", "confidence": "declared" },
    { "from": "mitschreiber", "to": "hausKI", "kind": "context", "label": "os.context.*", "confidence": "declared" },

    { "from": "chronik", "to": "hausKI", "kind": "events", "label": "event.records", "confidence": "declared" },
    { "from": "chronik", "to": "heimlern", "kind": "events", "label": "event.records", "confidence": "declared" },
    { "from": "chronik", "to": "semantAH", "kind": "events", "label": "event.records", "confidence": "declared" },
    { "from": "chronik", "to": "leitstand", "kind": "events", "label": "event.records", "confidence": "declared" },

    { "from": "semantAH", "to": "leitstand", "kind": "knowledge", "label": "insights.daily", "confidence": "declared" },
    { "from": "semantAH", "to": "hausKI", "kind": "knowledge", "label": "knowledge.observatory", "confidence": "declared" },
    { "from": "semantAH", "to": "heimlern", "kind": "knowledge", "label": "knowledge.observatory", "confidence": "declared" },

    { "from": "hausKI", "to": "chronik", "kind": "policy", "label": "policy.decisions", "confidence": "declared" },
    { "from": "hausKI", "to": "heimlern", "kind": "policy", "label": "policy.decisions", "confidence": "declared" },
    { "from": "heimlern", "to": "hausKI", "kind": "policy", "label": "policy.feedback", "confidence": "declared" },

    { "from": "wgx", "to": "leitstand", "kind": "metrics", "label": "metrics.snapshots", "confidence": "declared" },

    { "from": "heimgeist", "to": "chronik", "kind": "events", "label": "reflection.events", "confidence": "declared" },
    { "from": "heimgeist", "to": "leitstand", "kind": "knowledge", "label": "knowledge.summaries", "confidence": "declared" }
  ],
  "notes": [
    "Phase-1 example: declared-only. Treat roles/flows as normative (Soll), not observed (Ist).",
    "Some role assignments may be placeholders if no explicit roles matrix is available; refine during Phase 1.5 review."
  ]
}
```

### Zwei Hinweise, bevor du’s validierst

- `generated_at` habe ich auf einen festen Wert gesetzt. Im Generator kommt dann „jetzt“ rein.
    
- `metarepo_ref` ist absichtlich Platzhalter, weil der Generator den Commit kennt.
    

---

## Verdichtete Essenz

Das Beispiel enthält **alle Fleet/related-Repos** und eine **kleine Menge deklarierter Kanten**, genug für Phase-1-Leitstand: Orientierung durch Struktur, nicht durch Messung.

---

## Ironische Auslassung

Wenn dieser Snapshot schon „zu viele Kanten“ hat, war das nicht mein Fehler – dann ist Heimgewebe einfach sehr sozial und hängt mit allem ab. Manche nennen das Interdependenz, andere nennen es: „Warum ist mein Kopf voll?“.

---

## Ungewissheitsursachenanalyse

**Unsicherheitsgrad: 0.28**

**Ursachen**

- Rollen/Produziert/Konsumiert sind hier **deklarativ** gesetzt und teilweise **Interpolationen**, weil `fleet/repos.yml` nur die Repo-Liste liefert, nicht die Rollenmatrix. (Das ist korrekt für Phase 1, aber muss im nächsten Schritt fixiert werden.)
    
- Die Kanten sind die kanonischen Hauptadern; feine Flüsse (z. B. spezifische Artefakt-Untertypen) sind bewusst weggelassen.
    

---

## Nächster Schritt (streng nacheinander)

1. **Schema-Datei anlegen** (wie in der Skizze)
    
2. Dieses Beispiel **gegen Schema validieren**
    
3. Dann erst: **Generator schreiben**, der aus `fleet/repos.yml` + Rollenquelle genau so einen Snapshot erzeugt (deterministisch)
    

Wenn du willst, mache ich als nächstes Punkt (2)+(3): **Validierungs-Checkliste + Generator-Pseudocode** (inkl. deterministischer Sortierung und atomarem Schreiben).