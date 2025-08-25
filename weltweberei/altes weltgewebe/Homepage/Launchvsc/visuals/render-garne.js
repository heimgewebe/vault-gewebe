// visual/render-garne.js — Version: Σ.v∞.garn.verbindung.symbolisch

import * as d3 from 'd3';
import { Farben } from './colors.js';

/**
 * Zeichnet dauerhafte Garnverbindungen zwischen Knoten (z. B. durch Zusagen)
 */
export function renderGarne(svg, projection, daten) {
  const garne = daten.filter(w => w.typ === 'garn' && w.zustand !== 'verblasst');

  const verbindungen = svg.selectAll('.garn').data(garne, d => d.id);
  verbindungen.exit().remove();

  const neu = verbindungen.enter()
    .append('path')
    .attr('class', 'garn');

  neu.merge(verbindungen)
    .attr('d', d => {
      const [x1, y1] = projection([d.quelle.lng, d.quelle.lat]);
      const [x2, y2] = projection([d.ziel.lng, d.ziel.lat]);
      return `M${x1},${y1} L${x2},${y2}`;
    })
    .attr('stroke', d => {
      const farbe = Farben.garn[d.zustand] || Farben.garn.zusage;
      return farbe;
    })
    .attr('stroke-width', d => 3 + (d.intensität || 0))
    .attr('stroke-dasharray', '1,3') // Zwirn-Stil
    .attr('opacity', 0.9)
    .attr('fill', 'none');
}