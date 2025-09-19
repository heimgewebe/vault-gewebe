#!/usr/bin/env bash
# wgx – Weltgewebe CLI (v1.19.8) · Termux/WSL/macOS/Linux · origin-first
set -Eeuo pipefail
IFS=$'\n\t'
umask 077
shopt -s extglob nullglob

WGX_VERSION="1.19.8"

# ───────── Plattform / Utils ─────────
is_termux(){ case "${PREFIX-}" in */com.termux/*) return 0;; *) return 1;; esac; }
is_wsl(){ uname -r 2>/dev/null | grep -qiE 'microsoft|wsl2?'; }
is_codespace(){ [[ -n "${CODESPACE_NAME-}" ]]; }
has(){ command -v "$1" >/dev/null 2>&1; }

ROOT(){
  local here="${BASH_SOURCE[0]}"
  # Symlinks auflösen (GNU/BSD + coreutils/macOS greadlink)
  if command -v greadlink >/dev/null 2>&1; then
    here="$(greadlink -f "$here")"
  elif command -v readlink >/dev/null 2>&1; then
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
  # Fallback: eine Ebene über dem Skript
  local fallback; fallback="$(cd "$(dirname "$here")/.." && pwd -P)"
  local r; r="$(git -C "${PWD}" rev-parse --show-toplevel 2>/dev/null || true)"
  [[ -n "$r" ]] && printf "%s" "$r" || printf "%s" "$fallback"
}
ROOT_DIR="$(ROOT)"; cd "$ROOT_DIR" >/dev/null 2>&1 || true

NOCLR=0
for a in "$@"; do [[ "$a" == "--no-color" ]] && NOCLR=1; done
if [[ -t 1 && -z "${NO_COLOR-}" && $NOCLR -eq 0 ]]; then c0=$'\e[0m'; cG=$'\e[32m'; cY=$'\e[33m'; cR=$'\e[31m'; else c0= ; cG= ; cY= ; cR= ; fi
toast(){ is_termux && has termux-toast && termux-toast "$*"; }
ok(){ printf "${cG}✅ %s${c0}\n" "$*"; }
info(){ printf "• %s\n" "$*"; }
warn(){ printf "${cY}⚠ %s${c0}\n" "$*"; toast "wgx: $*"; }
die(){ printf "${cR}❌ %s${c0}\n" "$*" >&2; toast "wgx: $*"; exit "${2:-1}"; }
trap 'ec=$?; ln=$LINENO; ((ec)) && printf "${cR}❌ wgx: Fehler (Zeile %s, Code=%s)${c0}\n" "$ln" "$ec" >&2' ERR

[[ "${EUID-}" -eq 0 && "${WGX_ALLOW_ROOT:-0}" != "1" ]] && die "wgx nicht als root ausführen (WGX_ALLOW_ROOT=1 zum Überspringen)."

# ───────── Config / Defaults ─────────
WGX_BASE="${WGX_BASE:-main}"
WGX_SIGNING="${WGX_SIGNING:-auto}"           # auto|off|ssh|gpg
WGX_PREVIEW_DIFF_LINES="${WGX_PREVIEW_DIFF_LINES:-120}"
WGX_PR_LABELS="${WGX_PR_LABELS:-}"
WGX_CI_WORKFLOW="${WGX_CI_WORKFLOW:-CI}"
TIMEOUT="${TIMEOUT:-25}"
ASSUME_YES=0; DRYRUN=0; VERBOSE=0; OFFLINE="${WGX_OFFLINE:-0}"; NOTIMEOUT=0
: "${WGX_ASSUME_YES:=0}"; : "${WGX_DRAFT_ON_WARN:=0}"

conf_read(){
  local f line k v
  for f in "$ROOT_DIR/.wgx.conf" "$HOME/.config/wgx/config"; do
    [[ -f "$f" ]] || continue
    while IFS= read -r line || [[ -n "$line" ]]; do
      [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
      [[ "$line" != *"="* ]] && continue
      k="${line%%=*}"; v="${line#*=}"
      # inline-Kommentar entfernen
      v="${v%%#*}"
      # trim key & value
      k="${k#"${k%%[![:space:]]*}"}"; k="${k%"${k##*[![:space:]]}"}"
      v="${v#"${v%%[![:space:]]*}"}"; v="${v%"${v##*[![:space:]]}"}"
      case "$k" in
        WGX_BASE) WGX_BASE="$v";;
        WGX_PR_LABELS) WGX_PR_LABELS="$v";;
        WGX_PREVIEW_DIFF_LINES) WGX_PREVIEW_DIFF_LINES="$v";;
        WGX_SIGNING) WGX_SIGNING="$v";;
        WGX_ASSUME_YES) WGX_ASSUME_YES="$v";;
        WGX_DRAFT_ON_WARN) WGX_DRAFT_ON_WARN="$v";;
        WGX_CI_WORKFLOW) WGX_CI_WORKFLOW="$v";;
        WGX_OFFLINE) OFFLINE="$v";;
        WGX_PM)
          if [[ -n "$v" ]]; then
            if [[ "$v" =~ ^(pnpm|npm|yarn)$ ]]; then WGX_PM="$v"; else warn "Ungültiger WGX_PM: $v (ignoriere)"; fi
          fi
          ;;
      esac
    done < "$f"
  done
  case "$WGX_SIGNING" in auto|off|ssh|gpg) :;; *) warn "Ungültiger WGX_SIGNING: $WGX_SIGNING (nutze auto)"; WGX_SIGNING="auto";; esac
}
conf_read

# Booleans + numerische Werte normalisieren
case "${OFFLINE:-0}" in 1) OFFLINE=1;; *) OFFLINE=0;; esac
case "${WGX_ASSUME_YES:-0}" in 1) WGX_ASSUME_YES=1;; *) WGX_ASSUME_YES=0;; esac
(( WGX_ASSUME_YES )) && ASSUME_YES=1
[[ "$TIMEOUT" =~ ^[0-9]+$ ]] || TIMEOUT=25
[[ "$WGX_PREVIEW_DIFF_LINES" =~ ^[0-9]+$ ]] || WGX_PREVIEW_DIFF_LINES=120

detect_base(){
  local ref; ref="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)"
  if [[ -n "$ref" ]]; then local def="${ref#origin/}"; if [[ "${WGX_BASE}" == "main" || -z "${WGX_BASE}" ]]; then WGX_BASE="$def"; fi; fi
}

PLATFORM="linux"
env_detect(){
  if is_termux; then PLATFORM="termux"
  elif is_wsl; then PLATFORM="wsl"
  elif [[ "$OSTYPE" == darwin* ]]; then PLATFORM="mac"
  elif is_codespace; then PLATFORM="codespaces"
  else PLATFORM="linux"; fi
  detect_base
  (( VERBOSE )) && info "Env: platform=$PLATFORM base=$WGX_BASE offline=$OFFLINE codespaces=$(is_codespace && echo yes || echo no)"
}
env_detect

# ───────── Git-Repo Guard + Helpers ─────────
is_git_repo(){
  if git rev-parse --git-dir >/dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}
require_repo(){ is_git_repo || die "Kein Git-Repo unter: $ROOT_DIR"; }

git_branch(){ is_git_repo || { echo "HEAD"; return 0; }; git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "HEAD"; }
git_remote_url(){ is_git_repo || { echo ""; return 0; }; git remote get-url origin 2>/dev/null || echo ""; }
git_in_progress(){ [[ -d .git/rebase-merge || -d .git/rebase-apply || -f .git/MERGE_HEAD ]]; }

_hash_path(){
  local s="$1" h=""
  if has sha256sum; then h="$(printf '%s' "$s" | sha256sum | awk '{print $1}')"
  elif has shasum; then h="$(printf '%s' "$s" | shasum -a 256 | awk '{print $1}')"
  elif has openssl; then h="$(printf '%s' "$s" | openssl dgst -sha256 2>/dev/null | awk '{print $NF}')"
  elif has md5; then h="$(printf '%s' "$s" | md5 2>/dev/null | awk '{print $NF}')"
  elif has md5sum; then h="$(printf '%s' "$s" | md5sum | awk '{print $1}')"
  elif has uuidgen; then h="$(uuidgen | tr -d '-')"
  else h="$(printf '%s%s' "$(date +%s)" "$$")"; fi
  printf "%s" "$h"
}

_fetch_guard(){
  (( OFFLINE )) && return 0
  local mark="${TMPDIR:-/tmp}/.wgx_fetch_$(_hash_path "$ROOT_DIR")"
  local now; now="$(date +%s)"
  local last=0
  [[ -f "$mark" ]] && last="$(cat "$mark" 2>/dev/null || echo 0)"
  if (( now - last >= 60 )); then
    git fetch -q --prune >/dev/null 2>&1 || true
    printf '%s' "$now" > "$mark" 2>/dev/null || true
  fi
}

AHEAD_WARNED=0
git_ahead_behind(){
  is_git_repo || { echo "0 0"; return 0; }
  if (( OFFLINE )); then
    (( AHEAD_WARNED==0 )) && { warn "Offline: ahead/behind ggf. veraltet (kein fetch)."; AHEAD_WARNED=1; }
  fi
  _fetch_guard
  local br="$1"
  if git rev-parse --verify -q "origin/$br" >/dev/null; then
    git rev-list --left-right --count "origin/$br...$br" 2>/dev/null || echo "0 0"
  else echo "0 0"; fi
}
git_rebase_on_base(){ is_git_repo || return 0; _fetch_guard; git rev-parse --verify -q "origin/$WGX_BASE" >/dev/null || return 0; git rebase "origin/$WGX_BASE"; }

# host + compare URL helper
remote_host_path(){
  local url; url="$(git_remote_url)"; [[ -z "$url" ]] && return 1
  # CR/Whitespace säubern
  url="${url//$'\r'/}"; url="${url//[$'\t\r\n ']/}"
  url="${url%.git}"
  local host path
  case "$url" in
    git@*:* ) host="${url%%:*}"; host="${host#git@}"; path="${url#*:}";;
    ssh://git@*:*/* ) # ssh mit Port: ssh://git@host:2222/org/repo
      host="${url#ssh://git@}"; host="${host%%/*}"; path="${url#ssh://git@${host}/}"
      ;;
    ssh://git@*/* )   # ssh ohne Port
      host="${url#ssh://git@}"; host="${host%%/*}"; path="${url#ssh://git@${host}/}"
      ;;
    https://*:*/* )   # https mit Port
      host="${url#https://}"; host="${host%%/*}"; path="${url#https://${host}/}"
      ;;
    https://*/* )     # https ohne Port
      host="${url#https://}"; host="${host%%/*}"; path="${url#https://${host}/}"
      ;;
    http://*:*/* )    # http mit Port
      host="${url#http://}";  host="${host%%/*}"; path="${url#http://${host}/}"
      ;;
    http://*/* )      # http ohne Port
      host="${url#http://}";  host="${host%%/*}"; path="${url#http://${host}/}"
      ;;
    * ) return 1;;
  esac
  # sanity-trim
  host="${host//[$'\t\r\n ']/}"; path="${path//[$'\t\r\n ']/}"
  printf "%s %s" "$host" "$path"
}

