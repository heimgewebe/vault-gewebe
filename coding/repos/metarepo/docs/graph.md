# Metarepo Dependency Graph & Impact Toolkit

The scripts under `scripts/graph/` provide a first-class overview of how the
heimgewebe repos relate to each other and which services are affected when a
contract schema changes.

## Quickstart

```bash
just deps-graph
```

This command writes two artefacts to `reports/graphs/`:

- `deps_graph.gexf` – ready for tools such as Gephi or Obsidian Canvas.
- `deps_graph.json` – node-link JSON that can be consumed by internal tooling.

The CI workflow uploads the same files (plus the schema impact reports) as
artefacts, so you can download the latest graph without rebuilding it locally.

## Impact Analysis

Use the CLI helper to analyse contract updates:

```bash
just impact-analysis contracts/audio.events.schema.json
```

The command prints a textual summary and, when `reports/graphs/deps_graph.gexf`
exists, reuses it instead of rebuilding the graph. You can pass multiple schema
paths or capture a list from a diff:

```bash
python scripts/graph/impact_analysis.py \
  --graph reports/graphs/deps_graph.gexf \
  --changes-file /tmp/changed.txt \
  --format json \
  --json-output reports/graphs/schema-impact.json
```

The JSON output contains the direct producers/consumers as well as the
transitive impact (upstream/downstream repos) resolved via the dependency
graph.

## Requirements

Both helpers rely on `networkx` and `pyyaml`. They are part of the repo's
Python toolchain (`just deps`).
