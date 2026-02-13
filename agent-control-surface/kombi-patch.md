Dialektische Erörterung (∴oszillation / ∴resonanz / ∴paradox)

These (Kohärenzgewinn):
Dein Diff zieht eine klare Linie durch den Organismus: WGX liefert Audit+Routine-Motorik (Artefakte, JSON), ACS wird Orchestrator/Actor-Gate (Jobs, Tokens, Endpunkte), Leitstand bleibt Viewer (Ops-UI, Konfiguration, sichere Defaults). Das resoniert stark mit „Durchsetzung vor Vertrauen“ und „Beobachtung ≠ Handlung“: Audit ist Beobachtung, Routine ist Handlung — und wird explizit gegated.

Antithese (Komplexitätszuwachs & Angriffsfläche):
Du führst drei neue Oberflächen ein: (1) neue CLI-Subcommands, (2) mutierende Routinen, (3) ACS-Endpunkte inkl. Token-Flow. Das erhöht die Gefahr von driftiger Semantik (z. B. Exit-Code-Policy vs. JSON-Status), UI/Server-Inkonsistenzen (stdout-json vs. file-mode), und Security-Footguns (CORS, Actor-Token, in-memory Confirm-Tokens in Multi-Worker-Setups).

Synthese (produktive Spannung):
Die Lösung ist gut, wenn du sie PR-weise sauber schneidest:
	•	WGX: Contract/Artefakt-Form stabilisieren (Typen, booleans, filenames, exit semantics).
	•	ACS: harte Sicherheitsgates, robuste Parser, klare 409/403 Semantik, Tests.
	•	Leitstand: Viewer-first UX, safe defaults, Mixed-Content/CORS Hinweise, optionaler Fallback.

(Und ja: der Satz „Exit code is 0 even if audit findings are ‘error’“ ist die Art von Wahrheit, die Menschen lieben, bis sie’s im CI als „alles grün“ missverstehen.)

⸻

Verdichtete Essenz

Drei ideale PRs (wgx / agent-control-surface / leitstand), die gemeinsam „Git Health“ als artefaktische Beobachtung plus optional gegatete Reparatur-Routinen implementieren: WGX produziert, ACS orchestriert & sichert, Leitstand visualisiert.

⸻

PR-Erstellungsprompts pro Repo (ideale Variante)

Format: direkt als „Create PR“-Prompt für Jules/Copilot nutzbar.
Je Prompt: Titel, Motivation, Scope, Änderungen, Tests, Risiko/Rollout, Review-Fokus.

⸻

1) Repo: wgx — PR Prompt

PR Title:
WGX: audit git + routine Dispatcher + git.repair.remote-head Routine (Artefakte, Tests, CLI-Doku)

Prompt:
Bitte erstelle einen PR im Repo wgx mit folgendem Zielbild:

Motivation / Problem:
Wir brauchen eine standardisierte, artefaktbasierte Git-Health-Diagnose und eine optionale Reparatur-Routine, die sicher previewbar ist und im Apply-Modus kontrolliert mutiert. Das soll die Grundlage für ACS/Leitstand Ops-Integration sein.

Scope (in diesem PR):
	1.	Neues Subcommand wgx audit git (lazy-load lib/audit_git.bash)
	2.	Neuer Command wgx routine <id> [preview|apply|dry-run] (Dispatcher)
	3.	Neue Routine git.repair.remote-head (preview erzeugt JSON, apply führt allowlisted git-Kommandos aus)
	4.	CLI-Doku + Guards-Hilfeformatierung (line breaks)
	5.	BATS Tests für audit git & routine dispatcher

