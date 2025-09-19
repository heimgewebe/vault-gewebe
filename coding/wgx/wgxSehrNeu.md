#!/usr/bin/env bash
# wgx – Weltgewebe CLI · Synthese (Block 1/4: Bootstrap & Grundlagen)
# minimal-color, mobile-first (Termux ok), robust für macOS/Linux/WSL

# ───────────────── Trap: klare Fehlermeldung mit Zeile & Befehl ─────────────────
trap 'ec=$?; cmd=$BASH_COMMAND; line=${BASH_LINENO[0]}; fn=${FUNCNAME[1]:-MAIN}; ((ec)) && printf "❌ wgx: Fehler in %s (Zeile %s): %s (exit=%s)\n" "$fn" "$line" "$cmd" "$ec" >&2' ERR

# Strikte Shell: stop on error/undefined; sichere word-splitting defaults
set -Eeuo pipefail
IFS=$'\n\t'
umask 077
shopt -s extglob nullglob

WGX_VERSION="1.22.0-synth"

# ───────── superfrüher Fast-Exit für Versionsabfrage ─────────
if [[ "${1-}" == "--version" || "${1-}" == "-V" ]]; then
  printf "wgx v%s\n" "$WGX_VERSION"
  exit 0
fi

# ────────────────────── Logging (terminal-safe, emoji-light) ───────────────────
_ok()   { printf "✅ %s\n" "$*"; }
_warn() { printf "⚠️  %s\n" "$*" >&2; }
_err()  { printf "❌ %s\n" "$*" >&2; }
die()   { _err "$*"; exit 1; }
ok()    { _ok "$@"; }
warn()  { _warn "$@"; }
info()  { printf "• %s\n" "$*"; }

# ─────────────────────────── Helpers (allgemein) ───────────────────────────────
try()      { "$@" 2>/dev/null || true; }             # nie hart fehlschlagen
git_cfg()  { git config --get "$1" 2>/dev/null || true; }
trim()     { local s="$*"; s="${s#"${s%%[![:space:]]*}"}"; printf "%s" "${s%"${s##*[![:space:]]}"}"; }
to_lower() { tr '[:upper:]' '[:lower:]'; }
read_prompt(){ # read_prompt var "Frage?" "default"
  local __v q d; __v="$1"; q="$2"; d="${3-}"
  local ans; printf "%s " "$q"; read -r ans || ans="$d"; [[ -z "${ans:-}" ]] && ans="$d"
  printf -v "$__v" "%s" "$ans"
}
has()      { command -v "$1" >/dev/null 2>&1; }

# ─────────────────────────── Defaults / Env-Flags ──────────────────────────────
: "${ASSUME_YES:=0}"
: "${DRYRUN:=0}"
: "${TIMEOUT:=0}"
: "${NOTIMEOUT:=0}"
: "${VERBOSE:=0}"
: "${OFFLINE:=0}"

: "${WGX_BASE:=main}"
: "${WGX_SIGNING:=auto}"                # auto|off|ssh|gpg (Verwendung in Block 4)
: "${WGX_PREVIEW_DIFF_LINES:=120}"
: "${WGX_PR_LABELS:=}"
: "${WGX_CI_WORKFLOW:=CI}"
# optional: WGX_WEB_DIR, WGX_API_DIR, WGX_PM, WGX_AUTO_BRANCH

# ────────────────────── Platform- & Umgebungserkennung ─────────────────────────
PLATFORM="linux"
if uname | grep -qi darwin; then PLATFORM="darwin"; fi

is_termux()    { [[ "${PREFIX-}" == *"/com.termux/"* || -d "/data/data/com.termux/files/usr" ]]; }
is_wsl()       { uname -r 2>/dev/null | grep -qiE 'microsoft|wsl2?'; }
is_codespace() { [[ -n "${CODESPACE_NAME-}" ]]; }
is_git_repo()  { git rev-parse --is-inside-work-tree >/dev/null 2>&1; }
require_repo() { is_git_repo || die "Nicht im Git-Repo (wgx benötigt ein Git-Repository)."; }

# ─────────────────────── Root-Ermittlung (robust + Symlinks) ───────────────────
ROOT() {
  local here="${BASH_SOURCE[0]}"
  # Symlinks auflösen (GNU/BSD + greadlink für macOS coreutils)
  if has greadlink; then
    here="$(greadlink -f "$here")"
  elif has readlink; then
    if readlink -f / >/dev/null 2>&1; then
      here="$(readlink -f "$here")"
    else
      local link
      while link="$(readlink "$here" 2>/dev/null)"; do
        case "$link" in
          /*) here="$link" ;;
          *)  here="$(cd "$(dirname "$here")" && pwd -P)/$link" ;;
        esac
      done
    fi
  fi
  # Falls im Repo: Git-Root bevorzugen
  local r; r="$(git -C "${PWD}" rev-parse --show-toplevel 2>/dev/null || true)"
  if [[ -n "$r" ]]; then printf "%s" "$r"; return; fi
  # Fallback: wenn Skript unter cli/wgx/wgx liegt → zwei Ebenen hoch
  local fallback; fallback="$(cd "$(dirname "$here")/../.." && pwd -P 2>/dev/null || pwd -P)"
  printf "%s" "$fallback"
}
ROOT_DIR="$(ROOT)"

# ────────────────────── .wgx.conf (lokal) einlesen ─────────────────────────────
# Format: KEY=VALUE (ohne Quotes); Zeilen mit # sind Kommentare
if [[ -f "$ROOT_DIR/.wgx.conf" ]]; then
  while IFS='=' read -r k v; do
    [[ -z "${k:-}" || "$k" =~ ^[[:space:]]*# ]] && continue
    k="$(trim "$k")"; v="$(trim "$v")"
    [[ -z "$k" ]] && continue
    # Export nur für erwartete Schlüssel oder allgemein erlauben:
    case "$k" in
      WGX_*|ASSUME_YES|DRYRUN|TIMEOUT|NOTIMEOUT|VERBOSE|OFFLINE) eval "export ${k}=\"${v}\"" ;;
      *) : ;; # unbekannte Keys ignorieren (bewusst strikt)
    esac
  done < "$ROOT_DIR/.wgx.conf"
fi

# ─────────────────────── Git/Remote-Helfer (Basis) ─────────────────────────────
git_branch()       { git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "HEAD"; }
git_in_progress()  { git rebase --show-current-patch >/dev/null 2>&1 || git merge HEAD 2>/dev/null | grep -q .; }
# ahead/behind wird in Block 2/4 genutzt; fetch ist offline-freundlich
_fetch_guard()     { ((OFFLINE)) && return 0; git fetch -q origin 2>/dev/null || true; }
git_ahead_behind() {
  local b="${1:-$(git_branch)}"
  _fetch_guard
  local ab; ab="$(git rev-list --left-right --count "origin/$b...$b" 2>/dev/null || echo "0 0")"
  local behind=0 ahead=0 IFS=' '
  read -r behind ahead <<<"$ab" || true
  printf "%s %s\n" "${behind:-0}" "${ahead:-0}"
}

# ─────────────────────────── Global-Argumente parsen ───────────────────────────
# Hinweis: Subcommands werden erst in Block 2/3/4 geroutet – hier nur globale Flags.
while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes)         ASSUME_YES=1;;
    --dry-run)     DRYRUN=1;;
    --timeout)     shift; [[ "${1-}" =~ ^[0-9]+$ ]] || die "--timeout braucht Zahl (Sekunden)"; TIMEOUT="$1";;
    --no-timeout)  NOTIMEOUT=1;;
    --verbose)     VERBOSE=1;;
    --base)        shift; WGX_BASE="${1-}";;
    --offline)     OFFLINE=1;;
    --no-color)    : ;;   # Emojis sind terminal-safe; keine ANSI-Farben genutzt
    --version|-V)  printf "wgx v%s\n" "$WGX_VERSION"; exit 0;;
    # Subcommands werden später behandelt → loop verlassen
    send|sync|guard|heal|reload|clean|doctor|init|setup|lint|start|release|hooks|version|env|quick|config|test|status|open|diag|fix|stash|help|-h|--help)
      break;;
    *)
      warn "Unbekanntes globales Argument ignoriert: $1"
      ;;
  esac
  shift || true
done

# Ab hier folgen in Block 2/3/4:
# - Core CLI/UX & Router (usage, status/doctor/open/diag …)
# - Setup/Start/Version/Release
# - Guard/Lint/Test/Sync/Send/Heal/Clean u.v.m.

# Platzhalter, damit Block 1 alleine valid ist:
SUB="${1-:-}"
if [[ "$SUB" == "-:" ]]; then
  info "wgx v$WGX_VERSION – Basis geladen (Block 1/4). Mehr Befehle folgen in den nächsten Blöcken."
  exit 0
fi
# ────────────────────────────────────────────────────────────────────────────────
# Block 2/4: Core-CLI/UX & Router (usage, status, doctor, open, diag)
# HINWEIS: Hängt direkt an Block 1. Keine doppelten Helpers definieren.
# ────────────────────────────────────────────────────────────────────────────────

now_ts(){ date +"%Y-%m-%d %H:%M"; }

# --- Remote/URL-Utils -----------------------------------------------------------
remote_host_path(){
  local u; u="$(git remote get-url origin 2>/dev/null || true)"; [[ -z "$u" ]] && { echo ""; return; }
  case "$u" in
    http*://*/*) echo "${u#*://}" ;;
    git@*:*/*)   echo "${u#git@}" | sed 's/:/ /; s/  */ /g' | awk '{print $1" "$2}' ;;
    *) echo "$u" ;;
  esac
}
compare_url(){
  local hp host path; hp="$(remote_host_path || true)"; [[ -z "$hp" ]] && { echo ""; return; }
  host="${hp%% *}"; path="${hp#* }"; path="${path%.git}"
  case "$host" in
    github.com) echo "https://github.com/$path/compare/${WGX_BASE}...$(git_branch)";;
    gitlab.com) echo "https://gitlab.com/$path/-/compare/${WGX_BASE}...$(git_branch)";;
    *) echo "";;
  esac
}

