Hier ist der präzise Arbeitsauftrag an Codex für Gate A: „Hello-Map“. Bitte genau so umsetzen.

⸻

Auftrag an Codex: Gate A „Hello-Map“ (SvelteKit + MapLibre + Smoke-Test)

1) 

⸻

2) MapLibre installieren und Minimal-Karte einbauen

Paket installieren (copy-to-bash)

cd apps/web
npm i maplibre-gl

Datei anlegen/ersetzen: apps/web/src/routes/+page.svelte

<script lang="ts">
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';

  let mapContainer: HTMLDivElement;

  onMount(() => {
    const map = new maplibregl.Map({
      container: mapContainer,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: '© OpenStreetMap-Mitwirkende'
          }
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
      },
      center: [10.0, 53.55], // Hamburg
      zoom: 11
    });
    return () => map.remove();
  });
</script>

<style>
  .map { position: absolute; inset: 0; }
</style>

<div class="map" bind:this={mapContainer} aria-label="Weltgewebe-Karte" />


⸻

3) Smoke-Test hinzufügen (Playwright)

Datei: apps/web/tests/smoke.spec.ts

import { test, expect } from '@playwright/test';

test('Karte rendert', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  const map = page.locator('[aria-label="Weltgewebe-Karte"]');
  await expect(map).toBeVisible();
});

Lokaler Kurztest (copy-to-bash)

cd apps/web
npm run dev & DEV_PID=$!
sleep 3
npm test || true
kill $DEV_PID 2>/dev/null || true


⸻

4) CI-Workflow um Web-Smoke-Job erweitern

Datei ändern: .github/workflows/ci.yml → Job web_smoke am Ende einfügen.

  web_smoke:
    name: Web Smoke (Playwright)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Install deps
        run: |
          npm ci
          npx playwright install --with-deps
      - name: Start dev server
        run: |
          nohup npm run dev >/dev/null 2>&1 &
          echo $! > /tmp/dev.pid
          for i in {1..30}; do
            if curl -sf http://localhost:5173 >/dev/null; then break; fi
            sleep 1
          done
      - name: Smoke tests
        run: npm test
      - name: Stop server
        if: always()
        run: kill $(cat /tmp/dev.pid) || true

Keine Build-Artefakte nötig; schneller Dev-Server-Smoke. Bestehende Docs-Jobs unverändert lassen.

⸻

5) README-Ergänzung (Root)

Datei ändern: README.md → Block einfügen (unter „Gates“ o. ä.):

## Gate A – Hello-Map (SvelteKit + MapLibre)
Start: `cd apps/web && npm i && npm run dev` → Karte erscheint auf `http://localhost:5173`.
Test: `npm run test` (Playwright Smoke).
Keine externen Keys, keine Tracker. Tiles: OpenStreetMap.


⸻

6) DoD (Definition of Done)
	•	apps/web existiert (SvelteKit skeleton).
	•	Dev-Start zeigt Karte.
	•	apps/web/tests/smoke.spec.ts grün lokal.
	•	CI-Job Web Smoke (Playwright) vorhanden und grün.
	•	README-Block „Gate A – Hello-Map“ vorhanden.
	•	Keine externen Keys, keine Tracker.

⸻

7) Hinweise für spätere Schritte (nur notieren, nicht jetzt umsetzen)
	•	Umstieg auf PMTiles (eigene Tiles, Kosten/Autonomie).
	•	Fake-Events (Knoten/Fäden) als Layer (Gate B).
	•	Dev-Proxy/Compose (Gate C).
	•	Erste API-Routen (Gate D).

⸻

Verdichtete Essenz

Erzeuge apps/web mit SvelteKit, rendere eine MapLibre-Karte (OSM-Tiles), füge einen Playwright-Smoke-Test hinzu und erweitere die CI um einen schlanken web_smoke-Job. README kurz ergänzen. Fertig.

Ironische Auslassung

Die Welt ist groß, aber für Gate A reicht ein Rechteck-Div mit Karte – Demut vor dem DOM.

∴fores Ungewissheit

Grad: niedrig (≈20 %).
Ursachen: Playwright kann bei Runner-Kaltstarts träge sein (Port-Wartezeit). OSM-Tiles sind öffentlich, aber für CI-Nutzung kurz und selten – Risiko gering. Produktiv-systembedingt.

∆-Radar

Von reiner Doku/CI zu einem ersten sichtbaren UI-Artefakt. Straffung statt Aufblähung; nächster Mutationsschritt: Daten-Layer (Fake-Events) und lokale Tiles.