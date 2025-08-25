// mock-backend.js — Version: Σ.v11.4.identity

import { daten } from './data-model.js';

// interne Userspeicherung (nur für Mock)
const users = new Map();

export const MockBackend = {

    // USER-LOGIK

    registerUser({ name, wohnort, koordinaten }) {
        if (users.has(name)) {
            return Promise.reject(new Error("Nutzer existiert bereits."));
        }

        const userId = `u${users.size + 1}`;
        const garnrolleId = `garnrolle-${userId}`;

        const user = {
            id: userId,
            name,
            wohnort,
            koordinaten,
            garnrolleId
        };

        users.set(name, user);

        // gleich Garnrolle ins Datenset eintragen
        daten.garnrollen.push({
            id: garnrolleId,
            name,
            ort: wohnort,
            lat: koordinaten[0],
            lng: koordinaten[1]
        });

        return Promise.resolve(user);
    },

    loginUser({ name }) {
        if (!users.has(name)) {
            return Promise.reject(new Error("Nutzer nicht gefunden."));
        }
        return Promise.resolve(users.get(name));
    },

    getAllUsers() {
        return Promise.resolve([...users.values()]);
    },

    // BESTEHENDE DATENLOGIK BLEIBT UNVERÄNDERT:

    // Garnrollen
    getGarnrollen() {
        return Promise.resolve([...daten.garnrollen]);
    },

    // Ereignisse
    getEreignisse() {
        return Promise.resolve([...daten.ereignisse]);
    },

    // Zusagen
    getZusagen() {
        return Promise.resolve([...daten.zusagen]);
    },

    // Fäden
    getFaeden() {
        return Promise.resolve([...daten.fäden]);
    },

    // webkasse
    getwebkasse() {
        return Promise.resolve(daten.webkasse);
    },

    // Goldfaden (sichtbare Einzahlung)
    addGoldfaden({ betrag, von, kommentar }) {
        const id = `b${daten.webkasse.buchungen.length + 1}`;
        const buchung = {
            id,
            art: "einzahlung",
            quelle: "goldfaden",
            betrag,
            von,
            kommentar: kommentar || "",
            datum: new Date().toISOString()
        };
        daten.webkasse.buchungen.push(buchung);
        daten.webkasse.kontostand += betrag;
        return Promise.resolve(buchung);
    },

    // Spende (anonym)
    addSpende({ betrag, kommentar }) {
        const id = `b${daten.webkasse.buchungen.length + 1}`;
        const buchung = {
            id,
            art: "einzahlung",
            quelle: "spende",
            betrag,
            von: null,
            kommentar: kommentar || "",
            datum: new Date().toISOString()
        };
        daten.webkasse.buchungen.push(buchung);
        daten.webkasse.kontostand += betrag;
        return Promise.resolve(buchung);
    },

    // Auszahlung
    addAuszahlung({ betrag, antrag_id, kommentar }) {
        const id = `b${daten.webkasse.buchungen.length + 1}`;
        const buchung = {
            id,
            art: "auszahlung",
            quelle: "auszahlung",
            betrag,
            von: null,
            antrag_id: antrag_id || null,
            kommentar: kommentar || "",
            datum: new Date().toISOString()
        };
        daten.webkasse.buchungen.push(buchung);
        daten.webkasse.kontostand -= betrag;
        return Promise.resolve(buchung);
    }
};