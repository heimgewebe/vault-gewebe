// ui-webrat.js — v1

import { diskursEngine } from '../diskurs/diskurs-engine.js';
import { uiDiskursFenster } from '../diskurs/ui-diskurs.js';

export function öffneWebrat() {
    const fenster = uiDiskursFenster.erzeuge('webrat');
    diskursEngine.öffneRaum('webrat', fenster);
}