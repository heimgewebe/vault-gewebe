// models/user-model.js — Version: Σ.v1.rolle.core

export const rolleService = {
    rolleId: null,

    set(id) {
        this.rolleId = id;
        localStorage.setItem('rolleId', id);
    },

    get() {
        return this.rolleId || localStorage.getItem('rolleId');
    },

    restore() {
        this.rolleId = localStorage.getItem('rolleId');
    }
};