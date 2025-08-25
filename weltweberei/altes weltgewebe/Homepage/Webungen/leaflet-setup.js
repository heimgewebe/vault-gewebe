// leaflet-setup.js — Version: Σ.v∞.2.audit.stable

import { updateD3Visuals } from './d3-renderer.js';
import {
    getTimeBounds,
    debouncedRender,
    rebuildLegend,
    rebuildJumpMarks
} from './utility-core.js';
import {
    initTooltip,
    showTooltip,
    hideTooltip,
    addMobileLongPress
} from './utility-tooltips.js';

let activeThemes = new Set();
let globalData = null;

export function setupLeafletMap(lat, lng, zoom) {
    const map = L.map('map').setView([lat, lng], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    return map;
}

export function setupTimeSlider(initialData, map, svgLayer) {
    globalData = structuredClone(initialData);
    const slider = document.getElementById('time-slider');
    const playButton = document.getElementById('play-button');
    const legend = document.getElementById('theme-legend');
    const dateLabel = document.getElementById('current-date-label');
    const dateDisplay = document.getElementById('current-date-display');
    const jumpContainer = document.getElementById('jump-marks');

    rebuildLegend(globalData, legend, handleThemeToggle);
    rebuildJumpMarks(globalData, jumpContainer, slider, filterAndRender);

    const timeBounds = getTimeBounds(globalData.ereignisse);
    const { minTime, maxTime, adaptiveStep } = timeBounds;

    slider.min = minTime;
    slider.max = maxTime;
    slider.step = adaptiveStep;
    slider.value = minTime;

    function filterAndRender(timestamp) {
        const currentTime = new Date(parseInt(timestamp));
        dateLabel.textContent = currentTime.toLocaleDateString();
        dateDisplay.textContent = currentTime.toLocaleDateString();

        const filteredData = {
            ...globalData,
            ereignisse: globalData.ereignisse.filter(e => {
                const start = new Date(e.zeitfenster_start);
                const ende = new Date(e.zeitfenster_ende);
                const timeMatch = start <= currentTime && ende >= currentTime;
                const themeMatch = (activeThemes.size === 0) || e.themenfelder.some(t => activeThemes.has(t));
                return timeMatch && themeMatch;
            })
        };
        svgLayer.options.data = filteredData;
        debouncedRender(() => updateD3Visuals(svgLayer, map, svgLayer.options.data))();
    }

    function handleThemeToggle(theme) {
        if (activeThemes.has(theme)) {
            activeThemes.delete(theme);
        } else {
            activeThemes.add(theme);
        }
        filterAndRender(slider.value);
    }

    slider.addEventListener('input', e => filterAndRender(e.target.value));
    filterAndRender(slider.value);

    let interval = null;
    playButton?.addEventListener('click', () => {
        if (interval) {
            clearInterval(interval);
            interval = null;
            playButton.textContent = '▶️';
        } else {
            playButton.textContent = '⏸️';
            interval = setInterval(() => {
                let nextValue = parseInt(slider.value) + parseInt(slider.step);
                if (nextValue > parseInt(slider.max)) {
                    nextValue = parseInt(slider.min);
                }
                slider.value = nextValue;
                filterAndRender(nextValue);
            }, 400);
        }
    });

    map.on('moveend zoomend', () => filterAndRender(slider.value));

    initTooltip();
}