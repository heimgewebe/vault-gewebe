#!/usr/bin/env bash
# wgx installer (Block 1/4) – schreibt eine gehärtete, monolithische wgx-Datei
# Ziel: <repo>/cli/wgx/wgx, optionaler Symlink nach ~/.local/bin/wgx
set -Eeuo pipefail
IFS=$'\n\t'
umask 077

trap 'ec=$?; cmd=$BASH_COMMAND; line=${BASH_LINENO[0]}; ((ec)) && printf "❌ installer: Fehler in Zeile %s: %s (exit=%s)\n" "$line" "$cmd" "$ec" >&2' ERR

# ── Mini-Helpers ────────────────────────────────────────────────────────────────
ok(){   printf "✅ %s\n" "$*"; }
warn(){ printf "⚠️  %s\n" "$*" >&2; }
die(){  printf "❌ %s\n" "$*" >&2; exit 1; }
has(){  command -v "$1" >/dev/null 2>&1; }

# ── Root-Guard (abschaltbar via WGX_ALLOW_ROOT=1) ──────────────────────────────
if [[ "${EUID:-$(id -u)}" -eq 0 && "${WGX_ALLOW_ROOT:-0}" != "1" ]]; then
  die "Bitte nicht als root ausführen (setze WGX_ALLOW_ROOT=1, wenn du es wirklich willst)."
fi

