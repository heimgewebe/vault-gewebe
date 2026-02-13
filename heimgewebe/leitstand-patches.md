Verdichtete Essenz

Wir machen validatePlexerReport lazy + resetfähig, damit resetEnvConfig() in Tests (und ggf. Runtime-Strictness) wirklich wirkt und die Validatoren nicht „bei Import eingefroren“ bleiben.

⸻

Patch (minimal, zielgenau)

1) src/validation/validators.ts – lazy init + Reset-Hook

diff --git a/src/validation/validators.ts b/src/validation/validators.ts
index 6bc4f17..c2b1a11 100644
--- a/src/validation/validators.ts
+++ b/src/validation/validators.ts
@@ -1,40 +1,99 @@
 import Ajv from 'ajv/dist/2020.js';
 import addFormats from 'ajv-formats';
 import fs from 'fs';
 import path from 'path';
 import { fileURLToPath } from 'url';
 import { envConfig } from '../config.js';

 const __dirname = path.dirname(fileURLToPath(import.meta.url));
-const ajv = new Ajv({ strict: envConfig.isStrict });
-addFormats(ajv);

 const CONTRACTS_DIR = path.resolve(__dirname, '..', '..', 'vendor', 'contracts');

 const PLEXER_REPORT_SCHEMA_PATH = path.join(CONTRACTS_DIR, 'plexer', 'delivery.report.v1.schema.json');
-let plexerReportValidate = null;
-
-if (fs.existsSync(PLEXER_REPORT_SCHEMA_PATH)) {
-    try {
-        const schema = JSON.parse(fs.readFileSync(PLEXER_REPORT_SCHEMA_PATH, 'utf8'));
-        plexerReportValidate = ajv.compile(schema);
-        console.log('[Validation] Compiled plexer report validator');
-    } catch (e) {
-        console.warn('[Validation] Failed to compile plexer report validator:', e.message);
-    }
-} else {
-    console.warn('[Validation] Plexer report schema missing at', PLEXER_REPORT_SCHEMA_PATH);
-}
+
+type AjvValidateFn = ((data: unknown) => boolean) & { errors?: any[] };
+
+let plexerReportValidate: AjvValidateFn | null = null;
+let compiledStrict: boolean | null = null;
+
+function buildAjv(strict: boolean) {
+  const ajv = new Ajv({ strict, allErrors: true });
+  addFormats(ajv);
+  return ajv;
+}
+
+function compilePlexerReportValidator(): { ok: true } | { ok: false; error: string; status: 503 | 500 } {
+  const wantStrict = envConfig.isStrict;
+
+  // Reuse if already compiled for current strictness
+  if (plexerReportValidate && compiledStrict === wantStrict) return { ok: true };
+
+  if (!fs.existsSync(PLEXER_REPORT_SCHEMA_PATH)) {
+    plexerReportValidate = null;
+    compiledStrict = null;
+    return { ok: false, error: `Schema missing at ${PLEXER_REPORT_SCHEMA_PATH}`, status: 503 };
+  }
+
+  try {
+    const schema = JSON.parse(fs.readFileSync(PLEXER_REPORT_SCHEMA_PATH, 'utf8'));
+    const ajv = buildAjv(wantStrict);
+    plexerReportValidate = ajv.compile(schema) as AjvValidateFn;
+    compiledStrict = wantStrict;
+    console.log(`[Validation] Compiled plexer report validator (strict=${wantStrict})`);
+    return { ok: true };
+  } catch (e: any) {
+    plexerReportValidate = null;
+    compiledStrict = null;
+    return { ok: false, error: `Failed to compile validator: ${e?.message ?? String(e)}`, status: 500 };
+  }
+}
+
+export function resetValidators() {
+  plexerReportValidate = null;
+  compiledStrict = null;
+}

 export const validatePlexerReport = (data: unknown) => {
-    if (!plexerReportValidate) {
-        console.log('[Validation] validatePlexerReport called but validator is null');
-        return { valid: false, error: "Validator not initialized (schema missing or invalid)", status: 503 };
-    }
-    const valid = plexerReportValidate(data);
-    if (!valid) {
-        const errorMsg = plexerReportValidate.errors?.map(e => `${e.instancePath} ${e.message}`).join(', ');
-        return { valid: false, error: errorMsg, status: 400 };
-    }
-    return { valid: true, status: 200 };
+  const compiled = compilePlexerReportValidator();
+  if (!compiled.ok) {
+    console.log('[Validation] validatePlexerReport unavailable:', compiled.error);
+    // 503 for missing schema; 500 for compile failure
+    return { valid: false, error: compiled.error, status: compiled.status };
+  }
+
+  if (!plexerReportValidate) {
+    return { valid: false, error: "Validator not initialized", status: 503 };
+  }
+
+  const valid = plexerReportValidate(data);
+  if (!valid) {
+    const errorMsg = plexerReportValidate.errors?.map(e => `${e.instancePath} ${e.message}`).join(', ');
+    return { valid: false, error: errorMsg, status: 400 };
+  }
+
+  return { valid: true, status: 200 };
 };

