Dialektische Erörterung

These: In Systemen wie deinem – Multi-Repo-Organismus, Docmeta-Engine, Observatorium – entstehen Driftprobleme selten durch „kaputte Tools“, sondern durch unsichtbare epistemische Verschiebungen: Wahrheitsschichten, implizite Kopplungen, semantische Inflation.

Antithese: Man könnte argumentieren, dass Guards, Contracts und CI-Checks bereits ausreichend Schutz bieten. Viele Repos leben jahrzehntelang ohne explizite Driftanalyse.

Synthese: Gerade weil dein System bewusst epistemisch gebaut ist (Artefakte, Truth-Layers, Observatorium), werden bestimmte Driftarten kritischer als in normalen Repos. Drei davon sind besonders tückisch.

⸻

Die drei gefährlichsten strukturellen Driftquellen

1. Wahrheitsdrift zwischen generierten Artefakten und Kanon

Problem

Du hast drei Wahrheitsebenen:

Docs (canonical)
↓
Docmeta-Generatoren
↓
Generated Artefacts

Beispiele:

docs/index.md
docs/_generated/doc-index.md
repo.meta.yaml

Gefahr:

docs ändern sich
aber generatorische Ableitung bleibt stabil

Dann entsteht:

truth divergence

Beispiel

docs/overview/inhalt.md
canonicality: canonical

aber

doc-index.md
canonicality: derived

Das ist genau die Drift, die du gerade korrigiert hast.

Warum das gefährlich ist

Menschen lesen meist:

docs/

Agents lesen meist:

_generated/

Wenn beide Welten auseinanderlaufen, entstehen zwei Realitäten.

Gegenmaßnahme

Eine einfache, aber mächtige Regel:

canonical fields dürfen nur an einer Stelle definiert sein

und:

_generated darf canonical fields nicht selbst bestimmen


⸻

2. Implizite Infrastrukturkopplung

Problem

Viele Systeme hängen an:

Makefile
Compose
CI
Scripts

Diese bilden faktisch eine zweite Architektur, die selten dokumentiert ist.

Beispiel:

make docs-guard
↓
python generators
↓
impl-registry.yaml
↓
generated artifacts

Wenn sich eines davon ändert, ohne dass die anderen folgen:

build semantics drift

Typisches Symptom

Ein Repo funktioniert lokal, aber:

CI zeigt andere Artefakte

oder:

generated files diff loop

Gegenmaßnahme

Der Report, den du schon begonnen hast:

implicit-dependencies

ist genau das richtige Instrument.

Aber er muss irgendwann echte Regeln enthalten, z. B.:

Makefile target
→ required files
→ required docs


⸻

3. Semantische Inflation der Dokumentation

Problem

Wenn viele Dokumente entstehen, passiert irgendwann:

reference docs
policy docs
runbooks
concept docs
overview docs

Alle sehen gleich aus, aber haben unterschiedliche epistemische Rollen.

Dann verschwimmt:

canonical
derived
reference

Beispiel

Ein Dokument beginnt als:

reference

wird aber faktisch:

canonical design description

oder umgekehrt.

Dann entstehen Fehler wie:

canonicality still canonical
aber Inhalt ist nur noch derived

Gegenmaßnahme

Das Frontmatter-System, das du nutzt, ist gut – aber langfristig braucht es:

role validation

Zum Beispiel:

canonical docs müssen referenced sein
derived docs müssen source referenzieren


⸻

Gemeinsamer Kern der drei Driftarten

Alle drei haben denselben Ursprung:

implizite Semantik

Systeme bleiben stabil, wenn Semantik explizit wird.

Dein Repo ist bereits auf diesem Weg.

⸻

Ein mögliches nächstes Evolutionsniveau

Wenn dein Observatorium reift, könnte es ein echtes Repo-Gesundheitsmodell werden.

Beispiel:

