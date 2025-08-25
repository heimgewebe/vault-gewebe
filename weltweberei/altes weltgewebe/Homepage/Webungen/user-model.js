// user-model.js — Version: Σ.v∞.2.audit.stable

export class User {
    constructor({ id, name, wohnort, koordinaten, garnrolleId }) {
        if (!id || !name) {
            throw new Error("User: id und name sind Pflichtfelder");
        }
        this.id = id;
        this.name = name;
        this.wohnort = wohnort || null;
        this.koordinaten = koordinaten || [null, null];
        this.garnrolleId = garnrolleId || null;
    }

    isWeber() {
        return Boolean(this.garnrolleId);
    }

    getPublicProfile() {
        return {
            id: this.id,
            name: this.name,
            wohnort: this.wohnort,
            koordinaten: this.koordinaten
        };
    }
}