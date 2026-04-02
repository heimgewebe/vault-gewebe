These:
Ja, ein Folge-PR ist sinnvoll. Der aktuelle Stand macht das Repo maschinenlesbar. Der nächste sinnvolle Schritt wäre, es semantisch selbstordnender zu machen.

Antithese:
Ein Folge-PR kann leicht ins Meta-Spiel kippen: zu viele Reports, zu viele Relationen, zu viel „Doku über Doku“. Dann verliert das Repo an Klarheit statt zu gewinnen.

Synthese:
Der Folge-PR sollte eng bleiben und genau drei Dinge tun:
	1.	backlinks nicht nur aus Markdown-Links, sondern auch aus related_docs ableiten
	2.	einen Report für schwach eingebundene Dokumente ergänzen
	3.	die Aussagekraft von orphans gegen die Dominanz von docs/index.md absichern

Also: v1.1 = semantische Selbstverlinkung, nicht Tooling-Expansion.

⸻

Anweisung für den Agenten

:::writing{variant=“standard” id=“56124”}
SYSTEM-REGEL:
Bei jeder Nutzung externer Libraries, Frameworks oder APIs:
→ ZUERST Context7 verwenden, um die aktuelle Dokumentation zu laden.
→ DANN mit dem aktuellen Repo-Zustand vergleichen.
→ ERST DANACH antworten.
Die Antwort MUSS:
– Context7-Erkenntnisse explizit einbeziehen
– Abweichungen oder Risiken im Repo benennen.
Wenn Context7 nicht genutzt wird → begründen.

Context7 NICHT verwenden für:
– Domänenlogik
– Architekturentscheidungen
– UI-Philosophie

Immer unterscheiden:
– Dokumentations-Wahrheit (Context7)
– System-Wahrheit (unser Repo)

Keine Codeänderung ohne klare Diagnose.

⸻

AUFGABE

Arbeite einen kleinen Folge-PR v1.1 für spannungsatlas aus, der das bestehende Intelligent-Repo-Fundament semantisch stärker selbstverlinkend macht.

Wichtig:
	•	Kein Overengineering
	•	Keine CI
	•	Keine neuen externen Dependencies
	•	Keine Volltextsuche
	•	Keine Graphdatenbank
	•	Keine neue Repo-Governance
	•	Nur gezielte Verbesserung der Aussagekraft der bestehenden generated reports

⸻

ZIEL DES FOLGE-PR

Der aktuelle Stand ist bereits:
	•	maschinenlesbar
	•	navigierbar
	•	validierbar

Der Folge-PR soll jetzt die Schwäche beheben, dass:
	•	backlinks.md derzeit hauptsächlich Markdown-Links sieht
	•	orphans.md durch docs/index.md zu schnell „alles okay“ meldet
	•	semantische Relationen aus Frontmatter (related_docs) noch nicht als Repo-Wissen genutzt werden

Der PR soll daher die Repo-Selbstordnung inhaltlich aussagekräftiger, aber nicht wesentlich schwerer machen.

⸻

DIAGNOSE-PHASE (PFLICHT)

Bevor du patchst, liefere:

1. Belegter Ist-Zustand

Prüfe konkret:
	•	wie generate_backlinks.py derzeit Links sammelt
	•	wie generate_orphans.py derzeit Orphans bestimmt
	•	welche Dokumente aktuell related_docs im Frontmatter tragen
	•	ob docs/index.md aktuell als dominanter Link-Hub wirkt

2. Maximal 3 Hypothesen

Formuliere höchstens drei Hypothesen, z. B.:
	•	Backlinks unterschätzen semantische Relationen
	•	Orphan-Erkennung ist durch den Index zu großzügig
	•	Ein zusätzlicher Report für „nur index-verlinkt“ erhöht Erkenntnis deutlich

3. Minimaler Beweisplan

