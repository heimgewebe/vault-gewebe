Dialektische Erörterung (∴oszillation / ∴resonanz / ∴paradox)

These: Du willst pro Repo einen Korrekturprompt, der so präzise ist, dass Jules/Copilot daraus direkt einen sauberen Fix-PR baut (mit Pfaden, Acceptance Criteria, Tests). Das ist der richtige Hebel: du verlagerst “Diskussion” in “prüfbaren Output”. ∴resonanz

Antithese: Zu präzise Prompts können “falsche Sicherheit” erzeugen, wenn die Diff-Hunks unvollständig sind (z.B. import os existiert doch schon). Daher: Null-Interpolation bei potenziellen Syntax-/Importfehlern: “prüfe zuerst, dann ändere”. ∴oszillation

Synthese: Promptstruktur: Diagnose-Schritt → Fix-Schritt → Test-Schritt → No-regression-Schritt. Damit bleibt es deterministisch und robust.

⸻

Korrekturprompt pro Repo (3 Stück)

1) Repo: heimgewebe/wgx — Robustness: jq-Typen + Routine ok-Field

Prompt (für Jules/Copilot PR):

Ziel: Robustheit der JSON-Emission in wgx audit git und wgx routine erhöhen (jq Typen konsistent), ohne Verhalten zu ändern.

Änderungen:
	1.	lib/routines_git.bash

	•	Stelle sicher, dass das Feld ok im JSON ein echtes Boolean ist (nicht über Stringvergleich).
	•	Nutze jq -n --argjson ok "$ok" und setze im Filter ok:$ok. Entferne ok:($ok=="true").
	•	Stelle sicher, dass der Bash-Boolean ok exakt true|false bleibt.

	2.	lib/audit_git.bash

	•	Harden numeric fields: staged, unstaged, untracked, ahead, behind müssen im JSON echte Numbers sein – selbst wenn wc/Parsing unerwartete Leerzeichen liefert.
	•	Implementiere numeric sanitize vor jq (Regex: ^[0-9]+$), sonst fallback auf 0.
	•	Alternativ akzeptiert: Übergabe via --arg und im jq Filter | tonumber (aber dann bitte überall konsistent).

	3.	Tests

	•	tests/audit_git.bats: ergänze mindestens einen Test, der jq -e '(.facts.working_tree.staged|type)=="number"' auf stdout-json prüft.
	•	Ergänze einen Test für routine preview/result: jq -e '(.ok|type)=="boolean"' auf result JSON.

Acceptance Criteria:
	•	wgx audit git --stdout-json liefert JSON, in dem uncertainty.level number ist, facts.working_tree.* numbers sind.
	•	wgx routine git.repair.remote-head apply erzeugt result JSON mit ok boolean.
	•	Alle bestehenden BATS-Tests grün.
	•	Keine Änderung an dokumentierter Policy (Exit 0 trotz status=error bleibt).

Bitte committe nur die minimal nötigen Änderungen.

Typische Fehler vermeiden: Nicht anfangen, das Schema umzubenennen; keine neuen Felder ohne Not; kein “set -e” reinpatchen, das Verhalten ändert.

⸻

2) Repo: heimgewebe/agent-control-surface — Fix: Syntax/Indentation + Import + minimaler Safety-Polish

Prompt (für Jules/Copilot PR):

Ziel: ACS Ops-Integration stabilisieren: Syntaxfehler vermeiden, Imports sicherstellen, und Tests so erweitern, dass die WGX-Ops Wrapper robust bleiben.

Änderungen:
	1.	panel/ops.py

	•	Führe einen Syntax-/Lint-Check durch (ruff/flake8 oder python -m py_compile).
	•	Fixe die Einrückung im Block um elif json_path and Path(output).exists(): (aktuell wirkt es wie ein SyntaxError in der Datei).
	•	Stelle sicher, dass der Codepfad “stdout_json=True” immer JSON parst und bei res.code!=0 trotzdem JSON verarbeitet, wenn vorhanden (bestehende Logik beibehalten, nur stabilisieren).

	2.	panel/app.py

	•	Stelle sicher, dass import os vorhanden ist, weil os.getenv("ACS_CORS_ALLOW_ORIGINS", "*") verwendet wird. Wenn Import bereits existiert: nichts ändern.
	•	Belasse CORS-Logik: bei * keine Credentials.

	3.	Tests

	•	tests/test_ops.py: ergänze einen Test, der den “File artifact mode” simuliert: run() gibt .wgx/out/audit.git.v1.X.json zurück und die Datei wird gelesen und validiert.
	•	Ergänze einen Testfall, der “stdout contains leading noise” prüft (dein JSON-scan fallback {...}) – minimal.

