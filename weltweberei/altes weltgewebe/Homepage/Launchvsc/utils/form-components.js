// form-components.js — Version: Σ.v1.formteile

export function createInputField({ id, label, type = 'text', placeholder = '', value = '' }) {
    const wrapper = document.createElement('div');
    const labelEl = document.createElement('label');
    labelEl.setAttribute('for', id);
    labelEl.textContent = label;

    const input = document.createElement('input');
    input.type = type;
    input.id = id;
    input.placeholder = placeholder;
    input.value = value;

    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);
    return wrapper;
}

export function createSelect({ id, label, options }) {
    const wrapper = document.createElement('div');
    const labelEl = document.createElement('label');
    labelEl.setAttribute('for', id);
    labelEl.textContent = label;

    const select = document.createElement('select');
    select.id = id;

    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        select.appendChild(option);
    });

    wrapper.appendChild(labelEl);
    wrapper.appendChild(select);
    return wrapper;
}