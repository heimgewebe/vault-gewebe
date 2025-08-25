// visual/render-faeden.js — Version: Σ.v∞.faeden.typisiert

import { select } from 'd3-selection';
import { Farben } from './colors.js';
import { SystemMeta } from '../system-meta.js';

/**
 * Zeichnet temporäre Verbindungen („Fäden“) z. B. Wortbeiträge, Anträge etc.
 */
export function renderFaeden(svg, projection, daten) {
  if (!SystemMeta.istLayerAktiv('faeden')) return;

  const faeden = daten.webungen.filter(w => w.typ === 'faden' && w.zustand !== 'verblasst');

  const layer = svg.selectAll('.faden').data(faeden, d => d.id);

  layer.enter()
    .append('line')
    .attr('class', 'faden')
    .attr('x1', d => projection(d.von)[0])
    .attr('y1', d => projection(d.von)[1])
    .attr('x2', d => projection(d.zu)[0])
    .attr('y2', d => projection(d.zu)[1])
    .style('stroke', d => Farben.faden[d.subtyp] || Farben.faden.wortbeitrag)
    .style('stroke-width', d => Math.max(1, d.stärke || 1))
    .style('opacity', d => d.transparenz || 0.4);

  layer.exit().remove();
}