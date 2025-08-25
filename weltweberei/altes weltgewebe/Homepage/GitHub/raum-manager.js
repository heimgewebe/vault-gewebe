// raum-manager.js — Version: Σ.v∞.1

import { DiskursEngine } from './diskurs-engine.js';

export class RaumManager {
    constructor() {
        this.engine = new DiskursEngine();

        // Konstante Raum-IDs für permanente Räume
        this.WEBRAT_ID = 'raum-webrat';
        this.NAEHSTUEBCHEN_ID = 'raum-naehstuebchen';
    }

    // Systemstart: Initiale Räume sicherstellen
    initialize() {
        if (!this.engine.diskursRäume.has(this.WEBRAT_ID)) {
            this.engine.createRaum({ raumId: this.WEBRAT_ID, raumTyp: 'Webrat' });
        }
        if (!this.engine.diskursRäume.has(this.NAEHSTUEBCHEN_ID)) {
            this.engine.createRaum({ raumId: this.NAEHSTUEBCHEN_ID, raumTyp: 'Nähstübchen' });
        }
    }

    // Raum für Ereignis erzeugen (idempotent)
    ensureEreignisRaum(ereignisId) {
        const raumId = `raum-ereignis-${ereignisId}`;
        if (!this.engine.diskursRäume.has(raumId)) {
            this.engine.createRaum({ raumId, raumTyp: 'Ereignis', referenzId: ereignisId });
        }
        return raumId;
    }

    // Raum für Webkassen-Antrag erzeugen
    ensureAntragsRaum(antragId) {
        const raumId = `raum-antrag-${antragId}`;
        if (!this.engine.diskursRäume.has(raumId)) {
            this.engine.createRaum({ raumId, raumTyp: 'Antrag', referenzId: antragId });
        }
        return raumId;
    }

    // Zugriff auf Standardräume
    getWebratRaum() {
        return this.engine.diskursRäume.get(this.WEBRAT_ID);
    }

    getNaehstuebchenRaum() {
        return this.engine.diskursRäume.get(this.NAEHSTUEBCHEN_ID);
    }

    // Export für Persistenz
    exportAlleRäume() {
        return this.engine.exportAlleRäume();
    }

    importAlleRäume(raumArray) {
        this.engine.importAlleRäume(raumArray);
    }
}