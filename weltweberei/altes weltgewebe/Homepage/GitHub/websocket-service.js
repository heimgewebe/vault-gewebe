// websocket-service.js — Version: Σ.v11.3

export class WebSocketService {
    constructor(serverUrl, onMessageCallback) {
        this.serverUrl = serverUrl;
        this.socket = null;
        this.onMessageCallback = onMessageCallback;
        this.reconnectDelay = 1000;
    }

    connect() {
        this.socket = new WebSocket(this.serverUrl);

        this.socket.addEventListener('open', () => {
            console.log('WebSocket connected');
            this.reconnectDelay = 1000; // Reset backoff
        });

        this.socket.addEventListener('message', event => {
            const payload = JSON.parse(event.data);
            console.log('WebSocket message received:', payload);
            if (this.onMessageCallback) {
                this.onMessageCallback(payload);
            }
        });

        this.socket.addEventListener('close', () => {
            console.warn('WebSocket disconnected, retrying in', this.reconnectDelay);
            setTimeout(() => this.connect(), this.reconnectDelay);
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
        });

        this.socket.addEventListener('error', err => {
            console.error('WebSocket error:', err);
            this.socket.close();
        });
    }

    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        } else {
            console.warn('WebSocket not connected, message skipped');
        }
    }

    close() {
        if (this.socket) {
            this.socket.close();
        }
    }
}