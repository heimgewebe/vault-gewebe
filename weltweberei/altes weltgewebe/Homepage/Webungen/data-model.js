// data-model.js — Version: Σ.v∞.2.finance.audit.stable

export const daten = {
    garnrollen: [
        { id: 'g1', name: 'Alex', wohnort: 'Hamburg', lat: 53.55, lng: 10.0 },
        { id: 'g2', name: 'Sven', wohnort: 'Berlin', lat: 52.52, lng: 13.4 },
        { id: 'g3', name: 'Maria', wohnort: 'München', lat: 48.13, lng: 11.58 }
    ],

    fäden: [
        { id: 'f1', quelle_garnrolle_id: 'g1', ziel_ereignis_id: 'e1' },
        { id: 'f2', quelle_garnrolle_id: 'g2', ziel_ereignis_id: 'e1' },
        { id: 'f3', quelle_garnrolle_id: 'g3', ziel_ereignis_id: 'e2' }
    ],

    ereignisse: [
        {
            id: 'e1',
            titel: 'Eröffnung Weltweberei',
            beschreibung: 'Festakt zum Start',
            ort: 'Hamburg',
            koordinaten: [53.55, 10.0],
            zeitfenster_start: '2024-06-01T10:00:00Z',
            zeitfenster_ende: '2024-06-01T14:00:00Z',
            themenfelder: ['Gemeinschaft', 'Kultur']
        },
        {
            id: 'e2',
            titel: 'Ko-Konstruktionswerkstatt',
            beschreibung: 'Weberei-Workshop',
            ort: 'Berlin',
            koordinaten: [52.52, 13.4],
            zeitfenster_start: '2024-07-01T10:00:00Z',
            zeitfenster_ende: '2024-07-01T17:00:00Z',
            themenfelder: ['Mitwirkung']
        }
    ],

    zusagen: [
        { id: 'z1', garnrolle_id: 'g1', ereignis_id: 'e1', kommentar: 'Ich komme mit Freude!' },
        { id: 'z2', garnrolle_id: 'g2', ereignis_id: 'e1', kommentar: 'Ich bringe Kuchen.' }
    ],

    webkasse: {
        stand: 7500.00,
        buchungen: [
            { id: 'b1', typ: 'spende', betrag: 5000, kommentar: 'Erstspende Alex', datum: '2024-01-01T12:00:00Z' },
            { id: 'b2', typ: 'spende', betrag: 2500, kommentar: 'Beitrag Sven', datum: '2024-02-01T12:00:00Z' }
        ]
    }
};