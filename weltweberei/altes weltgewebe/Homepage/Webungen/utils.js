// utils.js — Version: Σ.v∞.2.audit.stable

import {
    parseOptionalFloat,
    parseOptionalInt,
    sanitizeInput,
    buildPayload as coreBuildPayload,
    submitWithSimulation as coreSubmitWithSimulation
} from './utility-core.js';

// Direktes Mapping auf den Utility-Core:
export { parseOptionalFloat, parseOptionalInt, sanitizeInput };

export function buildPayload(formElement) {
    return coreBuildPayload(formElement);
}

export function submitWithSimulation(payload, label, clearFormCallback) {
    console.log(`Simuliere Übermittlung (${label}):`, payload);
    setTimeout(() => {
        if (clearFormCallback) clearFormCallback();
    }, 500);
}