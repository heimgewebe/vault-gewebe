# Events & Contracts

Diese Übersicht verlinkt auf die JSON-Schemas im Metarepo sowie auf weiterführende Dokumente.

## Kern-Schemas

| Schema | Zweck | Producer | Consumer |
| --- | --- | --- | --- |
| [`contracts/aussen.event.schema.json`](../../contracts/aussen.event.schema.json) | Außenereignisse (Links, Beobachtungen, Scores) | `aussensensor`, `weltgewebe` | `leitstand`, Exporte |
| [`contracts/policy.decision.schema.json`](../../contracts/policy.decision.schema.json) | Entscheidungen einer Policy inkl. Begründung | `heimlern` | `hausKI`, `leitstand` |
| [`contracts/policy.feedback.schema.json`](../../contracts/policy.feedback.schema.json) | Feedback auf eine Entscheidung (Reward, Notizen) | `leitstand`, Operator:innen | `heimlern` |
| [`contracts/policy.snapshot.schema.json`](../../contracts/policy.snapshot.schema.json) | Snapshot des Policy-Zustands | `heimlern` | Analyse-/Review-Tools |
| [`contracts/metrics.snapshot.schema.json`](../../contracts/metrics.snapshot.schema.json) | Systemmetriken aus `wgx` | `wgx` | `hausKI`, `leitstand` |
| [`contracts/insights.schema.json`](../../contracts/insights.schema.json) | Wissens-Exports | `semantAH` | `hausKI`, `leitstand` |
| [`contracts/audio.events.schema.json`](../../contracts/audio.events.schema.json) | Audio-/Telemetrie-Events | `hauski-audio` | `hausKI`, `leitstand` |
| [`contracts/event.line.schema.json`](../../contracts/event.line.schema.json) | Append-only Fleet-Events | `hausKI` | Fleet-Debugging |

Weitere Hintergrundinformationen bietet [docs/contracts.md](../contracts.md).

## Versionierung & Rollout

- Änderungen erfolgen über Branches im Metarepo und werden nach Review unter einem Tag
  (`contracts-vN`) veröffentlicht.
- Sub-Repos referenzieren Workflows & Schemas via `uses: ...@contracts-vN` bzw.
  `https://raw.githubusercontent.com/heimgewebe/metarepo/contracts-vN/...`.
- Rollout-Schritte sind in [docs/contracts.md](../contracts.md) dokumentiert.

## Validierung

- JSONL-Feeds validierst du mit dem Workflow
  `.github/workflows/reusable-validate-jsonl.yml` (siehe [docs/contracts.md](../contracts.md)).
- Lokale Validierungen: `just validate` ruft Schema-Checks (z. B. `yq`, `ajv`) auf.

## Ergänzende Dokumente

- [Use-Cases](../use-cases.md) – Beispiele, wann welches Schema greift.
- [Heimgewebe-Datenfluss](../heimgewebe-dataflow.mmd) – visualisiert Producer/Consumer.
- [E2E-Dokumentation](../e2e.md) – zeigt den Außen→Leitstand→Heimlern Pfad.
