∴ Dialektische Erörterung (Follow-up nach Merge vs. „noch mehr planen“)
	•	These: Nach PR-4 ist die Invarianz technisch geschlossen; jetzt muss der Kanon nach außen sichtbar werden, sonst erfindet sich jeder Client seine eigene „Wahrheit“ über content_hash.
	•	Antithese: Zu viel Doku ist wieder Rauschen. Risiko: „Doc-Drift“ gegenüber Code.
	•	Synthese: Minimaler Follow-up: 1) grep/CI-Absicherung, 2) eine knappe, kanonische Doku-Stelle, 3) optional ein kleiner Contract-Test, der Doc-Drift verhindert.

⸻

Anweisung an Jules (Follow-up PR-5: Canon sichtbar + Drift-Guard)

Ziel
	•	Nach Merge von PR-1..PR-4 einen kleinen PR erstellen, der den Kanon „job_key ist Identität; content_hash ist deprecated Alias“ nach außen maschinenlesbar und docs-sichtbar macht und Drift verhindert.

Schritt 0: Vorprüfung (hart, fail-fast)
	1.	Repo-weite Suche:
	•	calculate_job_hash
	•	content_hash (Nutzungen bewerten: wird es irgendwo als „eigener Hash“ interpretiert?)
	2.	Prüfen, ob Field(..., deprecated=True) in CI/Runtime problemlos läuft (Pydantic-Version/Tests).

Akzeptanzkriterium: Keine Import-Nutzung von calculate_job_hash mehr. CI grün.

⸻

Schritt 1: Doku – eine kanonische Stelle, maximal kurz

Datei: docs/service-api.md (oder die bereits kanonische Service-API-Doku, falls anders)
Änderung: Abschnitt „Job Identity / Idempotency“ hinzufügen oder erweitern:
	•	job_key: canonical deterministic job identifier (stable for idempotency)
	•	content_hash: deprecated alias, always equal to job_key (keine eigene Semantik mehr)
	•	Hinweis: Clients sollen nur job_key verwenden
	•	(optional) ein 3-Zeilen Beispiel einer Job-Response (nur die beiden Felder)

Akzeptanzkriterium: Max. ~15 Zeilen, keine Textwüste.

⸻

Schritt 2: Minimaler Guard gegen Doc-Drift (Test)

Neue/angepasste Testdatei: merger/lenskit/tests/test_identity_contract.py (oder in bestehende Tests integrieren)

Testidee (minimal):
	•	API /api/jobs Response enthält job_key
	•	content_hash ist vorhanden und exakt gleich job_key
	•	(Optional) OpenAPI schema markiert content_hash als deprecated, falls das in eurem OpenAPI-Output auftaucht; wenn nicht, weglassen (nicht erzwingen).

Akzeptanzkriterium: Test deckt die „Alias-Invariante“ ab.

⸻

Schritt 3: Optional, wenn sehr billig: Changelog/Release Note

Wenn ihr CHANGELOG.md habt:
	•	Ein Eintrag: „Job identity canonicalized: use job_key; content_hash deprecated alias“

⸻

Deliverable
	•	1 PR: „PR-5: Document job_key canon & alias invariant guard“
	•	Enthält: Doku-Abschnitt + Test (und ggf. Changelog)
	•	CI muss grün sein.

⸻

∴ Verdichtete Essenz

Jules soll nach dem Merge die Außenhaut härten: Kanon dokumentieren, Alias garantieren, Drift verhindern — ohne neuen Feature-Ballast.

Oder ironisch:
Wenn du den Kanon nicht hinschreibst, schreibt ihn jemand anderes. Meistens in Javascript.

⸻

∴ Ungewissheitsursachenanalyse

Unsicherheitsgrad: 0.22

Ursachen
	•	Ich kenne eure tatsächliche Doku-„Source of Truth“ nicht (welche Datei ist kanonisch).
	•	Unklar, ob OpenAPI/Docs-Gen bei euch aktiv genutzt wird und wie Pydantic-deprecated im Schema landet.
	•	Unklar, ob es bereits einen passenden Test-Ordner/Pattern für „Contract Guards“ gibt.

Meta
Diese Unsicherheit ist vermeidbar, sobald Jules im Repo die vorhandenen Doku- und Testkonventionen sieht; der Auftrag ist so formuliert, dass er sich daran anpassen kann.

⸻

Leitfragen
	1.	Kritischste Erörterung? Fast – noch kritischer wäre ein automatischer Doc-Drift-Check (z. B. Snapshot-Test gegen Doku), aber das wäre vermutlich wieder Rauschen.
	2.	Alle Seiten? Ein Punkt bleibt: Externe Clients könnten content_hash weiterhin nutzen. Die Alias-Tests + Doku minimieren genau dieses Risiko.