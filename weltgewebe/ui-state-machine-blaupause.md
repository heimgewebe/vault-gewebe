

Weltgewebe UI State Machine – Implementierungs-Blaupause

id: ui-state-machine
title: Weltgewebe UI State Machine
doc_type: blueprint
status: canonical
summary: Kanonische Zustandsmaschine der Weltgewebe-UI und verbindliche Implementierungsregeln.


⸻

1 Ziel

Die UI besitzt eine einzige globale Interaktionslogik.

Ziele:
	•	widerspruchsfreie UI-Zustände
	•	deterministische Interaktionen
	•	testbare Übergänge
	•	Vermeidung von UI-Drift

Die State Machine beschreibt nur Frontend-Interaktion, nicht Backend-Logik.

⸻

2 Kanonische Zustände

Die UI kennt genau drei globale Zustände:

navigation
fokus
komposition

Kein weiterer globaler Zustand darf eingeführt werden ohne Anpassung dieses Dokuments.

⸻

3 State-Machine-Diagramm

navigation
   │
   │ marker click
   ▼
fokus
   │
   │ close / empty map click
   ▼
navigation


navigation
   │
   │ action bar / longpress
   ▼
komposition
   │
   │ cancel / close
   ▼
navigation


⸻

4 Kanonische Zustandsdaten

systemState

type SystemState =
  | "navigation"
  | "fokus"
  | "komposition"

Diese Variable ist die einzige globale Zustandsquelle.

⸻

selection

type Selection =
  | {
      type: "node" | "edge" | "account" | "garnrolle"
      id: string
      data?: unknown
    }
  | null

Invarianten

systemState === "fokus" → selection !== null
systemState === "navigation" → selection === null
systemState === "komposition" → selection === null


⸻

kompositionDraft

type KompositionDraft =
  | {
      mode: "new-knoten"
      lngLat?: [number, number]
      source: "action-bar" | "map-longpress"
    }
  | null

Invarianten

systemState === "komposition" → kompositionDraft !== null
systemState !== "komposition" → kompositionDraft === null


⸻

contextPanelOpen

Derived state:

contextPanelOpen = systemState !== "navigation"

Es darf keine zweite Open-State-Quelle existieren.

⸻

5 Erlaubte Übergänge

navigation → fokus

Trigger:
	•	Marker-Klick
	•	Objekt-Klick

Effekt:

selection = { ... }
systemState = "fokus"


⸻

navigation → komposition

Trigger:

ActionBar → Neuer Knoten
Longpress auf Karte

Effekt:

kompositionDraft = { ... }
systemState = "komposition"


⸻

fokus → navigation

Trigger:

empty map click
panel close

Effekt:

selection = null
systemState = "navigation"


⸻

fokus → fokus

Trigger:

click anderes Objekt

Effekt:

selection wechseln
Tabs reset


⸻

komposition → navigation

Trigger:

cancel
panel close
submit success

Effekt:

kompositionDraft = null
systemState = "navigation"


⸻

6 Verbotene Zustände

Diese Zustände dürfen nie auftreten:

systemState === "fokus" AND selection === null
systemState === "komposition" AND kompositionDraft === null
systemState === "navigation" AND contextPanelOpen === true


⸻

7 Implementierungsanweisungen

7.1 State-Store

Datei:

apps/web/src/state/uiView.ts

Pflicht:

export const systemState
export const selection
export const kompositionDraft

Derived:

contextPanelOpen


⸻

7.2 ContextPanel

Datei:

components/ContextPanel.svelte

Regel:

if systemState === "komposition"
   render KompositionView

if systemState === "fokus"
   render ObjektView

Beide dürfen niemals gleichzeitig sichtbar sein.

⸻

7.3 Map-Interaktionen

Datei:

routes/map/+page.svelte

Implementieren:

marker click → fokus
empty map click → navigation
longpress → komposition


⸻

7.4 ActionBar

Datei:

components/ActionBar.svelte

Pflichtaktion:

Neuer Knoten → navigation → komposition


⸻

8 Testpflicht (Playwright)

Jeder Zustandsübergang benötigt einen Test.

Tests:

tests/map-interaction.spec.ts

Pflichtfälle:

navigation

initial state
panel closed


⸻

fokus

marker click
panel open
selection gesetzt


⸻

fokus verlassen

empty map click
panel closed
selection null


⸻

komposition

action bar click
draft created
panel open


⸻

longpress

