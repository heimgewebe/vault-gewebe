// raum-manager.js — Version: Σ.v∞.3.time.audit.stable

import { diskursEngine } from './diskurs-engine.js';

class RaumManager {
    constructor() {
        this.validTypes = ['webrat', 'nähstübchen', 'ereignis', 'antrag'];
    }

    initializeBasis() {
        if (!diskursEngine.diskursRäume.size) {
            this.createRaum({ raumId: 'webrat', raumTyp: 'webrat' });
            this.createRaum({ raumId: 'nähstübchen', raumTyp: 'nähstübchen' });
        }
    }

    createRaum({ raumId, raumTyp, referenzId = null }) {
        if (!this.validTypes.includes(raumTyp)) {
            throw new Error(`Ungültiger Raumtyp: ${raumTyp}`);
        }
        diskursEngine.createRaum({ raumId, raumTyp, referenzId });
    }

    getAlleRäume() {
        this.prüfeFristen();
        return [...diskursEngine.diskursRäume.values()].map(raum => ({
            id: raum.id,
            typ: raum.typ,
            referenzId: raum.referenzId,
            anzahlThreads: raum.threads.length
        }));
    }

    getRaum(raumId) {
        this.prüfeFristen();
        const raum = diskursEngine.diskursRäume.get(raumId);
        if (!raum) throw new Error("Raum nicht gefunden");
        return {
            id: raum.id,
            typ: raum.typ,
            referenzId: raum.referenzId,
            threads: raum.threads
        };
    }

    createThread({ raumId, threadId, titel, erstellerId }) {
        diskursEngine.createThread({ raumId, threadId, titel, erstellerId });
    }

    addBeitrag({ raumId, threadId, beitragId, autorId, text }) {
        diskursEngine.addBeitrag({ raumId, threadId, beitragId, autorId, text });
    }

    // Antragszyklen

    starteAntrag(params) {
        diskursEngine.starteAntrag(params);
    }

    legeEinspruchEin(params) {
        diskursEngine.legeEinspruchEin(params);
    }

    stimmeAb(params) {
        diskursEngine.stimmeAb(params);
    }

    bewerteAbstimmung(params) {
        diskursEngine.bewerteAbstimmung(params);
    }

    schließeThread({ raumId, threadId }) {
        diskursEngine.schließeThread({ raumId, threadId });
    }

    exportDiskurs() {
        return diskursEngine.exportAlleRäume();
    }

    importDiskurs(daten) {
        diskursEngine.importAlleRäume(daten);
    }

    prüfeFristen() {
        diskursEngine.prüfeAlleFristen();
    }
}

export const raumManager = new RaumManager();