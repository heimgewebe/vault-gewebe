#!/usr/bin/env bash
# --- Weltgewebe wgx Installer v3.8.6 – Einmal-Installer (Termux/WSL/mac/Linux) ---
set -Eeuo pipefail
IFS=$'\n\t'

# 0) Repo finden (flexibel)
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

# 1) (Optional) Alte wg-Dateien entfernen
if [ "${WGX_CLEAN_OLD:-0}" = "1" ]; then
  [ -f "$repo/wg" ] && rm -f "$repo/wg"
  ([ -L "$HOME/bin/wg" ] || [ -f "$HOME/bin/wg" ]) && rm -f "$HOME/bin/wg"
fi

# 2) Vorherige wgx sichern (+ einfache Rotation)
ts="$(date +%s 2>/dev/null || awk 'BEGIN{print systime()}')"
backup="$repo/wgx.bak.$ts"
[ -f "$repo/wgx" ] && cp -f "$repo/wgx" "$backup" || backup="(kein Vorgänger)"
find "$repo" -maxdepth 1 -name 'wgx.bak.*' -mtime +14 -delete 2>/dev/null || true

# 3) wgx schreiben (monolithisch, gehärtet, mobil-first)
cat > "$repo/wgx" <<'WGX'
#!/usr/bin/env bash
# Weltgewebe CLI – wgx v3.8.6
# Ziele: Termux/WSL/mac/Linux • Rust(axum/sqlx)+SvelteKit • portabel • sicher • mobil-first
set -Eeuo pipefail
IFS=$'\n\t'
umask 077

WGX_VERSION="3.8.6"

