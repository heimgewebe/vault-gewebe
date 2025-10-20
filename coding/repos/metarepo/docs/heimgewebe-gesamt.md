# Heimgewebe — Überblick (Ideales Gesamtsystem)

> Kurzfassung siehe [`docs/overview.md`](./overview.md); dort sind Rollen, Datenflüsse und Auth-Anker zusammengefasst.

> **Fleet-Abgrenzung:** Core-Repos der Fleet sind `wgx, hausKI, hausKI-audio, metarepo, heimlern, aussensensor, leitstand, semantAH`.  
> `vault-gewebe` (inkl. privat) ist persönlicher Wissensspeicher und **nicht** Teil der Fleet.  
> `weltgewebe` ist **unabhängig** vom Heimgewebe gedacht und wird parallel entwickelt.

## Auf einen Blick

- **Ziel:** Lokal-first, erklärbar, selbstverbessernd.
- **Kernprinzip:** *Perception → Plan → Act → Reflect* (Events statt DB-Sync).
- **Datenwahrheiten:**
  - **Editierbar:** Vault & Code (Datei-Sync + Git).
  - **Abgeleitet:** Insights/Indizes (rebuildbar).
  - **State:** je Gerät (SQLite), **nicht** sharen – nur **Events** replizieren.

---

## Repos & Verantwortungen

| Repo | Rolle (Kurz) | Kernfunktionen | Eingänge | Ausgänge |
| --- | --- | --- | --- | --- |
| **metarepo** | Control-Plane & Verträge | `repos.yml`, Templates, Reusable-CIs, **Contracts** (`*.schema.json`, OpenAPI) | — | Contracts, CI-Checks |
| **wgx** | Motorik & PC-Pflege | `doctor/clean/backup/metrics/drift`, System-Tasks | Jobs (hausKI), Policies (heimlern) | **Metrics-Snapshots**, Outcomes, Logs |
| **hausKI** | Orchestrator & Persistenzkern | Playbooks (YAML), Job-Runner, Policy-Hook, lokaler State (SQLite + JSONL Events), lokale API | Insights (semantAH), Metrics (wgx), Audio-Events, Außen-Events (optional) | Jobs→wgx, Decisions (heimlern), **Events**, Exporte für leitstand |
| **semantAH** | Wissen & Selbsterkenntnis | Vault/Docs-Ingest, Embeddings/Graph, Writer für **`insights/*`** | Vault, Code/Docs | `insights/today.json`, `weekly.md`, `.gewebe/index/*` |
| **heimlern** *(neu)* | Lernen/Policies (Lib) | Bandits/Heuristiken/Scorer, Eval-Harness, Snapshots laden/speichern | Kontext (hausKI), Feedback/Rewards | Decisions (`action, score, why`) |
| **hausKI-audio** | Musik/Audio-Schicht | Geräte-Profile, Routing, Übe-Sessions, Telemetrie | User-Aktion, Systemstatus | `audio.session_*`, `audio.latency_ms` |
| **leitstand** | Ingest + Panels (UI) | `POST /ingest/{domain}`, Panels „Heute/Wissen/PC/Musik/Außen“, Tages-Digest | Snapshots/Insights/Events | Visualisierung, Benachrichtigung |
| **aussensensor** | Außen-Signalgeber | Feeds/Sensoren/Webhooks → kuratierter **`feed.jsonl`** | Web/APIs/Sensorik/Weltgewebe | Außen-Events |
| **weltgewebe** | Karten-Interface (Außensphäre) | Gemeingüter/Neighborhood, Karten/Projekte/Beiträge | Nutzer/Web | Freigegebene Außen-Ergebnisse (→ aussensensor/leitstand) |
| **tools** | Skript-Bausteine | kleine Utilities (backup, health, diffs, exports) | — | von wgx/hausKI/semantAH genutzt |

---

## Kern-Kommunikationen (minimal & ausreichend)

**Produzenten → Konsumenten (Datei/API + Schemas aus `metarepo/contracts/`):**

- `semantAH → hausKI/leitstand`: `insights/today.json`, `weekly.md`
- `wgx → hausKI/leitstand`: `metrics.snapshot.json` (Host/Temps/Updates/Backup/Drift)
- `hausKI-audio → hausKI/leitstand`: `audio.session_*`, `audio.latency_ms`
- `aussensensor → leitstand`: `export/feed.jsonl` (kuratiert)
- `weltgewebe → aussensensor/leitstand`: freigegebene Außen-Ergebnisse (gleiches Event-Schema)
- `heimlern ↔ hausKI`: `decide(ctx) → action,why` · `feedback(reward)`

