Dialektische Erörterung (∴oszillation / ∴resonanz / ∴paradox)

These:
Das ist insgesamt ein solider Schritt nach vorn: Ops-Viewer in Leitstand ist viewer-first, per Env hart abschaltbar, mit klaren Sicherheitsnotizen, Repo-Selector, robustem Polling, Mixed-Content-Preflight. ∴resonanz zur Heimgewebe-Invariante „Beobachtung ≠ Handlung“.

Antithese:
Du hast (erneut) viel in einem Schwung: README-Umstrukturierung + Config + Server Route + neue View + neue Types + neue Tests + Löschung von Playwright-Skripten. Das ist nicht “falsch”, aber Merge-Risiko steigt, weil jede CI-Ecke (TS, EJS snapshot-ish tests, env caching) mit drin hängt. ∴oszillation.

Synthese (vorankommen):
PR ist im Kern gut genug zum Mergen, aber ich würde eine einzige, kleine Korrekturrunde im selben PR empfehlen: zwei echte Bug-/Drift-Risiken und ein Test-Stabilisator. Kein Feature mehr, nur “Make it stick”.

⸻

Entscheidung: in diesem PR (1 Hardening-Commit), kein neuer PR

Neuer PR lohnt nicht: das hier ist thematisch geschlossen (Ops Viewer). Mit einem Hardening-Commit machst du ihn mergebar und kannst das Thema abhaken.

⸻

Was ist “PR ideal” an deinem Patch?
	•	LEITSTAND_ACS_URL default '' (disabled) + URL-Validation: richtig, sicher.
	•	acsUrl normalisiert trailing slashes: gut, reduziert 301/404-Lärm.
	•	ALLOW_JOB_FALLBACK nur bei 404/405/501: gute “viewer-first” Ethik.
	•	Polling: capped, failure budget, kein blindes Hide des Indicators: gut.
	•	Ops view hat data-testid; Tests greifen stabil daran an.
	•	README: Ops-Viewer Setup ist endlich dort, wo es hingehört; du entfernst redundanten Data-Flow-Block (gut).

⸻

3 zielführende Verbesserungen (wirklich sinnvoll)

1) Konfig-Tests: “reject invalid URL” testet in Wahrheit nicht rejection

In tests/config.test.ts machst du:

vi.stubEnv('LEITSTAND_ACS_URL', 'ftp://...');
resetEnvConfig();
expect(envConfig.acsUrl).toBe('');

Aber: dein parsedEnv() hat einen fallbackEnv, der bei validation failure alles auf Defaults setzt – inkl. ACS_URL=’’. Das heißt: Dieser Test kann auch dann “grün” sein, wenn die Validation gar nicht sauber isoliert ist, sondern einfach “alles fällt auf fallback”. Er testet also nicht “reject only that field”, sondern “global fallback”.

Zielführender: im Test zusätzlich einen anderen Wert setzen (z.B. PORT=4001) und prüfen, ob PORT trotzdem korrekt bleibt oder ob global fallback passiert. Dann weißt du, ob deine Config-Strategie “field-level tolerant” oder “global tolerant” ist. Beides kann ok sein – aber du willst es wissen.

Minimal:
	•	Setze PORT=4001, setze LEITSTAND_ACS_URL=ftp://..., erwarte entweder
	•	(A) PORT bleibt 4001 (field-level tolerant) oder
	•	(B) PORT fällt auf 3000 (global fallback).
Dann dokumentiere das als bewusstes Verhalten.

2) EJS: ACS_URL Anchor /#ops-panel ist vermutlich falsch

In ops.ejs:

<a href="${ACS_URL}/#ops-panel" ...>Open in ACS →</a>

ACS ist FastAPI HTML und hat id="ops-panel" in deiner ACS template, ja – aber der Pfad ist vermutlich / (index) und nicht garantiert, dass /#ops-panel beim reload landet. Zudem kann ACS unter Subpath laufen (Reverse Proxy), dann ist ${ACS_URL}/#... ok, aber nur wenn ACS_URL ohne trailing slash ist (du normalisierst in config; gut).

