export function createRollenIcon(name, rotate = false) {
  const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '');
  const imagePath = `./img/garnrolle.svg`;

  const iconHtml = `
    <div class="rollen-icon-container garnrolle ${rotate ? 'rollen-rotierend' : ''}">
      <img src="${imagePath}" class="rollen-icon-image" />
      <svg viewBox="0 0 120 120" class="rollen-icon-svg">
        <defs>
          <path id="textPath-${sanitizedName}" d="M60,60 m-20,0 a20,20 0 1,1 40,0 a20,20 0 1,1 -40,0" />
        </defs>
        <text dy="-2" text-anchor="middle" class="rollen-svg-text">
          <textPath startOffset="50%" xlink:href="#textPath-${sanitizedName}">
            ${name}
          </textPath>
        </text>
      </svg>
    </div>
  `;

  return L.divIcon({
    className: 'custom-rollen-div-icon',
    html: iconHtml,
    iconSize: [60, 60],
    iconAnchor: [30, 30]
  });
}