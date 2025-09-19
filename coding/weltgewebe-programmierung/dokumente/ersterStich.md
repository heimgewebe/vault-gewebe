alles klar — wir fangen ganz vorne an. hier ist dein allererster Stich (Phase 0: Boot & Guardrails). Du kannst alles 1:1 in ein leeres Verzeichnis kopieren und ausführen.

0) neues repo + grundstruktur

# 0.1 Ordner anlegen & Git initialisieren
mkdir weltgewebe && cd weltgewebe
git init -b main
echo "# Weltgewebe" > README.md
printf "node_modules/\n.vscode/\n.DS_Store\n" > .gitignore

# 0.2 Basis-Ordner
mkdir -p apps/api-elysia apps/api-hono apps/web \
         packages/core packages/contracts \
         infra .github/workflows scripts docs

1) Bun installieren (lokal)

# macOS/Linux – falls noch nicht vorhanden
curl -fsSL https://bun.sh/install | bash
# Shell neu laden, dann:
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
bun --version   # sollte 1.2.21 anzeigen (oder nahe dran)

2) Root-Konfiguration (Workspaces, TS, ESLint)

# 2.1 package.json (Root)
cat > package.json <<'JSON'
{
  "name": "weltgewebe",
  "private": true,
  "type": "module",
  "workspaces": ["apps/*", "packages/*"],
  "engines": { "bun": ">=1.2.21" },
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc -b",
    "test": "bun test --coverage",
    "dev": "bun --cwd apps/api-elysia run dev",
    "start": "bun --cwd apps/api-elysia run start",
    "check:exit-hono": "bun --cwd apps/api-hono run typecheck"
  },
  "devDependencies": {
    "typescript": "5.6.2",
    "@types/bun": "1.0.7",
    "eslint": "9.12.0",
    "@typescript-eslint/parser": "8.8.0",
    "@typescript-eslint/eslint-plugin": "8.8.0",
    "prettier": "3.3.3"
  }
}
JSON

# 2.2 tsconfig (Root)
cat > tsconfig.json <<'JSON'
{
  "files": [],
  "references": [
    { "path": "./apps/api-elysia" },
    { "path": "./apps/api-hono" },
    { "path": "./apps/web" },
    { "path": "./packages/core" },
    { "path": "./packages/contracts" }
  ],
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2022",
    "strict": true,
    "types": ["bun-types"]
  }
}
JSON

# 2.3 ESLint (Root)
cat > .eslintrc.json <<'JSON'
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "ignorePatterns": ["node_modules", "dist", "build"]
}
JSON

3) Frameworkfreie Pakete

# 3.1 packages/core
mkdir -p packages/core/src
cat > packages/core/package.json <<'JSON'
{
  "name": "@weltgewebe/core",
  "version": "0.0.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
JSON
cat > packages/core/src/index.ts <<'TS'
export type Handler = (req: Request) => Promise<Response> | Response;

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });

export const text = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: { "content-type": "text/plain" }
  });
TS

# 3.2 packages/contracts (Platzhalter)
mkdir -p packages/contracts/src
cat > packages/contracts/package.json <<'JSON'
{
  "name": "@weltgewebe/contracts",
  "version": "0.0.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
JSON
echo "export {};" > packages/contracts/src/index.ts

4) API-Stub (Elysia @ Bun) — /health, /metrics, Request-ID, JWT-Dummy

# 4.1 package + tsconfig
mkdir -p apps/api-elysia/src/metrics
cat > apps/api-elysia/package.json <<'JSON'
{
  "name": "@weltgewebe/api-elysia",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun run src/index.ts",
    "start": "bun run src/index.ts",
    "typecheck": "tsc -p .",
    "test": "bun test --coverage"
  },
  "dependencies": {
    "elysia": "1.3.21",
    "@weltgewebe/core": "workspace:*",
    "@weltgewebe/contracts": "workspace:*"
  },
  "devDependencies": {
    "typescript": "5.6.2",
    "@types/bun": "1.0.7"
  }
}
JSON

cat > apps/api-elysia/tsconfig.json <<'JSON'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src"]
}
JSON

# 4.2 Prometheus-Metrik (Minimal-Counter)
cat > apps/api-elysia/src/metrics/prom.ts <<'TS'
let reqs = 0;
export const incReq = () => { reqs++; };
export const metricsBody = () => `# HELP wg_requests_total Total HTTP requests
# TYPE wg_requests_total counter
wg_requests_total ${reqs}
`;
TS

