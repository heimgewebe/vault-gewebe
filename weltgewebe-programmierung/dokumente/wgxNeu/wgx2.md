# ─────────────────────────────────────────────────────────────────────────────
# CODEOWNERS / Reviewer / Labels
# ─────────────────────────────────────────────────────────────────────────────
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
  endac
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
  local joined; local IFS=,; joined="${L[*]}"
  printf '%s\n' "$(_sanitize_csv "$joined")"
}

# ─────────────────────────────────────────────────────────────────────────────
# Commit / Sync
# ─────────────────────────────────────────────────────────────────────────────
sync_cmd(){
  require_repo
  local STAGED_ONLY=0 WIP=0 AMEND=0 SCOPE="auto" BASE="" signflag="" had_upstream=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --staged-only) STAGED_ONLY=1;;
      --wip) WIP=1;;
      --amend) AMEND=1;;
      --scope) shift; SCOPE="${1-}";;
      --base)  shift; BASE="${1-}";;
      --sign)  signflag="-S";;
      *) ;;
    esac; shift || true
  done
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
  else
    info "Nichts zu committen."
  fi

  _fetch_guard
  git rev-parse --verify -q "origin/$WGX_BASE" >/dev/null || die "Basisbranch origin/$WGX_BASE nicht gefunden (git fetch?)."
  git rebase "origin/$WGX_BASE" || { warn "Rebase-Konflikt → wgx heal rebase"; return 2; }

  if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then had_upstream=1; else had_upstream=0; fi
  if (( had_upstream )); then git push || die "Push fehlgeschlagen."
  else git push --set-upstream origin "$(git_branch)" || die "Push/Upstream fehlgeschlagen."; fi

  ok "Sync erledigt."
  local behind=0 ahead=0 IFS=' '
  read -r behind ahead < <(git_ahead_behind "$(git_branch)") || true
  info "Upstream: ahead=$ahead behind=$behind"
}

# ─────────────────────────────────────────────────────────────────────────────
# PR/MR Send
# ─────────────────────────────────────────────────────────────────────────────
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

send_cmd(){
  require_repo
  local DRAFT=0 TITLE="" WHY="" TESTS="" NOTES="" SCOPE="auto" LABELS="$WGX_PR_LABELS" ISSUE="" BASE="" SYNC_FIRST=1 SIGN=0 INTERACTIVE=0 REVIEWERS="" TRIGGER_CI=0 OPEN_PR=0 AUTO_BRANCH=0
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
    --auto-branch) AUTO_BRANCH=1;;
    *) ;;
  esac; shift || true; done
  [[ -n "$BASE" ]] && WGX_BASE="$BASE"

  # Schutz: kein PR direkt von Base + kein leeres Diff
  local current; current="$(git_branch)"
  local AUTO_BRANCH_FLAG=$(( AUTO_BRANCH || WGX_AUTO_BRANCH ))
  if [[ "$current" == "$WGX_BASE" ]]; then
    if (( AUTO_BRANCH_FLAG )); then
      local slug="auto-pr-$(date +%Y%m%d-%H%M%S)"
      info "Base-Branch ($WGX_BASE) erkannt → auto Branch: $slug"
      start_cmd "$slug" || die "auto-branch fehlgeschlagen"
    else
      die "send: Du stehst auf Base ($WGX_BASE). Erst \"wgx start <slug>\" – oder nutze \"wgx send --auto-branch\" / setze WGX_AUTO_BRANCH=1."
    fi
  fi
  git fetch -q origin "$WGX_BASE" >/dev/null 2>&1 || true
  if git rev-parse --verify -q "origin/$WGX_BASE" >/dev/null; then
    if git diff --quiet "origin/$WGX_BASE"...HEAD; then
      die "send: Kein Diff zu origin/$WGX_BASE → Nichts zu senden (committen oder \"wgx sync\")."
    fi
  fi

  guard_run; local rc=$?
  (( rc==1 && (ASSUME_YES || ${WGX_DRAFT_ON_WARN:-0}) )) && DRAFT=1
  (( SYNC_FIRST )) && sync_cmd ${SIGN:+--sign} --scope "${SCOPE}" --base "$WGX_BASE" || { warn "Sync fehlgeschlagen → PR abgebrochen."; return 1; }

  local files scope short; files="$(git diff --name-only "origin/$WGX_BASE"...HEAD 2>/dev/null || true)"
  scope="$([[ "$SCOPE" == "auto" ]] && auto_scope "$files" || echo "$SCOPE")"
  local last_subject; last_subject="$(git log -1 --pretty=%s 2>/dev/null || true)"
  short="${TITLE:-${last_subject:-"Änderungen an ${scope}"}}"
  local TITLE2="[${scope}] ${short}"

  local body; body="$(render_pr_body "$TITLE2" "$short" "${WHY:-"—"}" "${TESTS:-"—"}" "${ISSUE:-""}" "${NOTES:-""}")"
  if (( INTERACTIVE )); then
    local tmpf; tmpf="$(mktemp_portable wgx-pr)"
    printf "%s" "$body" > "$tmpf"
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
    github|*)
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
  esac
}

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
