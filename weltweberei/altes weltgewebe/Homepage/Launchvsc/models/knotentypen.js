// models/knotentypen.js — Definition symbolischer Knotentypen

export const Knotentypen = {
    standard: {
        farbe: '#7F8C8D',
        symbol: '●',
        beschreibung: 'Standardknoten ohne Spezifizierung'
    },
    goldantrag: {
        farbe: '#F1C40F',
        symbol: '◎',
        beschreibung: 'Geldantrag in der Webkasse'
    },
    zusage: {
        farbe: '#2ECC71',
        symbol: '✓',
        beschreibung: 'Verbindliche Zusage (Garn)'
    },
    faden: {
        farbe: '#3498DB',
        symbol: '➝',
        beschreibung: 'Temporäre Beteiligung (Faden)'
    },
    einspruch: {
        farbe: '#9B59B6',
        symbol: '⚠️',
        beschreibung: 'Einspruch gegen Antrag'
    },
    abgelehnt: {
        farbe: '#E74C3C',
        symbol: '✗',
        beschreibung: 'Abgelehnter Antrag'
    },
    angenommen: {
        farbe: '#27AE60',
        symbol: '✓',
        beschreibung: 'Angenommener Antrag'
    }
};