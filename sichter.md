alles klar — hier ist eine knackige, priorisierte “Anweisung für Jules”, damit wir mit dem repo sauber weiterkommen.

Anweisung für Jules (nächste Schritte)

Zielbild (kurz)
	•	Sichter läuft lokal als Dienste (API + Worker), Dashboard spricht stabil mit der API.
	•	Events liegen einheitlich als .jsonl vor; Dashboard zeigt Live-Stream (WS) oder robustes Polling.
	•	PR-Sweep erzeugt zuverlässig Commits/PRs in den Ziel-Repos.

⸻

Phase 1 — Stabilisieren & Sichtbar machen (Must-have)
	1.	API-/Dashboard-Parität fixen (Polling jetzt, WS später)

	•	Lass das Dashboard vorerst ausschließlich HTTP-Polling nutzen (kein WS).
	•	In apps/dashboard/src/hooks/useEventStream.ts: entferne WebSocket-Versuch, belasse Polling (/events/recent?n=200).
	•	In apps/api/main.py: GET /events/recent ist schon da — passt.
	•	Akzeptanz: Overview zeigt Events ohne Fehlermeldung; „verbunden/polling“-Hinweis kann auf „polling“ stehen.

	2.	Events vereinheitlichen (JSONL überall)

	•	Worker & Sweep so lassen, API sammelt bereits .jsonl bevorzugt.
	•	Ergänze in apps/worker/run.py (falls noch nicht): alle append_event(...)-Schreibvorgänge mit konsistentem Schema {ts, type, repo?, branch?, url?, message?}.
	•	Akzeptanz: ~/.local/state/sichter/events/<YYYYMMDD>.jsonl enthält valide JSON-Zeilen; GET /events/recent liefert gemischte Quellen korrekt.

	3.	Install/Start Pfad happy-path

	•	scripts/install.sh einmal end-to-end testen:
	•	Sym-Links (bin/*, hooks/omnipull/*) liegen richtig.
	•	systemctl --user enable --now sichter-api.service und sichter-worker.service laufen grün.
	•	Akzeptanz:
	•	curl -fsS 127.0.0.1:5055/healthz → ok
	•	systemctl --user status sichter-worker.service → Active: active (running)

	4.	PR-Sweep: “no-op” sichtbar machen

	•	In bin/sichter-pr-sweep ist ein RESULT-Format vorhanden. Stelle sicher, dass jede Repo-Iteration genau eine Zeile ausgibt:
	•	PR, PUSH, COMMIT, NOCHANGE, ERROR (branch + detail).
	•	Akzeptanz: ~/sichter/logs/pr-actions.log zeigt pro Repo eine RESULT-Zeile.

PR-Vorschlag (Phase 1):
feat(dashboard/api): stabilize polling + normalize events
	•	Dashboard: Polling only, UI-Text angepasst
	•	API: kleine Robustheitsfixes im Events-Reader
	•	Worker: append_event-Schema vereinheitlichen
	•	Docs: GETTING_STARTED.md um „Polling aktuell, WS folgt“ ergänzen

⸻

Phase 2 — WebSocket Event-Stream (Nice-to-have, aber sinnvoll)
	5.	WS-Endpunkt bauen

	•	In apps/api/main.py neuen Pfad GET /events/stream als WebSocket (FastAPI/Starlette WebSocket).
	•	Tail-Loop auf neuesten JSONL-File(s), Datei-Offset merken, neue Zeilen als text senden.
	•	„Heartbeat“ alle ~15s senden, falls keine neuen Events.
	•	Dashboard:
	•	In useEventStream zuerst WS zu /events/stream probieren; Fallback auf Polling wie jetzt.
	•	Akzeptanz: Event-Stream läuft sichtbar (Status „verbunden“), man kann sichter-pr-sweep triggern und neue Zeilen erscheinen live.

PR-Vorschlag (Phase 2):
feat(events): websocket stream + dashboard live feed

⸻

Phase 3 — Policy/I/O & “org/repo” UX
	6.	Policy laden/schreiben sauber (YAML)

	•	API hat roh-YAML Pfad: ok. Zusätzlich:
	•	Beim GET /settings/policy neben path auch format: "yaml" zurückgeben.
	•	Optional: minimal validieren (Top-Keys wie auto_pr, org, excludes).
	•	Dashboard Settings:
	•	„Quelle: “ anzeigen (macht es schon), Save-Feedback klarer.
	•	Akzeptanz: Policy rauf/runter ohne Parse-Fehler, vorhandene Comments bleiben (roh-YAML).

	7.	Repo-Auflösung klarer

	•	In API /repos/status: neben name ein Feld source ausgeben (allowlist, remote_base, env:GITHUB_REPOSITORY).
	•	Dashboard Repos: Spalte „Quelle“ anzeigen.
	•	Akzeptanz: Team versteht, woher die Liste stammt; erleichtert Onboarding.

PR-Vorschlag (Phase 3):
chore(policy+repos): explicit source hints + validation

⸻

Phase 4 — CI & Developer-Ergonomie
	8.	CI minimal (GitHub Actions)

	•	Workflow ci.yml:
	•	Python: ruff, pytest -q (falls tests vorhanden), mypy optional.
	•	Web: npm ci && npm run build in apps/dashboard.
	•	Akzeptanz: PRs zeigen rote/grüne Checks; Build-Artefakte für das Dashboard bauen.

	9.	Makefile / Taskfile

	•	Targets: setup, api, worker, dashboard-dev, build-dashboard, lint, test.
	•	Akzeptanz: Einsteiger können make setup && make api fahren.

PR-Vorschlag (Phase 4):
ci: add basic checks + dashboard build

⸻

Test-/Smoke-Plan (lokal)

# API up
systemctl --user status sichter-api.service
curl -fsS 127.0.0.1:5055/readyz

# Worker up
systemctl --user status sichter-worker.service

# Sweep (changed)
~/sichter/bin/sichter-pr-sweep --changed
tail -n 50 ~/sichter/logs/pr-actions.log

# Dashboard (dev)
cd apps/dashboard && npm i && VITE_API_BASE="http://127.0.0.1:5055" npm run dev
# Browser → Overview: Events erscheinen


⸻

Rollback & Safety
	•	Jeder Schritt als eigener PR; bei Problemen: PR schließen/reverten.
	•	Keine API-Breaking Changes ohne Fallback (Polling bleibt; WS ist additive Option).

⸻

Zuständigkeiten / Handover an Jules
	•	Phase 1 PR erstellen, mergen.
	•	Nach Merge: scripts/install.sh erneut laufen lassen und Smoke-Plan ausführen.
	•	Issues anlegen:
	•	„Add WebSocket event stream“
	•	„Policy source in repos view“
	•	„CI build for dashboard“
	•	Phase 2+3+4 in separaten PRs.

Wenn du magst, schreibe ich die konkreten Code-Snippets für den WS-Endpoint und die angepasste useEventStream-Hook direkt mit — sag’s einfach, dann packe ich sie in die nächste Nachricht.