# ── Repo-Root bestimmen ────────────────────────────────────────────────────────
ROOT() {
  # 1) git (falls im Repo ausgeführt)
  if r="$(git rev-parse --show-toplevel 2>/dev/null)"; then
    printf "%s" "$r"; return
  fi
  # 2) relativ zu diesem Script: .../cli/wgx/install.sh → Repo ist zwei Ebenen höher
  local here base
  here="${BASH_SOURCE[0]}"
  if command -v greadlink >/dev/null 2>&1; then here="$(greadlink -f "$here")"
  elif command -v readlink >/dev/null 2>&1; then
    if readlink -f / >/dev/null 2>&1; then here="$(readlink -f "$here")"
    else
      # manuelles -f
      local link="$here"
      while link2="$(readlink "$link" 2>/dev/null || true)"; do
        [[ -z "$link2" ]] && break
        case "$link2" in
          /*) link="$link2" ;;
          *)  link="$(cd "$(dirname "$link")" && pwd -P)/$link2" ;;
        esac
      done
      here="$link"
    fi
  fi
  base="$(cd "$(dirname "$here")/../.." && pwd -P)"
  printf "%s" "$base"
}
REPO_ROOT="$(ROOT)"

# ── Ziele/Verzeichnisse ────────────────────────────────────────────────────────
INSTALL_DIR="$REPO_ROOT/cli/wgx"
TARGET="$INSTALL_DIR/wgx"
mkdir -p "$INSTALL_DIR"

# ── Schreibtest ────────────────────────────────────────────────────────────────
touch "$INSTALL_DIR/.wgx_write_test" 2>/dev/null || die "Kein Schreibrecht in $INSTALL_DIR"
rm -f "$INSTALL_DIR/.wgx_write_test"

# ── Backup & Rotation ─────────────────────────────────────────────────────────
rotate_backups() {
  # keep: letzte 10 Backups; außerdem alles älter als 14 Tage entsorgen
  local backups=() b
  mapfile -t backups < <(ls -1t "$INSTALL_DIR"/wgx.*.bak 2>/dev/null || true)
  local i=0
  for b in "${backups[@]}"; do
    (( i++ <= 10 )) || rm -f -- "$b" 2>/dev/null || true
  done
  # Zeitbasierte Rotation (14 Tage)
  find "$INSTALL_DIR" -maxdepth 1 -type f -name 'wgx.*.bak' -mtime +14 -exec rm -f {} + 2>/dev/null || true
}

if [[ -f "$TARGET" ]]; then
  ts="$(date +%Y%m%d-%H%M%S)"
  cp -p -- "$TARGET" "$INSTALL_DIR/wgx.$ts.bak" || die "Backup fehlgeschlagen"
  rotate_backups
  ok "Backup erstellt: $INSTALL_DIR/wgx.$ts.bak"
fi

# ── wgx schreiben ─────────────────────────────────────────────────────────────
WGX_VERSION="1.30.0-maxi-b1"

cat >"$TARGET" <<'WGX_EOF'
#!/usr/bin/env bash
# wgx – Weltgewebe CLI · Maxi-Edition · Block 1/4 (Bootstrap)
# Version: 1.30.0-maxi-b1
set -Eeuo pipefail
IFS=$'\n\t'
umask 077
shopt -s extglob nullglob

trap 'ec=$?; cmd=$BASH_COMMAND; line=${BASH_LINENO[0]}; fn=${FUNCNAME[1]:-MAIN}; ((ec)) && printf "❌ wgx: Fehler in %s (Zeile %s): %s (exit=%s)\n" "$fn" "$line" "$cmd" "$ec" >&2' ERR

# ── Basale Helfer ─────────────────────────────────────────────────────────────
ok(){   printf "✅ %s\n" "$*"; }
warn(){ printf "⚠️  %s\n" "$*" >&2; }
die(){  printf "❌ %s\n" "$*" >&2; exit 1; }
info(){ printf "• %s\n" "$*"; }
has(){  command -v "$1" >/dev/null 2>&1; }
trim(){ local s="$*"; s="${s#"${s%%[![:space:]]*}"}"; printf "%s" "${s%"${s##*[![:space:]]}"}"; }

# ── Globale Defaults ──────────────────────────────────────────────────────────
: "${OFFLINE:=0}"
: "${WGX_BASE:=main}"
: "${WGX_PREVIEW_DIFF_LINES:=120}"
: "${WGX_CI_WORKFLOW:=CI}"
: "${WGX_SIGNING:=auto}"

# ── Plattform/Umgebung ────────────────────────────────────────────────────────
PLATFORM="linux"
uname | grep -qi darwin && PLATFORM="darwin"
is_termux(){ case "${PREFIX-}" in */com.termux/*) return 0;; *) return 1;; esac; }
is_wsl(){ uname -r 2>/dev/null | grep -qiE 'microsoft|wsl2?'; }
is_codespace(){ [[ -n "${CODESPACE_NAME-}" ]]; }

# ── Repo-Root robust ermitteln ────────────────────────────────────────────────
ROOT(){
  local here="${BASH_SOURCE[0]}"
  # Symlinks auflösen
  if command -v greadlink >/dev/null 2>&1; then
    here="$(greadlink -f "$here")"
  elif command -v readlink >/dev/null 2>&1; then
    if readlink -f / >/dev/null 2>&1; then
      here="$(readlink -f "$here")"
    else
      local link="$here"
      while link2="$(readlink "$link" 2>/dev/null || true)"; do
        [[ -z "$link2" ]] && break
        case "$link2" in
          /*) link="$link2" ;;
          *)  link="$(cd "$(dirname "$link")" && pwd -P)/$link2" ;;
        esac
      done
      here="$link"
    fi
  fi
  # bevorzugt git-Root, sonst „eine Ebene über cli/wgx/wgx“
  if r="$(git -C "${PWD}" rev-parse --show-toplevel 2>/dev/null)"; then
    printf "%s" "$r"
  else
    printf "%s" "$(cd "$(dirname "$here")/../.." && pwd -P)"
  fi
}

# ── Git-Helfer ────────────────────────────────────────────────────────────────
is_git_repo(){ git rev-parse --is-inside-work-tree >/dev/null 2>&1; }
require_repo(){ is_git_repo || die "Nicht im Git-Repo (wgx benötigt ein Git-Repository)."; }
git_branch(){ git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "HEAD"; }
_fetch_guard(){ ((OFFLINE)) && return 0; git fetch -q origin 2>/dev/null || true; }
git_ahead_behind(){
  local b="${1:-$(git_branch)}"
  _fetch_guard
  local ab; ab="$(git rev-list --left-right --count "origin/$b...$b" 2>/dev/null || echo "0 0")"
  local behind=0 ahead=0 IFS=' '
  read -r behind ahead <<<"$ab" || true
  printf "%s %s\n" "${behind:-0}" "${ahead:-0}"
}
detect_web_dir(){ for d in apps/web web; do [[ -d "$d" ]] && { echo "$d"; return; }; done; echo ""; }
detect_api_dir(){ for d in apps/api api crates; do [[ -f "$d/Cargo.toml" ]] && { echo "$d"; return; }; done; echo ""; }

# ── Konfig (.wgx.conf) einlesen ───────────────────────────────────────────────
if [[ -f ".wgx.conf" ]]; then
  while IFS='=' read -r k v; do
    [[ -z "$k" || "$k" =~ ^# ]] && continue
    export "${k}"="${v}"
  done < ".wgx.conf"
fi

# ── Befehle (Block-1-Minimum) ────────────────────────────────────────────────
usage(){
cat <<EOF
wgx (Block 1/4 – Bootstrap)
  wgx doctor           # Status-Überblick (branch, ahead/behind, Verzeichnisse)
  wgx --version        # Version anzeigen
  wgx help             # diese Hilfe
Hinweis: Weitere Kommandos folgen in Blöcken 2–4.
EOF
}

doctor_cmd(){
  local in_repo=1; is_git_repo || in_repo=0
  local root; root="$(ROOT)"
  echo "=== wgx doctor ==="
  echo "root : $root"
  if ((in_repo)); then
    local br behind=0 ahead=0 web api
    br="$(git_branch)"
    local IFS=' '
    read -r behind ahead < <(git_ahead_behind "$br") || true
    web="$(detect_web_dir || true)"; api="$(detect_api_dir || true)"
    echo "branch: $br (ahead:$ahead behind:$behind), base:${WGX_BASE}"
    echo "web  : ${web:-nicht gefunden}"
    echo "api  : ${api:-nicht gefunden}"
  else
    echo "branch: (kein Repo)"
  fi
  echo "env  : ${PLATFORM} termux=$(is_termux && echo yes || echo no) codespaces=$(is_codespace && echo yes || echo no)"
  (( OFFLINE )) && echo "mode : offline"
  ok "Doctor OK"
}

# ── Router ────────────────────────────────────────────────────────────────────
WGX_VERSION="1.30.0-maxi-b1"
if [[ "${1-}" == "--version" || "${1-}" == "-V" ]]; then
  printf "wgx v%s\n" "$WGX_VERSION"; exit 0
fi

SUB="${1-}"; shift || true
case "${SUB:-help}" in
  doctor) doctor_cmd "$@";;
  help|-h|--help|"") usage;;
  *) die "Unbekanntes Kommando: ${SUB}. Tipp: wgx help";;
esac
WGX_EOF

chmod +x "$TARGET"
ok "wgx geschrieben: $TARGET"

# ── Optionaler Symlink ins Nutzer-BIN ─────────────────────────────────────────
maybe_link() {
  local candidate
  for candidate in "$HOME/.local/bin" "$HOME/bin"; do
    [[ -d "$candidate" && -w "$candidate" ]] || continue
    ln_path="$candidate/wgx"
    # Falls Symlink schon existiert, neu auf unser TARGET setzen
    if [[ -L "$ln_path" || -e "$ln_path" ]]; then
      rm -f -- "$ln_path" 2>/dev/null || true
    fi
    ln -s "$TARGET" "$ln_path" && ok "Symlink gesetzt: $ln_path → $TARGET"
    # Ist Pfad im PATH?
    case ":$PATH:" in
      *":$candidate:"*) : ;;
      *) warn "$candidate liegt nicht im PATH. PATH ergänzen, z.B. in ~/.profile";;
    esac
    return 0
  done
  warn "Kein schreibbares Nutzer-BIN gefunden (~/.local/bin oder ~/bin). Aufruf dann via: $TARGET"
}
maybe_link || true

# ── Abschluss ─────────────────────────────────────────────────────────────────
ok "Installation abgeschlossen."
echo "Nächste Schritte:"
echo "  $ wgx --version"
echo "  $ wgx doctor"

# ───────────────────────────────────────────────────────────────────────────────
# Block 2/4 — Core CLI/UX & Global-Flags (Synthese-Version)
# ───────────────────────────────────────────────────────────────────────────────

# ===== Farben & Logging (TTY-sicher; abschaltbar via --no-color / NO_COLOR / WGX_NO_COLOR)
WGX_NO_COLOR="${WGX_NO_COLOR:-0}"
FORCE_COLOR="${FORCE_COLOR:-0}"

_is_tty(){ [[ -t 1 ]] && [[ -t 2 ]]; }

if (( FORCE_COLOR )); then USE_COLOR=1
elif (( WGX_NO_COLOR || NO_COLOR )); then USE_COLOR=0
elif _is_tty; then USE_COLOR=1
else USE_COLOR=0
fi

if (( USE_COLOR )); then
  c0=$'\033[0m'; cG=$'\033[32m'; cY=$'\033[33m'; cR=$'\033[31m'; cB=$'\033[34m'; cBold=$'\033[1m'
else
  c0=; cG=; cY=; cR=; cB=; cBold=
fi

has(){ command -v "$1" >/dev/null 2>&1; }
is_termux(){ case "${PREFIX-}" in */com.termux/*) return 0;; *) return 1;; esac; }
is_wsl(){ uname -r 2>/dev/null | grep -qiE 'microsoft|wsl2?'; }
is_codespace(){ [[ -n "${CODESPACE_NAME-}" ]]; }

toast(){ is_termux && has termux-toast && termux-toast "$*"; }

ok()   { printf "${cG}✅ %s${c0}\n" "$*"; }
info() { printf "• %s\n" "$*"; }
warn() { printf "${cY}⚠️  %s${c0}\n" "$*"; toast "wgx Warnung: $*"; }
die()  { printf "${cR}❌ %s${c0}\n" "$*" >&2; toast "wgx Fehler: $*"; exit "${2:-1}"; }

# ===== ROOT/Repo-Discovery
ROOT(){
  local here="${BASH_SOURCE[0]}"
  if has greadlink; then here="$(greadlink -f "$here")"
  elif has readlink; then
    if readlink -f / >/dev/null 2>&1; then here="$(readlink -f "$here")"
    else
      local link="$here" next
      while next="$(readlink "$link" 2>/dev/null || true)"; do
        [[ -z "$next" ]] && break
        case "$next" in
          /*) link="$next";;
          *)  link="$(cd "$(dirname "$link")" && pwd -P)/$next";;
        esac
      done
      here="$link"
    fi
  fi
  local r; r="$(git -C "${PWD}" rev-parse --show-toplevel 2>/dev/null || true)"
  [[ -n "$r" ]] && printf "%s" "$r" || printf "%s" "$(cd "$(dirname "$here")/../.." && pwd -P)"
}
ROOT_DIR="$(ROOT)"
cd "$ROOT_DIR" >/dev/null 2>&1 || true

# ===== Konfig (.wgx.conf im Repo, dann $HOME)
_read_kv_file(){
  local f="$1"; [[ -f "$f" ]] || return 0
  while IFS='=' read -r k v; do
    [[ -z "$k" || "$k" =~ ^# ]] && continue
    v="${v%%#*}"; v="${v%"${v##*[![:space:]]}"}"; v="${v#"${v%%[![:space:]]*}"}"
    case "$k" in
      WGX_BASE|WGX_SIGNING|WGX_PREVIEW_DIFF_LINES|WGX_PR_LABELS|WGX_CI_WORKFLOW|WGX_PM|WGX_OFFLINE|WGX_ASSUME_YES|WGX_DRAFT_ON_WARN|WGX_NO_COLOR)
        export "$k"="$v";;
    esac
  done < "$f"
}
: "${WGX_BASE:=main}"
: "${WGX_SIGNING:=auto}"
: "${WGX_PREVIEW_DIFF_LINES:=120}"
: "${WGX_CI_WORKFLOW:=CI}"
: "${WGX_OFFLINE:=0}"
: "${WGX_ASSUME_YES:=0}"
: "${WGX_DRAFT_ON_WARN:=0}"
_read_kv_file "$ROOT_DIR/.wgx.conf"
_read_kv_file "$HOME/.config/wgx/config"

# ===== Plattform-Erkennung
PLATFORM="linux"
if is_termux; then PLATFORM="termux"
elif is_wsl; then PLATFORM="wsl"
elif [[ "$OSTYPE" == darwin* ]]; then PLATFORM="darwin"
elif is_codespace; then PLATFORM="codespaces"; fi

# ===== Globale Flags / Argumente
ASSUME_YES=0; DRYRUN=0; VERBOSE=0; OFFLINE="$WGX_OFFLINE"; NOTIMEOUT=0; TIMEOUT=25
while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes) ASSUME_YES=1;;
    --dry-run) DRYRUN=1;;
    --verbose|-v) VERBOSE=1;;
    --offline) OFFLINE=1;;
    --timeout) shift; TIMEOUT="${1-}";;
    --no-timeout) NOTIMEOUT=1;;
    --base) shift; WGX_BASE="${1-}";;
    --no-color) :;;
    --version|-V) printf "wgx v%s\n" "${WGX_VERSION:-dev}"; exit 0;;
    help|-h|--help) SUB="help"; shift; break;;
    send|sync|guard|heal|reload|clean|doctor|init|setup|lint|start|release|hooks|version|env|quick|config|test|status)
      SUB="$1"; shift; break;;
    *) break;;
  esac
  shift || true
done
: "${SUB:=${1-}}"

# ===== Safety: Root Guard
if [[ "${EUID-}" -eq 0 && "${WGX_ALLOW_ROOT:-0}" != "1" ]]; then
  die "wgx bitte nicht als root ausführen (WGX_ALLOW_ROOT=1 zum Überspringen)."
fi

# ===== Git-Helpers
is_git_repo(){ git rev-parse --is-inside-work-tree >/dev/null 2>&1; }
require_repo(){ is_git_repo || die "Nicht im Git-Repo."; }
git_branch(){ git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "HEAD"; }
git_ahead_behind(){
  local b="${1:-$(git_branch)}"
  (( OFFLINE )) || git fetch -q origin "$b" 2>/dev/null || true
  local ab; ab="$(git rev-list --left-right --count "origin/$b...$b" 2>/dev/null || echo "0 0")"
  local behind ahead; IFS=' ' read -r behind ahead <<<"$ab" || true
  printf "%s %s\n" "${behind:-0}" "${ahead:-0}"
}

# ===== Status & Doctor (aufgebohrt)
status_cmd(){
  if ! is_git_repo; then
    echo "📦 $ROOT_DIR"
    echo "  └─ branch: (kein Repo)"
    return
  fi
  local br behind ahead staged changed untracked
  br="$(git_branch)"
  read -r behind ahead < <(git_ahead_behind "$br") || true
  staged=$(git diff --cached --name-only | wc -l)
  changed=$(git diff --name-only | wc -l)
  untracked=$(git ls-files --others --exclude-standard | wc -l)
  echo "📦 $ROOT_DIR"
  echo "  ├─ branch : $br"
  echo "  ├─ base   : $WGX_BASE"
  echo "  ├─ ahead  : $ahead"
  echo "  ├─ behind : $behind"
  echo "  ├─ staged : $staged"
  echo "  ├─ changed: $changed"
  echo "  └─ untracked: $untracked"
  (( OFFLINE )) && echo "  ⚐ offline mode"
  if ! git ls-remote origin &>/dev/null; then
    warn "origin nicht erreichbar"
  fi
}

doctor_cmd(){
  echo "=== wgx doctor ==="
  echo "root : $ROOT_DIR"
  if is_git_repo; then
    local br behind ahead
    br="$(git_branch)"
    read -r behind ahead < <(git_ahead_behind "$br") || true
    echo "branch: $br (ahead:$ahead behind:$behind), base:$WGX_BASE"
    echo "web  : $(detect_web_dir || echo nicht gefunden)"
    echo "api  : $(detect_api_dir || echo nicht gefunden)"
  else
    echo "branch: (kein Repo)"
  fi
  echo "env  : $PLATFORM termux=$(is_termux && echo yes || echo no)"
  (( OFFLINE )) && echo "mode : offline"
  ok "Doctor OK"
}

# ===== Usage
usage(){
cat <<EOF
${cBold}wgx${c0} – v${WGX_VERSION:-dev}
Kurz:
  wgx status     # kompakter Repo-Status
  wgx doctor     # detaillierter System-/Repo-Check
  wgx --version  # Version anzeigen
  wgx help       # Hilfe
Global:
  --yes --dry-run --verbose --offline --timeout <s> --no-timeout --base <branch> --no-color --version
EOF
}

# ===== Router
case "${SUB:-help}" in
  status) status_cmd "$@";;
  doctor) doctor_cmd "$@";;
  help|-h|--help|"") usage;;
esac

##### ───────────────────────────── Block 3/4: Setup · Init · Start · Version · Release · Hooks ─────────────────────────────
# Fallback-Helper, nur falls nicht schon aus Block 1/2 vorhanden:
type has >/dev/null 2>&1 || has(){ command -v "$1" >/dev/null 2>&1; }
type info >/dev/null 2>&1 || info(){ printf "• %s\n" "$*"; }
type ok   >/dev/null 2>&1 || ok(){ printf "✅ %s\n" "$*"; }
type warn >/dev/null 2>&1 || warn(){ printf "⚠️  %s\n" "$*" >&2; }
type die  >/dev/null 2>&1 || die(){ printf "❌ %s\n" "$*" >&2; exit 1; }
type require_repo >/dev/null 2>&1 || require_repo(){ git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "Nicht im Git-Repo."; }
: "${WGX_BASE:=main}"
: "${WGX_SIGNING:=auto}"       # auto|off|ssh|gpg
: "${WGX_PREVIEW_DIFF_LINES:=120}"
: "${WGX_CI_WORKFLOW:=CI}"

# ── Utils (lokal) ──────────────────────────────────────────────────────────────────────────────────────────────────────────
_trim(){ local s="$*"; s="${s#"${s%%[![:space:]]*}"}"; printf "%s" "${s%"${s##*[![:space:]]}"}"; }
_detect_base(){
  # origin/HEAD → default main/master/dev automatisch übernehmen, falls WGX_BASE nicht gesetzt/custom ist
  local ref; ref="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)"
  [[ -n "$ref" ]] || return 0
  local def="${ref#origin/}"
  [[ -z "${WGX_BASE:-}" || "$WGX_BASE" == "main" ]] && WGX_BASE="$def"
}
_mktemp(){ : "${TMPDIR:=/tmp}"; mktemp 2>/dev/null || printf "%s/wgx.%s.%s" "$TMPDIR" "$(date +%s)" "$$"; }
_maybe_sign_flag(){
  case "$WGX_SIGNING" in
    off|"") return 1;;
    ssh|gpg) echo "-S"; return 0;;
    auto)
      git config --get user.signingkey >/dev/null 2>&1 && { echo "-S"; return 0; } || return 1;;
  esac
}

# ── init: lokale .wgx.conf + Templates anlegen ─────────────────────────────────────────────────────────────────────────────
init_cmd(){
  [[ -f ".wgx.conf" ]] && warn ".wgx.conf existiert bereits." || {
    cat > .wgx.conf <<EOF
# wgx config (lokal)
WGX_BASE=${WGX_BASE}
WGX_SIGNING=${WGX_SIGNING}
WGX_PREVIEW_DIFF_LINES=${WGX_PREVIEW_DIFF_LINES}
WGX_PR_LABELS=
WGX_CI_WORKFLOW=${WGX_CI_WORKFLOW}
# Komfort:
WGX_ASSUME_YES=0
WGX_DRAFT_ON_WARN=0
WGX_OFFLINE=0
# Optional:
# WGX_WEB_DIR=apps/web
# WGX_API_DIR=apps/api
# WGX_PM=pnpm|npm|yarn
EOF
    ok ".wgx.conf angelegt."
  }
  [[ -d ".wgx" ]] || { mkdir -p .wgx; ok ".wgx/ angelegt."; }
  [[ -f ".wgx/pr_template.md" ]] || cat > .wgx/pr_template.md <<'EOF'
## Zweck
{{SUMMARY}}

## Änderungen
{{CHANGES}}

## Warum
{{WHY}}

## Tests
{{TESTS}}

## Issues
{{ISSUES}}

## Notizen
{{NOTES}}
EOF
  ok "PR-Template angelegt."
}

# ── setup: Termux/Generic Basispakete (non-destructive) ───────────────────────────────────────────────────────────────────
setup_cmd(){
  if [[ -n "${PREFIX-}" && "$PREFIX" == *"/com.termux/"* ]]; then
    info "Termux-Setup (Basis-Tools)…"
    if has pkg; then
      pkg update -y || true
      pkg install -y git gh glab curl wget unzip zsh jq >/dev/null 2>&1 || true
      has vale || warn "Vale nicht via pkg? → ggf. Binary Release; sonst Sprache-Checks übersprungen."
      ok "Termux-Basis installiert/überprüft."
    else
      warn "pkg nicht gefunden (älteres Termux?). Manuell installieren."
    fi
  else
    info "Generic-Setup: Stelle sicher, dass git/gh/glab/jq verfügbar sind."
    for p in git gh jq; do has "$p" || warn "$p fehlt"; done
    ok "Setup-Check abgeschlossen."
  fi
}

# ── start: saubere Branch-Erstellung von Basis ────────────────────────────────────────────────────────────────────────────
start_cmd(){
  require_repo
  local slug="" issue=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --issue) shift; issue="${1-}";;
      *) slug="${1-}";;
    esac
    shift || true
  done
  [[ -z "$slug" ]] && die "Usage: wgx start [--issue <ID>] <slug>"
  _detect_base

  # Basisref robust bestimmen (origin/WGX_BASE → WGX_BASE)
  git fetch -q origin "${WGX_BASE}" >/dev/null 2>&1 || true
  local base_ref="origin/${WGX_BASE}"
  git rev-parse --verify -q "$base_ref" >/dev/null || base_ref="${WGX_BASE}"
  git rev-parse --verify -q "$base_ref" >/dev/null || die "Basisbranch ${WGX_BASE} nicht gefunden (weder lokal noch origin/)."

  # Slug härten (git-kompatibel, keine '..', keine lock-Endung etc.)
  slug="${slug//[^a-zA-Z0-9._-]/-}"
  slug="${slug//../.}"; slug="${slug##+(-)}"; slug="${slug%%+(-)}"
  [[ -n "$issue" ]] && slug="feat-${issue}-${slug}"
  shopt -s extglob
  slug="${slug//+(-)/-}"
  shopt -u extglob
  slug="${slug//@\{/-}"
  [[ "$slug" == *.lock ]] && slug="${slug%.lock}-lock"
  git check-ref-format --branch "$slug" || die "Ungültiger Branch-Name: $slug"

  git checkout -b "$slug" "$base_ref" || die "Branch konnte nicht erstellt werden."
  ok "Branch '$slug' von $base_ref erstellt und ausgecheckt."
}

# ── Version: bump/set in package.json + Cargo.toml (+ optional Commit) ─────────────────────────────────────────────────────
_version_bump(){
  local last="$1" kind="$2" M N P
  [[ "$last" =~ ^v?([0-9]+)\.([0-9]+)\.([0-9]+)$ ]] || { echo "v0.0.1"; return 0; }
  M="${BASH_REMATCH[1]}"; N="${BASH_REMATCH[2]}"; P="${BASH_REMATCH[3]}"
  case "$kind" in
    patch) P=$((P+1));;
    minor) N=$((N+1)); P=0;;
    major) M=$((M+1)); N=0; P=0;;
    *) echo "v${M}.${N}.${P}"; return 0;;
  esac
  echo "v${M}.${N}.${P}"
}
_last_semver_tag(){ git tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -n1 || true; }

_pkg_json_set_ver(){
  local pj="$1" ver="$2"
  if has jq; then
    jq --arg v "${ver#v}" '.version=$v' "$pj" > "$pj.tmp" && mv "$pj.tmp" "$pj" || return 1
  else
    # sed-Fallback (macOS/BSD/GNU verträglich)
    sed -E -i.bak 's/^([[:space:]]*"version"[[:space:]]*:[[:space:]]*")[^"]*(")/\1'"${ver#v}"'\2/' "$pj" && rm -f "$pj.bak"
  fi
}
_cargo_set_ver(){
  local dir="$1" ver="${2#v}"
  if has cargo && cargo set-version -V >/dev/null 2>&1; then
    (cd "$dir" && cargo set-version "$ver")
  else
    sed -E -i.bak 's/^(version[[:space:]]*=[[:space:]]*)"[^"]*"/\1"'"$ver"'"/' "$dir/Cargo.toml" && rm -f "$dir/Cargo.toml.bak"
  fi
}

version_cmd(){
  require_repo
  local sub="${1-}"; shift || true
  case "$sub" in
    bump)
      local kind="${1-}"; shift || true
      [[ "$kind" =~ ^(patch|minor|major)$ ]] || die "version bump: erwartet patch|minor|major"
      local lt; lt="$(_last_semver_tag || echo v0.0.0)"
      local nv; nv="$(_version_bump "$lt" "$kind")"
      local web="${WGX_WEB_DIR:-apps/web}" api="${WGX_API_DIR:-apps/api}"
      [[ -f "$web/package.json" ]] && _pkg_json_set_ver "$web/package.json" "$nv"
      [[ -f "$api/Cargo.toml"   ]] && _cargo_set_ver "$api" "$nv"
      if [[ "$1" == "--commit" ]]; then
        git add -A && git commit -m "chore(version): bump to ${nv}"
      fi
      ok "Version bump → ${nv}"
      ;;
    set)
      local v="${1-}"; shift || true
      [[ -n "$v" ]] || die "version set vX.Y.Z"
      [[ "$v" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "Ungültige Version: $v"
      v="v${v#v}"
      local web="${WGX_WEB_DIR:-apps/web}" api="${WGX_API_DIR:-apps/api}"
      [[ -f "$web/package.json" ]] && _pkg_json_set_ver "$web/package.json" "$v"
      [[ -f "$api/Cargo.toml"   ]] && _cargo_set_ver "$api" "$v"
      if [[ "$1" == "--commit" ]]; then
        git add -A && git commit -m "chore(version): set ${v}"
      fi
      ok "Version gesetzt → ${v}"
      ;;
    *) die "Usage: wgx version bump [patch|minor|major] [--commit] | wgx version set vX.Y.Z [--commit]";;
  esac
}

# ── Release: Tag + (optional) GitHub/GitLab Release ───────────────────────────────────────────────────────────────────────
release_cmd(){
  require_repo
  local VERSION="" AUTO_KIND="" PUSH=0 SIGN_TAG=0 LATEST=0 NOTES="auto" FROM="" TO="HEAD"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --version) shift; VERSION="${1-}";;
      --auto-version) shift; AUTO_KIND="${1-}";;
      --push) PUSH=1;;
      --sign-tag) SIGN_TAG=1;;
      --latest) LATEST=1;;
      --notes) shift; NOTES="${1-}";;
      --from) shift; FROM="${1-}";;
      --to) shift; TO="${1-}";;
      *) die "Unbekannte Option: $1";;
    esac; shift || true
  done

  [[ -z "$FROM" ]] && FROM="origin/${WGX_BASE}"
  git fetch -q origin "${WGX_BASE}" >/dev/null 2>&1 || true

  if [[ -z "$VERSION" && -n "$AUTO_KIND" ]]; then
    local lt; lt="$(_last_semver_tag || echo v0.0.0)"
    VERSION="$(_version_bump "$lt" "$AUTO_KIND")"
  fi
  [[ -n "$VERSION" ]] || die "release: --version vX.Y.Z oder --auto-version patch|minor|major erforderlich."
  [[ "$VERSION" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "Ungültige Version: $VERSION"
  VERSION="v${VERSION#v}"

  git rev-parse -q --verify "refs/tags/$VERSION" >/dev/null && die "Tag $VERSION existiert bereits."

  local notes_file=""
  if [[ "$NOTES" == "auto" ]]; then
    notes_file="$(_mktemp)"
    {
      printf "## %s (%s)\n\n### Changes\n" "$VERSION" "$(date +%Y-%m-%d)"
      git log --pretty='- %s (%h)' "$FROM..$TO" || true
    } > "$notes_file"
  else
    [[ -f "$NOTES" ]] || die "--notes Datei nicht gefunden: $NOTES"
    notes_file="$NOTES"
  fi

  if (( SIGN_TAG )); then
    git tag -s "$VERSION" -m "$VERSION" || die "Signiertes Tag fehlgeschlagen."
  else
    git tag -a "$VERSION" -m "$VERSION" || die "Tagging fehlgeschlagen."
  fi
  ok "Git-Tag $VERSION erstellt."

  (( PUSH )) && { git push origin "$VERSION" || die "Tag Push fehlgeschlagen."; ok "Tag gepusht."; }

  # Host erkennen (github/gitlab) via origin-URL
  local url host path
  url="$(git remote get-url origin 2>/dev/null || echo "")"
  if [[ "$url" =~ github\.com[:/](.+)\.git$ ]]; then host="github"; path="${BASH_REMATCH[1]}"; fi
  if [[ -z "$host" && "$url" =~ gitlab\.com[:/](.+)\.git$ ]]; then host="gitlab"; path="${BASH_REMATCH[1]}"; fi

  case "$host" in
    github)
      if has gh; then
        local lf=()
        (( LATEST )) && lf+=(--latest)
        gh release create "$VERSION" "${lf[@]}" --notes-file "$notes_file" || die "gh release create fehlgeschlagen."
        ok "GitHub Release erstellt: $VERSION"
      else
        warn "gh CLI fehlt – nur Git-Tag erstellt."
      fi
      ;;
    gitlab)
      if has glab; then
        glab release create "$VERSION" --notes-file "$notes_file" || die "glab release create fehlgeschlagen."
        (( LATEST )) && glab release edit "$VERSION" --latest >/dev/null 2>&1 || true
        ok "GitLab Release erstellt: $VERSION"
      else
        warn "glab CLI fehlt – nur Git-Tag erstellt."
      fi
      ;;
    *)
      warn "Unbekannter Host (origin). Release nur lokal getaggt."
      ;;
  esac

  [[ "$NOTES" == "auto" && -f "$notes_file" ]] && rm -f "$notes_file" 2>/dev/null || true
}

# ── Hooks: Installer-Delegation (falls vorhanden), sonst Hinweis ──────────────────────────────────────────────────────────
hooks_cmd(){
  require_repo
  local sub="${1-}"; shift || true
  case "$sub" in
    install)
      local root; root="$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)"
      if [[ -x "$root/cli/wgx/install.sh" ]]; then
        bash "$root/cli/wgx/install.sh" || die "wgx install.sh fehlgeschlagen"
      else
        warn "Installer fehlt (cli/wgx/install.sh)."
        warn "Tipp (Beispiel pre-commit):"
        printf '%s\n' \
'#!/usr/bin/env bash
wgx guard --lint --test || exit 1
' | sed 's/^/  /'
      fi
      ;;
    *) die "Usage: wgx hooks install";;
  esac
}
##### ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

##### ───────────────────────────── Maxi Block 4: Status · Guard · Lint · Test · Sync · Send · Heal · Clean · Reload · Quick · Env · Hooks ─────────────────────────────
# Fallback-Helper nur, wenn in Block 1–3 nicht definiert:
type has >/dev/null 2>&1 || has(){ command -v "$1" >/dev/null 2>&1; }
type info >/dev/null 2>&1 || info(){ printf "• %s\n" "$*"; }
type ok   >/dev/null 2>&1 || ok(){ printf "✅ %s\n" "$*"; }
type warn >/dev/null 2>&1 || warn(){ printf "⚠️  %s\n" "$*" >&2; }
type die  >/dev/null 2>&1 || die(){ printf "❌ %s\n" "$*" >&2; exit 1; }
type require_repo >/dev/null 2>&1 || require_repo(){ git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "Nicht im Git-Repo."; }
type git_branch >/dev/null 2>&1 || git_branch(){ git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "HEAD"; }
type now_ts >/dev/null 2>&1 || now_ts(){ date +"%Y-%m-%d %H:%M"; }

: "${WGX_BASE:=main}"
: "${WGX_SIGNING:=auto}"
: "${WGX_PREVIEW_DIFF_LINES:=120}"
: "${WGX_PR_LABELS:=}"
: "${WGX_CI_WORKFLOW:=CI}"
: "${OFFLINE:=0}"

# ── Utilities (nur falls nicht vorhanden) ────────────────────────────────────────────────────────────────────────────────
type to_lower >/dev/null 2>&1 || to_lower(){ tr '[:upper:]' '[:lower:]'; }
type trim >/dev/null 2>&1 || trim(){ local s="$*"; s="${s#"${s%%[![:space:]]*}"}"; printf "%s" "${s%"${s##*[![:space:]]}"}"; }
type run_with_files_xargs0 >/dev/null 2>&1 || run_with_files_xargs0(){
  local title="$1"; shift
  [[ -t 1 ]] && info "$title"
  if command -v xargs >/dev/null 2>&1; then xargs -0 "$@" || return $?
  else
    local buf=(); local IFS= read -r -d '' f || true
    while [[ -n "${f-}" ]]; do buf+=("$f"); IFS= read -r -d '' f || true; done
    (("$#">0)) && "$@" "${buf[@]}"
  fi
}
type mktemp_portable >/dev/null 2>&1 || mktemp_portable(){ : "${TMPDIR:=/tmp}"; mktemp 2>/dev/null || { local f="$TMPDIR/wgx.$(date +%s).$$"; :> "$f"; printf "%s" "$f"; }; }

# Git helpers
git_ahead_behind(){
  local b="${1:-$(git_branch)}"
  ((OFFLINE)) || git fetch -q origin "$b" 2>/dev/null || true
  local behind=0 ahead=0 ab
  ab="$(git rev-list --left-right --count "origin/$b...$b" 2>/dev/null || echo "0 0")"
  read -r behind ahead <<<"$ab" || true
  printf "%s %s\n" "${behind:-0}" "${ahead:-0}"
}
changed_files_cached(){ git diff --cached --name-only -z | tr '\0' '\n' | sed '/^$/d'; }
changed_files_all(){ # NUL-sicher inkl. Renames
  local rec status path
  git status --porcelain -z \
  | while IFS= read -r -d '' rec; do
      status="${rec:0:2}"
      path="${rec:3}"
      if [[ "$status" =~ ^R ]]; then IFS= read -r -d '' path || true; fi
      [[ -n "$path" ]] && printf '%s\n' "$path"
    done
}

# Scope-Erkennung (web/api/docs/infra/devx/meta)
type auto_scope >/dev/null 2>&1 || auto_scope(){
  local files="$1" major="repo" m_web=0 m_api=0 m_docs=0 m_infra=0 m_devx=0 total=0
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue; ((++total))
    case "$f" in
      apps/web/*) ((++m_web));;
      apps/api/*|crates/*) ((++m_api));;
      infra/*|deploy/*) ((++m_infra));;
      scripts/*|wgx|.wgx.conf|cli/wgx/*) ((++m_devx));;
      docs/*|*.md|styles/*|.vale.ini) ((++m_docs));;
    esac
  done <<< "$files"
  (( total==0 )) && { echo "repo"; return; }
  local max=$m_docs; major="docs"
  (( m_web>max ))  && { max=$m_web;  major="web"; }
  (( m_api>max ))  && { max=$m_api;  major="api"; }
  (( m_infra>max ))&& { max=$m_infra; major="infra"; }
  (( m_devx>max )) && { max=$m_devx; major="devx"; }
  (( max * 100 >= 70 * total )) && echo "$major" || echo "meta"
}

# PM detect
pm_detect(){
  local wd="${1:-.}"
  if [[ -n "${WGX_PM-}" ]] && has "$WGX_PM"; then echo "$WGX_PM"; return 0; fi
  if [[ -f "$wd/pnpm-lock.yaml" ]] && has pnpm; then echo "pnpm"
  elif [[ -f "$wd/package-lock.json" ]] && has npm; then echo "npm"
  elif [[ -f "$wd/yarn.lock" ]] && has yarn; then echo "yarn"
  elif [[ -f "$wd/package.json" ]]; then has pnpm && echo "pnpm" || has npm && echo "npm" || has yarn && echo "yarn" || echo ""
  else echo ""; fi
}
git_supports_magic(){ git -C "${1:-.}" ls-files -z -- ':(exclude)node_modules/**' >/dev/null 2>&1; }

# Vale
vale_maybe(){
  [[ -f ".vale.ini" ]] || return 0
  has vale || { warn "Vale nicht installiert – Sprach-Checks übersprungen."; return 0; }
  local staged=0; [[ "${1-}" == "--staged" ]] && staged=1
  if (( staged )); then
    git diff --cached --name-only -z -- '*.md' 2>/dev/null | run_with_files_xargs0 "Vale (staged)" vale
  else
    git ls-files -z -- '*.md' 2>/dev/null | run_with_files_xargs0 "Vale (alle .md)" vale
  fi
}

# Sign-Flag
_maybe_sign_flag(){
  case "$WGX_SIGNING" in
    off|"") return 1;;
    ssh|gpg) echo "-S"; return 0;;
    auto) git config --get user.signingkey >/dev/null 2>&1 && { echo "-S"; return 0; } || return 1;;
  esac
}

# CODEOWNERS → Reviewer auto
_codeowners_file(){ [[ -f ".github/CODEOWNERS" ]] && echo ".github/CODEOWNERS" || [[ -f "CODEOWNERS" ]] && echo "CODEOWNERS" || echo ""; }
declare -a CODEOWNERS_PATTERNS=(); declare -a CODEOWNERS_OWNERS=()
_codeowners_reviewers(){ # stdin: \n-Pfade
  CODEOWNERS_PATTERNS=(); CODEOWNERS_OWNERS=()
  local cof; cof="$(_codeowners_file)"; [[ -z "$cof" ]] && return 0
  local default_owners=() line
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="$(trim "${line%%#*}")"; [[ -z "$line" ]] && continue
    local pat rest; pat="${line%%[[:space:]]*}"; rest="$(trim "${line#"$pat"}")"
    [[ -z "$pat" || -z "$rest" ]] && continue
    read -r -a arr <<<"$rest"
    if [[ "$pat" == "*" ]]; then default_owners=("${arr[@]}"); else CODEOWNERS_PATTERNS+=("$pat"); CODEOWNERS_OWNERS+=("$(printf "%s " "${arr[@]}")"); fi
  done < "$cof"
  local files=() f; while IFS= read -r f; do [[ -n "$f" ]] && files+=("$f"); done
  local seen="," i p matchOwners o
  for f in "${files[@]}"; do
    matchOwners=""
    for (( i=0; i<${#CODEOWNERS_PATTERNS[@]}; i++ )); do
      p="${CODEOWNERS_PATTERNS[$i]}"; [[ "$p" == /* ]] && p="${p:1}"
      case "$f" in $p) matchOwners="${CODEOWNERS_OWNERS[$i]}";; esac
    done
    [[ -z "$matchOwners" && ${#default_owners[@]} -gt 0 ]] && matchOwners="$(printf "%s " "${default_owners[@]}")"
    for o in $matchOwners; do
      [[ "$o" == @* ]] && o="${o#@}"
      [[ -z "$o" || "$o" == */* ]] && continue
      [[ ",$seen," == *,"$o",* ]] && continue
      seen="${seen}${o},"
      printf "%s\n" "$o"
    done
  done
}

