// diskurs-engine.js — Version: Σ.v∞.3.time.audit.stable

class DiskursEngine {
    constructor() {
        this.diskursRäume = new Map();
        this.EINSPRUCHSFRIST_TAGE = 7;
        this.ABSTIMMUNGSFRIST_TAGE = 7;
    }

    createRaum({ raumId, raumTyp, referenzId }) {
        if (!raumId) throw new Error("Raum-ID fehlt");
        if (this.diskursRäume.has(raumId)) throw new Error("Raum existiert bereits");
        this.diskursRäume.set(raumId, {
            id: raumId,
            typ: raumTyp,
            referenzId,
            threads: []
        });
    }

    createThread({ raumId, threadId, titel, erstellerId }) {
        const raum = this.diskursRäume.get(raumId);
        if (!raum) throw new Error("Raum nicht gefunden");
        const newThread = {
            id: threadId,
            titel,
            erstellerId,
            startZeit: Date.now(),
            beiträge: [],
            geschlossen: false,
            antrag: null
        };
        raum.threads.push(newThread);
    }

    addBeitrag({ raumId, threadId, beitragId, autorId, text }) {
        const thread = this._findThread(raumId, threadId);
        if (thread.geschlossen) throw new Error("Thread ist geschlossen");
        const beitrag = { id: beitragId, autorId, text, zeit: Date.now() };
        thread.beiträge.push(beitrag);
    }

    starteAntrag({ raumId, threadId, antragId, typ, betrag, kommentar, beantragtVon }) {
        const thread = this._findThread(raumId, threadId);
        if (thread.antrag) throw new Error("Es existiert bereits ein aktiver Antrag");
        thread.antrag = {
            id: antragId,
            typ,
            betrag,
            kommentar,
            beantragtVon,
            status: 'einspruchsfrist',
            startDatum: Date.now(),
            einspruchDatum: null,
            einspruchVon: [],
            abstimmung: null
        };
    }

    legeEinspruchEin({ raumId, threadId, nutzerId }) {
        const thread = this._findThread(raumId, threadId);
        if (!thread.antrag || thread.antrag.status !== 'einspruchsfrist') throw new Error("Kein Einspruch mehr möglich");
        if (thread.antrag.einspruchVon.includes(nutzerId)) throw new Error("Einspruch bereits eingelegt");
        thread.antrag.einspruchVon.push(nutzerId);
        thread.antrag.status = 'abstimmung';
        thread.antrag.einspruchDatum = Date.now();
        thread.antrag.abstimmung = { stimmen: {} };
    }

    stimmeAb({ raumId, threadId, nutzerId, wahl }) {
        const thread = this._findThread(raumId, threadId);
        if (!thread.antrag || thread.antrag.status !== 'abstimmung') throw new Error("Aktuell keine Abstimmung aktiv");
        thread.antrag.abstimmung.stimmen[nutzerId] = wahl;
    }

    bewerteAbstimmung({ raumId, threadId }) {
        const thread = this._findThread(raumId, threadId);
        if (!thread.antrag || thread.antrag.status !== 'abstimmung') throw new Error("Aktuell keine Abstimmung aktiv");

        const stimmen = Object.values(thread.antrag.abstimmung.stimmen);
        const dafür = stimmen.filter(s => s === 'dafür').length;
        const dagegen = stimmen.filter(s => s === 'dagegen').length;

        thread.antrag.anerkannt = dafür > dagegen;
        thread.antrag.status = thread.antrag.anerkannt ? 'angenommen' : 'abgelehnt';
    }

    schließeThread({ raumId, threadId }) {
        const thread = this._findThread(raumId, threadId);
        thread.geschlossen = true;
    }

    // ---------------- Zeitsteuerung ---------------- //

    prüfeAlleFristen() {
        const jetzt = Date.now();

        this.diskursRäume.forEach(raum => {
            raum.threads.forEach(thread => {
                const antrag = thread.antrag;
                if (!antrag) return;

                if (antrag.status === 'einspruchsfrist') {
                    const fristEnde = antrag.startDatum + this.EINSPRUCHSFRIST_TAGE * 24 * 60 * 60 * 1000;
                    if (jetzt >= fristEnde && antrag.einspruchVon.length === 0) {
                        antrag.status = 'angenommen';
                    }
                }

                if (antrag.status === 'abstimmung') {
                    const fristEnde = antrag.einspruchDatum + this.ABSTIMMUNGSFRIST_TAGE * 24 * 60 * 60 * 1000;
                    if (jetzt >= fristEnde) {
                        this.bewerteAbstimmung({ raumId: raum.id, threadId: thread.id });
                    }
                }
            });
        });
    }

    exportAlleRäume() {
        const obj = {};
        this.diskursRäume.forEach((raum, raumId) => {
            obj[raumId] = {
                id: raum.id,
                typ: raum.typ,
                referenzId: raum.referenzId,
                threads: raum.threads.map(thread => ({
                    id: thread.id,
                    titel: thread.titel,
                    erstellerId: thread.erstellerId,
                    startZeit: thread.startZeit,
                    geschlossen: thread.geschlossen,
                    beiträge: thread.beiträge.map(b => ({
                        id: b.id,
                        autorId: b.autorId,
                        text: b.text,
                        zeit: b.zeit
                    })),
                    antrag: thread.antrag
                }))
            };
        });
        return obj;
    }

    importAlleRäume(daten) {
        this.diskursRäume.clear();
        Object.values(daten).forEach(raum => {
            const threads = raum.threads.map(thread => ({
                ...thread,
                beiträge: thread.beiträge || [],
                antrag: thread.antrag || null
            }));
            this.diskursRäume.set(raum.id, {
                id: raum.id,
                typ: raum.typ,
                referenzId: raum.referenzId,
                threads
            });
        });
    }

    _findThread(raumId, threadId) {
        const raum = this.diskursRäume.get(raumId);
        if (!raum) throw new Error("Raum nicht gefunden");
        const thread = raum.threads.find(t => t.id === threadId);
        if (!thread) throw new Error("Thread nicht gefunden");
        return thread;
    }
}

export const diskursEngine = new DiskursEngine();