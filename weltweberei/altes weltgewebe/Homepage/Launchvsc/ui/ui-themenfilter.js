// ui-themenfilter.js — Filterung nach Knotentypen (Farben, Kategorien)

export function initializeThemenfilter() {
    const filterElement = document.getElementById('themenfilter');

    if (!filterElement) return;

    filterElement.addEventListener('change', () => {
        const selected = filterElement.value;
        const event = new CustomEvent('filterChange', { detail: { selected } });
        window.dispatchEvent(event);
    });
}