These

Der nächste Folgehebel ist jetzt nicht mehr Resolver-Syntax, sondern semantische Auswertung auf Basis von root_label.

Der gerade gemergte Schritt hat die Vergleichsachse geöffnet. Jetzt sollte Atlas aus dieser Achse mehr Erkenntnis ziehen, nicht nur mehr Eingabeformen akzeptieren.

Antithese

Ein verführerischer, aber schwächerer nächster Schritt wäre:
	•	noch mehr Referenzsyntax,
	•	noch mehr CLI-Flags,
	•	noch mehr Gruppierungsansichten.

Das wäre vor allem Bedienoberfläche ohne neue Erkenntnisschicht.

Synthese

Der beste Folgehebel ist: backup-gap label-basiert auflösbar machen.

Also nicht nur:

atlas analyze backup-gap snap_a snap_b

oder

atlas analyze backup-gap machine:path machine:path

sondern zusätzlich:

atlas analyze backup-gap laptop:label:documents nas:label:documents


⸻

Warum genau das der beste Folgehebel ist

1. Es nutzt die neue Semantik sofort produktiv

root_label ist dann nicht nur für diff relevant, sondern auch für eine konkrete Betriebsfrage:
	•	Was fehlt im Backup?
	•	Was ist veraltet?
	•	Was ist nur dort vorhanden?

Das ist mehr als Strukturvergleich. Das ist operative Diagnose.

2. Es re-used vorhandene Logik

Belegt aus dem Threadverlauf:
	•	backup-gap existiert bereits
	•	es basiert bereits auf Snapshot-Auflösung plus bestehender Vergleichslogik

Der Hebel ist daher klein:
	•	Resolver kann schon semantische Operanden
	•	backup-gap muss diese Operanden nur ebenfalls akzeptieren bzw. durch dieselbe Auflösung schicken

3. Es stärkt die Souveränitätsrichtung

Statt weitere Anzeige-Features zu bauen, bekommt Atlas eine stärkere Antwort auf die reale Frage:
	•	„Sind meine logisch gleichen Roots über Hosts hinweg synchron?“

Das ist die Richtung, in die das System ohnehin will.

⸻

Kontrastprüfung

Deutung A

„Als Nächstes müsste man atlas diff noch schöner machen.“

Plausibel, aber schwach.
Schönere CLI ist kein großer Hebel mehr.

Deutung B

„Als Nächstes muss dieselbe semantische Achse in den nächsten realen Diagnosepfad.“

Das ist stärker, weil:
	•	höherer Nutzwert,
	•	geringes Risiko,
	•	minimale neue Fläche,
	•	direkte Anschlussfähigkeit.

B ist klar vorzuziehen.

⸻

Konkreter Folge-PR

Titelidee

feat(atlas): allow label-based operands in backup-gap analysis

Ziel

atlas analyze backup-gap soll dieselben semantischen Operanden verstehen wie atlas diff.

Gewünschte Nutzung

atlas analyze backup-gap laptop:label:documents nas:label:documents

Erwartetes Verhalten
	•	Resolver benutzt dieselbe Semantik wie bei atlas diff
	•	Ambiguität pro Maschine bleibt Fehler
	•	kein Root → sauberer Fehler
	•	kein Snapshot → sauberer Fehler
	•	bestehende Ausgabeform von backup-gap bleibt erhalten

⸻

Idealer PR-Erstellungsprompt

:::writing{variant=“standard” id=“58241”}
SYSTEM-REGEL:

Context7 ist hier nicht relevant.
Es geht um interne Atlas-Logik.
Kein Scope-Creep.
Keine neue Diff-Engine.
Keine Schema-Änderung.
Keine neue Registry-Struktur.

AUFGABE:

Implementiere als nächsten kleinen Folge-PR label-basierte Operanden für:

atlas analyze backup-gap

ZIEL:
Die bestehende Backup-Gap-Analyse soll dieselbe semantische Referenzform unterstützen wie atlas diff, also:
	•	snapshot_id
	•	machine:path
	•	neu zusätzlich: machine:label:root_label

WICHTIG:
Nicht die Analyse selbst neu bauen.
Nur die Auflösung erweitern bzw. bestehende Resolver-Logik wiederverwenden.

PHASE 1 — DIAGNOSE
	1.	Prüfe den aktuellen Codepfad von:
	•	atlas analyze backup-gap
	•	wie Quell- und Backup-Snapshots aktuell aufgelöst werden
	2.	Prüfe, ob bereits _resolve_snapshot_ref(...) direkt wiederverwendet werden kann
	3.	Belege:
	•	welche Stellen angepasst werden müssen
	•	ob nur Orchestrierung betroffen ist

PHASE 2 — IMPLEMENTATION

