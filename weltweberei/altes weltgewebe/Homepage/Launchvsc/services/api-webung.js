// api-webung.js — Version: Σ.v1.api

import express from 'express';
import { WebungsEngine } from './webungsengine.js';
import { persistenceService } from './persistence-service.js';

export const webungApi = express.Router();

webungApi.post('/webung', async (req, res) => {
    try {
        const newWebung = await WebungsEngine.neueWebung(req.body);
        res.status(201).json(newWebung);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

webungApi.get('/webungen', async (req, res) => {
    const webungen = await persistenceService.getAll('webungen');
    res.json(webungen);
});