Was das fixt:
	•	Validator wird erst beim ersten Gebrauch kompiliert.
	•	Wenn envConfig.isStrict später anders ist (z.B. nach resetEnvConfig()), wird neu kompiliert.
	•	Tests können gezielt resetValidators() rufen, um deterministisch zu sein.

⸻

2) tests/server.test.ts – nach resetEnvConfig() auch Validatoren resetten

Du importierst bereits resetEnvConfig. Ergänze den Reset der Validatoren im passenden Hook.

diff --git a/tests/server.test.ts b/tests/server.test.ts
index 6ee05ff..f33b20a 100644
--- a/tests/server.test.ts
+++ b/tests/server.test.ts
@@ -1,6 +1,7 @@
 import request from 'supertest';
 import { describe, it, expect, beforeEach, vi } from 'vitest';
 import { app } from '../src/server.js';
 import { resetEnvConfig } from '../src/config.js';
+import { resetValidators } from '../src/validation/validators.js';

 beforeEach(() => {
   resetEnvConfig();
+  resetValidators();
 });

Wenn du stattdessen afterEach nutzt: dort genauso.

⸻

Für Dummies

Warum das nötig ist: In JS/TS laufen manche Sachen sofort beim Import einer Datei. Wenn du da schon den Validator baust, ist er wie ein Foto: er behält den damaligen Zustand (z.B. strict=true/false). Später resetEnvConfig() zu rufen ändert dann nicht das Foto. „Lazy init“ heißt: erst bauen, wenn man es wirklich braucht – dann stimmt der Zustand.

⸻

Mini-Risikoanalyse
	•	Risiko: niedrig.
	•	Mögliche Nebenwirkung: Beim ersten Plexer-Report kommt einmalig Compile-Overhead (vernachlässigbar).
	•	Gewinn: weniger Flakiness, bessere Test- und Runtime-Deterministik.

⸻

Tiefgründig ironische Auslassung

Der Validator war bisher wie ein Türsteher, der beim Schichtwechsel nicht mitbekommt, dass plötzlich ein anderes Regelbuch gilt – aber dafür sehr überzeugt “Nein” sagt.

⸻

∴fore Ungewissheit
	•	Unsicherheitsgrad: 0.26
	•	Ursachen: Ich kenne envConfig-Implementierung und Test-Hooks nur aus Ausschnitten; falls envConfig nicht wirklich “resetbar” ist, bleibt die Strictness trotzdem sticky.
	•	Meta: überwiegend vermeidbar (dieser Patch), Rest systembedingt (Singleton-Konfig in Node).

Wenn du willst, kann ich dir als nächsten Mini-Patch noch _pin.json-Newline und eine kleine Allowlist-Konfig (SCHEMA_REF_ALLOWED_HOSTS) skizzieren.


Verdichtete Essenz

Zwei kleine Follow-ups: (1) _pin.json bekommt ein Newline am EOF, (2) SCHEMA_REF-Allowlist wird konfigurierbar (Default bleibt schemas.heimgewebe.org), plus minimale Hardening-Kleinigkeiten.

⸻

Prämissencheck (Fehlerprävention)
	•	Newline-Noise: Fehlt das Newline am EOF, meckern Linter/Review-Tools gern → unnötiger Diff-Lärm. Passt.
	•	SCHEMA_REF heute: Du allowlistest aktuell hart schemas.heimgewebe.org. Das ist ok, aber unflexibel (Test/Stage) und das „Allowlist-Feature“ wird faktisch zu einer fest codierten Policy.
	•	Wichtige Unsichtbarkeit: SCHEMA_REF wird aktuell nur im UI als Link gezeigt und nicht für Fetch/Validation genutzt (die Validation nimmt vendor/contracts/...). D.h. das Sicherheitsrisiko ist eher „Click/Trust“ als „RCE“.

⸻

Patch 1: _pin.json Newline am EOF

