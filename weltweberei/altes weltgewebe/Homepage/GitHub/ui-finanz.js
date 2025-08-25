// ui-finanz.js — Version: Σ.v11.1.mobile-first

import { Validators } from './validation.js';
import { attachValidation } from './form-components.js';
import { parseOptionalFloat } from './utils.js';
import { ApiService } from './api-service.js';

export function setupUIInteractionsFinanz(garnrollenData) {
    const showGoldfadenFormBtn = document.getElementById('show-goldfaden-form');
    const showSpendeFormBtn = document.getElementById('show-spende-form');
    const showAuszahlungFormBtn = document.getElementById('show-auszahlung-form');
    const formContainer = document.getElementById('form-container');
    const formFeedbackDiv = document.getElementById('form-feedback');
    const topfStandDiv = document.getElementById('webkasse-stand');

    function showFeedback(type, message, timeoutMs = 3000) {
        formFeedbackDiv.className = type;
        formFeedbackDiv.textContent = message;
        formFeedbackDiv.style.opacity = 1;
        setTimeout(() => { formFeedbackDiv.style.opacity = 0; }, timeoutMs);
    }

    async function refreshTopfStand() {
        try {
            const topf = await ApiService.fetchwebkasse();
            topfStandDiv.textContent = `webkasse: ${topf.betrag.toFixed(2)} €`;
        } catch (err) {
            topfStandDiv.textContent = 'Fehler beim Laden des webkasses';
        }
    }

    function clearForm() {
        const form = formContainer.querySelector('form');
        if (form) form.reset();
    }

    // GOLD-FADEN FORMULAR
    showGoldfadenFormBtn.addEventListener('click', () => {
        formContainer.innerHTML = `
            <form id="goldfaden-form" class="interaction-form">
                <h3>Goldfaden einzahlen</h3>
                <label for="goldfaden-betrag">Betrag (EUR):</label>
                <input type="number" id="goldfaden-betrag" step="0.01" min="0.01" required>
                <label for="goldfaden-von">Von (Name):</label>
                <input type="text" id="goldfaden-von" required>
                <label for="goldfaden-kommentar">Kommentar (optional):</label>
                <textarea id="goldfaden-kommentar"></textarea>
                <button type="submit">Einzahlen</button>
            </form>
        `;
        window.openOverlay();
        focusFirstInput();
        document.getElementById('goldfaden-form').appendChild(createCloseButton());

        const form = document.getElementById('goldfaden-form');
        attachValidation(form);
        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (!Validators.goldfaden(form)) {
                showFeedback('error', 'Bitte alle Pflichtfelder korrekt ausfüllen.', 4000);
                return;
            }
            try {
                const betrag = parseOptionalFloat('goldfaden-betrag');
                const von = document.getElementById('goldfaden-von').value.trim();
                const kommentar = document.getElementById('goldfaden-kommentar').value;
                await ApiService.einzahlenGoldfaden({ betrag, von, kommentar });
                await refreshTopfStand();
                showFeedback('success', 'Goldfaden gespeichert!', 2500);
                clearForm();
            } catch (err) {
                showFeedback('error', 'Fehler beim Speichern: ' + err.message, 5000);
            }
        });
    });

    // SPENDEN FORMULAR
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
        window.openOverlay();
        focusFirstInput();
        document.getElementById('spende-form').appendChild(createCloseButton());

        const form = document.getElementById('spende-form');
        attachValidation(form);
        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (!Validators.spende(form)) {
                showFeedback('error', 'Bitte alle Pflichtfelder korrekt ausfüllen.', 4000);
                return;
            }
            try {
                const betrag = parseOptionalFloat('spende-betrag');
                const kommentar = document.getElementById('spende-kommentar').value;
                await ApiService.einzahlenSpende({ betrag, kommentar });
                await refreshTopfStand();
                showFeedback('success', 'Spende gespeichert!', 2500);
                clearForm();
            } catch (err) {
                showFeedback('error', 'Fehler beim Speichern: ' + err.message, 5000);
            }
        });
    });

    // AUSZAHLUNGS FORMULAR
    showAuszahlungFormBtn.addEventListener('click', () => {
        formContainer.innerHTML = `
            <form id="auszahlung-form" class="interaction-form">
                <h3>Auszahlung beantragen</h3>
                <label for="auszahlung-betrag">Betrag (EUR):</label>
                <input type="number" id="auszahlung-betrag" step="0.01" min="0.01" required>
                <label for="auszahlung-antragid">Antragsteller-ID:</label>
                <input type="text" id="auszahlung-antragid" required>
                <label for="auszahlung-kommentar">Kommentar (optional):</label>
                <textarea id="auszahlung-kommentar"></textarea>
                <button type="submit">Beantragen</button>
            </form>
        `;
        window.openOverlay();
        focusFirstInput();
        document.getElementById('auszahlung-form').appendChild(createCloseButton());

        const form = document.getElementById('auszahlung-form');
        attachValidation(form);
        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (!Validators.auszahlung(form)) {
                showFeedback('error', 'Bitte alle Pflichtfelder korrekt ausfüllen.', 4000);
                return;
            }
            try {
                const betrag = parseOptionalFloat('auszahlung-betrag');
                const antrag_id = document.getElementById('auszahlung-antragid').value.trim();
                const kommentar = document.getElementById('auszahlung-kommentar').value;
                await ApiService.auszahlenAusTopf({ betrag, antrag_id, kommentar });
                await refreshTopfStand();
                showFeedback('success', 'Auszahlung beantragt!', 2500);
                clearForm();
            } catch (err) {
                showFeedback('error', 'Fehler beim Beantragen: ' + err.message, 5000);
            }
        });
    });

    refreshTopfStand();
}