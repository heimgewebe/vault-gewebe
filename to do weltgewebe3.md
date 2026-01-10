Kurzfassung vorweg:
Ein großer Teil deiner Analyse ist korrekt, ein paar Punkte sind schon gefixt oder gar keine echten Fehler. Unten trenne ich sauber: bestätigt / bereits behoben / eher Fehlalarm und formuliere daraus dann konkrete Arbeitsanweisungen für Codex/Jules/Copilot.

⸻

1. Einordnung deiner Funde

A) Bestätigte / sinnvolle Punkte
	1.	npm vs pnpm + irreführende Artefakte/Doks

	•	apps/web/package.json erzwingt pnpm: "packageManager": "pnpm@9.11.0".
	•	apps/web/README.md spricht aber weiterhin von npm ci / npm run dev.
	•	apps/web/npm-install.log dokumentiert einen fehlgeschlagenen npm-Install (ERESOLVE).

➡️ Sachlich: Das Projekt ist klar auf pnpm ausgerichtet, npm-Log und README sind inkonsistent und können andere (oder Bots) in die falsche Richtung schicken.

⸻

	2.	Health-Check lädt Policy über relative Pfade
apps/api/src/routes/health.rs nutzt u. a.:

let fallback_paths = [
    Path::new("policies/limits.yaml").to_path_buf(),
    // weitere Varianten mit CARGO_MANIFEST_DIR ...
];

➡️ Wenn man cargo run direkt in apps/api ausführt, ist policies/limits.yaml relativ erst mal falsch; die anderen Fallbacks entschärfen das zwar, aber das Setup bleibt fragil (abhängig davon, wo die Binary liegt / welches Working-Dir CI und Docker benutzen).

⸻

	3.	JSONL wird bei jedem Request von Platte gelesen (Nodes/Edges)
In apps/api/src/routes/nodes.rs:

	•	Es wird pro Request die JSONL-Datei aus .gewebe/in/demo.nodes.jsonl geöffnet und zeilenweise gelesen.
	•	Gleiches Muster in edges.rs.

➡️ Für Demo-Latitude noch ok, aber konzeptionell klar: das gehört in einen Start-up-Load (In-Memory-Cache oder DB), nicht pro Request.

⸻

	4.	BBox-Logik ist nur „klassisch“, nicht antimeridian-fest
In apps/api/src/routes/nodes.rs:

fn point_in_bbox(lng: f64, lat: f64, bb: &BBox) -> bool {
    lng >= bb.min_lng && lng <= bb.max_lng && lat >= bb.min_lat && lat <= bb.max_lat
}

➡️ Für Hamburg-Demo unkritisch, global gesehen falsch für BBoxen, die über den 180°-Meridian laufen. Ein konzeptioneller Bug mit späterer Relevanz.

⸻

	5.	Auth-Middleware ist aktuell ein Dummy (Open Door)
apps/api/src/middleware/auth.rs:

pub async fn require_auth(request: Request<Body>, next: Next) -> Response {
    // Aktuell wird die Anfrage einfach durchgelassen.
    next.run(request).await
}

Und apps/api/src/lib.rs hängt diese Middleware an /api-Routen.

➡️ Funktional ist Auth quasi abgeschaltet. Solange alles nur Demo/Read-Only ist und hinter privatem Netz hängt, ok – aber strukturell ein Sicherheitsrisiko.

⸻

	6.	CSP erlaubt unsafe-inline
In policies/security.yml (wird via Caddy/Infra referenziert) steht:

csp_default: "default-src 'self'; script-src 'self' 'unsafe-inline'; ..."

➡️ Für Dev/HMR plausibel, aber ohne klaren Kommentar/Trennung zu Prod ist das sicherheitstechnisch heikel.

⸻

	7.	Map-UI: Drawer-State kann „leer offen“ sein
In apps/web/src/routes/map/+page.svelte:

function syncFromLocation() {
  // ...
  if (!rightOpen) {
    selected = null;
  }
}

Mit einer URL wie ?r=1 kann rightOpen === true, aber selected === null. UI-Effekt: rechter Drawer offen ohne realen Kontext.

➡️ Kein Crash, aber UX-Makel und Fehlerquelle für spätere Features.

