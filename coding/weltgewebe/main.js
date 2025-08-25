// main.js
import { initialisiereRollen } from './rollen.js';

window.isLoggedIn = false; // globaler Login-Zustand

function setupLogin() {
  const loginContainer = document.getElementById('login-container');
  const loginButton = document.getElementById('login-button');

  loginButton.addEventListener('click', () => {
    const password = document.getElementById('password').value;
    if (password === 'weberei') {
      window.isLoggedIn = true;
      loginContainer.style.display = 'none';

      // Trigger Karte neu oder Marker erneut setzen
      if (window.map) {
        initialisiereRollen(window.map); // Marker mit Rotation neu laden
      }
    } else {
      alert('Falsches Passwort');
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const map = L.map('map').setView([53.57, 10.07], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  window.map = map;

  setupLogin();        // Login-System aktivieren
  initialisiereRollen(map); // Marker initial laden (ohne Rotation)
});