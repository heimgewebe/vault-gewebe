Kurzfassung vorweg: Dein Merger ist jetzt schon „Pflichtenheft-mäßig“ sehr sauber, aber er verhält sich noch wie ein höflicher Bibliothekar. Man könnte ihn durchaus zu einem leicht größenwahnsinnigen Oberarzt des Heimgewebes befördern – allerdings in Schichten, damit der Contract sauber bleibt.

Ich gehe in drei Ebenen:
	1.	Was im aktuellen Code offensichtlich noch „offen herumliegt“.
	2.	Was sich innerhalb des bestehenden Contracts noch rausholen lässt.
	3.	Was eine zweite, bewusst „intelligentere“ Schicht („Augment-Contract“) leisten könnte.

⸻

1. Offensichtliche offene Fäden im aktuellen Stand

Beim Durchsehen vom aktuellen merge_core.py / wc-merger.py fallen ein paar Dinge auf, die quasi schon vorbereitet, aber noch nicht zu Ende geführt sind:  ￼

1.1 DebugCollector ist totgeschwiegen
	•	Du hast einen sehr hübschen DebugCollector + run_debug_checks(file_infos, debug) mit Tabellen-Renderer (## Debug-Sektion).
	•	In iter_report_blocks(...) wird er aber gar nicht verwendet – der ganze Prüfapparat ist aktuell wirkungslos.

Praktischer Nutzen, wenn du ihn aktivierst:
	•	Sofort-Feedback auf:
	•	unbekannte Kategorien,
	•	unbekannte Tags,
	•	fehlende README,
	•	fehlende .wgx/profile.yml (das machst du gerade separat in check_fleet_consistency, Debug könnte das bündeln).
	•	Für KIs wäre das eine Goldgrube: Ein klarer Block „Achtung, hier stimmt was nicht / ist unvollständig“.

→ Low-hanging fruit:
	•	DebugCollector instanziieren, run_debug_checks(...) aufrufen, und debug.render_markdown() ans Ende des Reports hängen (oder direkt nach „Fleet Consistency“).
	•	Optional: per Flag --debug steuern, ob der Block auftaucht.

⸻

1.2 Organismus-Logik ist da, aber sehr minimal

Aktuell zählst du AI-Kontext, Contracts, CI-Pipelines und WGX-Profile und baust einen Mini-Block „Organism Overview“ in den Plan:  ￼

„AI-Kontext-Organe: n Dateien, Contracts: n, Pipelines: n, Fleet-/WGX-Profile: n“

Das ist schon nett, aber:
	•	Rollen sind nur gezählt, nicht benennbar.
	•	Es gibt keine Liste, welche Dateien konkret zu welchem Organ gehören.
	•	Kein direkter Link: „Wenn du KI bist und X tun willst, lies diese Dateien zuerst.“

→ Das ist die Stelle, wo der Merger sich vom „Datei-Indexer“ zum „Organism-Atlas“ hochleveln kann.

⸻

1.3 Delta-Merge ist da – aber als Nebenlinie

Im wc-extractor.py baust du aus Import-Diffs bereits einen Delta-Merge inklusive manifestartiger Tabelle und Content-Teil. Das ist ziemlich mächtig, hängt aber:
	•	losgelöst vom Hauptprofil-System,
	•	mit eigenem Mini-Contract („Delta Report“), ohne klare Relation zu wc-merge-report.  ￼

Hier schlummert eine ganze Klasse von Anwendungsfällen (Regressionen, „Was hat sich seit letztem Import geändert?“), die du noch stärker mit den Haupt-Merges verknüpfen könntest.

⸻

2. Radikale Verbesserungen innerhalb des bestehenden Contracts

Jetzt die Frage: Wie weit kommen wir, ohne dein „kein Halluzinieren, kein neuer Tag, keine neue Kategorie“-Dogma zu brechen?

2.1 Repo-Health-Block / „Heimgewebe-Status“

Du hast already:
	•	Fleet-Check (missing .wgx/profile.yml),
	•	Debug-Hooks für unbekannte Kategorien/Tags,
	•	Organism Overview (Anzahl ai-context, contracts, pipelines, profiles).  ￼

Vorschlag: Sammle das in einen klar definierten Block:

## Repo Health

- Fleet: `.wgx/profile.yml` fehlt
- README: vorhanden / fehlt
- AI-Kontext: 1 Datei (`merger/wc-merger/README.md`)
- Contracts: 1 Datei (`contracts/...`)
- CI: 2 Dateien (`.github/workflows/...`)

Empfohlene nächsten Schritte:
- [ ] .wgx/profile.yml anlegen
- [ ] Mindestens ein ai-context für <X> ergänzen

Ohne neue Tags, ohne neue Kategorien – nur Nutzung deiner bestehenden Heuristiken und Pfade.

Praktischer Nutzen:
	•	Mensch sieht: „Wo ist das Repo im Heimgewebe-Standard?“.
	•	KI kann gezielt Health-Checks fahren und To-Dos generieren.

⸻

2.2 Organismus-Index statt nur Zahlen

Statt nur „AI-Kontext-Organe: n Dateien“ könntest du innerhalb des bestehenden Schemas einen zusätzlichen Index bauen:

### Organism Index

- AI-Kontext:
  - [`merger/wc-merger/README.md`](#file-tools-merger-wc-merger-README-md)
- Contracts:
  - [`contracts/...`](#file-...)
- Pipelines:
  - [`.github/workflows/wgx-guard.yml`](#file-...)
- Fleet-Profile:
  - [`.wgx/profile.yml`](#file-...)

Alles nur Links, keine neue Semantik im Contract – aber für KIs ist sofort klar: „Hier sind die Köpfe, hier die Nervenbahnen.“

⸻

2.3 Profil-spezifische „Taktik-Hints“

Du hast bereits PROFILE_DESCRIPTIONS und einen hübschen „Reading Plan“.  ￼

Du könntest für jedes Profil noch 2–3 konkrete Taktik-Sätze ergänzen, z. B.:
	•	dev:
	•	„Wenn du einen Bug fixen willst: suche zuerst im Manifest nach betroffenen Pfaden, dann springe über die Anchors direkt in den Code.“
	•	„Nutze den Organism Index, um relevante CI/Contracts mitzulesen.“

Das bleibt alles rein beschreibend, keine „intelligente“ Auswertung – aber es konditioniert LLMs, den Merge strategisch zu benutzen.

⸻

2.4 Multirepo-Merges als „Fleet Panorama“

Deine Multi-Repo-Reports (mode gesamt) sortieren schon gemäß REPO_ORDER und zeigen pro Root einen Snapshot.  ￼

Du könntest zusätzlich einen kleinen „Fleet-Panorama“-Block bauen:

### Fleet Panorama

- metarepo → 12 relevante Textdateien, 3 Contracts, 2 Pipelines
- wgx      → 34 relevante Textdateien, 1 AI-Kontext, 3 Pipelines
- hausKI   → ...

Die Infos hast du alle in cat_stats, organism_* und included_by_root.

Zweck:
	•	Für dich: „Welches Repo ist unterversorgt (keine docs/kein ai-context)?“
	•	Für KI: sofort sehen, wo sie zuerst reinspringen sollte.

⸻

3. Nächste Ebene: Zweiter Contract als „intelligente Schicht“

Du hast mit wc-merge-report und dem JSON-Schema bereits eine sehr saubere Basisschicht gebaut, die explizit sagt: „Nicht halluzinieren, nur strukturieren.“  ￼

Wenn wir jetzt „wild“ werden wollen, ohne diesen Kern zu zerstören, bietet sich an:

Neuer, optionaler Sidecar-Contract
z. B. wc-merge-augment (YAML oder JSON), der neben dem Markdown-Report liegt.

3.1 Use-Case-Playbooks pro Repo

Sidecar-Datei, grob:

augment:
  version: "0.1"
  repo: "tools"
  playbooks:
    - name: "Neues Merge-Profil bauen"
      goal: "wc-merger erweitern oder Profil anpassen"
      primary_files:
        - merger/wc-merger/merge_core.py
        - merger/wc-merger/wc-merger-spec.md
      supporting_files:
        - merger/wc-merger/README.md
      notes:
        - "Spec zuerst lesen, dann nur an markierten Stellen ändern."

Das kannst du vollautomatisch aus bestehenden Strukturen erzeugen:
	•	primary_files: alles mit source + ai-context in merger/
	•	supporting_files: Spec, README, Config.

Das ist ein Schritt in Richtung: „Merger liefert nicht nur Daten, sondern Arbeitsmodi.“

⸻

3.2 Semantische Änderungs-Historie mit Delta-Merges verheiraten

Aus deinem Delta-Mechanismus kannst du einen höheren-Level-Mechanismus bauen:
	•	Führe pro Repo ein kleines Log:
	•	timestamp
	•	Anzahl added/changed/removed
	•	grobe Kategorie-Verteilung (mehr neue Contracts? Mehr Tests? Mehr Docs?).

Damit könntest du:
	•	Trendberichte erzeugen („in den letzten 3 Imports wurden hauptsächlich Pipelines verändert“).
	•	KIs gezielt sagen: „Fokus auf neue/instabile Stellen im Organismus.“

Das ist kein Halluzinieren, sondern Statistik über schon vorhandene Strukturen.

⸻

3.3 „Risk & Fragility“-Layer

Ohne in Security-Scanner-Overkill zu kippen:
	•	Markiere rein heuristisch:
	•	Ports in docker-compose.yml / infra (z. B. 0.0.0.0:...).
	•	DEBUG=true in env-Beispielen.
	•	leere oder sehr kurze README / ai-context-Dateien.

Das könntest du in einem augment-Block bündeln:

risks:
  - type: "exposed_port"
    file: "infra/compose/dev.yml"
    line_hint: 42
  - type: "missing_readme"
    repo: "leitstand"
  - type: "no_wgx_profile"
    repo: "tools"

Für dein Heimgewebe-„Immunsystem“ wäre das ein schöner Vorfilter.

⸻

3.4 Cross-Merge-Atlas

Langfristige Spinnerei (die aber sehr gut zu Heimgewebe passt):
	•	Sammle alle wc-merge-report-Metadaten aus allen Repos (über source_repos, scope, spec_version, contract_version etc.).  ￼
	•	Baue daraus einen „Fleet-Index“:
	•	Welche Repos besitzen Contracts?
	•	Wo gibt es CI?
	•	Wo fehlen .wgx/profile.yml?
	•	Wo ist ai-context vorhanden/fehlend?

Damit hättest du:
	•	Ein zentrales „Weltgewebe-Health-Dashboard“, komplett auf Basis deiner Merges.
	•	KIs könnten sich den gesamten Zustand des Organismus ziehen, ohne direkten Repo-Zugriff.

⸻

4. Prämissen in Frage gestellt

Was ich an stillen Grundannahmen sehe – und wo es sich lohnt, sie zu knacken:
	1.	„Keine Intelligenz im Merger“
	•	Für die Basisschicht ist das goldrichtig.
	•	Aber eine zweite Schicht, die explizit als „Augment/Heuristics“ gekennzeichnet ist, könnte sehr wohl semantische Verdichtungen erzeugen, ohne dein Vertrauenskorsett zu zerstören.
	2.	„Nur eine Art von Contract“
	•	Du hast sehr sauber wc-merge-report eingeführt.
	•	Das schreit danach, daneben weitere, klar typisierte Contracts zu haben:
	•	wc-merge-augment
	•	wc-merge-fleet-index
	•	wc-merge-delta (für die Diff-Reports).
	3.	„Merge ist ein Endprodukt“
	•	In Wahrheit ist es ein Zwischenformat:
	•	Input für KIs,
	•	Input für CI (Validator),
	•	Input für Fleet-Dashboards.
	•	Wenn du das anerkennst, kannst du bewusst Tools drumherum bauen, statt alles in den Merger reinzupressen.

⸻

Verdichtete Essenz
	•	Der aktuelle Merger ist strukturell sehr weit: Spec, Contract, Profile, organismische Grundzüge, Delta-Merges.
	•	Offene Fäden:
	•	ungenutzter DebugCollector,
	•	Organism Overview nur als Zählwerk,
	•	Delta-Merges nicht mit dem Hauptcontract verheiratet.
	•	Nächster Evolutionsschritt:
	•	Repo-Health-Block,
	•	Organismus-Index,
	•	Fleet-Panorama,
	•	optionaler Augment-Contract, der aus denselben Rohdaten Playbooks, Risiken und Trends erzeugt.

Kurz: Der Merger ist nicht mehr nur ein Scanner; er kann zum „Arztbrief“ des Heimgewebes werden.

⸻

Unsicherheitsgrad & Ursachen
	•	Unsicherheitsgrad: 0,33 (mittlere Unsicherheit)

Hauptgründe:
	•	Ich kenne deine langfristige Designpolitik nur aus den bisherigen Texten, nicht aus tatsächlichen CI-Fails oder deiner subjektiven Schmerzskala.
	•	Ob du wirklich einen zweiten „intelligenten“ Contract willst oder lieber alles brutal deterministisch lässt, ist eine Geschmacksfrage.
	•	Manche der Vorschläge (Risiko-Layer, Playbooks) könnten sich in der Praxis zu „zu viel Magic“ anfühlen – das hängt stark davon ab, wie strikt du die Heuristiken hältst.

Wenn du magst, können wir als nächsten Schritt:
	1.	Nur eine Sache konkret bauen (z. B. „Repo Health Block + DebugCollector reaktivieren“ als Patch).
	2.	Danach schrittweise einen minimalen wc-merge-augment-Prototypen entwerfen, der bewusst sehr stumpf, aber maschinenlesbar ist.
	
	
	Der Merger ist jetzt schon sehr ordentlich – jetzt machen wir daraus das medizinische Dossier deines Organismus „Heimgewebe“. Ich skizziere dir erst die Architektur (Blaupause), dann einen konkreten Fahrplan in Etappen.

⸻

1. Blaupause: Ebenen des „Super-Mergers“

Drei Schichten, die sauber getrennt bleiben:
	1.	Core-Contract (heute schon da)
	•	wc-merge-report + JSON-Schema
	•	Manifest, Content, Plan, Organism Overview, Meta-Block
→ „Was ist in diesem Repo drin?“
	2.	Health & Organism-Layer (im selben Report)
	•	Repo-Health, Organism Index, Fleet-Panorama
→ „Wie fit ist dieses Repo im Heimgewebe-Organismus? Was fehlt?“
	3.	Augment-Contracts (Sidecars, optional)
	•	wc-merge-augment (Playbooks, Hotspots, Risiken)
	•	wc-merge-delta (Änderungsberichte)
	•	(später) wc-merge-fleet-index (flottenweiter Zustand)
→ „Wie damit arbeiten? Was ist kritisch? Wo zuerst hingucken?“

Wichtig:
Schicht 1 bleibt brutal deterministisch und minimal-intelligent.
Schicht 2 verstärkt das mit synthetischen, aber immer noch „dummen“ Auswertungen.
Schicht 3 ist die Einladung an KIs, damit ernsthaft zu jonglieren.

⸻

2. Phase 0 – Inventur & Konsolidierung (Status stabil machen)

Ziel: Dein jetziger Stand wird „Version 2.3 stabil“.

Schritte:
	1.	Spec & README vollständig auf 2.3 heben
	•	Alle alten Verweise auf 2.1/2.2 entfernen.
	•	CLI-Beispiele 1:1 an wc-merger.py anpassen (Optionen, Profilnamen).
	2.	Kategorien & Tags final festnageln
	•	ci nur als Tag definieren (Spec & README klar sagen).
	•	ALLOWED_CATEGORIES final: source, doc, config, test, contract, other.
	3.	Multi-Part-Verhalten entscheiden
	•	Entweder:
	•	Jeder Part ist ein vollständiger wc-merge-report (mit eigenem @meta, part/total_parts).
→ sauberste Lösung für Validatoren.
	•	Oder:
	•	Nur Part 1 hat Contract-Header, Part 2+ werden explizit als „Appendix“ gekennzeichnet (und im Spec so beschrieben).

Ergebnis:
Ein sauberer, konsistenter, dokumentierter 2.3-Kern, auf dem wir aufbauen können.

⸻

3. Phase 1 – Debug & Health: der Merger als Arzt

Ziel: Report bekommt einen Repo-Health-Block, der DebugCollector und Organismus-Heuristiken bündelt.

3.1 DebugCollector aktivieren
	•	DebugCollector an zentraler Stelle instanziieren (in iter_report_blocks oder drumherum).
	•	In run_debug_checks:
	•	unbekannte Kategorien / Tags,
	•	fehlende README,
	•	fehlende .wgx/profile.yml,
	•	fehlende Tests / CI-Dateien (heuristisch) einsammeln.
	•	Am Ende des Reports (oder direkt nach „Plan“) einen Block:

## Repo Health

- Categories: ok / unbekannte Kategorien vorhanden (x)
- Tags: ok / unbekannte Tags (y)
- README: vorhanden / fehlt
- Fleet-Profil (.wgx/profile.yml): vorhanden / fehlt
- Tests: vorhanden / fehlen komplett
- CI-Pipelines: vorhanden / fehlen

Optional steuerbar via --debug.

3.2 „Empfohlene nächsten Schritte“
	•	Aus Debug-Daten eine simple Liste generieren:

### Empfehlungen

- [ ] README anlegen
- [ ] .wgx/profile.yml ergänzen
- [ ] Mindestens eine CI-Pipeline hinzufügen

Alles deterministisch, keine KI-Magie, nur if/else.

⸻

4. Phase 2 – Organism Index & Fleet-Panorama

Ziel: Der Merger zeigt nicht nur „was“, sondern „wo die Organe sind“.

4.1 Organism Index (pro Report)

Neuer Abschnitt, z. B. nach „Plan“ oder nach „Repo Health“:

## Organism Index

- AI-Kontext:
  - [`merger/wc-merger/README.md`](#file-tools-merger-wc-merger-README-md)
- Contracts:
  - [`contracts/...`](#file-tools-contracts-...schema.json)
- CI-Pipelines:
  - [`.github/workflows/wgx-guard.yml`](#file-tools-github-workflows-wgx-guard-yml)
- Fleet-/WGX-Profile:
  - [`.wgx/profile.yml`](#file-tools-wgx-profile-yml)

Umsetzung:
	•	Du nutzt vorhandene Tags/Kategorien:
	•	ai-context, contract, ci, wgx-profile.
	•	Linkziele: vorhandene Anchors (fi.anchor).

4.2 Fleet-Panorama (nur bei Multi-Repo-Merges)

Neuer Unterblock im Plan:

### Fleet Panorama

- metarepo → 12 relevante Textdateien, 1 Contract, 1 AI-Kontext, 2 CI-Pipelines
- wgx      → 34 relevante Textdateien, 2 Contracts, 1 AI-Kontext, 3 CI-Pipelines
- hausKI   → ...

Genutzt werden deine Stats:
	•	pro Root: root_text, root_bytes, organism_*-Zähler.

Nutzen:
	•	Du siehst auf einen Blick, welche Repos „nackt“ sind (keine Docs, kein ai-context).
	•	KI kann entscheiden: „Ich beginne mit X, weil dort die Organe sitzen.“

⸻

5. Phase 3 – Delta-Merges als eigene Contracts

Ziel: Änderungen zwischen zwei Ständen werden erstklassig statt Nebenprodukt.

5.1 Contract wc-merge-delta definieren
	•	Neue Spec-Datei: wc-merge-delta-spec.md.
	•	Neuer Meta-Contract:
	•	contract: wc-merge-delta
	•	delta_from: <timestamp/hash>
	•	delta_to: <timestamp/hash>
	•	Aufbau:
	1.	Header (Source & Profile, Scope).
	2.	Summary:
	•	Added / Changed / Removed.
	•	Nach Kategorien (source/doc/ci/contract/test…).
	3.	Manifest für geänderte Dateien.
	4.	Content nur für geänderte Dateien (voll, keine unveränderten).

5.2 Generator an bestehenden Diff-Hook anschließen
	•	wc-extractor.py / Import-Diff-Logik so erweitern, dass:
	•	neben dem jetzigen Diff-Markdown auch ein wc-merge-delta-Report erzeugt wird.
	•	Optional: Cross-Link im wc-merge-report:
	•	„Zu diesem Merge existiert ein delta-Report vom letzten Stand.“

⸻

6. Phase 4 – Augment-Contract („intelligente Beilage“)

Ziel: KIs & Tools bekommen eine strukturierte „Arbeitsanweisung“ zu jedem Merge.

6.1 wc-merge-augment designen

Sidecar-Datei (z. B. tools_max_multi_..._augment.yml) mit grobem Schema:

augment:
  version: "0.1"
  repo_scope:
    - tools
    - hausKI
  playbooks:
    - id: "refactor-merger"
      goal: "Merger-Profile erweitern oder anpassen"
      primary_files:
        - merger/wc-merger/merge_core.py
        - merger/wc-merger/wc-merger-spec.md
      supporting_files:
        - merger/wc-merger/README.md
  risks:
    - type: "missing_ai_context"
      repo: "contracts"
    - type: "missing_tests"
      repo: "hausKI"
  hotspots:
    - file: "merger/wc-merger/merge_core.py"
      reason: "Viele Kategorien/Heuristiken konzentriert"

Alles lässt sich aus bestehenden Informationen heuristisch ableiten:
	•	primary_files: Code + Spec im gleichen Baum.
	•	risks: Ergebnis aus Repo-Health-Hooks (z. B. fehlende README, fehlende CI).
	•	hotspots: Dateien mit vielen Kategorien / vielen Referenzen.

6.2 Schema + Validator
	•	JSON-Schema oder YAML-Schema für wc-merge-augment definieren.
	•	Kleines Validator-Skript analog zu validate_merge_meta.py.

Wichtig:
Augment ist optional.
KIs, die nur den Core wollen, ignorieren es.
Wer „mehr Hirn“ will, nimmt es dazu.

⸻

7. Phase 5 – CI & Tooling (wgx & heimgewebe)

Ziel: Die neuen Ebenen werden Teil deiner Flotte.

7.1 GitHub Actions erweitern
	•	Bestehenden validate-merges-Workflow ergänzen:
	•	Zusätzlich: wc-merge-delta und wc-merge-augment validieren (wenn vorhanden).
	•	Optional: eigene Jobs:
	•	merge-health → schlägt fehl, wenn bestimmte Health-Kriterien nicht erfüllt sind (z. B. kein .wgx/profile.yml in einem Core-Repo).

7.2 wgx-Integration

Neue Kommandos (oder Subkommandos) in wgx:
	•	wgx merge health → liest vorhandene Merges und zeigt gebündelten Fleet-Status.
	•	wgx merge list-deltas → listet delta-Reports.
	•	wgx merge augment → zeigt die Playbooks / Risiken strukturiert an.

⸻

8. Prämissencheck & Alternativweg

Prämissencheck:
	•	Annahme: Du willst Merges als zentrale Wahrheit für KIs und Tools nutzen, nicht nur als „Export für ChatGPT“.
	•	Annahme: Du willst bewusst zwischen harter, deterministischer Struktur und weicherer, heuristischer Hilfsschicht unterscheiden.
	•	Annahme: Du bist bereit, neue Contracts einzuführen, solange sie optional sind und klar benannt.

Wenn eine dieser Annahmen falsch ist, muss man:
	•	Augment-Contracts kleiner halten oder komplett weglassen.
	•	Delta/Multi-Fleet-Sachen stärker auf menschliche Lesbarkeit trimmen statt auf Maschinen.

Alternativweg („minimal-invasiv“):
	•	Nur Phase 1 + 2 umsetzen:
	•	Repo Health,
	•	Organism Index,
	•	Fleet-Panorama.
	•	Delta & Augment bewusst in eine spätere „Laborschiene“ verschieben oder in einem separaten Repo prototypen (z. B. tools/merge-lab).

Dann bleibt wc-merge-report ein sehr starker, aber noch schlanker Contract.

⸻

9. Verdichtete Essenz
	•	Kurz:
Wir machen aus dem Merger:
	1.	einen präzisen Scanner (Core-Contract),
	2.	einen Arztbrief mit Befund & Organatlas (Health & Organism-Layer),
	3.	optional einen Coach mit Playbooks & Risiko-Hinweisen (Augment-Contracts).
	•	Fahrplan:
	•	Phase 0: Aufräumen, Spec & Code voll synchron.
	•	Phase 1–2: Health & Organism-Index im bestehenden Report.
	•	Phase 3: Delta-Contract.
	•	Phase 4: Augment-Sidecar.
	•	Phase 5: CI & wgx-Hooks.

Oder in einem Satz:
Der Merger hört auf, nur „Was ist da?“ zu sagen, und beginnt zu sagen: „Wie gesund ist es, wofür taugt es, und was solltest du als nächstes mit ihm machen?“

⸻

10. Ungewissheitsanalyse

Unsicherheitsgrad: ~0,3
	•	Relativ sicher:
	•	Dass die vorgeschlagenen Layer technisch mit deinem jetzigen Setup kompatibel sind.
	•	Dass Debug / Health / Organism-Index dir direkt Mehrwert bringen.
	•	Unsicher:
	•	Wie viel „Augment-Magie“ du wirklich willst, bevor es dir zu „automatisch“ und zu sehr nach „Meta-KI“ riecht.
	•	Wie groß Delta & Fleet-Index tatsächlich benutzt werden (Evangelium oder Nischenfeature?).

Wenn du magst, wäre der nächste konkrete Schritt:
Phase 1+2 als Patch: Repo-Health-Block + Organism Index + Fleet-Panorama – alles noch innerhalb von wc-merge-report. Danach können wir an Augment/Delta als zweite Schiene gehen.


Der Merger soll also bleiben, was er ist: ein präziser Kern – und alles „Drumherum-Genius“ nur auf Knopfdruck. Sehr gute Prämisse, sonst mutiert er zum Weihnachtsbaum.

Ich passe die Blaupause darauf an und ziehe überall eine klare Trennlinie:
Kern (immer) vs. Extras (optional, per UI/Flag).

⸻

1. Leitprinzip: Zwei Schichten, hart getrennt
	1.	Core-Contract (immer an)
	•	wc-merge-report in der heutigen Form:
Header, Meta, Plan, Manifest, Content, Organism Overview (in der jetzt schon minimalen Form).
	•	Keine „intelligenten“ Blöcke, keine Health-Listen, keine Playbooks.
	2.	Extras-Schicht (optional)
Alles, was wir neu einführen (Health, Organism Index, Fleet-Panorama, Augment-Sidecars, Delta-Reports), hängt an einem klaren „Extras“-Schalter:
	•	Im CLI: z. B. --extras health,organism,fleet,augment,delta
	•	In der UI: eigener Button „Extras…“ → Sheet mit Checkboxen.

Default:
Extras aus.
Nur wer bewusst „mehr“ will, schaltet an.

⸻

2. UI-Architektur: Wie man das optional steuert

2.1 Neue „Extras…“-Schicht in der Pythonista-UI

Im Hauptfenster:
	•	Bisher: Profil-Selector, Max-Bytes, Split-Size, Repo-Liste, Run-Buttons.
	•	Neu: ein Button unten oder oben: „Extras…“

Klick → neues Sheet (oder Overlay) mit:
	•	Titel: „Zusatzanalysen“
	•	Checkboxen / Switches:
	•	[ ] Repo Health
	•	[ ] Organism Index
	•	[ ] Fleet Panorama (nur bei Multi-Repo)
	•	[ ] Delta Reports (falls Diff vorhanden)
	•	[ ] Augment-Sidecar (Playbooks/Risiken)

Darunter evtl. Presets:
	•	„Keine Extras“ (alles aus)
	•	„Health only“
	•	„Health + Organism“
	•	„Alle Extras“

Diese Auswahl wird:
	•	im LAST_STATE-JSON gespeichert,
	•	als Flags an wc-merger.py übergeben (--extras health,organism,...).

2.2 Mapping UI → CLI

Im CLI-Mode:
	•	Neues Argument:

--extras health,organism,fleet,augment,delta
# oder
--extras none

Intern: eine ExtrasConfig-Struktur, z. B.:

@dataclass
class ExtrasConfig:
    health: bool = False
    organism_index: bool = False
    fleet_panorama: bool = False
    augment_sidecar: bool = False
    delta_reports: bool = False

Die UI setzt diese Felder, der CLI-Parser ebenfalls.
merge_core.iter_report_blocks bekommt extras: ExtrasConfig.

⸻

3. Welche Features hängen an welchen Schaltern?

3.1 health – Repo-Health & Debug

Wenn extras.health = True:
	•	DebugCollector wird aktiv und sammelt:
	•	unbekannte Kategorien/Tags,
	•	fehlt README,
	•	fehlt .wgx/profile.yml,
	•	fehlen Tests komplett,
	•	fehlen CI-Pipelines.
	•	Am Ende (oder nach Plan) wird ein Block eingefügt:

## Repo Health (optional)

- README: vorhanden / fehlt
- .wgx/profile.yml: vorhanden / fehlt
- Tests: gefunden / keine Testdateien
- CI-Pipelines: gefunden / keine
- Unbekannte Kategorien: [...]
- Unbekannte Tags: [...]

Zusätzlich:

### Empfehlungen (optional)

- [ ] README anlegen
- [ ] .wgx/profile.yml ergänzen
- [ ] Mindestens eine CI-Pipeline hinzufügen

Wenn health = False:
Gar nichts davon im Report.

⸻

3.2 organism – Organism Index

Wenn extras.organism_index = True:

Neuer Abschnitt im Hauptreport:

## Organism Index (optional)

- AI-Kontext:
  - [`merger/wc-merger/README.md`](#file-...)
- Contracts:
  - [`contracts/...`](#file-...)
- CI-Pipelines:
  - [`.github/workflows/wgx-guard.yml`](#file-...)
- Fleet-/WGX-Profile:
  - [`.wgx/profile.yml`](#file-...)

Alles über vorhandene Kategorien/Tags ableitbar.

Wenn organism_index = False:
Nur der bisherige knappe Organism Overview (oder selbst der könnte optional sein), aber kein extra Index.

⸻

3.3 fleet – Fleet Panorama (nur Multi-Repo)

Wenn extras.fleet_panorama = True und mode = gesamt / mehrere Repos:

### Fleet Panorama (optional)

- metarepo → 12 Textdateien, 1 Contract, 1 AI-Kontext, 2 CI-Pipelines
- wgx      → 34 Textdateien, 2 Contracts, 1 AI-Kontext, 3 CI-Pipelines
- hausKI   → ...

Datenbasis: vorhandene pro-Root-Statistiken.

Wenn Single-Repo:
Block wird gar nicht erzeugt, selbst wenn fleet_panorama = True.

⸻

3.4 delta – Delta-Reports

Wenn extras.delta_reports = True:
	•	Falls ein Import-Diff vorhanden ist:
	•	zum normalen wc-merge-report wird zusätzlich ein wc-merge-delta erzeugt
(eigene Datei, eigener Contract).
	•	Im Hauptreport ein kleiner Hinweis:

> Delta-Report verfügbar: `merges/tools_delta_YYYYMMDD.md` (contract: wc-merge-delta)

Wenn delta_reports = False:
Keine Delta-Datei, kein Hinweis.

⸻

3.5 augment – Augment-Sidecar

Wenn extras.augment_sidecar = True:
	•	Neben dem Haupt-Merge wird eine Sidecar-Datei erzeugt, z. B.:
tools_max_single_..._augment.yml
	•	Inhalt: Playbooks / Risiken / Hotspots, wie skizziert.

Im Hauptreport nur eine kurze Info:

> Augment-Sidecar: `tools_max_single_..._augment.yml` (contract: wc-merge-augment v0.1)

Wenn augment_sidecar = False:
	•	Keine Sidecar-Datei, kein Hinweis.

⸻

4. Schema & Meta: Wie man die Optionalität sauber markiert

Im @meta-Block kannst du einen Extras-Hinweis ergänzen (ohne Zwang):

merge:
  spec_version: "2.3"
  profile: "max"
  contract: "wc-merge-report"
  contract_version: "2.3"
  ...
  extras:
    health: true
    organism_index: true
    fleet_panorama: false
    augment_sidecar: false
    delta_reports: false

	•	Schema: extras ist optional, aber wenn vorhanden → bools.
	•	So kann eine KI oder ein Validator erkennen:
	•	Welche optionalen Blöcke sollten im Dokument vorhanden sein?
	•	Welche Sidecars / Delta-Reports sind zu erwarten?

Wichtig:
Der Contract sagt dann:
„Diese Felder sind optional, aber wenn extras.health=true, dann kann ein ## Repo Health-Block vorkommen.“
Kein Muss – nur Ankündigung.

⸻

5. Fahrplan angepasst an die Optionalität

Phase 0 – Status festziehen (unverändert)
	•	Spec, README, CLI, Kategorien → auf 2.3 synchron.

Phase 1 – Extras-Konfiguration einführen
	1.	ExtrasConfig im Code definieren.
	2.	CLI-Parser um --extras erweitern.
	3.	UI „Extras…“-Button + Sheet mit Switches.
	4.	@meta.merge.extras Feld einführen (optional).

Noch keine neuen Blöcke – nur die Infrastruktur zum An/Aus-Schalten.

Phase 2 – Health & Organism-Index einbauen (optional)
	•	if extras.health: render_repo_health(...)
	•	if extras.organism_index: render_organism_index(...)

Beide komplett hinter ExtrasConfig versteckt, Schema optional.

Phase 3 – Fleet-Panorama & Delta
	•	if extras.fleet_panorama and multi_repo: render_fleet_panorama(...)
	•	if extras.delta_reports and diff_available: generate_wc_merge_delta(...)

Delta bekommt eigenen Contract & optionalen Hinweis im Hauptreport.

Phase 4 – Augment-Sidecar
	•	if extras.augment_sidecar: write_augment_yaml(...)
	•	Neues Schema wc-merge-augment.schema.json (optional, eigener Validator).

Macht alles nur, wenn gewollt.

Phase 5 – CI & wgx
	•	CI-Workflows so bauen, dass sie:
	•	nicht voraussetzen, dass Extras existieren.
	•	aber, wenn Extras da sind, die jeweiligen Schemas prüfen (Meta, Delta, Augment).

⸻

6. Prämissencheck & Alternativweg

Prämissencheck:
	•	Du willst:
	•	Kern minimal, robust, immer gleich.
	•	Extras klar als „Opt-in“, nicht als „immer mehr Ballast“.
	•	UI bleibt benutzbar; Extras in einer separaten Schicht.

Ich sehe keinen Widerspruch dazu, was wir hier planen.

Alternativweg:
	•	Man könnte radikaler sein und sagen:
	•	Core-Report bleibt komplett wie jetzt.
	•	Alle „Extras“ werden nur als Sidecar (YAML/JSON) erzeugt, nie im Markdown.
	•	Vorteil: Markdown bleibt super schlank.
	•	Nachteil: Menschen sehen Health/Index nicht direkt im Merge, sondern nur in Tools.

Aktuell würde ich deinen Wunsch so lesen:
Extras sichtbar im Report, aber nur auf Wunsch → also unser jetziger Plan ist passend.

⸻

7. Verdichtete Essenz
	•	Alles „abgefahren Geile“ (Health, Organism-Index, Fleet-Panorama, Delta, Augment) wird hinter eine eigene „Extras“-Schicht gestellt.
	•	UI: ein „Extras…“-Button öffnet ein kleines Kontrollzentrum mit Checkboxen.
	•	CLI: --extras health,organism,fleet,augment,delta.
	•	Meta: optionaler extras-Block, der dokumentiert, was aktiv war.
	•	Kern-Contract bleibt schlank, stabil, immer gleich – der Rest ist bewusst opt-in.

Oder kurz:
Der Merger bleibt dein nüchterner Kernscanner – und nur wenn du Lust hast, machst du mit einem Button aus ihm den Oberarzt mit Organatlas, Diagnose und Therapieplan.

⸻

8. Ungewissheitsanalyse

Unsicherheitsgrad: ~0,28
	•	Sicher:
	•	Dass die Extras-Schicht so separierbar ist (alles lässt sich über ExtrasConfig kapseln).
	•	Dass die UI in Pythonista so einen „Extras…“-Button problemlos verträgt.
	•	Unsicher:
	•	Wie viele Extras du real im Alltag aktiv haben willst, bevor der Output wieder zu fett wird.
	•	Ob du langfristig lieber alles „Nebenwissen“ in Sidecars statt im Markdown haben willst.

Wenn du magst, wäre der nächste konkrete Schritt:
Phase 1 als Patch: ExtrasConfig, CLI-Flag, UI-„Extras…“-Button + Speichern im .wc-merger-state.json – ohne noch irgendeinen neuen Block zu rendern. Danach können wir in Ruhe die Health-/Index-Blöcke je if extras.* anhängen.



