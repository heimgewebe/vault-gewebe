// utility-core.js — Version: Σ.v∞.2.audit.stable

/* === Parsing & Sanitizing === */
export function parseOptionalFloat(input) {
    const value = parseFloat(input);
    return isNaN(value) ? null : value;
}

export function parseOptionalInt(input) {
    const value = parseInt(input);
    return isNaN(value) ? null : value;
}

export function sanitizeInput(input) {
    return input.replace(/[<>"']/g, '');
}

export function safeParseDate(input) {
    const date = new Date(input);
    return isNaN(date.getTime()) ? null : date;
}

/* === Validation Helpers === */
export function isValidPositiveNumber(input) {
    const num = parseFloat(input);
    return !isNaN(num) && num > 0;
}

export function isEmpty(input) {
    return !input || input.trim() === '';
}

export function isValidDateRange(startStr, endStr) {
    const start = new Date(startStr);
    const end = new Date(endStr);
    return !isNaN(start) && !isNaN(end) && start <= end;
}

export function validateRequired(field) {
    if (isEmpty(field.value)) {
        field.classList.add('invalid');
        return false;
    }
    field.classList.remove('invalid');
    return true;
}

export function validatePositiveAmount(field) {
    if (!isValidPositiveNumber(field.value)) {
        field.classList.add('invalid');
        return false;
    }
    field.classList.remove('invalid');
    return true;
}

/* === Form Helpers === */
export function buildPayload(form) {
    const payload = {};
    const elements = form.querySelectorAll('input, select, textarea');
    elements.forEach(el => {
        let key = el.name;
        if (!key) return;
        if (key.endsWith('[0]')) {
            key = key.replace('[0]', '');
            payload[key] = payload[key] || [];
            payload[key][0] = parseFloat(el.value);
        } else if (key.endsWith('[1]')) {
            key = key.replace('[1]', '');
            payload[key] = payload[key] || [];
            payload[key][1] = parseFloat(el.value);
        } else {
            payload[key] = el.value;
        }
    });
    return payload;
}

export function attachValidation(form) {
    const inputs = form.querySelectorAll('input[required], textarea[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', () => {
            if (input.value.trim() === '') {
                input.classList.add('invalid');
            } else {
                input.classList.remove('invalid');
            }
        });
    });
}

export async function submitWithSimulation(payload, typ, onSuccess) {
    console.log(`Simuliere Übermittlung für ${typ}:`, payload);
    await new Promise(resolve => setTimeout(resolve, 500));
    if (onSuccess) onSuccess();
}

/* === UI Helpers === */
export function getTimeBounds(currentDate, tage) {
    const end = new Date(currentDate);
    const start = new Date(currentDate);
    start.setDate(start.getDate() - tage);
    return { start, end };
}

export function debouncedRender(callback, delay = 150) {
    let timer = null;
    return function () {
        clearTimeout(timer);
        timer = setTimeout(callback, delay);
    };
}

export function generateEreignisTooltipContent(d) {
    return `
        <strong>${d.titel}</strong><br>
        ${d.beschreibung}<br>
        ${d.ort}<br>
        Von: ${new Date(d.zeitfenster_start).toLocaleString()}<br>
        Bis: ${new Date(d.zeitfenster_ende).toLocaleString()}<br>
        Themen: ${d.themenfelder.join(", ")}
    `;
}

export function rebuildLegend(container, themenfelder, onClick) {
    container.innerHTML = '';
    themenfelder.forEach(theme => {
        const btn = document.createElement('button');
        btn.textContent = theme;
        btn.addEventListener('click', () => onClick(theme));
        container.appendChild(btn);
    });
}

export function rebuildJumpMarks(container, keyEvents, onJump) {
    container.innerHTML = '';
    keyEvents.forEach(evt => {
        const btn = document.createElement('button');
        btn.textContent = new Date(evt.timestamp).toLocaleDateString();
        btn.addEventListener('click', () => onJump(evt.timestamp));
        container.appendChild(btn);
    });
}