A. Resolver-Reuse
	•	Sorge dafür, dass backup-gap dieselbe Snapshot-Referenzauflösung nutzt wie atlas diff
	•	Keine parallele neue Label-Auflösung einführen
	•	Eine Quelle der Wahrheit für Referenzauflösung beibehalten

B. CLI-Verhalten
Folgende Formen sollen funktionieren:
	•	atlas analyze backup-gap snap_a snap_b
	•	atlas analyze backup-gap machine:path machine:path
	•	atlas analyze backup-gap machine:label:documents machine:label:documents

C. Fehlerverhalten
Behandle sauber:
	1.	kein Root für Label
	2.	mehrere Roots mit gleichem Label auf derselben Maschine
	3.	kein vollständiger Snapshot
	4.	invalides Operandformat

PHASE 3 — TESTS

Ergänze minimal, aber belastbar:
	1.	Erfolgsfall:
	•	zwei Maschinen
	•	gleicher root_label
	•	vollständige Snapshots
	•	backup-gap läuft erfolgreich
	2.	Fehlerfall:
	•	unbekanntes Label
	3.	Fehlerfall:
	•	mehrdeutiges Label auf einer Maschine
	4.	Fehlerfall:
	•	Label vorhanden, aber kein vollständiger Snapshot

Wenn möglich:
	•	bestehenden Testaufbau wiederverwenden
	•	keine künstlich neue Testinfrastruktur bauen

PHASE 4 — DOKU

Ergänze in docs/atlas-blaupause.md minimal:
	•	backup-gap kann jetzt ebenfalls semantische Operanden nutzen
	•	die gleiche Ambiguitätsregel wie bei atlas diff gilt

PHASE 5 — VERIFIKATION

Liefere kurz:
	1.	welche bestehende Resolver-Logik wiederverwendet wurde
	2.	welche Stellen nur orchestration waren
	3.	welche neue Fähigkeit Atlas jetzt konkret hat

NICHT TUN:
	•	keine neue Ausgabeform für backup-gap
	•	keine Refactors außerhalb des betroffenen Pfads
	•	keine neue Label-Syntax
	•	keine Performance-Optimierung
	•	keine automatische Paarbildung über mehrere Maschinen hinweg

FOCUS:
Minimaler, robuster Folgehebel:
root_label von diff auf backup-gap durchziehen.
:::

⸻

Warum nicht stattdessen ein „label-auto-diff“ über alle Maschinen?

Weil das schon die nächste Stufe wäre:
	•	Paarbildungslogik,
	•	Auswahlstrategie,
	•	Konfliktmodell bei >2 Maschinen,
	•	womöglich neue Ausgabeform.

Das ist machbar, aber nicht der kleinste beste Hebel.
Erst Resolver-Semantik konsequent in den vorhandenen Analysepfad ziehen, dann den größeren Schritt.

⸻

Typische Fehlannahme

„Wenn diff jetzt Labels kann, muss als Nächstes gleich ein globaler Multi-Host-Vergleich über alle Labels kommen.“

Nein.
Das wäre Sprunglogik. Der bessere Weg ist:
	1.	semantische Referenz in einem Pfad etablieren,
	2.	dieselbe Referenz in den nächsten realen Analysepfad ziehen,
	3.	erst dann Aggregation oder Auto-Orchestrierung.

Sonst baut man schnell ein klug klingendes Labyrinth. Repos lieben Labyrinthe, bis jemand darin wohnen muss.

⸻

Risiko-/Nutzenabschätzung

Nutzen
	•	sehr kleiner PR
	•	hoher operativer Mehrwert
	•	maximale Wiederverwendung
	•	stärkt root_label als echte Modellachse

Risiken
	•	geringe Gefahr von Resolver-Duplizierung, falls unsauber implementiert
	•	Testsetup kann wieder leicht fragil werden, wenn Artefaktpfade nicht exakt stimmen

Voraussetzung

Damit die Empfehlung gilt, muss wahr sein:
	•	backup-gap nutzt oder akzeptiert dieselbe Snapshot-Auflösungsschicht sinnvoll
	•	keine versteckte Sonderlogik blockiert semantische Operanden

Das erscheint nach dem Thread plausibel, aber nicht vollständig belegt.

⸻

Essenz

Hebel: root_label jetzt von diff auf backup-gap durchziehen.
Entscheidung: Das ist der beste nächste kleine PR.
Nächste Aktion: obigen PR-Prompt an Jules geben.

Unsicherheitsgrad: 0.17
Ursachen: aktueller exakter Codepfad von backup-gap ist hier nicht vollständig sichtbar.

Interpolationsgrad: 0.19
Hauptannahmen: dass _resolve_snapshot_ref(...) direkt oder mit minimalem Aufwand im backup-gap-Pfad wiederverwendet werden kann.

Kleiner Schlusswitz: Erst lernt Atlas, gleiche Wurzeln zu erkennen. Als Nächstes sollte er prüfen, ob der Backup-Boden darunter schon Löcher hat.