#!/usr/bin/env bash
# wgx – Weltgewebe CLI · Termux/WSL/macOS/Linux · origin-first
# Version: v2.0.2
# Lizenz: MIT (projektintern); Autorenteam: weltweberei.org
#
# RC-Codes:
#   0 = OK, 1 = WARN (fortsetzbar), 2 = BLOCKER (Abbruch)
#
# OFFLINE:  deaktiviert Netzwerkaktionen bestmöglich (fetch, npx pulls etc.)
# DRYRUN :  zeigt Kommandos an, führt sie aber nicht aus (wo sinnvoll)

# ─────────────────────────────────────────────────────────────────────────────
#  Block 1 — Bootstrap, Safety, Globals, Repo-Kontext, Status
# ─────────────────────────────────────────────────────────────────────────────

# SAFETY / SHELL MODE
set -Eeuo pipefail
IFS=$'\n\t'
umask 077
shopt -s extglob nullglob
set -o noclobber   # optionaler Schreibschutz gegen versehentliches '>'

# stabile Locale für Parser/Sort/Grep; versuche UTF-8, sonst C
if locale -a 2>/dev/null | grep -qi '^C\.utf-8$'; then
  export LC_ALL=C.UTF-8 LANG=C.UTF-8
else
  export LC_ALL=C LANG=C
fi

WGX_VERSION="2.0.2"
RC_OK=0; RC_WARN=1; RC_BLOCK=2

# Fehlerfalle: zeigt Funktionsname/Zeile/Befehl
trap 'ec=$?; cmd=$BASH_COMMAND; line=${BASH_LINENO[0]}; fn=${FUNCNAME[1]:-MAIN}; \
      ((ec)) && printf "❌ wgx: Fehler in %s (Zeile %s): %s (exit=%s)\n" \
      "$fn" "$line" "$cmd" "$ec" >&2' ERR

# Früh-Exit für Versionsabfrage (auch ohne Git-Repo nutzbar)
if [[ "${1-}" == "--version" || "${1-}" == "-V" ]]; then
  printf "wgx v%s\n" "$WGX_VERSION"
  exit 0
fi

# ─────────────────────────────────────────────────────────────────────────────
# LOG / UI HELPERS
# ─────────────────────────────────────────────────────────────────────────────
_ok()    { printf "✅ %s\n" "$*"; }
_warn()  { printf "⚠️  %s\n" "$*" >&2; }
_err()   { printf "❌ %s\n" "$*" >&2; }
info()   { printf "• %s\n"  "$*"; }
ok()     { _ok "$@"; }
warn()   { _warn "$@"; }
# printf-Variante für formatierte Strings (z. B. "%s")
warnf()  { local fmt="$1"; shift || true; printf "⚠️  $fmt\n" "$@" >&2; }
die()    { _err "$*"; exit 1; }
logv()   { ((VERBOSE)) && printf "… %s\n" "$*"; }
has()    { command -v "$1" >/dev/null 2>&1; }

trim()     { local s="$*"; s="${s#"${s%%[![:space:]]*}"}"; printf "%s" "${s%"${s##*[![:space:]]}"}"; }
to_lower() { tr '[:upper:]' '[:lower:]'; }

# Prompt liest vorzugsweise aus TTY (robust in Pipes/CI)
read_prompt(){ # read_prompt var "Frage?" "default"
  local __v="$1"; shift
  local q="${1-}"; shift || true
  local d="${1-}"
  local ans
  if [[ -t 0 && -r /dev/tty ]]; then
    printf "%s " "$q"
    IFS= read -r ans < /dev/tty || ans="$d"
  else
    ans="$d"
  fi
  [[ -z "$ans" ]] && ans="$d"
  printf -v "$__v" "%s" "$ans"
}

# ─────────────────────────────────────────────────────────────────────────────
# GLOBAL DEFAULTS
# ─────────────────────────────────────────────────────────────────────────────
: "${ASSUME_YES:=0}"
: "${DRYRUN:=0}"
: "${TIMEOUT:=0}"      # 0 = kein Timeout
: "${NOTIMEOUT:=0}"    # 1 = Timeout unterdrücken
: "${VERBOSE:=0}"
: "${OFFLINE:=0}"

: "${WGX_BASE:=main}"
: "${WGX_SIGNING:=auto}"          # auto|ssh|gpg|off
: "${WGX_PREVIEW_DIFF_LINES:=120}"
: "${WGX_PR_LABELS:=}"
: "${WGX_CI_WORKFLOW:=CI}"
: "${WGX_AUTO_BRANCH:=0}"
: "${WGX_PM:=}"                   # pnpm|npm|yarn (leer = auto)

# ─────────────────────────────────────────────────────────────────────────────
# PLATFORM / ENV
# ─────────────────────────────────────────────────────────────────────────────
PLATFORM="linux"
case "$(uname -s 2>/dev/null || echo x)" in
  Darwin) PLATFORM="darwin" ;;
  *)      PLATFORM="linux"  ;;
