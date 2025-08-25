// data/data-diskurs.js — Version: Σ.v2.diskursstruktur.raumgestützt

export const diskursData = {
    räume: [], // Jeder Raum: { id, typ, referenzId, gespräche: [ { id, beitrag, typ, autor, zeit } ] }

    addRaum(raum) {
        this.räume.push(raum);
    },

    findRaum(id) {
        return this.räume.find(r => r.id === id);
    },

    addGespräch(raumId, gespräch) {
        const raum = this.findRaum(raumId);
        if (raum) {
            raum.gespräche.push(gespräch);
        }
    },

    getGespräche(raumId) {
        const raum = this.findRaum(raumId);
        return raum ? raum.gespräche : [];
    },

    getGesprächeMitTyp(raumId, typ) {
        const raum = this.findRaum(raumId);
        return raum ? raum.gespräche.filter(g => g.typ === typ) : [];
    },

    deleteGespräch(raumId, gesprächId) {
        const raum = this.findRaum(raumId);
        if (raum) {
            raum.gespräche = raum.gespräche.filter(g => g.id !== gesprächId);
        }
    },

    deleteRaum(id) {
        this.räume = this.räume.filter(r => r.id !== id);
    },

    getAlleRäume() {
        return this.räume;
    }
};