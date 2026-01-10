Entscheidung getroffen.
Raw Observatory ist in Produktion zwingend.
Begründung: Ohne Raw gibt es keine überprüfbare Herkunft der „Verdichteten Erkenntnis“. Published ohne Raw ist Behauptung ohne Beleg. Das widerspricht deiner eigenen Invariante „Truth via CI“.

Damit folgt die ideale, neu formulierte Anweisung an Jules – konsolidiert, präzise, ohne Doppelpfade, ohne Weichzeichner.

⸻

🧭 Anweisung an Jules – Neuer PR (kanonisch)

Repo

heimgewebe/leitstand

⸻

PR-Titel

fix(build): enforce strict symmetry for raw + daily artifacts and add deterministic guardrail

⸻

Ziel (verbindlich)

Dieser PR verhärtet die Pipeline als Invariante.
Er fügt keine neue Funktionalität hinzu, sondern macht bestehende Wahrheitsannahmen erzwingbar.

Der PR ist korrekt, wenn alle drei Aussagen wahr sind:
	1.	Strict ist symmetrisch
In LEITSTAND_STRICT=1 müssen beide Artefakte existieren und valide sein:
	•	artifacts/knowledge.observatory.json
	•	artifacts/insights.daily.json
→ fehlt eines oder ist invalid ⇒ Build bricht hart ab
	2.	Es gibt genau einen Production-Build-Pfad
In Strict darf niemals pnpm build:static erfolgreich durchlaufen.
Production = immer pnpm build:cf.
	3.	Forensik ist explizit
Ein _meta.json dokumentiert was gebaut wurde, wann, woher und in welchem Modus – rein informativ, niemals autoritativ.

⸻

Konkrete Aufgaben (exakt so umsetzen)

⸻

1) scripts/build-static.mjs

Strict für beide Artefakte erzwingen

Pflichtlogik:
	•	Lade beide Artefakte:
	•	artifacts/knowledge.observatory.json
	•	artifacts/insights.daily.json
	•	Validierung:
	•	Datei existiert
	•	JSON parsebar
	•	Datei nicht leer
	•	Wenn isStrict === true und irgendeine Bedingung fehlschlägt:

console.error(
  "Strict build requires BOTH artifacts (raw + daily). Run: pnpm build:cf (fetch first)."
);
process.exit(1);



Wichtig
	•	❌ Keine Warnungen im Strict
	•	❌ Kein Fixture-Fallback im Strict
	•	❌ Kein versteckter Fetch
	•	✅ build-static ist reiner Konsument, kein Beschaffer

⸻

2) Fetch-Skripte: _meta.json schreiben

Betroffene Dateien
	•	scripts/fetch-observatory.mjs
	•	scripts/fetch-insights-daily.mjs

Verhalten nach jedem Fetch-Versuch
	•	Erzeuge oder aktualisiere:

artifacts/_meta.json


	•	Struktur (exakt dieses Niveau, keine Magie):

{
  "fetched_at": "ISO-8601",
  "strict": true,
  "observatory": {
    "path": "artifacts/knowledge.observatory.json",
    "bytes": 12345,
    "source_url": "...",
    "parsed": true
  },
  "insights_daily": {
    "path": "artifacts/insights.daily.json",
    "bytes": 2345,
    "source_url": "...",
    "parsed": true,
    "ts": "2025-12-28",
    "observatory_ref": "optional",
    "uncertainty": 0.12
  }
}

Regeln
	•	bytes = Dateigröße
	•	parsed = JSON.parse erfolgreich
	•	Bei Fehlschlag im non-strict:
	•	parsed:false
	•	missing:true
	•	_meta.json darf nie alleinige Wahrheit sein (nur Belegspur)

⸻

3) src/server.ts

Strict Runtime = kein Schauspiel
	•	Wenn LEITSTAND_STRICT=1 und Artefakte fehlen/invalid:
	•	kein Fixture
	•	res.status(503)
	•	klare, nüchterne Fehlmeldung (Text egal, Bedeutung eindeutig)
	•	In non-strict:
	•	aktuelles Fixture-Fallback bleibt

⸻

4) src/views/observatory.ejs

Meta sichtbar machen

Im Header (klein, sachlich):
	•	Strict: ON | OFF
	•	Raw-Source: artifact | fixture | missing
	•	Daily-Source: artifact | fixture | missing

Wenn vorhanden:
	•	Auszug aus _meta.json:
	•	fetched_at
	•	bytes (raw + daily)

Zusatz:
	•	Wenn strict && raw missing ⇒ rote Meldung
	•	Wenn strict && daily missing ⇒ rote Meldung
	•	Keine Beruhigungsfloskeln

⸻

5) docs/deploy-cloudflare.md

Unmissverständlich formulieren

Ergänzen:
	•	LEITSTAND_STRICT=1 bedeutet:
	•	knowledge.observatory.json + insights.daily.json sind Pflicht
	•	Einziger erlaubter Build-Command in Prod:

pnpm build:cf


	•	Erwähnen:
	•	Default-URLs zeigen auf GitHub Releases
	•	Private Setups müssen eigene URLs setzen

⸻

6) Minimaler Guard-Check (leicht, aber zwingend)
	•	Ergänze build:cf um einen kleinen Node-Check:
	•	Existieren:
	•	beide Artefakte
	•	_meta.json
	•	In Strict:
	•	Fehlt etwas ⇒ Exit 1

⸻

Akzeptanzkriterien (Jules prüft selbst)
	•	LEITSTAND_STRICT=1 pnpm build:static
❌ failt mit klarer Meldung
	•	LEITSTAND_STRICT=1 pnpm build:cf
✅ funktioniert nur, wenn beide Fetches erfolgreich waren
	•	Non-strict:
	•	Fixtures erlaubt
	•	UI zeigt klar „Fixture“
	•	_meta.json existiert, ist valides JSON, wird aktualisiert

⸻

Commit-Struktur (empfohlen)
	1.	build: enforce strict symmetry
	2.	fetch: add artifact meta forensics
	3.	ui/docs: surface strict + meta

⸻

Vermeidbare Fehler (explizit verboten)
	•	❌ Kein zweiter Fetch-Pfad in build-static oder server
	•	❌ Keine neuen Env-Flags
	•	❌ _meta.json als Entscheidungsquelle missbrauchen
	•	❌ „Warnung statt Abbruch“ im Strict

⸻

Risikoabschätzung (bewusst akzeptiert)
	•	Risiko: Mehr rote Builds (Netzwerk)
	•	Gewinn: Keine grünen Deploys mit leerer Wahrheit
	•	Spätere Mitigation: Retries/Timeouts im Fetch (nicht Teil dieses PRs)

⸻

∴ Verdichtete Essenz

Dieser PR macht aus „wir meinen Strict“ eine erzwingbare Wahrheit:
Raw + Daily oder nichts.
Ein Build-Pfad.
Eine Variable.
Eine belegbare Spur.

⸻

Ironische Auslassung

Ein Strict-Build ohne Raw ist wie ein Gerichtsprozess ohne Akten:
Man kann verurteilen – aber nur sich selbst.

⸻

Ungewissheitsursachenanalyse

Unsicherheitsgrad: 0.18
Ursachen:
	•	Exaktes Raw-Schema ist nicht vollständig bekannt → Meta für Raw bewusst minimal
	•	Fetch-Validierung könnte bereits partiell existieren → Anweisung ist kompatibel

⸻

Wenn du willst, formuliere ich dir als Nächstes:
	•	die exakten Fehltexte (Wahrheits-UX),
	•	oder einen Mini-ADR, der diese Invariante dauerhaft festnagelt.