// rollen.js
import { createRollenIcon } from './rollen-icon.js';

export async function initialisiereRollen(map) {
  try {
    const res = await fetch('./daten/rollen-daten/rollen-daten.json');
    const rollen = await res.json();

    if (!Array.isArray(rollen)) {
      console.error("❌ Kein gültiges Rollen-Array");
      return;
    }

    rollen.forEach(r => {
      const icon = createRollenIcon(r.name, r.status || 'aktiv');
      L.marker([r.lat, r.lon], { icon }).addTo(map).bindPopup(`<b>${r.name}</b>`);
    });
  } catch (e) {
    console.error("❌ Fehler beim Laden der Rollen:", e.message, e);
  }
}