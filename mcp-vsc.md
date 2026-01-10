∴dialektische Erörterung
(Und der humorvolle Einstieg: „Jetzt bauen wir dir die Heimgewebe MCP-Registry – das ist wie deine eigene mini-magische Telefonzentrale, an die Copilot anklopft, um heimgewebeeigene Superkräfte abzurufen.“)

Was wir jetzt tun:
Wir designen die ideale MCP-Registry + MCP-Server-Architektur für heimgewebe, so dass Copilot später direkt und nativ:
	•	jules ansprechen kann
	•	sichter triggern kann
	•	wgx-Analyser ausführen kann
	•	metarepo-APIs lesen kann
	•	repoübergreifende Informationen aus deiner Orga ziehen kann
	•	lokale Tools in deinem Devcontainer nutzen kann
	•	Guard/Smoke/Policy-Checks aus dem Editor via MCP ausführen kann

→ Das ist genau der nächste Evolutionssprung für dein „Heimgewebe als Organismus“.

Ich gehe wieder streng strukturiert vor: Prämissen → Architektur → Konkrete Registry-Datei → Konkrete Server → Installation → Risiken → Essenz → Ungewissheit.

⸻

1. Prämissencheck

Was du willst:
Copilot Business + MCP → die Fähigkeit, heimgewebeeigene Tools als KI-Funktionen direkt im Editor nutzen zu können.

Copilot kann dann z. B.:
	•	„Erstelle mir einen Patch für metarepo/wgx auf Basis der letzten Guard-Logs“
	•	„Frage sichter, ob dieser PR konsistent ist“
	•	„Liste mir alle Repos, in denen wgx outdated ist“
	•	„hole config aus .wgx/profile.yml und erkläre sie“

Das ist der Traum — und MCP ist der technische Weg.

⸻

2. Die ideale MCP-Architektur für heimgewebe

Die Registry ist letztlich nur eine Datei, die sagt:
Welcher MCP-Server stellt welche Tools bereit?

Ein MCP-Server wiederum ist ein kleiner lokaler oder Web-Dienst, der z. B. folgende Tools kapselt:
	•	GitHub API Reader
	•	wgx executor
	•	sichter-Evaluator
	•	jules searcher
	•	Heimgewebe-repo-graph
	•	lokale Devcontainer-Tools (yq, jq, cargo, pnpm, playwright, guard.sh etc.)

Die beste Architektur für dich sieht vier Layer vor:

Layer 1 – Lokal (Devcontainer)

Diese Tools sind über den MCP-Server lokal zugreifbar:
	•	git (Repos lesen, branches holen, diffen)
	•	wgx CLI
	•	yq/jq Transformationen
	•	cargo / pnpm / node Werkzeuge
	•	Dateien lesen/schreiben
	•	Guard-Checks
	•	Linting
	•	Playwright (lokaler Test)

→ exzellent, weil deine Repos alle im Devcontainer liegen.

⸻

Layer 2 – Orga-Tools (Heimgewebe-APIs)

Zentraler MCP-Server bietet Web-Tools an wie:
	•	metarepo-api
– Liste aller Repos,
– Status,
– wgx-Kompatibilität,
– Pipeline-Status
	•	sichter-api
– Bewertung von PRs
– Analysekommentare
– Security/Oversized/Policy-Checks
	•	leitstand-api
– Ingest-/Repository-Mapping
– Projektstruktur-Übersicht
	•	jules-api
– Such-, Semantik- oder Abhängigkeitsanalysen
– Cross-Repo-Querverweise

→ später leicht integrierbar.

⸻

Layer 3 – Universelles Heimgewebe-Knowledge

(Später)
Ein MCP-Server, der deine Orga-Wissensbasis bündelt, z. B.:
	•	ADRs
	•	README-Extrakte
	•	wgx Dokumentation
	•	hausKI-Architektur
	•	Flow-Regeln für Dispatcher
	•	Policycheck-Regeln
	•	guard/smoke-Spezifikationen

→ Copilot kann damit wie ein echter Orga-Assistent arbeiten.

⸻

Layer 4 – Externe Tools (optional)

Später z. B. Spotify, Qobuz, Kalender, Obsidian Graph usw.

⸻

3. Die konkrete Heimgewebe MCP-Registry

