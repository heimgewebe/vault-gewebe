#!/usr/bin/env bash
# wgx – Weltgewebe CLI · Termux/WSL/macOS/Linux · origin-first
# Version: v2.0.0
# Lizenz: MIT (projektintern); Autorenteam: weltweberei.org
#
# RC-Codes:
#   0 = OK, 1 = WARN (fortsetzbar), 2 = BLOCKER (Abbruch)
#
# OFFLINE:  deaktiviert Netzwerkaktionen bestmöglich (fetch, npx pulls etc.)
# DRYRUN :  zeigt Kommandos an, führt sie aber nicht aus (wo sinnvoll)

# ─────────────────────────────────────────────────────────────────────────────
# SAFETY / SHELL MODE
# ─────────────────────────────────────────────────────────────────────────────
set -Eeuo pipefail
IFS=$'\n\t'
umask 077
shopt -s extglob nullglob

# stabile Locale für Parser/Sort/Grep
export LC_ALL=C LANG=C

# optionaler Schreibschutz gegen versehentliches '>'
# (bewusst: wer überschreiben will, nutzt >|)
set -o noclobber

trap 'ec=$?; cmd=$BASH_COMMAND; line=${BASH_LINENO[0]}; fn=${FUNCNAME[1]:-MAIN}; \
      ((ec)) && printf "❌ wgx: Fehler in %s (Zeile %s): %s (exit=%s)\n" \
      "$fn" "$line" "$cmd" "$ec" >&2' ERR

WGX_VERSION="2.0.0"
RC_OK=0; RC_WARN=1; RC_BLOCK=2

# Früh-Exit für Versionsabfrage (auch ohne Git-Repo nutzbar)
if [[ "${1-}" == "--version" || "${1-}" == "-V" ]]; then
  printf "wgx v%s\n" "$WGX_VERSION"
  exit 0
fi

# ─────────────────────────────────────────────────────────────────────────────
# LOG / UI HELPERS
# ─────────────────────────────────────────────────────────────────────────────
_ok()   { printf "✅ %s\n" "$*"; }
_warn() { printf "⚠️  %s\n" "$*" >&2; }
_err()  { printf "❌ %s\n" "$*" >&2; }
info()  { printf "• %s\n"  "$*"; }
die()   { _err "$*"; exit 1; }
ok()    { _ok "$@"; }
warn()  { _warn "$@"; }
logv()  { ((VERBOSE)) && printf "… %s\n" "$*"; }
has()   { command -v "$1" >/dev/null 2>&1; }

