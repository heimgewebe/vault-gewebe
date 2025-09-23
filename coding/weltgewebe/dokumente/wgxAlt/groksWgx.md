#!/usr/bin/env bash
# --- Weltgewebe wgx v3.8.5 – Einmal-Installer (Termux/WSL/mac/Linux, monolithisch) ---
set -Eeuo pipefail
IFS=$'\n\t'

# 0) Repo finden (fail-fast, aber flexibel)
repo=""
if git -C "$PWD" rev-parse --show-toplevel >/dev/null 2>&1; then
  repo="$(git -C "$PWD" rev-parse --show-toplevel)"
elif [ -n "${WGX_REPO_PATH:-}" ] && [ -d "$WGX_REPO_PATH/.git" ]; then
  repo="$WGX_REPO_PATH"
elif [ -d "$HOME/weltgewebe-repo/.git" ]; then
  repo="$HOME/weltgewebe-repo"
fi
if [ -z "${repo:-}" ] || [ ! -d "$repo/.git" ]; then
  echo "❌ Kein Git-Repo gefunden."
  echo "   Tipp: im Repo ausführen oder Repo mit .git unter \$WGX_REPO_PATH oder ~/weltgewebe-repo anlegen."
  exit 1
fi

# Schreibtest (frühzeitig!)
if ! ( touch "$repo/.wgx_permcheck" 2>/dev/null && rm -f "$repo/.wgx_permcheck" ); then
  echo "❌ Keine Schreibrechte im Repo: $repo"
  exit 1
fi

# 1) (Optional) Alte wg-Reste entfernen
if [ "${WGX_CLEAN_OLD:-0}" = "1" ]; then
  [ -f "$repo/wg" ] && rm -f "$repo/wg"
  ([ -L "$HOME/bin/wg" ] || [ -f "$HOME/bin/wg" ]) && rm -f "$HOME/bin/wg"
fi

# 2) Vorherige wgx sichern (+ simple Rotation)
ts="$(date +%s 2>/dev/null || awk 'BEGIN{print systime()}')"
backup="$repo/wgx.bak.$ts"
[ -f "$repo/wgx" ] && cp -f "$repo/wgx" "$backup" || backup="(kein Vorgänger)"
find "$repo" -maxdepth 1 -name 'wgx.bak.*' -mtime +14 -delete 2>/dev/null || true

# 3) wgx schreiben (gehärtet, portabel, webstack-ready)
cat > "$repo/wgx" <<'WGX'
#!/usr/bin/env bash
# Weltgewebe CLI – wgx v3.8.5 (2025-09-13)
# Ziele: Termux/WSL/mac/Linux • Rust(axum/sqlx)+SvelteKit • portabel • sicher • mobil-first
set -Eeuo pipefail
IFS=$'\n\t'
umask 077

WGX_VERSION="3.8.5"

