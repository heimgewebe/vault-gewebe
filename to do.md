Kurzfassung vorneweg:
Das nächste, was ich umsetzen würde, ist einen echten, täglich laufenden System-Digest, der

semantAH (insights.daily) + chronik (Events) + wgx-Metrics
→ in leitstand als eine konkrete, sichtbare Tagesansicht zusammenführt.

Also: ein vertical slice „Heute im Heimgewebe“, statt noch mehr Grundlagen „im Trockenen“.

⸻

1. Warum genau dieses Feature als nächstes?

Einmal die Repo-Matrix gegen die Organismus-Brille gehalten:
	•	Control-Plane (metarepo + wgx)
ist auf ~80 % (stabil/aktiv). Contracts und Reusables existieren, werden benutzt.
	•	Gedächtnis + Sinn (chronik + semantAH + hausKI)
ist weit genug, dass echte Datenflüsse da sind, aber: du siehst sie noch nicht auf einen Blick.
	•	leitstand
ist der sichtbarste Blindfleck (geplant, ~10–20 %).

Du hast außerdem jetzt:
	•	insights.daily.schema.json + funktionierenden Export in semantAH, der today.json und daily/YYYY-MM-DD.json schreibt.
	•	chronik als Event-JSONL-Store mit event.line.schema.json.

Kurz: Die Daten leben schon. Was fehlt, ist eine Stelle, an der sie sich täglich treffen.

Damit wird Heimgewebe erstmals spürbar autopoetisch:
Der Organismus erzählt sich selbst morgens, was gestern los war.

⸻

2. Konkreter „Gold-Task“: Daily System Digest

Ich würde das als überschaubares Feature mit klaren Dateien definieren:

2.1 Zielbild

Täglich (z. B. 08:00) existiert in leitstand:
	•	eine Datei digests/daily/YYYY-MM-DD.md
	•	und optional ein JSON daneben digests/daily/YYYY-MM-DD.json

Inhalt:
	1.	Kopfbereich (Datum, Node/Environment)
	2.	Top-Topics aus insights.daily (semantAH)
	3.	Wichtige Events der letzten 24h aus chronik (nach event.line.schema.json)
	4.	Fleet-Health aus wgx-Metrics (z. B. wie viele Repos grün/gelb/rot)

Das ist noch keine schicke UI, aber:
	•	ein klarer, reproduzierbarer Output,
	•	der per Git diffbar ist,
	•	und den du später 1:1 in eine Web-UI heben kannst.

2.2 Bausteine (je Repo)

a) semantAH – ist durch deinen neuen Export quasi fertig
	•	Pflicht: sicherstellen, dass das Script wirklich täglich läuft (systemd-Timer / cron / wgx-Task), damit today.json immer frisch ist.