Acceptance Criteria:
	•	python -m py_compile panel/app.py panel/ops.py läuft ohne Fehler.
	•	pytest grün.
	•	/api/audit/git/sync liefert ein validiertes AuditGit Objekt oder HTTP 500 mit klarer Meldung.
	•	Keine funktionalen Änderungen am Job-Queue Verhalten (nur Stabilität/Parsing).

Halte die PR klein: nur die betroffenen Stellen, keine Refactors.

Typische Fehler vermeiden: Keine Token-Store-Persistenz einführen; keine neuen Abhängigkeiten; nicht CORS “verschärfen” ohne Doku.

⸻

3) Repo: heimgewebe/leitstand — Ops-Viewer: Doku + kleine UX-Härtung bei Fetch-Fehlern

Prompt (für Jules/Copilot PR):

Ziel: Ops-Viewer robust und selbsterklärend machen, ohne Leitstand in eine Steuerzentrale zu verwandeln.

Änderungen:
	1.	Docs

	•	Ergänze in README oder docs/ eine kurze Sektion “Ops Viewer Setup”:
	•	LEITSTAND_ACS_URL Beispiele (http/https)
	•	Hinweis Mixed Content: Leitstand https + ACS http blockiert im Browser
	•	Hinweis CORS: ACS muss ACS_CORS_ALLOW_ORIGINS auf Leitstand-Origin setzen (nicht *, wenn Credentials benötigt werden)
	•	Optional: LEITSTAND_OPS_ALLOW_JOB_FALLBACK=true Bedeutung (Viewer-only vs Fallback).

	2.	src/views/ops.ejs

	•	Wenn fetch fehlschlägt: erweitere Fehlermeldung um “Expected ACS origin allowlist” und gib einen Copy-Paste Vorschlag:
	•	ACS_CORS_ALLOW_ORIGINS=https://<leitstand-host>
	•	Keine funktionale Änderung am Job-Fallback (nur Messaging/diagnostics).

	3.	Tests

	•	Ergänze in tests/ops_integration.test.ts einen Test, dass bei konfiguriertem ACS_URL die Seite den Hinweistext zur Viewer-Mode/Fallback korrekt rendert (du hast schon Flag-Tests; nur minimal erweitern).

Acceptance Criteria:
	•	pnpm test / vitest grün.
	•	Ops-Seite bleibt Viewer: keine Routine-Apply Buttons.
	•	Doku erklärt Setup in <30 Zeilen, inkl. Mixed Content und CORS.

Typische Fehler vermeiden: Kein Server-side Proxy bauen in dieser PR; keine neuen env vars nötig.

⸻

Risikoabschätzung (vor Empfehlung)
	•	Technisches Risiko: niedrig–mittel. Änderungen sind klein, aber ACS kann durch Syntax/Indentation sofort hart brechen → deshalb ACS-Prompt zuerst.
	•	Organisatorisches Risiko: niedrig.
	•	Sicherheits-/Betriebsrisiko: mittel, wenn Routinen mutierend sind; aber du hast Token-Confirm in ACS, und Leitstand bleibt Viewer.

Empfehlung (ohne Warten auf CI):
Mach die Robustness-Fixes jetzt. Das sind keine “nice-to-haves”, sondern Kanten, die CI zufällig passieren lassen könnte, aber später real brechen (jeder kennt diesen Klassiker: “Green CI, roter Sonntag”).

⸻

Verdichtete Essenz

Hier sind die drei PR-Prompts. Reihenfolge: ACS (Syntax/Import) → WGX (jq Typen) → Leitstand (Doku/UX).

⸻

Ungewissheitsursachenanalyse (∴)

Unsicherheitsgrad: 0.19
Ursachen:
	•	Ich sehe nur Diffs, nicht die vollständigen Dateien (Import os könnte bereits existieren; Indent könnte im echten File korrekt sein).
	•	Tooling (ruff/flake8 config) unbekannt; Testsuite kann strengere Regeln haben.
	•	Laufzeitumgebung (CI Shell/OS) kann wc, mktemp, sha256sum Verhalten minimal variieren.

Wie du Ungewissheit eliminierst:
	•	ACS: python -m py_compile ...
	•	WGX: BATS + shellcheck + jq type asserts
	•	Leitstand: vitest + manual ops view smoke

Wenn du willst, kann ich dir als nächstes noch je Prompt eine PR-Description (Titel, Motivation, Testplan, Risiko) dazugeben – wieder pro Repo, copy-paste-fertig.

@jules: in diesem repo nur die anweisungen für dieses repo ausführen! 