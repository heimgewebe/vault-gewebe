bash -euxo pipefail <<'SH'
ROOT="$HOME/repos/sichter"
mkdir -p "$ROOT/bin" "$ROOT/hooks" "$ROOT/.config/omnipull/hooks"
install -m 0755 "$HOME/bin/omnicheck"                          "$ROOT/bin/omnicheck"
install -m 0755 "$HOME/sichter/bin/sichter-pr-sweep"           "$ROOT/bin/sichter-pr-sweep"
install -m 0755 "$HOME/.config/omnipull/hooks/100-sichter-always-post.sh" "$ROOT/.config/omnipull/hooks/100-sichter-always-post.sh"
install -m 0755 "$HOME/.config/omnipull/hooks/90-sichter-pr-sweep.sh"     "$ROOT/.config/omnipull/hooks/90-sichter-pr-sweep.sh"
install -m 0755 "$HOME/.config/omnipull/hooks/95-sichter-debug.sh"        "$ROOT/.config/omnipull/hooks/95-sichter-debug.sh"
install -m 0755 "$HOME/.config/omnipull/hooks/99-sichter-deep-review.sh"  "$ROOT/.config/omnipull/hooks/99-sichter-deep-review.sh"

# Policy-Vorlage einchecken
mkdir -p "$ROOT/policy"
cat >"$ROOT/policy/policy.env.example" <<'EOF'
# Wird beim Installieren nach ~/.config/sichter/policy.env kopiert
SICHTER_RUN_MODE=deep
SICHTER_AUTO_PR=1
SICHTER_SWEEP_ON_OMNIPULL=1
EOF

# Readme-Hinweis
cat >"$ROOT/README.md" <<'EOF'
# Sichter – Omnicheck & PR-Sweep
- `bin/omnicheck` — scan & trigger sweep (`--all`/`--changed`)
- `bin/sichter-pr-sweep` — erstellt Auto-PRs repo-weit
- `.config/omnipull/hooks/*` — Hooks nach jedem `omnipull`
- `policy/policy.env.example` — Beispiel-Policy

## Installation (lokal)
```bash
make install   # optional, sonst manuell in $HOME kopieren
EOF

pushd "$ROOT" >/dev/null
git switch -C feat/omnicheck-sweep-stable || git checkout -B feat/omnicheck-sweep-stable
git add -A
git commit -m "feat: stabile Omnicheck+PR-Sweep Pipline inkl. Hooks & Policy" || true
git push --set-upstream origin feat/omnicheck-sweep-stable || true
gh pr create --base main --title "Sichter: stabile Omnicheck+PR-Sweep + Hooks" --body "Automatisierte Reviews, PR-Sweep, Policies & Hooks." --label sichter --label automation || true
popd >/dev/null
SH

markdown
Code kopieren
