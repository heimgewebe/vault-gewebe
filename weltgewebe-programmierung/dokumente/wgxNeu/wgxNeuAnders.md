#!/usr/bin/env bash
# wgx – Weltgewebe CLI (v1.30.0 · Maxi-Edition · Teil 1/2)
# Fokus dieses Teils: Bootstrap, Logging/Farben, Root-Guard, Config, Platform,
# Git-Helpers, Status, Doctor, Env (+Termux-Fix), Config-Command, Help/Router.

set -Eeuo pipefail
IFS=$'\n\t'
umask 077
shopt -s extglob nullglob

WGX_VERSION="1.30.0"

# ===== Fehlerhandler (knapp & hilfreich) =====
trap 'ec=$?; cmd=$BASH_COMMAND; line=${BASH_LINENO[0]}; fn=${FUNCNAME[1]:-MAIN};
  ((ec)) && printf "❌ wgx: Fehler in %s (Zeile %s): %s (exit=%s)\n" \
  "$fn" "$line" "$cmd" "$ec" >&2' ERR

# --- superfrüher Fast-Exit für --version ---
if [[ "${1-}" == "--version" || "${1-}" == "-V" ]]; then
  printf "wgx v%s\n" "$WGX_VERSION"
  exit 0
fi

# ===== Farben / Logging (TTY-sicher, NO_COLOR, FORCE_COLOR) =====
WGX_NO_COLOR="${WGX_NO_COLOR:-0}"
FORCE_COLOR="${FORCE_COLOR:-0}"
_is_tty(){ [[ -t 1 ]] && [[ -t 2 ]]; }
NO_COLOR_SET=0; [[ -n "${NO_COLOR-}" ]] && NO_COLOR_SET=1
if (( FORCE_COLOR )); then USE_COLOR=1
elif (( WGX_NO_COLOR || NO_COLOR_SET )); then USE_COLOR=0
elif _is_tty; then USE_COLOR=1
else USE_COLOR=0; fi
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

trim(){ local s="$*"; s="${s#"${s%%[![:space:]]*}"}"; printf "%s" "${s%"${s##*[![:space:]]}"}"; }
to_lower(){ tr '[:upper:]' '[:lower:]'; }
read_prompt(){ # read_prompt var "Frage?" "default"
  local __v="$1" q="$2" d="${3-}" ans
  printf "%s " "$q"; read -r ans || ans="$d"
  [[ -z "$ans" ]] && ans="$d"
  printf -v "$__v" "%s" "$ans"
}

# ===== Root-Guard =====
if [[ "${EUID-}" -eq 0 && "${WGX_ALLOW_ROOT:-0}" != "1" ]]; then
  die "wgx bitte nicht als root ausführen (WGX_ALLOW_ROOT=1 zum Überspringen)."
fi

# ===== ROOT-Erkennung (symlink-robust; läuft auch außerhalb des Repos robust) =====
ROOT(){
  local here="${BASH_SOURCE[0]}"
  if has greadlink; then
    here="$(greadlink -f "$here")"
  elif has readlink; then
    if readlink -f / >/dev/null 2>&1; then
      here="$(readlink -f "$here")"
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

# ===== Konfig (Defaults + Repo .wgx.conf + $HOME/.config/wgx.conf) =====
# robuste Defaults
: "${ASSUME_YES:=0}"
: "${DRYRUN:=0}"
: "${TIMEOUT:=0}"
: "${NOTIMEOUT:=0}"
: "${VERBOSE:=0}"
: "${OFFLINE:=0}"

: "${WGX_BASE:=main}"
: "${WGX_SIGNING:=auto}"
: "${WGX_PREVIEW_DIFF_LINES:=120}"
: "${WGX_PR_LABELS:=}"
: "${WGX_CI_WORKFLOW:=CI}"
: "${WGX_PM:=}"

_load_conf_file(){
  local f="$1"
  [[ -f "$f" ]] || return 0
  while IFS='=' read -r k v; do
    [[ -z "$k" || "$k" =~ ^[[:space:]]*# ]] && continue
    k="$(trim "$k")"; v="$(trim "${v-}")"
    # nur bekannte/erlaubte Keys annehmen:
    case "$k" in
      ASSUME_YES|DRYRUN|TIMEOUT|NOTIMEOUT|VERBOSE|OFFLINE|WGX_BASE|WGX_SIGNING|WGX_PREVIEW_DIFF_LINES|WGX_PR_LABELS|WGX_CI_WORKFLOW|WGX_PM|WGX_ALLOW_ROOT|WGX_NO_COLOR|FORCE_COLOR)
        eval "export ${k}=\"${v}\""
      ;;
      *) : ;; # unbekannte Keys ignorieren – hart aber sicher
    esac
  done < "$f"
}

# Reihenfolge: Repo-local > User-global
[[ -f "$ROOT_DIR/.wgx.conf" ]] && _load_conf_file "$ROOT_DIR/.wgx.conf"
[[ -f "${HOME:-}/.config/wgx.conf" ]] && _load_conf_file "${HOME}/.config/wgx.conf"

# ===== Git/Repo Helpers =====
is_git_repo(){ git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; }
require_repo(){ is_git_repo || die "Nicht im Git-Repo (wgx benötigt ein Git-Repository)."; }
git_branch(){ git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "HEAD"; }
git_in_progress(){
  ( git -C "$ROOT_DIR" rebase --show-current-patch >/dev/null 2>&1 ) \
  || git -C "$ROOT_DIR" merge HEAD 2>/dev/null | grep -q . || return 1
}
_fetch_guard(){ ((OFFLINE)) && return 0; git -C "$ROOT_DIR" fetch -q origin 2>/dev/null || true; }

git_ahead_behind(){
  local b="${1:-$(git_branch)}"
  git -C "$ROOT_DIR" fetch -q origin "$b" 2>/dev/null || true
  local ab; ab="$(git -C "$ROOT_DIR" rev-list --left-right --count "origin/$b...$b" 2>/dev/null || echo "0 0")"
  local behind=0 ahead=0 IFS=' '
  read -r behind ahead <<<"$ab" || true
  printf "%s %s\n" "${behind:-0}" "${ahead:-0}"
}
ab_read(){ local ref="$1" ab; ab="$(git_ahead_behind "$ref" 2>/dev/null || echo "0 0")"; set -- $ab; echo "${1:-0} ${2:-0}"; }

detect_web_dir(){ for d in apps/web web; do [[ -d "$ROOT_DIR/$d" ]] && { echo "$d"; return; }; done; echo ""; }
detect_api_dir(){ for d in apps/api api crates; do [[ -f "$ROOT_DIR/$d/Cargo.toml" ]] && { echo "$d"; return; }; done; echo ""; }

remote_host_path(){
  local u; u="$(git -C "$ROOT_DIR" remote get-url origin 2>/dev/null || true)"
  [[ -z "$u" ]] && { echo ""; return; }
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

now_ts(){ date +"%Y-%m-%d %H:%M"; }
mktemp_portable(){ local p="${1:-wgx}"; local f="${TMPDIR:-/tmp}/${p}.$(date +%s).$$"; : > "$f" && printf "%s" "$f"; }

# ===== Global-Flags parsen (nur globale; Subcommands später) =====
ASSUME_YES="${ASSUME_YES:-0}"
DRYRUN="${DRYRUN:-0}"
TIMEOUT="${TIMEOUT:-0}"
NOTIMEOUT="${NOTIMEOUT:-0}"
VERBOSE="${VERBOSE:-0}"
OFFLINE="${OFFLINE:-0}"

# Logging-Helfer
logv(){ ((VERBOSE)) && printf "… %s\n" "$*"; }

# parse
ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes) ASSUME_YES=1;;
    --dry-run) DRYRUN=1;;
    --timeout) shift; [[ "${1-}" =~ ^[0-9]+$ ]] || die "--timeout braucht Zahl"; TIMEOUT="$1";;
    --no-timeout) NOTIMEOUT=1;;
    --verbose) VERBOSE=1;;
    --base) shift; WGX_BASE="${1-}";;
    --offline) OFFLINE=1;;
    --no-color) WGX_NO_COLOR=1;;
    -V|--version) printf "wgx v%s\n" "$WGX_VERSION"; exit 0;;
    --) shift; break;;
    status|doctor|env|config|help|-h|--help) ARGS+=("$1"); shift; break;;
    *) warn "Unbekanntes globales Argument ignoriert: $1";;
  esac
  shift || true
