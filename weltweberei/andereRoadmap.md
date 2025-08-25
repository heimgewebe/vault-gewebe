weltgewebe.net – wie ich es bauen würde (klar, mobil-first, ohne schnickschnack)

0) kontextuelle einordnung

du willst eine kartenbasierte sicht- und arbeitsoberfläche für ortswebereien: rollen (echte accounts) knüpfen knoten, verbinden sie mit fäden, verzwirnen zu garn (permanent), zeitlogik (7-tage-fade), anträge / einsprüche / abstimmungen, sichtbare spendenfäden, tages-snapshots – alles offen einsehbar, ohne tracking. ziel: maximale kontrolle, skalierbarkeit, freiheit.

⸻

1) kernprinzipien
	•	mobile first, offline-fähig, schnell: zuerst 60fps auf mittelklasse-handys, danach desktop.
	•	event-sourcing statt „stiller mutationen“: jede aktion ist ein ereignis; der zustand ist eine ableitung.
	•	geo-first: geodaten sind primär; alles ist darauf indiziert.
	•	„p2p-ready“, aber nicht „p2p-first“: heute zentral stabil, morgen lokal-/p2p-fähig (CRDT-Schicht).
	•	keine hintergrundmagie: klar sichtbare jobs (timer, snapshots), kein fake-realtime.

⸻

2) empfohlenes fundament (stack)

frontend
	•	sveltekit + typescript (leicht, flink, formschön; server-endpoints gleich dabei)
	•	maplibre gl (webgl-karte, performant; leaflet ggf. für simple overlays)
	•	tailwind (konsistente mobile-typografie, dark-mode ohne ballast)

backend
	•	postgreSQL + postGIS (geometrien, räumliche indizes)
	•	event-store (append-only tabelle events, projektionen für lese-modelle)
	•	websocket + server-sent events (push von ereignissen, kein polling)
	•	hono oder fastify (schlanke http-api), zod für contracts
	•	auth: passwortlos (magic-link), optional webauthn
	•	dateien: objekt-speicher (s3-kompatibel)

realtime / kollab (optional ab phase 2)
	•	yjs (konfliktfreie replizierte datentypen) für kollaboratives schreiben in knoten-räumen; sync über websockets

hosting – drei saubere routen
	•	A) supabase (+ cloudflare pages/workers): managed postgres/postgis, auth, realtime, storage; frontend auf cloudflare pages. schnell startklar, eu-region.
	•	B) fly.io: volle kontrolle, eigene app-instanzen nahe den nutzern, managed postgres + postgis. gut für low-latency + custom setup.
	•	C) hetzner (eigene k8s/docker via coolify/dokku): günstig, maximal eigen, dafür mehr ops.

meine empfehlung heute: A) zum loslegen (geringe reibung), B) sobald ihr eigene infra-logik oder edge-nähe braucht. cloudflare-nur (d1/durable objects) scheidet wegen postgis aus.

tiles
	•	start: maptiler / stadia (schnell), später: eigener tileserver (tilestache/tileserver-gl) auf hetzner für unabhängigkeit.

⸻

3) domänenmodell (essenz)

objekte
	•	rolle (account, punktgeometrie), sichtname, verifizierter ort
	•	knoten (punkt/polygon), typ (idee, veranstaltung, werkzeug, schlafplatz, …), räume (infos, threads)
	•	faden (rolle → knoten, typ: gespräch, gestaltung, veränderung, antrag, abstimmung, gold/spende)
	•	garn (verzwirnung eines fadens → permanenzflag am ziel)
	•	antrag (mit 7-tage-einspruchsfenster, verlängerungslogik)
	•	stimme/übertragung (temporär, verfällt nach inaktivität)
	•	snapshot (täglich, nur lesemodell/archiv)

zeitlogik
	•	fäden: verblassen nach 7 tagen ohne frische ereignisse
	•	knoten: lösen sich, wenn kein faden/garn mehr hinführt
	•	anträge: t=0 gestellt → 7 tage einspruch; bei einspruch +7 bis abstimmung

⸻

4) datenlayout (kompakt)

-- events (append-only)
create table events (
  id bigserial primary key,
  ts timestamptz not null default now(),
  actor uuid,             -- rolle.id (nullable für systemjobs)
  type text not null,     -- z.B. "KNOTEN_ERZEUGT", "FADEN_GEWEBT"
  payload jsonb not null
);
create index on events (ts);
create index on events ((payload->>'knoten_id'));
create index on events ((payload->>'rolle_id'));

