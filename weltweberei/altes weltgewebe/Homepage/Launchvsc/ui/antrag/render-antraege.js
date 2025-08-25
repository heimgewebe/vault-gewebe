// render-antraege.js — v1

import { getFarbeFürAntrag } from './colors.js';

export function renderAntragsfaden(antrag) {
    const farbe = getFarbeFürAntrag(antrag);
    const faden = L.polyline([antrag.start, antrag.ziel], {
        color: farbe,
        weight: 3,
        className: antrag.typ === 'goldantrag' ? 'goldrand' : ''
    });
    faden.addTo(window.map); // globale Referenz
}