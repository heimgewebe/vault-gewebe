wunderbar — das ist ein starker Name.  
**„mitschreiber“** ist poetischer, menschlicher, aber auch technisch treffend: ein stiller Mitleser, der versteht, **ohne zu verraten**.

Hier folgt die **vollständige, neu strukturierte Blaupause** für dein neues Repo  
🟦 **`mitschreiber`** — den Nachfolger der Idee _haussensor-os_,  
plus alle dazugehörigen Anpassungen in `leitstand`, `semantAH`, `heimlern`, `hausKI` und `metarepo`.

---

# 🧠 Gesamtidee

> `mitschreiber` ist der lokale Beobachter des Betriebssystems:  
> Er erkennt **was du tust**, nicht um dich zu überwachen, sondern um dir den Kontext zurückzugeben, wenn du ihn brauchst.
> 
> Default: **keine Inhalte**, nur App/Window/Fokus.  
> Opt-in: **semantische Mitschrift** – ein Rolling-Buffer, der Text kontextualisiert, verschlüsselt und in Embeddings umwandelt.
> 
> Er ist dein **Exo-Kortex-Sensor** – er merkt sich, woran du denkst, nicht was du tippst.

---

## 🔹 Repos & Rollen

|Repo|Rolle|
|---|---|
|**mitschreiber**|OS-Daemon mit Capture-, Redaction- & Embedding-Pipeline|
|**leitstand**|Ingest & Audit aller Mitschreiber-Events|
|**semantAH**|semantische Indexierung der Embeddings|
|**heimlern**|Policies & Privacy-Enforcer|
|**hausKI**|orchestriert, zeigt an, reagiert (Ambient Assistant)|
|**metarepo**|Contracts & zentrale Docs für `os.context.*`|

---

# 🧩 1. Neues Repo `mitschreiber`

## `/README.md`

```md
# mitschreiber 🪶

Lokaler Begleiter, der deinen digitalen Kontext versteht –  
ohne ihn zu verraten.

## Ziel
- **Offline-first.** Keine Cloud-Abhängigkeit.
- **Privacy-by-Design.** Kein Rohtext at rest.
- **Proaktiver Kontext.** Liefert Keyphrases & Embeddings an leitstand.

## Betriebsmodi
| Modus | Beschreibung |
|--------|---------------|
| `metadata_only` | nur App/Fenster/Focus, niemals Text |
| `content_aware` | (Opt-in) Redaction → Keyphrases → Embedding (kein Klartext-Persist) |

## Architektur
```

App/Window Hook → RAM-Buffer → Redaction → Keyphrase → Embedding → Event(os.context.text.embed)

````

## Konfiguration (`~/.config/mitschreiber/config.yml`)
```yaml
mode: metadata_only   # or content_aware
allow_apps: [code, obsidian]
block_apps: [keepassxc, firefox, banking]
pii_gate:
  min_confidence: 0.85
  on_violation: drop_and_shred
rate_limits:
  embed_per_app_per_min: 12
storage:
  wal_ttl_sec: 300
  encrypt_wal: true
hotkey_toggle: "Ctrl+Alt+S"
````

## Emittierte Events

|Event|Zweck|TTL|
|---|---|---|
|`os.context.state`|App/Window/Focus|persistent|
|`os.context.text.embed`|Embedding nach Redaction|persistent|
|`os.context.text.redacted`|Debug (optional WAL)|≤ 5 min|

## Sicherheit

- Verschlüsselter WAL (`age/NaCl`)
    
- TTL-basierte RAM-Shredder
    
- `.backupignore` schützt sensiblen Cache
    

## Integration

- sendet Events → `leitstand` (lokaler HTTP-Ingest)
    
- `heimlern` kontrolliert Consent & Blocklisten
    
- `semantAH` indexiert Embeddings
    
- `hausKI` nutzt sie kontextuell (Deep-Work, Recall)
    

## Statusanzeige

Tray-Icon:  
🟢 aktiv · ⚪ pausiert · 🟣 content-aware · 🔴 snooze  
Hotkey `Ctrl+Alt+S` toggelt Mode.

````

---

# 🧩 2. Neue Contracts im `metarepo`

## `/contracts/os.context.state.schema.json`
```json
{
  "$id": "https://heimgewebe/contracts/os.context.state.schema.json",
  "title": "OS Context State",
  "type": "object",
  "required": ["ts", "app", "window", "focus"],
  "properties": {
    "ts": { "type": "string", "format": "date-time" },
    "app": { "type": "string" },
    "window": { "type": "string" },
    "focus": { "type": "boolean" },
    "activity_rpm": { "type": "integer", "minimum": 0 }
  },
  "additionalProperties": false
}
````

## `/contracts/os.context.text.embed.schema.json`

