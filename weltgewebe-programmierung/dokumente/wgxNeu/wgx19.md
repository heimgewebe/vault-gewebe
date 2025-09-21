#!/usr/bin/env bash
# wgx – Weltgewebe CLI (Final • Deep-Core+Providers)
# Plattform: Termux/WSL/macOS/Linux · Mobile-first UX
# Lizenz: MIT (projektintern) · Autorenteam: weltweberei.org
# Version: v2.2.0-final

# ─────────────────────────────────────────────────────────────────────────────
# SAFETY / SHELL MODE
# ─────────────────────────────────────────────────────────────────────────────
set -Eeuo pipefail
IFS=$'\n\t'
umask 077
shopt -s extglob nullglob
export LC_ALL=C LANG=C
set -o noclobber

trap 'ec=$?; cmd=$BASH_COMMAND; line=${BASH_LINENO[0]}; fn=${FUNCNAME[1]:-MAIN}; \
      ((ec)) && printf "❌ wgx: Fehler in %s (Zeile %s): %s (exit=%s)\n" \
      "$fn" "$line" "$cmd" "$ec" >&2' ERR

WGX_VERSION="2.2.0-final"
RC_OK=0; RC_WARN=1; RC_BLOCK=2

# ─────────────────────────────────────────────────────────────────────────────
# UI / HELPERS
# ─────────────────────────────────────────────────────────────────────────────
_ok()   { printf "✅ %s\n" "$*"; }
_warn() { printf "⚠️  %s\n" "$*" >&2; }
_err()  { printf "❌ %s\n" "$*" >&2; }
info()  { printf "• %s\n"  "$*"; }
die()   { _err "$*"; exit 2; }
ok()    { _ok "$@"; }
warn()  { _warn "$@"; }
has()   { command -v "$1" >/dev/null 2>&1; }

trim(){ local s="$*"; s="${s#"${s%%[![:space:]]*}"}"; printf "%s" "${s%"${s##*[![:space:]]}"}"; }
to_lower(){ printf '%s' "$*" | tr '[:upper:]' '[:lower:]'; }

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
# DEFAULTS
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
# PLATFORM / CONTEXT
# ─────────────────────────────────────────────────────────────────────────────
PLATFORM="linux"
case "$(uname -s 2>/dev/null || echo x)" in
  Darwin) PLATFORM="darwin" ;;
  *)      PLATFORM="linux"  ;;
esac
is_termux(){ [[ "${PREFIX-}" == *"/com.termux/"* ]] || command -v termux-setup-storage >/dev/null 2>&1; }
is_git_repo(){ git rev-parse --is-inside-work-tree >/dev/null 2>&1; }
require_repo(){ is_git_repo || die "Nicht im Git-Repo."; }

ROOT(){
  # robuste Root-Ermittlung (Git bevorzugt)
  local r; r="$(git -C "${PWD}" rev-parse --show-toplevel 2>/dev/null || true)"
  if [[ -n "$r" ]]; then printf "%s" "$r"; return; fi
  local here base
  here="${BASH_SOURCE[0]}"
  base="$(cd "$(dirname "$here")/.." && pwd -P)"
  printf "%s" "$base"
}

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG (.wgx.conf) – eval-frei, strikt
# ─────────────────────────────────────────────────────────────────────────────
if [[ -f "$(ROOT)/.wgx.conf" ]]; then
  while IFS='=' read -r k v; do
    k="$(trim "$k")"
    [[ -z "$k" || "$k" =~ ^# ]] && continue
    if [[ "$k" =~ ^[A-Z0-9_]+$ ]]; then
      v="${v%$'\r'}"
      [[ "$v" == *'$('* || "$v" == *'`'* || "$v" == *$'\0'* ]] && { warn ".wgx.conf: unsicherer Wert für $k ignoriert"; continue; }
      printf -v _sanitized "%s" "$v"
      declare -x "$k=$_sanitized"
    else
      warn ".wgx.conf: ungültiger Schlüssel '$k' ignoriert"
    fi
  done <"$(ROOT)/.wgx.conf"
fi

# ─────────────────────────────────────────────────────────────────────────────
# TIMEOUT / SIGN / GIT HELPERS
# ─────────────────────────────────────────────────────────────────────────────
maybe_sign_flag(){
  case "${WGX_SIGNING}" in
    off)  return 1 ;;
    ssh)  has git && git config --get gpg.format 2>/dev/null | grep -qi 'ssh' && echo "-S" || return 1 ;;
    gpg)  has gpg && echo "-S" || return 1 ;;
    auto) git config --get user.signingkey >/dev/null 2>&1 && echo "-S" || return 1 ;;
    *)    return 1 ;;
  esac
}
with_timeout(){
  local t="${TIMEOUT:-0}"
  if (( NOTIMEOUT )); then "$@"
  elif (( t > 0 )) && command -v timeout >/dev/null 2>&1; then timeout -k 5 "$t" "$@"
  else "$@"; fi
}

