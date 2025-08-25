// user-model.js — Version: Σ.v11.4

export class User {
    constructor({ id, name, wohnort, koordinaten, garnrolleId }) {
        this.id = id; // Systeminterne eindeutige User-ID (z.B. UUID)
        this.name = name; // Anzeigename (Webername)
        this.wohnort = wohnort; // Ortsangabe (z.B. Stadt, Region)
        this.koordinaten = koordinaten; // [lat, lng] für initiale Garnrolle
        this.garnrolleId = garnrolleId; // fest zugewiesene eigene Garnrolle
    }

    // Systemlogik: ist der Nutzer registriert?
    isWeber() {
        return Boolean(this.garnrolleId);
    }

    // Rückgabe minimaler öffentlicher Userdarstellung (z.B. für WebSocket, Audit etc.)
    getPublicProfile() {
        return {
            id: this.id,
            name: this.name,
            wohnort: this.wohnort,
            koordinaten: this.koordinaten
        };
    }
}