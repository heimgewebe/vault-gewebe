// data-model.js — Version: Σ.v1.modelstruktur

export const Model = {
    webung: {
        id: null,
        vonRollenId: null,
        typ: 'faden' | 'garn' | 'antrag',
        zuKnotenId: null,
        text: '',
        erstelltAm: null,
        verblasstAm: null,
        farbe: '', // optisch gesteuert über Typ & Status
        status: '', // aktiv | verblasst | angenommen | abgelehnt
    },

    knoten: {
        id: null,
        erstelltVon: null,
        erstelltAm: null,
        koordinaten: { lat: 0, lng: 0 },
        text: '',
        visual: 'knotenstandard',
        ereigniszeitpunkt: null // optional
    },

    antrag: {
        id: null,
        vonRollenId: null,
        knotenId: null,
        gestelltAm: null,
        typ: '', // 'gold' | 'veränderung' | 'anschaffung'
        text: '',
        status: 'offen' | 'einspruch' | 'abgelehnt' | 'angenommen',
        einspruchsDatum: null,
        entscheidungsDatum: null
    },

    rolle: {
        id: null,
        name: '',
        wohnort: { lat: 0, lng: 0 }
    }
};