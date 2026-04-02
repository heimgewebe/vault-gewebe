These: Für jetzt würde ich nicht sofort eine eigene Tile-Pipeline bauen. Ich würde eine detaillierte Vektor-Basemap mit MapLibre GL JS einsetzen, weil MapLibre interaktive Karten aus Vector Tiles rendert, Styles per JSON steuert und damit genau die richtige technische Form für euren Kartenkern ist.  ￼
Im Repo ist bereits eine MapLibre-basierte Kartenstruktur vorhanden; die Karte läuft also nicht auf Null, sondern auf einer existierenden Basis auf.  ￼

Antithese: Sofort auf „eigene Hamburg-PMTiles + eigener Stil + Asset-Hosting + Build-Pipeline“ zu gehen, wäre technisch schön, aber für jetzt wahrscheinlich zu schwergewichtig. PMTiles ist zwar genau dafür geeignet — browserseitiges Lesen mit MapLibre, on-demand per HTTP Range Requests, also sehr passend für spätere Selbsthostung — aber als erster Schritt bindet es unnötig Infrastrukturenergie.  ￼

Synthese: Die ideale Lösung für jetzt ist:

MapLibre GL JS
+ hochwertige externe Vektor-Basemap
+ eigener dünner Weltgewebe-Overlay-Layer
+ klare Austauschbarkeit der Basemap

Und perspektivisch:

MapLibre GL JS
+ eigene PMTiles-Basemap
+ eigener Style
+ gleicher Overlay-Stack

Die Architektur muss also jetzt schon PMTiles-ready, aber noch nicht PMTiles-pflichtig sein.

⸻

Ideale Blaupause für jetzt

1. Zielentscheidung

Jetzt

Renderer: MapLibre GL JS
Basemap: Protomaps Basemap für MapLibre
Overlay: eigene Weltgewebe-Layer auf derselben Karte

Warum genau das?
	•	MapLibre GL JS rendert interaktive Karten aus Vector Tiles im Browser.  ￼
	•	Ein MapLibre-Style definiert visuelle Erscheinung, Layer-Reihenfolge und Darstellungslogik zentral über ein JSON-Dokument.  ￼
	•	PMTiles ist für MapLibre gedacht, sowohl für thematische Overlays als auch Basemaps.  ￼
	•	Protomaps beschreibt für vollständige Basemaps mit MapLibre ausdrücklich, dass Style, Tileset sowie Glyph-/Sprite-Assets zusammenspielen.  ￼

Perspektivisch

Lokale PMTiles-Basemap statt externer Basemap-URL.

Warum perspektivisch?
	•	PMTiles ist selbsthostbar und offlinefähig.  ￼
	•	Planetiler kann Tilesets als MBTiles oder PMTiles erzeugen; Protomaps Basemaps selbst bauen auf einer Planetiler-Profile-Pipeline auf.  ￼

⸻

2. Produktentscheidung

Für Hamburg jetzt

Die Karte soll wirklich lesbar sein:
	•	Straßen
	•	Gewässer
	•	Parks
	•	Gebäude bzw. urbane Struktur
	•	Stadtteil-/Ortsnamen
	•	ruhiger Stil, damit Weltgewebe-Objekte sichtbar bleiben

Das ist wichtig, weil laut Repo die Karte die primäre Bühne ist und Knoten, Fäden, Aktivität und räumliche Struktur zeigen soll.  ￼

Deshalb stilistisch:

hell, ruhig, informationsreich, aber nicht dominant

Nicht ideal wären:
	•	touristische, bunte, POI-überladene Karten
	•	starke 3D-/Relief-Schwere
	•	zu dunkle Karten mit geringer Layer-Trennung

⸻

3. Technische Architektur jetzt

3.1 Basemap-Schicht

Eine einzelne Basemap-Quelle, austauschbar hinter einer kleinen Konfigurationsschicht:

type BasemapConfig = {
  styleUrl: string
  attribution?: string
  kind: 'remote-style' | 'local-style'
}

Jetzt: remote-style
Später: local-style

Prinzip

Die App darf nirgendwo sonst wissen, ob die Karte gerade:
	•	externen Stil lädt
	•	lokale PMTiles lädt
	•	eigenen Style nutzt

Die Basemap muss also schon heute gekapselt werden.

⸻

3.2 Weltgewebe-Overlay-Schichten

Unabhängig von der Basemap:
	•	Knoten
	•	Garnrollen/Accounts
	•	Fäden
	•	Aktivität/Fokus/Komposition

Die UI-Blaupause verlangt genau diese Weltbühne.  ￼

Regel

Die Overlay-Logik darf nicht an einen spezifischen Basemap-Anbieter gekoppelt sein.

⸻

3.3 Karten-Assets

Auch wenn ihr jetzt extern startet, die spätere Architektur muss schon diese Trennung vorsehen:

Basemap Style
Basemap Tiles
Glyphs
Sprites
Weltgewebe Overlay Sources
Weltgewebe Overlay Layers

Protomaps weist explizit darauf hin, dass für eine vollständige Basemap nicht nur Style und Tileset, sondern auch Glyph- und Sprite-Assets nötig sind.  ￼

⸻

4. Dateischnitt für jetzt

