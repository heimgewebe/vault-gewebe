∴ Dialektische Erörterung (∴modus.recherche: Dump → Möglichkeitsraum → Risiko → epistemische Leerräume)

These

Integrität als Zwang wirkt nur, wenn jede Repo-Rolle genau dort „weh tut“, wo sie ohnehin schon Wahrheit produziert: Artefakte, Events, Contracts, Guards, UI. Dann entsteht Entwicklung nicht durch „mehr“, sondern durch Deckungsgleichheit (Gedanke/Docs ↔ Wort/Code ↔ Tat/Artefaktfluss).

Antithese

Ein Integritätsprogramm scheitert meist nicht am Können, sondern am Ausweichen:
	•	„Das ist doch nur lokal“ (HausKI-Review),
	•	„das ist nur Doku“ (metarepo),
	•	„das ist nur CI“ (wgx),
	•	„das ist nur UI“ (leitstand).

Integrität stirbt, wenn jede Schicht sich als Ausnahme erklärt.

Synthese

Also: pro Repo eine Jules-Anweisung, die nur Diagnose erzwingt (Warnung/Reports/Issues), nicht Heilung. Das ist die „Krankheit“: Benannte Inkohärenz, die nicht ignorierbar ist.

Etymologie (Pflicht): Integrität kommt von lat. integer = „unberührt, unversehrt, ganz“. Es geht nicht um Moral, sondern um Ganzheit ohne heimliche Risse.

⸻

Jules-Anweisung pro Repo (Integritätsmodus)

Gemeinsame Regel (für alle Repos):
	•	Kein Feature-Bau. Kein „Fix“ ohne Report.
	•	Null-Interpolation: Wenn etwas nicht belegbar ist → UNCLEAR markieren.
	•	Outputs (überall gleich benannt, repo-lokal):
	•	reports/integrity/<repo>.artifacts.json
	•	reports/integrity/event_flows.md (nur dort, wo sinnvoll; sonst Beitrag in contrib/ oder notes/)
	•	reports/integrity/loop_gap_analysis.md
	•	reports/integrity/summary.json
	•	ggf. docs/integrity/externalized_knowledge.md

⸻

1) heimgewebe/metarepo (Control-Plane / Contracts-first / Fleet-SoT)

Auftrag: „Behauptungen inventarisieren“
	•	Scanne docs/, contracts/ (interne), .github/workflows/, fleet/repos.yml.
	•	Erzeuge: reports/integrity/metarepo.artifacts.json
	•	Liste: alle behaupteten Artefakt-Typen + deren Schema-Owner + Producer/Consumer (wenn dokumentiert).
	•	Erzeuge: reports/integrity/loop_gap_analysis.md
	•	Für jeden beschriebenen Loop: Dok-Pfad vs real nachweisbarer Pfad in Code/Workflows anderer Repos (nur belegbar, sonst UNCLEAR).
	•	Issue-Regel:
	•	Jede Doc-Aussage „X liefert Y“ ohne nachweisbaren Producer → Issue „Doc claims without producer“.

Risiko (wenn zu hart): Du machst metarepo zum moralischen Richter. Gegenmittel: nur berichten, nicht „richtig machen“.

⸻

2) heimgewebe/wgx (Fleet-Motorik / Guard/Smoke/Metrics)

Auftrag: „Integritäts-Schmerz sichtbar machen (ohne Fail)“
	•	Implementiere (oder erweitere) einen reinen Warn-Check integrity-scan:
	•	liest repo-übergreifend vorhandene reports/integrity/summary.json (falls in jedem Repo erzeugt; sonst nur lokal berichten).
	•	Ausgabe: Orphans, Silent Events, Dead Loops, Externalized Sources.
	•	Kein Blocken. Nur Annotation/WARN.
	•	Erzeuge in wgx selbst:
	•	reports/integrity/wgx.artifacts.json (welche Metrik-Snapshots/Outputs entstehen wirklich).
	•	Bonus (rein diagnostisch): wgx doctor --integrity zeigt nur „wo fehlen Reports“.

Fehlerprävention: Nicht in WGX neue Wahrheit definieren. WGX liest Wahrheit nur aus Artefakten.

