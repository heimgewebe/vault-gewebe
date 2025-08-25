// websocket-mock-server.js — Version: Σ.v∞.2.websocket.audit.stable

import WebSocket, { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', ws => {
    console.log('MockServer: Client verbunden');

    ws.on('message', message => {
        try {
            const parsed = JSON.parse(message);
            console.log('MockServer: Nachricht empfangen', parsed);

            if (parsed.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
            }
        } catch (err) {
            console.error('MockServer: Ungültige Nachricht', err);
        }
    });

    ws.on('close', () => {
        console.log('MockServer: Client getrennt');
    });

    ws.on('error', err => {
        console.error('MockServer: Verbindungsfehler', err);
    });
});

console.log('MockServer: Läuft auf ws://localhost:8080');