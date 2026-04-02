Heimplex also it is. 🧠🕸️
Dann machen wir jetzt zwei Etappen:
	1.	Anweisungen + Patches für die bestehenden Repos
	2.	Heimplex als neues Repo initialisieren (mit lauffähigem Skeleton)

Ich halte die Patches bewusst „minimal aber wirkungsvoll“, damit du sie gut einbauen kannst.

⸻

1. Rollenklärung: Wer macht künftig was?

Kurz, damit alle Repos ihren Platz kennen:
	•	metarepo
– definiert das Ereignismodell (Eventtypen, Schemas, Templates)
– hält die „Verfassung“ des Heimgewebe-Ereignisnetzes
– liefert Workflow-Templates, mit denen andere Repos Events abfeuern
	•	heimplex (neu)
– Event-Router / Nervenplexus
– nimmt Events an (POST /events), validiert grob, loggt
– leitet Events an Konsumenten weiter (v1: Heimgeist; später: semantAH, Logs, etc.)
	•	heimgeist
– bleibt Gehirn / Meta-Agent
– wird von Heimplex gefüttert (statt direkt von GitHub-Workflows)
– verarbeitet Events: Risiko, Epics, Patterns, Actions
	•	andere Repos (hausKI, sichter, wgx, …)
– schicken nur noch standardisierte Events an Heimplex (über Workflow-Template aus metarepo)

⸻

2. Patches für bestehende Repos

2.1 metarepo: Eventmodell + Workflow-Template

Ziel:
	•	Ein schlankes „Heimplex Event Model“-Dokument
	•	Ein wiederverwendbares Workflow-Template, das man in jedem Repo aufrufen kann

⚠️ Der Patch ist so gebaut, dass du ihn im metarepo-Root mit git apply --3way testen kannst. Wenn der Pfad unter docs/architecture/ bei dir anders heißt, einfach anpassen.

