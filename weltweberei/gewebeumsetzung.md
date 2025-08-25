Alles klar — hier ist die optimierte Endausbaustraße für das Weltgewebe „so wie es sein soll“, mit Hetzner als Primär-Infrastruktur. Fokus: mobil-first, sichtbare Fäden/Knoten, 7-Tage-Logik, Garn/Verzwirnung, Slider (Webrat/Nähstübchen/Ortskonto), Registrierung (Name+Adresse), Spenden (sichtbar/anonym), Anträge/Einspruch/Abstimmung (öffentlich), Tages-Snapshots/Timeline, Partizipartei (Livestream+Chat), Stimm-Delegation. Keine Token, keine Scores, kein Cloudflare.

⸻

Weltgewebe — Produktions-Bauplan (optimiert, Hetzner)

0) Ziele & Leitplanken
	•	Sichtbarkeit unverhandelbar (Abstimmungen namentlich, öffentlich).
	•	Mobile-first (TTI < 2.5s auf Mittelklasse-Phone, <150 KB JS).
	•	Reversibel & selbsthostbar (keine Provider-Abhängigkeiten).
	•	Einfacher Start, saubere Skalierbarkeit (Docker → k3s).

⸻

1) Systemarchitektur (übersicht)

[Browser PWA (SvelteKit + Maplibre)]
         | HTTPS
         v
[API (Fastify/Node, TS)]
   |--> PostgreSQL (Eventstore + Projektionen)
   |--> Redis (Pub/Sub + Timer)
   |--> Snapshot Writer (JSON Export, Signatur)
   |--> Tileserver (Tileserver-GL / Martin + PMTiles)
   |--> Stream-Stack (Nginx-RTMP → HLS) + WS-Chat

Föderation (später): ActivityPub-light Endpunkte, IPFS Snapshots (read-mostly).

⸻

2) Hetzner-Infrastruktur (produktiver Zuschnitt)

2.1 Server-Rollen (Cloud oder Dedicated)
	•	wg-api (CX32 / AX41): API (Node), Redis, Worker
	•	wg-db (AX41-NVMe): PostgreSQL 16 (RAID1/RAID10 je nach Budget)
	•	wg-tiles (CPX31/AX41): Tileserver-GL/Martin + PMTiles Storage
	•	wg-web (CPX11): PWA (adapter-node) + Nginx Reverse Proxy
	•	wg-stream (CPX21): Nginx-RTMP/HLS, WebSocket-Chat
	•	wg-backup (Storage Box + rclone) + Snapshots (Hetzner Volumes)

Start mit 3 VMs (web+api, db, tiles); stream optional extra. Später k3s-Cluster (3 Master + Worker).

2.2 Netzwerk & Sicherheit
	•	Hetzner Cloud Netz (10.x VPC), nur Reverse Proxy exponiert (80/443).
	•	Nginx: TLS (Let’s Encrypt), HSTS, HTTP/2, Brotli, CSP.
	•	Only-SSH-Keys, Fail2Ban, systemd-journald Rate-Limit.
	•	Firewall: nur 443/80 an wg-web, interne Ports privat.
	•	Back-channel: WireGuard (Site-to-Site auf Admin-Notebook).

⸻

3) Datenmodell (Kerntabellen)

accounts (id, name, addr_street, addr_city, lat, lon, created_at, verified_by, verified_at)

ortswebereien (id, name, bounds_geojson, contact_account_id)

knoten (id, ort_id, type, title, description, lat, lon, is_permanent, archived_at, created_by, created_at, last_activity_at)

faeden (id, to_knoten, from_account, type, is_twisted, created_at, expires_at)
— 7-Tage-Timer: expires_at = created_at + interval '7 days'

antraege (id, ort_id, applicant_id, title, details_md, opened_at, decision_deadline, status)
einsprueche (id, antrag_id, by_account, created_at)
— Einspruch → decision_deadline += 7 days