# Labels aus Branch/Msg ableiten
_derive_labels(){
  local scope="$1" branch subj L=()
  branch="$(git_branch)"; subj="$(git log -1 --pretty=%s 2>/dev/null || true)"
  case "${branch%%/*}" in feat) L+=("feature");; fix|hotfix) L+=("bug");; docs) L+=("docs");; refactor) L+=("refactor");; test|tests) L+=("test");; ci) L+=("ci");; perf) L+=("performance");; chore) L+=("chore");; build) L+=("build");; esac
  case "$subj" in feat:*) L+=("feature");; fix:*) L+=("bug");; docs:*) L+=("docs");; refactor:*) L+=("refactor");; test:*) L+=("test");; ci:*) L+=("ci");; perf:*) L+=("performance");; chore:*) L+=("chore");; build:*) L+=("build");; style:*) L+=("style");; esac
  [[ -n "$scope" ]] && L+=("scope:$scope")
  local IFS=,; echo "${L[*]}" | awk -F, '{ for (i=1;i<=NF;i++) if ($i!="" && !seen[$i]++) out=(out?out","$i:$i); } END{print out}'
}

# Snapshot
snapshot_make(){
  require_repo
  if [[ -z "$(git status --porcelain -z 2>/dev/null | head -c1)" ]]; then info "Kein Snapshot nötig."; return 0; fi
  local msg="snapshot@$(date +%s) $(git_branch)"
  git stash push -u -m "$msg" >/dev/null 2>&1 || true
  info "Snapshot erstellt (git stash list)."
}