b) chronik
	•	Einfaches CLI oder Script hinzufügen, z. B. scripts/export_events.rs oder scripts/export_events.py, das:
	•	data/*.jsonl liest,
	•	nach Zeitraum (z. B. letzte 24h) und evtl. kind/Repo filtert,
	•	eine kondensierte Liste von Events als JSON ausgibt (für den Digest).

Beispiel-Output (JSON):

{
  "since": "2025-12-04T08:00:00Z",
  "until": "2025-12-05T08:00:00Z",
  "events": [
    {
      "ts": 1733385600,
      "kind": "ci.failure",
      "payload": { "repo": "hausKI", "job": "wgx-guard" }
    }
  ]
}

Das hält sich implizit an event.line.schema.json (id/node_id kannst du für den Digest weglassen, sie sind in der Quelle).

c) wgx / metarepo
	•	Du hast mit wgx-metrics + metrics.snapshot.schema.json bereits einen Weg, CI-Health Fleet-weit zu erfassen.
	•	Für den Digest reicht ein Mini-Script (wgx oder eigenes Tool in leitstand), das:
	•	die letzte Metrics-Snapshot-Datei einliest,
	•	simple Kennzahlen liefert: Anzahl Repos ok/warn/fail.

d) leitstand
	•	Neues Script, z. B. scripts/build_daily_digest.ts oder .rs, das:
	1.	insights.daily von semantAH liest (today.json oder Datumsversion).
	2.	export_events aus chronik aufruft (z. B. über CLI oder HTTP).
	3.	Fleet-Metrics liest.
	4.	Aus allem eine Markdown-Datei schreibt:

# Heimgewebe Digest – 2025-12-05

## Top-Themen (semantAH)
1. schule (0.42)
2. heimgewebe (0.27)
...

## Auffällige Events (chronik, letzte 24h)
- [2025-12-04 21:13] ci.failure – hausKI/wgx-guard
- [2025-12-04 19:02] reminder.sent – heimlern-bandits

## Fleet-Health (wgx-metrics)
- 9 Repos OK
- 2 Repos WARN
- 1 Repo FAIL


	•	Später kann genau diese Datei Grundlage eines HTML-Panels werden.

⸻

3. Prämissencheck & typische Fallen

Prämissen
	•	semantAH exportiert bereits gültige insights.daily-Dateien.
	•	chronik schreibt Events durchgängig nach event.line.schema.json.
	•	wgx-Metrics laufen bereits in einem Teil der Fleet (wgx-metrics reusable).

Mögliche Missverständnisse / Risiken
	•	Wenn VAULT_ROOT oder Pfade zu chronik/WGX-Snapshots nicht einheitlich gesetzt sind, wird der Digest-Builder zum Pfad-Grab.
	•	Gefahr, zu früh in „perfekte Web-UI“ zu kippen, statt erst das Markdown-Artefakt zu stabilisieren.
	•	Performance: Wenn chronik sehr groß ist, sollte das Export-Script Fenster (z. B. --since) verwenden, nicht blind alle Dateien lesen.

Risikoabschätzung
	•	Technisches Risiko: niedrig → alles sind reine Read-Operationen mit neuen Dateien als Output.
	•	Organisatorisches Risiko: eher, dass du dich in UI-Detailfragen verhedderst. Deswegen bewusst Markdown-Digest und nicht sofort Komponenten-Zirkus.

⸻

4. Alternativweg (falls du lieber Control-Plane härten willst)

Wenn du sagst: „Digest nice, aber ich will erst die Basis betonieren“, wäre der alternative Next-Step:

Contracts v1 wirklich fertig ziehen und in CI erzwingen.

Konkrete To-dos dafür:
	1.	In metarepo:
	•	Tag/Branch contracts-v1 fixieren.
	•	Kleine contracts/validate.yml Reusable Action, die:
	•	ajv-cli laufen lässt,
	•	alle JSONs (Events, Insights, Metrics, Policy-Snapshots) gegen die Schemas validiert.
	2.	In jedem Core-Repo:
	•	eigenen Job contracts-validate hinzufügen, der:
	•	die Voorhandenheit der erwarteten JSON-Outputs testet,
	•	und die Schemas referenziert (uses: heimgewebe/metarepo/...@contracts-v1).

Dieser Weg stärkt deinen Organismus als Regelsystem; der Digest-Weg stärkt ihn als Reflexionssystem.
Beides nötig, aber für „ich will sehen, dass er lebt“ ist der Digest-Slice befriedigender.

⸻

5. Verdichtete Essenz
	•	Nächster sinnvoller Schritt: Daily System Digest entlang der Kette
semantAH → chronik → wgx → leitstand.
	•	Minimal-Feature:
	•	semantAH: today.json nach insights.daily.schema.json.
	•	chronik: Export der letzten 24h Events.
	•	wgx: Fleet-Health aus Metrics-Snapshots.
	•	leitstand: Markdown-Digest digests/daily/YYYY-MM-DD.md bauen.
	•	Ergebnis: Heimgewebe erzählt sich täglich selbst, was passiert ist – lesbar, diffbar, später als UI nutzbar.

Oder in einer Zeile:
Wir bringen dem Organismus bei, morgens Zeitung über sich selbst zu lesen – bevor wir ihm ein Hochglanz-Dashboard kaufen.

⸻

6. Ungewissheitsanalyse
	•	Unsicherheitsgrad: ~0,3
	•	Ursachen:
	•	Der Merge-Stand kann von deinem aktuellen Code abweichen (Pfad-Details, CI-Jobs).
	•	Unklar, wie groß chronik und der Vault real sind → Export-Strategien (Windowing) müssen evtl. angepasst werden.
	•	Leitstand-Repo kenne ich nur aus Doku/Skizzen, nicht aus vollem Codezustand.

Trotzdem bin ich recht sicher:
Ein kleiner, gut geschnittener Daily-Digest-Slice ist jetzt der höchste Hebel, um Heimgewebe spürbar lebendiger zu machen – und dir selbst morgens eine Art „Organismus-Wetterbericht“ zu schenken.