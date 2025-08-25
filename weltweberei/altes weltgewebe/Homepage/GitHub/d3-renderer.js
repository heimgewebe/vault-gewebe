// d3-renderer.js — Version: Σ.v9.full-visual

export function updateD3Visuals(selection, map, data, activeLayers) {
    initTooltip();

    const projection = d => map.latLngToLayerPoint([d.lat, d.lng]);
    const bounds = map.getBounds();

    if (activeLayers.has('garnrollen')) {
        renderGarnrollen(selection, projection, bounds, data);
    } else {
        selection.selectAll('.garnrolle').remove();
    }

    if (activeLayers.has('ereignisse')) {
        renderEreignisse(selection, projection, bounds, data);
    } else {
        selection.selectAll('.ereignis').remove();
    }

    if (activeLayers.has('fäden')) {
        renderFäden(selection, projection, data);
    } else {
        selection.selectAll('.faden').remove();
    }

    if (activeLayers.has('goldfaeden')) {
        renderGoldfaeden(selection, projection, data);
    } else {
        selection.selectAll('.goldfaden').remove();
    }

    if (activeLayers.has('webkasse')) {
        renderTopf(selection, projection, data);
    } else {
        selection.selectAll('.webkasse').remove();
    }
}

// Garnrollen
function renderGarnrollen(selection, projection, bounds, data) {
    const visible = data.garnrollen.filter(d => bounds.contains([d.lat, d.lng]));

    const garnrollen = selection.selectAll('.garnrolle')
        .data(visible, d => d.id);

    garnrollen.enter()
        .append('circle')
        .attr('class', 'garnrolle')
        .attr('r', 6)
        .merge(garnrollen)
        .attr('cx', d => projection(d).x)
        .attr('cy', d => projection(d).y)
        .on('mouseover', (event, d) => {
            showTooltip(`Name: ${d.name}<br>ID: ${d.id}`, event.pageX, event.pageY);
        })
        .on('mouseout', hideTooltip)
        .each(function(d) {
            addMobileLongPress(this, `Name: ${d.name}<br>ID: ${d.id}`);
        });

    garnrollen.exit().remove();
}

// webkasse
function renderTopf(selection, projection, data) {
    const topfKoordinaten = { lat: 53.56, lng: 10.03 };
    const screenPos = projection(topfKoordinaten);
    const kontostand = data.webkasse.kontostand;
    const radius = Math.sqrt(kontostand) * 0.05 + 10;

    let topf = selection.selectAll('.webkasse').data([kontostand]);

    topf.enter()
        .append('circle')
        .attr('class', 'webkasse')
        .merge(topf)
        .attr('cx', screenPos.x)
        .attr('cy', screenPos.y)
        .attr('r', radius)
        .on('mouseover', (event) => {
            showTooltip(`webkasse: ${kontostand.toFixed(2)} €`, event.pageX, event.pageY);
        })
        .on('mouseout', hideTooltip);

    topf.exit().remove();
}

// Goldfäden
function renderGoldfaeden(selection, projection, data) {
    const topfKoordinaten = { lat: 53.56, lng: 10.03 };
    const screenTopf = projection(topfKoordinaten);

    const goldfaedenData = data.webkasse.buchungen
        .filter(b => b.quelle === "goldfaden")
        .map(b => {
            const quelle = data.garnrollen.find(g => g.id === b.von);
            return { quelle, betrag: b.betrag };
        }).filter(f => f.quelle);

    const goldfaeden = selection.selectAll('.goldfaden')
        .data(goldfaedenData);

    goldfaeden.enter()
        .append('line')
        .attr('class', 'goldfaden')
        .merge(goldfaeden)
        .attr('x1', d => projection({ lat: d.quelle.lat, lng: d.quelle.lng }).x)
        .attr('y1', d => projection({ lat: d.quelle.lat, lng: d.quelle.lng }).y)
        .attr('x2', screenTopf.x)
        .attr('y2', screenTopf.y)
        .attr('stroke-width', d => Math.min(8, Math.max(1, d.betrag / 50)));

    goldfaeden.exit().remove();
}

// Aktive Fäden
function renderFäden(selection, projection, data) {
    const fadenData = data.fäden.map(f => {
        const quelle = data.garnrollen.find(g => g.id === f.quelle_garnrolle_id);
        const ziel = data.ereignisse.find(e => e.id === f.ziel_ereignis_id);
        return { quelle, ziel, faden: f };
    }).filter(f => f.quelle && f.ziel);

    const fäden = selection.selectAll('.faden')
        .data(fadenData);

    fäden.enter()
        .append('line')
        .attr('class', 'faden')
        .merge(fäden)
        .attr('x1', d => projection({ lat: d.quelle.lat, lng: d.quelle.lng }).x)
        .attr('y1', d => projection({ lat: d.quelle.lat, lng: d.quelle.lng }).y)
        .attr('x2', d => projection(d.ziel.koordinaten).x)
        .attr('y2', d => projection(d.ziel.koordinaten).y)
        .attr('stroke-width', 2);

    fäden.exit().remove();
}

// Ereignisse als Tortendiagramm
function renderEreignisse(selection, projection, bounds, data) {
    const getLatLng = e =>
        Array.isArray(e.koordinaten) ? 
        [e.koordinaten[0], e.koordinaten[1]] : 
        [e.koordinaten.lat, e.koordinaten.lng];

    const visible = data.ereignisse.filter(e => {
        const [lat, lng] = getLatLng(e);
        return bounds.contains([lat, lng]);
    });

    const ereignisGroups = selection.selectAll('.ereignis')
        .data(visible, d => d.id);

    const enterGroups = ereignisGroups.enter()
        .append('g')
        .attr('class', 'ereignis')
        .attr('transform', d => {
            const [lat, lng] = getLatLng(d);
            const p = projection({ lat, lng });
            return `translate(${p.x},${p.y})`;
        });

    enterGroups.merge(ereignisGroups)
        .attr('transform', d => {
            const [lat, lng] = getLatLng(d);
            const p = projection({ lat, lng });
            return `translate(${p.x},${p.y})`;
        })
        .each(function(d) {
            const g = d3.select(this);
            const themen = d.themenfelder;
            const radius = 12;
            const arc = d3.arc().innerRadius(0).outerRadius(radius);
            const pie = d3.pie().sort(null).value(1);
            const colorMap = {
                "Gemeinschaft": "#0074D9",
                "Kultur": "#FF851B",
                "Bildung": "#2ECC40",
                "Mitwirkung": "#FFDC00"
            };

            const arcs = pie(themen);
            const paths = g.selectAll('path').data(arcs);

            paths.enter()
                .append('path')
                .merge(paths)
                .attr('d', arc)
                .attr('fill', d => colorMap[d.data] || '#ccc');

            paths.exit().remove();

            g.on('mouseover', (event) => {
                showTooltip(generateEreignisTooltipContent(d), event.pageX, event.pageY);
            }).on('mouseout', hideTooltip);
        });

    ereignisGroups.exit().remove();
}

function generateEreignisTooltipContent(d) {
    return `
        <strong>${d.titel}</strong><br>
        ${d.beschreibung}<br>
        Themen: ${d.themenfelder.join(", ")}
    `;
}

// Tooltip Infrastruktur bleibt:
function initTooltip() { /* ... */ }
function showTooltip(content, x, y) { /* ... */ }
function hideTooltip() { /* ... */ }
function addMobileLongPress(element, content) { /* ... */ }
function showMobileTooltip(content, x, y) { /* ... */ }