# --- Signing-Mode-Erkennung (leichtgewichtig, Block 4 hat ggf. Feinheiten) -----
signing_mode(){
  local mode="${WGX_SIGNING:-auto}"
  case "$mode" in
    off)  echo "off";  return;;
    ssh|gpg) echo "$mode"; return;;
    auto|*) git config --get user.signingkey >/dev/null 2>&1 && echo "auto(gpg)" || echo "off"
  esac
}

# --- usage ---------------------------------------------------------------------
usage(){
cat <<EOF
wgx – v${WGX_VERSION}
Kurz:
  wgx status             # Repo-Status (ahead/behind, staged/changed/untracked, Sign-Mode)
  wgx doctor             # Umfeld/Tools checken (git/gh/glab/node/cargo, Termux/WSL, offline)
  wgx open compare       # Compare-URL (GitHub/GitLab) im Browser öffnen
  wgx diag               # Schnell-Diagnose: Rebase/Merge, Konfliktmarker, Lockfile-Mix

Demnächst (Blöcke 3/4):
  wgx setup|init|start|version|release
  wgx guard|lint|test|sync|send|heal|clean|hooks|config|quick

Global:
  --yes  --dry-run  --timeout <s>  --no-timeout  --verbose  --base <branch>  --offline  --version
EOF
}

# --- Open-Helfer (macOS/Linux/WSL) ---------------------------------------------
_open_url(){
  local url="$1"
  if [[ -z "$url" ]]; then die "Keine URL."; fi
  if has open; then open "$url" >/dev/null 2>&1 || true
  elif has xdg-open; then xdg-open "$url" >/dev/null 2>&1 || true
  elif has powershell.exe; then powershell.exe start "$url" >/dev/null 2>&1 || true
  else
    info "Bitte manuell öffnen: $url"
    return 1
  fi
}

# --- status --------------------------------------------------------------------
status_cmd(){
  require_repo

  local br base behind=0 ahead=0 remote reachable="yes" remurl="" sig="" dirty=0
  br="$(git_branch)"; base="$WGX_BASE"
  remurl="$(git remote get-url origin 2>/dev/null || echo "")"

  # reachability (offline-freundlich)
  if (( OFFLINE )); then
    reachable="skip (offline)"
  else
    if git ls-remote --exit-code origin &>/dev/null; then
      reachable="ok"
    else
      reachable="no (origin unreachable)"
    fi
  fi

  # ahead/behind
  local IFS=' '
  read -r behind ahead < <(git_ahead_behind "$br") || true

  # Zähler
  local n_staged n_changed n_untracked
  n_staged=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
  n_changed=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
  n_untracked=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')

  (( n_staged>0 || n_changed>0 || n_untracked>0 )) && dirty=1

  # Sign-Modus
  sig="$(signing_mode)"

  echo "=== wgx status ==="
  echo "root   : $ROOT_DIR"
  echo "branch : $br (base:$base)  ahead:$ahead  behind:$behind"
  echo "work   : staged:$n_staged  changed:$n_changed  untracked:$n_untracked  dirty:$dirty"
  echo "remote : ${remurl:-none}"
  echo "reach  : $reachable"
  echo "sign   : $sig"
  (( OFFLINE )) && echo "mode   : offline"
  local cmp; cmp="$(compare_url)"
  [[ -n "$cmp" ]] && echo "compare: $cmp"
  ok "Status OK"
}

# --- doctor --------------------------------------------------------------------
doctor_cmd(){
  local in_repo=1; is_git_repo || in_repo=0

  echo "=== wgx doctor ==="
  echo "platform : $PLATFORM  termux=$(is_termux && echo yes || echo no)  wsl=$(is_wsl && echo yes || echo no)  codespaces=$(is_codespace && echo yes || echo no)"
  echo "root     : $ROOT_DIR"
  (( OFFLINE )) && echo "mode     : offline (fetch/pull wird übersprungen)"

  if (( in_repo )); then
    local br behind=0 ahead=0 IFS=' '
    br="$(git_branch)"
    read -r behind ahead < <(git_ahead_behind "$br") || true
    echo "repo     : branch=$br  base=$WGX_BASE  ahead=$ahead  behind=$behind"
    echo "remote   : $(git remote get-url origin 2>/dev/null || echo none)"
  else
    echo "repo     : (kein Git-Repository)"
  fi

  # Tooling
  for t in git gh glab node npm pnpm yarn cargo rustc vale shellcheck hadolint actionlint jq; do
    if has "$t"; then
      case "$t" in
        git)  echo "tool:$t  $(git --version 2>/dev/null)";;
        gh)   echo "tool:$t  $(gh --version 2>/dev/null | head -n1)";;
        glab) echo "tool:$t  $(glab --version 2>/dev/null | head -n1)";;
        node) echo "tool:$t  $(node -v 2>/dev/null)";;
        cargo)echo "tool:$t  $(cargo -V 2>/dev/null)";;
        rustc)echo "tool:$t  $(rustc -V 2>/dev/null)";;
        *)    echo "tool:$t  OK";;
      esac
    else
      echo "tool:$t  missing"
    fi
  done

  ok "Doctor OK"
}

# --- diag (Schnell-Diagnose typischer Stolpersteine) ---------------------------
diag_cmd(){
  require_repo
  local rc=0

  # Rebase/Merge in progress?
  if git_in_progress; then
    warn "Rebase/Merge läuft → 'wgx heal --continue' oder '--abort'."
    rc=1
  fi

  # Konfliktmarker in modifizierten Dateien
  local with_markers=""
  while IFS= read -r -d '' f; do
    [[ -z "$f" ]] && continue
    grep -Eq '<<<<<<<|=======|>>>>>>>' -- "$f" 2>/dev/null && with_markers+="$f"$'\n'
  done < <(git ls-files -m -z)
  if [[ -n "$with_markers" ]]; then
    warn "Konfliktmarker gefunden:"
    printf '%s' "$with_markers" | sed 's/^/  - /'
    rc=1
  fi

  # Lockfile-Mix
  if git ls-files --error-unmatch pnpm-lock.yaml >/dev/null 2>&1 \
     && git ls-files --error-unmatch package-lock.json >/dev/null 2>&1; then
    warn "pnpm-lock.yaml UND package-lock.json im Repo – bitte Tooling-Policy klären."
    rc=$(( rc==0 ? 1 : rc ))
  fi

  # Große Dateien im Index (>10MB)
  local staged biglist=""
  staged="$(git diff --cached --name-only 2>/dev/null || true)"
  if [[ -n "$staged" ]]; then
    while IFS= read -r f; do
      [[ -f "$f" ]] || continue
      local sz=0
      if stat -c %s "$f" >/dev/null 2>&1; then sz=$(stat -c %s "$f")
      elif stat -f%z "$f" >/dev/null 2>&1; then sz=$(stat -f%z "$f")
      else sz=$(wc -c < "$f" 2>/dev/null || echo 0); fi
      (( sz>10485760 )) && biglist+="$f ($sz B)"$'\n'
    done <<< "$staged"
    if [[ -n "$biglist" ]]; then
      warn "Große Dateien (>10MB) im Commit:"
      printf "%s" "$biglist" | sed 's/^/  - /'
      rc=$(( rc==0 ? 1 : rc ))
    fi
  fi

  (( rc==0 )) && ok "Diag unauffällig." || warn "Diag mit Hinweisen (rc=$rc)."
  return 0
}

