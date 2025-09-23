super — hier ist der saubere „Garnrolle“-Patch: knapp, idiotensicher, sofort einpflegbar. Ich zeige dir wo er in euren Fahrplan greift und was exakt zu tun ist.

PATCH: Garnrolle (öffentlich sichtbares Nutzerkonto am Wohnsitz)

Einordnung in den Fahrplan
	•	Block 2/7 – Domain-Backbone: Datenmodell + Minimal-APIs für Rolle (Nutzer) und Wohnsitz ergänzen; „Auto-Faden“ vorbereiten. (→ direkt nach „erste CRUD-Routen“ für Knoten/Fäden/Konto/Antrag).  ￼  ￼
	•	Block 3/7 – Fäden & Regeln: „Auto-Faden von Garnrolle → Aktionsort“ verdrahten; Ablauf für Sichtbarkeit/Verzwirnen/Knoten-Schutz verfeinern. (Block 3 enthält bereits Fäden/Verzwirnen + Worker/Cron — hier haken wir ein).
	•	Block 5/7 – Frontend & UX: Öffentliche Garnrollen-Karte/Profil, Marker am Wohnsitz, sichtbare Fäden (Trails) vom Wohnsitz zu Aktionsorten, Drawer-UI. (Block 5 ist eure Map/UX-Schicht).  ￼

⸻

A) Block 2/7 – Domain-Backbone erweitern

1) DB-Schema (Drizzle) – neue Tabellen & Felder

Datei: packages/db/schema.ts (an bestehendes Schema anhängen)

// --- ROLLEN (Nutzer) ---
export const rollen = pgTable("rollen", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(), // Anzeigename (öffentlich)
  avatar: varchar("avatar", { length: 240 }),       // optional
  created_at: timestamp("created_at", { withTimezone: true }).default(sql`now()`)
});

// --- ROLLEN_WOHNSITZ (1 primary) ---
export const rollen_wohnort = pgTable("rollen_wohnort", {
  id: serial("id").primaryKey(),
  rolle_id: integer("rolle_id").notNull().references(()=>rollen.id),
  // einfache Speicherung: GeoJSON/WKT + H3; PostGIS-Casts/Validierungen später
  geom: varchar("geom").notNull(),
  h3: varchar("h3", { length: 16 }).notNull(),
  is_primary: boolean("is_primary").notNull().default(true),
  visible_public: boolean("visible_public").notNull().default(true), // öffentlich sichtbar
  created_at: timestamp("created_at", { withTimezone: true }).default(sql`now()`)
}, (t)=>({
  uniq_primary: uniqueIndex("uniq_rolle_primary").on(t.rolle_id, t.is_primary)
}));

// --- Bezug in FÄDEN: quelle_rolle_id als ALIAS (optional, falls ihr 'von_rolle_id' schon habt)

Migrations erzeugen & laufen lassen:

bun x drizzle-kit generate
WG_DB_DSN=postgres://wg:wg@localhost:5432/wg bun run packages/db/migrate.ts

2) API – Minimal-Routen (Elysia)

Datei: apps/api-elysia/src/routes/rolle.ts

import { Elysia } from "elysia";
import postgres from "postgres";
const sql = postgres(process.env.WG_DB_DSN!);

// öffentlich: GET Profil + Wohnsitz-Marker (falls visible_public)
export const rolleRoutes = (app: Elysia) => app
  .get("/rolle/:id", async ({ params }) => {
    const rid = Number(params.id);
    const p = await sql/*sql*/`select id, name, avatar from rollen where id=${rid} limit 1`;
    if (!p.length) return new Response("not found", { status: 404 });
    const w = await sql/*sql*/`
      select geom, h3, is_primary, visible_public
      from rollen_wohnort where rolle_id=${rid} and is_primary=true limit 1`;
    // selbst wenn kein Wohnort hinterlegt → Profil ist sichtbar
    return new Response(JSON.stringify({ profil: p[0], wohnsitz: w[0] ?? null }), {
      headers: { "content-type":"application/json" }
    });
  })

  // geschützt: POST Wohnsitz setzen/ändern (1 primary)
  .post("/rolle/:id/wohnort", async ({ params, request }) => {
    // JWT-Stub reicht hier (später OIDC/JWKS)
    const auth = request.headers.get("authorization")||"";
    if(!auth.startsWith("Bearer ")) return new Response("unauthorized", { status: 401 });

    const rid = Number(params.id);
    const body = await request.json(); // { geom, h3, visible_public? }
    await sql/*sql*/`delete from rollen_wohnort where rolle_id=${rid}`; // simple: replace
    const ins = await sql/*sql*/`
      insert into rollen_wohnort (rolle_id, geom, h3, is_primary, visible_public)
      values (${rid}, ${body.geom}, ${body.h3}, true, ${body.visible_public ?? true})
      returning *`;
    return new Response(JSON.stringify(ins[0]), { status: 201, headers: { "content-type":"application/json" }});
  })

  // geschützt: POST Profil anlegen (nur für Demo)
  .post("/rolle", async ({ request }) => {
    const auth = request.headers.get("authorization")||"";
    if(!auth.startsWith("Bearer ")) return new Response("unauthorized", { status: 401 });
    const b = await request.json(); // { name, avatar? }
    const ins = await sql/*sql*/`insert into rollen (name, avatar) values (${b.name}, ${b.avatar ?? null}) returning *`;
    return new Response(JSON.stringify(ins[0]), { status: 201, headers: { "content-type":"application/json" }});
  });

