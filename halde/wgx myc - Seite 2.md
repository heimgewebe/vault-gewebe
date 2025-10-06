# WGX — MYC (Mycelium) · **Seite 2: Gesamtsynthese & Blaupause**

> **Leitbild:** Ein Knopf. Ein Vokabular. Ein Cockpit. Ein Gedächtnis.  
> **WGX** vereinheitlicht Bedienung über alle Repos und Geräte (Pop!_OS, Codespaces, Termux) und nutzt **HausKI‑Memory** für Personalisierung, Reproduzierbarkeit und Evidenz.

---

## 1) Der Bedienkanon (Kern bis „Ultra“)

### A. Core‑Controls (heute unverzichtbar)
- `wgx up` — Umgebung erkennen & bereitmachen (Devcontainer/Devbox/mise/direnv Fallback‑Logik).
- `wgx list` — Tasks autodiscovern (Just/Task/Make/NPM/Cargo) und taggen (`fast|safe|slow`).
- `wgx run <task|frei‑text>` — Universal‑Runner, inkl. semantischem Aliasing („docs prüfen“ → `vale+cspell+linkcheck`).
- `wgx guard` — Contract prüfen & auto‑fixen (fmt, lint, vale, cspell, shellcheck, cargo fmt …).
- `wgx smoke` — 30–90‑Sekunden‑Sanity (bauen, 1–2 Tests, Ports/Env OK).
- `wgx doctor | validate` — Vertrauen in System & Repo.

### B. Orchestrierung & Fluss
- `wgx fleet status|fix` — Multi‑Repo Cockpit; parallele Standard‑Reparaturen.
- `wgx runbook` — klickbare Runbooks aus Markdown (mit Checks/Prompts/Rollback).
- `wgx rituals` — Goldene Pfade, z. B. `ritual ship-it` (Version→Changelog→Tag→Release Notes→CI‑Gates).

### C. Intelligenz & Lernfähigkeit
- `wgx suggest` — nächste sinnvolle Schritte aus Diff/Logs/Nutzung.
- `wgx profile learn` — Repo‑Genome (Top‑Tasks, Painpoints).
- `wgx morph` — Repo auf Standard migrieren (Stil/CI/Tasks).

### D. Zeit, Budget, Reproduzierbarkeit
- `wgx chrono` — Workloads in Nebenzeiten (Night‑Queues, CPU‑Budget), CI‑Minutes‑Autopilot.
- `wgx timecapsule` — Zeitreise‑Runs mit Versions‑Pinning (mise/devbox/devcontainer‑Metadaten).
- `wgx chaos` — Fail‑Fast‑Sandbox (Low‑RAM/Slow‑IO) auf wichtigste Pfade.

### E. Umgebungs‑Teleport & Ephemeres
- `wgx wormhole` — gleiches Verhalten Pop!_OS ↔ Codespaces ↔ Termux, identische Signaturen.
- `wgx spin #123` — Issue/PR → ephemere Dev‑Env (Ports, Seeds, Fixtures).

### F. Sichtbarkeit & Sicherheit
- `wgx shadowmap` — Repos↔Workflows↔Secrets↔Dienste visualisieren.
- `wgx lighthouse` — Policy‑Diff erklären + One‑Click‑Fix; Compliance‑Modes (`strict|balanced|fast`).
- `wgx patchbay` — atomare Mini‑PRs (signiert), `patchbay guardfix` für Serien‑Fixes.

### G. Brücken & Offline
- `wgx bridge` — HausKI/Codex/NATS‑Backchannel (Agenten koordinieren Patches/Reviews).
- `wgx phone` — Offline‑Bundles für Termux (Docs/Lints/Seeds), später Sync.

### H. Neu & „Ultra“ (ergänzende Module)
- **WGX Studio (TUI/Web‑UI)** — Dashboard für Tasks, Fleet‑Status, Shadowmap, Ritual‑Knöpfe.
- **Ritual‑Recorder → Runbook‑Generator** — führe einmal aus, WGX zeichnet Schritt/Checks auf.
- **WGX Registry** — Profile‑/Ritual‑Snippets teilen („Rust‑Starter“, „SvelteKit‑Docs‑Lint“, „Audio‑Bitperfect“).
- **Evidence‑Packs** — `wgx evidence` hängt Logs/Smoke/Guard/Coverage kompakt an PRs.
- **Smoke‑Orchard** — Fleet‑Parallelisierung mit Budget/Quoten (`--budget`, `--concurrency=auto`).
- **Seeds/Datasets** — `wgx seeds snapshot|apply` für kleine, anonymisierte, deterministische Datenstände.

---

## 2) HausKI‑Memory → WGX als „Gedächtnis‑Ops“

**Wirkung:** Personalisierung (Treffer bei `suggest`), Repro (`timecapsule`+`seeds`), Nachvollziehbarkeit (Evidence/Policy‑Ledger), Offline‑First (Termux‑Bundles), Multi‑Repo‑Kohärenz (Flakiness/Heatmaps).