git_branch(){ git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "HEAD"; }
git_in_progress(){ [[ -d .git/rebase-apply || -d .git/rebase-merge || -f .git/MERGE_HEAD ]]; }

_fetch_guard(){
  ((OFFLINE)) && { ((VERBOSE)) && info "offline: skip fetch"; return 0; }
  git fetch -q origin 2>/dev/null || { warn "git fetch origin fehlgeschlagen"; return 1; }
}

remote_host_path(){ # <origin-url> → "host path"
  local u; u="$(git remote get-url origin 2>/dev/null || true)"
  [[ -z "$u" ]] && { echo ""; return; }
  case "$u" in
    http://*|https://*)
      u="${u#*://}"; printf "%s %s\n" "${u%%/*}" "${u#*/}" ;;
    *@*:*/*) printf "%s\n" "$u" | sed -E 's|^[^@]+@([^:]+):(.+)$|\1 \2|' ;;
    *) printf "%s %s\n" "" "$u" ;;
  esac
}
host_kind(){ # erkannt: github, gitlab, codeberg, gitea (catch-all: gitea für fremde Hosts)
  local hp host; hp="$(remote_host_path || true)"; host="${hp%% *}"
  case "$host" in
    github.com) echo github ;;
    gitlab.com) echo gitlab ;;
    codeberg.org) echo codeberg ;;
    *)
      # Heuristik: beliebige eigene Gitea-Instanzen (host enthält gitea|forgejo?) → gitea
      if [[ "$host" == *gitea* || "$host" == *forgejo* ]]; then echo gitea; else echo gitea; fi
      ;;
  esac
}
compare_url(){ # triple-dot base...branch (für github/gitlab/codeberg/gitea)
  local hp host path; hp="$(remote_host_path || true)"; [[ -z "$hp" ]] && { echo ""; return; }
  host="${hp%% *}"; path="${hp#* }"; path="${path%.git}"
  case "$(host_kind)" in
    github)   echo "https://$host/$path/compare/${WGX_BASE}...$(git_branch)";;
    gitlab)   echo "https://$host/$path/-/compare/${WGX_BASE}...$(git_branch)";;
    codeberg) echo "https://$host/$path/compare/${WGX_BASE}...$(git_branch)";;
    gitea)    echo "https://$host/$path/compare/${WGX_BASE}...$(git_branch)";;
    *)        echo "";;
  esac
}

git_ahead_behind(){
  local b="${1:-$(git_branch)}"
  ((OFFLINE)) || git fetch -q origin "$b" >/dev/null 2>&1 || true
  local ab; ab="$(git rev-list --left-right --count "origin/$b...$b" 2>/dev/null || echo "0 0")"
  local behind=0 ahead=0 IFS=' '; read -r behind ahead <<<"$ab" || true
  printf "%s %s\n" "${behind:-0}" "${ahead:-0}"
}

detect_web_dir(){ for d in apps/web web; do [[ -d "$d" ]] && { echo "$d"; return; }; done; echo ""; }
detect_api_dir(){ for d in apps/api api; do [[ -d "$d" ]] && { echo "$d"; return; }; done; echo ""; }

run_with_files_xargs0(){ local title="$1"; shift
  [[ -t 1 ]] && info "$title"
  if command -v xargs >/dev/null 2>&1; then xargs -0 "$@" || return $?
  else local buf=() f; while IFS= read -r -d '' f; do buf+=("$f"); done; (("$#">0)) && "$@" "${buf[@]}"; fi
}

# ─────────────────────────────────────────────────────────────────────────────
# GLOBAL FLAGS → bis SUBCOMMAND
# ─────────────────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes)       ASSUME_YES=1 ;;
    --dry-run)   DRYRUN=1 ;;
    --timeout)   shift; TIMEOUT="${1-}" ;;
    --no-timeout) NOTIMEOUT=1 ;;
    --verbose)   VERBOSE=1 ;;
    --base)      shift; WGX_BASE="${1-}" ;;
    --offline)   OFFLINE=1 ;;
    send|sync|guard|heal|reload|clean|doctor|init|setup|lint|start|release|hooks|version|env|quick|config|test|help|-h|--help|status)
      break ;;
    *) warn "Unbekanntes globales Argument ignoriert: $1" ;;
  esac
  shift || true
done
SUB="${1-}"; shift || true

# ─────────────────────────────────────────────────────────────────────────────
# STATUS
# ─────────────────────────────────────────────────────────────────────────────
usage(){
cat <<'EOU'
wgx – Weltgewebe CLI

Usage:
  wgx [--yes] [--dry-run] [--offline] [--timeout N] [--base BRANCH] <command> [args]

Commands:
  status       – Kurzstatus (Branch, ahead/behind, Verzeichnisse)
  sync         – Rebase auf origin/<base> (oder Deep-Reset via --deep)
  send         – PR/MR erstellen (gh/glab; Codeberg/Gitea via Compare-URL)
  guard        – Preflight (Platzhalter für Lint/Tests/Checks)
  doctor       – System/Repo-Diagnose
  init         – .wgx.conf & .wgx/ Templates anlegen
  setup        – Termux/Allgemein: Basis-Tools-Hinweise/Install
  start        – Branch von Base anlegen (Slug-Schutz)
  help         – diese Hilfe
EOU
}

status_cmd(){
  if ! is_git_repo; then
    echo "=== wgx status ==="
    echo "root : $(ROOT)"
    echo "repo : (kein Git-Repo)"
    ok "Status OK"
    return $RC_OK
  fi
  local br web api behind=0 ahead=0
  br="$(git_branch)"; web="$(detect_web_dir || true)"; api="$(detect_api_dir || true)"
  local IFS=' '; read -r behind ahead < <(git_ahead_behind "$br") || true
  echo "=== wgx status ==="
  echo "root : $(ROOT)"
  echo "branch: $br (ahead:$ahead behind:$behind)  base:$WGX_BASE"
  echo "web  : ${web:-nicht gefunden}"
  echo "api  : ${api:-nicht gefunden}"
  (( OFFLINE )) && echo "mode : offline"
  ok "Status OK"
}

# ─────────────────────────────────────────────────────────────────────────────
# SCOPE / DIFF / SNAPSHOT
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
  local files="$1" major="repo" m_web=0 m_api=0 m_docs=0 m_devx=0 total=0
  while IFS= read -r f; do
    ((total++))
    case "$f" in
      *.md)                 ((++m_docs));;
      web/**|apps/web/**)   ((++m_web));;
      api/**|apps/api/**)   ((++m_api));;
      scripts/*|wgx|.wgx.conf) ((++m_devx));;
    esac
  done <<< "$files"
  if (( total == 1 )); then
    [[ "$files" == *"/"* ]] && major="${files%%/*}" || major="$files"
  fi
  local scope="$major"
  if (( m_web && ! m_api && ! m_docs && ! m_devx )); then scope="web"
  elif (( m_api && ! m_web && ! m_docs && ! m_devx )); then scope="api"
  elif (( m_docs && ! m_web && ! m_api && ! m_devx )); then scope="docs"
  elif (( m_devx && ! m_web && ! m_api && ! m_docs )); then scope="devx"
  fi
  printf "%s" "$scope"
}

snapshot_make(){
  git status --porcelain 1>/dev/null 2>&1 || return 0
  [[ -z "$(git status --porcelain 2>/dev/null)" ]] && { info "Kein Snapshot nötig."; return 0; }
  git stash push -u -m "snapshot@$(date +%s) $(git_branch)" >/dev/null 2>&1 || true
  info "Snapshot erstellt (git stash)."
}

# ─────────────────────────────────────────────────────────────────────────────
# GUARD (Preflight)
# ─────────────────────────────────────────────────────────────────────────────
guard_run(){
  require_repo
  local files_stage="$(changed_files_cached)"
  local list="${files_stage:-$(changed_files_all)}"
  local scope; scope="$([[ -n "$list" ]] && auto_scope "$list" || echo repo)"
  ok "Scope: $scope"
  # Platzhalter: hier könnten Lints/Tests ergänzt werden
  return $RC_OK
}

# ─────────────────────────────────────────────────────────────────────────────
# SYNC (rebase / deep reset)
# ─────────────────────────────────────────────────────────────────────────────
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

  (( OFFLINE )) || _fetch_guard || true

  if (( DEEP )); then
    local a=""; read_prompt a "Snapshot vor Reset (git stash)? [y/N]" "n"
    [[ "$(to_lower "$a")" == "y" ]] && snapshot_make
    git checkout "$WGX_BASE" || die "checkout $WGX_BASE fehlgeschlagen"
    git reset --hard "origin/$WGX_BASE" || die "reset auf origin/$WGX_BASE fehlgeschlagen"
    ok "Deep-Sync: Reset auf origin/$WGX_BASE OK"
    return 0
  fi

  git checkout "$WGX_BASE" || die "checkout $WGX_BASE fehlgeschlagen"
  git pull --ff-only origin "$WGX_BASE" || die "pull $WGX_BASE fehlgeschlagen"
  git checkout - 2>/dev/null || true
  git rebase "origin/$WGX_BASE" || die "Rebase auf $WGX_BASE fehlgeschlagen"
  ok "Sync (Rebase) OK"
}

# ─────────────────────────────────────────────────────────────────────────────
# PR/MR BODY / REVIEWERS / LABELS
# ─────────────────────────────────────────────────────────────────────────────
render_pr_body(){ # title, summary, why, tests, issues, notes
  local T="$1" S="$2" W="$3" TE="$4" I="$5" N="$6"
  cat <<EOF
## Zweck
${S}

## Änderungen
${T}

## Warum
${W}

## Tests
${TE}

## Issues
${I}

## Notizen
${N}
EOF
}

_codeowners_file(){ [[ -f ".github/CODEOWNERS" ]] && echo ".github/CODEOWNERS" || { [[ -f "CODEOWNERS" ]] && echo "CODEOWNERS" || echo ""; }; }
_codeowners_reviewers(){ # einfache Ableitung einzelner Nutzer aus CODEOWNERS
  local cof; cof="$(_codeowners_file)"; [[ -z "$cof" ]] && return 0
  local files=() f; while IFS= read -r f; do [[ -n "$f" ]] && files+=("$f"); done
  local seen="," r
  while IFS= read -r r; do
    r="${r#@}"; [[ -z "$r" || "$r" == */* ]] && continue
    [[ ",$seen," == *,"$r",* ]] && continue
    seen="${seen}${r},"
    printf "%s\n" "$r"
  done < <(awk 'BEGIN{RS="\n"} /^[^#].+\s+@/ {print $0}' "$cof" | awk '{for(i=2;i<=NF;i++) print $i}')
}

