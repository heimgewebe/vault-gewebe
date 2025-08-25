// zeitlogik.js — Version: Σ.v1.verblassung

export const Zeitlogik = {
    verblassungsTage: 7,

    istVerblassend(webung, jetzt = new Date()) {
        if (!webung.verblasstAm) return false;
        return new Date(webung.verblasstAm) < jetzt;
    },

    berechneVerblassung(typ, ereigniszeitpunkt = null) {
        const basis = ereigniszeitpunkt
            ? new Date(ereigniszeitpunkt)
            : new Date();

        if (typ === 'garn') return null; // bleibt permanent
        const verblass = new Date(basis);
        verblass.setDate(verblass.getDate() + Zeitlogik.verblassungsTage);
        return verblass.toISOString();
    }
};