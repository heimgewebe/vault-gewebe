// auth-service.js — Version: Σ.v11.4

import { User } from './user-model.js';
import { ApiService } from './api-service.js';

export class AuthService {
    constructor() {
        this.currentUser = null;
    }

    async register({ name, wohnort, koordinaten }) {
        // Aufruf des Backends zur Registrierung
        const response = await ApiService.registerUser({ name, wohnort, koordinaten });
        this.currentUser = new User(response);
        this.persistSession();
        return this.currentUser;
    }

    async login({ name }) {
        // Einfaches Login via Name
        const response = await ApiService.loginUser({ name });
        this.currentUser = new User(response);
        this.persistSession();
        return this.currentUser;
    }

    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('weltweberei_user');
    }

    loadSession() {
        const stored = sessionStorage.getItem('weltweberei_user');
        if (stored) {
            this.currentUser = new User(JSON.parse(stored));
        }
        return this.currentUser;
    }

    persistSession() {
        if (this.currentUser) {
            sessionStorage.setItem('weltweberei_user', JSON.stringify(this.currentUser));
        }
    }

    isLoggedIn() {
        return Boolean(this.currentUser);
    }

    getUser() {
        return this.currentUser;
    }
}