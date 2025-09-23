Basierend auf der Dokumentation im Repository sehe ich mehrere mögliche Gründe, warum der Codespace im Recovery Mode läuft:

## Wahrscheinliche Ursachen

**1. Leere postCreate.sh-Datei**
Die Datei `.devcontainer/scripts/postCreate.sh` ist 0 Bytes groß und leer. Diese Datei wird laut `devcontainer.json` als `postCreateCommand` ausgeführt, könnte aber fehlschlagen oder unvollständig sein.

**2. Fehlende Node.js/Development-Tools**
Das Devcontainer basiert auf `mcr.microsoft.com/devcontainers/base:ubuntu`, aber die package.json-Dateien deuten auf Node.js-Abhängigkeiten hin. Möglicherweise fehlen:

- Node.js/npm Installation
- Rust Toolchain (für `apps/api/`)
- Build-Tools für das Monorepo

**3. Inkonsistente Entwicklungsumgebung**
Laut Dokumentation ist dies ein “Clean-Slate Docs-only” Repository (ADR-0001). Die Devcontainer-Konfiguration könnte noch auf den alten Zustand ausgerichtet sein, bevor der Code-Rückbau stattfand.

## Konkrete Prüfschritte

Prüfe in den Codespace-Logs:

```bash
# Prüfe postCreate.sh Ausführung
echo "#!/usr/bin/env bash" > .devcontainer/scripts/postCreate.sh
echo "echo 'postCreate setup started'" >> .devcontainer/scripts/postCreate.sh
chmod +x .devcontainer/scripts/postCreate.sh

# Prüfe installierte Tools
which node npm cargo
```

**Kritikpunkt**: Die Devcontainer-Konfiguration scheint nicht auf den aktuellen “Docs-only”-Zustand abgestimmt zu sein. Sie referenziert Rust- und Node.js-Tools (`rust-lang.rust-analyzer`, ESLint), obwohl das Repository laut ADR-0001 zurückgebaut wurde.

## Empfohlene Lösung

Passe die `.devcontainer/devcontainer.json` an den aktuellen Docs-only-Status an oder vervollständige `postCreate.sh` mit den nötigen Tool-Installationen für die geplanten Gates A-D.​​​​​​​​​​​​​​​​