diff --git a/vendor/contracts/_pin.json b/vendor/contracts/_pin.json
index dfea5b3..dfea5b3 100644
--- a/vendor/contracts/_pin.json
+++ b/vendor/contracts/_pin.json
@@ -11,4 +11,4 @@
     }
   }
-}
\ No newline at end of file
+}


⸻

Patch 2: SCHEMA_REF-Allowlist konfigurierbar (Default bleibt)

scripts/fetch-observatory.mjs

diff --git a/scripts/fetch-observatory.mjs b/scripts/fetch-observatory.mjs
index 171a743..9a6c3b1 100644
--- a/scripts/fetch-observatory.mjs
+++ b/scripts/fetch-observatory.mjs
@@ -1,9 +1,10 @@
 import fs from "fs";
 import path from "path";
 import { mkdir } from "fs/promises";
 import { Readable } from "node:stream";
 import { finished } from "node:stream/promises";
 import { fileURLToPath, URL as NodeURL } from 'url';
 import { createHash } from "crypto";
 import Ajv from "ajv/dist/2020.js";
 import addFormats from "ajv-formats";
 
 const __dirname = path.dirname(fileURLToPath(import.meta.url));
 
 let OBS_URL = process.env.OBSERVATORY_URL;
@@ -16,6 +17,9 @@ if (!OBS_URL) {
 }
 
 let OUT = process.env.OBSERVATORY_ARTIFACT_PATH || process.env.OBSERVATORY_OUT_PATH || "artifacts/knowledge.observatory.json";
 const EXPECTED_SHA = process.env.OBSERVATORY_SHA;
 const SCHEMA_REF = process.env.OBSERVATORY_SCHEMA_REF;
+const SCHEMA_REF_ALLOWED_HOSTS = (process.env.OBSERVATORY_SCHEMA_REF_ALLOWED_HOSTS || 'schemas.heimgewebe.org')
+  .split(',')
+  .map(s => s.trim())
+  .filter(Boolean);
 
 // Enforce SCHEMA_REF allowlist if provided
 if (SCHEMA_REF) {
-    const ALLOWED_HOSTS = ['schemas.heimgewebe.org'];
     try {
         const u = new NodeURL(SCHEMA_REF);
-        if (!ALLOWED_HOSTS.includes(u.hostname)) {
+        if (!SCHEMA_REF_ALLOWED_HOSTS.includes(u.hostname)) {
              throw new Error(`SCHEMA_REF hostname '${u.hostname}' not in allowlist.`);
         }
     } catch (e) {
         console.error(`[leitstand] FATAL: Invalid SCHEMA_REF: ${e.message}`);
         process.exit(1);
     }
 }

Optional (aber sinnvoll): logge die Allowlist in Debug, ohne es zu „verkaufen“:

@@ -35,6 +39,7 @@ console.log(`[leitstand] Fetch source: ${OBS_URL}`);
 console.log(`[leitstand] Output path: ${OUT}`);
 console.log(`[leitstand] strict=${strict}`);
+if (SCHEMA_REF) console.log(`[leitstand] schema_ref allowlist=${SCHEMA_REF_ALLOWED_HOSTS.join(',')}`);

docs/runbooks/leitstand.md ergänzen (knapp)

diff --git a/docs/runbooks/leitstand.md b/docs/runbooks/leitstand.md
index 656808f..d0a7a4a 100644
--- a/docs/runbooks/leitstand.md
+++ b/docs/runbooks/leitstand.md
@@ -1,6 +1,6 @@
 # Leitstand Runbook
 
 ## Inputs and Data Flow
@@ -8,7 +8,7 @@ Leitstand aggregates data from multiple sources to provide a unified dashboard.
 
 ### 1. Knowledge Observatory
 - **Source:** SemantAH (`knowledge.observatory.json`)
 - **Ingest:** Via Plexer Event (`knowledge.observatory.published.v1`) -> `scripts/fetch-observatory.mjs`
 - **Validation:** Strict AJV against `vendor/contracts/knowledge/observatory.schema.json` (Vendored from metarepo SSOT)
+  - **Schema Ref Hardening:** `OBSERVATORY_SCHEMA_REF` is allowlisted by host. Configure via `OBSERVATORY_SCHEMA_REF_ALLOWED_HOSTS` (comma-separated). Default: `schemas.heimgewebe.org`.


⸻

Alternativwege (mindestens 2)
	1.	Strikter: SCHEMA_REF komplett ignorieren (nicht speichern/anzeigen). Maximale Hygiene, aber weniger Forensics/Transparenz.
	2.	Stärker: Wenn SCHEMA_REF gesetzt ist, zusätzlich $id im vendored Schema gegen SCHEMA_REF plausibilisieren (nur Vergleich, kein Fetch). Das gibt Konsistenz ohne Netzabhängigkeit.
	3.	Betrieblich: SCHEMA_REF nur in Non-Prod zulassen; Prod ignoriert es (oder erzwingt schemas.heimgewebe.org).

⸻

Risikoabschätzung
	•	Technisch: niedrig. Env-Parsing ist simpel; Default bleibt identisch.
	•	Sicherheitswirkung: moderat positiv (weniger „irgendwelche Links“), aber das Hauptschema kommt ohnehin aus vendor/.
	•	Orga-Risiko: gering. Ein neues Env-Flag muss nur dokumentiert werden.

⸻

Tiefgründig ironische Auslassung

Eine Allowlist ist wie ein Türschild: Es verhindert nicht, dass jemand klingelt – aber es reduziert die Wahrscheinlichkeit, dass man aus Versehen dem Staubsaugervertreter die Wohnung zeigt.

⸻

∴fore Ungewissheit
	•	Unsicherheitsgrad: 0.18
	•	Ursachen: Ich sehe nicht, ob ihr OBSERVATORY_SCHEMA_REF später irgendwo automatisiert verarbeitet (außer Link/Meta). Falls doch, wären strengere Regeln nötig.
	•	Meta: überwiegend vermeidbar (Konfig + Doku), Rest datenbedingt (unbekannte spätere Nutzung).Verdichtete Essenz

Ich ergänze einen Vitest in tests/fetch-observatory.test.ts, der sicherstellt: fremder OBSERVATORY_SCHEMA_REF-Host → Exit != 0.

⸻

Patch: Allowlist-Test für SCHEMA_REF

diff --git a/tests/fetch-observatory.test.ts b/tests/fetch-observatory.test.ts
index 8ae1791..b3a9c0e 100644
--- a/tests/fetch-observatory.test.ts
+++ b/tests/fetch-observatory.test.ts
@@ -109,6 +109,36 @@ describe('scripts/fetch-observatory.mjs', () => {
         expect(error.stderr).toContain('SHA mismatch');
         }
     }, 10000);
 
