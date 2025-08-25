// form-components.js — Version: form-componentsΣ.v5.0

import { Validators } from './validation.js';

export function attachValidation(form) {
    const elements = form.querySelectorAll("input, textarea, select");
    elements.forEach(field => {
        field.addEventListener('input', () => {
            const valid = Validators[field.name] ? Validators[field.name](field) : field.checkValidity();
            field.classList.toggle('valid', valid);
            field.classList.toggle('invalid', !valid);
        });
    });
}

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