// ui-layer-toggle.js — Version: Σ.v1.layer.ui.toggle

export function setupLayerToggle(layerManager) {
    const container = document.getElementById('layer-controls');
    if (!container) return;

    const layerLabels = {
        knoten: 'Knoten',
        faeden: 'Fäden',
        garne: 'Garne',
        antraege: 'Anträge',
        webkasse: 'Webkasse'
    };

    Object.keys(layerLabels).forEach(layerKey => {
        const label = document.createElement('label');
        label.classList.add('layer-toggle-label');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = layerManager.isLayerVisible(layerKey);
        checkbox.addEventListener('change', () => {
            layerManager.setLayerVisibility(layerKey, checkbox.checked);
        });

        label.appendChild(checkbox);
        label.append(` ${layerLabels[layerKey]}`);
        container.appendChild(label);
    });
}