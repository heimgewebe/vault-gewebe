Hier kommt das vollständige, minimal realistische Demo-Datenpaket für .gewebe/in/ – perfekt abgestimmt auf den neuen API-Slice, Tests und Map-Frontend.
Ziel: Out-of-the-box sichtbare Marker und Fäden rund um Hamburg (damit man gleich was sieht, wenn /map aufgerufen wird).

⸻

📁 Struktur

.gewebe/
└─ in/
   ├─ demo.nodes.jsonl
   └─ demo.edges.jsonl


⸻

🧩 .gewebe/in/demo.nodes.jsonl

{"type":"Feature","id":"n1","geometry":{"type":"Point","coordinates":[9.9937,53.5511]},"properties":{"title":"Marktplatz Hamburg","type":"Ort","updated_at":"2025-11-01T09:00:00Z"}}
{"type":"Feature","id":"n2","geometry":{"type":"Point","coordinates":[10.0002,53.5523]},"properties":{"title":"Nachbarschaftshaus","type":"Initiative","updated_at":"2025-11-02T12:15:00Z"}}
{"type":"Feature","id":"n3","geometry":{"type":"Point","coordinates":[9.9813,53.5456]},"properties":{"title":"Tauschbox Altona","type":"Projekt","updated_at":"2025-10-30T18:45:00Z"}}
{"type":"Feature","id":"n4","geometry":{"type":"Point","coordinates":[10.0184,53.5631]},"properties":{"title":"Gemeinschaftsgarten","type":"Ort","updated_at":"2025-11-05T10:00:00Z"}}
{"type":"Feature","id":"n5","geometry":{"type":"Point","coordinates":[9.9708,53.5615]},"properties":{"title":"Reparaturcafé","type":"Initiative","updated_at":"2025-11-03T16:20:00Z"}}

💡 Erklärung
	•	Jede Zeile = eigenständiges JSON-Objekt (GeoJSON Feature).
	•	Koordinaten: [Längengrad, Breitengrad] – alle rund um Hamburg.
	•	Properties enthalten minimale Anzeigeinfos (title, type, updated_at).
	•	Wird direkt vom GET /api/nodes geladen.

⸻

🧵 .gewebe/in/demo.edges.jsonl

{"id":"e1","src":"n1","dst":"n2","kind":"connection","title":"Kooperation Marktplatz ↔ Nachbarschaftshaus"}
{"id":"e2","src":"n2","dst":"n4","kind":"support","title":"Gemeinschaftsaktion Gartenpflege"}
{"id":"e3","src":"n1","dst":"n3","kind":"exchange","title":"Tauschbox liefert Material"}
{"id":"e4","src":"n5","dst":"n1","kind":"support","title":"Reparaturcafé hilft Marktplatz"}

💡 Erklärung
	•	Jede Zeile = einfache gerichtete Verbindung (Faden).
	•	Felder src und dst referenzieren ids aus demo.nodes.jsonl.
	•	kind und title sind optional, aber hilfreich fürs spätere Overlay/Labeling.

⸻

✅ Smoke-Checks (direkt in Shell)

# Nodes abrufen
curl -s http://localhost:8080/api/nodes | jq length
# → sollte 5 ergeben

# BBox-Filter auf Innenstadt
curl -s 'http://localhost:8080/api/nodes?bbox=9.98,53.54,10.02,53.56' | jq '.[].properties.title'
# → nur n1, n2, n3

# Kanten abrufen
curl -s http://localhost:8080/api/edges | jq '.[].title'


⸻

🎯 Bonus (für Jules’ Verständnis)
	•	Diese Dateien sind nicht migrations- oder schema-kritisch – sie dienen nur als live stub dataset.
	•	Sie können gefahrlos im Repo bleiben (unter .gewebe/in/ wird ohnehin versioniert).
	•	Das Frontend kann später diese Daten nutzen, um Marker direkt auf der Map zu zeigen, sobald /api/nodes implementiert ist.

⸻