Auf Basis des Repo-Stands würde ich jetzt diese Zielstruktur wählen:

apps/web/src/lib/map/
  basemap.ts
  mapStyle.ts
  overlay/
    nodes.ts
    edges.ts
    activity.ts
  config/
    basemap.current.ts

Und die bestehende MapLibre-Integration aus dem Repo als Träger weiterverwenden. Im Dump ist die MapLibre-Struktur bereits vorhanden, also muss man das nicht neu erfinden.  ￼

Sinn der Dateien
	•	basemap.ts
Kapselt Style-URL / Style-Ladung / Basemap-Modus
	•	mapStyle.ts
Fügt Overlay-Layer in definierter Reihenfolge ein
	•	overlay/nodes.ts, overlay/edges.ts, overlay/activity.ts
Saubere Layertrennung
	•	basemap.current.ts
Der einzige Ort, an dem „welche Karte verwenden wir gerade?“ entschieden wird

⸻

5. Konkreter Umsetzungsplan für jetzt

Schritt 1 — Stub-Basemap ersetzen

Die bestehende Demo-Map (demotiles.maplibre.org) ersetzen durch eine echte, detaillierte Vektor-Basemap.

Stop-Kriterium:
Hamburg ist klar lesbar mit:
	•	Straßennetz
	•	Wasser
	•	urbaner Struktur
	•	Labels

⸻

Schritt 2 — Overlay-Reihenfolge festziehen

Reihenfolge definieren:

Basemap
↓
Fäden
↓
Knoten / Accounts
↓
Fokus-Highlights
↓
Kompositionshilfen

Damit die Karte zwar Orientierung gibt, aber nicht die Gewebeobjekte verschluckt.

⸻

Schritt 3 — Hamburg als Default-Fokus setzen

Für die Entwicklungsphase:
	•	initialer Center auf Hamburg
	•	sinnvoller Initialzoom für urbane Orientierung

Stop-Kriterium:
Ein normaler Nutzer erkennt Hamburg direkt als Stadtkarte und kann Objekte sinnvoll verorten.

⸻

Schritt 4 — Leichte Stilberuhigung

Wenn die gewählte Basemap zu dominant ist:
	•	lieber ruhiger Style
	•	notfalls leichter eigener Stil-Fork
	•	keine tiefe Style-Engine-Arbeit jetzt, nur minimale Lesbarkeitsoptimierung

⸻

Schritt 5 — Austauschbarkeit vorbereiten

Schon jetzt die Basemap so kapseln, dass später nur Folgendes getauscht wird:

styleUrl: 'https://...'

gegen

styleUrl: '/map/styles/hamburg.json'

oder lokale PMTiles-gebundene Styles.

Das ist der wichtigste Zukunftsschutz.

⸻

6. Was ich jetzt nicht machen würde

Nicht jetzt: eigene PMTiles-Pipeline

Obwohl sie perspektivisch ideal ist.

Warum nicht jetzt?
	•	baut Nebenkriegsschauplatz
	•	blockiert UI-Fortschritt
	•	braucht zusätzlich Tileset-Build, Assets, Style-Assets, Hosting

Nicht jetzt: eigener Vollstil von Null

MapLibre-Styles sind mächtig, aber das Style-System ist ein eigenes kleines Universum. Der Style definiert, was gezeichnet wird, in welcher Reihenfolge und wie.  ￼
Das ist für jetzt zu teuer, wenn dein Ziel primär eine ordentliche Hamburg-Karte ist.

Nicht jetzt: Rasterkarte

Ihr seid schon im Vector-Tile-/MapLibre-Ökosystem. Zurück auf Raster wäre architektonisch ein Rückschritt.

⸻

7. Perspektive: ideale Endstufe

Wenn die UI weitersteht, würde ich perspektivisch auf Folgendes zielen:

MapLibre GL JS
+ eigener lokaler PMTiles-Hamburg-Ausschnitt
+ später Norddeutschland / Deutschland / europaweiter Ausschnitt
+ eigener, ruhiger Weltgewebe-Stil
+ identischer Overlay-Stack

Warum das die ideale Endstufe ist:
	•	volle Kontrolle
	•	offline-/heimserver-fähig
	•	keine externe Tile-Abhängigkeit
	•	gleiche UI-Logik bleibt bestehen

Planetiler ist dafür ein passender Kandidat, weil es MBTiles oder PMTiles ausgeben kann; Protomaps Basemaps selbst basieren auf einer Planetiler-gestützten Build-Pipeline.  ￼

⸻

8. Konkrete Empfehlung in einem Satz

Jetzt

MapLibre + hochwertige externe Protomaps-Basemap + gekapselte Basemap-Konfiguration

Später

gleiche Architektur, aber lokale Hamburg-PMTiles + eigener Stil

⸻

9. Prämissencheck

Diese Empfehlung gilt, wenn folgende Prämissen stimmen:
	•	du willst jetzt schnell eine wirklich brauchbare, detaillierte Hamburg-Karte
	•	du willst perspektivisch unabhängig werden
	•	du willst keine Karteninfrastruktur vorziehen, bevor die Produktoberfläche reif genug ist