Repo Health
│
├─ Structural Integrity
│  ├ architecture drift
│  └ implicit dependencies
│
├─ Documentation Integrity
│  ├ doc coverage
│  └ staleness
│
└─ Epistemic Integrity
   ├ knowledge gaps
   └ canonical drift

Das wäre ziemlich einzigartig für ein Softwareprojekt.

⸻

Alternative Sinnachse

Die klassische Frage lautet:

Ist das Repo gut organisiert?

Die interessantere Frage lautet:

Kann das Repo selbst erkennen, wenn es aufhört, wahr zu sein?

Das Observatorium ist im Grunde der Versuch, diese zweite Frage maschinell zu beantworten.

⸻

Humor-Modul

Die meisten Repos glauben, sie seien gut dokumentiert.

Dein Repo baut stattdessen ein Instrument, das regelmäßig fragt:

„Ist das hier noch wahr – oder nur ein hübsch formatierter Irrtum?“

Das ist ein Unterschied wie zwischen Tagebuch und Logbuch. Im Tagebuch steht, was man dachte. Im Logbuch steht, was tatsächlich passiert ist.

⸻

Essenz

Hebel: Drift sichtbar machen
Entscheidung: Observatorium als epistemisches System weiterentwickeln
Nächste Aktion: nicht mehr Reports hinzufügen, sondern bestehende Reports mit echten Datenquellen koppeln

⸻

Unsicherheitsgrad

0.28

Ursachen:
	•	vollständige Docmeta-Engine nicht komplett sichtbar
	•	impl-registry und Frontmatter-Schema nicht vollständig analysiert

⸻

Interpolationsgrad

0.31

Annahmen:
	•	impl-registry als zentrale Quelle
	•	Frontmatter-basierte Dokumentsemantik
	•	zukünftige CI-Integration der Observatoriumsberichte
	
	
	
	These

Eine vollständige semantische Graph-Prüfung aller Docs ist der saubere Endzustand: nicht nur Frontmatter und Links, sondern dokumentierte Bedeutung, Herkunft, Abhängigkeiten, Kanonizität, Widersprüche und Drift werden als prüfbarer Dokument-Graph modelliert.

Antithese

Vollständigkeit kann schnell in Ritualbürokratie kippen: Ein „Graph“ klingt klug, aber wenn er nur zusätzliche Metadaten erzwingt, ohne echte Architektur- oder Betriebsfehler sichtbar zu machen, baut man eine Kathedrale aus YAML und wohnt weiter im Nebel.

Synthese

Die richtige Form ist kein totaler Metadatenstaat, sondern ein mehrschichtiger Prüfer: erst harte Struktur, dann semantische Kanten, dann Integrität des Gesamtgraphen, dann heuristische Warnungen. Also: Graph zuerst als Prüfmodell, nicht als Selbstzweck.

Alternative Sinnachse

Statt zu fragen „Wie prüfen wir alle Docs vollständig?“, kann man die Zielannahme kippen:
Vielleicht ist nicht „alle Docs“ die primäre Einheit, sondern kanonische Aussagen. Dann wären Dokumente nur Container, und geprüft würde: Welche Aussage ist canonical, wo wird sie abgeleitet, wo widersprochen, wo veraltet?
Das ist oft intelligenter als bloß Datei-zu-Datei-Verlinkung. Der Graph wäre dann ein Behauptungsgraph, nicht nur ein Dateigraph.

⸻

Ausarbeitung: Vollständige semantische Graph-Prüfung aller Docs

1. Begriffsklärung

Semantik
Etymologie: aus griechisch sēmaínein = bedeuten, anzeigen.
Hier: nicht nur, dass ein Link existiert, sondern was eine Relation bedeutet.

Graph
Etymologie: aus griechisch graphein = schreiben, ritzen.
Hier: ein Netz aus Knoten und Kanten.
Knoten = Dokumente, Abschnitte, Aussagen, Implementierungen, Contracts.
Kanten = Beziehungen wie „beschreibt“, „ersetzt“, „leitet ab“, „widerspricht“, „verifiziert“.