Möchtest du, dass ich gleich noch eine kleine just task oder make target formuliere (just serve-demo), damit Jules lokal mit einem Befehl den Axum-Server + API starten und curl testen kann?

super — hier kommt ein komplett lauffähiger Demo-Server (ohne weitere Abhängigkeiten) plus just- und make-Targets. Damit kann Jules lokal in <10 Sek. /api/nodes und /api/edges** bereitstellen, inkl. bbox-Filter.

⸻

1) Datei: scripts/dev/gewebe-demo-server.mjs

mkdir -p scripts/dev

// scripts/dev/gewebe-demo-server.mjs
// Minimaler, dependency-freier HTTP-Server (Node >= 18/20) für die Demo-APIs.
// Endpunkte:
//   GET /api/nodes[?bbox=west,south,east,north]
//   GET /api/edges
// Liest JSONL aus ./.gewebe/in/*.jsonl

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const PORT = Number(process.env.PORT || 8080);

const NODES_FILE = resolve(__dirname, '.gewebe/in/demo.nodes.jsonl');
const EDGES_FILE = resolve(__dirname, '.gewebe/in/demo.edges.jsonl');

async function readJsonl(path) {
  const raw = await readFile(path, 'utf8').catch(() => '');
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function parseBBox(q) {
  // bbox=west,south,east,north
  if (!q || !('bbox' in q)) return null;
  const parts = String(q.bbox).split(',').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return null;
  const [west, south, east, north] = parts;
  return { west, south, east, north };
}

function withinBBox(feature, bbox) {
  if (!feature?.geometry || feature.geometry.type !== 'Point') return false;
  const [lng, lat] = feature.geometry.coordinates || [];
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    lng >= bbox.west &&
    lng <= bbox.east &&
    lat >= bbox.south &&
    lat <= bbox.north
  );
}

function sendJson(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(JSON.stringify(body));
}

function notFound(res) {
  sendJson(res, 404, { error: 'Not Found' });
}

function badRequest(res, msg) {
  sendJson(res, 400, { error: 'Bad Request', message: msg });
}

function parseQuery(url) {
  const idx = url.indexOf('?');
  const q = {};
  if (idx === -1) return q;
  const usp = new URLSearchParams(url.slice(idx + 1));
  for (const [k, v] of usp.entries()) q[k] = v;
  return q;
}

const server = createServer(async (req, res) => {
  try {
    const url = req.url || '/';
    const path = url.split('?')[0];

    if (req.method === 'GET' && path === '/api/nodes') {
      const q = parseQuery(url);
      const bbox = parseBBox(q);
      const nodes = await readJsonl(NODES_FILE);

      const data = bbox ? nodes.filter((f) => withinBBox(f, bbox)) : nodes;
      return sendJson(res, 200, data);
    }

    if (req.method === 'GET' && path === '/api/edges') {
      const edges = await readJsonl(EDGES_FILE);
      return sendJson(res, 200, edges);
    }

    if (req.method === 'OPTIONS') {
      // CORS preflight
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
      });
      return res.end();
    }

    return notFound(res);
  } catch (err) {
    console.error('[demo-server] error:', err);
    return sendJson(res, 500, { error: 'Internal Server Error' });
  }
});

server.listen(PORT, () => {
  console.log(`▶ Demo-API läuft:  http://127.0.0.1:${PORT}`);
  console.log('   GET /api/nodes[?bbox=west,south,east,north]');
  console.log('   GET /api/edges');
});


⸻

2) Demo-Daten schnell anlegen (falls noch nicht vorhanden)

