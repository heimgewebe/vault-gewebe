// form-components.js — Version: Σ.v∞.2.audit.stable

/**
 * Baut die Selectbox für Garnrollen dynamisch auf.
 * @param {string} id - ID und Name des Selects
 * @param {Array} garnrollenData - Liste der verfügbaren Garnrollen
 * @returns {HTMLSelectElement}
 */
export function createGarnrolleSelect(id, garnrollenData) {
    const select = document.createElement('select');
    select.id = id;
    select.name = id;
    select.required = true;
    select.setAttribute("aria-label", "Garnrolle auswählen");

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Wähle deine Garnrolle';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    select.appendChild(defaultOption);

    garnrollenData.forEach(garnrolle => {
        const option = document.createElement('option');
        option.value = garnrolle.id;
        option.textContent = garnrolle.name;
        select.appendChild(option);
    });

    return select;
}