# ── status: kompakter Überblick (ahead/behind, dirty, web/api) ────────────────────────────────────────────────────────────
status_cmd(){
  require_repo
  local br="$(git_branch)" web api IFS=' ' behind=0 ahead=0
  read -r behind ahead < <(git_ahead_behind "$br") || true
  [[ -d apps/web ]] && web="apps/web" || [[ -d web ]] && web="web" || web="-"
  if [[ -f apps/api/Cargo.toml ]]; then api="apps/api"
  elif [[ -f api/Cargo.toml ]]; then api="api"
  elif [[ -d crates ]]; then api="crates"
  else api="-"; fi
  echo "=== wgx status ==="
  echo "branch : $br (ahead:$ahead behind:$behind) base:$WGX_BASE"
  echo "dirty  : $(git status --porcelain | wc -l | tr -d ' ') files"
  echo "web    : $web"
  echo "api    : $api"
  echo "vale   : $([[ -f ".vale.ini" ]] && echo present || echo missing)"
  ((OFFLINE)) && echo "mode   : offline"
}

# ── guard: Preflight (sehr vollständig) ───────────────────────────────────────────────────────────────────────────────────
guard_cmd(){
  require_repo
  local FIX=0 LINT_OPT=0 TEST_OPT=0 DEEP_SCAN=0
  while [[ $# -gt 0 ]]; do case "$1" in --fix) FIX=1;; --lint) LINT_OPT=1;; --test) TEST_OPT=1;; --deep-scan) DEEP_SCAN=1;; esac; shift || true; done

  local rc=0 br="$(git_branch)"
  echo "=== Preflight (branch: $br, base: $WGX_BASE) ==="
  # Rebase/Merge in progress?
  if [[ -d .git/rebase-merge || -d .git/rebase-apply || -f .git/MERGE_HEAD ]]; then
    echo "[BLOCKER] rebase/merge läuft → wgx heal --continue | --abort"; rc=2
  fi
  [[ "$br" == "HEAD" ]] && { echo "[WARN] Detached HEAD – Branch anlegen."; (( rc==0 )) && rc=1; }

  # Ahead/Behind
  local IFS=' ' behind=0 ahead=0; read -r behind ahead < <(git_ahead_behind "$br") || true
  if (( behind>0 )); then
    echo "[WARN] Branch $behind hinter origin/$br → rebase auf origin/$WGX_BASE"; (( rc==0 )) && rc=1
  fi

  # Konfliktmarker
  local with_markers=""; while IFS= read -r -d '' f; do
    grep -Eq '<<<<<<<|=======|>>>>>>>' -- "$f" 2>/dev/null && with_markers+="$f"$'\n'
  done < <(git ls-files -m -z)
  if [[ -n "$with_markers" ]]; then
    echo "[BLOCKER] Konfliktmarker:"; printf '%s' "$with_markers" | sed 's/^/  - /'; rc=2
  fi

  # Staged: Secret-Dateinamen + Deep-Scan + >10MB
  local staged; staged="$(changed_files_cached || true)"
  if [[ -n "$staged" ]]; then
    local secrets
    secrets="$(printf "%s\n" "$staged" | grep -Ei '\.env(\.|$)|(^|/)(id_rsa|id_ed25519)(\.|$)|\.pem$|\.p12$|\.keystore$' || true)"
    if [[ -n "$secrets" ]]; then
      echo "[BLOCKER] mögliche Secrets im Commit (Dateiname):"; printf "%s\n" "$secrets" | sed 's/^/  - /'
      if (( FIX )); then while IFS= read -r s; do [[ -n "$s" ]] && git restore --staged -- "$s" 2>/dev/null || true; done <<< "$secrets"; echo "→ Secrets aus dem Index entfernt."; fi
      rc=2
    fi
    if (( DEEP_SCAN )); then
      local leaked; leaked="$(git diff --cached -U0 | grep -Ei 'BEGIN (RSA|EC|OPENSSH) PRIVATE KEY|AKIA[A-Z0-9]{16}|ghp_[A-Za-z0-9]{36}|glpat-[A-Za-z0-9_-]{20,}|AWS_ACCESS_KEY_ID|SECRET(_KEY)?|TOKEN|AUTHORIZATION:|PASSWORD' || true)"
      if [[ -n "$leaked" ]]; then echo "[BLOCKER] möglicher Secret-Inhalt im Diff:"; echo "$leaked" | sed 's/^/  > /'; rc=2; fi
    fi
    # >10MB Warnliste
    if [[ -n "$(printf "%s\n" "$staged" | while IFS= read -r f; do [[ -f "$f" ]] || continue;
      sz=$( (stat -c %s "$f" 2>/dev/null || stat -f%z "$f" 2>/dev/null || wc -c < "$f" 2>/dev/null) ); (( sz>10485760 )) && { echo x; break; }; done)" ]]; then
      echo "[WARN] >10MB im Commit:"; printf "%s\n" "$staged" | while IFS= read -r f; do [[ -f "$f" ]] || continue;
        sz=$( (stat -c %s "$f" 2>/dev/null || stat -f%z "$f" 2>/dev/null || wc -c < "$f" 2>/dev/null) ); (( sz>10485760 )) && printf '  - %s (%s B)\n' "$f" "$sz"; done
      (( rc==0 )) && rc=1
    fi
  fi

  # Lockfile-Policy
  if git ls-files --error-unmatch pnpm-lock.yaml >/dev/null 2>&1 && git ls-files --error-unmatch package-lock.json >/dev/null 2>&1; then
    echo "[WARN] pnpm-lock.yaml UND package-lock.json im Repo – Policy klären."; (( rc==0 )) && rc=1
  fi

  # Vale (nur Code prüfen)
  [[ -f ".vale.ini" ]] && (vale_maybe --staged || (( rc==0 )) && rc=1)

  case "$rc" in
    0) ok "Preflight sauber.";;
    1) warn "Preflight mit Warnungen.";;
    2) die "Preflight BLOCKER → bitte Hinweise beachten.";;
  esac
}

