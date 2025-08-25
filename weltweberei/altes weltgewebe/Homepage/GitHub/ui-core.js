// ui-core.js — Version: Σ.v11.1.mobile-first

import { setupUIInteractionsFinanz } from './ui-finanz.js';
import { setupUIInteractionsEreignis } from './ui-ereignis.js';
import { setupThemenfilter } from './ui-themenfilter.js';

export function initializeUI(garnrollenData, ereignisseData, layerManager) {
    setupUIInteractionsFinanz(garnrollenData);
    setupUIInteractionsEreignis(garnrollenData, ereignisseData);
    setupThemenfilter(layerManager);
    setupOverlayLogic();
}

function setupOverlayLogic() {
    const overlay = document.getElementById('form-overlay');
    const closeBtn = document.getElementById('form-close-btn');
    let lastActiveElement = null;

    // Öffnen des Overlays
    window.openOverlay = function() {
        lastActiveElement = document.activeElement;
        overlay.hidden = false;
        overlay.focus();
    };

    // Schließen des Overlays
    window.closeOverlay = function() {
        overlay.hidden = true;
        if (lastActiveElement) {
            lastActiveElement.focus();
        }
    };

    closeBtn.addEventListener('click', () => {
        closeOverlay();
    });

    document.addEventListener('keydown', e => {
        if (e.key === "Escape" && !overlay.hidden) {
            closeOverlay();
        }
    });
}