derive_labels(){
  local branch scope="$1" L=()
  branch="$(git_branch)"
  local pref="${branch%%/*}"
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
    style:*) L+=("style");;
  esac
  [[ -n "$scope" ]] && L+=("scope:$scope")
  local IFS=,; printf "%s" "${L[*]}"
}

# ─────────────────────────────────────────────────────────────────────────────
# SEND (PR/MR) – GitHub/GitLab via gh/glab; Codeberg/Gitea via Compare-URL
# ─────────────────────────────────────────────────────────────────────────────
send_cmd(){
  require_repo
  (( OFFLINE )) && die "send: Offline – PR/MR nicht möglich."

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

  guard_run || warn "guard meldete Warnungen"
  (( SYNC_FIRST )) && sync_cmd --base "$WGX_BASE" || { warn "Sync übersprungen"; }

  local files scope short
  files="$(git diff --name-only "origin/$WGX_BASE"...HEAD 2>/dev/null || true)"
  scope="$([[ "$SCOPE" == "auto" ]] && (auto_scope "$files" || echo "repo") || echo "$SCOPE")"
  local last_subject; last_subject="$(git log -1 --pretty=%s 2>/dev/null || true)"
  short="${TITLE:-${last_subject:-"Änderungen an ${scope}"}}"
  local TITLE2="[${scope}] ${short}"

  local body; body="$(render_pr_body "$TITLE2" "$short" "${WHY:-"—"}" "${TESTS:-"—"}" "${ISSUE:-""}" "${NOTES:-""}")"
  if (( INTERACTIVE )); then
    local tmpf; tmpf="$(mktemp -t wgx-pr.XXXXXX)"; printf "%s" "$body" > "$tmpf"
    bash -lc "${WGX_EDITOR:-${EDITOR:-nano}} $(printf '%q' "$tmpf")"
    body="$(cat "$tmpf")"; rm -f "$tmpf"
  fi
  [[ -z "$(printf '%s' "$body" | tr -d '[:space:]')" ]] && die "PR-Body leer."

  local autoL; autoL="$(derive_labels "$scope")"
  [[ -n "$autoL" ]] && LABELS="${LABELS:+$LABELS,}$autoL"

  case "$(host_kind)" in
    gitlab)
      if has glab; then
        local args=(mr create --title "$TITLE2" --description "$body" --source-branch "$(git_branch)" --target-branch "$WGX_BASE")
        (( DRAFT )) && args+=(--draft)
        [[ -n "$ISSUE" ]] && args+=(--issue "$ISSUE")
        if [[ -n "$LABELS" ]]; then IFS=, read -r -a _labels <<<"$LABELS"; local _l; for _l in "${_labels[@]}"; do _l="$(trim "$_l")"; [[ -n "$_l" ]] && args+=(--label "$_l"); done; fi
        if [[ "$REVIEWERS" == "auto" ]]; then
          local rlist="" r; rlist="$(printf "%s\n" "$files" | _codeowners_reviewers || true)"
          [[ -n "$rlist" ]] && { while IFS= read -r r; do [[ -n "$r" ]] && args+=(--reviewer "$r"); done <<< "$rlist"; info "Reviewer (auto): $(printf '%s' "$rlist" | tr '\n' ' ')"; }
        elif [[ -n "$REVIEWERS" ]]; then
          IFS=, read -r -a rv <<<"$REVIEWERS"; local r; for r in "${rv[@]}"; do r="$(trim "$r")"; [[ -n "$r" ]] && args+=(--reviewer "$r"); done
        fi
        glab "${args[@]}" || die "glab mr create fehlgeschlagen."
        ok "Merge Request erstellt."
        (( OPEN_PR )) && glab mr view --web >/dev/null 2>&1 || true
      else
        warn "glab nicht gefunden – MR manuell anlegen. Vergleich: $(compare_url)"
      fi
      ;;
    github)
      if has gh; then
        local args=(pr create --title "$TITLE2" --body "$body" --base "$WGX_BASE")
        (( DRAFT )) && args+=(--draft)
        [[ -n "$ISSUE" ]] && args+=(--issue "$ISSUE")
        if [[ -n "$LABELS" ]]; then IFS=, read -r -a _labels <<<"$LABELS"; local _l; for _l in "${_labels[@]}"; do _l="$(trim "$_l")"; [[ -n "$_l" ]] && args+=(--label "$_l"); done; fi
        if [[ "$REVIEWERS" == "auto" ]]; then
          local rlist="" r; rlist="$(printf "%s\n" "$files" | _codeowners_reviewers || true)"
          [[ -n "$rlist" ]] && { while IFS= read -r r; do [[ -n "$r" ]] && args+=(--reviewer "$r"); done <<< "$rlist"; info "Reviewer (auto): $(printf '%s' "$rlist" | tr '\n' ' ')"; }
        elif [[ -n "$REVIEWERS" ]]; then
          IFS=, read -r -a rv <<<"$REVIEWERS"; local r; for r in "${rv[@]}"; do r="$(trim "$r")"; [[ -n "$r" ]] && args+=(--reviewer "$r"); done
        fi
        gh "${args[@]}" || die "gh pr create fehlgeschlagen."
        ok "PR erstellt."
        (( OPEN_PR )) && gh pr view -w >/dev/null 2>&1 || true
      else
        warn "gh nicht gefunden – PR manuell anlegen. Vergleich: $(compare_url)"
      fi
      ;;
    codeberg|gitea|*)
      # Fallback: Compare-URL ausgeben (manuelle PR/MR-Erstellung im Browser)
      local url; url="$(compare_url)"
      [[ -z "$url" ]] && die "Kein Remote erkannt – PR/MR manuell erstellen."
      echo "Vergleich: $url"
      echo "Labels: $LABELS"
      echo "--- PR-Text ---"
      echo "$body"
      ok "Vergleichslink erzeugt (Codeberg/Gitea Fallback)."
      ;;
  esac
}

