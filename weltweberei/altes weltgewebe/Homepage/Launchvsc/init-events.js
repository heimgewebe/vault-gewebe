import { EventEngine } from './engine-events.js';

import { renderKnoten } from './visual/render-knoten.js';
import { renderFäden } from './visual/render-faeden.js';
import { renderGarne } from './visual/render-garne.js';
import { renderAntraege } from './visual/render-antraege.js';
import { renderWebkasse } from './visual/render-webkasse.js';

export function registriereSymbolRenderEvents() {
  EventEngine.on('renderKnoten', ({ map, daten }) => {
    if (!map._svgLayer || !map._projection) return;
    renderKnoten(map._svgLayer, map._projection, daten.knoten);
  });

  EventEngine.on('renderFäden', ({ map, daten }) => {
    if (!map._svgLayer || !map._projection) return;
    renderFäden(map._svgLayer, map._projection, daten.faeden);
  });

  EventEngine.on('renderGarne', ({ map, daten }) => {
    if (!map._svgLayer || !map._projection) return;
    renderGarne(map._svgLayer, map._projection, daten.webungen);
  });

  EventEngine.on('renderAntraege', ({ map, daten }) => {
    if (!map._svgLayer || !map._projection) return;
    renderAntraege(map._svgLayer, map._projection, daten.webungen);
  });

  EventEngine.on('renderWebkasse', ({ map, daten }) => {
    if (!map._svgLayer || !map._projection) return;
    renderWebkasse(map._svgLayer, map._projection, daten, () => {}, () => {});
  });
}