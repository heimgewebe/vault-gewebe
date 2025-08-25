// ui-knoten.js — Anzeige eines Knotens + Optionen

import { getKnotenById } from '../../data/data-knoten.js';

export function showKnotenInfo(knotenId) {
    const knoten = getKnotenById(knotenId);
    if (!knoten) return;

    const info = `
        <h2>${knoten.titel}</h2>
        <p>${knoten.beschreibung}</p>
        <button id="beitreten-btn">Beitreten</button>
    `;

    window.showInfoPanel(info);

    const btn = document.getElementById('beitreten-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            alert('Webung mit diesem Knoten folgt.');
        });
    }
}