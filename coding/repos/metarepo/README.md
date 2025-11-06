![WGX](https://img.shields.io/badge/wgx-enabled-blue)
[![Docs link check](https://github.com/heimgewebe/metarepo/actions/workflows/linkcheck.yml/badge.svg)](https://github.com/heimgewebe/metarepo/actions/workflows/linkcheck.yml)

# metarepo

Zentrale Steuerzentrale (Meta-Layer) für alle Repos von **heimgewebe**. Dieses Repository liefert Templates, Automatisierungen und Dokumentation, damit Sub-Repos synchron laufen.

> Lizenz: `SPDX-License-Identifier: MIT` – siehe [LICENSE](LICENSE).

## Quick Links
- [Kernkonzepte](docs/konzept-kern.md)
- [WGX-Kommandos](docs/wgx-konzept.md)
- [Fleet-Gesamtbild](docs/heimgewebe-gesamt.md)
- [Repo-Matrix](docs/repo-matrix.md)
- [Contracts & Versionierung](docs/contract-versioning.md)

Weitere visuelle Assets: [Systemdiagramm (Mermaid)](docs/system-overview.mmd) · [Canvas](docs/canvas/) · [Org-Graph](docs/org-graph.mmd).

## Getting started

### Voraussetzungen
- **`just`** – Kommando-Orchestrierung (Installationshinweise siehe [Offizielle `just`-Docs](https://github.com/casey/just)).
- **`uv`** – Python-Tooling-Manager zum Aufsetzen der Abhängigkeiten (`uv sync --frozen`).
- **`yq`** – Wird automatisch über `scripts/tools/yq-pin.sh` gezogen, wenn du `just`-Targets ausführst.

### hausKI-Contributor
1. **Repo klonen** und `uv sync --frozen` oder `just deps` ausführen.
2. `just list` – Überblick über alle angebundenen Repos.
3. `just up` – Templates synchronisieren (Dry-Run optional per `WGX_DRY_RUN=1`).
4. `just smoke` oder `just run target="smoke"` – Fleet-Healthcheck.
5. Lies die Spezialdokumente für hausKI: [Use-Cases](docs/use-cases.md) & [Automation](docs/automation.md).

### semantAH-User / Consumer-Repos
1. `just list` – Prüfe, welche Assets für semantAH bereitstehen.
2. `./scripts/wgx plan --pattern "templates/semantAH/**"` – Vorschau der verfügbaren Artefakte.
3. Für Pull-Learning: `./scripts/sync-templates.sh --pull-from semantAH --pattern "templates/**"`.
4. Referenz: [Docs/contracts/index.md](docs/contracts/index.md) für das `insights`-Schema.

### Tooling-Cheatsheet
- `just help` – Kurzüberblick über die wichtigsten Just-Targets.
- `just up` – Fleet synchronisieren.
- `just wgx_validate` – Konsistenzprüfung gegen WGX.
- `just validate` – lokale Checks (YAML, Formatierungen, etc.).
- `./scripts/wgx plan` – Dry-Run der Template-Verteilung (mit `PLAN_LIMIT=0` für alle Dateien).

## Contributing
Der vollständige Ablauf (Branch-Strategie, lokale Checks, PR-Template) ist in [CONTRIBUTING.md](CONTRIBUTING.md) beschrieben.

Kurzfassung:
- Nutze `just validate` vor jedem Commit.
- Drift & Pull-Learning laufen über `scripts/sync-templates.sh` und `scripts/wgx-doctor`.
- Reports zu Template-Runs landen in [`reports/sync-logs/`](reports/sync-logs/); neuer Report via `just log-sync`.

> Hinweis: Der `/ask`-Server begrenzt den Parameter `k` auf ≤100. Für automatisierte Checks setze `ASK_ENDPOINT_URL` und `METRICS_SNAPSHOT_URL` als Secrets.

## Devcontainer
Siehe [.devcontainer/README.md](.devcontainer/README.md) für die Docker-Socket- und Docker-in-Docker-Varianten. Wähle die gewünschte Variante via `just devcontainer:socket` bzw. `just devcontainer:dind` oder synchronisiere Pins mit `just devcontainer:sync`.

```bash
# Pins aktualisieren und Socket-Variante setzen
just devcontainer:sync
just devcontainer:socket
```

## Contracts (Kurz)
Zentrale Schemas und Reusables liegen im metarepo und werden über Tags (z. B. `contracts-v1`) konsumiert. Details: [docs/contracts/index.md](docs/contracts/index.md)

| Contract | Producer | Consumer |
| --- | --- | --- |
| `aussen.event` | aussensensor, (optional) weltgewebe | leitstand |
| `metrics.snapshot` | wgx | hausKI, leitstand |
| `insights` | semantAH | hausKI, leitstand |
| `audio.events` | hausKI-audio | hausKI, leitstand |
| `policy.decision` | heimlern | hausKI |
| `event.line` | hausKI | leitstand |

## Org-Übersicht
- **Index:** [docs/org-index.md](docs/org-index.md)
- **Graph:** rendere [docs/org-graph.mmd](docs/org-graph.mmd) z. B. in Obsidian/VS Code (Mermaid).

## Dokumentation & Referenzen
- [Docs-Index](docs/README.md) – thematische Übersicht aller Metarepo-Dokumente
- [Systemübersicht](docs/system-overview.md) – Repos, Verantwortlichkeiten & Einstiegspunkte
- [Architektur](docs/architecture.md) – Komponenten, Datenflüsse & Diagramme
- [Use-Cases](docs/use-cases.md) – Schritt-für-Schritt-Beispiele für typische Aufgaben
- [Automatisierung & CI](docs/automation.md) – Just-Targets, WGX-Kommandos & Workflows
- [Umgebung & Secrets](docs/environment.md) – lokale Konfiguration, Tokens & .env-Hinweise
- [Troubleshooting & FAQ](docs/troubleshooting.md) – häufige Probleme & Fixes
- [Events & Contracts](docs/contracts/index.md) – Schemas, Referenzen & Versionierung
- [End-to-End-Läufe](docs/e2e.md) – automatisierte Kette `aussensensor → leitstand → heimlern`

## Codex Playbook (Kurz)
1. Pull-Lernen: `./scripts/sync-templates.sh --pull-from <repo> --pattern "templates/docs/**"`
2. Drift-Report: `./scripts/wgx-doctor --repo <repo>`
3. Push-Kanon: `./scripts/sync-templates.sh --push-to <repo> --pattern "templates/.wgx/profile.yml"`

Tipp: `--dry-run` liefert eine sichere Vorschau; Repos-Liste: `repos.yml` & `--repos-from`.
