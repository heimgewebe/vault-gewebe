// ui-core.js — Version: uiΣ.v1.0.basismodul

export function initializeUICore() {
    const overlay = document.getElementById('webungs-overlay');
    const infoPanel = document.getElementById('knoten-info');

    function showOverlay(contentHtml) {
        overlay.innerHTML = contentHtml;
        overlay.classList.remove('hidden');
    }

    function hideOverlay() {
        overlay.classList.add('hidden');
        overlay.innerHTML = '';
    }

    function showInfo(contentHtml) {
        infoPanel.innerHTML = contentHtml;
        infoPanel.classList.remove('hidden');
    }

    function hideInfo() {
        infoPanel.classList.add('hidden');
        infoPanel.innerHTML = '';
    }

    function toggleOverlay(contentHtml) {
        if (overlay.classList.contains('hidden')) {
            showOverlay(contentHtml);
        } else {
            hideOverlay();
        }
    }

    function toggleInfo(contentHtml) {
        if (infoPanel.classList.contains('hidden')) {
            showInfo(contentHtml);
        } else {
            hideInfo();
        }
    }

    return {
        showOverlay,
        hideOverlay,
        showInfo,
        hideInfo,
        toggleOverlay,
        toggleInfo
    };
}