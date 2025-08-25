// render-fadenlegende.js — Version: Σ.v1.fadenlegende

import * as d3 from 'd3';
import { FADENFARBEN, FADENSTILE } from './colors.js';

export function renderFadenlegende(containerId) {
    const fadenTypen = [
        { label: 'Gesprächsbeitrag', farbe: FADENFARBEN.gespräch, stil: FADENSTILE.normal },
        { label: 'Gesprächseröffnung', farbe: FADENFARBEN.gesprächStart, stil: FADENSTILE.normal },
        { label: 'Zusage (Garn)', farbe: FADENFARBEN.garn, stil: FADENSTILE.garn },
        { label: 'Antrag', farbe: FADENFARBEN.antrag, stil: FADENSTILE.normal },
        { label: 'Einspruch', farbe: FADENFARBEN.einspruch, stil: FADENSTILE.normal },
        { label: 'Abgelehnt', farbe: FADENFARBEN.abgelehnt, stil: FADENSTILE.normal },
        { label: 'Angenommen', farbe: FADENFARBEN.angenommen, stil: FADENSTILE.normal },
        { label: 'Goldantrag', farbe: FADENFARBEN.antrag, stil: FADENSTILE.gold },
        { label: 'Vergangen', farbe: FADENFARBEN.vergangen, stil: FADENSTILE.verblassend }
    ];

    const container = d3.select(`#${containerId}`);
    container.html(''); // Reset

    const svg = container.append('svg')
        .attr('width', 300)
        .attr('height', fadenTypen.length * 30);

    const einträge = svg.selectAll('g')
        .data(fadenTypen)
        .enter()
        .append('g')
        .attr('transform', (_, i) => `translate(10, ${i * 30 + 10})`);

    einträge.append('line')
        .attr('x1', 0)
        .attr('y1', 5)
        .attr('x2', 60)
        .attr('y2', 5)
        .attr('stroke', d => d.farbe)
        .attr('stroke-width', d => d.stil === 'garn' ? 4 : 2)
        .attr('stroke-dasharray', d => d.stil === 'verblassend' ? '2,2' : (d.stil === 'gold' ? '4,1' : ''))
        .attr('opacity', d => d.stil === 'verblassend' ? 0.3 : 1);

    einträge.append('text')
        .attr('x', 70)
        .attr('y', 9)
        .text(d => d.label)
        .attr('font-size', '12px')
        .attr('fill', '#333');
}