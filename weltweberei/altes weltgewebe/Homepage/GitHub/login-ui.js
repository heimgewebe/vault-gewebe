// login-ui.js — Version: Σ.v11.4

import { AuthService } from './auth-service.js';

export function setupLoginUI(authService, onLoginCallback) {
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const overlay = document.getElementById('login-overlay');
    const form = document.getElementById('login-form');
    const nameInput = document.getElementById('login-name');
    const wohnortInput = document.getElementById('login-wohnort');
    const latInput = document.getElementById('login-lat');
    const lngInput = document.getElementById('login-lng');
    const registerCheckbox = document.getElementById('register-new');
    const feedbackDiv = document.getElementById('login-feedback');

    function openOverlay() {
        overlay.hidden = false;
        nameInput.focus();
    }

    function closeOverlay() {
        overlay.hidden = true;
    }

    loginButton.addEventListener('click', () => {
        openOverlay();
    });

    logoutButton.addEventListener('click', () => {
        authService.logout();
        location.reload();
    });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        feedbackDiv.textContent = '';
        try {
            let user;
            if (registerCheckbox.checked) {
                const name = nameInput.value.trim();
                const wohnort = wohnortInput.value.trim();
                const lat = parseFloat(latInput.value);
                const lng = parseFloat(lngInput.value);
                user = await authService.register({ name, wohnort, koordinaten: [lat, lng] });
            } else {
                const name = nameInput.value.trim();
                user = await authService.login({ name });
            }
            closeOverlay();
            if (onLoginCallback) onLoginCallback(user);
        } catch (err) {
            feedbackDiv.textContent = 'Fehler: ' + err.message;
        }
    });

    registerCheckbox.addEventListener('change', () => {
        document.getElementById('registration-fields').hidden = !registerCheckbox.checked;
    });
}