# ─────────────────────────────────────────────────────────────────────────────
# DOCTOR / INIT / SETUP / START
# ─────────────────────────────────────────────────────────────────────────────
doctor_cmd(){
  local in_repo=1; is_git_repo || in_repo=0
  echo "=== wgx doctor ==="
  echo "root : $(ROOT)"
  if ((in_repo)); then
    local br ahead=0 behind=0 web api
    br="$(git_branch)"
    read -r behind ahead < <(git_ahead_behind "$br") || true
    web="$(detect_web_dir || true)"; api="$(detect_api_dir || true)"
    echo "branch: $br (ahead:$ahead behind:$behind), base:$WGX_BASE"
    echo "web  : ${web:-nicht gefunden}"
    echo "api  : ${api:-nicht gefunden}"
  else
    echo "branch: (kein Repo)"
  fi
  echo "gh   : $(gh --version 2>/dev/null | head -n1 || echo missing)"
  echo "glab : $(glab --version 2>/dev/null | head -n1 || echo missing)"
  echo "vale : $([[ -f ".vale.ini" ]] && echo present || echo missing)"
  (( OFFLINE )) && echo "mode : offline"
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
WGX_ASSUME_YES=0
WGX_DRAFT_ON_WARN=0
WGX_OFFLINE=0
# Optional: WGX_WEB_DIR=apps/web
# Optional: WGX_API_DIR=apps/api
# Optional: WGX_PM=pnpm|npm|yarn
EOF
    ok ".wgx.conf angelegt."
  fi
  mkdir -p .wgx
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
    info "Termux-Basis: git, gh, glab, curl, unzip installieren…"
    pkg update -y && pkg upgrade -y
    pkg install -y git gh glab curl wget unzip || true
    ok "Termux-Setup: done."
  else
    info "Stelle sicher: git, gh (optional glab), jq/vale falls gewünscht."
  fi
}

