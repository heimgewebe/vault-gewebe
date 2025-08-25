// ui-login.js — Version: Σ.v1.auth.ui

import { rolleService } from '../models/user-model.js';

export function setupLoginUI() {
    const loginForm = document.getElementById('login-form');
    const nameInput = document.getElementById('login-name');

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const name = nameInput.value.trim();
        if (name) {
            rolleService.login(name);
            document.getElementById('login-panel').style.display = 'none';
        }
    });

    if (rolleService.isLoggedIn()) {
        document.getElementById('login-panel').style.display = 'none';
    }
}