compare_url(){
  is_git_repo || return 0
  local hp host path ref base
  hp="$(remote_host_path || true)"; [[ -z "$hp" ]] && return 0
  host="${hp%% *}"; path="${hp#* }"; ref="$(git_branch)"; base="$WGX_BASE"
  case "$host" in
    github.com)    echo "https://github.com/${path}/compare/${base}...${ref}";;
    gitlab.com)    echo "https://gitlab.com/${path}/-/compare/${base}...${ref}";;
    bitbucket.org) echo "https://bitbucket.org/${path}/branches/compare/${base}..${ref}";;
    *) echo "https://${host}/${path}";;
  esac
}

# ───────── Repo-Erkennung ─────────
detect_api_dir(){
  # erlaubt absolute UND repo-relative Pfade
  local d
  for d in "${WGX_API_DIR:-}" "apps/api" "api" "server" "backend" "crates/api"; do
    [[ -z "$d" ]] && continue
    if [[ "$d" = /* ]]; then
      [[ -f "$d/Cargo.toml" ]] && { printf '%s' "$d"; return 0; }
    else
      [[ -f "$ROOT_DIR/$d/Cargo.toml" ]] && { printf '%s' "$ROOT_DIR/$d"; return 0; }
    fi
  done
  return 1
}
detect_web_dir(){
  local d
  for d in "${WGX_WEB_DIR:-}" "apps/web" "web" "frontend" "ui" "packages/web"; do
    [[ -z "$d" ]] && continue
    if [[ "$d" = /* ]]; then
      [[ -f "$d/package.json" ]] && { printf '%s' "$d"; return 0; }
    else
      [[ -f "$ROOT_DIR/$d/package.json" ]] && { printf '%s' "$ROOT_DIR/$d"; return 0; }
    fi
  done
  return 1
}

# ───────── Helpers ─────────
to_lower(){ printf "%s" "$1" | tr '[:upper:]' '[:lower:]'; }
trim(){ local s="$1"; s="${s#"${s%%[![:space:]]*}"}"; s="${s%"${s##*[![:space:]]}"}"; printf "%s" "$s"; }

# robust: kein Here-String nötig
read_supports_timeout(){ ( read -t 0 </dev/null ) 2>/dev/null; }

READ_TIMEOUT_WARNED=0
read_prompt(){
  local __var="$1" __msg="$2" __def="${3:-}" ans=""
  if (( NOTIMEOUT )); then
    read -r -p "$__msg " ans || ans="$__def"
    printf -v "$__var" '%s' "$ans"
    return 0
  fi
  if read_supports_timeout; then
    if read -r -t "$TIMEOUT" -p "$__msg " ans; then :; else ans="$__def"; fi
  else
    if (( TIMEOUT>0 && READ_TIMEOUT_WARNED==0 )); then
      warn "read-Timeout nicht verfügbar (ältere Bash). Prompt wartet unbegrenzt."
      READ_TIMEOUT_WARNED=1
    fi
    # minimaler, subshell-armer Timeout-Pfad
    if has timeout; then
      ans="$(timeout "$TIMEOUT" bash -c 'read -r -p "$1 " v || true; printf "%s" "$v"' _ "$__msg" 2>/dev/null || true)"
    elif has gtimeout; then
      ans="$(gtimeout "$TIMEOUT" bash -c 'read -r -p "$1 " v || true; printf "%s" "$v"' _ "$__msg" 2>/dev/null || true)"
    fi
    [[ -z "${ans-}" ]] && { read -r -p "$__msg " ans || ans="$__def"; }
  fi
  printf -v "$__var" '%s' "$ans"
}

XARGS_N="${XARGS_N:-100}"
run_with_files_xargs0(){
  local title="$1"; shift
  if (( DRYRUN )); then info "DRY: $title (xargs -0 -n ${XARGS_N} …)"; return 0; fi
  info "$title"
  # wenn stdin leer ist, kein leeres xargs starten
  if ! IFS= read -r -d '' _peek; then
    info "$title (keine Eingaben)"
    return 0
  fi
  { printf '%s\0' "$_peek"; cat; } | xargs -0 -n "${XARGS_N}" -- "$@"
  if [[ $? -eq 0 ]]; then ok "$title ✓"; return 0; else warn "$title ✗"; return 1; fi
}

mktemp_portable(){
  local prefix="${1:-wgx}" f=""
  # BSD-kompatibel: -t <prefix> (GNU akzeptiert das ebenfalls)
  if f="$(mktemp -t "${prefix}" 2>/dev/null)"; then printf "%s" "$f"; return 0; fi
  # GNU: -p <dir> <template>
  if f="$(mktemp -p "${TMPDIR:-/tmp}" "${prefix}.XXXXXX" 2>/dev/null)"; then printf "%s" "$f"; return 0; fi
  # Fallback: atomar anlegen, notfalls letzter simpler Pfad mit best effort
  local u; u="$(uuidgen 2>/dev/null || openssl rand -hex 16 2>/dev/null || printf '%s%s' "$(date +%s)" "$$")"
  f="${TMPDIR:-/tmp}/${prefix}.${u}"
  ( set -o noclobber; : > "$f" ) 2>/dev/null \
    || { f="${TMPDIR:-/tmp}/${prefix}.$$"; : > "$f" 2>/dev/null || true; }
  printf "%s" "$f"
}

# ───────── Globale Flags / Subcommand ─────────
if [[ "${1-}" == "--version" || "${1-}" == "-V" ]]; then
  echo "wgx v${WGX_VERSION}"
  exit 0
fi

# Hinweis: Keine toten GLOBAL_FLAGS – unbekannte globale Argumente werden geloggt.
while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes) ASSUME_YES=1;;
    --dry-run) DRYRUN=1;;
    --timeout) shift; [[ "${1-}" =~ ^[0-9]+$ ]] || die "--timeout braucht Zahl"; TIMEOUT="$1";;
    --no-timeout) NOTIMEOUT=1;;
    --verbose) VERBOSE=1;;
    --base) shift; WGX_BASE="${1-}";;
    --offline) OFFLINE=1;;
    --no-color) :;;
    send|sync|guard|heal|reload|clean|doctor|init|setup|lint|start|release|hooks|version|env|quick|config|test|help|-h|--help) break;;
    *) warn "Unbekanntes globales Argument ignoriert: $1";;
  esac
  shift || true
done
SUB="${1-}"; shift || true

logv(){ ((VERBOSE)) && printf "… %s\n" "$*"; }

# ───────── Scope / Messages ─────────
changed_files_cached(){
  require_repo
  git diff --cached --name-only -z | tr '\0' '\n' | sed '/^$/d'
}

# NUL-sicher: korrektes Parsing von Renames (altes + neues Ziel als getrennte NUL-Records)
changed_files_all(){
  require_repo
  local rec status path
  git status --porcelain -z \
  | while IFS= read -r -d '' rec; do
      status="${rec:0:2}"      # z.B. "R " oder " M"
      path="${rec:3}"          # Pfad ab Spalte 4
      if [[ "$status" =~ ^R ]]; then
        # Bei Rename folgt noch der neue Pfad als eigener NUL-Record
        IFS= read -r -d '' path || true
      fi
      [[ -n "$path" ]] && printf '%s\n' "$path"
    done
}

auto_scope(){
  local files="$1" major="repo" m_web=0 m_api=0 m_docs=0 m_infra=0 m_devx=0 total=0
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    ((total++))
    case "$f" in
      apps/web/*) ((m_web++));;
      apps/api/*|crates/*) ((m_api++));;
      infra/*|deploy/*) ((m_infra++));;
      scripts/*|wgx|.wgx.conf) ((m_devx++));;
      docs/*|*.md|styles/*|.vale.ini) ((m_docs++));;
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
now_ts(){ date +"%Y-%m-%d %H:%M"; }

# ───────── Vale / Sprache ─────────
vale_maybe(){
  [[ -f ".vale.ini" ]] || return 0
  has vale || { warn "Vale nicht installiert – Sprach-Checks übersprungen."; return 0; }
  local staged=0; [[ "${1-}" == "--staged" ]] && staged=1
  if (( staged )); then
    # keine staged .md → OK raus
    if ! git diff --cached --name-only -z -- '*.md' 2>/dev/null | { IFS= read -r -d '' _; }; then
      return 0
    fi
    git diff --cached --name-only -z -- '*.md' 2>/dev/null \
      | run_with_files_xargs0 "Vale (staged)" vale
    return $?
  else
    # keine .md im Repo → OK raus
    if [[ -z "$(git ls-files -z -- '*.md' 2>/dev/null | head -c1)" ]]; then
      return 0
    fi
    git ls-files -z -- '*.md' 2>/dev/null \
      | run_with_files_xargs0 "Vale (alle .md)" vale
    return $?
  fi
}

# ───────── Preflight (guard) ─────────
guard_run(){
  require_repo
  local FIX=0 LINT_OPT=0 TEST_OPT=0 DEEP_SCAN=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --fix) FIX=1;; --lint) LINT_OPT=1;; --test) TEST_OPT=1;; --deep-scan) DEEP_SCAN=1;;
    esac
    shift || true
  done

  local rc=0 br; br="$(git_branch)"
  echo "=== Preflight (branch: $br, base: $WGX_BASE) ==="

  if git_in_progress; then
    echo "[BLOCKER] rebase/merge läuft → wgx heal --continue | --abort"
    rc=2
  fi
  [[ "$br" == "HEAD" ]] && { echo "[WARN] Detached HEAD – Branch anlegen."; (( rc==0 )) && rc=1; }

  read -r behind ahead < <(git_ahead_behind "$br")
  if (( behind>0 )); then
    echo "[WARN] Branch $behind hinter origin/$br → rebase auf origin/$WGX_BASE"
    if (( FIX )); then { git_rebase_on_base || rc=2; }; fi
    (( rc==0 )) && rc=1
  fi

  # Konfliktmarker in modifizierten Dateien
  local with_markers=""
  while IFS= read -r -d '' f; do
    [[ -z "$f" ]] && continue
    grep -Eq '<<<<<<<|=======|>>>>>>>' -- "$f" 2>/dev/null && with_markers+="$f"$'\n'
  done < <(git ls-files -m -z)
  if [[ -n "$with_markers" ]]; then
    echo "[BLOCKER] Konfliktmarker:"
    printf '%s' "$with_markers" | sed 's/^/  - /'
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
        while IFS= read -r s; do
          [[ -n "$s" ]] && git restore --staged -- "$s" 2>/dev/null || true
        done <<< "$secrets"
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
        echo "[BLOCKER] möglicher Secret-Inhalt im Diff:"
        echo "$leaked" | sed 's/^/  > /'
        rc=2
      fi
    fi

    # >10MB warnen (ein Pass)
    local big_list=""
    while IFS= read -r f; do
      [[ -f "$f" ]] || continue
      local sz=0
      if stat -c %s "$f" >/dev/null 2>&1; then
        sz=$(stat -c %s "$f")
      elif stat -f%z "$f" >/dev/null 2>&1; then
        sz=$(stat -f%z "$f")
      else
        sz=$(wc -c < "$f" 2>/dev/null || echo 0)
      fi
      (( sz>10485760 )) && big_list+=$'  - '"$f"' ('"$sz"' B)\n'
    done <<< "$staged"
    if [[ -n "$big_list" ]]; then
      echo "[WARN] >10MB im Commit:"
      printf "%s" "$big_list"
      (( rc==0 )) && rc=1
    fi
  fi

  # Lockfile-Mix
  if git ls-files --error-unmatch pnpm-lock.yaml >/dev/null 2>&1 \
     && git ls-files --error-unmatch package-lock.json >/dev/null 2>&1; then
    echo "[WARN] pnpm-lock.yaml UND package-lock.json im Repo – Policy klären."
    (( rc==0 )) && rc=1
  fi

  # Vale (nur Rückgabecode bewerten; Ausgabe kommt aus vale_maybe)
  if [[ -f ".vale.ini" ]]; then
    vale_maybe --staged || (( rc==0 )) && rc=1
  fi

  case "$rc" in
    0) ok "Preflight sauber.";;
    1) warn "Preflight mit Warnungen.";;
    2) die "Preflight BLOCKER → bitte Hinweise beachten.";;
  esac
  return "$rc"
}

# ───────── Snapshot ─────────
snapshot_make(){
  require_repo
  # Nur Snapshot anlegen, wenn es überhaupt Änderungen gibt (staged/unstaged/untracked)
  if [[ -z "$(git status --porcelain -z 2>/dev/null | head -c1)" ]]; then
    info "Kein Snapshot nötig (Arbeitsbaum sauber)."
    return 0
  fi
  local msg="snapshot@$(date +%s) $(git_branch)"
  git stash push -u -m "$msg" >/dev/null 2>&1 || true
  info "Snapshot erstellt (git stash list)"
}

# ───────── Commit / Sync ─────────
maybe_sign_flag(){ case "${WGX_SIGNING}" in off) return 1;; ssh|gpg) echo "-S"; return 0;; auto) git config --get user.signingkey >/dev/null 2>&1 && echo "-S" && return 0 || return 1;; esac; }

sync_cmd(){
  require_repo
  local STAGED_ONLY=0 WIP=0 AMEND=0 SCOPE="auto" BASE="" signflag="" had_upstream=0
  while [[ $# -gt 0 ]]; do case "$1" in --staged-only) STAGED_ONLY=1;; --wip) WIP=1;; --amend) AMEND=1;; --scope) shift; SCOPE="${1-}";; --base) shift; BASE="${1-}";; --sign) signflag="-S";; esac; shift || true; done
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

  _fetch_guard
  git rev-parse --verify -q "origin/$WGX_BASE" >/dev/null || die "Basisbranch origin/$WGX_BASE nicht gefunden (git fetch?)."
  git rebase "origin/$WGX_BASE" || { warn "Rebase-Konflikt → wgx heal rebase"; return 2; }

  if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then had_upstream=1; else had_upstream=0; fi
  if (( had_upstream )); then git push || die "Push fehlgeschlagen."
  else git push --set-upstream origin "$(git_branch)" || die "Push/Upstream fehlgeschlagen."; fi

  ok "Sync erledigt."; read -r behind ahead < <(git_ahead_behind "$(git_branch)"); info "Upstream: ahead=$ahead behind=$behind"
}

# ───────── Lint / Tests ─────────
pm_detect(){
  local wd="$1"
  if [[ -n "${WGX_PM-}" ]]; then
    if has "$WGX_PM"; then echo "$WGX_PM"; return 0
    else warn "WGX_PM=$WGX_PM nicht gefunden, Auto-Detect aktiv."; fi
  fi
  if [[ -f "$wd/pnpm-lock.yaml" ]] && has pnpm; then echo "pnpm"
  elif [[ -f "$wd/package-lock.json" ]] && has npm; then echo "npm"
  elif [[ -f "$wd/yarn.lock" ]] && has yarn; then echo "yarn"
  elif [[ -f "$wd/package.json" ]]; then has pnpm && echo "pnpm" || has npm && echo "npm" || has yarn && echo "yarn" || echo ""
  else echo ""; fi
}

# robust gegen fehlende Args unter set -u
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
  return "$rc"
}

git_supports_magic(){ git -C "$1" ls-files -z -- ':(exclude)node_modules/**' >/dev/null 2>&1; }

lint_cmd(){
  require_repo
  local rc_total=0

  if [[ -f ".vale.ini" ]]; then
    if [[ -n "$(git ls-files -z -- '*.md' 2>/dev/null | head -c1)" ]]; then
      git ls-files -z -- '*.md' 2>/dev/null \
      | run_with_files_xargs0 "Vale (alle .md)" vale || rc_total=1
    fi
  fi

  if has markdownlint; then
    if [[ -n "$(git ls-files -z -- '*.md' 2>/dev/null | head -c1)" ]]; then
      git ls-files -z -- '*.md' 2>/dev/null \
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
    if find --version >/dev/null 2>&1; then
      find --version 2>/dev/null | grep -q GNU && has_gnu_find=1
    fi

    # Prettier
    if git_supports_magic "$wd" && (( has_gnu_find )); then
      git -C "$wd" ls-files -z \
        -- ':(exclude)node_modules/**' ':(exclude)dist/**' ':(exclude)build/**' \
           '*.js' '*.ts' '*.tsx' '*.jsx' '*.json' '*.css' '*.scss' '*.md' '*.svelte' 2>/dev/null \
      | run_with_files_xargs0 "Prettier Check" \
          sh -c 'cd "$1"; shift; '"$prettier_cmd"' -c -- "$@"' _ "$wd" \
      || { if (( OFFLINE )); then warn "Prettier übersprungen (offline)"; false; \
           else run_with_files_xargs0 "Prettier Check (fallback npx)" \
                  sh -c 'cd "$1"; shift; npx --yes prettier -c -- "$@"' _ "$wd"; fi; } \
      || rc_total=1
    else
      find "$wd" \( -path "$wd/node_modules" -o -path "$wd/dist" -o -path "$wd/build" \) -prune -o \
           -type f \( -name '*.js' -o -name '*.ts' -o -name '*.tsx' -o -name '*.jsx' -o -name '*.json' -o -name '*.css' -o -name '*.scss' -o -name '*.md' -o -name '*.svelte' \) -print0 \
      | while IFS= read -r -d '' f; do rel="${f#$wd/}"; printf '%s\0' "$rel"; done \
      | run_with_files_xargs0 "Prettier Check" \
          sh -c 'cd "$1"; shift; '"$prettier_cmd"' -c -- "$@"' _ "$wd" \
      || { if (( OFFLINE )); then warn "Prettier übersprungen (offline)"; false; \
           else run_with_files_xargs0 "Prettier Check (fallback npx)" \
                  sh -c 'cd "$1"; shift; npx --yes prettier -c -- "$@"' _ "$wd"; fi; } \
      || rc_total=1
    fi

    # ESLint (nur wenn Konfig vorhanden)
    local has_eslint_cfg=0
    [[ -f "$wd/.eslintrc" || -f "$wd/.eslintrc.js" || -f "$wd/.eslintrc.cjs" || -f "$wd/.eslintrc.json" \
       || -f "$wd/eslint.config.js" || -f "$wd/eslint.config.mjs" || -f "$wd/eslint.config.cjs" ]] && has_eslint_cfg=1
    if (( has_eslint_cfg )); then
      run_soft "ESLint" bash -c "cd '$wd' && $eslint_cmd -v >/dev/null 2>&1 && $eslint_cmd . --ext .js,.cjs,.mjs,.ts,.tsx,.svelte" \
      || { if (( OFFLINE )); then warn "ESLint übersprungen (offline)"; false; \
           else run_soft "ESLint (fallback npx)" \
                  bash -c "cd '$wd' && npx --yes eslint . --ext .js,.cjs,.mjs,.ts,.tsx,.svelte"; fi; } \
      || rc_total=1
    fi
  fi

  # Rust
  local ad; ad="$(detect_api_dir || true)"
  if [[ -n "$ad" && -f "$ad/Cargo.toml" && has cargo ]]; then
    run_soft "cargo fmt --check" bash -lc "cd '$ad' && cargo fmt --all -- --check" || rc_total=1
    if rustup component list 2>/dev/null | grep -q 'clippy.*(installed)'; then
      run_soft "cargo clippy (Hinweise)" bash -lc "cd '$ad' && cargo clippy --all-targets --all-features -q" || rc_total=1
    else
      warn "clippy nicht installiert – übersprungen."
    fi
  fi

  # Shell / Dockerfiles / Workflows
  if has shellcheck; then
    if [[ -n "$(git ls-files -z -- '*.sh' 2>/dev/null | head -c1)" || -f "./wgx" || -d "./scripts" ]]; then
      { git ls-files -z -- '*.sh' 2>/dev/null; git ls-files -z -- 'wgx' 'scripts/*' 2>/dev/null; } \
      | run_with_files_xargs0 "shellcheck" shellcheck || rc_total=1
    fi
  fi
  if has hadolint; then
    if [[ -n "$(git ls-files -z -- '*Dockerfile*' 2>/dev/null | head -c1)" ]]; then
      git ls-files -z -- '*Dockerfile*' 2>/dev/null \
      | run_with_files_xargs0 "hadolint" hadolint || rc_total=1
    fi
  fi
  if has actionlint && [[ -d ".github/workflows" ]]; then run_soft "actionlint" actionlint || rc_total=1; fi

  (( rc_total==0 )) && ok "Lint OK" || warn "Lint mit Hinweisen (rc=$rc_total)."
  return "$rc_total"
}

pm_test(){ local wd="$1"; local pm; pm="$(pm_detect "$wd")"; case "$pm" in pnpm) (cd "$wd" && pnpm -s test -s) ;; npm) (cd "$wd" && npm test -s) ;; yarn) (cd "$wd" && yarn -s test) ;; *) return 0;; esac; }

test_cmd(){
  require_repo
  local rc_web=0 rc_api=0 wd ad pid_web= pid_api=
  trap '[[ -n "${pid_web-}" ]] && kill "$pid_web" 2>/dev/null || true; [[ -n "${pid_api-}" ]] && kill "$pid_api" 2>/dev/null || true' INT
  wd="$(detect_web_dir || true)"; ad="$(detect_api_dir || true)"
  if [[ -n "$wd" && -f "$wd/package.json" ]]; then
    info "Web-Tests…"; ( pm_test "$wd" ) & pid_web=$!
  fi
  if [[ -n "$ad" && -f "$ad/Cargo.toml" && has cargo ]]; then
    info "Rust-Tests…"; ( cd "$ad" && cargo test --all --quiet ) & pid_api=$!
  fi
  if [[ -n "${pid_web-}" ]]; then wait "$pid_web" || rc_web=1; fi
  if [[ -n "${pid_api-}" ]]; then wait "$pid_api" || rc_api=1; fi
  (( rc_web==0 && rc_api==0 )) && ok "Tests OK" || { [[ $rc_web -ne 0 ]] && warn "Web-Tests fehlgeschlagen."; [[ $rc_api -ne 0 ]] && warn "Rust-Tests fehlgeschlagen."; return 1; }
}

# ───────── CODEOWNERS / Labels ─────────
_codeowners_file(){
  if [[ -f ".github/CODEOWNERS" ]]; then echo ".github/CODEOWNERS"
  elif [[ -f "CODEOWNERS" ]]; then echo "CODEOWNERS"
  else echo ""; fi
}
declare -a CODEOWNERS_PATTERNS=(); declare -a CODEOWNERS_OWNERS=()

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

_codeowners_reviewers(){ # liest \n-separierte Pfade von stdin
  CODEOWNERS_PATTERNS=(); CODEOWNERS_OWNERS=()
  local cof; cof="$(_codeowners_file)"; [[ -z "$cof" ]] && return 0
  local default_owners=() line
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
      CODEOWNERS_PATTERNS+=("$pat")
      CODEOWNERS_OWNERS+=("$(printf "%s " "${arr[@]}")")
    fi
  done < "$cof"

  local files=() f
  while IFS= read -r f; do [[ -n "$f" ]] && files+=("$f"); done

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
      [[ -z "$o" || "$o" == */* ]] && continue   # Teams (org/team) bewusst ausgelassen
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
  local subj; subj="$(git log -1 --pretty=%s 2>/dev/null || true)"
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
  local joined; local IFS=,; joined="${L[*]}"           # Array → komma-getrennt
  printf '%s\n' "$(_sanitize_csv "$joined")"
}