Wenn diese Prämissen falsch wären — etwa weil absolute Offlinefähigkeit sofort Pflicht ist — dann würde ich direkt PMTiles lokal bauen.
Aber für normalen Vorwärtsgang ist das nicht die ideale Reihenfolge.

⸻

10. Belegt / plausibel / spekulativ

Belegt
	•	MapLibre GL JS rendert interaktive Karten aus Vector Tiles im Browser.  ￼
	•	Ein MapLibre-Style steuert Erscheinung und Layer-Reihenfolge per JSON.  ￼
	•	PMTiles ist für MapLibre geeignet und kann direkt im Browser gelesen werden.  ￼
	•	Protomaps Basemaps liefern eine Planetiler/PMTiles-basierte Basemap-Architektur.  ￼
	•	Im Repo ist bereits eine MapLibre-Kartenstruktur vorhanden.  ￼
	•	Laut Blaupause ist die Karte die primäre Bühne und soll Knoten, Fäden, Aktivität und räumliche Struktur zeigen.  ￼

Plausibel
	•	Eine hochwertige externe Basemap ist jetzt der beste Beschleuniger.
	•	Eine spätere lokale PMTiles-Basemap ist die sauberste Endstufe.

Spekulativ
	•	Welche konkrete Stilvariante euch visuell am besten gefällt.
	•	Wie schnell ihr tatsächlich von Hamburg-only zu größerem Ausschnitt wachsen wollt.

⸻

Für Dummies

Die ideale Lösung für jetzt ist:

Nicht:
Demo-Karte behalten
und
nicht:
gleich kompletten eigenen Kartenserver bauen

Sondern:
eine gute echte Karte benutzen,
aber so einbauen,
dass sie später leicht durch eure eigene ersetzt werden kann.

Das ist der goldene Mittelweg zwischen:
	•	„schnell schön“
	•	und „später souverän“

Etymologie:
Blaupause kommt ursprünglich aus dem Kopierverfahren für Baupläne. Sehr passend: Eine gute Blaupause zeigt nicht nur, was gebaut wird, sondern auch, welche Wände tragend sind. Hier ist die tragende Wand: Basemap austauschbar machen.

⸻

Unsicherheitsgrad

0.15

Ursachen:
	•	Die technische Wahl ist robust.
	•	Offen bleibt vor allem die konkrete Stilpräferenz und euer Toleranzniveau für externe Abhängigkeiten.

Interpolationsgrad

0.19

Hauptquellen:
	•	Die Priorisierung „jetzt extern, später lokal“ ist eine bewusste Architekturentscheidung, nicht direkt als Satz im Dump vorgegeben.

⸻

Essenz

Ideale Blaupause für jetzt:
MapLibre behalten, sofort auf eine echte detaillierte Vektor-Basemap wechseln, Basemap sauber kapseln, Overlay-Layer unabhängig halten, spätere PMTiles-Selbsthostung schon architektonisch vorbereiten.

Wenn du willst, formuliere ich dir daraus im nächsten Schritt eine ganz konkrete Implementierungsblaupause mit Dateischnitten, Config-Beispielen und Migrationspfad demo -> externe Basemap -> lokale PMTiles.


These: Für jetzt ist die ideale Lösung nicht „irgendeine schönere Karte“, sondern eine sauber gekapselte, sofort brauchbare Hamburg-Basemap auf eurer bestehenden MapLibre-Basis — mit Hammer Park in Hamm als Default-Startpunkt. So bekommt ihr sofort echte Straßen, Wege, Wasser, Grünflächen und Orientierung, ohne euch jetzt schon in eine komplette Tile-Infrastruktur zu vergraben.

Antithese: Eine zu große Kartenarchitektur jetzt sofort selbst zu hosten — eigene PMTiles, eigener Style, komplette Asset-Pipeline — wäre für den aktuellen Produktstand wahrscheinlich zu schwer. Das würde leicht mehr Kartenbau als Weltgewebe-Bau werden. Ein Repo kann vieles tragen, aber es sollte nicht gleichzeitig Stadtplanungsamt spielen.

Synthese: Die beste Lösung für jetzt ist:

MapLibre behalten
+ echte detaillierte Hamburg-Basemap
+ Basemap sauber kapseln
+ Hammer Park als Default-View
+ Overlay-Schichten strikt von der Basemap trennen
+ später ohne Architekturbruch auf lokale PMTiles wechseln


⸻

Ideale Blaupause für jetzt

1. Zielbild

Die Karte soll sofort produktiv brauchbar sein:
	•	echte Straßenkarte
	•	Hamburg klar lesbar
	•	ruhiger, nicht überladener Stil
	•	Weltgewebe-Objekte bleiben Vordergrund
	•	Startpunkt liegt sinnvoll im Projektkontext

Default-Start

Hammer Park, Hamm

Empfohlene Ausgangskoordinaten:

center: [10.0386, 53.5550]
zoom: 15

Das ist als Start deutlich besser als ein generisches Hamburg-Zentrum, weil:
	•	konkreter Ort
	•	urban gut lesbar
	•	genug Straßen-/Parkstruktur für erste Gewebe-Interaktionen
	•	glaubwürdiger lokaler Anker

⸻

2. Architekturprinzip