⸻

3) heimgewebe/contracts-mirror (Externe API-Contracts)

Auftrag: „Drift zwischen extern und intern verhindern“
	•	Prüfe strikt: Keine internen Organismus-Contracts hier.
	•	Report:
	•	reports/integrity/contracts-mirror.artifacts.json: nur Schemas + Herkunft (Quelle/Upstream).
	•	reports/integrity/loop_gap_analysis.md: falls Docs implizieren, dass mirror „steuernd“ ist → markieren als falsche Rollenerwartung.
	•	Issue-Regel: Jede Referenz in anderen Repos, die interne Contracts im mirror erwartet → Issue „Wrong contract ownership“.

⸻

4) heimgewebe/semantAH (Observatorium / Semantik)

Auftrag: „Artefakte + Relevanzbehauptung auditieren“
	•	Inventur:
	•	Welche Artefakte entstehen real (Scripts, CI)? → semantAH.artifacts.json.
	•	Relevanz:
	•	Wo wird „relevant“ behauptet (Scoring, Labels, Kategorien)? Liste alle Stellen + Output-Felder.
	•	Loop-Gap:
	•	Jede Doc-Loopbeschreibung (Observatorium → Leitstand → hausKI/heimlern) vs reale Exporte.
	•	Issue-Regel:
	•	Artefakt ohne dokumentierten Consumer → Issue „orphan_output“.

Alternativpfad (falls zu wenig Laufdaten): Nur statische Producer/Output-Pfade melden, keine Wirkung behaupten.

⸻

5) heimgewebe/chronik (Event-Backbone)

Auftrag: „Events sind echt, Reaktion ist optional – aber Schweigen muss einen Namen haben“
	•	Erzeuge reports/integrity/event_flows.md:
	•	event_type | producer | documented_consumer | real_consumer | status(alive/silent/dead/UNCLEAR)
	•	Implementiere nichts „reaktives“. Nur Klassifikation.
	•	Ergänze reports/integrity/chronik.artifacts.json:
	•	welche Event-Persistenzen/Exports existieren real.

Risiko: Chronik wird als „Policy-Engine“ missverstanden. Deshalb: nur Buchhaltung des Schweigens.

⸻

6) heimgewebe/hausKI (Orchestrator / Decisions / Review-Zyklus)

Auftrag: „Externalisiertes Wissen bekennen“
	•	Dokumentiere lokale Review-Artefakte:
	•	Pfade, Formate, Index, warum nicht versioniert.
	•	Output: docs/integrity/externalized_knowledge.md.
	•	Artefakt-Inventur:
	•	hausKI.artifacts.json: decision.preimage, policy.decision, logs, indices.
	•	Loop-Gap:
	•	Wo wird „Rückfluss“ behauptet, der faktisch lokal bleibt? → markieren.

Fehlerprävention: Nicht „mal eben“ alles nach chronik kippen. Erst Beichte, dann Integration (später).

⸻

7) heimgewebe/heimlern (Learning / Feedback / Shadow)

Auftrag: „Lernen ohne Selbstbetrug“
	•	Inventur:
	•	Welche Feedback-/Shadow-Artefakte existieren real? heimlern.artifacts.json.
	•	Loop-Gap:
	•	Wo behauptet Doku „Policy-Feedback wirkt zurück“, ohne nachweisbaren Consumer? markieren.
	•	Optional (nur Diagnose):
	•	Liste „destabilisierende“ Pfade als konzeptuell vs implementiert (klar trennen).

Risiko: Heimlern wird zum Automatismus. Gegenmittel: ausschließlich Preimage/Shadow als Diagnose zählen, nie Rollout.

⸻

8) heimgewebe/leitstand (UI / Anzeige)

Auftrag: „Konflikt zeigen, nicht glätten“
	•	Prüfe:
	•	Welche Artefakte werden angezeigt (knowledge.observatory, insights.daily, etc.)?
	•	Wo fallen Fallbacks/Fixtures an? → als Integritätsleck markieren.
	•	Output:
	•	leitstand.artifacts.json (Inputs/Downloads/Cache).
	•	loop_gap_analysis.md: „UI zeigt X“ vs „Artefakt X existiert wirklich“.
	•	UI-Änderungen verboten, außer: Debug-Panel „Integrity status“ (nur Anzeige, keine neue Logik) — wenn schon ein Ort dafür existiert.

