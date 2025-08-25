// antrag-form.js — v1

import { AntragEngine } from './antrag-engine.js';
import { generateId, todayISO } from '../../utils/utility-core.js';

export function erstelleAntragsformular(knotenId) {
    const form = document.createElement('form');
    form.innerHTML = `
        <h3>Neuer Antrag</h3>
        <label>Typ:
            <select name="typ">
                <option value="anschaffung">Anschaffung</option>
                <option value="veraenderung">Veränderung</option>
                <option value="goldantrag">Goldantrag</option>
            </select>
        </label>
        <label>Beschreibung:
            <textarea name="beschreibung" required></textarea>
        </label>
        <button type="submit">Antrag stellen</button>
    `;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const neuerAntrag = {
            id: generateId(),
            typ: formData.get('typ'),
            beschreibung: formData.get('beschreibung'),
            knotenId,
            status: 'gestellt',
            gestelltAm: todayISO()
        };
        await AntragEngine.speichere(neuerAntrag);
        alert('Antrag gestellt.');
    });

    return form;
}