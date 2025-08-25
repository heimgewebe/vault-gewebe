// services/auth-service.js — v1

let eingeloggterWeber = null;

export const AuthService = {
    login(userId, name, wohnort) {
        eingeloggterWeber = { id: userId, name, wohnort };
    },
    logout() {
        eingeloggterWeber = null;
    },
    getUser() {
        return eingeloggterWeber;
    },
    isLoggedIn() {
        return !!eingeloggterWeber;
    }
};