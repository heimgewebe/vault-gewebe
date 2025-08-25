// websocket-mock-server.js — Version: Σ.v11.3

import { WebSocketServer } from 'ws';

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket Mock Server läuft auf ws://localhost:${PORT}`);

const clients = new Set();

wss.on('connection', (ws) => {
    console.log('Neuer Client verbunden');
    clients.add(ws);

    ws.on('message', (message) => {
        console.log('Nachricht empfangen:', message);

        // Broadcast an alle anderen Clients
        for (const client of clients) {
            if (client !== ws && client.readyState === client.OPEN) {
                client.send(message);
            }
        }
    });

    ws.on('close', () => {
        console.log('Client getrennt');
        clients.delete(ws);
    });

    ws.on('error', (err) => {
        console.error('WebSocket Fehler:', err);
        clients.delete(ws);
    });
});