start_cmd(){
  require_repo
  local slug="" issue=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --issue) shift; issue="${1-}";;
      *)       slug="${1-}";;
    esac; shift || true
  done
  [[ -z "$slug" ]] && die "Usage: wgx start [--issue <ID>] <slug>"

  (( OFFLINE )) || git fetch origin "$WGX_BASE" 2>/dev/null || true
  local base_ref="origin/$WGX_BASE"
  git rev-parse --verify -q "$base_ref" >/dev/null || base_ref="$WGX_BASE"
  git rev-parse --verify -q "$base_ref" >/dev/null || die "Basisbranch $WGX_BASE nicht gefunden."

  local extglob_prev=0; shopt -q extglob && extglob_prev=1; shopt -s extglob
  slug="${slug//[^a-zA-Z0-9._-]/-}"; slug="${slug//../.}"; slug="${slug##+(-)}"; slug="${slug%%+(-)}"
  [[ -z "$slug" ]] && { ((extglob_prev)) || shopt -u extglob; die "leerer Branch-Name."; }
  local name="$slug"; [[ -n "$issue" ]] && name="feat-${issue}-${slug}"
  name="${name//+(-)/-}"; name="${name//@\{/-}"; [[ "$name" == *.lock ]] && name="${name%.lock}-lock"
  ((extglob_prev)) || shopt -u extglob

  git check-ref-format --branch "$name" || die "Ungültiger Branch-Name: $name"
  git checkout -b "$name" "$base_ref"   || die "Branch konnte nicht erstellt werden."
  ok "Branch '$name' erstellt."
}

# ─────────────────────────────────────────────────────────────────────────────
# ROUTER
# ─────────────────────────────────────────────────────────────────────────────
case "${SUB:-}" in
  status)   status_cmd "$@";;
  sync)     sync_cmd "$@";;
  send)     send_cmd "$@";;
  guard)    guard_run "$@";;
  doctor)   doctor_cmd "$@";;
  init)     init_cmd "$@";;
  setup)    setup_cmd "$@";;
  start)    start_cmd "$@";;
  help|-h|--help|"") usage;;
  *) die "Unbekanntes Kommando: ${SUB:-<leer>}";;
esac