# --- open (nur „compare“ aktuell) ----------------------------------------------
open_cmd(){
  local what="${1-compare}"
  case "$what" in
    compare)
      local url; url="$(compare_url)"
      [[ -n "$url" ]] || die "Keine Compare-URL verfügbar (Remote/Host unbekannt?)."
      _open_url "$url" || true
      ;;
    *)
      die "Usage: wgx open compare"
      ;;
  esac
}

# ───────────── Stubs für kommende Blöcke (verhindern „command not found“) ──────
not_yet(){ die "Kommando noch nicht in Block 2 verfügbar. (Kommt in Block 3/4)"; }
setup_cmd(){ not_yet; } init_cmd(){ not_yet; } start_cmd(){ not_yet; }
version_cmd(){ not_yet; } release_cmd(){ not_yet; } hooks_cmd(){ not_yet; }
guard_run(){ not_yet; } lint_cmd(){ not_yet; } test_cmd_entry(){ not_yet; }
sync_cmd(){ not_yet; } send_cmd(){ not_yet; } heal_cmd(){ not_yet; }
clean_cmd(){ not_yet; } config_cmd(){ not_yet; } quick_cmd(){ not_yet; }

# --- Router --------------------------------------------------------------------
SUB="${1-}"; shift || true
case "${SUB:-}" in
  ""|help|-h|--help) usage;;
  status)  status_cmd "$@";;
  doctor)  doctor_cmd "$@";;
  open)    open_cmd "$@";;
  diag)    diag_cmd "$@";;

  # Platzhalter (Block 3/4 liefern echte Implementierungen)
  setup|init|start|version|release|hooks|guard|lint|test|sync|send|heal|clean|config|quick)
    "${SUB}_cmd" "$@" ;;  # ruft die Stub-Funktionen oben, bis Block 3/4 kommt

  *) die "Unbekanntes Kommando: ${SUB:-<none>} (siehe 'wgx help')" ;;
esac
# ────────────────────────────────────────────────────────────────────────────────
# Block 3/4: Setup / Init / Start / Version / Release / Hooks
# ────────────────────────────────────────────────────────────────────────────────

# -------- Hilfsfunktionen für Versionierung ------------------------------------
_last_semver_tag(){ git tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -n1 || true; }
_semver_bump(){
  local lt="$1" kind="$2" vM vN vP
  [[ "$lt" =~ ^v?([0-9]+)\.([0-9]+)\.([0-9]+) ]] || { echo "v0.0.1"; return 0; }
  vM="${BASH_REMATCH[1]}"; vN="${BASH_REMATCH[2]}"; vP="${BASH_REMATCH[3]}"
  case "$kind" in
    patch) vP=$((vP+1));;
    minor) vN=$((vN+1)); vP=0;;
    major) vM=$((vM+1)); vN=0; vP=0;;
    *) echo "v${vM}.${vN}.${vP}"; return 0;;
  esac
  echo "v${vM}.${vN}.${vP}"
}

_pkg_json_set_ver(){
  local pj="$1" ver="${2#v}"
  if has jq; then
    jq --arg v "$ver" '.version=$v' "$pj" > "$pj.tmp" && mv "$pj.tmp" "$pj" || return 1
  else
    # sed-Fallback (ohne jq)
    local v_esc="${ver//\\/\\\\}"; v_esc="${v_esc//&/\\&}"; v_esc="${v_esc//|/\\|}"
    sed -E -i.bak 's|^([[:space:]]*"version"[[:space:]]*:[[:space:]]*")[^"]*(".*)|\1'"$v_esc"'\2|' "$pj" && rm -f "$pj.bak"
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

# -------- Setup & Init ----------------------------------------------------------
setup_cmd(){
  # leichtgewichtig, Termux bekommt Basics, andere Plattformen nur Hinweise
  if is_termux; then
    info "Termux-Setup (Basis-Tools)…"
    pkg update -y && pkg upgrade -y || true
    pkg install -y git gh glab curl wget unzip zsh jq || true
    has vale || warn "Vale nicht via pkg? → Binary Release installieren; sonst wird der Check übersprungen."
    has gh   || warn "GitHub CLI (gh) nicht verfügbar – PR/Release-Funktionen eingeschränkt."
    has glab || warn "GitLab CLI (glab) nicht verfügbar – MR/Release-Funktionen eingeschränkt."
    ok "Termux-Setup abgeschlossen."
  else
    info "Setup ist plattformabhängig. Stelle sicher: git, gh (optional glab), zsh, jq, vale."
  fi
}

init_cmd(){
  local conf="$ROOT_DIR/.wgx.conf"
  if [[ -f "$conf" ]]; then
    warn ".wgx.conf existiert bereits → unverändert."
  else
    cat > "$conf" <<EOF
# wgx config (lokal)
WGX_BASE=${WGX_BASE}
WGX_SIGNING=${WGX_SIGNING}
WGX_PREVIEW_DIFF_LINES=${WGX_PREVIEW_DIFF_LINES}
WGX_PR_LABELS=${WGX_PR_LABELS}
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
  fi

  mkdir -p "$ROOT_DIR/.wgx"
  if [[ ! -f "$ROOT_DIR/.wgx/pr_template.md" ]]; then
    cat > "$ROOT_DIR/.wgx/pr_template.md" <<'EOF'
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
    ok ".wgx/pr_template.md angelegt."
  else
    info ".wgx/pr_template.md existiert bereits."
  fi
}

# -------- Branch-Start (Feature-Branch vom Base) --------------------------------
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

  git fetch origin "$WGX_BASE" 2>/dev/null || true
  local base_ref="origin/$WGX_BASE"
  git rev-parse --verify -q "$base_ref" >/dev/null || base_ref="$WGX_BASE"
  git rev-parse --verify -q "$base_ref" >/dev/null || die "Basisbranch $WGX_BASE nicht gefunden (weder lokal noch origin/)."

  # slug härten
  slug="${slug//[^a-zA-Z0-9._-]/-}"
  slug="${slug//../.}"
  slug="${slug##+(-)}"; slug="${slug%%+(-)}"
  [[ -z "$slug" ]] && die "leerer Branch-Name."

  local name="$slug"
  [[ -n "$issue" ]] && name="feat-${issue}-${slug}"
  shopt -s extglob; name="${name//+(-)/-}"; shopt -u extglob
  name="${name//@\{/-}"
  [[ "$name" == *.lock ]] && name="${name%.lock}-lock"

  git check-ref-format --branch "$name" || die "Ungültiger Branch-Name: $name"
  git checkout -b "$name" "$base_ref" || die "Branch konnte nicht erstellt werden."
  ok "Branch '$name' von $base_ref erstellt und ausgecheckt."
}

