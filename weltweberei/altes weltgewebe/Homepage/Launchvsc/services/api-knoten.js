// api-knoten.js — Version: Σ.v1.knotenservice

import { Knotenerkennung } from '../core/knotenerkennung.js';
import { Speicher } from './persistence-service.js';

export const apiKnoten = {
    async erstelleKnoten(daten) {
        const knoten = Knotenerkennung.erstelleKnoten(daten);
        await Speicher.speichere('knoten', knoten);
        return knoten;
    },

    async pruefeUndLoescheVerwaiste() {
        const knotenListe = await Speicher.ladeAlle('knoten');
        const webungen = await Speicher.ladeAlle('webung');

        const geloeschte = [];

        for (const k of knotenListe) {
            if (Knotenerkennung.loescheWennVerwaist(k, webungen)) {
                await Speicher.loesche('knoten', k.id);
                geloeschte.push(k.id);
            }
        }

        return geloeschte;
    }
};