+    it('should reject SCHEMA_REF with a non-allowlisted hostname', async () => {
+        const cmd = `node scripts/fetch-observatory.mjs`;
+
+        const env = {
+            ...process.env,
+            OBSERVATORY_URL: `${baseUrl}/valid.json`,
+            OBSERVATORY_ARTIFACT_PATH: artifactPath,
+            LEITSTAND_STRICT: '1',
+            OBSERVATORY_SCHEMA_REF: 'https://evil.example.test/schema.json',
+            // default is schemas.heimgewebe.org; set explicitly to avoid surprises
+            OBSERVATORY_SCHEMA_REF_ALLOWED_HOSTS: 'schemas.heimgewebe.org'
+        };
+
+        try {
+            await execPromise(cmd, { env });
+            throw new Error("Script should have failed due to SCHEMA_REF allowlist violation");
+        } catch (error: any) {
+            expect(error.code).not.toBe(0);
+            const output = (error.stderr || '') + (error.stdout || '');
+            // Either the hostname message or the wrapper "Invalid SCHEMA_REF" is acceptable
+            expect(output).toMatch(/not in allowlist|Invalid SCHEMA_REF/i);
+        }
+    }, 10000);
+
     it('should verify SHA checksum if provided (success case)', async () => {
         const cmd = `node scripts/fetch-observatory.mjs`;
         const env = {
             ...process.env,
             OBSERVATORY_URL: `${baseUrl}/static.json`,


⸻

Prämissencheck (Fehlerprävention)
	•	Der Test ist deterministisch: Er scheitert vor dem Fetch (rein URL-Parse + Host-Check).
	•	Ich erlaube in der Assertion beide möglichen Log-Strings, weil du einmal throw new Error(...) und einmal console.error("[leitstand] FATAL: Invalid SCHEMA_REF: ...") hast.

⸻

Risikoabschätzung
	•	Technisch: niedrig. Ein zusätzlicher Test, keine Runtime-Änderung.
	•	CI-Risiko: niedrig. Kein Netz, keine Timing-Flakes.

⸻

Alternativwege
	1.	Strenger Assert: exakt auf SCHEMA_REF hostname ... not in allowlist matchen (weniger tolerant bei Log-Änderungen).
	2.	Statt Script-Exec: den Allowlist-Block als Funktion extrahieren und unit-testen (schneller, aber Refactor).

⸻

Tiefgründig ironische Auslassung

Wenn ein Link im UI schon „Forensics“ heißt, wird er irgendwann wie „Wahrheit“ behandelt. Die Allowlist ist das kleine Schild: „Bitte nicht alle Wahrheiten von irgendwoher importieren.“

⸻

∴fore Ungewissheit
	•	Unsicherheitsgrad: 0.12
	•	Ursachen: Ich sehe dein gesamtes Test-Setup nicht (z.B. wie Vitest stderr/stdout im Fehlerobjekt befüllt); deshalb ist die Match-Regex bewusst robust.
	•	Meta: überwiegend vermeidbar (wenn ihr Logging stabilisiert), Rest umgebungsbedingt.

Wenn du magst, gebe ich dir als Nächstes noch den kleinen Doku-Block im Runbook (1–2 Zeilen) für OBSERVATORY_SCHEMA_REF_ALLOWED_HOSTS als Patch.


Patch: Runbook-Ergänzung zu OBSERVATORY_SCHEMA_REF_ALLOWED_HOSTS

Ziel

Explizit festhalten, welche Schema-Hosts erlaubt sind, warum das existiert und wie man es konfiguriert. Minimal, SSOT-konform, ohne neue Semantik.

⸻

Vorschlag: kurzer Abschnitt im Runbook / README (z. B. docs/runbook.md oder bestehender Leitstand-Abschnitt)

diff --git a/docs/runbook.md b/docs/runbook.md
index 3f2a1a1..c7b9d12 100644
--- a/docs/runbook.md
+++ b/docs/runbook.md
@@ -42,6 +42,24 @@ ## Observatory Fetch & Verification
 The observatory artifact is fetched, verified, and made available to Leitstand
 and downstream consumers.
 
+### Schema Reference Allowlist
+
+For security and supply-chain integrity reasons, the schema reference
+(`schema_ref`) embedded in observatory artifacts is restricted to an explicit
+allowlist of hostnames.
+
+**Environment variables:**
+
+- `OBSERVATORY_SCHEMA_REF`  
+  Optional override of the schema reference URL embedded in the artifact.
+
+- `OBSERVATORY_SCHEMA_REF_ALLOWED_HOSTS`  
+  Comma-separated list of allowed hostnames for `schema_ref`.
+  Defaults to:
+  ```
+  schemas.heimgewebe.org
+  ```
+
+If the hostname of `schema_ref` is not in this allowlist and `LEITSTAND_STRICT=1`
+is set, the fetch step fails hard.
+
+This prevents silently accepting schemas from untrusted or unintended origins.
+

(Pfad/Dateiname bitte an die tatsächliche Runbook-Struktur anpassen; der Block ist bewusst selbstständig.)

⸻

Prämissencheck
	•	Keine neue Logik, nur Dokumentation bestehender Schutzmaßnahme.
	•	Benennt klar: Was, Warum, Wie konfiguriert.
	•	Vermeidet implizite Annahmen („schemas.heimgewebe.org ist halt gesetzt“).

⸻

Risikoabschätzung
	•	Technisch: null.
	•	Organisatorisch: positiv – reduziert spätere „Warum ist das kaputt?“-Fragen.

⸻

Alternativweg
	•	Statt Runbook: denselben Block in docs/api.md unter „Security / Integrity“ einhängen.
	•	Oder: 3-Zeiler direkt als Kommentar im Script belassen und im Runbook verlinken.

⸻

Tiefgründig ironische Auslassung

Eine Allowlist ist nichts anderes als institutionalisierte Paranoia.
Der Unterschied zur Verschwörungstheorie: sie ist dokumentiert.

⸻

∴fore Ungewissheit
	•	Unsicherheitsgrad: 0.06
	•	Ursachen: Unklar, welches Dokument bei euch das kanonische Runbook ist.
	•	Meta: vollständig vermeidbar, sobald der Zielpfad festgezurrt ist.

Wenn du willst, passe ich den Patch exakt auf die Datei an, die ihr gerade als Runbook benutzt (einfach Pfad nennen).

Wenn du willst, mache ich als nächsten Schritt auch noch den Test-Adjust: ein kleiner Vitest-Case, der OBSERVATORY_SCHEMA_REF_ALLOWED_HOSTS setzt und die Ablehnung bei Fremdhost prüft (ohne Netz).



