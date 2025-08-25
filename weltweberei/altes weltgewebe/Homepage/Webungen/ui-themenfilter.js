// ui-themenfilter.js — Version: Σ.v∞.2.final.audit

/**
 * Auditierte Themenfilter-Steuerung der Weltweberei.
 * Vollständig unabhängig von Formhandling und Utility-Core.
 */
export function setupThemenfilter(layerManager) {
    const themeButtons = document.querySelectorAll('.theme-filter');
    const resetButton = document.getElementById('reset-themes');
    const activeThemes = new Set();

    themeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const theme = button.dataset.theme;
            const isActive = activeThemes.has(theme);

            if (isActive) {
                activeThemes.delete(theme);
                button.classList.remove('active');
                button.setAttribute('aria-pressed', 'false');
            } else {
                activeThemes.add(theme);
                button.classList.add('active');
                button.setAttribute('aria-pressed', 'true');
            }

            layerManager.setActiveThemes([...activeThemes]);
        });

        button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                button.click();
            }
        });
    });

    resetButton.addEventListener('click', () => {
        activeThemes.clear();
        themeButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });
        layerManager.setActiveThemes([]);
    });
}