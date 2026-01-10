Ich fang mit der Sammlung an und sortiere sie so, dass du sie später direkt für „GPT-Contracts“ anzapfen kannst – egal ob als Memory, ai-context oder Prompt-Snippet.

⸻

1. Wo liegen im Heimgewebe überhaupt „Contracts“?

Aus dem Merge sieht man ziemlich klar drei Ebenen:
	1.	Metarepo
	•	Zentrale JSON-Schemas für Agents, Events, Policies, OS-Kontext usw.
	•	Wird explizit als „Contracts-First, Schemas in metarepo sind die Wahrheit“ beschrieben.
	2.	contracts-Repo
	•	Enthält Protobuf-Definitionen für „offizielle“ Heimgewebe-APIs (heimgewebe/aussen/v1, heimgewebe/heimlern/v1) und eine kleine JSON-Schema-Spielwiese (json/*.schema.json) plus Konventionen.
	3.	Repo-spezifische Contracts
	•	In hausKI, aussensensor, semantAH, heimlern, weltgewebe, mitschreiber liegen nochmal eigene contracts/ oder docs/contracts/-Schemas, die auf die zentrale Welt aufsetzen, aber Domänen-Details definieren.

Den „Vertragsteppich“ kann man daher gut repo-weise katalogisieren.

⸻

2. Metarepo – zentrale Contracts

2.1 Kern-Schemas in metarepo/contracts/*.schema.json

Kategorie contract listet u. a.:  ￼
	•	Agent / Werkzeuge / Workflows
	•	contracts/agent.tool.schema.json
	•	contracts/agent.workflow.schema.json
	•	Audio & Außenwelt
	•	contracts/audio.events.schema.json
	•	contracts/aussen.event.schema.json
	•	Dev-Tooling & Event-Basis
	•	contracts/dev.tooling.schema.json
	•	contracts/event.line.schema.json
	•	Fleet & Metriken
	•	contracts/fleet.health.schema.json
	•	contracts/metrics.snapshot.schema.json
	•	Insights & Knowledge
	•	contracts/insights.schema.json
	•	contracts/insights.daily.schema.json
	•	contracts/knowledge.graph.schema.json
	•	OS-Kontext
	•	contracts/os.context.intent.schema.json
	•	contracts/os.context.state.schema.json
	•	contracts/os.context.text.embed.schema.json
	•	contracts/os.context.text.redacted.schema.json
	•	Policy-Ebene
	•	contracts/policy.decision.schema.json
	•	contracts/policy.feedback.schema.json
	•	contracts/policy.snapshot.schema.json
	•	Review-Policy
	•	contracts/review.policy.yml

Zusätzlich als Vorlage:
	•	templates/agent-kit/contracts/agent.tool.schema.json  ￼

Meta-Docs im contracts-Repo selbst:
	•	contracts/README.md – erklärt das Repo und AI-Kontext.  ￼
	•	contracts/SCHEMA_CONVENTIONS.md – beschreibt Namens-/Struktur-Konventionen für alle Schemas.  ￼

Das sind deine eigentlichen „Verfassungsartikel“ des Heimgewebes.

⸻

3. contracts-Repo – Protobuf + JSON-Mirror

Im contracts-Repo selbst gibt es:
	•	Protobuf-APIs
	•	heimgewebe/aussen/v1/event.proto
	•	EventEnvelope für Außen-Events (id, event_type, occurred_at, payload, context).  ￼
	•	heimgewebe/heimlern/v1/decision.proto
	•	Decision (decision_id, learner_id, options[], decided_at, metadata).  ￼
	•	JSON-Schemas (Proto-nah)
	•	json/aussen.event.schema.json
	•	json/os.context.state.schema.json
	•	json/test.schema.json

Das ist die exportierte Außen-API (Proto) + JSON-Variante – perfekt als Basis für Generatoren (Client-Stubs, Event-Producer/Consumer, Test-Fixtures).

⸻

4. Repo-spezifische Contracts

4.1 hausKI

Unter docs/contracts/ in hausKI:
	•	docs/contracts/events.schema.json – „HausKI Event“ (Logs, Bus, Audits, einheitliches Format).  ￼
	•	Beispiel: docs/contracts/examples/event.sample.json
	•	Tool-Input-Schemas:
	•	docs/contracts/tools/query_vault.schema.json
	•	docs/contracts/tools/search_codebase.schema.json  ￼

Funktion:
	•	Ereignis-Logging, Observability und Tool-Calls konsistent für hausKI.

⸻

4.2 aussensensor
	•	contracts/aussen.event.schema.json im aussensensor-Repo – lokale Variante des Außen-Events.  ￼

Das ist die konkrete Außen-Schnittstelle für eingehende Events vor dem Gang nach chronik / heimlern.

⸻

4.3 semantAH

SemantAH hat seinen eigenen Semantik-Contract-Satz:
	•	contracts/insights.schema.json – generische Insight-Struktur.  ￼
	•	Semantik-Schemas:
	•	contracts/semantics/node.schema.json
	•	contracts/semantics/edge.schema.json
	•	contracts/semantics/report.schema.json
	•	Beispiele (Valid/Invalid):
	•	contracts/semantics/examples/node-valid.json
	•	contracts/semantics/examples/node-invalid.json
	•	contracts/semantics/examples/edge-valid.json
	•	contracts/semantics/examples/edge-invalid.json
	•	contracts/semantics/examples/report-valid.json
	•	contracts/semantics/examples/report-invalid.json

Das ist der „Graph-Contract“ des semantischen Blutkreislaufs.

⸻

4.4 heimlern

Heimlern bringt eigene Contracts für Entscheidungen und bestimmte Events:  ￼
	•	contracts/aussen_event.schema.json
	•	contracts/policy.decision.schema.json
	•	contracts/policy_feedback.schema.json
	•	contracts/policy_snapshot.schema.json

Damit definierst du, wie Policies beschließen, begründen und zurückmelden.

⸻

4.5 weltgewebe

Weltgewebe hat Domain-Contracts für „Gesprächsräume“ etc.:  ￼
	•	contracts/domain/conversation.schema.json
	•	contracts/domain/message.schema.json
	•	contracts/domain/node.schema.json
	•	contracts/domain/edge.schema.json
	•	contracts/domain/role.schema.json
	•	Beispiele:
	•	contracts/domain/examples/conversation.example.json
	•	.../message.example.json
	•	.../node.example.json
	•	.../edge.example.json
	•	.../role.example.json

Das ist der „soziale Graph“ deiner Gespräche und Rollen – sehr interessant für LLM-seitige Tools, die Gesprächsräume als Datenmodell verstehen sollen.

⸻

4.6 mitschreiber
	•	contracts/os.context.text.embed.schema.json – spezialisierte Variante für Texte, die eingebettet werden.  ￼

Passt direkt zur SemantAH-Welt.