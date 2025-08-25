// ui-naehstuebchen.js — v1

import { diskursEngine } from '../diskurs/diskurs-engine.js';
import { uiDiskursFenster } from '../diskurs/ui-diskurs.js';

export function öffneNaehstuebchen() {
    const fenster = uiDiskursFenster.erzeuge('naehstuebchen');
    diskursEngine.öffneRaum('naehstuebchen', fenster);
}