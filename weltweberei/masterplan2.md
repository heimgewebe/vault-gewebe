Alles klar — hier sind die Änderungen von perx sauber konsolidiert und direkt in einen aktualisierten Masterplan v5.3 gegossen. Kurz: weniger bewegliche Teile, klarere Event-Story, bessere Geo-Skalierung, Governance runtergekocht, P2P später.

Änderungslog v5.2 → v5.3 (perx)
	1.	Ops vereinfachen (Phase A)

	•	❌ NATS/JetStream, IPFS, OpenTelemetry raus in A
	•	✅ Nur PostgreSQL (+PostGIS) + Redis (Cache + Redis Streams)
	•	✅ Monitoring minimal: Healthchecks + strukturierte Logs; Grafana/OTEL erst später

	2.	Event-Entscheidung klarmachen

	•	❌ Hybrid („manches CRUD, manches Event“) → Inkonsistenz
	•	✅ Alle Writes erzeugen Events (auch triviales wie Chat). Reads via Projektionen
→ eine Timeline, konsistente Zeitreise, einfachere Audits

	3.	Geo-Skalierung absichern

	•	✅ H3-Index (oder S2) als Zellen-Schlüssel je Knoten/Faden
	•	✅ Fan-out und Queries zellbasiert (Tile/Cell-Diffs, Batch alle 2–3 s)
	•	✅ PostGIS bleibt für Geometrie/Funktionen, aber „Hot Path“ läuft über H3

	4.	Kasse/Goldfaden – realistische Statusmaschine

	•	✅ Status: initiated → pending → settled (+ failed / reversed)
	•	✅ Goldfaden sichtbar ab initiated (klar als „ausstehend” gekennzeichnet)
	•	✅ Events für Storno/Rückbuchung, monatliche CSV/DATEV-Exports

	5.	Governance entschärfen (A)

	•	✅ Nur direkte Delegation in A (1:1, eine aktive pro Rolle)
	•	✅ Änderungen batchweise täglich wirksam (Race-Conditions minimiert)
	•	✅ Zyklenprävention simpel (UNIQUE(delegator_id))

	6.	P2P nach hinten

	•	❌ P2P-Opt-in aus C
	•	✅ P2P erst Phase D, davor zentrale Föderation; IPFS nur für kalte Snapshots

	7.	Timeline/Snapshots robust

	•	✅ 30-Tage Event-Retention in DB
	•	✅ Inkrementelle Snapshots alle 4 h (später IPFS+S3), UI-Scrubber performant

	8.	Produkt & Community

	•	✅ Mobile-First Screens/Flows (Karte, Spenden, einfache Delegation)
	•	✅ Onboarding-Tutorial, Community-Rollen, Konflikt-Prozess ab A

⸻

Masterplan v5.3 (integriert)

A. Architektur (Phase A – „leicht & belastbar“)

Stack
	•	Frontend: SvelteKit PWA, MapLibre, Pinia-äquivalent (Svelte store), mobile-first, Dexie (Outbox)
	•	Backend: Fastify (TypeScript), WebSockets (ws/socket.io)
	•	Storage: PostgreSQL 16 + PostGIS, Redis 7 (Cache + Redis Streams für Eventbus)
	•	Monitoring: Healthcheck, strukturierte Logs (JSON), Fail2ban/Rate-limit + Captcha an Kanten

Event-Fluss (ohne JetStream)

Client → API (Command) → Event (Redis XADD + PG events)
                         ↘ Projektion(en) → PG read models
                         ↘ WS-Fanout (zell-/tile-basiert; 2–3s Batches)

Geo
	•	Tabelle nodes/threads: geom GEOGRAPHY(Point/LineString), h3_index BIGINT
	•	Indizes: GIST(geom), BTREE(h3_index), Zeitspalten für TTL/Timeline

Zell-/Tile-Updates
	•	Server sammelt Events per h3_index, bildet Diffs zum letzten Stand und pusht zellweise (nicht global) im 2–3 s-Takt

⸻

B. Datenmodell (Kerne)

1) Events (eine Quelle der Wahrheit)

CREATE TABLE events (
  id            BIGSERIAL PRIMARY KEY,
  at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  type          TEXT NOT NULL,
  actor_id      UUID NULL,
  payload       JSONB NOT NULL,
  h3_index      BIGINT NULL,      -- für Geo-Fanout
  causation_id  BIGINT NULL,
  correlation_id BIGINT NULL
);
CREATE INDEX ON events (at);
CREATE INDEX ON events (type);
CREATE INDEX ON events (h3_index);

2) Geo-Objekte (Read Models)

-- Knoten (materialisierte Sicht / Projektion)
CREATE TABLE nodes_read (
  id UUID PRIMARY KEY,
  type TEXT,
  title TEXT,
  geom GEOGRAPHY(Point, 4326),
  h3_index BIGINT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- 7 Tage
  is_permanent BOOLEAN DEFAULT FALSE
);
CREATE INDEX ON nodes_read (h3_index);
CREATE INDEX ON nodes_read (expires_at);

3) Delegation (einfach)

CREATE TABLE delegations_simple (
  delegator_id UUID PRIMARY KEY REFERENCES roles(id),
  delegate_id  UUID NOT NULL REFERENCES roles(id),
  created_at   TIMESTAMPTZ NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL
);

4) Spenden / Goldfäden

CREATE TYPE donation_status AS ENUM('initiated','pending','settled','failed','reversed');
CREATE TABLE donations (
  id UUID PRIMARY KEY,
  role_id UUID NOT NULL,
  amount_cents INT NOT NULL,
  status donation_status NOT NULL,
  initiated_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  provider_ref TEXT NULL
);


