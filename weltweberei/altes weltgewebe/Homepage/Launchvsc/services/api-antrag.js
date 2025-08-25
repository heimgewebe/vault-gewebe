// api-antrag.js — Version: Σ.v1.antrag-service

import { Antragslogik } from '../core/antragslogik.js';
import { Speicher } from './persistence-service.js';

export const apiAntrag = {
    async pruefeAlleAntraege() {
        const antraege = await Speicher.ladeAlle('antrag');

        for (const a of antraege) {
            Antragslogik.pruefeEntscheidung(a, a.einspruchsDatum);
        }

        await Speicher.schreibe('antrag', antraege);
    },

    async stelleAntrag(antrag) {
        Antragslogik.initialisiereAntrag(antrag);
        if (antrag.kategorie === 'gold') {
            Antragslogik.kennzeichneGoldantrag(antrag);
        }

        await Speicher.speichere('antrag', antrag);
        return antrag;
    },

    async markiereEinspruch(antragId) {
        const antraege = await Speicher.ladeAlle('antrag');
        const antrag = antraege.find(a => a.id === antragId);
        if (antrag) {
            Antragslogik.markiereEinspruch(antrag);
            antrag.einspruchsDatum = new Date().toISOString();
        }
        await Speicher.schreibe('antrag', antraege);
    }
};