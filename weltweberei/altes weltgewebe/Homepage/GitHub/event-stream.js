import { LayerKernel } from './layer-control.js';

export const EventStream = {
    state: {
        fullData: null,
        currentFilter: {
            themes: new Set(),
            currentTime: null
        }
    },

    initialize(fullData) {
        this.state.fullData = fullData;
        this._extractTimeDomain();
        this.applyFilters();
    },

    _extractTimeDomain() {
        const timestamps = this.state.fullData.ereignisse.flatMap(e => [
            new Date(e.zeitfenster_start).getTime(),
            new Date(e.zeitfenster_ende).getTime()
        ]);
        this.state.minTime = Math.min(...timestamps);
        this.state.maxTime = Math.max(...timestamps);
    },

    setTime(timestamp) {
        this.state.currentFilter.currentTime = parseInt(timestamp);
        this.applyFilters();
    },

    toggleTheme(theme) {
        if (this.state.currentFilter.themes.has(theme)) {
            this.state.currentFilter.themes.delete(theme);
        } else {
            this.state.currentFilter.themes.add(theme);
        }
        this.applyFilters();
    },

    resetThemes() {
        this.state.currentFilter.themes.clear();
        this.applyFilters();
    },

    applyFilters() {
        const { fullData, currentFilter } = this.state;
        const { themes, currentTime } = currentFilter;

        const filtered = {
            ...fullData,
            ereignisse: fullData.ereignisse.filter(e => {
                const start = new Date(e.zeitfenster_start).getTime();
                const ende = new Date(e.zeitfenster_ende).getTime();
                const timeMatch = !currentTime || (start <= currentTime && ende >= currentTime);
                const themeMatch = (themes.size === 0) || e.themenfelder.some(t => themes.has(t));
                return timeMatch && themeMatch;
            })
        };

        LayerKernel.updateData(filtered);
    }
};