2–5 konkrete Checks, z. B.:
	•	grep/rg auf related_docs
	•	Lauf der Generatoren vorher/nachher
	•	Vergleich der Reports

4. Stop-Kriterium

Welche Ausgaben/Artefakte müssen sichtbar sein, damit der PR gelungen ist?

Ohne diese Diagnose: kein Patch.

⸻

PATCH-ZIELE

1. generate_backlinks.py semantisch erweitern

Ziel

Backlinks sollen nicht nur Markdown-Links, sondern auch Frontmatter-Relationen berücksichtigen.

Regeln
	•	Werte aus related_docs sollen als semantische Verweise in backlinks.md erscheinen
	•	Markdown-Links und related_docs sollen unterscheidbar bleiben
	•	keine still erfundenen Relationen
	•	nur tatsächlich vorhandene Dokument-IDs auflösen
	•	wenn related_docs auf unbekannte IDs zeigt: sauber markieren, nicht ignorieren

Erwartetes Ergebnis

backlinks.md soll nicht nur „wer verlinkt wen im Text“ zeigen, sondern auch „wer nennt wen als inhaltlich verwandt“.

Darstellungsvorschlag

Pro Ziel dokumentieren:
	•	Verwiesen von (Markdown-Links)
	•	Genannt in related_docs von

Wenn beides leer ist, nichts erfinden.

⸻

2. generate_orphans.py erkenntnisschärfer machen

Problem

Ein globaler Index kann dazu führen, dass fast nichts mehr als orphan gilt, obwohl Dokumente nur oberflächlich eingebunden sind.

Ziel

Orphan-Erkennung soll ehrlicher werden.

Regeln
	•	docs/index.md darf weiterhin als legitimer Linkgeber gelten
	•	aber Dokumente, die nur von docs/index.md referenziert werden, sollen nicht einfach als voll integriert gelten
	•	dafür entweder:
	•	bestehenden orphans.md erweitern
	•	oder besser: neuen ergänzenden Report einführen

Bevorzugte Lösung

Erzeuge einen zusätzlichen generated report, z. B.:
	•	docs/_generated/index-only.md
oder
	•	docs/_generated/weak-links.md

Dieser Report soll Dokumente zeigen, die:
	•	nicht wirklich verwaist sind,
	•	aber nur über Navigation, nicht über inhaltliche Dokumente eingebunden sind.

Wichtige Trennung

Unterscheide:
	•	echte Orphans
	•	nur navigativ eingebundene Dokumente
	•	inhaltlich eingebundene Dokumente

⸻

3. docs/index.md nicht bestrafen, aber relativieren

Ziel

docs/index.md bleibt legitimes Navigationsdokument, soll aber nicht alle Selbstordnungsmetriken dominieren.

Regeln
	•	docs/index.md nicht aus dem Repo-Modell entfernen
	•	aber in Generatorlogik explizit als Navigationsquelle behandeln
	•	Navigation ≠ inhaltliche Einbettung

Wenn nötig, nutze canonicality: navigation bzw. doc_type: navigation aus dem Frontmatter als Signal.

⸻

4. docs/index.md um generated reports ergänzen (falls neuer Report entsteht)

Wenn du einen neuen generated report einführst, ergänze docs/index.md sauber in der Sektion „Generierte Übersichten“.

Nur wenn tatsächlich neuer Report angelegt wird.

⸻

ERLAUBTE DATEIÄNDERUNGEN

Du darfst voraussichtlich ändern oder ergänzen:
	•	scripts/docmeta/generate_backlinks.py
	•	scripts/docmeta/generate_orphans.py
	•	ggf. neuer Generator:
	•	scripts/docmeta/generate_index_only.py
	•	oder scripts/docmeta/generate_weak_links.py
	•	ggf. neuer generated report:
	•	docs/_generated/index-only.md
	•	oder docs/_generated/weak-links.md
	•	docs/index.md nur falls neuer Report aufgenommen werden muss