map longpress
draft.lngLat gesetzt


⸻

kompositionsschutz

empty map click
komposition bleibt aktiv


⸻

9 CI-Guard gegen Zustandsdrift

Empfehlung:

Unit-Test:

expectInvalidState()

Beispiel:

if (systemState === "fokus" && !selection)
   throw Error("invalid ui state")

Ziel:

UI-Bugs sofort sichtbar machen.

⸻

10 Erweiterungsregel

Neue Zustände dürfen nicht einfach ergänzt werden.

Vor Einführung prüfen:
	1.	Globaler Zustand nötig?
	2.	Panel-Submodus ausreichend?
	3.	Lokaler Zustand ausreichend?

Beispiele:

search → Panelmodus
filter → Panelmodus
auth → globaler Zustand


⸻

Was du jetzt konkret tun solltest

Die Umsetzung erfolgt idealerweise als 3 PR-Serie.

⸻

PR 1 — State-Machine Code-Contract

Umsetzen:
	•	systemState zentralisieren
	•	contextPanelOpen derived
	•	invariants absichern

⸻

PR 2 — Testmatrix

Implementieren:

tests/map-interaction.spec.ts

Alle Übergänge.

⸻

PR 3 — ContextPanel-Semantik

Implementieren:
	•	Fokus-View
	•	Kompositions-View
	•	Tab-Reset

⸻

Typische Fehlannahmen

Fehlannahme

„Search braucht eigenen State.“

Nein.

Search ist meist Panel-Modus.

⸻

Fehlannahme

„contextPanelOpen ist eigener Zustand.“

Nein.

Derived state verhindert doppelte Wahrheit.

⸻

Risikoanalyse

Nutzen
	•	klare UI-Logik
	•	stabile Tests
	•	geringere Feature-Drift

Risiken
	•	zu strenge Regeln könnten zukünftige UX-Ideen blockieren
	•	Entwickler könnten lokale States unnötig globalisieren

⸻

Unsicherheitsgrad

0.11

Ursachen:
	•	UI-Code bereits vorhanden
	•	State-Machine bereits implementiert

⸻

Interpolationsgrad

0.14

Annahmen:
	•	aktuelle MapLibre-Interaktion
	•	zukünftige Suche/Filter-UX

⸻

Essenz

Ja.

Das Dokument sollte umgesetzt werden.

Aber nicht nur als Text.

Sondern als:

State Contract
+
Tests
+
CI Guards

Dann gilt eine einfache Regel:

Die UI kann wachsen, aber sie darf nie ihre drei Wahrheiten verlieren:

navigation
fokus
komposition


⸻

These

Ja: Der nächste sinnvolle Schritt ist jetzt nicht noch mehr Blaupause, sondern eine konkret geschnittene PR-Serie, die die State-Machine von der Doktrin zur Durchsetzung bringt. Die Logik ist im Dokument bereits klar genug: drei globale Zustände, abgeleitetes Panel, harte Invarianten, testbare Übergänge.  ￼

Antithese

Nein: Eine naive „einfach alles aus dem Dokument umsetzen“-Aktion wäre zu grob. Das erzeugt leicht zwei Schäden:
	1.	Architektur und Produktstubs werden vermischt.
	2.	Tests beweisen nur, dass Text erschienen ist, nicht dass die Zustandslogik stimmt.

Synthese

Also: nicht ein großer Umbau, sondern 4 kleine PRs mit klaren Stop-Kriterien.
Zuerst die Zustandswahrheit, dann die Panel-Entscheidung, dann Interaktionshärtung, dann Tests/Guards. So bleibt die UI überprüfbar statt metaphysisch. Ein Frontend ohne Zustandsgrenzen ist schließlich nur ein Aberglaube mit CSS.

⸻

Konkrete PR-Serie

PR 1 — State Contract kanonisieren

Ziel

Die drei Hauptzustände als einzige globale Wahrheit technisch fixieren.

Betroffene Dateien
	•	apps/web/src/lib/stores/uiView.ts
	•	optional neu: apps/web/src/lib/state/uiInvariants.ts
	•	optional neu: apps/web/src/lib/state/uiTypes.ts

Umsetzung

1. Typen und Stores sauber trennen
uiView.ts sollte nur noch enthalten:
	•	SystemState
	•	Selection
	•	KompositionDraft
	•	systemState
	•	selection
	•	kompositionDraft
	•	contextPanelOpen