⸻

	8.	config.rs – apply_env_override ist generisch, aber etwas „blind“
In apps/api/src/config.rs wird in apply_env_override ein value.parse() ohne explizite Typ-Anmerkung verwendet, der Rückschluss erfolgt nur aus dem Aufrufkontext.

➡️ Das ist idiomatisch ok, aber bei Fehlkonfigurationen gibt es eher unscharfe Fehlermeldungen. „Nice to harden“, aber kein direkter Bug.

⸻

B) Punkte, die schon gefixt sind
	1.	compose-smoke.yml – tries--
Die aktuelle Version verwendet korrekt die Bash-Arithmetik:

tries=60
until curl -fsS http://localhost:8081/ >/dev/null; do
  ((tries--)) || (docker compose ... && exit 1)
  sleep 2
done

➡️ Der von dir beschriebene Fehler ($tries--) ist im aktuellen Stand nicht mehr vorhanden.
	2.	CI: arch-Variable im case gequotet & UV-Vergleich
In der aktuellen .github/workflows/ci.yml sind die von dir angesprochenen Schwachstellen (ungequotetes $arch, naiver Versionsvergleich) nicht sichtbar – das Setup wirkt bereits gehärtet.

➡️ Deine Kritik war für eine frühere Version gültig, ist jetzt aber (scheinbar) umgesetzt.

⸻

C) Punkte, die eher kein Fehler sind
	1.	Playwright resolveEnvReporters – TypeScript-Typ
In apps/web/playwright.config.ts:

function resolveEnvReporters(): ReporterDescription[] | undefined {
  const mapped: ReporterDescription[] = [];

  for (const [key, value] of Object.entries(envReporters)) {
    if (value === '1' || value?.toLowerCase() === 'true') {
      mapped.push([key]);
    }
  }

  return mapped.length ? mapped : undefined;
}

	•	ReporterDescription in Playwright akzeptiert u. a. Tupel [string] und [string, options].
	•	consoleReporter ist bereits als ReporterDescription mit ["dot"] / ["line"] typisiert und funktioniert analog.

➡️ mapped.push([key]); ist daher typisch und sollte vom Compiler akzeptiert werden. Ein Cast as ReporterDescription wäre nur Kosmetik, kein Bugfix.
	2.	„Return-Type Inkonsistenz undefined vs []“
Die Funktion ist klar auf ReporterDescription[] | undefined getypt und gibt exakt das zurück. Der von dir erwähnte „Fehler“ ist in der aktuellen Version nicht erkennbar.

⸻

2. Konkrete Anweisungen für Codex / Jules / Copilot

Block A – Hohe Priorität 
⸻

A2 – Auth-Middleware scharf schalten (mindestens Gate B-nah)
Ziel: /api-Routen nicht länger ungeschützt lassen.

Anweisung:
	1.	Öffne apps/api/src/middleware/auth.rs.
	2.	Implementiere require_auth minimal so:
	•	Lese einen API-Key aus X-API-Key oder Authorization: Bearer ....
	•	Vergleiche ihn mit einer Konfig-Quelle (z. B. APP_API_KEY aus der Umgebung oder aus config.rs-Struktur).
	•	Bei fehlendem/invalidem Key → StatusCode::UNAUTHORIZED mit kleinem JSON-Body.
	3.	Baue einen kleinen „Dev-Bypass“ ein:
	•	Wenn APP_AUTH_DISABLED=true, darf require_auth die Anfrage durchlassen.
	•	Default: Auth aktiv.
	4.	Prüfe, dass apps/api/src/lib.rs alle /api-Routen weiterhin über require_auth laufen lässt.

Akzeptanzkriterium:
	•	Ohne gültigen Key liefern schreibende Endpunkte 401.
	•	In Dev-Umgebung kann Auth gezielt abgeschaltet werden, nicht „zufällig vergessen“.

⸻

A3 – CSP Dev vs Prod klar trennen
Ziel: unsafe-inline nicht versehentlich in Produktion führen.

