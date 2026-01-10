According to a document from (2025-12-29) ist der Intent in Leitstand aktuell ein Fixture/Dummy, während hausKI bereits einen echten Intent-Resolver (inkl. Tests + Confidence-Regeln) implementiert hat. Das ist genau der Bruch, den du gespürt hast: UI zeigt „Intent“, aber der stammt nicht aus dem lebenden Organismus, sondern aus src/fixtures/intent.json. ￼ ￼

1) Dialektische Erörterung (∴fore)

These: „Intent“ soll berechnet sein (Organismus-Logik)
	•	In hausKI ist „Intent“ als Resolver gedacht: Kontext (geänderte Pfade, Workflows, PR-Kommentare) → intent + confidence + signals. Das ist explizit dokumentiert und getestet (z.B. mixed signals → confidence fällt). ￼ ￼
	•	Das passt architektonisch: hausKI = Orchestrator/Decision-Engine. Intent ist eine Vorstufe von „Was tun wir als Nächstes?“.

Konsequenz: Intent gehört nicht primär in Leitstand als statischer Text, sondern als Artefakt aus hausKI (oder hausKI→chronik/leitstand).

Antithese: „Intent“ als UI-Deko/Platzhalter (Leitstand-Logik)
	•	Leitstand hat src/fixtures/intent.json mit „OptimizeCacheStrategy … 2023-11 …“ — das ist erkennbar nicht aus euren aktuellen Heimgewebe-Flüssen, sondern eine generische Demo-Attrappe. ￼
	•	Fixtures sind nützlich: UI kann gebaut werden, bevor die Pipeline lebt.

Konsequenz: Der Intent im UI ist aktuell semantisch irreführend, wenn er nicht klar als „Fixture“ markiert wird.

Synthese: Intent als Artefakt (berechnet), UI zeigt Fallback
	•	Leitstand darf weiterhin ein Fixture haben – aber nur als klar gelabelter Fallback.
	•	„Echter“ Intent sollte aus hausKI kommen (berechnet), idealerweise als eigenes Contract-Artefakt, damit Leitstand ihn laden kann.

Ironische Nebenbemerkung: Aktuell ist der „Intent“ so etwas wie ein Horoskop, das neben einer Wetterstation hängt – sieht wissenschaftlich aus, ist aber nicht an Sensoren angeschlossen.

⸻

2) Aus welchen Daten entstand „Verdichtete Erkenntnis“?

Im Dump ist klar erkennbar: Leitstand nutzt Fixtures für „Observatory“ und „Intent“. Beispiel: src/fixtures/observatory.json referenziert sogar explizit ein metarepo-example als Quelle (metarepo/contracts/examples/...). ￼

Damit ist die harte Validierung: Stand des Dumps → „Verdichtete Erkenntnis“ ist (mindestens teilweise) noch fixture-/fallback-getrieben, nicht zwingend aus semantAH-Live-Artefakten gespeist. (Leitstand kann zusätzlich live laden – aber der hier sichtbare Intent ist definitiv Dummy.)

⸻

3) Für Dummies (kurz, ohne Mystik)
	•	Verdichtete Erkenntnis = eine Zusammenfassung, die Leitstand anzeigen kann.
	•	Intent = eine maschinelle Einschätzung „worum geht es hier?“ (z.B. Code ändern vs Doku vs CI kaputt).
	•	Im Moment zeigt Leitstand beim Intent ein Beispiel aus einer Datei (Dummy).
	•	hausKI kann Intent schon richtig berechnen – das müssen wir nur „verkabeln“, damit Leitstand den echten Wert lädt.

⸻

4) Entscheid: Soll der Intent sinnvoll gestaltet werden?

Ja – aber nicht „im UI erfinden“, sondern als berechnetes Artefakt aus hausKI (weil dort die Signale leben und dort Entscheidungen vorbereitet werden). hausKI hat das bereits als Konzept + Implementierung + Tests. ￼ ￼

⸻

5) Jules-Anweisungen pro Repo (konkret)

A) Repo: hausKI (Quelle der Wahrheit für Intent)

Ziel: Intent als exportierbares Artefakt, nicht nur CLI-Output.

Jules Tasks
	1.	Contract-Output stabilisieren: Sorge dafür, dass hauski intent --output ... ein kanonisches JSON schreibt (Felder/Typnamen konsistent). Doku zeigt Beispiel {"intent":"coding",...} ￼ – Leitstand-Fixture nutzt intent_type. Entscheide einen Standard (empfohlen: intent als enum-string, plus confidence, signals, created_at).
	2.	CI-Integration vorbereiten: In GitHub Actions kann hausKI Intent erzeugen und als Artefakt ablegen (Doku enthält schon YAML-Skizze). ￼
	3.	(Optional, aber sauber): IntentResolver-Gewichtung/Regeln aus den Tests in ein kurzes „Contract/Spec“-Kapitel überführen (damit UI/andere Consumer wissen, was Confidence bedeutet). Tests zeigen z.B. Base 0.55, Mixed -> 0.35 etc. ￼