Jetzt
	•	Renderer: MapLibre
	•	Basemap: hochwertige externe Vektor-Basemap
	•	State/Overlay: bleibt intern in eurem Repo

Später
	•	gleiche MapLibre-/Overlay-Architektur
	•	nur Basemap-Quelle austauschen:
	•	lokales Style-JSON
	•	lokale PMTiles
	•	optional eigener Stil

Kernregel

Die App darf nicht überall wissen, welche Basemap gerade aktiv ist.

⸻

3. Produktregel

Die Karte ist in Weltgewebe nicht bloß Hintergrund, sondern die primäre Bühne.
Aber der Basemap-Hintergrund selbst muss ruhig bleiben.

Deshalb gilt:
	•	Basemap = Orientierung
	•	Weltgewebe-Layer = Bedeutung

Also:

Basemap
↓
Fäden / Verbindungen
↓
Knoten / Accounts
↓
Aktivität / Fokus / Komposition

Wenn die Basemap zu laut ist, wird sie vom Koordinatensystem zur Konkurrenzveranstaltung.

⸻

4. Neue Zielstruktur

apps/web/src/lib/map/
  basemap.ts
  config/
    basemap.current.ts
  overlay/
    nodes.ts
    edges.ts
    activity.ts
    focus.ts
    komposition.ts

Optional später:

apps/web/src/lib/map/style/
  patches.ts
  theme.ts


⸻

5. Verantwortlichkeiten

basemap.current.ts

Einzige Quelle der Wahrheit für die aktive Basemap.

Beispiel

export type BasemapMode = 'remote-style' | 'local-style';

export type BasemapConfig = {
  mode: BasemapMode;
  styleUrl: string;
  center: [number, number];
  zoom: number;
  maxZoom?: number;
  minZoom?: number;
  pitch?: number;
  bearing?: number;
};

export const currentBasemap: BasemapConfig = {
  mode: 'remote-style',
  styleUrl: 'HIER-ECHTE-DETAILLIERTE-Basemap-URL',
  center: [10.0386, 53.5550], // Hammer Park, Hamm
  zoom: 15,
  minZoom: 10,
  maxZoom: 18,
  pitch: 0,
  bearing: 0,
};


⸻

basemap.ts

Kapselt das Laden bzw. Auflösen des Styles.

Beispiel

import type { BasemapConfig } from './config/basemap.current';

export function resolveBasemapStyle(config: BasemapConfig): string {
  return config.styleUrl;
}

Später kann hier wachsen:
	•	PMTiles-Registrierung
	•	lokaler Style-Lader
	•	Style-Patches

⸻

Overlay-Dateien

overlay/nodes.ts
	•	Knotendarstellung
	•	Marker / Symbol-Layer
	•	Fokuszustände

overlay/edges.ts
	•	Fäden / Verbindungen
	•	Linien-Layer
	•	Fokus-/Hover-Varianten

overlay/activity.ts
	•	Aktivitätsvisualisierung
	•	Highlighting / Dichte / Status

overlay/focus.ts
	•	Fokus-Hervorhebung
	•	Auswahlzustände

overlay/komposition.ts
	•	Longpress-/Draft-Ort
	•	temporäre Vorschau
	•	Editorhilfe

⸻

6. Änderungen an map/+page.svelte

Die Kartenroute soll keine Basemap-Details mehr hart kodieren.

Stattdessen:

import { currentBasemap } from '$lib/map/config/basemap.current';
import { resolveBasemapStyle } from '$lib/map/basemap';

Und bei der Map-Erstellung:

style: resolveBasemapStyle(currentBasemap),
center: currentBasemap.center,
zoom: currentBasemap.zoom,
minZoom: currentBasemap.minZoom ?? 10,
maxZoom: currentBasemap.maxZoom ?? 18,
pitch: currentBasemap.pitch ?? 0,
bearing: currentBasemap.bearing ?? 0,

Ziel

+page.svelte orchestriert Verhalten, aber besitzt nicht die Basemap-Wahrheit.

⸻

7. Stilprinzipien für die Basemap

Die ideale Karte für Weltgewebe ist detailliert, aber ruhig.

Muss sichtbar sein
	•	Straßen
	•	Wege
	•	Gewässer
	•	Grünflächen
	•	wichtige Labels
	•	urbane Struktur

Sollte eher dezent sein
	•	Gebäude
	•	POIs
	•	sekundäre Beschriftung
	•	starke Farbigkeit

Stilrichtung
	•	hell
	•	kontrastarm, aber lesbar
	•	keine touristische Überfrachtung
	•	kein Dark-Mode als Default für Kartenhintergrund

Hammer Park profitiert davon besonders:
	•	Wege im Park
	•	angrenzende Straßen
	•	städtische Struktur
	•	Wasser-/Grünkontrast

⸻

8. Was jetzt nicht gemacht werden soll

Nicht jetzt: eigene PMTiles bauen

Das ist perspektivisch attraktiv, aber jetzt nicht der stärkste Hebel.

Nicht jetzt: eigenen Basemap-Stil von Null schreiben

Zu teuer für den unmittelbaren Nutzen.

Nicht jetzt: Rasterkarte

Wäre in eurem Stack ein Rückschritt.

Nicht jetzt: Basemap und Weltgewebe-Layer vermischen

