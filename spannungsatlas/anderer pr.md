diff --git a/.gitignore b/.gitignore
index e63eea1..b84b438 100644
--- a/.gitignore
+++ b/.gitignore
@@ -1,2 +1,5 @@
 __pycache__/
 node_modules/
+.svelte-kit/
+.vercel/
+build/
diff --git a/.nvmrc b/.nvmrc
new file mode 100644
index 0000000..5bd6811
--- /dev/null
+++ b/.nvmrc
@@ -0,0 +1 @@
+20.19.0
diff --git a/README.md b/README.md
index cdbffa9..a81f804 100644
--- a/README.md
+++ b/README.md
@@ -8,6 +8,7 @@ summary: "Repo-Einstieg mit Kurzbeschreibung und Verweis auf das kanonische Prod
 related_docs:
   - masterplan
   - deploy-blaupause
+  - roadmap
 last_reviewed: "2026-03-29"
 ---
 
@@ -19,8 +20,72 @@ Das kanonische Produktdokument für dieses Repository liegt in [`MASTERPLAN.md`]
 
 Eine geordnete Übersicht aller Dokumente findet sich im [Dokumentationsindex](./docs/index.md).
 
+## Was Spannungsatlas nicht ist
+
+- **Kein Diagnosetool** — es erzeugt keine klinischen oder psychiatrischen Diagnosen
+- **Kein Bewertungssystem** — Profile sind revidierbare Arbeitsprofile, keine Urteile über Personen
+- **Kein Wahrheitsautomat** — Deutungen bleiben als vorläufige Denkstände markiert; Unsicherheit ist kein Fehler, sondern ein Pflichtfeld
+- **Kein Entscheidungssystem für Ad-hoc-Situationen** — das System dient primär der nachträglichen Reflexion und Dokumentation, nicht der schnellen automatisierten Situationsentscheidung.
+
+Stattdessen: ein Reflexions- und Dokumentationssystem mit sichtbarer Unsicherheit, Pflicht zur Gegen-Deutung und revisionsfähiger Arbeitsverdichtung.
+
+## Kernprinzipien
+
+- Beobachtung und Deutung werden strikt getrennt dokumentiert
+- Gegen-Deutung ist Pflicht, keine Option
+- Unsicherheit bleibt sichtbar — Datenlücken und offene Fragen sind kein Mangel
+- Profile sind revidierbare Arbeitsprofile, keine stabilen Wesensbeschreibungen
+- Profile bleiben kontextgebunden und revidierbar.
+
+## Minimaler Arbeitsablauf
+
+Der aktuelle Systemstand unterstützt folgenden Ablauf:
+
+1. **Fall anlegen** — Kontext und beteiligte Person erfassen
+2. **Beobachtung dokumentieren** — rein beschreibend, kameraähnlich
+3. **Deutung formulieren** — Hypothese mit Evidenztyp (beobachtungsnah / abgeleitet / spekulativ)
+4. **Gegen-Deutung formulieren** — alternative Erklärung zur selben Beobachtung
+5. **Unsicherheit begründen** — Datenlücken, offene Fragen, Begrenzungen der Einschätzung
+6. **Fallansicht prüfen** — erfasste Elemente in der Fallübersicht kontrollieren
+
+## Architektur auf einen Blick
+
+| Schicht | Inhalt |
+|---------|--------|
+| `src/domain/` | Produktkern: Typen, Guards, Factories, epistemische Regeln |
+| `apps/web/` | SvelteKit-Webschicht mit Vercel-Adapter |
+| Persistenz | Local-first via `localStorage` (Schlüssel: `spannungsatlas-cases`) |
+
+Noch nicht implementiert: zentrale Persistenz, API, Authentifizierung, Rollen-/Rechtelogik, Export, Auditierbarkeit (vorgesehen für spätere Phasen laut [`docs/deploy-blaupause.md`](./docs/deploy-blaupause.md)).
+
 ## Aktueller Implementationsstand
 
 Implementiert ist der **Phase-1-Reflexionskern**: Domain-Typen sowie zugehörige Guards und Factories in `src/domain/` (siehe [`src/domain/types.ts`](./src/domain/types.ts)).
 
+Implementiert ist die **Phase-0/1-Webschicht**: Eine SvelteKit-Anwendung unter [`apps/web/`](./apps/web/) mit Vercel-Adapter. Die Web-App ermöglicht das Anlegen, Anzeigen und lokale Speichern von Reflexionsfällen. Sie konsumiert den Domain-Kern aus `src/domain/` und arbeitet local-first (localStorage). Routen: Dashboard (`/`), Neuer Fall (`/cases/new`), Fallansicht (`/cases/[id]`), Katalog-Platzhalter (`/catalog`), Vergleich-Platzhalter (`/compare`).
+
 Noch nicht implementiert ist der **Phase-2-Explorationsraum**: Bedürfnis- und Determinantenkatalog, Clusterstruktur, Selektionsfelder und UI-Schichten. Das Zieldatenmodell dafür ist in [`docs/ux-ui-blaupause.md §7`](./docs/ux-ui-blaupause.md) beschrieben.
