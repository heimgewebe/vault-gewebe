// persistence-service.js — Version: Σ.v2.contextaware

let speicher;

if (typeof window !== 'undefined' && window.localStorage) {
    // Client-basiert
    import('./persistence-service.client.js').then(mod => {
        speicher = mod.Speicher;
    });
} else {
    // Server-basiert (Node.js)
    import('./persistence-service.server.js').then(mod => {
        speicher = mod.Speicher;
    });
}

// Async-Wartefunktion, bis das Modul geladen ist
async function bereitstellen() {
    if (!speicher) {
        await new Promise(resolve => setTimeout(resolve, 10)); // minimal warten
        return bereitstellen(); // rekursiv warten
    }
    return speicher;
}

// Exporte als Proxy-Funktionen
export const Speicher = {
    async ladeAlle(name) {
        const s = await bereitstellen();
        return s.ladeAlle(name);
    },

    async schreibe(name, daten) {
        const s = await bereitstellen();
        return s.schreibe(name, daten);
    },

    async speichere(name, eintrag) {
        const s = await bereitstellen();
        return s.speichere(name, eintrag);
    },

    async loesche(name, id) {
        const s = await bereitstellen();
        return s.loesche(name, id);
    }
};