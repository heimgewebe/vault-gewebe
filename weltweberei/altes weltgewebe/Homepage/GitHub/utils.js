// utils.js — Version: utilsΣ.v5.2.core-simulation

export function parseOptionalFloat(id) {
    const value = document.getElementById(id).value;
    const parsedValue = parseFloat(value);
    return isNaN(parsedValue) ? null : parsedValue;
}

export function parseOptionalInt(id) {
    const value = document.getElementById(id).value;
    const parsedValue = parseInt(value, 10);
    return isNaN(parsedValue) ? null : parsedValue;
}

export function sanitizeInput(input) {
    const temp = document.createElement("div");
    temp.textContent = input.trim();
    const encoded = temp.innerHTML;
    return encoded
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function buildPayload(formElement) {
    const formData = new FormData(formElement);
    const payload = {};
    formData.forEach((value, key) => {
        payload[key] = sanitizeInput(value);
    });
    return payload;
}

// NEU: Zentrale Simulation
export function submitWithSimulation(payload, label, clearFormCallback) {
    try {
        console.log(`Simuliert gesendet (${label}):`, payload);
        const formFeedbackDiv = document.getElementById('form-feedback');
        formFeedbackDiv.textContent = `${label} erfolgreich gesendet!`;
        formFeedbackDiv.style.color = '#006400';
        formFeedbackDiv.style.opacity = '1';
        setTimeout(() => { formFeedbackDiv.style.opacity = '0'; }, 3000);
        clearFormCallback();
    } catch (error) {
        console.error(`Fehler bei ${label}:`, error);
        const formFeedbackDiv = document.getElementById('form-feedback');
        formFeedbackDiv.textContent = `Fehler: ${error.message}`;
        formFeedbackDiv.style.color = '#b00020';
        formFeedbackDiv.style.opacity = '1';
    }
}