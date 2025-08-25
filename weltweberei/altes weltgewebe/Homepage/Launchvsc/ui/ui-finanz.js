// ui-finanz.js — Webkassenanzeige & Interaktion

export function renderWebkasse(data) {
    const container = document.getElementById('webkasse-container');
    if (!container) return;

    const eintraege = data.map(eintrag => `
        <div class="buchung">
            <span class="betrag">${eintrag.betrag.toFixed(2)}€</span>
            <span class="zweck">${eintrag.zweck}</span>
            <span class="datum">${eintrag.datum}</span>
        </div>
    `).join('');

    container.innerHTML = `
        <h3>Webkasse</h3>
        <div class="eintraege">${eintraege}</div>
    `;
}