# -------- Version (Node/Rust monorepo-freundlich) -------------------------------
version_cmd(){
  require_repo
  local sub="${1-}"; shift || true
  case "$sub" in
    bump)
      local kind="${1-}"; shift || true
      [[ "$kind" =~ ^(patch|minor|major)$ ]] || die "version bump: erwartet patch|minor|major"
      local lt="$(_last_semver_tag || echo v0.0.0)"
      local nv="$(_semver_bump "$lt" "$kind")"; nv="${nv#v}"

      # web/api Verzeichnisse detektieren
      local web="${WGX_WEB_DIR:-}"; local api="${WGX_API_DIR:-}"
      [[ -z "$web" && -d "$ROOT_DIR/apps/web" ]] && web="$ROOT_DIR/apps/web"
      [[ -z "$web" && -d "$ROOT_DIR/web"      ]] && web="$ROOT_DIR/web"
      [[ -z "$api" && -f "$ROOT_DIR/apps/api/Cargo.toml" ]] && api="$ROOT_DIR/apps/api"
      [[ -z "$api" && -f "$ROOT_DIR/api/Cargo.toml"      ]] && api="$ROOT_DIR/api"
      [[ -z "$api" && -d "$ROOT_DIR/crates"              ]] && api="$ROOT_DIR"  # Workspace

      [[ -n "$web" && -f "$web/package.json" ]] && _pkg_json_set_ver "$web/package.json" "$nv"
      if [[ -n "$api" ]]; then
        if [[ -f "$api/Cargo.toml" ]]; then _cargo_set_ver "$api" "$nv"
        elif [[ -d "$api/crates" ]]; then (cd "$api" && _cargo_set_ver "$api" "$nv") || true
        fi
      fi

      # optionaler Commit
      local do_commit=0; for a in "$@"; do [[ "$a" == "--commit" ]] && do_commit=1; done
      (( do_commit )) && { git add -A && git commit -m "chore(version): bump to v$nv"; }
      ok "Version bump → v$nv"
      ;;
    set)
      local v="$1"; shift || true
      [[ -n "$v" ]] || die "version set vX.Y.Z"
      [[ "$v" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "Ungültige Version: $v"
      v="${v#v}"

      local web="${WGX_WEB_DIR:-}"; local api="${WGX_API_DIR:-}"
      [[ -z "$web" && -d "$ROOT_DIR/apps/web" ]] && web="$ROOT_DIR/apps/web"
      [[ -z "$web" && -d "$ROOT_DIR/web"      ]] && web="$ROOT_DIR/web"
      [[ -z "$api" && -f "$ROOT_DIR/apps/api/Cargo.toml" ]] && api="$ROOT_DIR/apps/api"
      [[ -z "$api" && -f "$ROOT_DIR/api/Cargo.toml"      ]] && api="$ROOT_DIR/api"
      [[ -z "$api" && -d "$ROOT_DIR/crates"              ]] && api="$ROOT_DIR"

      [[ -n "$web" && -f "$web/package.json" ]] && _pkg_json_set_ver "$web/package.json" "$v"
      if [[ -n "$api" ]]; then
        if [[ -f "$api/Cargo.toml" ]]; then _cargo_set_ver "$api" "$v"
        elif [[ -d "$api/crates" ]]; then (cd "$api" && _cargo_set_ver "$api" "$v") || true
        fi
      fi

      local do_commit=0; for a in "$@"; do [[ "$a" == "--commit" ]] && do_commit=1; done
      (( do_commit )) && { git add -A && git commit -m "chore(version): set v$v"; }
      ok "Version gesetzt → v$v"
      ;;
    *)
      die "Usage: wgx version bump [patch|minor|major] [--commit] | wgx version set vX.Y.Z [--commit]"
      ;;
  esac
}

# -------- Release (Tag + GitHub/GitLab Release) --------------------------------
release_cmd(){
  require_repo
  local VERSION="" PUSH=0 SIGN_TAG=0 NOTES="auto" FROM="origin/$WGX_BASE" TO="HEAD" AUTO_KIND="" LATEST=0
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
    esac
    shift || true
  done

  if [[ -z "$VERSION" && -n "$AUTO_KIND" ]]; then
    VERSION="$(_semver_bump "$(_last_semver_tag || echo v0.0.0)" "$AUTO_KIND")"
  fi
  [[ -z "$VERSION" ]] && die "release: --version vX.Y.Z oder --auto-version patch|minor|major erforderlich."
  [[ "$VERSION" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "Ungültige Version: $VERSION"
  [[ "$VERSION" != v* ]] && VERSION="v$VERSION"

  local notes_text="" notes_file=""
  if [[ "$NOTES" == "auto" ]]; then
    notes_text="## $VERSION ($(date +%Y-%m-%d))"$'\n\n'"### Changes"$'\n'
    notes_text+="$(git log --pretty='- %s (%h)' "$FROM..$TO" || true)"
    notes_file="$(mktemp -t wgx-notes.XXXXXX 2>/dev/null || mktemp_portable wgx-notes)"
    printf "%s\n" "$notes_text" > "$notes_file"
  else
    [[ -f "$NOTES" ]] || die "--notes Datei nicht gefunden: $NOTES"
    notes_file="$NOTES"
  fi

  git rev-parse -q --verify "refs/tags/$VERSION" >/dev/null && die "Tag $VERSION existiert bereits."
  if (( SIGN_TAG )); then git tag -s "$VERSION" -m "$VERSION" || die "Signiertes Tag fehlgeschlagen."
  else                     git tag -a "$VERSION" -m "$VERSION" || die "Tagging fehlgeschlagen."
  fi
  ok "Git-Tag $VERSION erstellt."
  (( PUSH )) && { git push origin "$VERSION" || die "Tag Push fehlgeschlagen."; ok "Tag gepusht."; }

  # Host erkennen und Release anlegen
  host_kind(){
    local hp; hp="$(git remote get-url origin 2>/dev/null || true)"; [[ -z "$hp" ]] && { echo ""; return; }
    case "$hp" in
      git@github.com:*|https://github.com/*) echo "github";;
      git@gitlab.com:*|https://gitlab.com/*) echo "gitlab";;
      *) echo "";;
    esac
  }
  case "$(host_kind)" in
    gitlab)
      if has glab; then
        glab auth status >/dev/null 2>&1 || { warn "glab nicht eingeloggt – Release nur lokal getaggt."; [[ "$NOTES" == "auto" && -n "$notes_file" ]] && rm -f "$notes_file"; return 0; }
        glab release create "$VERSION" --notes-file "$notes_file" || die "glab release create fehlgeschlagen."
        (( LATEST )) && glab release edit "$VERSION" --latest >/dev/null 2>&1 || true
        ok "GitLab Release erstellt: $VERSION"
      else
        info "glab CLI fehlt – nur Git-Tag erstellt."
      fi
      ;;
    github|*)
      if has gh; then
        gh auth status >/dev/null 2>&1 || { warn "gh nicht eingeloggt – Release nur lokal getaggt."; [[ "$NOTES" == "auto" && -n "$notes_file" ]] && rm -f "$notes_file"; return 0; }
        local latest_flag=(); (( LATEST )) && latest_flag+=(--latest)
        gh release create "$VERSION" "${latest_flag[@]}" --notes-file "$notes_file" || die "gh release create fehlgeschlagen."
        ok "GitHub Release erstellt: $VERSION"
      else
        info "gh CLI fehlt – nur Git-Tag erstellt."
      fi
      ;;
  esac

  [[ "$NOTES" == "auto" && -n "$notes_file" ]] && rm -f "$notes_file" || true
}

# -------- Hooks (Delegation an Installer) --------------------------------------
hooks_cmd(){
  require_repo
  local sub="${1-}"; shift || true
  case "$sub" in
    install)
      local root
      root="$(git rev-parse --show-toplevel 2>/dev/null || printf "%s" "$ROOT_DIR")"
      if [[ -x "$root/cli/wgx/install.sh" ]]; then
        bash "$root/cli/wgx/install.sh" || die "wgx install.sh fehlgeschlagen"
      else
        die "hooks install: Installer fehlt (cli/wgx/install.sh)"
      fi
      ;;
    *) die "Usage: wgx hooks install";;
  esac
}
# ────────────────────────────────────────────────────────────────────────────────
# Block 4/4: Guard / Lint / Test / Sync / Send / Heal / Clean / Config / Quick
# ────────────────────────────────────────────────────────────────────────────────

