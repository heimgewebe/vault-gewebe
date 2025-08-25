// ui-interactions.js — Steuerung von Buttons und UI-Aktionen

export function setupUIInteractions() {
    const knotenButton = document.getElementById('neuer-knoten');
    const zeitreiseButton = document.getElementById('zeitreise-button');
	
	document.getElementById('toggle-faeden').addEventListener('click', () => {
    layerManager.toggleLayer('faeden');
    svgLayer.requestRender();
});

    if (knotenButton) {
        knotenButton.addEventListener('click', () => {
            alert('Knotenerstellung folgt.');
        });
    }

    if (zeitreiseButton) {
        zeitreiseButton.addEventListener('click', () => {
            alert('Zeitleiste wird aktiviert.');
        });
    }
}