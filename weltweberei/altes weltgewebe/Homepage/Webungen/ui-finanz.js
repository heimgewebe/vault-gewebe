// ui-finanz.js — Version: Σ.v∞.2.finance.audit.stable

import { ApiService } from './api-service.js';

export class UIFinanz {
    constructor() {
        this.formContainer = document.getElementById('finanz-form');
        this.feedbackContainer = document.getElementById('finanz-feedback');
    }

    async showSpendeForm() {
        this.formContainer.innerHTML = `
            <h3>Spende (anonym oder benannt)</h3>
            <label>Betrag (EUR): <input id="betrag" type="number" step="0.01" required></label>
            <label>Kommentar: <input id="kommentar" type="text"></label>
            <label>Anonym? <input id="anonym" type="checkbox"></label>
            <label>Garnrolle-ID (falls benannt): <input id="garnrolle" type="text"></label>
            <button id="absenden">Absenden</button>
        `;

        document.getElementById('absenden').onclick = async () => {
            try {
                const betrag = parseFloat(document.getElementById('betrag').value);
                const kommentar = document.getElementById('kommentar').value;
                const anonym = document.getElementById('anonym').checked;
                const garnrolleId = document.getElementById('garnrolle').value || null;
                await ApiService.einzahlenSpende({ betrag, kommentar, anonym, garnrolleId });
                this.showFeedback("Spende verbucht.");
            } catch (err) {
                this.showFeedback("Fehler: " + err.message);
            }
        };
    }

    async showGoldfadenForm() {
        this.formContainer.innerHTML = `
            <h3>Goldfaden einzahlen</h3>
            <label>Betrag (EUR): <input id="betrag" type="number" step="0.01" required></label>
            <label>Kommentar: <input id="kommentar" type="text"></label>
            <label>Garnrolle-ID: <input id="garnrolle" type="text" required></label>
            <button id="absenden">Absenden</button>
        `;

        document.getElementById('absenden').onclick = async () => {
            try {
                const betrag = parseFloat(document.getElementById('betrag').value);
                const kommentar = document.getElementById('kommentar').value;
                const garnrolleId = document.getElementById('garnrolle').value;
                await ApiService.einzahlenGoldfaden({ betrag, kommentar, garnrolleId });
                this.showFeedback("Goldfaden verbucht.");
            } catch (err) {
                this.showFeedback("Fehler: " + err.message);
            }
        };
    }

    async showAuszahlungForm() {
        this.formContainer.innerHTML = `
            <h3>Auszahlung aus Webkasse</h3>
            <label>Betrag (EUR): <input id="betrag" type="number" step="0.01" required></label>
            <label>Kommentar: <input id="kommentar" type="text"></label>
            <label>Empfänger: <input id="empfänger" type="text" required></label>
            <button id="absenden">Absenden</button>
        `;

        document.getElementById('absenden').onclick = async () => {
            try {
                const betrag = parseFloat(document.getElementById('betrag').value);
                const kommentar = document.getElementById('kommentar').value;
                const empfänger = document.getElementById('empfänger').value;
                await ApiService.auszahlenAusTopf({ betrag, kommentar, empfänger });
                this.showFeedback("Auszahlung verbucht.");
            } catch (err) {
                this.showFeedback("Fehler: " + err.message);
            }
        };
    }

    async showBuchungen() {
        const buchungen = await ApiService.getBuchungen();
        this.formContainer.innerHTML = `
            <h3>Buchungen Webkasse</h3>
            <ul>
                ${buchungen.map(b => `<li>[${b.typ}] ${b.betrag} EUR – ${b.kommentar} (${b.datum})</li>`).join('')}
            </ul>
        `;
    }

    showFeedback(msg) {
        this.feedbackContainer.innerText = msg;
    }
}