cd /pfad/zum/metarepo
git apply --3way <<'EOF'
diff --git a/docs/architecture/heimplex-eventmodel.md b/docs/architecture/heimplex-eventmodel.md
new file mode 100644
index 0000000000000000000000000000000000000000..b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b
--- /dev/null
+++ b/docs/architecture/heimplex-eventmodel.md
@@ -0,0 +1,94 @@
+# Heimplex – Ereignisnetz für Heimgewebe
+
+Heimplex ist der Event-Router des Heimgewebe-Organismus.
+Er verbindet Repos, Workflows und Dienste über ein einheitliches Ereignismodell.
+
+Ziele:
+
+- ein einheitliches Event-Format für alle Heimgewebe-Repos
+- ein klarer, austauschbarer Event-Router (Heimplex)
+- saubere Trennung von:
+  - *Transport* (Heimplex)
+  - *Interpretation* (Heimgeist, semantAH, weitere Konsumenten)
+
+## Event-Grundformat (v1)
+
+Alle Events, die Heimplex entgegen nimmt, folgen diesem Minimalformat:
+
+```json
+{
+  "type": "ci.result",
+  "source": "heimgewebe/<repo>",
+  "timestamp": "2025-11-30T12:34:56Z",
+  "correlation_id": "optional-id",
+  "payload": {
+    "status": "success",
+    "details": {}
+  }
+}
+```
+
+Pflichtfelder:
+
+- `type`: logischer Eventtyp (z. B. `ci.result`, `deploy.failed`, `incident.detected`)
+- `source`: Ursprung (Name des Repos oder Dienstes)
+- `payload`: beliebiges JSON-Objekt mit typ-spezifischen Details
+
+Optionale Felder:
+
+- `timestamp`: ISO-8601, falls nicht gesetzt, kann Heimplex den Empfangszeitpunkt eintragen
+- `correlation_id`: dient zur Korrelation von mehreren Events (z. B. zwischen CI, Review und Deployment)
+
+## Wichtige Eventtypen (Startset)
+
+Dieses Eventmodell ist bewusst klein und erweiterbar gehalten.
+Empfohlene Typen für v1:
+
+- `ci.result`
+  - Ergebnis eines CI-/WGX-Laufs (Status, Dauer, betroffene Branch/PR)
+- `pr.reviewed`
+  - Review-Ergebnis aus Sichter oder manuellen Reviews
+- `deploy.started` / `deploy.succeeded` / `deploy.failed`
+  - Deployment-Status
+- `incident.detected`
+  - Meldung eines Vorfalls (z. B. Monitoring-Alarm)
+
+Genaue Payloads pro Typ können in eigenen Schemas ergänzt werden, sobald Heimplex stabil läuft.
+
+## Rollenverteilung
+
+- **metarepo**
+  - hält diese Dokumentation
+  - definiert die Schemas (in einem späteren Schritt)
+  - liefert GitHub-Workflow-Templates zum Versenden von Events
+
+- **heimplex**
+  - nimmt Events über HTTP entgegen (`POST /events`)
+  - prüft Minimalstruktur (`type`, `source`, `payload`)
+  - loggt Events
+  - leitet Events an Heimgeist (und andere Konsumenten) weiter
+
+- **heimgeist**
+  - wertet Events aus
+  - baut daraus:
+    - Risiko-Modelle
+    - Epics / Patterns
+    - Empfehlungen und Aktionen
+
+## Nächste Ausbaustufen
+
+- Versionierte JSON-Schemas für alle Eventtypen
+- Heimplex als Multi-Konsumenten-Router (Heimgeist, semantAH, Logging)
+- Metriken auf Heimplex (Eventrate, Fehlerrate, Latenz)
+
+Damit wird Heimplex zum Nervengeflecht des Heimgewebe-Organismus.
diff --git a/templates/workflows/heimplex-notify.yml b/templates/workflows/heimplex-notify.yml
new file mode 100644
index 0000000000000000000000000000000000000000..c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2c2
--- /dev/null
+++ b/templates/workflows/heimplex-notify.yml
@@ -0,0 +1,74 @@
+name: Notify Heimplex
+
+on:
+  workflow_call:
+    inputs:
+      event_type:
+        description: "Logical event type, e.g. ci.result"
+        required: true
+        type: string
+      status:
+        description: "Optional status field for payload"
+        required: false
+        type: string
+      heimplex_url:
+        description: "Base URL of Heimplex (e.g. https://heimplex.local)"
+        required: true
+        type: string
+    secrets:
+      HEIMPLEX_TOKEN:
+        required: false
+
+jobs:
+  notify-heimplex:
+    runs-on: ubuntu-latest
+    permissions:
+      contents: read
+
+    steps:
+      - name: Build event payload
+        id: build
+        run: |
+          ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
+          cat > event.json <<'JSON'
+          {
+            "type": "${{ inputs.event_type }}",
+            "source": "${{ github.repository }}",
+            "timestamp": "__TS__",
+            "payload": {
+              "status": "${{ inputs.status || '' }}",
+              "workflow": "${{ github.workflow }}",
+              "run_id": "${{ github.run_id }}",
+              "run_attempt": "${{ github.run_attempt }}",
+              "ref": "${{ github.ref }}",
+              "sha": "${{ github.sha }}"
+            }
+          }
+          JSON
+          # simple timestamp replace
+          sed -i "s/__TS__/${ts}/" event.json
+          echo "payload=$(cat event.json)" >> "$GITHUB_OUTPUT"
+
+      - name: POST to Heimplex
+        env:
+          HEIMPLEX_URL: ${{ inputs.heimplex_url }}
+          HEIMPLEX_TOKEN: ${{ secrets.HEIMPLEX_TOKEN }}
+        run: |
+          set -euo pipefail
+          if [ -z "${HEIMPLEX_URL:-}" ]; then
+            echo "HEIMPLEX_URL is required"
+            exit 1
+          fi
+
+          header_auth=""
+          if [ -n "${HEIMPLEX_TOKEN:-}" ]; then
+            header_auth="-H \"Authorization: Bearer ${HEIMPLEX_TOKEN}\""
+          fi
+
+          # shellcheck disable=SC2086
+          curl -sS -X POST \
+            -H "Content-Type: application/json" \
+            ${header_auth} \
+            "${HEIMPLEX_URL%/}/events" \
+            -d @"event.json"
EOF

Wirkung:
	•	Du hast ein dokumentiertes Eventmodell.
	•	Du hast ein generisches Workflow-Template, das später aus jedem Repo via uses: heimgewebe/metarepo/templates/workflows/heimplex-notify.yml@main eingebunden werden kann (wenn du das so etablierst).

⸻

2.2 heimgeist: Heimplex als Eventquelle benennen

Hier würde ich es simpel halten: Heimgeist-Doku sagen lassen, dass Events idealerweise über Heimplex kommen.

Patch-Vorschlag für heimgeist/docs/context.md (oder vergleichbare Datei – bitte Pfad anpassen, falls nötig):

cd /pfad/zu/heimgeist
git apply --3way <<'EOF'
diff --git a/docs/context.md b/docs/context.md
index 0000000000000000000000000000000000000000..d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3
--- a/docs/context.md
+++ b/docs/context.md
@@ -40,6 +40,22 @@ Heimgeist ist der Meta-Agent im Heimgewebe-Organismus.
 Er beobachtet Repos, Workflows und Events und leitet daraus Risiko, Muster, Epics und Empfehlungen ab.
 