Fehlerprävention: Keine „schönen“ Defaults. Defaults sind Lügen, wenn sie nicht als solche markiert sind.

⸻

9) heimgewebe/aussensensor (Ingest)

Auftrag: „Quelle → Event-Typen → Artefakte“
	•	Inventur:
	•	Welche Außensignale werden real erzeugt? Welche Event-Typen? aussensensor.artifacts.json.
	•	Event-Flows:
	•	Producer-Liste für chronik-Tabelle liefern (mindestens: event_type + emitter).
	•	Issue-Regel:
	•	Wenn Doku behauptet „liefert X“, aber Code nur Rohdaten produziert → „semantic overclaim“.

⸻

10) heimgewebe/heimgeist (Knowledge Base / Speicher)

Auftrag: „Wissenshaltung ist keine Wirkung“
	•	Inventur:
	•	Welche Artefakte werden gespeichert, indiziert, exportiert? heimgeist.artifacts.json.
	•	Loop-Gap:
	•	Wo wird heimgeist als „Konsument“ behauptet, aber nur als Storage genutzt? markieren.
	•	Externalized Knowledge:
	•	Alles, was „heimgeist“ sein müsste, aber lokal (z.B. hausKI review) bleibt → als Referenz aufnehmen (nur Verweis, keine Kopie).

⸻

11) heimgewebe/plexer (Event Router)

Auftrag: „Fanout ist Realität, aber Verantwortung ist unklar“
	•	Inventur:
	•	Welche Targets werden konfiguriert (Heimgeist/Leitstand/HausKI etc.)? plexer.artifacts.json.
	•	Event-Flows:
	•	Liste: welche Events gehen wohin (konfigurierbar vs fix)? Beitrag zur chronik-Tabelle.
	•	Issue-Regel:
	•	Konfiguration ohne dokumentierte Consumer-Rolle → „implicit consumer“.

⸻

12) heimgewebe/mitschreiber (OS-Kontext)

Auftrag: „Kontext-Artefakte sind eigene Wahrheitsschicht“
	•	Inventur:
	•	Welche OS-Context Artefakte existieren real? mitschreiber.artifacts.json.
	•	Loop-Gap:
	•	Wo behauptet Doku, dass OS-Kontext in semantAH/hausKI einfließt, ohne nachweisbare Pipeline? markieren.

⸻

13) heimgewebe/sichter (Auto-PR/Review)

Auftrag: „Review-Automation vs Review-Wahrheit trennen“
	•	Inventur: welche Reports/Checks/PR-Kommentare werden erzeugt? sichter.artifacts.json.
	•	Loop-Gap:
	•	Wo wird suggeriert, dass sichter „entscheidet“ statt „vorschlägt“? markieren.

⸻

14) heimgewebe/tools (Tooling)

Auftrag: „Werkzeuge als Artefakt-Producer katalogisieren“
	•	Scanne Scripts/CLIs:
	•	Welche Artefaktformate erzeugen sie? tools.artifacts.json.
	•	Issue-Regel:
	•	Tool erzeugt Output ohne Contract/Schema-Referenz → „artifact without contract“.

⸻

15) heimgewebe/webmaschine (Repo/Zonen/Drift-Kartograf)

Auftrag: „Drift ist Messung, nicht Meinung“
	•	Inventur:
	•	Welche Drift-Artefakte werden erzeugt (Snapshots/Maps)? webmaschine.artifacts.json.
	•	Loop-Gap:
	•	Wo wird Drift als „Guard“ behauptet, aber nur als Report umgesetzt? markieren.

⸻

16) heimgewebe/hausKI-audio (falls im Dump aktiv)

Auftrag: „Spezialorgan ohne Sonderrechte“
	•	Inventur: Inputs/Outputs, Artefakte, ggf. Events. hausKI-audio.artifacts.json.
	•	Loop-Gap: Audio-Flow in chronik/semantAH behauptet? Belegen oder UNCLEAR.

