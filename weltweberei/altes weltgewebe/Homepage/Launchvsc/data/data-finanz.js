// data/data-finanz.js — Version: Σ.v∞.1.webkasse.core

import { generateUID } from '../utils.js';

let webkasse = {
    kontostand: 0,
    buchungen: [] // { id, betrag, von, zweck, zeitpunkt, quelle }
};

// Buchungstypen: spende, zusage, auszahlung, umbuchung, goldfaden

export function aktuelleWebkasse() {
    return {
        kontostand: webkasse.kontostand,
        buchungen: [...webkasse.buchungen]
    };
}

export function fuegeBuchungHinzu({ betrag, von, zweck, quelle = 'unbekannt' }) {
    const buchung = {
        id: generateUID(),
        betrag,
        von,
        zweck,
        quelle,
        zeitpunkt: new Date().toISOString()
    };
    webkasse.buchungen.push(buchung);
    webkasse.kontostand += betrag;
    return buchung;
}

export function macheAuszahlung({ betrag, an, zweck = 'auszahlung' }) {
    if (webkasse.kontostand >= betrag) {
        return fuegeBuchungHinzu({ betrag: -betrag, von: 'webkasse', zweck, quelle: 'auszahlung:' + an });
    } else {
        throw new Error("Nicht genügend Mittel in der Webkasse");
    }
}

export function filtereBuchungen(filterFn) {
    return webkasse.buchungen.filter(filterFn);
}

export function resetWebkasse() {
    webkasse = {
        kontostand: 0,
        buchungen: []
    };
}