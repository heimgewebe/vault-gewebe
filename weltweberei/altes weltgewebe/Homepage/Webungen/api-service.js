// api-service.js — Version: Σ.v∞.3.api-service.time.audit.stable

import { fileStorage } from './file-storage.js';
import { daten } from './data-model.js';
import { diskursApi } from './api-diskurs.js';
import { raumManager } from './raum-manager.js';
import { diskursEngine } from './diskurs-engine.js';

class ApiService {
    constructor(fileName = 'data-weltweberei.json') {
        this.fileName = fileName;
        this.data = structuredClone(daten);
    }

    async initialize() {
        const loaded = await fileStorage.loadJson(this.fileName);
        if (Object.keys(loaded).length === 0) {
            await this.save();
        } else {
            this.data = loaded;
        }
    }

    async save() {
        await fileStorage.saveJson(this.fileName, this.data);
    }

    getWebkasseStand() {
        return this.data.webkasse.stand;
    }

    getBuchungen() {
        return this.data.webkasse.buchungen;
    }

    async einzahlenSpende({ betrag, kommentar, anonym = false, garnrolleId = null }) {
        const id = 'b' + Date.now();
        const buchung = {
            id,
            typ: anonym ? 'spende-anonym' : 'spende',
            betrag,
            kommentar,
            garnrolleId,
            datum: new Date().toISOString()
        };
        this.data.webkasse.stand += betrag;
        this.data.webkasse.buchungen.push(buchung);
        await this.save();
    }

    async einzahlenGoldfaden({ betrag, kommentar, garnrolleId }) {
        const id = 'b' + Date.now();
        const buchung = {
            id,
            typ: 'goldfaden',
            betrag,
            kommentar,
            garnrolleId,
            datum: new Date().toISOString()
        };
        this.data.webkasse.stand += betrag;
        this.data.webkasse.buchungen.push(buchung);
        await this.save();
    }

    async auszahlenAusTopf({ betrag, kommentar, empfänger }) {
        const id = 'b' + Date.now();
        const buchung = {
            id,
            typ: 'auszahlung',
            betrag,
            kommentar,
            empfänger,
            datum: new Date().toISOString()
        };
        this.data.webkasse.stand -= betrag;
        this.data.webkasse.buchungen.push(buchung);
        await this.save();
    }

    // NEU: Automatische Verarbeitung aller angenommenen Anträge

    async pruefeAlleAnträgeUndBuche() {
        await diskursApi.prüfeFristenUndSpeichere();

        const raumDaten = raumManager.getAlleRäume();

        for (const raum of raumDaten) {
            const raumDetails = raumManager.getRaum(raum.id);
            for (const thread of raumDetails.threads) {
                const antrag = thread.antrag;
                if (antrag && antrag.status === 'angenommen' && !antrag.ausgezahlt) {
                    await this.auszahlenAusTopf({
                        betrag: antrag.betrag,
                        kommentar: antrag.kommentar,
                        empfänger: antrag.beantragtVon
                    });
                    antrag.ausgezahlt = true;
                    await diskursApi.save();
                }
            }
        }
    }
}

export const apiService = new ApiService();