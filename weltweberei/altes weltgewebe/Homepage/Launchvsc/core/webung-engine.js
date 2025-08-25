// webungsengine.js — Version: Σ.v1.core

import { Rolle } from './rolle.js';
import { Faden } from './fadenmodell.js';
import { Knoten } from './knoten-modell.js';
import { Verblasslogik } from './verblasslogik.js';
import { Knotenerkennung } from './knotenerkennung.js';
import { persistenceService } from './persistence-service.js';
import { WebSocketServiceSingleton as ws } from './websocket-service.js';

export const WebungsEngine = {
    async neueWebung({ rollenId, koordinaten, inhalt, typ = 'faden', optional = {} }) {
        const rolle = await persistenceService.find('rollen', rollenId);
        if (!rolle) throw new Error('Rolle nicht gefunden');

        // 1. Knoten prüfen oder erzeugen
        let knoten = await Knotenerkennung.findeOderErzeugeKnoten(koordinaten, inhalt);

        // 2. Webung erzeugen
        const webung = new Faden({
            rolleId: rollenId,
            knotenId: knoten.id,
            typ,
            inhalt,
            ...optional
        });

        // 3. Verknüpfen
        rolle.webungen.push(webung.id);
        knoten.webungen.push(webung.id);

        // 4. Verblasslogik anwenden
        Verblasslogik.setzeVerblasstStatus(webung);

        // 5. Speichern
        await persistenceService.save('rollen', rolle);
        await persistenceService.save('knoten', knoten);
        await persistenceService.save('webungen', webung);

        // 6. WebSocket-Broadcast
        ws.send({ type: 'webung_neu', payload: { webungId: webung.id } });

        return webung;
    },

    async prüfeVerblassungFürAlle() {
        const webungen = await persistenceService.getAll('webungen');
        const knotenMap = await persistenceService.getMap('knoten');

        for (const webung of webungen) {
            const knoten = knotenMap[webung.knotenId];
            Verblasslogik.setzeVerblasstStatus(webung, !!knoten?.ereigniszeitpunkt);
            await persistenceService.save('webungen', webung);
        }
    }
};