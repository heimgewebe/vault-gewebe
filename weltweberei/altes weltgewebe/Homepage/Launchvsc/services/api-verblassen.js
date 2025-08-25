// api-verblassen.js — Version: Σ.v1.verblass-service

import { Verblasslogik } from '../core/verblasslogik.js';
import { Speicher } from './persistence-service.js';

export const apiVerblassen = {
    async verblasseAlle() {
        const webungen = await Speicher.ladeAlle('webung');
        const knotenListe = await Speicher.ladeAlle('knoten');

        for (const w of webungen) {
            const knoten = knotenListe.find(k => k.id === w.zuKnotenId);
            Verblasslogik.setzeVerblasstStatus(w, knoten?.ereigniszeitpunkt);
        }

        await Speicher.schreibe('webung', webungen);
    }
};