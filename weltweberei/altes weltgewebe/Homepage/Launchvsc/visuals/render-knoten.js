// render-knoten.js — Version: Σ.v∞.svg.symbol.farbenbasiert

import { Farben } from './colors.js';

export function renderKnoten(selection, projection, bounds, data, showTooltip, hideTooltip) {
  const getLatLng = e =>
    Array.isArray(e.koordinaten)
      ? [e.koordinaten[0], e.koordinaten[1]]
      : [e.koordinaten.lat, e.koordinaten.lng];

  const visible = data.knoten.filter(e => bounds.contains(getLatLng(e)));

  const groups = selection.selectAll('.knoten').data(visible, d => d.id);

  const enter = groups.enter().append('g').attr('class', 'knoten');

  enter.merge(groups)
    .attr('transform', d => {
      const [lat, lng] = getLatLng(d);
      const p = projection({ lat, lng });
      return `translate(${p.x},${p.y})`;
    })
    .each(function (d) {
      const g = d3.select(this);
      const r = d.typ === 'person' ? 10 : 12;
      const fill = Farben.knoten[d.typ] || Farben.knoten.standard;

      g.selectAll('circle')
        .data([d])
        .join('circle')
        .attr('r', r)
        .attr('fill', fill)
        .attr('stroke', '#000')
        .attr('stroke-width', 1.5);

      g.on('mouseover', e => showTooltip(d.titel || 'Knoten', e.pageX, e.pageY))
       .on('mouseout', hideTooltip);
    });

  groups.exit().remove();
}