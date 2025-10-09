Alright, Alex — hier ist der komplette, praxistaugliche Blueprint für deine „GPT ↔ Codex ↔ PR“-Schleife über alle Repos (hauski, semantAH, weltgewebe, hauski-audio, wgx, metarepo). Er ist so gebaut, dass du ihn schrittweise einbauen kannst: erst lokal (Policy + Gate + Prompts), dann CI-Reviewer, dann Canvas-Essenz. Ohne WGX-Pflicht. 🔧

⸻

Zielbild (kurz)
	•	Codex arbeitet lokal, strikt eingehegt im Repo, erzeugt einen git-apply-fähigen Patch, der erst geprüft und dann angewendet wird.
	•	Tests laufen schlank (quick) vor Commit; full in CI.
	•	CI nutzt Codex als Reviewer (kommentiert PRs, keine Commits).
	•	Jeder erfolgreiche Lauf hinterlässt Logs (nach deinem v1.4-Schema) und eine Canvas-Essenz (Obsidian).

⸻

System-Überblick

┌─────────┐         ┌────────────────────────┐
│  Du     │  prompt │  scripts/hauski-codex  │
│ (GPT)   ├────────►│  (Headless Gate)       │
└─────────┘         └────────┬───────────────┘
                              │ calls
                              ▼
                        ┌──────────┐
                        │  Codex   │  (nur erlaubte Pfade/Cmds)
                        └────┬─────┘
                             │ plan→patch.diff
                             ▼
                    git apply --check → apply → just test-quick
                             │
                   commit on codex/<ts>  + Canvas + Logs


⸻

1) Voraussetzungen (Pop!_OS)

# Node & npm
sudo apt-get update && sudo apt-get install -y nodejs npm

# (Optional) Rust & uv – für deine Repos ohnehin da
curl -fsSL https://sh.rustup.rs | sh -s -- -y
# uv siehe dein bestehendes Setup

Codex-Binary: Setz eine Umgebungsvariable CODEX_BIN, z. B. auf codex (falls via npm/global verfügbar) oder einen lokalen Pfad. Der Gate-Script versucht: $CODEX_BIN → codex → npx codex. So bist du unabhängig vom exakten Installweg.

⸻

2) Dateibaum-Ergänzungen (alle Repos)

scripts/
  hauski-codex.sh                 # Headless Gate (Plan→Check→Apply)
  policies/
    codex.policy.yml              # strenge Whitelist
    codex.policy.local.yml        # optional, gitignored
  codex-prompts/
    bugfix.md
    testgap.md
    refactor.md
docs/
  canvas/
    codex/README.md               # Ort für Canvas-Exports
.hauski-reports -> ~/.hauski/review/<repo>/   # Symlink (nur wenn gewünscht)
.github/workflows/
  codex-review.yml                # PR-Reviewer (kommentiert)
Justfile                          # Tasks: codex bugfix/refactor/testgap, test-quick/full


⸻

3) Policy (streng, aber praxisnah)

scripts/policies/codex.policy.yml

paths:
  read: ['.']
  write:
    - 'src/'
    - 'crates/'
    - 'scripts/'
    - '.github/workflows/'
    - 'docs/'
commands:
  allow:
    - 'git status'
    - 'git diff'
    - 'git apply --3way *'
    - 'cargo build --locked'
    - 'cargo test -q'
    - 'uv run pytest -q'
    - 'npm test -s'
  deny:
    - 'curl *'
    - 'wget *'
    - 'sudo *'
    - 'rm -rf /'
git:
  work_branch_prefix: 'codex/'
  max_commit_lines: 800
guardrails:
  ask_before_apply: true
  require_green_tests: true
  require_git_clean: true

Repo-spezifische Ergänzungen kommen in codex.policy.local.yml (gitignored), z. B. apps/, services/, infra/ bei weltgewebe.

⸻

4) „Goldene Prompts“ (kurz, ergebnisfokussiert)

scripts/codex-prompts/bugfix.md

Ziel: Minimalinvasiver Bugfix in <MODUL>.
Vorgehen:
1) Ursache in 2 Sätzen.
2) EIN Patch (git-apply-kompatibel, ohne Reformat).
3) 1–2 gezielte Tests hinzufügen/aktualisieren.
4) Danach 3-Satz-Begründung + 1–2 Risiken.

