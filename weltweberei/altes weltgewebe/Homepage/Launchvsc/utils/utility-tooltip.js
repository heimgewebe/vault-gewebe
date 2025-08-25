// utility-tooltip.js — Version: Σ.v1.tooltip.system

export function createTooltip(content, position) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.innerText = content;
    tooltip.style.top = `${position.y}px`;
    tooltip.style.left = `${position.x}px`;
    document.body.appendChild(tooltip);
    return tooltip;
}

export function removeTooltip() {
    const tooltips = document.querySelectorAll('.tooltip');
    tooltips.forEach(t => t.remove());
}