Fix (minimal):
	•	Link auf ${ACS_URL}/#ops-panel ist ok, aber ergänze fallback im Text: “Open ACS” ohne Hash, oder setze Link auf ${ACS_URL}/ und scroll im Client?
Ich würde minimal: Link auf ${ACS_URL}/ und daneben (#ops-panel) als zweite, optional. Aber: das ist nur UX, nicht kritisch.

Wenn du es abschließen willst: lass es, solange du sicher bist, dass ACS Startseite existiert. (Ich bin mir nicht 100% sicher, weil ich ACS routing nicht hier habe.)

3) Repo-Liste: “SoT fallback” sollte nicht hart in Leitstand liegen

Du kommentierst “Fallback SoT for now” und gibst ['metarepo','wgx','leitstand']. Das ist okay, aber Drift-fähig.
Minimaler Hardening-Schritt: in README klar sagen: “Default repos are a convenience; override via LEITSTAND_REPOS.” (hast du). Code muss nicht geändert werden.

⸻

Korrekturprompt für den Agent (nur wenn du die Hardening-Runde willst)

@agent Bitte mache einen einzigen Hardening-Commit (keine neuen Features) für den Ops Viewer PR.

A) Tests/Config: eindeutige Semantik bei invalid URL
	1.	In tests/config.test.ts ergänze in reject invalid URLs:
	•	vi.stubEnv('PORT','4001')
	•	vi.stubEnv('LEITSTAND_ACS_URL','ftp://...')
	•	resetEnvConfig()
	2.	Prüfe, welches Verhalten das System tatsächlich hat:
	•	Wenn envConfig.PORT dann 3000 ist: global fallback ist aktiv → ok, aber dann soll der Test das explizit assertieren und kommentieren (“invalid field triggers global fallback”).
	•	Wenn envConfig.PORT 4001 bleibt: field-level tolerant → assertiere das und kommentiere entsprechend.
	3.	DoD: Test beschreibt echte Semantik, kein “grün durch Zufall”.

B) Ops EJS: ACS Link robust machen (optional, minimal)
	1.	Ersetze Routine-Link:
	•	von ${ACS_URL}/#ops-panel
	•	auf ${ACS_URL}/ (oder biete zwei Links: “Open ACS” + “Jump to ops panel”).
	2.	DoD: Link funktioniert auch, wenn Hash/Section nicht existiert.

C) Keine weiteren Änderungen
	•	Keine neue Env Vars
	•	Keine weiteren UI-Features
	•	Keine weiteren Tests außer A (+ optional B)

⸻

Soll das in diesem PR oder neuer PR passieren?

Im selben PR als letzter Commit. Danach mergen, fertig.

⸻

Risikoabschätzung
	•	Technisch: niedrig–mittel (Config-Fallback-Semantik, EJS-Link).
	•	Organisatorisch: niedrig.
	•	Security: niedrig (Viewer-only default bleibt; fallback job trigger ist bewusst opt-in).

⸻

Verdichtete Essenz

Der PR ist praktisch mergebar. Wenn du noch 15 Minuten investieren willst: mach die Config-Tests semantisch wasserdicht (damit du später nicht “grüne Lügen” hast). Alles andere ist optional.

⸻

Ungewissheitsursachenanalyse

Unsicherheitsgrad: ∴0.22
Interpolationsgrad: ∴0.12

Ursachen:
	•	Ich sehe nicht die vollständige Config-Strategie (ob global fallback bewusst ist). Ich kann nur aus fallbackEnv + safeParse schließen.
	•	ACS Routing/Deployment unter Subpath ist nicht gezeigt; daher ist der Hash-Link nur “wahrscheinlich ok”, nicht garantiert.

⸻

Leitfragen
	1.	Kritischste Erörterung? Ziemlich: ich habe nur die Stellen markiert, die “später Zeit fressen” oder Tests entwerten.
	2.	Unbeleuchtet? Nur “woher kommen die Default-Repos langfristig (fleet SoT)?” – aber das ist bewusst deferred und per Env overridebar.