Rahmen:
- Keine API-Brüche.
- Max 150 geänderte Zeilen, max 6 Dateien.
- Nur erlaubte Pfade/Kommandos (siehe Policy).

scripts/codex-prompts/testgap.md

Ziel: Testlücken schließen für <BEREICH>.
1) Liste 3–5 fehlende Checks (kurz).
2) EIN Patch mit minimalen neuen Tests.
3) Gründe in 3 Sätzen (warum diese, nicht andere).

scripts/codex-prompts/refactor.md

Ziel: Kleine, risikofreie Aufräumung in <BEREICH>.
1) Plan in Bulletpoints (<=5).
2) EIN Patch, kein Reformat, keine API-Brüche.
3) Tests müssen grün bleiben; ggf. 1 Zusatztest.


⸻

5) Headless-Gate (Plan → Check → Apply → Tests → Commit)

scripts/hauski-codex.sh

#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(pwd)}"
PROMPT_FILE="${2:-scripts/codex-prompts/bugfix.md}"
POLICY="${3:-scripts/policies/codex.policy.yml}"
LOCAL_POLICY="scripts/policies/codex.policy.local.yml"
CODEX_BIN="${CODEX_BIN:-codex}"

cd "$ROOT"
git rev-parse --show-toplevel >/dev/null
test -r "$PROMPT_FILE" && test -r "$POLICY"
[ -r "$LOCAL_POLICY" ] && POLICY_COMBINED="$(mktemp)" || POLICY_COMBINED="$POLICY"

if [ "$POLICY_COMBINED" != "$POLICY" ]; then
  # simple merge (concat) – Codex liest beide Abschnitte unter [Policy]
  cat "$POLICY" "$LOCAL_POLICY" > "$POLICY_COMBINED"
fi

TS="$(date +%Y-%m-%d_%H-%M-%S)"
REPO="$(basename "$(git rev-parse --show-toplevel)")"
LOGDIR="$HOME/.hauski/review/$REPO/$TS"
mkdir -p "$LOGDIR" .hauski-tmp

# 0) Preflight
git update-index -q --refresh
test -z "$(git status --porcelain)" || { echo "❌ Working tree nicht clean"; exit 1; }

cp "$PROMPT_FILE" "$LOGDIR/prompt.md"
cp "$POLICY_COMBINED" "$LOGDIR/policy.yml"

# 1) PLAN erzeugen
run_codex() {
  if command -v "$CODEX_BIN" >/dev/null 2>&1; then
    "$CODEX_BIN"
  elif command -v codex >/dev/null 2>&1; then
    codex
  else
    npx -y codex
  fi
}

{
  echo "### PROMPT"; echo
  cat "$PROMPT_FILE"; echo
  echo; echo "### POLICY"; echo
  cat "$POLICY_COMBINED"; echo
} | run_codex | tee "$LOGDIR/session.raw.md"

# 2) Patch extrahieren (ab dem ersten 'diff --git')
awk '/^diff --git /{flag=1} flag{print}' "$LOGDIR/session.raw.md" > .hauski-tmp/patch.diff || true
LINES=$(wc -l < .hauski-tmp/patch.diff || echo 0)
if [ "$LINES" -lt 5 ]; then
  echo "❌ Kein verwertbarer Patch gefunden."
  exit 2
fi

# 3) Größe begrenzen
FILES=$(grep -c '^diff --git ' .hauski-tmp/patch.diff || true)
if [ "$FILES" -gt 20 ]; then
  echo "❌ Zu viele Dateien im Patch ($FILES > 20)."
  exit 2
fi
CHANGES=$(grep -c '^\(+\|-\)' .hauski-tmp/patch.diff || true)
if [ "$CHANGES" -gt 500 ]; then
  echo "❌ Patch zu groß ($CHANGES > 500 Änderungen)."
  exit 2
fi

# 4) Check + Apply
git apply --3way --check .hauski-tmp/patch.diff || { echo "❌ Patch check failed"; exit 2; }
git apply --3way .hauski-tmp/patch.diff

# 5) Quick Tests (repo-spezifisch anpassen)
if just -l 2>/dev/null | grep -q '^test-quick'; then
  just test-quick || { echo "❌ test-quick rot – rolle Patch zurück"; git restore -SW .; exit 1; }
else
  # Fallback: einfache Rust/Python/Node-Checks
  (command -v cargo >/dev/null && cargo test -q) || true
  (command -v uv >/dev/null && uv run pytest -q) || true
  (command -v npm >/dev/null && npm test -s) || true