done
# Restliche Args (Subcommand + Args) anhängen
while [[ $# -gt 0 ]]; do ARGS+=("$1"); shift || true; done
set -- "${ARGS[@]}"

SUB="${1-}"; [[ $# -gt 0 ]] && shift || true

# ===== Commands dieses Teils =====

usage(){
cat <<EOF
wgx – v${WGX_VERSION}
Verfügbar in Teil 1/2:
  wgx status              # Repo-Snapshot (branch, ahead/behind, web/api, base)
  wgx doctor              # Umgebungscheck (gh, glab, node, cargo, codespaces, offline)
  wgx env doctor [--fix]  # Termux/Generic Diagnostik; --fix für Termux-Basics
  wgx config show|set K=V # Effektive Konfiguration anzeigen/setzen
  wgx help                # Diese Hilfe

Hinweis:
  Weitere Befehle (guard/lint/test/sync/send/heal/clean/release/version/hooks/quick)
  kommen in Teil 2/2.
Global:
  --yes  --dry-run  --timeout <s>  --no-timeout  --verbose  --base <branch>  --offline  --no-color  --version
EOF
}

status_cmd(){
  local in_repo=1; is_git_repo || in_repo=0
  echo "=== wgx status ==="
  echo "root : $ROOT_DIR"
  if ((in_repo)); then
    local br web api IFS=' ' behind=0 ahead=0
    br="$(git_branch)"
    read -r behind ahead < <(git_ahead_behind "$br") || true
    web="$(detect_web_dir || true)"
    api="$(detect_api_dir || true)"
    echo "branch: $br (ahead:$ahead behind:$behind), base:$WGX_BASE"
    echo "web  : ${web:-nicht gefunden}"
    echo "api  : ${api:-nicht gefunden}"
    git_in_progress && echo "flow : rebase/merge läuft" || echo "flow : normal"
  else
    echo "branch: (kein Repo)"
  fi
  (( OFFLINE )) && echo "mode : offline (fetch/pull werden übersprungen)"
  ok "Status OK"
}

doctor_cmd(){
  local in_repo=1; is_git_repo || in_repo=0
  echo "=== wgx doctor ==="
  echo "root : $ROOT_DIR"
  if ((in_repo)); then
    local br IFS=' ' behind=0 ahead=0
    br="$(git_branch)"; read -r behind ahead < <(git_ahead_behind "$br") || true
    echo "branch: $br (ahead:$ahead behind:$behind), base:$WGX_BASE"
  else
    echo "branch: (kein Repo)"
  fi
  # Toolmatrix
  if has git;  then echo "git  : OK ($(git --version 2>/dev/null))"; else echo "git  : fehlt"; fi
  if has gh;   then echo "gh   : $(gh --version 2>/dev/null | head -n1)"; else echo "gh   : fehlt"; fi
  if has glab; then echo "glab : $(glab --version 2>/dev/null | head -n1)"; else echo "glab : fehlt"; fi
  if has node; then echo "node : $(node -v 2>/dev/null)"; else echo "node : fehlt"; fi
  if has cargo;then echo "cargo: $(cargo -V 2>/dev/null)"; else echo "cargo: fehlt"; fi
  if has docker; then echo "docker: OK"; else echo "docker: fehlt (optional)"; fi
  [[ -f "$ROOT_DIR/.vale.ini" ]] && echo "vale: present" || echo "vale: missing"
  echo "env  : platform=$([[ "$(uname 2>/dev/null)" =~ [Dd]arwin ]] && echo darwin || echo linux) wsl=$(is_wsl && echo yes || echo no) codespaces=$(is_codespace && echo yes || echo no) termux=$(is_termux && echo yes || echo no)"
  (( OFFLINE )) && echo "mode : offline (Upstream-Infos evtl. veraltet)"
  ok "Doctor OK"
}

env_doctor_termux(){
  echo "=== wgx env doctor (Termux) ==="
  echo "PREFIX : ${PREFIX-}"
  echo "storage: $([[ -d "$HOME/storage" ]] && echo present || echo missing)"
  [[ ! -d "$HOME/storage" ]] && echo "Hinweis: termux-setup-storage ausführen, dann Termux neu starten."
  for p in git gh glab jq curl wget unzip zsh; do
    if has "$p"; then echo "pkg:$p OK"; else echo "pkg:$p fehlt → pkg install $p"; fi
  done
  local ok_found=0
  for p in node nodejs nodejs-lts; do
    if has "$p"; then echo "node OK ($(node -v 2>/dev/null))"; ok_found=1; break; fi
  done
  (( ok_found )) || echo "node fehlt → pkg install nodejs-lts (empfohlen)"
  if has rustc; then echo "rust OK ($(rustc -V 2>/dev/null))"; else echo "rust fehlt → pkg install rust"; fi
  if has cargo; then echo "cargo OK ($(cargo -V 2>/dev/null))"; fi
  if has postgresql; then echo "postgresql OK"; else echo "postgresql fehlt → pkg install postgresql"; fi
  if has nats-server; then echo "nats-server OK"; else echo "nats-server fehlt → pkg install nats-server"; fi
  if has redis-server; then echo "redis OK"; else echo "redis fehlt → pkg install redis"; fi
  if has caddy; then echo "caddy OK"; else echo "caddy fehlt → pkg install caddy"; fi
  if has termux-wake-lock; then echo "wake-lock: verfügbar (tip: termux-wake-lock)"; else echo "wake-lock: Kommando fehlt"; fi
  if ! git config --get core.filemode >/dev/null 2>&1; then
    echo "git: core.filemode nicht gesetzt → Empfehlung: git config core.filemode false"
  fi
  (( OFFLINE )) && echo "mode   : offline"
  ok "Termux-Check beendet."
}

env_fix_termux(){
  local ans
  if [[ ! -d "$HOME/storage" ]]; then
    read_prompt ans "Storage fehlt. Jetzt 'termux-setup-storage' ausführen? [Y/n]" "y"
    if [[ "$(to_lower "$ans")" != "n" ]]; then
      if has termux-setup-storage; then termux-setup-storage || true; else warn "termux-setup-storage nicht verfügbar."; fi
      echo "Termux ggf. neu starten."
    fi
  fi
  local need=()
  for p in git gh glab jq curl wget unzip zsh; do ! has "$p" && need+=("$p"); done
  if ((${#need[@]})); then
    read_prompt ans "Fehlende Basis-Pakete installieren (${need[*]})? [Y/n]" "y"
    if [[ "$(to_lower "$ans")" != "n" ]]; then pkg install -y "${need[@]}" || true; fi
  fi
  if ! git config --get core.filemode >/dev/null 2>&1; then
    read_prompt ans "git core.filemode=false setzen (empfohlen auf Android)? [Y/n]" "y"
    if [[ "$(to_lower "$ans")" != "n" ]]; then git config core.filemode false || true; fi
  fi
  ok "Termux-Fixes angewendet (sofern bestätigt)."
}

env_doctor_generic(){
  echo "=== wgx env doctor (generic) ==="
  if has git; then echo "git OK ($(git --version 2>/dev/null))"; else echo "git fehlt"; fi
  if has gh;  then echo "gh OK ($(gh --version 2>/dev/null | head -n1))"; else echo "gh fehlt"; fi
  if has glab; then echo "glab OK ($(glab --version 2>/dev/null | head -n1))"; else echo "glab fehlt"; fi
  if has node; then echo "node OK ($(node -v 2>/dev/null))"; else echo "node fehlt"; fi
  if has cargo; then echo "cargo OK ($(cargo -V 2>/dev/null))"; else echo "cargo fehlt"; fi
  if has docker; then echo "docker OK"; else echo "docker fehlt (optional)"; fi
  (( OFFLINE )) && echo "mode : offline"
  ok "Umgebungscheck beendet."
}

env_cmd(){
  local sub="${1-}" fix=0; shift || true
  if [[ "${1-}" == "--fix" ]]; then fix=1; shift || true; fi
  case "$sub" in
    doctor|"")
      if is_termux; then
        env_doctor_termux
        (( fix )) && env_fix_termux
      else
        env_doctor_generic
        (( fix )) && warn "--fix ist für Termux optimiert; auf diesem System ohne Wirkung."
      fi
      ;;
    *) die "Usage: wgx env doctor [--fix]";;
  esac
}

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
      echo "WGX_OFFLINE=$OFFLINE"
      echo "WGX_PM=${WGX_PM-}"
      ;;
    set)
      local kv="${1-}"
      [[ -z "$kv" || "$kv" != *=* ]] && die "Usage: wgx config set KEY=VALUE"
      local k="${kv%%=*}" v="${kv#*=}"
      [[ -f "$ROOT_DIR/.wgx.conf" ]] || : > "$ROOT_DIR/.wgx.conf"
      # Schlüssel escapen (Regex)
      local k_re; k_re="$(printf '%s' "$k" | sed 's/[][().^$*+?{}|\\]/\\&/g')"
      local v_esc="${v//&/\\&}"; v_esc="${v_esc//\//\\/}"
      if grep -q -E "^${k_re}=" "$ROOT_DIR/.wgx.conf"; then
        sed -i.bak "s|^${k_re}=.*|${k}=${v_esc}|" "$ROOT_DIR/.wgx.conf" && rm -f "$ROOT_DIR/.wgx.conf.bak"
      else
        printf "%s=%s\n" "$k" "$v" >> "$ROOT_DIR/.wgx.conf"
      fi
      ok "gesetzt: ${k}=${v}"
      ;;
    *) die "Usage: wgx config [show] | set KEY=VALUE";;
  esac
}

# ===== Router (Teil 1-Befehle) =====
# ===== Files & Text-Utils für die Heavy-Commands =====
run_with_files_xargs0(){
  local title="$1"; shift || true
  [[ -t 1 ]] && info "$title"
  if command -v xargs >/dev/null 2>&1; then
    xargs -0 "$@" || return $?
  else
    # Fallback: Null-separiert von stdin lesen
    local buf=() f
    while IFS= read -r -d '' f; do [[ -n "$f" ]] && buf+=("$f"); done
    (("$#">0)) && "$@" "${buf[@]}"
  fi
}

git_supports_magic(){ git -C "$1" ls-files -z -- ':(exclude)node_modules/**' >/dev/null 2>&1; }

changed_files_cached(){
  require_repo
  git -C "$ROOT_DIR" diff --cached --name-only -z | tr '\0' '\n' | sed '/^$/d'
}

changed_files_all(){
  require_repo
  local rec status path
  git -C "$ROOT_DIR" status --porcelain -z \
  | while IFS= read -r -d '' rec; do
      status="${rec:0:2}"
      path="${rec:3}"
      if [[ "$status" =~ ^R ]]; then
        IFS= read -r -d '' path || true
      fi
      [[ -n "$path" ]] && printf '%s\n' "$path"
    done
}

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

# ===== Vale / Sprache =====
vale_maybe(){
  [[ -f "$ROOT_DIR/.vale.ini" ]] || return 0
  has vale || { warn "Vale nicht installiert – Sprache-Checks übersprungen."; return 0; }
  local staged=0; [[ "${1-}" == "--staged" ]] && staged=1
  if (( staged )); then
    if ! git -C "$ROOT_DIR" diff --cached --name-only -z -- '*.md' 2>/dev/null | { IFS= read -r -d '' _; }; then
      return 0
    fi
    git -C "$ROOT_DIR" diff --cached --name-only -z -- '*.md' 2>/dev/null \
      | run_with_files_xargs0 "Vale (staged)" vale
  else
    if [[ -z "$(git -C "$ROOT_DIR" ls-files -z -- '*.md' 2>/dev/null | head -c1)" ]]; then
      return 0
    fi
    git -C "$ROOT_DIR" ls-files -z -- '*.md' 2>/dev/null \
      | run_with_files_xargs0 "Vale (alle .md)" vale
  fi
}

# ===== Package-Manager Detect & Runner =====
pm_detect(){
  local wd="$1"
  if [[ -n "${WGX_PM-}" ]]; then
    if has "$WGX_PM"; then echo "$WGX_PM"; return 0
    else warn "WGX_PM=$WGX_PM nicht gefunden, Auto-Detect aktiv."; fi
  fi
  if [[ -f "$ROOT_DIR/$wd/pnpm-lock.yaml" ]] && has pnpm; then echo "pnpm"
  elif [[ -f "$ROOT_DIR/$wd/package-lock.json" ]] && has npm; then echo "npm"
  elif [[ -f "$ROOT_DIR/$wd/yarn.lock" ]] && has yarn; then echo "yarn"
  elif [[ -f "$ROOT_DIR/$wd/package.json" ]]; then
    has pnpm && echo "pnpm" || has npm && echo "npm" || has yarn && echo "yarn" || echo ""
  else echo ""; fi
}

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

# ===== Snapshot =====
snapshot_make(){
  require_repo
  if [[ -z "$(git -C "$ROOT_DIR" status --porcelain -z 2>/dev/null | head -c1)" ]]; then
    info "Kein Snapshot nötig (Arbeitsbaum sauber)."; return 0
  fi
  local msg="snapshot@$(date +%s) $(git_branch)"
  git -C "$ROOT_DIR" stash push -u -m "$msg" >/dev/null 2>&1 || true
  info "Snapshot erstellt (git stash list)."
}

# ===== Commit / Sync =====
maybe_sign_flag(){
  case "${WGX_SIGNING}" in
    off) return 1;;
    ssh|gpg) echo "-S"; return 0;;
    auto) git -C "$ROOT_DIR" config --get user.signingkey >/dev/null 2>&1 && echo "-S" && return 0 || return 1;;
    *) return 1;;
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
      *) warn "Unbekannte Option sync: $1";;
    esac; shift || true
  done
  [[ -n "$BASE" ]] && WGX_BASE="$BASE"
  [[ "$(git_branch)" == "HEAD" ]] && die "Detached HEAD – bitte Branch anlegen."

  (( STAGED_ONLY==0 )) && git -C "$ROOT_DIR" add -A
  [[ -f "$ROOT_DIR/.vale.ini" ]] && vale_maybe --staged || true

  local staged list scope n msg nf="files"
  staged="$(changed_files_cached || true)"; list="${staged:-$(changed_files_all || true)}"
  scope="$([[ "$SCOPE" == "auto" ]] && auto_scope "$list" || echo "$SCOPE")"
  n=0; [[ -n "$list" ]] && n=$(printf "%s\n" "$list" | wc -l | tr -d ' ')
  (( n==1 )) && nf="file"
  msg="feat(${scope}): sync @ $(now_ts) [+${n} ${nf}]"; (( WIP )) && msg="wip: ${msg}"

  if [[ -n "$staged" ]]; then
    local sf="${signflag:-$(maybe_sign_flag || true)}"
    if [[ -n "${sf-}" ]]; then
      git -C "$ROOT_DIR" commit ${AMEND:+--amend} "$sf" -m "$msg" || die "Commit/Sign fehlgeschlagen."
    else
      git -C "$ROOT_DIR" commit ${AMEND:+--amend} -m "$msg" || die "Commit fehlgeschlagen."
    fi
  else
    info "Nichts zu committen."
  fi

  _fetch_guard
  git -C "$ROOT_DIR" rev-parse --verify -q "origin/$WGX_BASE" >/dev/null || die "Basisbranch origin/$WGX_BASE nicht gefunden (git fetch?)."
  git -C "$ROOT_DIR" rebase "origin/$WGX_BASE" || { warn "Rebase-Konflikt → wgx heal rebase"; return 2; }

  if git -C "$ROOT_DIR" rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then had_upstream=1; else had_upstream=0; fi
  if (( had_upstream )); then git -C "$ROOT_DIR" push || die "Push fehlgeschlagen."
  else git -C "$ROOT_DIR" push --set-upstream origin "$(git_branch)" || die "Push/Upstream fehlgeschlagen."; fi

  ok "Sync erledigt."
  local behind=0 ahead=0 IFS=' '
  read -r behind ahead < <(git_ahead_behind "$(git_branch)") || true
  info "Upstream: ahead=$ahead behind=$behind"
}