# ───────── PR/MR (send) ─────────
render_pr_body(){
  local TITLE="$1" SUMMARY="$2" WHY="$3" TESTS="$4" ISSUES="$5" NOTES="$6"
  local tpl=""
  if [[ -f ".wgx/pr_template.md" ]]; then
    tpl="$(cat .wgx/pr_template.md)"
  elif [[ -f ".github/pull_request_template.md" ]]; then
    tpl="$(cat .github/pull_request_template.md)"
  else
    tpl=$'*Zweck*\n{{SUMMARY}}\n\n*Änderungen*\n{{CHANGES}}\n\n*Warum*\n{{WHY}}\n\n*Tests*\n{{TESTS}}\n\n*Issues*\n{{ISSUES}}\n\n*Notizen*\n{{NOTES}}\n'
  fi
  local CHANGES=""
  if git rev-parse --verify -q "origin/$WGX_BASE" >/dev/null; then
    CHANGES="$(git diff --name-status "origin/$WGX_BASE"...HEAD | head -n "$WGX_PREVIEW_DIFF_LINES")"
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
  local DRAFT=0 TITLE="" WHY="" TESTS="" NOTES="" SCOPE="auto" LABELS="$WGX_PR_LABELS" ISSUE="" BASE="" SYNC_FIRST=1 SIGN=0 INTERACTIVE=0 REVIEWERS="" TRIGGER_CI=0 OPEN_PR=0
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
  esac; shift || true; done
  [[ -n "$BASE" ]] && WGX_BASE="$BASE"

  guard_run; local rc=$?
  (( rc==1 && (ASSUME_YES || WGX_DRAFT_ON_WARN) )) && DRAFT=1

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
    local tmpf; tmpf="$(mktemp_portable wgx-pr)"
    printf "%s" "$body" > "$tmpf"
    # Editor-Aufruf robust (z.B. "code -w"):
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
    github)
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
    *)
      # Unbekannter Host: nur Vergleichs-URL + Daten ausgeben
      local url; url="$(compare_url)"
      echo "Unbekannter Git-Host – bitte PR/MR manuell erstellen:"
      echo "URL: $url"
      echo "Labels: $LABELS"
      echo "--- PR Text ---"
      echo "$body"
      ;;
  esac
}