# ── lint: Markdown/Shell/Hadolint/Actionlint + Web + Rust + Vale ─────────────────────────────────────────────────────────
lint_cmd(){
  require_repo
  local rc_total=0

  # Vale
  [[ -f ".vale.ini" ]] && { vale_maybe || rc_total=1; }

  # markdownlint
  if has markdownlint; then
    if [[ -n "$(git ls-files -z -- '*.md' 2>/dev/null | head -c1)" ]]; then
      git ls-files -z -- '*.md' | run_with_files_xargs0 "markdownlint" markdownlint || rc_total=1
    fi
  fi

  # shellcheck
  if has shellcheck; then
    { git ls-files -z -- '*.sh' 2>/dev/null; git ls-files -z -- 'wgx' 'scripts/*' 2>/dev/null; } \
    | run_with_files_xargs0 "shellcheck" shellcheck || rc_total=1
  fi

  # hadolint
  if has hadolint; then
    git ls-files -z -- '*Dockerfile*' 2>/dev/null | run_with_files_xargs0 "hadolint" hadolint || rc_total=1
  fi

  # actionlint
  if has actionlint && [[ -d ".github/workflows" ]]; then actionlint || rc_total=1; fi

  # Web (Prettier + ggf. ESLint)
  local wd; wd="$( [[ -d apps/web ]] && echo apps/web || [[ -d web ]] && echo web || echo "" )"
  if [[ -n "$wd" ]]; then
    local pm; pm="$(pm_detect "$wd")"; local prettier_cmd="" eslint_cmd=""
    case "$pm" in
      pnpm) prettier_cmd="pnpm -s exec prettier"; eslint_cmd="pnpm -s exec eslint";;
      yarn) prettier_cmd="yarn -s prettier";     eslint_cmd="yarn -s eslint";;
      npm|"") prettier_cmd="npx --yes prettier"; eslint_cmd="npx --yes eslint";;
    esac
    if (( OFFLINE )); then
      [[ "$pm" == "npm" || "$pm" == "" ]] && warn "Offline: Prettier/ESLint via npx evtl. nicht verfügbar."
    fi
    # Prettier Check über git ls-files (ohne node_modules/dist/build)
    if (( ! OFFLINE )); then
      if git_supports_magic "$wd" && find --version 2>/dev/null | grep -q GNU; then
        git -C "$wd" ls-files -z \
          -- ':(exclude)node_modules/**' ':(exclude)dist/**' ':(exclude)build/**' \
             '*.js' '*.ts' '*.tsx' '*.jsx' '*.json' '*.css' '*.scss' '*.md' '*.svelte' \
        | run_with_files_xargs0 "Prettier Check" sh -c 'cd "$1"; shift; '"$prettier_cmd"' -c -- "$@"' _ "$wd" \
        || rc_total=1
      else
        ( cd "$wd" && $prettier_cmd -c . ) || rc_total=1
      fi
    fi
    # ESLint falls Konfig existiert
    local has_eslint_cfg=0
    [[ -f "$wd/.eslintrc" || -f "$wd/.eslintrc.js" || -f "$wd/.eslintrc.cjs" || -f "$wd/.eslintrc.json" \
       || -f "$wd/eslint.config.js" || -f "$wd/eslint.config.mjs" || -f "$wd/eslint.config.cjs" ]] && has_eslint_cfg=1
    if (( has_eslint_cfg )); then
      (cd "$wd" && $eslint_cmd -v >/dev/null 2>&1 && $eslint_cmd . --ext .js,.cjs,.mjs,.ts,.tsx,.svelte) || rc_total=1
    fi
  fi

  # Rust
  local ad; ad="$( [[ -f apps/api/Cargo.toml ]] && echo apps/api || [[ -f api/Cargo.toml ]] && echo api || [[ -d crates ]] && echo crates || echo "" )"
  if [[ -n "$ad" ]] && has cargo; then
    (cd "$ad" && cargo fmt --all -- --check) || rc_total=1
    if rustup component list 2>/dev/null | grep -q 'clippy.*(installed)'; then
      (cd "$ad" && cargo clippy --all-targets --all-features -q) || rc_total=1
    else
      warn "clippy nicht installiert – übersprungen."
    fi
  fi

  (( rc_total==0 )) && ok "Lint OK" || warn "Lint mit Hinweisen (rc=$rc_total)."
  return "$rc_total"
}

