// leaflet-setup.js — Version: Σ.v11.2

import { updateD3Visuals } from './d3-renderer.js';

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

    rebuildLegend(globalData, legend);
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
        dateDisplay.textContent = currentTime.toLocaleDateString(); // NEU

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
        debouncedRender();
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

    let debounceTimer;
    function debouncedRender(delay = 150) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            updateD3Visuals(svgLayer, map, svgLayer.options.data);
        }, delay);
    }
    map.on('moveend zoomend', () => debouncedRender());
}

function getTimeBounds(ereignisse) {
    const timestamps = ereignisse.flatMap(e => [
        new Date(e.zeitfenster_start),
        new Date(e.zeitfenster_ende)
    ]);
    const minTime = Math.min(...timestamps.map(t => t.getTime()));
    const maxTime = Math.max(...timestamps.map(t => t.getTime()));
    const totalRange = maxTime - minTime;
    const adaptiveStep = Math.max(1000 * 60 * 60, totalRange / 200);
    return { minTime, maxTime, adaptiveStep };
}

function rebuildLegend(data, legendContainer) {
    legendContainer.innerHTML = '<h3>Themenfilter</h3>';
    const allThemes = new Set(data.ereignisse.flatMap(e => e.themenfelder));

    allThemes.forEach(theme => {
        const count = data.ereignisse.filter(e => e.themenfelder.includes(theme)).length;
        const btn = document.createElement('button');
        btn.textContent = `${theme} (${count})`;
        btn.className = 'legend-button';
        btn.setAttribute('aria-pressed', 'false');
        btn.addEventListener('click', () => {
            if (activeThemes.has(theme)) {
                activeThemes.delete(theme);
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            } else {
                activeThemes.add(theme);
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
            }
            const slider = document.getElementById('time-slider');
            filterAndRender(slider.value);
        });
        legendContainer.appendChild(btn);
    });

    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Filter zurücksetzen';
    resetBtn.className = 'legend-reset';
    resetBtn.addEventListener('click', () => {
        activeThemes.clear();
        legendContainer.querySelectorAll('.legend-button').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
        });
        const slider = document.getElementById('time-slider');
        filterAndRender(slider.value);
    });
    legendContainer.appendChild(resetBtn);
}

function rebuildJumpMarks(data, jumpContainer, slider, filterAndRender) {
    const keyEvents = data.ereignisse
        .map(e => ({
            timestamp: new Date(e.zeitfenster_start).getTime(),
            titel: e.titel,
            gewicht: e.themenfelder?.length || 1
        }))
        .sort((a, b) => b.gewicht - a.gewicht)
        .slice(0, 10)
        .sort((a, b) => a.timestamp - b.timestamp);

    jumpContainer.innerHTML = '<h3>Sprungmarken</h3>';
    jumpContainer.setAttribute('role', 'navigation');
    jumpContainer.setAttribute('aria-label', 'Sprungmarken');

    keyEvents.forEach(({ timestamp, titel }) => {
        const btn = document.createElement('button');
        const shortTitle = titel.length > 20 ? titel.substring(0, 17) + '…' : titel;
        btn.textContent = shortTitle;
        btn.title = titel;
        btn.className = 'jump-button';
        btn.setAttribute('aria-label', `Springe zu ${titel}`);
        btn.addEventListener('click', () => {
            slider.value = timestamp;
            filterAndRender(timestamp);
            btn.focus();
        });
        jumpContainer.appendChild(btn);
    });
}

export function refreshData(newData) {
    globalData = structuredClone(newData);
    rebuildLegend(globalData, document.getElementById('theme-legend'));
    rebuildJumpMarks(globalData, document.getElementById('jump-marks'), document.getElementById('time-slider'), filterAndRender);
    filterAndRender(document.getElementById('time-slider').value);
}