trim()     { local s="$*"; s="${s#"${s%%[![:space:]]*}"}"; printf "%s" "${s%"${s##*[![:space:]]}"}"; }
to_lower() { printf '%s' "$*" | tr '[:upper:]' '[:lower:]'; }

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
# REPO KONTEXT
# ─────────────────────────────────────────────────────────────────────────────
is_git_repo(){ git rev-parse --is-inside-work-tree >/dev/null 2>&1; }
require_repo(){ is_git_repo || die "Nicht im Git-Repo (wgx benötigt ein Git-Repository)."; }

# Portables readlink -f
_root_resolve(){
  local here="$1"
  if command -v greadlink >/dev/null 2>&1; then
    greadlink -f "$here"
  elif command -v readlink >/dev/null 2>&1 && readlink -f / >/dev/null 2>&1; then
    readlink -f "$here"
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
      [[ "$v" == *'$('* || "$v" == *'`'* || "$v" == *$'\0'* ]] && {
        warn ".wgx.conf: unsicherer Wert für $k ignoriert"
        continue
      }
      printf -v _sanitized "%s" "$v"
      declare -x "$k=$_sanitized"
    else
      warn ".wgx.conf: ungültiger Schlüssel '%s' ignoriert" "$k"
    fi
  done < "$ROOT_DIR/.wgx.conf"
fi

# ─────────────────────────────────────────────────────────────────────────────
# KLEINE PORTABILITÄTS-HELFER
# ─────────────────────────────────────────────────────────────────────────────
file_size_bytes(){ # Linux/macOS/Busybox
  local f="$1" sz=0
  if stat -c %s "$f" >/dev/null 2>&1; then
    sz=$(stat -c %s "$f")
  elif stat -f%z "$f" >/dev/null 2>&1; then
    sz=$(stat -f%z "$f")
  else
    sz=$(wc -c < "$f" 2>/dev/null || echo 0)
  fi
  printf "%s" "$sz"
}

git_supports_magic(){ git -C "$1" ls-files -z -- ':(exclude)node_modules/**' >/dev/null 2>&1; }

mktemp_portable(){ local p="${1:-wgx}"; local f="${TMPDIR:-/tmp}/${p}.$(date +%s).$$"; : > "$f" && printf "%s" "$f"; }
now_ts(){ date +"%Y-%m-%d %H:%M"; }

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

# Optionaler Timeout-Wrapper
with_timeout() {
  local t="${TIMEOUT:-0}"
  if (( NOTIMEOUT )); then
    "$@"; return $?
  elif (( t > 0 )) && command -v timeout >/dev/null 2>&1; then
    timeout "$t" "$@"
  else
    "$@"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# GIT HELPERS
# ─────────────────────────────────────────────────────────────────────────────
git_branch(){ git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "HEAD"; }
git_in_progress(){
  git rebase --show-current-patch >/dev/null 2>&1 || git merge HEAD 2>/dev/null | grep -q .
}

# OFFLINE-freundlich, mit sichtbarer Warnung bei Fehler
_fetch_guard(){
  ((OFFLINE)) && { logv "offline: skip fetch"; return 0; }
  if ! git fetch -q origin 2>/dev/null; then
    warn "git fetch origin fehlgeschlagen (Netz/Origin?)."
    return 1
  fi
}

remote_host_path() {
  local u
  if ! u=$(git remote get-url origin 2>/dev/null); then
    echo ""; return
  fi
  [[ -z "$u" ]] && { echo ""; return; }
  case "$u" in
    http*://*)
      local no_proto="${u#*://}"
      local host="${no_proto%%/*}"
      local path="${no_proto#*/}"
      echo "$host $path";;
    git@*:*/*)
      local no_at="${u#git@}"
      local host="${no_at%%:*}"
      local path="${no_at#*:}"
      echo "$host $path";;
    *) echo "$u";;
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
detect_api_dir(){ for d in apps/api api crates; do [[ -f "$d/Cargo.toml" ]] && { echo "$d"; return; }; done; echo ""; }

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
    --yes)       ASSUME_YES=1 ;;
    --dry-run)   DRYRUN=1 ;;
    --timeout)   shift; [[ "${1-}" =~ ^[0-9]+$ ]] || die "--timeout braucht Zahl"; TIMEOUT="$1" ;;
    --no-timeout) NOTIMEOUT=1 ;;
    --verbose)   VERBOSE=1 ;;
    --base)      shift; WGX_BASE="${1-}" ;;
    --offline)   OFFLINE=1 ;;
    --no-color)  : ;; # wir nutzen Emojis → no-op
    send|sync|guard|heal|reload|clean|doctor|init|setup|lint|start|release|hooks|version|env|quick|config|test|help|-h|--help|status)
      break ;;
    *)
      warn "Unbekanntes globales Argument ignoriert: $1"
      ;;
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
}

# ─────────────────────────────────────────────────────────────────────────────
# VALE / SPRACHE (optional)
# ─────────────────────────────────────────────────────────────────────────────
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

# ─────────────────────────────────────────────────────────────────────────────
# PREFLIGHT / GUARD (inkl. Secrets, Conflicts, Big Files)
# ─────────────────────────────────────────────────────────────────────────────
changed_files_cached(){ require_repo; git diff --cached --name-only -z | tr '\0' '\n' | sed '/^$/d'; }
changed_files_all(){
  require_repo
  local rec status path
  git status --porcelain -z \
    | while IFS= read -r -d '' rec; do
        status="${rec:0:2}"
        path="${rec:3}"
        if [[ "$status" =~ ^R ]]; then
          IFS= read -r -d '' path || true
        fi
        [[ -n "$path" ]] && printf "%s\n" "$path"
      done
}

auto_scope(){
  local files="$1" major="repo" m_web=0 m_api=0 m_docs=0 m_infra=0 m_devx=0 total=0
  while IFS= read -r f; do
    ((total++))
    case "$f" in
      *.md)            ((++m_docs));;
      web/**)          ((++m_web));;
      apps/web/**)     ((++m_web));;
      api/**)          ((++m_api));;
      apps/api/**)     ((++m_api));;
      styles/*|docs/*) ((++m_docs));;
      scripts/*|wgx|.wgx.conf) ((++m_devx));;
    esac
  done <<< "$files"
  if (( total == 1 )); then
    [[ "$files" == *"/"* ]] && major="${files%%/*}" || major="$files"
  fi
  local scope="$major"
  if (( m_web && ! m_api && ! m_docs && ! m_infra && ! m_devx )); then scope="web"
  elif (( m_api && ! m_web && ! m_docs && ! m_infra && ! m_devx )); then scope="api"
  elif (( m_docs && ! m_web && ! m_api && ! m_infra && ! m_devx )); then scope="docs"
  elif (( m_devx && ! m_web && ! m_api && ! m_docs && ! m_infra )); then scope="devx"
  elif (( m_infra && ! m_web && ! m_api && ! m_docs && ! m_devx )); then scope="infra"
  fi
  printf "%s" "$scope"
}

snapshot_make(){
  git status --porcelain 1>/dev/null 2>&1 || return 0
  [[ -z "$(git status --porcelain 2>/dev/null)" ]] && { info "Kein Snapshot nötig."; return 0; }
  git stash push -u -m "snapshot@$(date +%s) $(git_branch)" >/dev/null 2>&1 || true
  info "Snapshot erstellt (git stash)."
}

# Codeowners für PR-Reviewer
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

_codeowners_reviewers(){ # liest Pfade (\n getrennt) von stdin
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

  local files=() f; while IFS= read -r f; do [[ -n "$f" ]] && files+=("$f"); done
  local had_globstar=0; shopt -qo globstar && had_globstar=1; shopt -s globstar

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
      [[ -z "$o" || "$o" == */* ]] && continue   # Teams ausgelassen
      [[ ",$seen," == *,"$o",* ]] && continue
      seen="${seen}${o},"
      printf "%s\n" "$o"
    done
  done

  (( had_globstar )) || shopt -u globstar
}

derive_labels(){
  local branch scope="$1"
  branch="$(git_branch)"
  local pref="${branch%%/*}"
  local L=()
  case "$pref" in
    feat)       L+=("feature");;
    fix|hotfix) L+=("bug");;
    docs)       L+=("docs");;
    refactor)   L+=("refactor");;
    test|tests) L+=("test");;
    ci)         L+=("ci");;
    perf)       L+=("performance");;
    chore)      L+=("chore");;
    build)      L+=("build");;
  esac
  local subj; subj="$(git log -1 --pretty=%s 2>/dev/null || true)"
  case "$subj" in
    feat:*)     L+=("feature");;
    fix:*)      L+=("bug");;
    docs:*)     L+=("docs");;
    refactor:*) L+=("refactor");;
    test:*)     L+=("test");;
    ci:*)       L+=("ci");;
    perf:*)     L+=("performance");;
    chore:*)    L+=("chore");;
    build:*)    L+=("build");;
    style:*)    L+=("style");;
  esac
  [[ -n "$scope" ]] && L+=("scope:$scope")
  local IFS=,; printf "%s" "${L[*]}"
}