Optional:
	•	kleine Ergänzung in AGENTS.md oder agent-policy.yaml, nur wenn die Logik „Navigation ≠ inhaltliche Einbettung“ dort klar und knapp verankert werden muss

Nicht anfassen ohne zwingenden Grund:
	•	MASTERPLAN.md
	•	Produktinhalte
	•	UX-/ICF-Dokumente
	•	Schema, außer es ist wirklich für den Patch nötig

⸻

NICHT TUN
	•	keine CI-Workflows bauen
	•	keine neuen Dependencies einführen
	•	keine komplette Frontmatter-Architektur umbauen
	•	keine Massenänderungen an Dokumenten
	•	keine automatische Relationserfindung
	•	keine stillen Defaults für unbekannte related_docs
	•	keine komplexe Scoring-Logik
	•	keinen „Semantik-Graphen“ aufblasen

⸻

ERWARTETER ERGEBNISZUSTAND

Nach dem Patch soll gelten:
	1.	backlinks.md ist semantisch informativer
	2.	orphans.md ist ehrlicher
	3.	es gibt Sichtbarkeit für Dokumente, die nur über Navigation eingebunden sind
	4.	das Repo bleibt schlank
	5.	kein Eindruck künstlicher Intelligenz durch künstliche Komplexität

⸻

VERIFIKATION

Führe konkret aus und berichte:
	•	Generatoren laufen erfolgreich
	•	backlinks.md zeigt sowohl Markdown-Backlinks als auch related_docs-Bezüge
	•	orphans.md bleibt korrekt
	•	neuer Zusatzreport (falls eingeführt) wird erzeugt
	•	docs/index.md ist konsistent
	•	keine neuen Dependencies
	•	keine unbeabsichtigten Änderungen an Produktdokumenten

⸻

ABSCHLUSSFORMAT

Antworte am Ende in dieser Struktur:
	1.	Diagnose
	2.	Umsetzung
	3.	Warum diese Änderung v1.1 sinnvoll ist
	4.	Was bewusst nicht gemacht wurde
	5.	Verifikation
	6.	PR-Empfehlung / Titelvorschlag

Titelvorschlag-Richtung:
docs(meta): strengthen semantic self-linking and orphan diagnostics

⸻

ENTSCHEIDUNGSLEITPLANKEN

Wenn du während der Arbeit merkst:
	•	dass ein neuer Report kaum Mehrwert bringt,
	•	oder dass die Änderung die Repo-Komplexität unnötig erhöht,

dann reduziere den Scope und begründe das.

Präferenz:
Weniger Mechanik, mehr Aussagekraft.

STOP-Kriterium:
Der Folge-PR ist fertig, wenn das Repo nicht nur ordentlicher aussieht, sondern wirklich besser sagen kann, welche Dokumente inhaltlich verbunden sind und welche nur über Navigation zusammengehalten werden.
:::

⸻

Kurzbegründung für diesen Folge-PR

Der jetzige Stand ist gut, aber noch etwas „bibliothekarisch“:
	•	alles katalogisiert,
	•	aber inhaltliche Nähe noch zu schwach modelliert.

Dieser v1.1-Schritt würde aus
„Repo mit Index“
eher ein
„Repo mit schwacher Selbstwahrnehmung“
machen.

Das ist die richtige nächste Stufe.

Unsicherheitsgrad: 0.11
Ursachen: Es ist noch offen, ob ein Zusatzreport wirklich der beste Hebel ist oder ob die Erweiterung von orphans.md allein reicht.

Interpolationsgrad: 0.17
Hauptquellen: Ich leite die sinnvolle Folgearbeit aus den sichtbaren Schwächen der aktuellen Generatoren ab.

Humor mit Restfunktion:
Im Moment weiß das Repo, wo seine Bücher stehen. Im Folge-PR könnte es endlich auch merken, welche Bücher nur im Katalog auftauchen und welche sich tatsächlich gegenseitig lesen.