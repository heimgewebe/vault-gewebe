These: Nach PR1–PR4 ist die UI nicht mehr im Zustand „wir reparieren Grundsätzliches“, sondern im Zustand „wir können gezielt Produktlogik auf eine stabile Interaktionsschicht setzen“. Die nächste sinnvolle Phase ist daher nicht mehr State-Grundlagenarbeit, sondern Ausbau entlang des nun fixierten UI-Vertrags. Die kanonische Zustandsmaschine ist festgezogen, inkl. erlaubter Übergänge, Invarianten und Roadmap-Häkchen für PR1–PR4.  ￼

Antithese: Man könnte jetzt vorschnell in viele Richtungen expandieren: Suche, Filter, Editor, Detaildaten, Animationen, Accessibility, Undo, Collaboration. Das wäre aber genau der Moment, in dem ein sauberer UI-Strang wieder in „alles gleichzeitig“ kippt. Die UI-Blaupause nennt zwar diese Felder bereits, aber nicht alles ist gleich reif. Suche, Filter und Kompositionsablauf sind konzeptionell vorhanden, aber noch nicht gleichermaßen implementierungsnah.

Synthese: Die nächsten Schritte sollten entlang der bestehenden Sinnachsen laufen:
	1.	Komposition vervollständigen, weil der Zustand schon existiert.
	2.	Panel-Inhalte verdichten, weil Fokus-Modi schon existieren.
	3.	Such-/Filterlogik als lokale oder Panel-Modi ergänzen, ohne den globalen State aufzublähen.
	4.	A11y und Interaktionshärtung nachziehen, weil jetzt Verhalten testbar ist.

Ich würde daraus eine PR5–PR9-Linie machen.

⸻

1 Ausgangspunkt: Was jetzt architektonisch feststeht

Die zentrale UI-Entscheidung lautet:

globale Zustände:
navigation
fokus
komposition

mit klaren Übergängen und Verboten. contextPanelOpen ist abgeleitet, nicht eigenständig. selection und kompositionDraft sind invariant an systemState gekoppelt.  ￼

Ebenso ist das Kontextpanel jetzt der einzige Detailraum, und PR2 hat es in spezialisierte Panels zerlegt (NodePanel, AccountPanel, EdgePanel, KompositionPanel). Der Dump zeigt diese Panel-Struktur explizit im Repo-Baum und in den UI-Dateien.

Das heißt:
Die nächste Arbeit sollte nicht wieder den globalen State anfassen, sondern die neuen Räume inhaltlich füllen.

⸻

2 Nächste sinnvolle PR-Serie

PR5 — Kompositionsmodus vom Platzhalter zum echten Editor

Warum das jetzt der beste nächste Schritt ist

Die UI-Blaupause beschreibt den Kompositionsmodus bereits als mehrstufigen Ablauf:

1 Ort wählen
2 Knotentyp wählen
3 Beschreibung
4 veröffentlichen

und sagt explizit: „Kontextpanel wird zum Editor.“

Aktuell ist komposition funktional erst halb eingelöst:
	•	Eintritt funktioniert
	•	Ort ausstehend / Ort gesetzt funktioniert
	•	Longpress liefert Koordinaten
	•	aber der Editor ist noch primär Statusanzeige, kein vollwertiger Eingabeablauf. Das sieht man an KompositionPanel.svelte, das derzeit im Wesentlichen „Ort gesetzt / ausstehend“ rendert. Der Dateibaum und die Panel-Zerlegung belegen diesen Stand.  ￼

Ziel

KompositionPanel zu einem echten, kleinen Wizard machen.

Inhalt
	•	Schrittindikator im Panel
	•	Knotentyp wählen
	•	Beschreibung/Titel erfassen
	•	Submit/Cancel sauber anbinden
	•	nach erfolgreichem Submit: komposition -> navigation oder besser komposition -> fokus(neuer Knoten)

Architektonische Leitplanke

Kein neuer globaler Zustand.
Die State-Machine sagt ausdrücklich: neue Zustände nur, wenn lokaler oder Panel-Submodus nicht reicht. Für „Schritt 2/3/4 des Editors“ reicht lokaler Panel-Zustand.