Änderungen (konkret):
	•	cmd/audit.bash: git) Subcommand, lädt lib/audit_git.bash, Usage erweitert.
	•	cmd/routine.bash: neuer Dispatcher inkl. Mode-Normalisierung preview→dry-run, unknown routine Fehler, help returns 0.
	•	lib/audit_git.bash: JSON-Audit-Artefakt audit.git.v1.<correlation_id>.json in .wgx/out/, optional --stdout-json, optional --fetch, checks + suggested routines, Uncertainty-Feld.
	•	lib/routines_git.bash: Routine wgx_routine_git_repair_remote_head(dry-run|apply); preview schreibt .wgx/out/routine.preview*.json + fallback routine.preview.json; apply schreibt routine.result*.json + fallback routine.result.json; allowlist nur git remote set-head origin --auto und git fetch origin --prune.
	•	docs/cli.md: neue Sektion routine + erweitertes audit help.
	•	tests/audit_git.bats, tests/routine_cmd.bats: neue Tests.
	•	modules/guard.bash: help formatting line breaks.
	•	.gitignore: server.log (falls im wgx Repo relevant; ansonsten weglassen oder begründen).

Wichtige Semantik / Policy:
	•	wgx audit git soll Exit 0 liefern auch bei status:"error" im JSON; non-zero nur bei Ausführungsfehlern (fehlende deps etc.).
	•	suggested_routines enthält mind. git.repair.remote-head wenn origin/HEAD fehlt/dangling.
	•	Typen: booleans/numbers müssen echte JSON-Types sein (keine Strings).
	•	--stdout-json darf nur JSON ausgeben (oder zumindest JSON extrahierbar; wenn noisy, dann besser noiseless halten).

Test Plan:
	•	bats tests/audit_git.bats und bats tests/routine_cmd.bats laufen grün.
	•	Lokal: in einem Git-Repo mit kaputtem origin/HEAD testen: wgx audit git --fetch, dann wgx routine git.repair.remote-head preview, dann apply.

Risiko / Rollout:
	•	Routine ist mutierend → daher klarer Preview/Apply Split + allowlist + JSON-Artefakte.
	•	Rollout: erst nur Viewer (audit), Routine erst nutzen wenn ACS-Gate aktiv.

Review-Fokus:
	•	Shell-Safety (allowlist, quoting, set -e Risiken), JSON-Types, Exit-Code-Policy, Dateinamen-Konvention, Tests.

⸻

2) Repo: agent-control-surface (acs) — PR Prompt

PR Title:
ACS: Ops Git Health API (audit endpoints + routine preview/apply with safety gates) + UI Panel

Prompt:
Bitte erstelle einen PR im Repo agent-control-surface (ACS) mit folgendem Ziel:

Motivation / Problem:
Leitstand soll Git-Health-Daten sehen können, ohne selbst Git auszuführen. ACS orchestriert wgx audit git und stellt Ergebnisse bereit. Mutierende Aktionen (Routinen) müssen strikt gegated, tokenisiert und nachvollziehbar sein.

Scope:
	1.	CORS optional via ACS_CORS_ALLOW_ORIGINS
	2.	Neue Ops-Endpunkte:
	•	POST /api/audit/git?repo=... (Job)
	•	GET /api/audit/git/sync?repo=... (viewer-friendly, stdout-json bevorzugt, fallback file-mode)
	•	GET /api/audit/git/latest?repo=... (letztes Artefakt)
	•	POST /api/routine/preview (nur wenn enabled + optional shared secret)
	•	POST /api/routine/apply (confirm_token + preview_hash, ok=false → 409)
	3.	panel/ops.py: Runner-Wrappers, robustes JSON-Extrahieren, in-memory Confirm-Token Store
	4.	panel/templates/index.html: Ops UI (Audit anzeigen, JSON togglen, Routine preview/apply)
	5.	Tests: tests/test_ops.py + kleiner Fix in tests/test_git_health.py