esac
is_wsl(){ uname -r 2>/dev/null | grep -qiE 'microsoft|wsl2?'; }
is_termux(){
  [[ "${PREFIX-}" == *"/com.termux/"* ]] && return 0
  command -v termux-setup-storage >/dev/null 2>&1 && return 0
  return 1
}
is_codespace(){ [[ -n "${CODESPACE_NAME-}" ]]; }

# ─────────────────────────────────────────────────────────────────────────────
# REPO KONTEXT & ROOT
# ─────────────────────────────────────────────────────────────────────────────
is_git_repo(){ git rev-parse --is-inside-work-tree >/dev/null 2>&1; }
require_repo(){ is_git_repo || die "Nicht im Git-Repo (wgx benötigt ein Git-Repository)."; }

# Portables readlink -f (macOS-kompatibel)
_root_resolve(){
  local here="$1"
  if command -v greadlink >/dev/null 2>&1; then greadlink -f "$here"
  elif command -v readlink >/dev/null 2>&1 && readlink -f / >/dev/null 2>&1; then readlink -f "$here"
  else
    local target="$here" link base
    while link="$(readlink "$target" 2>/dev/null)"; do
      case "$link" in
        /*) target="$link" ;;
        *)  base="$(cd "$(dirname "$target")" && pwd -P)"; target="$base/$link" ;;
      esac
    done
    printf "%s" "$target"
  fi
}

ROOT(){
  local here; here="$(_root_resolve "${BASH_SOURCE[0]}")"
  local fallback; fallback="$(cd "$(dirname "$here")/.." && pwd -P)"
  local r; r="$(git -C "${PWD}" rev-parse --show-toplevel 2>/dev/null || true)"
  [[ -n "$r" ]] && printf "%s" "$r" || printf "%s" "$fallback"
}

# Repo-Root heuristisch (wgx liegt i.d.R. als cli/wgx/wgx)
if r="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  ROOT_DIR="$r"
else
  here="${BASH_SOURCE[0]}"
  base="$(cd "$(dirname "$here")" && pwd -P)"
  if [[ "$(basename "$base")" == "wgx" && "$(basename "$(dirname "$base")")" == "cli" ]]; then
    ROOT_DIR="$(cd "$base/../.." && pwd -P)"
  else
    ROOT_DIR="$(cd "$base/.." && pwd -P)"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG (.wgx.conf) EINLESEN – eval-frei & strikt
# ─────────────────────────────────────────────────────────────────────────────
# Erlaubte Schlüssel: nur A–Z, 0–9 und _
# Werte: CR abschneiden, keine Command-Substitution/Backticks/Nullbytes
if [[ -f "$ROOT_DIR/.wgx.conf" ]]; then
  while IFS='=' read -r k v; do
    k="$(trim "$k")"
    [[ -z "$k" || "$k" =~ ^# ]] && continue
    if [[ "$k" =~ ^[A-Z0-9_]+$ ]]; then
      v="${v%$'\r'}"
      if [[ "$v" == *'$('* || "$v" == *'`'* || "$v" == *$'\0'* ]]; then
        warn ".wgx.conf: unsicherer Wert für $k ignoriert"
        continue
      fi
      printf -v _sanitized "%s" "$v"
      declare -x "$k=$_sanitized"
    else
      warn ".wgx.conf: ungültiger Schlüssel '$k' ignoriert"
    fi
  done < "$ROOT_DIR/.wgx.conf"
fi

# ─────────────────────────────────────────────────────────────────────────────
# KLEINE PORTABILITÄTS-HELFER
# ─────────────────────────────────────────────────────────────────────────────
file_size_bytes(){ # Linux/macOS/Busybox
  local f="$1" sz=0
  if   stat -c %s "$f" >/dev/null 2>&1; then sz=$(stat -c %s "$f")
  elif stat -f%z "$f" >/dev/null 2>&1;      then sz=$(stat -f%z "$f")
  else sz=$(wc -c < "$f" 2>/dev/null || echo 0); fi
  printf "%s" "$sz"
}

git_supports_magic(){ git -C "$1" ls-files -z -- ':(exclude)node_modules/**' >/dev/null 2>&1; }

mktemp_portable(){ local p="${1:-wgx}"; local f="${TMPDIR:-/tmp}/${p}.$(date +%s).$$"; : > "$f" && printf "%s" "$f"; }
now_ts(){ date +"%Y-%m-%d %H:%M"; }

# Optionaler Timeout-Wrapper – ohne exec (keine Shell-Ersetzung)
with_timeout(){
  local t="${TIMEOUT:-0}"
  (( NOTIMEOUT )) && { "$@"; return $?; }
  if (( t>0 )) && command -v timeout >/dev/null 2>&1; then
    timeout "$t" "$@"
  else
    "$@"
  fi
}

# Validierung & Flag-Ermittlung für Commit-Signing
maybe_sign_flag(){
  case "${WGX_SIGNING}" in
    off)  return 1 ;;
    ssh)  has git && git config --get gpg.format 2>/dev/null | grep -qi 'ssh' && echo "-S" || return 1 ;;
    gpg)  has gpg && echo "-S" || return 1 ;;
    auto) git config --get user.signingkey >/dev/null 2>&1 && echo "-S" || return 1 ;;
    *)    return 1 ;;
  esac
}

# ─────────────────────────────────────────────────────────────────────────────
# GIT HELPERS
# ─────────────────────────────────────────────────────────────────────────────
git_branch(){ git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "HEAD"; }
git_in_progress(){
  local g="${GIT_DIR:-$(git rev-parse --git-dir 2>/dev/null || true)}"
  [[ -n "$g" ]] || return 1
  [[ -e "$g/MERGE_HEAD" ]] && return 0
  [[ -e "$g/REBASE_HEAD" ]] && return 0
  [[ -d "$g/rebase-apply" || -d "$g/rebase-merge" ]] && return 0
  [[ -e "$g/CHERRY_PICK_HEAD" ]] && return 0
  [[ -e "$g/BISECT_LOG" ]] && return 0
  return 1
}

# OFFLINE-freundlich, mit sichtbarer Warnung bei Fehler
_fetch_guard(){
  ((OFFLINE)) && { logv "offline: skip fetch"; return 0; }
  if ! git fetch -q origin 2>/dev/null; then
    warn "git fetch origin fehlgeschlagen (Netz/Origin?)."
    return 1
  fi
}

remote_host_path(){
  local u; u="$(git remote get-url origin 2>/dev/null || true)"
  [[ -z "$u" ]] && { echo ""; return; }
  case "$u" in
    http*://*/*) echo "${u#*://}" ;;
    git@*:*/*)   echo "${u#git@}" | sed 's/:/ /; s/  */ /g' | awk '{print $1" "$2}' ;;
    *)           echo "$u" ;;
  esac
}
host_kind(){
  local hp; hp="$(remote_host_path || true)"; [[ -z "$hp" ]] && { echo ""; return 0; }
  local host="${hp%% *}"
  case "$host" in
    github.com) echo "github" ;;
    gitlab.com) echo "gitlab" ;;
    *)          echo "" ;;
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

