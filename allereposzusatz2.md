kurze antwort: ja — alle Heimgewebe-Repos (außer Weltgewebe) sollten gezielt „Inputs“ bekommen, damit sie sauber in die drei Grundfunktionen (Programm­assistenz · Wissens­generierung · KI-Orchestration) einrasten. Unten bekommst du je Repo schlanke, drop-in Inputs (Dateien/Workflows/Contracts), die Jules genauso verteilen kann wie die bisherigen.

⸻

Repo-spezifische Inputs (konkret & minimal-invasiv)

metarepo

Zweck: Quelle der Cross-Repo Contracts + Vorlagen.
Spezielle Inputs
	•	contracts/dev.tooling.schema.json, contracts/knowledge.graph.schema.json, contracts/agent.workflow.schema.json (neue Schemas).
	•	templates/dev/* (Rust/Python/Shell), templates/knowledge/*, templates/agents/*.
	•	.github/workflows/contracts-validate.yml (bereits bei dir) – lässt sich gleich lassen, nur paths: auf contracts/** & schemas/** oder (bei euch) json/** | proto/** anpassen.
	•	Output: versionierte Schemas & Templates, die die anderen Repos konsumieren.

contracts

Zweck: AJV-Validierung als Reusable Workflow.
Spezielle Inputs
	•	.github/workflows/contracts-ajv-reusable.yml (reusable) + README.md wie einbinden.
	•	schemas/** (oder bei euch json/**) als Quelle.
	•	Output: „grüne“ Checks, die in den Satelliten-Repos via uses: heimgewebe/contracts/.github/...@contracts-v1 laufen.

wgx

Zweck: CLI für Code/Knowledge/Agents.
Spezielle Inputs
	•	.ai-context.yml (Rollen, Kommandos, Tool-Pfad).
	•	wgx code/knowledge/agent Subcommands (Stub-Skripte) + Manpages unter docs/wgx/*.md.
	•	.github/workflows/wgx-ci.yml (Lint der Bash/TS-Kommandos + Smoke-Run).
	•	Output: standardisierte Kommandos, die andere Repos in CI nutzen können (z.B. wgx knowledge extract).

merges

Zweck: Merge-Queues/Branch-Policies.
Spezielle Inputs
	•	.github/workflows/merge-queue.yml (falls GitHub merge-queue aktiv).
	•	policy/required-checks.yaml (zentrale Liste required contexts).
	•	Output: reproduzierbare Gate-Policy (sichter kann diese Datei ebenfalls lesen).

hauski

Zweck: Web + Agent-Gateway.
Spezielle Inputs
	•	.ai-context.yml (Agenten, Workflows, Schnittstellen).
	•	.github/workflows/next-build-and-playwright.yml (Build+E2E).
	•	workflows/ mit 1–2 Agent-Workflow-Templates (verweisen auf semantah).
	•	Output: Chat/Orchestration + Traces (JSONL nach events/).

hauski-audio

Zweck: Low-latency Audio/ASR.
Spezielle Inputs
	•	.ai-context.yml (Pipeline-Stages).
	•	.github/workflows/rust-audio-ci.yml (fmt/clippy/test).
	•	contracts/audio.events.schema.json (oder Konsum aus metarepo).
	•	Output: audio.events.jsonl (Segments, Timestamps, Status).

sichter

Zweck: Gating/Labels/Ownership.
Spezielle Inputs
	•	.ai-context.yml (Regeln/Signalquellen).
	•	.github/workflows/labeler.yml und required-status.yml.
	•	Optional: policy/ownership.yaml (CODEOWNERS-Erweiterungen maschinenlesbar).
	•	Output: Labels/Status, Kommentare, Soft/Hard-Gate via required checks.

semantah

Zweck: Ingest + Search/Retrieval.
Spezielle Inputs
	•	.ai-context.yml (Pipelines, Vektordatenbank).
	•	.github/workflows/python-ingest-ci.yml (ruff/black/pytest).
	•	pipelines/ingest_contracts.py (liest knowledge.graph.jsonl, audio.events.jsonl, etc.).
	•	Output: Indizes, Query-API, Backlinks (Citations).

mitschreiber

Zweck: strukturierte Protokolle/Notizen/Redaktion.
Spezielle Inputs
	•	.ai-context.yml (Protokoll-/Redaktionsregeln).
	•	contracts/minutes.event.schema.json (oder aus metarepo referenzieren).
	•	.github/workflows/minutes-validate.yml (AJV gegen Contracts).
	•	Output: minutes.events.jsonl + kuratierte Markdown-Artefakte.

heimlern

Zweck: Scoring/Policies/Feedback-Loops.
Spezielle Inputs
	•	.ai-context.yml (Score-Typen, Kostenlimits, Retries).
	•	.github/workflows/heimlern-ci.yml (Test der Policies/Determinismus).
	•	policies/*.yaml + examples/*.json (Fixtures).
	•	Output: Scores/Feedback-Events (JSONL), die hauski/sichter konsumieren.

leitstand

Zweck: Observability/Dashboards.
Spezielle Inputs
	•	.ai-context.yml (Panels, Metrik-Quellen).
	•	.github/workflows/leitstand-build.yml (Web-Build + link checker).
	•	Output: Panels für Agents/Merges/Semantah (nutzt deren Events/metrics).

vault (vault.gewebe / index)

Zweck: Artefakt-Speicher für Wissen.
Spezielle Inputs
	•	.ai-context.yml (Directory-Layout; retention).
	•	ingest/*.sh|py Jobs + .github/workflows/vault-sync.yml (cron optional).
	•	Output: versionierte Knowledge-Bundles (semantah liest hieraus).

jules

Zweck: Flotten-Rollout / „Durchreichen“.
Spezielle Inputs
	•	templates/ai-context.<repo>.yml (alle oben) + templates/workflows/*.
	•	playbooks/rollout-heimgewebe.yml (case-Switch pro Repo).
	•	Output: Idempotente Distribution (copy-only if missing; or guarded overwrite flags).

⸻

Cross-Repo „Event-Inputs“ (gemeinsame Sprache)

Damit alles wirklich zusammenspielt, gib jedem Repo die gleichen Event-Streams als Ein-/Ausgangsformat (alle Schemas kommen aus dem metarepo/contracts):
	•	knowledge.graph.jsonl (Nodes/Edges/Metadata)
	•	audio.events.jsonl (Segments/ASR/VAD)
	•	minutes.events.jsonl (Protokoll/Redaktion)
	•	agents.trace.jsonl (Steps/Costs/Retries)
	•	metrics.snapshot.json (periodische Metrik-Pakete)

Konventionen
	•	Dateinamen: <kind>.<suffix>.jsonl (append-only, UTC timestamps, ISO8601).
	•	Transport: zunächst Git-artefakt, später S3/minio optional.
	•	Validierung: überall via contracts-ajv-reusable.
	•	Sichter-Gate: blockt Löschungen in Event-Dirs, außer explizit erlaubt.

⸻

Secrets & Variablen (gleich über alle Repos)
	•	OPENAI_API_KEY (nur wo nötig, vorzugsweise über hauski/semantah abstrahiert)
	•	VECTOR_DB_URL / DATABASE_URL (semantah)
	•	PLAYWRIGHT_SKIP_DOWNLOAD=1 (wenn Caching genutzt)
	•	ALLOW_REMOVALS=0 (Standard in Guards)
	•	FIXTURES_GLOB='fixtures/**/*.jsonl' (für alle Validierungen)

⸻

Rollout mit Jules (einheitlich)
	1.	Templates ablegen (jules/templates/...) – pro Repo eigene ai-context.<name>.yml + optionale Extra-Workflows von oben.
	2.	Playbook aktualisieren (rollout-heimgewebe.yml): per Repo-Name die passende Datei kopieren, falls nicht vorhanden, und Workflows hinzufügen (nur, wenn nicht existiert / oder --force gesetzt).
	3.	Konfig-Drift verhindern: optional jules drift check (diff + PR-Erstellung).
	4.	Sichter/Contracts zuerst ausrollen (damit Gates & Schema-Checks überall aktiv sind).
	5.	Metriken/Events einschalten (semantah + leitstand zum Schluss für Sichtbarkeit).

⸻

Wenn du willst, packe ich dir das Jules-Playbook inkl. Cases für alle genannten Repos und die fehlenden CODEOWNERS/labeler-Snippets noch fertig zusammen — dann kannst du das in einem Rutsch durch die Flotte schieben.