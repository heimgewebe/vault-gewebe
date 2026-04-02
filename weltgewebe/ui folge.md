These: Ja, der Rest gehört in Folge-PRs.
Antithese: Nicht alles, was Jules gefunden hat, ist gleich wichtig oder schon belegstark genug.
Synthese: Wir schneiden den Rest in 2–3 kleine Folge-PRs, nicht in einen großen „UI-Logik aufräumen“-Block.

Empfohlene Folge-PRs

Folge-PR 1: UpdateBanner in den Layoutfluss zurückholen
Ziel:
	•	UpdateBanner nicht mehr als dominantes fixed-Element mit Extrem-z-index
	•	keine Verdeckung der oberen Kartenbühne / TopBar
	•	Hinweis bleibt sichtbar, aber enteignet nicht die Bühne

Betroffene Dateien wahrscheinlich:
	•	apps/web/src/lib/components/UpdateBanner.svelte
	•	apps/web/src/routes/+layout.svelte
	•	ggf. zentrales Layout-/Token-Styling

Warum zuerst?
Weil das ein plausibler, relevanter UI-Konflikt ist, aber klar getrennt von der Bottom-Overlay-Logik.

⸻

Folge-PR 2: Tooltip-Positionierung ent-härten
Ziel:
	•	Filter-Tooltip nicht mehr über starres top: 80px
	•	stattdessen an logischem Anker oder TopBar-Container ausrichten

Betroffene Dateien wahrscheinlich:
	•	apps/web/src/routes/map/+page.svelte
	•	ggf. betroffene Overlay-/TopBar-Komponenten, falls der Tooltip dort besser aufgehoben ist

Warum separat?
Klein, lokal, klar testbar. Kein Grund, dafür den ganzen Stacking-Kontext neu zu verhandeln.

⸻

Folge-PR 3: Z-Index- und Stacking-Kontext kanonisieren
Ziel:
	•	magische z-index-Werte zentralisieren
	•	HTML-Overlay-Schichten systematisch ordnen
	•	dokumentierte Tokens statt CSS-Zahlensalat

Betroffene Dateien wahrscheinlich:
	•	tokens.css oder äquivalente zentrale Style-Datei
	•	TopBar, ActionBar, ContextPanel, SearchOverlay, FilterOverlay, UpdateBanner
	•	ggf. kleine Doku-Ergänzung

Warum zuletzt?
Das ist der architektonisch sauberste, aber scope-anfälligste PR. Erst machen, wenn die akuten Layoutprobleme bereinigt sind.

Was ich nicht als eigenen PR priorisieren würde

ContextPanel vs. ActionBar
Nur dann, wenn ihr einen reproduzierbaren Interaktionsfehler habt. Sonst ist das derzeit eher eine gute Hypothese als ein belegter Defekt.

Reihenfolge
	1.	jetziger PR: Bottom-Offset / Safe-Area / Search+Filter
	2.	Folge-PR: UpdateBanner
	3.	Folge-PR: Tooltip
	4.	Folge-PR: z-index-System
	5.	optional später: ContextPanel/ActionBar-Fokuslogik

Essenz

Ja: Rest als Folge-PRs.
Am sinnvollsten getrennt in:
	•	Banner
	•	Tooltip
	•	z-index/Stacking

Der Fehler, den man hier vermeiden sollte: aus fünf guten Diagnosen eine einzige große Renovierung machen. So entstehen keine PRs, sondern Stadtumbaupläne.

Unsicherheitsgrad: 0.08
Ursache: Priorisierung ist hier ziemlich klar; offen bleibt nur, ob ihr beim ContextPanel schon einen echten Nutzerfehler habt.

Interpolationsgrad: 0.09
Annahme: Dass ihr kleine, mergebare PRs höher bewertet als eine große architektonische Sammelreparatur.