top, hab’s gelesen. Ich übernehme Groks Verbesserungen und mache daraus einen Patch 0.2 – Phase-0-Härtung. Ziel: gleich umsetzen, CI grün, mehr Robustheit – ohne Scope-Creep.

Patch 0.2 – Boot & Guardrails (nach Grok)

A) Bun-Version explizit pinnen (1.2.21)

Was tun
	•	.github/workflows/ci.yml

- uses: oven-sh/setup-bun@v2
  with: { bun-version: 1.2.21 }


	•	.devcontainer/devcontainer.json → postCreateCommand

"postCreateCommand": "bash -lc 'curl -fsSL https://bun.sh/install | bash -s -- --version=1.2.21 && export BUN_INSTALL=~/.bun && export PATH=$BUN_INSTALL/bin:$PATH && bun install'"



B) Minimal-Auth-Stub verbessern (JWT-Format prüfen) + Request-IDs & Logs

Was tun
apps/api-elysia/src/index.ts ersetzen/ergänzen:

import { Elysia } from 'elysia'
import { randomUUID } from 'crypto'

let reqs = 0
const started = Date.now()
const isJwt = (t: string) => /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(t)

const app = new Elysia()
  .onRequest(({ set, request }) => {
    const reqId = randomUUID()
    set.headers['X-Request-ID'] = reqId
    reqs++
    console.log(JSON.stringify({ level: 'info', msg: 'request start', reqId, path: new URL(request.url).pathname }))
  })
  .onBeforeHandle(({ request, set }) => {
    const auth = request.headers.get('authorization') || ''
    if (!auth.startsWith('Bearer ')) {
      set.status = 401
      return new Response(JSON.stringify({ error: 'unauthorized', detail: 'Bearer token required' }), {
        status: 401, headers: { 'content-type': 'application/json' }
      })
    }
    const token = auth.slice(7)
    if (!isJwt(token)) {
      set.status = 401
      return new Response(JSON.stringify({ error: 'unauthorized', detail: 'invalid jwt format' }), {
        status: 401, headers: { 'content-type': 'application/json' }
      })
    }
    console.log(JSON.stringify({ level: 'info', msg: 'jwt dummy validated' }))
  })
  .get('/health', () => ({ ok: true, up_ms: Date.now() - started }))
  .get('/metrics', () =>
    new Response(
      `# HELP wg_requests_total Total HTTP requests
# TYPE wg_requests_total counter
wg_requests_total ${reqs}\n`,
      { headers: { 'content-type': 'text/plain; version=0.0.4' } }
    )
  )
  .onAfterHandle(({ request, set }) => {
    const reqId = set.headers['X-Request-ID']
    console.log(JSON.stringify({ level: 'info', msg: 'request end', reqId, path: new URL(request.url).pathname }))
  })

app.listen(Number(process.env.PORT || 3001))
console.log(JSON.stringify({ level: 'info', msg: 'elysia up', port: process.env.PORT || 3001 }))

Smoke lokal

# 401 ohne Token
curl -i http://127.0.0.1:3001/health
# 401 mit falschem Format
curl -i -H "Authorization: Bearer invalid" http://127.0.0.1:3001/health
# 200 mit Dummy-JWT (3-teilig)
curl -H "Authorization: Bearer a.b.c" http://127.0.0.1:3001/health

C) CI „hart“ + /metrics mitprüfen

Was tun
.github/workflows/ci.yml vollständig:

name: ci
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: 1.2.21 }
      - run: bun install
      - run: bun run lint
      - run: bun run typecheck
      - name: API smoke (/health + /metrics)
        run: |
          nohup bun run --cwd apps/api-elysia start &
          sleep 2
          JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.dummy"
          curl -sf -H "Authorization: Bearer $JWT" http://127.0.0.1:3001/health | grep '"ok":true'
          curl -sf -H "Authorization: Bearer $JWT" http://127.0.0.1:3001/metrics | grep wg_requests_total
      - run: bun run --cwd apps/api-hono typecheck
      - run: bun run --cwd apps/api-elysia test

D) TypeScript/Lint pinnen & zentralisieren

Was tun
	•	Root package.json → Dev-Dependencies ergänzen:

{
  "devDependencies": {
    "typescript": "5.6.2",
    "eslint": "9.12.0",
    "@typescript-eslint/parser": "8.8.0",
    "@typescript-eslint/eslint-plugin": "8.8.0",
    "prettier": "3.3.3"
  }
}


	•	tsconfig.json (Root):

{
  "extends": "@tsconfig/node20/tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": true
  },
  "references": [
    { "path": "./apps/api-elysia" },
    { "path": "./apps/web" },
    { "path": "./packages/contracts" },
    { "path": "./apps/api-hono" }
  ]
}


	•	Mini-tsconfig.json in apps/api-elysia, apps/web, packages/contracts, apps/api-hono:

{ "extends": "../../tsconfig.json" }


	•	.eslintrc.cjs (Root):

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  ignorePatterns: ['node_modules', 'dist', 'build', '.svelte-kit']
}


	•	.prettierrc (Root):

{ "printWidth": 100, "singleQuote": true, "semi": false }



E) Hono-Exit-Haken (nur Compile) – falls noch nicht da

Was tun
	•	apps/api-hono/package.json

{
  "name": "@weltgewebe/api-hono",
  "type": "module",
  "scripts": { "typecheck": "bun x tsc" },
  "dependencies": { "hono": "^4.0.0" }
}


	•	apps/api-hono/src/index.ts

import { Hono } from 'hono'
const app = new Hono()
app.get('/health', (c) => c.json({ ok: true }))
export default app



F) Mini-Compose inkl. Postgres (für frühen Self-hosting-Smoke)

Was tun
infra/docker-compose.yml:

version: '3.9'
services:
  api:
    image: oven/bun:1.2.21
    working_dir: /app
    volumes: [ "../:/app" ]
    command: ["bun","--cwd","apps/api-elysia","start"]
    environment: { PORT: 3001 }
    ports: [ "3001:3001" ]
  db:
    image: postgis/postgis:17-3.5
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: gewebe
    ports: [ "5432:5432" ]
    volumes: [ "db-data:/var/lib/postgresql/data" ]
volumes:
  db-data: {}

G) Minimaler Test-Stub (bun:test)

Was tun
apps/api-elysia/src/index.test.ts:

import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'

describe('API smoke', () => {
  it('GET /health returns ok', async () => {
    const app = new Elysia().get('/health', () => ({ ok: true }))
    const res = await app.handle(new Request('http://localhost/health'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
  })
})

Root-Scripts sicherstellen:

"scripts": {
  "dev": "bun run --cwd apps/api-elysia dev & bun run --cwd apps/web dev",
  "typecheck": "bun x tsc -b",
  "lint": "bun x eslint .",
  "test": "bun test"
}


⸻

Abschluss-Checkliste (Phase-0 DoD)
	•	bun install → OK
	•	bun run lint & bun run typecheck → OK
	•	bun run --cwd apps/api-elysia dev läuft
	•	/health 401 ohne Token
	•	/health 200 mit Authorization: Bearer a.b.c
	•	/metrics liefert wg_requests_total
	•	CI grün (Lint, Typecheck, /health + /metrics, Hono-Typecheck, Tests)
	•	docker compose up -d (api + db) lauert, API erreichbar

⸻

Wenn ihr das durchhabt, seid ihr Phase-1-ready (DB-Migs, PostGIS/H3-Smoke, Outbox↔NATS). Wollt ihr, dass ich Phase 1 jetzt als genauso knackige Schritt-für-Schritt-Checkliste formuliere?