-- lese-modelle (aus projektionen gebaut)
create table rolle (
  id uuid primary key,
  name text not null,
  addr_public boolean not null default true,
  geom geometry(point, 3857) not null
);
create index on rolle using gist (geom);

create table knoten (
  id uuid primary key,
  typ text not null,
  geom geometry(geometry, 3857) not null,
  hat_garn boolean not null default false,
  last_activity timestamptz not null
);
create index on knoten using gist (geom);
create index on knoten (typ, last_activity);

create table faden (
  id uuid primary key,
  knoten_id uuid references knoten(id),
  rolle_id uuid references rolle(id),
  typ text not null,              -- gespräch/gestaltung/...
  ist_garn boolean not null default false,
  last_touch timestamptz not null,
  visible_until timestamptz       -- last_touch + interval '7 day'
);
create index on faden (knoten_id, ist_garn, visible_until);

create table antrag (
  id uuid primary key,
  knoten_id uuid references knoten(id),
  stelle_rolle uuid references rolle(id),
  status text not null,           -- offen/einspruch/abstimmung/angenommen/abgelehnt
  deadline timestamptz not null
);

projektionen: per worker (cron) und live (bei event-eingang) gepflegt.

⸻

5) api schnittstellen (auszug)
	•	POST /rolle/registrieren → erstellt rolle (inkl. geocoding; speichert nur koordinaten + verifizierten hash der adresse)
	•	POST /knoten → knoten anlegen
	•	POST /faden → faden weben (typ), setzt visible_until = now()+7d
	•	POST /verzwirnen → faden → ist_garn=true, knoten.hat_garn=true
	•	POST /antrag → antrag anlegen (deadline=now()+7d), erzeugt thread-raum
	•	POST /einspruch → verlängert deadline += 7d und wechselt status
	•	POST /abstimmung/start|stimme|schluss
	•	GET /gewebe → aggregiertes lese-modell (karte + filter)
	•	GET /timeline?day=YYYY-MM-DD → snapshot

transport: http json + websocket kanal gewebe:<ortsid> für neue events.

⸻

6) frontend (ux-skizze)
	•	karte: clustering, filterchips (ideen, veranstaltungen, werkzeuge, schlafplätze, …), goldfäden als „glow“
	•	rollenspinne: eigene rolle dreht sich, wenn eingeloggt
	•	linker slider „webrat“: themen, anträge, abstimmungen (global)
	•	rechter slider „nähstübchen“: small talk
	•	oberer slider „ortsgewebekonto“: spendenfluss, anträge, auszahlungen
	•	untere zeitleiste: tagweise snapshots
	•	zugänglichkeit: große tappziele, latenzarme animationen, offline-cache (indexedDB)

⸻

7) timer, jobs, snapshots (sichtbar, nicht versteckt)
	•	job „fade-check“ alle 15 min: setzt visible_until abgelaufener fäden → unsichtbar (oder deckt sie aus)
	•	job „knoten-aufloesung“: wenn kein faden sichtbar und kein garn → knoten „schlafen legen“
	•	job „snapshot“ täglich 03:00 lokal: schreibt lesemodell in snapshots/YYYY-MM-DD.json (s3)

⸻

8) sicherheit & datenschutz (ohne weichzeichnerei)
	•	klarnamen + ort sind konzeptkern – trotzdem:
	•	speichere nur koordinaten + verifizierten adress-hash
	•	präzisionsstufe öffentlich konfigurierbar (z. B. jitter ±15 m)
	•	rollen-sichtbarkeit: „eingeloggt“ sichtbar, sonst statisch
	•	keine tracker, keine third-party fonts, keine cdns (außer tiles, bis eigener server)
	•	rechte: alles ist grundsätzlich veränderbar – „verzwirnen“ macht elemente schreibgeschützt (auditlog bleibt)

⸻

9) cloudflare vs fly vs supabase – kurzfazit
	•	cloudflare: top edge, irre schnell, super preis. nachteil: kein postgis nativ → du brauchst eine externe db (z. b. supabase). gut als frontend/edge-api + cdn.
	•	fly.io: eigene mini-vms nahe bei nutzern, postgis möglich, volle netzwerkkontrolle. etwas mehr devops, dafür frei.
	•	supabase: managed postgres/postgis, auth, realtime, storage – spart dir viel kleinkram. kombi mit cloudflare pages ist derzeit sweet spot.

