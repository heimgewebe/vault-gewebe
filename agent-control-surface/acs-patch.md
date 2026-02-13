Dialektische Erörterung (∴oszillation / ∴resonanz / ∴paradox)

These (Kohärenz + reale Betriebsfähigkeit):
Das neue ACS-Diff zieht die Architektur sauber nach: ACS wird zum Actor-Gate für mutierende Routinen und gleichzeitig zum Viewer-Proxy für Audit-Artefakte. CORS ist opt-in, Routinen sind opt-in, Shared-Secret ist opt-in. Das ist genau die Art „Durchsetzung vor Vertrauen“, die nicht nur moralisch, sondern operativ trägt: default closed, explizit öffnen.

Antithese (Semantik-Drift & Green-Illusionen):
Du hast zwei Stellen, an denen „alles grün“ schiefgehen kann:
	1.	Audit-Job Semantik: run_audit_job setzt ok=audit_result.status != "error", obwohl der Kommentar sagt „Job finished successfully even if audit found issues“. Das ist ein klassischer Bedeutungs-Knoten: Job ok vs Audit ok. Wenn Konsumenten (UI, API-Clients, spätere Automationen) ActionResult.ok als „Audit gesund“ lesen, wird’s lügengrün.
	2.	WGX Exit-Policy vs ACS Parser-Policy: Du fängst es ab (stdout-json → fallback file mode), aber: sobald wgx audit git/wgx routine irgendwann „freundliche Logs“ ausspucken, werden Parser und Tests zur Lotterie. Du hast zwar einen balanced JSON-Scanner, aber das ist ein defensiver Schild – kein Contract.

Synthese (produktive Spannung → PR-Schnitt & Contract-Schärfung):
Für diesen ACS-PR ist das Ziel klar: Viewer-Endpoints stabil, Actor-Endpoints hart gegated, Semantik explizit getrennt. Konkret:
	•	ActionResult.ok sollte Execution-Ok heißen/sein (wgx lief), und der Audit-Status bleibt im audit.status. Alternativ: ok bleibt wie jetzt, aber dann muss UI/README/Tests strikt sagen: „ok=false kann inhaltliche Findings bedeuten, nicht Ausführungsfehler.“
	•	Routines: Preview/Apply mit token+hash ist gut; bei Multi-Worker steht die in-memory Grenze schon im README. Das ist ehrlich – und selten.

(Ironische Auslassung, pflichtschuldig und passend): Du hast jetzt CORS, Tokens, Hashes und Routinen, um „origin/HEAD“ zu reparieren – also einen Sicherheitsapparat, damit Git wieder weiß, wo oben ist. DevOps ist Theologie mit besseren Fehlermeldungen.

⸻

PR-Erstellungsprompt (nur ACS)

PR Title:
ACS: Ops Git Health (audit endpoints + routine preview/apply gates) + Panel UI + CORS opt-in + Tests + README

Create-PR Prompt (für Jules/Copilot):
Bitte erstelle einen PR im Repo agent-control-surface mit folgendem Zielbild und exakt dem Scope aus dem bereitgestellten Diff.

Motivation / Problem

Wir wollen Git-Health als artefaktische Beobachtung (Audit) und optional gegatede Reparatur (Routines) über ACS anbieten, ohne dass Leitstand/Browser selbst Git ausführen muss. ACS ist Actor-Gate (mutierend) und Viewer-Proxy (read-only).

Scope (nur in diesem PR)
	1.	CORS opt-in per Env ACS_CORS_ALLOW_ORIGINS
	2.	Ops Audit API
	•	POST /api/audit/git?repo=... → Background Job startet wgx audit git
	•	GET /api/audit/git/sync?repo=... → sync viewer endpoint, stdout-json bevorzugt, fallback file-mode
	•	GET /api/audit/git/latest?repo=... → letztes Audit-Artefakt (filter nach repo_key)
	3.	Ops Routines API (Actor-Gate)
	•	Env-Gate: ACS_ENABLE_ROUTINES default false
	•	Optional Shared Secret: ACS_ROUTINES_SHARED_SECRET → Header X-ACS-Actor-Token erforderlich
	•	POST /api/routine/preview → liefert {preview, confirm_token, preview_hash}
	•	POST /api/routine/apply → benötigt confirm_token + preview_hash, ok=false → HTTP 409
	4.	Panel UI: “Ops / Git Health (Audit)” inkl. Polling, JSON-Viewer, Routine Preview/Apply UI
	5.	Tests: neue tests/test_ops.py, plus kleiner Fix in tests/test_git_health.py
	6.	README + .gitignore: Ops-Sektion dokumentieren, server.log ignorieren