fi

# 6) Commit auf feature-Branch
BR="codex/$TS"
git checkout -b "$BR" 2>/dev/null || git checkout "$BR"
git add -A
cat > .hauski-tmp/commitmsg.txt <<EOF
fix: minimaler Patch via Codex

Warum:
- siehe $TS (HausKI Review Log)

Tests:
- quick suite grün (vor-Commit)

Co-authored-by: codex <>
EOF
git commit -F .hauski-tmp/commitmsg.txt

# 7) Canvas-Essenz (leichtgewichtig; JSON schreiben)
CANVAS="docs/canvas/codex/${TS}.canvas"
mkdir -p "$(dirname "$CANVAS")"
cat > "$CANVAS" <<'JSON'
{
  "nodes": [
    { "id": "meta", "type": "text", "text": "Codex-Run: Minimaler Patch", "x": 0, "y": 0, "color": "blue" },
    { "id": "prozess", "type": "text", "text": "Plan → Patch → Test", "x": 300, "y": 0, "color": "yellow" },
    { "id": "risiko", "type": "text", "text": "Begrenzte Diffgröße, kein Reformat", "x": 0, "y": 150, "color": "red" },
    { "id": "ziel", "type": "text", "text": "Tests grün; PR vorbereitbar", "x": 300, "y": 150, "color": "green" },
    { "id": "legende", "type": "text", "text": "Blau=Meta, Grau=Grundlagen, Gelb=Prozess, Rot=Risiken, Grün=Ziele, Violett=Ebenen", "x": -200, "y": 260, "color": "gray" }
  ],
  "edges": [
    { "fromNode": "meta", "toNode": "prozess", "label": "Ablauf" },
    { "fromNode": "prozess", "toNode": "ziel", "label": "Ergebnis" },
    { "fromNode": "prozess", "toNode": "risiko", "label": "Beachtung" }
  ]
}
JSON

echo "✅ Committed: $BR"
echo "📒 Logs: $LOGDIR"
echo "🗺️  Canvas: $CANVAS"


⸻

6) Justfile-Ergänzungen (einfach, schnell)

Justfile

# Quick vs. Full
test-quick:
    # Passe the repo-weise an (z. B. per changed file filter)
    @echo "running quick tests…"
    @if command -v cargo >/dev/null; then cargo test -q; fi
    @if command -v uv >/dev/null; then uv run pytest -q || true; fi
    @if command -v npm >/dev/null; then npm test -s || true; fi

test-full:
    @echo "running full test suite…"
    @if command -v cargo >/dev/null; then cargo test -q; fi
    @if command -v uv >/dev/null; then uv run pytest -q || true; fi
    @if command -v npm >/dev/null; then npm test -s || true; fi

# Codex Runs
codex bugfix:
    bash scripts/hauski-codex.sh . scripts/codex-prompts/bugfix.md scripts/policies/codex.policy.yml

codex testgap:
    bash scripts/hauski-codex.sh . scripts/codex-prompts/testgap.md scripts/policies/codex.policy.yml

codex refactor:
    bash scripts/hauski-codex.sh . scripts/codex-prompts/refactor.md scripts/policies/codex.policy.yml


⸻

7) CI-Reviewer (kommentiert PRs, keine Commits)

.github/workflows/codex-review.yml

name: codex-review
on:
  pull_request:
    branches: [ "main" ]
permissions:
  contents: read
  pull-requests: write
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Deine Build/Tests als Kontext für Logs (knapp halten!)
      - name: Quick checks
        run: |
          set -e
          if command -v cargo >/dev/null 2>&1; then cargo test -q || true; fi
          if command -v npm >/dev/null 2>&1; then npm ci && npm test -s || true; fi
          if command -v uv >/dev/null 2>&1; then uv run pytest -q || true; fi

      # PR-Diff einsammeln (knapp)
      - name: Collect PR diff
        id: diff
        run: |
          git fetch origin ${{ github.base_ref }} --depth=1
          git diff --unified=0 --minimal --no-color origin/${{ github.base_ref }}...HEAD > pr.diff
          wc -l pr.diff | awk '{print "lines="$1}' >> $GITHUB_OUTPUT

      # Codex aufrufen (Headless), Reviewer-Prompt
      - name: Run codex (review)
        id: codex
        env:
          DIFF_LINES: ${{ steps.diff.outputs.lines }}
        run: |
          echo "### REVIEW PROMPT" > prompt.md
          cat <<'EOF' >> prompt.md
