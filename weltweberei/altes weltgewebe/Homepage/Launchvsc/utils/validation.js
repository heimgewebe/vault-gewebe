// validation.js — Version: Σ.v1.form.validation

export const Validators = {
    required(value) {
        return value?.trim() ? null : 'Pflichtfeld';
    },

    minLength(min) {
        return (value) => {
            return value.length >= min ? null : `Mindestens ${min} Zeichen`;
        };
    },

    isNumber(value) {
        return isNaN(value) ? 'Muss eine Zahl sein' : null;
    }
};