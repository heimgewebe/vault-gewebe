// diskurs-engine.js — Logik zur Beitragserstellung und Fadenverknüpfung

import { speichereBeitrag } from '../../data/data-diskurs.js';
import { verknuepfeFaden } from '../../core/verblasslogik.js';

export async function hinzufuegenBeitrag(knotenId, autor, text) {
    const beitrag = {
        id: Date.now().toString(),
        knotenId,
        autor,
        text,
        zeitpunkt: new Date().toISOString()
    };

    await speichereBeitrag(beitrag);
    await verknuepfeFaden(autor, knotenId, 'beitrag');
}