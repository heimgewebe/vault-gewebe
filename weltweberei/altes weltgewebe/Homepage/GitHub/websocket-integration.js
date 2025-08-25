// websocket-integration.js — Version: Σ.v11.3

import { WebSocketService } from './websocket-service.js';
import { refreshData } from './leaflet-setup.js';
import { ApiService } from './api-service.js';

export function initializeWebSocketSync() {
    const serverUrl = 'ws://localhost:8080'; // später konfigurierbar für echtes Backend
    const socket = new WebSocketService(serverUrl, handleIncoming);

    socket.connect();

    // Wir exportieren den Socket, damit andere Module senden können
    return socket;
}

// Verarbeitet eingehende Echtzeitnachrichten
async function handleIncoming(payload) {
    console.log('Echtzeit-Update empfangen:', payload);

    // Für Σ.v11.3 initial nur einfacher Voll-Refresh
    const newData = await ApiService.loadAllData();
    refreshData(newData);
}