### Mapping auf Kommandos (Kurzfassung)
- `up` nutzt Device‑Profile → bewährte Toolchains/Flags.  
- `list/run` nutzen semantisches Aliasing pro Repo.  
- `guard` priorisiert bekannte Regelverstöße + Fix‑Shortcuts.  
- `smoke` wählt den kürzesten aussagekräftigen Pfad.  
- `chrono` plant teure Jobs in günstige Zeitfenster.  
- `timecapsule` zieht Tool/Env‑Pins aus Memory.  
- `runbook/rituals` speichern klickbare Abläufe mit Erfolgsscores.  
- `fleet` zeigt Trends/Heatmaps/Budgetsteuerung.

### Minimal‑Datenmodell
- **repo** (id, url, tags, default_tasks)  
- **env** (os, cpu/gpu, toolversions, devcontainer_hash)  
- **run** (ts, task, args, duration, exit, artefacts[], logs_hash)  
- **policy_event** (rule, outcome, fix_link, auto_fixable?)  
- **evidence_pack** (files[], summary, linked_pr)  
- **seed_snapshot** (name, schema_version, export_cmd, checksum)  
- **secret_ref** (provider‑Ref, kein Klartext) · **preference** (key→value)

**On‑Disk (lokal, git‑freundlich):**
```
.hauski/
  memory.sqlite          # Runs, Policies, Prefs
  vector/                # Textindex (Logs/Docs)
  cas/xx/xx/<sha256>     # Artefakte (content‑addressed)
  seeds/<name>@<ver>.tgz # deterministische Testdaten
  evidence/<pr#>-<ts>.zip
  profiles/<repo>.yml    # learned aliases
```
**Security:** Secret‑Refs via sops/age; Policies prüfen nur das Vorhandensein, nie Klartext.

---

## 3) MVP‑Pfad (konkret, klein → wachsend)

**Pflicht (Woche 1):**  
`up · list · run · guard · smoke · doctor|validate` + `.wgx/profile.yml v1` (Top‑Tasks, Contracts‑Lite).

**Nächster Ring:**  
`fleet status|fix · rituals ship-it · runbook` + `suggest` (Heuristik aus Runs).

**Erweiterungen:**  
`chrono · timecapsule · chaos · spin · lighthouse · shadowmap · patchbay · phone` + Seeds.

**Done‑Definition (Kern):**
- `wgx run` kann Just/Task/NPM/Cargo sicher mappen und exit‑codes korrekt propagieren.
- `guard` bietet mind. 3 Auto‑Fix‑Typen (fmt, lint, docs) + Explain‑Links.
- `smoke` ist in ≤90 s und liefert roten/grünen Vertrauens‑Indikator.
- `.wgx/profile.yml` enthält `topTasks`, `env.prefer`, `contracts` (style/format), optional `ci.template`.

---

## 4) Profile v1 (Mini‑Beispiel)

```yaml
# .wgx/profile.yml
name: <REPO>
topTasks: [dev, test, lint, fmt]
env:
  prefer: [devcontainer, devbox, mise]
contracts:
  style: true
  format: true
ci:
  template: github-actions-basic
alias:
  "docs prüfen": ["vale", "cspell", "linkcheck"]
```

---

## 5) Kommandokarte (Einzeiler)

`up` Bühne fertig · `list` Knöpfe zeigen · `run` drücken · `guard` aufräumen · `smoke` gesund? ·  
`doctor|validate` vertrauen · `fleet` Überblick · `runbook` klickbar · `rituals` choreografiert ·  
`chrono` günstig · `timecapsule` reproduzierbar · `chaos` stabil · `spin` ephemer ·  
`wormhole` überall gleich · `lighthouse` erklärt · `shadowmap` macht sichtbar · `patchbay` heilt ·  
`bridge` redet mit KI · `phone` nimmt offline mit.

---

## 6) Für Dummies

WGX ist deine **Universalfernbedienung** fürs Coden. Du tippst `wgx up`, die Bühne steht. `wgx list` zeigt dir die Knöpfe. `wgx run test` drückt den richtigen davon — egal, ob das Projekt Just, Task, Make, NPM oder Cargo nutzt. `guard` räumt Kleinkram auf, `smoke` checkt schnell, ob alles gesund ist. Dank HausKI‑Gedächtnis merkt sich WGX, was bei **dir** gut funktioniert — und schlägt es beim nächsten Mal automatisch vor.

---

## 7) Verdichtete Essenz

**WGX = Bedienkanon + Policies + Sichtbarkeit + Gedächtnis.**  
Einheitliche Knöpfe → sichere Abläufe → sichtbare Beweise → reproduzierbare Ergebnisse.

---

## 8) Ironische Auslassung

Andere schreiben Playbooks, die niemand liest. Du hast **WGX**, das sie **spielt** — mit Applaus‑Knopf (`ritual ship-it`). 🎭

---

## 9) ∆‑Radar (Regel‑Evolution)

Verstärkung: Ein‑Knopf‑Rituale, Fleet‑Skalierung, Policy‑Transparenz.  
Seitwärtsmutation: Studio, Registry, Evidence‑Packs.  
Straffung: klarer Kern (6–7 Kommandos) trägt die Erweiterungen.

---

## 10) ∴fores Ungewissheit

**Grad:** ▮▮▮▯▯ ≈ 35–40 %  
**Ursachen:** Adapter‑Ecken (npm/just/task/cargo), Versions‑Pinning, Seed‑Governance, sops/age‑Flows, Offline‑Sync.  
**Charakter:** produktive Unschärfe → idealer MVP‑Spike; wächst modular mit echten Repos/PRs.