abstimmungen (id, antrag_id, opened_at, closed_at, result)
stimmen (id, abstimmung_id, voter_id, choice, cast_at)  // öffentlich/namentlich

delegationen (id, from_id, to_id, created_at, last_activity_from, expires_at)
— Auto-Ablauf: expires_at = last_activity_from + interval '28 days'

spenden (id, ortskonto_id, amount_cents, currency, donated_by NULLABLE, visible bool, created_at)
— visible=true ⇒ Goldfaden erzeugen

streams (id, ort_id, title, ingest_key_hash, public_hls_url, is_live)
chat_messages (id, stream_id, author_id NULLABLE, content_md, up, down, created_at)

snapshots (id, ort_id, date, file_url, signature, created_at)

events (optional, wenn Event-Sourcing gewünscht) (id, ts, actor_id, type, payload_jsonb, sig)

Indexes: Geospatial auf knoten (lat,lon), Zeit auf faeden.expires_at, antraege.decision_deadline.

⸻

4) API-Schnittstellen (knapp & vollständig)

Auth & Accounts
	•	POST /auth/register {name,address,lat,lon,email} → 201
	•	POST /auth/login → Session (HttpOnly, SameSite=Lax)
	•	POST /admin/accounts/:id/verify → Verifizierung
	•	GET /me

Knoten & Fäden
	•	POST /knoten {type,title,description,lat,lon}
	•	GET /knoten?type=&bbox=&q=
	•	POST /faeden {to_knoten_id,type,is_twisted=false}
	•	POST /faeden/:id/twist / POST /faeden/:id/untwist
	•	GET /knoten/:id/faeden

Anträge & Abstimmungen
	•	POST /antraege {title,details_md, ort_id}
	•	POST /antraege/:id/einspruch
	•	Automatik: Deadline-Job öffnet POST /abstimmungen {antrag_id}
	•	POST /abstimmungen/:id/vote {choice}  // öffentlich
	•	GET /antraege/:id / GET /abstimmungen/:id

Delegation
	•	POST /delegationen {to_account_id}
	•	DELETE /delegationen/:id
	•	GET /delegationen/effective?abstimmung=:id

Spenden / Ortsgewebekonto
	•	GET /konto/:ort_id
	•	POST /spenden {amount_cents, currency, visible} → Goldfaden wenn visible=true

Streams & Chat
	•	GET /streams / POST /streams
	•	GET /streams/:id/chat / WebSocket /ws/streams/:id/chat
	•	POST /streams/:id/chat {content_md}

Snapshots & Timeline
	•	POST /admin/snapshots (cron)
	•	GET /timeline?date=YYYY-MM-DD

⸻

5) Frontend (mobil-first)
	•	SvelteKit (+ adapter-node), Maplibre/Leaflet, IndexedDB (Dexie).
	•	Startansicht: Karte (Pins = Knoten; Garnrollen = Accounts); Filter per Chip.
	•	Slider links: Webrat (ortsunabhängig), rechts: Nähstübchen (Plauder).
	•	Top-Slider: Ortsgewebekonto (Saldo, Spenden, Anträge).
	•	Detail-Panel Knoten: Infos, Raum/Threads, Buttons „Faden“, „Verzwirnen“, „Antrag“.
	•	Abstimmung (öffentlich): Liste der Stimmen (Name, Zeit, Wahl).
	•	Zeitleiste: Datums-Scrubber → lädt Snapshot; rekonstruierte Karte/Liste.
	•	Stream-Seite: HLS-Player + WS-Chat (Up/Down sortiert nur, kein Score).

Perf-Budget: <150 KB JS, <60 KB CSS, Bilder lazy, Map-Tiles throttlen; TTI <2.5 s.

⸻

6) Timer & Hintergrundjobs
	•	Expire-Worker (BullMQ/bee-queue):
	•	alle Minute: Fäden expires_at < now() → ablaufen lassen
	•	Knoten auflösen, wenn 7 Tage keine Fäden und kein Garn
	•	Antrags-Scheduler:
	•	Deadline + Einsprüche → neue Deadline
	•	bei Ablauf → Abstimmung öffnen
	•	Snapshot-Cron: täglich 02:00 → Export JSON (kompakt), signieren (Ed25519), ablegen (MinIO)