# ── test: parallel Web + Rust ─────────────────────────────────────────────────────────────────────────────────────────────
test_cmd(){
  require_repo
  local rc_web=0 rc_api=0 wd ad pid_web= pid_api=
  wd="$( [[ -d apps/web ]] && echo apps/web || [[ -d web ]] && echo web || echo "" )"
  ad="$( [[ -f apps/api/Cargo.toml ]] && echo apps/api || [[ -f api/Cargo.toml ]] && echo api || echo "" )"
  trap '[[ -n "${pid_web-}" ]] && kill "$pid_web" 2>/dev/null || true; [[ -n "${pid_api-}" ]] && kill "$pid_api" 2>/dev/null || true' INT
  if [[ -n "$wd" && -f "$wd/package.json" ]]; then info "Web-Tests…"; ( cd "$wd"; case "$(pm_detect "$wd")" in pnpm) pnpm -s test -s;; npm|"") npm test -s;; yarn) yarn -s test;; esac ) & pid_web=$!; fi
  if [[ -n "$ad" && -f "$ad/Cargo.toml" ]] && has cargo; then info "Rust-Tests…"; ( cd "$ad" && cargo test --all --quiet ) & pid_api=$!; fi
  [[ -n "${pid_web-}" ]] && { wait "$pid_web" || rc_web=1; }
  [[ -n "${pid_api-}" ]] && { wait "$pid_api" || rc_api=1; }
  (( rc_web==0 && rc_api==0 )) && ok "Tests OK" || { [[ $rc_web -ne 0 ]] && warn "Web-Tests fehlgeschlagen."; [[ $rc_api -ne 0 ]] && warn "Rust-Tests fehlgeschlagen."; return 1; }
}