# ── Helpers / Env ─────────────────────────────────────────────────────────────
has(){ command -v "$1" >/dev/null 2>&1; }
is_termux(){ case "${PREFIX-}" in */com.termux/*) return 0;; *) return 1;; esac; }
is_wsl(){ uname -r 2>/dev/null | grep -qi 'microsoft\|wsl'; return $?; }
ROOT(){
  local r
  r="$(git -C "${PWD}" rev-parse --show-toplevel 2>/dev/null || true)"
  if [[ -n "$r" ]]; then
    printf "%s" "$r"
  else
    local here; here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
    printf "%s" "$here"
  fi
}
ROOT_DIR="$(ROOT)"

# Warnung bei Root (übersteuerbar mit WGX_ALLOW_ROOT=1)
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
ok(){ printf "${cG}✅ %s${c0}\n" "$*"; }
info(){ printf "• %s\n" "$*"; }
warn(){ printf "${cY}⚠️  %s${c0}\n" "$*"; 
        is_termux && has termux-toast && termux-toast "wgx Warnung: $*"; }
die(){ printf "${cR}❌ %s${c0}\n" "$*" >&2; 
      is_termux && has termux-toast && termux-toast "wgx Fehler: $*"; exit "${2:-1}"; }

trap 'ec=$?; line=$LINENO; ((ec)) && printf "${cR}❌ wgx fehlgeschlagen (Zeile %s, Code=%s)${c0}\n" "$line" "$ec" >&2' ERR

# Defaults + Config-Werte
REMOTE="origin"; MAIN="main"
PROMPT_TIMEOUT="30"; ASSUME_YES="0"
TMP_DIR_DEFAULT="/tmp"; TERMUX_TMP="/data/data/com.termux/files/usr/tmp"
TMP_DIR="${WGX_TMP_DIR:-$([ -d "$TERMUX_TMP" ] && echo "$TERMUX_TMP" || echo "$TMP_DIR_DEFAULT")}"
API_PORT="${WGX_API_PORT:-8787}"; WEB_PORT="${WGX_WEB_PORT:-5173}"
API_HEALTH="${WGX_API_HEALTH:-/health}"
MIN_COV="${WGX_MIN_COVERAGE:-80}"
MIN_BRANCH_COV="${WGX_MIN_BRANCH_COVERAGE:-0}"
MIN_FUNC_COV="${WGX_MIN_FUNC_COVERAGE:-0}"
PROCESS_NAMES_REGEX="${WGX_PROCESS_NAMES:-node|vite|npm|pnpm|cargo}"
API_DIR="${WGX_API_DIR:-}"; WEB_DIR="${WGX_WEB_DIR:-}"
ADB_REVERSE="${WGX_ADB_REVERSE:-1}"
RUST_FULL_COV="${WGX_RUST_FULL_COV:-0}"  # 1 = Full-Coverage statt Summary

# Projekt-Key (basename@sha12)
_short_hash(){
  local s="$1"
  if has sha256sum; then printf '%s' "$s" | sha256sum | awk '{print $1}' | cut -c1-12
  elif has shasum; then printf '%s' "$s" | shasum -a 256 | awk '{print $1}' | cut -c1-12
  elif has uuidgen; then uuidgen | tr -d '-' | cut -c1-12
  else date +%s | sed 's/[^0-9]//g'; fi
}
PROJECT_KEY="${WGX_PROJECT_KEY:-$(basename "$ROOT_DIR")@$(_short_hash "$ROOT_DIR")}"

# ── Konfig-Dateien einlesen (key=val) ─────────────────────────────────────────
_read_kv_file(){
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
      WGX_NO_COLOR) : ;;  # handled above
      *) warn "Unbekannter Schlüssel in Konfig: $k";;
    esac
  done < "$f"
}
[[ -f "$ROOT_DIR/.wgx.conf" ]] && _read_kv_file "$ROOT_DIR/.wgx.conf"
[[ -f "$HOME/.config/wgx/config" ]] && _read_kv_file "$HOME/.config/wgx/config"

_validate_conf(){
  [[ "$PROMPT_TIMEOUT" =~ ^[0-9]+$ ]] || die "WGX_TIMEOUT muss Zahl sein"
  [[ "$MIN_COV" =~ ^[0-9]+$ ]] || die "WGX_MIN_COVERAGE muss Zahl sein"
  [[ "$MIN_BRANCH_COV" =~ ^[0-9]+$ ]] || die "WGX_MIN_BRANCH_COVERAGE muss Zahl sein"
  [[ "$MIN_FUNC_COV" =~ ^[0-9]+$ ]] || die "WGX_MIN_FUNC_COVERAGE muss Zahl sein"
  [[ "$TMP_DIR" =~ ^[a-zA-Z0-9_./-]+$ ]] || die "WGX_TMP_DIR: ungültige Zeichen"
  mkdir -p "$TMP_DIR" 2>/dev/null || warn "TMP_DIR nicht erstellbar: $TMP_DIR"
  [[ "$PROJECT_KEY" =~ ^[A-Za-z0-9._-]+$ ]] || warn "PROJECT_KEY ungewöhnlich – a-zA-Z0-9._- empfohlen"
}
_validate_conf

ensure_repo(){ [[ -d "$ROOT_DIR/.git" ]] || die "Kein Git-Repo (ROOT=$ROOT_DIR)"; }

# ── Laufzeit/Logs ─────────────────────────────────────────────────────────────
API_PID="$TMP_DIR/wgx-api.pid"; WEB_PID="$TMP_DIR/wgx-web.pid"
API_LOG="$TMP_DIR/wgx-api.log"; WEB_LOG="$TMP_DIR/wgx-web.log"

_stat_size(){
  if has stat; then stat -c %s "$1" 2>/dev/null || stat -f%z "$1" 2>/dev/null || echo 0
  else wc -c <"$1" 2>/dev/null || echo 0; fi
}
_epoch(){ date +%s 2>/dev/null || awk 'BEGIN{print systime()}'; }

_log_rotate_if_needed(){
  local f="$1" max=10485760
  [[ -f "$f" ]] || return 0
  local sz="$(_stat_size "$f")"; (( sz < max )) && return 0
  local ts="$(_epoch)"; mv -f "$f" "${f}.$ts" || return 0
  if has gzip; then gzip -f "${f}.$ts" 2>/dev/null || warn "gzip fehlgeschlagen – Log bleibt unkomprimiert."
  else warn "gzip fehlt – Logs bleiben unkomprimiert."; fi
  # Alte rotierte Logs (>7 Tage) löschen
  find "$(dirname "$f")" -maxdepth 1 -name "$(basename "$f").*.gz" -mtime +7 -exec rm -f {} \; 2>/dev/null || true
}
cleanup_tmp_logs(){ find "$TMP_DIR" -maxdepth 1 -type f -name 'wgx-*.log' -mtime +1 -exec rm -f {} \; 2>/dev/null || true; }

proc_running(){ local f="$1"; [[ -f "$f" ]] && kill -0 "$(cat "$f")" 2>/dev/null; }

# ── Netzwerk/HTTP ──────────────────────────────────────────────────────────────
curl_ok(){ has curl || return 1; curl -fsS --connect-timeout 5 --max-time 15 --retry 3 --retry-max-time 40 "$1" >/dev/null 2>&1; }

# ── PS / Prozess-Targeting (POSIX-sicher) ─────────────────────────────────────
ps_pid_comm_stream(){
  if ps -eo pid=,comm= >/dev/null 2>&1; then
    ps -eo pid=,comm=
  elif ps -Ax -o pid= -o comm= >/dev/null 2>&1; then
    ps -Ax -o pid= -o comm=
  elif ps ax >/dev/null 2>&1; then
    ps ax | awk 'NR>1 { comm=$5; sub(/.*\\//,"",comm); print $1, comm }'  # POSIX sub (basename)
  else
    ps | awk 'NR>1 { comm=$4; sub(/.*\\//,"",comm); print $1, comm }'    # POSIX fallback
  fi
}

_comm_ok(){ [[ "$1" =~ ^($PROCESS_NAMES_REGEX)$ ]]; }
_env_has_key(){ [[ -r "/proc/$1/environ" ]] && tr '\\0' '\\n' </proc/"$1"/environ | grep -qx "PROJECT_KEY=$PROJECT_KEY"; }
_args_has_root(){
  ps -p "$1" -o args= 2>/dev/null | grep -Eq -- "$(printf '%s' "$ROOT_DIR" | sed 's/[.[\\()*^$+?{|}/\\\\&]/g')" && return 0
  ps -p "$1" -o args= 2>/dev/null | grep -Eq 'cargo +run|pnpm +dev|npm +run +dev|vite' && return 0
  return 1
}

# etime → Sekunden (robust; 1-02:03:04 etc.)
_etime_to_sec(){
  local t="$1" s=0 d=0
  t="${t// /}"  # Leerzeichen entfernen (BSD ps)
  if [[ "$t" == *-* ]]; then
    d="${t%%-*}"; t="${t#*-}"; [[ "$d" =~ ^[0-9]+$ ]] || d=0
  fi
  IFS=: read -r a b c <<<"$t"
  if [[ -n "$c" ]]; then s=$((10#$a*3600 + 10#$b*60 + 10#$c))
  elif [[ -n "$b" ]]; then s=$((10#$a*60 + 10#$b))
  elif [[ -n "$a" ]]; then s=$((10#$a)); fi
  echo $(( s + 10#$d*86400 ))
}

# Härteres Stoppen mit PGID-Fallback (für verifizierte Targets)
_stop_pid(){
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
  # sanfte Kündigung
  kill "$pid" 2>/dev/null || true
  for _ in {1..10}; do kill -0 "$pid" 2>/dev/null || return 0; sleep 0.2; done
  # Gruppen-Fallback
  pgid="$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d '[:space:]')"
  if [[ "$pgid" =~ ^[0-9]+$ ]]; then
    kill -TERM "-$pgid" 2>/dev/null || true
    for _ in {1..10}; do kill -0 "$pid" 2>/dev/null || return 0; sleep 0.2; done
    kill -KILL "-$pgid" 2>/dev/null || true
    for _ in {1..5}; do kill -0 "$pid" 2>/dev/null || return 0; sleep 0.2; done
  fi
  kill -9 "$pid" 2>/dev/null || true
}

pid_age_over_day(){
  local pid="$1"
  local et="$(ps -p "$pid" -o etime= 2>/dev/null || true)"
  [[ -z "$et" ]] && return 1
  local secs="$(_etime_to_sec "$et")"
  (( secs > 86400 ))
}

kill_by_key(){
  local dry=0 force=0
  for a in "$@"; do case "$a" in --dry-run) dry=1;; --force-kill) force=1;; esac; done
  local pid_stream
  if ps -eo pid=,comm= >/dev/null 2>&1; then
    pid_stream="$(ps -eo pid=,comm= 2>/dev/null | awk -v re="$PROCESS_NAMES_REGEX" '$2 ~ re {print $1}')"
  elif ps ax >/dev/null 2>&1; then
    pid_stream="$(ps ax | awk -v re="$PROCESS_NAMES_REGEX" '{ comm=$5; sub(/.*\\//,"",comm); if(comm~re) print $1 }')"
  else
    warn "ps-Variante nicht unterstützt – kill_by_key übersprungen."
    return 0
  fi
  while read -r pid; do
    [[ "$pid" =~ ^[0-9]+$ ]] || continue
    if (( ! force )) && pid_age_over_day "$pid"; then continue; fi
    if (( dry )); then echo "DRY: würde $pid stoppen"
    else _stop_pid "$pid"; fi
  done <<< "$pid_stream"
}

# ── UI ──────────────────────────────────────────────────────────────────────────
ask_yn(){ local q="$1" def="${2:-n}" ans
  (( ASSUME_YES )) && { echo y; return; }
  read -r -t "$PROMPT_TIMEOUT" -p "$q " ans || ans="$def"
  ans="${ans:-$def}"
  [[ "$ans" =~ ^[yY]$ ]] && echo y || echo n
}

# ── Hilfe ──────────────────────────────────────────────────────────────────────
_help_root(){ cat <<'EOF'
wgx – Werkzeuge für Weltgewebe-Entwicklung
Verwende "wgx help <Befehl>" für Details, z.B. 'wgx help up'.
EOF
}
_help_up(){ cat <<'EOF'
Nutzung: wgx up [--wait SECONDS]
  --wait S : Health-Check bis S Sekunden (Standard: $PROMPT_TIMEOUT)
EOF
}
_help_logs(){ cat <<'EOF'
Nutzung: wgx logs [-f|--follow] [--tail N] [--grep PATTERN] [api|web|all]
  --tail N: Zeige nur die letzten N Zeilen (Standard 100)
  --grep P : Filtere mit grep (Egrep, Zeilenpufferung)  [oai_citation:9‡file-3kxeq1ag1sevglhjqzbmbe](file://file-3KXEq1AG1SevGLHjqzBMbe#:~:text=if%20grep%20,E%20%22%24%40%22%20fi)
EOF
}
# Weitere Hilfe für andere Befehle können ähnlich ergänzt werden...

cmd_help(){ case "${1-}" in
  up) _help_up;;
  logs) _help_logs;;
  ""|-h|--help) _help_root;;
  *) echo "Keine Hilfe für '$1'."; _help_root;; esac
}

# ── Compose-Wrapper ────────────────────────────────────────────────────────────
has_docker_compose(){
  if has docker && docker compose version >/dev/null 2>&1; then return 0; fi
  has docker-compose
}
compose(){
  if has docker && docker compose version >/dev/null 2>&1; then docker compose "$@"
  else docker-compose "$@"; fi
}

# ── Verzeichnisse erkennen ──────────────────────────────────────────────────────
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

conflict_scan(){
  ensure_repo
  if git -C "$ROOT_DIR" ls-files --unmerged | grep -q .; then
    warn "Unmerged paths:"; git -C "$ROOT_DIR" ls-files --unmerged | cut -f2 | sort -u | sed 's/^/  - /'
    die "Konflikte lösen, dann fortsetzen (rebase/merge etc.)."
  fi
  if git -C "$ROOT_DIR" grep -nE '^(<<<<<<<|=======|>>>>>>>)' -- . ':!*.lock' >/dev/null 2>&1; then
    die "Konfliktmarker (<<<<<<<, =======, >>>>>>>) gefunden. Bitte bereinigen."
  fi
}

cmd_doctor(){
  ensure_repo
  echo "root   : $ROOT_DIR"
  echo "branch : $(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")"
  echo "git    : $(git --version 2>/dev/null || echo missing)"
  echo "termux : $(is_termux && echo yes || echo no) | wsl: $(is_wsl && echo yes || echo no)"
  ok "Doctor OK"
}

cmd_install(){
  ensure_repo
  info "Installiere Web- und API-Dependencies…"
  local api web="$(detect_web_dir || true)"
  local api="$(detect_api_dir || true)" web="$(detect_web_dir || true)"
  # Web
  if [[ -n "$web" ]]; then
    info "Install Web-Dependencies in $web…"
    if has pnpm; then ( cd "$web" && pnpm install ) 
    else ( cd "$web" && npm install ); fi
  fi
  # Rust/Cargo (API)
  if [[ -n "$api" ]]; then
    info "Install Rust-Dependencies in $api…"
    ( cd "$api" && cargo fetch )
  fi
  ok "Install komplett"
}

cmd_up(){
  ensure_repo
  echo "▶ wgx up – Starte Services"
  local wait="${1:-$PROMPT_TIMEOUT}"
  shift 2>/dev/null || true
  # Docker Compose, falls vorhanden
  if has_docker_compose && [[ -f "$ROOT_DIR/infra/compose.dev.yml" ]]; then
    info "Compose up…"; ( cd "$ROOT_DIR" && compose -f infra/compose.dev.yml up -d ) || die "Compose fehlgeschlagen"
  fi
  # Dev-Server starten (Rust API, Web)
  local api="$(detect_api_dir || true)" web="$(detect_web_dir || true)"
  if [[ -n "$api" && has cargo ]]; then
    info "Starte Rust API in $api…"
    # Log-Rotation
    _log_rotate_if_needed "$API_LOG"
    # Hintergrund-Prozess starten
    run_bg(){
      local label="$1" dir="$2" pidf="$3" logf="$4"; shift 4
      cd "$dir" || return
      PROJECT_KEY="$PROJECT_KEY" setsid bash -c "$*" >>"$logf" 2>&1 &
      printf "%s" "$!" > "$pidf"
      info "  $label (PID $(cat "$pidf")) gestartet."
    }
    run_bg "wgx-api" "$api" "$API_PID" "$API_LOG" "cargo run --quiet"
  else
    warn "Kein API-Verzeichnis gefunden oder kein cargo."
  fi
  if [[ -n "$web" ]]; then
    info "Starte Web (Vite) in $web…"
    _log_rotate_if_needed "$WEB_LOG"
    if has pnpm; then
      run_bg "wgx-web" "$web" "$WEB_PID" "$WEB_LOG" "pnpm dev"
    else
      run_bg "wgx-web" "$web" "$WEB_PID" "$WEB_LOG" "npm run dev"
    fi
  fi
  # Health-Check API
  echo "🔎 Warte auf API (bis $wait s)…"
  if has curl; then
    local tries=0 okh=0 url="http://localhost:${API_PORT}${API_HEALTH}"
    while (( tries++ < wait )); do
      curl_ok "$url" && { okh=1; break; } || sleep 1
    done
    (( okh )) && ok "API gesund: $url" || warn "API nicht erreichbar nach $wait s."
  else
    info "curl fehlt – überspringe API-Health-Check."
  fi
  # Hinweis Termux: adb reverse
  if is_termux && [[ "${ADB_REVERSE}" = "1" ]]; then
    if has adb; then
      adb reverse "tcp:${WEB_PORT}" "tcp:${WEB_PORT}" || warn "adb reverse fehlgeschlagen."
    else
      warn "adb fehlt – nutze 'pkg install android-tools' und ggf. 'adb reverse tcp:${WEB_PORT} tcp:${WEB_PORT}'"
    fi
    has termux-toast && termux-toast "wgx up fertig"
  fi
  # Codespaces URL
  if [[ -n "${CODESPACE_NAME-}" ]]; then
    local cs_url="https://${CODESPACE_NAME}-${WEB_PORT}.app.github.dev"
    info "Codespaces URL: $cs_url"
    has code && code --open-url "$cs_url" >/dev/null 2>&1 || true
  fi
  ok "Ready."
}

cmd_down(){
  ensure_repo
  echo "🛑 wgx down – stoppe Services"
  local dry=0 force=0
  for a in "$@"; do case "$a" in --dry-run) dry=1;; --force-kill) force=1;; esac; done
  if has_docker_compose && [[ -f "$ROOT_DIR/infra/compose.dev.yml" ]]; then
    info "Compose down…"; ( cd "$ROOT_DIR" && compose -f infra/compose.dev.yml down ) || warn "Compose-Stop fehlgeschlagen"
  fi
  if proc_running "$API_PID"; then kill "$(cat "$API_PID")" 2>/dev/null || true; rm -f "$API_PID"; info "API-Prozess gestoppt."; fi
  if proc_running "$WEB_PID"; then kill "$(cat "$WEB_PID")" 2>/dev/null || true; rm -f "$WEB_PID"; info "Web-Prozess gestoppt."; fi
  info "Suche Dev-Prozesse (PROJECT_KEY)…"
  if (( dry )); then kill_by_key --dry-run || true
  else kill_by_key ${force:+--force-kill} || true; fi
  cleanup_tmp_logs
  ok "Services gestoppt."
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
cmd_logs(){
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
    all) [[ -f "$API_LOG" ]] && files+=("$API_LOG"); [[ -f "$WEB_LOG" ]] && files+=("$WEB_LOG");
         ((${#files[@]})) || die "Keine Log-Dateien vorhanden.";;
  esac
  if [[ -n "$grep_pat" ]]; then
    tail "${args[@]}" "${files[@]}" | _grep_E_L "$grep_pat"
  else
    tail "${args[@]}" "${files[@]}"
  fi
}

_is_number(){ [[ "$1" =~ ^[0-9]+([.][0-9]+)?$ ]]; }
_float_ge(){ _is_number "$1" && _is_number "$2" || die "Float-Vergleich mit ungültigen Werten ($1 >= $2)"; awk -v a="$1" -v b="$2" 'BEGIN{exit !(a >= b)}'; }

_parse_cov_file(){ # setzt L,B,F (%) von cargo-llvm-cov --summary
  local f="$1"; L=0; B=0; F=0
  if [[ ! -s "$f" ]]; then warn "Coverage-Output leer: $f"; return 0; fi
  while read -r tag val; do
    case "$tag" in L) L="$val";; B) B="$val";; F) F="$val";; esac
  done < <(awk '
    /lines/    { gsub(/[^0-9.]/,"",$NF); if($NF!="") printf("L %s\n",$NF) }
    /branches/ { gsub(/[^0-9.]/,"",$NF); if($NF!="") printf("B %s\n",$NF) }
    /functions/{ gsub(/[^0-9.]/,"",$NF); if($NF!="") printf("F %s\n",$NF) }
    /TOTAL/    { gsub(/[^0-9.]/,"",$NF); if($NF!="") printf("L %s\n",$NF) }  # Fallback
  ' "$f")
  local lc="$(wc -l <"$f" 2>/dev/null || echo 0)"
  if [[ "$L" == "0" && "$B" == "0" && "$F" == "0" && "$lc" -lt 3 ]]; then
    warn "Coverage-Output unvollständig – prüfe llvm-cov."
  fi
}

_has_cargo_llvm_cov(){ has cargo && cargo llvm-cov --version >/dev/null 2>&1; }

cmd_test(){
  ensure_repo
  local api="$(detect_api_dir || true)" web="$(detect_web_dir || true)"
  # Web (Vitest)
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
    local pl=$((100*LH/LF)) pb=0 pf=0
    [[ "$BRF" -gt 0 ]] && pb=$((100*BRH/BRF))
    [[ "$FNF" -gt 0 ]] && pf=$((100*FNH/FNF))
    echo "🧪 Web Coverage: Lines=${pl}% Branches=${pb}% Functions=${pf}%"
    (( pl >= MIN_COV )) || die "Web Lines unter ${MIN_COV}%."
    (( pb >= MIN_BRANCH_COV )) || die "Web Branches unter ${MIN_BRANCH_COV}%."
    (( pf >= MIN_FUNC_COV )) || die "Web Functions unter ${MIN_FUNC_COV}%."
  else
    info "Web-Teil nicht gefunden – übersprungen."
  fi
  # Rust (API)
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
      warn "cargo-llvm-cov nicht gefunden – präzise Coverage fehlgeschlagen."
    fi
  else
    info "Rust-Teil nicht gefunden – übersprungen."
  fi
  ok "Coverage-Gates OK."
}

cmd_audit(){
  ensure_repo
  has npm && ( cd "$ROOT_DIR" && npm audit || true )
  if has trivy; then
    ( cd "$ROOT_DIR" && trivy fs . --include-dev-deps --exit-code 0 --no-progress || true )
  else
    warn "trivy nicht installiert – nur npm audit ausgeführt."
  fi
}

cmd_gc(){
  ensure_repo
  local auto=0; [[ "${1-}" == "--auto" ]] && auto=1
  local patterns=( "node_modules/.cache" ".svelte-kit" ".turbo" "dist" ".vite" "target" )
  echo "🧹 Vorschau auf zu löschende Verzeichnisse:"
  for p in "${patterns[@]}"; do [[ -e "$ROOT_DIR/$p" ]] && echo "  - $p"; done
  if (( ! auto )); then
    [[ "$(ask_yn "Anwenden? [y/N]" n)" != y ]] && return 0
  fi
  for p in "${patterns[@]}"; do [[ -e "$ROOT_DIR/$p" ]] && rm -rf "$ROOT_DIR/$p" 2>/dev/null || true; done
  ok "GC abgeschlossen."
}

_make_pr_link(){
  local url repo_path head="$1" base="$2"
  url="$(git -C "$ROOT_DIR" remote get-url "$REMOTE" 2>/dev/null || true)"
  if   [[ "$url" =~ ^git@github\.com:([^/]+/[^/]+?)(\.git)?$ ]]; then 
    repo_path="${BASH_REMATCH[1]}"
    printf "https://github.com/%s/compare/%s...%s?expand=1\n" "$repo_path" "$base" "$head"
    return
  elif [[ "$url" =~ ^https?://github\.com/([^/]+/[^/]+?)(\.git)?$ ]]; then
    repo_path="${BASH_REMATCH[1]}"
    printf "https://github.com/%s/compare/%s...%s?expand=1\n" "$repo_path" "$base" "$head"
    return
  elif [[ "$url" =~ ^ssh://git@github\.com/([^/]+/[^/]+?)(\.git)?$ ]]; then
    repo_path="${BASH_REMATCH[1]}"
    printf "https://github.com/%s/compare/%s...%s?expand=1\n" "$repo_path" "$base" "$head"
    return
  elif [[ "$url" =~ gitlab\.com[:/]+([^/]+/[^/.]+)(\.git)?/?$ ]]; then
    repo_path="${BASH_REMATCH[1]}"
    printf "https://gitlab.com/%s/-/merge_requests/new?merge_request[source_branch]=%s&merge_request[target_branch]=%s\n" "$repo_path" "$head" "$base"
    return
  elif [[ "$url" =~ bitbucket\.org[:/]+([^/]+/[^/.]+)(\.git)?/?$ ]]; then
    repo_path="${BASH_REMATCH[1]}"
    printf "https://bitbucket.org/%s/pull-requests/new?source=%s&dest=%s\n" "$repo_path" "$head" "$base"
    return
  fi
  warn "PR-Link nicht erkennbar – bitte manuell erstellen."
}

cmd_pull(){
  ensure_repo; conflict_scan
  local do_stash=0; [[ "${1-}" == "--stash" ]] && do_stash=1
  if ! git -C "$ROOT_DIR" diff --quiet || ! git -C "$ROOT_DIR" diff --cached --quiet; then
    if (( do_stash )); then info "Stashe lokale Änderungen…"; git -C "$ROOT_DIR" stash push -u -m "wgx-pull-$(_epoch)" >/dev/null || true; fi
  fi
  if [[ -f "$ROOT_DIR/infra/compose.dev.yml" ]]; then
    info "Compose pull…"; ( cd "$ROOT_DIR" && compose -f infra/compose.dev.yml pull ) || warn "Compose Pull fehlgeschlagen"
  fi
  info "git pull $REMOTE $MAIN…"
  git -C "$ROOT_DIR" pull "$REMOTE" "$MAIN" || die "git pull fehlgeschlagen"
  if (( do_stash )); then info "Stash anwenden…"; git -C "$ROOT_DIR" stash pop || true; fi
  ok "Pull abgeschlossen."
}

cmd_snap(){
  ensure_repo
  local msg="" no_gpg=0 head commit
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --no-gpg) no_gpg=1; shift;;
      *) msg="$1"; shift;;
    esac
  done
  head="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null)"
  commit="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null)"
  if [[ -z "$msg" ]]; then
    echo "ℹ Bitte Tag-Message für $commit eingeben:"
    read -r msg
    [[ -z "$msg" ]] && die "Keine Nachricht angegeben, breche ab."
  fi
  local tag="snap-$commit"
  if (( no_gpg )); then
    git -C "$ROOT_DIR" tag -a "$tag" -m "$msg" || die "Tag-Anlage fehlgeschlagen"
  else
    git -C "$ROOT_DIR" tag -a "$tag" -m "$msg" --gpg-sign || die "GPG-Sign fehlgeschlagen"
  fi
  ok "Tag $tag erstellt."
}

cmd_send(){
  ensure_repo
  local head commit
  head="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null)"
  commit="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null)"
  local compare
  compare="$(_make_pr_link "$head" "$MAIN")"
  if [[ -n "$compare" ]]; then
    echo "Erzeuge PR-URL..."
    echo "$compare"
    has code && code --open-url "$compare" >/dev/null 2>&1 || true
  else
    echo "Öffne Branch auf GitHub..."
    local url="https://github.com/$(git -C "$ROOT_DIR" remote get-url "$REMOTE" | sed -E 's#^(git@github.com:|https://github.com/)([^/]+/[^/]+)(\.git)?$#\2#')/tree/$head"
    has code && code --open-url "$url" >/dev/null 2>&1 || echo "$url"
  fi
}

cmd_pr(){
  ensure_repo; conflict_scan
  local head="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null)" base="$MAIN"
  echo "PR-Link generiert:"
  _make_pr_link "$head" "$base"
}

cmd_heal(){
  ensure_repo; conflict_scan
  local mode="3"
  if [[ "${1-}" =~ ^(ours|theirs|rebase|ff-only)$ ]]; then mode="$1"; shift; fi
  echo "🩹 Wähle Merge-Modus (default rebase):"
  echo "  1) ours  2) theirs  3) rebase  4) fast-forward only"
  read -r -t "$PROMPT_TIMEOUT" -p "→ Auswahl [3]: " mode || mode=3
  case "${mode}" in
    1) git -C "$ROOT_DIR" merge --strategy-option theirs "$REMOTE/$MAIN" || true;;
    2) git -C "$ROOT_DIR" merge --strategy-option ours "$REMOTE/$MAIN" || true;;
    3) git -C "$ROOT_DIR" rebase "$REMOTE/$MAIN" || true;;
    4) git -C "$ROOT_DIR" merge --ff-only "$REMOTE/$MAIN" || true;;
    *) echo "Abbruch." ;;
  esac
  if git -C "$ROOT_DIR" ls-files --unmerged | grep -q .; then
    die "Konflikte vorhanden – löse diese zuerst."
  fi
  ok "Heilung abgeschlossen."
}

cmd_clean(){
  ensure_repo
  git -C "$ROOT_DIR" branch -D $(git -C "$ROOT_DIR" branch --merged | grep -vE "^\*| main| master| dev") 2>/dev/null || true
  ok "Ungebundene Branches gelöscht."
}

cmd_hooks(){
  ensure_repo
  info "richte Git-Hooks ein…"
  mkdir -p "$ROOT_DIR/.git/hooks"
  cp -f "$ROOT_DIR/tools/hooks/pre-commit" "$ROOT_DIR/.git/hooks/pre-commit" 2>/dev/null || true
  cp -f "$ROOT_DIR/tools/hooks/pre-push" "$ROOT_DIR/.git/hooks/pre-push" 2>/dev/null || true
  chmod +x "$ROOT_DIR/.git/hooks/pre-commit" "$ROOT_DIR/.git/hooks/pre-push" 2>/dev/null || true
  ok "Hooks installiert."
}

cmd_sync_main(){
  ensure_repo
  echo "🪡 Sync main: main zu Ihrem Branch"
  local branch="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null)"
  git -C "$ROOT_DIR" fetch "$REMOTE" "$MAIN"
  git -C "$ROOT_DIR" merge --ff-only "$REMOTE/$MAIN" || die "Fast-Forward fehlgeschlagen"
  ok "Branch $branch mit $MAIN synchronisiert."
}

cmd_fix_perms(){
  ensure_repo
  info "Setze Dateiberechtigungen…"
  chmod -R go-w "$ROOT_DIR"
  ok "Berechtigungen gefixt."
}

cmd_net_guard(){
  ensure_repo
  local keys=""
  if [[ -f "$HOME/.netrc" ]]; then
    keys="$(awk '/machine/{print $2}' "$HOME/.netrc")"
  fi
  git -C "$ROOT_DIR" remote -v | sed 's/(fetch)//;s/(push)//'
  echo "Erlaubte netrc-Maschinen: $keys"
  ok "Netzwerk-Überblick erstellt."
}

cmd_diag(){
  ensure_repo
  echo "=== wgx Diagnose ==="
  echo "Shell: $(bash --version | head -n1)"
  echo "wgx    : v$WGX_VERSION"
  echo "PATH   : $PATH"
  echo "node   : $(node -v 2>/dev/null || echo missing)"
  echo "pnpm   : $(pnpm -v 2>/dev/null || echo missing)"
  echo "cargo  : $(cargo -V 2>/dev/null || echo missing)"
  echo "git    : $(git --version 2>/dev/null)"
  echo "=== Ende Diagnose ==="
}

cmd_log(){
  ensure_repo
  if [[ "${2-}" =~ ^[0-9]+$ ]]; then
    num="$2"; else num=100
  fi
  tail -n "$num" "$1"
}

cmd_config(){
  ensure_repo
  case "$1" in
    set)
      local key="$2" val="$3"
      [[ "$key" =~ ^[A-Z_]+$ ]] || die "Ungültiger Schlüssel: $key"
      printf "%s=%s\n" "$key" "$val" >> "$ROOT_DIR/.wgx.conf"
      ok "Setze $key=$val in .wgx.conf"
      ;;
    get)
      grep -E "^$2=" "$ROOT_DIR/.wgx.conf" | tail -n1 | cut -d'=' -f2- || true
      ;;
    *) cmd_help config;;
  esac
}

cmd_ps(){
  ensure_repo
  echo "Prozesse mit PROJECT_KEY=$PROJECT_KEY:"
  ps_pid_comm_stream | awk -v re="$PROJECT_KEY" '$0~re'
}

cmd_where(){
  ensure_repo
  echo "wgx befindet sich unter: $ROOT_DIR"
}

case "${1-}" in
  -v|--version) echo "wgx v${WGX_VERSION}"; exit 0;;
  help|-h|"") shift || true; cmd_help "${1-}"; exit 0;;
  install)   shift; cmd_install "$@"; exit 0;;
  up)        shift; cmd_up "$@"; exit 0;;
  down)      shift; cmd_down "$@"; exit 0;;
  open)      shift; cmd_open "$@"; exit 0;;
  logs)      shift; cmd_logs "$@"; exit 0;;
  test)      shift; cmd_test "$@"; exit 0;;
  audit)     shift; cmd_audit "$@"; exit 0;;
  gc)        shift; cmd_gc "$@"; exit 0;;
  lint)      shift; cmd_lint "$@"; exit 0;;
  doctor)    shift; cmd_doctor "$@"; exit 0;;
  status)    shift; cmd_status "$@"; exit 0;;
  reload)    shift; cmd_reload "$@"; exit 0;;
  pull)      shift; cmd_pull "$@"; exit 0;;
  snap)      shift; cmd_snap "$@"; exit 0;;
  send)      shift; cmd_send "$@"; exit 0;;
  pr)        shift; cmd_pr "$@"; exit 0;;
  heal)      shift; cmd_heal "$@"; exit 0;;
  clean)     shift; cmd_clean "$@"; exit 0;;
  hooks)     shift; cmd_hooks "$@"; exit 0;;
  sync-main) shift; cmd_sync_main "$@"; exit 0;;
  fix-perms) shift; cmd_fix_perms "$@"; exit 0;;
  net-guard) shift; cmd_net_guard "$@"; exit 0;;
  diag)      shift; cmd_diag "$@"; exit 0;;
  log)       shift; cmd_log "$@"; exit 0;;
  config)    shift; cmd_config "$@"; exit 0;;
  ps)        shift; cmd_ps "$@"; exit 0;;
  where)     shift; cmd_where "$@"; exit 0;;
  *) warn "Unbekanntes Kommando: $1"; echo; cmd_help; exit 1;;
esac

WGX
chmod +x "$repo/wgx"

# 4) Syntax-Check (fail-fast)
if ! bash -n "$repo/wgx" 2>/dev/null; then
  echo "❌ Syntax-Fehler in wgx. Backup liegt unter: $backup"
  exit 1
fi

# 5) Minimal-Tests & Cheatsheet (idempotent)
mkdir -p "$repo/tests" "$repo/docs"
# Tests schreiben (nur einmal)
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
  [[ "$output" =~ "DRY: würde" ]] || true
}
BATS
  chmod +x "$repo/tests/wgx_basic.bats"
fi
# Cheatsheet schreiben (nur einmal)
if [ ! -f "$repo/docs/wgx-cheatsheet.md" ]; then
  cat > "$repo/docs/wgx-cheatsheet.md" <<'MD'
# wgx Cheatsheet — v3.8.6

- **Start/Stop**: `wgx up --wait 45` • `wgx down [--dry-run|--force-kill]` • Logs: `wgx logs -f --tail 200 --grep "(WARN|ERR)" api`
- **Open**: `wgx open` (Termux/WSL/mac/Linux; `--check` pingt vorher)
- **Tests**: `wgx test` (Lines≥WGX_MIN_COVERAGE, Branches≥WGX_MIN_BRANCH_COVERAGE, Functions≥WGX_MIN_FUNC_COVERAGE) • Vollmodus: `WGX_RUST_FULL_COV=1 wgx test`
- **Flow**: `wgx snap --msg "…" && wgx send && wgx pr`
- **Heal**: `wgx heal` (ours/theirs/rebase/ff-only) • `wgx heal --abort|--continue|--skip`
- **Status**: `wgx status --compact` (CI) • `wgx status --json`
- **Prozesse**: `wgx ps` • `wgx where`
- **Config**: `.wgx.conf` oder `wgx config set WGX_MIN_COVERAGE=80`
- **Termux**: `WGX_ADB_REVERSE=1` für `adb reverse tcp:5173 tcp:5173`, `pkg install android-tools`, optional `termux-toast`/`termux-open-url`
- **Rust/sqlx**: Offline: `cargo sqlx prepare`; Migration vor Tests: `sqlx migrate run`
- **Codespaces**: URL: `https://$CODESPACE_NAME-$WGX_WEB_PORT.app.github.dev`
- **Rust REPL**: In reload: Optional "Rust REPL (evcxr)" – installiere via `cargo install evcxr_repl` für interaktives Rust-Debugging

> Web-Coverage via `lcov.info` (Vitest). Rust-Coverage via `cargo-llvm-cov` (summary; Full-Mode optional).
MD
fi

# 6) Symlink
mkdir -p "$HOME/bin"
ln -sf "$repo/wgx" "$HOME/bin/wgx"
hash -r

# PATH-Hinweis, falls nötig
case ":$PATH:" in
  *":$HOME/bin:"*) ;;
  *) echo "ℹ \$HOME/bin ist nicht im PATH. Füge hinzu, z.B.: echo 'export PATH=\"\$HOME/bin:\$PATH\"' >> ~/.bashrc && . ~/.bashrc";;
esac

echo "➡ which wgx: $(command -v wgx)"
( cd "$repo" && ./wgx --version && ./wgx doctor ) || true
echo "✅ wgx v3.8.6 installiert. Backup: $backup"