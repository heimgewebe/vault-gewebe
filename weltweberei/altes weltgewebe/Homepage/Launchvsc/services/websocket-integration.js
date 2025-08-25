// websocket-integration.js — Version: Σ.v1.0.webung.sync.full

import { websocketService } from './websocket-service.js';
import { loadInitialData } from './startup-loader.js';
import { renderVisuals } from './leaflet-setup.js';

export class WebsocketIntegration {
    constructor(map) {
        this.map = map;
        websocketService.registerMessageHandler(this.handleMessage.bind(this));
        websocketService.connect();
    }

    async handleMessage(msg) {
        const { type } = msg;

        if (['webung_created', 'knoten_created', 'antrag_started', 'einspruch', 'abstimmung'].includes(type)) {
            const freshData = await loadInitialData();
            renderVisuals(this.map, freshData);
        } else if (type === 'ping') {
            // optional: heartbeat received
        } else {
            console.warn('WebsocketIntegration: Unbekannter Nachrichtentyp', type);
        }
    }
}