# --- fehlende Klein-Utils behutsam nachrüsten (nur falls nicht vorhanden) ------
if ! type is_termux >/dev/null 2>&1; then
  is_termux(){ case "${PREFIX-}" in */com.termux/*) return 0;; *) return 1;; esac; }
fi

# --- PM-Detect (Node) -----------------------------------------------------------
pm_detect(){
  local wd="$1"
  if [[ -n "${WGX_PM-}" ]]; then
    if has "$WGX_PM"; then echo "$WGX_PM"; return 0
    else warn "WGX_PM=$WGX_PM nicht gefunden, Auto-Detect aktiv."; fi
  fi
  if [[ -f "$wd/pnpm-lock.yaml" ]] && has pnpm; then echo "pnpm"
  elif [[ -f "$wd/package-lock.json" ]] && has npm; then echo "npm"
  elif [[ -f "$wd/yarn.lock" ]] && has yarn; then echo "yarn"
  elif [[ -f "$wd/package.json" ]]; then
    has pnpm && echo "pnpm" || has npm && echo "npm" || has yarn && echo "yarn" || echo ""
  else
    echo ""
  fi
}

git_supports_magic(){ git -C "$1" ls-files -z -- ':(exclude)node_modules/**' >/dev/null 2>&1; }

# --- Vale-Runner (optional, leise) ---------------------------------------------
vale_maybe(){
  [[ -f ".vale.ini" ]] || return 0
  has vale || { warn "Vale nicht installiert – Sprach-Checks übersprungen."; return 0; }
  local staged=0; [[ "${1-}" == "--staged" ]] && staged=1
  if (( staged )); then
    if ! git diff --cached --name-only -z -- '*.md' 2>/dev/null | { IFS= read -r -d '' _; }; then
      return 0
    fi
    git diff --cached --name-only -z -- '*.md' 2>/dev/null \
      | run_with_files_xargs0 "Vale (staged)" vale
    return $?
  else
    if [[ -z "$(git ls-files -z -- '*.md' 2>/dev/null | head -c1)" ]]; then
      return 0
    fi
    git ls-files -z -- '*.md' 2>/dev/null \
      | run_with_files_xargs0 "Vale (alle .md)" vale
    return $?
  fi
}

# --- Soft Runner (zeigt RC, bricht nicht hart) ---------------------------------
run_soft(){
  local title="$1"; shift || true
  local rc=0
  if (( DRYRUN )); then
    if [[ $# -gt 0 ]]; then
      printf "DRY: %s → %q" "$title" "$1"; shift || true
      while [[ $# -gt 0 ]]; do printf " %q" "$1"; shift || true; done
      echo
    else
      printf "DRY: %s (kein Befehl übergeben)\n" "$title"
    fi
    return 0
  fi
  info "$title"
  if "$@"; then ok "$title ✓"; rc=0; else warn "$title ✗"; rc=1; fi
  printf "%s\n" "$rc"; return 0
}

# --- Dateiänderungen (staged/working) ------------------------------------------
changed_files_cached(){ git diff --cached --name-only -z | tr '\0' '\n' | sed '/^$/d'; }
changed_files_all(){
  local rec status path
  git status --porcelain -z \
  | while IFS= read -r -d '' rec; do
      status="${rec:0:2}"
      path="${rec:3}"
      if [[ "$status" =~ ^R ]]; then IFS= read -r -d '' path || true; fi
      [[ -n "$path" ]] && printf '%s\n' "$path"
    done
}

# --- Scope-Ermittlung für Commit/Labels ----------------------------------------
auto_scope(){
  local files="$1" major="repo" m_web=0 m_api=0 m_docs=0 m_infra=0 m_devx=0 total=0
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    ((++total))
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

# --- Guard (Preflight) ----------------------------------------------------------
guard_run(){
  require_repo
  local FIX=0 LINT_OPT=0 TEST_OPT=0 DEEP_SCAN=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --fix) FIX=1;; --lint) LINT_OPT=1;; --test) TEST_OPT=1;; --deep-scan) DEEP_SCAN=1;;
    esac; shift || true
  done

  local rc=0 br; br="$(git_branch)"
  echo "=== Preflight (branch: $br, base: $WGX_BASE) ==="

  if git_in_progress; then
    echo "[BLOCKER] rebase/merge läuft → wgx heal --continue | --abort"
    rc=2
  fi
  [[ "$br" == "HEAD" ]] && { echo "[WARN] Detached HEAD – Branch anlegen."; (( rc==0 )) && rc=1; }

  local behind=0 ahead=0 IFS=' '
  read -r behind ahead < <(git_ahead_behind "$br") || true
  if (( behind>0 )); then
    echo "[WARN] Branch $behind hinter origin/$br → rebase auf origin/$WGX_BASE"
    (( FIX )) && { heal_cmd rebase || rc=2; }
    (( rc==0 )) && rc=1
  fi

  # Konfliktmarker in modifizierten Dateien
  local with_markers=""
  while IFS= read -r -d '' f; do
    [[ -z "$f" ]] && continue
    grep -Eq '<<<<<<<|=======|>>>>>>>' -- "$f" 2>/dev/null && with_markers+="$f"$'\n'
  done < <(git ls-files -m -z)
  if [[ -n "$with_markers" ]]; then
    echo "[BLOCKER] Konfliktmarker:"; printf '%s' "$with_markers" | sed 's/^/  - /'
    rc=2
  fi

  # Secret-/Größen-Checks auf staged
  local staged; staged="$(changed_files_cached || true)"
  if [[ -n "$staged" ]]; then
    local secrets
    secrets="$(printf "%s\n" "$staged" | grep -Ei '\.env(\.|$)|(^|/)(id_rsa|id_ed25519)(\.|$)|\.pem$|\.p12$|\.keystore$' || true)"
    if [[ -n "$secrets" ]]; then
      echo "[BLOCKER] mögliche Secrets im Commit (Dateinamen-Match):"
      printf "%s\n" "$secrets" | sed 's/^/  - /'
      if (( FIX )); then
        while IFS= read -r s; do [[ -n "$s" ]] && git restore --staged -- "$s" 2>/dev/null || true; done <<< "$secrets"
        echo "→ Secrets aus dem Index entfernt (Dateien bleiben lokal)."
      fi
      rc=2
    fi

    if (( DEEP_SCAN )); then
      local leaked
      leaked="$(git diff --cached -U0 \
        | grep -Ei 'BEGIN (RSA|EC|OPENSSH) PRIVATE KEY|AKIA[A-Z0-9]{16}|ghp_[A-Za-z0-9]{36}|glpat-[A-Za-z0-9_-]{20,}|AWS_ACCESS_KEY_ID|SECRET(_KEY)?|TOKEN|AUTHORIZATION:|PASSWORD' \
        || true)"
      if [[ -n "$leaked" ]]; then
        echo "[BLOCKER] möglicher Secret-Inhalt im Diff:"; echo "$leaked" | sed 's/^/  > /'
        rc=2
      fi
    fi

    # >10MB: Warnen und auflisten
    if [[ -n "$(printf "%s\n" "$staged" | while IFS= read -r f; do
                 [[ -f "$f" ]] || continue
                 if stat -c %s "$f" >/dev/null 2>&1; then sz=$(stat -c %s "$f")
                 elif stat -f%z "$f" >/dev/null 2>&1; then sz=$(stat -f%z "$f")
                 else sz=$(wc -c < "$f" 2>/dev/null || echo 0); fi
                 (( sz>10485760 )) && echo x && break
               done )" ]]; then
      echo "[WARN] >10MB im Commit:"
      printf "%s\n" "$staged" | while IFS= read -r f; do
        [[ -f "$f" ]] || continue
        if stat -c %s "$f" >/dev/null 2>&1; then sz=$(stat -c %s "$f")
        elif stat -f%z "$f" >/dev/null 2>&1; then sz=$(stat -f%z "$f")
        else sz=$(wc -c < "$f" 2>/dev/null || echo 0); fi
        (( sz>10485760 )) && printf '  - %s (%s B)\n' "$f" "$sz"
      done
      (( rc==0 )) && rc=1
    fi
  fi

  # Lockfile-Mix
  if git ls-files --error-unmatch pnpm-lock.yaml >/dev/null 2>&1 \
     && git ls-files --error-unmatch package-lock.json >/dev/null 2>&1; then
    echo "[WARN] pnpm-lock.yaml UND package-lock.json im Repo – Policy klären."
    (( rc==0 )) && rc=1
  fi

  # Vale (nur RC bewerten)
  [[ -f ".vale.ini" ]] && { vale_maybe --staged || (( rc==0 )) && rc=1; }

  case "$rc" in
    0) ok "Preflight sauber.";;
    1) warn "Preflight mit Warnungen.";;
    2) die "Preflight BLOCKER → bitte Hinweise beachten.";;
  esac
  printf "%s\n" "$rc"; return 0
}

# --- Snapshot (Stash) -----------------------------------------------------------
snapshot_make(){
  if [[ -z "$(git status --porcelain -z 2>/dev/null | head -c1)" ]]; then
    info "Kein Snapshot nötig (Arbeitsbaum sauber)."; return 0
  fi
  local msg="snapshot@$(date +%s) $(git_branch)"
  git stash push -u -m "$msg" >/dev/null 2>&1 || true
  info "Snapshot erstellt (git stash list)"
}

# --- Lint (Markdown, Prettier, ESLint, Rust, Shell, Docker, Workflows) ----------
lint_cmd(){
  require_repo
  local rc_total=0

  vale_maybe || rc_total=1

  if has markdownlint && [[ -n "$(git ls-files -z -- '*.md' 2>/dev/null | head -c1)" ]]; then
    git ls-files -z -- '*.md' 2>/dev/null \
    | run_with_files_xargs0 "markdownlint" markdownlint || rc_total=1
  fi

  # Web: Prettier & ESLint
  local wd=""
  for d in "apps/web" "web"; do [[ -d "$d" ]] && { wd="$d"; break; }; done
  if [[ -n "$wd" ]]; then
    local pm; pm="$(pm_detect "$wd")"; local prettier_cmd="" eslint_cmd=""
    case "$pm" in
      pnpm) prettier_cmd="pnpm -s exec prettier"; eslint_cmd="pnpm -s exec eslint";;
      yarn) prettier_cmd="yarn -s prettier";     eslint_cmd="yarn -s eslint";;
      npm|"") prettier_cmd="npx --yes prettier"; eslint_cmd="npx --yes eslint";;
    esac
    if (( OFFLINE )); then
      [[ "$pm" == "npm" || "$pm" == "" ]] && warn "Offline-Modus: npx nicht verfügbar → Prettier/ESLint ggf. übersprungen."
    fi

    local has_gnu_find=0
    if find --version >/dev/null 2>&1; then find --version 2>/dev/null | grep -q GNU && has_gnu_find=1; fi

    # Prettier
    if (( OFFLINE )); then
      warn "Prettier übersprungen (offline)"
    else
      if git_supports_magic "$wd" && (( has_gnu_find )); then
        git -C "$wd" ls-files -z \
          -- ':(exclude)node_modules/**' ':(exclude)dist/**' ':(exclude)build/**' \
             '*.js' '*.ts' '*.tsx' '*.jsx' '*.json' '*.css' '*.scss' '*.md' '*.svelte' 2>/dev/null \
        | run_with_files_xargs0 "Prettier Check" sh -c 'cd "$1"; shift; '"$prettier_cmd"' -c -- "$@"' _ "$wd" \
        || run_with_files_xargs0 "Prettier Check (fallback npx)" sh -c 'cd "$1"; shift; npx --yes prettier -c -- "$@"' _ "$wd" \
        || rc_total=1
      else
        find "$wd" \( -path "$wd/node_modules" -o -path "$wd/dist" -o -path "$wd/build" \) -prune -o \
             -type f \( -name '*.js' -o -name '*.ts' -o -name '*.tsx' -o -name '*.jsx' -o -name '*.json' -o -name '*.css' -o -name '*.scss' -o -name '*.md' -o -name '*.svelte' \) -print0 \
        | while IFS= read -r -d '' f; do rel="${f#$wd/}"; printf '%s\0' "$rel"; done \
        | run_with_files_xargs0 "Prettier Check" sh -c 'cd "$1"; shift; '"$prettier_cmd"' -c -- "$@"' _ "$wd" \
        || run_with_files_xargs0 "Prettier Check (fallback npx)" sh -c 'cd "$1"; shift; npx --yes prettier -c -- "$@"' _ "$wd" \
        || rc_total=1
      fi
    fi

    # ESLint (nur wenn Konfig vorhanden)
    local has_eslint_cfg=0
    [[ -f "$wd/.eslintrc" || -f "$wd/.eslintrc.js" || -f "$wd/.eslintrc.cjs" || -f "$wd/.eslintrc.json" \
       || -f "$wd/eslint.config.js" || -f "$wd/eslint.config.mjs" || -f "$wd/eslint.config.cjs" ]] && has_eslint_cfg=1
    if (( has_eslint_cfg )); then
      run_soft "ESLint" bash -c "cd '$wd' && $eslint_cmd -v >/dev/null 2>&1 && $eslint_cmd . --ext .js,.cjs,.mjs,.ts,.tsx,.svelte" \
      || { if (( OFFLINE )); then warn "ESLint übersprungen (offline)"; false; \
           else run_soft "ESLint (fallback npx)" bash -c "cd '$wd' && npx --yes eslint . --ext .js,.cjs,.mjs,.ts,.tsx,.svelte"; fi; } \
      || rc_total=1
    fi
  fi

  # Rust
  local ad=""
  for d in "apps/api" "api" "."; do
    [[ -f "$d/Cargo.toml" ]] && { ad="$d"; break; }
    [[ "$d" == "." && -d "crates" ]] && { ad="$d"; break; }
  done
  if [[ -n "$ad" ]] && has cargo; then
    run_soft "cargo fmt --check" bash -lc "cd '$ad' && cargo fmt --all -- --check" || rc_total=1
    if rustup component list 2>/dev/null | grep -q 'clippy.*(installed)'; then
      run_soft "cargo clippy (Hinweise)" bash -lc "cd '$ad' && cargo clippy --all-targets --all-features -q" || rc_total=1
    else
      warn "clippy nicht installiert – übersprungen."
    fi
  fi

  # Shell / Docker / GH Actions
  if has shellcheck; then
    if [[ -n "$(git ls-files -z -- '*.sh' 2>/dev/null | head -c1)" || -f "./wgx" || -d "./scripts" ]]; then
      { git ls-files -z -- '*.sh' 2>/dev/null; git ls-files -z -- 'wgx' 'scripts/*' 2>/dev/null; } \
      | run_with_files_xargs0 "shellcheck" shellcheck || rc_total=1
    fi
  fi
  if has hadolint && [[ -n "$(git ls-files -z -- '*Dockerfile*' 2>/dev/null | head -c1)" ]]; then
    git ls-files -z -- '*Dockerfile*' 2>/dev/null \
    | run_with_files_xargs0 "hadolint" hadolint || rc_total=1
  fi
  if has actionlint && [[ -d ".github/workflows" ]]; then run_soft "actionlint" actionlint || rc_total=1; fi

  (( rc_total==0 )) && ok "Lint OK" || warn "Lint mit Hinweisen (rc=$rc_total)."
  printf "%s\n" "$rc_total"; return 0
}

# --- Tests (parallel Web/Rust, falls vorhanden) --------------------------------
pm_test(){ local wd="$1"; local pm; pm="$(pm_detect "$wd")"; case "$pm" in
  pnpm) (cd "$wd" && pnpm -s test -s) ;; npm) (cd "$wd" && npm test -s) ;; yarn) (cd "$wd" && yarn -s test) ;; *) return 0;; esac; }

test_cmd_entry(){
  require_repo
  local rc_web=0 rc_api=0 wd ad pid_web= pid_api=
  trap '[[ -n "${pid_web-}" ]] && kill "$pid_web" 2>/dev/null || true; [[ -n "${pid_api-}" ]] && kill "$pid_api" 2>/dev/null || true' INT
  for d in "apps/web" "web"; do [[ -f "$d/package.json" ]] && { wd="$d"; break; }; done
  for d in "apps/api" "api" "."; do [[ -f "$d/Cargo.toml" ]] && { ad="$d"; break; }; done
  if [[ -n "$wd" ]]; then info "Web-Tests…"; ( pm_test "$wd" ) & pid_web=$!; fi
  if [[ -n "$ad" && -n "$(command -v cargo)" ]]; then info "Rust-Tests…"; ( cd "$ad" && cargo test --all --quiet ) & pid_api=$!; fi
  [[ -n "${pid_web-}" ]] && wait "$pid_web" || rc_web=$?
  [[ -n "${pid_api-}" ]] && wait "$pid_api" || rc_api=$?
  (( rc_web==0 && rc_api==0 )) && ok "Tests OK" || { [[ $rc_web -ne 0 ]] && warn "Web-Tests fehlgeschlagen."; [[ $rc_api -ne 0 ]] && warn "Rust-Tests fehlgeschlagen."; return 1; }
}

# --- Commit/Sync/Push ----------------------------------------------------------
maybe_sign_flag(){
  case "${WGX_SIGNING:-auto}" in
    off) return 1;;
    ssh|gpg) echo "-S"; return 0;;
    auto|*) git config --get user.signingkey >/dev/null 2>&1 && echo "-S" && return 0 || return 1;;
  esac
}

sync_cmd(){
  require_repo
  local STAGED_ONLY=0 WIP=0 AMEND=0 SCOPE="auto" BASE="" signflag="" had_upstream=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --staged-only) STAGED_ONLY=1;;
      --wip) WIP=1;;
      --amend) AMEND=1;;
      --scope) shift; SCOPE="${1-}";;
      --base) shift; BASE="${1-}";;
      --sign) signflag="-S";;
      *) warn "Unbekannte Sync-Option: $1";;
    esac; shift || true
  done
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
    local sf="${signflag:-$(maybe_sign_flag || true)}"
    if [[ -n "${sf-}" ]]; then git commit ${AMEND:+--amend} "$sf" -m "$msg" || die "Commit/Sign fehlgeschlagen."
    else git commit ${AMEND:+--amend} -m "$msg" || die "Commit fehlgeschlagen."; fi
  else info "Nichts zu committen."; fi

  (( OFFLINE )) || git fetch -q origin 2>/dev/null || true
  git rev-parse --verify -q "origin/$WGX_BASE" >/dev/null || die "Basisbranch origin/$WGX_BASE nicht gefunden (git fetch?)."
  git rebase "origin/$WGX_BASE" || { warn "Rebase-Konflikt → wgx heal rebase"; return 2; }

  if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then had_upstream=1; else had_upstream=0; fi
  if (( had_upstream )); then git push || die "Push fehlgeschlagen."
  else git push --set-upstream origin "$(git_branch)" || die "Push/Upstream fehlgeschlagen."; fi

  ok "Sync erledigt."
  local behind=0 ahead=0 IFS=' '
  read -r behind ahead < <(git_ahead_behind "$(git_branch)") || true
  info "Upstream: ahead=$ahead behind=$behind"
}

# --- PR/MR Senden --------------------------------------------------------------
derive_labels(){
  local branch scope="$1"; branch="$(git_branch)"; local pref="${branch%%/*}"; local L=()
  case "$pref" in
    feat) L+=("feature");; fix|hotfix) L+=("bug");; docs) L+=("docs");; refactor) L+=("refactor");;
    test|tests) L+=("test");; ci) L+=("ci");; perf) L+=("performance");; chore) L+=("chore");; build) L+=("build");;
  end esac 2>/dev/null || true
  local subj; subj="$(git log -1 --pretty=%s 2>/dev/null || true)"
  case "$subj" in
    feat:*) L+=("feature");; fix:*) L+=("bug");; docs:*) L+=("docs");; refactor:*) L+=("refactor");;
    test:*) L+=("test");; ci:*) L+=("ci");; perf:*) L+=("performance");; chore:*) L+=("chore");; build:*) L+=("build");; style:*) L+=("style");;
  esac
  [[ -n "$scope" ]] && L+=("scope:$scope")
  local IFS=,; printf '%s\n' "$(printf '%s,' "${L[@]}" | sed 's/,$//')"
}

render_pr_body(){
  local TITLE="$1" SUMMARY="$2" WHY="$3" TESTS="$4" ISSUES="$5" NOTES="$6"
  local tpl=""
  if [[ -f ".wgx/pr_template.md" ]]; then tpl="$(cat .wgx/pr_template.md)"
  elif [[ -f ".github/pull_request_template.md" ]]; then tpl="$(cat .github/pull_request_template.md)"
  else tpl=$'*Zweck*\n{{SUMMARY}}\n\n*Änderungen*\n{{CHANGES}}\n\n*Warum*\n{{WHY}}\n\n*Tests*\n{{TESTS}}\n\n*Issues*\n{{ISSUES}}\n\n*Notizen*\n{{NOTES}}\n'; fi
  local CHANGES=""
  if git rev-parse --verify -q "origin/$WGX_BASE" >/dev/null; then
    CHANGES="$(git diff --name-status "origin/$WGX_BASE"...HEAD | head -n "${WGX_PREVIEW_DIFF_LINES:-120}")"
  fi
  tpl="${tpl//'{{SUMMARY}}'/$SUMMARY}"
  tpl="${tpl//'{{CHANGES}}'/$CHANGES}"
  tpl="${tpl//'{{WHY}}'/$WHY}"
  tpl="${tpl//'{{TESTS}}'/$TESTS}"
  tpl="${tpl//'{{ISSUES}}'/$ISSUES}"
  tpl="${tpl//'{{NOTES}}'/$NOTES}"
  printf "%s" "$tpl"
}

host_kind(){
  local u; u="$(git remote get-url origin 2>/dev/null || true)"; [[ -z "$u" ]] && { echo ""; return; }
  case "$u" in
    git@github.com:*|https://github.com/*) echo "github";;
    git@gitlab.com:*|https://gitlab.com/*) echo "gitlab";;
    *) echo "";;
  esac
}

send_cmd(){
  require_repo
  local DRAFT=0 TITLE="" WHY="" TESTS="" NOTES="" SCOPE="auto" LABELS="$WGX_PR_LABELS" ISSUE="" BASE="" SYNC_FIRST=1 SIGN=0 INTERACTIVE=0 REVIEWERS="" TRIGGER_CI=0 OPEN_PR=0 AUTO_BRANCH=0
  while [[ $# -gt 0 ]]; do case "$1" in
    --draft) DRAFT=1;;
    -i|--interactive) INTERACTIVE=1;;
    --title) shift; TITLE="${1-}";;
    --why) shift; WHY="${1-}";;
    --tests) shift; TESTS="${1-}";;
    --notes) shift; NOTES="${1-}";;
    --label) shift; LABELS="${LABELS:+$LABELS,}${1-}";;
    --issue|--issues) shift; ISSUE="${1-}";;
    --reviewers) shift; REVIEWERS="${1-}";;
    --scope) shift; SCOPE="${1-}";;
    --no-sync-first) SYNC_FIRST=0;;
    --sign) SIGN=1;;
    --base) shift; BASE="${1-}";;
    --ci) TRIGGER_CI=1;;
    --open) OPEN_PR=1;;
    --auto-branch) AUTO_BRANCH=1;;
    *) warn "unbekannte Option: $1";;
  esac; shift || true; done
  [[ -n "$BASE" ]] && WGX_BASE="$BASE"

  local current; current="$(git_branch)"
  local AUTO_BRANCH_FLAG=$AUTO_BRANCH
  if [[ -z "${AUTO_BRANCH-}" && -n "${WGX_AUTO_BRANCH-}" ]]; then AUTO_BRANCH_FLAG=$WGX_AUTO_BRANCH; fi
  if [[ "$current" == "$WGX_BASE" ]]; then
    if (( AUTO_BRANCH_FLAG )); then
      local slug="auto-pr-$(date +%Y%m%d-%H%M%S)"
      info "Base-Branch ($WGX_BASE) erkannt → auto Branch: $slug"
      start_cmd "$slug" || die "auto-branch fehlgeschlagen"
    else
      die "send: Du stehst auf Base ($WGX_BASE). Erst \"wgx start <slug>\" – oder nutze \"wgx send --auto-branch\" / setze WGX_AUTO_BRANCH=1."
    fi
  fi

  (( OFFLINE )) || git fetch -q origin "$WGX_BASE" >/dev/null 2>&1 || true
  if git rev-parse --verify -q "origin/$WGX_BASE" >/dev/null; then
    if git diff --quiet "origin/$WGX_BASE"...HEAD; then
      die "send: Kein Diff zu origin/$WGX_BASE → Nichts zu senden (committen oder \"wgx sync\")."
    fi
  fi

  guard_run; local rc=$?
  (( rc==1 && (ASSUME_YES || ${WGX_DRAFT_ON_WARN:-0})) ) && DRAFT=1

  if (( SYNC_FIRST )); then
    sync_cmd ${SIGN:+--sign} --scope "${SCOPE}" --base "$WGX_BASE" || { warn "Sync fehlgeschlagen → PR abgebrochen."; return 1; }
  fi

  local files scope short; files="$(git diff --name-only "origin/$WGX_BASE"...HEAD 2>/dev/null || true)"
  scope="$([[ "$SCOPE" == "auto" ]] && auto_scope "$files" || echo "$SCOPE")"
  local last_subject; last_subject="$(git log -1 --pretty=%s 2>/dev/null || true)"
  short="${TITLE:-${last_subject:-"Änderungen an ${scope}"}}"
  local TITLE2="[${scope}] ${short}"

  local body; body="$(render_pr_body "$TITLE2" "$short" "${WHY:-"—"}" "${TESTS:-"—"}" "${ISSUE:-""}" "${NOTES:-""}")"
  if (( INTERACTIVE )); then
    local tmpf; tmpf="$(mktemp -t wgx-pr.XXXXXX 2>/dev/null || mktemp_portable wgx-pr)"
    printf "%s" "$body" > "$tmpf"
    bash -lc "${WGX_EDITOR:-${EDITOR:-nano}} $(printf '%q' "$tmpf")"
    body="$(cat "$tmpf")"
    rm -f "$tmpf"
  fi
  [[ -z "$(printf '%s' "$body" | tr -d '[:space:]')" ]] && die "PR-Body ist leer – abgebrochen."

  local autoL; autoL="$(derive_labels "$scope")"
  [[ -n "$autoL" ]] && LABELS="${LABELS:+$LABELS,}$autoL"
  # Labels entdoppeln
  LABELS="$(echo "$LABELS" | awk -v RS=, -v ORS=, '!a[$0]++' | sed 's/,$//')"

  case "$(host_kind)" in
    gitlab)
      if has glab; then
        glab auth status >/dev/null 2>&1 || warn "glab nicht eingeloggt (glab auth login) – MR könnte scheitern."
        local args=(mr create --title "$TITLE2" --description "$body" --source-branch "$(git_branch)" --target-branch "$WGX_BASE")
        (( DRAFT )) && args+=(--draft)
        [[ -n "$ISSUE" ]] && args+=(--issue "$ISSUE")
        if [[ -n "$LABELS" ]]; then IFS=, read -r -a _labels <<<"$LABELS"; for _l in "${_labels[@]}"; do _l="$(echo "$_l" | xargs)"; [[ -n "$_l" ]] && args+=(--label "$_l"); done; fi
        if [[ "$REVIEWERS" == "auto" ]]; then
          warn "CODEOWNERS-Autoreviewer für GitLab optional – hier weggelassen."
        elif [[ -n "$REVIEWERS" ]]; then IFS=, read -r -a rv <<<"$REVIEWERS"; for r in "${rv[@]}"; do r="$(echo "$r" | xargs)"; [[ -n "$r" ]] && args+=(--reviewer "$r"); done; fi
        glab "${args[@]}" || die "glab mr create fehlgeschlagen."
        ok "Merge Request erstellt."
        (( OPEN_PR )) && glab mr view --web >/dev/null 2>&1 || true
      else
        warn "glab CLI nicht gefunden. MR manuell im GitLab anlegen."; echo "Vergleich: $(compare_url)"
      fi
      ;;
    github|*)
      if has gh; then
        gh auth status >/dev/null 2>&1 || warn "gh nicht eingeloggt (gh auth login) – PR könnte scheitern."
        local args=(pr create --title "$TITLE2" --body "$body" --base "$WGX_BASE")
        (( DRAFT )) && args+=(--draft)
        if [[ -n "$LABELS" ]]; then IFS=, read -r -a L <<<"$LABELS"; for l in "${L[@]}"; do l="$(echo "$l" | xargs)"; [[ -n "$l" ]] && args+=(--label "$l"); done; fi
        [[ -n "$ISSUE" ]] && args+=(--issue "$ISSUE")
        if [[ -n "$REVIEWERS" ]]; then IFS=, read -r -a rvw2 <<<"$REVIEWERS"; for r2 in "${rvw2[@]}"; do r2="$(echo "$r2" | xargs)"; [[ -n "$r2" ]] && args+=(--reviewer "$r2"); done; fi
        gh "${args[@]}" || die "gh pr create fehlgeschlagen."
        local pr_url; pr_url="$(gh pr view --json url -q .url 2>/dev/null || true)"
        [[ -n "$pr_url" ]] && info "PR: $pr_url"
        ok "PR erstellt."
        (( TRIGGER_CI )) && gh workflow run "${WGX_CI_WORKFLOW:-CI}" >/dev/null 2>&1 || true
        (( OPEN_PR )) && gh pr view -w >/dev/null 2>&1 || true
      else
        local url; url="$(compare_url)"
        echo "gh CLI nicht gefunden. PR manuell anlegen:"; echo "URL: $url"; echo "Labels: $LABELS"; echo "--- PR Text ---"; echo "$body"
      fi
      ;;
  esac
}

# --- Heal (Rebase/Merge Hilfen) ------------------------------------------------
heal_cmd(){
  require_repo
  local MODE="${1-}"; shift || true
  local STASH=0 CONT=0 ABORT=0 BASE=""
  while [[ $# -gt 0 ]]; do
    case "$1" in --stash) STASH=1;; --continue) CONT=1;; --abort) ABORT=1;; --base) shift; BASE="${1-}";; esac; shift || true
  done
  [[ -n "$BASE" ]] && WGX_BASE="$BASE"
  (( ABORT )) && { git rebase --abort 2>/dev/null || git merge --abort 2>/dev/null || true; ok "Abgebrochen."; return 0; }
  (( CONT )) && { git add -A; git rebase --continue || die "continue fehlgeschlagen."; ok "Rebase fortgesetzt."; return 0; }
  (( STASH )) && snapshot_make
  (( OFFLINE )) || git fetch -q origin 2>/dev/null || true
  case "$MODE" in
    ""|rebase) git rev-parse --verify -q "origin/$WGX_BASE" >/dev/null || die "Basisbranch origin/$WGX_BASE nicht gefunden."; git rebase "origin/$WGX_BASE" || { warn "Konflikte. Löse sie, dann: wgx heal --continue | --abort"; return 2; } ;;
    ours)      git merge -X ours   "origin/$WGX_BASE" || { warn "Konflikte. manuell lösen + commit"; return 2; } ;;
    theirs)    git merge -X theirs "origin/$WGX_BASE" || { warn "Konflikte. manuell lösen + commit"; return 2; } ;;
    ff-only)   git merge --ff-only "origin/$WGX_BASE" || { warn "Fast-Forward nicht möglich."; return 2; } ;;
    *) die "Unbekannter heal-Modus: $MODE";;
  esac
  ok "Heal erfolgreich."
}

# --- Clean (Artefakte, Branch-Hygiene) -----------------------------------------
clean_cmd(){
  require_repo
  local SAFE=1 BUILD=0 GIT=0 DEEP=0
  while [[ $# -gt 0 ]]; do case "$1" in --safe) SAFE=1;; --build) BUILD=1;; --git) GIT=1;; --deep) DEEP=1;; *) warn "unbekannte Option: $1";; esac; shift; done
  (( SAFE || BUILD || GIT || DEEP )) || SAFE=1

  do_rm(){ if (( DRYRUN )); then printf 'DRY: rm -rf -- %q\n' "$@"; else rm -rf "$@"; fi }
  do_git(){ if (( DRYRUN )); then printf 'DRY: git %s\n' "$*"; else git "$@"; fi }

  if (( SAFE || BUILD )); then
    do_rm ./coverage ./dist ./node_modules/.cache ./target
    if (( DRYRUN )); then
      echo "DRY: find \"${TMPDIR:-/tmp}\" -maxdepth 1 -type f -name 'wgx-*.log' -mtime +1 -exec rm -f {} +"
    else
      find "${TMPDIR:-/tmp}" -maxdepth 1 -type f -name 'wgx-*.log' -mtime +1 -exec rm -f {} +
    fi
  fi

  if (( GIT )); then
    if (( DRYRUN )); then
      git branch --merged | grep -Ev '^\*|[[:space:]](main|master|dev)$' | sed 's/^[*[:space:]]*//' \
      | while IFS= read -r b; do [[ -n "$b" ]] && printf 'DRY: git branch -d -- %q\n' "$b"; done
    else
      git branch --merged | grep -Ev '^\*|[[:space:]](main|master|dev)$' | sed 's/^[*[:space:]]*//' \
      | while IFS= read -r b; do [[ -n "$b" ]] && git branch -d "$b" 2>/dev/null || true; done
    fi
    do_git remote prune origin >/dev/null 2>&1 || true
  fi

  (( DEEP )) && do_git clean -xfd
  ok "Clean $( ((DRYRUN)) && echo '(Preview) ' )fertig."
}

