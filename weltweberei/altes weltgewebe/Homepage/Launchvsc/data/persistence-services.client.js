// persistence-service.client.js — Version: Σ.client.localStorage

export const PersistenceClient = {
    loadAll(key) {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    },

    save(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },

    store(key, entry) {
        const data = this.loadAll(key);
        data.push(entry);
        this.save(key, data);
    },

    delete(key, id) {
        const data = this.loadAll(key).filter(e => e.id !== id);
        this.save(key, data);
    },

    clear(key) {
        localStorage.removeItem(key);
    }
};