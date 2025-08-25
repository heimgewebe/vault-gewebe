// fadenmodell.js — Version: Σ.v1.fadenstruktur

export class Webung {
    constructor({ id, typ = "faden", vonRolleId, zuKnotenId }) {
        this.id = id;
        this.typ = typ; // "faden", "garn", "antrag", "goldantrag"
        this.vonRolleId = vonRolleId;
        this.zuKnotenId = zuKnotenId;
        this.entstandenAm = new Date().toISOString();
        this.zustand = "aktiv"; // oder "verblasst", "abgelehnt", "angenommen"
        this.farbsignal = null; // z. B. "blau", "lila", "grün", "rot", "goldrand"
    }
}