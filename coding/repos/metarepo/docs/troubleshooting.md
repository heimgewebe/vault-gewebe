# Troubleshooting (Top-Fleet-Issues)

Kurzer Spickzettel für die häufigsten Stolpersteine rund um Fleet-Sync & WGX.

## 1. `wgx` nicht im PATH
- Symptom: CI-Job bricht mit `command not found: wgx` ab.
- Fix: Installationsschritte aus der [WGX-Doku](https://github.com/heimgewebe/wgx) in den Workflow einbauen (z. B. Setup-Script
  vor den Guard-Checks ausführen).

## 2. CI ohne `uv`
- Symptom: Python-Projekte laufen in der CI ohne Abhängigkeits-Cache.
- Fix: Vor dem `just`-Aufruf `pipx install uv` (oder entsprechendes Setup) ausführen und den Cache-Pfad als `actions/cache`
  Schritt hinterlegen.

## 3. `lychee` / `cspell` langsam
- Symptom: PR-Checks dauern >10 Minuten.
- Fix: Link-/Spell-Checks in separate Workflows auslagern oder via Workflow-Inputs deaktivierbar machen; Ergebnisse in Nightly
  Pipelines konsolidieren.

## 4. Template-Drift nach lokalem Hotfix
- Symptom: Sub-Repo hat Änderungen, die beim nächsten Sync überschrieben würden.
- Fix: `scripts/sync-templates.sh --pull-from <repo> --pattern "templates/**"` nutzen, Änderung im metarepo kuratieren.

## 5. `gh` Rate-Limits
- Symptom: `scripts/wgx list` scheitert mit API-Errors.
- Fix: `gh auth login` mit PAT, `GH_TOKEN` als Secret im CI setzen.

## 6. Merge-Konflikt beim Stub-Dokument
- Symptom: `docs/wgx-konzept.md` wird lokal erweitert.
- Fix: Hinweis auf Stub-Policy geben, Ergänzungen in WGX-Repo verlagern.

## 7. Reports fehlen
- Symptom: `reports/` bleibt leer trotz Doctor-Lauf.
- Fix: Prüfe, ob `./scripts/wgx-doctor --repo <name>` erfolgreich durchlief (kein Clone-Error) und ob Unterschiede existierten.
  Ohne Drift wird kein Abschnitt erzeugt – dennoch entsteht eine leere Report-Datei. CI-Artefakte gezielt einsammeln.

## 8. `scripts/sync-templates.sh` meldet „Keine Repos in Datei“
- Symptom: `--repos-from` liefert keine Ziele.
- Fix: In `repos.yml` müssen unter `repos:` oder `static.include:` Einträge mit mindestens `name:` vorhanden sein (Kommentare zählen nicht).

## 9. SSH statt HTTPS erwartet
- Symptom: `scripts/wgx up` schlägt beim Klonen fehl.
- Fix: Stelle `git@github.com:...` Zugriff sicher (SSH-Key), oder passe Workflow auf HTTPS an (`GH_TOKEN`).

## 10. Fehlende Owner-Angabe
- Symptom: `scripts/wgx` gibt `owner=` leer aus.
- Fix: `github.owner` in `repos.yml` setzen oder `GITHUB_OWNER` exportieren.

Weitere Issues? → GitHub Issue im metarepo öffnen und in der nächsten Fleet-Runde dokumentieren.