# ───────── Heal / Reload / Clean / Doctor / Init / Setup / Start ─────────
heal_cmd(){
  require_repo
  local MODE="${1-}"; shift || true
  local STASH=0 CONT=0 ABORT=0 BASE=""
  while [[ $# -gt 0 ]]; do case "$1" in --stash) STASH=1;; --continue) CONT=1;; --abort) ABORT=1;; --base) shift; BASE="${1-}";; esac; shift || true; done
  [[ -n "$BASE" ]] && WGX_BASE="$BASE"
  (( ABORT )) && { git rebase --abort 2>/dev/null || git merge --abort 2>/dev/null || true; ok "Abgebrochen."; return 0; }
  (( CONT )) && { git add -A; git rebase --continue || die "continue fehlgeschlagen."; ok "Rebase fortgesetzt."; return 0; }
  (( STASH )) && snapshot_make
  _fetch_guard
  case "$MODE" in
    ""|rebase) git rev-parse --verify -q "origin/$WGX_BASE" >/dev/null || die "Basisbranch origin/$WGX_BASE nicht gefunden."; git rebase "origin/$WGX_BASE" || { warn "Konflikte. Löse sie, dann: wgx heal --continue | --abort"; return 2; } ;;
    ours)      git merge -X ours   "origin/$WGX_BASE" || { warn "Konflikte. manuell lösen + commit"; return 2; } ;;
    theirs)    git merge -X theirs "origin/$WGX_BASE" || { warn "Konflikte. manuell lösen + commit"; return 2; } ;;
    ff-only)   git merge --ff-only "origin/$WGX_BASE" || { warn "Fast-Forward nicht möglich."; return 2; } ;;
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
  local SAFE=1 BUILD=0 GIT=0 DEEP=0 ans ans2
  while [[ $# -gt 0 ]]; do case "$1" in --safe) SAFE=1;; --build) BUILD=1;; --git) GIT=1;; --deep) DEEP=1;; esac; shift; done
  (( SAFE || BUILD || GIT || DEEP )) || SAFE=1
  if (( DEEP && ASSUME_YES==0 )); then
    read_prompt ans "⚠ Tiefenreinigung (git clean -xfd). Sicher? [y/N]" "n"
    [[ "$(to_lower "$ans")" == "y" ]] || { warn "abgebrochen."; return 1; }
    read_prompt ans2 "Snapshot vorher erstellen? [Y/n]" "y"
    [[ "$(to_lower "$ans2")" == "n" ]] || snapshot_make
  fi
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
    # führende Leerzeichen / Stern entfernen, geschützte Branches auslassen
    if (( DRYRUN )); then
      git branch --merged \
      | grep -Ev '^\*|[[:space:]](main|master|dev)$' \
      | sed 's/^[*[:space:]]*//' \
      | while IFS= read -r b; do [[ -n "$b" ]] && printf 'DRY: git branch -d -- %q\n' "$b"; done
    else
      git branch --merged \
      | grep -Ev '^\*|[[:space:]](main|master|dev)$' \
      | sed 's/^[*[:space:]]*//' \
      | while IFS= read -r b; do [[ -n "$b" ]] && git branch -d "$b" 2>/dev/null || true; done
    fi
    do_git remote prune origin >/dev/null 2>&1 || true
  fi

  (( DEEP )) && do_git clean -xfd
  ok "Clean $( ((DRYRUN)) && echo '(Preview) ' )fertig."
}

doctor_cmd(){
  local in_repo=1; is_git_repo || in_repo=0
  local sub="${1-}"; shift || true
  case "$sub" in
    clean)
      ((in_repo)) || die "Nicht im Git-Repo."
      DRYRUN=1; clean_cmd --safe --build --git
      local a=""; read_prompt a "Scharf ausführen? [y/N]" "n"
      [[ "$(to_lower "$a")" == "y" ]] && { DRYRUN=0; clean_cmd --safe --build --git; }
      return 0
      ;;
    heal)
      ((in_repo)) || die "Nicht im Git-Repo."
      heal_cmd rebase; return $?
      ;;
  esac
  local br web api ahead behind
  if ((in_repo)); then
    br="$(git_branch)"; web="$(detect_web_dir || true)"; api="$(detect_api_dir || true)"
    read -r behind ahead < <(git_ahead_behind "$br")
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
  (( OFFLINE )) && echo "mode : offline (fetch/pull werden übersprungen; Upstream-Infos evtl. veraltet)"
  ok "Doctor OK"
}