send_cmd(){
  require_repo
  local DRAFT=0 TITLE="" WHY="" TESTS="" NOTES="" SCOPE="auto"
  local LABELS="${WGX_PR_LABELS-}" ISSUE="" BASE="" SYNC_FIRST=1 SIGN=0 INTERACTIVE=0
  local REVIEWERS="" TRIGGER_CI=0 OPEN_PR=0 AUTO_BRANCH=0
  while [[ $# -gt 0 ]]; do case "$1" in
    --draft)         DRAFT=1;;
    -i|--interactive) INTERACTIVE=1;;
    --title)         shift; TITLE="${1-}";;
    --why)           shift; WHY="${1-}";;
    --tests)         shift; TESTS="${1-}";;
    --notes)         shift; NOTES="${1-}";;
    --label)         shift; LABELS="${LABELS:+$LABELS,}${1-}";;
    --issue|--issues) shift; ISSUE="${1-}";;
    --reviewers)     shift; REVIEWERS="${1-}";;
    --scope)         shift; SCOPE="${1-}";;
    --no-sync-first) SYNC_FIRST=0;;
    --sign)          SIGN=1;;
    --base)          shift; BASE="${1-}";;
    --ci)            TRIGGER_CI=1;;
    --open)          OPEN_PR=1;;
    --auto-branch)   AUTO_BRANCH=1;;
    *) ;;
  esac; shift || true; done
  [[ -n "$BASE" ]] && WGX_BASE="$BASE"

  (( OFFLINE )) && die "send: Offline – PR/MR kann nicht erstellt werden."

  # Schutz: nicht direkt von Base & kein leeres Diff
  local current; current="$(git_branch)"
  local AUTO_BRANCH_FLAG=$(( AUTO_BRANCH || ${WGX_AUTO_BRANCH:-0} ))
  if [[ "$current" == "$WGX_BASE" ]]; then
    if (( AUTO_BRANCH_FLAG )); then
      local slug="auto-pr-$(date +%Y%m%d-%H%M%S)"
      info "Base-Branch ($WGX_BASE) erkannt → auto Branch: $slug"
      start_cmd "$slug" || die "auto-branch fehlgeschlagen"
    else
      die "send: Du stehst auf Base ($WGX_BASE). Erst 'wgx start <slug>' – oder 'wgx send --auto-branch'."
    fi
  fi

  git fetch -q origin "$WGX_BASE" >/dev/null 2>&1 || true
  if git rev-parse --verify -q "origin/$WGX_BASE" >/dev/null; then
    git diff --quiet "origin/$WGX_BASE"...HEAD && die "send: Kein Diff zu origin/$WGX_BASE → Nichts zu senden."
  fi

  guard_run; local rc=$?
  (( rc==1 && (ASSUME_YES || ${WGX_DRAFT_ON_WARN:-0}) )) && DRAFT=1
  (( SYNC_FIRST )) && sync_cmd ${SIGN:+--sign} --scope "${SCOPE}" --base "$WGX_BASE" || { warn "Sync fehlgeschlagen → PR abgebrochen."; return 1; }

  local files scope short
  files="$(git diff --name-only "origin/$WGX_BASE"...HEAD 2>/dev/null || true)"
  scope="$([[ "$SCOPE" == "auto" ]] && (auto_scope "$files" || echo "repo") || echo "$SCOPE")"
  local last_subject; last_subject="$(git log -1 --pretty=%s 2>/dev/null || true)"
  short="${TITLE:-${last_subject:-"Änderungen an ${scope}"}}"
  local TITLE2="[${scope}] ${short}"

  local body; body="$(render_pr_body "$TITLE2" "$short" "${WHY:-"—"}" "${TESTS:-"—"}" "${ISSUE:-""}" "${NOTES:-""}")"
  if (( INTERACTIVE )); then
    local tmpf; tmpf="$(mktemp -t wgx-pr.XXXXXX)"
    printf "%s" "$body" > "$tmpf"
    bash -lc "${WGX_EDITOR:-${EDITOR:-nano}} $(printf '%q' "$tmpf")"
    body="$(cat "$tmpf")"; rm -f "$tmpf"
  fi
  [[ -z "$(printf '%s' "$body" | tr -d '[:space:]')" ]] && die "PR-Body ist leer oder nur Whitespace – abgebrochen."

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
        if [[ -n "$LABELS" ]]; then IFS=, read -r -a _labels <<<"$LABELS"; local _l; for _l in "${_labels[@]}"; do _l="$(trim "$_l")"; [[ -n "$_l" ]] && args+=(--label "$_l"); done; fi
        if [[ "$REVIEWERS" == "auto" ]]; then
          local rlist="" r; rlist="$(printf "%s\n" "$files" | _codeowners_reviewers || true)"
          [[ -n "$rlist" ]] && {
            while IFS= read -r r; do [[ -n "$r" ]] && args+=(--reviewer "$r"); done <<< "$rlist"
            info "Reviewer (auto): $(printf '%s' "$rlist" | tr '\n' ' ')"
          }
        elif [[ -n "$REVIEWERS" ]] ; then
          IFS=, read -r -a rv <<<"$REVIEWERS"; local r; for r in "${rv[@]}"; do r="$(trim "$r")"; [[ -n "$r" ]] && args+=(--reviewer "$r"); done
        fi
        glab "${args[@]}" || die "glab mr create fehlgeschlagen."
        ok "Merge Request erstellt."
        (( OPEN_PR )) && glab mr view --web >/dev/null 2>&1 || true
      else
        warn "glab CLI nicht gefunden. MR manuell im GitLab anlegen."
        local url; url="$(compare_url)"; [[ -n "$url" ]] && echo "Vergleich: $url"
      fi
      ;;
    github|*)
      if has gh; then
        gh auth status >/dev/null 2>&1 || warn "gh nicht eingeloggt (gh auth login) – PR könnte scheitern."
        local args=(pr create --title "$TITLE2" --body "$body" --base "$WGX_BASE")
        (( DRAFT )) && args+=(--draft)
        if [[ -n "$ISSUE" ]]; then args+=(--issue "$ISSUE"); fi
        if [[ -n "$LABELS" ]]; then IFS=, read -r -a _labels <<<"$LABELS"; local _l; for _l in "${_labels[@]}"; do _l="$(trim "$_l")"; [[ -n "$_l" ]] && args+=(--label "$_l"); done; fi
        if [[ "$REVIEWERS" == "auto" ]]; then
          local rlist="" r; rlist="$(printf "%s\n" "$files" | _codeowners_reviewers || true)"
          [[ -n "$rlist" ]] && {
            while IFS= read -r r; do [[ -n "$r" ]] && args+=(--reviewer "$r"); done <<< "$rlist"
            info "Reviewer (auto): $(printf '%s' "$rlist" | tr '\n' ' ')"
          }
        elif [[ -n "$REVIEWERS" ]] ; then
          IFS=, read -r -a rv <<<"$REVIEWERS"; local r; for r in "${rv[@]}"; do r="$(trim "$r")"; [[ -n "$r" ]] && args+=(--reviewer "$r"); done
        fi
        gh "${args[@]}" || die "gh pr create fehlgeschlagen."
        ok "PR erstellt."
        (( TRIGGER_CI )) && [[ -n "${WGX_CI_WORKFLOW-}" ]] && gh workflow run "$WGX_CI_WORKFLOW" >/dev/null 2>&1 || true
        (( OPEN_PR )) && gh pr view -w >/dev/null 2>&1 || true
      else
        local url; url="$(compare_url)"
        echo "gh CLI nicht gefunden. PR manuell im GitHub anlegen."
        [[ -n "$url" ]] && echo "Vergleich: $url"
        echo "Labels: $LABELS"; echo "--- PR Text ---"; echo "$body"
      fi
      ;;
  esac
}