Prüfung
Etymologie: althochdeutsch pruofen = erproben, erweisen.
Hier: nicht bloß zählen, sondern Regeln gegen den Graphen ausführen.

Für Dummies:
Stell dir alle Docs wie Städte auf einer Karte vor. Links sind Straßen. Eine semantische Graph-Prüfung fragt nicht nur: „Gibt es eine Straße?“, sondern auch: „Ist das eine Autobahn, ein Fußweg oder eine Sackgasse? Führt sie überhaupt zur richtigen Stadt? Gibt es zwei Städte, die beide behaupten, Hauptstadt zu sein?“

⸻

2. Zielbild

Eine vollständige Graph-Prüfung sollte vier Ebenen unterscheiden:

Ebene A – Strukturelle Existenz

Prüft:
	•	Datei existiert
	•	Frontmatter existiert und ist parsebar
	•	Pflichtfelder vorhanden
	•	referenzierte Dateien/Ziele existieren
	•	keine kaputten Links
	•	generierte Dateien korrekt markiert

Das ist die unterste Schicht. Nötig, aber nicht hinreichend.

Ebene B – Semantische Kanten

Prüft:
	•	canonicality: canonical|derived|archived|deprecated
	•	source, supersedes, deprecated_by, verified_by, documented_by, depends_on, see_also, implements, consumes, produces
	•	Kanten sind typisiert, nicht bloß Textvorkommen
	•	Zieltyp passt zur Relation

Beispiel:
	•	derived muss eine source haben
	•	supersedes darf nicht auf ein generated Doc zeigen
	•	verified_by sollte auf Tests, Guards oder Proofs zeigen

Ebene C – Graphintegrität

Prüft globale Invarianten:
	•	keine zirkulären Supersession-Ketten
	•	keine zwei canonical Docs für denselben Geltungsbereich ohne explizite Koexistenzregel
	•	jedes derived Doc hat erreichbaren kanonischen Ursprung
	•	kein kanonisches Doc ist unreferenziert, wenn es discoverable sein soll
	•	kein critical impl ohne Doku- oder Prüfpfad
	•	keine isolierten Cluster ohne Einstiegspunkt

Ebene D – Epistemische / heuristische Prüfung

Prüft nicht nur formal, sondern erkennt Wissensfehler:
	•	Widersprüche zwischen Docs
	•	Docs mit großem Einfluss, aber ohne Backlinks
	•	operative Runbooks ohne normative Quelle
	•	Decisions ohne Kontext oder ohne spätere Referenz
	•	Architektur-Dokumente, die nie von Implementierungen oder Runbooks berührt werden
	•	derived Docs mit Quelle, deren Inhalt aber stark divergiert

Diese Ebene ist heuristisch, also Warnung statt harter Fail.

⸻

3. Ideales Datenmodell

Knotenklassen

Mindestens:
	•	doc
	•	generated_doc
	•	implementation
	•	test
	•	workflow
	•	script
	•	contract
	•	runbook
	•	decision
	•	guide
	•	architecture
	•	reference

Besser: doc_type und node_kind trennen.

Beispiel:
	•	node_kind: doc
	•	doc_type: runbook

Pflichtattribute für Docs

Mindestens:
	•	id
	•	title
	•	doc_type
	•	status
	•	canonicality
	•	summary

Sinnvoll zusätzlich:
	•	scope
	•	owner
	•	audience
	•	source
	•	supersedes
	•	deprecated_by
	•	depends_on
	•	verified_by
	•	documented_by
	•	implements
	•	consumes
	•	produces
	•	review_hint
	•	last_semantic_review

Kantentypen