Änderungen (konkret):
	•	panel/app.py:
	•	Middleware: CORSMiddleware nur wenn Origins gesetzt; wildcard regelt credentials korrekt.
	•	ActionResult erweitert um audit: dict | None.
	•	Models RoutinePreviewReq, RoutineApplyReq mit Pattern.
	•	Endpunkte für Audit & Routinen + check_routines_enabled() Gate:
	•	ACS_ENABLE_ROUTINES default false
	•	optional ACS_ROUTINES_SHARED_SECRET → Header X-ACS-Actor-Token
	•	Background job run_audit_job: Ergebnis hängt audit_result.model_dump() an ActionResult.audit, Job endet „done“ auch wenn Audit status=error (weil Ausführung ok).
	•	panel/ops.py:
	•	run_wgx_audit_git(...) unterstützt stdout-json + file-mode fallback; extract_json_from_stdout (balanced scanner) + extract_path_from_stdout.
	•	get_latest_audit_artifact(...) filtert optional nach repo_key.
	•	Tokenstore: TTL, consume-on-use, mismatch löscht Token (anti brute-force).
	•	run_wgx_routine_preview/apply inkl. preview_hash (sha256 canonical json).
	•	panel/templates/index.html: UI block „Ops / Git Health“, Polling an Jobs, Routine Preview Container, Re-Audit nach Apply.
	•	tests/test_git_health.py: patch erweitert um get_git_state mock.
	•	tests/test_ops.py: umfangreiche Unit+API Tests (runner mocked).

Semantik / API-Contract (wichtig):
	•	/api/audit/git/sync: bevorzugt stdout-json; wenn das bricht, fallback file-mode; Fehler logs via log_action.
	•	Routinen:
	•	preview erzeugt confirm_token + preview_hash
	•	apply braucht beides; token one-shot + TTL; mismatch/expired → 403
	•	routine ok=false → 409 (Conflict)
	•	Hinweis Multi-Worker: Confirm-Tokens sind in-memory → im README dokumentieren (ist bereits drin).

Test Plan:
	•	pytest -q muss grün sein, speziell tests/test_ops.py und API-Fälle:
	•	routines disabled default 403
	•	secret header required
	•	sync fallback (stdout fails → file ok)
	•	apply 409 on ok=false
	•	invalid routine id 422

Risiko / Rollout:
	•	Security: Routinen disabled by default; shared secret optional; CORS nur wenn gesetzt.
	•	Operational: stdout-json parsing vs noisy logs; robust scanner vorhanden.
	•	Rollout in Stufen: erst nur Audit Viewer, dann optional Routinen in trusted network.

Review-Fokus:
	•	Gate-Logik (403/409), Tokenstore correctness, JSON extraction correctness, CORS correctness, Job-Result Semantik.

⸻

3) Repo: leitstand — PR Prompt

PR Title:
Leitstand: Ops Viewer (/ops) für ACS Git Health (read-only default, optional job fallback) + Config & Types

Prompt:
Bitte erstelle einen PR im Repo leitstand mit dem Ziel:

Motivation / Problem:
Leitstand soll Git-Health-Audits visualisieren können, ohne selbst Git auszuführen. ACS ist Datenquelle. Leitstand bleibt Viewer-first und nutzt sichere Defaults; optional kann er einen Audit-Job triggern, falls Sync-Endpunkt fehlt.

Scope:
	1.	/ops Route + View ops.ejs
	2.	Konfiguration via Env (zod Schema, safe defaults)
	3.	Types AuditGitV1, RoutinePreviewV1, RoutineResultV1 (für UI/Parsing)
	4.	README: Ops Viewer Setup + Security/Mixed Content/CORS Hinweise
	5.	Navigation: Link zu /ops in bestehenden Views

Änderungen (konkret):
	•	src/config.ts:
	•	LEITSTAND_ACS_URL validiert http/https oder leer; default leer (disabled).
	•	LEITSTAND_OPS_ALLOW_JOB_FALLBACK, LEITSTAND_REPOS, LEITSTAND_ACS_VIEWER_TOKEN.
	•	isTruthy() helper.
	•	envConfig.acsUrl (trim trailing slashes), allowJobFallback, repos default ['metarepo','wgx','leitstand'] oder env override.
	•	src/server.ts: GET /ops render ops.ejs mit config.
	•	src/views/index.ejs, src/views/observatory.ejs: Nav-Link /ops.
	•	src/views/ops.ejs:
	•	UI: Repo selector, Refresh button; read-only Titel wenn fallback aus; Not-configured state wenn acsUrl==''.
	•	Token optional: sendet X-ACS-Viewer-Token (nur senden, Enforcement ist ACS/Proxy-Sache).
	•	Wenn fallback erlaubt: darf POST /api/audit/git auslösen (mit Disclaimer).
	•	src/types/ops.ts: neue Interfaces.
	•	README.md: neue Sektion „Ops Viewer Setup“, Security Notes, Data Flow & Contracts Einordnung (Viewer vs Actor klar).