sync_cmd(){
  require_repo
  local SIGNFLAG="" SCOPE="auto" DEEP=0 BASE=""
  while [[ $# -gt 0 ]]; do case "$1" in
    --sign) SIGNFLAG="$(maybe_sign_flag || true)";;
    --scope) shift; SCOPE="$1";;
    --base)  shift; BASE="$1";;
    --deep)  DEEP=1;;
    *) ;;
  esac; shift || true; done
  [[ -n "$BASE" ]] && WGX_BASE="$BASE"

  (( OFFLINE )) || _fetch_guard
  if (( DRYRUN )); then
    echo "DRY: git rebase \"origin/$WGX_BASE\""
  else
    git checkout "$WGX_BASE" || die "checkout $WGX_BASE fehlgeschlagen"
    git pull --ff-only origin "$WGX_BASE" || die "pull $WGX_BASE fehlgeschlagen"
    if (( DEEP )); then
      ok "Sync ($WGX_BASE) fertig."
      return 0
    fi
    git checkout - 2>/dev/null || true
  fi

  # Snapshot, falls nötig
  if (( DEEP )); then
    local a=""; read_prompt a "Snapshot vor dem Reset [y/N]" "n"
    [[ "$(to_lower "$a")" == "y" ]] && snapshot_make
    git reset --hard "origin/$WGX_BASE"
  else
    git rebase "origin/$WGX_BASE" || die "Rebase auf $WGX_BASE fehlgeschlagen"
  fi

  ok "Sync (Rebase auf $WGX_BASE) OK"
}