mkdir -p .gewebe/in
cat > .gewebe/in/demo.nodes.jsonl <<'JSONL'
{"type":"Feature","id":"n1","geometry":{"type":"Point","coordinates":[9.9937,53.5511]},"properties":{"title":"Marktplatz Hamburg","type":"Ort","updated_at":"2025-11-01T09:00:00Z"}}
{"type":"Feature","id":"n2","geometry":{"type":"Point","coordinates":[10.0002,53.5523]},"properties":{"title":"Nachbarschaftshaus","type":"Initiative","updated_at":"2025-11-02T12:15:00Z"}}
{"type":"Feature","id":"n3","geometry":{"type":"Point","coordinates":[9.9813,53.5456]},"properties":{"title":"Tauschbox Altona","type":"Projekt","updated_at":"2025-10-30T18:45:00Z"}}
{"type":"Feature","id":"n4","geometry":{"type":"Point","coordinates":[10.0184,53.5631]},"properties":{"title":"Gemeinschaftsgarten","type":"Ort","updated_at":"2025-11-05T10:00:00Z"}}
{"type":"Feature","id":"n5","geometry":{"type":"Point","coordinates":[9.9708,53.5615]},"properties":{"title":"Reparaturcafé","type":"Initiative","updated_at":"2025-11-03T16:20:00Z"}}
JSONL

cat > .gewebe/in/demo.edges.jsonl <<'JSONL'
{"id":"e1","src":"n1","dst":"n2","kind":"connection","title":"Kooperation Marktplatz ↔ Nachbarschaftshaus"}
{"id":"e2","src":"n2","dst":"n4","kind":"support","title":"Gemeinschaftsaktion Gartenpflege"}
{"id":"e3","src":"n1","dst":"n3","kind":"exchange","title":"Tauschbox liefert Material"}
{"id":"e4","src":"n5","dst":"n1","kind":"support","title":"Reparaturcafé hilft Marktplatz"}
JSONL


⸻

3) just-Targets

Falls ihr bereits eine Justfile habt: ergänzen. Sonst neue Justfile anlegen.

# Justfile

# .PHONY-ähnlich:
set shell := ["bash", "--noprofile", "--norc", "-euo", "pipefail", "-c"]

# Port überschreibbar: `just serve-demo PORT=9090`
PORT := "8080"

# Erzeugt Demo-Daten falls nicht vorhanden.
demo-data:
    mkdir -p .gewebe/in
    test -s .gewebe/in/demo.nodes.jsonl || { echo "→ seeds: nodes"; cat > .gewebe/in/demo.nodes.jsonl <<'JSONL'
    {"type":"Feature","id":"n1","geometry":{"type":"Point","coordinates":[9.9937,53.5511]},"properties":{"title":"Marktplatz Hamburg","type":"Ort","updated_at":"2025-11-01T09:00:00Z"}}
    {"type":"Feature","id":"n2","geometry":{"type":"Point","coordinates":[10.0002,53.5523]},"properties":{"title":"Nachbarschaftshaus","type":"Initiative","updated_at":"2025-11-02T12:15:00Z"}}
    {"type":"Feature","id":"n3","geometry":{"type":"Point","coordinates":[9.9813,53.5456]},"properties":{"title":"Tauschbox Altona","type":"Projekt","updated_at":"2025-10-30T18:45:00Z"}}
    {"type":"Feature","id":"n4","geometry":{"type":"Point","coordinates":[10.0184,53.5631]},"properties":{"title":"Gemeinschaftsgarten","type":"Ort","updated_at":"2025-11-05T10:00:00Z"}}
    {"type":"Feature","id":"n5","geometry":{"type":"Point","coordinates":[9.9708,53.5615]},"properties":{"title":"Reparaturcafé","type":"Initiative","updated_at":"2025-11-03T16:20:00Z"}}
    JSONL
    }
    test -s .gewebe/in/demo.edges.jsonl || { echo "→ seeds: edges"; cat > .gewebe/in/demo.edges.jsonl <<'JSONL'
    {"id":"e1","src":"n1","dst":"n2","kind":"connection","title":"Kooperation Marktplatz ↔ Nachbarschaftshaus"}
    {"id":"e2","src":"n2","dst":"n4","kind":"support","title":"Gemeinschaftsaktion Gartenpflege"}
    {"id":"e3","src":"n1","dst":"n3","kind":"exchange","title":"Tauschbox liefert Material"}
    {"id":"e4","src":"n5","dst":"n1","kind":"support","title":"Reparaturcafé hilft Marktplatz"}
    JSONL
    }

