// api-diskurs.js — Version: Σ.v∞.3.time.audit.stable

import { raumManager } from './raum-manager.js';
import { fileStorage } from './file-storage.js';
import { diskursEngine } from './diskurs-engine.js';

class DiskursApi {
    constructor(filename = 'data-diskurs.json') {
        this.filename = filename;
    }

    async initialize() {
        const daten = await fileStorage.loadJson(this.filename);
        if (Object.keys(daten).length === 0) {
            raumManager.initializeBasis();
            await this.save();
        } else {
            raumManager.importDiskurs(daten);
        }
    }

    async save() {
        const daten = raumManager.exportDiskurs();
        await fileStorage.saveJson(this.filename, daten);
    }

    // >>> zentrale Fristenprüfung <<<

    async prüfeFristenUndSpeichere() {
        diskursEngine.prüfeAlleFristen();
        await this.save();
    }

    // >>> Räume

    async getAlleRäume() {
        await this.prüfeFristenUndSpeichere();
        return raumManager.getAlleRäume();
    }

    async createRaum(params) {
        raumManager.createRaum(params);
        await this.save();
    }

    // >>> Threads & Beiträge

    async createThread(params) {
        raumManager.createThread(params);
        await this.save();
    }

    async addBeitrag(params) {
        raumManager.addBeitrag(params);
        await this.save();
    }

    async schließeThread(params) {
        raumManager.schließeThread(params);
        await this.save();
    }

    // >>> Antragsprozesse

    async starteAntrag(params) {
        raumManager.starteAntrag(params);
        await this.save();
    }

    async legeEinspruchEin(params) {
        raumManager.legeEinspruchEin(params);
        await this.save();
    }

    async stimmeAb(params) {
        raumManager.stimmeAb(params);
        await this.save();
    }

    async bewerteAbstimmung(params) {
        raumManager.bewerteAbstimmung(params);
        await this.save();
    }

    // >>> Einzelraum für Threads & Markerlogik

    async getRaum(raumId) {
        await this.prüfeFristenUndSpeichere();
        return raumManager.getRaum(raumId);
    }
}

export const diskursApi = new DiskursApi();