+
+Noch nicht implementiert: zentrale Persistenz, API, Authentifizierung, Rollen-/Rechtelogik, Export und Auditierbarkeit (Phase 2+ laut [`docs/deploy-blaupause.md`](./docs/deploy-blaupause.md)).
+
+## Entwicklung und Verifikation
+
+Voraussetzung: Node.js ≥ 20.19 (siehe `.nvmrc`).
+
+```bash
+npm install          # Abhängigkeiten installieren (Root + apps/web)
+npm run typecheck    # Domain-Typecheck (tsc --noEmit)
+npm run test         # Domain-Tests (vitest)
+npm run check:web    # SvelteKit-Typecheck (svelte-check)
+npm run build:web    # Web-App bauen (Vite + Vercel-Adapter)
+npm run verify       # Gesamtprüfung: typecheck → test → check:web → build:web
+npm run dev          # Lokaler Entwicklungsserver (SvelteKit)
+```
+
+## Dokumentationsverweise
+
+- [`MASTERPLAN.md`](./MASTERPLAN.md) — Kanonisches Produktdokument
+- [`docs/roadmap.md`](./docs/roadmap.md) — Ausbauplan nach Phase 0/1
+- [`docs/ux-ui-blaupause.md`](./docs/ux-ui-blaupause.md) — UX/UI-Konzept
+- [`docs/deploy-blaupause.md`](./docs/deploy-blaupause.md) — Architektur und Deploy-Strategie
+- [`docs/index.md`](./docs/index.md) — Dokumentationsübersicht
diff --git a/apps/web/package.json b/apps/web/package.json
new file mode 100644
index 0000000..7f56fee
--- /dev/null
+++ b/apps/web/package.json
@@ -0,0 +1,28 @@
+{
+  "name": "@spannungsatlas/web",
+  "version": "0.1.0",
+  "private": true,
+  "type": "module",
+  "engines": {
+    "node": ">=20.19.0"
+  },
+  "scripts": {
+    "dev": "vite dev",
+    "build": "vite build",
+    "preview": "vite preview",
+    "prepare": "svelte-kit sync",
+    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
+    "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch"
+  },
+  "dependencies": {
+    "@sveltejs/adapter-vercel": "^6.3.3",
+    "@sveltejs/kit": "^2.55.0",
+    "svelte": "^5.46.4"
+  },
+  "devDependencies": {
+    "@sveltejs/vite-plugin-svelte": "^7.0.0",
+    "svelte-check": "^4.4.0",
+    "typescript": "^5.7.0",
+    "vite": "^8.0.0"
+  }
+}
diff --git a/apps/web/src/app.css b/apps/web/src/app.css
new file mode 100644
index 0000000..fc00385
--- /dev/null
+++ b/apps/web/src/app.css
@@ -0,0 +1,105 @@
+:root {
+  --color-bg: #fafafa;
+  --color-surface: #ffffff;
+  --color-text: #1a1a1a;
+  --color-text-muted: #5f6368;
+  --color-border: #dadce0;
+  --color-accent: #2d5a9b;
+  --color-accent-light: #e8eef6;
+  --color-danger: #c53030;
+  --color-success: #2f855a;
+  --color-warning: #c05621;
+  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif;
+  --font-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
+  --radius: 6px;
+  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
+  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.1);
+  --max-width: 860px;
+}
+
+*, *::before, *::after {
+  box-sizing: border-box;
+}
+
+html {
+  font-family: var(--font-sans);
+  color: var(--color-text);
+  background: var(--color-bg);
+  line-height: 1.6;
+  -webkit-font-smoothing: antialiased;
+}
+
+body {
+  margin: 0;
+  min-height: 100vh;
+}
+
+h1, h2, h3 {
+  line-height: 1.3;
+  margin-top: 0;
+}
+
+a {
+  color: var(--color-accent);
+  text-decoration: none;
+}
+
+a:hover {
+  text-decoration: underline;
+}
+
+.card {
+  background: var(--color-surface);
+  border: 1px solid var(--color-border);
+  border-radius: var(--radius);
+  padding: 1.25rem 1.5rem;
+  box-shadow: var(--shadow-sm);
+}
+
+.btn {
+  display: inline-flex;
+  align-items: center;
+  gap: 0.4rem;
+  padding: 0.5rem 1.1rem;
+  border: 1px solid var(--color-border);
+  border-radius: var(--radius);
+  background: var(--color-surface);
+  color: var(--color-text);
+  font-size: 0.9rem;
+  cursor: pointer;
+  transition: background 0.15s, border-color 0.15s;
+}
+
+.btn:hover {
+  background: var(--color-accent-light);
+  border-color: var(--color-accent);
+}
+
+.btn-primary {
+  background: var(--color-accent);
+  color: #fff;
+  border-color: var(--color-accent);
+}
+
+.btn-primary:hover {
+  background: #1e4a85;
+}
+
+.badge {
+  display: inline-block;
+  padding: 0.15rem 0.55rem;
+  border-radius: 999px;
+  font-size: 0.75rem;
+  font-weight: 500;
+  line-height: 1.5;
+}
+
+.badge-observational { background: #d4edda; color: #155724; }
+.badge-derived { background: #fff3cd; color: #856404; }
+.badge-speculative { background: #f8d7da; color: #721c24; }
+
+.page {
+  max-width: var(--max-width);
+  margin: 0 auto;
+  padding: 1.5rem 1rem;
+}
diff --git a/apps/web/src/app.d.ts b/apps/web/src/app.d.ts
new file mode 100644
index 0000000..d500540
--- /dev/null
+++ b/apps/web/src/app.d.ts
@@ -0,0 +1,5 @@
+/// <reference types="@sveltejs/kit" />
+declare global {
+  namespace App {}
+}
+export {};
diff --git a/apps/web/src/app.html b/apps/web/src/app.html
new file mode 100644
index 0000000..468bd74
--- /dev/null
+++ b/apps/web/src/app.html
@@ -0,0 +1,12 @@
+<!doctype html>
+<html lang="de">
+  <head>
+    <meta charset="utf-8" />
+    <meta name="viewport" content="width=device-width, initial-scale=1" />
+    <title>Spannungsatlas</title>
+    %sveltekit.head%
+  </head>
+  <body data-sveltekit-preload-data="hover">
+    %sveltekit.body%
+  </body>
+</html>
diff --git a/apps/web/src/lib/persistence/store.ts b/apps/web/src/lib/persistence/store.ts
new file mode 100644
index 0000000..cc93bb8
--- /dev/null
+++ b/apps/web/src/lib/persistence/store.ts
@@ -0,0 +1,71 @@
+import type { Case } from '$domain/types.js';
+import { guardCase } from '$domain/guards.js';
+
+/** Abstraction over case persistence — swap localStorage for IndexedDB or API. */
+export interface PersistenceStore {
+  loadAllCases(): Case[];
+  loadCase(id: string): Case | null;
+  saveCase(c: Case): void;
+  deleteCase(id: string): void;
+}
+
+const STORAGE_KEY = 'spannungsatlas-cases';
+
+function isStorageAvailable(): boolean {
+  return typeof localStorage !== 'undefined';
+}
+
+function readCases(): Case[] {
+  if (!isStorageAvailable()) return [];
+  let raw: string | null;
+  try {
+    raw = localStorage.getItem(STORAGE_KEY);
+  } catch {
+    console.warn('Failed to read cases from localStorage');
+    return [];
+  }
+  if (!raw) return [];
+  try {
+    const parsed: unknown = JSON.parse(raw);
+    if (!Array.isArray(parsed)) return [];
+    return (parsed as unknown[]).filter(
+      (entry) => typeof entry === 'object' && entry !== null && guardCase(entry as Case).length === 0
+    ) as Case[];
+  } catch {
+    return [];
+  }
+}
+
+function writeCases(cases: Case[]): void {
+  if (!isStorageAvailable()) return;
+  try {
+    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
+  } catch (error) {
+    console.warn('Failed to persist cases to localStorage', error);
+  }
+}
+
+export const localStorageStore: PersistenceStore = {
+  loadAllCases(): Case[] {
+    return readCases();
+  },
+
+  loadCase(id: string): Case | null {
+    return readCases().find((c) => c.id === id) ?? null;
+  },
+
+  saveCase(c: Case): void {
+    const cases = readCases();
+    const idx = cases.findIndex((existing) => existing.id === c.id);
+    if (idx >= 0) {
+      cases[idx] = c;
+    } else {
+      cases.push(c);
+    }
+    writeCases(cases);
+  },
+
+  deleteCase(id: string): void {
+    writeCases(readCases().filter((c) => c.id !== id));
+  }
+};
diff --git a/apps/web/src/lib/services/case-service.ts b/apps/web/src/lib/services/case-service.ts
new file mode 100644
index 0000000..dca5c3f
--- /dev/null
+++ b/apps/web/src/lib/services/case-service.ts
@@ -0,0 +1,75 @@
+import type { Case, EvidenceType, ParticipantRole, UncertaintyLevel } from '$domain/types.js';
+import type { CreateCaseInput } from '$domain/factories.js';
+import { createCase } from '$domain/factories.js';
+import { localStorageStore, type PersistenceStore } from '$lib/persistence/store.js';
+
+export interface StartNewCaseInput {
+  context: string;
+  participantName: string;
+  participantRole?: ParticipantRole;
+  observationText: string;
+  isCameraDescribable: boolean;
+  interpretationText: string;
+  interpretationEvidenceType: EvidenceType;
+  counterInterpretationText: string;
+  counterInterpretationEvidenceType: EvidenceType;
+  uncertaintyLevel: UncertaintyLevel;
+  uncertaintyRationale: string;
+}
+
+const store: PersistenceStore = localStorageStore;
+
+export function startNewCase(input: StartNewCaseInput): Case {
+  const id = crypto.randomUUID();
+  const now = new Date().toISOString();
+
+  const caseInput: CreateCaseInput = {
+    id,
+    context: input.context,
+    participants: [
+      {
+        id: input.participantName,
+        ...(input.participantRole ? { role: input.participantRole } : {})
+      }
+    ],
+    observation: {
+      text: input.observationText,
+      isCameraDescribable: input.isCameraDescribable
+    },
+    currentReflection: {
+      reflectedAt: now,
+      interpretation: {
+        text: input.interpretationText,
+        evidenceType: input.interpretationEvidenceType
+      },
+      counterInterpretation: {
+        text: input.counterInterpretationText,
+        evidenceType: input.counterInterpretationEvidenceType
+      },
+      uncertainty: {
+        level: input.uncertaintyLevel,
+        rationale: input.uncertaintyRationale
+      }
+    }
+  };
+
+  const created = createCase(caseInput);
+  store.saveCase(created);
+  return created;
+}
+
+export function getCase(id: string): Case | null {
+  return store.loadCase(id);
+}
+
+export function getAllCases(): Case[] {
+  return store.loadAllCases();
+}
+
+export function saveCaseData(caseData: Case): void {
+  store.saveCase(caseData);
+}
+
+export function deleteCase(id: string): void {
+  store.deleteCase(id);
+}
diff --git a/apps/web/src/routes/+layout.svelte b/apps/web/src/routes/+layout.svelte
new file mode 100644
index 0000000..b4ba26b
--- /dev/null
+++ b/apps/web/src/routes/+layout.svelte
@@ -0,0 +1,62 @@
+<script>
+  import '../app.css';
+  let { children } = $props();
+</script>
+
+<nav class="topnav">
+  <div class="topnav-inner">
+    <a href="/" class="topnav-brand">Spannungsatlas</a>
+    <ul class="topnav-links">
+      <li><a href="/">Übersicht</a></li>
+      <li><a href="/cases/new">Neuer Fall</a></li>
+      <li><a href="/catalog">Katalog</a></li>
+      <li><a href="/compare">Vergleich</a></li>
+    </ul>
+  </div>
+</nav>
+
+<main>
+  {@render children()}
+</main>
+
+<style>
+  .topnav {
+    background: var(--color-surface);
+    border-bottom: 1px solid var(--color-border);
+    position: sticky;
+    top: 0;
+    z-index: 10;
+  }
+  .topnav-inner {
+    max-width: var(--max-width);
+    margin: 0 auto;
+    padding: 0.75rem 1rem;
+    display: flex;
+    align-items: center;
+    gap: 2rem;
+    flex-wrap: wrap;
+  }
+  .topnav-brand {
+    font-weight: 700;
+    font-size: 1.15rem;
+    color: var(--color-accent);
+    text-decoration: none;
+    letter-spacing: -0.02em;
+  }
+  .topnav-links {
+    list-style: none;
+    margin: 0;
+    padding: 0;
+    display: flex;
+    gap: 1.25rem;
+    font-size: 0.9rem;
+  }
+  .topnav-links a {
+    color: var(--color-text-muted);
+    text-decoration: none;
+    padding: 0.25rem 0;
+  }
+  .topnav-links a:hover {
+    color: var(--color-accent);
+  }
+</style>
diff --git a/apps/web/src/routes/+page.svelte b/apps/web/src/routes/+page.svelte
new file mode 100644
index 0000000..209d500
--- /dev/null
+++ b/apps/web/src/routes/+page.svelte
@@ -0,0 +1,129 @@
+<script lang="ts">
+  import { onMount } from 'svelte';
+  import { getAllCases } from '$lib/services/case-service.js';
+  import type { Case } from '$domain/types.js';
+
+  let cases: Case[] = $state([]);
+  let loaded = $state(false);
+
+  onMount(() => {
+    cases = getAllCases();
+    loaded = true;
+  });
+
+  function truncate(text: string, max: number): string {
+    return text.length > max ? text.slice(0, max) + '…' : text;
+  }
+
+  function shortId(id: string): string {
+    return id.slice(0, 8);
+  }
+
+  function formatDate(iso: string): string {
+    try {
+      return new Date(iso).toLocaleDateString('de-DE', {
+        day: '2-digit', month: '2-digit', year: 'numeric'
+      });
+    } catch {
+      return iso;
+    }
+  }
+</script>
+
+<div class="page">
+  <h1>Übersicht</h1>
+  <p class="subtitle">Reflexionsfälle im Spannungsatlas</p>
+
+  {#if !loaded}
+    <p>Lade…</p>
+  {:else if cases.length === 0}
+    <div class="card empty-state">
+      <h2>Noch keine Fälle dokumentiert</h2>
+      <p>
+        Im Spannungsatlas dokumentieren Sie pädagogische Beobachtungen und trennen diese
+        systematisch von Deutungen. So entsteht ein reflektierter Blick auf Spannungsfelder.
+      </p>
+      <a href="/cases/new" class="btn btn-primary">Ersten Fall anlegen</a>
+    </div>
+  {:else}
+    <div class="case-list">
+      {#each cases as c (c.id)}
+        <a href="/cases/{c.id}" class="card case-card">
+          <div class="case-header">
+            <code class="case-id">{shortId(c.id)}</code>
+            <span class="case-date">{formatDate(c.currentReflection.reflectedAt)}</span>
+          </div>
+          <div class="case-context">{truncate(c.context, 80)}</div>
+          <div class="case-observation">{truncate(c.observation.text, 120)}</div>
+        </a>
+      {/each}
+    </div>
+    <div class="actions">
+      <a href="/cases/new" class="btn btn-primary">Neuen Fall anlegen</a>
+    </div>
+  {/if}
+</div>
+
+<style>
+  .subtitle {
+    color: var(--color-text-muted);
+    margin-top: -0.5rem;
+    margin-bottom: 1.5rem;
+  }
+  .empty-state {
+    text-align: center;
+    padding: 2.5rem 1.5rem;
+  }
+  .empty-state h2 {
+    font-size: 1.15rem;
+    margin-bottom: 0.5rem;
+  }
+  .empty-state p {
+    color: var(--color-text-muted);
+    max-width: 480px;
+    margin: 0 auto 1.25rem;
+  }
+  .case-list {
+    display: flex;
+    flex-direction: column;
+    gap: 0.75rem;
+    margin-bottom: 1.5rem;
+  }
+  .case-card {
+    display: block;
+    text-decoration: none;
+    color: var(--color-text);
+    transition: box-shadow 0.15s;
+  }
+  .case-card:hover {
+    box-shadow: var(--shadow-md);
+    text-decoration: none;
+  }
+  .case-header {
+    display: flex;
+    justify-content: space-between;
+    align-items: center;
+    margin-bottom: 0.4rem;
+  }
+  .case-id {
+    font-family: var(--font-mono);
+    font-size: 0.8rem;
+    color: var(--color-accent);
+  }
+  .case-date {
+    font-size: 0.8rem;
+    color: var(--color-text-muted);
+  }
+  .case-context {
+    font-weight: 600;
+    font-size: 0.95rem;
+    margin-bottom: 0.25rem;
+  }
+  .case-observation {
+    font-size: 0.85rem;
+    color: var(--color-text-muted);
+  }
+  .actions {
+    margin-top: 1rem;
+  }
+</style>
diff --git a/apps/web/src/routes/cases/[id]/+page.svelte b/apps/web/src/routes/cases/[id]/+page.svelte
new file mode 100644
index 0000000..b9eb062
--- /dev/null
+++ b/apps/web/src/routes/cases/[id]/+page.svelte
@@ -0,0 +1,246 @@
+<script lang="ts">
+  import { page } from '$app/state';
+  import { onMount } from 'svelte';
+  import { getCase } from '$lib/services/case-service.js';
+  import type { Case, EvidenceType } from '$domain/types.js';
+
+  let caseData: Case | null = $state(null);
+  let loaded = $state(false);
+
+  const evidenceLabels: Record<EvidenceType, string> = {
+    observational: 'Beobachtungsnah',
+    derived: 'Abgeleitet',
+    speculative: 'Spekulativ'
+  };
+
+  function evidenceBadgeClass(t: EvidenceType): string {
+    return `badge badge-${t}`;
+  }
+
+  function formatDate(iso: string): string {
+    try {
+      return new Date(iso).toLocaleString('de-DE', {
+        day: '2-digit', month: '2-digit', year: 'numeric',
+        hour: '2-digit', minute: '2-digit'
+      });
+    } catch {
+      return iso;
+    }
+  }
+
+  onMount(() => {
+    const id = page.params.id ?? '';
+    caseData = getCase(id);
+    loaded = true;
+  });
+</script>
+
+<div class="page">
+  {#if !loaded}
+    <p>Lade…</p>
+  {:else if !caseData}
+    <div class="card empty-state">
+      <h1>Kein Fall gefunden</h1>
+      <p>Der angeforderte Fall existiert nicht oder wurde gelöscht.</p>
+      <a href="/" class="btn btn-primary">Zurück zur Übersicht</a>
+    </div>
+  {:else}
+    <div class="case-header-row">
+      <h1>Fall <code>{caseData.id.slice(0, 8)}</code></h1>
+      <span class="case-date">{formatDate(caseData.currentReflection.reflectedAt)}</span>
+    </div>
+
+    <!-- Kontext -->
+    <section class="card section">
+      <h2>Kontext</h2>
+      <p>{caseData.context}</p>
+      <div class="participants">
+        <strong>Beteiligte:</strong>
+        {#each caseData.participants as p}
+          <span class="participant">{p.id}{#if p.role} ({p.role}){/if}</span>
+        {/each}
+      </div>
+    </section>
+
+    <!-- Beobachtung -->
+    <section class="card section">
+      <h2>Beobachtung</h2>
+      <p>{caseData.observation.text}</p>
+      {#if caseData.observation.isCameraDescribable}
+        <span class="badge badge-observational">📷 Kamerabeschreibbar</span>
+      {/if}
+    </section>
+
+    <!-- Deutung -->
+    <section class="card section">
+      <h2>Deutung</h2>
+      <p>{caseData.currentReflection.interpretation.text}</p>
+      <span class={evidenceBadgeClass(caseData.currentReflection.interpretation.evidenceType)}>
+        {evidenceLabels[caseData.currentReflection.interpretation.evidenceType]}
+      </span>
+    </section>
+
+    <!-- Gegen-Deutung -->
+    <section class="card section">
+      <h2>Gegen-Deutung</h2>
+      <p>{caseData.currentReflection.counterInterpretation.text}</p>
+      <span class={evidenceBadgeClass(caseData.currentReflection.counterInterpretation.evidenceType)}>
+        {evidenceLabels[caseData.currentReflection.counterInterpretation.evidenceType]}
+      </span>
+    </section>
+
+    <!-- Unsicherheit -->
+    <section class="card section">
+      <h2>Unsicherheit</h2>
+      <div class="uncertainty-level">
+        <strong>Stufe {caseData.currentReflection.uncertainty.level}</strong> / 5
+      </div>
+      <div class="uncertainty-bar">
+        <div
+          class="uncertainty-fill"
+          style="width: {(caseData.currentReflection.uncertainty.level / 5) * 100}%"
+        ></div>
+      </div>
+      <p class="rationale">{caseData.currentReflection.uncertainty.rationale}</p>
+    </section>
+
+    <!-- Spannungen -->
+    {#if caseData.currentReflection.tensions.length > 0}
+      <section class="card section">
+        <h2>Spannungen</h2>
+        {#each caseData.currentReflection.tensions as tension}
+          <div class="tension-edge">
+            <span class="tension-source">{tension.source}</span>
+            <span class="tension-arrow">{tension.direction === 'bidirectional' ? '↔' : '→'}</span>
+            <span class="tension-target">{tension.target}</span>
+            <span class="tension-label">({tension.label})</span>
+          </div>
+          <p class="tension-context">{tension.context}</p>
+        {/each}
+      </section>
+    {/if}
+
+    <!-- Revisionen -->
+    {#if caseData.revisions.length > 0}
+      <section class="card section">
+        <h2>Revisionen</h2>
+        {#each caseData.revisions as rev}
+          <div class="revision">
+            <div class="revision-header">
+              <strong>{formatDate(rev.at)}</strong>
+              <span class="badge badge-derived">{rev.driftType}</span>
+            </div>
+            <p>{rev.reason}</p>
+          </div>
+        {/each}
+      </section>
+    {/if}
+
+    <div class="actions">
+      <a href="/" class="btn">← Zurück zur Übersicht</a>
+    </div>
+  {/if}
+</div>
+
+<style>
+  .case-header-row {
+    display: flex;
+    align-items: baseline;
+    gap: 1rem;
+    flex-wrap: wrap;
+    margin-bottom: 1rem;
+  }
+  .case-header-row h1 {
+    margin-bottom: 0;
+  }
+  .case-header-row code {
+    font-family: var(--font-mono);
+    font-size: 0.85em;
+    color: var(--color-accent);
+  }
+  .case-date {
+    font-size: 0.85rem;
+    color: var(--color-text-muted);
+  }
+  .section {
+    margin-bottom: 1rem;
+  }
+  .section h2 {
+    font-size: 1rem;
+    color: var(--color-accent);
+    margin-bottom: 0.4rem;
+  }
+  .section p {
+    margin: 0.3rem 0 0.5rem;
+  }
+  .empty-state {
+    text-align: center;
+    padding: 2.5rem 1.5rem;
+  }
+  .participants {
+    font-size: 0.85rem;
+    color: var(--color-text-muted);
+    margin-top: 0.5rem;
+  }
+  .participant {
+    margin-left: 0.3rem;
+  }
+  .uncertainty-level {
+    font-size: 0.95rem;
+    margin-bottom: 0.4rem;
+  }
+  .uncertainty-bar {
+    height: 8px;
+    background: var(--color-border);
+    border-radius: 4px;
+    overflow: hidden;
+    margin-bottom: 0.5rem;
+  }
+  .uncertainty-fill {
+    height: 100%;
+    background: var(--color-accent);
+    border-radius: 4px;
+    transition: width 0.3s;
+  }
+  .rationale {
+    font-style: italic;
+    color: var(--color-text-muted);
+  }
+  .tension-edge {
+    display: flex;
+    align-items: center;
+    gap: 0.4rem;
+    font-weight: 500;
+    margin-top: 0.5rem;
+  }
+  .tension-arrow {
+    font-size: 1.2rem;
+    color: var(--color-accent);
+  }
+  .tension-label {
+    color: var(--color-text-muted);
+    font-weight: 400;
+    font-size: 0.85rem;
+  }
+  .tension-context {
+    font-size: 0.85rem;
+    color: var(--color-text-muted);
+    margin-top: 0.1rem;
+    margin-bottom: 0.75rem;
+  }
+  .revision {
+    border-left: 3px solid var(--color-accent);
+    padding-left: 0.75rem;
+    margin-bottom: 0.75rem;
+  }
+  .revision-header {
+    display: flex;
+    align-items: center;
+    gap: 0.5rem;
+    margin-bottom: 0.2rem;
+    font-size: 0.9rem;
+  }
+  .actions {
+    margin: 1.5rem 0 2rem;
+  }
+</style>
diff --git a/apps/web/src/routes/cases/new/+page.svelte b/apps/web/src/routes/cases/new/+page.svelte
new file mode 100644
index 0000000..7d3655b
--- /dev/null
+++ b/apps/web/src/routes/cases/new/+page.svelte
@@ -0,0 +1,313 @@
+<script lang="ts">
+  import { goto } from '$app/navigation';
+  import { startNewCase } from '$lib/services/case-service.js';
+  import type { EvidenceType, ParticipantRole, UncertaintyLevel } from '$domain/types.js';
+
+  let context = $state('');
+  let participantName = $state('');
+  let participantRole = $state<ParticipantRole>('primary');
+
+  let observationText = $state('');
+  let isCameraDescribable = $state(false);
+
+  let interpretationText = $state('');
+  let interpretationEvidence = $state<EvidenceType>('derived');
+
+  let counterText = $state('');
+  let counterEvidence = $state<EvidenceType>('derived');
+
+  let uncertaintyLevel = $state<UncertaintyLevel>(3);
+  let uncertaintyRationale = $state('');
+
+  let errors = $state<string[]>([]);
+  let submitting = $state(false);
+
+  const evidenceLabels: Record<EvidenceType, string> = {
+    observational: 'Beobachtungsnah',
+    derived: 'Abgeleitet',
+    speculative: 'Spekulativ'
+  };
+
+  const roleLabels: Record<string, string> = {
+    primary: 'Primär',
+    secondary: 'Sekundär',
+    staff: 'Fachkraft',
+    contextual: 'Kontextuell'
+  };
+
+  const uncertaintyLabels: Record<number, string> = {
+    0: '0 — Sicher',
+    1: '1 — Weitgehend sicher',
+    2: '2 — Wahrscheinlich',
+    3: '3 — Unsicher',
+    4: '4 — Sehr unsicher',
+    5: '5 — Hochspekulativ'
+  };
+
+  function validate(): string[] {
+    const errs: string[] = [];
+    if (!context.trim()) errs.push('Kontext darf nicht leer sein.');
+    if (!participantName.trim()) errs.push('Name der beteiligten Person fehlt.');
+    if (!observationText.trim()) errs.push('Beobachtung darf nicht leer sein.');
+    if (!interpretationText.trim()) errs.push('Deutung darf nicht leer sein.');
+    if (!counterText.trim()) errs.push('Gegen-Deutung darf nicht leer sein.');
+    if (!uncertaintyRationale.trim()) errs.push('Begründung der Unsicherheit fehlt.');
+    if (observationText.trim() === interpretationText.trim()) {
+      errs.push('Beobachtung und Deutung dürfen nicht identisch sein.');
+    }
+    if (interpretationText.trim() === counterText.trim()) {
+      errs.push('Deutung und Gegen-Deutung dürfen nicht identisch sein.');
+    }
+    return errs;
+  }
+
+  function submit() {
+    errors = validate();
+    if (errors.length > 0) return;
+
+    submitting = true;
+    try {
+      const created = startNewCase({
+        context: context.trim(),
+        participantName: participantName.trim(),
+        participantRole,
+        observationText: observationText.trim(),
+        isCameraDescribable,
+        interpretationText: interpretationText.trim(),
+        interpretationEvidenceType: interpretationEvidence,
+        counterInterpretationText: counterText.trim(),
+        counterInterpretationEvidenceType: counterEvidence,
+        uncertaintyLevel,
+        uncertaintyRationale: uncertaintyRationale.trim()
+      });
+      goto(`/cases/${created.id}`);
+    } catch (e: unknown) {
+      const msg = e instanceof Error ? e.message : String(e);
+      errors = [msg];
+      submitting = false;
+    }
+  }
+</script>
+
+<div class="page">
+  <h1>Neuer Fall</h1>
+  <p class="subtitle">Reflexionsdisziplin: Beobachtung → Deutung → Gegen-Deutung → Unsicherheit</p>
+
+  {#if errors.length > 0}
+    <div class="error-box">
+      {#each errors as err}
+        <p>{err}</p>
+      {/each}
+    </div>
+  {/if}
+
+  <form onsubmit={(e) => { e.preventDefault(); submit(); }}>
+    <!-- Sektion 1: Kontext -->
+    <section class="card form-section">
+      <h2>1. Kontext</h2>
+      <p class="helper">Beschreiben Sie die Situation und das Setting, in dem die Beobachtung stattfand.</p>
+
+      <label class="field">
+        <span class="field-label">Situationskontext</span>
+        <textarea bind:value={context} rows="3" placeholder="z.B. Mittagssituation in der Kita, Gruppenraum, 12 Kinder anwesend…"></textarea>
+      </label>
+
+      <div class="field-row">
+        <label class="field">
+          <span class="field-label">Beteiligte Person</span>
+          <input type="text" bind:value={participantName} placeholder="Name oder Pseudonym" />
+        </label>
+        <label class="field">
+          <span class="field-label">Rolle</span>
+          <select bind:value={participantRole}>
+            {#each Object.entries(roleLabels) as [value, label]}
+              <option {value}>{label}</option>
+            {/each}
+          </select>
+        </label>
+      </div>
+    </section>
+
+    <!-- Sektion 2: Beobachtung -->
+    <section class="card form-section">
+      <h2>2. Beobachtung</h2>
+      <p class="helper">
+        Was genau haben Sie gesehen oder gehört? Beschreiben Sie nur das, was eine Kamera
+        hätte aufnehmen können — ohne Bewertung oder Interpretation.
+      </p>
+
+      <label class="field">
+        <span class="field-label">Beobachtungstext</span>
+        <textarea bind:value={observationText} rows="4" placeholder="z.B. Kind A nimmt Kind B den Stift aus der Hand. Kind B sagt ‚Nein' und wendet sich ab."></textarea>
+      </label>
+
+      <label class="checkbox-field">
+        <input type="checkbox" bind:checked={isCameraDescribable} />
+        <span>Ich halte diese Beschreibung für kamerabeschreibbar</span>
+      </label>
+    </section>
+
+    <!-- Sektion 3: Deutung -->
+    <section class="card form-section">
+      <h2>3. Deutung</h2>
+      <p class="helper">
+        Wie interpretieren Sie das Beobachtete? Was könnte dahinter stehen?
+        Markieren Sie die Evidenznähe Ihrer Deutung.
+      </p>
+
+      <label class="field">
+        <span class="field-label">Deutungstext</span>
+        <textarea bind:value={interpretationText} rows="4" placeholder="z.B. Kind A zeigt möglicherweise Frustration über die eigene Impulskontrolle…"></textarea>
+      </label>
+
+      <label class="field">
+        <span class="field-label">Evidenztyp</span>
+        <select bind:value={interpretationEvidence}>
+          {#each Object.entries(evidenceLabels) as [value, label]}
+            <option {value}>{label}</option>
+          {/each}
+        </select>
+      </label>
+    </section>
+
+    <!-- Sektion 4: Gegen-Deutung -->
+    <section class="card form-section">
+      <h2>4. Gegen-Deutung</h2>
+      <p class="helper">
+        Welche alternative Erklärung wäre ebenfalls denkbar? Die Gegen-Deutung zwingt
+        zur Perspektiverweiterung und verhindert vorschnelle Festlegung.
+      </p>
+
+      <label class="field">
+        <span class="field-label">Gegen-Deutungstext</span>
+        <textarea bind:value={counterText} rows="4" placeholder="z.B. Kind A imitiert möglicherweise ein Verhalten, das es bei anderen Kindern beobachtet hat…"></textarea>
+      </label>
+
+      <label class="field">
+        <span class="field-label">Evidenztyp</span>
+        <select bind:value={counterEvidence}>
+          {#each Object.entries(evidenceLabels) as [value, label]}
+            <option {value}>{label}</option>
+          {/each}
+        </select>
+      </label>
+    </section>
+
+    <!-- Sektion 5: Unsicherheit -->
+    <section class="card form-section">
+      <h2>5. Unsicherheit</h2>
+      <p class="helper">
+        Wie sicher sind Sie sich in Ihrer Einschätzung? Unsicherheit explizit zu
+        benennen ist ein Qualitätsmerkmal professioneller Reflexion.
+      </p>
+
+      <label class="field">
+        <span class="field-label">Unsicherheitsstufe</span>
+        <select bind:value={uncertaintyLevel}>
+          {#each [0, 1, 2, 3, 4, 5] as lvl}
+            <option value={lvl}>{uncertaintyLabels[lvl]}</option>
+          {/each}
+        </select>
+      </label>
+
+      <label class="field">
+        <span class="field-label">Begründung der Unsicherheit</span>
+        <textarea bind:value={uncertaintyRationale} rows="3" placeholder="z.B. Ich kenne die Vorgeschichte zwischen den Kindern nicht ausreichend…"></textarea>
+      </label>
+    </section>
+
+    <div class="form-actions">
+      <button type="submit" class="btn btn-primary" disabled={submitting}>
+        Fall dokumentieren
+      </button>
+      <a href="/" class="btn">Abbrechen</a>
+    </div>
+  </form>
+</div>
+
+<style>
+  .subtitle {
+    color: var(--color-text-muted);
+    margin-top: -0.5rem;
+    margin-bottom: 1.5rem;
+    font-size: 0.95rem;
+  }
+  .error-box {
+    background: #fef2f2;
+    border: 1px solid #fecaca;
+    border-radius: var(--radius);
+    padding: 0.75rem 1rem;
+    margin-bottom: 1.25rem;
+    color: var(--color-danger);
+    font-size: 0.9rem;
+  }
+  .error-box p {
+    margin: 0.2rem 0;
+  }
+  .form-section {
+    margin-bottom: 1.25rem;
+  }
+  .form-section h2 {
+    font-size: 1.05rem;
+    margin-bottom: 0.25rem;
+    color: var(--color-accent);
+  }
+  .helper {
+    font-size: 0.85rem;
+    color: var(--color-text-muted);
+    margin-top: 0;
+    margin-bottom: 1rem;
+  }
+  .field {
+    display: block;
+    margin-bottom: 0.75rem;
+  }
+  .field-label {
+    display: block;
+    font-size: 0.85rem;
+    font-weight: 600;
+    margin-bottom: 0.3rem;
+  }
+  textarea, input[type="text"], select {
+    width: 100%;
+    padding: 0.5rem 0.65rem;
+    border: 1px solid var(--color-border);
+    border-radius: var(--radius);
+    font-family: inherit;
+    font-size: 0.9rem;
+    background: var(--color-bg);
+    color: var(--color-text);
+  }
+  textarea:focus, input:focus, select:focus {
+    outline: 2px solid var(--color-accent);
+    outline-offset: -1px;
+    border-color: var(--color-accent);
+  }
+  select {
+    cursor: pointer;
+  }
+  .field-row {
+    display: grid;
+    grid-template-columns: 1fr 1fr;
+    gap: 0.75rem;
+  }
+  @media (max-width: 500px) {
+    .field-row { grid-template-columns: 1fr; }
+  }
+  .checkbox-field {
+    display: flex;
+    align-items: center;
+    gap: 0.5rem;
+    font-size: 0.9rem;
+    cursor: pointer;
+  }
+  .checkbox-field input {
+    width: auto;
+  }
+  .form-actions {
+    display: flex;
+    gap: 0.75rem;
+    margin-top: 0.5rem;
+    margin-bottom: 2rem;
+  }
+</style>
diff --git a/apps/web/src/routes/catalog/+page.svelte b/apps/web/src/routes/catalog/+page.svelte
new file mode 100644
index 0000000..46cffd1
--- /dev/null
+++ b/apps/web/src/routes/catalog/+page.svelte
@@ -0,0 +1,92 @@
+<div class="page">
+  <h1>Bedürfnis- und Determinantenraum</h1>
+  <p class="subtitle">Explorationsraum für pädagogische Bezugsrahmen</p>
+
+  <div class="card phase-notice">
+    <span class="phase-badge">Phase 2</span>
+    <strong>Noch nicht implementiert</strong>
+  </div>
+
+  <section class="card catalog-section">
+    <h2>Bedürfniskatalog</h2>
+    <p>
+      Strukturierte Sammlung menschlicher Grundbedürfnisse als Bezugsrahmen für die
+      Reflexion. Beobachtungen und Deutungen werden mit Bedürfniskategorien verknüpft,
+      um Spannungsfelder systematisch einzuordnen.
+    </p>
+    <ul>
+      <li>Bedürfniskategorien nach pädagogischer Fachliteratur</li>
+      <li>Zuordnung zu beobachteten Situationen</li>
+      <li>Verknüpfung mit Deutungen und Gegen-Deutungen</li>
+    </ul>
+  </section>
+
+  <section class="card catalog-section">
+    <h2>Determinantenkatalog</h2>
+    <p>
+      Kontextfaktoren und Einflussvariablen, die pädagogische Situationen prägen.
+      Determinanten helfen, die Rahmenbedingungen einer Beobachtung zu strukturieren.
+    </p>
+    <ul>
+      <li>Institutionelle Rahmenbedingungen</li>
+      <li>Soziale Kontextfaktoren</li>
+      <li>Individuelle Einflussvariablen</li>
+    </ul>
+  </section>
+
+  <section class="card catalog-section">
+    <h2>Clusterstruktur</h2>
+    <p>
+      Bedürfnisse und Determinanten werden in Clustern organisiert, um Zusammenhänge
+      sichtbar zu machen und die Navigation im Explorationsraum zu erleichtern.
+    </p>
+  </section>
+</div>
+
+<style>
+  .subtitle {
+    color: var(--color-text-muted);
+    margin-top: -0.5rem;
+    margin-bottom: 1.5rem;
+  }
+  .phase-notice {
+    display: flex;
+    align-items: center;
+    gap: 0.75rem;
+    background: var(--color-accent-light);
+    border-color: var(--color-accent);
+    margin-bottom: 1.25rem;
+    font-size: 0.9rem;
+  }
+  .phase-badge {
+    background: var(--color-accent);
+    color: #fff;
+    font-size: 0.75rem;
+    font-weight: 600;
+    padding: 0.2rem 0.6rem;
+    border-radius: 999px;
+    white-space: nowrap;
+  }
+  .catalog-section {
+    margin-bottom: 1rem;
+  }
+  .catalog-section h2 {
+    font-size: 1.05rem;
+    color: var(--color-accent);
+    margin-bottom: 0.3rem;
+  }
+  .catalog-section p {
+    color: var(--color-text-muted);
+    margin: 0.25rem 0 0.5rem;
+    font-size: 0.9rem;
+  }
+  .catalog-section ul {
+    margin: 0;
+    padding-left: 1.25rem;
+    font-size: 0.85rem;
+    color: var(--color-text-muted);
+  }
+  .catalog-section li {
+    margin-bottom: 0.2rem;
+  }
+</style>
diff --git a/apps/web/src/routes/compare/+page.svelte b/apps/web/src/routes/compare/+page.svelte
new file mode 100644
index 0000000..bca8256
--- /dev/null
+++ b/apps/web/src/routes/compare/+page.svelte
@@ -0,0 +1,89 @@
+<div class="page">
+  <h1>Vergleich &amp; Drift</h1>
+  <p class="subtitle">Denkentwicklung sichtbar machen</p>
+
+  <div class="card phase-notice">
+    <span class="phase-badge">Phase 3</span>
+    <strong>Noch nicht implementiert</strong>
+  </div>
+
+  <section class="card drift-section">
+    <h2>Denkstände nebeneinander</h2>
+    <p>
+      Vergleichen Sie frühere und aktuelle Reflexionssnapshots eines Falls.
+      So wird sichtbar, wie sich Ihre Einschätzung über die Zeit verändert hat —
+      ohne dass frühere Denkstände verloren gehen.
+    </p>
+  </section>
+
+  <section class="card drift-section">
+    <h2>Drift-Klassifikation</h2>
+    <p>
+      Jede Veränderung im Denken wird klassifiziert: Handelt es sich um eine
+      neue Beobachtung, eine neue Perspektive oder eine Uminterpretation?
+      Diese Drift-Typen machen die Art der Veränderung explizit.
+    </p>
+    <ul>
+      <li><strong>Neue Beobachtung</strong> — Zusätzliche Wahrnehmung verändert das Bild</li>
+      <li><strong>Neue Perspektive</strong> — Gleiche Beobachtung, anderer Blickwinkel</li>
+      <li><strong>Uminterpretation</strong> — Grundlegende Neubewertung der Situation</li>
+    </ul>
+  </section>
+
+  <section class="card drift-section">
+    <h2>Profilverdichtung</h2>
+    <p>
+      Über mehrere Fälle und Revisionen hinweg verdichtet sich ein individuelles
+      Reflexionsprofil. Wiederkehrende Muster, bevorzugte Deutungsrahmen und
+      typische Unsicherheitsbereiche werden sichtbar.
+    </p>
+  </section>
+</div>
+
+<style>
+  .subtitle {
+    color: var(--color-text-muted);
+    margin-top: -0.5rem;
+    margin-bottom: 1.5rem;
+  }
+  .phase-notice {
+    display: flex;
+    align-items: center;
+    gap: 0.75rem;
+    background: var(--color-accent-light);
+    border-color: var(--color-accent);
+    margin-bottom: 1.25rem;
+    font-size: 0.9rem;
+  }
+  .phase-badge {
+    background: var(--color-accent);
+    color: #fff;
+    font-size: 0.75rem;
+    font-weight: 600;
+    padding: 0.2rem 0.6rem;
+    border-radius: 999px;
+    white-space: nowrap;
+  }
+  .drift-section {
+    margin-bottom: 1rem;
+  }
+  .drift-section h2 {
+    font-size: 1.05rem;
+    color: var(--color-accent);
+    margin-bottom: 0.3rem;
+  }
+  .drift-section p {
+    color: var(--color-text-muted);
+    margin: 0.25rem 0 0.5rem;
+    font-size: 0.9rem;
+  }
+  .drift-section ul {
+    margin: 0;
+    padding-left: 1.25rem;
+    font-size: 0.85rem;
+    color: var(--color-text-muted);
+  }
+  .drift-section li {
+    margin-bottom: 0.3rem;
+  }
+</style>
diff --git a/apps/web/svelte.config.js b/apps/web/svelte.config.js
new file mode 100644
index 0000000..339c599
--- /dev/null
+++ b/apps/web/svelte.config.js
@@ -0,0 +1,14 @@
+import adapter from '@sveltejs/adapter-vercel';
+
+/** @type {import('@sveltejs/kit').Config} */
+const config = {
+  kit: {
+    adapter: adapter(),
+    alias: {
+      '$domain': '../../src/domain',
+      '$domain/*': '../../src/domain/*'
+    }
+  }
+};
+
+export default config;
diff --git a/apps/web/tsconfig.json b/apps/web/tsconfig.json
new file mode 100644
index 0000000..4344710
--- /dev/null
+++ b/apps/web/tsconfig.json
@@ -0,0 +1,14 @@
+{
+  "extends": "./.svelte-kit/tsconfig.json",
+  "compilerOptions": {
+    "allowJs": true,
+    "checkJs": true,
+    "esModuleInterop": true,
+    "forceConsistentCasingInFileNames": true,
+    "resolveJsonModule": true,
+    "skipLibCheck": true,
+    "sourceMap": true,
+    "strict": true,
+    "moduleResolution": "bundler"
+  }
+}
diff --git a/apps/web/vite.config.ts b/apps/web/vite.config.ts
new file mode 100644
index 0000000..3406f32
--- /dev/null
+++ b/apps/web/vite.config.ts
@@ -0,0 +1,6 @@
+import { sveltekit } from '@sveltejs/kit/vite';
+import { defineConfig } from 'vite';
+
+export default defineConfig({
+  plugins: [sveltekit()]
+});
diff --git a/docs/_generated/backlinks.md b/docs/_generated/backlinks.md
index 902b416..1a9fdd8 100644
--- a/docs/_generated/backlinks.md
+++ b/docs/_generated/backlinks.md
@@ -1,5 +1,5 @@
 <!-- GENERATED FILE — DO NOT EDIT MANUALLY -->
-<!-- Generated by scripts/docmeta/generate_backlinks.py at 2026-03-29T07:27:04Z -->
+<!-- Generated by scripts/docmeta/generate_backlinks.py at 2026-03-29T19:34:49Z -->
 
 # Backlinks
 
@@ -21,6 +21,7 @@ Genannt in related_docs von:
 - `docs/deploy-blaupause.md`
 - `docs/icf-integration-blaupause.md`
 - `docs/index.md`
+- `docs/roadmap.md`
 - `docs/ux-ui-blaupause.md`
 
 ## `README.md`
@@ -66,10 +67,12 @@ Verwiesen von (Markdown-Links):
 ## `docs/deploy-blaupause.md`
 
 Verwiesen von (Markdown-Links):
+- `README.md`
 - `docs/index.md`
 
 Genannt in related_docs von:
 - `README.md`
+- `docs/roadmap.md`
 
 ## `docs/icf-integration-blaupause.md`
 
@@ -86,6 +89,16 @@ Genannt in related_docs von:
 Verwiesen von (Markdown-Links):
 - `README.md`
 
+## `docs/roadmap.md`
+
+Verwiesen von (Markdown-Links):
+- `README.md`
+- `docs/index.md`
+
+Genannt in related_docs von:
+- `README.md`
+- `docs/index.md`
+
 ## `docs/ux-ui-blaupause.md`
 
 Verwiesen von (Markdown-Links):
@@ -97,6 +110,7 @@ Genannt in related_docs von:
 - `docs/deploy-blaupause.md`
 - `docs/icf-integration-blaupause.md`
 - `docs/index.md`
+- `docs/roadmap.md`
 
 ## `repo.meta.yaml`
 
diff --git a/docs/_generated/doc-index.md b/docs/_generated/doc-index.md
index 946232c..cf2f8c5 100644
--- a/docs/_generated/doc-index.md
+++ b/docs/_generated/doc-index.md
@@ -1,5 +1,5 @@
 <!-- GENERATED FILE — DO NOT EDIT MANUALLY -->
-<!-- Generated by scripts/docmeta/generate_doc_index.py at 2026-03-29T07:27:04Z -->
+<!-- Generated by scripts/docmeta/generate_doc_index.py at 2026-03-29T19:34:49Z -->
 
 # Dokumenten-Index
 
@@ -12,6 +12,7 @@ Automatisch generierter Index aller Dokumente mit erkanntem Frontmatter.
 | icf-integration-blaupause | Spannungsatlas – ICF-Integrations-Blaupause | integration | active | canonical | [docs/icf-integration-blaupause.md](../../docs/icf-integration-blaupause.md) |
 | masterplan | Spannungsatlas – Kanonischer Produktmasterplan | product-canon | active | canonical | [MASTERPLAN.md](../../MASTERPLAN.md) |
 | readme | Spannungsatlas | readme | active | informational | [README.md](../../README.md) |
+| roadmap | Spannungsatlas – Ausbauplan nach Phase 0/1 | roadmap | active | informational | [docs/roadmap.md](../../docs/roadmap.md) |
 | ux-ui-blaupause | Spannungsatlas – UX/UI Blaupause | ux-ui | active | canonical | [docs/ux-ui-blaupause.md](../../docs/ux-ui-blaupause.md) |
 
 ## Dokumente ohne Frontmatter
diff --git a/docs/_generated/orphans.md b/docs/_generated/orphans.md
index 10eb97c..7090c57 100644
--- a/docs/_generated/orphans.md
+++ b/docs/_generated/orphans.md
@@ -1,5 +1,5 @@
 <!-- GENERATED FILE — DO NOT EDIT MANUALLY -->
-<!-- Generated by scripts/docmeta/generate_orphans.py at 2026-03-29T07:27:05Z -->
+<!-- Generated by scripts/docmeta/generate_orphans.py at 2026-03-29T19:34:50Z -->
 
 # Verwaiste Dokumente (Orphans)
 
diff --git a/docs/_generated/system-map.md b/docs/_generated/system-map.md
index 0fcf63c..ecbe09a 100644
--- a/docs/_generated/system-map.md
+++ b/docs/_generated/system-map.md
@@ -1,5 +1,5 @@
 <!-- GENERATED FILE — DO NOT EDIT MANUALLY -->
-<!-- Generated by scripts/docmeta/generate_system_map.py at 2026-03-29T07:28:30Z -->
+<!-- Generated by scripts/docmeta/generate_system_map.py at 2026-03-29T19:34:50Z -->
 
 # System-Map
 
@@ -21,6 +21,7 @@ Strukturübersicht des Repos mit Dateitypen und Frontmatter-Status.
 - `docs/deploy-blaupause.md` — id:`deploy-blaupause` type:`architecture` canon:`canonical`
 - `docs/icf-integration-blaupause.md` — id:`icf-integration-blaupause` type:`integration` canon:`canonical`
 - `docs/index.md` — id:`docs-index` type:`navigation` canon:`navigation`
+- `docs/roadmap.md` — id:`roadmap` type:`roadmap` canon:`informational`
 - `docs/ux-ui-blaupause.md` — id:`ux-ui-blaupause` type:`ux-ui` canon:`canonical`
 
 ## Generierte Artefakte (`docs/_generated`)
diff --git a/docs/_generated/weak-links.md b/docs/_generated/weak-links.md
index 5bbec9e..4fb3ef0 100644
--- a/docs/_generated/weak-links.md
+++ b/docs/_generated/weak-links.md
@@ -1,5 +1,5 @@
 <!-- GENERATED FILE — DO NOT EDIT MANUALLY -->
-<!-- Generated by scripts/docmeta/generate_orphans.py at 2026-03-29T07:27:05Z -->
+<!-- Generated by scripts/docmeta/generate_orphans.py at 2026-03-29T19:34:50Z -->
 
 # Schwach eingebundene Dokumente
 
diff --git a/docs/deploy-blaupause.md b/docs/deploy-blaupause.md
index e5707ad..a84f5ab 100644
--- a/docs/deploy-blaupause.md
+++ b/docs/deploy-blaupause.md
@@ -110,7 +110,7 @@ Sobald echte Persistenz, Rechte und Teamnutzung relevant werden, wird der Produk
 
 ## 5. Technisches Zielbild (Repo-Struktur)
 
-Dies ist eine Zielstruktur für Phase 0/1. Sie beschreibt den angestrebten Zustand und ist im aktuellen Repository noch nicht umgesetzt.
+Diese Struktur ist seit Phase 0/1 im Repository umgesetzt. `apps/web` enthält eine SvelteKit-Anwendung mit Vercel-Adapter, die den Domain-Kern aus `src/domain` konsumiert.
 
 
 ```
diff --git a/docs/index.md b/docs/index.md
index 17671a7..eb48f6a 100644
--- a/docs/index.md
+++ b/docs/index.md
@@ -9,6 +9,7 @@ related_docs:
   - masterplan
   - ux-ui-blaupause
   - icf-integration-blaupause
+  - roadmap
 last_reviewed: "2026-03-29"
 ---
 
@@ -30,6 +31,12 @@ last_reviewed: "2026-03-29"
 |----------|-------------|
 | [Deploy-Blaupause mit Vercel](deploy-blaupause.md) | Architektur-Entscheidung: Vercel für UI, Entkopplung des Produktkerns |
 
+## Planung
+
+| Dokument | Beschreibung |
+|----------|-------------|
+| [Roadmap / Ausbauplan](roadmap.md) | Geordneter Ausbaupfad nach Phase 0/1, orientiert am bestehenden Produktkanon |
+
 ## UX / UI
 
 | Dokument | Beschreibung |
@@ -42,6 +49,12 @@ last_reviewed: "2026-03-29"
 |----------|-------------|
 | [ICF-Integrations-Blaupause](icf-integration-blaupause.md) | Konzeptionelle Integration von icf-tool in den Spannungsatlas |
 
+## Web-Anwendung
+
+| Pfad | Beschreibung |
+|------|-------------|
+| [apps/web/](../apps/web/) | SvelteKit-Webschicht (Vercel-Adapter, local-first, konsumiert `src/domain/`) |
+
 ## Repo-Struktur / Meta
 
 | Dokument | Beschreibung |
diff --git a/docs/roadmap.md b/docs/roadmap.md
new file mode 100644
index 0000000..b8d55b7
--- /dev/null
+++ b/docs/roadmap.md
@@ -0,0 +1,82 @@
+---
+id: roadmap
+title: "Spannungsatlas – Ausbauplan nach Phase 0/1"
+doc_type: roadmap
+status: active
+canonicality: informational
+summary: "Geordneter Ausbaupfad nach der initialen Webschicht, orientiert am bestehenden Produktkanon."
+related_docs:
+  - masterplan
+  - ux-ui-blaupause
+  - deploy-blaupause
+last_reviewed: "2026-03-29"
+---
+
+# Spannungsatlas – Ausbauplan nach Phase 0/1
+
+> **Hinweis:** Dieses Dokument ist informell. Verbindliche Produktanforderungen liegen in `MASTERPLAN.md`. Dieser Plan verdichtet den Ausbaupfad aus vorhandenem Kanon, erfindet keine neuen Produktbehauptungen.
+
+## 1. Zweck des Ausbauplans
+
+Nach der implementierten Phase-0/1-Webschicht — Domain-Kern, SvelteKit-Anwendung, local-first Persistenz — dient dieser Plan der Priorisierung der nächsten Ausbauschritte. Er hält fest, was als nächstes sinnvoll wäre, ohne den aktuellen Stand als mehr darzustellen als er ist.
+
+## 2. Leitregel
+
+**Erst epistemische Disziplin stabilisieren, dann Explorations- und Vergleichsräume ausbauen.**
+
+Das bedeutet: Bevor neue Schichten gebaut werden, sollte Beobachtung, Deutung, Gegen-Deutung und Unsicherheit in der bestehenden Webschicht so ausgestaltet werden, dass sie dem Anspruch des MASTERPLAN.md in der Praxis standhalten.
+
+## 3. Empfohlene Reihenfolge
+
+### Phase 2a — Reflexionskern in der UI stabilisieren
+
+Ziel: Die epistemische Disziplin des Produktkerns in der Webschicht erkennbar und prüfbar machen.
+
+- Beobachtung, Deutung, Gegen-Deutung und Unsicherheit als klar unterscheidbare Felder absichern
+- Evidenztyp-Auswahl (beobachtungsnah / abgeleitet / spekulativ) in der Fall-Erfassung verankern
+- Fallansicht so gestalten, dass Trennungen auf einen Blick sichtbar sind
+- Quick-Capture-Modus und Tiefenreflexions-Modus unterscheidbar machen (gemäß MASTERPLAN.md §7.1)
+
+### Phase 2b — Explorationsraum
+
+Ziel: Strukturierter Zugang zu Bedürfnissen, Determinanten und Konstellationshinweisen.
+
+- Bedürfnis- und Determinantenkatalog (gemäß UX/UI-Blaupause §6–7)
+- Clusterstruktur für Auswahl und Zuordnung
+- Selektionsfelder für Auslöser, Umweltreaktionen, Interventionen
+- Konstellationsbezug in Fällen als strukturiertes Feld, nicht nur als Freitext
+
+### Phase 3 — Vergleich und Drift
+
+Ziel: Deutungsveränderungen über Zeit sichtbar und klassifizierbar machen.
+
+- Mehrere Denkstände zur selben Person nebeneinander vergleichen
+- Drift-Klassifikation sichtbar machen: durch neue Beobachtung, neue Perspektive oder Neubewertung gleicher Daten entstanden (gemäß MASTERPLAN.md §2 Invariante 21)
+- Einfacher Verlauf je Person mit dokumentierten Revisionen
+
+### Phase 4 — Spannungsnetz und Verdichtung
+
+Ziel: Relationale Sicht und kontrollierte Profilverdichtung.
+
+- Spannungsprofil-Workflow mit Evidenzstufen, Gegenbelegen und Revisionsdatum (gemäß MASTERPLAN.md §3.2)
+- Konstellationsprofil als eigenständiges Objekt mit eigener Verdichtungslogik (gemäß MASTERPLAN.md §3.3)
+- Relationale Ansicht: Wechselwirkungen zwischen Profilen sichtbar machen
+- Vorbereitung auf spätere Konstellationsarbeit (MASTERPLAN.md §3.4)
+
+## 4. Typische Fehlannahmen
+
+- **„Die Webschicht ist der Produktkern"** — Die Webschicht ist Konsumentin des Produktkerns. Guards, Factories und Typen in `src/domain/` bilden die epistemischen Regeln; die Webschicht macht sie klickbar.
+- **„Katalog = automatische Deutung"** — Bedürfnis- und Determinantenkataloge liefern Vokabular zur Auswahl, keine Deutungsautomatik. Deutungen bleiben Pflicht des Nutzers.
+- **„Vergleich = Bewertung"** — Der Vergleich von Denkständen dient der Reflexion, nicht der Bewertung von Personen oder der Erzeugung von Scores.
+- **„Phase 4 ist optional"** — Die Konstellationsanalyse ist Pflichtgegengewicht zur Profilverdichtung (MASTERPLAN.md §4). Sie dient gemäß Masterplan als notwendiges Gegengewicht.
+
+## 5. Klare Abgrenzung
+
+Folgendes ist in keiner der oben genannten Phasen enthalten und bleibt explizit offen:
+
+- **Zentrale Persistenz** — local-first ist der aktuelle Stand; zentralisierte Datenhaltung ist für spätere Phasen vorgesehen (deploy-blaupause §4 Phase 2)
+- **Rollen und Rechte** — das Berechtigungsmodell (MASTERPLAN.md §8) ist konzeptionell beschrieben, aber nicht implementiert
+- **Audit und Exportkontrolle** — keine der aktuellen Phasen implementiert Audit-Trails oder kontrollierte Exportfunktionen
+- **Mehrnutzerfähigkeit** — der aktuelle Stand ist single-user / local-first; Teamnutzung setzt zentrale Infrastruktur voraus
+
+Diese Punkte werden in keiner der oben genannten Phasen still vorausgesetzt oder suggeriert.
diff --git a/package-lock.json b/package-lock.json
index 3ed60f2..e639e80 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -7,60 +7,679 @@
     "": {
       "name": "spannungsatlas",
       "version": "0.1.0",
+      "workspaces": [
+        "apps/web"
+      ],
       "devDependencies": {
         "typescript": "^6.0.2",
         "vitest": "^4.1.2"
+      },
+      "engines": {
+        "node": ">=20.19.0"
+      }
+    },
+    "apps/web": {
+      "name": "@spannungsatlas/web",
+      "version": "0.1.0",
+      "dependencies": {
+        "@sveltejs/adapter-vercel": "^6.3.3",
+        "@sveltejs/kit": "^2.55.0",
+        "svelte": "^5.46.4"
+      },
+      "devDependencies": {
+        "@sveltejs/vite-plugin-svelte": "^7.0.0",
+        "svelte-check": "^4.4.0",
+        "typescript": "^5.7.0",
+        "vite": "^8.0.0"
+      },
+      "engines": {
+        "node": ">=20.19.0"
+      }
+    },
+    "apps/web/node_modules/@sveltejs/adapter-vercel": {
+      "version": "6.3.3",
+      "resolved": "https://registry.npmjs.org/@sveltejs/adapter-vercel/-/adapter-vercel-6.3.3.tgz",
+      "integrity": "sha512-jI7jT/XqRyFe9oqKvFcNPQfyNBi3pXqN1iQXa2lmeKT5Vzgr9iSOqJOD3pXf/9Q2Os6SXzqYYm6osRjHYEhkyw==",
+      "license": "MIT",
+      "dependencies": {
+        "@vercel/nft": "^1.3.2",
+        "esbuild": "^0.25.4"
+      },
+      "engines": {
+        "node": ">=20.0"
+      },
+      "peerDependencies": {
+        "@sveltejs/kit": "^2.4.0"
+      }
+    },
+    "apps/web/node_modules/@sveltejs/kit": {
+      "version": "2.55.0",
+      "resolved": "https://registry.npmjs.org/@sveltejs/kit/-/kit-2.55.0.tgz",
+      "integrity": "sha512-MdFRjevVxmAknf2NbaUkDF16jSIzXMWd4Nfah0Qp8TtQVoSp3bV4jKt8mX7z7qTUTWvgSaxtR0EG5WJf53gcuA==",
+      "license": "MIT",
+      "dependencies": {
+        "@standard-schema/spec": "^1.0.0",
+        "@sveltejs/acorn-typescript": "^1.0.5",
+        "@types/cookie": "^0.6.0",
+        "acorn": "^8.14.1",
+        "cookie": "^0.6.0",
+        "devalue": "^5.6.4",
+        "esm-env": "^1.2.2",
+        "kleur": "^4.1.5",
+        "magic-string": "^0.30.5",
+        "mrmime": "^2.0.0",
+        "set-cookie-parser": "^3.0.0",
+        "sirv": "^3.0.0"
+      },
+      "bin": {
+        "svelte-kit": "svelte-kit.js"
+      },
+      "engines": {
+        "node": ">=18.13"
+      },
+      "peerDependencies": {
+        "@opentelemetry/api": "^1.0.0",
+        "@sveltejs/vite-plugin-svelte": "^3.0.0 || ^4.0.0-next.1 || ^5.0.0 || ^6.0.0-next.0 || ^7.0.0",
+        "svelte": "^4.0.0 || ^5.0.0-next.0",
+        "typescript": "^5.3.3",
+        "vite": "^5.0.3 || ^6.0.0 || ^7.0.0-beta.0 || ^8.0.0"
+      },
+      "peerDependenciesMeta": {
+        "@opentelemetry/api": {
+          "optional": true
+        },
+        "typescript": {
+          "optional": true
+        }
+      }
+    },
+    "apps/web/node_modules/esbuild": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/esbuild/-/esbuild-0.25.12.tgz",
+      "integrity": "sha512-bbPBYYrtZbkt6Os6FiTLCTFxvq4tt3JKall1vRwshA3fdVztsLAatFaZobhkBC8/BrPetoa0oksYoKXoG4ryJg==",
+      "hasInstallScript": true,
+      "license": "MIT",
+      "bin": {
+        "esbuild": "bin/esbuild"
+      },
+      "engines": {
+        "node": ">=18"
+      },
+      "optionalDependencies": {
+        "@esbuild/aix-ppc64": "0.25.12",
+        "@esbuild/android-arm": "0.25.12",
+        "@esbuild/android-arm64": "0.25.12",
+        "@esbuild/android-x64": "0.25.12",
+        "@esbuild/darwin-arm64": "0.25.12",
+        "@esbuild/darwin-x64": "0.25.12",
+        "@esbuild/freebsd-arm64": "0.25.12",
+        "@esbuild/freebsd-x64": "0.25.12",
+        "@esbuild/linux-arm": "0.25.12",
+        "@esbuild/linux-arm64": "0.25.12",
+        "@esbuild/linux-ia32": "0.25.12",
+        "@esbuild/linux-loong64": "0.25.12",
+        "@esbuild/linux-mips64el": "0.25.12",
+        "@esbuild/linux-ppc64": "0.25.12",
+        "@esbuild/linux-riscv64": "0.25.12",
+        "@esbuild/linux-s390x": "0.25.12",
+        "@esbuild/linux-x64": "0.25.12",
+        "@esbuild/netbsd-arm64": "0.25.12",
+        "@esbuild/netbsd-x64": "0.25.12",
+        "@esbuild/openbsd-arm64": "0.25.12",
+        "@esbuild/openbsd-x64": "0.25.12",
+        "@esbuild/openharmony-arm64": "0.25.12",
+        "@esbuild/sunos-x64": "0.25.12",
+        "@esbuild/win32-arm64": "0.25.12",
+        "@esbuild/win32-ia32": "0.25.12",
+        "@esbuild/win32-x64": "0.25.12"
+      }
+    },
+    "apps/web/node_modules/typescript": {
+      "version": "5.9.3",
+      "resolved": "https://registry.npmjs.org/typescript/-/typescript-5.9.3.tgz",
+      "integrity": "sha512-jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw==",
+      "devOptional": true,
+      "license": "Apache-2.0",
+      "bin": {
+        "tsc": "bin/tsc",
+        "tsserver": "bin/tsserver"
+      },
+      "engines": {
+        "node": ">=14.17"
+      }
+    },
+    "node_modules/@emnapi/core": {
+      "version": "1.9.1",
+      "resolved": "https://registry.npmjs.org/@emnapi/core/-/core-1.9.1.tgz",
+      "integrity": "sha512-mukuNALVsoix/w1BJwFzwXBN/dHeejQtuVzcDsfOEsdpCumXb/E9j8w11h5S54tT1xhifGfbbSm/ICrObRb3KA==",
+      "license": "MIT",
+      "optional": true,
+      "peer": true,
+      "dependencies": {
+        "@emnapi/wasi-threads": "1.2.0",
+        "tslib": "^2.4.0"
+      }
+    },
+    "node_modules/@emnapi/runtime": {
+      "version": "1.9.1",
+      "resolved": "https://registry.npmjs.org/@emnapi/runtime/-/runtime-1.9.1.tgz",
+      "integrity": "sha512-VYi5+ZVLhpgK4hQ0TAjiQiZ6ol0oe4mBx7mVv7IflsiEp0OWoVsp/+f9Vc1hOhE0TtkORVrI1GvzyreqpgWtkA==",
+      "license": "MIT",
+      "optional": true,
+      "peer": true,
+      "dependencies": {
+        "tslib": "^2.4.0"
+      }
+    },
+    "node_modules/@emnapi/wasi-threads": {
+      "version": "1.2.0",
+      "resolved": "https://registry.npmjs.org/@emnapi/wasi-threads/-/wasi-threads-1.2.0.tgz",
+      "integrity": "sha512-N10dEJNSsUx41Z6pZsXU8FjPjpBEplgH24sfkmITrBED1/U2Esum9F3lfLrMjKHHjmi557zQn7kR9R+XWXu5Rg==",
+      "license": "MIT",
+      "optional": true,
+      "peer": true,
+      "dependencies": {
+        "tslib": "^2.4.0"
+      }
+    },
+    "node_modules/@esbuild/aix-ppc64": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/aix-ppc64/-/aix-ppc64-0.25.12.tgz",
+      "integrity": "sha512-Hhmwd6CInZ3dwpuGTF8fJG6yoWmsToE+vYgD4nytZVxcu1ulHpUQRAB1UJ8+N1Am3Mz4+xOByoQoSZf4D+CpkA==",
+      "cpu": [
+        "ppc64"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "aix"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/android-arm": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/android-arm/-/android-arm-0.25.12.tgz",
+      "integrity": "sha512-VJ+sKvNA/GE7Ccacc9Cha7bpS8nyzVv0jdVgwNDaR4gDMC/2TTRc33Ip8qrNYUcpkOHUT5OZ0bUcNNVZQ9RLlg==",
+      "cpu": [
+        "arm"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "android"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/android-arm64": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/android-arm64/-/android-arm64-0.25.12.tgz",
+      "integrity": "sha512-6AAmLG7zwD1Z159jCKPvAxZd4y/VTO0VkprYy+3N2FtJ8+BQWFXU+OxARIwA46c5tdD9SsKGZ/1ocqBS/gAKHg==",
+      "cpu": [
+        "arm64"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "android"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/android-x64": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/android-x64/-/android-x64-0.25.12.tgz",
+      "integrity": "sha512-5jbb+2hhDHx5phYR2By8GTWEzn6I9UqR11Kwf22iKbNpYrsmRB18aX/9ivc5cabcUiAT/wM+YIZ6SG9QO6a8kg==",
+      "cpu": [
+        "x64"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "android"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/darwin-arm64": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/darwin-arm64/-/darwin-arm64-0.25.12.tgz",
+      "integrity": "sha512-N3zl+lxHCifgIlcMUP5016ESkeQjLj/959RxxNYIthIg+CQHInujFuXeWbWMgnTo4cp5XVHqFPmpyu9J65C1Yg==",
+      "cpu": [
+        "arm64"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "darwin"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/darwin-x64": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/darwin-x64/-/darwin-x64-0.25.12.tgz",
+      "integrity": "sha512-HQ9ka4Kx21qHXwtlTUVbKJOAnmG1ipXhdWTmNXiPzPfWKpXqASVcWdnf2bnL73wgjNrFXAa3yYvBSd9pzfEIpA==",
+      "cpu": [
+        "x64"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "darwin"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/freebsd-arm64": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-arm64/-/freebsd-arm64-0.25.12.tgz",
+      "integrity": "sha512-gA0Bx759+7Jve03K1S0vkOu5Lg/85dou3EseOGUes8flVOGxbhDDh/iZaoek11Y8mtyKPGF3vP8XhnkDEAmzeg==",
+      "cpu": [
+        "arm64"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "freebsd"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/freebsd-x64": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/freebsd-x64/-/freebsd-x64-0.25.12.tgz",
+      "integrity": "sha512-TGbO26Yw2xsHzxtbVFGEXBFH0FRAP7gtcPE7P5yP7wGy7cXK2oO7RyOhL5NLiqTlBh47XhmIUXuGciXEqYFfBQ==",
+      "cpu": [
+        "x64"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "freebsd"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/linux-arm": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm/-/linux-arm-0.25.12.tgz",
+      "integrity": "sha512-lPDGyC1JPDou8kGcywY0YILzWlhhnRjdof3UlcoqYmS9El818LLfJJc3PXXgZHrHCAKs/Z2SeZtDJr5MrkxtOw==",
+      "cpu": [
+        "arm"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "linux"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/linux-arm64": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/linux-arm64/-/linux-arm64-0.25.12.tgz",
+      "integrity": "sha512-8bwX7a8FghIgrupcxb4aUmYDLp8pX06rGh5HqDT7bB+8Rdells6mHvrFHHW2JAOPZUbnjUpKTLg6ECyzvas2AQ==",
+      "cpu": [
+        "arm64"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "linux"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/linux-ia32": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/linux-ia32/-/linux-ia32-0.25.12.tgz",
+      "integrity": "sha512-0y9KrdVnbMM2/vG8KfU0byhUN+EFCny9+8g202gYqSSVMonbsCfLjUO+rCci7pM0WBEtz+oK/PIwHkzxkyharA==",
+      "cpu": [
+        "ia32"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "linux"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/linux-loong64": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/linux-loong64/-/linux-loong64-0.25.12.tgz",
+      "integrity": "sha512-h///Lr5a9rib/v1GGqXVGzjL4TMvVTv+s1DPoxQdz7l/AYv6LDSxdIwzxkrPW438oUXiDtwM10o9PmwS/6Z0Ng==",
+      "cpu": [
+        "loong64"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "linux"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/linux-mips64el": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/linux-mips64el/-/linux-mips64el-0.25.12.tgz",
+      "integrity": "sha512-iyRrM1Pzy9GFMDLsXn1iHUm18nhKnNMWscjmp4+hpafcZjrr2WbT//d20xaGljXDBYHqRcl8HnxbX6uaA/eGVw==",
+      "cpu": [
+        "mips64el"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "linux"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/linux-ppc64": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/linux-ppc64/-/linux-ppc64-0.25.12.tgz",
+      "integrity": "sha512-9meM/lRXxMi5PSUqEXRCtVjEZBGwB7P/D4yT8UG/mwIdze2aV4Vo6U5gD3+RsoHXKkHCfSxZKzmDssVlRj1QQA==",
+      "cpu": [
+        "ppc64"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "linux"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/linux-riscv64": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/linux-riscv64/-/linux-riscv64-0.25.12.tgz",
+      "integrity": "sha512-Zr7KR4hgKUpWAwb1f3o5ygT04MzqVrGEGXGLnj15YQDJErYu/BGg+wmFlIDOdJp0PmB0lLvxFIOXZgFRrdjR0w==",
+      "cpu": [
+        "riscv64"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "linux"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/linux-s390x": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/linux-s390x/-/linux-s390x-0.25.12.tgz",
+      "integrity": "sha512-MsKncOcgTNvdtiISc/jZs/Zf8d0cl/t3gYWX8J9ubBnVOwlk65UIEEvgBORTiljloIWnBzLs4qhzPkJcitIzIg==",
+      "cpu": [
+        "s390x"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "linux"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/linux-x64": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/linux-x64/-/linux-x64-0.25.12.tgz",
+      "integrity": "sha512-uqZMTLr/zR/ed4jIGnwSLkaHmPjOjJvnm6TVVitAa08SLS9Z0VM8wIRx7gWbJB5/J54YuIMInDquWyYvQLZkgw==",
+      "cpu": [
+        "x64"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "linux"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/netbsd-arm64": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-arm64/-/netbsd-arm64-0.25.12.tgz",
+      "integrity": "sha512-xXwcTq4GhRM7J9A8Gv5boanHhRa/Q9KLVmcyXHCTaM4wKfIpWkdXiMog/KsnxzJ0A1+nD+zoecuzqPmCRyBGjg==",
+      "cpu": [
+        "arm64"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "netbsd"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/netbsd-x64": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/netbsd-x64/-/netbsd-x64-0.25.12.tgz",
+      "integrity": "sha512-Ld5pTlzPy3YwGec4OuHh1aCVCRvOXdH8DgRjfDy/oumVovmuSzWfnSJg+VtakB9Cm0gxNO9BzWkj6mtO1FMXkQ==",
+      "cpu": [
+        "x64"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "netbsd"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/openbsd-arm64": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-arm64/-/openbsd-arm64-0.25.12.tgz",
+      "integrity": "sha512-fF96T6KsBo/pkQI950FARU9apGNTSlZGsv1jZBAlcLL1MLjLNIWPBkj5NlSz8aAzYKg+eNqknrUJ24QBybeR5A==",
+      "cpu": [
+        "arm64"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "openbsd"
+      ],
+      "engines": {
+        "node": ">=18"
       }
     },
-    "node_modules/@emnapi/core": {
-      "version": "1.9.1",
-      "resolved": "https://registry.npmjs.org/@emnapi/core/-/core-1.9.1.tgz",
-      "integrity": "sha512-mukuNALVsoix/w1BJwFzwXBN/dHeejQtuVzcDsfOEsdpCumXb/E9j8w11h5S54tT1xhifGfbbSm/ICrObRb3KA==",
-      "dev": true,
+    "node_modules/@esbuild/openbsd-x64": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/openbsd-x64/-/openbsd-x64-0.25.12.tgz",
+      "integrity": "sha512-MZyXUkZHjQxUvzK7rN8DJ3SRmrVrke8ZyRusHlP+kuwqTcfWLyqMOE3sScPPyeIXN/mDJIfGXvcMqCgYKekoQw==",
+      "cpu": [
+        "x64"
+      ],
       "license": "MIT",
       "optional": true,
-      "peer": true,
-      "dependencies": {
-        "@emnapi/wasi-threads": "1.2.0",
-        "tslib": "^2.4.0"
+      "os": [
+        "openbsd"
+      ],
+      "engines": {
+        "node": ">=18"
       }
     },
-    "node_modules/@emnapi/runtime": {
-      "version": "1.9.1",
-      "resolved": "https://registry.npmjs.org/@emnapi/runtime/-/runtime-1.9.1.tgz",
-      "integrity": "sha512-VYi5+ZVLhpgK4hQ0TAjiQiZ6ol0oe4mBx7mVv7IflsiEp0OWoVsp/+f9Vc1hOhE0TtkORVrI1GvzyreqpgWtkA==",
-      "dev": true,
+    "node_modules/@esbuild/openharmony-arm64": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/openharmony-arm64/-/openharmony-arm64-0.25.12.tgz",
+      "integrity": "sha512-rm0YWsqUSRrjncSXGA7Zv78Nbnw4XL6/dzr20cyrQf7ZmRcsovpcRBdhD43Nuk3y7XIoW2OxMVvwuRvk9XdASg==",
+      "cpu": [
+        "arm64"
+      ],
       "license": "MIT",
       "optional": true,
-      "peer": true,
-      "dependencies": {
-        "tslib": "^2.4.0"
+      "os": [
+        "openharmony"
+      ],
+      "engines": {
+        "node": ">=18"
       }
     },
-    "node_modules/@emnapi/wasi-threads": {
-      "version": "1.2.0",
-      "resolved": "https://registry.npmjs.org/@emnapi/wasi-threads/-/wasi-threads-1.2.0.tgz",
-      "integrity": "sha512-N10dEJNSsUx41Z6pZsXU8FjPjpBEplgH24sfkmITrBED1/U2Esum9F3lfLrMjKHHjmi557zQn7kR9R+XWXu5Rg==",
-      "dev": true,
+    "node_modules/@esbuild/sunos-x64": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/sunos-x64/-/sunos-x64-0.25.12.tgz",
+      "integrity": "sha512-3wGSCDyuTHQUzt0nV7bocDy72r2lI33QL3gkDNGkod22EsYl04sMf0qLb8luNKTOmgF/eDEDP5BFNwoBKH441w==",
+      "cpu": [
+        "x64"
+      ],
       "license": "MIT",
       "optional": true,
-      "peer": true,
+      "os": [
+        "sunos"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/win32-arm64": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/win32-arm64/-/win32-arm64-0.25.12.tgz",
+      "integrity": "sha512-rMmLrur64A7+DKlnSuwqUdRKyd3UE7oPJZmnljqEptesKM8wx9J8gx5u0+9Pq0fQQW8vqeKebwNXdfOyP+8Bsg==",
+      "cpu": [
+        "arm64"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "win32"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/win32-ia32": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/win32-ia32/-/win32-ia32-0.25.12.tgz",
+      "integrity": "sha512-HkqnmmBoCbCwxUKKNPBixiWDGCpQGVsrQfJoVGYLPT41XWF8lHuE5N6WhVia2n4o5QK5M4tYr21827fNhi4byQ==",
+      "cpu": [
+        "ia32"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "win32"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@esbuild/win32-x64": {
+      "version": "0.25.12",
+      "resolved": "https://registry.npmjs.org/@esbuild/win32-x64/-/win32-x64-0.25.12.tgz",
+      "integrity": "sha512-alJC0uCZpTFrSL0CCDjcgleBXPnCrEAhTBILpeAp7M/OFgoqtAetfBzX0xM00MUsVVPpVjlPuMbREqnZCXaTnA==",
+      "cpu": [
+        "x64"
+      ],
+      "license": "MIT",
+      "optional": true,
+      "os": [
+        "win32"
+      ],
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/@isaacs/fs-minipass": {
+      "version": "4.0.1",
+      "resolved": "https://registry.npmjs.org/@isaacs/fs-minipass/-/fs-minipass-4.0.1.tgz",
+      "integrity": "sha512-wgm9Ehl2jpeqP3zw/7mo3kRHFp5MEDhqAdwy1fTGkHAwnkGOVsgpvQhL8B5n1qlb01jV3n/bI0ZfZp5lWA1k4w==",
+      "license": "ISC",
       "dependencies": {
-        "tslib": "^2.4.0"
+        "minipass": "^7.0.4"
+      },
+      "engines": {
+        "node": ">=18.0.0"
+      }
+    },
+    "node_modules/@jridgewell/gen-mapping": {
+      "version": "0.3.13",
+      "resolved": "https://registry.npmjs.org/@jridgewell/gen-mapping/-/gen-mapping-0.3.13.tgz",
+      "integrity": "sha512-2kkt/7niJ6MgEPxF0bYdQ6etZaA+fQvDcLKckhy1yIQOzaoKjBBjSj63/aLVjYE3qhRt5dvM+uUyfCg6UKCBbA==",
+      "license": "MIT",
+      "dependencies": {
+        "@jridgewell/sourcemap-codec": "^1.5.0",
+        "@jridgewell/trace-mapping": "^0.3.24"
+      }
+    },
+    "node_modules/@jridgewell/remapping": {
+      "version": "2.3.5",
+      "resolved": "https://registry.npmjs.org/@jridgewell/remapping/-/remapping-2.3.5.tgz",
+      "integrity": "sha512-LI9u/+laYG4Ds1TDKSJW2YPrIlcVYOwi2fUC6xB43lueCjgxV4lffOCZCtYFiH6TNOX+tQKXx97T4IKHbhyHEQ==",
+      "license": "MIT",
+      "dependencies": {
+        "@jridgewell/gen-mapping": "^0.3.5",
+        "@jridgewell/trace-mapping": "^0.3.24"
+      }
+    },
+    "node_modules/@jridgewell/resolve-uri": {
+      "version": "3.1.2",
+      "resolved": "https://registry.npmjs.org/@jridgewell/resolve-uri/-/resolve-uri-3.1.2.tgz",
+      "integrity": "sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==",
+      "license": "MIT",
+      "engines": {
+        "node": ">=6.0.0"
       }
     },
     "node_modules/@jridgewell/sourcemap-codec": {
       "version": "1.5.5",
       "resolved": "https://registry.npmjs.org/@jridgewell/sourcemap-codec/-/sourcemap-codec-1.5.5.tgz",
       "integrity": "sha512-cYQ9310grqxueWbl+WuIUIaiUaDcj7WOq5fVhEljNVgRfOUhY9fy2zTvfoqWsnebh8Sl70VScFbICvJnLKB0Og==",
-      "dev": true,
       "license": "MIT"
     },
+    "node_modules/@jridgewell/trace-mapping": {
+      "version": "0.3.31",
+      "resolved": "https://registry.npmjs.org/@jridgewell/trace-mapping/-/trace-mapping-0.3.31.tgz",
+      "integrity": "sha512-zzNR+SdQSDJzc8joaeP8QQoCQr8NuYx2dIIytl1QeBEZHJ9uW6hebsrYgbz8hJwUQao3TWCMtmfV8Nu1twOLAw==",
+      "license": "MIT",
+      "dependencies": {
+        "@jridgewell/resolve-uri": "^3.1.0",
+        "@jridgewell/sourcemap-codec": "^1.4.14"
+      }
+    },
+    "node_modules/@mapbox/node-pre-gyp": {
+      "version": "2.0.3",
+      "resolved": "https://registry.npmjs.org/@mapbox/node-pre-gyp/-/node-pre-gyp-2.0.3.tgz",
+      "integrity": "sha512-uwPAhccfFJlsfCxMYTwOdVfOz3xqyj8xYL3zJj8f0pb30tLohnnFPhLuqp4/qoEz8sNxe4SESZedcBojRefIzg==",
+      "license": "BSD-3-Clause",
+      "dependencies": {
+        "consola": "^3.2.3",
+        "detect-libc": "^2.0.0",
+        "https-proxy-agent": "^7.0.5",
+        "node-fetch": "^2.6.7",
+        "nopt": "^8.0.0",
+        "semver": "^7.5.3",
+        "tar": "^7.4.0"
+      },
+      "bin": {
+        "node-pre-gyp": "bin/node-pre-gyp"
+      },
+      "engines": {
+        "node": ">=18"
+      }
+    },
     "node_modules/@napi-rs/wasm-runtime": {
       "version": "1.1.2",
       "resolved": "https://registry.npmjs.org/@napi-rs/wasm-runtime/-/wasm-runtime-1.1.2.tgz",
       "integrity": "sha512-sNXv5oLJ7ob93xkZ1XnxisYhGYXfaG9f65/ZgYuAu3qt7b3NadcOEhLvx28hv31PgX8SZJRYrAIPQilQmFpLVw==",
-      "dev": true,
       "license": "MIT",
       "optional": true,
       "dependencies": {
@@ -79,12 +698,17 @@
       "version": "0.122.0",
       "resolved": "https://registry.npmjs.org/@oxc-project/types/-/types-0.122.0.tgz",
       "integrity": "sha512-oLAl5kBpV4w69UtFZ9xqcmTi+GENWOcPF7FCrczTiBbmC0ibXxCwyvZGbO39rCVEuLGAZM84DH0pUIyyv/YJzA==",
-      "dev": true,
       "license": "MIT",
       "funding": {
         "url": "https://github.com/sponsors/Boshen"
       }
     },
+    "node_modules/@polka/url": {
+      "version": "1.0.0-next.29",
+      "resolved": "https://registry.npmjs.org/@polka/url/-/url-1.0.0-next.29.tgz",
+      "integrity": "sha512-wwQAWhWSuHaag8c4q/KN/vCoeOJYshAIvMQwD4GpSb3OiZklFfvAgmj0VCBBImRpuF/aFgIRzllXlVX93Jevww==",
+      "license": "MIT"
+    },
     "node_modules/@rolldown/binding-android-arm64": {
       "version": "1.0.0-rc.12",
       "resolved": "https://registry.npmjs.org/@rolldown/binding-android-arm64/-/binding-android-arm64-1.0.0-rc.12.tgz",
@@ -92,7 +716,6 @@
       "cpu": [
         "arm64"
       ],
-      "dev": true,
       "license": "MIT",
       "optional": true,
       "os": [
@@ -109,7 +732,6 @@
       "cpu": [
         "arm64"
       ],
-      "dev": true,
       "license": "MIT",
       "optional": true,
       "os": [
@@ -126,7 +748,6 @@
       "cpu": [
         "x64"
       ],
-      "dev": true,
       "license": "MIT",
       "optional": true,
       "os": [
@@ -143,7 +764,6 @@
       "cpu": [
         "x64"
       ],
-      "dev": true,
       "license": "MIT",
       "optional": true,
       "os": [
@@ -160,7 +780,6 @@
       "cpu": [
         "arm"
       ],
-      "dev": true,
       "license": "MIT",
       "optional": true,
       "os": [
@@ -177,7 +796,6 @@
       "cpu": [
         "arm64"
       ],
-      "dev": true,
       "license": "MIT",
       "optional": true,
       "os": [
@@ -194,7 +812,6 @@
       "cpu": [
         "arm64"
       ],
-      "dev": true,
       "license": "MIT",
       "optional": true,
       "os": [
@@ -211,7 +828,6 @@
       "cpu": [
         "ppc64"
       ],
-      "dev": true,
       "license": "MIT",
       "optional": true,
       "os": [
@@ -228,7 +844,6 @@
       "cpu": [
         "s390x"
       ],
-      "dev": true,
       "license": "MIT",
       "optional": true,
       "os": [
@@ -245,7 +860,6 @@
       "cpu": [
         "x64"
       ],
-      "dev": true,
       "license": "MIT",
       "optional": true,
       "os": [
@@ -262,7 +876,6 @@
       "cpu": [
         "x64"
       ],
-      "dev": true,
       "license": "MIT",
       "optional": true,
       "os": [
@@ -279,7 +892,6 @@
       "cpu": [
         "arm64"
       ],
-      "dev": true,
       "license": "MIT",
       "optional": true,
       "os": [
@@ -296,7 +908,6 @@
       "cpu": [
         "wasm32"
       ],
-      "dev": true,
       "license": "MIT",
       "optional": true,
       "dependencies": {
@@ -313,7 +924,6 @@
       "cpu": [
         "arm64"
       ],
-      "dev": true,
       "license": "MIT",
       "optional": true,
       "os": [
@@ -330,7 +940,6 @@
       "cpu": [
         "x64"
       ],
-      "dev": true,
       "license": "MIT",
       "optional": true,
       "os": [
@@ -344,21 +953,78 @@
       "version": "1.0.0-rc.12",
       "resolved": "https://registry.npmjs.org/@rolldown/pluginutils/-/pluginutils-1.0.0-rc.12.tgz",
       "integrity": "sha512-HHMwmarRKvoFsJorqYlFeFRzXZqCt2ETQlEDOb9aqssrnVBB1/+xgTGtuTrIk5vzLNX1MjMtTf7W9z3tsSbrxw==",
-      "dev": true,
       "license": "MIT"
     },
+    "node_modules/@rollup/pluginutils": {
+      "version": "5.3.0",
+      "resolved": "https://registry.npmjs.org/@rollup/pluginutils/-/pluginutils-5.3.0.tgz",
+      "integrity": "sha512-5EdhGZtnu3V88ces7s53hhfK5KSASnJZv8Lulpc04cWO3REESroJXg73DFsOmgbU2BhwV0E20bu2IDZb3VKW4Q==",
+      "license": "MIT",
+      "dependencies": {
+        "@types/estree": "^1.0.0",
+        "estree-walker": "^2.0.2",
+        "picomatch": "^4.0.2"
+      },
+      "engines": {
+        "node": ">=14.0.0"
+      },
+      "peerDependencies": {
+        "rollup": "^1.20.0||^2.0.0||^3.0.0||^4.0.0"
+      },
+      "peerDependenciesMeta": {
+        "rollup": {
+          "optional": true
+        }
+      }
+    },
+    "node_modules/@rollup/pluginutils/node_modules/estree-walker": {
+      "version": "2.0.2",
+      "resolved": "https://registry.npmjs.org/estree-walker/-/estree-walker-2.0.2.tgz",
+      "integrity": "sha512-Rfkk/Mp/DL7JVje3u18FxFujQlTNR2q6QfMSMB7AvCBx91NGj/ba3kCfza0f6dVDbw7YlRf/nDrn7pQrCCyQ/w==",
+      "license": "MIT"
+    },
+    "node_modules/@spannungsatlas/web": {
+      "resolved": "apps/web",
+      "link": true
+    },
     "node_modules/@standard-schema/spec": {
       "version": "1.1.0",
       "resolved": "https://registry.npmjs.org/@standard-schema/spec/-/spec-1.1.0.tgz",
       "integrity": "sha512-l2aFy5jALhniG5HgqrD6jXLi/rUWrKvqN/qJx6yoJsgKhblVd+iqqU4RCXavm/jPityDo5TCvKMnpjKnOriy0w==",
-      "dev": true,
       "license": "MIT"
     },
+    "node_modules/@sveltejs/acorn-typescript": {
+      "version": "1.0.9",
+      "resolved": "https://registry.npmjs.org/@sveltejs/acorn-typescript/-/acorn-typescript-1.0.9.tgz",
+      "integrity": "sha512-lVJX6qEgs/4DOcRTpo56tmKzVPtoWAaVbL4hfO7t7NVwl9AAXzQR6cihesW1BmNMPl+bK6dreu2sOKBP2Q9CIA==",
+      "license": "MIT",
+      "peerDependencies": {
+        "acorn": "^8.9.0"
+      }
+    },
+    "node_modules/@sveltejs/vite-plugin-svelte": {
+      "version": "7.0.0",
+      "resolved": "https://registry.npmjs.org/@sveltejs/vite-plugin-svelte/-/vite-plugin-svelte-7.0.0.tgz",
+      "integrity": "sha512-ILXmxC7HAsnkK2eslgPetrqqW1BKSL7LktsFgqzNj83MaivMGZzluWq32m25j2mDOjmSKX7GGWahePhuEs7P/g==",
+      "license": "MIT",
+      "dependencies": {
+        "deepmerge": "^4.3.1",
+        "magic-string": "^0.30.21",
+        "obug": "^2.1.0",
+        "vitefu": "^1.1.2"
+      },
+      "engines": {
+        "node": "^20.19 || ^22.12 || >=24"
+      },
+      "peerDependencies": {
+        "svelte": "^5.46.4",
+        "vite": "^8.0.0-beta.7 || ^8.0.0"
+      }
+    },
     "node_modules/@tybys/wasm-util": {
       "version": "0.10.1",
       "resolved": "https://registry.npmjs.org/@tybys/wasm-util/-/wasm-util-0.10.1.tgz",
       "integrity": "sha512-9tTaPJLSiejZKx+Bmog4uSubteqTvFrVrURwkmHixBo0G4seD0zUxp98E1DzUBJxLQ3NPwXrGKDiVjwx/DpPsg==",
-      "dev": true,
       "license": "MIT",
       "optional": true,
       "dependencies": {
@@ -376,6 +1042,12 @@
         "assertion-error": "^2.0.1"
       }
     },
+    "node_modules/@types/cookie": {
+      "version": "0.6.0",
+      "resolved": "https://registry.npmjs.org/@types/cookie/-/cookie-0.6.0.tgz",
+      "integrity": "sha512-4Kh9a6B2bQciAhf7FSuMRRkUWecJgJu9nPnx3yzpsfXX/c50REIqpHY4C82bXP90qrLtXtkDxTZosYO3UpOwlA==",
+      "license": "MIT"
+    },
     "node_modules/@types/deep-eql": {
       "version": "4.0.2",
       "resolved": "https://registry.npmjs.org/@types/deep-eql/-/deep-eql-4.0.2.tgz",
@@ -387,7 +1059,57 @@
       "version": "1.0.8",
       "resolved": "https://registry.npmjs.org/@types/estree/-/estree-1.0.8.tgz",
       "integrity": "sha512-dWHzHa2WqEXI/O1E9OjrocMTKJl2mSrEolh1Iomrv6U+JuNwaHXsXx9bLu5gG7BUWFIN0skIQJQ/L1rIex4X6w==",
-      "dev": true,
+      "license": "MIT"
+    },
+    "node_modules/@types/trusted-types": {
+      "version": "2.0.7",
+      "resolved": "https://registry.npmjs.org/@types/trusted-types/-/trusted-types-2.0.7.tgz",
+      "integrity": "sha512-ScaPdn1dQczgbl0QFTeTOmVHFULt394XJgOQNoyVhZ6r2vLnMLJfBPd53SB52T/3G36VI1/g2MZaX0cwDuXsfw==",
+      "license": "MIT"
+    },
+    "node_modules/@typescript-eslint/types": {
+      "version": "8.57.2",
+      "resolved": "https://registry.npmjs.org/@typescript-eslint/types/-/types-8.57.2.tgz",
+      "integrity": "sha512-/iZM6FnM4tnx9csuTxspMW4BOSegshwX5oBDznJ7S4WggL7Vczz5d2W11ecc4vRrQMQHXRSxzrCsyG5EsPPTbA==",
+      "license": "MIT",
+      "engines": {
+        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
+      },
+      "funding": {
+        "type": "opencollective",
+        "url": "https://opencollective.com/typescript-eslint"
+      }
+    },
+    "node_modules/@vercel/nft": {
+      "version": "1.5.0",
+      "resolved": "https://registry.npmjs.org/@vercel/nft/-/nft-1.5.0.tgz",
+      "integrity": "sha512-IWTDeIoWhQ7ZtRO/JRKH+jhmeQvZYhtGPmzw/QGDY+wDCQqfm25P9yIdoAFagu4fWsK4IwZXDFIjrmp5rRm/sA==",
+      "license": "MIT",
+      "dependencies": {
+        "@mapbox/node-pre-gyp": "^2.0.0",
+        "@rollup/pluginutils": "^5.1.3",
+        "acorn": "^8.6.0",
+        "acorn-import-attributes": "^1.9.5",
+        "async-sema": "^3.1.1",
+        "bindings": "^1.4.0",
+        "estree-walker": "2.0.2",
+        "glob": "^13.0.0",
+        "graceful-fs": "^4.2.9",
+        "node-gyp-build": "^4.2.2",
+        "picomatch": "^4.0.2",
+        "resolve-from": "^5.0.0"
+      },
+      "bin": {
+        "nft": "out/cli.js"
+      },
+      "engines": {
+        "node": ">=20"
+      }
+    },
+    "node_modules/@vercel/nft/node_modules/estree-walker": {
+      "version": "2.0.2",
+      "resolved": "https://registry.npmjs.org/estree-walker/-/estree-walker-2.0.2.tgz",
+      "integrity": "sha512-Rfkk/Mp/DL7JVje3u18FxFujQlTNR2q6QfMSMB7AvCBx91NGj/ba3kCfza0f6dVDbw7YlRf/nDrn7pQrCCyQ/w==",
       "license": "MIT"
     },
     "node_modules/@vitest/expect": {
@@ -495,32 +1217,168 @@
       "dev": true,
       "license": "MIT",
       "dependencies": {
-        "@vitest/pretty-format": "4.1.2",
-        "convert-source-map": "^2.0.0",
-        "tinyrainbow": "^3.1.0"
+        "@vitest/pretty-format": "4.1.2",
+        "convert-source-map": "^2.0.0",
+        "tinyrainbow": "^3.1.0"
+      },
+      "funding": {
+        "url": "https://opencollective.com/vitest"
+      }
+    },
+    "node_modules/abbrev": {
+      "version": "3.0.1",
+      "resolved": "https://registry.npmjs.org/abbrev/-/abbrev-3.0.1.tgz",
+      "integrity": "sha512-AO2ac6pjRB3SJmGJo+v5/aK6Omggp6fsLrs6wN9bd35ulu4cCwaAU9+7ZhXjeqHVkaHThLuzH0nZr0YpCDhygg==",
+      "license": "ISC",
+      "engines": {
+        "node": "^18.17.0 || >=20.5.0"
+      }
+    },
+    "node_modules/acorn": {
+      "version": "8.16.0",
+      "resolved": "https://registry.npmjs.org/acorn/-/acorn-8.16.0.tgz",
+      "integrity": "sha512-UVJyE9MttOsBQIDKw1skb9nAwQuR5wuGD3+82K6JgJlm/Y+KI92oNsMNGZCYdDsVtRHSak0pcV5Dno5+4jh9sw==",
+      "license": "MIT",
+      "bin": {
+        "acorn": "bin/acorn"
+      },
+      "engines": {
+        "node": ">=0.4.0"
+      }
+    },
+    "node_modules/acorn-import-attributes": {
+      "version": "1.9.5",
+      "resolved": "https://registry.npmjs.org/acorn-import-attributes/-/acorn-import-attributes-1.9.5.tgz",
+      "integrity": "sha512-n02Vykv5uA3eHGM/Z2dQrcD56kL8TyDb2p1+0P83PClMnC/nc+anbQRhIOWnSq4Ke/KvDPrY3C9hDtC/A3eHnQ==",
+      "license": "MIT",
+      "peerDependencies": {
+        "acorn": "^8"
+      }
+    },
+    "node_modules/agent-base": {
+      "version": "7.1.4",
+      "resolved": "https://registry.npmjs.org/agent-base/-/agent-base-7.1.4.tgz",
+      "integrity": "sha512-MnA+YT8fwfJPgBx3m60MNqakm30XOkyIoH1y6huTQvC0PwZG7ki8NacLBcrPbNoo8vEZy7Jpuk7+jMO+CUovTQ==",
+      "license": "MIT",
+      "engines": {
+        "node": ">= 14"
+      }
+    },
+    "node_modules/aria-query": {
+      "version": "5.3.1",
+      "resolved": "https://registry.npmjs.org/aria-query/-/aria-query-5.3.1.tgz",
+      "integrity": "sha512-Z/ZeOgVl7bcSYZ/u/rh0fOpvEpq//LZmdbkXyc7syVzjPAhfOa9ebsdTSjEBDU4vs5nC98Kfduj1uFo0qyET3g==",
+      "license": "Apache-2.0",
+      "engines": {
+        "node": ">= 0.4"
+      }
+    },
+    "node_modules/assertion-error": {
+      "version": "2.0.1",
+      "resolved": "https://registry.npmjs.org/assertion-error/-/assertion-error-2.0.1.tgz",
+      "integrity": "sha512-Izi8RQcffqCeNVgFigKli1ssklIbpHnCYc6AknXGYoB6grJqyeby7jv12JUQgmTAnIDnbck1uxksT4dzN3PWBA==",
+      "dev": true,
+      "license": "MIT",
+      "engines": {
+        "node": ">=12"
+      }
+    },
+    "node_modules/async-sema": {
+      "version": "3.1.1",
+      "resolved": "https://registry.npmjs.org/async-sema/-/async-sema-3.1.1.tgz",
+      "integrity": "sha512-tLRNUXati5MFePdAk8dw7Qt7DpxPB60ofAgn8WRhW6a2rcimZnYBP9oxHiv0OHy+Wz7kPMG+t4LGdt31+4EmGg==",
+      "license": "MIT"
+    },
+    "node_modules/axobject-query": {
+      "version": "4.1.0",
+      "resolved": "https://registry.npmjs.org/axobject-query/-/axobject-query-4.1.0.tgz",
+      "integrity": "sha512-qIj0G9wZbMGNLjLmg1PT6v2mE9AH2zlnADJD/2tC6E00hgmhUOfEB6greHPAfLRSufHqROIUTkw6E+M3lH0PTQ==",
+      "license": "Apache-2.0",
+      "engines": {
+        "node": ">= 0.4"
+      }
+    },
+    "node_modules/balanced-match": {
+      "version": "4.0.4",
+      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-4.0.4.tgz",
+      "integrity": "sha512-BLrgEcRTwX2o6gGxGOCNyMvGSp35YofuYzw9h1IMTRmKqttAZZVU67bdb9Pr2vUHA8+j3i2tJfjO6C6+4myGTA==",
+      "license": "MIT",
+      "engines": {
+        "node": "18 || 20 || >=22"
+      }
+    },
+    "node_modules/bindings": {
+      "version": "1.5.0",
+      "resolved": "https://registry.npmjs.org/bindings/-/bindings-1.5.0.tgz",
+      "integrity": "sha512-p2q/t/mhvuOj/UeLlV6566GD/guowlr0hHxClI0W9m7MWYkL1F0hLo+0Aexs9HSPCtR1SXQ0TD3MMKrXZajbiQ==",
+      "license": "MIT",
+      "dependencies": {
+        "file-uri-to-path": "1.0.0"
+      }
+    },
+    "node_modules/brace-expansion": {
+      "version": "5.0.5",
+      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-5.0.5.tgz",
+      "integrity": "sha512-VZznLgtwhn+Mact9tfiwx64fA9erHH/MCXEUfB/0bX/6Fz6ny5EGTXYltMocqg4xFAQZtnO3DHWWXi8RiuN7cQ==",
+      "license": "MIT",
+      "dependencies": {
+        "balanced-match": "^4.0.2"
+      },
+      "engines": {
+        "node": "18 || 20 || >=22"
+      }
+    },
+    "node_modules/chai": {
+      "version": "6.2.2",
+      "resolved": "https://registry.npmjs.org/chai/-/chai-6.2.2.tgz",
+      "integrity": "sha512-NUPRluOfOiTKBKvWPtSD4PhFvWCqOi0BGStNWs57X9js7XGTprSmFoz5F0tWhR4WPjNeR9jXqdC7/UpSJTnlRg==",
+      "dev": true,
+      "license": "MIT",
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/chokidar": {
+      "version": "4.0.3",
+      "resolved": "https://registry.npmjs.org/chokidar/-/chokidar-4.0.3.tgz",
+      "integrity": "sha512-Qgzu8kfBvo+cA4962jnP1KkS6Dop5NS6g7R5LFYJr4b8Ub94PPQXUksCw9PvXoeXPRRddRNC5C1JQUR2SMGtnA==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "readdirp": "^4.0.1"
+      },
+      "engines": {
+        "node": ">= 14.16.0"
       },
       "funding": {
-        "url": "https://opencollective.com/vitest"
+        "url": "https://paulmillr.com/funding/"
       }
     },
-    "node_modules/assertion-error": {
-      "version": "2.0.1",
-      "resolved": "https://registry.npmjs.org/assertion-error/-/assertion-error-2.0.1.tgz",
-      "integrity": "sha512-Izi8RQcffqCeNVgFigKli1ssklIbpHnCYc6AknXGYoB6grJqyeby7jv12JUQgmTAnIDnbck1uxksT4dzN3PWBA==",
-      "dev": true,
+    "node_modules/chownr": {
+      "version": "3.0.0",
+      "resolved": "https://registry.npmjs.org/chownr/-/chownr-3.0.0.tgz",
+      "integrity": "sha512-+IxzY9BZOQd/XuYPRmrvEVjF/nqj5kgT4kEq7VofrDoM1MxoRjEWkrCC3EtLi59TVawxTAn+orJwFQcrqEN1+g==",
+      "license": "BlueOak-1.0.0",
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/clsx": {
+      "version": "2.1.1",
+      "resolved": "https://registry.npmjs.org/clsx/-/clsx-2.1.1.tgz",
+      "integrity": "sha512-eYm0QWBtUrBWZWG0d386OGAw16Z995PiOVo2B7bjWSbHedGl5e0ZWaq65kOGgUSNesEIDkB9ISbTg/JK9dhCZA==",
       "license": "MIT",
       "engines": {
-        "node": ">=12"
+        "node": ">=6"
       }
     },
-    "node_modules/chai": {
-      "version": "6.2.2",
-      "resolved": "https://registry.npmjs.org/chai/-/chai-6.2.2.tgz",
-      "integrity": "sha512-NUPRluOfOiTKBKvWPtSD4PhFvWCqOi0BGStNWs57X9js7XGTprSmFoz5F0tWhR4WPjNeR9jXqdC7/UpSJTnlRg==",
-      "dev": true,
+    "node_modules/consola": {
+      "version": "3.4.2",
+      "resolved": "https://registry.npmjs.org/consola/-/consola-3.4.2.tgz",
+      "integrity": "sha512-5IKcdX0nnYavi6G7TtOhwkYzyjfJlatbjMjuLSfE2kYT5pMDOilZ4OvMhi637CcDICTmz3wARPoyhqyX1Y+XvA==",
       "license": "MIT",
       "engines": {
-        "node": ">=18"
+        "node": "^14.18.0 || >=16.10.0"
       }
     },
     "node_modules/convert-source-map": {
@@ -530,16 +1388,56 @@
       "dev": true,
       "license": "MIT"
     },
+    "node_modules/cookie": {
+      "version": "0.6.0",
+      "resolved": "https://registry.npmjs.org/cookie/-/cookie-0.6.0.tgz",
+      "integrity": "sha512-U71cyTamuh1CRNCfpGY6to28lxvNwPG4Guz/EVjgf3Jmzv0vlDp1atT9eS5dDjMYHucpHbWns6Lwf3BKz6svdw==",
+      "license": "MIT",
+      "engines": {
+        "node": ">= 0.6"
+      }
+    },
+    "node_modules/debug": {
+      "version": "4.4.3",
+      "resolved": "https://registry.npmjs.org/debug/-/debug-4.4.3.tgz",
+      "integrity": "sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA==",
+      "license": "MIT",
+      "dependencies": {
+        "ms": "^2.1.3"
+      },
+      "engines": {
+        "node": ">=6.0"
+      },
+      "peerDependenciesMeta": {
+        "supports-color": {
+          "optional": true
+        }
+      }
+    },
+    "node_modules/deepmerge": {
+      "version": "4.3.1",
+      "resolved": "https://registry.npmjs.org/deepmerge/-/deepmerge-4.3.1.tgz",
+      "integrity": "sha512-3sUqbMEc77XqpdNO7FRyRog+eW3ph+GYCbj+rK+uYyRMuwsVy0rMiVtPn+QJlKFvWP/1PYpapqYn0Me2knFn+A==",
+      "license": "MIT",
+      "engines": {
+        "node": ">=0.10.0"
+      }
+    },
     "node_modules/detect-libc": {
       "version": "2.1.2",
       "resolved": "https://registry.npmjs.org/detect-libc/-/detect-libc-2.1.2.tgz",
       "integrity": "sha512-Btj2BOOO83o3WyH59e8MgXsxEQVcarkUOpEYrubB0urwnN10yQ364rsiByU11nZlqWYZm05i/of7io4mzihBtQ==",
-      "dev": true,
       "license": "Apache-2.0",
       "engines": {
         "node": ">=8"
       }
     },
+    "node_modules/devalue": {
+      "version": "5.6.4",
+      "resolved": "https://registry.npmjs.org/devalue/-/devalue-5.6.4.tgz",
+      "integrity": "sha512-Gp6rDldRsFh/7XuouDbxMH3Mx8GMCcgzIb1pDTvNyn8pZGQ22u+Wa+lGV9dQCltFQ7uVw0MhRyb8XDskNFOReA==",
+      "license": "MIT"
+    },
     "node_modules/es-module-lexer": {
       "version": "2.0.0",
       "resolved": "https://registry.npmjs.org/es-module-lexer/-/es-module-lexer-2.0.0.tgz",
@@ -547,6 +1445,22 @@
       "dev": true,
       "license": "MIT"
     },
+    "node_modules/esm-env": {
+      "version": "1.2.2",
+      "resolved": "https://registry.npmjs.org/esm-env/-/esm-env-1.2.2.tgz",
+      "integrity": "sha512-Epxrv+Nr/CaL4ZcFGPJIYLWFom+YeV1DqMLHJoEd9SYRxNbaFruBwfEX/kkHUJf55j2+TUbmDcmuilbP1TmXHA==",
+      "license": "MIT"
+    },
+    "node_modules/esrap": {
+      "version": "2.2.4",
+      "resolved": "https://registry.npmjs.org/esrap/-/esrap-2.2.4.tgz",
+      "integrity": "sha512-suICpxAmZ9A8bzJjEl/+rLJiDKC0X4gYWUxT6URAWBLvlXmtbZd5ySMu/N2ZGEtMCAmflUDPSehrP9BQcsGcSg==",
+      "license": "MIT",
+      "dependencies": {
+        "@jridgewell/sourcemap-codec": "^1.4.15",
+        "@typescript-eslint/types": "^8.2.0"
+      }
+    },
     "node_modules/estree-walker": {
       "version": "3.0.3",
       "resolved": "https://registry.npmjs.org/estree-walker/-/estree-walker-3.0.3.tgz",
@@ -571,7 +1485,6 @@
       "version": "6.5.0",
       "resolved": "https://registry.npmjs.org/fdir/-/fdir-6.5.0.tgz",
       "integrity": "sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==",
-      "dev": true,
       "license": "MIT",
       "engines": {
         "node": ">=12.0.0"
@@ -585,11 +1498,16 @@
         }
       }
     },
+    "node_modules/file-uri-to-path": {
+      "version": "1.0.0",
+      "resolved": "https://registry.npmjs.org/file-uri-to-path/-/file-uri-to-path-1.0.0.tgz",
+      "integrity": "sha512-0Zt+s3L7Vf1biwWZ29aARiVYLx7iMGnEUl9x33fbB/j3jR81u/O2LbqK+Bm1CDSNDKVtJ/YjwY7TUd5SkeLQLw==",
+      "license": "MIT"
+    },
     "node_modules/fsevents": {
       "version": "2.3.3",
       "resolved": "https://registry.npmjs.org/fsevents/-/fsevents-2.3.3.tgz",
       "integrity": "sha512-5xoDfX+fL7faATnagmWPpbFtwh/R77WmMMqqHGS65C3vvB0YHrgF+B1YmZ3441tMj5n63k0212XNoJwzlhffQw==",
-      "dev": true,
       "hasInstallScript": true,
       "license": "MIT",
       "optional": true,
@@ -600,11 +1518,64 @@
         "node": "^8.16.0 || ^10.6.0 || >=11.0.0"
       }
     },
+    "node_modules/glob": {
+      "version": "13.0.6",
+      "resolved": "https://registry.npmjs.org/glob/-/glob-13.0.6.tgz",
+      "integrity": "sha512-Wjlyrolmm8uDpm/ogGyXZXb1Z+Ca2B8NbJwqBVg0axK9GbBeoS7yGV6vjXnYdGm6X53iehEuxxbyiKp8QmN4Vw==",
+      "license": "BlueOak-1.0.0",
+      "dependencies": {
+        "minimatch": "^10.2.2",
+        "minipass": "^7.1.3",
+        "path-scurry": "^2.0.2"
+      },
+      "engines": {
+        "node": "18 || 20 || >=22"
+      },
+      "funding": {
+        "url": "https://github.com/sponsors/isaacs"
+      }
+    },
+    "node_modules/graceful-fs": {
+      "version": "4.2.11",
+      "resolved": "https://registry.npmjs.org/graceful-fs/-/graceful-fs-4.2.11.tgz",
+      "integrity": "sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ==",
+      "license": "ISC"
+    },
+    "node_modules/https-proxy-agent": {
+      "version": "7.0.6",
+      "resolved": "https://registry.npmjs.org/https-proxy-agent/-/https-proxy-agent-7.0.6.tgz",
+      "integrity": "sha512-vK9P5/iUfdl95AI+JVyUuIcVtd4ofvtrOr3HNtM2yxC9bnMbEdp3x01OhQNnjb8IJYi38VlTE3mBXwcfvywuSw==",
+      "license": "MIT",
+      "dependencies": {
+        "agent-base": "^7.1.2",
+        "debug": "4"
+      },
+      "engines": {
+        "node": ">= 14"
+      }
+    },
+    "node_modules/is-reference": {
+      "version": "3.0.3",
+      "resolved": "https://registry.npmjs.org/is-reference/-/is-reference-3.0.3.tgz",
+      "integrity": "sha512-ixkJoqQvAP88E6wLydLGGqCJsrFUnqoH6HnaczB8XmDH1oaWU+xxdptvikTgaEhtZ53Ky6YXiBuUI2WXLMCwjw==",
+      "license": "MIT",
+      "dependencies": {
+        "@types/estree": "^1.0.6"
+      }
+    },
+    "node_modules/kleur": {
+      "version": "4.1.5",
+      "resolved": "https://registry.npmjs.org/kleur/-/kleur-4.1.5.tgz",
+      "integrity": "sha512-o+NO+8WrRiQEE4/7nwRJhN1HWpVmJm511pBHUxPLtp0BUISzlBplORYSmTclCnJvQq2tKu/sgl3xVpkc7ZWuQQ==",
+      "license": "MIT",
+      "engines": {
+        "node": ">=6"
+      }
+    },
     "node_modules/lightningcss": {
       "version": "1.32.0",
       "resolved": "https://registry.npmjs.org/lightningcss/-/lightningcss-1.32.0.tgz",
       "integrity": "sha512-NXYBzinNrblfraPGyrbPoD19C1h9lfI/1mzgWYvXUTe414Gz/X1FD2XBZSZM7rRTrMA8JL3OtAaGifrIKhQ5yQ==",
-      "dev": true,
       "license": "MPL-2.0",
       "dependencies": {
         "detect-libc": "^2.0.3"
@@ -637,7 +1608,6 @@
       "cpu": [
         "arm64"
       ],
-      "dev": true,
       "license": "MPL-2.0",
       "optional": true,
       "os": [
@@ -658,7 +1628,6 @@
       "cpu": [
         "arm64"
       ],
-      "dev": true,
       "license": "MPL-2.0",
       "optional": true,
       "os": [
@@ -679,7 +1648,6 @@
       "cpu": [
         "x64"
       ],
-      "dev": true,
       "license": "MPL-2.0",
       "optional": true,
       "os": [
@@ -700,7 +1668,6 @@
       "cpu": [
         "x64"
       ],
-      "dev": true,
       "license": "MPL-2.0",
       "optional": true,
       "os": [
@@ -721,7 +1688,6 @@
       "cpu": [
         "arm"
       ],
-      "dev": true,
       "license": "MPL-2.0",
       "optional": true,
       "os": [
@@ -742,7 +1708,6 @@
       "cpu": [
         "arm64"
       ],
-      "dev": true,
       "license": "MPL-2.0",
       "optional": true,
       "os": [
@@ -763,7 +1728,6 @@
       "cpu": [
         "arm64"
       ],
-      "dev": true,
       "license": "MPL-2.0",
       "optional": true,
       "os": [
@@ -784,7 +1748,6 @@
       "cpu": [
         "x64"
       ],
-      "dev": true,
       "license": "MPL-2.0",
       "optional": true,
       "os": [
@@ -805,7 +1768,6 @@
       "cpu": [
         "x64"
       ],
-      "dev": true,
       "license": "MPL-2.0",
       "optional": true,
       "os": [
@@ -826,7 +1788,6 @@
       "cpu": [
         "arm64"
       ],
-      "dev": true,
       "license": "MPL-2.0",
       "optional": true,
       "os": [
@@ -847,7 +1808,6 @@
       "cpu": [
         "x64"
       ],
-      "dev": true,
       "license": "MPL-2.0",
       "optional": true,
       "os": [
@@ -861,21 +1821,95 @@
         "url": "https://opencollective.com/parcel"
       }
     },
+    "node_modules/locate-character": {
+      "version": "3.0.0",
+      "resolved": "https://registry.npmjs.org/locate-character/-/locate-character-3.0.0.tgz",
+      "integrity": "sha512-SW13ws7BjaeJ6p7Q6CO2nchbYEc3X3J6WrmTTDto7yMPqVSZTUyY5Tjbid+Ab8gLnATtygYtiDIJGQRRn2ZOiA==",
+      "license": "MIT"
+    },
+    "node_modules/lru-cache": {
+      "version": "11.2.7",
+      "resolved": "https://registry.npmjs.org/lru-cache/-/lru-cache-11.2.7.tgz",
+      "integrity": "sha512-aY/R+aEsRelme17KGQa/1ZSIpLpNYYrhcrepKTZgE+W3WM16YMCaPwOHLHsmopZHELU0Ojin1lPVxKR0MihncA==",
+      "license": "BlueOak-1.0.0",
+      "engines": {
+        "node": "20 || >=22"
+      }
+    },
     "node_modules/magic-string": {
       "version": "0.30.21",
       "resolved": "https://registry.npmjs.org/magic-string/-/magic-string-0.30.21.tgz",
       "integrity": "sha512-vd2F4YUyEXKGcLHoq+TEyCjxueSeHnFxyyjNp80yg0XV4vUhnDer/lvvlqM/arB5bXQN5K2/3oinyCRyx8T2CQ==",
-      "dev": true,
       "license": "MIT",
       "dependencies": {
         "@jridgewell/sourcemap-codec": "^1.5.5"
       }
     },
+    "node_modules/minimatch": {
+      "version": "10.2.4",
+      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-10.2.4.tgz",
+      "integrity": "sha512-oRjTw/97aTBN0RHbYCdtF1MQfvusSIBQM0IZEgzl6426+8jSC0nF1a/GmnVLpfB9yyr6g6FTqWqiZVbxrtaCIg==",
+      "license": "BlueOak-1.0.0",
+      "dependencies": {
+        "brace-expansion": "^5.0.2"
+      },
+      "engines": {
+        "node": "18 || 20 || >=22"
+      },
+      "funding": {
+        "url": "https://github.com/sponsors/isaacs"
+      }
+    },
+    "node_modules/minipass": {
+      "version": "7.1.3",
+      "resolved": "https://registry.npmjs.org/minipass/-/minipass-7.1.3.tgz",
+      "integrity": "sha512-tEBHqDnIoM/1rXME1zgka9g6Q2lcoCkxHLuc7ODJ5BxbP5d4c2Z5cGgtXAku59200Cx7diuHTOYfSBD8n6mm8A==",
+      "license": "BlueOak-1.0.0",
+      "engines": {
+        "node": ">=16 || 14 >=14.17"
+      }
+    },
+    "node_modules/minizlib": {
+      "version": "3.1.0",
+      "resolved": "https://registry.npmjs.org/minizlib/-/minizlib-3.1.0.tgz",
+      "integrity": "sha512-KZxYo1BUkWD2TVFLr0MQoM8vUUigWD3LlD83a/75BqC+4qE0Hb1Vo5v1FgcfaNXvfXzr+5EhQ6ing/CaBijTlw==",
+      "license": "MIT",
+      "dependencies": {
+        "minipass": "^7.1.2"
+      },
+      "engines": {
+        "node": ">= 18"
+      }
+    },
+    "node_modules/mri": {
+      "version": "1.2.0",
+      "resolved": "https://registry.npmjs.org/mri/-/mri-1.2.0.tgz",
+      "integrity": "sha512-tzzskb3bG8LvYGFF/mDTpq3jpI6Q9wc3LEmBaghu+DdCssd1FakN7Bc0hVNmEyGq1bq3RgfkCb3cmQLpNPOroA==",
+      "dev": true,
+      "license": "MIT",
+      "engines": {
+        "node": ">=4"
+      }
+    },
+    "node_modules/mrmime": {
+      "version": "2.0.1",
+      "resolved": "https://registry.npmjs.org/mrmime/-/mrmime-2.0.1.tgz",
+      "integrity": "sha512-Y3wQdFg2Va6etvQ5I82yUhGdsKrcYox6p7FfL1LbK2J4V01F9TGlepTIhnK24t7koZibmg82KGglhA1XK5IsLQ==",
+      "license": "MIT",
+      "engines": {
+        "node": ">=10"
+      }
+    },
+    "node_modules/ms": {
+      "version": "2.1.3",
+      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz",
+      "integrity": "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==",
+      "license": "MIT"
+    },
     "node_modules/nanoid": {
       "version": "3.3.11",
       "resolved": "https://registry.npmjs.org/nanoid/-/nanoid-3.3.11.tgz",
       "integrity": "sha512-N8SpfPUnUp1bK+PMYW8qSWdl9U+wwNWI4QKxOYDy9JAro3WMX7p2OeVRF9v+347pnakNevPmiHhNmZ2HbFA76w==",
-      "dev": true,
       "funding": [
         {
           "type": "github",
@@ -890,17 +1924,78 @@
         "node": "^10 || ^12 || ^13.7 || ^14 || >=15.0.1"
       }
     },
+    "node_modules/node-fetch": {
+      "version": "2.7.0",
+      "resolved": "https://registry.npmjs.org/node-fetch/-/node-fetch-2.7.0.tgz",
+      "integrity": "sha512-c4FRfUm/dbcWZ7U+1Wq0AwCyFL+3nt2bEw05wfxSz+DWpWsitgmSgYmy2dQdWyKC1694ELPqMs/YzUSNozLt8A==",
+      "license": "MIT",
+      "dependencies": {
+        "whatwg-url": "^5.0.0"
+      },
+      "engines": {
+        "node": "4.x || >=6.0.0"
+      },
+      "peerDependencies": {
+        "encoding": "^0.1.0"
+      },
+      "peerDependenciesMeta": {
+        "encoding": {
+          "optional": true
+        }
+      }
+    },
+    "node_modules/node-gyp-build": {
+      "version": "4.8.4",
+      "resolved": "https://registry.npmjs.org/node-gyp-build/-/node-gyp-build-4.8.4.tgz",
+      "integrity": "sha512-LA4ZjwlnUblHVgq0oBF3Jl/6h/Nvs5fzBLwdEF4nuxnFdsfajde4WfxtJr3CaiH+F6ewcIB/q4jQ4UzPyid+CQ==",
+      "license": "MIT",
+      "bin": {
+        "node-gyp-build": "bin.js",
+        "node-gyp-build-optional": "optional.js",
+        "node-gyp-build-test": "build-test.js"
+      }
+    },
+    "node_modules/nopt": {
+      "version": "8.1.0",
+      "resolved": "https://registry.npmjs.org/nopt/-/nopt-8.1.0.tgz",
+      "integrity": "sha512-ieGu42u/Qsa4TFktmaKEwM6MQH0pOWnaB3htzh0JRtx84+Mebc0cbZYN5bC+6WTZ4+77xrL9Pn5m7CV6VIkV7A==",
+      "license": "ISC",
+      "dependencies": {
+        "abbrev": "^3.0.0"
+      },
+      "bin": {
+        "nopt": "bin/nopt.js"
+      },
+      "engines": {
+        "node": "^18.17.0 || >=20.5.0"
+      }
+    },
     "node_modules/obug": {
       "version": "2.1.1",
       "resolved": "https://registry.npmjs.org/obug/-/obug-2.1.1.tgz",
       "integrity": "sha512-uTqF9MuPraAQ+IsnPf366RG4cP9RtUi7MLO1N3KEc+wb0a6yKpeL0lmk2IB1jY5KHPAlTc6T/JRdC/YqxHNwkQ==",
-      "dev": true,
       "funding": [
         "https://github.com/sponsors/sxzz",
         "https://opencollective.com/debug"
       ],
       "license": "MIT"
     },
+    "node_modules/path-scurry": {
+      "version": "2.0.2",
+      "resolved": "https://registry.npmjs.org/path-scurry/-/path-scurry-2.0.2.tgz",
+      "integrity": "sha512-3O/iVVsJAPsOnpwWIeD+d6z/7PmqApyQePUtCndjatj/9I5LylHvt5qluFaBT3I5h3r1ejfR056c+FCv+NnNXg==",
+      "license": "BlueOak-1.0.0",
+      "dependencies": {
+        "lru-cache": "^11.0.0",
+        "minipass": "^7.1.2"
+      },
+      "engines": {
+        "node": "18 || 20 || >=22"
+      },
+      "funding": {
+        "url": "https://github.com/sponsors/isaacs"
+      }
+    },
     "node_modules/pathe": {
       "version": "2.0.3",
       "resolved": "https://registry.npmjs.org/pathe/-/pathe-2.0.3.tgz",
@@ -912,14 +2007,12 @@
       "version": "1.1.1",
       "resolved": "https://registry.npmjs.org/picocolors/-/picocolors-1.1.1.tgz",
       "integrity": "sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==",
-      "dev": true,
       "license": "ISC"
     },
     "node_modules/picomatch": {
       "version": "4.0.4",
       "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-4.0.4.tgz",
       "integrity": "sha512-QP88BAKvMam/3NxH6vj2o21R6MjxZUAd6nlwAS/pnGvN9IVLocLHxGYIzFhg6fUQ+5th6P4dv4eW9jX3DSIj7A==",
-      "dev": true,
       "license": "MIT",
       "engines": {
         "node": ">=12"
@@ -932,7 +2025,6 @@
       "version": "8.5.8",
       "resolved": "https://registry.npmjs.org/postcss/-/postcss-8.5.8.tgz",
       "integrity": "sha512-OW/rX8O/jXnm82Ey1k44pObPtdblfiuWnrd8X7GJ7emImCOstunGbXUpp7HdBrFQX6rJzn3sPT397Wp5aCwCHg==",
-      "dev": true,
       "funding": [
         {
           "type": "opencollective",
@@ -957,11 +2049,33 @@
         "node": "^10 || ^12 || >=14"
       }
     },
+    "node_modules/readdirp": {
+      "version": "4.1.2",
+      "resolved": "https://registry.npmjs.org/readdirp/-/readdirp-4.1.2.tgz",
+      "integrity": "sha512-GDhwkLfywWL2s6vEjyhri+eXmfH6j1L7JE27WhqLeYzoh/A3DBaYGEj2H/HFZCn/kMfim73FXxEJTw06WtxQwg==",
+      "dev": true,
+      "license": "MIT",
+      "engines": {
+        "node": ">= 14.18.0"
+      },
+      "funding": {
+        "type": "individual",
+        "url": "https://paulmillr.com/funding/"
+      }
+    },
+    "node_modules/resolve-from": {
+      "version": "5.0.0",
+      "resolved": "https://registry.npmjs.org/resolve-from/-/resolve-from-5.0.0.tgz",
+      "integrity": "sha512-qYg9KP24dD5qka9J47d0aVky0N+b4fTU89LN9iDnjB5waksiC49rvMB0PrUJQGoTmH50XPiqOvAjDfaijGxYZw==",
+      "license": "MIT",
+      "engines": {
+        "node": ">=8"
+      }
+    },
     "node_modules/rolldown": {
       "version": "1.0.0-rc.12",
       "resolved": "https://registry.npmjs.org/rolldown/-/rolldown-1.0.0-rc.12.tgz",
       "integrity": "sha512-yP4USLIMYrwpPHEFB5JGH1uxhcslv6/hL0OyvTuY+3qlOSJvZ7ntYnoWpehBxufkgN0cvXxppuTu5hHa/zPh+A==",
-      "dev": true,
       "license": "MIT",
       "dependencies": {
         "@oxc-project/types": "=0.122.0",
@@ -991,6 +2105,37 @@
         "@rolldown/binding-win32-x64-msvc": "1.0.0-rc.12"
       }
     },
+    "node_modules/sade": {
+      "version": "1.8.1",
+      "resolved": "https://registry.npmjs.org/sade/-/sade-1.8.1.tgz",
+      "integrity": "sha512-xal3CZX1Xlo/k4ApwCFrHVACi9fBqJ7V+mwhBsuf/1IOKbBy098Fex+Wa/5QMubw09pSZ/u8EY8PWgevJsXp1A==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "mri": "^1.1.0"
+      },
+      "engines": {
+        "node": ">=6"
+      }
+    },
+    "node_modules/semver": {
+      "version": "7.7.4",
+      "resolved": "https://registry.npmjs.org/semver/-/semver-7.7.4.tgz",
+      "integrity": "sha512-vFKC2IEtQnVhpT78h1Yp8wzwrf8CM+MzKMHGJZfBtzhZNycRFnXsHk6E5TxIkkMsgNS7mdX3AGB7x2QM2di4lA==",
+      "license": "ISC",
+      "bin": {
+        "semver": "bin/semver.js"
+      },
+      "engines": {
+        "node": ">=10"
+      }
+    },
+    "node_modules/set-cookie-parser": {
+      "version": "3.1.0",
+      "resolved": "https://registry.npmjs.org/set-cookie-parser/-/set-cookie-parser-3.1.0.tgz",
+      "integrity": "sha512-kjnC1DXBHcxaOaOXBHBeRtltsDG2nUiUni+jP92M9gYdW12rsmx92UsfpH7o5tDRs7I1ZZPSQJQGv3UaRfCiuw==",
+      "license": "MIT"
+    },
     "node_modules/siginfo": {
       "version": "2.0.0",
       "resolved": "https://registry.npmjs.org/siginfo/-/siginfo-2.0.0.tgz",
@@ -998,11 +2143,24 @@
       "dev": true,
       "license": "ISC"
     },
+    "node_modules/sirv": {
+      "version": "3.0.2",
+      "resolved": "https://registry.npmjs.org/sirv/-/sirv-3.0.2.tgz",
+      "integrity": "sha512-2wcC/oGxHis/BoHkkPwldgiPSYcpZK3JU28WoMVv55yHJgcZ8rlXvuG9iZggz+sU1d4bRgIGASwyWqjxu3FM0g==",
+      "license": "MIT",
+      "dependencies": {
+        "@polka/url": "^1.0.0-next.24",
+        "mrmime": "^2.0.0",
+        "totalist": "^3.0.0"
+      },
+      "engines": {
+        "node": ">=18"
+      }
+    },
     "node_modules/source-map-js": {
       "version": "1.2.1",
       "resolved": "https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.1.tgz",
       "integrity": "sha512-UXWMKhLOwVKb728IUtQPXxfYU+usdybtUrK/8uGE8CQMvrhOpwvzDBwj0QhSL7MQc7vIsISBG8VQ8+IDQxpfQA==",
-      "dev": true,
       "license": "BSD-3-Clause",
       "engines": {
         "node": ">=0.10.0"
@@ -1022,6 +2180,73 @@
       "dev": true,
       "license": "MIT"
     },
+    "node_modules/svelte": {
+      "version": "5.55.0",
+      "resolved": "https://registry.npmjs.org/svelte/-/svelte-5.55.0.tgz",
+      "integrity": "sha512-SThllKq6TRMBwPtat7ASnm/9CDXnIhBR0NPGw0ujn2DVYx9rVwsPZxDaDQcYGdUz/3BYVsCzdq7pZarRQoGvtw==",
+      "license": "MIT",
+      "dependencies": {
+        "@jridgewell/remapping": "^2.3.4",
+        "@jridgewell/sourcemap-codec": "^1.5.0",
+        "@sveltejs/acorn-typescript": "^1.0.5",
+        "@types/estree": "^1.0.5",
+        "@types/trusted-types": "^2.0.7",
+        "acorn": "^8.12.1",
+        "aria-query": "5.3.1",
+        "axobject-query": "^4.1.0",
+        "clsx": "^2.1.1",
+        "devalue": "^5.6.4",
+        "esm-env": "^1.2.1",
+        "esrap": "^2.2.2",
+        "is-reference": "^3.0.3",
+        "locate-character": "^3.0.0",
+        "magic-string": "^0.30.11",
+        "zimmerframe": "^1.1.2"
+      },
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/svelte-check": {
+      "version": "4.4.5",
+      "resolved": "https://registry.npmjs.org/svelte-check/-/svelte-check-4.4.5.tgz",
+      "integrity": "sha512-1bSwIRCvvmSHrlK52fOlZmVtUZgil43jNL/2H18pRpa+eQjzGt6e3zayxhp1S7GajPFKNM/2PMCG+DZFHlG9fw==",
+      "dev": true,
+      "license": "MIT",
+      "dependencies": {
+        "@jridgewell/trace-mapping": "^0.3.25",
+        "chokidar": "^4.0.1",
+        "fdir": "^6.2.0",
+        "picocolors": "^1.0.0",
+        "sade": "^1.7.4"
+      },
+      "bin": {
+        "svelte-check": "bin/svelte-check"
+      },
+      "engines": {
+        "node": ">= 18.0.0"
+      },
+      "peerDependencies": {
+        "svelte": "^4.0.0 || ^5.0.0-next.0",
+        "typescript": ">=5.0.0"
+      }
+    },
+    "node_modules/tar": {
+      "version": "7.5.13",
+      "resolved": "https://registry.npmjs.org/tar/-/tar-7.5.13.tgz",
+      "integrity": "sha512-tOG/7GyXpFevhXVh8jOPJrmtRpOTsYqUIkVdVooZYJS/z8WhfQUX8RJILmeuJNinGAMSu1veBr4asSHFt5/hng==",
+      "license": "BlueOak-1.0.0",
+      "dependencies": {
+        "@isaacs/fs-minipass": "^4.0.0",
+        "chownr": "^3.0.0",
+        "minipass": "^7.1.2",
+        "minizlib": "^3.1.0",
+        "yallist": "^5.0.0"
+      },
+      "engines": {
+        "node": ">=18"
+      }
+    },
     "node_modules/tinybench": {
       "version": "2.9.0",
       "resolved": "https://registry.npmjs.org/tinybench/-/tinybench-2.9.0.tgz",
@@ -1043,7 +2268,6 @@
       "version": "0.2.15",
       "resolved": "https://registry.npmjs.org/tinyglobby/-/tinyglobby-0.2.15.tgz",
       "integrity": "sha512-j2Zq4NyQYG5XMST4cbs02Ak8iJUdxRM0XI5QyxXuZOzKOINmWurp3smXu3y5wDcJrptwpSjgXHzIQxR0omXljQ==",
-      "dev": true,
       "license": "MIT",
       "dependencies": {
         "fdir": "^6.5.0",
@@ -1066,11 +2290,25 @@
         "node": ">=14.0.0"
       }
     },
+    "node_modules/totalist": {
+      "version": "3.0.1",
+      "resolved": "https://registry.npmjs.org/totalist/-/totalist-3.0.1.tgz",
+      "integrity": "sha512-sf4i37nQ2LBx4m3wB74y+ubopq6W/dIzXg0FDGjsYnZHVa1Da8FH853wlL2gtUhg+xJXjfk3kUZS3BRoQeoQBQ==",
+      "license": "MIT",
+      "engines": {
+        "node": ">=6"
+      }
+    },
+    "node_modules/tr46": {
+      "version": "0.0.3",
+      "resolved": "https://registry.npmjs.org/tr46/-/tr46-0.0.3.tgz",
+      "integrity": "sha512-N3WMsuqV66lT30CrXNbEjx4GEwlow3v6rr4mCcv6prnfwhS01rkgyFdjPNBYd9br7LpXV1+Emh01fHnq2Gdgrw==",
+      "license": "MIT"
+    },
     "node_modules/tslib": {
       "version": "2.8.1",
       "resolved": "https://registry.npmjs.org/tslib/-/tslib-2.8.1.tgz",
       "integrity": "sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w==",
-      "dev": true,
       "license": "0BSD",
       "optional": true
     },
@@ -1092,7 +2330,6 @@
       "version": "8.0.3",
       "resolved": "https://registry.npmjs.org/vite/-/vite-8.0.3.tgz",
       "integrity": "sha512-B9ifbFudT1TFhfltfaIPgjo9Z3mDynBTJSUYxTjOQruf/zHH+ezCQKcoqO+h7a9Pw9Nm/OtlXAiGT1axBgwqrQ==",
-      "dev": true,
       "license": "MIT",
       "dependencies": {
         "lightningcss": "^1.32.0",
@@ -1166,6 +2403,25 @@
         }
       }
     },
+    "node_modules/vitefu": {
+      "version": "1.1.2",
+      "resolved": "https://registry.npmjs.org/vitefu/-/vitefu-1.1.2.tgz",
+      "integrity": "sha512-zpKATdUbzbsycPFBN71nS2uzBUQiVnFoOrr2rvqv34S1lcAgMKKkjWleLGeiJlZ8lwCXvtWaRn7R3ZC16SYRuw==",
+      "license": "MIT",
+      "workspaces": [
+        "tests/deps/*",
+        "tests/projects/*",
+        "tests/projects/workspace/packages/*"
+      ],
+      "peerDependencies": {
+        "vite": "^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0-beta.0"
+      },
+      "peerDependenciesMeta": {
+        "vite": {
+          "optional": true
+        }
+      }
+    },
     "node_modules/vitest": {
       "version": "4.1.2",
       "resolved": "https://registry.npmjs.org/vitest/-/vitest-4.1.2.tgz",
@@ -1248,6 +2504,22 @@
         }
       }
     },
+    "node_modules/webidl-conversions": {
+      "version": "3.0.1",
+      "resolved": "https://registry.npmjs.org/webidl-conversions/-/webidl-conversions-3.0.1.tgz",
+      "integrity": "sha512-2JAn3z8AR6rjK8Sm8orRC0h/bcl/DqL7tRPdGZ4I1CjdF+EaMLmYxBHyXuKL849eucPFhvBoxMsflfOb8kxaeQ==",
+      "license": "BSD-2-Clause"
+    },
+    "node_modules/whatwg-url": {
+      "version": "5.0.0",
+      "resolved": "https://registry.npmjs.org/whatwg-url/-/whatwg-url-5.0.0.tgz",
+      "integrity": "sha512-saE57nupxk6v3HY35+jzBwYa0rKSy0XR8JSxZPwgLr7ys0IBzhGviA1/TUGJLmSVqs8pb9AnvICXEuOHLprYTw==",
+      "license": "MIT",
+      "dependencies": {
+        "tr46": "~0.0.3",
+        "webidl-conversions": "^3.0.0"
+      }
+    },
     "node_modules/why-is-node-running": {
       "version": "2.3.0",
       "resolved": "https://registry.npmjs.org/why-is-node-running/-/why-is-node-running-2.3.0.tgz",
@@ -1264,6 +2536,21 @@
       "engines": {
         "node": ">=8"
       }
+    },
+    "node_modules/yallist": {
+      "version": "5.0.0",
+      "resolved": "https://registry.npmjs.org/yallist/-/yallist-5.0.0.tgz",
+      "integrity": "sha512-YgvUTfwqyc7UXVMrB+SImsVYSmTS8X/tSrtdNZMImM+n7+QTriRXyXim0mBrTXNeqzVF0KWGgHPeiyViFFrNDw==",
+      "license": "BlueOak-1.0.0",
+      "engines": {
+        "node": ">=18"
+      }
+    },
+    "node_modules/zimmerframe": {
+      "version": "1.1.4",
+      "resolved": "https://registry.npmjs.org/zimmerframe/-/zimmerframe-1.1.4.tgz",
+      "integrity": "sha512-B58NGBEoc8Y9MWWCQGl/gq9xBCe4IiKM0a2x7GZdQKOW5Exr8S1W24J6OgM1njK8xCRGvAJIL/MxXHf6SkmQKQ==",
+      "license": "MIT"
     }
   }
 }
diff --git a/package.json b/package.json
index ad0fee1..b05107d 100644
--- a/package.json
+++ b/package.json
@@ -3,8 +3,17 @@
   "version": "0.1.0",
   "private": true,
   "description": "Pädagogisches Reflexions- und Dokumentationssystem",
+  "workspaces": ["apps/web"],
+  "engines": {
+    "node": ">=20.19.0"
+  },
   "scripts": {
-    "build": "tsc --noEmit",
+    "typecheck": "tsc --noEmit",
+    "build:web": "npm run build --workspace=apps/web",
+    "check:web": "npm run check --workspace=apps/web",
+    "build": "npm run typecheck && npm run check:web && npm run build:web",
+    "verify": "npm run typecheck && npm run test && npm run check:web && npm run build:web",
+    "dev": "npm run dev --workspace=apps/web",
     "test": "vitest run",
     "test:watch": "vitest"
   },