Die Basemap darf nie Träger eurer Fachlogik werden.

⸻

9. Konkreter PR-Schnitt

PR-Titel

feat(map): replace demo basemap with detailed Hamburg basemap centered on Hammer Park

Scope
	•	Demo-Basemap entfernen
	•	basemap.current.ts einführen
	•	basemap.ts einführen
	•	Hammer Park als Startpunkt setzen
	•	echte detaillierte Basemap anbinden
	•	Overlay-Schichten logisch trennen oder vorbereiten
	•	+page.svelte von harter Basemap-Logik entlasten

Nicht Teil dieses PR
	•	keine PMTiles-Pipeline
	•	kein eigener Vollstil
	•	keine Panel-Erweiterung
	•	keine große State-Machine-Änderung

⸻

10. Stop-Kriterien

Diese Phase ist fertig, wenn:
	•	Beim Start landet die Karte auf Hammer Park, Hamm
	•	Straßen, Wege, Grünflächen und Labels sind klar lesbar
	•	Die Demo-URL ist aus dem Kartenkern verschwunden
	•	Basemap ist an genau einer Stelle konfiguriert
	•	Overlay-Logik ist nicht an einen konkreten Basemap-Anbieter gekoppelt
	•	Ein späterer Wechsel auf lokale PMTiles wäre ohne Umbau der UI-State-Logik möglich

⸻

11. Perspektivischer Migrationspfad

Phase A — jetzt

MapLibre
+ externe detaillierte Basemap
+ Hammer Park Default
+ Basemap-Konfiguration
+ Overlay-Trennung

Phase B — später

MapLibre
+ lokales Style-JSON
+ gleiche Overlay-Struktur

Phase C — Endstufe

MapLibre
+ lokale Hamburg.pmtiles
+ optional eigener Stil
+ identischer Overlay-Stack


⸻

12. Alternative Sinnachse

Man könnte sagen:

Erst Kompositionseditor, dann Karte.

Ich würde die Relevanz hier umdrehen:

Wenn die Karte die primäre Bühne ist, dann ist ein präziser, glaubwürdiger räumlicher Hintergrund nicht Kosmetik, sondern Teil des Denkmodells.

Gerade mit Hammer Park als realem Startort gilt:
	•	Die Karte wird zur konkreten Welt,
	•	nicht bloß zum abstrakten Träger.

Das verändert, wie Fokus, Komposition und spätere Suche überhaupt erlebt werden.

⸻

13. Typische Fehlannahmen

Fehlannahme 1

„Ordentliche Karte = schöneres Design.“

Nein.
Hier bedeutet es:
	•	brauchbare Orientierung
	•	stabile Architektur
	•	austauschbare Basemap
	•	klare Trennung zwischen Basemap und Gewebe-Logik

Fehlannahme 2

„Wenn wir extern starten, verbauen wir uns Selbsthostung.“

Nein.
Nur wenn die Basemap nicht gekapselt wird.

Fehlannahme 3

„Hamburg-Zentrum ist der beste Default.“

Nicht zwingend.
Hammer Park ist hier als produktiver Anker besser, weil konkreter und lokaler.

⸻

14. Risiko- und Nutzenabschätzung

Nutzen
	•	sofort glaubwürdige Karte
	•	bessere Orientierung
	•	bessere Demo-/Produktqualität
	•	solide Grundlage für spätere Overlay-Features
	•	PMTiles-Pfad bleibt offen

Risiken
	•	externe Basemap bleibt vorerst Abhängigkeit
	•	konkreter Stil muss gut gewählt werden
	•	Hammer-Park-Zoom kann anfangs zu lokal wirken, wenn eure Daten anderswo liegen

Folgen
	•	Wenn der Kartenausschnitt gut gewählt ist: starker UX-Gewinn
	•	Wenn der Stil zu laut ist: Overlay-Layer verlieren an Gewicht

⸻

15. Für Dummies

Die Idee ist einfach:

Jetzt
	•	eine gute echte Karte benutzen

Aber
	•	so einbauen, dass man sie später leicht ersetzen kann

Und die Karte startet nicht irgendwo allgemein in Hamburg, sondern direkt am Hammer Park in Hamm, damit die App sofort einen konkreten räumlichen Bezug hat.

⸻

16. Unsicherheitsgrad / Interpolationsgrad

Unsicherheitsgrad: 0.11
Ursachen: Technisch ist die Richtung klar; offen ist vor allem, welcher konkrete Basemap-Stil euch visuell am besten gefällt.

Interpolationsgrad: 0.15
Hauptquellen: Die genaue Dateistruktur und Priorisierung sind optimierte Architekturentscheidungen, nicht 1:1 aus dem Dump abgeschrieben.

⸻

17. Essenz

Alles neu, optimiert, mit Hammer Park als Start:
MapLibre behalten, Demo-Basemap sofort ersetzen, Basemap zentral kapseln, Hamburg/Hammer Park als Default setzen, Overlays strikt davon trennen und spätere PMTiles-Selbsthostung architektonisch vorbereiten.

Wenn du willst, mache ich dir im nächsten Schritt daraus direkt einen konkreten agententauglichen Implementierungsplan mit fertiger Dateistruktur, Beispielcode und exaktem PR-Schnitt.

