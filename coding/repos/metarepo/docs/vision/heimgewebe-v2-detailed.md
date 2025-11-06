# Heimgewebe v2 – Deep Dive (Detailfassung)

> **Ziel:** Vollständige Begründung & Architektur der maximal-nützlichen, agenten-orchestrierten Wissensinfrastruktur.

## 1) Rollen & Datenflüsse
| Komponente | Aufgabe | KI-Funktion |
|---|---|---|
| mitschreiber | Kontextsensor (OS/Audio/Screen) | Intents, Rewards, Sessions |
| leitstand | Ingest/Drehscheibe | Normalisiert, versioniert, leitet weiter |
| semantAH | Gedächtnis/Graph | Vektor-Index, temporale/semantische Kanten |
| hausKI | Ingress/Orchestrator | `/assist` ruft Agenten; Policies anwenden |
| heimlern | Lernen/Policies | Bandits/RL, proaktive Vorschläge |
| aussensensor | Außeninput | Daily Synthesis, Feeds, Edges |

**Event-Flow (vereinfachtes Beispiel):**
1. Audio-Notiz → hausKI-audio → **Intent** (+ Transkript) → `intent_event` → **leitstand**  
2. leitstand validiert/normalisiert → schreibt Event → **semantAH** indiziert Transkript & Kanten  
3. **heimlern** konsumiert Rewards/Intents → aktualisiert Policies  
4. **hausKI** beantwortet `/assist` via **Agenten** (RAG über semantAH, Tools) mit Trace/Zitaten

## 2) Agenten-System
- **Supervisor:** Routing (code / knowledge / research / …)  
- **Code-Agent:** Code-Suche, Erklärpfade, AST/Refactor-Hints  
- **Knowledge-Agent:** Vault/Graph-Queries mit Quellenzwang  
- **Research-Agent:** Externe Quellen (aussensensor) → Synthesis

**Contract:** `contracts/agent.tool.schema.json` (Tool-Envelope).  
**Template:** `templates/agent-kit/**` (LangGraph-Skeleton + Tests).

## 3) Graph & Retrieval
- **semantAH Graph-Layer:**  
  - Knoten: Events, Notizen, Code-Stellen, Audio-Transkripte  
  - Kanten: temporal („führt zu“), semantisch („bezieht sich auf“), Provenienz  
  - Retrieval: Vector Top-K + Edge-Walk (Kombination für robusten Kontext)

## 4) Lernen aus Verhalten (heimlern)
- Implizites Feedback: Annahmen/Überschreibungen, Navigationspfade, Verweildauer  
- Kontrastiv: „AI-Vorschlag A verworfen, B genommen“ → negatives/positives Signal  
- Ergebnis: Policies für **proaktive Vorschläge** (z. B. Tests öffnen, Doku-Draft erzeugen)

## 5) Multimodal
- Voice-to-Code-TODOs, Debugging-Sessions (Screen+Audio), multimodales Retrieval  
- Speicherung als `intent_event` (+ Transkript) → semantAH indexiert

## 6) Proaktive Automationen
- CI-Selektion (nur relevante Tests), Auto-Deps mit Confidence, Predictive Debugging  
- Orchestrierung per hausKI (Supervisor) + wgx/Just-Targets

## 7) Evaluation
- **Antwortqualität:** Zitattrace, Deckung, Halluzinationsquote  
- **Latenz:** p95 pro Retrieval & Synthese vs. Budget  
- **Adoption:** Merge-Rate Wave-PRs, Nutzungsmetriken von Automationen

## 8) Roadmap (verfeinert)
- **Wave-1:** Contracts + agent-kit in Fleet, Smoke-Tests im Template  
- **Wave-2:** `/assist`-Endpoint (hausKI), semantAH Graph-Edges, leitstand Intent-Ingest  
- **Wave-3:** heimlern Policies, CI-Smokes, proaktive Vorschläge in hausKI UI/CLI

## 9) Risiken & Gegenmaßnahmen
- **Heterogenität (Rust/Python):** klare Contracts; Tool-Adapter kapseln IO  
- **Latenzspitzen:** Budgetierung, Caching, Top-K Tuning, Streaming  
- **Graph-Drift:** periodische Konsistenz-Checks, Eval-Suiten

## 10) Anhang
- Fleet-How-To: [`../fleet/push-to-fleet.md`](../fleet/push-to-fleet.md)  
- Contracts: `contracts/*.schema.json`  
- Template: `templates/agent-kit/**`
