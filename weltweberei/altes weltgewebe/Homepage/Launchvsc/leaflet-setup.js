export function initKarte() {
  const map = L.map('map').setView([51.1657, 10.4515], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  const svg = d3.select(map.getPanes().overlayPane).append('svg');
  const g = svg.append('g').attr('class', 'leaflet-zoom-hide');

  map._svgLayer = g;
  map._projection = coord => {
    const point = map.latLngToLayerPoint(new L.LatLng(coord.lat, coord.lng));
    return [point.x, point.y];
  };

  return map;
}