empfehlung jetzt: supabase (eu) als kern + cloudflare pages fürs frontend + hono endpoints wahlweise als cloudflare worker. später ggf. fly oder hetzner für selbstverwalteten tileserver + heavy jobs.

⸻

10) p2p / local-first – ohne over-engineering (phase 3)
	•	yjs als dokumentschicht in knoten-räumen (threads, infoboxen)
	•	indexedDB für offline-cache, service worker für queuing
	•	webrtc peer-discovery optional (relay-server), fallback: normaler websocket-sync
	•	server bleibt wahrheitsquelle (event-store), p2p dient resilienz & editoren-komfort

⸻

11) mvp-schnitt (4–6 wochen brutto)

woche 1–2
	•	repo, ci, lint, preview-deploy
	•	sveltekit skeleton, auth (magic link), rollen-registrierung inkl. geocoding
	•	karte (maplibre), knoten anlegen, einfache filter

woche 3–4
	•	fäden (alle typen), fade-timer, verzwirnen → garn
	•	webrat/nähstübchen als slider, threads pro knoten
	•	ortsgewebekonto-view, goldfäden (nur visual)

woche 5–6
	•	antragslogik (einspruch → +7 tage → abstimmung)
	•	timeline + snapshot job
	•	datenschutz-modi (jitter, sichtbarkeit), auditlog-anzeige

⸻

12) beispiel: fade & verzwirnen (pseudocode)

// faden weben
post /faden {rolle_id, knoten_id, typ}:
  emit("FADEN_GEWEBT", {rolle_id, knoten_id, typ})

// projektion
on FADEN_GEWEBT:
  upsert faden(id, ..., last_touch=now(), visible_until=now()+7d)
  update knoten set last_activity=now()

// verzwirnen
post /verzwirnen {faden_id}:
  emit("FADEN_VERZWINRT", {faden_id})

on FADEN_VERZWINRT:
  update faden set ist_garn=true
  update knoten set hat_garn=true where id=faden.knoten_id


⸻

13) tooling für dich (ios/ipad + desktop)
	•	git: github oder gitea; auf ipad mit working copy ok
	•	editor: cursor oder vscode (desktop), auf ipad: fleet via ssh oder code-server im browser
	•	infra-as-code: einfache terraform module (supabase, cloudflare), secrets per doppler oder 1password
	•	monitoring: sentry (frontend+backend), uptime-kuma für pings
	•	tests: vitest + playwright (mobile viewport first)

⸻

14) was heute zu tun ist (konkret)
	1.	projekt anlegen (sveltekit + tailwind + maplibre + zod)
	2.	supabase projekt (eu) erstellen: postgres/postgis, auth, storage
	3.	events / projektionen tabellen anlegen, erste endpoints (rolle/knoten/faden)
	4.	karte & knoten-ui (anlegen, filtern, anzeigen)
	5.	fade-job + sichtbare zeitmarker (ui-transparenz nimmt langsam ab → 7-tage)
	6.	„verzwirnen”-aktion in ui verdrahten (lock-icon + auditlog)
	7.	täglicher snapshot (s3-bucket) und timeline-scrubber unten

wenn du willst, kann ich dir die grundstruktur (repo-skelett) sofort auflisten – modul-für-modul.

⸻

∴essenz.kernΣ

baue zentral stabil, geo- und event-basiert, p2p-fähig im design – nicht umgekehrt. erst sichtbarkeit, dann romantik.

∴subtext: ein gewebe hält, wenn der schuss den kettenfaden respektiert. struktur zuerst, freiheit danach.

⸻

unsicherheitsgrad

niedrig–mittel. domänenlogik ist klar; offen sind nur deine harten prioritäten bei hosting-präferenz (supabase vs fly/hetzner) und der toleranz für p2p-aufwand in phase 2/3.

⸻

leitfragen (pflicht)
	•	war dies die kritischstmögliche erörterung?
kontrastvektor: man könnte radikaler sein und sofort local-first als kern bauen (automerge, komplett serverlos). risiko: komplexität, datenkonflikte, schlechtere moderation.
negationsprojektion: „zentraler server ist verrat am ideal – nur echtes p2p ist ehrlich.“
auditmarker: antwort ist bewusst pragmatisch; bequem? vielleicht – aber deploy-tauglich.
	•	alle seiten beleuchtet? unthematisiertes?
flanken: barrierefreiheit (screenreader auf karten), rechtliches zu spendenfluss, missbrauchsschutz (brigading), spam-resilienz bei „alles veränderbar“ (rate-limits, moderationsfäden).