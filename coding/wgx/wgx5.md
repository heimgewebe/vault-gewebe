# ─────────────────────────────────────────────────────────────────────────────
# Hooks / Env / Quick / Config
# ─────────────────────────────────────────────────────────────────────────────
hooks_cmd(){
  require_repo
  local sub="${1-}"; shift || true
  case "$sub" in
    install)
      local root
      root="$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)"
      if [[ -x "$root/cli/wgx/install.sh" ]]; then
        bash "$root/cli/wgx/install.sh" || die "wgx install.sh fehlgeschlagen"
      else
        die "hooks install: Installer fehlt (cli/wgx/install.sh)"
      fi
      ;;
    *) die "Usage: wgx hooks install";;
  esac
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
      if has termux-setup-storage; then termux-setup-storage || true; else warn "termux-setup-storage nicht verfügbar."; fi
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
  if [[ "${1-}" == "--fix" ]]; then fix=1; shift || true; fi
  case "$sub" in
    doctor|"")
      if is_termux; then
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
      local k_re; k_re="$(printf '%s' "$k" | sed 's/[][().^$*+?{}|\\]/\\&/g')"
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

# ─────────────────────────────────────────────────────────────────────────────
# Hilfe / Router
# ─────────────────────────────────────────────────────────────────────────────
usage(){
cat <<EOF
wgx – v${WGX_VERSION}
Kurz:
  wgx status                # kompakter Status (ahead/behind, base, dirs)
  wgx quick [-i]            # Guard → Lint/Test → Sync → PR/MR (Warnungen → Draft) → CI + Browser
  wgx send [--ci] [--open]  # Preflight → Sync → PR/MR (+ --reviewers auto|user1,user2, -i für Editor)
  wgx guard --lint --test   # Preflight + Lint + Tests  [--deep-scan]  [--fix]
  wgx start [--issue N] slug
  wgx release --version vX.Y.Z | --auto-version patch|minor|major [--push] [--sign-tag] [--latest]
  wgx version bump patch|minor|major [--commit] | set vX.Y.Z [--commit]
  wgx hooks install
  wgx env doctor [--fix]    # Umgebungscheck (Termux-Fixes)
  wgx config show|set K=V
  wgx clean / lint / doctor / setup / init / reload / heal / test
Global:
  --yes  --dry-run  --timeout <s>  --no-timeout  --verbose  --base <branch>  --no-color  --offline  --version
EOF
}

# Router
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