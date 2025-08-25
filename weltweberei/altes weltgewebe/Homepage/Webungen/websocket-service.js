// websocket-service.js — Version: Σ.v∞.3.full-audit-broadcast

export class WebSocketService {
    constructor(url = 'ws://localhost:8080') {
        this.url = url;
        this.socket = null;
        this.listeners = new Set();
        this.reconnectDelay = 1000;
        this.maxReconnectDelay = 30000;
        this.heartbeatInterval = null;
        this.heartbeatTimeout = null;
        this.pingIntervalMs = 15000;
        this.pingTimeoutMs = 45000;
    }

    connect() {
        if (this.socket) {
            console.warn('WebSocketService: Mehrfachverbindung verhindert.');
            return;
        }
        console.log('WebSocketService: Verbindungsaufbau zu', this.url);
        this.socket = new WebSocket(this.url);

        this.socket.addEventListener('open', () => {
            console.log('WebSocketService: Verbunden');
            this.reconnectDelay = 1000;
            this.startHeartbeat();
        });

        this.socket.addEventListener('message', event => {
            try {
                const msg = JSON.parse(event.data);
                this.listeners.forEach(fn => fn(msg));
            } catch (err) {
                console.error('WebSocketService: Fehler beim Parsen der Nachricht', err);
            }
        });

        this.socket.addEventListener('close', event => {
            console.warn('WebSocketService: Verbindung geschlossen', event);
            this.cleanup();
            this.reconnect();
        });

        this.socket.addEventListener('error', err => {
            console.error('WebSocketService: Verbindungsfehler', err);
            this.cleanup();
            this.reconnect();
        });
    }

    reconnect() {
        console.log(`WebSocketService: Reconnect in ${this.reconnectDelay}ms`);
        setTimeout(() => {
            this.socket = null;
            this.connect();
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
        }, this.reconnectDelay);
    }

    cleanup() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);
        this.heartbeatInterval = null;
        this.heartbeatTimeout = null;
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.socket?.readyState === WebSocket.OPEN) {
                this.send({ type: 'ping' });
                this.heartbeatTimeout = setTimeout(() => {
                    console.warn('WebSocketService: Heartbeat-Timeout — Verbindung vermutlich tot.');
                    this.socket?.close();
                }, this.pingTimeoutMs);
            }
        }, this.pingIntervalMs);
    }

    send(data) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        } else {
            console.warn('WebSocketService: Senden fehlgeschlagen — Socket nicht offen');
        }
    }

    subscribe(fn) {
        this.listeners.add(fn);
    }

    unsubscribe(fn) {
        this.listeners.delete(fn);
    }

    // >>> Erweiterte Broadcast-Methoden <<<

    broadcastThreadCreated(threadId) {
        this.send({ type: 'thread_created', payload: { threadId } });
    }

    broadcastAntragStarted(antragId) {
        this.send({ type: 'antrag_started', payload: { antragId } });
    }

    broadcastEinspruch(threadId) {
        this.send({ type: 'einspruch', payload: { threadId } });
    }

    broadcastAbstimmung(threadId) {
        this.send({ type: 'abstimmung', payload: { threadId } });
    }

    broadcastBuchung(buchungId) {
        this.send({ type: 'buchung', payload: { buchungId } });
    }
}

export const WebSocketServiceSingleton = new WebSocketService();