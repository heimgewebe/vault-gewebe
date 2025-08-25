let map, marker; // These are global to karte.js

function initMap(mode) {
  const startCoords = [53.57, 10.07];
  const startZoom = 7;

  // Karte und DOM-Container neu initialisieren
  if (map) {
    map.remove();
    document.getElementById('map').innerHTML = "";
  }

  // Neue Leaflet-Karte erzeugen
  map = L.map('map').setView(startCoords, startZoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 19
  }).addTo(map);

  // Marker setzen
  marker = L.marker(startCoords, { draggable: true }).addTo(map);
}

// Marker aktualisieren (z. B. durch Geocoding oder Benutzereingabe)
function setMarker(lat, lon) {
  if (marker) {
    marker.setLatLng([lat, lon]);
    map.setView([lat, lon], 14);
  }
}

// Markerposition abrufen (z. B. beim Speichern)
// Geändert: Gibt die Position als JSON-String zurück
function getMarkerPos() {
  if (marker) {
    const pos = marker.getLatLng();
    return JSON.stringify([pos.lat, pos.lng]);
  }
  // Rückgabe von Fallback-Koordinaten auch als JSON-String
  return JSON.stringify([53.57, 10.07]);
}

// Globalisieren für Pythonista-Kompatibilität, falls karte.js direkt geladen wird
window.initMap = initMap;
window.setMarker = setMarker;
window.getMarkerPos = getMarkerPos;
window._rolle_marker = marker;