init_cmd(){
  [[ -f ".wgx.conf" ]] && warn ".wgx.conf existiert bereits." || {
    cat > .wgx.conf <<EOF
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

  git fetch origin "$WGX_BASE" 2>/dev/null || true
  local base_ref="origin/$WGX_BASE"
  git rev-parse --verify -q "$base_ref" >/dev/null || base_ref="$WGX_BASE"
  git rev-parse --verify -q "$base_ref" >/dev/null || die "Basisbranch $WGX_BASE nicht gefunden (weder lokal noch origin/)."

  slug="${slug//[^a-zA-Z0-9._-]/-}"
  slug="${slug//../.}"        # fix: „..” → „.” 
  slug="${slug##+(-)}"; slug="${slug%%+(-)}"
  [[ -z "$slug" ]] && die "leerer Branch-Name."

  local name; name="${slug}"
  [[ -n "$issue" ]] && name="feat-${issue}-${slug}"
  # Kollabiere doppelte Minus sauber
  shopt -s extglob
  name="${name//+(-)/-}"
  shopt -u extglob
  # Git-Reservierungen entschärfen
  name="${name//@\{/-}"
  [[ "$name" == *.lock ]] && name="${name%.lock}-lock"

  git check-ref-format --branch "$name" || die "Ungültiger Branch-Name: $name"
  git checkout -b "$name" "$base_ref" || die "Branch konnte nicht erstellt werden."
  ok "Branch '$name' von $base_ref erstellt und ausgecheckt."
}

# ───────── Release / Version ─────────
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
_last_semver_tag(){ git tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -n1 || true; }
_last_tag(){ _last_semver_tag || git describe --tags --abbrev=0 2>/dev/null || git describe --tags --always 2>/dev/null || echo "v0.0.0"; }

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
    notes_file="$(mktemp_portable wgx-notes)"; printf "%s\n" "$notes_text" > "$notes_file"
  else
    [[ -f "$NOTES" ]] || die "--notes Datei nicht gefunden: $NOTES"
    notes_file="$NOTES"
  fi
  [[ -z "$notes_file" ]] && { notes_file="$(mktemp_portable wgx-notes)"; printf "Release %s\n" "$VERSION" > "$notes_file"; }

  git rev-parse -q --verify "refs/tags/$VERSION" >/dev/null && die "Tag $VERSION existiert bereits."
  if (( SIGN_TAG )); then
    git tag -s "$VERSION" -m "$VERSION" || die "Signiertes Tag fehlgeschlagen."
  else
    git tag -a "$VERSION" -m "$VERSION" || die "Tagging fehlgeschlagen."
  fi
  ok "Git-Tag $VERSION erstellt."
  (( PUSH )) && { git push origin "$VERSION" || die "Tag Push fehlgeschlagen."; ok "Tag gepusht."; }

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
        local latest_flag=()
        (( LATEST )) && latest_flag+=(--latest)
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
      [[ -n "$web" && -f "$web/package.json" ]] && _pkg_json_set_ver "$web/package.json" "$nv"
      [[ -n "$api" && -f "$api/Cargo.toml" ]] && _cargo_set_ver "$api" "$nv"
      local do_commit=0; for a in "$@"; do [[ "$a" == "--commit" ]] && do_commit=1; done
      (( do_commit )) && { git add -A && git commit -m "chore(version): bump to v$nv"; }
      ok "Version bump → v$nv"
      ;;
    set)
      local v="$1"; shift || true
      [[ -n "$v" ]] || die "version set vX.Y.Z"
      [[ "$v" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "Ungültige Version: $v"
      v="${v#v}"
      local web api; web="$(detect_web_dir || true)"; api="$(detect_api_dir || true)"
      [[ -n "$web" && -f "$web/package.json" ]] && _pkg_json_set_ver "$web/package.json" "$v"
      [[ -n "$api" && -f "$api/Cargo.toml" ]] && _cargo_set_ver "$api" "$v"
      local do_commit=0; for a in "$@"; do [[ "$a" == "--commit" ]] && do_commit=1; done
      (( do_commit )) && { git add -A && git commit -m "chore(version): set v$v"; }
      ok "Version gesetzt → v$v"
      ;;
    *) die "Usage: wgx version bump [patch|minor|major] [--commit] | wgx version set vX.Y.Z [--commit]";;
  esac
}

