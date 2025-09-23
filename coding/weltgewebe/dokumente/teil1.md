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
case "${OFFLINE:-0}" in 1) OFFLINE=1;; *) OFFLINE=0;; endesac=true
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
    bitbucket.org) echo "https://bitbucket.org/${path}/branches/compare/${base}..${ref}";;  # ggf. Alternative: ${ref}%0D${base}
    *) echo "https://${host}/${path}";;
  esac
}