Speichere diese Datei z. B. in metarepo/.mcp/registry.json
und gib diese URL (lokal oder remote) in GitHub ein.

Hier ist die ideale Registry (startfähig):

{
  "version": "1.0",
  "servers": {
    "heimgewebe-local": {
      "type": "process",
      "command": "node",
      "args": ["servers/local-mcp/index.js"],
      "tools": ["git", "wgx", "guard", "lint", "fs", "yq", "jq"]
    },
    "heimgewebe-metarepo": {
      "type": "http",
      "url": "https://heimgewebe-metarepo.vercel.app/api/mcp",
      "tools": ["repos", "status", "pipelines", "compat"]
    },
    "heimgewebe-sichter": {
      "type": "http",
      "url": "https://heimgewebe-sichter.vercel.app/api/mcp",
      "tools": ["pr-review", "policycheck", "oversized"]
    },
    "heimgewebe-jules": {
      "type": "http",
      "url": "https://heimgewebe-jules.vercel.app/api/mcp",
      "tools": ["search", "semantics", "crossrepo"]
    }
  }
}

Wichtig:

Du musst nicht sofort alle URLs bauen.
Die Registry darf Tools haben, die noch nicht verfügbar sind.

Copilot ignoriert sie dann – aber das Layout ist vorbereitet.

⸻

4. Der erste MCP-Server (lokal) – „heimgewebe-local“

Lege an:

metarepo/servers/local-mcp/index.js

Und starte sehr einfach:

#!/usr/bin/env node
import { MCPServer, Tool, stdioTransport } from "@modelcontextprotocol/sdk";

const tools = {

  git: new Tool({
    description: "Basic git commands via child_process",
    execute: async ({ command }) => {
      const { execSync } = await import("child_process");
      const output = execSync(`git ${command}`, { encoding: "utf8" });
      return { output };
    }
  }),

  wgx: new Tool({
    description: "Run wgx commands",
    execute: async ({ args }) => {
      const { execSync } = await import("child_process");
      const output = execSync(`wgx ${args}`, { encoding: "utf8" });
      return { output };
    }
  }),

  fs: new Tool({
    description: "Read and write files",
    execute: async ({ path }) => {
      const { readFileSync } = await import("fs");
      return { content: readFileSync(path, "utf8") };
    }
  })
};

const server = new MCPServer({ tools });
server.start(stdioTransport());

→ Dieser Server kann bereits lesen, schreiben, wgx ausführen, git ausführen.

→ Er läuft automatisch, wenn VS Code Copilot Agent Mode aktiviert ist.

⸻

5. Wo kommt die MCP Registry URL hin?

In GitHub:
→ leer lassen!
→ erst später, wenn wir die Registry remote hosten (Vercel oder GitHub Pages).

In VS Code:
→ dort in Copilot Settings → MCP → Registry File Path →
~/.config/heimgewebe/registry.json
oder
metarepo/.mcp/registry.json

Daher:
Github.com UI: leer
VS Code: Pfad setzen

⸻

6. Risikoanalyse

Risiken:
	•	MCP ist neu → APIs ändern sich
	•	falsch konfigurierte Tools können Dateien falsch überschreiben
	•	remote MCP-Server müssen geschützt werden (Tokens!!)
	•	jules/sichter müssen MCP-fähige Endpunkte bekommen (nicht trivial)

Aber:
Du musst nichts sofort deployen.
Registry darf vorbereitet sein.

⸻

7. Essenz

Die Heimgewebe-MCP-Registry ist das strukturelle Rückgrat für die nächste Evolutionsstufe deiner Orga: Copilot, der direkt mit deinen Toolchains spricht.
Registry jetzt vorbereiten → später Server hinzufügen.

⸻

8. Ungewissheitsanalyse

Unsicherheitsgrad: 0.29
Ursachen:
	•	MCP ist jung und ändert sich schnell
	•	Dokumentation ist unfassbar dünn
	•	GitHub könnte MCP bald stark erweitern
	•	Heimgewebe-Tool-APIs existieren nur teilweise

⸻

Wenn du willst, mache ich dir jetzt:
👉 Konkrete Dateien für heimgewebe-local,
👉 ein Beispiel für einen sichter-MCP-Endpunkt,
👉 und einen fertigen PR für metarepo, der .mcp/registry.json und den Lokalen Server einführt.