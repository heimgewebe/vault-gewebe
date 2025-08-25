// main.js — Version: Σ.v∞.2.final.debug-patch (Initial Render aktiviert)

import { setupLeafletMap, setupTimeSlider } from './leaflet-setup.js';
import { updateD3Visuals } from './d3-renderer.js';
import { initializeUI } from './ui-core.js';
import { LayerManager } from './layer-manager.js';
import { initializeWebSocketSync } from './websocket-integration.js';
import { loadInitialData } from './startup-loader.js';

loadInitialData().then(initialData => {
    const map = setupLeafletMap(53.55, 10.02, 13);

    const svgLayer = L.d3SvgOverlay((selection, projection) => {
        const activeLayers = new Set(['garnrollen', 'fäden', 'goldfaeden', 'ereignisse', 'webkasse']);
        updateD3Visuals(selection, map, svgLayer.options.data, activeLayers);
    }, { data: initialData, dataKey: d => JSON.stringify(d) });

    svgLayer.addTo(map);

    // >>> Hier der entscheidende Patch: Initiales Render anstoßen
    svgLayer.requestRender();

    const layerManager = new LayerManager(map);
    layerManager.registerLayer('basis', svgLayer, initialData, true);

    setupTimeSlider(initialData, map, svgLayer);
    initializeUI(initialData.garnrollen, initialData.ereignisse, layerManager);

    document.getElementById('zeitfenster-tage').addEventListener('input', () => {
        layerManager.requestRenderAll();
    });

    initializeWebSocketSync();
});