// utility-core.js — Version: Σ.v1.core.util

export const UtilityCore = {
    generateUUID() {
        return crypto.randomUUID();
    },

    formatDate(date) {
        return new Intl.DateTimeFormat('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    },

    clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
};