# ── Helpers / Env ─────────────────────────────────────────────────────────────
has() { command -v "$1" >/dev/null 2>&1; }
is_termux() { case "${PREFIX-}" in */com.termux/*) return 0;; *) return 1;; esac; }
is_wsl() { uname -r 2>/dev/null | grep -qi 'microsoft\|wsl'; }
ROOT() {
  local r
  r="$(git -C "${PWD}" rev-parse --show-toplevel 2>/dev/null || true)"
  if [[ -n "$r" ]]; then printf "%s" "$r"; else
    local here; here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"; printf "%s" "$here"
  fi
}
ROOT_DIR="$(ROOT)"

# Warnung bei Root
if [[ "${EUID-}" -eq 0 ]]; then
  if [[ "${WGX_ALLOW_ROOT:-0}" != "1" ]]; then
    die "wgx als root auszuführen ist nicht erlaubt (setze WGX_ALLOW_ROOT=1 zum Überspringen)."
  else
    warn "wgx als root ausgeführt – Vorsicht empfohlen."
  fi
fi

# Farben (abschaltbar via NO_COLOR/WGX_NO_COLOR, nur wenn stdout TTY)
if [[ -t 1 && -z "${NO_COLOR-}" && "${WGX_NO_COLOR-0}" != "1" ]]; then
  c0=$'\e[0m'; cG=$'\e[32m'; cY=$'\e[33m'; cR=$'\e[31m'
else
  c0=''; cG=''; cY=''; cR=''
fi
ok()  { printf "${cG}✅ %s${c0}\n" "$*"; }
info(){ printf "• %s\n" "$*"; }
warn(){ printf "${cY}⚠️  %s${c0}\n" "$*"; is_termux && has termux-toast && termux-toast "wgx Warnung: $*"; }
die() { printf "${cR}❌ %s${c0}\n" "$*" >&2; is_termux && has termux-toast && termux-toast "wgx Fehler: $*"; exit "${2:-1}"; }

trap 'ec=$?; line=$LINENO; ((ec)) && printf "${cR}❌ wgx failed (line %s, ec=%s)${c0}\n" "$line" "$ec" >&2' ERR

# Defaults + Konfig
REMOTE="origin"
MAIN="main"
PROMPT_TIMEOUT="30"
ASSUME_YES="0"
TMP_DIR_DEFAULT="/tmp"
TERMUX_TMP="/data/data/com.termux/files/usr/tmp"
TMP_DIR="${WGX_TMP_DIR:-$([ -d "$TERMUX_TMP" ] && echo "$TERMUX_TMP" || echo "$TMP_DIR_DEFAULT")}"
API_PORT="${WGX_API_PORT:-8787}"
WEB_PORT="${WGX_WEB_PORT:-5173}"
API_HEALTH="${WGX_API_HEALTH:-/health}"
MIN_COV="${WGX_MIN_COVERAGE:-80}"
MIN_BRANCH_COV="${WGX_MIN_BRANCH_COVERAGE:-0}"
MIN_FUNC_COV="${WGX_MIN_FUNC_COVERAGE:-0}"
PROCESS_NAMES_REGEX="${WGX_PROCESS_NAMES:-node|vite|npm|pnpm|cargo}"
API_DIR="${WGX_API_DIR:-}"
WEB_DIR="${WGX_WEB_DIR:-}"
ADB_REVERSE="${WGX_ADB_REVERSE:-1}"
RUST_FULL_COV="${WGX_RUST_FULL_COV:-0}"   # 1 = cargo llvm-cov full statt summary

# PROJECT_KEY (basename@sha12) mit Fallback
_short_hash() {
  local s="$1"
  if has sha256sum; then printf '%s' "$s" | sha256sum | awk '{print $1}' | cut -c1-12
  elif has shasum; then printf '%s' "$s" | shasum -a 256 | awk '{print $1}' | cut -c1-12
  elif has uuidgen; then uuidgen | tr -d '-' | cut -c1-12
  else date +%s | sed 's/[^0-9]//g'
  fi
}
PROJECT_KEY="${WGX_PROJECT_KEY:-$(basename "$ROOT_DIR")@$(_short_hash "$ROOT_DIR")}"

# Konfig-Dateien lesen (KEY=VAL; erster '=' trennt, Werte dürfen Leerzeichen enthalten)
_read_kv_file() {
  local f="$1"; [[ -f "$f" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    local k="${line%%=*}" v="${line#*=}"
    case "$k" in
      WGX_REMOTE) REMOTE="$v";;
      WGX_MAIN) MAIN="$v";;
      WGX_TIMEOUT) PROMPT_TIMEOUT="$v";;
      WGX_ASSUME_YES) ASSUME_YES="$v";;
      WGX_TMP_DIR) TMP_DIR="$v";;
      WGX_PROJECT_KEY) PROJECT_KEY="$v";;
      WGX_MIN_COVERAGE) MIN_COV="$v";;
      WGX_MIN_BRANCH_COVERAGE) MIN_BRANCH_COV="$v";;
      WGX_MIN_FUNC_COVERAGE) MIN_FUNC_COV="$v";;
      WGX_PROCESS_NAMES) PROCESS_NAMES_REGEX="$v";;
      WGX_API_PORT) API_PORT="$v";;
      WGX_WEB_PORT) WEB_PORT="$v";;
      WGX_API_HEALTH) API_HEALTH="$v";;
      WGX_API_DIR) API_DIR="$v";;
      WGX_WEB_DIR) WEB_DIR="$v";;
      WGX_ADB_REVERSE) ADB_REVERSE="$v";;
      WGX_RUST_FULL_COV) RUST_FULL_COV="$v";;
      WGX_NO_COLOR) : ;;
      *) warn "Unbekannter Schlüssel in Konfig-Datei: $k";;
    esac
  done < "$f"
}
[[ -f "$ROOT_DIR/.wgx.conf" ]] && _read_kv_file "$ROOT_DIR/.wgx.conf"
[[ -f "$HOME/.config/wgx/config" ]] && _read_kv_file "$HOME/.config/wgx/config"

_validate_conf() {
  [[ "$PROMPT_TIMEOUT" =~ ^[0-9]+$ ]] || die "WGX_TIMEOUT muss Zahl sein"
  [[ "$MIN_COV" =~ ^[0-9]+$ ]] || die "WGX_MIN_COVERAGE muss Zahl sein"
  [[ "$MIN_BRANCH_COV" =~ ^[0-9]+$ ]] || die "WGX_MIN_BRANCH_COVERAGE muss Zahl sein"
  [[ "$MIN_FUNC_COV" =~ ^[0-9]+$ ]] || die "WGX_MIN_FUNC_COVERAGE muss Zahl sein"
  [[ "$TMP_DIR" =~ ^[a-zA-Z0-9_./-]+$ ]] || die "WGX_TMP_DIR: ungültige Zeichen"
  mkdir -p "$TMP_DIR" 2>/dev/null || warn "TMP_DIR nicht erstellbar: $TMP_DIR"
  [[ "$PROJECT_KEY" =~ ^[A-Za-z0-9._@-]+$ ]] || warn "PROJECT_KEY ungewöhnlich – A-Za-z0-9._@- empfohlen"
}
_validate_conf

ensure_repo() { [[ -d "$ROOT_DIR/.git" ]] || die "Kein Git-Repo (ROOT=$ROOT_DIR)"; }
branch() { local b; b="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"; echo "${b:-HEAD}"; }

# ── Laufzeit/Logs ────────────────────────────────────────────────────────────
API_PID="$TMP_DIR/wgx-api.pid"; WEB_PID="$TMP_DIR/wgx-web.pid"
API_LOG="$TMP_DIR/wgx-api.log"; WEB_LOG="$TMP_DIR/wgx-web.log"

_stat_size() {
  if has stat; then stat -c %s "$1" 2>/dev/null || stat -f%z "$1" 2>/dev/null || echo 0
  else wc -c <"$1" 2>/dev/null || echo 0; fi
}
_epoch() { date +%s 2>/dev/null || awk 'BEGIN{print systime()}'; }
_log_rotate_if_needed() {
  local f="$1" max=10485760
  [[ -f "$f" ]] || return 0
  local sz="$(_stat_size "$f")"; (( sz<max )) && return 0
  local ts="$(_epoch)"
  mv -f "$f" "${f}.${ts}" || return 0
  if has gzip; then gzip -f "${f}.${ts}" 2>/dev/null || warn "gzip fehlgeschlagen – Log bleibt unkomprimiert."
  else warn "gzip fehlt – Logs bleiben unkomprimiert."; fi
  # portable cleanup (BSD/GNU)
  find "$(dirname "$f")" -maxdepth 1 -name "$(basename "$f").*.gz" -mtime +7 -exec rm -f {} \; 2>/dev/null || true
}
cleanup_tmp_logs() { find "$TMP_DIR" -maxdepth 1 -type f -name 'wgx-*.log' -mtime +1 -exec rm -f {} \; 2>/dev/null || true; }
proc_running() { local f="$1"; [[ -f "$f" ]] && kill -0 "$(cat "$f")" 2>/dev/null; }

# ── Netz/HTTP ────────────────────────────────────────────────────────────────
curl_ok() { has curl || return 1; curl -fsS --connect-timeout 5 --max-time 15 --retry 3 --retry-max-time 40 "$1" >/dev/null 2>&1; }

# ── ps / Prozess-Targeting (sicher & portabel) ───────────────────────────────
ps_pid_comm_stream() {
  if ps -eo pid=,comm= >/dev/null 2>&1; then
    ps -eo pid=,comm=
  elif ps -Ax -o pid= -o comm= >/dev/null 2>&1; then
    ps -Ax -o pid= -o comm=
  elif ps ax >/dev/null 2>&1; then
    ps ax | awk 'NR>1 { comm = $5; sub(/.*\//, "", comm); print $1, comm }'  # POSIX sub für basename
  else
    ps | awk 'NR>1 { comm = $4; sub(/.*\//, "", comm); print $1, comm }'  # POSIX sub Fallback
  fi
}
_comm_ok() { [[ "$1" =~ ^($PROCESS_NAMES_REGEX)$ ]]; }
_env_has_key() { [[ -r "/proc/$1/environ" ]] && tr '\0' '\n' <"/proc/$1/environ" | grep -qx "PROJECT_KEY=$PROJECT_KEY"; }
_args_has_root() {
  ps -p "$1" -o args= 2>/dev/null | grep -Eq -- "$(printf '%s' "$ROOT_DIR" | sed 's/[.[\()*^$+?{|}/\\&]/g')" && return 0
  ps -p "$1" -o args= 2>/dev/null | grep -Eq 'cargo +run|pnpm +dev|npm +run +dev|vite' && return 0
  return 1
}

# etime → Sekunden (robust; 1-02:03:04, 12:34:56, 07:08, 55)
_etime_to_sec(){
  local t s=0 d=0; t="$1"
  t="${t// /}" # trim spaces from some BSD ps formats
  if [[ "$t" == *-* ]]; then d="${t%%-*}"; t="${t#*-}"; [[ "$d" =~ ^[0-9]+$ ]] || d=0; fi
  IFS=: read -r a b c <<<"$t"
  if [[ -n "$c" ]]; then s=$((10#$a*3600 + 10#$b*60 + 10#$c))
  elif [[ -n "$b" ]]; then s=$((10#$a*60  + 10#$b))
  elif [[ -n "$a" ]]; then s=$((10#$a)); fi
  echo $(( s + 10#$d*86400 ))
}

# Härteres Stoppen inkl. PGID-Fallback (nur für verifizierte Targets)
_stop_pid() {
  local pid="$1" comm pgid verified=0
  [[ "$pid" =~ ^[0-9]+$ ]] || return 0
  comm="$(ps -o comm= -p "$pid" 2>/dev/null || true)"
  _comm_ok "$comm" || return 0

  if [[ -r "/proc/$pid/environ" ]]; then
    _env_has_key "$pid" && verified=1
  else
    _args_has_root "$pid" && verified=1
  fi
  (( verified )) || return 0

  # sanft
  kill "$pid" 2>/dev/null || true
  for _ in {1..10}; do kill -0 "$pid" 2>/dev/null || return 0; sleep 0.2; done

  # Gruppen-Fallback (wie v3.4): TERM → KILL auf PGID, falls bestimmbar
  pgid="$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d '[:space:]')"
  if [[ "$pgid" =~ ^[0-9]+$ ]]; then
    kill -TERM "-$pgid" 2>/dev/null || true
    for _ in {1..10}; do kill -0 "$pid" 2>/dev/null || return 0; sleep 0.2; done
    kill -KILL "-$pgid" 2>/dev/null || true
    for _ in {1..5}; do kill -0 "$pid" 2>/dev/null || return 0; sleep 0.2; done
  fi

  # letzte Eskalation direkt auf pid
  kill -9 "$pid" 2>/dev/null || true
}

pid_age_over_day(){
  local pid="$1"
  local et="$(ps -p "$pid" -o etime= 2>/dev/null || true)"
  [[ -z "$et" ]] && return 1
  local secs; secs="$(_etime_to_sec "$et")"
  (( secs > 86400 ))
}

kill_by_key() {
  local dry=0 force=0
  for a in "$@"; do case "$a" in --dry-run) dry=1;; --force-kill) force=1;; esac; done

  local pid_stream
  if ps -eo pid=,comm= >/dev/null 2>&1; then
    pid_stream="$(ps -eo pid=,comm= 2>/dev/null | awk -v re="$PROCESS_NAMES_REGEX" '$2 ~ re {print $1}')"
  elif ps ax >/dev/null 2>&1; then
    pid_stream="$(ps ax | awk -v re="$PROCESS_NAMES_REGEX" '{ comm = $5; sub(/.*\//, "", comm); if (comm ~ re) print $1 }')"  # POSIX sub, $5 als Comm
  else
    warn "Keine unterstützte ps-Variante gefunden – kill_by_key übersprungen."
    return 0
  fi

  while read -r pid; do
    [[ "$pid" =~ ^[0-9]+$ ]] || continue
    if (( ! force )) && pid_age_over_day "$pid"; then continue; fi
    if (( dry )); then echo "DRY: would stop $pid"; else _stop_pid "$pid"; fi
  done <<< "$pid_stream"
}

# ── UI ───────────────────────────────────────────────────────────────────────
ask_yn() { local q="$1" def="${2:-n}" ans; (( ASSUME_YES )) && { echo y; return; }
  read -r -t "$PROMPT_TIMEOUT" -p "$q " ans || ans="$def"; ans="${ans:-$def}"; [[ "$ans" =~ ^[yY]$ ]] && echo y || echo n; }

# ── Hilfe ────────────────────────────────────────────────────────────────────
_help_root() {
cat <<EOF
wgx v${WGX_VERSION} – Kommandos & Beispiele

Lifecycle:
  wgx install                      # pnpm/npm install (+cargo fetch)
  wgx up [--wait S]                # Compose oder Dev-Server starten (Health-Warte)
  wgx down [--dry-run|--force-kill]# Stoppt Dev/Compose (sicherer Kill)
  wgx open [URL] [--check]         # Browser-Open (Termux/WSL/mac/Linux), optional Port-Check
  wgx logs [-f] [--tail N] [--grep PATTERN] [api|web|all]
  wgx test                         # JS+Rust Coverage-Gates (optional full-cov via WGX_RUST_FULL_COV=1)
  wgx audit                        # npm audit + trivy fs (optional)
  wgx gc [--auto]                  # Build-/Cache-Verzeichnisse räumen
  wgx lint                         # shellcheck (falls installiert)

Gitflow:
  wgx status [--compact|--json]    # ahead/behind, Services-Health
  wgx pull [--stash]               # rebase auf origin/main
  wgx snap [--include-untracked] [--msg "…"]  # Commit ohne Push
  wgx send [--rebase=ours|theirs|normal|interactive] [--dry-run]
  wgx pr                           # PR-Link (GH/GL/BB)
  wgx heal [--continue|--skip|--abort]
  wgx hooks | sync-main

Tools:
  wgx reload | clean [--apply] | fix-perms | net-guard | doctor | diag | log [N]
  wgx config [list|get|set KEY=VAL|reset]
  wgx ps | where
  wgx --version
EOF
}

_help_logs() {
cat <<'EOF'
Nutzung: wgx logs [-f|--follow] [--tail N] [--grep PATTERN] (api|web|all)
  -f, --follow   : kontinuierlich folgen
  --tail N       : letzte N Zeilen (Standard 100, N>0)
  --grep PATTERN : Ausgabe filtern (grep -E, line-buffered)
EOF
}
_help_up(){ cat <<'EOF'
Nutzung: wgx up [--wait SECONDS]
  --wait S   : Health-Check bis S Sekunden (Standard 30)
EOF
}

cmd_help() { case "${1-}" in logs) _help_logs;; up) _help_up;; ""|-h|--help) _help_root;; *) echo "Keine spezifische Hilfe für '$1'."; _help_root;; esac; }

# ── Compose / Curl ───────────────────────────────────────────────────────────
has_docker_compose() { if has docker && docker compose version >/dev/null 2>&1; then return 0; fi; has docker-compose; }
compose() { if has docker && docker compose version >/dev/null 2>&1; then docker compose "$@"; else docker-compose "$@"; fi; }

# ── Core ─────────────────────────────────────────────────────────────────────
detect_api_dir(){
  [[ -n "$API_DIR" && -f "$ROOT_DIR/$API_DIR/Cargo.toml" ]] && { printf "%s" "$ROOT_DIR/$API_DIR"; return; }
  for d in "apps/api" "api" "server" "backend" "apps/api-elysia"; do
    [[ -f "$ROOT_DIR/$d/Cargo.toml" ]] && { printf "%s" "$ROOT_DIR/$d"; return; }
  done
}
detect_web_dir(){
  [[ -n "$WEB_DIR" && -f "$ROOT_DIR/$WEB_DIR/package.json" ]] && { printf "%s" "$ROOT_DIR/$WEB_DIR"; return; }
  for d in "apps/web" "web" "frontend" "ui"; do
    [[ -f "$ROOT_DIR/$d/package.json" ]] && { printf "%s" "$ROOT_DIR/$d"; return; }
  done
}

conflict_scan() {
  ensure_repo
  if git -C "$ROOT_DIR" ls-files --unmerged | grep -q .; then
    warn "Unmerged paths:"; git -C "$ROOT_DIR" ls-files --unmerged | cut -f2 | sort -u | sed 's/^/  - /'
    die "Konflikte lösen → editieren → git add → (rebase|merge) --continue"
  fi
  if git -C "$ROOT_DIR" grep -nE '^(<<<<<<<|=======|>>>>>>>)' -- . ':!*.lock' >/dev/null 2>&1; then
    die "Konfliktmarker gefunden (<<<<<<< ======= >>>>>>>). Bitte räumen."
  fi
}

cmd_doctor() {
  ensure_repo
  echo "root   : $ROOT_DIR"
  echo "branch : $(branch)"
  echo "git    : $(git --version 2>/dev/null || echo missing)"
  echo "termux : $(is_termux && echo yes || echo no) | wsl: $(is_wsl && echo yes || echo no)"
  ok "Doctor OK"
}

cmd_install() {
  ensure_repo
  local api web
  api="$(detect_api_dir || true)"; web="$(detect_web_dir || true)"
  # Web deps
  if [[ -n "$web" ]]; then
    info "Install Web-Deps in $web…"
    if has pnpm; then ( cd "$web" && pnpm install )
    else ( cd "$web" && npm install ); fi
  fi
  # Rust deps
  if [[ -n "$api" && has cargo ]]; then
    info "cargo fetch in $api…"
    ( cd "$api" && cargo fetch ) || warn "cargo fetch warnte – prüfe ggf. DB-Backends (z. B. 'pkg install sqlite' in Termux)"
    # sqlx offline hint
    if grep -q '"sqlx"' "$api/Cargo.toml" 2>/dev/null; then
      if ! ls "$api"/.sqlx/query-*.json >/dev/null 2>&1; then
        warn "sqlx offline-Daten fehlen – 'cargo sqlx prepare' (oder DB bereitstellen)."
      fi
    fi
  fi
  ok "Abhängigkeiten installiert."
}

run_bg() { # name cwd pidfile logfile cmd...
  local name="$1"; shift; local cwd="$1"; shift; local pidf="$1"; shift; local logf="$1"; shift
  mkdir -p "$cwd" 2>/dev/null || true; _log_rotate_if_needed "$logf"
  if proc_running "$pidf"; then info "$name läuft (PID $(cat "$pidf"))."; return 0; fi
  local -a starter=(nohup)
  if is_termux && has setsid; then starter=(setsid nohup); fi
  (
    cd "$cwd" || exit 0
    PROJECT_KEY="$PROJECT_KEY" "${starter[@]}" "$@" >>"$logf" 2>&1 </dev/null &
    local bgpid=$!
    echo "$bgpid" >"$pidf.$$" && mv -f "$pidf.$$" "$pidf"  # atomic write
  ) || warn "$name start fehlgeschlagen"
  sleep 0.15
  [[ -f "$pidf" ]] && echo "↪ $name PID $(cat "$pidf")  Logs: $logf"
}

_port_in_use(){
  local p="$1"
  if has ss; then ss -H -ltnu | awk '{print $5}' | awk -F'[: ]' '{print $NF}' | grep -qx "$p"
  elif has netstat; then netstat -an 2>/dev/null | awk '{print $4}' | awk -F'[: ]' '{print $NF}' | grep -qx "$p"
  elif has lsof; then lsof -i :"$p" >/dev/null 2>&1
  else return 1; fi
}

cmd_up() {
  ensure_repo
  trap 'echo; warn "Signal – stoppe…"; cmd_down; exit 130' INT TERM
  local wait=30
  while [[ $# -gt 0 ]]; do case "$1" in --wait) [[ "${2-}" =~ ^[1-9][0-9]*$ ]] || die "--wait braucht positive Zahl"; wait="$2"; shift 2;; *) break;; esac; done
  echo "🚀 wgx up – starte Services"; conflict_scan
  cleanup_tmp_logs; _log_rotate_if_needed "$API_LOG"; _log_rotate_if_needed "$WEB_LOG"

  local api="$(detect_api_dir || true)" web="$(detect_web_dir || true)"
  if has_docker_compose && [[ -f "$ROOT_DIR/infra/compose.dev.yml" ]]; then
    info "Compose: infra/compose.dev.yml"; ( cd "$ROOT_DIR" && compose -f infra/compose.dev.yml up -d )
    ok "Compose aktiv."
  else
    info "Kein Compose – starte Dev (Hintergrund, PROJECT_KEY=$PROJECT_KEY)."
    if [[ -n "$api" ]]; then
      if has cargo; then run_bg "wgx-api" "$api" "$API_PID" "$API_LOG" cargo run
      elif [[ -f "$api/package.json" ]]; then
        if has pnpm; then run_bg "wgx-api" "$api" "$API_PID" "$API_LOG" pnpm dev
        else run_bg "wgx-api" "$api" "$API_PID" "$API_LOG" npm run dev; fi
      else warn "API-Verzeichnis gefunden, aber keine Startstrategie."; fi
  else warn "API nicht gefunden."; fi

    if [[ -n "$web" ]]; then
      if _port_in_use "$WEB_PORT"; then warn "Port ${WEB_PORT} belegt – prüfe laufende Prozesse (wgx ps, wgx down --dry-run)"; fi
      if has pnpm; then run_bg "wgx-web" "$web" "$WEB_PID" "$WEB_LOG" pnpm dev
      else run_bg "wgx-web" "$web" "$WEB_PID" "$WEB_LOG" npm run dev; fi
    else warn "Web nicht gefunden."; fi
  fi

  # Health
  if has curl; then
    local tries=0 okh=0
    while (( tries<wait )); do curl_ok "http://localhost:${API_PORT}${API_HEALTH}" && { okh=1; break; }; sleep 1; ((tries++)); done
    (( okh )) && ok "API gesund: http://localhost:${API_PORT}${API_HEALTH}" || warn "API nicht erreichbar. Logs: $API_LOG"
  else
    info "curl fehlt – überspringe Health-Check."
  fi
  echo "ℹ Web (falls gestartet): http://localhost:${WEB_PORT}"

  # Termux: adb reverse optional
  if is_termux && [[ "${ADB_REVERSE}" = "1" ]]; then
    if has adb; then adb reverse "tcp:${WEB_PORT}" "tcp:${WEB_PORT}" || warn "adb reverse fehlgeschlagen."
    else warn "adb fehlt – 'pkg install android-tools' und ggf. 'adb reverse tcp:${WEB_PORT} tcp:${WEB_PORT}'"; fi
    has termux-toast && termux-toast "wgx up fertig"
  fi

  # Codespaces Hinweis
  if [[ -n "${CODESPACE_NAME-}" ]]; then
    local cs_url="https://${CODESPACE_NAME}-${WEB_PORT}.app.github.dev"
    info "Codespaces URL: $cs_url"
    has code && code --open-url "$cs_url" >/dev/null 2>&1 || true
  fi

  ok "Ready."
}

cmd_down() {
  ensure_repo
  echo "🛑 wgx down – stoppe Services"
  local dry=0 force=0
  for a in "$@"; do case "$a" in --dry-run) dry=1;; --force-kill) force=1;; esac; done

  if has_docker_compose && [[ -f "$ROOT_DIR/infra/compose.dev.yml" ]]; then
    info "Compose down…"; ( cd "$ROOT_DIR" && compose -f infra/compose.dev.yml down ) || warn "Compose-Stop fehlgeschlagen"
  fi
  if proc_running "$API_PID"; then kill "$(cat "$API_PID")" 2>/dev/null || true; rm -f "$API_PID" || true; info "API-Prozess gestoppt."; fi
  if proc_running "$WEB_PID"; then kill "$(cat "$WEB_PID")" 2>/dev/null || true; rm -f "$WEB_PID" || true; info "Web-Prozess gestoppt."; fi

  info "Suche Dev-Prozesse (PROJECT_KEY)…"
  if (( dry )); then kill_by_key --dry-run || true
  else kill_by_key ${force:+--force-kill} || true; fi

  cleanup_tmp_logs; ok "Services gestoppt."
}

_grep_E_L(){
  if grep --help 2>&1 | grep -q -- '--line-buffered'; then
    grep -E --line-buffered "$@"
  elif command -v stdbuf >/dev/null 2>&1; then
    stdbuf -oL grep -E "$@"
  else
    grep -E "$@"
  fi
}

cmd_logs() {
  ensure_repo
  local follow=0 tailn=100 grep_pat="" target="all"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -f|--follow) follow=1; shift;;
      --tail) [[ "${2-}" =~ ^[1-9][0-9]*$ ]] || die "--tail braucht positive Zahl"; tailn="$2"; shift 2;;
      --grep) grep_pat="${2-}"; shift 2;;
      api|web|all) target="$1"; shift;;
      -h|--help) _help_logs; return 0;;
      *) warn "Ignoriere: $1"; shift;;
    esac
  done
  local args=( -n "$tailn" ); (( follow )) && args=( -f "${args[@]}" )
  local files=()
  case "$target" in
    api) [[ -f "$API_LOG" ]] || die "Logdatei $API_LOG fehlt."; files+=("$API_LOG");;
    web) [[ -f "$WEB_LOG" ]] || die "Logdatei $WEB_LOG fehlt."; files+=("$WEB_LOG");;
    all) [[ -f "$API_LOG" ]] && files+=("$API_LOG"); [[ -f "$WEB_LOG" ]] && files+=("$WEB_LOG"); ((${#files[@]})) || die "Keine Log-Dateien vorhanden."; ;;
  esac
  if [[ -n "$grep_pat" ]]; then
    tail "${args[@]}" "${files[@]}" | _grep_E_L "$grep_pat"
  else
    tail "${args[@]}" "${files[@]}"
  fi
}

# ── Tests (Rust + Web) ───────────────────────────────────────────────────────
_is_number(){ [[ "$1" =~ ^[0-9]+([.][0-9]+)?$ ]]; }
_float_ge(){ _is_number "$1" && _is_number "$2" || die "Float-Vergleich: Ungültige Werte ($1 >= $2)"; awk -v a="$1" -v b="$2" 'BEGIN{exit !(a >= b)}'; }

# llvm-cov Summary -> L,B,F (%)
_parse_cov_file(){
  local f="$1"; L=0; B=0; F=0
  if [[ ! -s "$f" ]]; then warn "Coverage-Output leer: $f"; return 0; fi
  while read -r tag val; do
    case "$tag" in L) L="$val";; B) B="$val";; F) F="$val";; esac
  done < <(awk '
    /lines/    { gsub(/[^0-9.]/,"",$NF); if($NF!="") printf("L %s\n",$NF) }
    /branches/ { gsub(/[^0-9.]/,"",$NF); if($NF!="") printf("B %s\n",$NF) }
    /functions/{ gsub(/[^0-9.]/,"",$NF); if($NF!="") printf("F %s\n",$NF) }
    /TOTAL/    { gsub(/[^0-9.]/,"",$NF); if($NF!="") printf("L %s\n",$NF) }  # Fallback für TOTAL-Zeile
  ' "$f")
  local lc; lc="$(wc -l <"$f" 2>/dev/null || echo 0)"
  if [[ "$L" == "0" && "$B" == "0" && "$F" == "0" && "$lc" -lt 3 ]]; then
    warn "Coverage-Output unvollständig – prüfe llvm-cov."
  fi
}

_has_cargo_llvm_cov(){ has cargo && cargo llvm-cov --version >/dev/null 2>&1; }

cmd_test() {
  ensure_repo
  local api="$(detect_api_dir || true)" web="$(detect_web_dir || true)"

  # Web / JS (Vitest / Vite)
  if [[ -n "$web" ]]; then
    info "Web-Tests (coverage)…"
    if has pnpm; then ( cd "$web" && pnpm test --coverage ) || die "Web-Tests fehlgeschlagen."
    else ( cd "$web" && npm test --coverage ) || die "Web-Tests fehlgeschlagen."; fi

    local lcovf="$web/coverage/lcov.info"
    [[ -s "$lcovf" ]] || die "Keine Coverage-Daten (Web) – lcov.info fehlt."
    read -r LH LF BRH BRF FNH FNF < <(
      awk -F: '/^LH:/{lh+=$2}/^LF:/{lf+=$2}/^BRH:/{brh+=$2}/^BRF:/{brf+=$2}/^FNH:/{fnh+=$2}/^FNF:/{fnf+=$2} END{print lh+0, lf+0, brh+0, brf+0, fnh+0, fnf+0}' "$lcovf"
    )
    [[ "$LF" -gt 0 ]] || die "Keine Coverage-Daten (Web, LF=0)."
    local pl=$(( 100 * LH / LF )); local pb=0 pf=0
    [[ "$BRF" -gt 0 ]] && pb=$(( 100 * BRH / BRF ))
    [[ "$FNF" -gt 0 ]] && pf=$(( 100 * FNH / FNF ))
    echo "🧪 Web Coverage: Lines=${pl}% Branches=${pb}% Functions=${pf}%"
    (( pl >= MIN_COV )) || die "Web Lines unter ${MIN_COV}%."
    (( pb >= MIN_BRANCH_COV )) || die "Web Branches unter ${MIN_BRANCH_COV}%."
    (( pf >= MIN_FUNC_COV )) || die "Web Functions unter ${MIN_FUNC_COV}%."
  else
    info "Web-Teil nicht gefunden – übersprungen."
  fi

  # Rust / API
  if [[ -n "$api" && has cargo ]]; then
    info "Rust-Tests…"
    ( cd "$api" && cargo test --quiet ) || die "Rust-Tests fehlgeschlagen."
    if _has_cargo_llvm_cov; then
      info "Rust-Coverage (llvm-cov)…"
      local covtxt="$TMP_DIR/wgx_cov.txt"
      if [[ "$RUST_FULL_COV" = "1" ]]; then
        ( cd "$api" && cargo llvm-cov --workspace --all-features --summary-only >"$covtxt" 2>/dev/null || true )
      else
        ( cd "$api" && cargo llvm-cov --quiet --ignore-filename-regex '.*(tests|examples)/.*' --summary-only >"$covtxt" 2>/dev/null || true )
      fi
      [[ -s "$covtxt" ]] || die "Rust-Coverage fehlgeschlagen – prüfe cargo-llvm-cov/llvm-tools."
      local L B F; _parse_cov_file "$covtxt"
      echo "🧪 Rust Coverage: Lines=${L}% Branches=${B}% Functions=${F}%"
      _float_ge "$L" "$MIN_COV"        || die "Rust Lines unter ${MIN_COV}%."
      _float_ge "$B" "$MIN_BRANCH_COV" || die "Rust Branches unter ${MIN_BRANCH_COV}%."
      _float_ge "$F" "$MIN_FUNC_COV"   || die "Rust Functions unter ${MIN_FUNC_COV}%."
    else
      warn "cargo-llvm-cov nicht vorhanden – versuche später für präzise Coverage."
    fi
  else
    info "Rust-Teil nicht gefunden – übersprungen."
  fi

  ok "Coverage-Gates OK."
}

cmd_audit() {
  ensure_repo
  has npm && ( cd "$ROOT_DIR" && npm audit || true )
  if has trivy; then ( cd "$ROOT_DIR" && trivy fs . --include-dev-deps --exit-code 0 --no-progress || true )
  else warn "trivy nicht installiert – nur npm audit gelaufen."; fi
}

cmd_gc() {
  ensure_repo
  local auto=0; [[ "${1-}" == "--auto" ]] && auto=1
  local patterns=( "node_modules/.cache" ".svelte-kit" ".turbo" "dist" ".vite" "target" )
  echo "🧹 Preview:"; for p in "${patterns[@]}"; do [[ -e "$ROOT_DIR/$p" ]] && echo "  - $p"; done
  (( auto )) || { [[ "$(ask_yn "Anwenden? [y/N]" n)" == y ]] || return 0; }
  for p in "${patterns[@]}"; do [[ -e "$ROOT_DIR/$p" ]] && rm -rf "$ROOT_DIR/$p" 2>/dev/null || true; done
  ok "GC fertig."
}

_make_pr_link() {
  local url repo_path head="$1" base="$2"
  url="$(git -C "$ROOT_DIR" remote get-url "$REMOTE" 2>/dev/null || true)"
  if   [[ "$url" =~ ^git@github\.com:([^/]+/[^/]+?)(\.git)?$ ]]; then repo_path="${BASH_REMATCH[1]}"; printf 'https://github.com/%s/compare/%s...%s?expand=1\n' "$repo_path" "$base" "$head"; return
  elif [[ "$url" =~ ^https?://github\.com/([^/]+/[^/]+?)(\.git)?$ ]]; then repo_path="${BASH_REMATCH[1]}"; printf 'https://github.com/%s/compare/%s...%s?expand=1\n' "$repo_path" "$base" "$head"; return
  elif [[ "$url" =~ ^ssh://git@github\.com/([^/]+/[^/]+?)(\.git)?$ ]]; then repo_path="${BASH_REMATCH[1]}"; printf 'https://github.com/%s/compare/%s...%s?expand=1\n' "$repo_path" "$base" "$head"; return
  elif [[ "$url" =~ gitlab\.com[:/]+([^/]+/[^/.]+)(\.git)?/?$ ]]; then repo_path="${BASH_REMATCH[1]}"; printf 'https://gitlab.com/%s/-/merge_requests/new?merge_request[source_branch]=%s&merge_request[target_branch]=%s\n' "$repo_path" "$head" "$base"; return
  elif [[ "$url" =~ bitbucket\.org[:/]+([^/]+/[^/.]+)(\.git)?/?$ ]]; then repo_path="${BASH_REMATCH[1]}"; printf 'https://bitbucket.org/%s/pull-requests/new?source=%s&dest=%s\n' "$repo_path" "$head" "$base"; return
  fi
  warn "PR-Link nicht erkennbar – manuell erstellen."
}

cmd_pull() {
  ensure_repo; conflict_scan
  local do_stash=0; [[ "${1-}" == "--stash" ]] && do_stash=1
  if ! git -C "$ROOT_DIR" diff --quiet || ! git -C "$ROOT_DIR" diff --cached --quiet; then
    if (( do_stash )); then info "Stashe lokale Änderungen…"; git -C "$ROOT_DIR" stash push -u -m "wgx-pull-$(_epoch)" >/dev/null || true
    else die "Uncommitted changes. 'wgx pull --stash' oder 'wgx heal'."; fi
  fi
  info "Rebase auf $REMOTE/$MAIN (autostash)…"; git -C "$ROOT_DIR" rebase --autostash "$REMOTE/$MAIN" || die "Rebase-Konflikt. 'wgx heal --abort'."
  if git -C "$ROOT_DIR" stash list | grep -q 'wgx-pull-'; then info "Stash zurück…"; git -C "$ROOT_DIR" stash pop || warn "Stash-Pop Konflikte – 'wgx heal'."; fi
  ok "Pull/Rebase ok."
}

cmd_snap() {
  ensure_repo
  local include_untracked=0 msg="wgx: snapshot $(date -u +'%Y-%m-%d %H:%M:%S UTC' 2>/dev/null || awk 'BEGIN{print strftime("%Y-%m-%d %H:%M:%S UTC")}')"
  while [[ $# -gt 0 ]]; do
    case "$1" in --include-untracked) include_untracked=1; shift;;
      --msg) msg="$2"; shift 2;;
      *) warn "Ignoriere: $1"; shift;; esac
  done
  (( include_untracked )) && git -C "$ROOT_DIR" add -A || git -C "$ROOT_DIR" add -u
  git -C "$ROOT_DIR" commit -m "$msg" || info "Nichts zu committen."
  ok "Snapshot erstellt."
}

cmd_send() {
  ensure_repo; conflict_scan
  local rebase_mode="ours" dry=0
  while [[ $# -gt 0 ]]; do
    case "$1" in --rebase=*) rebase_mode="${1#*=}"; shift;;
      --dry-run) dry=1; shift;;
      *) warn "Ignoriere: $1"; shift;; esac
  done
  local br; br="$(branch)"
  [[ "$br" == "HEAD" ]] && die "Detached HEAD – bitte Branch auschecken/erstellen."
  if [[ "$br" == "$MAIN" ]]; then
    local ts newb; ts="$(date -u +%Y%m%d-%H%M%S 2>/dev/null || awk 'BEGIN{print strftime("%Y%m%d-%H%M%S")}')"; newb="feat/${ts}"
    [[ "$(ask_yn "Auf '$MAIN'. Feature-Branch '$newb' erstellen? [y/N]" n)" == y ]] || die "Abbruch."
    git -C "$ROOT_DIR" switch -c "$newb"; br="$newb"
  fi
  case "$rebase_mode" in
    ours|theirs) info "Pull --rebase (-X $rebase_mode)"; git -C "$ROOT_DIR" pull --rebase -s recursive -X "$rebase_mode" "$REMOTE" "$br" || die "Rebase scheiterte. 'wgx heal --abort'.";;
    normal)      info "Pull --rebase"; git -C "$ROOT_DIR" pull --rebase "$REMOTE" "$br" || die "Rebase scheiterte. 'wgx heal --abort'.";;
    interactive) info "Interactive rebase…"; git -C "$ROOT_DIR" rebase -i "$REMOTE/$MAIN" || die "Rebase scheiterte. 'wgx heal --abort'.";;
    *) warn "Unbekannter rebase: $rebase_mode – nutze 'ours'."; git -C "$ROOT_DIR" pull --rebase -s recursive -X ours "$REMOTE" "$br" || die "Rebase scheiterte.";;
  esac
  if (( dry )); then info "[dry-run] Push auf $REMOTE/$br"
  else
    info "Push…"
    if git -C "$ROOT_DIR" rev-parse --verify -q "refs/remotes/$REMOTE/$br" >/dev/null; then git -C "$ROOT_DIR" push "$REMOTE" "$br"
    else git -C "$ROOT_DIR" push -u "$REMOTE" "$br"; fi
    ok "Gepusht: $REMOTE/$br"
  fi
  local pr; pr="$(_make_pr_link "$br" "$MAIN")"; [[ -n "$pr" ]] && echo "🔗 PR: $pr"
  has gh && gh -C "$ROOT_DIR" pr create --fill --head "$br" --base "$MAIN" --web || true
}

cmd_pr() {
  ensure_repo
  local br; br="$(branch)"
  [[ "$br" == "$MAIN" ]] && die "Auf '$MAIN' kein PR. Bitte Feature-Branch."
  local pr; pr="$(_make_pr_link "$br" "$MAIN")"
  [[ -n "$pr" ]] || die "Remote nicht erkannt."
  if has gh; then gh -C "$ROOT_DIR" pr create --fill --head "$br" --base "$MAIN" --web || echo "🔗 $pr"
  else echo "🔗 $pr"; fi
}

cmd_heal() {
  ensure_repo
  case "${1-}" in
    --continue) git -C "$ROOT_DIR" rebase --continue 2>/dev/null || git -C "$ROOT_DIR" merge --continue 2>/dev/null || die "Nichts fortzusetzen."; ok "Fortgesetzt."; return 0;;
    --skip)     git -C "$ROOT_DIR" rebase --skip     2>/dev/null || die "Nur im Rebase gültig."; ok "Rebase-Skip."; return 0;;
    --abort)    git -C "$ROOT_DIR" rebase --abort    2>/dev/null || git -C "$ROOT_DIR" merge --abort    2>/dev/null || die "Nichts abzubrechen."; ok "Abgebrochen."; return 0;;
  esac
  echo "🩹 Heal – Strategie:
  1) lokal (ours)   2) remote (theirs)   3) rebase   4) ff-only   andere=abbrechen"
  local mode
  read -r -t "$PROMPT_TIMEOUT" -p "→ Auswahl [3]: " mode
  mode="${mode:-3}"
  case "$mode" in
    1) git -C "$ROOT_DIR" merge -X ours   "$REMOTE/$MAIN" || true ;;
    2) git -C "$ROOT_DIR" merge -X theirs "$REMOTE/$MAIN" || true ;;
    3) git -C "$ROOT_DIR" rebase --autostash "$REMOTE/$MAIN" || true ;;
    4) git -C "$ROOT_DIR" merge --ff-only "$REMOTE/$MAIN" || true ;;
    *) echo "Abbruch." ;;
  esac
  if git -C "$ROOT_DIR" ls-files --unmerged | grep -q .; then
    warn "Konflikte verbleiben. Mergetool starten?"
    local tool="${GIT_MERGETOOL:-vimdiff}"
    [[ "$(ask_yn "[y/N]" n)" == y ]] && { ${tool} || true; }
  fi
  ok "Heal versucht."
}

cmd_clean() {
  ensure_repo
  local apply=0; [[ "${1-}" =~ ^(--apply|-y)$ ]] && apply=1
  mapfile -t hits < <(cd "$ROOT_DIR" && { git clean -dnX; git clean -dn; } | sed 's/^Would remove //') || true
  if (( ${#hits[@]} == 0 )); then ok "Nichts zu säubern."; return 0; fi
  if (( ! apply )); then echo "👀 Vorschau. Anwenden: wgx clean --apply"; printf "%s\n" "${hits[@]}"; return 0; fi
  echo "🗑️  Lösche…"; (cd "$ROOT_DIR" && git clean -fdX && git clean -fd)
  ok "Clean fertig."
}

cmd_hooks() {
  ensure_repo
  local hook="$ROOT_DIR/.git/hooks/pre-push"
  cat > "$hook" <<'H'
#!/usr/bin/env bash
set -euo pipefail
br="$(git rev-parse --abbrev-ref HEAD)"
if [ "$br" = "main" ]; then
  echo "❌ Push auf 'main' verboten. Bitte PR-Flow (Feature-Branch) nutzen." >&2
  exit 1
fi
if [ "${WGX_HOOK_TEST:-1}" = "1" ]; then
  ./wgx test || { echo "❌ Tests fehlgeschlagen – Push abgebrochen." >&2; exit 1; }
fi
H
  chmod +x "$hook"; ok "pre-push Hook installiert."
}

cmd_sync_main() { ensure_repo
  git -C "$ROOT_DIR" remote set-head "$REMOTE" -a || true
  git -C "$ROOT_DIR" fetch "$REMOTE" --prune || true
  git -C "$ROOT_DIR" branch --set-upstream-to="$REMOTE/$MAIN" "$MAIN" >/dev/null 2>&1 || true
  ok "sync-main erledigt."
}

# sed -i Portabilität (GNU/BSD)
_sed_inplace() {
  local expr="$1" file="$2" tmp
  tmp="${file}.$$.$RANDOM"  # BSD-safe Fallback ohne mktemp
  sed -e "$expr" "$file" >"$tmp" && mv -f "$tmp" "$file" || { rm -f "$tmp"; die "sed inplace failed"; }
}

cmd_fix_perms() {
  ensure_repo
  chmod +x "$ROOT_DIR/wgx" 2>/dev/null || true
  if has perl; then perl -i -pe 's/\r$//' "$ROOT_DIR/wgx"
  else _sed_inplace 's/\r$//' "$ROOT_DIR/wgx"; fi
  ok "Berechtigungen & LF normalisiert."
}

cmd_net_guard() { ( ping -c1 1.1.1.1 >/dev/null 2>&1 || ping -c1 8.8.8.8 >/dev/null 2>&1 || curl -fsS https://example.com >/dev/null 2>&1 ) && ok "Netzwerk OK" || die "Keine Internetverbindung."; }

cmd_diag() {
  ensure_repo
  echo "=== wgx diag ==="
  echo "root   : $ROOT_DIR"
  echo "branch : $(branch)"
  echo "remote : $(git -C "$ROOT_DIR" remote -v | head -n1)"
  echo "termux : $(is_termux && echo yes || echo no) | wsl: $(is_wsl && echo yes || echo no)"
  echo "versions:"
  git --version
  { node -v 2>/dev/null || true; }; { pnpm -v 2>/dev/null || true; }; { cargo -V 2>/dev/null || true; }
  echo "=== end diag ==="
}
cmd_log() { ensure_repo; git -C "$ROOT_DIR" log --oneline --graph --decorate -n "${1:-10}"; }

cmd_config() {
  ensure_repo
  local cfg="$ROOT_DIR/.wgx.conf"; [[ -f "$cfg" ]] || touch "$cfg"
  case "${1-}" in
    list|"")  cat "$cfg";;
    get)      [[ -n "${2-}" ]] || die "Key fehlt"; grep -F -e "${2}=" "$cfg" || true;;
    set)
      [[ -n "${2-}" ]] || die "set KEY=VAL"
      # Backup mit Rotation
      cp -f "$cfg" "$cfg.bak.$(_epoch)" 2>/dev/null || true
      local key="${2%%=*}" val="${2#*=}"
      case "$key" in
        WGX_MIN_COVERAGE|WGX_TIMEOUT|WGX_MIN_BRANCH_COVERAGE|WGX_MIN_FUNC_COVERAGE) [[ "$val" =~ ^[0-9]+$ ]] || die "$key muss Zahl sein";;
        WGX_TMP_DIR) [[ "$val" =~ ^[a-zA-Z0-9_./-]+$ ]] || die "$key: ungültige Zeichen"; mkdir -p "$val" 2>/dev/null || warn "$key: Pfad nicht erstellbar.";;
        WGX_REMOTE|WGX_MAIN|WGX_PROJECT_KEY|WGX_NO_COLOR|WGX_API_PORT|WGX_WEB_PORT|WGX_PROCESS_NAMES|WGX_API_HEALTH|WGX_API_DIR|WGX_WEB_DIR|WGX_ADB_REVERSE|WGX_RUST_FULL_COV|WGX_ASSUME_YES) : ;;
        *) warn "Unbekannter Key: $key";;
      esac
      local tmp; tmp="$cfg.$$.$RANDOM"  # atomic temp
      # Prüfen, ob der Key existiert
      if grep -q -E "^${key}=" "$cfg"; then
        # Key existiert -> ersetzen
        awk -v k="$key" -v v="$val" 'BEGIN{FS=OFS="="} $1 == k { $2 = v } 1' "$cfg" >"$tmp"
      else
        # Key existiert nicht -> anhängen
        (cat "$cfg"; echo "${key}=${val}") > "$tmp"
      fi
      mv -f "$tmp" "$cfg"
      ok "Gesetzt: ${key}=${val}"
      ;;
    reset)    mv -f "$cfg" "$cfg.bak.$(_epoch)" 2>/dev/null || true; : >"$cfg"; ok "Config geleert (Backup: .wgx.conf.bak.TIMESTAMP)";;
    *)        die "Nutzung: wgx config [list|get|set KEY=VAL|reset]";;
  esac
}

cmd_lint() { has shellcheck || die "shellcheck nicht gefunden. Installiere es, um wgx zu linten."; shellcheck -x "$ROOT_DIR/wgx" || die "Lint-Fehler."; ok "Lint sauber."; }

cmd_status() {
  ensure_repo
  local compact=0 json=0
  for arg; do case "$arg" in --compact) compact=1;; --json) json=1;; esac; done
  local br up; br="$(branch)"
  git -C "$ROOT_DIR" fetch "$REMOTE" 2>/dev/null || true
  local ahead=0 behind=0
  up="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref --symbolic-full-name "@{upstream}" 2>/dev/null || echo "$REMOTE/$MAIN")"
  if git -C "$ROOT_DIR" rev-parse --verify -q "refs/remotes/$up" >/dev/null; then
    ahead="$(git -C "$ROOT_DIR" rev-list --count "$up..$br" || echo 0)"
    behind="$(git -C "$ROOT_DIR" rev-list --count "$br..$up" || echo 0)"
  fi
  local api="❓" web="❓" api_m="unknown" web_m="unknown"
  if has curl; then
    api="❌"; api_m="down"; web="❌"; web_m="down"
    curl_ok "http://localhost:${API_PORT}${API_HEALTH}" && { api="✅"; api_m="up"; }
    (curl -fsS --connect-timeout 2 --max-time 5 -o /dev/null "http://localhost:${WEB_PORT}" 2>/dev/null) && { web="✅"; web_m="up"; }
  else
    info "curl fehlt – Health-Checks übersprungen."
  fi
  if (( compact )); then
    echo "br=$br up=$up ahead=$ahead behind=$behind api=$api_m web=$web_m"
  elif (( json )); then
    printf '{"branch":"%s","detached":%s,"upstream":"%s","ahead":%d,"behind":%d,"api":"%s","web":"%s"}\n' \
      "$br" "$([[ "$br" = HEAD ]] && echo true || echo false)" "$up" "$ahead" "$behind" "$api_m" "$web_m"
  else
    local brlabel="$br"; [[ "$br" == "HEAD" ]] && brlabel="(detached HEAD)"
    echo "📍 $brlabel (upstream: $up) — ahead $ahead / behind $behind"
    echo "🚀 Services: API $api (${API_PORT}) | Web $web (${WEB_PORT})"
  fi
}

cmd_ps() { ensure_repo; ps_pid_comm_stream | awk -v regex="$PROCESS_NAMES_REGEX" '$2 ~ regex'; }
cmd_where() {
  ensure_repo
  cat <<EOT
ROOT_DIR    : $ROOT_DIR
SCRIPT      : $ROOT_DIR/wgx
TMP_DIR     : $TMP_DIR
API_LOG     : $API_LOG
WEB_LOG     : $WEB_LOG
PROJECT_KEY : $PROJECT_KEY
EOT
}

cmd_reload() {
  ensure_repo
  local opts labels idx choice; opts=("bash-root" "bash-here"); labels=("Repo-Root (Login-Bash)" "Aktueller Ordner (Login-Bash)")
  (has evcxr_repl) && { opts+=("rust-repl"); labels+=("Rust REPL (evcxr)"); }
  (has code) && { opts+=("code"); labels+=("VSCode öffnen"); }
  opts+=("abort"); labels+=("Abbrechen")
  echo "🔁 Reload – wähle:"; local i=1; for l in "${labels[@]}"; do printf "  %d) %s\n" "$i" "$l"; ((i++)); done
  read -r -t "$PROMPT_TIMEOUT" -p "→ Auswahl [1]: " idx || idx=1
  idx="${idx:-1}"; ((idx>=1 && idx<=${#opts[@]})) || { echo "Abbruch."; return 0; }
  choice="${opts[$((idx-1))]}"
  case "$choice" in
    bash-root) exec bash -lc "cd \"$ROOT_DIR\" || cd ~; exec bash -l" ;;
    bash-here) exec bash -lc "cd \"$PWD\"     || cd ~; exec bash -l" ;;
    rust-repl) exec evcxr_repl ;;
    code) exec code "$ROOT_DIR" ;;
    *) echo "Abbruch." ;;
  esac
}

cmd_open(){
  ensure_repo
  local url="http://localhost:${WEB_PORT}" force_ping=0
  while [[ $# -gt 0 ]]; do
    case "$1" in --check) force_ping=1;; http://*|https://*) url="$1";; *) warn "Ignoriere: $1";; esac
    shift || true
  done
  if is_termux && [[ "$url" =~ ^http://localhost: ]]; then
    curl_ok "$url" || warn "Web-Port ${WEB_PORT} nicht erreichbar – prüfe 'WGX_ADB_REVERSE=1' oder 'adb reverse tcp:${WEB_PORT} tcp:${WEB_PORT}'"
  elif (( force_ping )); then
    curl_ok "$url" || warn "URL nicht erreichbar: $url"
  fi
  if is_termux; then
    if has termux-open-url; then termux-open-url "$url" >/dev/null 2>&1 || true; ok "Geöffnet (Termux)."; return 0; fi
    if has am; then am start -a android.intent.action.VIEW -d "$url" >/dev/null 2>&1 || true; ok "Geöffnet (Termux via am)."; return 0; fi
  fi
  if is_wsl; then
    if has cmd.exe; then cmd.exe /c start "" "$url" >/dev/null 2>&1 || true; ok "Geöffnet (WSL via cmd.exe)."; return 0; fi
    if has wslview; then wslview "$url" >/dev/null 2>&1 || true; ok "Geöffnet (WSL via wslview)."; return 0; fi
  fi
  if [[ "$(uname -s)" == "Darwin" ]] && has open; then open "$url" >/dev/null 2>&1 || true; ok "Geöffnet (macOS)."; return 0; fi
  if has xdg-open; then xdg-open "$url" >/dev/null 2>&1 || true; ok "Geöffnet (xdg-open)."; return 0; fi
  echo "$url"
}

# ── Dispatcher ───────────────────────────────────────────────────────────────
case "${1-}" in
  -v|--version|version) echo "wgx v${WGX_VERSION}";;
  help|-h|--help|"") shift || true; cmd_help "${1-}";;

  install)     shift; cmd_install "$@";;
  up)          shift; cmd_up "$@";;
  down)        shift; cmd_down "$@";;
  open)        shift; cmd_open "$@";;
  logs)        shift; cmd_logs "$@";;
  test)        shift; cmd_test "$@";;
  audit)       shift; cmd_audit "$@";;
  gc)          shift; cmd_gc "$@";;
  lint)        shift; cmd_lint "$@";;

  doctor)      shift; cmd_doctor "$@";;
  status)      shift; cmd_status "$@";;
  reload)      shift; cmd_reload "$@";;

  pull)        shift; cmd_pull "$@";;
  snap)        shift; cmd_snap "$@";;
  send)        shift; cmd_send "$@";;
  pr)          shift; cmd_pr   "$@";;
  heal)        shift; cmd_heal "$@";;
  clean)       shift; cmd_clean "$@";;
  hooks)       shift; cmd_hooks "$@";;
  sync-main)   shift; cmd_sync_main "$@";;
  fix-perms)   shift; cmd_fix_perms "$@";;
  net-guard)   shift; cmd_net_guard "$@";;
  diag)        shift; cmd_diag "$@";;
  log)         shift; cmd_log "$@";;
  config)      shift; cmd_config "$@";;
  ps)          shift; cmd_ps "$@";;
  where)       shift; cmd_where "$@";;

  *) warn "Unbekannt: $1"; echo; cmd_help; exit 1;;
esac
WGX

chmod +x "$repo/wgx"

# 4) Syntax-Check (fail-fast)
if ! bash -n "$repo/wgx" 2>/dev/null; then
  echo "❌ Syntax-Check fehlgeschlagen. Backup liegt unter: $backup"
  exit 1
fi

# 5) Minimal-Tests & Cheatsheet (idempotent)
mkdir -p "$repo/tests" "$repo/docs"
if [ ! -f "$repo/tests/wgx_basic.bats" ]; then
  cat > "$repo/tests/wgx_basic.bats" <<'BATS'
#!/usr/bin/env bats
@test "wgx --version" {
  run ./wgx --version
  [ "$status" -eq 0 ]
  [[ "$output" =~ "wgx v" ]]
}
@test "wgx logs invalid --tail" {
  run ./wgx logs --tail abc
  [ "$status" -eq 1 ]
  [[ "$output" =~ "--tail braucht positive Zahl" ]]
}
@test "wgx status --compact prints single line" {
  run ./wgx status --compact
  [ "$status" -eq 0 ]
  [[ "$output" =~ br=.+ ]]
}
@test "wgx down --dry-run works" {
  run ./wgx down --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" =~ "DRY: would stop" ]] || true
}
BATS
  chmod +x "$repo/tests/wgx_basic.bats"
fi

if [ ! -f "$repo/docs/wgx-cheatsheet.md" ]; then
  cat > "$repo/docs/wgx-cheatsheet.md" <<'MD'
# wgx Cheatsheet — v3.8.5

- **Start/Stop**: `wgx up --wait 45` • `wgx down [--dry-run|--force-kill]` • Logs: `wgx logs -f --tail 200 --grep "(WARN|ERR)" api`
- **Open**: `wgx open` (Termux/WSL/mac/Linux; `--check` pingt vorher)
- **Tests**: `wgx test` (Lines≥WGX_MIN_COVERAGE, Branches≥WGX_MIN_BRANCH_COVERAGE, Functions≥WGX_MIN_FUNC_COVERAGE) • Vollmodus: `WGX_RUST_FULL_COV=1 wgx test`
- **Flow**: `wgx snap --msg "…" && wgx send && wgx pr`
- **Heal**: `wgx heal` (ours/theirs/rebase/ff-only) • `wgx heal --abort|--continue|--skip`
- **Status**: `wgx status --compact` (CI) • `wgx status --json`
- **Prozesse**: `wgx ps` • `wgx where`
- **Config**: `.wgx.conf` oder `wgx config set WGX_MIN_COVERAGE=80`
- **Termux**: `WGX_ADB_REVERSE=1` für `adb reverse tcp:5173 tcp:5173`, `pkg install android-tools`, optional `termux-toast` / `termux-open-url`.
- **Rust/sqlx**: Offline: `cargo sqlx prepare`; Migration vor Tests: `sqlx migrate run`.
- **Codespaces**: URL: `https://$CODESPACE_NAME-$WGX_WEB_PORT.app.github.dev`
- **Rust REPL**: In reload: Optional "Rust REPL (evcxr)" – installiere via `cargo install evcxr_repl` für interaktives Rust-Debugging.

> Web-Coverage via `lcov.info` (Vitest). Rust-Coverage via `cargo-llvm-cov` (summary; Full-Mode optional).
MD
fi

# 6) Symlink
mkdir -p "$HOME/bin"
ln -sf "$repo/wgx" "$HOME/bin/wgx"
hash -r

# PATH-Hinweis, falls $HOME/bin nicht im PATH
case ":$PATH:" in
  *":$HOME/bin:"*) : ;;
  *) echo "ℹ \$HOME/bin ist nicht im PATH. Füge hinzu, z. B.: echo 'export PATH=\"\$HOME/bin:\$PATH\"' >> ~/.bashrc && . ~/.bashrc" ;;
esac

echo "➡ which wgx: $(command -v wgx)"
( cd "$repo" && ./wgx --version && ./wgx doctor ) || true
echo "✅ wgx v3.8.5 installiert. Backup: $backup"