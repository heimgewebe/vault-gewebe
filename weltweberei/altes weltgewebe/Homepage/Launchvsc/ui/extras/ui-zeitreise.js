// ui-zeitreise.js — v1

import { zeitleiste } from './zeitleiste.js';

export function setupZeitreiseUI() {
    const controls = document.getElementById('zeitreise-controls');
    const startBtn = controls.querySelector('#start-zeitreise');
    const stopBtn = controls.querySelector('#stop-zeitreise');
    const slider = controls.querySelector('#zeitreise-slider');

    let interval = null;

    startBtn.addEventListener('click', () => {
        let tag = parseInt(slider.value, 10);
        interval = setInterval(() => {
            zeitleiste.zeigeTag(tag++);
            slider.value = tag;
        }, 1000);
    });

    stopBtn.addEventListener('click', () => {
        clearInterval(interval);
        interval = null;
    });

    slider.addEventListener('input', () => {
        zeitleiste.zeigeTag(parseInt(slider.value, 10));
    });
}