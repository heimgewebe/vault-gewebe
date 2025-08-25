// api-service.js — Version: Σ.v11.5.persistence

import { PersistenceService } from './persistence-service.js';

const persistence = new PersistenceService();

export const ApiService = {
    async initialize() {
        await persistence.initialize();
    },

    // Garnrollen
    async fetchGarnrollen() {
        return await persistence.load('garnrollen');
    },

    // Ereignisse
    async fetchEreignisse() {
        return await persistence.load('ereignisse');
    },

    // Zusagen
    async fetchZusagen() {
        return await persistence.load('zusagen');
    },

    // Fäden
    async fetchFaeden() {
        return await persistence.load('faeden');
    },

    // webkasse abrufen
    async fetchwebkasse() {
        return await persistence.load('webkasse');
    },

    // Goldfaden einzahlen
    async einzahlenGoldfaden({ betrag, von, kommentar }) {
        const topf = await persistence.load('webkasse');
        const buchung = {
            id: `b${topf.length + 1}`,
            art: "einzahlung",
            quelle: "goldfaden",
            betrag,
            von,
            kommentar: kommentar || "",
            datum: new Date().toISOString()
        };
        topf.push(buchung);
        await persistence.save('webkasse', topf);
        return buchung;
    },

    // Anonyme Spende
    async einzahlenSpende({ betrag, kommentar }) {
        const topf = await persistence.load('webkasse');
        const buchung = {
            id: `b${topf.length + 1}`,
            art: "einzahlung",
            quelle: "spende",
            betrag,
            von: null,
            kommentar: kommentar || "",
            datum: new Date().toISOString()
        };
        topf.push(buchung);
        await persistence.save('webkasse', topf);
        return buchung;
    },

    // Auszahlung (Antrag)
    async auszahlenAusTopf({ betrag, antrag_id, kommentar }) {
        const topf = await persistence.load('webkasse');
        const buchung = {
            id: `b${topf.length + 1}`,
            art: "auszahlung",
            quelle: "auszahlung",
            betrag,
            von: null,
            antrag_id: antrag_id || null,
            kommentar: kommentar || "",
            datum: new Date().toISOString()
        };
        topf.push(buchung);
        await persistence.save('webkasse', topf);
        return buchung;
    }
};