These: Der sinnvollste nächste Schritt ist ein klar geschnittener Karten-PR, nicht bloß „irgendwie andere Tiles“. Der Repo-Stand zeigt bereits eine vorhandene MapLibre-Basis und eine UI, in der die Karte die primäre Bühne ist. Genau deshalb sollte der Hintergrund jetzt professionell werden, ohne dass ihr die Overlay-Logik oder die State-Machine wieder aufreißt.  ￼  ￼

Antithese: Ein zu großer Karten-PR wäre falsch. Wenn ihr jetzt gleichzeitig Basemap austauscht, PMTiles vorbereitet, Overlay-Layer refaktoriert, Panel-Logik ändert und die Suche mitzieht, entsteht wieder Review-Nebel. Dann baut ihr nicht „eine ordentliche Karte“, sondern eine kleine Republik mit Grenzkonflikten.

Synthese: Also: ein PR, ein Ziel.
Ziel dieses PRs: Demo-Basemap raus, echte detaillierte Hamburg-Karte rein, Startpunkt Hammer Park, Basemap sauber kapseln, Overlay unangetastet lassen.

⸻

Agententauglicher Implementierungsplan

PR-Titel

feat(map): replace demo basemap with detailed Hamburg basemap centered on Hammer Park

⸻

Ziel

Die aktuelle Demo-/Stub-Basemap wird durch eine echte, detaillierte Basemap ersetzt. Die Karte startet standardmäßig am Hammer Park in Hamm. Die Basemap wird so gekapselt, dass später ein Wechsel auf eine lokale PMTiles- oder Self-Hosted-Lösung möglich bleibt, ohne die UI-Logik neu zu schneiden.

⸻

Nicht-Ziele

Dieser PR soll nicht:
	•	die State-Machine ändern
	•	neue globale Zustände einführen
	•	die Panel-Logik umbauen
	•	einen eigenen Tile-Build-Prozess einführen
	•	PMTiles lokal integrieren
	•	Suche/Filter umsetzen
	•	Overlay-Semantik ändern

Das ist wichtig. Sonst wird aus „Karte ordentlich machen“ wieder eine metaphysische Baugrube.

⸻

Betroffene Dateien

Bestehende Dateien
	•	apps/web/src/routes/map/+page.svelte
	•	apps/web/src/lib/maplibre/MapLibre.svelte
nur falls dort Basemap-Initialisierung oder Prop-Weitergabe angepasst werden muss
	•	ggf. bestehende Map-/Style-Hilfsdateien, falls vorhanden

Neu anzulegen
	•	apps/web/src/lib/map/config/basemap.current.ts
	•	apps/web/src/lib/map/basemap.ts

Optional, nur wenn wirklich nötig:
	•	apps/web/src/lib/map/types.ts

⸻

Zielstruktur nach dem PR

apps/web/src/lib/map/
  basemap.ts
  config/
    basemap.current.ts

Noch nicht in diesem PR:

overlay/
style/
pmtiles/

Die kommen später, wenn sie wirklich gebraucht werden.

⸻

Konkrete Umsetzung

1. Basemap-Konfiguration zentralisieren

Neue Datei

apps/web/src/lib/map/config/basemap.current.ts

Inhalt

Eine einzige Quelle der Wahrheit für die aktive Basemap.

Beispielstruktur:

export type BasemapMode = 'remote-style' | 'local-style';

export type BasemapConfig = {
  mode: BasemapMode;
  styleUrl: string;
  center: [number, number];
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  pitch?: number;
  bearing?: number;
};

export const currentBasemap: BasemapConfig = {
  mode: 'remote-style',
  styleUrl: 'HIER-DIE-GEWÄHLTE-BASEMAP-STYLE-URL',
  center: [10.0386, 53.5550], // Hammer Park, Hamm
  zoom: 15,
  minZoom: 10,
  maxZoom: 18,
  pitch: 0,
  bearing: 0,
};

Anforderungen
	•	keine Demo-URL mehr irgendwo sonst
	•	Hammer Park ist der Startpunkt
	•	Zoom so wählen, dass Wege, Parkstruktur und umgebende Straßen gut lesbar sind

Prämissencheck

Diese Wahl gilt nur, wenn ihr wirklich lokal orientiert starten wollt.
Wenn euer initialer Datensatz weit außerhalb Hamburgs liegt, müsste der Startpunkt neu kalibriert werden.
X fehlt, nötig für Y: aktueller Schwerpunkt eurer realen Gewebe-Daten fehlt, nötig für eine endgültig optimale Default-Ansicht.

⸻

2. Basemap-Auflösung kapseln

Neue Datei

apps/web/src/lib/map/basemap.ts

Inhalt

Eine kleine Resolver-Funktion, damit die Kartenroute nicht wissen muss, woher der Stil kommt.

Beispiel:

import type { BasemapConfig } from './config/basemap.current';

export function resolveBasemapStyle(config: BasemapConfig): string {
  return config.styleUrl;
}

Warum so klein?

Weil diese Datei jetzt nur kapseln soll, nicht schon clever sein.
Später kann sie:
	•	lokale Styles laden
	•	PMTiles registrieren
	•	Style-Patches anwenden

