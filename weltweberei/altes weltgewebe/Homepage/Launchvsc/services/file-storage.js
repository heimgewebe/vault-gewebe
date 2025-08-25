// services/file-storage.js — v1

import fs from 'fs/promises';
import path from 'path';

export const FileStorage = {
    baseDir: './weltweberei-data',

    async ensureDir() {
        await fs.mkdir(this.baseDir, { recursive: true });
    },

    async read(file) {
        const full = path.join(this.baseDir, file);
        try {
            const content = await fs.readFile(full, 'utf-8');
            return JSON.parse(content);
        } catch (err) {
            if (err.code === 'ENOENT') return [];
            throw err;
        }
    },

    async write(file, data) {
        await this.ensureDir();
        const full = path.join(this.baseDir, file);
        await fs.writeFile(full, JSON.stringify(data, null, 2));
    }
};