# ===== Guard / Lint / Test =====
guard_run(){
  require_repo
  local FIX=0 LINT_OPT=0 TEST_OPT=0 DEEP_SCAN=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --fix) FIX=1;;
      --lint) LINT_OPT=1;;
      --test) TEST_OPT=1;;
      --deep-scan) DEEP_SCAN=1;;
      *) warn "Unbekannte Option guard: $1";;
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
    (( rc==0 )) && rc=1
  fi

  # Konfliktmarker
  local with_markers=""
  while IFS= read -r -d '' f; do
    [[ -z "$f" ]] && continue
    grep -Eq '<<<<<<<|=======|>>>>>>>' -- "$ROOT_DIR/$f" 2>/dev/null && with_markers+="$f"$'\n'
  done < <(git -C "$ROOT_DIR" ls-files -m -z)
  if [[ -n "$with_markers" ]]; then
    echo "[BLOCKER] Konfliktmarker:"; printf '%s' "$with_markers" | sed 's/^/  - /'
    rc=2
  fi

  # Secrets/Größe auf staged
  local staged; staged="$(changed_files_cached || true)"
  if [[ -n "$staged" ]]; then
    local secrets
    secrets="$(printf "%s\n" "$staged" | grep -Ei '\.env(\.|$)|(^|/)(id_rsa|id_ed25519)(\.|$)|\.pem$|\.p12$|\.keystore$' || true)"
    if [[ -n "$secrets" ]]; then
      echo "[BLOCKER] mögliche Secrets im Commit (Dateinamen):"
      printf "%s\n" "$secrets" | sed 's/^/  - /'
      (( rc=2 ))
      if (( FIX )); then
        while IFS= read -r s; do
          [[ -n "$s" ]] && git -C "$ROOT_DIR" restore --staged -- "$s" 2>/dev/null || true
        done <<< "$secrets"
        echo "→ Secrets aus dem Index entfernt (Dateien bleiben lokal)."
      fi
    fi
    if (( DEEP_SCAN )); then
      local leaked
      leaked="$(git -C "$ROOT_DIR" diff --cached -U0 \
        | grep -Ei 'BEGIN (RSA|EC|OPENSSH) PRIVATE KEY|AKIA[A-Z0-9]{16}|ghp_[A-Za-z0-9]{36}|glpat-[A-Za-z0-9_-]{20,}|AWS_ACCESS_KEY_ID|SECRET(_KEY)?|TOKEN|AUTHORIZATION:|PASSWORD' \
        || true)"
      if [[ -n "$leaked" ]]; then
        echo "[BLOCKER] möglicher Secret-Inhalt im Diff:"; echo "$leaked" | sed 's/^/  > /'
        rc=2
      fi
    fi

    # >10MB warnen
    if [[ -n "$(printf "%s\n" "$staged" | while IFS= read -r f; do
      [[ -f "$ROOT_DIR/$f" ]] || continue
      local sz=0
      if stat -c %s "$ROOT_DIR/$f" >/dev/null 2>&1; then sz=$(stat -c %s "$ROOT_DIR/$f")
      elif stat -f%z "$ROOT_DIR/$f" >/dev/null 2>&1; then sz=$(stat -f%z "$ROOT_DIR/$f")
      else sz=$(wc -c < "$ROOT_DIR/$f" 2>/dev/null || echo 0); fi
      (( sz>10485760 )) && echo x && break
    done )" ]]; then
      echo "[WARN] >10MB im Commit:"
      printf "%s\n" "$staged" | while IFS= read -r f; do
        [[ -f "$ROOT_DIR/$f" ]] || continue
        local sz=0
        if stat -c %s "$ROOT_DIR/$f" >/dev/null 2>&1; then sz=$(stat -c %s "$ROOT_DIR/$f")
        elif stat -f%z "$ROOT_DIR/$f" >/dev/null 2>&1; then sz=$(stat -f%z "$ROOT_DIR/$f")
        else sz=$(wc -c < "$ROOT_DIR/$f" 2>/dev/null || echo 0); fi
        (( sz>10485760 )) && printf '  - %s (%s B)\n' "$f" "$sz"
      done
      (( rc==0 )) && rc=1
    fi
  fi

  # Lockfile-Mix
  if git -C "$ROOT_DIR" ls-files --error-unmatch pnpm-lock.yaml >/dev/null 2>&1 \
     && git -C "$ROOT_DIR" ls-files --error-unmatch package-lock.json >/dev/null 2>&1; then
    echo "[WARN] pnpm-lock.yaml UND package-lock.json im Repo – Policy klären."
    (( rc==0 )) && rc=1
  fi

  # Vale
  if [[ -f "$ROOT_DIR/.vale.ini" ]]; then
    vale_maybe --staged || (( rc==0 )) && rc=1
  endfi

  case "$rc" in
    0) ok "Preflight sauber.";;
    1) warn "Preflight mit Warnungen.";;
    2) die "Preflight BLOCKER → bitte Hinweise beachten.";;
  esac
  printf "%s\n" "$rc"; return 0
}

