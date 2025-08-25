// zeitleiste.js — v1

import { renderKnoten } from '../../visual/render-knoten.js';
import { renderFaeden } from '../../visual/render-faeden.js';

export const zeitleiste = {
    alleDaten: [],
    aktuelleZeit: null,

    init(data) {
        this.alleDaten = data;
    },

    zeigeTag(tagIndex) {
        const tag = this.alleDaten[tagIndex];
        if (!tag) return;
        this.aktuelleZeit = tag.datum;
        renderKnoten(tag.knoten);
        renderFaeden(tag.faeden);
    }
};