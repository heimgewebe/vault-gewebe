// knoten-engine.js — Logik zum Erstellen und Speichern neuer Knoten

import { speichereKnoten } from '../../data/data-knoten.js';

export async function erstelleKnoten(knotenDaten) {
    const neuerKnoten = {
        id: Date.now().toString(),
        ...knotenDaten
    };

    await speichereKnoten(neuerKnoten);
    alert('Knoten erfolgreich erstellt.');
}