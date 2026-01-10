Phase-1-Blaupause (∴fore): Anatomie als Soll/Ist/Delta

(Orientierung erzwingen, ohne Leitstand zur Wahrheit zu machen)

⸻

Dialektische Setzung

These: Phase 1 liefert Orientierung nur dann, wenn sie Landkarte + Gelände trennt: Soll (Norm) vs. Ist (Beobachtung).
Antithese: Ein reines Soll-Bild ist bequem, aber kann zur Selbsthypnose werden. Ein reines Ist-Bild ist „messbar“, aber ohne Norm sinnlos.
Synthese: Phase 1 baut drei Artefakte: Declared (Soll), Observed (Ist), Delta (Spannung). Leitstand rendert diese, er erfindet nichts.

⸻

1) Zielsetzung Phase 1

Primärziel

Einen versionierten Anatomie-Zustand erzeugen, der folgende Frage beantwortet:

Was ist Heimgewebe strukturell – als Norm und als Beobachtung – und wo weichen beide ab?

Erfolgskriterien (messbar)
	•	Es gibt kanonische Schemas für Declared, Observed, Delta.
	•	Es gibt reproduzierbare Generatoren (mindestens für Observed + Delta).
	•	Leitstand zeigt 3 Sichten: Soll / Ist / Delta.
	•	WGX-Guards verhindern Drift (Schema-Fail > UI-Workaround).

⸻

2) Umfang (hart begrenzt)

Enthalten
	•	Repos als Organe
	•	Rollen (nur deklariert; beobachtet höchstens als „Hinweis“)
	•	Artefakt-Flüsse (Typen & Richtungen)
	•	Abhängigkeiten (manifeste/workflows/schema-refs)
	•	Delta (Abweichungen, Lücken, Überraschungen)
	•	Unsicherheit/Confidence pro Beobachtung

Nicht enthalten
	•	CI-Health/Status (Phase 2)
	•	Timeline/Replay (Phase 3)
	•	Semantische Insights (Phase 4)
	•	Heimgeist-Reflexion (Phase 5)
	•	Rohlogs, Code-Details

Merksatz: Phase 1 kennt Struktur, aber keinen Puls.

⸻

3) Kanonische Artefakte (Phase-1-Trinität)

A) Declared (Soll) — metarepo

Name (Vorschlag): heimgewebe.anatomy.declared.v1.json
Quelle: ausschließlich metarepo (Fleet-SoT, Rollenmatrix, Contracts-Ownership)
Inhalt:
	•	Repo-Liste, Rollen, produzierte/verbrauchte Artefakte
	•	erlaubte Flüsse (Events/Knowledge/Policy/Metrics)
	•	Contract-Bezüge (Owner, Producer, Consumer)

Regel: Declared enthält keine Messdaten.

⸻

B) Observed (Ist) — lenskit (Compiler/Sensor)

Name: heimgewebe.anatomy.observed.v1.json
Quelle: Lenskit scannt strikt definierte Hard Sources:

