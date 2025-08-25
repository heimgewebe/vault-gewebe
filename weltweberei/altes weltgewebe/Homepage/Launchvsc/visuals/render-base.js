// render-base.js — Version: Σ.v∞.style.core

export const RenderBase = {
    fadenStyle(farbe, dicke = 2, transparenz = 0.5) {
        return {
            stroke: farbe,
            'stroke-width': dicke,
            'stroke-opacity': transparenz,
            fill: 'none'
        };
    },
    garnStyle(farbe) {
        return {
            stroke: farbe,
            'stroke-dasharray': '5,2',
            'stroke-width': 3,
            'stroke-opacity': 0.9,
            fill: 'none'
        };
    },
    antragRandStyle(farbe) {
        return {
            stroke: farbe,
            'stroke-width': 3,
            fill: 'none'
        };
    }
};