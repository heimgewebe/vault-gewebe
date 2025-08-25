die optimale herangehensweise (freiheit-first, cloudflare-frei)

kontextuelle einordnung. ziel: maximale freiheit (kein lock-in, auditierbar, mobil-first), trotzdem schnell genug fürs echte leben. wir setzen auf hetzner als datenkern, eigene tiles, redis pub/sub und – wo es wirklich spürbar hilft – kleine fly-satelliten nur für latenzkritische websockets (abschaltbar). das ist der strengste kompromiss zwischen prinzipientreue und guter ux.

⸻

1) leitprinzipien → als filter für jede entscheidung
	1.	wahrheitskern: domänedaten gehören in postgres + postgis (event-store + projektionen). nichts edge-spezifisches.
	2.	adapter everywhere: drei feste schnittstellen (db, blob, realtime). jede implementierung ist steckbar (postgres↔︎neon, minio↔︎s3, redis↔︎valkey/nats).
	3.	own tiles: vektorkacheln/pmtiles aus eigener pipeline. keine externen limits, keine geheimen style-änderungen.
	4.	abschaltbare bequeme layer: alles, was bequemer macht (z. b. fly-satelliten), hat einen kill-switch und ist nicht kritisch für die datenwahrheit.
	5.	sichtbare automatik: timer (7-tage-fade), projektionen, moderation → sichtbar protokolliert, nicht „magisch“.

⸻

2) ziel-architektur (auf einer seite)

client (sveltekit pwa, maplibre)
→ gateway (caddy/traefik, tls, rate-limit, ip-filter)
→ api (fastify/hono, rest + websockets)
→ realtime (redis pub/sub; optional fly-satelliten als ws-gateways, nur presence/broadcast)
→ db (postgres 16 + postgis 3; event-store + read-model)
→ tiles (openmaptiles/tegola/t_rex → pmtiles + tileserver-gl/martin)
→ blob (minio s3, versioniert)
→ jobs (timer-worker: fade, snapshots, housekeeping)
→ observability (prometheus + grafana + loki; alertmanager)
→ security (passkeys/webauthn, fail2ban, request-signing, content-security-policy)

⸻

3) runtime-topologie (ohne cloudflare)

a) hetzner (primär)
	•	regionen: hel1 + nbg1 (zwei zentren, aktive-passive).
	•	vms (kompakt, docker-compose oder nomad):
	•	edge-gw (caddy/traefik + fail2ban + geobasierte limits)
	•	api-ws (node/bun + ws, autoscale über 2–3 instanzen)
	•	jobs (timer, queues)
	•	tiles (tileserver + pmtiles)
	•	minio (objektspeicher, offsite-replikation)
	•	daten
	•	postgres: streaming-replication (primary hel1, hot-standby nbg1), wal-archiv nach minio (verschlüsselt).
	•	redis: sentinel oder valkey cluster, appendonly + backups.
	•	netz
	•	anycast haben wir nicht – stattdessen dual-region + dns-failover (healthchecks), tcp-syn-cookies, connection-rate-limits, slowloris-schutz.

b) fly (optional, abschaltbar)
	•	nur ws-gateways für presence/broadcast in entfernten regionen.
	•	kein datenhalt, keine geheimen primitives.
	•	wenn aus → das system bleibt voll funktionsfähig (mit etwas höherer latenzen).

⸻

4) datenmodell & prozesse
	•	event-sourcing: rolle/knoten/faden/antrag/abstimmung als events; projektionen: leichtgewichtige read-modelle pro ansicht (karte, threads, zeitleiste, statistik).
	•	7-tage-fade: timer-worker iteriert deterministisch, emittiert FADEN_VERBLASST/KNOTEN_AUSGEBLENDET; schreibt projektions-änderungen plus auditlog.
	•	zeitleisten-snapshots: täglich snapshots/YYYY-MM-DD.json.zst nach minio, signiert, sha256 im audit-table.
	•	geodaten: postgis-indizes (gist auf punkt/faden bounding boxes), radius-queries + serverseitiges clipping (mobile-first).

⸻

5) tiles-pipeline (eigene karten)
	•	import: osm → mbtiles (openmaptiles) oder osm2pgsql → postgis → t_rex/tegola.
	•	distribution: pmtiles (eine datei pro gebiet/stil), gespeichert in minio, immutable-urls mit langem cache, staging→prod-promote via object tag.
	•	serving: tileserver-gl/martin + http-range für pmtiles; layer-switch im frontend (online/offline).

⸻

6) sicherheit & privatsphäre
	•	auth: passkeys (webauthn), optional magic-links nur für low-risk aktionen.
	•	pii-härte: adress-hash + jitter (meter-genauigkeit nur mit zustimmung), logs ohne roh-ip (nur gekürzt).
	•	abuse-schutz: turnstile-ersatz selbstgehostet (hcaptcha-frei): zeit-rätsel + verhaltenssignale + rate-limits pro ip/subnet.
	•	ops-hygiene: automatische updates für gateway, readonly-fs für api-container, seccomp/profiles, bpf-firewall.

