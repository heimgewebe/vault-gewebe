// validation.js — Version: validationΣ.v6.0

const Rules = {
    text(value) {
        return typeof value === 'string' && value.trim().length > 0;
    },
    positiveNumber(value) {
        const num = parseFloat(value);
        return !isNaN(num) && num > 0;
    },
    numberInRange(value, min, max) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= min && num <= max;
    },
    datetime(value) {
        return !isNaN(Date.parse(value));
    }
};

function validateField(field) {
    const value = field.value;

    if (field.hasAttribute('required') && !Rules.text(value)) {
        field.classList.add('invalid');
        return false;
    }

    if (field.type === 'number' && !Rules.positiveNumber(value)) {
        field.classList.add('invalid');
        return false;
    }

    if (field.type === 'datetime-local' && !Rules.datetime(value)) {
        field.classList.add('invalid');
        return false;
    }

    field.classList.remove('invalid');
    field.classList.add('valid');
    return true;
}

function validateBase(form) {
    let valid = true;
    const fields = form.querySelectorAll("input, textarea, select");
    fields.forEach(field => {
        if (!validateField(field)) valid = false;
    });
    return valid;
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
        const thema = form.querySelector('#ereignis-thema');
        return validateField(titel) && validateField(start) && validateField(ende) && validateField(thema);
    }
};