Nicht nur freie Strings, sondern klar definierte Relationstypen:
	•	references
	•	depends_on
	•	derived_from
	•	supersedes
	•	deprecated_by
	•	verified_by
	•	documents
	•	implements
	•	consumes
	•	produces
	•	contradicts
	•	duplicates
	•	requires

Jede Kante sollte definieren:
	•	erlaubte Quelltypen
	•	erlaubte Zieltypen
	•	ob zyklisch erlaubt
	•	ob hart oder weich

Das ist der Unterschied zwischen „Netz“ und „Spinnweben“. Beides klebt, aber nur eines trägt.

⸻

4. Ideale Prüfregeln

4.1 Harter Pflichtblock

Diese Regeln dürfen CI brechen.

Frontmatter-Integrität
	•	jedes prüfpflichtige Doc parsebar
	•	alle Pflichtfelder vorhanden
	•	Feldwerte aus erlaubten Enums

Canonicality-Regeln
	•	canonical darf nicht source erzwingen
	•	derived muss source besitzen
	•	deprecated sollte deprecated_by oder supersedes-Nachfolger haben
	•	generated darf nicht als normative Quelle verwendet werden

Referenz-Existenz
	•	jede Relation zeigt auf existierenden Knoten
	•	Markdown-Links auf vorhandene Dateien/Anker
	•	relative Pfade bleiben im Repo-Scope

Supersession-Integrität
	•	keine Zyklen in supersedes/deprecated_by
	•	keine Selbstreferenz
	•	kein Dokument zugleich canonical und deprecated

Implementation Coverage
	•	jede kritische Implementierung aus Registry ist dokumentiert
	•	jede kritische Implementierung hat Prüfpfad (verified_by)
	•	kein documented_by zeigt auf generierte Dateien

4.2 Weicher Warnblock

Diese Regeln sollten warnen, nicht sofort failen.

Kanonische Einsamkeit
	•	canonical Doc hat keine oder kaum Inbound-Referenzen

Betriebsblindheit
	•	Runbook ohne Link zu Normquelle
	•	Normdokument ohne Link zu Operativpfad

Driftverdacht
	•	viele Implementierungen referenzieren ein Doc, aber das Doc referenziert keine Implementierungen
	•	derived Doc deutlich größer/inhaltlich anders als seine Quelle
	•	decision existiert, aber wird nirgends operationalisiert

Redundanz
	•	mehrere Docs mit sehr ähnlichem Titel/Summary/Scope
	•	mehrere Docs definieren gleiche Begriffe verschieden

⸻

5. Wie die Prüfung ideal abläuft

Phase 1 – Inventarisierung
	•	alle Discovery Roots lesen
	•	Knoten erzeugen
	•	Frontmatter parsebar machen
	•	Markdown-Links extrahieren
	•	Registry-/Policy-/Contract-Dateien einbeziehen

Phase 2 – Graphaufbau
	•	explizite Kanten aus Frontmatter
	•	implizite Kanten aus Markdown-Links
	•	Crosswalk zwischen Datei, Doc-ID und Registry-ID

Phase 3 – Typisierung
	•	Knotentyp und Relationstyp validieren
	•	Normative vs operative vs generierte Sphäre trennen

Phase 4 – Regelengine
	•	harte Regeln
	•	weiche Warnungen
	•	Metriken: orphan rate, canonical reachability, implementation coverage, decision operationalization rate

Phase 5 – Artefakte ausgeben

Ideal sind mehrere Outputs:
	•	docs/_generated/doc-index.md
	•	docs/_generated/backlinks.md
	•	docs/_generated/orphans.md
	•	docs/_generated/supersession-map.md
	•	docs/_generated/impl-index.md
	•	docs/_generated/graph-health.md
	•	docs/_generated/knowledge-gaps.md
	•	docs/_generated/contradictions.md

Und maschinenlesbar:
	•	artifacts/doc-graph.json
	•	artifacts/doc-graph.edges.json
	•	artifacts/doc-graph.issues.json

⸻

6. Was heute meist falsch gemacht wird

