// diskurs-engine.js — Version: Σ.v∞.1

export class DiskursEngine {
    constructor() {
        this.diskursRäume = new Map(); // Raum-ID → Raum-Objekt
    }

    // Neuen Raum erzeugen (Webkasse, Ereignis, Webrat, Nähstübchen)
    createRaum({ raumId, raumTyp, referenzId = null }) {
        if (this.diskursRäume.has(raumId)) {
            throw new Error("Raum existiert bereits.");
        }
        const neuerRaum = {
            id: raumId,
            typ: raumTyp,
            referenzId,
            threads: []
        };
        this.diskursRäume.set(raumId, neuerRaum);
        return neuerRaum;
    }

    // Neuen Thread in bestehendem Raum anlegen
    createThread({ raumId, threadId, titel, erstellerId, startZeit = new Date().toISOString() }) {
        const raum = this.diskursRäume.get(raumId);
        if (!raum) throw new Error("Raum nicht gefunden.");

        const neuerThread = {
            id: threadId,
            titel,
            erstellerId,
            startZeit,
            geschlossen: false,
            beiträge: [],
            abstimmungen: []
        };
        raum.threads.push(neuerThread);
        return neuerThread;
    }

    // Neuen Beitrag in Thread posten
    addBeitrag({ raumId, threadId, beitragId, autorId, text, zeit = new Date().toISOString() }) {
        const thread = this._findThread(raumId, threadId);
        const beitrag = {
            id: beitragId,
            autorId,
            text,
            zeit
        };
        thread.beiträge.push(beitrag);
        return beitrag;
    }

    // Abstimmung starten
    startAbstimmung({ raumId, threadId, abstimmungId, frage, optionen, erstellerId }) {
        const thread = this._findThread(raumId, threadId);
        const abstimmung = {
            id: abstimmungId,
            frage,
            optionen, // Array z.B. ["Ja", "Nein", "Enthaltung"]
            stimmen: [],
            erstellerId,
            gestartet: new Date().toISOString()
        };
        thread.abstimmungen.push(abstimmung);
        return abstimmung;
    }

    // Abstimmen
    abstimmen({ raumId, threadId, abstimmungId, nutzerId, wahl }) {
        const abstimmung = this._findAbstimmung(raumId, threadId, abstimmungId);
        if (abstimmung.stimmen.some(s => s.nutzerId === nutzerId)) {
            throw new Error("Nutzer hat bereits abgestimmt.");
        }
        abstimmung.stimmen.push({ nutzerId, wahl, zeit: new Date().toISOString() });
    }

    // Thread schließen
    schließeThread({ raumId, threadId }) {
        const thread = this._findThread(raumId, threadId);
        thread.geschlossen = true;
    }

    // Interne Hilfsmethoden:

    _findThread(raumId, threadId) {
        const raum = this.diskursRäume.get(raumId);
        if (!raum) throw new Error("Raum nicht gefunden.");
        const thread = raum.threads.find(t => t.id === threadId);
        if (!thread) throw new Error("Thread nicht gefunden.");
        return thread;
    }

    _findAbstimmung(raumId, threadId, abstimmungId) {
        const thread = this._findThread(raumId, threadId);
        const abstimmung = thread.abstimmungen.find(a => a.id === abstimmungId);
        if (!abstimmung) throw new Error("Abstimmung nicht gefunden.");
        return abstimmung;
    }

    // Export aller Räume (z.B. für Speicherung)
    exportAlleRäume() {
        return [...this.diskursRäume.values()];
    }

    // Import bestehender Räume (z.B. aus Persistenz)
    importAlleRäume(raumArray) {
        this.diskursRäume.clear();
        raumArray.forEach(raum => {
            this.diskursRäume.set(raum.id, raum);
        });
    }
}