# --- Config (anzeigen/setzen) ---------------------------------------------------
config_cmd(){
  local sub="${1-}"; shift || true
  case "$sub" in
    show|"")
      echo "=== wgx config (effektiv) ==="
      echo "WGX_BASE=$WGX_BASE"
      echo "WGX_SIGNING=$WGX_SIGNING"
      echo "WGX_PREVIEW_DIFF_LINES=$WGX_PREVIEW_DIFF_LINES"
      echo "WGX_PR_LABELS=$WGX_PR_LABELS"
      echo "WGX_CI_WORKFLOW=$WGX_CI_WORKFLOW"
      echo "WGX_ASSUME_YES=$ASSUME_YES"
      echo "WGX_DRAFT_ON_WARN=${WGX_DRAFT_ON_WARN:-0}"
      echo "WGX_OFFLINE=$OFFLINE"
      echo "WGX_PM=${WGX_PM-}"
      ;;
    set)
      local kv="${1-}"
      [[ -z "$kv" || "$kv" != *=* ]] && die "Usage: wgx config set KEY=VALUE"
      local k="${kv%%=*}" v="${kv#*=}"
      [[ -f ".wgx.conf" ]] || touch ".wgx.conf"
      local k_re; k_re="$(printf '%s' "$k" | sed 's/[][().^$*+?{}|\\]/\\&/g')"
      local v_esc="${v//&/\\&}"; v_esc="${v_esc//\//\\/}"
      if grep -q -E "^${k_re}=" ".wgx.conf"; then
        sed -i.bak "s|^${k_re}=.*|${k}=${v_esc}|" ".wgx.conf" && rm -f ".wgx.conf.bak"
      else
        printf "%s=%s\n" "$k" "$v" >> ".wgx.conf"
      fi
      ok "gesetzt: ${k}=${v}"
      ;;
    *) die "Usage: wgx config [show] | set KEY=VALUE";;
  esac
}

# --- Quick: Guard → Lint/Test → Sync → PR/MR → CI/Browser ----------------------
quick_cmd(){
  require_repo
  local INTERACTIVE=0
  [[ "${1-}" == "-i" || "${1-}" == "--interactive" ]] && INTERACTIVE=1
  echo "=== wgx quick ==="
  local rc=0
  guard_run --lint --test || rc=$?
  local draft=(); (( rc==1 )) && draft+=(--draft)
  if (( INTERACTIVE )); then
    send_cmd "${draft[@]}" --ci --open -i
  else
    send_cmd "${draft[@]}" --ci --open
  fi
}