Fehlannahme 1

„Wenn Frontmatter da ist, ist die Doku intelligent.“

Falsch.
Frontmatter ohne semantische Regeln ist nur Etikettierung. Ein marmeladiges Glas bleibt ohne Inhalt auch mit schöner Beschriftung leer.

Fehlannahme 2

„Ein Link beweist semantische Beziehung.“

Falsch.
Ein Link kann Deko, Navigation oder echte Ableitung sein. Das muss typisiert werden.

Fehlannahme 3

„Generated Files sind gute Wahrheitsquellen.“

Falsch.
Generated Files sind Ansichten, nicht Wahrheit. Wahrheit liegt in Quellen und Regeln.

Fehlannahme 4

„Alle Docs brauchen dieselbe Strenge.“

Falsch.
Ein Runbook, eine Entscheidung und ein derived Reference-Snapshot brauchen unterschiedliche Regeln.

⸻

7. Ideal für leitstand / kluge repos

Da dein Kontext klar in Richtung „intelligente Repos“ geht, wäre für leitstand diese Zielarchitektur am sinnvollsten:

Minimaler Kern
	•	repo.meta.yaml als Repo-Identität
	•	agent-policy.yaml als Handlungsgrenzen
	•	audit/impl-registry.yaml als Implementierungsindex
	•	Frontmatter in allen relevanten Docs
	•	Guards für Struktur, Relations, Generated Files

Nächste sinnvolle Ausbaustufe
	•	docs/drift.map.yaml als explizite Drift-Regeln
	•	echte semantische Linkprüfung statt Basename-Suche
	•	canonical vs derived vs generated sauber erzwingen
	•	source: Pflicht für derived Docs
	•	documented_by/verified_by gegen Registry prüfen

Reife Ausbaustufe
	•	zentraler Doc-Graph-Builder
	•	JSON-Artefakt des Graphen
	•	Widerspruchs- und Lückenreport
	•	Coverage zwischen Code, Tests, Docs, Runbooks, Decisions

⸻

8. Ideale Regelmatrix

Für canonical
	•	muss in Discovery sichtbar sein
	•	darf nicht von generated Docs abhängen
	•	sollte von mindestens einem anderen kanonischen Einstiegspfad oder Router referenziert werden
	•	darf nicht source: haben, außer als Sonderfall explizit erlaubt

Für derived
	•	muss source: haben
	•	sollte nicht stärker normativ sein als seine Quelle
	•	darf keine neuen Wahrheitsansprüche ohne Kennzeichnung einführen

Für generated
	•	darf nicht manuell editiert werden
	•	darf nie canonicality: canonical tragen
	•	muss reproduzierbar sein
	•	sollte auf Generator/Quelle rückverweisen

Für runbook
	•	sollte auf Norm-/Referenzdokumente verweisen
	•	sollte operative Preconditions nennen
	•	sollte eine Failure-/Recovery-Sektion haben

Für decision
	•	sollte context, decision, consequences enthalten
	•	sollte von Architektur oder Implementierung referenziert werden

⸻

9. Risiko- und Nutzenabschätzung

Nutzenklassen
	•	technisch: weniger Drift, bessere CI-Sicherheit
	•	semantisch: weniger doppelte oder widersprüchliche Aussagen
	•	organisatorisch: neue Mitwirkende und Agenten finden schneller Wahrheitspfade
	•	epistemisch: Unsicherheit und Ableitung werden sichtbar statt versteckt

Risikoklassen
	•	technisch: Bash-Heuristiken werden zu fragilen Pseudoparsern
	•	organisatorisch: Autoren schreiben für Guards statt für Menschen
	•	semantisch: falsch modellierte Relationstypen erzeugen Scheingenauigkeit
	•	sozial: PRs werden durch Doku-Rituale zäh

Folgen

