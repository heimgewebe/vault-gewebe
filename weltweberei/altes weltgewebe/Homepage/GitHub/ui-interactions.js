// ui-interactions.js — Version: Σ.v9.2.full-feedback

import { parseOptionalFloat, buildPayload, attachValidation } from './utils.js';
import { createGarnrolleSelect } from './form-components.js';
import { Validators } from './validation.js';
import { ApiService } from './api-service.js';

export function setupUIInteractions(garnrollenData, ereignisseData) {
    // Buttons
    const showZusageFormBtn = document.getElementById('show-zusage-form');
    const showGoldfadenFormBtn = document.getElementById('show-goldfaden-form');
    const showSpendeFormBtn = document.getElementById('show-spende-form');
    const showAuszahlungFormBtn = document.getElementById('show-auszahlung-form');
    const showEreignisFormBtn = document.getElementById('show-ereignis-form');
    const formContainer = document.getElementById('form-container');
    const formOverlay = document.getElementById('form-overlay');
    const formFeedbackDiv = document.getElementById('form-feedback');
    const topfStandDiv = document.getElementById('webkasse-stand');

    async function refreshTopfStand() {
        const topf = await ApiService.fetchwebkasse();
        topfStandDiv.textContent = `webkasse: ${topf.kontostand.toFixed(2)} € (${topf.buchungen.length} Buchungen)`;
    }
    refreshTopfStand();

    document.addEventListener('keydown', event => {
        if (event.key === "Escape") clearForm();
    });

    function openOverlay() {
        formOverlay.classList.add('active');
        formOverlay.setAttribute("aria-hidden", "false");
    }

    function closeOverlay() {
        formOverlay.classList.remove('active');
        formOverlay.setAttribute("aria-hidden", "true");
    }

    function focusFirstInput() {
        const firstInput = formContainer.querySelector('input, textarea, select');
        if (firstInput) firstInput.focus();
    }

    function clearForm() {
        formContainer.innerHTML = '';
        formFeedbackDiv.textContent = '';
        closeOverlay();
    }

    function createCloseButton() {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Formular schließen');
        btn.textContent = 'Schließen';
        btn.addEventListener('click', clearForm);
        return btn;
    }

    // NEU: Feedbackfunktion
    function showFeedback(type, message, timeoutMs) {
        formFeedbackDiv.className = type;
        const icon = type === 'success' 
            ? '<span style="color:#2ECC40;">&#10004;</span>'
            : '<span style="color:#E74C3C;">&#10008;</span>';
        formFeedbackDiv.innerHTML = `${icon} ${message}`;
        formFeedbackDiv.style.opacity = 1;
        setTimeout(() => {
            formFeedbackDiv.style.opacity = 0;
        }, timeoutMs);
    }

    // --- Ereignis-Formular ---
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
        openOverlay();
        focusFirstInput();
        document.getElementById('ereignis-form').appendChild(createCloseButton());
    });

    // --- Zusage-Formular ---
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
        openOverlay();
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
        document.getElementById('zusage-form').appendChild(createCloseButton());
    });

    // --- Goldfaden-Formular ---
    showGoldfadenFormBtn.addEventListener('click', () => {
        formContainer.innerHTML = `
            <form id="goldfaden-form" class="interaction-form">
                <h3>Goldfaden (sichtbare Einzahlung)</h3>
                <div id="wrapper-goldfaden-garnrolle"></div>
                <label for="goldfaden-betrag">Betrag (EUR):</label>
                <input type="number" id="goldfaden-betrag" step="0.01" min="0.01" required>
                <label for="goldfaden-kommentar">Kommentar (optional):</label>
                <textarea id="goldfaden-kommentar"></textarea>
                <button type="submit">Einzahlen</button>
            </form>
        `;
        openOverlay();
        document.getElementById('wrapper-goldfaden-garnrolle').appendChild(createGarnrolleSelect('goldfaden-garnrolle', garnrollenData));
        focusFirstInput();
        document.getElementById('goldfaden-form').appendChild(createCloseButton());

        const form = document.getElementById('goldfaden-form');
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const betrag = parseOptionalFloat('goldfaden-betrag');
            const von = document.getElementById('goldfaden-garnrolle').value;
            const kommentar = document.getElementById('goldfaden-kommentar').value;
            if (!betrag || !von) return showFeedback('error', 'Bitte alle Felder ausfüllen.', 5000);
            await ApiService.einzahlenGoldfaden({ betrag, von, kommentar });
            await refreshTopfStand();
            showFeedback('success', 'Goldfaden gespeichert!', 2500);
            clearForm();
        });
    });

    // --- Spende-Formular ---
    showSpendeFormBtn.addEventListener('click', () => {
        formContainer.innerHTML = `
            <form id="spende-form" class="interaction-form">
                <h3>Anonyme Spende</h3>
                <label for="spende-betrag">Betrag (EUR):</label>
                <input type="number" id="spende-betrag" step="0.01" min="0.01" required>
                <label for="spende-kommentar">Kommentar (optional):</label>
                <textarea id="spende-kommentar"></textarea>
                <button type="submit">Einzahlen</button>
            </form>
        `;
        openOverlay();
        focusFirstInput();
        document.getElementById('spende-form').appendChild(createCloseButton());

        const form = document.getElementById('spende-form');
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const betrag = parseOptionalFloat('spende-betrag');
            const kommentar = document.getElementById('spende-kommentar').value;
            if (!betrag) return showFeedback('error', 'Bitte Betrag eingeben.', 5000);
            await ApiService.einzahlenSpende({ betrag, kommentar });
            await refreshTopfStand();
            showFeedback('success', 'Spende gespeichert!', 2500);
            clearForm();
        });
    });

    // --- Auszahlung ---
    showAuszahlungFormBtn.addEventListener('click', () => {
        formContainer.innerHTML = `
            <form id="auszahlung-form" class="interaction-form">
                <h3>Mittel aus webkasse beantragen</h3>
                <label for="auszahlung-betrag">Betrag (EUR):</label>
                <input type="number" id="auszahlung-betrag" step="0.01" min="0.01" required>
                <label for="auszahlung-kommentar">Zweck / Kommentar:</label>
                <textarea id="auszahlung-kommentar" required></textarea>
                <button type="submit">Antrag stellen</button>
            </form>
        `;
        openOverlay();
        focusFirstInput();
        document.getElementById('auszahlung-form').appendChild(createCloseButton());

        const form = document.getElementById('auszahlung-form');
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const betrag = parseOptionalFloat('auszahlung-betrag');
            const kommentar = document.getElementById('auszahlung-kommentar').value;
            if (!betrag) return showFeedback('error', 'Bitte Betrag eingeben.', 5000);
            await ApiService.auszahlenAusTopf({ betrag, kommentar });
            await refreshTopfStand();
            showFeedback('success', 'Auszahlung beantragt!', 2500);
            clearForm();
        });
    });
}