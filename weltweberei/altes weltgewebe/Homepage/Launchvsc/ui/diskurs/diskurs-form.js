// diskurs-form.js — Formular zur Erstellung eines Diskursbeitrags

import { hinzufuegenBeitrag } from './diskurs-engine.js';

export function startBeitragFormular(knotenId) {
    const html = `
        <form id="diskurs-eingabe">
            <input type="text" id="autor" placeholder="Dein Name" required />
            <textarea id="text" placeholder="Dein Beitrag" required></textarea>
            <button type="submit">Absenden</button>
        </form>
    `;

    const ziel = document.getElementById('diskurs-formular');
    if (ziel) ziel.innerHTML = html;

    const form = document.getElementById('diskurs-eingabe');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const autor = form.querySelector('#autor').value;
            const text = form.querySelector('#text').value;
            await hinzufuegenBeitrag(knotenId, autor, text);
            form.reset();
        });
    }
}