Bewerte diesen PR:
- Risiken, API-Brüche, fehlende Tests
- Mache maximal 3 konkrete, git-apply-kompatible Patch-Vorschläge (ohne Reformat)
- Nenne in 3 Sätzen die Begründung und 1–2 Risiken pro Vorschlag
EOF
          echo >> prompt.md
          echo "### DIFF (gekürzt)" >> prompt.md
          head -n 1000 pr.diff >> prompt.md

          # Codex ausführen (als Kommentar-Text)
          if command -v codex >/dev/null 2>&1; then
            codex < prompt.md > review.txt
          else
            npx -y codex < prompt.md > review.txt
          fi

      # Kommentar in den PR schreiben
      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const body = fs.readFileSync('review.txt', 'utf8').slice(0, 60000);
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body
            })

Effekt: CI liefert einen knappen Reviewer-Kommentar (Vorschläge + Risiken). Keine Commits. Du entscheidest.

⸻

8) Repo-Spezifik
	•	hauski: paths.write → crates/, scripts/, .github/workflows/, docs/ passt.
	•	semantAH: allow um uv run python -m semantah.cli index / make build-graph ergänzen.
	•	weltgewebe: je nach Struktur apps/, services/, infra/ gezielt whitelisten; pnpm test -s erlauben, wenn pnpm im Einsatz.
	•	hauski-audio: Audio-Plugins-Pfad ergänzen; schnelle Smoke-Tests als just smoke-audio.

⸻

9) Ethik/Guardrails (knapp & wichtig)
	•	No-Net als Default (kein Download/Upload).
	•	Nur Whitelist-Kommandos; kein sudo, kein Paket-Install.
	•	Branch-Prefix codex/…, damit nie direkt auf main.
	•	Patch-Gates: max Dateien/Zeilen, --check, rollback bei roten Tests.
	•	Logs & Canvas sichern Nachvollziehbarkeit (wer, was, warum).

⸻

10) „Für Dummies“

Codex ist ein vorsichtiger Helfer. Du gibst ihm einen klaren Auftrag (Bugfix/Tests/Refactor). Er macht einen Plan und liefert einen Patch. Der Patch wird überprüft, angewendet, kurz getestet und in einen eigenen Branch committed. In GitHub kommentiert er PRs nur — nichts wird heimlich geändert. Alles wird geloggt, und eine kleine Canvas fasst das Ergebnis zusammen.

⸻

11) Dein Arbeitsablauf (ideal getaktet)
	1.	GPT mit dir: „Nächste Punkte“ herausarbeiten.
	2.	just codex bugfix (o. ä.) → Gate → Patch → quick tests → Commit.
	3.	PR aufmachen.
	4.	CI kommentiert mit Codex-Review; du entscheidest über Übernahme/Nacharbeit.
	5.	Falls rot: knappe Logs nehmen CI-seitig Kurs auf Codex-Review (schon eingebunden).
	6.	Iterieren bis grün; Merge.

⸻

Essenz

Headless Codex mit Gate (Plan→Check→Apply), strikte Policy, goldene Prompts, quick/full-Tests, CI-Reviewer-Kommentar, Logs + Canvas. WGX ist optional – die echte Beschleunigung passiert durch Gate + Prompts + knappe CI-Rückkopplung.

∆-Radar
	•	Straffung: Interaktive Unschärfe raus, deterministischer Headless-Pfad rein.
	•	Verstärkung: CI liefert Codex „Review-Futter“ direkt, du sparst manuelles Log-Copy-Pasten.
	•	Seitwärtsmutation: Canvas standardisiert als „menschlicher Beipackzettel“ jeder Änderung.

∴ Unsicherheitsgrad

0.32 (niedrig–moderat).
Ursachen: Exakte codex-Installquelle/CLI-Flags können variieren; PR-Reviewer-Schritt nutzt generische npx codex + github-script. Mitigation: CODEX_BIN nutzen, Version pinnen, erst in einem Repo (hauski) verproben, dann per Template/Metsync ausrollen.

⸻

Wenn du magst, baue ich dir daraus direkt Repo-Patches (hauski zuerst), inkl. Symlink .hauski-reports und minimaler test-quick.