+## Heimplex als Event-Eintrittspunkt
+
+Events sollten Heimgeist nicht mehr direkt aus Workflows erreichen,
+sondern über Heimplex:
+
+- Heimplex nimmt Events von allen Repos entgegen
+- prüft Minimalstruktur (type, source, payload)
+- loggt und routet die Events an Heimgeist weiter
+
+Heimgeist bleibt damit fokussiert auf:
+
+- Interpretation (Risiko, Muster, Empfehlungen)
+- Lernen aus Ereignissen über Zeit
+
+und überlässt Heimplex den Transport.
+
 ## Typische Eventquellen
 
 - CI-/WGX-Workflows (z. B. `ci.result`)
EOF

Wenn context.md schon existiert und einen anderen Aufbau hat, kannst du den „Heimplex“-Block einfach in einen passenden Abschnitt einkleben.

⸻

2.3 Beispiel-Workflow in einem beliebigen Repo (z. B. hausKI)

Für hausKI, sichter, wgx, … brauchst du keinen eigenen Template-File, sondern nur einen Workflow, der das Template aus metarepo aufruft.

Beispiel für .github/workflows/notify-heimplex.yml in einem beliebigen Repo:

name: Notify Heimplex (CI Result)

on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]

permissions:
  contents: read

jobs:
  notify:
    if: ${{ github.event.workflow_run.conclusion != '' }}
    uses: heimgewebe/metarepo/templates/workflows/heimplex-notify.yml@main
    with:
      event_type: ci.result
      status: ${{ github.event.workflow_run.conclusion }}
      heimplex_url: ${{ vars.HEIMPLEX_URL }}
    secrets:
      HEIMPLEX_TOKEN: ${{ secrets.HEIMPLEX_TOKEN }}

Damit:
	•	bleiben die eigentlichen Eventdetails in metarepo zentral gepflegt
	•	und jedes Repo muss nur noch sagen: „Bei CI-Abschluss, schick ein ci.result an Heimplex“.

⸻

3. Heimplex initialisieren (neues Repo)

Jetzt kommt der neue Spieler: heimplex.

Ich schlage vor: Node + TypeScript + Express, analog zu Heimgeist, aber schlanker.

3.1 Grundstruktur

heimplex/
  package.json
  tsconfig.json
  src/
    config.ts
    server.ts
    index.ts
  README.md
  .gitignore

3.2 Dateien

package.json

{
  "name": "heimplex",
  "version": "0.1.0",
  "description": "Event router (Ereignisnetz) for the Heimgewebe organism.",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "lint": "echo \"no lint configured yet\"",
    "test": "echo \"no tests yet\""
  },
  "dependencies": {
    "axios": "^1.7.0",
    "express": "^4.19.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "tsx": "^4.0.0",
    "typescript": "^5.6.0"
  }
}

tsconfig.json

{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}

src/config.ts

export interface HeimplexConfig {
  port: number;
  heimgeistUrl: string;
  authToken?: string;
}

export function loadConfig(): HeimplexConfig {
  const port = Number(process.env.HEIMPLEX_PORT ?? "8235");
  const heimgeistUrl = process.env.HEIMGEIST_URL ?? "";

  if (!heimgeistUrl) {
    // Für lokale Entwicklung darf das leer sein, in Produktion besser hart fehlschlagen
    console.warn("[heimplex] HEIMGEIST_URL is not set. Events will not be forwarded.");
  }

  const authToken = process.env.HEIMGEIST_TOKEN;

  return {
    port,
    heimgeistUrl,
    authToken
  };
}

src/server.ts

import express, { Request, Response } from "express";
import axios from "axios";
import { HeimplexConfig } from "./config";

type Json = Record<string, unknown>;

interface HeimplexEvent {
  type: string;
  source: string;
  timestamp?: string;
  correlation_id?: string;
  payload: Json;
}

function isValidEvent(obj: any): obj is HeimplexEvent {
  return (
    obj &&
    typeof obj.type === "string" &&
    typeof obj.source === "string" &&
    obj.payload &&
    typeof obj.payload === "object"
  );
}