Risiko
	•	Formularlogik kann schnell in Validierungs-/API-/Fehlerzustände ausfransen.
	•	Typische Fehlannahme: dafür brauche man sofort weitere globale States. Nein.

Empfehlung

PR5 = KompositionPanel lokal erweitern, nicht globale Machine erweitern.

⸻

PR6 — Fokus-Panels inhaltlich von Mock zu echter Domänenoberfläche ziehen

Warum

Die Fokus-Panels sind strukturell da, aber derzeit noch eher Platzhalter:
	•	NodePanel: Tabs vorhanden, Inhalte noch generisch
	•	AccountPanel: Tabs vorhanden, Inhalte noch generisch
	•	EdgePanel: sehr schlank

Das Repo zeigt diese Panel-Dateien als eigene Komponenten; die Blaupause benennt ihre inhaltlichen Rollen bereits ziemlich klar.

Ziel

Die Panels sollen nicht nur Zustand demonstrieren, sondern Domänenmodell lesen.

Inhalt
	•	NodePanel
	•	Übersicht: Beschreibung, Beteiligte, Aktivität
	•	Gespräch: echte Gesprächs- oder Nachrichtenliste
	•	Anträge: Vorschläge/Abstimmungen
	•	Verlauf: Timeline
	•	AccountPanel
	•	Profil: Kompetenzen, Interessen, Güter
	•	Aktivität: Beiträge / Teilnahmen
	•	Knoten: verknüpfte Knoten
	•	EdgePanel
	•	Quelle, Ziel, Typ, Zeitlichkeit, beteiligte Garnrollen

Alternative Sinnachse

Man könnte denken, erst Suche/Filter sei wichtiger.
Ich würde das anders ordnen: Ohne starke Fokus-Panels bleibt Suche nur ein hübscher Weg zu dünnen Inhalten.

Empfehlung

PR6 = Datenaufladung der Panels.

⸻

PR7 — Search und Filter als Panel-/lokale Modi, nicht als vierter Global-State

Warum

Die UI-Blaupause nennt Suche und Filter explizit als Oberflächenelemente. Suche arbeitet „gewebeweit“ und zeigt Ergebnisse auf Karte und im Kontextpanel.

Die State-Machine sagt aber ebenfalls:
	•	search -> Panelmodus
	•	filter -> Panelmodus
	•	nur wirklich globale Dinge werden globale States.

Ziel

Suche und Filter einziehen, ohne navigation/fokus/komposition aufzubrechen.

Inhalt
	•	Suchfeld in ActionBar
	•	Suchergebnisse im Kontextpanel
	•	Treffer markieren auf Karte
	•	Filter lokal oder im Panel halten
	•	globaler systemState bleibt unverändert

Typische Fehlannahme

„Suche ist ein eigener globaler Screen.“
Nicht hier. Das Modell sagt bereits: Suche ist ein Modus des Detailraums, nicht eine neue Welt.

Empfehlung

PR7 = Search/Filter contracts-first, aber state-light.

⸻

PR8 — Interaktionshärtung und A11y

Warum

PR3 und PR4 haben Interaktionslogik testbar gemacht. Genau jetzt ist der richtige Zeitpunkt, Accessibility und Keyboard-Verhalten sauber nachzuziehen.

Der Fokus-Restore wurde bereits robuster gemacht, und das ist ein starker Hinweis darauf, dass die UI nun reif für bewusstes A11y-Finishing ist. Der Map-Code nutzt bereits tick() für Fokus-Restore nach Panel-Schließung.

Inhalt
	•	Keyboard-Navigation für Panel-Tabs
	•	Escape-Verhalten:
	•	fokus -> navigation
	•	komposition -> confirm cancel oder definierte Abbruchlogik
	•	Screenreader-Rollen / aria-* für Tabs, Panel, Toolbar
	•	Fokusmanagement bei Markerwechsel
	•	ggf. Touch-/Mouse-Parität systematisieren

Nutzen
	•	reduziert zukünftige UX-Bugs
	•	verbessert Testbarkeit weiter
	•	macht aus „funktioniert“ eher „tragfähig“

Empfehlung

PR8 = A11y / keyboard / focus discipline.

