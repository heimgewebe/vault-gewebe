// knoten-form.js — Formular zur Knotenerstellung

import { erstelleKnoten } from './knoten-engine.js';

export function initKnotenForm() {
    const form = document.getElementById('knoten-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const titel = form.querySelector('#titel').value;
        const beschreibung = form.querySelector('#beschreibung').value;

        await erstelleKnoten({ titel, beschreibung });
        form.reset();
    });
}