2. Invarianten zentral prüfen
Neue Hilfsfunktion:

// apps/web/src/lib/state/uiInvariants.ts
import type { SystemState, Selection, KompositionDraft } from '$lib/stores/uiView';

export function assertUiStateInvariant(args: {
  systemState: SystemState;
  selection: Selection;
  kompositionDraft: KompositionDraft;
}): void {
  const { systemState, selection, kompositionDraft } = args;

  if (systemState === 'navigation') {
    if (selection !== null) {
      throw new Error('Invalid UI state: navigation requires selection === null');
    }
    if (kompositionDraft !== null) {
      throw new Error('Invalid UI state: navigation requires kompositionDraft === null');
    }
  }

  if (systemState === 'fokus') {
    if (selection === null) {
      throw new Error('Invalid UI state: fokus requires selection !== null');
    }
    if (kompositionDraft !== null) {
      throw new Error('Invalid UI state: fokus requires kompositionDraft === null');
    }
  }

  if (systemState === 'komposition') {
    if (kompositionDraft === null) {
      throw new Error('Invalid UI state: komposition requires kompositionDraft !== null');
    }
    if (selection !== null) {
      throw new Error('Invalid UI state: komposition requires selection === null');
    }
  }
}

3. Dev-only invariant watcher
In +page.svelte oder besser in einer kleinen dev-only Reaktionsstelle:

import { assertUiStateInvariant } from '$lib/state/uiInvariants';

$: if (import.meta.env.DEV) {
  assertUiStateInvariant({
    systemState: $systemState,
    selection: $selection,
    kompositionDraft: $kompositionDraft
  });
}

Stop-Kriterium
	•	Keine zweite Open/Close-Wahrheit mehr
	•	Ungültige Kombinationen crashen im Dev-Modus sofort
	•	contextPanelOpen bleibt rein derived

Risiko

Gering.
Hauptgefahr: bestehende implizite Mischzustände fliegen auf. Das ist kein Bug des PRs, sondern dessen Nutzen.

⸻

PR 2 — ContextPanel als strikt exklusiver Detailraum

Ziel

Das Panel zeigt entweder Fokus oder Komposition, nie beides und nie „irgendwas“.

Betroffene Dateien
	•	apps/web/src/lib/components/ContextPanel.svelte
	•	optional neu:
	•	apps/web/src/lib/components/context/NodePanel.svelte
	•	apps/web/src/lib/components/context/AccountPanel.svelte
	•	apps/web/src/lib/components/context/EdgePanel.svelte
	•	apps/web/src/lib/components/context/KompositionPanel.svelte

Umsetzung

1. ContextPanel zerlegen
Aktuell steckt zu viel Logik in einer Datei. Besser:

