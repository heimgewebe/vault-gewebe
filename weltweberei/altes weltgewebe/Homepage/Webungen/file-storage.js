// file-storage.js — Version: Σ.v∞.2.audit.safe

import fs from 'fs/promises';
import path from 'path';

class FileStorage {
    constructor(storageDir = './weltweberei-data') {
        this.storageDir = storageDir;
    }

    async ensureStorageDir() {
        await fs.mkdir(this.storageDir, { recursive: true });
    }

    async saveJson(filename, data) {
        await this.ensureStorageDir();
        const filePath = path.join(this.storageDir, filename);
        const jsonData = JSON.stringify(data, null, 2);
        await fs.writeFile(filePath, jsonData, 'utf-8');
    }

    async loadJson(filename) {
        const filePath = path.join(this.storageDir, filename);
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content);
        } catch (err) {
            if (err.code === 'ENOENT') {
                console.warn(`FileStorage: Datei ${filename} nicht gefunden, leeres Objekt zurückgegeben.`);
                return {};
            }
            throw err;
        }
    }

    async appendJson(filename, item) {
        const data = await this.loadJson(filename);
        if (!Array.isArray(data)) {
            throw new Error(`appendJson: Datei ${filename} enthält kein Array, kann nicht anhängen.`);
        }
        data.push(item);
        await this.saveJson(filename, data);
    }
}

export const fileStorage = new FileStorage();