Wenn du zu früh auf „vollständig“ gehst, erstickt der Nutzen unter Pflegeaufwand.
Wenn du zu weich bleibst, entsteht Green-CI-Theater: alles grün, nichts wahr.

⸻

10. Meine Empfehlung nach Prämissencheck

Prämissencheck

Die Empfehlung „vollständige Graph-Prüfung jetzt sofort“ gilt nur, wenn Folgendes wahr ist:
	•	das Repo soll dauerhaft agentisch lesbar sein
	•	Dokumente sind tatsächlich Teil der Systemsteuerung, nicht bloß Beipackzettel
	•	ihr akzeptiert zusätzlichen Metadaten- und Generatoraufwand
	•	CI darf semantische Verstöße blockieren

Fehlt eine dieser Prämissen, ist ein gestuftes Modell besser.

Empfehlung

Die ideale Form ist dreistufig:

Stufe 1 – heute

Harte Guards:
	•	Frontmatter
	•	Pflichtfelder
	•	source-Pflicht für derived
	•	generated-header
	•	Repo-Structure
	•	Registry-Coverage für kritische Implementierungen

Stufe 2 – bald

Semantische Graph-Regeln:
	•	typed edges
	•	echte Markdown-Linktarget-Prüfung
	•	canonical reachability
	•	supersession acyclic
	•	runbook↔norm coupling

Stufe 3 – reif

Graph-Artefakt + Heuristik:
	•	contradictions
	•	knowledge gaps
	•	coverage
	•	influence / centrality / orphan clusters

⸻

11. Alternativpfad, der anders denkt

Nicht „Graph aller Docs“, sondern Graph nur der kanonischen Kernaussagen:
	•	extrahiere nur normative Aussagen
	•	ordne derived/runbook/generated danach unter
	•	prüfe Widerspruch und Operationalisierung auf Aussageebene
	•	Dokumente bleiben sekundär

Vorteil:
	•	weniger Metadatenaufwand
	•	näher an Wahrheit statt an Datei-Topologie

Nachteil:
	•	schwieriger zu implementieren
	•	höhere Heuristiklast

⸻

12. Verdichtete Zielarchitektur

Die ideale vollständige semantische Graph-Prüfung besteht aus:
	1.	Inventar aller relevanten Knoten
	2.	Typisierten Kanten statt bloßer Links
	3.	Harten Integritätsregeln für Wahrheitspfade
	4.	Weichen Heuristiken für Widerspruch, Lücken und Drift
	5.	Maschinenlesbaren Artefakten plus lesbaren Reports
	6.	Trennung von canonical / derived / generated / operational
	7.	Gestufter Einführung, damit das Repo nicht am eigenen Prüfer erstickt

⸻

Essenz

Hebel:
Nicht mehr Frontmatter, sondern bessere Semantik pro Relation.

Entscheidung:
Baue die vollständige Graph-Prüfung als gestuftes System: Struktur → Relationen → Integrität → Heuristik.

Nächste Aktion:
Als nächstes würde ich daraus ein konkretes Soll-Design formulieren:
	•	Frontmatter-Schema
	•	Relationstypen
	•	harte CI-Regeln
	•	weiche Warnregeln
	•	Ausgabeartefakte
	•	Einführungsplan in 3 Phasen

Unsicherheitsgrad: 0.18
Ursachen: Es fehlt der genaue Ist-Zustand aller vorhandenen Doc-Typen, ihrer Relationen und der gewünschten Strenge im CI.

Interpolationsgrad: 0.22
Hauptannahmen: Du willst nicht bloß kosmetische Guard-Skripte, sondern ein wirklich intelligentes Repo-Modell; außerdem, dass leitstand exemplarisch für „kluge repos“ dienen soll.

Kleiner Trost aus der Abteilung ontologischer Hausmeisterei: Ein Repo wird nicht intelligent, weil es viele Dateien über sich selbst schreibt. Es wird intelligent, wenn es merkt, wann es sich selbst widerspricht.