{#if $systemState === 'komposition'}
  <KompositionPanel draft={$kompositionDraft} on:close={closePanel} />
{:else if $systemState === 'fokus' && $selection}
  {#if $selection.type === 'node'}
    <NodePanel selection={$selection} />
  {:else if $selection.type === 'account' || $selection.type === 'garnrolle'}
    <AccountPanel selection={$selection} />
  {:else if $selection.type === 'edge'}
    <EdgePanel selection={$selection} />
  {/if}
{/if}

2. Tab-Reset explizit machen
Statt lokalem lastContextKey lieber objektmodusabhängige Standardtab-Funktion:

function getDefaultTab(type: 'node' | 'account' | 'garnrolle' | 'edge'): string {
  if (type === 'node') return 'uebersicht';
  if (type === 'account' || type === 'garnrolle') return 'profil';
  return 'details';
}

Dann beim Wechsel:

$: if ($systemState === 'fokus' && $selection) {
  const nextKey = `${$selection.type}:${$selection.id}`;
  if (nextKey !== currentKey) {
    currentKey = nextKey;
    activeTab = getDefaultTab($selection.type);
  }
}

3. Komposition hart gegen Fokus entkoppeln
Beim Eintritt in Komposition immer:

selection.set(null);
systemState.set('komposition');
kompositionDraft.set(...);

Stop-Kriterium
	•	Panelinhalt widerspricht nie systemState
	•	Objektwechsel setzt Tabs zuverlässig zurück
	•	Komposition und Fokus sind exklusiv

Risiko

Mittel.
Hier steckt die meiste Semantik. Wenn später Produktinhalte ausgebaut werden, ist diese Trennung aber Gold wert.

⸻

PR 3 — Map-Interaktionen härten

Ziel

Kartenlogik robust machen: kein versehentliches Umschalten, kein brüchiger Longpress, kein Fokus-Restore ins Nichts.

Betroffene Dateien
	•	apps/web/src/routes/map/+page.svelte

Umsetzung

1. Zustandsübergänge in kleine Funktionen ziehen

function enterFokus(item: RenderableMapPoint, markerBtn?: HTMLElement | null) {
  if (markerBtn) lastFocusedElement = markerBtn;
  $kompositionDraft = null;
  $selection = {
    type: (item.type || 'node') as 'node' | 'account' | 'garnrolle',
    id: item.id,
    data: item
  };
  $systemState = 'fokus';
}

function enterKomposition(draft: NonNullable<typeof $kompositionDraft>) {
  $selection = null;
  $kompositionDraft = draft;
  $systemState = 'komposition';
}

function leaveToNavigation() {
  $selection = null;
  $kompositionDraft = null;
  $systemState = 'navigation';
}

2. Longpress-Schutz vervollständigen
Schon verbessert, aber zusätzlich:
	•	mouseleave prüfen, falls relevant
	•	touchstart nur auf leerer Karte, nicht auf Marker/Overlay
	•	Longpress nicht feuern, wenn Pointer sich über Schwellwert bewegt

Minimal:

let pointerDownPoint: { x: number; y: number } | null = null;
const MOVE_THRESHOLD = 8;

Bei move:
	•	Distanz prüfen
	•	Timer abbrechen, wenn überschritten

3. Fokus-Restore robuster machen
Statt nur document.body.contains(lastFocusedElement):

function restoreFocusSafely() {
  if (lastFocusedElement && document.contains(lastFocusedElement)) {
    lastFocusedElement.focus();
    return;
  }

  const fallback = document.querySelector<HTMLElement>('#map');
  fallback?.focus?.();
}

Dann:

$: if ($systemState === 'navigation' && previousState !== 'navigation') {
  restoreFocusSafely();
}

Stop-Kriterium
	•	Longpress feuert nicht beim Pannen
	•	Komposition wird nicht durch leeren Kartenklick beendet
	•	Fokus-Restore ist deterministischer

Risiko

Mittel.
MapLibre ist gern der Hofnarr des DOM: sichtbar, klickbar, aber nicht immer dort, wo man ihn zuletzt philosophisch verortet hat.

⸻

PR 4 — Testmatrix aus dem Dokument erzwingen

Ziel

Die Blaupause wird nicht nur beschrieben, sondern bewiesen. Die Testmatrix im Dokument ist bereits fast direkt umsetzbar.  ￼

Betroffene Dateien
	•	apps/web/tests/map-interaction.spec.ts
	•	optional neu: apps/web/tests/ui-state-machine.spec.ts
	•	optional neu: apps/web/tests/helpers/map.ts

Umsetzung

1. Bestehende Tests präzisieren
Der aktuelle Test „empty map click“ mit page.mouse.click(10, 10) ist brüchig.
Besser:
	•	eine stabile, testbare Leerklick-Zone bestimmen
	•	oder per JS auf die Map-Canvas dispatchen

Beispiel:

async function clickEmptyMap(page: Page) {
  const map = page.locator('#map');
  const box = await map.boundingBox();
  if (!box) throw new Error('Map bounding box unavailable');

  await page.mouse.click(box.x + 40, box.y + 40);
}

2. Harte Tab-Assertions statt weicher Negation
Statt nur „Gespräch ist nicht mehr aktiv“:

await expect(panel.locator('button.active')).toHaveText('Profil');

oder

await expect(panel.getByRole('button', { name: 'Übersicht' })).toHaveClass(/active/);

3. Neue Pflichttests
Zusätzlich aufnehmen:
	•	node -> node reset auf Übersicht
	•	node -> garnrolle reset auf Profil
	•	garnrolle -> node reset auf Übersicht
	•	komposition + empty map click bleibt offen
	•	panel close from komposition leert Draft
	•	panel close from fokus leert Selection
	•	optional: dev invariant test

Stop-Kriterium
	•	Jede Transition aus der Blaupause hat mindestens einen Test
	•	Keine weichen „nicht-irgendwie“-Assertions mehr
	•	Leerklick-Test ist overlay-resistenter

Risiko

Gering bis mittel.
Die größte Gefahr ist hier nicht falscher Code, sondern falsches Selbstvertrauen durch hübsche, aber schwache Tests.

⸻

Empfohlene Reihenfolge

Variante A — sauber
	1.	PR 1 State Contract
	2.	PR 2 ContextPanel
	3.	PR 3 Map Härtung
	4.	PR 4 Tests

Variante B — falls schnell Beweise gebraucht werden
	1.	PR 1 State Contract
	2.	PR 4 Tests
	3.	PR 2 ContextPanel
	4.	PR 3 Map Härtung

Meine Gewichtung: Variante A ist architektonisch besser.

⸻

Was ich am Dokument noch optimieren würde

Nicht inhaltlich groß, aber drei Ergänzungen sind sinnvoll:

1. Explizite Ausschlussregel schärfen

Im Dokument steht die Exklusivität schon sinngemäß, aber ich würde es härter formulieren:

selection und kompositionDraft dürfen nie gleichzeitig ungleich null sein.

2. Fokus-Restore als Nicht-Invariante markieren

Das Dokument sollte klarstellen:
	•	Fokus-Restore ist best effort
	•	kein harter fachlicher Invariant
	•	nur UX-/A11y-Hilfsregel

Sonst wird eine freundliche UX-Norm später wie ein metaphysisches Naturgesetz behandelt.

3. Submodi klar benennen

Für Suche/Filter würde ich schon jetzt notieren:
	•	vorläufig Panel-Submodi
	•	keine globalen Hauptzustände
	•	erst bei echter Parallel- oder Sperrlogik aufwerten

⸻

Alternative Sinnachse

Man kann die nächsten Schritte auch anders lesen:

Nicht:
„Wie setzen wir die State Machine um?“

Sondern:
„Wie verhindern wir, dass die UI später wieder zwei Wirklichkeiten behauptet?“

Dann wird klar:
	•	PR 1 verhindert logische Doppelwahrheiten
	•	PR 2 verhindert visuelle Doppelwahrheiten
	•	PR 3 verhindert interaktive Doppelwahrheiten
	•	PR 4 verhindert eingebildete Wahrheiten

Das ist die eigentlich wichtigere Ordnung.

⸻

Belegt / plausibel / spekulativ

Belegt
	•	Das Dokument definiert drei Hauptzustände und harte Übergänge.  ￼
	•	Der aktuelle UI-Stand nutzt bereits navigation, fokus, komposition sowie ein derived contextPanelOpen.  ￼

Plausibel
	•	Eine PR-Serie entlang dieser Logik reduziert Drift deutlich.
	•	Die größten Restlücken liegen in Härtung und Testschärfe, nicht mehr in der Grobarchitektur.

Spekulativ
	•	Suche/Filter/Auth könnten später zusätzliche Modellierung verlangen.
	•	MapLibre-Fokusprobleme könnten in der Praxis stärker oder schwächer auftreten als angenommen.

⸻

Risiko- und Nutzenabschätzung

Nutzen
	•	klare Zustandswahrheit
	•	weniger UI-Regressionen
	•	bessere Reviewbarkeit
	•	belastbarere Tests
	•	sauberere spätere Feature-Erweiterung

Risiken
	•	temporär mehr Boilerplate
	•	frühe Strenge könnte lokale UX-Experimente bremsen
	•	falsche Testselektion könnte trügerische Sicherheit erzeugen

Folgen
	•	Wenn du es so staffelst: stabiler Ausbau
	•	Wenn du alles in einen PR kippst: Review-Nebel, Semantikdrift, Test-Fassade

⸻

Unsicherheitsgrad

0.13

Ursachen:
	•	Repo-Vollstand hier nicht komplett sichtbar
	•	tatsächliche MapLibre-Randbedingungen nur indirekt ableitbar
	•	Produkttiefe der Panelinhalte noch offen

Interpolationsgrad

0.21

Hauptquellen:
	•	vorgeschlagene Dateischnitte
	•	vorgeschlagene Hilfsfunktionen
	•	angenommene Testarchitektur

⸻

Essenz

Hebel: die Blaupause jetzt in kleine, erzwungene PRs übersetzen.
Entscheidung: ja, Dokument umsetzen — aber als gestaffelte Contract-Serie.
Nächste Aktion: mit PR 1 „State Contract kanonisieren“ beginnen.

Wenn du willst, formuliere ich dir jetzt direkt PR 1 als exakten Umsetzungs-Prompt für Jules/Codex.