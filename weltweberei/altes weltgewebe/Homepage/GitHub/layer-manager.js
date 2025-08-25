import { updateD3Visuals } from './d3-renderer.js';

export class LayerManager {
    constructor(map) {
        this.map = map;
        this.layers = new Map();
        this.debounceTimers = new Map();
        this.activeThemes = new Set();
        this.currentDate = null;
        this.errorLog = [];

        map.on('moveend zoomend', () => this.requestRenderAll());
    }

    registerLayer(name, svgLayer, initialData = null, active = true) {
        if (this.layers.has(name)) {
            this.logError(`Layer "${name}" bereits registriert`);
            return;
        }
        this.layers.set(name, { svgLayer, data: initialData, active });

        if (active) this.map.addLayer(svgLayer);
        else this.map.removeLayer(svgLayer);

        this.render(name);
    }

    updateData(name, data) {
        const layer = this.layers.get(name);
        if (!layer) return this.logError(`Layer "${name}" nicht gefunden`);
        layer.data = data;
        this.requestRender(name);
    }

    toggleVisibility(name) {
        const layer = this.layers.get(name);
        if (!layer) return this.logError(`Layer "${name}" nicht gefunden`);
        this.setVisibility(name, !layer.active);
    }

    setVisibility(name, state) {
        const layer = this.layers.get(name);
        if (!layer) return this.logError(`Layer "${name}" nicht gefunden`);
        const wasActive = layer.active;
        layer.active = !!state;

        if (layer.active && !wasActive) {
            this.map.addLayer(layer.svgLayer);
            this.requestRender(name);
        } else if (!layer.active && wasActive) {
            this.map.removeLayer(layer.svgLayer);
        }
    }

    setActiveThemes(themes) {
        this.activeThemes = new Set(themes);
        this.requestRenderAll();
    }

    setCurrentDate(date) {
        this.currentDate = date;
        this.requestRenderAll();
    }

    requestRender(name, delay = 150) {
        const layer = this.layers.get(name);
        if (!layer || !layer.active) return;

        if (this.debounceTimers.has(name)) {
            clearTimeout(this.debounceTimers.get(name));
        }
        const timer = setTimeout(() => this.render(name), delay);
        this.debounceTimers.set(name, timer);
    }

    requestRenderAll(delay = 150) {
        for (const name of this.layers.keys()) {
            this.requestRender(name, delay);
        }
    }

    render(name) {
        const layer = this.layers.get(name);
        if (!layer || !layer.active) return;

        let filteredData = layer.data;

        // Dynamisches Zeitfenster
        const tageInput = document.getElementById('zeitfenster-tage');
        const fensterTage = parseInt(tageInput?.value) || 7;
        const millisFenster = fensterTage * 24 * 60 * 60 * 1000;

        const startFenster = this.currentDate ? this.currentDate.getTime() - millisFenster : null;

        // Ereignisse Zeitfilter
        if (this.currentDate && filteredData?.ereignisse) {
            filteredData = {
                ...filteredData,
                ereignisse: filteredData.ereignisse.filter(e => {
                    const start = new Date(e.zeitraeume[0].start).getTime();
                    return (!startFenster || start >= startFenster);
                })
            };
        }

        // Goldfäden Zeitfilter
        if (this.currentDate && filteredData?.webkasse) {
            filteredData = {
                ...filteredData,
                webkasse: {
                    ...filteredData.webkasse,
                    buchungen: filteredData.webkasse.buchungen.filter(b => {
                        if (b.quelle !== "goldfaden") return false;
                        const buchungsdatum = new Date(b.datum).getTime();
                        return (!startFenster || buchungsdatum >= startFenster);
                    })
                }
            };
        }

        const activeLayers = new Set(
            Array.from(this.layers.entries())
                .filter(([layerName, l]) => l.active)
                .map(([layerName]) => layerName)
        );

        updateD3Visuals(layer.svgLayer, this.map, filteredData, activeLayers);
    }

    logError(msg) {
        console.warn(msg);
        this.errorLog.push({ msg, time: new Date() });
    }

    getErrorLog() {
        return this.errorLog.slice();
    }
}