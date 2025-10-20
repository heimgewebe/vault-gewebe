# WGX – Master-Konzept

WGX (`weltgewebe-exchange`) ist ein schlanker Meta-Layer, der als zentrales Werkzeug zur Orchestrierung und Synchronisation von Konfigurationen über alle Repositories der `heimgewebe`-Flotte dient. Es stellt sicher, dass kanonische Vorlagen (Templates) konsistent auf alle Sub-Repos angewendet werden.

Die Priorisierung der Entwicklungsumgebungen für WGX-Operationen ist wie folgt: Devcontainer → Devbox → mise/direnv → Termux.

## WGX-Befehle

Die folgenden Befehle werden über das `scripts/wgx`-Skript ausgeführt und ermöglichen die Verwaltung der gesamten Flotte.

### `list`
Zeigt eine detaillierte Liste aller im `repos.yml` definierten Repositories an. Die Ausgabe enthält den Namen des Repos, den Branch, die URL und alle Abhängigkeiten.

**Anwendung:**
```bash
./scripts/wgx list
```

### `plan`
Erstellt eine Vorschau der Aktionen, die der `up`-Befehl ausführen würde, ohne jedoch Änderungen vorzunehmen. Er listet die Template-Dateien auf, die in jedes Ziel-Repository kopiert werden. Dies ist nützlich für einen Dry-Run.

**Anwendung:**
```bash
./scripts/wgx plan
```

### `up`
Der Hauptbefehl zur Synchronisation der Templates. Er klont jedes Repository, kopiert die Vorlagen aus dem `templates`-Verzeichnis, ersetzt Variablen wie `{{REPO_NAME}}`, committet die Änderungen in einen neuen Branch und öffnet automatisch einen Pull Request.

**Anwendung:**
```bash
./scripts/wgx up
```

### `run [workflow]`
Startet einen angegebenen GitHub-Actions-Workflow in allen Repositories der Flotte. Standardmäßig wird der `ci`-Workflow ausgelöst.

**Anwendung:**
```bash
./scripts/wgx run          # Startet den 'ci'-Workflow
./scripts/wgx run build    # Startet den 'build'-Workflow
```

### `doctor`
Führt eine Diagnose durch, um sicherzustellen, dass alle Abhängigkeiten (wie `git`, `gh`, `jq`) installiert sind und die Konfiguration (Owner, Modus) korrekt geladen wird.

**Anwendung:**
```bash
./scripts/wgx doctor
```

### `validate`
Überprüft die `repos.yml`-Datei auf syntaktische Korrektheit.

**Anwendung:**
```bash
./scripts/wgx validate
```

### `smoke`
Ein einfacher Health-Check, der die Anzahl der in der Flotte konfigurierten Repositories ausgibt.

**Anwendung:**
```bash
./scripts/wgx smoke
```

---
**Verteilung**: Diese Datei wird als Referenz in Subrepos gespiegelt (`templates/docs/wgx-konzept.md`).
Änderungen hier -> `just up` -> Subrepos erhalten Updates.

Siehe auch `.wgx/profile.yml` für repo-lokale Profile.
