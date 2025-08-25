// file-storage.js — Version: Σ.v11.5

import fs from 'fs/promises';
import path from 'path';

export class FileStorage {
    constructor(baseDir = './weltweberei-data') {
        this.baseDir = baseDir;
    }

    async ensureDirectory() {
        await fs.mkdir(this.baseDir, { recursive: true });
    }

    async readJson(fileName) {
        const fullPath = path.join(this.baseDir, fileName);
        try {
            const content = await fs.readFile(fullPath, 'utf-8');
            return JSON.parse(content);
        } catch (err) {
            if (err.code === 'ENOENT') {
                return []; // leeres Standardobjekt bei fehlender Datei
            }
            throw err;
        }
    }

    async writeJson(fileName, data) {
        const fullPath = path.join(this.baseDir, fileName);
        await fs.writeFile(fullPath, JSON.stringify(data, null, 2));
    }

    async appendJson(fileName, item) {
        const data = await this.readJson(fileName);
        data.push(item);
        await this.writeJson(fileName, data);
    }
}