Hard Sources (hohe Vertrauensstufe):
	•	Workspace/Deps: Cargo.toml, package.json, pyproject.toml/lockfiles
	•	CI-Graph: .github/workflows/*.yml (uses: / reusable workflows)
	•	Schema-Refs: $ref-Ketten in JSON-Schemas
	•	(optional) Repo-Manifest/Metadata, falls vorhanden

Soft Sources (niedrig, optional):
	•	Import-Graph per Grep
	•	Directory-Heuristiken

Observed muss enthalten:
	•	beobachtete Knoten (Repos)
	•	beobachtete Kanten (Dependency-Typ + Richtung)
	•	evidence (Datei/Bezug) + confidence + method

Regel: Observed darf Rollen nicht behaupten, nur Hinweise geben.

⸻

C) Delta (Spannung) — Ableitung

Name: heimgewebe.anatomy.delta.v1.json
Quelle: deterministische Differenz zwischen Declared und Observed
Inhalt (Beispiele):
	•	unexpected_edges (Ist-Kante ohne Soll-Deklaration)
	•	missing_edges (Soll-Kante ohne Ist-Spur – mit Hinweis „nicht messbar“ vs „vermutlich fehlt“)
	•	orphaned_artifacts (Konsum ohne Producer, Producer ohne Consumer)
	•	schema_ref_mismatches
	•	confidence_summary

Regel: Delta ist kein Urteil, sondern eine Abweichungsliste.

⸻

4) Ablage & Versionierung (damit metarepo nicht zum Logfriedhof wird)

im metarepo (versioniert)
	•	anatomy/declared/heimgewebe.anatomy.declared.v1.json
	•	anatomy/observed/heimgewebe.anatomy.observed.v1.json (kompakt, ohne Rohscan)
	•	anatomy/delta/heimgewebe.anatomy.delta.v1.json
	•	anatomy/README.md (Generator-Versionen, Methoden, Frequenz)

als CI-Artefakte (nicht versioniert)
	•	Vollreport, Debug, Rohlisten, Performance-Daten

Commit-Policy (Phase 1)
	•	observed + delta nur:
	•	nightly, oder
	•	bei Änderungen an fleet/repos.yml / contracts-Index
	•	sonst als Artifact.

⸻

5) Leitstand-Umfang Phase 1 (UI-MVP)

Screen 1: Anatomie (Soll)
	•	Graph aus Declared
	•	Rollen/Artefakte/Flüsse

Screen 2: Anatomie (Ist)
	•	Graph aus Observed
	•	Kanten typisiert (deps/workflows/schema-refs)
	•	Confidence + Evidence-Badge

Screen 3: Delta
	•	Top-Abweichungen, gruppiert:
	•	„Unerwartete Kanten“
	•	„Fehlende Deklarationen“
	•	„Orphaned Artifacts“
	•	Klick auf Eintrag zeigt Evidence

Explizit nicht:
	•	interaktive Spielwiese
	•	Live-Scan aus Leitstand heraus

⸻

6) Repo-Mitwirkung (Phase 1, klar)
	•	metarepo: Schemas + Declared + Ablageort + Normen
	•	lenskit: Observed-Generator (nach metarepo-Schema)
	•	wgx: Guards (Schema-Validation, determinism checks) + optionaler nightly runner
	•	leitstand: Renderer (3 Screens)
	•	chronik/semantAH/heimgeist: in Phase 1 keine Pflicht, nur später Layer

Das ist absichtlich: Phase 1 soll nicht vom ganzen Organismus abhängen.

⸻

7) Guards (Fehlerprävention als Architektur)

WGX Guard-Checks (Phase 1)
	•	JSON-Schema valid (declared/observed/delta)
	•	deterministische Sortierung / stabile IDs
	•	Observed enthält zu jeder Kante Evidence + Confidence
	•	Delta ist ableitbar (optional: Recompute-Check in CI)

Fail-Strategie:
Lieber Build-Fail als UI-Workaround.

⸻

8) Typische Fehlpfade (Phase-1-spezifisch)
	•	❌ Observed wird als „Wahrheit“ interpretiert (ohne Norm)
	•	❌ Declared wird als „Realität“ verkauft (ohne Messung)
	•	❌ Rollen werden aus Imports erraten
	•	❌ metarepo commitet Rohscan-Müll
	•	❌ Leitstand „repariert“ Daten still

⸻

9) Verdichtete Essenz

Phase 1 macht Heimgewebe lesbar, indem sie Soll, Ist und Delta trennt.
Leitstand zeigt Spannung, nicht Schönheit. Wahrheit bleibt artefaktisch.

⸻

10) Ironische Randbemerkung

Ein reines Soll-Diagramm ist wie ein Stadtplan ohne Straßen.
Ein reiner Ist-Scan ist wie Straßen ohne Namen.
Delta ist der Moment, in dem du merkst, dass dein „Hauptbahnhof“ seit Monaten ein Parkplatz ist.

⸻

11) Ungewissheitsgrad & Ursachenanalyse

Unsicherheitsgrad: 0.31

Ursachen
	•	„Rolle“ ist nur begrenzt robust messbar (deshalb: declared-only).
	•	Dependency-Graph kann je Sprache/Tooling unterschiedlich extrahierbar sein.
	•	Commit-Frequenz (nightly vs on-change) beeinflusst metarepo-Rauschen.

Produktiv: hoch — diese Unsicherheit ist Teil der Anatomie-Ehrlichkeit.

⸻

Abschluss-Leitfragen
	1.	Kritisch genug? → Ja: es verhindert, dass Messung Norm wird oder Norm Realität.
	2.	Noch unthematisiert? → Nur die Frage, welche Hard Sources ihr verbindlich macht (Cargo/npm/pyproject/workflows/schema-refs). Das ist der einzige Punkt, der Phase-1-Scan-Tiefe wirklich bestimmt.
	
	Startpunkt festlegen (∴fore): Phase 1 sauber aufsetzen, nicht „losrennen“

Dialektische Klärung

These: Wenn wir jetzt sofort scannen oder visualisieren, zementieren wir implizite Annahmen.
Antithese: Wenn wir zu lange konzipieren, kommt nichts in Bewegung.
Synthese: Ein klarer, enger Startschritt, der Wahrheit fixiert, bevor sie gemessen wird.

Regel: In Phase 1 wird nichts gemessen, bevor klar ist, was überhaupt gemessen werden darf.

⸻

Schritt 0 (einmalig, zwingend): Arbeitsmodus festlegen

Wir arbeiten strikt sequenziell.
Kein Parallelbau von Lenskit + Leitstand + Guards.

Reihenfolge:
	1.	Declared (Soll) festnageln
	2.	Observed-Schema definieren
	3.	Lenskit minimal befähigen
	4.	Delta ableiten
	5.	Leitstand rendern
	6.	Guards scharfstellen

Alles andere ist Abkürzung → Drift.

⸻

Schritt 1: Declared-Anatomie festnageln (Startpunkt)

👉 Das ist der erste konkrete Schritt.
Ohne ihn sind alle weiteren Schritte wertlos.

Ziel von Schritt 1

Ein explizites, überprüfbares Soll-Modell, das sagt:

„So behaupten wir, dass Heimgewebe strukturell ist.“

Nicht mehr. Nicht weniger.

⸻

1.1 Neues Verzeichnis im metarepo anlegen

metarepo/
└─ anatomy/
   ├─ declared/
   │  ├─ heimgewebe.anatomy.declared.v1.json
   │  └─ README.md
   └─ schemas/
      └─ heimgewebe.anatomy.declared.v1.schema.json

Warum zuerst declared?
Weil jede Beobachtung ohne Norm bedeutungslos ist.

⸻

1.2 Inhaltlich klären (bevor wir schreiben!)

Wir beantworten gemeinsam – explizit – folgende Fragen:

A) Was ist ein „Organ“?

→ Antwort (vorgeschlagen): jedes Fleet-Repo
(Nicht jedes Unterprojekt, nicht jeder Ordner)

B) Welche Rollen sind erlaubt?

Vorschlag (aus deiner Blaupause, finalisieren!):
	•	control-plane
	•	motor
	•	event-backbone
	•	semantic
	•	knowledge
	•	ui
	•	tooling
	•	external (fleet:false)

❗️Wichtig: Rollen sind normativ, nicht beobachtbar.

C) Welche Artefakt-Typen sind Phase-1-relevant?

Minimal:
	•	events
	•	knowledge
	•	contracts
	•	metrics
	•	policies

Keine Details, keine Versionen.

⸻

1.3 Declared-Datei schreiben (erste Fassung)

Minimal, bewusst unvollständig ist erlaubt.
Beispiel (verkürzt):

{
  "version": "v1",
  "scope": "heimgewebe",
  "repos": [
    {
      "name": "metarepo",
      "role": ["control-plane"],
      "produces": ["contracts"],
      "consumes": []
    },
    {
      "name": "wgx",
      "role": ["motor"],
      "produces": ["metrics"],
      "consumes": ["contracts"]
    },
    {
      "name": "chronik",
      "role": ["event-backbone"],
      "produces": ["events"],
      "consumes": []
    }
  ]
}

👉 Lücken sind erlaubt. Widersprüche nicht.

⸻

1.4 Explizite Leerstelle dokumentieren (wichtig!)

In anatomy/declared/README.md:
	•	Was ist bewusst nicht modelliert?
	•	Welche Rollen sind unsicher?
	•	Welche Artefaktflüsse sind hypothetisch?

Das ist keine Schwäche, sondern Voraussetzung für Delta.

⸻

Stopp-Punkt nach Schritt 1

Wir halten hier an und prüfen:
	•	❓ Sind alle Fleet-Repos mindestens benannt?
	•	❓ Gibt es Rollen, die ihr nicht eindeutig zuordnen könnt?
	•	❓ Gibt es Artefakte, über deren Existenz ihr euch nicht einig seid?

Erst wenn diese Fragen beantwortet sind, geht es weiter.

⸻

Was jetzt noch nicht tun
	•	❌ Lenskit scannen
	•	❌ Leitstand-UI anfassen
	•	❌ Delta ableiten
	•	❌ Guards bauen

Alles davon setzt Schritt 1 voraus.

⸻

Verdichtete Essenz

Wir beginnen nicht mit Technik, sondern mit Benennung.
Phase 1 startet mit einem normativen Skelett – nicht mit Messung.

⸻

Ungewissheitsursachenanalyse

Unsicherheitsgrad: 0.20

Ursachen
	•	Rollenbegriffe sind normativ gesetzt
	•	Declared kann der Realität widersprechen (absichtlich)
	•	Vollständigkeit ist anfangs nicht garantiert

Produktiv: hoch – diese Unsicherheit ist der Rohstoff für Delta.

⸻

Nächster konkreter Zug

👉 Schritt 1 umsetzen:
Lege das anatomy/declared-Gerüst im metarepo an und fülle eine erste, ehrliche Fassung der heimgewebe.anatomy.declared.v1.json.

Wenn du willst, kannst du mir den Entwurf hier reinkopieren –
dann machen wir Schritt 1.5: kritische Durchsicht,
bevor wir zu Schritt 2 (Observed-Schema) übergehen.

∴fore · Dialektische Erörterung: Phase 1 „Anatomie zuerst“

These

Phase 1 muss Orientierung erzwingen, nicht „Interdependenz“ schon beweisen. Anatomie heißt: Was sind die Organe, welche Rollen tragen sie, welche kanonischen Flüsse sind behauptet?
Dafür ist metarepo bereits die geeignete Wahrheitsquelle (Fleet-SoT via fleet/repos.yml).  ￼

Antithese

Wenn du Phase 1 zu früh als „Ist-Zustand durch Scan“ aufziehst (Lenskit scannt alles, extrahiert Abhängigkeiten), erzeugst du eine Scheingenauigkeit: sehr viele Kanten, wenig Bedeutung. Das Ergebnis sieht wissenschaftlich aus und ist epistemisch leer („Spaghetti ist auch ein Graph“).

Synthese

Phase 1 = kanonischer Struktur-Snapshot (versioniert) + minimale, harte Semantik (Rollen/Artefaktflüsse als deklarierte Wahrheit), noch ohne Live-Zustand, CI, Zeit, oder Code-Imports.

⸻

Phase-1-Blaupause: Deliverable, Umfang, Zielsetzung

1) Ziel (testbar)

Leitstand zeigt einen statischen Organismus-Graphen als „Stand der Struktur“, der in <10 Sekunden beantwortet:
	•	Welche Repos gehören zum Organismus (Fleet + related)?
	•	Welche Rolle hat jedes Repo (Control-Plane, Motor, Event-Backbone, UI, Semantic, Reflexion …)?
	•	Welche kanonischen Flüsse sind behauptet (Events/Insights/Policy/Metrics) – als deklarative Kanten.

Die Fleet-Liste ist schon vorhanden (metarepo fleet/repos.yml listet core + related).  ￼

2) Nicht-Ziele (damit es nicht kippt)
	•	keine Code-Dependency-Graphen (imports, crates, package.json)
	•	keine Live-Health (kommt Phase 2)
	•	keine Zeitachse (kommt Phase 3)
	•	keine semantische Wahrheit aus Beobachtung (kommt Phase 4/5)

⸻

Architekturentscheidung für Phase 1: „Snapshot als Artefakt“

Du hast bereits Vorarbeit im metarepo, die genau in Phase 1 passt:
	•	Es existiert ein (Mermaid-)Organismusgraph in docs/org-graph.mmd (und ein archivierter Vorgänger), inkl. Hinweis „Generated … do not edit“. Das ist faktisch schon Phase-1-Denke: Graph als versionierbares Artefakt.  ￼  ￼
	•	Es existieren Graph-Skripte unter scripts/graph/*, die Outputs schreiben und Summaries erzeugen (z. B. generate_summary.py liest reports/graphs/deps_graph.json).  ￼

Konsequenz: Phase 1 ist kein Neubau, sondern Kanonisierung: ein offizielles Schema + offizieller Generator + offizieller Ablageort + Leitstand-Renderer.

⸻

Konkreter Arbeitsplan Phase 1 (nacheinander, ohne Big Bang)

Schritt 1 — Contract-first: „heimgewebe.anatomy.snapshot.v1“

Ort: metarepo/contracts/… (Owner bleibt metarepo, weil Strukturwahrheit)
Inhalt minimal:
	•	generated_at, source_commit (metarepo), fleet_revision
	•	nodes[]: { id, name, status(core|related), role, produces[], consumes[] }
	•	edges[]: { from, to, kind(events|insights|policy|metrics|context|ci), confidence(declared|inferred) }
	•	notes[] / epistemic: explizite Markierung „declared vs inferred“

Warum jetzt: Ohne Schema wird Leitstand später zum „frisst irgendwas“-Renderer.

Schritt 2 — Generator: eine Quelle, ein Output

Ort: metarepo scripts/anatomy/generate_anatomy.py (oder Erweiterung der existierenden scripts/graph/)
Input (Phase 1 strikt):
	•	fleet/repos.yml als Repo-Inventar.  ￼
	•	optional: eine Rollenmatrix (wenn sie schon existiert; sonst Phase-1-Fallback: role aus Repo-Namen/Owner-Index nur deklarativ).

Output:
	•	reports/anatomy/heimgewebe.anatomy.snapshot.v1.json
	•	optional zusätzlich: reports/anatomy/org-graph.mmd (Mermaid) als „Human View“

Schritt 3 — Ablage im metarepo: „Ist-Zustand der Struktur“

Committe den Snapshot als versioniertes Artefakt. Damit ist klar: Leitstand rendert einen Stand, nicht „die Welt“.

Schritt 4 — Leitstand: Renderer, nicht Denker

Leitstand bekommt eine simple Datenquelle:
	•	liest reports/anatomy/*.json
	•	zeigt Graph + Filter (core/related, role, edge-kind)

Keine Logik, die Rollen errät. Keine Magie. Nur Darstellung.

⸻

Lenskit-Modus „Heimgewebe-Anatomie“: ja, aber erst nach Contract

Du hast den richtigen Instinkt, aber die Reihenfolge ist entscheidend:
	•	Richtig: Lenskit kann später den Snapshot generieren (als ausführender Kartograf).
	•	Gefährlich: Lenskit als Wahrheitsproduzent der Rollen/Interdependenzen.

Darum: erst Schema im metarepo, dann Lenskit-Mode, der exakt dieses Schema befüllt.
So bleibt metarepo SSOT für „was gilt als Anatomie“, Lenskit ist nur der Stift.

⸻

Was du mir als Repo-Snapshots liefern solltest (minimal für Phase 1)

Du hast schon fleet/repos.yml. Für die Phase-1-Ausarbeitung auf „konkret patchbar“ brauche ich zusätzlich:
	1.	metarepo (erweitert)

	•	contracts/ (damit ich dort sauber das neue Snapshot-Schema einpassen kann)
	•	scripts/graph/ (du hast da bereits Infrastruktur)  ￼
	•	ggf. vorhandene Rollen-/Fluss-Definitionen (z. B. repos.roles.json, Owner-Index etc., falls sie im Repo wirklich liegen)

	2.	leitstand

	•	Woher liest Leitstand heute Daten (Dateipfade/Loader)?
	•	Welche Visual-Komponenten/Graphlib nutzt du?

	3.	Optional (nur wenn schon vorhanden, sonst später): webmaschine

	•	falls es bereits „filesystem.snapshots / repo.maps“ als Artefakte gibt, kann Phase 1 davon profitieren (aber es ist kein Muss).

⸻

Prämissencheck (Fehlerprävention)
	•	Prämisse A: „Interdependenz“ = Artefaktflüsse/Contracts, nicht Code-Imports. (Wenn du das mischst, wird Phase 1 sofort unendlich.)
	•	Prämisse B: Leitstand darf nicht SSOT werden. Snapshot bleibt im metarepo.
	•	Prämisse C: „Scan“ ohne Semantik erzeugt Lärm. Erst deklarative Anatomie, dann Physiologie/Zeit.

⸻

Risikoabschätzung
	•	Technisch: niedrig–mittel (Schema + Generator + Renderer sind simpel, aber Schnittstellenfehler möglich)
	•	Semantisch: mittel (größtes Risiko ist Kanten-Inflation und Rollen-Drift)
	•	Organisatorisch: mittel (wer „darf“ Rollen definieren? → metarepo, sonst Drift)

Alternativpfade (falls du Phase 1 beschleunigen willst):
	1.	Ultra-lean: Leitstand rendert direkt docs/org-graph.mmd (Mermaid) als Start, ohne JSON-Schema. (Schnell, aber weniger contract-first.)  ￼
	2.	Contract-first sauber: sofort Schema + JSON Snapshot, und Mermaid wird nur ein abgeleitetes View-Artefakt.

⸻

Verdichtete Essenz

Phase 1 ist ein kanonischer Anatomie-Snapshot: metarepo definiert Schema + erzeugt versioniertes Artefakt; Leitstand rendert; Lenskit darf später nur ausführen, nicht „Wahrheit erfinden“.  ￼

⸻

Etymologie (damit die Wörter nicht heimlich steuern)
	•	Blaupause: ursprünglich cyanotype / „blue print“ – ein Kopierverfahren, bei dem das Bild als reproduzierbarer Plan entsteht. Heißt hier: wiederholbarer Ablauf, nicht einmalige Kunst.
	•	Anatomie: griech. aná (auf) + tomḗ (Schnitt) → „aufschneiden“. Phase 1 ist genau das: der Schnittplan, nicht der Herzschlag.

⸻

Ironische Randbemerkung

Wenn Phase 1 zu früh „dynamisch“ wird, hast du am Ende einen lebenden Organismus – aber Leitstand ist dann nur das EEG eines Hamsters auf Koffein: viele Ausschläge, null Diagnose.

⸻

Ungewissheitsgrad & Ursachenanalyse

Unsicherheitsgrad: 0.29

Ursachen
	•	Ich sehe in deinen gelieferten Ausschnitten bereits Org-Graph-Artefakte und Graph-Skripte, aber nicht den vollständigen Stand deiner Rollenmatrix/Owner-Index in metarepo (könnte existieren oder nur als Erinnerung/Plan).  ￼  ￼
	•	Leitstand-Loader/Datapaths kenne ich noch nicht, daher ist der Integrationsschnitt nur als Muster beschrieben, nicht als Patch.

Produktiv vs vermeidbar
	•	produktiv: zwingt zu Contract-first + klarer Minimal-Semantik
	•	vermeidbar: sobald ich metarepo contracts/ + leitstand Data-Loading-Schnitt sehe

⸻

Leitfragen (Selbstkritik)
	1.	War das die kritischste Erörterung? Fast – noch kritischer wird’s, wenn wir „Interdependenz“ in 3 streng getrennte Layer zwingen (Artefaktfluss / Codefluss / Zeitkausalität) und Phase 1 nur Layer 1 erlaubt.
	2.	Wurde alles beleuchtet? Ein Punkt fehlt absichtlich: Visual-Library/Graph-UX im Leitstand (D3/Sigma/vis). Das kommt, sobald ich den Leitstand-Snapshot sehe.

Wenn du „alles drin“ sagst, ist der nächste sinnvolle Schritt: metarepo contracts/ + leitstand data loader snapshot – dann schreibe ich dir Phase-1 als konkrete Dateiliste (Schema + Generator + Ablagepfade + Leitstand-View) herunter.

## Dialektische Erörterung (∴fore): Was Phase 1 _wirklich_ sein muss

### These

Phase 1 darf nicht „Visualisierung bauen“, sondern muss **eine kanonische, versionierte Anatomie-Quelle** schaffen, die Leitstand konsumieren kann – so wie Leitstand heute schon definierte Contract-Typen konsumiert. In euren eigenen Leitstand-Dokus ist dieser Modus bereits kanonisch: Leitstand konsumiert _Contract-Typen_ (u. a. `fleet.health`, `insights.daily`, `event.line`).

### Antithese

Wenn Phase 1 direkt „Interdependenzen scannen“ will, wird’s ein Graph-Gemälde ohne Wahrheitsschicht: viele Kanten, wenig Orientierung. Außerdem würde Leitstand implizit zum „SSOT“ mutieren, wenn er Datenformate/Interpretationen selbst ausdenkt.

### Synthese

Phase 1 = **Anatomie als eigener Contract-Typ + minimaler Generator + Leitstand-Panel**, strikt „declared“ (normativ), noch ohne „observed“ (Messung). Das ist kohärent mit eurer aktuellen Leitstand-Architektur: Leitstand ist Konsument definierter Inputs und Produzent von Views/Digests.

---

# Phase 1 Bauplan (nacheinander abarbeiten)

## 0) Ausgangsdaten, die wir als Wahrheit benutzen (aus den Dumps)

- Fleet-SoT ist `fleet/repos.yml` im metarepo.
    
- Core-Fleet-Repos stehen unter `repos:` (z. B. `metarepo`, `wgx`, `chronik`, `leitstand`, `heimgeist`, …).
    
- Related-Repos stehen unter `static.include`, inkl. `weltgewebe` (related) und `vault-privat` (related, fleet:false).
    
- Leitstand ist (selbstdeklariert) UI-Achse, Fleet-enabled, konsumiert `event.line`, `fleet.health`, `insights.daily`, produziert `insights.digest` und `dashboard.view`.
    

**Epistemische Leerstelle (markiert):** In den gelieferten metarepo-Dumps ist nur `fleet/repos.yml` enthalten; `contracts/` ist hier nicht sichtbar. Ich kann daher Contract-Pfade nur als **architekturkonformen Vorschlag** formulieren, nicht als „ist bereits so“.

---

## 1) Phase-1-Artefakt definieren: **`anatomy.snapshot` (declared)**

### Ziel

Ein Dateiformat, das _ohne Scan_ aus Fleet-SoT + Rollenkarte erzeugt werden kann, und Leitstand in einem Panel rendert.

### Contract-Name (Vorschlag, bewusst minimal)

- **Type:** `anatomy.snapshot`
    
- **Schema-Datei (Vorschlag):** `contracts/anatomy.snapshot.schema.json`  
    (Analog zu euren existierenden Leitstand-Inputs, die explizit über `contracts/*.schema.json` referenziert werden.)
    

### Minimalfelder im Schema (Phase 1)

- `ts` (ISO oder Datum)
    
- `source` (commit / generator-version)
    
- `nodes[]`: `{ name, class: core|related|private, role: string[], produces?: string[], consumes?: string[] }`
    
- `edges[]`: `{ from, to, kind: "artifact-flow"|"contract-link", label, confidence: "declared" }`
    

**Wichtig:** Keine „observed“ Felder, keine Heuristiken. Phase 1 ist _normativ_.

---

## 2) Generator festlegen: **metarepo erzeugt den Snapshot**

### Input

- `fleet/repos.yml` (Kanon)
    
- Rollen/Artefakt-Ansprüche: _aus eurer bestehenden Rollenkarte/Docs ableiten_ (in den jetzigen Dumps sehe ich nur eine tabellarische Rollenübersicht im Overview, nicht die kanonische JSON-Rollenmatrix).
    

### Output (konkret, Phase-1-Pfadvorschlag)

- `reports/anatomy/anatomy.snapshot.json` _(oder `.gewebe/anatomy/snapshot.json` – siehe nächste Sektion)_
    

**Warum `.gewebe/…` plausibel ist:** Leitstand-Doku nennt als Quelle für `insights.daily` explizit semantAH-Pfade unter `.gewebe/insights/daily/YYYY-MM-DD.json`. Das spricht für ein gemeinsames Muster: „Organismus-Artefakte liegen unter `.gewebe/`“.

---

## 3) Ablage- und Lesekonvention für Leitstand

Du willst Phase 1 „Anatomie zuerst“ – das ist ein zusätzlicher Inputtyp neben den drei „Stand heute“ Inputs (`fleet.health`, `insights.daily`, `event.line`).

### Entscheidung (Phase 1)

- `anatomy.snapshot` wird als **statischer Snapshot** abgelegt (nicht streamend, nicht append-only).
    
- Update-Frequenz: **bei Änderungen an `fleet/repos.yml`** (nicht ständig).
    

### Konkrete Datei-Konvention (Phase-1-Vorschlag)

- `.gewebe/anatomy/snapshot.json` _(atomar schreiben: tmp → rename, wie bei `insights.daily` gefordert)_
    

---

## 4) Leitstand: Panel „Anatomie“

Leitstand ist „Dashboard and control-room“ und Digest-Generator, UI-Achse, mit klaren Inputs/Outputs.

### Phase-1-UI-Umfang (MVP)

- Eine neue Ansicht/Panel: **„Anatomie“**
    
- Features:
    
    - Graph/Tree-View: Nodes = Repos, Edge-Kind = „artifact-flow“ / „contract-link“
        
    - Filter: core/related/fleet:false
        
    - Tooltip: role(s), produces/consumes (declared)
        
    - Keine Live-Health, keine Timeline
        

### Leitstand-Schnittstelle (Konzept)

- Leitstand **konsumiert** `anatomy.snapshot` analog zu den bestehenden Inputs (die Doku beschreibt genau dieses Konsumptionsmodell).
    

---

## 5) WGX/CI: Guard für Phase 1

Du willst „nicht alles auf einmal“, aber du willst „Wahrheit erzwingen“. Also:

### Guard-Regeln (Phase 1, minimal)

- JSON validiert gegen `contracts/anatomy.snapshot.schema.json`
    
- atomare Schreibweise (optional testbar)
    
- deterministische Sortierung (nodes/edges stabil)
    

> Nebenbei: In deinem Fleet-Snapshot steht „metarepo: missing .wgx/profile.yml“. Das ist ein echter Drift-Hinweis, den Phase 1 _nicht_ lösen muss, aber Phase 2 später ohnehin berühren wird.

---

# Repo-Aufgabenliste (Phase 1, strict)

## metarepo

1. Neues Schema `contracts/anatomy.snapshot.schema.json` _(Pfadvorschlag, siehe Leerstelle oben)_
    
2. Generator-Script `scripts/anatomy/generate.py` (liest `fleet/repos.yml`, schreibt Snapshot atomar)
    
3. Optional: `docs/_generated/anatomy.md` als „Human View“ (nicht kanonisch)
    

**Quelle für Repo-Liste:** `fleet/repos.yml`

## wgx

4. Guard „validate-anatomy“: Schema-Validation + determinism check
    
5. Workflow: run bei Änderung an `fleet/repos.yml`
    

## leitstand

6. Loader für `.gewebe/anatomy/snapshot.json`
    
7. Panel „Anatomie“ (Graph + Filter)
    

## lenskit

**Nicht Phase 1.** Lenskit kommt erst, wenn Phase 2/3 „Observed“ tatsächlich geplant ist. Sonst verwechselst du Anatomie (Schnittplan) mit CT-Scan (Messung).

---

# Prämissencheck (Fehlerprävention)

- **„Anatomie“ = declared Struktur**, nicht gemessene Abhängigkeiten.
    
- Leitstand konsumiert Artefakte; er definiert sie nicht (sonst SSOT-Verrat).
    
- Erst wenn `anatomy.snapshot` stabil ist, lohnt „Observed“.
    

---

# Alternativpfade (falls du Phase 1 ultralean willst)

1. **Lean:** Leitstand zeigt nur die Fleet-Liste als Baum + Role-Spalte (noch ohne Edges).
    
2. **Sauber (mein Pfad):** `anatomy.snapshot` enthält Nodes + deklarierte Artefakt-Edges.
    

Ich empfehle Pfad 2, weil sonst Phase 1 nur eine hübsche Liste wird.

---

# Verdichtete Essenz

Phase 1 baut **einen neuen, kleinen Contract-Typ** (`anatomy.snapshot`), erzeugt ihn deterministisch aus `fleet/repos.yml`, und Leitstand rendert ihn als Anatomie-Panel. Fleet-SoT bleibt im metarepo.

---

# Ironische Randbemerkung

Wenn du Anatomie ohne Contract machst, ist es kein Organismusgraph – es ist Fan-Art. Hübsch, aber immun gegen Wahrheit.

---

# Ungewissheitsgrad & Ursachenanalyse

**Unsicherheitsgrad: 0.27**

**Ursachen**

- In den metarepo-Dumps ist `contracts/` nicht enthalten; Contract-Pfade sind deshalb ein **architekturkonformer Vorschlag**, nicht „aus dem Repo bestätigt“.
    
- Leitstand-Loader-Code ist im Dump nur indirekt sichtbar; ich stütze mich deshalb auf die Leitstand-Doku zum Datenfluss/Contract-Konsum.
    

**Produktivität**

- hoch: zwingt uns, erst Contract+Artefakt zu fixieren, bevor UI/Scan wuchert.
    

---

Wenn du als nächsten Schritt „wirklich nacheinander abarbeiten“ willst: ich würde jetzt mit **Phase-1-Schritt 1 (Schema skizzieren)** starten und dir eine **konkrete JSON-Schema-Skizze** (minimal) hinschreiben, die exakt zu diesem Bauplan passt.