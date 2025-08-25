// data/data-knoten.js — Version: Σ.v∞.1.knotenstruktur.core

import { generateUID } from '../utils.js';

const knotenStore = [];

export function createKnoten({ titel, beschreibung, koordinaten, erstellerId, zeitpunkt = null, typ = 'allgemein' }) {
    const neuerKnoten = {
        id: generateUID(),
        titel,
        beschreibung,
        koordinaten,
        erstellerId,
        zeitpunkt,
        typ,
        erstelltAm: new Date().toISOString(),
        verbunden: [],
        aktiv: true
    };
    knotenStore.push(neuerKnoten);
    return neuerKnoten;
}

export function getAlleKnoten() {
    return knotenStore.filter(k => k.aktiv);
}

export function findeKnotenNachId(knotenId) {
    return knotenStore.find(k => k.id === knotenId && k.aktiv);
}

export function verknuepfeMitKnoten(knotenId, webungId) {
    const knoten = findeKnotenNachId(knotenId);
    if (knoten && !knoten.verbunden.includes(webungId)) {
        knoten.verbunden.push(webungId);
    }
}

export function entferneVerknuepfung(knotenId, webungId) {
    const knoten = findeKnotenNachId(knotenId);
    if (knoten) {
        knoten.verbunden = knoten.verbunden.filter(id => id !== webungId);
        if (knoten.verbunden.length === 0) {
            knoten.aktiv = false;
        }
    }
}

export function loescheKnoten(knotenId) {
    const knoten = findeKnotenNachId(knotenId);
    if (knoten) {
        knoten.aktiv = false;
    }
}