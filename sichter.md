alles klar — hier ist ein knackiges, umsetzbares „Playbook für Jules“, damit der Sichter-Stack (Autoreviewer + Auto-PR + Omnicheck + Dashboard) sauber im Repo landet und dauerhaft über GitHub gepflegt wird.

Ziele (kurz)
	•	Sichter prüft nach jedem omnipull automatisch Repos (Lint + semantische LLM-Checks) und eröffnet PRs.
	•	Befehl omnicheck prüft alle Repos on-demand (inkl. Auto-PR).
	•	Ein Dashboard steuert/überwacht alles (Start/Stop Worker, Live-Events, PR-Übersicht, Omnicheck auslösen).
	•	Alles reproduzierbar aus dem Repo: systemd-Units, Hooks, CLI, Policies, Logs.

⸻

1) Repo-Struktur & Artefakte (Quelle der Wahrheit)

Ziel: Keine „Home-Only“-Skripte mehr. Alles liegt versioniert im Repo und wird von dort installiert.

sichter/
├─ apps/
│  ├─ api/            # FastAPI, Job-Queue endpoints, Events
│  ├─ worker/         # Worker (Queue-Verbraucher, LLM/Lint, Auto-PR)
│  └─ dashboard/      # Web-UI (SvelteKit/React) ← einfacher Start mit TUI möglich
├─ bin/
│  ├─ omnicheck               # CLI: --all / --changed → ruft sweep an, schreibt Report+Log
│  ├─ sweep                   # Alias/Wrapper (optional)
│  ├─ sichter-pr-sweep        # Repo-weiter Auto-PR-Sweep (frischer Branch, Auto-PR)
│  └─ sichter-dashboard       # (falls TUI-Shell; sonst Starter fürs Web-UI)
├─ hooks/
│  ├─ post-run                # optionaler Autofix-Hook (wird vom Worker & sweep genutzt)
│  └─ omnipull/
│     ├─ 80-sichter-omnicheck.sh
│     ├─ 90-sichter-pr-sweep.sh
│     ├─ 95-sichter-debug.sh
│     └─ 99-sichter-deep-review.sh
├─ config/
│  ├─ policy.yml              # zentrale Policy (Quelle der Wahrheit)
│  └─ models.yml              # Modellkonfiguration (ollama/remote)
├─ pkg/systemd/
│  ├─ user/sichter-api.service
│  ├─ user/sichter-worker.service
│  └─ user/sichter-autoreview.timer
├─ scripts/
│  ├─ bootstrap.sh            # Einmal-Setup (symlinks, deps, hooks)
│  └─ install.sh              # „make install“ auf Nutzersystem
├─ .github/workflows/
│  ├─ ci.yml                  # Lint+Build (api/worker/dashboard)
│  └─ release.yml             # (optional) getaggte Releases
└─ docs/
   ├─ GETTING_STARTED.md
   └─ OPERATIONS.md