Änderungen (konkret, wie im Diff)
	•	.gitignore: server.log hinzufügen.
	•	README.md: neue Sektion „Ops / Git Health (Audit & Routinen)“ mit:
	•	ACS_CORS_ALLOW_ORIGINS (comma-separated), default leer
	•	ACS_ENABLE_ROUTINES default false + Security Hinweis
	•	ACS_ROUTINES_SHARED_SECRET + Header X-ACS-Actor-Token
	•	Hinweis: Confirm-Tokens sind in-memory (Multi-Worker Einschränkung)
	•	Endpunkte auflisten
	•	panel/app.py:
	•	CORSMiddleware nur wenn Origins gesetzt; wenn "*" gesetzt → allow_credentials=False und allow_origins=["*"]
	•	ActionResult erweitert: audit: dict | None
	•	Models: RoutinePreviewReq, RoutineApplyReq mit id Pattern ^[a-zA-Z0-9._-]+$
	•	Endpoints:
	•	/api/audit/git (Job submit)
	•	/api/audit/git/sync (stdout-json first, fallback file mode; log_action bei Fail)
	•	/api/audit/git/latest
	•	/api/routine/preview, /api/routine/apply + check_routines_enabled() Gate
	•	Job: run_audit_job schreibt Ergebnis in ActionResult.audit und setzt Job Status done auch wenn audit status=error
	•	panel/ops.py neu:
	•	In-Memory Tokenstore mit TTL=600s, consume-on-use, mismatch löscht Token
	•	Pydantic Models: AuditGit, AuditFacts, AuditCheck, SuggestedRoutine, Uncertainty
	•	Robust JSON extraction: extract_json_from_stdout balanced scanner
	•	run_wgx_audit_git(..., stdout_json=True|False) mit:
	•	stdout-json path: parse JSON embedded/noisy
	•	file-mode path: parse file path from stdout oder fallback .wgx/out/audit.git.v1.json
	•	Validierung via AuditGit.model_validate, correlation_id override
	•	get_latest_audit_artifact(..., repo_key filter)
	•	run_wgx_routine_preview/apply ohne --stdout-json Annahme, mit file fallback .wgx/out/routine.preview.json / .wgx/out/routine.result.json, plus preview_hash (sha256 canonical json)
	•	panel/templates/index.html:
	•	Neues Ops Panel: Audit starten, Polling über /api/jobs/{id}, Audit anzeigen, JSON togglen/copy
	•	Suggested routines UI + Preview Overlay + Apply → anschließend re-audit
	•	tests/test_git_health.py: patch get_git_state im test (damit branch/state assertions nicht crashen)
	•	tests/test_ops.py neu:
	•	Unit tests für audit/routine wrapper, token behavior, JSON extraction (noise, nested braces)
	•	API Tests: sync fallback (stdout fails → file ok), routines gate default 403, shared secret enforcement, apply 409 bei ok=false, 500 bei missing ok, 422 bei invalid id

Semantik / Policy (Review-kritisch)
	•	Routinen disabled by default; Aktivierung nur via Env.
	•	Wenn Shared-Secret gesetzt ist: Actor-Endpoints müssen Header X-ACS-Actor-Token prüfen.
	•	/api/audit/git/sync versucht stdout-json zuerst; bei Parsing/Exit-Fail fallback file-mode; beide Fehler werden via log_action sichtbar.
	•	/api/routine/apply: wenn JSON Ergebnis ok == false → HTTP 409 Conflict; wenn ok fehlt → HTTP 500 + log_action.
	•	Tokenstore: one-shot + TTL; mismatch löscht token (anti brute-force).