Jetzt reicht ein sauberer Einstiegspunkt.

⸻

3. map/+page.svelte umstellen

Aufgabe

Die Route darf keine fest verdrahtete Demo-Basemap mehr verwenden.

Änderung

Importe ergänzen:

import { currentBasemap } from '$lib/map/config/basemap.current';
import { resolveBasemapStyle } from '$lib/map/basemap';

Map-Initialisierung auf Konfig-Werte umstellen:

style: resolveBasemapStyle(currentBasemap),
center: currentBasemap.center,
zoom: currentBasemap.zoom,
minZoom: currentBasemap.minZoom ?? 10,
maxZoom: currentBasemap.maxZoom ?? 18,
pitch: currentBasemap.pitch ?? 0,
bearing: currentBasemap.bearing ?? 0,

Anforderungen
	•	kein Basemap-String-Literal mehr direkt in +page.svelte
	•	keine Demo-URL in der Route
	•	keine Änderung an enterFokus, enterKomposition, leaveToNavigation
	•	keine Änderung an Marker-/Longpress-/Testlogik, außer falls die neue Basemap Timing-Auswirkungen hat

⸻

4. Geeignete Basemap auswählen

Zielprofil

Die Basemap muss:
	•	Hamburg detailliert darstellen
	•	Straßen und Wege klar zeigen
	•	ruhig bleiben
	•	Weltgewebe-Layer nicht übertönen

Stilanforderung

Bevorzugt:
	•	hell
	•	reduziert
	•	gute Straßenhierarchie
	•	Grünflächen sichtbar
	•	Wasser gut lesbar
	•	keine aggressive POI-Überladung

Entscheidungskriterium

Die richtige Basemap ist nicht die „schönste“, sondern diejenige, auf der:
	•	Hammer Park sofort erkennbar ist
	•	urbane Struktur lesbar ist
	•	Marker/Nodes/Fokus deutlich dominieren können

Praktische Auswahlregel für den Agenten

Wähle eine hochwertige MapLibre-kompatible Vektor-Basemap mit ruhigem Stil.
Keine Demo- oder Spielstil-Karte.
Keine satellitenartige oder dunkle Karte.
Keine POI-überladene Touristenkarte.

Der Agent soll den Stil nicht als philosophische Endlösung behandeln. Nur als saubere produktive Zwischenstufe.

⸻

5. Hammer Park als Start sauber setzen

Default-View

center: [10.0386, 53.5550]
zoom: 15

Erwartung

Bei App-Start sieht man:
	•	Hammer Park
	•	angrenzende Straßen
	•	Parkwege
	•	urbane Nachbarschaft

Optionaler Feinschliff

Falls zoom: 15 zu eng oder zu weit wirkt:
	•	14.5 bis 15.5 testen
	•	aber nur minimal justieren
	•	nicht in eine Zoom-Esoterik abgleiten

⸻

6. Bestehende Interaktionen schützen

Pflicht

Nach Basemap-Tausch müssen erhalten bleiben:
	•	Marker-Klick → Fokus
	•	Longpress → Komposition
	•	Leerklick → Navigation
	•	Kompositionsschutz
	•	Fokus-Restore

Die State-Machine ist bereits sauber genug und soll nicht angerührt werden.  ￼

Gefahr

Manche Basemap-/Style-Wechsel verändern:
	•	Ladezeiten
	•	Layer-Hitverhalten
	•	Render-Timing

Darum:
	•	bestehende map-interaction-Tests laufen lassen
	•	nur bei realem Bruch minimal anpassen
	•	keine testliche Neuerfindung

⸻

7. Test- und Verifikationsplan

Pflichtchecks
	•	Karte lädt mit neuer Basemap ohne Demo-URL
	•	Startansicht liegt auf Hammer Park
	•	Straßen/Wege/Grün/Wasser sind sichtbar
	•	Marker bleiben klickbar
	•	Kontextpanel öffnet sich weiterhin korrekt
	•	Longpress auf leerer Karte startet Komposition weiterhin
	•	Empty map click schließt Fokus weiterhin
	•	Komposition bleibt bei Leerklick geschützt

Bestehende Tests
	•	apps/web/tests/map-interaction.spec.ts ausführen
	•	nur anpassen, wenn echte Render-/Timing-Effekte auftreten

Optionaler Zusatztest

Falls ihr einen sehr kleinen Smoke-Test wollt:
	•	prüfe, dass die Karte initial nicht auf Demo-Style läuft
	•	prüfe, dass Hammer Park ungefähr im initialen View liegt

Aber wirklich nur, wenn das mit geringem Aufwand machbar ist.

⸻

8. Stop-Kriterien

Der PR ist fertig, wenn:
	•	Demo-Basemap vollständig entfernt ist
	•	Basemap zentral in basemap.current.ts konfiguriert wird
	•	+page.svelte keine harte Basemap-Wahrheit mehr enthält
	•	Hammer Park der Default-Startpunkt ist
	•	Hamburg als echte detaillierte Stadtkarte sichtbar ist
	•	bestehende Karteninteraktionen weiter funktionieren
	•	der spätere Wechsel auf lokale PMTiles architektonisch vorbereitet ist

⸻