git_ahead_behind(){
  local b="${1:-$(git_branch)}"
  ((OFFLINE)) || git fetch -q origin "$b" 2>/dev/null || true
  local ab; ab="$(git rev-list --left-right --count "origin/$b...$b" 2>/dev/null || echo "0 0")"
  local behind=0 ahead=0 IFS=' '
  read -r behind ahead <<<"$ab" || true
  printf "%s %s\n" "${behind:-0}" "${ahead:-0}"
}
ab_read(){ local ref="$1" ab; ab="$(git_ahead_behind "$ref" 2>/dev/null || echo "0 0")"; set -- $ab; echo "${1:-0} ${2:-0}"; }

detect_web_dir(){ for d in apps/web web; do [[ -d "$d" ]] && { echo "$d"; return; }; done; echo ""; }
detect_api_dir(){
  for d in apps/api api; do
    [[ -f "$d/Cargo.toml" ]] && { echo "$d"; return; }
  done
  if compgen -G "crates/*/Cargo.toml" >/dev/null 2>&1; then
    echo "crates"; return
  fi
  echo ""
}

run_with_files_xargs0(){
  local title="$1"; shift
  if [[ -t 1 ]]; then info "$title"; fi
  if command -v xargs >/dev/null 2>&1; then
    xargs -0 "$@" || return $?
  else
    local buf=() f
    while IFS= read -r -d '' f; do buf+=("$f"); done
    (("$#">0)) && "$@" "${buf[@]}"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# GLOBAL FLAG PARSER (bis SUB-Kommando)
# ─────────────────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes) ASSUME_YES=1 ;;
    --dry-run) DRYRUN=1 ;;
    --timeout) shift; [[ "${1-}" =~ ^[0-9]+$ ]] || die "--timeout braucht Zahl"; TIMEOUT="$1" ;;
    --no-timeout) NOTIMEOUT=1 ;;
    --verbose) VERBOSE=1 ;;
    --base) shift; WGX_BASE="${1-}" ;;
    --offline) OFFLINE=1 ;;
    --no-color) : ;; # Emojis statt ANSI → no-op
    # Subcommands (hier stoppen)
    send|sync|guard|heal|reload|clean|doctor|init|setup|lint|start|release|hooks|version|env|quick|config|test|help|-h|--help|status)
      break ;;
    *) warn "Unbekanntes globales Argument ignoriert: $1" ;;
  esac
  shift || true
