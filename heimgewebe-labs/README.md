# Heimgewebe Labs - Umsetzungsplan

Dieses Verzeichnis enthält konkrete Artefakte zur Standardisierung und Bereinigung der Heimgewebe-Architektur.

## 1. Übersicht

Basierend auf der Analyse des Vaults und der Architekturdokumente (`heimgewebe.md`, `allerepos.md`) konzentriert sich dieser Plan auf zwei Hauptziele:

1.  **Standardisierung der Flotte:** Rollout von `.ai-context.yml` und Standard-CI-Workflows in alle Repositories.
2.  **Bereinigung des Toolings:** Zentralisierung von JSONL-Skripten im `tools`-Repo und Deprecation lokaler Kopien.

## 2. Verwendung der Artefakte

### A. Flottenweiter Standard-Rollout

Das Skript `rollout.sh` klont alle relevanten Repositories (außer `weltgewebe`), erstellt Branches und PRs für die fehlenden Standarddateien.

**Voraussetzungen:**
*   `gh` CLI installiert und authentifiziert.
*   `GH_TOKEN` Umgebungsvariable gesetzt (für PR-Erstellung).

**Ausführung:**
```bash
# Im Verzeichnis heimgewebe-labs/
export GH_TOKEN= dein_token
./rollout.sh
```

**Was passiert:**
*   Klont Repos nach `work/`.
*   Kopiert Templates aus `templates/` (ai-context, editorconfig, workflows).
*   Erstellt Commits und PRs auf Branch `optimize/ai-context-and-standards`.

### B. Roadmap & Doku-Update (Metarepo)

Wende den Patch für das Metarepo an, um die Roadmap hinzuzufügen.

```bash
cd /pfad/zu/metarepo
git apply /pfad/zu/vault-gewebe/heimgewebe-labs/patches/metarepo-roadmap.patch
```

### C. JSONL Tools Zentralisierung (Tools & Producer)

1.  **Tools-Repo aktualisieren:**
    Wende den Patch im `tools`-Repo an, um die README zu ergänzen und Skripte als "canonical" zu markieren.
    ```bash
    cd /pfad/zu/tools
    git apply /pfad/zu/vault-gewebe/heimgewebe-labs/patches/tools-repo-canonical.patch
    ```

2.  **Producer-Repos bereinigen:**
    In Repos wie `aussensensor` sollten lokale Skripte (`scripts/jsonl-validate.sh` etc.) entweder gelöscht oder mit einem Deprecation-Header versehen werden.
    ```bash
    # Beispiel für Aussensensor
    cd /pfad/zu/aussensensor
    git apply /pfad/zu/vault-gewebe/heimgewebe-labs/patches/consumer-jsonl-deprecation.patch
    ```

## 3. Nächste Schritte (Architektur)

Nach der Standardisierung stehen folgende Punkte an:
*   **Ingest-Pfad:** Migration aller Services auf `leitstand /v1/ingest`.
*   **Contract-Naming:** Vereinheitlichung auf Punktnotation (z.B. `os.context.intent`).
*   **Heimlern-Datenfluss:** Umstellung von Direkt-Push auf Konsum via Leitstand.
