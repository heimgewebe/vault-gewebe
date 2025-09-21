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