let map = null;
let marker = null;

function notifyMarkerChanged() {
    if (window.pywebview && window.pywebview.api) {
        const pos = marker.getLatLng();
        window.pywebview.api.marker_moved(pos.lat, pos.lng);
    }
}

function enableMarkerTracking() {
    if (marker) {
        marker.on('dragend', notifyMarkerChanged);
    }
}

function initMap(mode = 'online') {
    if (map !== null) {
        map.remove();
        map = null;
    }

    const tileURL = (mode === 'offline')
        ? '/static/tiles/{z}/{x}/{y}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    map = L.map('map').setView([53.57, 10.07], 7);

    L.tileLayer(tileURL, {
        attribution: '© OpenStreetMap',
        maxZoom: 19
    }).addTo(map);

    marker = L.marker([53.57, 10.07], { draggable: true }).addTo(map);
    enableMarkerTracking();
}

function setMarker(lat, lon) {
    if (marker && map) {
        marker.setLatLng([lat, lon]);
        map.setView([lat, lon], 14);
    }
}

function getMarkerPos() {
    if (marker) {
        const pos = marker.getLatLng();
        return [pos.lat, pos.lng];
    }
    return null;
}