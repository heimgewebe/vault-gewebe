import { initKarte } from './leaflet-setup.js';
import { startupLoader } from './startup-loader.js';
import { layerManager } from './layer-manager.js';
import { renderKnoten } from './visual/render-knoten.js';
import { renderFäden } from './visual/render-faeden.js';
import { renderGarne } from './visual/render-garne.js';
import { renderAntraege } from './visual/render-antraege.js';
import { renderWebkasse } from './visual/render-webkasse.js';

async function init() {
  const map = initKarte();
  window.map = map; // Debug sichtbar machen

  // Warte, bis SVG-Overlay bereit
  await new Promise(resolve => {
    const check = () => (map._svgLayer && map._projection ? resolve() : requestAnimationFrame(check));
    check();
  });

  const daten = await startupLoader();

  // Layer einzeln rendern (Testversion sichtbar!)
  renderKnoten(map._svgLayer, map._projection, daten.knoten);
  renderFäden(map._svgLayer, map._projection, daten.faeden);
  renderGarne(map._svgLayer, map._projection, daten.webungen);
  renderAntraege(map._svgLayer, map._projection, daten.webungen);
  renderWebkasse(map._svgLayer, map._projection, daten, () => {}, () => {});

  console.log('✅ Sichtbare Initialisierung abgeschlossen');
}

init();