# Startet den Demo-API-Server auf :${PORT}
serve-demo: demo-data
    node scripts/dev/gewebe-demo-server.mjs

# Schneller Smoke-Test der Endpunkte
check-demo:
    curl -fsS "http://127.0.0.1:{{PORT}}/api/nodes" | jq length
    curl -fsS "http://127.0.0.1:{{PORT}}/api/edges" | jq 'length'

Aufruf:

just serve-demo        # startet :8080
# oder:
PORT=9090 just serve-demo


⸻

4) Makefile-Targets (optional parallel zu just)

# Makefile

PORT ?= 8080

.PHONY: demo-data serve-demo check-demo
demo-data:
	mkdir -p .gewebe/in
	@if [ ! -s .gewebe/in/demo.nodes.jsonl ]; then \
		echo "→ seeds: nodes"; \
		cat > .gewebe/in/demo.nodes.jsonl <<'JSONL'; \
{"type":"Feature","id":"n1","geometry":{"type":"Point","coordinates":[9.9937,53.5511]},"properties":{"title":"Marktplatz Hamburg","type":"Ort","updated_at":"2025-11-01T09:00:00Z"}}
{"type":"Feature","id":"n2","geometry":{"type":"Point","coordinates":[10.0002,53.5523]},"properties":{"title":"Nachbarschaftshaus","type":"Initiative","updated_at":"2025-11-02T12:15:00Z"}}
{"type":"Feature","id":"n3","geometry":{"type":"Point","coordinates":[9.9813,53.5456]},"properties":{"title":"Tauschbox Altona","type":"Projekt","updated_at":"2025-10-30T18:45:00Z"}}
{"type":"Feature","id":"n4","geometry":{"type":"Point","coordinates":[10.0184,53.5631]},"properties":{"title":"Gemeinschaftsgarten","type":"Ort","updated_at":"2025-11-05T10:00:00Z"}}
{"type":"Feature","id":"n5","geometry":{"type":"Point","coordinates":[9.9708,53.5615]},"properties":{"title":"Reparaturcafé","type":"Initiative","updated_at":"2025-11-03T16:20:00Z"}}
JSONL \
	fi
	@if [ ! -s .gewebe/in/demo.edges.jsonl ]; then \
		echo "→ seeds: edges"; \
		cat > .gewebe/in/demo.edges.jsonl <<'JSONL'; \
{"id":"e1","src":"n1","dst":"n2","kind":"connection","title":"Kooperation Marktplatz ↔ Nachbarschaftshaus"}
{"id":"e2","src":"n2","dst":"n4","kind":"support","title":"Gemeinschaftsaktion Gartenpflege"}
{"id":"e3","src":"n1","dst":"n3","kind":"exchange","title":"Tauschbox liefert Material"}
{"id":"e4","src":"n5","dst":"n1","kind":"support","title":"Reparaturcafé hilft Marktplatz"}
JSONL \
	fi

serve-demo: demo-data
	node scripts/dev/gewebe-demo-server.mjs

check-demo:
	curl -fsS "http://127.0.0.1:$(PORT)/api/nodes" | jq length
	curl -fsS "http://127.0.0.1:$(PORT)/api/edges" | jq 'length'


⸻

5) Quick-Test

# Terminal 1
just serve-demo
# ▶ Demo-API läuft:  http://127.0.0.1:8080

# Terminal 2
curl -s http://127.0.0.1:8080/api/nodes | jq length
curl -s 'http://127.0.0.1:8080/api/nodes?bbox=9.98,53.54,10.02,53.56' | jq '.[].properties.title'
curl -s http://127.0.0.1:8080/api/edges | jq -r '.[].title'


⸻

Wenn du möchtest, passe ich dir jetzt noch den Svelte /map-Fetch so an, dass er gegen http://127.0.0.1:8080 geht, solange keine echte Backend-URL konfiguriert ist (z. B. via VITE_API_BASE + Fallback).