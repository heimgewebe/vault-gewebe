// ui-diskurs.js — Anzeige des Gesprächsverlaufs innerhalb eines Knotens

import { getBeitraegeFuerKnoten } from '../../data/data-diskurs.js';
import { startBeitragFormular } from './diskurs-form.js';

export function zeigeDiskurs(knotenId) {
    const beitraege = getBeitraegeFuerKnoten(knotenId);

    const html = `
        <div class="diskurs-header">
            <h3>Gespräch zum Knoten</h3>
            <button id="beitrag-hinzufuegen">Beitrag verfassen</button>
        </div>
        <ul class="diskurs-liste">
            ${beitraege.map(b => `<li><strong>${b.autor}:</strong> ${b.text}</li>`).join('')}
        </ul>
        <div id="diskurs-formular"></div>
    `;

    const container = document.getElementById('diskurs-container');
    if (container) container.innerHTML = html;

    document.getElementById('beitrag-hinzufuegen')?.addEventListener('click', () => {
        startBeitragFormular(knotenId);
    });
}