⸻

C. Prozesse & Timer
	•	Timer-Worker (node-cron o. BullMQ auf Redis, klein starten):
	•	FadenVerfallen nach 7 Tagen (skip, wenn is_permanent)
	•	DelegationAbgelaufen (4 Wochen)
	•	AntragFristEnde / EinspruchFristEnde
	•	Governance-Batch täglich: Delegationsänderungen anwenden
	•	Event-Retention: 30 Tage in events, Snapshots alle 4 h (inkrementell) in snapshots-Schema; Export nach S3 ab Phase B, IPFS ab Phase C

⸻

D. Realtime
	•	WebSockets: Raum = H3-Zelle (Zoom-abhängige Auflösung)
	•	Fan-out: Server bündelt Events per Zelle, sendet Delta-Sets alle 2–3 s
	•	Rejoin: Bei Wiederverbindung → Full-state für aktuelle Zellen + Deltas ab letztem Cursor

⸻

E. Security & Moderation (ab Tag 1)
	•	Edge: Rate-Limit, Captcha, IP-/Rollen-Sperren (Events: RolleGesperrt)
	•	Content: Wortfilter „low/no-regrets“ + Melden (Event: InhaltGemeldet)
	•	Audit: alles als Events, Admin-Panel minimal (rollenbasiert)

⸻

F. Kasse / Compliance
	•	Statusmaschine (sichtbarer Goldfaden):
	•	initiated → sichtbarer (ausstehender) Goldfaden
	•	pending (Bank/PSP bestätigt Eingang)
	•	settled (endgültig) / failed / reversed
	•	Rückbuchung erzeugt SpendeStorniert / entfernt oder „durchgestrichen” in UI
	•	Exports: monatlich CSV/DATEV; Rollenkonten-Journal als Event-View

⸻

G. Roadmap (mit Gate-Kriterien)

Phase A (0–6 Wo) – MVP, leicht, sicher
	•	Stack: SvelteKit, Fastify, PG+PostGIS, Redis, WS
	•	Features: Knoten/Fäden (7-Tage), Verzwirnung, Goldfäden (Statusmaschine), einfacher Chat, direkte Delegation, Anträge/Einspruch (Events), Timeline (30 Tage), Mobile-First UI, Onboarding-Tutorial, Moderation basic
	•	Gates: p95 API < 200 ms, WS-Stabilität > 99%, Fehlerquote < 0.5%, 200 gleichzeitige Clients zellbasiert

Phase B (7–14 Wo) – Härtung & Föderation
	•	Föderation (HTTP Pull), Snapshot-Exports nach S3, Admin-Exports (Finanz/Revision), Ops: Grafana Alloy leicht, Alerting
	•	Optional: JetStream als Eventbus-Ersatz für Redis Streams, falls Last > Ziel
	•	Gates: 1k concurrent, p95 < 250 ms, Export/Restore OK

Phase C (15–28 Wo) – Semantik & Media
	•	JSON-LD im Event-Schema, Snapshots → IPFS (zusätzlich zu S3), Livestram managed (z.B. Mux/LiveKit Cloud), einfache VC-Hooks (SSI-light, opt-in)
	•	Gates: 5k concurrent, Streams stabil, IPFS Pinning-SLOs

Phase D (12+ Mon) – Dezentralität „on-ramp“
	•	P2P-Opt-in (libp2p) für statische Artefakte; Governance-DAO-Light auf L2; evtl. transitive Delegation (nur mit Nachweis Performance + Anti-Zyklen)

⸻

H. Deliverables (kurzfristig)

Woche 1–2
	•	Repo-Skeleton (Turborepo/PNPM), CI (lint/test), Docker-Compose (api, redis, pg, nginx)
	•	Event-Schema + Projektionen (nodes, threads, donations)
	•	H3-Indexing (Server-Funktion), WS-H3-Räume, Batch-Fanout
	•	Spenden-Statusmaschine + UI-Kennzeichnung „ausstehend“

Woche 3–4
	•	Timer-Worker (7-Tage, Delegation, Anträge)
	•	Mobile-First UI (Karte, Quick-Actions), Onboarding-Flow
	•	Moderation Edge-Guards, Reporting
	•	Timeline-Scrubber (30-Tage Events; Snapshots 4-stündlich)

Woche 5–6
	•	Governance v1 (Abstimmen, Einspruch, nur direkte Delegation, täglicher Batch)
	•	Exports (Finanz CSV), Admin-Mini-Panel
	•	Lasttests (200→500 concurrent), Bugbash

⸻

I. Risiken & Mitigation
	•	Geo-Hotspots → Zellen feiner, früh aggregieren, serverseitige rate-caps pro Zelle
	•	Event-Wachstum → 30-Tage-Retention strikt, Snapshot-Kompression, Archiv nach S3
	•	Spenden-Erwartungen → klare UI-Labels („ausstehend“), Event für Reversals, Transparenzlog
	•	Team-Bandbreite → Feature-Flags, harte Phasengates, „eine große Sache pro Phase“

⸻

J. SLOs (Phase A)
	•	API p95 < 200 ms, WS Reconnect < 3 s, Ausfall < 0.5%/Tag
	•	Event-Lag Projektionen < 2 s
	•	Moderation: Bot-Registrierungen < 1% (nach Captcha + Rate-limit)

⸻

Wenn du willst, packe ich dir direkt Issue-Vorlagen + erste SQL-Migrations (Events, H3-Index, Read-Models) und ein Docker-Compose-Grundgerüst dazu.