⸻

PR9 — Map-Layer und Eventlogik aus routes/map/+page.svelte weiter entlasten

Warum

apps/web/src/routes/map/+page.svelte ist weiterhin ein zentraler Knotenpunkt. PR3 hat ihn bereits verbessert, aber die Eventlogik bleibt dort dicht.

Ziel

Nicht sofort große Refaktorisierung, sondern gezielte Entlastung.

Inhalt
	•	Longpress-/Pointer-Logik in kleine Hilfsfunktionen oder Hook-Modul
	•	Marker-/Selection-Übergänge entkoppeln
	•	stabile Leerklick-/Hit-Test-Utilities
	•	evtl. Map-Interaction-Service

Aber Vorsicht

Das ist kein sofortiger Schritt, wenn PR5–PR8 inhaltlich dringender sind.
Es ist eher die nächste Strukturpflege, wenn Feature-Druck steigt.

Empfehlung

PR9 nur, wenn +page.svelte wieder zu schwer wird.

⸻

3 Was ich nicht als nächsten Schritt priorisieren würde

Nicht jetzt: vierter globaler Zustand

Die State-Machine ist gerade erst stabilisiert.
Ein vierter Zustand wäre nur legitim, wenn ein Problem nicht lokal/panel-intern lösbar ist. Davon sehe ich aktuell nichts Belegtes.

Nicht jetzt: kosmetische CSS-Abstraktion

NodePanel und AccountPanel teilen Tab-Muster. Ja.
Aber Stilabstraktion ist gerade kein Engpass.

Nicht jetzt: riesige Infra-/Build-Umbauten im UI-Zweig

Das Repo hat ohnehin schon viel Guard-/Workflow-Infrastruktur: CI, web-e2e, docs-guard, WGX-Workflows, deploy-check usw.
Die UI profitiert jetzt mehr von Domänen- und Verhaltensfortschritt als von noch mehr Meta-Schrauben.

⸻

4 Konkreter Fahrplan, den ich empfehlen würde

Empfohlene Reihenfolge

PR5  Komposition vervollständigen
PR6  Fokus-Panels mit echten Daten füllen
PR7  Suche/Filter als Panel-Modi einziehen
PR8  Accessibility + Keyboard + Fokusdisziplin
PR9  Map-Eventlogik weiter modularisieren


⸻

5 Warum gerade diese Reihenfolge?

PR5 zuerst

Weil komposition schon global existiert.
Ein globaler Zustand ohne vollwertige Produktbedeutung ist architektonisch „halb warm“. Das zuerst zu vollenden ist sinnvoll.

PR6 danach

Weil Fokus der zweite große Zustand ist und die Panels schon da sind.
Suche ohne starke Fokusansicht ist nur ein Trichter in halbleere Inhalte.

PR7 dann

Weil Suche/Filter sehr wertvoll sind, aber ihre beste Wirkung erst entsteht, wenn Fokus-Panels gehaltvoll sind.

PR8 danach

Weil dann klarer ist, welches Verhalten tatsächlich dauerhaft bleibt.

PR9 zuletzt

Weil Refactoring auf stabilisierte Verhaltensrealität sinnvoller ist als auf Zwischenzustände.

⸻

6 Repo-bezogene Einordnung

Repo-Rollen-Zuordnung