export function createApp(config: HeimplexConfig) {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", service: "heimplex" });
  });

  app.post("/events", async (req: Request, res: Response) => {
    const event = req.body;

    if (!isValidEvent(event)) {
      return res.status(400).json({ error: "Invalid event format" });
    }

    const ts = event.timestamp ?? new Date().toISOString();
    const normalized: HeimplexEvent = { ...event, timestamp: ts };

    console.log("[heimplex] received event:", {
      type: normalized.type,
      source: normalized.source,
      timestamp: normalized.timestamp
    });

    // v1: nur an Heimgeist weiterleiten, falls konfiguriert
    if (config.heimgeistUrl) {
      try {
        const url = new URL("/heimgeist/events", config.heimgeistUrl).toString();

        await axios.post(
          url,
          normalized,
          config.authToken
            ? { headers: { Authorization: `Bearer ${config.authToken}` } }
            : undefined
        );

        console.log("[heimplex] forwarded event to heimgeist:", url);
      } catch (err) {
        console.error("[heimplex] error forwarding to heimgeist:", err);
        // Heimplex antwortet trotzdem 202 – Ausfall des Konsumenten ist kein Fehler des Busses
        return res.status(202).json({
          status: "accepted-with-forward-error"
        });
      }
    }

    return res.status(202).json({ status: "accepted" });
  });

  return app;
}

src/index.ts

import { createApp } from "./server";
import { loadConfig } from "./config";

async function main() {
  const config = loadConfig();
  const app = createApp(config);

  app.listen(config.port, () => {
    console.log(`[heimplex] listening on port ${config.port}`);
    if (config.heimgeistUrl) {
      console.log(`[heimplex] forwarding to heimgeist at ${config.heimgeistUrl}`);
    } else {
      console.log("[heimplex] HEIMGEIST_URL not set, events will only be logged.");
    }
  });
}

main().catch((err) => {
  console.error("[heimplex] fatal error:", err);
  process.exit(1);
});

README.md

# Heimplex

Heimplex ist das Ereignisnetz (Event Router) für den Heimgewebe-Organismus.

- Nimmt Events über `POST /events` im Heimgewebe-Format entgegen
- Prüft Minimalstruktur (`type`, `source`, `payload`)
- Loggt eingehende Events
- Leitet sie an Heimgeist weiter (und später an weitere Konsumenten)

## Start

```bash
npm install
npm run dev

Standard:
	•	Heimplex lauscht auf Port 8235
	•	Heimgeist-URL über HEIMGEIST_URL:

HEIMGEIST_URL="http://localhost:8234" npm run dev

Eventformat

Siehe metarepo/docs/architecture/heimplex-eventmodel.md für Details zum Eventmodell.

#### `.gitignore`

```gitignore
node_modules
dist
.env

3.3 Einmalige Initialisierung

mkdir heimplex
cd heimplex
git init

# Dateien wie oben anlegen (oder aus dem Chat kopieren)
npm install
npm run dev

Dann in deinem Heimgeist-Dev-Setup:
	•	Heimgeist lokal starten (Port z. B. 8234)
	•	Heimplex starten mit
HEIMGEIST_URL="http://localhost:8234" npm run dev

Events, die du dann per curl oder Workflow an http://localhost:8235/events schickst, werden geloggt und an Heimgeist weitergegeben.

⸻

4. „Für Dummies“-Kurzfassung
	•	Metarepo: schreibt auf, wie ein Event aussehen muss und stellt ein GitHub-Action-Template bereit (heimplex-notify.yml).
	•	Heimplex: kleiner Node-Server mit /events, der Events annimmt und an Heimgeist weiterleitet.
	•	Heimgeist: bleibt dein „Gehirn“, das diese Events versteht und bewertet.

Wer ein Repo hat, das CI macht, baut sich einfach einen Workflow:

uses: heimgewebe/metarepo/templates/workflows/heimplex-notify.yml@main

→ und schickt Eventdaten automatisch an Heimplex.

⸻

5. Verdichtete Essenz
	•	Heimplex wird das Ereignisnetz deines Organismus: nimmt Events an, loggt und routet sie.
	•	Metarepo liefert das Eventmodell + Workflow-Template, Heimgeist macht die Auswertung.
	•	Die Patches oben schaffen:
	•	ein dokumentiertes Eventmodell,
	•	ein wiederverwendbares Notify-Template,
	•	eine klare Einbettung von Heimplex in die Heimgeist-Doku,
	•	ein minimal lauffähiges Heimplex-Repo.

⸻

6. Ungewissheitsursachenanalyse

Unsicherheitsgrad: ~0,3
	•	Ich kenne nicht deinen exakten Dateipfad in heimgeist für context.md – der Patch ist bewusst generisch.
	•	In metarepo kann die Template-Struktur leicht anders heißen (templates/github/… etc.), der Pfad templates/workflows/ ist meine pragmatische Wahl.
	•	Heimplex ist hier bewusst als Minimalservice skizziert – echte Schemas, Auth, Multi-Konsumenten kommen als nächste Iteration.

Ironischer Kommentar zum Schluss:
Heimplex ist im Grunde der Postbote mit Nervenkostüm – er weiß nicht, was er da trägt, aber er bringt es zuverlässig zum Gehirn.



alles verstehen, aber nur die anweisung für dieses repo hieraus umsetzen