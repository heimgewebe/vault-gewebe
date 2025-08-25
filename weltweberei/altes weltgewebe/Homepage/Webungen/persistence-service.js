// persistence-service.js — Version: Σ.v11.5

import fs from 'fs/promises';
import path from 'path';

export class PersistenceService {
    constructor(dataDir = './weltweberei-data') {
        this.dataDir = dataDir;
        this.files = {
            users: 'users.json',
            garnrollen: 'garnrollen.json',
            ereignisse: 'ereignisse.json',
            zusagen: 'zusagen.json',
            faeden: 'faeden.json',
            webkasse: 'webkasse.json'
        };
    }

    async initialize() {
        await fs.mkdir(this.dataDir, { recursive: true });
        for (const file of Object.values(this.files)) {
            const fullPath = path.join(this.dataDir, file);
            try {
                await fs.access(fullPath);
            } catch {
                await fs.writeFile(fullPath, JSON.stringify([]));
            }
        }
    }

    async load(entity) {
        const filePath = path.join(this.dataDir, this.files[entity]);
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    }

    async save(entity, data) {
        const filePath = path.join(this.dataDir, this.files[entity]);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    }

    // bequeme Helfer

    async addUser(user) {
        const users = await this.load('users');
        users.push(user);
        await this.save('users', users);
    }

    async addGarnrolle(garnrolle) {
        const garnrollen = await this.load('garnrollen');
        garnrollen.push(garnrolle);
        await this.save('garnrollen', garnrollen);
    }

    async updatewebkasse(topf) {
        await this.save('webkasse', topf);
    }

    // usw. (andere Entities folgen später)
}