Persistente Pfade (bei Installation/Symlinks):
	•	Logs/Events: ~/.local/state/sichter/ und ~/sichter/logs/
	•	Hooks: ~/.config/omnipull/hooks/*.sh (Symlinks auf hooks/omn…/*.sh)
	•	Policy kopiert nach ~/.config/sichter/policy.yml (oder symlink)

⸻

2) Installation & Bootstrap

scripts/install.sh (idempotent):
	•	Prüft gh, git, python3, pip, node (falls Web-UI), shellcheck, yamllint, ollama (optional).
	•	Legt ~/.config/sichter/policy.yml an, falls fehlt (Default aus config/policy.yml).
	•	Symlinks:
	•	bin/omnicheck → ~/bin/omnicheck
	•	bin/sichter-pr-sweep → ~/sichter/bin/sichter-pr-sweep
	•	hooks/omn…/*.sh → ~/.config/omnipull/hooks/
	•	systemd-Units aus pkg/systemd/user/*.service|*.timer nach ~/.config/systemd/user/ + systemctl --user daemon-reload.
	•	Enable:
	•	sichter-api.service (web api)
	•	sichter-worker.service (autonomer Worker)
	•	sichter-autoreview.timer (12h Deep-Review)

Acceptance (Install):
	•	omnicheck --all erzeugt ~/sichter/logs/omnicheck-all-*.{log,md}
	•	systemctl --user status sichter-api.service → active
	•	systemctl --user status sichter-worker.service → active

⸻

3) Policy (einheitlich)

config/policy.yml (Repo, später nach ~/.config/sichter/policy.yml):

auto_pr: true            # PRs automatisch erstellen
sweep_on_omnipull: true  # nach jedem omnipull Sweep/Checks
run_mode: deep           # deep/light
org: heimgewebe
llm:
  provider: ollama
  model: qwen2.5-coder:7b
  base_url: http://localhost:11434
checks:
  shellcheck: true
  yamllint: true
  semver: true           # z.B. package.json/pyproject Konsistenzprüfungen
  deadcode: false
  rust: false
  python: true           # ruff/pyright optional
  js: false
excludes:
  - '**/.venv/**'
  - '**/node_modules/**'
  - '**/target/**'

Der Worker und omnicheck/sichter-pr-sweep lesen nur diese Policy.

⸻

4) Worker (apps/worker)

Verantwortung:
	•	Konsumiert Tasks aus ~/.local/state/sichter/queue/*.json (oder in-Memory, optional).
	•	Für jedes Repo:
	1.	git fetch origin && git switch --detach origin/main
	2.	Branch sichter/autofix-<ts>
	3.	Checks:
	•	Lint: ShellCheck, Yamllint (Excludes aus Policy)
	•	LLM-Checks: Prompt mit diff, last HEAD, „intent“, Hinweis auf Tests. Rückgabe: Risk-Notes + Patch-Vorschläge.
	4.	Falls Änderungen: git add -A && git commit -m "hauski: autofix" && git push -u origin BR
	5.	PR über gh pr create --base main --label sichter --label automation --title ... --body ...
	6.	Status-Events nach ~/.local/state/sichter/events/*.jsonl

Akzeptanz (Worker):
	•	Doppelte Starts vermeiden (PID-Lock in ~/.local/state/sichter/worker.pid).
	•	Pro Run: verständliches Log in ~/sichter/logs/worker-*.log, Event pro PR.

⸻

5) API (apps/api)

Endpoints (Beispiele):
	•	POST /enqueue { "repo": "heimgewebe/tools", "mode": "deep" }
	•	POST /sweep { "mode": "all" | "changed" } → legt Sammeljobs an.
	•	GET /events/tail?since=... → liefert JSONL (oder WebSocket) für Dashboard.
	•	GET /healthz, GET /policy, PUT /policy.

Akzeptanz (API):
	•	Liveness + Readiness.
	•	CORS für Dashboard.
	•	Rate-Limits (leicht).

⸻

6) CLI & Hooks

bin/omnicheck
	•	Liest Policy; Mode --all | --changed (Default: --changed).
	•	Ruft bin/sichter-pr-sweep mit identischem Mode auf.
	•	Schreibt:
	•	Log: ~/sichter/logs/omnicheck-<mode>-<ts>.log
	•	Report: ~/sichter/logs/omnicheck-<mode>-<ts>.md (mit kompaktem Befund-Table).

bin/sichter-pr-sweep
	•	Beschafft Repo-Liste (bei --all: gh repo list; bei --changed: lokale ~/repos/*).
	•	Für jedes Repo: Frischer Branch, ruft hooks/post-run wenn vorhanden, dann Worker-Checks (oder integrierte Light-Checks), commit/push/PR.
	•	Loggt Aktionen in ~/sichter/logs/pr-actions.log.

Omnipull Hooks (alle aus Repo, als Symlinks installiert)
	•	80-sichter-omnicheck.sh  → omnicheck --changed
	•	90-sichter-pr-sweep.sh    → optionaler zusätzlicher Sweep
	•	95-sichter-debug.sh       → env & health dump
	•	99-sichter-deep-review.sh → run_mode=deep erzwungen

Akzeptanz (Hooks):
	•	Nach omnipull: in omnipull-Ausgabe sind Hook-Starts sichtbar und Logs/Reports werden geschrieben.
	•	Kein .off-Suffix im produktiven Zustand.

⸻

7) Dashboard

MVP-Variante (schnell produktiv):
	•	TUI-Dashboard (bash): bin/sichter-dashboard
	•	Menüs: „Omnicheck (all/changed)“, „Worker Start/Stop“, „Letzte PRs anzeigen“, „Logs öffnen“.
	•	Ruft API/CLI auf, tailt Logs, zeigt gh pr list pro Repo.

Finale Variante (Web-UI):
	•	apps/dashboard/ (SvelteKit/React):
	•	Seiten: Overview (Worker-Health, Queue, Events), Repos (Status, letzte Befunde), Actions (Omnicheck, Sweep), Settings (Policy).
	•	Echtzeit per WebSocket (/events/tail).
	•	Build-Artefakte per systemd statisch serviert (uvicorn/gunicorn oder node serve).

⸻

8) CI (GitHub Actions)

.github/workflows/ci.yml:
	•	Jobs:
	•	lint_shell: ShellCheck auf bin/, hooks/ (Excludes aus Policy).
	•	lint_yaml: yamllint (ohne vendor/venv/node_modules/target).
	•	api_worker_tests: pytest/ruff (falls Python).
	•	dashboard_build: npm ci && npm run build (falls Web-UI).
	•	Fail fast: ja. Artefakte: Logs.

Akzeptanz (CI):
	•	PRs gegen main laufen grün, Linter sind sauber konfiguriert (keine internen site-packages scannen).

⸻

9) Sicherheit / Secrets
	•	gh auth status muss auf der Maschine grün sein (Dashboard zeigt Warnung, wenn nicht).
	•	Kein Secret im Repo. API kann GH_TOKEN/GITHUB_TOKEN aus der Umgebung lesen (systemd-EnvironmentFile optional).
	•	LLM: Falls remote, URL/Token in ~/.config/sichter/policy.yml oder systemd-Environment.

⸻

10) Rollout-Plan (Schritt für Schritt)
	1.	Branch anlegen: feat/sichter-autoreviewer
	2.	Struktur anlegen (Punkte 1–4), minimale lauffähige Worker+API.
	3.	CLI & Hooks anschließen (Punkt 6), scripts/install.sh schreiben.
	4.	systemd hinzufügen und dokumentieren.
	5.	Dashboard (TUI) als Startversion (später Web-UI).
	6.	CI aktivieren, README/GETTING_STARTED.md + OPERATIONS.md.
	7.	Test auf Alex-Maschine:
	•	./scripts/install.sh
	•	systemctl --user enable --now sichter-api.service sichter-worker.service
	•	omnicheck --all
	•	Prüfen: ~/sichter/logs/*, PRs in der Org.
	8.	PR erstellen (Labels: sichter, automation) & mergen.

⸻

11) Abnahme-Checkliste
	•	omnipull triggert Hooks; omnicheck läuft, PRs werden erstellt wenn Fixes anfallen.
	•	omnicheck --all erzeugt Report+Log und ggf. PRs.
	•	sichter-worker läuft stabil (kein Doppelstart; Lockfile).
	•	Dashboard (TUI) kann Worker start/stoppen, Omnicheck auslösen, Logs/PRs anzeigen.
	•	config/policy.yml ist alleinige Quelle; lokale Kopie unter ~/.config/sichter/.
	•	CI grün (ShellCheck/Yamllint/Build).
	•	Doku vorhanden (Install/Operate/Troubleshoot).

⸻

12) Nützliche Kommandos (für Doku/README)

# Install (idempotent)
./scripts/install.sh

# Dienste
systemctl --user enable --now sichter-api.service sichter-worker.service
systemctl --user status sichter-api.service sichter-worker.service

# Omnicheck on-demand
omnicheck --changed
omnicheck --all

# Dashboard (TUI)
sichter-dashboard

# Logs
ls -1t ~/sichter/logs | head
tail -f ~/sichter/logs/pr-actions.log


⸻

13) „Was ist mit bestehenden lokalen Skripten?“
	•	Alles, was aktuell nur unter ~/sichter/bin oder ~/.config/omnipull/hooks lebt, wandert ins Repo (unter bin/ bzw. hooks/omn…/) und wird bei der Installation als Symlink abgelegt.
	•	Falls es lokale Anpassungen gibt, die GitHub-Stand verbessern: als Commits übernehmen (kein Shadowing im Home-FS).

⸻

Wenn du magst, formuliere ich das oben als GitHub Issue(s) + PR-Template gleich mit Akzeptanzkriterien — sag einfach Bescheid, dann bekommst du die Texte in „copy-paste“-Form für die Repo-Tickets.