done
SUB="${1-}"; shift || true

# ─────────────────────────────────────────────────────────────────────────────
# STATUS (kompakt)
# ─────────────────────────────────────────────────────────────────────────────
status_cmd(){
  if ! is_git_repo; then
    echo "=== wgx status ==="
    echo "root : $ROOT_DIR"
    echo "repo : (kein Git-Repo)"
    ok "Status OK"
    return $RC_OK
  fi
  local br web api behind=0 ahead=0
  br="$(git_branch)"; web="$(detect_web_dir || true)"; api="$(detect_api_dir || true)"
  local IFS=' '; read -r behind ahead < <(git_ahead_behind "$br") || true
  echo "=== wgx status ==="
  echo "root : $ROOT_DIR"
  echo "branch: $br (ahead:$ahead behind:$behind)  base:$WGX_BASE"
  echo "web  : ${web:-nicht gefunden}"
  echo "api  : ${api:-nicht gefunden}"
  (( OFFLINE )) && echo "mode : offline"
  ok "Status OK"
  return $RC_OK
}
# ─────────────────────────────────────────────────────────────────────────────
# Block 3/3 – High-level Commands, Env, Router
#
# Bash-Voraussetzung: via /usr/bin/env bash
# Abhängigkeiten (in Block 1/2 definiert):
#   die ok warn info has is_git_repo require_repo read_prompt to_lower
#   detect_web_dir detect_api_dir git_branch git_ahead_behind host_kind
#   mktemp_portable guard_run send_cmd sync_cmd heal_cmd reload_cmd
#   clean_cmd lint_cmd test_cmd status_cmd is_codespace
#
# WGX_* Variablen (typisch aus Init/Block 1):
#   WGX_BASE WGX_SIGNING WGX_PREVIEW_DIFF_LINES WGX_PR_LABELS WGX_CI_WORKFLOW
#   WGX_ASSUME_YES WGX_DRAFT_ON_WARN WGX_OFFLINE (alias: OFFLINE) WGX_PM
#   PLATFORM
# ─────────────────────────────────────────────────────────────────────────────

