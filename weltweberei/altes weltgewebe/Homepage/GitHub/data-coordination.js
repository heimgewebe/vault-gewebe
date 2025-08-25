import { updateD3Visuals } from './d3-renderer.js';

// Zentrales Systemobjekt
export const DataCoordinator = {
    state: {
        rawData: null,
        filteredData: null,
        activeThemes: new Set(),
        currentTime: null
    },

    initialize(data) {
        this.state.rawData = structuredClone(data);
        this.recomputeFiltered();
    },

    setTime(timestamp) {
        this.state.currentTime = new Date(parseInt(timestamp));
        this.recomputeFiltered();
    },

    toggleTheme(theme) {
        if (this.state.activeThemes.has(theme)) {
            this.state.activeThemes.delete(theme);
        } else {
            this.state.activeThemes.add(theme);
        }
        this.recomputeFiltered();
    },

    clearThemes() {
        this.state.activeThemes.clear();
        this.recomputeFiltered();
    },

    recomputeFiltered() {
        const { rawData, currentTime, activeThemes } = this.state;
        if (!rawData || !currentTime) return;

        this.state.filteredData = {
            ...rawData,
            ereignisse: rawData.ereignisse.filter(e => {
                const start = new Date(e.zeitfenster_start);
                const ende = new Date(e.zeitfenster_ende);
                const timeMatch = start <= currentTime && ende >= currentTime;
                const themeMatch = (activeThemes.size === 0) || e.themenfelder.some(t => activeThemes.has(t));
                return timeMatch && themeMatch;
            })
        };

        if (this._onUpdate) this._onUpdate(this.state.filteredData, this.state.currentTime);
    },

    onUpdate(callback) {
        this._onUpdate = callback;
    },

    refreshNewData(newData) {
        this.initialize(newData);
    }
};