// ui-core.js — Version: Σ.v∞.2.final.audit
// Systemische UI-Schaltzentrale der Weltweberei (fully audit integrated)

import { setupUIInteractionsFinanz } from './ui-finanz.js';
import { setupUIInteractionsEreignis } from './ui-ereignis.js';
import { setupThemenfilter } from './ui-themenfilter.js';

/**
 * Initialisiert sämtliche UI-Subsysteme der Weltweberei.
 * Alle Formulare, Filter, Themen und Finanzinteraktionen werden hier gestartet.
 */
export function initializeUI(garnrollenData, ereignisseData, layerManager) {
    setupUIInteractionsFinanz(garnrollenData);
    setupUIInteractionsEreignis(garnrollenData, ereignisseData);
    setupThemenfilter(layerManager);
    setupOverlayLogic();
}

/**
 * Steuerung der Overlay-Logik für alle Formulare.
 */
function setupOverlayLogic() {
    const overlay = document.getElementById('form-overlay');
    const closeBtn = document.getElementById('form-close-btn');
    let lastActiveElement = null;

    window.openOverlay = function () {
        lastActiveElement = document.activeElement;
        overlay.hidden = false;
        overlay.focus();
    };

    window.closeOverlay = function () {
        overlay.hidden = true;
        if (lastActiveElement) {
            lastActiveElement.focus();
        }
    };

    closeBtn.addEventListener('click', () => closeOverlay());

    document.addEventListener('keydown', e => {
        if (e.key === "Escape" && !overlay.hidden) {
            closeOverlay();
        }
    });
}