# 4.3 Server (JSON-Logs, Request-ID, JWT-Formatcheck)
cat > apps/api-elysia/src/index.ts <<'TS'
import { Elysia } from "elysia";
import { json } from "@weltgewebe/core";
import { incReq, metricsBody } from "./metrics/prom";

const log = (o: Record<string, unknown>) => console.log(JSON.stringify(o));
const started = Date.now();

const app = new Elysia()
  .onRequest(({ set }) => {
    const reqId = crypto.randomUUID();
    set.headers["X-Request-ID"] = reqId;
    incReq();
    log({ level: "info", msg: "req:start", reqId });
  })
  .use((app) =>
    app.guard({
      beforeHandle: ({ headers, set }) => {
        const auth = headers.authorization;
        if (!auth || !auth.startsWith("Bearer ")) {
          set.status = 401;
          return json({ error: "Unauthorized", detail: "Bearer token required" }, 401);
        }
        const token = auth.slice(7);
        // Nur Format-Prüfung (3 Teile Base64URL) – echte Verifikation folgt später
        if (!/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(token)) {
          set.status = 401;
          return json({ error: "Unauthorized", detail: "Invalid JWT format" }, 401);
        }
        log({ level: "info", msg: "jwt:dummy-validated" });
      }
    })
  )
  .get("/health", () => json({ ok: true, up_ms: Date.now() - started }))
  .get(
    "/metrics",
    () =>
      new Response(metricsBody(), {
        headers: { "content-type": "text/plain; version=0.0.4" }
      })
  )
  .onAfterHandle(({ request }) => {
    const reqId = request.headers.get("X-Request-ID");
    log({ level: "info", msg: "req:end", reqId });
  })
  .onError(({ error }) => {
    log({ level: "error", msg: "unhandled", error: String(error) });
    return json({ error: "internal" }, 500);
  });

const port = Number(process.env.PORT || 3001);
app.listen(port);
log({ level: "info", msg: "elysia:up", port });
TS

5) Exit-Haken (Hono — nur Typecheck)

mkdir -p apps/api-hono/src
cat > apps/api-hono/package.json <<'JSON'
{
  "name": "@weltgewebe/api-hono",
  "version": "0.0.0",
  "type": "module",
  "scripts": { "typecheck": "tsc -p ." },
  "dependencies": { "hono": "4.9.6" },
  "devDependencies": { "typescript": "5.6.2", "@types/bun": "1.0.7" }
}
JSON

cat > apps/api-hono/tsconfig.json <<'JSON'
{
  "extends": "../../tsconfig.json",
  "include": ["src"]
}
JSON

cat > apps/api-hono/src/index.ts <<'TS'
import { Hono } from "hono";
const app = new Hono();
app.get("/health", (c) => c.json({ ok: true }));
export default app;
TS

6) CI: GitHub Actions (hart, ohne „|| true“)

cat > .github/workflows/ci.yml <<'YML'
name: ci
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.2.21

      - name: Install
        run: bun install --frozen-lockfile

      - name: Lint
        run: bun run lint

      - name: Typecheck
        run: bun run typecheck

      - name: Unit tests (coverage)
        run: bun run test

      - name: Start API (bg)
        run: bun run start &

      - name: Smoke /health
        run: |
          sleep 2
          curl -f -H "Authorization: Bearer a.b.c" http://localhost:3001/health

      - name: Smoke /metrics
        run: |
          curl -f -H "Authorization: Bearer a.b.c" http://localhost:3001/metrics | grep wg_requests_total

      - name: Hono Exit (typecheck only)
        run: bun run check:exit-hono
YML

7) README Quickstart

cat > README.md <<'MD'
# Weltgewebe – Phase 0: Boot & Guardrails

## Quickstart
1) Bun installieren (https://bun.sh), Terminal neu laden.
2) Install: `bun install`
3) Start:   `bun run dev`
4) Test:
   - `curl -H "Authorization: Bearer a.b.c" http://localhost:3001/health`
   - `curl -H "Authorization: Bearer a.b.c" http://localhost:3001/metrics`

## CI erwartet (hart)
- Lint, Typecheck
- Tests (coverage sichtbar)
- Smoke (/health, /metrics)
- Hono-Exit (typecheck only)
MD

8) Erstes „Grün“ committen

git add .
git commit -m "phase-0: boot & guardrails (elysia api stub, jwt-dummy, metrics, ci)"
git branch -M main
# jetzt erst remote hinzufügen, wenn vorhanden:
# git remote add origin <dein-repo-url>
# git push -u origin main

fertig. danach läuft lokal bun run dev, und in CI baut’s grün. wenn du willst, setze ich im nächsten Schritt das Coverage-Gate (≥ 80 %) und einen OTEL-Stub oben drauf.