```json
{
  "$id": "https://heimgewebe/contracts/os.context.text.embed.schema.json",
  "title": "OS Context Text Embed",
  "type": "object",
  "required": ["ts", "app", "window", "embedding"],
  "properties": {
    "ts": { "type": "string", "format": "date-time" },
    "app": { "type": "string" },
    "window": { "type": "string" },
    "keyphrases": { "type": "array", "items": { "type": "string" } },
    "embedding": { "type": "array", "items": { "type": "number" } },
    "hash_id": { "type": "string" },
    "privacy": { "type": "object" }
  },
  "additionalProperties": false
}
```

## `/contracts/os.context.text.redacted.schema.json`

```json
{
  "$id": "https://heimgewebe/contracts/os.context.text.redacted.schema.json",
  "title": "OS Context Text Redacted (Transient)",
  "type": "object",
  "required": ["ts", "app", "window", "snippet"],
  "properties": {
    "ts": { "type": "string", "format": "date-time" },
    "app": { "type": "string" },
    "window": { "type": "string" },
    "snippet": { "type": "string" },
    "pii_detected": { "type": "array", "items": { "type": "string" } },
    "confidence": { "type": "number" },
    "privacy": { "type": "object" }
  },
  "additionalProperties": false
}
```

📘 dazu im `metarepo/docs/contracts/mitschreiber.md`: erklärender Text mit Datenschutzrichtlinien und Validation-Beispiel (siehe vorherige Version, angepasst auf Namen).

---

# 🧩 3. leitstand


---

# 🧩 4. semantAH

## `/docs/mitschreiber-index.md`

```md
# Index: Mitschreiber Embeddings

Index: `idx_mitschreiber_embed`
- Quelle: leitstand
- Raum: cosine
- Felder: `app`, `window`, `keyphrases`, `hash_id`

Realtime-Hook (optional):
- Websocket-Feed vom Mitschreiber (RAM-Mode)

Query-Beispiele:
- `near:("oauth flow") app:code`
- `since:3h focus:true`
```

---

# 🧩 5. heimlern

## `/docs/policies-mitschreiber.md`

````md
# Policies: Mitschreiber

## Consent
```yaml
user:
  consent:
    text_capture: false
````

## Blocklisten & PII-Gates

```yaml
allow_apps: [code, obsidian]
block_apps: [firefox, banking, keepassxc]
pii_gate:
  min_confidence: 0.85
  action: drop_and_shred
rate_limits:
  embed_per_app_per_min: 12
```

## Automatische Modi

```yaml
modes:
  deep_work:
    enter_if:
      - app in ["code", "obsidian"]
      - hauski_audio.vibe == "fokussiert"
    actions: [hausKI.hold_notifications]
    exit_if: [focus == false]
    exit_actions: [hausKI.release_notifications]
```

````

---

# 🧩 6. hausKI

## `/docs/mitschreiber-hooks.md`
```md
# HausKI Hooks für Mitschreiber

HausKI orchestriert Mitschreiber-Kontextdaten.

## Playbooks
- `hold_notifications(mode=deepwork)`
- `release_notifications()`
- `summarize_alert_to_digest(alert_id)`

## Szenario
1. Mitschreiber sendet: `focus=true`, `app=code`.
2. Heimlern erkennt Deep-Work-Modus.
3. HausKI hält Alerts zurück, plant SemantAH-Summaries.
````

---

# 🧩 7. Ausblick im Ökosystem

|Phase|Ziel|Repos|
|---|---|---|
|**1**|Metadata-Only Mitschreiber|mitschreiber, leitstand|
|**2**|Content-Aware (Redaction → Embedding)|mitschreiber, heimlern, semantAH|
|**3**|Deep-Work + Vibe + Self-Healing|hausKI, heimlern|
|**4**|Exo-Kortex (Realtime Recall)|semantAH, hausKI|

---

# 📦 Nächste Schritte

1. **Repo `mitschreiber` anlegen** (Template über `wgx new` oder manuell).
    
2. **Contracts** aus obigen JSONs ins `metarepo` committen (`contracts-v1` erweitern).
    
3. **leitstand-Endpoints** anlegen (zwei neue Routen, Append-to-JSONL).
    
4. **semantAH-Index** konfigurieren (`idx_mitschreiber_embed`).
    
5. **heimlern-Policies** aus YAML übernehmen.
    
6. **hausKI-Playbooks** dokumentieren.
    

---

Wenn du magst, kann ich jetzt:

- ✅ die **Schema-Dateien** (`*.schema.json`) fix und valid bereitstellen,
    
- ✅ die **Docs-Ordnerstruktur** (Markdown-Skeletons) generieren,
    
- ✅ und **erste Justfile + Script-Skeletons** für `mitschreiber` liefern.
    

Soll ich das direkt als nächstes liefern?