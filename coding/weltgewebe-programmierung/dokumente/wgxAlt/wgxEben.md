#!/usr/bin/env bash

wgx v1.23.0 - Universelles Git-Workflow-Tool

(Kombiniert die robusten Strukturen von v1.22.0 mit den Features von v1.19.8)

Kommentare und Ausgaben in Deutsch

VERSION=“1.23.0”

— Farbdefinitionen (sichere Farben, nur bei Terminal) —

if [[ -t 1 ]]; then
RED=”$(printf ‘\033[1;31m’)”
GREEN=”$(printf ‘\033[1;32m’)”
YELLOW=”$(printf ‘\033[1;33m’)”
BLUE=”$(printf ‘\033[1;34m’)”
BOLD=”$(printf ‘\033[1;1m’)”
RESET=”$(printf ‘\033[0m’)”
else
RED=”” GREEN=”” YELLOW=”” BLUE=”” BOLD=”” RESET=””
fi

— Logging —

LOGFILE=”/tmp/wgx-$(date +%Y%m%d_%H%M%S)-$$.log”

Logge alle Ausgaben für Diagnosezwecke

exec &> >(tee -a “$LOGFILE”)

— Globale Flags —

DRY_RUN=0
OFFLINE=0

— Hilfsfunktionen —

usage() {
echo “Verwendung: wgx [OPTIONEN]  [ARGUMENTE]”
echo “Optionen:”
echo “  –dry-run      Nur ausgeben, nichts ausführen”
echo “  –offline      Offline-Modus (kein Netzwerk-Fetch)”
echo “  -h, –help     Diese Hilfe anzeigen”
echo “  -v, –version  Version anzeigen”
echo “Befehle:”
echo “  status, sync, send, release, version, start, quick, test, lint, doctor, guard, heal, reload, clean, hooks, env, config, setup, init, stash, snapshot”
exit 1
}

Führt Befehle aus, oder gibt nur aus im Dry-Run-Modus

run_cmd() {
echo “${BLUE}Ausführen:${RESET} $” >&2
if [[ $DRY_RUN -eq 0 ]]; then
eval “$@”
else
echo “(Trockenlauf) $” >&2
fi
}

Pfad auflösen (realpath/Readlink Ersatz)

resolve_path() {
local target=”$1”
if command -v realpath >/dev/null 2>&1; then
realpath “$target”
elif command -v readlink >/dev/null 2>&1 && readlink -f “$target” >/dev/null 2>&1; then
readlink -f “$target”
else
# Fallback mittels Perl, sollte auf macOS/Termux verfügbar sein
perl -MCwd -e ‘print Cwd::abs_path(shift)’ “$target”
fi
}

Hilfe für git-Fehler

if ! git rev-parse –is-inside-work-tree >/dev/null 2>&1; then
echo “${RED}Fehler:${RESET} Kein Git-Repository gefunden. Bitte initialisieren Sie Ihr Git-Repo.” >&2
exit 1
fi

— Lade Konfiguration aus .wgx.conf falls vorhanden —

if [[ -f “.wgx.conf” ]]; then
# shellcheck source=/dev/null
source “.wgx.conf”
fi

— Verarbeite globale Optionen —

while [[ $# -gt 0 ]]; do
case “$1” in
–dry-run) DRY_RUN=1; shift ;;
–offline) OFFLINE=1; shift ;;
-h|–help) usage ;;
-v|–version) echo “wgx $VERSION”; exit 0 ;;
–) shift; break ;;
-*) echo “Unbekannte Option: $1”; usage ;;
*) break ;;
esac
done

if [[ $# -eq 0 ]]; then
usage
fi

— Hauptlogik anhand des Befehls —

COMMAND=”$1”; shift
case “$COMMAND” in
status)
echo “${BOLD}Status-Prüfung des Repositories:${RESET}”
if [[ $OFFLINE -eq 0 ]]; then
run_cmd “git fetch –all –prune”
else
echo “${YELLOW}Offline-Modus:${RESET} kein Fetch.” >&2
fi
echo “Arbeitsbaum-Status:”
git status -sb
# Prüfe Upstream-Abgleich
UPSTREAM=”$(git rev-parse –abbrev-ref @{u} 2>/dev/null)” || UPSTREAM=””
if [[ -n “$UPSTREAM” ]]; then
LOCAL=”$(git rev-parse @)”
REMOTE=”$(git rev-parse “@{u}”)”
BASE=$(git merge-base @ “@{u}”)
if [[ $LOCAL = $REMOTE ]]; then
echo “${GREEN}Aktuell${RESET}: lokal und Remote sind synchron.”
elif [[ $LOCAL = $BASE ]]; then
echo “${YELLOW}Update nötig:${RESET} Remote-Änderungen vorhanden.”
elif [[ $REMOTE = $BASE ]]; then
echo “${YELLOW}Push erforderlich:${RESET} Lokale Commits ausstehend.”
else
echo “${RED}Divergenz:${RESET} Lokale und entfernte Änderungen haben sich auseinanderentwickelt.”
fi
fi
;;
sync)
echo “${BOLD}Sync-Modus: Änderungen abgleichen…${RESET}”
# Ungespeicherte Änderungen stashen
if ! git diff –quiet; then
echo “Ungespeicherte Änderungen gefunden, speichere Stash.”
run_cmd “git stash push -u -m ‘wgx-sync-$(date +%s)’”
STORED_STASH=1
fi
if [[ $OFFLINE -eq 0 ]]; then
run_cmd “git fetch –all”
else
echo “${YELLOW}Offline-Modus:${RESET} kein Fetch.” >&2
fi
run_cmd “git pull –ff-only”
if [[ $STORED_STASH -eq 1 ]]; then
echo “Wende gespeicherten Stash an…”
run_cmd “git stash pop”
fi
;;
send)
echo “${BOLD}Erstelle Pull Request…${RESET}”
CURRENT_BRANCH=$(git rev-parse –abbrev-ref HEAD)
LABELS=””
if [[ “$CURRENT_BRANCH” == feat* || “$CURRENT_BRANCH” == feat ]]; then
LABELS=“feature”
elif [[ “$CURRENT_BRANCH” == fix* || “$CURRENT_BRANCH” == fix ]]; then
LABELS=“bugfix”
fi
if [[ “$CURRENT_BRANCH” == “master” || “$CURRENT_BRANCH” == “main” ]]; then
echo “${RED}Fehler:${RESET} Pull Requests sollten nicht vom Hauptbranch erstellt werden.” >&2
exit 1
fi
# Push aktueller Branch
run_cmd “git push -u origin $CURRENT_BRANCH”
# Prüfe CODEOWNERS für Reviewer
REVIEWERS=””
if [[ -f “.github/CODEOWNERS” ]]; then
REVIEWERS=$(grep -E -v ‘^\s*#’ .github/CODEOWNERS | grep -o ‘@[A-Za-z0-9_-]+’ | tr ‘\n’ ‘,’ | sed ‘s/,$//’)
fi
if command -v gh >/dev/null 2>&1; then
PR_CMD=“gh pr create –fill”
if [[ -n “$LABELS” ]]; then PR_CMD+=” –label $LABELS”; fi
if [[ -n “$REVIEWERS” ]]; then PR_CMD+=” –reviewer $REVIEWERS”; fi
run_cmd $PR_CMD
elif command -v glab >/dev/null 2>&1; then
PR_CMD=“glab mr create –fill”
if [[ -n “$LABELS” ]]; then PR_CMD+=” –label $LABELS”; fi
if [[ -n “$REVIEWERS” ]]; then PR_CMD+=” –assignee $REVIEWERS”; fi
run_cmd $PR_CMD
else
echo “${RED}Fehler:${RESET} Weder gh (GitHub CLI) noch glab (GitLab CLI) gefunden.” >&2
exit 1
fi
;;
release)
echo “${BOLD}Erstelle Release…${RESET}”
AUTO=0; LATEST=0; SIGN=0
# Flags parsen
while [[ $# -gt 0 ]]; do
case “$1” in
–auto-version) AUTO=1; shift ;;
–latest) LATEST=1; shift ;;
–sign-tag) SIGN=1; shift ;;
) break ;;
esac
done
# Bestimme Tag
if [[ $AUTO -eq 1 ]]; then
LAST_TAG=$(git describe –tags –abbrev=0 2>/dev/null || echo “v0.0.0”)
VNUM=${LAST_TAG#v}
BASE=${VNUM%.}
PATCH=${VNUM##.}
NEW_TAG=“v$BASE.$((PATCH+1))”
elif [[ $LATEST -eq 1 ]]; then
NEW_TAG=$(git describe –tags –abbrev=0 2>/dev/null)
else
if [[ $# -eq 0 ]]; then
echo “${RED}Fehler:${RESET} Bitte eine Versionsnummer angeben (z.B. v1.2.3) oder –auto-version.” >&2
exit 1
fi
NEW_TAG=”$1”
fi
# Tag erstellen und pushen
if [[ $SIGN -eq 1 ]]; then
run_cmd “git tag -s $NEW_TAG -m "Release $NEW_TAG"”
else
run_cmd “git tag -a $NEW_TAG -m "Release $NEW_TAG"”
fi
run_cmd “git push origin $NEW_TAG”
# Release erstellen mit CLI
if command -v gh >/dev/null 2>&1; then
run_cmd “gh release create $NEW_TAG –title "$NEW_TAG" –notes "Release $NEW_TAG"”
elif command -v glab >/dev/null 2>&1; then
run_cmd “glab release create $NEW_TAG –name "$NEW_TAG" –description "Release $NEW_TAG"”
else
echo “${YELLOW}Hinweis:${RESET} Kein GitHub/GitLab CLI gefunden. Release nur getaggt.” >&2
fi
;;
version)
SUB=”$1”; shift
if [[ “$SUB” == “bump” ]]; then
LAST_TAG=$(git describe –tags –abbrev=0 2>/dev/null || echo “v0.0.0”)
VNUM=${LAST_TAG#v}
BASE=${VNUM%.}
PATCH=${VNUM##.}
NEW_VER=”$BASE.$((PATCH+1))”
NEW_TAG=“v$NEW_VER”
run_cmd “git tag -a $NEW_TAG -m "Version bump to $NEW_TAG"”
run_cmd “git push origin $NEW_TAG”
echo “Version hochgesetzt auf $NEW_TAG”
elif [[ “$SUB” == “set” ]]; then
if [[ $# -eq 0 ]]; then
echo “${RED}Fehler:${RESET} Bitte eine neue Versionsnummer angeben.” >&2
exit 1
fi
NEW_TAG=”$1”
run_cmd “git tag -a $NEW_TAG -m "Setze Version auf $NEW_TAG"”
run_cmd “git push origin $NEW_TAG”
echo “Version auf $NEW_TAG gesetzt.”
else
echo “${RED}Unbekannter Subbefehl für version:${RESET} $SUB” >&2
exit 1
fi
;;
start)
echo “${BOLD}Starte Arbeitsbereich…${RESET}”
echo “Führe Schnellstart (quick) durch…”
“$0” quick
;;
quick)
echo “${BOLD}Quick-Modus: guard, sync, send, Test und Lint${RESET}”
“$0” guard || { echo “${RED}guard fehlgeschlagen${RESET}”; exit 1; }
“$0” test || { echo “${RED}test fehlgeschlagen${RESET}”; exit 1; }
“$0” lint || { echo “${RED}lint fehlgeschlagen${RESET}”; exit 1; }
“$0” sync || { echo “${RED}sync fehlgeschlagen${RESET}”; exit 1; }
“$0” send || { echo “${RED}send fehlgeschlagen${RESET}”; exit 1; }
;;
test)
echo “${BOLD}Führe Tests aus…${RESET}”
# Web-Tests (npm/yarn/pnpm)
if [[ -f package.json ]]; then
if command -v pnpm >/dev/null 2>&1; then
run_cmd “pnpm test”
elif command -v yarn >/dev/null 2>&1; then
run_cmd “yarn test”
elif command -v npm >/dev/null 2>&1; then
run_cmd “npm test”
else
echo “${YELLOW}Warnung:${RESET} Keinen Node-Paketmanager gefunden.” >&2
fi
fi
# Rust-Tests
if [[ -f Cargo.toml ]]; then
if command -v cargo >/dev/null 2>&1; then
run_cmd “cargo test”
else
echo “${YELLOW}Warnung:${RESET} cargo nicht installiert.” >&2
fi
fi
;;
lint)
echo “${BOLD}Führe Linter-Prüfungen durch…${RESET}”
# Node Linter-Tools
if [[ -f package.json ]]; then
if command -v eslint >/dev/null 2>&1; then
run_cmd “eslint . –max-warnings=0”
fi
if command -v prettier >/dev/null 2>&1; then
run_cmd “prettier –check .”
fi
if command -v markdownlint >/dev/null 2>&1; then
run_cmd “markdownlint **/.md”
fi
if command -v shellcheck >/dev/null 2>&1; then
for f in $(find . -type f -name ‘.sh’); do
run_cmd “shellcheck "$f"”
done
fi
if [[ -f Dockerfile && -x “$(command -v hadolint)” ]]; then
run_cmd “hadolint Dockerfile”
fi
fi
# Rust Linter/Formatter
if [[ -f Cargo.toml ]]; then
if command -v cargo >/dev/null 2>&1; then
run_cmd “cargo fmt – –check”
run_cmd “cargo clippy”
fi
fi
;;
doctor)
echo “${BOLD}Systemdiagnose…${RESET}”
# Git-Status
echo “Prüfe Git-Status…”
git status -sb
# Wichtige Tools
tools=(git gh glab node npm yarn pnpm cargo shellcheck hadolint)
for tool in “${tools[@]}”; do
if command -v “$tool” >/dev/null 2>&1; then
echo “${GREEN}$tool:${RESET} installiert”
else
echo “${YELLOW}$tool:${RESET} nicht gefunden”
fi
done
# Konfigurationsdatei
if [[ -f .wgx.conf ]]; then
echo “${GREEN}Konfig:${RESET} .wgx.conf gefunden”
else
echo “${YELLOW}Warnung:${RESET} .wgx.conf fehlt”
fi
;;
guard)
echo “${BOLD}Guard-Modus: Scans und Prüfungen…${RESET}”
# Geheimnis-Scan (einfache Mustererkennung)
echo “Überprüfe auf Geheimnisse…”
SECRETF=0
patterns=(“AKIA” “secret_key” “password” “BEGIN RSA PRIVATE KEY” “BEGIN EC PRIVATE KEY” “BEGIN DSA PRIVATE KEY”)
for pat in “${patterns[@]}”; do
if grep -R “$pat” . –exclude-dir=.git –exclude=”.lock” >/dev/null 2>&1; then
echo “${RED}Warnung:${RESET} Potentielles Geheimnis gefunden ("$pat").”
SECRETF=1
fi
done
# Konfliktmarker
if grep -R ’<<<<<<< ’ . –exclude-dir=.git >/dev/null 2>&1; then
echo “${RED}Fehler:${RESET} Git-Konfliktmarker (<<<<<<<) gefunden!”
SECRETF=1
fi
# Lockfile-Warnung
if [[ -f package.json ]]; then
if [[ -f package-lock.json && -f yarn.lock ]]; then
echo “${YELLOW}Hinweis:${RESET} Sowohl package-lock.json als auch yarn.lock vorhanden.”
elif [[ -f package-lock.json ]]; then
echo “package-lock.json vorhanden.”
elif [[ -f yarn.lock ]]; then
echo “yarn.lock vorhanden.”
else
echo “${YELLOW}Hinweis:${RESET} Kein Lockfile gefunden.”
fi
fi
# Große Dateien
echo “Prüfe auf große Dateien (>5MB)…”
bigs=$(find . -type f -size +5M)
if [[ -n “$bigs” ]]; then
echo “${YELLOW}Gefundene große Dateien:${RESET}”
echo “$bigs”
fi
# Vale (Dokumentation-Linter)
if command -v vale >/dev/null 2>&1; then
echo “Führe Vale (Dokumentation-Linter) aus…”
run_cmd “vale .”
fi
# Tests und Lint
echo “Führe Tests und Lint für Guard durch…”
“$0” test
“$0” lint
# Git-Hooks
echo “Prüfe Git-Hooks…”
for hook in pre-commit commit-msg pre-push; do
if [[ -x “.git/hooks/$hook” ]]; then
echo “$hook: installiert”
else
echo “$hook: ${YELLOW}nicht installiert${RESET}”
fi
done
# Ergebnis
if [[ $SECRETF -ne 0 ]]; then
echo “${RED}Guard hat Probleme festgestellt!${RESET}” >&2
exit 1
else
echo “${GREEN}Guard abgeschlossen. Keine Probleme erkannt.${RESET}”
fi
;;
heal)
echo “${BOLD}Heal-Modus: Versuche Probleme zu beheben…${RESET}”
# Konfliktmarker (müssen manuell gelöst werden)
if grep -R ’<<<<<<< ’ . –exclude-dir=.git >/dev/null 2>&1; then
echo “Konfliktmarker gefunden, bitte manuell lösen!”
fi
# Formatieren/Auto-Fix
if command -v eslint >/dev/null 2>&1; then
run_cmd “eslint –fix .”
fi
if command -v prettier >/dev/null 2>&1; then
run_cmd “prettier –write .”
fi
if [[ -f Cargo.toml ]] && command -v cargo >/dev/null 2>&1; then
run_cmd “cargo fmt”
# Clippy Autofix (experimentell)
if cargo clippy – -Zunstable-options –fix –allow-dirty >/dev/null 2>&1; then
echo “cargo clippy hat Autofixes angewendet.”
fi
fi
# Node-Abhängigkeiten aktualisieren
if [[ -f package.json ]]; then
run_cmd “npm install”
fi
# Änderungen committen
if ! git diff –quiet; then
run_cmd “git add .”
run_cmd “git commit -m "wgx heal: automatische Korrekturen angewendet"”
fi
;;
reload)
echo “${BOLD}Lade Konfiguration neu…${RESET}”
if [[ -f .wgx.conf ]]; then
# shellcheck source=/dev/null
source .wgx.conf
echo “Konfiguration neu geladen.”
else
echo “${YELLOW}Warnung:${RESET} .wgx.conf nicht gefunden.”
fi
;;
clean)
echo “${BOLD}Aufräumen: Entferne Artefakte…${RESET}”
if [[ -d node_modules ]]; then
run_cmd “rm -rf node_modules”
fi
if [[ -d dist ]]; then
run_cmd “rm -rf dist”
fi
if [[ -d target ]]; then
run_cmd “rm -rf target”
fi
run_cmd “git clean -fdx”
;;
hooks)
echo “${BOLD}Git Hooks verwalten…${RESET}”
echo “Vorhandene Hooks im .git/hooks-Verzeichnis:”
ls -1 .git/hooks | grep -v “sample” 2>/dev/null || echo “Keine Hooks installiert.”
;;
env)
echo “${BOLD}Umgebungsvariablen und Konfiguration:${RESET}”
echo “SHELL: $SHELL”
echo “TERM: $TERM”
echo “EDITOR: ${EDITOR:-$(git config –get core.editor)}”
echo “CI: ${CI:-false}”
if [[ -f .wgx.conf ]]; then
echo “Inhalt von .wgx.conf:”
sed ‘/^\s*#/d;/^\s*$/d’ .wgx.conf
else
echo “.wgx.conf nicht gefunden.”
fi
;;
config)
if [[ $# -eq 0 ]]; then
echo “Aktuelle wgx-Konfiguration:”
if [[ -f .wgx.conf ]]; then
sed ‘/^\s*#/d;/^\s*$/d’ .wgx.conf
else
echo “Keine .wgx.conf vorhanden.”
fi
else
KEY=”$1”; VAL=”$2”
if [[ -z “$KEY” || -z “$VAL” ]]; then
echo “${RED}Fehler:${RESET} Bitte Schlüssel und Wert angeben.”
exit 1
fi
if [[ ! -f .wgx.conf ]]; then
touch .wgx.conf
fi
if grep -q “^$KEY=” .wgx.conf; then
run_cmd “sed -i.bak ‘s/^$KEY=.*/$KEY=$VAL/’ .wgx.conf”
rm -f .wgx.conf.bak
else
run_cmd “echo "$KEY=$VAL" >> .wgx.conf”
fi
echo “Konfiguration gesetzt: $KEY=$VAL”
fi
;;
setup)
echo “${BOLD}Setup ausführen…${RESET}”
if [[ ! -f .wgx.conf ]]; then
echo “Erstelle Standard-Konfiguration .wgx.conf”
cat >.wgx.conf <<EOF

wgx Konfiguration

BASE=main
SIGNING=false
CI_WORKFLOW=ci.yml
AUTO_BRANCH=true
EOF
fi
# PR-Template kopieren (falls vorhanden)
if [[ -f .wgx/pr_template.md ]]; then
mkdir -p .github
run_cmd “cp .wgx/pr_template.md .github/pull_request_template.md”
fi
# Installer-Skript ausführen (falls vorhanden)
if [[ -f cli/wgx/install.sh ]]; then
echo “Installiere Git Hooks…”
run_cmd “bash cli/wgx/install.sh”
fi
echo “Setup abgeschlossen.”
;;
init)
echo “${BOLD}Initialisiere neues Projekt…${RESET}”
run_cmd “git init”
run_cmd “git branch -M main”
if [[ ! -f README.md ]]; then
echo “# Neues Projekt” > README.md
run_cmd “git add README.md”
fi
run_cmd “git commit -m "Initialer Commit"”
echo “Projektinitialisierung abgeschlossen.”
“$0” setup
;;
stash)
SUB=”$1”; shift
case “$SUB” in
save)
MSG=”$*”
if [[ -z “$MSG” ]]; then
MSG=“wgx-$(date +%Y%m%d_%H%M%S)”
fi
run_cmd “git stash push -m "$MSG"”
;;
pop)
run_cmd “git stash pop”
;;
list)
git stash list
;;
*)
echo “${RED}Unbekannter Subbefehl für stash:${RESET} $SUB” >&2
exit 1
;;
esac
;;
snapshot)
echo “${BOLD}Erstelle Snapshot…${RESET}”
if ! git diff-index –quiet HEAD –; then
echo “${RED}Fehler:${RESET} Es gibt ungespeicherte Änderungen. Bitte committen oder stashen für Snapshot.” >&2
exit 1
fi
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE=“snapshot-${TIMESTAMP}.tar.gz”
run_cmd “git archive –format=tar.gz -o $ARCHIVE HEAD”
echo “Snapshot gespeichert in $ARCHIVE”
;;
*)
echo “${RED}Unbekannter Befehl:${RESET} $COMMAND” >&2
usage
;;
esac