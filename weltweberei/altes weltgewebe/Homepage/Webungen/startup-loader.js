// startup-loader.js — Version: Σ.v11.5

import { ApiService } from './api-service.js';

export async function loadInitialData() {
    await ApiService.initialize();

    const [garnrollen, ereignisse, zusagen, faeden, webkasse] = await Promise.all([
        ApiService.fetchGarnrollen(),
        ApiService.fetchEreignisse(),
        ApiService.fetchZusagen(),
        ApiService.fetchFaeden(),
        ApiService.fetchwebkasse()
    ]);

    return { garnrollen, ereignisse, zusagen, faeden, webkasse };
}