# ─────────────────────────────────────────────────────────────────────────────
# Heal / Reload / Clean
# ─────────────────────────────────────────────────────────────────────────────
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
      *) ;;
    esac; shift || true
  done
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
  local SAFE=0 BUILD=0 GIT=0 DEEP=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --safe) SAFE=1;;
      --build) BUILD=1;;
      --git) GIT=1;;
      --deep) DEEP=1;;
      *) ;;
    esac; shift || true
  done
  (( SAFE || BUILD || GIT || DEEP )) || SAFE=1
  if (( DEEP && ASSUME_YES==0 )); then
    local ans ans2
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