Betroffene Hauptbereiche im aktuellen UI-Strang:
	•	apps/web/src/lib/stores/uiView.ts
	•	apps/web/src/lib/components/ContextPanel.svelte
	•	apps/web/src/lib/components/panels/*
	•	apps/web/src/routes/map/+page.svelte
	•	apps/web/tests/map-interaction.spec.ts
	•	docs/blueprints/ui-state-machine.md
	•	flankierend docs/blueprints/ui-blaupause.md

Contracts-first-Hinweis

Noch fehlt ein expliziter UI-Contract für:
	•	Kompositionsform
	•	Suchergebnisdarstellung
	•	Panel-Datenmodelle

X fehlt, nötig für Y:
Ein formaler UI- oder View-Contract fehlt, nötig für wirklich harte PR5/PR6-Absicherung.
Noch geht es ohne, aber sobald echte API-Daten und Editor-Submit dazukommen, wird ein klarer Contract wertvoll.

⸻

7 Risiko-/Nutzen-Abschätzung

PR5 Komposition

Nutzen: sehr hoch
Risiko: mittel
Folgen: macht globalen Zustand produktiv

PR6 Fokus-Panels

Nutzen: sehr hoch
Risiko: mittel
Folgen: UI wird semantisch gehaltvoll

PR7 Suche/Filter

Nutzen: hoch
Risiko: mittel bis hoch
Folgen: kann State-Drift erzeugen, wenn zu global gedacht

PR8 A11y

Nutzen: mittel bis hoch
Risiko: gering
Folgen: reduziert spätere UX-Schulden

PR9 Refactor Map

Nutzen: mittel
Risiko: mittel
Folgen: vor allem Strukturgewinn, weniger unmittelbarer Produktgewinn

⸻

8 Belegt / plausibel / spekulativ

Belegt
	•	Die UI kennt drei globale Zustände.  ￼
	•	PR1–PR4 sind im Blueprint als erfüllt markiert.
	•	Panel-Zerlegung in NodePanel, AccountPanel, EdgePanel, KompositionPanel ist im Repo vorhanden.  ￼
	•	map-interaction.spec.ts testet Initialzustand, Fokus, Markerwechsel, Komposition, Longpress und Kompositionsschutz.

Plausibel
	•	Der größte direkte Produkthebel liegt nun in Komposition + Panel-Inhalten.
	•	Suche/Filter sollten ohne vierten Global-State umgesetzt werden.

Spekulativ
	•	Ob ihr für PR5/PR6 bereits genug echte Backend-Daten im API-Pfad habt, um Panels sofort voll zu befüllen. Das müsste am API-Stand konkret gegengeprüft werden.

⸻

9 Für Dummies

Gerade habt ihr das Gerüst und die Verkehrsregeln der UI fertig gemacht.
Jetzt ist der richtige nächste Schritt nicht, neue Straßen zu zeichnen.
Jetzt sollte man die vorhandenen Straßen endlich zu Orten machen, an denen etwas passiert:
	•	Komposition soll wirklich etwas erstellen.
	•	Fokus-Panels sollen echte Inhalte zeigen.
	•	Suche soll nicht nur finden, sondern in sinnvolle Details führen.

Etymologie:
Komposition kommt von lateinisch componere = „zusammensetzen“.
Der Zustand heißt also schon: „Hier wird etwas zusammengesetzt.“
Wenn dort nur „Ort gesetzt“ steht, ist das semantisch noch eher Vorspiel als Komposition. Die UI flirtet schon mit dem Editor, aber sie lebt noch getrennt von ihm.

⸻

10 Meine konkrete Empfehlung

Wenn du direkt weiterbauen willst, würde ich als nächstes PR5 so schneiden:

PR5 — KompositionEditor
	•	KompositionPanel mehrstufig machen
	•	Knotentyp + Beschreibung + Submit
	•	Submit-Erfolg führt in fokus des neuen Knotens
	•	Tests ergänzen:
	•	submit success
	•	cancel flow
	•	validation errors

Das ist der stärkste nächste Hebel.

⸻

11 Unsicherheitsgrad / Interpolationsgrad

Unsicherheitsgrad: 0.18
Ursachen: API-/Datenreife für echte Panel-Inhalte und Editor-Submit ist aus dem hier fokussierten UI-Stand nicht vollständig belegt.

Interpolationsgrad: 0.21
Hauptquellen: Priorisierung von Produktlogik über Refactoring basiert teils auf plausibler Entwicklungsökonomie, nicht nur auf expliziter Repo-Aussage.

⸻

12 Essenz

Hebel: Jetzt nicht wieder State-Grundlagen anfassen, sondern die bereits stabilisierten Zustände in echte Produktoberflächen übersetzen.
Entscheidung: PR5 = Kompositionseditor, danach PR6 = Fokus-Panels mit echten Daten, erst danach Suche/Filter.
Nächste Aktion: Ich kann dir daraus direkt eine konkrete PR5-Blaupause mit Files, Scope, Tests und Guard-Kriterien formulieren.