# ---- Lint ----
lint_cmd(){
  require_repo
  local rc_total=0

  vale_maybe || rc_total=1

  if has markdownlint; then
    if [[ -n "$(git -C "$ROOT_DIR" ls-files -z -- '*.md' 2>/dev/null | head -c1)" ]]; then
      git -C "$ROOT_DIR" ls-files -z -- '*.md' 2>/dev/null \
      | run_with_files_xargs0 "markdownlint" markdownlint || rc_total=1
    fi
  fi

  local wd; wd="$(detect_web_dir || true)"
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
      if git_supports_magic "$ROOT_DIR/$wd" && (( has_gnu_find )); then
        git -C "$ROOT_DIR/$wd" ls-files -z \
          -- ':(exclude)node_modules/**' ':(exclude)dist/**' ':(exclude)build/**' \
             '*.js' '*.ts' '*.tsx' '*.jsx' '*.json' '*.css' '*.scss' '*.md' '*.svelte' 2>/dev/null \
        | run_with_files_xargs0 "Prettier Check" \
            sh -c 'cd "$1"; shift; '"$prettier_cmd"' -c -- "$@"' _ "$ROOT_DIR/$wd" \
        || run_with_files_xargs0 "Prettier Check (fallback npx)" \
            sh -c 'cd "$1"; shift; npx --yes prettier -c -- "$@"' _ "$ROOT_DIR/$wd" \
        || rc_total=1
      else
        find "$ROOT_DIR/$wd" \( -path "$ROOT_DIR/$wd/node_modules" -o -path "$ROOT_DIR/$wd/dist" -o -path "$ROOT_DIR/$wd/build" \) -prune -o \
             -type f \( -name '*.js' -o -name '*.ts' -o -name '*.tsx' -o -name '*.jsx' -o -name '*.json' -o -name '*.css' -o -name '*.scss' -o -name '*.md' -o -name '*.svelte' \) -print0 \
        | while IFS= read -r -d '' f; do rel="${f#$ROOT_DIR/$wd/}"; printf '%s\0' "$rel"; done \
        | run_with_files_xargs0 "Prettier Check" \
            sh -c 'cd "$1"; shift; '"$prettier_cmd"' -c -- "$@"' _ "$ROOT_DIR/$wd" \
        || run_with_files_xargs0 "Prettier Check (fallback npx)" \
            sh -c 'cd "$1"; shift; npx --yes prettier -c -- "$@"' _ "$ROOT_DIR/$wd" \
        || rc_total=1
      fi
    fi

    # ESLint (wenn Konfig existiert)
    local has_eslint_cfg=0
    [[ -f "$ROOT_DIR/$wd/.eslintrc" || -f "$ROOT_DIR/$wd/.eslintrc.js" || -f "$ROOT_DIR/$wd/.eslintrc.cjs" || -f "$ROOT_DIR/$wd/.eslintrc.json" \
       || -f "$ROOT_DIR/$wd/eslint.config.js" || -f "$ROOT_DIR/$wd/eslint.config.mjs" || -f "$ROOT_DIR/$wd/eslint.config.cjs" ]] && has_eslint_cfg=1
    if (( has_eslint_cfg )); then
      run_soft "ESLint" bash -lc "cd '$ROOT_DIR/$wd' && $eslint_cmd -v >/dev/null 2>&1 && $eslint_cmd . --ext .js,.cjs,.mjs,.ts,.tsx,.svelte" \
      || { if (( OFFLINE )); then warn "ESLint übersprungen (offline)"; false; \
           else run_soft "ESLint (fallback npx)" bash -lc "cd '$ROOT_DIR/$wd' && npx --yes eslint . --ext .js,.cjs,.mjs,.ts,.tsx,.svelte"; fi; } \
      || rc_total=1
    fi
  fi

  # Rust
  local ad; ad="$(detect_api_dir || true)"
  if [[ -n "$ad" && -f "$ROOT_DIR/$ad/Cargo.toml" ]] && has cargo; then
    run_soft "cargo fmt --check" bash -lc "cd '$ROOT_DIR/$ad' && cargo fmt --all -- --check" || rc_total=1
    if rustup component list 2>/dev/null | grep -q 'clippy.*(installed)'; then
      run_soft "cargo clippy (Hinweise)" bash -lc "cd '$ROOT_DIR/$ad' && cargo clippy --all-targets --all-features -q" || rc_total=1
    else
      warn "clippy nicht installiert – übersprungen."
    fi
  fi

  # Shell / Dockerfiles / Workflows
  if has shellcheck; then
    if [[ -n "$(git -C "$ROOT_DIR" ls-files -z -- '*.sh' 2>/dev/null | head -c1)" || -f "$ROOT_DIR/wgx" || -d "$ROOT_DIR/scripts" ]]; then
      { git -C "$ROOT_DIR" ls-files -z -- '*.sh' 2>/dev/null; git -C "$ROOT_DIR" ls-files -z -- 'wgx' 'scripts/*' 2>/dev/null; } \
      | run_with_files_xargs0 "shellcheck" shellcheck || rc_total=1
    fi
  fi
  if has hadolint; then
    if [[ -n "$(git -C "$ROOT_DIR" ls-files -z -- '*Dockerfile*' 2>/dev/null | head -c1)" ]]; then
      git -C "$ROOT_DIR" ls-files -z -- '*Dockerfile*' 2>/dev/null \
      | run_with_files_xargs0 "hadolint" hadolint || rc_total=1
    fi
  fi
  if has actionlint && [[ -d "$ROOT_DIR/.github/workflows" ]]; then
    run_soft "actionlint" actionlint || rc_total=1
  fi

  (( rc_total==0 )) && ok "Lint OK" || warn "Lint mit Hinweisen (rc=$rc_total)."
  printf "%s\n" "$rc_total"; return 0
}

