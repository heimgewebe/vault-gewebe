// api-diskurs.js — Version: Σ.v∞.1

import fs from 'fs/promises';
import path from 'path';
import { DiskursEngine } from './diskurs-engine.js';

export class ApiDiskurs {
    constructor(storageDir = './weltweberei-data') {
        this.storageDir = storageDir;
        this.diskursFile = path.join(this.storageDir, 'data-diskurs.json');
        this.engine = new DiskursEngine();
    }

    async initialize() {
        await fs.mkdir(this.storageDir, { recursive: true });

        try {
            const content = await fs.readFile(this.diskursFile, 'utf-8');
            const daten = JSON.parse(content);
            this.engine.importAlleRäume(daten.diskursRäume);
        } catch (err) {
            if (err.code === 'ENOENT') {
                await this.save(); // bei Erststart leeres Objekt erzeugen
            } else {
                throw err;
            }
        }
    }

    async save() {
        const daten = {
            diskursRäume: this.engine.exportAlleRäume()
        };
        await fs.writeFile(this.diskursFile, JSON.stringify(daten, null, 2));
    }

    // Öffentliche API:

    async getAlleRäume() {
        return this.engine.exportAlleRäume();
    }

    async createRaum({ raumId, raumTyp, referenzId }) {
        this.engine.createRaum({ raumId, raumTyp, referenzId });
        await this.save();
    }

    async createThread({ raumId, threadId, titel, erstellerId }) {
        this.engine.createThread({ raumId, threadId, titel, erstellerId });
        await this.save();
    }

    async addBeitrag({ raumId, threadId, beitragId, autorId, text }) {
        this.engine.addBeitrag({ raumId, threadId, beitragId, autorId, text });
        await this.save();
    }

    async startAbstimmung({ raumId, threadId, abstimmungId, frage, optionen, erstellerId }) {
        this.engine.startAbstimmung({ raumId, threadId, abstimmungId, frage, optionen, erstellerId });
        await this.save();
    }

    async abstimmen({ raumId, threadId, abstimmungId, nutzerId, wahl }) {
        this.engine.abstimmen({ raumId, threadId, abstimmungId, nutzerId, wahl });
        await this.save();
    }

    async schließeThread({ raumId, threadId }) {
        this.engine.schließeThread({ raumId, threadId });
        await this.save();
    }
}