The job failed because the schema file at:
https://raw.githubusercontent.com/heimgewebe/metarepo/contracts-v1/contracts/knowledge.graph.schema.json
could not be found (HTTP 404 error). This URL was set in the environment variable SCHEMA_URL.

Lösung:

- Prüfe, ob das Repository heimgewebe/metarepo tatsächlich den Branch contracts-v1 und die Datei contracts/knowledge.graph.schema.json enthält.
- Wenn die Datei fehlt:
    1. Lege die Datei im Branch contracts-v1 an (Pfad: contracts/knowledge.graph.schema.json) und pushe sie.
    2. Falls contracts-v1 der falsche Branch ist, korrigiere die SCHEMA_URL im Workflow (.github/workflows/validate-knowledge-graph.yml) auf den korrekten Branch/Pfad.
- Typische Code-Korrektur im Workflow (falls z. B. der main-Branch verwendet werden soll):

```yaml
env:
  SCHEMA_URL: https://raw.githubusercontent.com/heimgewebe/metarepo/main/contracts/knowledge.graph.schema.json
```

Stelle sicher, dass der Link in SCHEMA_URL auf eine existierende Datei zeigt. Vermeide, die Prüfung zu deaktivieren – die Schema-Validierung ist essentiell für die Datenqualität.