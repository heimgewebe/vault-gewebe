function initialisiereKarte() {
  const map = L.map('map').setView([53.56, 10.06], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);
  return map;
}