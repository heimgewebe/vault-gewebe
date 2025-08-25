// validation.js — Version: Σ.v∞.2.audit.stable

import {
    validateRequired,
    validatePositiveAmount,
    isValidDateRange
} from './utility-core.js';

function validateField(field) {
    const value = field.value;

    if (field.hasAttribute('required') && !validateRequired(field)) {
        return false;
    }

    if (field.type === 'number' && !validatePositiveAmount(field)) {
        return false;
    }

    if (field.type === 'datetime-local') {
        const valid = !isNaN(Date.parse(value));
        if (!valid) field.classList.add('invalid');
        else field.classList.remove('invalid');
        return valid;
    }

    field.classList.remove('invalid');
    return true;
}

export const Validators = {
    spende(form) {
        const betrag = form.querySelector('#spende-betrag');
        return validateField(betrag);
    },
    goldfaden(form) {
        const betrag = form.querySelector('#goldfaden-betrag');
        const von = form.querySelector('#goldfaden-von');
        return validateField(betrag) && validateField(von);
    },
    auszahlung(form) {
        const betrag = form.querySelector('#auszahlung-betrag');
        const antragid = form.querySelector('#auszahlung-antragid');
        return validateField(betrag) && validateField(antragid);
    },
    zusage(form) {
        const name = form.querySelector('#zusage-name');
        return validateField(name);
    },
    ereignis(form) {
        const titel = form.querySelector('#ereignis-titel');
        const start = form.querySelector('#ereignis-start');
        const ende = form.querySelector('#ereignis-ende');
        const datesOk = isValidDateRange(start.value, ende.value);
        if (!datesOk) {
            start.classList.add('invalid');
            ende.classList.add('invalid');
        }
        return validateField(titel) && datesOk && validateField(start) && validateField(ende);
    }
};