pm_test(){ 
  local wd="$1"; local pm; pm="$(pm_detect "$wd")"
  case "$pm" in
    pnpm) (cd "$ROOT_DIR/$wd" && pnpm -s test -s) ;;
    npm)  (cd "$ROOT_DIR/$wd" && npm test -s) ;;
    yarn) (cd "$ROOT_DIR/$wd" && yarn -s test) ;;
    *) return 0;;
  esac
}

test_cmd(){
  require_repo
  local rc_web=0 rc_api=0 wd ad pid_web= pid_api=
  trap '[[ -n "${pid_web-}" ]] && kill "$pid_web" 2>/dev/null || true; [[ -n "${pid_api-}" ]] && kill "$pid_api" 2>/dev/null || true' INT
  wd="$(detect_web_dir || true)"; ad="$(detect_api_dir || true)"
  if [[ -n "$wd" && -f "$ROOT_DIR/$wd/package.json" ]]; then
    info "Web-Tests…"; ( pm_test "$wd" ) & pid_web=$!
  fi
  if [[ -n "$ad" && -f "$ROOT_DIR/$ad/Cargo.toml" ]] && has cargo; then
    info "Rust-Tests…"; ( cd "$ROOT_DIR/$ad" && cargo test --all --quiet ) & pid_api=$!
  fi
  if [[ -n "${pid_web-}" ]]; then wait "$pid_web" || rc_web=1; fi
  if [[ -n "${pid_api-}" ]]; then wait "$pid_api" || rc_api=1; fi
  (( rc_web==0 && rc_api==0 )) && ok "Tests OK" || { [[ $rc_web -ne 0 ]] && warn "Web-Tests fehlgeschlagen."; [[ $rc_api -ne 0 ]] && warn "Rust-Tests fehlgeschlagen."; return 1; }
}

# ===== CODEOWNERS / Labels =====
_codeowners_file(){
  if   [[ -f "$ROOT_DIR/.github/CODEOWNERS" ]]; then echo "$ROOT_DIR/.github/CODEOWNERS"
  elif [[ -f "$ROOT_DIR/CODEOWNERS" ]]; then echo "$ROOT_DIR/CODEOWNERS"
  else echo ""; fi
}

_sanitize_csv(){
  local csv="$1" IFS=, parts=(); read -ra parts <<<"$csv"
  local out=() seen="" p
  for p in "${parts[@]}"; do
    p="$(trim "$p")"; [[ -z "$p" ]] && continue
    [[ ",$seen," == *",$p,"* ]] && continue
    seen="${seen},$p"; out+=("$p")
  done
  local IFS=,; printf "%s" "${out[*]}"
}

