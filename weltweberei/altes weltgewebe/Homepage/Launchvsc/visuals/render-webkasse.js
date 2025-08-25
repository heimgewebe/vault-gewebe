// visual/render-webkasse.js — Version: Σ.v∞.symbol.gold.circle

import { Farben } from './colors.js';

/**
 * Zeichnet die kollektive Webkasse als Kreis mit Goldfarbe
 */
export function renderWebkasse(selection, projection, data, showTooltip, hideTooltip) {
  const pos = projection({ lat: 53.56, lng: 10.03 }); // feste Position
  const stand = data.webkasse?.kontostand || 0;
  const radius = Math.sqrt(stand) * 0.05 + 10;

  const topf = selection.selectAll('.webkasse').data([stand]);

  topf.enter()
    .append('circle')
    .attr('class', 'webkasse')
    .merge(topf)
    .attr('cx', pos.x)
    .attr('cy', pos.y)
    .attr('r', radius)
    .attr('fill', Farben.webkasse)
    .attr('fill-opacity', 0.8)
    .attr('stroke', '#222')
    .attr('stroke-width', 1.5)
    .on('mouseover', e => showTooltip(`Webkasse: ${stand.toFixed(2)} €`, e.pageX, e.pageY))
    .on('mouseout', hideTooltip);

  topf.exit().remove();
}