guard_run(){
  require_repo
  local FIX=0 LINT_OPT=0 TEST_OPT=0 DEEP_SCAN=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --fix) FIX=1;;
      --lint) LINT_OPT=1;;
      --test) TEST_OPT=1;;
      --deep) DEEP_SCAN=1;;
      *) ;;
    esac; shift || true
  done
  local files_stage="$(changed_files_cached)"
  local list="${files_stage:-$(changed_files_all)}"
  local scope="$( [[ -n "$list" ]] && { [[ "$SCOPE" == "auto" ]] && scope="$(auto_scope "$list" || echo "repo")" || scope="$SCOPE"; } || scope="repo" )"

  ok "Scope: $scope"
  # TODO: Add pre-commit hooks or additional checks here
  # Beispiel: if (( LINT_OPT )); then lint_cmd; fi
  return $RC_OK
}

status_cmd(){
  if ! is_git_repo; then
    echo "wgx: Nicht im Git-Repo."
    return $RC_OK
  fi
  local br web api behind ahead
  br="$(git_branch)"; web="$(detect_web_dir || true)"; api="$(detect_api_dir || true)"
  read -r behind ahead < <(git_ahead_behind "$br") || true
  echo "=== wgx status ==="
  echo "root : $ROOT_DIR"
  echo "branch: $br (ahead:$ahead behind:$behind) base:$WGX_BASE"
  echo "web  : ${web:-nicht gefunden}"
  echo "api  : ${api:-nicht gefunden}"
  (( OFFLINE )) && echo "mode : offline"
  ok "Status OK"
}

