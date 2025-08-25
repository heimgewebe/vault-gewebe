// ui-antrag.js — v1

import { AntragEngine } from './antrag-engine.js';
import { renderAntragsfaden } from '../../visual/render-antraege.js';

export function setupAntragUI() {
    document.addEventListener('click', async (e) => {
        if (e.target.matches('[data-antrag-id]')) {
            const id = e.target.dataset.antragId;
            const antrag = await AntragEngine.finde(id);
            if (antrag) {
                renderAntragsfaden(antrag);
            }
        }
    });
}