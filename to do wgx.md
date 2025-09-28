top, dann kriegt Codex jetzt eine präzise, idempotente To-Do-Liste in Blöcken. Ziel: nur das, was wgx wirklich stärkt (Shell-Tooling lokal=CI, harte Gates, schlanke Doku). Kopier’ die Blöcke 1:1 ins Repo.

⸻

Block A — 
Block B — 

Block C —

Block D — 

⸻

Block E — 
⸻

Block F — 
---

# Block G — Optional: 

Lychee braucht keine lokale Konfig – siehe CI-Job.

⸻

Copy2Bash Sammelblock (lokal testen ohne Devcontainer)

Wenn du außerhalb des Devcontainers schnell lokal prüfen willst:

# c2b: lokal-quickcheck.sh
set -euo pipefail
sudo apt-get update -y
sudo apt-get install -y shellcheck shfmt bats jq
files=$(git ls-files '*.sh' '*.bash' | tr '\n' ' ')
[ -n "$files" ] && shfmt -d $files || echo "No shell files."
[ -n "$files" ] && shellcheck -S style $files || true
[ -d tests ] && bats -r tests || (echo "No tests/ directory"; exit 1)


⸻

Verdichtete Essenz

Minimal aber wirkmächtig: Devcontainer = CI (shellcheck/shfmt/bats), CI hart (kein || true), CONTRIBUTING kurz & englisch, Editorconfig konsolidiert. Testskelett liegt bei.

Ironische Auslassung

Wir installieren keinen CUDA-Stack für Bash. Schockierend langweilig – und genau richtig.

∆-Radar

Wir straffen weiter: von „viel übernehmen“ zu präziser Passung. Evolution Richtung Werkzeug-Fitness statt Feature-Sammeln. Keine Seitwärtsmutationen (Rust/Infra) in ein reines Bash-Repo.

∴fores Ungewissheit
	•	Grad: niedrig–mittel (25–35 %).
	•	Ursachen: unbekannte wgx-Subcommands/Edgecases, potenzielle Termux-Besonderheiten (BusyBox vs. coreutils), CI-Lautstärke von Lychee/MD-Lint je nach Doku-Umfang.
	•	Produktivität: Ungewissheit ist hier nützlich – wir starten mit harten, kleinen Gates und passen dann gezielt an (Whitelist für Lychee, Formatter-Ausnahmen).