# ── sync: Commit → Rebase → Push (mit scope, sign, ahead/behind) ─────────────────────────────────────────────────────────
sync_cmd(){
  require_repo
  local STAGED_ONLY=0 WIP=0 AMEND=0 SCOPE="auto" BASE="" signflag="" had_upstream=0
  while [[ $# -gt 0 ]]; do case "$1" in
    --staged-only) STAGED_ONLY=1;; --wip) WIP=1;; --amend) AMEND=1;; --scope) shift; SCOPE="${1-}";;
    --base) shift; BASE="${1-}";; --sign) signflag="-S";;
  esac; shift || true; done
  [[ -n "$BASE" ]] && WGX_BASE="$BASE"
  [[ "$(git_branch)" == "HEAD" ]] && die "Detached HEAD – bitte Branch anlegen."
  (( STAGED_ONLY==0 )) && git add -A
  [[ -f ".vale.ini" ]] && vale_maybe --staged || true

  local staged list scope n msg nf="files"
  staged="$(changed_files_cached || true)"; list="${staged:-$(changed_files_all || true)}"
  scope="$([[ "$SCOPE" == "auto" ]] && auto_scope "$list" || echo "$SCOPE")"
  n=0; [[ -n "$list" ]] && n=$(printf "%s\n" "$list" | wc -l | tr -d ' ')
  (( n==1 )) && nf="file"
  msg="feat(${scope}): sync @ $(now_ts) [+${n} ${nf}]"; (( WIP )) && msg="wip: ${msg}"

  if [[ -n "$staged" ]]; then
    local sf="${signflag:-$(_maybe_sign_flag || true)}"
    if [[ -n "${sf-}" ]]; then git commit ${AMEND:+--amend} "$sf" -m "$msg" || die "Commit/Sign fehlgeschlagen."
    else git commit ${AMEND:+--amend} -m "$msg" || info "Nichts zu committen."; fi
  else info "Nichts zu committen."; fi

  ((OFFLINE)) || git fetch -q origin 2>/dev/null || true
  git rev-parse --verify -q "origin/$WGX_BASE" >/dev/null || die "Basisbranch origin/$WGX_BASE nicht gefunden (git fetch?)."
  git rebase "origin/$WGX_BASE" || { warn "Rebase-Konflikt → wgx heal --continue | --abort"; return 2; }

  if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then had_upstream=1; fi
  if (( had_upstream )); then git push || die "Push fehlgeschlagen."
  else git push --set-upstream origin "$(git_branch)" || die "Push/Upstream fehlgeschlagen."; fi

  ok "Sync erledigt."
  local behind=0 ahead=0 IFS=' '; read -r behind ahead < <(git_ahead_behind "$(git_branch)") || true
  info "Upstream: ahead=$ahead behind=$behind"
}

# ── send: PR/MR (Reviewer/Labels/Draft bei Warnungen) ────────────────────────────────────────────────────────────────────
send_cmd(){
  require_repo
  local DRAFT=0 TITLE="" WHY="" TESTS="" NOTES="" SCOPE="auto" LABELS="$WGX_PR_LABELS" ISSUE="" BASE="" SYNC_FIRST=1 SIGN=0 INTERACTIVE=0 REVIEWERS="" TRIGGER_CI=0 OPEN_PR=0 AUTO_BRANCH=0
  while [[ $# -gt 0 ]]; do case "$1" in
    --draft) DRAFT=1;; -i|--interactive) INTERACTIVE=1;;
    --title) shift; TITLE="${1-}";; --why) shift; WHY="${1-}";; --tests) shift; TESTS="${1-}";; --notes) shift; NOTES="${1-}";;
    --label) shift; LABELS="${LABELS:+$LABELS,}${1-}";;
    --issue|--issues) shift; ISSUE="${1-}";;
    --reviewers) shift; REVIEWERS="${1-}";;
    --scope) shift; SCOPE="${1-}";;
    --no-sync-first) SYNC_FIRST=0;; --sign) SIGN=1;; --base) shift; BASE="${1-}";;
    --ci) TRIGGER_CI=1;; --open) OPEN_PR=1;; --auto-branch) AUTO_BRANCH=1;;
  esac; shift || true; done
  [[ -n "$BASE" ]] && WGX_BASE="$BASE"

  # PR von Base verhindern → optional Auto-Branch
  local current; current="$(git_branch)"
  if [[ "$current" == "$WGX_BASE" ]]; then
    if (( AUTO_BRANCH )); then
      local slug="auto-pr-$(date +%Y%m%d-%H%M%S)"; info "Base erkannt → auto Branch: $slug"
      start_cmd "$slug" || die "auto-branch fehlgeschlagen"
    else
      die "send: Du stehst auf Base ($WGX_BASE). Erst \"wgx start <slug>\" – oder nutze \"wgx send --auto-branch\"."
    fi
  fi

  ((OFFLINE)) || git fetch -q origin "$WGX_BASE" >/dev/null 2>&1 || true
  if git rev-parse --verify -q "origin/$WGX_BASE" >/dev/null; then
    git diff --quiet "origin/$WGX_BASE"...HEAD && die "send: Kein Diff zu origin/$WGX_BASE → Nichts zu senden (committen oder \"wgx sync\")."
  fi

  guard_cmd; local rc=$?
  (( rc==1 )) && DRAFT=1  # Warnungen → Draft
  (( SYNC_FIRST )) && { sync_cmd ${SIGN:+--sign} --scope "${SCOPE}" --base "$WGX_BASE" || { warn "Sync fehlgeschlagen → PR abgebrochen."; return 1; }; }

  local files scope short; files="$(git diff --name-only "origin/$WGX_BASE"...HEAD 2>/dev/null || true)"
  scope="$([[ "$SCOPE" == "auto" ]] && auto_scope "$files" || echo "$SCOPE")"
  local last_subject; last_subject="$(git log -1 --pretty=%s 2>/dev/null || true)"
  short="${TITLE:-${last_subject:-"Änderungen an ${scope}"}}"
  local TITLE2="[${scope}] ${short}"

  local body; body="$(render_pr_body "$TITLE2" "$short" "${WHY:-"—"}" "${TESTS:-"—"}" "${ISSUE:-""}" "${NOTES:-""}")"
  [[ -z "$(printf '%s' "$body" | tr -d '[:space:]')" ]] && die "PR-Body ist leer – abgebrochen."

  local autoL; autoL="$(_derive_labels "$scope")"; [[ -n "$autoL" ]] && LABELS="${LABELS:+$LABELS,}$autoL"
  LABELS="$(echo "$LABELS" | awk -F, '{ for (i=1;i<=NF;i++) if ($i!="" && !seen[$i]++) out=(out?out","$i:$i); } END{print out}')"

  # Host erkennen
  local url host path; url="$(git remote get-url origin 2>/dev/null || echo "")"
  if [[ "$url" =~ github\.com[:/](.+)\.git$ ]]; then host="github"; path="${BASH_REMATCH[1]}"; fi
  if [[ -z "$host" && "$url" =~ gitlab\.com[:/](.+)\.git$ ]]; then host="gitlab"; path="${BASH_REMATCH[1]}"; fi

  case "$host" in
    gitlab)
      if has glab; then
        glab auth status >/dev/null 2>&1 || warn "glab nicht eingeloggt."
        local args=(mr create --title "$TITLE2" --description "$body" --source-branch "$(git_branch)" --target-branch "$WGX_BASE")
        (( DRAFT )) && args+=(--draft)
        [[ -n "$ISSUE" ]] && args+=(--issue "$ISSUE")
        IFS=, read -r -a _labels <<<"$LABELS"; for _l in "${_labels[@]}"; do _l="$(trim "$_l")"; [[ -n "$_l" ]] && args+=(--label "$_l"); done
        if [[ "$REVIEWERS" == "auto" ]]; then
          local rlist=""; rlist="$(printf "%s\n" "$files" | _codeowners_reviewers || true)"
          [[ -n "$rlist" ]] && { while IFS= read -r r; do [[ -n "$r" ]] && args+=(--reviewer "$r"); done <<< "$rlist"; info "Reviewer (auto): $(printf '%s' "$rlist" | tr '\n' ' ')"; }
        elif [[ -n "$REVIEWERS" ]]; then IFS=, read -r -a rv <<<"$REVIEWERS"; for r in "${rv[@]}"; do r="$(trim "$r")"; [[ -n "$r" ]] && args+=(--reviewer "$r"); done; fi
        glab "${args[@]}" || die "glab mr create fehlgeschlagen."
        ok "Merge Request erstellt."
        (( OPEN_PR )) && glab mr view --web >/dev/null 2>&1 || true
      else
        warn "glab fehlt. MR manuell anlegen: https://gitlab.com/$path/-/compare/${WGX_BASE}...$(git_branch)"
      fi
      ;;
    github|*)
      if has gh; then
        gh auth status >/dev/null 2>&1 || warn "gh nicht eingeloggt."
        local args=(pr create --title "$TITLE2" --body "$body" --base "$WGX_BASE")
        (( DRAFT )) && args+=(--draft)
        IFS=, read -r -a L <<<"$LABELS"; for l in "${L[@]}"; do l="$(trim "$l")"; [[ -n "$l" ]] && args+=(--label "$l"); done
        [[ -n "$ISSUE" ]] && args+=(--issue "$ISSUE")
        if [[ "$REVIEWERS" == "auto" ]]; then
          local rlist=""; rlist="$(printf "%s\n" "$files" | _codeowners_reviewers || true)"
          if [[ -n "$rlist" ]]; then while IFS= read -r r; do [[ -n "$r" ]] && args+=(--reviewer "$r"); done <<< "$rlist"; info "Reviewer (auto): $(printf '%s' "$rlist" | tr '\n' ' ')"; fi
        elif [[ -n "$REVIEWERS" ]]; then IFS=, read -r -a rvw2 <<<"$REVIEWERS"; for r2 in "${rvw2[@]}"; do r2="$(trim "$r2")"; [[ -n "$r2" ]] && args+=(--reviewer "$r2"); done; fi
        gh "${args[@]}" || die "gh pr create fehlgeschlagen."
        ok "PR erstellt."
        (( TRIGGER_CI )) && gh workflow run "$WGX_CI_WORKFLOW" >/dev/null 2>&1 || true
        (( OPEN_PR )) && gh pr view -w >/dev/null 2>&1 || true
      else
        warn "gh fehlt. PR manuell anlegen: https://github.com/$path/compare/${WGX_BASE}...$(git_branch)"
      fi
      ;;
  esac
}

