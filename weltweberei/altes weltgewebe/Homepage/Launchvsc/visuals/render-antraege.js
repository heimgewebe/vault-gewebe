// visual/render-antraege.js — Version: Σ.v∞.antrag.statusfarben.klar

import * as d3 from 'd3';
import { Farben } from './colors.js';

/**
 * Zeichnet alle Anträge mit Farbcodierung je nach Status
 */
export function renderAntraege(svg, projection, daten) {
  const antraege = daten.filter(w => w.typ === 'antrag' && w.zustand !== 'verblasst');

  const verbindungen = svg.selectAll('.antrag')
    .data(antraege, d => d.id);

  verbindungen.exit().remove();

  const neu = verbindungen.enter()
    .append('path')
    .attr('class', 'antrag');

  neu.merge(verbindungen)
    .attr('d', d => {
      const [x1, y1] = projection([d.quelle.lng, d.quelle.lat]);
      const [x2, y2] = projection([d.ziel.lng, d.ziel.lat]);
      return `M${x1},${y1} L${x2},${y2}`;
    })
    .attr('stroke', d => Farben.antrag[d.status] || Farben.antrag.gestellt)
    .attr('stroke-width', 3)
    .attr('stroke-dasharray', '2,4')
    .attr('opacity', 0.9)
    .attr('fill', 'none')
    .attr('filter', d => d.kategorie === 'goldantrag' ? 'url(#goldrand)' : null);
}