**hausKI intern:**

- `Playbooks (YAML)` triggern **wgx/hausKI-audio**; Outcomes gehen als **Events** ins JSONL + als **job_run** in SQLite.

---

## Datensynchronisierung (Kurzblaupause)

- **Vault & Sidecars:** P2P Datei-Sync (near-realtime) + **Git(+LFS)** für Historie.
- **Code:** Git Pull/Push (normal).
- **hausKI-State (SQLite):** **pro Gerät**, nicht syncen.
- **Events (`~/.hauski/events/*.jsonl`):** periodisch **mergen** (append, sort, de-dup), auf Wunsch über Server-Knoten.
- **Backups:** `restic` verschlüsselt (DB-Snapshots, Vault, Events) → Ziel deiner Wahl.

**Konfliktregeln:**

- Vault: Konfliktdateien → semantisches Diff (semantAH) → Merge-Vorschlag (hausKI) → Mensch entscheidet.
- Sidecars: neu erzeugen gewinnt.
- Events: Append-only → deterministischer Merge.

---

## Lern- & Entscheidungszyklus (Organismus)

1. **Perception:** semantAH/ wgx/ audio/ außen → Insights & Metrics & Events
2. **Plan:** hausKI Playbooks + **heimlern** Policies → Entscheidung (`action, why`)
3. **Act:** wgx / audio führen aus
4. **Reflect:** Outcomes in Events/SQLite → **feedback()** an heimlern → Policy-Parameter aktualisieren
5. **Explain:** leitstand zeigt „Was/Warum/Resultat“

Beispiele Policies (heimlern):

- Erinnerungsslot (Bandit, Reward = Reaktion)
- Backup-Timing (Heuristik mit Last/Netz/Busy-Score)
- Übe-Themen (Diversität vs. Kontinuität)
- PC-Warnschwellen (adaptiv)

---

## APIs (lokal, schlank)

- **hausKI:**
  - `POST /v1/policy/decide` · `POST /v1/policy/feedback` · `GET /v1/health/latest`
  - `POST /v1/ingest/metrics` · `GET /v1/events/tail` · `POST /v1/jobs`
- **leitstand:**
  - `POST /ingest/{domain}` · `GET /panels/{name}` · `GET /digest/today`
- **aussensensor:**
  - optional `POST /ingest/event` → `export/feed.jsonl` append-safe

(Alle lokal/mTLS; „deny-by-default“ für Netz in hausKI)

---

## Speicher & Formate

- **hausKI:** `~/.hauski/state/hauski.db` (jobs, job_runs, policy_param, health_snapshot), `~/.hauski/events/*.jsonl`
- **semantAH:** `vault/.gewebe/index/*` (rebuildbar), `vault/.gewebe/insights/*`
- **leitstand:** `data/*.jsonl`, `digest/*.md`
- **Schemas:** `metarepo/contracts/*.schema.json` (AJV-validiert via Reusable CI)

---

## Betriebs-Takt (Default)

| Task | Takt |
| --- | --- |
| Datei-Sync (Vault/Sidecars) | kontinuierlich |
| Git-Snapshot (Vault) | „15 min Ruhe“ **oder** >50 Änderungen |
| semantAH Insights | bei Idle / nachts |
| wgx Metrics Snapshot | stündlich + on-demand |
| Events-Merge (optional Server) | 30–60 min |
| DB-Backup (SQLite gz) | täglich 02:30 |
| Digest (leitstand) | täglich 08:00 |

---

## Sicherheit

- **At-rest:** Geräteverschlüsselung (LUKS/FileVault).
- **In-transit:** TLS/mTLS; signierte Requests für Event-Ingest.
- **Boundary außen:** nur kuratierte Feeds via aussensensor; weltgewebe strikt getrennt.

---

## Roadmap (inkrementell)

1. **Contracts & CI (metarepo)** → **wgx metrics** → **semantAH insights**
2. **hausKI Persistenz + Playbooks + heimlern-Hook**
3. **leitstand Panels** + **aussensensor feed**
4. Policies schärfen, Audio-Telemetrie, Außenquellen erweitern

---

### Essenz

Ein klar getrenntes, lokal-erstes System:

- **semantAH** liefert Sinn, **hausKI** entscheidet & behält Gedächtnis, **heimlern** verbessert Entscheidungen, **wgx** handelt, **leitstand** erklärt, **aussensensor/weltgewebe** verknüpfen die Außenwelt.
- **Sync:** Dateien & Code live, **State nie**, **Events immer** – so bleibt alles robust, erklärbar und erweiterbar.
