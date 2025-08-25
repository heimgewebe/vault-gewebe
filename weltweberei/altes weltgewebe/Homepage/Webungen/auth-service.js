// auth-service.js — Version: Σ.v∞.2.auth.audit.rebuild

import { ApiService } from './api-service.js';
import { User } from './user-model.js';

class AuthService {
    constructor() {
        this.currentUser = null;
    }

    async register(name, wohnort, lat, lng) {
        const userObj = new User(name, wohnort, lat, lng);
        const user = await ApiService.registerUser(userObj);
        this.persistSession(user);
        this.currentUser = user;
        return user;
    }

    async login(name) {
        const user = await ApiService.loginUser(name);
        if (!user) throw new Error("Login fehlgeschlagen");
        this.persistSession(user);
        this.currentUser = user;
        return user;
    }

    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('weltweberei-session');
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    persistSession(user) {
        sessionStorage.setItem('weltweberei-session', JSON.stringify(user));
    }

    loadSession() {
        const data = sessionStorage.getItem('weltweberei-session');
        if (data) {
            this.currentUser = JSON.parse(data);
        }
    }

    // Audit-Erweiterung: Snapshotfähigkeit (optional)
    exportSnapshot() {
        return this.currentUser ? [this.currentUser] : [];
    }

    loadFromSnapshot(snapshot) {
        if (snapshot.length > 0) {
            this.currentUser = snapshot[0];
            this.persistSession(this.currentUser);
        }
    }
}

export const authService = new AuthService();