Fehlerprävention
	•	Nicht zwei konkurrierende Feldnamen (intent_type vs intent) stehen lassen: sonst driftet UI vs Producer sofort auseinander.

⸻

B) Repo: leitstand (Consumer, nicht Erfinder)

Ziel: Leitstand lädt echten Intent, fällt sonst auf Fixture zurück – aber ehrlich markiert.

Jules Tasks
	1.	Fixture als Fallback labeln: UI soll anzeigen „(Fixture)“ wenn src/fixtures/intent.json genutzt wird. ￼
	2.	Intent-Lader analog zu Observatory-Lader: So wie observatory.json als fixture existiert, aber echte Artefakte geladen werden sollen, baue Intent-Laden als „live first, else fixture“. (Du hast dieses Pattern bereits für „Published Daily vs Raw“ angedeutet; hier konsequent fortsetzen.)
	3.	Schema-Abgleich: Passe Leitstand auf den hausKI-Output an (oder umgekehrt). Kein Mapping im UI „hinbiegen“, wenn Producer eigentlich kanonisch sein soll.

Fehlerprävention
	•	Keine stillschweigende Feld-Massage. Wenn Producer intent liefert und UI intent_type erwartet: hart fehlschlagen oder sichtbar mappen + dokumentieren.

⸻

C) Repo: metarepo (Contracts-first, damit das nicht wieder driftet)

Ziel: Intent als Contract definieren, Owner klar.

Jules Tasks
	1.	Neuen Contract anlegen: z.B. contracts/events/hauski.intent.v1.schema.json + Example. (Owner: metarepo; Producer: hausKI; Consumer: leitstand, ggf. heimgeist/chronik.)
	2.	Contracts-Index updaten (wie bei anderen Contracts üblich).
	3.	Benennung festzurren: Intent ≠ Decision. Intent ist „Vorstufe/Signalbündel“.

⸻

D) Repo: semantAH (nur wenn ihr Intent semantisch tiefer wollt)

Realistische Rolle: semantAH liefert Beobachtungen/Topics/Negations – nicht Tool-Auswahl-Intent.
Jules Option
	•	semantAH könnte Signals bereitstellen (z.B. „dominante Topics“, „Drift-Hotspots“), die hausKI als zusätzliche Signale in IntentContext einspeist. Aber Intent-Entscheidung bleibt bei hausKI.

⸻

6) Mini-Check: „oben genannter Plan“ vs Dump (wo du recht hattest)
	•	Du hast recht: Wenn ich nicht in den Dump schaue, wirkt alles wie „aus Erinnerung zusammengeflickt“. Hier ist der harte Beleg: Leitstand-Intent ist derzeit Fixture-Dummy. ￼
	•	Und: hausKI hat bereits die echte Intent-Logik samt Confidence-Regeln – also gibt es keinen Grund, den Intent dauerhaft als UI-Dummy zu lassen. ￼

⸻

Verdichtete Essenz

Intent ist im Leitstand aktuell Attrappe; hausKI kann Intent bereits berechnen; der sinnvolle Weg ist: metarepo contract → hausKI produziert Intent-Artefakt → Leitstand lädt live, fällt sonst auf Fixture zurück. ￼ ￼

⸻

Risikoabschätzung (technisch/organisatorisch)
	•	Technisches Risiko (mittel): Feld-/Schema-Drift (intent_type vs intent) führt zu UI-Fehlinterpretation ohne Crash → gefährlich, weil „falsch, aber plausibel“.
	•	Organisatorisches Risiko (niedrig-mittel): Wer ist Owner? Wenn metarepo keinen Contract setzt, wird Leitstand/hausKI parallel weiterentwickelt und driften.

⸻

Ungewissheitsursachenanalyse (pflicht)

Unsicherheitsgrad: 0.22 (niedrig–mittel)
Ursachen:
	•	Ich sehe im Dump klar die Fixtures und hausKI-Intent-Docs/Tests, aber ich habe hier nicht den vollständigen Live-Ladepfad von Leitstand (ob und wie er bereits echte Artefakte zieht) bis ins letzte Detail verifiziert – die Fixture-Belege sind jedoch eindeutig. ￼ ￼

⸻


Ein unthematisierter Punkt ist die exakte Contract-Grenze: Intent als „Tooling/Workflow-Intent“ (hausKI) vs „semantischer Intent“ (semantAH). Empfehlung: beide nicht vermischen; hausKI bleibt Orchestrierungs-Intent, semantAH liefert Observations-Signale.

@jules: in diesem repo nur die anweisungen für dieses repo ausführen!
