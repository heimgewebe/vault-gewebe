// ui-layer-advanced.js — Version: Σ.v1.adapted-to-toggle

export function setupLayerControls(layerManager) {
    const controlContainer = document.getElementById('layer-controls');
    if (!controlContainer) return;

    const layerNames = layerManager.getLayerNames();

    layerNames.forEach(layerName => {
        const label = document.createElement('label');
        label.textContent = ` ${layerName}`;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = layerManager.isLayerActive(layerName);

        checkbox.addEventListener('change', () => {
            layerManager.toggleLayer(layerName);
            // optional: trigger Map-Neurender
        });

        label.prepend(checkbox);
        controlContainer.appendChild(label);
    });
}