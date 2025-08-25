// knotenerkennung.js — Version: Σ.v1.knotenlogik

import { Knoten } from '../models/knotenmodell.js';
import { generateUUID } from '../utils.js';

export class Knotenerkennung {
    static erstelleKnoten({ koordinaten, erstellerId, beschreibung, typ = "standard", darstellung = "default" }) {
        const neuerKnoten = new Knoten({
            id: generateUUID(),
            koordinaten,
            erstellerId,
            beschreibung,
            typ,
            darstellung
        });

        return neuerKnoten;
    }

    static loescheWennVerwaist(knoten, webungListe) {
        const aktiveVerbindungen = webungListe.filter(w => w.zuKnotenId === knoten.id && w.zustand === 'aktiv');
        return aktiveVerbindungen.length === 0;
    }
}