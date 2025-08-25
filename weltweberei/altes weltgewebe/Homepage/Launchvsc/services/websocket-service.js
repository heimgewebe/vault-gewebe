// services/websocket-service.js — v1

class WebSocketService {
    constructor(url) {
        this.url = url;
        this.socket = null;
        this.listeners = new Set();
    }

    connect() {
        if (this.socket) return;

        this.socket = new WebSocket(this.url);

        this.socket.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            this.listeners.forEach(fn => fn(msg));
        };

        this.socket.onopen = () => {
            console.log('WebSocket verbunden');
        };

        this.socket.onclose = () => {
            this.socket = null;
            setTimeout(() => this.connect(), 1000);
        };

        this.socket.onerror = () => {
            this.socket?.close();
        };
    }

    send(msg) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(msg));
        }
    }

    subscribe(fn) {
        this.listeners.add(fn);
    }
}

export const WebSocketServiceInstance = new WebSocketService('ws://localhost:8080');