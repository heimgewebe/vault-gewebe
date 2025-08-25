// data-model.js — Version: data-modelΣ.v8.full-synchron

export const daten = {
    garnrollen: [
        { id: "g1", name: "Anna Weber", lat: 53.5505, lng: 10.0014 },
        { id: "g2", name: "Ben Schneider", lat: 53.5521, lng: 10.0157 },
        { id: "g3", name: "Clara Müller", lat: 53.5487, lng: 10.0089 }
    ],

    fäden: [
        { id: "f1", quelle_garnrolle_id: "g1", ziel_ereignis_id: "e1", art: "spende", betrag: 50 },
        { id: "f2", quelle_garnrolle_id: "g2", ziel_ereignis_id: "e2", art: "hilfe", helfer: 3 },
        { id: "f3", quelle_garnrolle_id: "g3", ziel_ereignis_id: "e1", art: "antrag", titel: "Schulgarten" }
    ],

    ereignisse: [
        {
            id: "e1",
            titel: "Sommerfest",
            beschreibung: "Offenes Fest für alle Beteiligten",
            koordinaten: { lat: 53.55, lng: 10.02 },
            zeitraeume: [
                { start: "2025-08-12T10:00:00Z", ende: "2025-08-12T18:00:00Z" }
            ],
            themenfelder: ["Gemeinschaft", "Kultur"],
            status: "aktiv"
        },
        {
            id: "e2",
            titel: "Nachbarschaftsworkshop",
            beschreibung: "Planung neuer Projekte im Stadtteil",
            koordinaten: { lat: 53.551, lng: 10.015 },
            zeitraeume: [
                { start: "2025-09-05T14:00:00Z", ende: "2025-09-05T18:00:00Z" }
            ],
            themenfelder: ["Bildung", "Mitwirkung"],
            status: "geplant"
        }
    ],

    zusagen: [
        { id: "z1", garnrolle_id: "g1", ereignis_id: "e1", kommentar: "Ich bringe Kuchen mit" },
        { id: "z2", garnrolle_id: "g2", ereignis_id: "e2", kommentar: "Ich moderiere die Gruppenphase" }
    ],

    webkasse: {
        kontostand: 1500,
        buchungen: [
            {
                id: "b1",
                art: "einzahlung",
                quelle: "goldfaden",
                betrag: 500,
                von: "g1",
                kommentar: "Startbeitrag Anna",
                datum: "2025-06-01T10:00:00Z"
            },
            {
                id: "b2",
                art: "einzahlung",
                quelle: "spende",
                betrag: 1000,
                von: null,
                kommentar: "Externe Unterstützung",
                datum: "2025-06-02T11:00:00Z"
            }
        ]
    }
};