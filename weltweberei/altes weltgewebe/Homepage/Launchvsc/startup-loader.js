import { ladeKnotenDaten } from './render-knoten.js';
import { ladeFadenDaten } from './render-faeden.js';
import { ladeGarnDaten } from './render-garne.js';
import { ladeAntragDaten } from './render-antraege.js';
import { ladeKassenDaten } from './render-webkasse.js';

export async function startupLoader() {
  const [knoten, faeden, webungen] = await Promise.all([
    ladeKnotenDaten(),
    ladeFadenDaten(),
    ladeGarnDaten(), // liefert auch webungen!
  ]);

  const antraege = await ladeAntragDaten();
  const finanzen = await ladeKassenDaten();

  return { knoten, faeden, webungen, antraege, finanzen };
}