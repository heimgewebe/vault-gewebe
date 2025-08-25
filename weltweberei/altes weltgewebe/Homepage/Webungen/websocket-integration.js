// websocket-integration.js — Version: Σ.v∞.6.sync.audit.repair

import { websocketService } from './websocket-service.js';
import { diskursApi } from './api-diskurs.js';
import { apiService } from './api-service.js';
import { startupLoader, loadInitialData } from './startup-loader.js';
import { LayerManager } from './layer-manager.js';

class WebsocketIntegration {
    constructor() {
        websocketService.registerMessageHandler(this.handleMessage.bind(this));
    }

    async handleMessage(msg) {
        const { type, payload } = msg;

        if (type === 'refresh') {
            await this.refreshLayers();
            return;
        }

        switch (type) {
            case 'thread_created':
            case 'antrag_started':
            case 'einspruch':
            case 'abstimmung':
            case 'buchung':
                await this.fullReload();
                break;

            default:
                console.warn("WebSocketIntegration: Unbekannter Eventtyp:", type);
                break;
        }
    }

    async refreshLayers() {
        console.log('WebSocketIntegration: Layer-Update via Refresh');
        const newData = await loadInitialData();
        LayerManager.getInstance()?.updateData(newData);
    }

    async fullReload() {
        console.log('WebSocketIntegration: Vollständiger Reload');
        await diskursApi.initialize();
        await apiService.initialize();
        await startupLoader.reload();
    }
}

export const websocketIntegration = new WebsocketIntegration();