# ───────── Hooks ─────────
hooks_cmd(){
  require_repo
  local sub="${1-}"; shift || true
  case "$sub" in
    install)
      mkdir -p .git/hooks

      # pre-push: Guard ausführen, Exitcode korrekt weiterreichen
      cat > .git/hooks/pre-push <<'H'
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

# set -e kurz aus, Exitcode sicher einfangen
set +e
"$ROOT/wgx" guard --lint --test
rc=$?
set -e

case $rc in
  0|1) exit 0;;   # Warnungen blockieren den Push nicht
  2)   exit 1;;   # BLOCKER → Push verhindern
  *)   exit "$rc";;
esac
H
      chmod +x .git/hooks/pre-push

      # prepare-commit-msg: Scope nur aus STAGED Dateien, NUL-sicher (Rename-Ziele via --name-only)
      cat > .git/hooks/prepare-commit-msg <<'H'
#!/usr/bin/env bash
set -euo pipefail

# Merge/Squash/Amend-Commits nicht anfassen:
case "${2-}" in
  merge|squash|commit) exit 0;;
esac

MSGFILE="$1"

scope="$(
  git diff --cached --name-only -z --diff-filter=ACMR \
  | tr '\0' '\n' \
  | awk -F/ '
      /^apps\/web\//{w++}
      /^apps\/api\//{a++}
      /^infra\//{i++}
      /^scripts\//{d++}
      /\.md$/{m++}
      END{
        mx="meta"; mv=0
        if(w>mv){mx="web";mv=w}
        if(a>mv){mx="api";mv=a}
        if(i>mv){mx="infra";mv=i}
        if(d>mv){mx="devx";mv=d}
        if(m>mv){mx="docs";mv=m}
        print mx
      }'
)"