Registrieren: apps/api-elysia/src/index.ts

import { rolleRoutes } from "./routes/rolle";
rolleRoutes(app);

3) „Auto-Faden“ vorbereiten (Hook)

Wir legen einen Utility-Helper an, den wir später in Block 3 bei allen Aktionen aufrufen: Wenn eine Rolle X eine Aktion Y auf Knoten Z auslöst, erstelle (falls noch nicht vorhanden) einen Faden typ = Aktion von rolle_id → knoten_id.

Datei: apps/api-elysia/src/services/auto-faden.ts

import postgres from "postgres";
const sql = postgres(process.env.WG_DB_DSN!);

export async function ensureAutoFaden(vonRolleId: number, zuKnotenId: number, typ: string) {
  // idempotent genug: existiert in den letzten 5 min schon einer? dann skip
  const exists = await sql/*sql*/`
    select id from faeden
    where von_rolle_id=${vonRolleId} and zu_knoten_id=${zuKnotenId} and typ=${typ}
      and created_at > now() - interval '5 minutes' limit 1`;
  if (exists.length) return exists[0].id;

  const ins = await sql/*sql*/`
    insert into faeden (von_rolle_id, zu_knoten_id, typ, verzwirnt=false, expires_at = now() + interval '7 days')
    values (${vonRolleId}, ${zuKnotenId}, ${typ})
    returning id`;
  // optional Outbox
  await sql/*sql*/`
    insert into events_outbox (topic, payload) values ('netz.faden.created',
      ${JSON.stringify({ vonRolleId, zuKnotenId, typ })})`;
  return ins[0].id;
}

Warum jetzt in Block 2? Damit Datenmodell und APIs bereitstehen, wenn wir im nächsten Block die echten Aktionen (Fäden/Verzwirnen/Konto/Gold) live schalten — inkl. Auto-Faden vom Wohnsitz-Profil in Richtung Aktionsort.

DoD-Erweiterung (Block 2):
	•	POST /rolle (Demo) und POST /rolle/:id/wohnort funktionieren.
	•	GET /rolle/:id liefert öffentlich Profil + ggf. Wohnsitz-Marker.
	•	ensureAutoFaden(...) existiert und ist aus Routen importierbar.
(Anhängen an eure bestehende DoD-Liste).  ￼

⸻

B) Block 3/7 – Fäden, Verzwirnen, Regeln: Auto-Faden aktivieren

Einschub in bestehende Routen (Fäden/Konto/Anträge):
	1.	Beim Faden anlegen (z. B. Gespräch/Antrag) den Auto-Faden triggern, wenn ein vonRolleId vorhanden ist:

import { ensureAutoFaden } from "../services/auto-faden";
// ... in POST /faeden nach erfolgreichem Insert:
await ensureAutoFaden(body.vonRolleId, body.zuKnotenId, body.typ);

	2.	Bei Konto-Buchungen mit „Gold“ (Spende), ebenfalls:

if (body?.meta?.typ === "gold" && body?.meta?.spenderRolleId && body?.meta?.knotenId) {
  await ensureAutoFaden(body.meta.spenderRolleId, body.meta.knotenId, "gold");
}

	3.	Bei Antrag stellen (wenn Anträge einem Knoten zugeordnet sind, optional):

