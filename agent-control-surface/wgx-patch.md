Dialektische Erörterung (∴oszillation / ∴resonanz / ∴paradox)

These (das Diff ist schon “fast fertig”):
Dein aktueller Stand macht die Kernbewegung richtig: wgx audit git ist read-only by default, erzeugt JSON-Artefakte (oder stdout-json), und wgx routine normalisiert „preview → dry-run“ und trennt sauber in Preview vs Apply. Dazu BATS-Tests: gut. ∴resonanz: passt zu „Durchsetzung vor Vertrauen“ und zur späteren ACS-Orchestrierung.

Antithese (ein paar Sollbruchstellen sind noch drin):
Beim genauen Lesen fallen drei strukturelle “Klassiker” auf, die später nerven:
	1.	Audit behauptet “Repo detected.” ohne Repo-Check
git rev-parse wird zwar benutzt, aber es gibt keinen harten --is-inside-work-tree-Guard. In einem Nicht-Git-Verzeichnis würdest du trotzdem ein “Repo detected” check loggen → semantisch falsch.
	2.	Fehlende Dependency-Checks im Audit
audit_git.bash benutzt jq, prüft aber nicht, ob jq (oder git) verfügbar ist. Damit kann “execution failure” als kaputtes/halb-geliefertes Artefakt enden. Deine Policy sagt aber: non-zero Exit nur bei execution failures. Also: Dependencies müssen explizit geprüft werden.
	3.	Tests: “missing jq returns non-zero” ist aktuell ein Skip
Das ist verständlich (PATH-Isolation ist fies), aber: du willst die Policy gerade erzwingen, nicht “hoffen”.

Synthese (Minimal-PR zur Vollendung):
Der ideale WGX-PR ist jetzt kein “noch mehr Features”, sondern Semantik-Härtung:
	•	exakter Repo-Check,
	•	Dependencies als first-class failures,
	•	sauber testbar (ohne PATH-Akrobatik) über WGX_JQ_BIN=/nonexistent und WGX_GIT_BIN=/nonexistent,
	•	stdout-json garantiert “nur JSON”, file-mode garantiert “nur Pfad”.

Nebenbei: Dein Satz „Exit 0 even if audit findings are error“ ist richtig – aber er ist auch der perfekte Dünger für falsche CI-Interpretation. Menschen lesen Exit-Codes wie Horoskope: einmal “0”, immer “alles gut”.

⸻

Verdichtete Essenz

Dein Diff ist funktional. Der neue PR-Prompt sollte jetzt Härtung + Policy-Durchsetzung + testbare Dependency-Failures priorisieren, nicht neue Features.

⸻

Neuer WGX-PR-Erstellungsprompt (auf Basis deines Diffs, “ideale Variante”)

PR Title:
WGX: Git-Audit & Routinen — Semantik-Härtung, Dependency-Failures, Repo-Guard, testbare Policy