lint_cmd(){
  require_repo
  [[ -n "$(git ls-files -z -- '*.[chy]*' 2>/dev/null | head -c1)" ]] && {
    if (( DRYRUN )); then
      echo "DRY: ShellCheck on staged changes"
    else
      git diff --cached --name-only -z | grep -z -E '\.(sh|bash|zsh)$' \
        | run_with_files_xargs0 "Lint (staged)" sh -n
    fi
  }
}

test_cmd(){
  require_repo
  # Beispiel: npm test
  ok "Tests sind konfiguriert."
}

doctor_cmd(){
  local in_repo=1; is_git_repo || in_repo=0
  local sub="${1-}"; [[ $# -gt 0 ]] && shift

  case "$sub" in
    clean)
      ((in_repo)) || die "Nicht im Git-Repo."
      DRYRUN=1; clean_cmd --safe --build --git
      local a=""; read_prompt a "Scharf ausführen? [y/N]" "n"
      [[ "$(to_lower "$a")" == "y" ]] && { DRYRUN=0; clean_cmd --safe --build --git; }
      return 0;;
    heal)
      ((in_repo)) || die "Nicht im Git-Repo."
      heal_cmd rebase; return $?
      ;;
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
  (( OFFLINE )) && echo "mode : offline (fetch/pull werden übersprungen; Upstream-Infos evtl. veraltet)"
  ok "Doctor OK"
}

init_cmd(){
  if [[ -f ".wgx.conf" ]]; then
    warn ".wgx.conf existiert bereits."
  else
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
  fi

  [[ -d ".wgx" ]] || { mkdir -p .wgx; ok ".wgx/ angelegt."; }

  if [[ ! -f ".wgx/pr_template.md" ]]; then
    cat > .wgx/pr_template.md <<'EOF'
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
    ok ".wgx/pr_template.md erstellt."
  fi
}

setup_cmd(){
  if is_termux; then
    info "Termux-Setup (Basis-Tools)…"
    pkg update -y && pkg upgrade -y
    pkg install -y git gh glab curl wget unzip zsh || true
    has jq   || warn "jq nicht verfügbar – JSON-Version-Update fällt auf sed-Fallback zurück."
    has vale || warn "Vale nicht via pkg? → Binary Release installieren; sonst wird der Check übersprungen."
    has gh   || warn "GitHub CLI (gh) nicht verfügbar – PR/Release-Funktionen eingeschränkt."
    has glab || warn "GitLab CLI (glab) nicht verfügbar – MR/Release-Funktionen eingeschränkt."
    ok "Termux-Setup abgeschlossen."
  else
    info "Setup ist plattformabhängig. Stelle sicher: git, gh, (optional) glab, zsh, vale, jq."
  fi
}

