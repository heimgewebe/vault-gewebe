// antrag-engine.js — v1

import { Speicher } from '../../data/persistence-service.js';
import { differenceInDays, parseISO } from 'date-fns';

export const AntragEngine = {
    async finde(id) {
        const alle = await Speicher.ladeAlle('antraege');
        return alle.find(a => a.id === id);
    },

    async speichere(antrag) {
        await Speicher.speichere('antraege', antrag);
    },

    async aktualisiereStatus() {
        const antraege = await Speicher.ladeAlle('antraege');
        const heute = new Date();

        for (let a of antraege) {
            const gestellt = parseISO(a.gestelltAm);
            if (a.status === 'gestellt') {
                if (differenceInDays(heute, gestellt) >= 7) {
                    a.status = 'angenommen';
                }
            } else if (a.status === 'einspruch') {
                const einspruch = parseISO(a.einspruchAm);
                if (differenceInDays(heute, einspruch) >= 7) {
                    a.status = 'abgelehnt';
                }
            }
        }

        await Speicher.schreibe('antraege', antraege);
    },

    async einspruchEinlegen(id) {
        const antraege = await Speicher.ladeAlle('antraege');
        const a = antraege.find(e => e.id === id);
        if (a && a.status === 'gestellt') {
            a.status = 'einspruch';
            a.einspruchAm = new Date().toISOString();
        }
        await Speicher.schreibe('antraege', antraege);
    }
};