Anweisung:
	1.	Öffne policies/security.yml.
	2.	Füge explizit zwei Varianten hinzu, z. B.:
	•	csp_dev (mit 'unsafe-inline' für SvelteKit/HMR).
	•	csp_prod (ohne 'unsafe-inline', optional mit Nonces/Hashes vorbereitet).
	3.	Ergänze gut sichtbare Kommentare:
	•	Bei csp_dev: „Nur für lokale Entwicklung/Preview, nicht für Produktion“.
	•	Bei csp_prod: „Standard für Gate B/C, ohne unsafe-inline“.
	4.	Passe den Caddyfile / die Infra so an, dass:
	•	csp_dev in Dev-Profilen (profile: dev) angewendet wird.
	•	csp_prod im Prod-Setup verwendet wird.

Akzeptanzkriterium:
	•	Es existiert eine klar benannte, produktionsgeeignete CSP ohne unsafe-inline.
	•	Dev/Prod-Switch ist über Compose/Env steuerbar.

⸻

Block B – Mittlere Priorität (Logik & Performance)

B1 – JSONL-Daten beim Start laden (In-Memory-Cache)
Ziel: Nodes/Edges nicht pro Request von Platte lesen.

Anweisung:
	1.	Öffne apps/api/src/state.rs oder die Datei, in der der ApiState definiert ist.
	2.	Ergänze Felder z. B.:

pub struct ApiState {
    pub nodes: Arc<Vec<Node>>,
    pub edges: Arc<Vec<Edge>>,
    // vorhandene Felder bleiben
}


	3.	Baue in der Start-/Init-Funktion der API (z. B. in apps/api/src/main.rs oder lib.rs) ein:
	•	Lade .gewebe/in/demo.nodes.jsonl und .gewebe/in/demo.edges.jsonl einmal.
	•	Parse alle Zeilen und fülle Vec<Node> / Vec<Edge>.
	•	Wickle sie in Arc und reiche sie in den State.
	4.	Passe apps/api/src/routes/nodes.rs und edges.rs so an, dass sie:
	•	nicht mehr File::open nutzen.
	•	Stattdessen auf state.nodes / state.edges filtern.

Akzeptanzkriterium:
	•	Kein Dateizugriff mehr pro Request.
	•	API verhält sich funktional identisch, ist aber bei mehreren Requests deutlich schneller.

⸻

B2 – BBox-Logik future-proof machen
Ziel: Weltgewebe nicht an der Datumsgrenze „zerbrechen“ lassen.

Anweisung:
	1.	In apps/api/src/routes/nodes.rs ergänze bei point_in_bbox:
	•	Erkenne den Fall bb.min_lng > bb.max_lng (Antimeridian).
	•	In diesem Fall ist ein Punkt „drin“, wenn lng >= min_lng || lng <= max_lng.
Beispiel:

fn point_in_bbox(lng: f64, lat: f64, bb: &BBox) -> bool {
    let in_lat = lat >= bb.min_lat && lat <= bb.max_lat;
    if bb.min_lng <= bb.max_lng {
        in_lat && lng >= bb.min_lng && lng <= bb.max_lng
    } else {
        // Antimeridian
        in_lat && (lng >= bb.min_lng || lng <= bb.max_lng)
    }
}


	2.	Ergänze einen Kommentar, dass das Demo aktuell Europa nutzt, aber global gedacht ist.

Akzeptanzkriterium:
	•	BBox-Filter wird für über-180°-Gebiete korrekt sein.
	•	Bestehende Demo-Abfragen bleiben unverändert.

⸻

B3 – Health-Check-Pfad robuster machen
Ziel: Health-Check soll sowohl lokal (apps/api als CWD) als auch im Container funktionieren.

Anweisung:
	1.	Öffne apps/api/src/routes/health.rs.
	2.	Ändere die Fallback-Reihenfolge für policies/limits.yaml:
	•	Zuerst CARGO_MANIFEST_DIR-basierter Pfad ({manifest_dir}/../../policies/limits.yaml oder ähnlich, je nach aktueller Struktur).
	•	Dann Path::new("policies/limits.yaml").
	•	Optional: Fehlermeldung, die klar sagt, welche Pfade versucht wurden.
	3.	Dokumentiere in einem Kommentar:
	•	Wie die Pfade mit Docker-Compose und CI zusammenhängen.
	•	Erwartetes Working-Dir (z. B. Repo-Root).

