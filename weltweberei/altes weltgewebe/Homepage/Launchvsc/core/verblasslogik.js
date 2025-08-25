// core/verblasslogik.js — Version: Σ.v2.fadenverfall.vollständig

import { parseISO, differenceInDays } from 'date-fns';

export class Verblasslogik {
    static pruefeVerblassen(webung, knotenHatEreigniszeitpunkt = false) {
        const erstellt = parseISO(webung.entstandenAm);
        const now = new Date();
        const tageVergangen = differenceInDays(now, erstellt);

        if (webung.typ === 'garn') return false;

        // Wenn ein Ereigniszeitpunkt existiert, zählt ab diesem + 7 Tage
        return tageVergangen > 7;
    }

    static setzeVerblasstStatus(webung, knotenHatEreigniszeitpunkt = false) {
        if (this.pruefeVerblassen(webung, knotenHatEreigniszeitpunkt)) {
            webung.zustand = 'verblasst';
        }
    }

    static tageBisVerblassen(webung, knotenHatEreigniszeitpunkt = false) {
        const erstellt = parseISO(webung.entstandenAm);
        const now = new Date();
        const verbleibend = 7 - differenceInDays(now, erstellt);
        return Math.max(0, verbleibend);
    }

    static istVerblasst(webung) {
        return webung.zustand === 'verblasst';
    }
}