⸻

17) heimgewebe/vault-gewebe (Ablage)

Auftrag: „Ablage ist nicht kanonisch“
	•	Inventur:
	•	Was liegt hier, das anderswo als „Quelle der Wahrheit“ missverstanden werden könnte?
	•	Externalized Knowledge:
	•	Liste „hier abgelegt, aber nicht contractuell“ als Risiko.

⸻

18) Related Repos: weltgewebe, icf-tool, vault-privat

Auftrag: „Grenzen markieren (Fleet vs nicht Fleet)“
	•	Erzeuge je Repo reports/integrity/<repo>.artifacts.json mit dem einen Fokus:
	•	Welche Artefakte werden erzeugt, die scheinbar Heimgewebe betreffen?
	•	Issue-Regel:
	•	Wenn Fleet-Doku diese Repos als Konsumenten impliziert → „phantom consumer“.

⸻

Verdichtete Essenz

Pro Repo genau ein Schnitt: Was produzierst du wirklich? Wer konsumiert es wirklich? Was wird nur behauptet?
Integrität entsteht, wenn diese drei Antworten nicht mehr auseinanderlaufen dürfen, ohne dass es peinlich wird.

⸻

Selbstironische Auslassung

Integritätsdrang ist wie ein Rauchmelder, der nicht piept, weil es brennt, sondern weil du wieder behauptet hast, die Küche sei „konzeptuell fertig“.

⸻

Risikoabschätzung + Fehlerprävention (für die Empfehlung)
	•	Technisches Risiko: niedrig–mittel (meist Reports/Tabellen).
	•	Organisatorisches Risiko: mittel–hoch (Reports erzeugen Konflikte und Bremsen).
	•	Semantisches Risiko: hoch (Begriffe wie „Consumer“, „Loop“, „Relevanz“ werden plötzlich einklagbar).

Typische vermeidbare Fehler:
	•	„Wir fixen gleich“ → Nein: erst Diagnose.
	•	„Consumer ist doch klar“ → Nein: nur belegte Consumer zählen.
	•	„Doku zählt nicht“ → Doch: Doku ist Behauptungsschicht, also Integritätsquelle.

Alternativweg (wenn du weniger Eskalation willst):
	•	Nur in 3 Repos starten: metarepo + semantAH + chronik (alles andere liefert nur Beiträge), und WGX liest nur diese drei Summaries.

⸻

Ungewissheitsursachenanalyse

Unsicherheitsgrad: ∴ 0.34
Ursachen:
	•	Ich konnte hier keine Dump-Zitate beilegen (Toolzugriff auf den Dump war in dieser Antwort faktisch nicht nutzbar), daher ist die Repo-spezifische Ausgestaltung rollenbasiert statt zeilenbasiert.
	•	Einige Repos können im Dump fehlen oder anders strukturiert sein; dann greift das UNCLEAR-Prinzip.

Bewertung: Diese Unsicherheit ist teilweise vermeidbar (mit belastbarem Dump-Parsing in der nächsten Runde), aber produktiver Start ist dennoch möglich, weil die Anweisungen absichtlich diagnose-minimal sind.

⸻

Leitfragen
	1.	War das die kritischste Erörterung, die hier möglich war?
→ Kritischer wäre nur: jede Repo-Anweisung mit konkreten Pfaden/Dateinamen aus dem Dump zu unterfüttern. Das kann ich nachholen, sobald ich den Dump in dieser Session zuverlässig auslesen kann.
	2.	Wurde alles beleuchtet?
→ Unbeleuchtet bleibt absichtlich: der Mensch als stiller Konsument (mentale Consumer). Wenn du willst, bauen wir dafür später eine Kategorie „human-consumed, not versioned“ als kontrolliertes Schandmal.

Wenn du jetzt „hart“ gehen willst: Sag nur „CI-hart in wgx ab Stufe X“ (X = Warn-only, Fail-on-dead-loops, Fail-on-orphans, etc.), dann formuliere ich dir die Eskalationsleiter als Guard-Regeln.