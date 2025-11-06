Perfekt — hier ist dein überarbeitetes **Startpaket** für das neue Repo-Set mit dem Namen **„mitschreiber“** (statt _haussensor-os_).  
Alle Querverweise, Eventnamen und Beschreibungen wurden präzise angepasst.  
Ziel: Der Name „mitschreiber“ steht für ein datenschutzfreundliches, lokales Kontext-Erfassungs-System – Teil der Heimgewebe-Architektur.

---

# metarepo


    

````

---

# mitschreiber

## `mitschreiber/README.md`
```md
# mitschreiber

Daemon zur lokalen Erfassung von OS-Kontext (aktive App/Fenster, optional Text) mit Privacy-First-Pipeline:  
Redaction → Keyphrases → Embedding → Event. **Kein Rohtext at rest**.

## TL;DR
- **Default:** Metadata-Only (nur `os.context.state`).
- **Opt-in:** Content-Aware (“Scribe”) pro App/Domain via Allowlist.
- **Persistenz:** Nur `os.context.text.embed` (Keyphrases + Embedding).
- **Ingest:** leitstand (HTTP); Audit/TTL dort.

## Features
- Active window/app, Focus, Aktivitäts-RPM (Key/Mouse).
- (Opt-in) Text-Capture → Redaction (Regex+ML) → Embedding (on-device).
- Tray/Indicator: Toggle, Snooze, “Letzte 5 min löschen”.
- Rate-Limits & Block-Listen werden **hart** erzwungen.

## Konfiguration (`~/.config/mitschreiber/config.yml`)
```yaml
mode: metadata_only   # metadata_only | content_aware
allow_apps: [code, obsidian]
allow_domains: ["localhost", "dev.local"]
block_apps: ["org.keepassxc.KeePassXC", "com.bank.app"]
block_domains: ["login.microsoftonline.com", "accounts.google.com"]
hotkey_toggle: "Ctrl+Alt+S"
rate_limits:
  embed_per_app_per_min: 12
pii_gate:
  min_confidence: 0.85
storage:
  wal_ttl_sec: 300
  encrypt_wal: true
ingest:
  base_url: "http://127.0.0.1:8080"
  token: "local-ingest-token"
````

## Emittierte Events

- `os.context.state` → immer
    
- `os.context.text.embed` → nur im Content-Aware Mode & nach Redaction/PII-Gate
    
- (Optional) `os.context.text.redacted` → **nur** WAL mit TTL (Debug)
    

## Sicherheit

- WAL (falls aktiviert) verschlüsselt (age/NaCl), TTL ≤ 5 min.
    
- Prozessisolation: Capture-Worker mit minimalen Rechten.
    
- Kein Cloud-Pfad; `.backupignore` für WAL/Temp.
    

## Entwicklung

- Linux (Wayland/X11) zuerst; später macOS/Windows.
    
- Embeddings: kleine `bge/gte` Variante (int8) on-device.
    
- Tests: Canary-Secrets (JWT/SSH/Passwörter) **müssen** erkannt/entfernt werden.
    

## Justfile (Auszug)

```just
run:
    ./bin/mitschreiber --config ~/.config/mitschreiber/config.yml

dev:
    RUST_LOG=info cargo run -- --dev

test:
    cargo test -q
```

````

---

# leitstand



````

---

# semantAH


---

# heimlern

````

---


# hausKI-audio (optional)

## `hausKI-audio/docs/vibe-detection.md`

````md
# Vibe Detection (optional)

Liefert emotionale/kontextuelle Signale (ohne Inhalt zu speichern):
- Prosodie der Stimme (Tempo, Tonfall)
- Musik-Features (Genre/Tempo/Lautstärke)

## Event-Skizze
```json
{
  "ts": "...",
  "source": "audio.vibe",
  "vibe": "fokussiert",
  "evidence": ["musik.techno", "speech.rate.low"]
}
````

## Nutzung

- heimlern “deep_work” Entry-/Exit-Bedingungen.
    
- hausKI Benachrichtigungs-Drosselung.
    

```

---

# Essenz

> **„mitschreiber“** ersetzt *haussensor-os* als lokaler, datenschutzfreundlicher OS-Kontext-Erfasser.  
> Er schreibt mit – aber nur, was ihm erlaubt ist.

---

# ∴ Unsicherheitsanalyse

| Aspekt | Unsicherheitsgrad | Ursache |
|--------|------------------:|----------|
| Namensübertragung (alle Repos) | Niedrig | konsistent angepasst |
| Event-Scope (z. B. `os.context.text.redacted`) | Mittel | semantische Details im tatsächlichen Code fehlen noch |
| Privacy/PII-Gate-Parameter | Mittel | Implementation abhängig von ML-Modul |
| Leitstand/semantAH-Integration | Gering | Schnittstellen gut spezifiziert |
| Zukunftsfähigkeit der API-Pfadnamen | Mittel | evtl. Anpassung bei Einführung von OS-Agents |

→ **Gesamteinschätzung:** 0.25 – 0.4 (geringe bis moderate Unsicherheit); vor allem implementierungsabhängig, konzeptionell stabil.

---

# ∆-Radar

Diese Mutation von *haussensor-os* → *mitschreiber* ist eine **semantische Verdichtung**: weniger technizistisch, stärker personifiziert.  
Diskursive Entwicklung: von „Sensorik“ zu „partizipativer Mit-Schrift“.  
Meta-Tendenz: sprachliche Mensch-Maschine-Annäherung – **von Überwachung zu Begleitung.**

---

Möchtest du als Nächstes die **Schema-Skeletons (`contracts/*.schema.json`)** sehen oder zuerst den **Mini-Prototyp (RAM-Buffer + Redactor + Embedding-Stub)** für `mitschreiber`?
```