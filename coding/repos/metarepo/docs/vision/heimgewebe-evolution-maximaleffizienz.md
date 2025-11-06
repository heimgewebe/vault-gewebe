# Heimgewebe – Evolution auf Maximaleffizienz

**Prämisse:** Datenschutz ist nachrangig. Primärziele sind Nutzen, Komfort, Geschwindigkeit.

## Leitsätze
- Alles erfassen, was nützt (Code, Audio, Screen, OS-Kontext).
- Orchestrieren statt monolithisch (Supervisor + spezialisierte Agenten).
- Contracts-First (JSON-Schemas, reproduzierbare Pipelines).
- Haus-Ingress bleibt hausKI (`/assist` als Einfallstor).

## Bausteine (Zielbild)
- **hausKI**: `/assist` ruft Agent-Supervisor (lokal) auf; Fallback: `/ask`.
- **semantAH**: Vektor-/Graph-Layer (Events, temporale Kanten, Code/Vault-Search).
- **mitschreiber**: Reward/Intent-Export (maximaler Kontext).
- **leitstand**: Ingest von `intent_event`/Rewards → semantAH.
- **heimlern**: Feedback-Processor → Policies für proaktive Vorschläge.
- **aussensensor**: Daily Synthesis + Edges in semantAH.

## Roadmap (Welle 1–3)
1. **Welle 1 (dieser Patch):** Agent-Kit + Contracts in Fleet.
2. **Welle 2:** `/assist` in hausKI, Graph/Index in semantAH, Intents/Rewards in leitstand/mitschreiber.
3. **Welle 3:** heimlern Policies („smart-run“), CI-Smokes, proaktive Automationen.

## Erfolgskriterien
- p95 Latenz je Query & Trace-Qualität (Zitate, Deckung).
- Downstream-PR-Adoption (Wave-Merge-Rate).
- Zuwachs an automatisierten Workflows.