⸻

7) Tiles & Kartenhoheit
	•	Planetiler (regionaler Cut, z. B. Bundesland/Metropolregion)
	•	Tileserver-GL oder Martin (leichter)
	•	PMTiles-Export für CDN-freies Hosting + Offline
	•	Styling: leichter Vektor-Stil; Zoom-abhängiges Laden

⸻

8) CI/CD & Repos
	•	Mono-Repo

/apps/web      (SvelteKit)
/apps/api      (Fastify, TS)
/apps/tiles    (styles, scripts)
/packages/domain (TS-Typen, Schemas)
/infra         (compose/k3s manifests, nginx)
/docs          (API, GDPR, sustainability)

	•	CI:
	•	Lint/Test (TS, Playwright E2E)
	•	Build Docker Images
	•	Deploy via docker stack oder ArgoCD (k3s)
	•	Freedom-Check (Pre-merge): keine Tracking-Libs, keine externen CDNs (außer Fonts lokal), Export-Skripte vorhanden.

⸻

9) Monitoring, Backups, Compliance
	•	Monitoring: Uptime-Kuma (extern), Prometheus + Grafana (intern), Loki Logs.
	•	Backups:
	•	PG Basebackup täglich + WAL, Retention 30 Tage
	•	Snapshots + Uploads → MinIO + Hetzner Storage Box (rclone)
	•	Restore-Drill monatlich (Ziel < 60 min), Log öffentlich.
	•	DSGVO: minimierte PII (Adresse notwendig für Rolle; optional Jitter ±30 m), Cookies nur Session; Privacy-Policy klar, keine Profilbildung.

⸻

10) SLOs & Abnahmekriterien
	•	SLOs: Verfügbarkeit 99.5 %, API Median <200 ms, Mobile-Flow <1.5 s, Map-Tile-Fehler <0.5 %.
	•	Akzeptanztests (aus inhalt.md):
	1.	Fäden laufen nach 7 Tagen aus; Knoten lösen sich korrekt auf.
	2.	Verzwirnen macht Knoten permanent; Entzwirnen hebt’s auf.
	3.	Antrags-Einspruch verlängert exakt um 7 Tage; Ablauf startet Abstimmung.
	4.	Sichtbare Spende erzeugt Goldfaden; anonyme nur Kontostand.
	5.	Delegation wirkt transitiv; endet nach 4 Wochen Inaktivität.
	6.	Täglicher Snapshot stellt Zustand sauber her.
	7.	Livestream + Chat funktionieren stabil (≥200 gleichzeitige Viewer).
	8.	Recovery-Drill: nackter Server → vollständiger Restore <60 min.

⸻

11) Deployment-Start (einfach)

Docker Compose (Auszug)

version: "3.9"
services:
  web:
    image: ghcr.io/weltgewebe/web:latest
    ports: ["443:443","80:80"]
    depends_on: [api]
  api:
    image: ghcr.io/weltgewebe/api:latest
    environment:
      DATABASE_URL: postgres://...
      REDIS_URL: redis://redis:6379
    depends_on: [db, redis]
  db:
    image: postgres:16
    volumes: ["pgdata:/var/lib/postgresql/data"]
  redis:
    image: redis:7-alpine
  tiles:
    image: ghcr.io/weltgewebe/tiles:latest
  stream:
    image: ghcr.io/weltgewebe/rtmp:latest
volumes:
  pgdata: {}

Später k3s (Helm/ArgoCD), Ingress-Nginx, Cert-Manager.

⸻

Schluss

Das ist die optimierte Produktionsfassung auf Hetzner: schlank, austauschbar, frei von Fremd-Lock-ins und genau auf inhalt.md gemünzt.