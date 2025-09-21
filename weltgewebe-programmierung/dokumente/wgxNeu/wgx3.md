# ─────────────────────────────────────────────────────────────────────────────
# Doctor / Init / Setup / Start
# ─────────────────────────────────────────────────────────────────────────────
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
  local br web api ahead=0 behind=0
  if ((in_repo)); then
    br="$(git_branch)"; web="$(detect_web_dir || true)"; api="$(detect_api_dir || true)"
    local IFS=' '; read -r behind ahead < <(git_ahead_behind "$br") || true
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
    esac; shift || true
  done
  [[ -z "$slug" ]] && die "Usage: wgx start [--issue <ID>] <slug>"

  git fetch origin "$WGX_BASE" 2>/dev/null || true
  local base_ref="origin/$WGX_BASE"
  git rev-parse --verify -q "$base_ref" >/dev/null || base_ref="$WGX_BASE"
  git rev-parse --verify -q "$base_ref" >/dev/null || die "Basisbranch $WGX_BASE nicht gefunden (weder lokal noch origin/)."

  slug="${slug//[^a-zA-Z0-9._-]/-}"
  slug="${slug//../.}"
  slug="${slug##+(-)}"; slug="${slug%%+(-)}"
  [[ -z "$slug" ]] && die "leerer Branch-Name."

  local name; name="${slug}"
  [[ -n "$issue" ]] && name="feat-${issue}-${slug}"
  shopt -s extglob; name="${name//+(-)/-}"; shopt -u extglob
  name="${name//@\{/-}"
  [[ "$name" == *.lock ]] && name="${name%.lock}-lock"

  git check-ref-format --branch "$name" || die "Ungültiger Branch-Name: $name"
  git checkout -b "$name" "$base_ref" || die "Branch konnte nicht erstellt werden."
  ok "Branch '$name' von $base_ref erstellt und ausgecheckt."
}

# ─────────────────────────────────────────────────────────────────────────────
# Release / Version
# ─────────────────────────────────────────────────────────────────────────────
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
      local v="${1-}"; shift || true
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