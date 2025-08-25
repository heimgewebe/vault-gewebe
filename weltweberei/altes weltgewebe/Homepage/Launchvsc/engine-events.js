// engine-events.js — Version: Σ.v∞.event.bridge

export const EventEngine = {
    listeners: new Map(),

    on(eventName, callback) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName).push(callback);
    },

    emit(eventName, data) {
        const callbacks = this.listeners.get(eventName) || [];
        for (const fn of callbacks) {
            fn(data);
        }
    }
};