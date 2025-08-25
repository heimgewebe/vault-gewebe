// system-meta.js — Version: Σ.v∞.setup.core

export const SystemMeta = {
    version: 'Σ.v∞.setup.core',
    entwicklungsmodus: true,
    aktiveModule: new Set([
        'knoten', 'faden', 'garn', 'antrag', 'verblassung', 'rollen', 'webkasse'
    ]),
    toggleModul(modulname) {
        if (this.aktiveModule.has(modulname)) {
            this.aktiveModule.delete(modulname);
        } else {
            this.aktiveModule.add(modulname);
        }
    },
    istAktiv(modulname) {
        return this.aktiveModule.has(modulname);
    }
};