Prompt:
Bitte erstelle einen PR im Repo wgx, der den bereits implementierten Stand (wgx audit git, wgx routine, git.repair.remote-head, Doku, BATS) finalisiert und härtet. Der PR soll auf dem vorhandenen Diff aufbauen (cmd/audit.bash, cmd/routine.bash, docs/cli.md, lib/audit_git.bash, lib/routines_git.bash, tests/*, modules/guard.bash).

Motivation / Problem

Der aktuelle Stand ist funktional, aber es fehlen noch systemische Sicherungen:
	•	audit git loggt “Repo detected” ohne harten Git-Repo-Check.
	•	audit git prüft Dependencies (jq, git) nicht explizit → Policy “non-zero nur bei execution failure” ist nicht zuverlässig durchsetzbar.
	•	Der “missing jq” Test ist aktuell geskippt; wir brauchen einen stabilen, portablen Testpfad.

Zielbild / Scope
	1.	Harte Repo-Erkennung in wgx_audit_git
	•	Vor Fact-Gathering: git rev-parse --is-inside-work-tree prüfen.
	•	Wenn nicht im Git-Repo:
	•	trotzdem JSON-Artefakt erzeugen (Policy: findings können “error” sein),
	•	status:"error", Check git.repo.present muss error sein, Message klar,
	•	suggested_routines leer oder mit “noop” (keine mutierende Routine vorschlagen, wenn kein Repo).
	2.	Explizite Dependency-Checks in wgx_audit_git
	•	Prüfe git und jq früh:
	•	command -v "$git_bin" und command -v "$jq_bin" (analog zur Routine).
	•	Wenn Dependency fehlt: execution failure → non-zero Exit (1), klarer stderr-Text, und optional ein minimaler JSON-Fehlerartefakt (wenn du willst), aber nicht halbkaputt.
	•	Nutze WGX_GIT_BIN zusätzlich zu WGX_JQ_BIN (Symmetrie mit Routine).
	3.	stdout-json / file-mode strikt
	•	--stdout-json: nur JSON nach stdout, keine Neben-Ausgaben.
	•	ohne --stdout-json: nur Artefaktpfad nach stdout (wie jetzt), keine zusätzliche Noise.
	•	Fehlertexte nach stderr.
	4.	JSON-Typen & Felder stabilisieren
	•	Sicherstellen: booleans/numbers sind wirklich JSON-Types (deine Tests prüfen das schon; behalte/erweitere).
	•	facts.upstream.exists_locally ist derzeit immer true sobald upstream string da ist – wenn upstream ref nicht existiert, darf es nicht “true” sein. Entweder:
	•	upstream exists check korrekt machen, oder
	•	Feld entfernen/neutralisieren (null) bis korrekt.
	•	repo auto-detect verbessern (optional, klein):
	•	default: basename von git rev-parse --show-toplevel oder pwd als fallback, statt "unknown".
	5.	Tests ent-skippen ohne PATH-Hacks
	•	Ersetze den geskippten Test “missing jq returns non-zero” durch einen stabilen Ansatz:
	•	setze WGX_JQ_BIN=/nonexistent-jq vor wgx audit git --stdout-json
	•	erwarte non-zero Exit und stderr enthält klaren Hinweis.
	•	Zusätzlich ein Test für “not in git repo”:
	•	temp dir ohne git init, wgx audit git --stdout-json → exit 0, JSON status error, Check git.repo.present error, aber keine execution-failure.
	6.	Routine: kleine Robustheit
	•	Routine nutzt sha256sum: dokumentiere Linux-Annahme oder fallback auf shasum -a 256, falls vorhanden.
	•	(Optional) cp fallback kann scheitern: wenn cp failt, trotzdem main result liefern; fallback-file best-effort.

Datei- und Code-Hinweise (konkret)
	•	lib/audit_git.bash:
	•	füge git_bin="${WGX_GIT_BIN:-git}" hinzu.
	•	repo-present Check vor “Repo detected.”
	•	Dependencies prüfen (git/jq).
	•	unknown args: aktuell break; besser: shift + sammeln/ignorieren, damit Flags nicht “hängen bleiben” und später stillschweigend ignoriert werden (oder bewusst return 2 mit usage).
	•	tests/audit_git.bats:
	•	ersetze Skip durch WGX_JQ_BIN Override Test.
	•	ergänze “not in git repo → exit 0 + status error”.
	•	docs/cli.md / cmd/audit.bash:
	•	Usage ggf. ergänzen: “Wenn nicht in Git-Repo: status=error (Exit 0)”.

Policy (muss im PR eingehalten werden)
	•	wgx audit git:
	•	Exit 0 auch bei status:"error" (findings),
	•	Exit != 0 nur bei echten execution failures (fehlende deps, kaputte jq invocation etc.).
	•	wgx routine:
	•	preview/dry-run darf außerhalb Git-Repo laufen, apply nicht.

Test Plan
	•	bats tests/audit_git.bats und bats tests/routine_cmd.bats grün.
	•	Manuell:
	•	in Nicht-Git-Verzeichnis: wgx audit git --stdout-json → status error, exit 0.
	•	mit kaputtem origin/HEAD: wgx audit git --fetch --stdout-json → suggested_routines enthält git.repair.remote-head.
	•	Routine: wgx routine git.repair.remote-head preview → preview json, apply im Repo → result json, ok true/false.

Review-Fokus
	•	Semantik: Repo-Check, dependency-failure vs finding-error strikt getrennt.
	•	stdout/file-mode: keine “random logs” auf stdout.
	•	Tests: keine Umgebungs-Abhängigkeiten, keine Skips.

⸻

Fehlerprävention (damit du’s nicht in 2 Wochen wieder anfassen musst)
	•	“Repo detected” darf nie ohne --is-inside-work-tree kommen. Sonst ist dein Audit ein Orakel, kein Messgerät.
	•	Dependency-Failure muss non-zero sein, sonst wird später “jq fehlt” als “status error aber exit 0” kaschiert und niemand merkt’s, bis ACS/Leitstand komisch werden.
	•	Tests über WGX_*_BIN statt PATH-Tricks: stabil, portabel, reproduzierbar.

⸻

Ungewissheitsursachenanalyse (verpflichtend)

Unsicherheitsgrad: 0.16
Interpolationsgrad: 0.08

Ursachen:
	•	Ich sehe nur den Diff-Ausschnitt, nicht die vollständige WGX-Command-Registry (wie cmd/ geladen wird) und nicht die CI-Umgebung.
	•	Ich nehme an, dass WGX_JQ_BIN/WGX_GIT_BIN als Test-Hebel akzeptiert sind (du nutzt WGX_JQ_BIN bereits).
	•	Ob sha256sum überall verfügbar ist, ist OS-abhängig; ich vermute Linux-first (Heimserver), aber das ist trotzdem eine Annahme.

Meta: überwiegend vermeidbar durch Repo-Snapshot/CI-Logs; aktuell aber sauber als Härtungs-PR formulierbar.

⸻

Wenn du mir als nächstes den Rest des WGX-Diffs gibst (wie wgx/cli die Commands registrieren), kann ich den Prompt noch eine Stufe “kanonischer” machen (inkl. “routine” in Commands-Listing, Completion, wgx help Konsistenz).