Semantik / UX:
	•	Default: rein read-only (kein job trigger), sauberer Not-configured Screen.
	•	Mixed Content: dokumentieren (HTTPS Leitstand → HTTP ACS blockiert Browser).
	•	CORS: ACS muss Leitstand Origin erlauben.

Test Plan (minimal):
	•	pnpm typecheck, pnpm lint, pnpm test (falls vorhanden).
	•	Manual: LEITSTAND_ACS_URL=http://... setzen → /ops zeigt Daten oder klare Fehlermeldung.

Risiko / Rollout:
	•	Keine Mutation in default mode.
	•	Fallback mode ist bewusst riskanter → UI-Disclaimer + env-gate.

Review-Fokus:
	•	Env validation, sichere Defaults, Token nur senden (nicht lokal enforce), klare Viewer/Actor-Trennung.

⸻

Fehlerprävention (typische Stolperfallen, die du sonst später wiederfindest)
	1.	Exit-Code-Policy vs Monitoring:
Wenn wgx audit git bei status:"error" Exit 0 liefert, brauchst du im Konsumenten (ACS/Leitstand/CI) eine klare Regel: nicht Exit-Code, sondern JSON status entscheidet. Sonst wird „alles grün“ zur Lüge.
	2.	stdout-json vs noisy logs:
Du hast robustes Extrahieren gebaut — gut. Aber ideal ist: --stdout-json wirklich nur JSON, sonst wird jedes neue [INFO] zur Parserlotterie.
	3.	In-memory Tokens bei Multi-Worker:
Du hast es dokumentiert. Wenn du später skalierst: Confirm-Tokens müssen in shared store (Redis o. ä.) oder du erzwingst Single-Worker für Actor-Endpunkte.
	4.	CORS wildcard + credentials:
Du hast den Browser-Fall sauber berücksichtigt. Trotzdem: * in Origins ist der Klassiker, der später „warum geht’s nicht“ triggert.

⸻

Risikoabschätzung (technisch/organisatorisch)
	•	Technisches Risiko: mittel (neue Endpunkte + Tokenflow + Shell-Routine).
	•	Security-Risiko: mittel bis hoch, wenn Routinen aktiviert werden und ACS offen steht. Gates sind da; die Gefahr ist Fehlkonfiguration.
	•	Organisatorisches Risiko: niedrig (gute Rollout-Stufen: erst Audit, dann Routine).

⸻

Ungewissheitsursachenanalyse (verpflichtend)

Unsicherheitsgrad: 0.18
Interpolationsgrad: 0.10

Hauptursachen:
	•	Ich sehe nur den Diff, nicht den gesamten Repo-Kontext (z. B. vorhandene CLI-Dispatch-Mechanik in wgx, Leitstand-Frontend-Logik im Rest von ops.ejs).
	•	Naming/Repo-Zuordnung: einzelne Dateien (z. B. .gitignore server.log) könnten in einem anderen Repo sinnvoller sein als hier.
	•	CI-Realität: Tests sind da, aber ich kann nicht verifizieren, welche Runner/Images jq/git in CI wirklich bereitstellen.

Meta-Markierung: teils vermeidbar (durch Repo-Snapshot/CI-Log), teils systemisch (Diff-only Perspektive).

⸻

Bonus (tiefgründig ironische Auslassung)

Du baust ein System, das Git repariert, wenn origin/HEAD fehlt — also eine Maschine, die anderen Maschinen sagt, wo „oben“ ist. Das ist im Grunde DevOps als Metaphysik: Erst wenn der Kopf festgeschraubt ist, darf der Körper wieder glauben, er habe Richtung.

Wenn du willst, kann ich als nächstes aus diesen Prompts auch direkt PR-Bodies (Beschreibung + Checklist + Testplan) pro Repo generieren — aber die obigen Prompts sind schon „copy/paste → PR erstellen“.