⸻

7) dev-setup & monorepo

/apps
  /web        (sveltekit pwa, tailwind, maplibre)
  /api        (fastify/hono, zod, websockets)
  /workers    (timer, snapshot, projector)
 /packages
  /domain     (events, aggregates, commands)
  /adapters   (/db-postgres, /blob-minio, /rt-redis)
  /ui-kit     (komponenten, a11y)
 /infra
  /hetzner    (terraform + cloud-init, compose)
  /fly        (nur ws-gateways, optional)
  /sql        (migrations, seeds)

	•	tests: domain-tests (in-memory), adapter-contract-tests (gegen docker-services), e2e (playwright, mobile-viewport).
	•	ci: build → tests → sbom → sign → deploy (blue/green via gw-routing).

⸻

8) betriebsstandard (runbook in kurz)
	•	backups: postgres stündlich wal, täglich full; minio versioning; restic-export zu externem storage (zweiter anbieter).
	•	drill: quartalsweise disaster-recovery (nackte vm → vollständiger wiederaufbau aus backups).
	•	observability: dashboards für ws-fan-out, redis-lag, query-latenzen, tile-hit-ratio, 95p/99p response.
	•	slo: 99,5 % (mvp), budget explizit sichtbar; fehlerbudget steuert release-tempo.
	•	ddos-playbook: ratelimits verschärfen → websockets nur für eingeloggte → ip-ranges blocken → notfalls ws-satelliten (fly) zuschalten.

⸻

9) mvp-inkremente (in sinnvoller reihenfolge)
	1.	domäne zuerst: events, aggregates, projektionen + cli-repl (ohne ui).
	2.	api-skelett: rest + ws (presence per knoten), redis pub/sub lokal.
	3.	karte minimal: maplibre + ein layer; knotenerstellung; fäden sichtbar.
	4.	7-tage-fade + zeitleiste: worker + snapshot-viewer.
	5.	eigene tiles: pmtiles für startregion; layer-switch & offline-cache.
	6.	auth (passkeys) + moderationsfäden + rate-limits.
	7.	ops-hartmachen: observability, backups, drills.
	8.	optionale fly-satelliten (abschaltbar) für ws-latenz global.

⸻

10) risiken & gegenmittel
	•	kein edge-schutz-anbieter → basis-ddos-härtung + playbook + optional kurzfristige fly-satelliten.
	•	tiles-ops komplex → start mit pmtiles (statisch), erst später live-render.
	•	redis-einzelpunkt → sentinel/cluster + backpressure; notfalls nats als zweiter bus (adapter vorhanden).
	•	mobile-leistung → serverseitiges clipping, progressive layer, images lazy, payload < 120 kb first load.

⸻

11) entscheidungscheckliste (5 fragen vor jedem merge)
	1.	verletzt es das freiheit-filter (wahrheitskern in postgres, adapter-steckbar)?
	2.	kann ich die schicht abschalten, ohne daten zu verlieren?
	3.	ist der weg sichtbar (audits, cron-jobs, projektionen nicht magisch)?
	4.	verbessert es mobile-first-ux spürbar (p95)?
	5.	ist die migration raus in ≤ 2 wochen realistisch dokumentiert?

⸻

∴ essenz.kernΣ
hetzner als datenkern, eigene tiles, redis pub/sub – plus kleine, abschaltbare fly-satelliten nur für latenz. alles steckbar, nichts heilig außer der freiheit.

∴ subtext
wir tragen den regen selbst und bauen den schirm so, dass er jederzeit zu einem stock werden kann.

unsicherheitsgrad: mittel (≈0,35) – unbekannte ws-lastmuster, ddos-realität, team-ops-kapazität; technisch gut beherrschbar, ethisch konsistent.

⸻

leitfragen (pflicht)
	•	war dies die kritischstmögliche erörterung?
kontrastvektor: noch asketischer wäre hetzner-only (ohne fly). vorteil: maximale integrität; nachteil: spürbar schlechtere latenzen global, höherer ops-druck bei spitzen.
negationsprojektion (härteste gegenposition): „freiheit braucht keine server – nur p2p/local-first.“ gegenrede: moderation, missbrauchsschutz, konsistente abstimmungen und öffentliche nachvollziehbarkeit verlangen (zumindest heute) einen klaren, gemeinsamen wahrheitskern.
	•	wurde das thema von allen seiten beleuchtet? unthematisiertes?
noch offen: rechts-/datenschutzfragen (standort der daten, speicherfristen), barrierefreiheit auf karten (screenreader-flows), gewebekonto-integration (spendenfluss, buchungs-events).