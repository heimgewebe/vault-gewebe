// ui-ereignis.js — Version: Σ.v11.1.mobile-first

import { Validators } from './validation.js';
import { attachValidation, createGarnrolleSelect } from './form-components.js';
import { parseOptionalFloat } from './utils.js';
import { ApiService } from './api-service.js';

export function setupUIInteractionsEreignis(garnrollenData, ereignisseData) {
    const showZusageFormBtn = document.getElementById('show-zusage-form');
    const showEreignisFormBtn = document.getElementById('show-ereignis-form');
    const formContainer = document.getElementById('form-container');
    const formFeedbackDiv = document.getElementById('form-feedback');

    function showFeedback(type, message, timeoutMs = 3000) {
        formFeedbackDiv.className = type;
        formFeedbackDiv.textContent = message;
        formFeedbackDiv.style.opacity = 1;
        setTimeout(() => { formFeedbackDiv.style.opacity = 0; }, timeoutMs);
    }

    function clearForm() {
        const form = formContainer.querySelector('form');
        if (form) form.reset();
    }

    // Ereignis-Formular
    showEreignisFormBtn.addEventListener('click', () => {
        formContainer.innerHTML = `
            <form id="ereignis-form" class="interaction-form">
                <h3>Neues Ereignis anlegen</h3>
                <label for="ereignis-titel">Titel:</label>
                <input type="text" id="ereignis-titel" required>
                <label for="ereignis-beschreibung">Beschreibung:</label>
                <textarea id="ereignis-beschreibung" required></textarea>
                <label for="ereignis-lat">Breitengrad:</label>
                <input type="number" id="ereignis-lat" step="0.000001" required>
                <label for="ereignis-lng">Längengrad:</label>
                <input type="number" id="ereignis-lng" step="0.000001" required>
                <label for="ereignis-start">Beginn:</label>
                <input type="datetime-local" id="ereignis-start" required>
                <label for="ereignis-ende">Ende:</label>
                <input type="datetime-local" id="ereignis-ende" required>
                <button type="submit">Ereignis anlegen</button>
            </form>
        `;
        window.openOverlay();
        focusFirstInput();

        const form = document.getElementById('ereignis-form');
        attachValidation(form);
        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (!Validators.ereignis(form)) {
                showFeedback('error', 'Bitte alle Pflichtfelder korrekt ausfüllen.', 4000);
                return;
            }
            try {
                const titel = document.getElementById('ereignis-titel').value;
                const beschreibung = document.getElementById('ereignis-beschreibung').value;
                const lat = parseOptionalFloat('ereignis-lat');
                const lng = parseOptionalFloat('ereignis-lng');
                const start = document.getElementById('ereignis-start').value;
                const ende = document.getElementById('ereignis-ende').value;

                await ApiService.anlegenEreignis({
                    titel, beschreibung, koordinaten: [lat, lng], start, ende
                });

                showFeedback('success', 'Ereignis gespeichert!', 2500);
                clearForm();
            } catch (err) {
                showFeedback('error', 'Fehler beim Speichern: ' + err.message, 5000);
            }
        });
    });

    // Zusage-Formular
    showZusageFormBtn.addEventListener('click', () => {
        formContainer.innerHTML = `
            <form id="zusage-form" class="interaction-form">
                <h3>Teilnahme zusagen</h3>
                <div id="wrapper-zusage-garnrolle"></div>
                <div id="wrapper-zusage-ereignis"></div>
                <label for="zusage-kommentar">Kommentar:</label>
                <textarea id="zusage-kommentar" required></textarea>
                <button type="submit">Absenden</button>
            </form>
        `;
        window.openOverlay();
        document.getElementById('wrapper-zusage-garnrolle').appendChild(createGarnrolleSelect('zusage-garnrolle', garnrollenData));

        const ereignisSelect = document.createElement('select');
        ereignisSelect.id = 'zusage-ereignis';
        ereignisSelect.required = true;
        ereignisSelect.appendChild(new Option('Wähle ein Ereignis', '', true, true));
        ereignisseData.forEach(({ id, titel }) => {
            ereignisSelect.appendChild(new Option(titel, id));
        });
        document.getElementById('wrapper-zusage-ereignis').appendChild(ereignisSelect);

        focusFirstInput();

        const form = document.getElementById('zusage-form');
        attachValidation(form);
        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (!Validators.zusage(form)) {
                showFeedback('error', 'Bitte alle Pflichtfelder korrekt ausfüllen.', 4000);
                return;
            }
            try {
                const garnrolleId = document.getElementById('zusage-garnrolle').value;
                const ereignisId = document.getElementById('zusage-ereignis').value;
                const kommentar = document.getElementById('zusage-kommentar').value;

                await ApiService.zusageErfassen({
                    garnrolleId, ereignisId, kommentar
                });

                showFeedback('success', 'Zusage gespeichert!', 2500);
                clearForm();
            } catch (err) {
                showFeedback('error', 'Fehler beim Speichern: ' + err.message, 5000);
            }
        });
    });
}