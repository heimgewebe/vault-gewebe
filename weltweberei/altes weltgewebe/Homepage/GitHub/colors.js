// colors.js — Version: colorsΣ.v3.1.0.full-polished

export const THEMA_COLORS = {
    "Bildung": "#4CAF50",
    "Soziales": "#2196F3",
    "Infrastruktur": "#FFC107",
    "Umwelt": "#8BC34A",
    "Gesundheit": "#E91E63",
    "Kultur": "#9C27B0",
    "Sport": "#FF5722",
    "Kinderbetreuung": "#FF9800",
    "Hilfe": "#3F51B5",
    "Kochen": "#795548"
};

export function getColorForThema(thema) {
    return THEMA_COLORS[thema] || "#999999";
}