doctor_cmd(){
  local in_repo=1; is_git_repo || in_repo=0
  local sub="${1-}"; [[ $# -gt 0 ]] && shift
  case "$sub" in
    clean)
      ((in_repo)) || die "Nicht im Git-Repo."
      DRYRUN=1; clean_cmd --safe --build --git
      local a=""; read_prompt a "Scharf ausführen? [y/N]" "n"
      [[ "$(to_lower "$a")" == "y" ]] && { DRYRUN=0; clean_cmd --safe --build --git; }
      return 0 ;;
    heal)
      ((in_repo)) || die "Nicht im Git-Repo."
      heal_cmd rebase; return $? ;;
  esac

  local br="" web="" api="" ahead=0 behind=0
  if ((in_repo)); then
    br="$(git_branch)"
    web="$(detect_web_dir || true)"
    api="$(detect_api_dir || true)"
    local _ab
    if ! _ab="$(git_ahead_behind "$br" 2>&1)"; then
      warn "git_ahead_behind fehlgeschlagen: $_ab"
      behind=0; ahead=0
    else
      read -r behind ahead <<<"$_ab"
      [[ "$behind" =~ ^[0-9]+$ ]] || behind=0
      [[ "$ahead"  =~ ^[0-9]+$ ]] || ahead=0
    fi
  fi

  echo "=== wgx doctor ==="
  echo "root : $ROOT_DIR"
  if ((in_repo)); then
    echo "branch: $br (ahead:$ahead behind:$behind), base:$WGX_BASE"
    echo "web  : ${web:-nicht gefunden}"
    echo "api  : ${api:-nicht gefunden}"
  else
    echo "branch: (kein Repo)"
  fi
  echo "vale : $([[ -f ".vale.ini" ]] && echo present || echo missing)"
  echo "gh   : $(gh --version 2>/dev/null | head -n1 || echo missing)"
  echo "glab : $(glab --version 2>/dev/null | head -n1 || echo missing)"
  echo "node : $(node -v 2>/dev/null || echo missing)"
  echo "cargo: $(cargo -V 2>/dev/null || echo missing)"
  echo "env  : $PLATFORM codespaces=$(is_codespace && echo yes || echo no)"
  (( OFFLINE )) && echo "mode : offline"
  ok "Doctor OK"
  return 0
}

# --- init / setup / start bleiben unverändert ---
# (aus Platzgründen hier ausgelassen, identisch wie vorher)

# ─────────────────────────────────────────────────────────────────────────────
# Release / Version
# ─────────────────────────────────────────────────────────────────────────────

_semver_bump(){
  local lt="$1" kind="$2" vM vN vP
  [[ "$lt" =~ ^v?([0-9]+)\.([0-9]+)\.([0-9]+) ]] || { echo "v0.0.1"; return 1; }
  vM="${BASH_REMATCH[1]}"; vN="${BASH_REMATCH[2]}"; vP="${BASH_REMATCH[3]}"
  case "$kind" in
    patch) vP=$((vP+1));;
    minor) vN=$((vN+1)); vP=0;;
    major) vM=$((vM+1)); vN=0; vP=0;;
    *) echo "v${vM}.${vN}.${vP}"; return 1;;
  esac
  echo "v${vM}.${vN}.${vP}"
}

_last_semver_tag(){ git tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -n1 || true; }
_last_tag(){ _last_semver_tag || git describe --tags --abbrev=0 2>/dev/null || git describe --tags --always 2>/dev/null || echo "v0.0.0"; }

_pkg_json_set_ver(){
  local pj="$1" ver="$2"
  if has jq; then
    jq --arg v "$ver" '.version=$v' "$pj" > "$pj.tmp" && mv "$pj.tmp" "$pj" || { rm -f "$pj.tmp"; return 1; }
  else
    sed -E -i.bak '0,/("version"[[:space:]]*:[[:space:]]*")[^"]*/s//\1'"$ver"'/' "$pj" && rm -f "$pj.bak" || return 1
  fi
}

_cargo_set_ver(){
  local dir="$1" ver="$2"
  if has cargo && cargo set-version -V >/dev/null 2>&1; then
    (cd "$dir" && cargo set-version "$ver") || return 1
  else
    sed -E -i.bak 's/^(version[[:space:]]*=[[:space:]]*").*(")/\1'"$ver"'\2/' "$dir/Cargo.toml" && rm -f "$dir/Cargo.toml.bak" || return 1
  fi
}