Akzeptanzkriterium:
	•	/api/health/ready funktioniert zuverlässig lokal und in CI/Compose.
	•	Log-Ausgabe bei Fehler zeigt konkrete Pfadversuche.

⸻

B4 – Map-Drawer-Logik härten
Ziel: Kein „leerer Drawer“ ohne Selektion.

Anweisung:
	1.	Öffne apps/web/src/routes/map/+page.svelte.
	2.	Passe syncFromLocation() so an, dass:
	•	Wenn rightOpen === true und keine gültige id in der URL -> rightOpen auf false setzen.
	•	Oder alternativ: rightOpen nur dann auf true setzen, wenn beim Sync eine id geparst und selected gesetzt wurde.
Skizze:

function syncFromLocation() {
  // ... parse params
  if (idFromUrl) {
    selected = findNode(idFromUrl);
    rightOpen = !!selected;
  } else {
    selected = null;
    rightOpen = false;
  }
}



Akzeptanzkriterium:
	•	Drawer öffnet sich nur, wenn ein Node-Kontext existiert.
	•	Direktaufrufe via URL sind konsistent.

⸻

Block C – Nice-to-have / Cleanup

C1 – apply_env_override sprechbarer machen
Ziel: Fehlermeldungen bei falschen Env-Werten verständlicher.

Anweisung:
	1.	Öffne apps/api/src/config.rs.
	2.	Ergänze in apply_env_override:
	•	Konkrete Typ-Annotation im parse()-Kontext, wo sinnvoll.
	•	Bessere Error-Messages, z. B. format!("invalid value for {}: {}", key, value).

Akzeptanzkriterium:
	•	Bei fehlerhaften Env-Werten bekommt man in Logs eine klare Aussage, welches Feld betroffen ist.

⸻

3. Verdichtete Essenz
	1.	Build & Tooling: Das Repo ist faktisch ein pnpm-Projekt – Doku und Altlogs müssen das endlich widerspiegeln.
	2.	API & Sicherheit: Health-Check-Pfade, Auth-Middleware und CSP brauchen einen leichten, aber klaren Härtungsschub, bevor Gate B/C ernst gemeint sein kann.
	3.	Logik & UX: JSONL in den Speicher, BBox global denken, Map-Drawer logisch schließen – dann fühlt sich Weltgewebe weniger wie „Hamburg-Prototyp“ und mehr wie „Welt-System in klein“ an.

⸻

4. Ungewissheitsanalyse
	•	Unsicherheitsgrad: ca. 0,2
	•	Hauptquellen der Rest-Unsicherheit:
	•	Die genaue ReporterDescription-Definition kommt aus Playwright-Typen, die ich hier nur aus allgemeinem Wissen herleite. Praktischer Check: pnpm test / pnpm test:types.
	•	Adapter-Static/Kit-Versionskombination: pnpm-lock zeigt, dass die aktuelle Kombination installierbar ist; ob npm mit seinen eigenen Regeln trotzdem stolpert, ist durch die generelle „npm raus“-Strategie aber im Grunde irrelevant.
	•	Health-Check-Pfade: ohne tatsächliche Compose-Laufprobe bleibt ein kleiner Restzweifel, ob wirklich alle Pfadvarianten sauber greifen.

Produktive Unsicherheit:
	•	Die globale BBox-/Geodatenfrage bleibt offen für spätere Anforderungen (z. B. wenn du mal absichtlich „Weltgewebe über die Datumsgrenze“ bauen willst).
	•	Auth-Konzept: Welche Rollen, welche Scopes, welcher Issuer? Da steckt noch bewusst gelassene Leerstelle drin.

⸻

Und der obligatorische kleine Scherz zum Schluss:
Gerade wirkt es, als hätte npm versucht, sich heimlich in ein streng geführtes pnpm-Kloster einzuschleichen – mit einer großen ERESOLVE-Sirene im Gepäck. Deine Aufgabe an Jules/Codex ist im Grunde nur: Tür schließen, Log rauskehren, und den Mönchen („pnpm“) bitte keine fremden Gebetsbücher („npm scripts“) mehr reinreichen.