Test Plan
	•	pytest -q muss grün sein. Fokus:
	•	tests/test_ops.py komplett
	•	tests/test_git_health.py Fix testet weiterhin korrekt
	•	Manuell:
	•	ACS_CORS_ALLOW_ORIGINS leer → kein CORS
	•	ACS_ENABLE_ROUTINES false → preview/apply 403
	•	ACS_ENABLE_ROUTINES true + ACS_ROUTINES_SHARED_SECRET gesetzt → ohne Header 403, mit Header 200
	•	Panel: Audit starten, Ergebnis rendern, Routine preview/apply nur wenn enabled

Risiko / Rollout
	•	Security-Risiko: mittel bis hoch falls Routinen aktiviert und ACS öffentlich erreichbar. Daher default off + optional secret.
	•	Operatives Risiko: stdout-json Parsing kann bei noisy logs brechen → fallback file mode ist Pflicht.
	•	Rollout: erst Audit-Viewer produktiv; Routinen nur im trusted Netz.

Review-Fokus
	•	CORS correctness (Wildcard + credentials), Gate-Logik 403/409/500, Tokenstore correctness (TTL/consume), Parser robustness, klare Job/Audit-Semantik.

⸻

Fehlerprävention (markiert, damit du’s nicht später wieder debuggen musst)
	1.	ActionResult.ok vs „Job done“:
Dein Kommentar sagt „Job finished successfully … even if audit found issues“, aber du setzt ok=audit_result.status != "error". Das ist semantisch inkonsistent. Entweder Kommentar anpassen oder ok als execution_ok behandeln (und audit.status separat). Sonst wird der nächste Konsument „ok=false“ als technische Fehlfunktion interpretieren.
	2.	CORS "*"-Sonderfall:
Du machst’s richtig (credentials aus), aber achte darauf, dass Frontends mit Cookies dann sowieso nicht gehen. Gut so – aber dokumentier’s ggf. als „wenn du Cookies brauchst, niemals ‘*’“.
	3.	Routinen UI vs Secret:
Das Panel sendet aktuell keinen X-ACS-Actor-Token. Wenn du ACS_ROUTINES_SHARED_SECRET setzt, wird Preview/Apply aus dem Panel immer 403 liefern. Entweder: UI Feld für Token (nur lokal) oder bewusst so lassen und über Reverse-Proxy injecten.
	4.	WGX Filename-Annahme in file-mode:
Du suchst .wgx/out/audit.git.v1.json als fallback. WGX schreibt aber (im wgx-Diff) primär audit.git.v1.<correlation_id>.json. Wenn WGX nicht zusätzlich eine generische Kopie schreibt, ist dein fallback „optimistisch“. (Du hast Pfad-Parsing aus stdout – das ist gut; der default-pfad ist der wackelige Teil.)

⸻

Verdichtete Essenz

ACS wird der sichere Schalterkasten: Audit ist Viewer-fähig (sync + artifacts), Routine ist Actor-fähig (Env-Gate + Secret + confirm token + hash), UI zeigt beides – aber der semantische Teufel sitzt in ok-Bedeutungen und in der Frage, ob WGX wirklich „sauberes JSON“ verspricht.

⸻

Ungewissheitsursachenanalyse (verpflichtend)

Unsicherheitsgrad: 0.22
Interpolationsgrad: 0.12

Hauptursachen:
	•	Ich sehe nur Diffs, nicht den gesamten ACS-Repo-Kontext (z. B. bestehende Semantik von ActionResult.ok, Job-Aggregation, vorhandene Runner-Konventionen).
	•	WGX-Contracts/Filenames sind implizit (generic copy vs correlation-id file). Das beeinflusst ACS-Fallback-Stabilität.
	•	UI/Deployment-Details (Reverse-Proxy Header injection, Multi-Worker Setup) sind nicht im Diff verifizierbar.

Meta-Markierung: teils vermeidbar (Repo-Snapshot, CI-Logs, wgx-Contract check), teils systemisch (Diff-only Perspektive).

⸻

Leitfragen
	1.	War das die kritischste Erörterung, die hier möglich war?
→ Noch kritischer wäre ein expliziter Semantik-Contract: ActionResult.ok = execution_ok, audit.status = finding_status; und dieselbe Trennung für routine apply (execution_rc vs logical ok).
	2.	Wurde alles beleuchtet?
→ Offener Punkt: Actor-Token im Panel (oder Proxy-Injection) und WGX-Artefakt-Namenskonvention als harter Contract, damit ACS nicht „hoffend parst“.