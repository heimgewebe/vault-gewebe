// api-schema.js — Version: apiΣ.v5.0.0.core-model

export const Schema = {
    Garnrolle: {
        id: "string",
        name: "string"
    },
    Faden: {
        id: "string",
        quelle_garnrolle_id: "string",
        ziel_garnrolle_id: "string",
        art: "string",
        betrag: "number", // optional je nach Art
        helfer: "number",
        titel: "string"
    },
    Ereignis: {
        id: "string",
        titel: "string",
        beschreibung: "string",
        ort: "string",
        koordinaten: { lat: "number", lng: "number" },
        zeitraeume: [{ start: "string", ende: "string" }],
        themenfelder: ["string"],
        status: "string"
    },
    Zusage: {
        id: "string",
        garnrolle_id: "string",
        ereignis_id: "string",
        kommentar: "string"
    }
};