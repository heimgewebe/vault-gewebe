// antragslogik.js — Version: Σ.v1.antragszyklus

import { parseISO, differenceInDays } from 'date-fns';

export class Antragslogik {
    static pruefeEntscheidung(antrag, einspruchsDatum = null) {
        const erstellt = parseISO(antrag.entstandenAm);
        const now = new Date();

        if (antrag.zustand !== 'aktiv') return;

        if (!einspruchsDatum) {
            const tage = differenceInDays(now, erstellt);
            if (tage >= 7) {
                antrag.zustand = 'angenommen';
                antrag.farbsignal = 'grün';
            }
        } else {
            const einspruch = parseISO(einspruchsDatum);
            const tageNachEinspruch = differenceInDays(now, einspruch);
            if (tageNachEinspruch >= 7) {
                antrag.zustand = 'abgelehnt';
                antrag.farbsignal = 'rot';
            }
        }
    }

    static initialisiereAntrag(antrag) {
        antrag.farbsignal = 'blau';
    }

    static markiereEinspruch(antrag) {
        antrag.farbsignal = 'lila';
    }

    static kennzeichneGoldantrag(antrag) {
        antrag.goldrand = true;
    }
}