# ── heal: Rebase/merge steuern ────────────────────────────────────────────────────────────────────────────────────────────
heal_cmd(){
  require_repo
  local MODE="${1-}"; shift || true
  local STASH=0 CONT=0 ABORT=0 BASE=""
  while [[ $# -gt 0 ]]; do case "$1" in --stash) STASH=1;; --continue) CONT=1;; --abort) ABORT=1;; --base) shift; BASE="${1-}";; esac; shift || true; done
  [[ -n "$BASE" ]] && WGX_BASE="$BASE"
  (( ABORT )) && { git rebase --abort 2>/dev/null || git merge --abort 2>/dev/null || true; ok "Abgebrochen."; return 0; }
  (( CONT )) && { git add -A; git rebase --continue || die "continue fehlgeschlagen."; ok "Rebase fortgesetzt."; return 0; }
  (( STASH )) && snapshot_make
  ((OFFLINE)) || git fetch -q origin 2>/dev/null || true
  case "$MODE" in
    ""|rebase) git rev-parse --verify -q "origin/$WGX_BASE" >/dev/null || die "Basisbranch origin/$WGX_BASE nicht gefunden."; git rebase "origin/$WGX_BASE" || { warn "Konflikte. Löse sie, dann: wgx heal --continue | --abort"; return 2; } ;;
    ours)      git merge -X ours   "origin/$WGX_BASE" || { warn "Konflikte. manuell lösen + commit"; return 2; } ;;
    theirs)    git merge -X theirs "origin/$WGX_BASE" || { warn "Konflikte. manuell lösen + commit"; return 2; } ;;
    ff-only)   git merge --ff-only "origin/$WGX_BASE" || { warn "Fast-Forward nicht möglich."; return 2; } ;;
    *) die "Unbekannter heal-Modus: $MODE";;
  esac
  ok "Heal erfolgreich."
}

# ── clean: Artefakte/Branches/Deep ────────────────────────────────────────────────────────────────────────────────────────
clean_cmd(){
  require_repo
  local SAFE=1 BUILD=0 GIT=0 DEEP=0
  while [[ $# -gt 0 ]]; do case "$1" in --safe) SAFE=1;; --build) BUILD=1;; --git) GIT=1;; --deep) DEEP=1;; esac; shift || true; done
  (( SAFE || BUILD || GIT || DEEP )) || SAFE=1
  do_rm(){ rm -rf "$@"; }
  if (( SAFE || BUILD )); then do_rm ./coverage ./dist ./node_modules/.cache ./target; find "${TMPDIR:-/tmp}" -maxdepth 1 -type f -name 'wgx-*.log' -mtime +1 -exec rm -f {} + 2>/dev/null || true; fi
  if (( GIT )); then
    git branch --merged | grep -Ev '^\*|[[:space:]](main|master|dev)$' | sed 's/^[*[:space:]]*//' | while IFS= read -r b; do [[ -n "$b" ]] && git branch -d "$b" 2>/dev/null || true; done
    git remote prune origin >/dev/null 2>&1 || true
  fi
  (( DEEP )) && git clean -xfd
  ok "Clean fertig."
}

# ── reload: Shell neu ─────────────────────────────────────────────────────────────────────────────────────────────────────
reload_cmd(){
  local MODE="${1-}"; shift || true
  local TMUX=0; [[ "${1-}" == "--tmux" ]] && { TMUX=1; shift || true; }
  case "$MODE" in
    here|"") exec "$SHELL" -l;;
    root) cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)" && exec "$SHELL" -l;;
    new)
      if (( TMUX )) && has tmux; then tmux new-window -c "$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)"
      else if has setsid; then setsid "$SHELL" -l >/dev/null 2>&1 < /dev/null & else nohup "$SHELL" -l >/dev/null 2>&1 < /dev/null & info "nohup verwendet (setsid fehlt)."; fi
      fi
      ok "Neue Shell gestartet."
      ;;
    *) die "reload: here|root|new [--tmux]";;
  esac
}

# ── env: Doctor + (Termux) Fix ───────────────────────────────────────────────────────────────────────────────────────────
env_doctor_termux(){
  echo "=== wgx env doctor (Termux) ==="
  echo "PREFIX : ${PREFIX-}"
  echo "storage: $([[ -d "$HOME/storage" ]] && echo present || echo missing)"
  [[ ! -d "$HOME/storage" ]] && echo "Hinweis: termux-setup-storage ausführen, dann Termux neu starten."
  for p in git gh glab jq curl wget unzip zsh; do has "$p" && echo "pkg:$p OK" || echo "pkg:$p fehlt → pkg install $p"; done
  if has node; then echo "node OK ($(node -v 2>/dev/null))"; else echo "node fehlt → pkg install nodejs-lts"; fi
  has rustc && echo "rust OK ($(rustc -V 2>/dev/null))" || echo "rust fehlt → pkg install rust"
  has cargo && echo "cargo OK ($(cargo -V 2>/dev/null))" || true
  (( OFFLINE )) && echo "mode   : offline"
  ok "Termux-Check beendet."
}
env_fix_termux(){
  if [[ ! -d "$HOME/storage" ]] && has termux-setup-storage; then termux-setup-storage || true; fi
  local need=(); for p in git gh glab jq curl wget unzip zsh; do has "$p" || need+=("$p"); done
  ((${#need[@]})) && pkg install -y "${need[@]}" || true
  ok "Termux-Fixes angewendet (sofern verfügbar)."
}
env_cmd(){
  local sub="${1-}" fix=0; shift || true
  [[ "${1-}" == "--fix" ]] && { fix=1; shift || true; }
  case "$sub" in
    doctor|"")
      if [[ -n "${PREFIX-}" && "$PREFIX" == *"/com.termux/"* ]]; then env_doctor_termux; (( fix )) && env_fix_termux
      else
        echo "=== wgx env doctor ==="
        for p in git gh glab jq; do has "$p" && echo "$p OK ($( $p --version 2>/dev/null | head -n1 ))" || echo "$p fehlt"; done
        has node && echo "node OK ($(node -v 2>/dev/null))" || echo "node fehlt"
        has cargo && echo "cargo OK ($(cargo -V 2>/dev/null))" || echo "cargo fehlt (optional)"
        (( OFFLINE )) && echo "mode : offline"
        ok "Umgebungscheck beendet."
      fi
      ;;
    *) die "Usage: wgx env doctor [--fix]";;
  esac
}

# ── quick: Guard → Lint/Test → Sync → PR/MR (Draft bei Warnungen) ─────────────────────────────────────────────────────────
quick_cmd(){
  require_repo
  echo "=== wgx quick ==="
  local rc_guard=0 rc_lint=0 rc_test=0
  guard_cmd --lint --test || rc_guard=$?
  lint_cmd || rc_lint=$?
  test_cmd || rc_test=$?
  local draft=()
  (( rc_guard==1 || rc_lint!=0 || rc_test!=0 )) && draft+=(--draft)
  sync_cmd || die "Sync fehlgeschlagen."
  send_cmd "${draft[@]}" --ci --open || die "Send fehlgeschlagen."
}
##### ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────