release_cmd(){
  require_repo
  has git || die "git nicht installiert."
  local VERSION="" PUSH=0 SIGN_TAG=0 NOTES="auto" FROM="origin/$WGX_BASE" TO="HEAD" AUTO_KIND=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --version) shift; VERSION="${1-}";;
      --auto-version) shift; AUTO_KIND="${1-}";;
      --push) PUSH=1;;
      --sign-tag) SIGN_TAG=1;;
      --notes) shift; NOTES="${1-}";;
      --from) shift; FROM="${1-}";;
      --to) shift; TO="${1-}";;
      *) die "Unbekannte Option: $1";;
    esac; shift || true
  done
  if [[ -z "$VERSION" && -n "$AUTO_KIND" ]]; then
    VERSION="$(_semver_bump "$(_last_semver_tag || echo v0.0.0)" "$AUTO_KIND")" || die "Bump fehlgeschlagen"
  fi
  [[ -z "$VERSION" ]] && die "release: --version vX.Y.Z erforderlich."
  [[ "$VERSION" != v* ]] && VERSION="v$VERSION"

  local notes_file; notes_file="$(mktemp_portable wgx-notes)"
  if [[ "$NOTES" == "auto" ]]; then
    { echo "## $VERSION ($(date +%Y-%m-%d))"; echo; echo "### Changes"; git log --pretty='- %s (%h)' "$FROM..$TO"; } > "$notes_file"
  else
    [[ -f "$NOTES" ]] || die "--notes Datei nicht gefunden"
    notes_file="$NOTES"
  fi

  git rev-parse -q --verify "refs/tags/$VERSION" >/dev/null && die "Tag $VERSION existiert bereits."
  if (( SIGN_TAG )); then git tag -s "$VERSION" -m "$VERSION"; else git tag -a "$VERSION" -m "$VERSION"; fi
  ok "Tag $VERSION erstellt."

  (( PUSH )) && git push origin "$VERSION" || true

  if (( OFFLINE )); then
    warn "Offline: Release nur lokal getaggt."
    return 0
  fi
  case "$(host_kind)" in
    gitlab) has glab && glab release create "$VERSION" --notes-file "$notes_file" ;;
    github|*) has gh && gh release create "$VERSION" --notes-file "$notes_file" ;;
  esac
  ok "Release erstellt."
}

version_cmd(){
  require_repo
  case "$1" in
    bump)
      local kind="$2"; [[ "$kind" =~ ^(patch|minor|major)$ ]] || die "patch|minor|major erwartet"
      local lt nv; lt="$(_last_semver_tag || echo v0.0.0)"
      nv="$(_semver_bump "$lt" "$kind")" || die "Bump fehlgeschlagen"
      nv="${nv#v}"
      local web api; web="$(detect_web_dir || true)"; api="$(detect_api_dir || true)"
      [[ -n "$web" && -f "$web/package.json" ]] && _pkg_json_set_ver "$web/package.json" "$nv"
      [[ -n "$api" && -f "$api/Cargo.toml" ]] && _cargo_set_ver "$api" "$nv"
      shift 2
      [[ "$1" == "--commit" ]] && { git add -A && git commit -m "chore(version): bump to v$nv"; }
      ok "Version bump → v$nv" ;;
    set)
      local v="$2"; [[ "$v" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "Ungültige Version"
      v="${v#v}"
      local web api; web="$(detect_web_dir || true)"; api="$(detect_api_dir || true)"
      [[ -n "$web" && -f "$web/package.json" ]] && _pkg_json_set_ver "$web/package.json" "$v"
      [[ -n "$api" && -f "$api/Cargo.toml" ]] && _cargo_set_ver "$api" "$v"
      shift 2
      [[ "$1" == "--commit" ]] && { git add -A && git commit -m "chore(version): set v$v"; }
      ok "Version gesetzt → v$v" ;;
    *) die "Usage: wgx version bump patch|minor|major [--commit] | set vX.Y.Z [--commit]" ;;
  esac
}

# ─────────────────────────────────────────────────────────────────────────────
# Router
# ─────────────────────────────────────────────────────────────────────────────

usage(){
cat <<EOF
wgx – v${WGX_VERSION}
Kurz:
  wgx status
  wgx quick [-i]
  wgx send [--ci] [--open]
  wgx guard --lint --test
  wgx start [--issue N] slug
  wgx release --version vX.Y.Z | --auto-version patch|minor|major
  wgx version bump patch|minor|major [--commit] | set vX.Y.Z [--commit]
  wgx hooks install
  wgx env doctor [--fix]
  wgx config show|set K=V
  wgx clean / lint / doctor / setup / init / reload / heal / test
EOF
}

case "${SUB}" in
  status)   status_cmd "$@";;
  send)     send_cmd "$@";;
  sync)     sync_cmd "$@";;
  guard)    guard_run "$@";;
  heal)     heal_cmd "$@";;
  reload)   reload_cmd "$@";;
  clean)    clean_cmd "$@";;
  doctor)   doctor_cmd "$@";;
  init)     init_cmd "$@";;
  setup)    setup_cmd "$@";;
  lint)     lint_cmd "$@";;
  start)    start_cmd "$@";;
  release)  release_cmd "$@";;
  hooks)    hooks_cmd "$@";;
  version)  version_cmd "$@";;
  env)      env_cmd "$@";;
  quick)    quick_cmd "$@";;
  config)   config_cmd "$@";;
  test)     test_cmd "$@";;
  help|-h|--help|"") usage;;
  *) die "Unbekanntes Kommando: $SUB";;
esac