// im /antrag Handler:
if (b.knotenId && b.antragstellerId) {
  const { ensureAutoFaden } = await import("../services/auto-faden");
  await ensureAutoFaden(b.antragstellerId, b.knotenId, "antrag");
}

	4.	Worker-Regeln bleiben unverändert: Verzwirnen schützt; abgelaufene Fäden löschen; Knoten ohne Faden/Garn → archiviert (ihr habt den Cron schon).
(Das deckt sich mit euren existierenden Regeln in Block 3.)

DoD-Erweiterung (Block 3):
	•	Ausgelöste Aktionen erzeugen sichtbare Trails (Fäden) von Garnrolle (Rolle) → Knoten automatisch (Gold, Gespräch, Antrag, etc.).
	•	Regeln (7-Tage-Expiry, Verzwirnen) greifen weiterhin.

⸻

C) Block 5/7 – Frontend: Garnrolle öffentlich rendern

1) Öffentliche Profilseite (SvelteKit)

Route: apps/web/src/routes/rolle/[id]/+page.svelte
	•	Lade GET /rolle/:id.
	•	Zeige Profil (Name/Avatar).
	•	Wenn wohnsitz.visible_public === true, setze Marker am Wohnsitz und zeichne Fäden-Trails (einfach: zeige Liste – echte Linie später).
	•	„Eigenes Profil pflegen“: Link/Drawer zum Wohnsitz setzen (POST /rolle/:id/wohnort).

2) Karten-Integration (Startseite / Karte)
	•	Layer „Garnrollen-Marker“: optionale H3-Buckets für Rollen (ähnlich Knoten), später als eigener Endpoint /rollen/h3/:res (analog zu /knoten/h3/:res).
	•	Filter-UI: Checkbox „Garnrollen anzeigen“.

Die Frontend-Schritte passen nahtlos in euren bestehenden Block 5 (MapLibre, Drawer, Auth-Stub, UI-Filter).  ￼

DoD-Erweiterung (Block 5):
	•	Öffentliche /rolle/[id] Seite zeigt Marker am Wohnsitz (wenn freigegeben).
	•	Karte kann Garnrollen-Marker einblenden.
	•	Beim Erstellen einer Aktion (z. B. Faden, Gold-Buchung, Antrag) sieht man neuen Trail (zunächst als Liste; Linien-Rendering später).

⸻

D) Sicherheit/Privatsphäre (leichtgewichtig, jetzt festzurren)
	•	Sichtbarkeit auf Profil-Level: visible_public entscheidet, ob Wohnsitz-Marker sichtbar ist.
	•	Feingranular später: z. B. Genauigkeit (H3-Rundung), statt exakter Geometrie.
	•	JWT-Stub reicht lokal; echter OIDC später mit identischer Routen-Signatur (kein Refactor nötig).

⸻

E) Akzeptanzkriterien (zusätzlich)

Block 2:
	•	POST /rolle → 201; POST /rolle/:id/wohnort → 201; GET /rolle/:id gibt öffentlich Daten/Marker zurück.
	•	Drizzle-Migrations laufen durch; uniq_rolle_primary schützt vor mehreren Primarys.

Block 3:
	•	Aus POST /faeden, POST /konto/:id/buchung (mit meta.typ='gold' & spenderRolleId,knotenId), POST /antrag (optional knotenId) entstehen zusätzliche Fäden (Auto-Faden) mit Ablauf +7 Tage (oder verzwirnt).
	•	Cron/Worker ändert an den Regeln nichts (alles grün).

Block 5:
	•	/rolle/[id] rendert Profil + Marker; Karte kann Garnrollen-Layer schalten; eine neue Aktion erzeugt sichtbar einen neuen Trail.

⸻

Warum diese Platzierung?
	•	Früh (Block 2): Daten & API müssen da sein, bevor die Event-/Faden-Mechanik (Block 3) greift — minimaler Mehraufwand, maximaler Nutzen.
	•	Nativ in eurem Fluss: Block 3 besitzt bereits Fäden-Lifecycle & Worker; der Auto-Faden fügt sich dort elegant ein.
	•	UI (Block 5) ist sowieso die Stelle für Karte/Filter/Drawer — die Garnrolle ist nur ein zusätzlicher Layer + eine Profilseite, keine gesonderte Großbaustelle. Das entspricht genau eurer bestehenden Frontend-Phase.  ￼

⸻