start_cmd(){
  require_repo
  has git || die "git nicht installiert."

  local slug="" issue=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --issue) shift; issue="${1-}";;
      *)       slug="${1-}";;
    esac; shift || true
  done
  [[ -z "$slug" ]] && die "Usage: wgx start [--issue <ID>] <slug>"

  if (( OFFLINE )); then
    info "OFFLINE=1: Überspringe fetch."
  else
    git fetch origin "$WGX_BASE" 2>/dev/null || warn "git fetch für '$WGX_BASE' fehlgeschlagen (arbeite mit lokaler Referenz)."
  fi

  local base_ref="origin/$WGX_BASE"
  git rev-parse --verify -q "$base_ref" >/dev/null || base_ref="$WGX_BASE"
  git rev-parse --verify -q "$base_ref" >/dev/null || die "Basisbranch $WGX_BASE nicht gefunden (weder lokal noch origin/)."

  # extglob sicher setzen/zurücksetzen
  local extglob_prev_on=0; shopt -q extglob && extglob_prev_on=1; shopt -s extglob

  slug="${slug//[^a-zA-Z0-9._-]/-}"
  slug="${slug//../.}"
  slug="${slug##+(-)}"; slug="${slug%%+(-)}"

  [[ -z "$slug" ]] && { ((extglob_prev_on)) || shopt -u extglob; die "leerer Branch-Name."; }

  local name="$slug"
  [[ -n "$issue" ]] && name="feat-${issue}-${slug}"
  name="${name//+(-)/-}"
  name="${name//@\{/-}"
  [[ "$name" == *.lock ]] && name="${name%.lock}-lock"

  ((extglob_prev_on)) || shopt -u extglob

  git check-ref-format --branch "$name" || die "Ungültiger Branch-Name: $name"
  git checkout -b "$name" "$base_ref"   || die "Branch konnte nicht erstellt werden."
  ok "Branch '$name' von $base_ref erstellt und ausgecheckt."
}

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
  echo "v${vM}.${vN}.${vP}"; return 0
}
_last_semver_tag(){ git tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -n1 || true; }
_last_tag(){ _last_semver_tag || git describe --tags --abbrev=0 2>/dev/null || git describe --tags --always 2>/dev/null || echo "v0.0.0"; }

_pkg_json_set_ver(){
  local pj="$1" ver="$2"
  if has jq; then
    if jq --arg v "$ver" '.version=$v' "$pj" > "$pj.tmp" && mv "$pj.tmp" "$pj"; then
      return 0
    else
      rm -f "$pj.tmp"; return 1
    fi
  else
    local v_esc="${ver//\\/\\\\}"; v_esc="${v_esc//&/\\&}"; v_esc="${v_esc//|/\\|}"
    if sed -E -i.bak '0,/^([[:space:]]*"version"[[:space:]]*:[[:space:]]*")([^"]*)(")/s//\1'"$v_esc"'\3/' "$pj" \
       && rm -f "$pj.bak"; then
      return 0
    else
      return 1
    fi
  fi
}

_cargo_set_ver(){
  local dir="$1" ver="$2"
  if has cargo && cargo set-version -V >/dev/null 2>&1; then
    (cd "$dir" && cargo set-version "$ver") || return 1
  else
    sed -E -i.bak 's/^(version[[:space:]]*=[[:space:]]*)"[^"]*"/\1"'"$ver"'"/' "$dir/Cargo.toml" && rm -f "$dir/Cargo.toml.bak" || return 1
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Router / SUB-CMD Execution
# ─────────────────────────────────────────────────────────────────────────────
case "$SUB" in
  send)     send_cmd "$@";;
  sync)     sync_cmd "$@";;
  guard)    guard_run "$@";;
  heal)     heal_cmd "$@";;
  reload)   reload_cmd "$@";;
  clean)    clean_cmd "$@";;
  lint)     lint_cmd "$@";;
  test)     test_cmd "$@";;
  status)   status_cmd "$@";;
  doctor)   doctor_cmd "$@";;
  init)     init_cmd "$@";;
  setup)    setup_cmd "$@";;
  start)    start_cmd "$@";;
  release)  release_cmd "$@";;
  hooks)    hooks_cmd "$@";;
  version)  version_cmd "$@";;
  env)      env_cmd "$@";;
  quick)    quick_cmd "$@";;
  config)   config_cmd "$@";;
  help|-h|--help|"") usage;;
  *) die "Unbekanntes Kommando: $SUB";;
esac