_codeowners_reviewers(){ # \n-Pfade von stdin
  local cof; cof="$(_codeowners_file)"; [[ -z "$cof" ]] && return 0
  local default_owners=() line
  local -a PAT=() OWN=()
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="$(trim "$line")"
    [[ -z "$line" || "$line" =~ ^# ]] && continue
    line="${line%%#*}"; line="$(trim "$line")"; [[ -z "$line" ]] && continue
    local pat rest; pat="${line%%[[:space:]]*}"; rest="${line#"$pat"}"; rest="$(trim "$rest")"
    [[ -z "$pat" || -z "$rest" ]] && continue
    local -a arr; read -r -a arr <<<"$rest"
    if [[ "$pat" == "*" ]]; then
      default_owners=("${arr[@]}")
    else
      PAT+=("$pat"); OWN+=("$(printf "%s " "${arr[@]}")")
    fi
  done < "$cof"

  local files=() f
  while IFS= read -r f; do [[ -n "$f" ]] && files+=("$f"); done

  local seen="," i p matchOwners o
  for f in "${files[@]}"; do
    matchOwners=""
    for (( i=0; i<${#PAT[@]}; i++ )); do
      p="${PAT[$i]}"; [[ "$p" == /* ]] && p="${p:1}"
      case "$f" in $p) matchOwners="${OWN[$i]}";; esac
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

derive_labels(){
  local branch scope="$1"; branch="$(git_branch)"; local pref="${branch%%/*}"; local L=()
  case "$pref" in
    feat) L+=("feature");;
    fix|hotfix) L+=("bug");;
    docs) L+=("docs");;
    refactor) L+=("refactor");;
    test|tests) L+=("test");;
    ci) L+=("ci");;
    perf) L+=("performance");;
    chore) L+=("chore");;
    build) L+=("build");;
  esac
  local subj; subj="$(git -C "$ROOT_DIR" log -1 --pretty=%s 2>/dev/null || true)"
  case "$subj" in
    feat:*) L+=("feature");;
    fix:*) L+=("bug");;
    docs:*) L+=("docs");;
    refactor:*) L+=("refactor");;
    test:*) L+=("test");;
    ci:*) L+=("ci");;
    perf:*) L+=("performance");;
    chore:*) L+=("chore");;
    build:*) L+=("build");;
    style:*) L+=("style");;
  esac
  [[ -n "$scope" ]] && L+=("scope:$scope")
  local joined; local IFS=,; joined="${L[*]}"
  printf '%s\n' "$(_sanitize_csv "$joined")"
}

# ===== PR/MR =====
render_pr_body(){
  local TITLE="$1" SUMMARY="$2" WHY="$3" TESTS="$4" ISSUES="$5" NOTES="$6"
  local tpl=""
  if   [[ -f "$ROOT_DIR/.wgx/pr_template.md" ]]; then tpl="$(cat "$ROOT_DIR/.wgx/pr_template.md")"
  elif [[ -f "$ROOT_DIR/.github/pull_request_template.md" ]]; then tpl="$(cat "$ROOT_DIR/.github/pull_request_template.md")"
  else
    tpl=$'*Zweck*\n{{SUMMARY}}\n\n*Änderungen*\n{{CHANGES}}\n\n*Warum*\n{{WHY}}\n\n*Tests*\n{{TESTS}}\n\n*Issues*\n{{ISSUES}}\n\n*Notizen*\n{{NOTES}}\n'
  fi
  local CHANGES=""
  if git -C "$ROOT_DIR" rev-parse --verify -q "origin/$WGX_BASE" >/dev/null; then
    CHANGES="$(git -C "$ROOT_DIR" diff --name-status "origin/$WGX_BASE"...HEAD | head -n "$WGX_PREVIEW_DIFF_LINES")"
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
  local hp; hp="$(remote_host_path || true)"; [[ -z "$hp" ]] && { echo ""; return 0; }
  local host="${hp%% *}"
  case "$host" in github.com) echo "github";; gitlab.com) echo "gitlab";; *) echo "";; esac
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
    *) warn "Unbekannte Option send: $1";;
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
      die "send: Du stehst auf Base ($WGX_BASE). Erst \"wgx start <slug>\" – oder nutze \"wgx send --auto-branch\"."
    fi
  fi

  git -C "$ROOT_DIR" fetch -q origin "$WGX_BASE" >/dev/null 2>&1 || true
  if git -C "$ROOT_DIR" rev-parse --verify -q "origin/$WGX_BASE" >/dev/null; then
    if git -C "$ROOT_DIR" diff --quiet "origin/$WGX_BASE"...HEAD; then
      die "send: Kein Diff zu origin/$WGX_BASE → Nichts zu senden (committen oder \"wgx sync\")."
    fi
  fi

  guard_run; local rc=$?
  (( rc==1 && (ASSUME_YES || ${WGX_DRAFT_ON_WARN:-0}) )) && DRAFT=1

  (( SYNC_FIRST )) && { sync_cmd ${SIGN:+--sign} --scope "${SCOPE}" --base "$WGX_BASE" || { warn "Sync fehlgeschlagen → PR abgebrochen."; return 1; }; }

  local files scope short; files="$(git -C "$ROOT_DIR" diff --name-only "origin/$WGX_BASE"...HEAD 2>/dev/null || true)"
  scope="$([[ "$SCOPE" == "auto" ]] && auto_scope "$files" || echo "$SCOPE")"
  local last_subject; last_subject="$(git -C "$ROOT_DIR" log -1 --pretty=%s 2>/dev/null || true)"
  short="${TITLE:-${last_subject:-"Änderungen an ${scope}"}}"
  local TITLE2="[${scope}] ${short}"

  local body; body="$(render_pr_body "$TITLE2" "$short" "${WHY:-"—"}" "${TESTS:-"—"}" "${ISSUE:-""}" "${NOTES:-""}")"
  if (( INTERACTIVE )); then
    local tmpf; tmpf="$(mktemp_portable wgx-pr)"
    printf "%s" "$body" > "$tmpf"
    bash -lc "${WGX_EDITOR:-${EDITOR:-nano}} $(printf '%q' "$tmpf")"
    body="$(cat "$tmpf")"
    rm -f "$tmpf"
  fi
  [[ -z "$(printf '%s' "$body" | tr -d '[:space:]')" ]] && die "PR-Body ist leer – abgebrochen."

  local autoL; autoL="$(derive_labels "$scope")"
  [[ -n "$autoL" ]] && LABELS="${LABELS:+$LABELS,}$autoL"
  LABELS="$(_sanitize_csv "$LABELS")"

  case "$(host_kind)" in
    gitlab)
      if has glab; then
        glab auth status >/dev/null 2>&1 || warn "glab nicht eingeloggt (glab auth login) – MR könnte scheitern."
        local args=(mr create --title "$TITLE2" --description "$body" --source-branch "$(git_branch)" --target-branch "$WGX_BASE")
        (( DRAFT )) && args+=(--draft)
        [[ -n "$ISSUE" ]] && args+=(--issue "$ISSUE")
        if [[ -n "$LABELS" ]]; then
          IFS=, read -r -a _labels <<<"$LABELS"
          for _l in "${_labels[@]}"; do _l="$(trim "$_l")"; [[ -n "$_l" ]] && args+=(--label "$_l"); done
        fi
        if [[ "$REVIEWERS" == "auto" ]]; then
          local rlist=""; rlist="$(printf "%s\n" "$files" | _codeowners_reviewers || true)"
          [[ -n "$rlist" ]] && { local r; while IFS= read -r r; do [[ -n "$r" ]] && args+=(--reviewer "$r"); done <<< "$rlist"; info "Reviewer (auto): $(printf '%s' "$rlist" | tr '\n' ' ')"; }
        elif [[ -n "$REVIEWERS" ]]; then
          IFS=, read -r -a rv <<<"$REVIEWERS"; local r; for r in "${rv[@]}"; do r="$(trim "$r")"; [[ -n "$r" ]] && args+=(--reviewer "$r"); done
        fi
        glab "${args[@]}" || die "glab mr create fehlgeschlagen."
        ok "Merge Request erstellt."
        (( OPEN_PR )) && glab mr view --web >/dev/null 2>&1 || true
      else
        warn "glab CLI nicht gefunden. MR manuell im GitLab anlegen."
        echo "Vergleich: $(compare_url)"
      fi
      ;;
    github|*)
      if has gh; then
        gh auth status >/dev/null 2>&1 || warn "gh nicht eingeloggt (gh auth login) – PR könnte scheitern."
        local args=(pr create --title "$TITLE2" --body "$body" --base "$WGX_BASE")
        (( DRAFT )) && args+=(--draft)
        if [[ -n "$LABELS" ]]; then
          IFS=, read -r -a L <<<"$LABELS"
          for l in "${L[@]}"; do l="$(trim "$l")"; [[ -n "$l" ]] && args+=(--label "$l"); done
        fi
        [[ -n "$ISSUE" ]] && args+=(--issue "$ISSUE")
        if [[ "$REVIEWERS" == "auto" ]]; then
          local rlist=""; rlist="$(printf "%s\n" "$files" | _codeowners_reviewers || true)"
          if [[ -n "$rlist" ]]; then
            while IFS= read -r r; do [[ -n "$r" ]] && args+=(--reviewer "$r"); done <<< "$rlist"
            info "Reviewer (auto): $(printf '%s' "$rlist" | tr '\n' ' ')"
          else
            warn "CODEOWNERS ohne User-Reviewer."
          fi
        elif [[ -n "$REVIEWERS" ]]; then
          IFS=, read -r -a rvw2 <<<"$REVIEWERS"; local r2
          for r2 in "${rvw2[@]}"; do r2="$(trim "$r2")"; [[ -n "$r2" ]] && args+=(--reviewer "$r2"); done
        fi
        gh "${args[@]}" || die "gh pr create fehlgeschlagen."
        local pr_url; pr_url="$(gh pr view --json url -q .url 2>/dev/null || true)"
        [[ -n "$pr_url" ]] && info "PR: $pr_url"
        ok "PR erstellt."
        (( TRIGGER_CI )) && gh workflow run "$WGX_CI_WORKFLOW" >/dev/null 2>&1 || true
        (( OPEN_PR )) && gh pr view -w >/dev/null 2>&1 || true
      else
        local url; url="$(compare_url)"
        echo "gh CLI nicht gefunden. PR manuell anlegen:"
        echo "URL: $url"
        echo "Labels: $LABELS"
        echo "--- PR Text ---"
        echo "$body"
      fi
      ;;
  esac
}

# ===== Heal / Reload / Clean =====
heal_cmd(){
  require_repo
  local MODE="${1-}"; shift || true
  local STASH=0 CONT=0 ABORT=0 BASE=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --stash) STASH=1;;
      --continue) CONT=1;;
      --abort) ABORT=1;;
      --base) shift; BASE="${1-}";;
      *) warn "Unbekannte Option heal: $1";;
    esac; shift || true
  done
  [[ -n "$BASE" ]] && WGX_BASE="$BASE"
  (( ABORT )) && { git -C "$ROOT_DIR" rebase --abort 2>/dev/null || git -C "$ROOT_DIR" merge --abort 2>/dev/null || true; ok "Abgebrochen."; return 0; }
  (( CONT )) && { git -C "$ROOT_DIR" add -A; git -C "$ROOT_DIR" rebase --continue || die "continue fehlgeschlagen."; ok "Rebase fortgesetzt."; return 0; }
  (( STASH )) && snapshot_make
  _fetch_guard
  case "$MODE" in
    ""|rebase) git -C "$ROOT_DIR" rev-parse --verify -q "origin/$WGX_BASE" >/dev/null || die "Basisbranch origin/$WGX_BASE nicht gefunden."; git -C "$ROOT_DIR" rebase "origin/$WGX_BASE" || { warn "Konflikte. Löse sie, dann: wgx heal --continue | --abort"; return 2; } ;;
    ours)      git -C "$ROOT_DIR" merge -X ours   "origin/$WGX_BASE" || { warn "Konflikte. manuell lösen + commit"; return 2; } ;;
    theirs)    git -C "$ROOT_DIR" merge -X theirs "origin/$WGX_BASE" || { warn "Konflikte. manuell lösen + commit"; return 2; } ;;
    ff-only)   git -C "$ROOT_DIR" merge --ff-only "origin/$WGX_BASE" || { warn "Fast-Forward nicht möglich."; return 2; } ;;
    *) die "Unbekannter heal-Modus: $MODE";;
  esac
  ok "Heal erfolgreich."
}

reload_cmd(){
  local MODE="${1-}"; shift || true
  local TMUX=0; [[ "${1-}" == "--tmux" ]] && { TMUX=1; shift || true; }
  case "$MODE" in
    here|"") exec "$SHELL" -l;;
    root) cd "$ROOT_DIR" && exec "$SHELL" -l;;
    new)
      if (( TMUX )) && has tmux; then
        tmux new-window -c "$ROOT_DIR"
      else
        if has setsid; then
          setsid "$SHELL" -l >/dev/null 2>&1 < /dev/null &
        else
          nohup "$SHELL" -l >/dev/null 2>&1 < /dev/null & info "nohup verwendet (setsid fehlt)."
        fi
      fi
      ok "Neue Shell gestartet."
      ;;
    *) die "reload: here|root|new [--tmux]";;
  esac
}

clean_cmd(){
  require_repo
  local SAFE=1 BUILD=0 GITC=0 DEEP=0 ans ans2
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --safe) SAFE=1;;
      --build) BUILD=1;;
      --git) GITC=1;;
      --deep) DEEP=1;;
      *) warn "Unbekannte Option clean: $1";;
    esac; shift || true
  done
  (( SAFE || BUILD || GITC || DEEP )) || SAFE=1
  if (( DEEP && ASSUME_YES==0 )); then
    read_prompt ans "⚠ Tiefenreinigung (git clean -xfd). Sicher? [y/N]" "n"
    [[ "$(to_lower "$ans")" == "y" ]] || { warn "abgebrochen."; return 1; }
    read_prompt ans2 "Snapshot vorher erstellen? [Y/n]" "y"
    [[ "$(to_lower "$ans2")" == "n" ]] || snapshot_make
  fi
  do_rm(){ if (( DRYRUN )); then printf 'DRY: rm -rf -- %q\n' "$@"; else rm -rf "$@"; fi }
  do_git(){ if (( DRYRUN )); then printf 'DRY: git %s\n' "$*"; else git -C "$ROOT_DIR" "$@"; fi }

  if (( SAFE || BUILD )); then
    do_rm "$ROOT_DIR/coverage" "$ROOT_DIR/dist" "$ROOT_DIR/node_modules/.cache" "$ROOT_DIR/target"
    if (( DRYRUN )); then
      echo "DRY: find \"${TMPDIR:-/tmp}\" -maxdepth 1 -type f -name 'wgx-*.log' -mtime +1 -exec rm -f {} +"
    else
      find "${TMPDIR:-/tmp}" -maxdepth 1 -type f -name 'wgx-*.log' -mtime +1 -exec rm -f {} +
    fi
  fi

  if (( GITC )); then
    if (( DRYRUN )); then
      git -C "$ROOT_DIR" branch --merged \
      | grep -Ev '^\*|[[:space:]](main|master|dev)$' \
      | sed 's/^[*[:space:]]*//' \
      | while IFS= read -r b; do [[ -n "$b" ]] && printf 'DRY: git branch -d -- %q\n' "$b"; done
    else
      git -C "$ROOT_DIR" branch --merged \
      | grep -Ev '^\*|[[:space:]](main|master|dev)$' \
      | sed 's/^[*[:space:]]*//' \
      | while IFS= read -r b; do [[ -n "$b" ]] && git -C "$ROOT_DIR" branch -d "$b" 2>/dev/null || true; done
    fi
    do_git remote prune origin >/dev/null 2>&1 || true
  fi

  (( DEEP )) && do_git clean -xfd
  ok "Clean $( ((DRYRUN)) && echo '(Preview) ' )fertig."
}

# ===== Init / Setup / Start =====
init_cmd(){
  [[ -f "$ROOT_DIR/.wgx.conf" ]] && warn ".wgx.conf existiert bereits." || {
    cat > "$ROOT_DIR/.wgx.conf" <<EOF
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
# Optional: WGX_WEB_DIR=apps/web
# Optional: WGX_API_DIR=apps/api
# Optional: WGX_PM=pnpm|npm|yarn
EOF
    ok ".wgx.conf angelegt."
  }
  [[ -d "$ROOT_DIR/.wgx" ]] || { mkdir -p "$ROOT_DIR/.wgx"; ok ".wgx/ angelegt."; }
  [[ -f "$ROOT_DIR/.wgx/pr_template.md" ]] || cat > "$ROOT_DIR/.wgx/pr_template.md" <<'EOF'
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
}

setup_cmd(){
  if is_termux; then
    info "Termux-Setup (Basis-Tools)…"
    pkg update -y && pkg upgrade -y
    pkg install -y git gh glab curl wget unzip zsh
    has vale || warn "Vale nicht via pkg? → Binary Release installieren; sonst wird der Check übersprungen."
    has gh   || warn "GitHub CLI (gh) nicht verfügbar – PR/Release-Funktionen eingeschränkt."
    has glab || warn "GitLab CLI (glab) nicht verfügbar – MR/Release-Funktionen eingeschränkt."
    has jq   || warn "jq nicht verfügbar – JSON-Version-Update fällt auf sed-Fallback zurück."
    ok "Termux-Setup abgeschlossen."
  else
    info "Setup ist plattformabhängig. Stelle sicher: git, gh, (optional) glab, zsh, vale, jq."
  fi
}

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

  git -C "$ROOT_DIR" fetch origin "$WGX_BASE" 2>/dev/null || true
  local base_ref="origin/$WGX_BASE"
  git -C "$ROOT_DIR" rev-parse --verify -q "$base_ref" >/dev/null || base_ref="$WGX_BASE"
  git -C "$ROOT_DIR" rev-parse --verify -q "$base_ref" >/dev/null || die "Basisbranch $WGX_BASE nicht gefunden (weder lokal noch origin/)."

  slug="${slug//[^a-zA-Z0-9._-]/-}"
  slug="${slug//../.}" 
  slug="${slug##+(-)}"; slug="${slug%%+(-)}"
  [[ -z "$slug" ]] && die "leerer Branch-Name."

  local name; name="${slug}"
  [[ -n "$issue" ]] && name="feat-${issue}-${slug}"
  shopt -s extglob; name="${name//+(-)/-}"; shopt -u extglob
  name="${name//@\{/-}"
  [[ "$name" == *.lock ]] && name="${name%.lock}-lock"

  git -C "$ROOT_DIR" check-ref-format --branch "$name" || die "Ungültiger Branch-Name: $name"
  git -C "$ROOT_DIR" checkout -b "$name" "$base_ref" || die "Branch konnte nicht erstellt werden."
  ok "Branch '$name' von $base_ref erstellt und ausgecheckt."
}

# ===== Release / Version =====
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
_last_semver_tag(){ git -C "$ROOT_DIR" tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -n1 || true; }
_last_tag(){ _last_semver_tag || git -C "$ROOT_DIR" describe --tags --abbrev=0 2>/dev/null || git -C "$ROOT_DIR" describe --tags --always 2>/dev/null || echo "v0.0.0"; }

_pkg_json_set_ver(){
  local pj="$1" ver="$2"
  if has jq; then
    jq --arg v "$ver" '.version=$v' "$pj" > "$pj.tmp" && mv "$pj.tmp" "$pj" || return 1
  else
    local v_esc="${ver//\\/\\\\}"; v_esc="${v_esc//&/\\&}"; v_esc="${v_esc//|/\\|}"
    sed -E -i.bak 's|^([[:space:]]*"version"[[:space:]]*:[[:space:]]*")[^"]*(".*)|\1'"$v_esc"'\2|' "$pj" && rm -f "$pj.bak"
  fi
}
_cargo_set_ver(){
  local dir="$1" ver="$2"
  if has cargo && cargo set-version -V >/dev/null 2>&1; then
    (cd "$dir" && cargo set-version "$ver")
  else
    sed -E -i.bak 's/^(version[[:space:]]*=[[:space:]]*)"[^"]*"/\1"'"$ver"'"/' "$dir/Cargo.toml" && rm -f "$dir/Cargo.toml.bak"
  fi
}

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
      *) warn "Unbekannte Option release: $1";;
    esac; shift || true
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
    notes_text+="$(git -C "$ROOT_DIR" log --pretty='- %s (%h)' "$FROM..$TO" || true)"
    notes_file="$(mktemp_portable wgx-notes)"; printf "%s\n" "$notes_text" > "$notes_file"
  else
    [[ -f "$NOTES" ]] || die "--notes Datei nicht gefunden: $NOTES"
    notes_file="$NOTES"
  fi
  [[ -z "$notes_file" ]] && { notes_file="$(mktemp_portable wgx-notes)"; printf "Release %s\n" "$VERSION" > "$notes_file"; }

  git -C "$ROOT_DIR" rev-parse -q --verify "refs/tags/$VERSION" >/dev/null && die "Tag $VERSION existiert bereits."
  if (( SIGN_TAG )); then git -C "$ROOT_DIR" tag -s "$VERSION" -m "$VERSION" || die "Signiertes Tag fehlgeschlagen."
  else git -C "$ROOT_DIR" tag -a "$VERSION" -m "$VERSION" || die "Tagging fehlgeschlagen."; fi
  ok "Git-Tag $VERSION erstellt."
  (( PUSH )) && { git -C "$ROOT_DIR" push origin "$VERSION" || die "Tag Push fehlgeschlagen."; ok "Tag gepusht."; }

  case "$(host_kind)" in
    gitlab)
      if has glab; then
        glab auth status >/dev/null 2>&1 || { warn "glab nicht eingeloggt – Release nur lokal getaggt."; [[ "$NOTES" == "auto" && -n "$notes_file" ]] && rm -f "$notes_file" 2>/dev/null || true; return 0; }
        glab release create "$VERSION" --notes-file "$notes_file" || die "glab release create fehlgeschlagen."
        (( LATEST )) && glab release edit "$VERSION" --latest >/dev/null 2>&1 || true
        ok "GitLab Release erstellt: $VERSION"
      else
        info "glab CLI fehlt – nur Git-Tag erstellt."
      fi
      ;;
    github|*)
      if has gh; then
        gh auth status >/dev/null 2>&1 || { warn "gh nicht eingeloggt – Release nur lokal getaggt."; [[ "$NOTES" == "auto" && -n "$notes_file" ]] && rm -f "$notes_file" 2>/dev/null || true; return 0; }
        local latest_flag=(); (( LATEST )) && latest_flag+=(--latest)
        gh release create "$VERSION" "${latest_flag[@]}" --notes-file "$notes_file" || die "gh release create fehlgeschlagen."
        ok "GitHub Release erstellt: $VERSION"
      else
        info "gh CLI fehlt – nur Git-Tag erstellt."
      fi
      ;;
  esac
  [[ "$NOTES" == "auto" && -n "$notes_file" ]] && rm -f "$notes_file" 2>/dev/null || true
}

version_cmd(){
  require_repo
  local sub="${1-}"; shift || true
  case "$sub" in
    bump)
      local kind="${1-}"; shift || true
      [[ "$kind" =~ ^(patch|minor|major)$ ]] || die "version bump: erwartet patch|minor|major"
      local lt="$(_last_semver_tag || echo v0.0.0)"
      local nv="$(_semver_bump "$lt" "$kind")"; nv="${nv#v}"
      local web api; web="$(detect_web_dir || true)"; api="$(detect_api_dir || true)"
      [[ -n "$web" && -f "$ROOT_DIR/$web/package.json" ]] && _pkg_json_set_ver "$ROOT_DIR/$web/package.json" "$nv"
      [[ -n "$api" && -f "$ROOT_DIR/$api/Cargo.toml" ]] && _cargo_set_ver "$ROOT_DIR/$api" "$nv"
      local do_commit=0; for a in "$@"; do [[ "$a" == "--commit" ]] && do_commit=1; done
      (( do_commit )) && { git -C "$ROOT_DIR" add -A && git -C "$ROOT_DIR" commit -m "chore(version): bump to v$nv"; }
      ok "Version bump → v$nv"
      ;;
    set)
      local v="$1"; shift || true
      [[ -n "$v" ]] || die "version set vX.Y.Z"
      [[ "$v" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "Ungültige Version: $v"
      v="${v#v}"
      local web api; web="$(detect_web_dir || true)"; api="$(detect_api_dir || true)"
      [[ -n "$web" && -f "$ROOT_DIR/$web/package.json" ]] && _pkg_json_set_ver "$ROOT_DIR/$web/package.json" "$v"
      [[ -n "$api" && -f "$ROOT_DIR/$api/Cargo.toml" ]] && _cargo_set_ver "$ROOT_DIR/$api" "$v"
      local do_commit=0; for a in "$@"; do [[ "$a" == "--commit" ]] && do_commit=1; done
      (( do_commit )) && { git -C "$ROOT_DIR" add -A && git -C "$ROOT_DIR" commit -m "chore(version): set v$v"; }
      ok "Version gesetzt → v$v"
      ;;
    *) die "Usage: wgx version bump [patch|minor|major] [--commit] | wgx version set vX.Y.Z [--commit]";;
  esac
}

# ===== Hooks / Quick =====
hooks_cmd(){
  require_repo
  local sub="${1-}"; shift || true
  case "$sub" in
    install)
      local root="$ROOT_DIR"
      if [[ -x "$root/cli/wgx/install.sh" ]]; then
        bash "$root/cli/wgx/install.sh" || die "wgx install.sh fehlgeschlagen"
      else
        die "hooks install: Installer fehlt (cli/wgx/install.sh)"
      fi
      ;;
    *) die "Usage: wgx hooks install";;
  esac
}

