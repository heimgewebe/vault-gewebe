// utility-tooltips.js — Version: Σ.v∞.2.audit.stable

let tooltipDiv = null;

export function initTooltip() {
    tooltipDiv = document.createElement('div');
    tooltipDiv.id = 'tooltip';
    tooltipDiv.style.position = 'absolute';
    tooltipDiv.style.padding = '6px 10px';
    tooltipDiv.style.background = 'rgba(0, 0, 0, 0.8)';
    tooltipDiv.style.color = '#fff';
    tooltipDiv.style.borderRadius = '4px';
    tooltipDiv.style.pointerEvents = 'none';
    tooltipDiv.style.visibility = 'hidden';
    tooltipDiv.style.zIndex = 9999;
    document.body.appendChild(tooltipDiv);
}

export function showTooltip(content, x, y) {
    if (!tooltipDiv) initTooltip();
    tooltipDiv.innerHTML = content;
    tooltipDiv.style.left = `${x + 10}px`;
    tooltipDiv.style.top = `${y + 10}px`;
    tooltipDiv.style.visibility = 'visible';
}

export function hideTooltip() {
    if (tooltipDiv) {
        tooltipDiv.style.visibility = 'hidden';
    }
}

export function addMobileLongPress(element, content, duration = 600) {
    let pressTimer;
    element.addEventListener('touchstart', function (e) {
        pressTimer = setTimeout(() => {
            showMobileTooltip(content, e.touches[0].pageX, e.touches[0].pageY);
        }, duration);
    });
    element.addEventListener('touchend', () => clearTimeout(pressTimer));
}

export function showMobileTooltip(content, x, y) {
    showTooltip(content, x, y);
    setTimeout(() => hideTooltip(), 2000);
}