# Nur echte Zeilenanfänge „scope:“ ergänzen (Body bleibt unberührt)
if ! grep -qiE '^scope:' "$MSGFILE" 2>/dev/null; then
  printf "\nscope:%s\n" "$scope" >> "$MSGFILE"
fi
H
      chmod +x .git/hooks/prepare-commit-msg

      ok "Hooks installiert (pre-push, prepare-commit-msg)."
      ;;
    *) die "Usage: wgx hooks install";;
  esac
}

# ───────── Env (inkl. Termux) ─────────
env_doctor_termux(){
  echo "=== wgx env doctor (Termux) ==="
  echo "PREFIX : ${PREFIX-}"
  echo "storage: $([[ -d "$HOME/storage" ]] && echo present || echo missing)"
  [[ ! -d "$HOME/storage" ]] && echo "Hinweis: termux-setup-storage ausführen, dann Termux neu starten."

  # Basis-Pakete
  for p in git gh glab jq curl wget unzip zsh; do
    if has "$p"; then
      echo "pkg:$p OK"
    else
      echo "pkg:$p fehlt → pkg install $p"
    fi
  done

  # Node-Variante
  local ok_found=0
  for p in node nodejs nodejs-lts; do
    if has "$p"; then
      echo "node OK ($(node -v 2>/dev/null))"
      ok_found=1
      break
    fi
  done
  (( ok_found )) || echo "node fehlt → pkg install nodejs-lts (empfohlen)"

  if has rustc; then echo "rust OK ($(rustc -V 2>/dev/null))"; else echo "rust fehlt → pkg install rust"; fi
  if has cargo;  then echo "cargo OK ($(cargo -V 2>/dev/null))"; fi
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
      if has termux-setup-storage; then
        termux-setup-storage || true
      else
        warn "termux-setup-storage nicht verfügbar."
      fi
      echo "Termux ggf. neu starten."
    fi
  fi

  local need=()
  for p in git gh glab jq curl wget unzip zsh; do
    if ! has "$p"; then need+=("$p"); fi
  done
  if ((${#need[@]})); then
    read_prompt ans "Fehlende Basis-Pakete installieren (${need[*]})? [Y/n]" "y"
    if [[ "$(to_lower "$ans")" != "n" ]]; then
      pkg install -y "${need[@]}" || true
    fi
  fi

  if ! git config --get core.filemode >/dev/null 2>&1; then
    read_prompt ans "git core.filemode=false setzen (empfohlen auf Android)? [Y/n]" "y"
    if [[ "$(to_lower "$ans")" != "n" ]]; then
      git config core.filemode false || true
    fi
  fi

  ok "Termux-Fixes angewendet (sofern bestätigt)."
}

env_doctor_generic(){
  echo "=== wgx env doctor ($PLATFORM) ==="
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
  if [[ "${1-}" == "--fix" ]]; then
    fix=1
    shift || true
  fi
  case "$sub" in
    doctor|"")
      if [[ "$PLATFORM" == "termux" ]]; then
        env_doctor_termux
        (( fix )) && env_fix_termux
      else
        env_doctor_generic
        (( fix )) && warn "--fix ist für Termux optimiert; auf $PLATFORM ohne Wirkung."
      fi
      ;;
    *) die "Usage: wgx env doctor [--fix]";;
  esac
}

# ───────── QUICK / CONFIG / TEST ─────────
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
      # Schlüssel für grep sicher escapen (Regex-Metazeichen)
      local k_re
      k_re="$(printf '%s' "$k" | sed 's/[][().^$*+?{}|\\]/\\&/g')"
      local v_esc="${v//&/\\&}"; v_esc="${v_esc//\//\\/}"
      if grep -q -E "^${k_re}=" ".wgx.conf"; then
        sed -i.bak "s|^${k_re}=.*|${k}=${v_esc}|" ".wgx.conf" && rm -f ".wgx.conf.bak"
      else
        printf "%s=%s\n" "$k" "$v_esc" >> ".wgx.conf"
      fi
      ok "gesetzt: ${k}=${v}"
      ;;
    *) die "Usage: wgx config [show] | set KEY=VALUE";;
  esac
}