quick_cmd(){
  require_repo
  local INTERACTIVE=0
  [[ "${1-}" == "-i" || "${1-}" == "--interactive" ]] && INTERACTIVE=1
  echo "=== wgx quick ==="
  local rc=0
  guard_run --lint --test || rc=$?
  local draft=()
  (( rc==1 )) && draft+=(--draft)
  if (( INTERACTIVE )); then
    send_cmd "${draft[@]}" --ci --open -i
  else
    send_cmd "${draft[@]}" --ci --open
  fi
}

# ===== (Neu) usage() komplettieren & Router final =====
usage(){
cat <<EOF
wgx – v${WGX_VERSION}
Kurz:
  wgx status                # Repo-Snapshot (branch, ahead/behind, web/api, base)
  wgx doctor                # Umgebungscheck
  wgx env doctor [--fix]    # Termux/Generic Diagnostik; --fix für Termux-Fixes
  wgx config show|set K=V   # Konfiguration ansehen/setzen

Workflow:
  wgx start [--issue N] slug
  wgx guard [--lint] [--test] [--deep-scan]
  wgx lint
  wgx test
  wgx sync [--wip] [--amend] [--scope <s>] [--sign]
  wgx send [--draft] [--reviewers auto|u1,u2] [--ci] [--open] [--auto-branch]
  wgx heal [rebase|ours|theirs|ff-only] [--continue|--abort|--stash]
  wgx clean [--safe|--build|--git|--deep]
  wgx release --version vX.Y.Z | --auto-version patch|minor|major [--push] [--sign-tag] [--latest]
  wgx version bump patch|minor|major [--commit] | set vX.Y.Z [--commit]
  wgx hooks install
  wgx quick [-i]
  wgx reload here|root|new [--tmux]
  wgx init
  wgx setup

Global:
  --yes  --dry-run  --timeout <s>  --no-timeout  --verbose  --base <branch>  --offline  --no-color  --version
EOF
}

# ===== Router (vollständig) =====
case "${SUB}" in
  status)   status_cmd "$@";;
  doctor)   doctor_cmd "$@";;
  env)      env_cmd "$@";;
  config)   config_cmd "$@";;

  start)    start_cmd "$@";;
  guard)    guard_run "$@";;
  lint)     lint_cmd "$@";;
  test)     test_cmd "$@";;
  sync)     sync_cmd "$@";;
  send)     send_cmd "$@";;
  heal)     heal_cmd "$@";;
  clean)    clean_cmd "$@";;
  release)  release_cmd "$@";;
  version)  version_cmd "$@";;
  hooks)    hooks_cmd "$@";;
  quick)    quick_cmd "$@";;
  reload)   reload_cmd "$@";;
  init)     init_cmd "$@";;
  setup)    setup_cmd "$@";;

  help|-h|--help|"") usage;;
  *) die "Unbekanntes Kommando: ${SUB}";;
esac