Was ausdrücklich nicht in diesem PR landen soll
	•	lokale PMTiles-Datei
	•	eigener Tile-Build-Prozess
	•	eigener Vollstil
	•	Suche/Filter
	•	Panel-Inhaltsausbau
	•	neue globale States
	•	Overlay-Refaktorierung
	•	große Map-Event-Neuordnung

Wenn der Agent das mit hineinzieht, ist der Scope verfehlt.

⸻

Alternativpfad

Es gäbe einen anderen Weg:

Jetzt sofort lokal selbst hosten.

Das wäre sinnvoll, wenn diese Prämissen gelten:
	•	sofortige Offlinefähigkeit ist Pflicht
	•	externe Basemap-Abhängigkeiten sind inakzeptabel
	•	ihr wollt bewusst Infrastruktur zuerst bauen

Ohne diese Prämissen ist das für jetzt die schlechtere Wahl.

⸻

Agentenprompt

Bitte implementiere einen fokussierten Karten-PR mit genau folgendem Ziel:

Ziel:
Die bestehende Demo-/Stub-Basemap wird durch eine echte, detaillierte Hamburg-Basemap ersetzt. Standard-Startpunkt ist Hammer Park in Hamm. Die Basemap wird zentral gekapselt, sodass später ein Wechsel auf lokale PMTiles oder einen lokalen Style ohne Umbau der UI-Logik möglich bleibt.

Wichtige Scope-Regel:
Dieser PR ist ein Basemap-PR, kein allgemeiner Karten- oder UI-PR.
Keine neuen Features, keine PMTiles-Pipeline, keine Panel-Änderungen, keine State-Machine-Änderungen.

Umsetzung

1. Neue Datei anlegen:
- `apps/web/src/lib/map/config/basemap.current.ts`

Dort:
- Typ für Basemap-Konfiguration definieren
- genau eine aktive Basemap konfigurieren
- Hammer Park als Default setzen:
  - center: `[10.0386, 53.5550]`
  - zoom: `15`
- sinnvolle `minZoom`/`maxZoom` ergänzen

2. Neue Datei anlegen:
- `apps/web/src/lib/map/basemap.ts`

Dort:
- kleine Resolver-Funktion für die Basemap-Style-URL implementieren
- noch keine PMTiles-Logik einbauen
- nur kapseln, nicht überabstrahieren

3. `apps/web/src/routes/map/+page.svelte` anpassen:
- keine Demo-Style-URL mehr direkt in der Route
- `currentBasemap` und `resolveBasemapStyle(...)` importieren
- Map-Initialisierung auf Konfig-Werte umstellen
- bestehende Interaktionslogik (`enterFokus`, `enterKomposition`, `leaveToNavigation`, Longpress, Fokus-Restore) nicht fachlich verändern

4. Eine hochwertige, ruhige, detaillierte, MapLibre-kompatible Vektor-Basemap verwenden:
- Hamburg muss klar lesbar sein
- Straßen, Wege, Wasser, Grünflächen und Labels sichtbar
- Stil ruhig genug, damit Overlay-Layer später dominant bleiben
- keine Demo-Tiles
- kein dunkler oder überladener Stil
- keine satellitenartige Karte

5. Verifikation:
- bestehende Karteninteraktionen müssen nach dem Tausch weiter funktionieren
- bestehende `map-interaction`-Tests laufen lassen
- nur bei echtem Bruch minimal anpassen
- keine neue große Testinfrastruktur einführen

Nicht tun:
- keine PMTiles-Datei einbauen
- keinen eigenen Tile-Build-Prozess
- keinen eigenen Vollstil
- keine Änderungen an Panels
- keine Suche/Filter
- keine neuen globalen Zustände
- keine große Overlay-Refaktorierung

Erwartetes Ergebnis:
- Demo-Basemap weg
- echte detaillierte Hamburg-Karte da
- Hammer Park als Default-Start
- Basemap an genau einer Stelle konfiguriert
- spätere Migration auf lokale PMTiles architektonisch vorbereitet

Bitte liefere:
1. kurzen Umsetzungsüberblick
2. präzisen Patch
3. kurze Verifikationsnotiz


⸻

Für Dummies

Was wir hier tun:
	•	Wir behalten die Karten-Engine.
	•	Wir tauschen nur den schlechten Kartenhintergrund aus.
	•	Wir bauen das so, dass später eure eigene Karte einfach eingesteckt werden kann.
	•	Und die Karte startet direkt am Hammer Park.

Das ist die vernünftige Mischung aus:
	•	jetzt schön
	•	später unabhängig

⸻

Unsicherheitsgrad

0.09

Ursachen:
	•	Die Architekturentscheidung ist klar.
	•	Offen ist primär die konkrete Stilwahl.

Interpolationsgrad

0.12

Hauptquellen:
	•	Die Dateistruktur und die genaue Kapselung sind optimierte Architekturvorschläge, nicht wörtlich im Repo festgelegt.

⸻

Essenz

Jetzt: echte detaillierte Hamburg-Basemap, Hammer Park als Default, Basemap zentral kapseln.
Später: gleiche Architektur auf lokale PMTiles umstellen.
Nächste Aktion: Diesen Plan als fokussierten Basemap-PR umsetzen.