test_cmd_entry(){ test_cmd; }

# ───────── Help / Router ─────────
usage(){
cat <<EOF
wgx – v${WGX_VERSION}
Kurz:
  wgx quick [-i]             # Guard → Lint/Test → Sync → PR/MR (Warnungen → Draft) → CI + Browser
  wgx send [--ci] [--open]   # Preflight → Sync → PR/MR (+ --reviewers auto|user1,user2, -i für Editor)
  wgx guard --lint --test    # Preflight + Lint + Tests  [--deep-scan]  [--fix]
  wgx start [--issue N] slug
  wgx release --version vX.Y.Z | --auto-version patch|minor|major [--push] [--sign-tag] [--latest]
  wgx version bump patch|minor|major [--commit] | set vX.Y.Z [--commit]
  wgx hooks install
  wgx env doctor [--fix]     # Umgebungscheck (Termux-Fixes)
  wgx config show|set K=V
  wgx clean / lint / doctor / setup / init / reload / heal / test
Global:
  --yes  --dry-run  --timeout <s>  --no-timeout  --verbose  --base <branch>  --no-color  --offline  --version
EOF
}

case "${SUB}" in
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
  test)     test_cmd_entry "$@";;
  help|-h|--help|"") usage;;
  *) die "Unbekanntes Kommando: $SUB";;
esac