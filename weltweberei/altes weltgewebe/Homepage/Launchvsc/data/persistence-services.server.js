// persistence-service.server.js — Version: Σ.server.fs

import fs from 'fs/promises';
import path from 'path';

export const PersistenceServer = {
    basePath: './weltweberei-data',

    async ensureDir() {
        await fs.mkdir(this.basePath, { recursive: true });
    },

    filePath(name) {
        return path.join(this.basePath, `${name}.json`);
    },

    async loadAll(name) {
        try {
            const content = await fs.readFile(this.filePath(name), 'utf-8');
            return JSON.parse(content);
        } catch (err) {
            if (err.code === 'ENOENT') return [];
            throw err;
        }
    },

    async write(name, data) {
        await this.ensureDir();
        await fs.writeFile(this.filePath(name), JSON.stringify(data, null, 2));
    },

    async store(name, entry) {
        const data = await this.loadAll(name);
        data.push(entry);
        await this.write(name, data);
    },

    async delete(name, id) {
        const data = await this.loadAll(name);
        const filtered = data.filter(e => e.id !== id);
        await this.write(name, filtered);
    }
};