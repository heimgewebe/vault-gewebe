// ui-ereignis.js — Interaktion mit einzelnen Knotenpunkten

import { showKnotenInfo } from './knoten/ui-knoten.js';

export function setupEreignisInteraktion() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('.knotenpunkt');
        if (target) {
            const knotenId = target.dataset.knotenId;
            if (knotenId) {
                showKnotenInfo(knotenId);
            }
        }
    });
}