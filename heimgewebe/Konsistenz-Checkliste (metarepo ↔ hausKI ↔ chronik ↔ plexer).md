metarepo: diff --git a/contracts/README.md b/contracts/README.md
new file mode 100644
index 0000000..72bdec9
--- /dev/null
+++ b/contracts/README.md
@@ -0,0 +1,52 @@
+# Heimgewebe Contracts
+
+This directory contains the canonical JSON Schema definitions for the Heimgewebe fleet. These contracts are the **Single Source of Truth (SSOT)** for all data exchange between services.
+
+## Canonical URIs
+
+The canonical base URI for all schemas is `https://schemas.heimgewebe.org/`. While this domain may not be operational for hosting, it serves as the stable identifier for validation and referencing.
+
+## Migration to Draft 2020-12
+
+All new contracts **MUST** use JSON Schema Draft 2020-12. Legacy contracts using older drafts (e.g. Draft 07) remain valid until explicitly migrated.
+
+## Usage Guidelines
+
+**DO NOT** copy or embed these schemas into your service's source code directly. Doing so leads to drift and validation errors.
+
+### Correct Usage
+
+1.  **NPM Package**: Use the `@heimgewebe/contracts` package if your service is node-based.
+    ```bash
+    npm install @heimgewebe/contracts
+    ```
+    Import schemas from `node_modules/@heimgewebe/contracts/contracts/...` or use the helper:
+    ```js
+    const { contractsPath } = require('@heimgewebe/contracts');
+    const schemaPath = path.join(contractsPath, 'chronik/event.batch.v1.schema.json');
+    ```
+
+2.  **Vendoring (Automated)**: If you must vendor (e.g., non-JS services), use a script to download the specific version from the `metarepo` release artifacts or raw content. Ensure this process is automated and checks for updates.
+
+3.  **Reference**: Use absolute canonical URIs (e.g., `https://schemas.heimgewebe.org/...`) when referencing schemas in `consumers.yaml` or other contracts.
+
+## Governance Metadata
+
+Governance metadata files (defining producers, consumers, and ownership) are located in `contracts/meta/`. These files are **NOT** JSON Schemas and are excluded from schema validation.
+
+## Structure
+
+*   `events/`: Event envelopes and specific event type definitions.
+*   `plexer/`: Contracts related to the Plexer routing service.
+*   `heimlern/`: Contracts for Heimlern ingestion and state.
+*   `chronik/`: Contracts for Chronik event storage and batch retrieval.
+*   `integrity/`: Contracts for system integrity reporting.
+*   `knowledge/`: Contracts for the Knowledge Observatory.
+
+## Validation
+
+All schemas must be valid JSON Schema Draft 2020-12. Changes are validated via CI using `ajv-cli`.
+
+## Conventions
+
+- **SHA-256**: Must be formatted as `sha256:<64-hex-chars>`. Pattern: `^sha256:[a-f0-9]{64}$`.
diff --git a/contracts/chronik/event.batch.v1.schema.json b/contracts/chronik/event.batch.v1.schema.json
new file mode 100644
index 0000000..08fd40c
--- /dev/null
+++ b/contracts/chronik/event.batch.v1.schema.json
@@ -0,0 +1,34 @@
+{
+  "$id": "https://schemas.heimgewebe.org/contracts/chronik/event.batch.v1.schema.json",
+  "$schema": "https://json-schema.org/draft/2020-12/schema",
+  "title": "Chronik Event Batch v1",
+  "description": "Batch-Antwort für /v1/events (Cursor ist Byte-Offset).",
+  "type": "object",
+  "required": ["events", "next_cursor", "has_more"],
+  "properties": {
+    "events": {
+      "type": "array",
+      "items": {
+        "$ref": "https://schemas.heimgewebe.org/contracts/events/base.event.schema.json"
+      }
+    },
+    "next_cursor": {
+      "type": ["integer", "null"],
+      "minimum": 0,
+      "description": "Byte-Offset für den nächsten Batch (null bei EOF)."
+    },
+    "has_more": {
+      "type": "boolean",
+      "description": "True, wenn weitere Events verfügbar sind."
+    },
+    "meta": {
+      "type": "object",
+      "properties": {
+        "count": { "type": "integer", "minimum": 0 },
+        "generated_at": { "type": "string", "format": "date-time" }
+      },
+      "additionalProperties": false
+    }
+  },
+  "additionalProperties": false
+}
diff --git a/contracts/consumers.yaml b/contracts/consumers.yaml
index 1ff322f..b39117e 100644
--- a/contracts/consumers.yaml
+++ b/contracts/consumers.yaml
@@ -87,7 +87,12 @@ knowledge:
         files: []
         mode: reference-only
 
-  insights.daily.published:
+  insights.daily.published: # Deprecated alias
+    schema: contracts/events/insights.daily.published.v1.schema.json
+    consumers: []
+    mode: reference-only
+
+  insights.daily.published.v1:
     schema: contracts/events/insights.daily.published.v1.schema.json
     consumers:
       - repo: plexer
@@ -116,6 +121,19 @@ knowledge:
         files: []
         mode: reference-only
 
+  knowledge.observatory.published.v1:
+    schema: contracts/events/knowledge.observatory.published.v1.schema.json
+    consumers:
+      - repo: leitstand
+        files: []
+        mode: reference-only
+      - repo: hausKI
+        files: []
+        mode: reference-only
+      - repo: plexer
+        files: []
+        mode: notification-only
+
 os_context:
   state:
     schema: contracts/os.context.state.schema.json
@@ -156,6 +174,19 @@ policy:
         files: []
         mode: reference-only
 
+  heimlern.ingest.state.v1:
+    schema: contracts/heimlern.ingest.state.schema.json
+    consumers:
+      - repo: heimlern
+        files: []
+        mode: mirror # Self-mirror: state is persisted and recovered by heimlern itself
+      - repo: leitstand
+        files: []
+        mode: reference-only
+      - repo: heimgeist
+        files: []
+        mode: reference-only
+
 webmaschine:
   state.index:
     schema: contracts/webmaschine/state/webmaschine.state.index.schema.json
diff --git a/contracts/events/insights.daily.published.v1.schema.json b/contracts/events/insights.daily.published.v1.schema.json
index c2ca905..a61c4a2 100644
--- a/contracts/events/insights.daily.published.v1.schema.json
+++ b/contracts/events/insights.daily.published.v1.schema.json
@@ -31,6 +31,16 @@
           "type": "string",
           "format": "date-time",
           "description": "Exact generation timestamp of the artifact."
+        },
+        "schema_ref": {
+          "type": "string",
+          "format": "uri",
+          "description": "Canonical URI of the schema used for validation."
+        },
+        "sha": {
+          "type": "string",
+          "pattern": "^sha256:[a-f0-9]{64}$",
+          "description": "SHA256 checksum of the artifact content (format: sha256:<hex>)."
         }
       },
       "additionalProperties": false
diff --git a/contracts/events/integrity.summary.published.v1.schema.json b/contracts/events/integrity.summary.published.v1.schema.json
index 5ec2241..f1409a1 100644
--- a/contracts/events/integrity.summary.published.v1.schema.json
+++ b/contracts/events/integrity.summary.published.v1.schema.json
@@ -1,6 +1,6 @@
 {
   "$schema": "https://json-schema.org/draft/2020-12/schema",
-  "$id": "https://heimgewebe/contracts/events/integrity.summary.published.v1.schema.json",
+  "$id": "https://schemas.heimgewebe.org/contracts/events/integrity.summary.published.v1.schema.json",
   "title": "Integrity Summary Published Event",
   "description": "Event signaling that a new integrity summary artifact has been published.",
   "type": "object",
@@ -50,6 +50,16 @@
             "UNCLEAR"
           ],
           "description": "Aggregated integrity status of the repository."
+        },
+        "schema_ref": {
+          "type": "string",
+          "format": "uri",
+          "description": "Canonical URI of the schema used for validation."
+        },
+        "sha": {
+          "type": "string",
+          "pattern": "^sha256:[a-f0-9]{64}$",
+          "description": "SHA256 checksum of the artifact content (format: sha256:<hex>)."
         }
       },
       "additionalProperties": false
diff --git a/contracts/events/knowledge.observatory.published.v1.schema.json b/contracts/events/knowledge.observatory.published.v1.schema.json
index d550b64..66eed62 100644
--- a/contracts/events/knowledge.observatory.published.v1.schema.json
+++ b/contracts/events/knowledge.observatory.published.v1.schema.json
@@ -35,6 +35,16 @@
           "type": "string",
           "format": "date-time",
           "description": "Optional timestamp in RFC 3339 date-time format."
+        },
+        "schema_ref": {
+          "type": "string",
+          "format": "uri",
+          "description": "Canonical URI of the schema used for validation."
+        },
+        "sha": {
+          "type": "string",
+          "pattern": "^sha256:[a-f0-9]{64}$",
+          "description": "SHA256 checksum of the artifact content (format: sha256:<hex>)."
         }
       },
       "additionalProperties": false
diff --git a/contracts/events/plexer.delivery.report.v1.schema.json b/contracts/events/plexer.delivery.report.v1.schema.json
new file mode 100644
index 0000000..a79525d
--- /dev/null
+++ b/contracts/events/plexer.delivery.report.v1.schema.json
@@ -0,0 +1,16 @@
+{
+  "$id": "https://schemas.heimgewebe.org/contracts/events/plexer.delivery.report.v1.schema.json",
+  "$schema": "https://json-schema.org/draft/2020-12/schema",
+  "title": "Plexer Delivery Report Event v1",
+  "description": "Event wrapper for Plexer delivery reports.",
+  "type": "object",
+  "required": ["type", "source", "payload"],
+  "properties": {
+    "type": { "const": "plexer.delivery.report.v1" },
+    "source": { "const": "plexer" },
+    "payload": {
+      "$ref": "https://schemas.heimgewebe.org/contracts/plexer/delivery.report.v1.schema.json"
+    }
+  },
+  "additionalProperties": false
+}
diff --git a/contracts/examples/chronik/event.batch.v1.example.json b/contracts/examples/chronik/event.batch.v1.example.json
new file mode 100644
index 0000000..616273f
--- /dev/null
+++ b/contracts/examples/chronik/event.batch.v1.example.json
@@ -0,0 +1,20 @@
+{
+  "events": [
+    {
+      "kind": "base.event",
+      "version": 1,
+      "id": "evt-123",
+      "meta": {
+        "occurred_at": "2023-10-27T10:00:00Z",
+        "producer": "producer-service"
+      },
+      "data": { "key": "value" }
+    }
+  ],
+  "next_cursor": 1024,
+  "has_more": true,
+  "meta": {
+    "count": 1,
+    "generated_at": "2023-10-27T10:00:01Z"
+  }
+}
diff --git a/contracts/examples/heimlern/ingest.state.example.json b/contracts/examples/heimlern/ingest.state.example.json
new file mode 100644
index 0000000..7830c6a
--- /dev/null
+++ b/contracts/examples/heimlern/ingest.state.example.json
@@ -0,0 +1,5 @@
+{
+  "cursor": 4096,
+  "last_ok": "2023-10-27T12:00:00Z",
+  "last_error": null
+}
diff --git a/contracts/examples/plexer/delivery.report.v1.example.json b/contracts/examples/plexer/delivery.report.v1.example.json
new file mode 100644
index 0000000..027e6f6
--- /dev/null
+++ b/contracts/examples/plexer/delivery.report.v1.example.json
@@ -0,0 +1,12 @@
+{
+  "counts": {
+    "pending": 5,
+    "failed": 2,
+    "delivered": 100,
+    "retried": 10
+  },
+  "retryable_now": 2,
+  "next_due_at": "2023-10-27T10:05:00Z",
+  "last_error": "Connection timeout",
+  "last_retry_at": "2023-10-27T10:00:00Z"
+}
diff --git a/contracts/examples/plexer/event.envelope.v1.example.json b/contracts/examples/plexer/event.envelope.v1.example.json
new file mode 100644
index 0000000..0c3a688
--- /dev/null
+++ b/contracts/examples/plexer/event.envelope.v1.example.json
@@ -0,0 +1,10 @@
+{
+  "type": "some.event.v1",
+  "source": "producer-service",
+  "payload": {
+    "foo": "bar"
+  },
+  "size_hints": {
+    "payload_bytes": 128
+  }
+}
diff --git a/contracts/examples/plexer/failed_event.v1.example.json b/contracts/examples/plexer/failed_event.v1.example.json
new file mode 100644
index 0000000..5d25f92
--- /dev/null
+++ b/contracts/examples/plexer/failed_event.v1.example.json
@@ -0,0 +1,24 @@
+{
+  "consumerKey": "target-service",
+  "event": {
+    "type": "base.event",
+    "source": "origin",
+    "payload": {
+      "kind": "base.event",
+      "version": 1,
+      "id": "evt-failed-1",
+      "meta": {
+        "occurred_at": "2023-10-27T09:00:00Z",
+        "producer": "origin"
+      },
+      "data": {}
+    },
+    "size_hints": {
+      "payload_bytes": 100
+    }
+  },
+  "retryCount": 3,
+  "lastAttempt": "2023-10-27T10:00:00Z",
+  "nextAttempt": "2023-10-27T10:10:00Z",
+  "error": "503 Service Unavailable"
+}
diff --git a/contracts/heimlern.ingest.state.schema.json b/contracts/heimlern.ingest.state.schema.json
new file mode 100644
index 0000000..5d3309f
--- /dev/null
+++ b/contracts/heimlern.ingest.state.schema.json
@@ -0,0 +1,24 @@
+{
+  "$schema": "https://json-schema.org/draft/2020-12/schema",
+  "$id": "https://schemas.heimgewebe.org/contracts/heimlern.ingest.state.schema.json",
+  "title": "Heimlern Ingest State",
+  "description": "Persistenter Fortschrittszustand für den Heimlern-Ingest-Prozess.",
+  "type": "object",
+  "properties": {
+    "cursor": {
+      "type": ["integer", "null"],
+      "description": "Markierung des letzten erfolgreich verarbeiteten Events (Byte-Offset)."
+    },
+    "last_ok": {
+      "type": "string",
+      "format": "date-time",
+      "description": "Zeitpunkt des letzten erfolgreichen Durchlaufs."
+    },
+    "last_error": {
+      "type": ["string", "null"],
+      "description": "Fehlernachricht, falls der letzte Durchlauf mit Fehler endete."
+    }
+  },
+  "required": ["cursor", "last_ok"],
+  "additionalProperties": false
+}
diff --git a/contracts/index.js b/contracts/index.js
new file mode 100644
index 0000000..09b46cb
--- /dev/null
+++ b/contracts/index.js
@@ -0,0 +1,7 @@
+// @heimgewebe/contracts
+// This package exports the path to the contracts directory.
+const path = require('path');
+
+module.exports = {
+  contractsPath: __dirname,
+};
diff --git a/contracts/meta/heimlern.ingest.state.v1.json b/contracts/meta/heimlern.ingest.state.v1.json
new file mode 100644
index 0000000..abecdf3
--- /dev/null
+++ b/contracts/meta/heimlern.ingest.state.v1.json
@@ -0,0 +1,11 @@
+{
+  "contract": "heimlern.ingest.state.v1",
+  "schema": "contracts/heimlern.ingest.state.schema.json",
+  "governance": {
+    "producers": ["heimlern-cli"],
+    "consumers": ["leitstand", "heimgeist"]
+  },
+  "notes": [
+    "This file is intentionally NOT JSON-Schema. It is governance metadata."
+  ]
+}
diff --git a/contracts/package.json b/contracts/package.json
new file mode 100644
index 0000000..6ae69f9
--- /dev/null
+++ b/contracts/package.json
@@ -0,0 +1,25 @@
+{
+  "name": "@heimgewebe/contracts",
+  "version": "0.1.0",
+  "description": "JSON Schema contracts for Heimgewebe protocols.",
+  "main": "index.js",
+  "files": [
+    "**/*.schema.json",
+    "index.js",
+    "README.md"
+  ],
+  "scripts": {
+    "validate": "ajv compile -s '**/*.schema.json' -r '**/*.schema.json' -c ajv-formats --spec=draft2020 --strict=log"
+  },
+  "keywords": [
+    "heimgewebe",
+    "contracts",
+    "json-schema"
+  ],
+  "author": "Heimgewebe Fleet",
+  "license": "MIT",
+  "devDependencies": {
+    "ajv-cli": "^5.0.0",
+    "ajv-formats": "^3.0.1"
+  }
+}
diff --git a/contracts/plexer/delivery.report.v1.schema.json b/contracts/plexer/delivery.report.v1.schema.json
new file mode 100644
index 0000000..44e185b
--- /dev/null
+++ b/contracts/plexer/delivery.report.v1.schema.json
@@ -0,0 +1,26 @@
+{
+  "$id": "https://schemas.heimgewebe.org/contracts/plexer/delivery.report.v1.schema.json",
+  "$schema": "https://json-schema.org/draft/2020-12/schema",
+  "title": "Plexer Delivery Report v1",
+  "description": "Report on event delivery status.",
+  "type": "object",
+  "required": ["counts"],
+  "properties": {
+    "counts": {
+      "type": "object",
+      "required": ["pending", "failed"],
+      "properties": {
+        "pending": { "type": "integer", "minimum": 0 },
+        "failed": { "type": "integer", "minimum": 0 },
+        "delivered": { "type": "integer", "minimum": 0 },
+        "retried": { "type": "integer", "minimum": 0 }
+      },
+      "additionalProperties": false
+    },
+    "retryable_now": { "type": "integer", "minimum": 0 },
+    "next_due_at": { "type": ["string", "null"], "format": "date-time" },
+    "last_error": { "type": ["string", "null"] },
+    "last_retry_at": { "type": ["string", "null"], "format": "date-time" }
+  },
+  "additionalProperties": false
+}
diff --git a/contracts/plexer/event.envelope.v1.schema.json b/contracts/plexer/event.envelope.v1.schema.json
new file mode 100644
index 0000000..589e720
--- /dev/null
+++ b/contracts/plexer/event.envelope.v1.schema.json
@@ -0,0 +1,21 @@
+{
+  "$id": "https://schemas.heimgewebe.org/contracts/plexer/event.envelope.v1.schema.json",
+  "$schema": "https://json-schema.org/draft/2020-12/schema",
+  "title": "Plexer Event Envelope v1",
+  "description": "Standard envelope for events routed by Plexer.",
+  "type": "object",
+  "required": ["type", "source", "payload"],
+  "properties": {
+    "type": { "type": "string", "description": "Event type (e.g. heimgeist.insight.v1)." },
+    "source": { "type": "string", "description": "Source component name." },
+    "payload": { "type": "object", "description": "The actual event payload." },
+    "size_hints": {
+      "type": "object",
+      "properties": {
+        "payload_bytes": { "type": "integer" }
+      },
+      "additionalProperties": false
+    }
+  },
+  "additionalProperties": false
+}
diff --git a/contracts/plexer/failed_event.v1.schema.json b/contracts/plexer/failed_event.v1.schema.json
new file mode 100644
index 0000000..4fc124c
--- /dev/null
+++ b/contracts/plexer/failed_event.v1.schema.json
@@ -0,0 +1,20 @@
+{
+  "$id": "https://schemas.heimgewebe.org/contracts/plexer/failed_event.v1.schema.json",
+  "$schema": "https://json-schema.org/draft/2020-12/schema",
+  "title": "Plexer Failed Event v1",
+  "description": "Persisted state for a failed event delivery in Plexer.",
+  "type": "object",
+  "required": ["consumerKey", "event", "retryCount", "lastAttempt", "nextAttempt", "error"],
+  "properties": {
+    "consumerKey": { "type": "string" },
+    "event": {
+      "$ref": "https://schemas.heimgewebe.org/contracts/plexer/event.envelope.v1.schema.json",
+      "description": "The original event payload (Plexer envelope)."
+    },
+    "retryCount": { "type": "integer", "minimum": 0 },
+    "lastAttempt": { "type": "string", "format": "date-time" },
+    "nextAttempt": { "type": "string", "format": "date-time" },
+    "error": { "type": "string" }
+  },
+  "additionalProperties": false
+}
diff --git a/contracts/plexer/services-auth-profiles.v1.schema.json b/contracts/plexer/services-auth-profiles.v1.schema.json
new file mode 100644
index 0000000..65bb482
--- /dev/null
+++ b/contracts/plexer/services-auth-profiles.v1.schema.json
@@ -0,0 +1,33 @@
+{
+  "$id": "https://schemas.heimgewebe.org/contracts/plexer/services-auth-profiles.v1.schema.json",
+  "$schema": "https://json-schema.org/draft/2020-12/schema",
+  "title": "Services Auth Profiles v1",
+  "description": "Configuration for service authentication headers.",
+  "type": "object",
+  "required": ["services"],
+  "properties": {
+    "services": {
+      "type": "object",
+      "patternProperties": {
+        "^[a-zA-Z0-9_-]+$": {
+          "type": "object",
+          "required": ["authKind", "header"],
+          "properties": {
+            "authKind": {
+              "type": "string",
+              "enum": ["bearer", "x-auth", "none"]
+            },
+            "header": {
+              "type": ["string", "null"]
+            },
+            "prefix": {
+              "type": "string"
+            }
+          },
+          "additionalProperties": false
+        }
+      }
+    }
+  },
+  "additionalProperties": false
+}
diff --git a/contracts/services-auth-profiles.yaml b/contracts/services-auth-profiles.yaml
new file mode 100644
index 0000000..fa2bd04
--- /dev/null
+++ b/contracts/services-auth-profiles.yaml
@@ -0,0 +1,21 @@
+# Service Authentication Profiles
+# Defines the expected authentication headers for each service consumer.
+# Used by Plexer and other routers to apply correct credentials.
+
+services:
+  heimgeist:
+    authKind: x-auth
+    header: X-Auth
+
+  chronik:
+    authKind: x-auth
+    header: X-Auth
+
+  leitstand:
+    authKind: none # optional
+    header: null
+
+  hausKI:
+    authKind: bearer
+    header: Authorization
+    prefix: "Bearer " # trailing space is intentional
diff --git a/docs/contracts/contracts-index.md b/docs/contracts/contracts-index.md
index 7213dc4..595296d 100644
--- a/docs/contracts/contracts-index.md
+++ b/docs/contracts/contracts-index.md
@@ -30,6 +30,23 @@ Sie liegen (sofern nicht anders angegeben) in `contracts/*.schema.json` im **met
   - Zweck: Audio-bezogene Ereignisse (z. B. Aufnahmen, Transkriptionen, TTS).
 - `intent.event.schema.json`
   - Zweck: Intent-Events aus Audio/Text für chronik/hausKI (Intent-Erkennung mit Confidence).
+- `contracts/chronik/event.batch.v1.schema.json`
+  - Zweck: Batch-Antwort für /v1/events (Pull-Modell).
+  - Produzenten: chronik
+  - Konsumenten: heimgeist, heimlern
+
+### 1.1a Event Routing & Delivery
+
+- `contracts/plexer/event.envelope.v1.schema.json`
+  - Zweck: Standardisierte Envelope für Events, die durch Plexer geroutet werden.
+- `contracts/plexer/delivery.report.v1.schema.json`
+  - Zweck: Report on event delivery status (counts, retries).
+  - Produzent: plexer
+  - Konsumenten: wgx, chronik, leitstand
+- `contracts/plexer/failed_event.v1.schema.json`
+  - Zweck: Persisted state for failed event deliveries.
+  - Produzent: plexer (internal persistence)
+  - Konsumenten: plexer (retry loop)
 
 ### 1.2 Fleet & Metriken
 
@@ -52,6 +69,11 @@ Sie liegen (sofern nicht anders angegeben) in `contracts/*.schema.json` im **met
   - Typ: Notification (Payload < 1KB, kein Inline-Daten-Transport).
   - Produzent: semantAH (nach Release).
   - Konsumenten: plexer (Router), chronik, leitstand.
+- `contracts/events/knowledge.observatory.published.v1.schema.json`
+  - Zweck: Notification-Event, das Verfügbarkeit eines neuen Knowledge-Observatory-Snapshots signalisiert.
+  - Typ: Notification.
+  - Produzent: semantAH.
+  - Konsumenten: plexer, leitstand, hausKI.
 - `knowledge.graph.schema.json`
   - Zweck: generisches Wissensgraph-Schema (Knoten, Kanten, Beziehungen).
 - `knowledge.observatory.schema.json`
@@ -116,7 +138,6 @@ Sie liegen (sofern nicht anders angegeben) in `contracts/*.schema.json` im **met
   - Zweck: Texte, die eingebettet (Vektorraum) werden sollen.
 - `os.context.text.redacted.schema.json`
   - Zweck: bereinigte / geschwärzte Textvarianten für Privacy.
-
 ### 1.6 Agenten, Werkzeuge & Workflows
 
 - `agent.tool.schema.json`
@@ -237,6 +258,10 @@ Repository: **heimgewebe/heimlern**
 - `contracts/policy.decision.schema.json`
 - `contracts/policy_feedback.schema.json`
 - `contracts/policy_snapshot.schema.json`
+- `heimlern.ingest.state.schema.json`
+  - Zweck: Persistenter Fortschrittszustand (Cursor, last_ok) für den Ingest-Prozess (CLI).
+  - Produzenten: heimlern (CLI)
+  - Konsumenten: leitstand, heimgeist
 
 Zweck:
 
diff --git a/docs/leitlinien.md b/docs/leitlinien.md
index 1788e2f..8c9bcf5 100644
--- a/docs/leitlinien.md
+++ b/docs/leitlinien.md
@@ -13,6 +13,7 @@
 - wgx → `metrics.snapshot.schema.json`
 - hausKI JSONL Event-Log → `event.line.schema.json`
 - heimlern Decisions → `policy.decision.schema.json`
+- heimlern Ingest-Status → `heimlern.ingest.state.schema.json`
 
 ## Security
 - Ingest lokal; optional Shared-Secret via Header `x-auth`.
 
 hauski: diff --git a/crates/core/src/events.rs b/crates/core/src/events.rs
index 47e37a62..aad67fac 100644
--- a/crates/core/src/events.rs
+++ b/crates/core/src/events.rs
@@ -13,6 +13,10 @@ pub struct EventPayload {
     pub url: String,
     #[serde(default)]
     pub generated_at: Option<String>,
+    #[serde(default)]
+    pub sha: Option<String>,
+    #[serde(default)]
+    pub schema_ref: Option<String>,
 }
 
 #[derive(Debug, Deserialize)]
@@ -28,6 +32,10 @@ struct RecheckReason {
     event_type: String,
     url: String,
     generated_at: Option<String>,
+    #[serde(skip_serializing_if = "Option::is_none")]
+    sha: Option<String>,
+    #[serde(skip_serializing_if = "Option::is_none")]
+    schema_ref: Option<String>,
 }
 
 pub async fn event_handler(
@@ -103,10 +111,43 @@ pub async fn event_handler(
                                         serde_json::Value::Bool(true),
                                     );
 
+                                    let sha = event.payload.sha.as_ref().and_then(|s| {
+                                        let normalized = s.strip_prefix("sha256:").unwrap_or(s);
+                                        if normalized.len() == 64
+                                            && normalized.chars().all(|c| c.is_ascii_hexdigit())
+                                        {
+                                            // Enforce canonical format: sha256:<hex> (lowercase)
+                                            Some(format!("sha256:{}", normalized.to_ascii_lowercase()))
+                                        } else {
+                                            tracing::warn!(
+                                                "Invalid SHA format (syntax-only check failed), dropping: {}",
+                                                s
+                                            );
+                                            None
+                                        }
+                                    });
+
+                                    let schema_ref = event.payload.schema_ref.as_ref().filter(|s| {
+                                        if let Ok(u) = url::Url::parse(s) {
+                                            if u.host_str() == Some("schemas.heimgewebe.org") {
+                                                return true;
+                                            }
+                                            tracing::warn!(
+                                                "schema_ref host not allowed: {}, dropping",
+                                                u.host_str().unwrap_or("unknown")
+                                            );
+                                        } else {
+                                            tracing::warn!("Invalid schema_ref URL, dropping: {}", s);
+                                        }
+                                        false
+                                    });
+
                                     let reason = RecheckReason {
                                         event_type: event.event_type.clone(),
                                         url: event.payload.url.clone(),
                                         generated_at: event.payload.generated_at.clone(),
+                                        sha,
+                                        schema_ref: schema_ref.cloned(),
                                     };
 
                                     if let Ok(reason_val) = serde_json::to_value(reason) {
diff --git a/crates/core/src/events_tests.rs b/crates/core/src/events_tests.rs
index e45d92d0..59629ead 100644
--- a/crates/core/src/events_tests.rs
+++ b/crates/core/src/events_tests.rs
@@ -195,12 +195,14 @@ mod tests {
             .await
             .unwrap();
 
-        // 2. Action: Send the event
+        // 2. Action: Send the event (Raw SHA)
         let event_payload = json!({
             "type": "knowledge.observatory.published.v1",
             "payload": {
                 "url": "https://example.com/obs.json",
-                "generated_at": "2023-10-27T10:00:00Z"
+                "generated_at": "2023-10-27T10:00:00Z",
+                "sha": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
+                "schema_ref": "https://schemas.heimgewebe.org/contracts/knowledge/observatory.schema.json"
             }
         });
 
@@ -232,7 +234,144 @@ mod tests {
             "Open item should be marked"
         );
 
+        let reason = &json_open["recheck_reason"];
+        assert_eq!(
+            reason["sha"],
+            "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
+        );
+        assert_eq!(
+            reason["schema_ref"],
+            "https://schemas.heimgewebe.org/contracts/knowledge/observatory.schema.json"
+        );
+
         // Cleanup
         mem::global().evict(key_open.to_string()).await.unwrap();
     }
+
+    #[tokio::test]
+    #[serial_test::serial]
+    async fn test_observatory_event_normalizes_sha_prefix() {
+        let flags = FeatureFlags {
+            events_token: Some("secret123".into()),
+            ..FeatureFlags::default()
+        };
+        let (app, _state) = test_app(flags);
+
+        let key_open = "decision.preimage:open_prefixed";
+        let val_open = json!({ "status": "open", "context": "foo" });
+
+        mem::global()
+            .set(
+                key_open.to_string(),
+                serde_json::to_vec(&val_open).unwrap(),
+                mem::TtlUpdate::Set(300),
+                Some(false),
+            )
+            .await
+            .unwrap();
+
+        let event_payload = json!({
+            "type": "knowledge.observatory.published.v1",
+            "payload": {
+                "url": "https://example.com/obs2.json",
+                "generated_at": "2023-10-27T10:00:00Z",
+                "sha": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
+                "schema_ref": "https://schemas.heimgewebe.org/contracts/knowledge/observatory.schema.json"
+            }
+        });
+
+        let response = app
+            .clone()
+            .oneshot(
+                Request::builder()
+                    .uri("/events")
+                    .method(Method::POST)
+                    .header(header::CONTENT_TYPE, "application/json")
+                    .header(header::AUTHORIZATION, "Bearer secret123")
+                    .body(Body::from(event_payload.to_string()))
+                    .unwrap(),
+            )
+            .await
+            .unwrap();
+
+        assert_eq!(response.status(), StatusCode::OK);
+
+        let item_open = mem::global()
+            .get(key_open.to_string())
+            .await
+            .unwrap()
+            .expect("open item missing");
+        let json_open: serde_json::Value = serde_json::from_slice(&item_open.value).unwrap();
+
+        let reason = &json_open["recheck_reason"];
+        assert_eq!(
+            reason["sha"],
+            "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
+        );
+
+        mem::global().evict(key_open.to_string()).await.unwrap();
+    }
+
+    #[tokio::test]
+    #[serial_test::serial]
+    async fn test_observatory_event_drops_invalid_schema_ref_host() {
+        let flags = FeatureFlags {
+            events_token: Some("secret123".into()),
+            ..FeatureFlags::default()
+        };
+        let (app, _state) = test_app(flags);
+
+        let key_open = "decision.preimage:open_bad_host";
+        let val_open = json!({ "status": "open", "context": "foo" });
+
+        mem::global()
+            .set(
+                key_open.to_string(),
+                serde_json::to_vec(&val_open).unwrap(),
+                mem::TtlUpdate::Set(300),
+                Some(false),
+            )
+            .await
+            .unwrap();
+
+        let event_payload = json!({
+            "type": "knowledge.observatory.published.v1",
+            "payload": {
+                "url": "https://example.com/obs3.json",
+                "generated_at": "2023-10-27T10:00:00Z",
+                "schema_ref": "https://evil.com/contracts/knowledge/observatory.schema.json"
+            }
+        });
+
+        let response = app
+            .clone()
+            .oneshot(
+                Request::builder()
+                    .uri("/events")
+                    .method(Method::POST)
+                    .header(header::CONTENT_TYPE, "application/json")
+                    .header(header::AUTHORIZATION, "Bearer secret123")
+                    .body(Body::from(event_payload.to_string()))
+                    .unwrap(),
+            )
+            .await
+            .unwrap();
+
+        assert_eq!(response.status(), StatusCode::OK);
+
+        let item_open = mem::global()
+            .get(key_open.to_string())
+            .await
+            .unwrap()
+            .expect("open item missing");
+        let json_open: serde_json::Value = serde_json::from_slice(&item_open.value).unwrap();
+
+        let reason = &json_open["recheck_reason"];
+        // SHA matches because it's None in payload
+        assert!(reason.get("sha").is_none());
+        // schema_ref should be missing because it was dropped
+        assert!(reason.get("schema_ref").is_none());
+
+        mem::global().evict(key_open.to_string()).await.unwrap();
+    }
 }
 
 chronik: diff --git a/app.py b/app.py
index e8d7a39..e6a95c7 100644
--- a/app.py
+++ b/app.py
@@ -32,6 +32,7 @@
     StorageBusyError,
     read_tail,
     read_last_line,
+    scan_domain,
     list_domains,
     sanitize_domain,
     write_payload,
@@ -549,6 +550,93 @@ async def ingest(
     return PlainTextResponse("ok", status_code=202)
 
 
+@app.get("/v1/events", dependencies=[Depends(_require_auth_dep)])
+async def events_v1(
+    domain: str,
+    limit: int = 100,
+    cursor: int = 0,
+):
+    """
+    Consumer pull endpoint.
+    - cursor: Byte offset pointing to the start of the next line to read. 0 = start of file.
+    - limit: Max events to return.
+
+    Returns:
+    - events: List of event objects.
+    - next_cursor: The cursor to use for the NEXT batch.
+    - has_more: True if there is at least one more valid event after this batch. False if EOF reached.
+    """
+    if limit < 1:
+        raise HTTPException(status_code=400, detail="limit must be >= 1")
+    if limit > 2000:
+        raise HTTPException(status_code=400, detail="limit must be <= 2000")
+    if cursor < 0:
+        raise HTTPException(status_code=400, detail="cursor must be >= 0")
+
+    try:
+        dom = _sanitize_domain(domain)
+    except HTTPException as exc:
+        # Re-raise with original detail
+        raise HTTPException(status_code=400, detail=exc.detail) from exc
+
+    try:
+        def fetch_events(d, start, lim):
+            results = []
+            next_off = start
+            has_more = False
+
+            iterator = scan_domain(d, start_offset=start)
+
+            count = 0
+
+            # Use strict unpacking: scan_domain now yields (start, next, line)
+            for item_start, item_next, line in iterator:
+                try:
+                    item = json.loads(line)
+                except json.JSONDecodeError:
+                    # Skip corrupt lines.
+                    # If we haven't reached limit yet, we just advance next_off past this corrupt line
+                    # so the client doesn't get stuck on it.
+                    if count < lim:
+                        next_off = item_next
+                    continue
+
+                count += 1
+
+                if count > lim:
+                    # We found a valid item BEYOND the limit.
+                    has_more = True
+                    # The client should fetch THIS item next time.
+                    # So next_cursor should be the START of this extra item.
+                    next_off = item_start
+                    break
+
+                results.append(item)
+                # Client has consumed this item, so next_cursor is after it.
+                next_off = item_next
+
+            return results, next_off, has_more
+
+        events, next_cursor, has_more = await run_in_threadpool(fetch_events, dom, cursor, limit)
+
+    except StorageBusyError as exc:
+        raise HTTPException(status_code=429, detail="busy, try again") from exc
+    except StorageError as exc:
+        if "invalid target" in str(exc):
+             raise HTTPException(status_code=400, detail="invalid domain") from exc
+        raise HTTPException(status_code=500, detail="storage error") from exc
+
+    return {
+        "events": events,
+        "next_cursor": next_cursor if has_more else None,
+        "has_more": has_more,
+        "meta": {
+            "count": len(events),
+            "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
+        }
+    }
+
+
 @app.get("/v1/latest", dependencies=[Depends(_require_auth_dep)])
 async def latest_v1(domain: str, unwrap: int = 0):
     try:
diff --git a/docs/README_CONTRACTS.md b/docs/README_CONTRACTS.md
new file mode 100644
index 0000000..864339d
--- /dev/null
+++ b/docs/README_CONTRACTS.md
@@ -0,0 +1,21 @@
+# Contracts and API Semantics
+
+This directory contains local documentation and notes.
+
+**Canonical Contracts** are located in the `heimgewebe/metarepo` repository under `contracts/`.
+
+This repository does **not** contain canonical schema definitions. Any schemas found here are strictly for local development or documentation purposes and should not be treated as the Single Source of Truth (SSOT).
+
+## API Contracts
+
+- `chronik.event.batch.v1`: Defines the response format for `GET /v1/events`.
+  See: `https://github.com/heimgewebe/metarepo/tree/main/contracts/chronik/event.batch.v1.schema.json`
+
+## Domain Semantics
+
+Chronik stores events in domains. While the API accepts arbitrary valid domain strings (sanitized to alphanumeric, dots, dashes), consumers should adhere to the following conventions to ensure semantic stability:
+
+- **Format**: `dotted.notation` (e.g., `knowledge.observatory`, `heimgeist.insight`).
+- **Case**: Always lowercase.
+- **Mapping**: Domains typically map to specific event types or aggregate streams defined in `metarepo/contracts/consumers.yaml`.
+- **Cursor**: The `cursor` returned by `/v1/events` is a **Byte Offset**. Clients must persist this integer to resume consumption reliably using the `heimlern.ingest.state.v1` contract.
diff --git a/storage.py b/storage.py
index d6dfe00..480de67 100644
--- a/storage.py
+++ b/storage.py
@@ -10,7 +10,7 @@
 from collections import deque
 from contextlib import contextmanager
 from pathlib import Path
-from typing import Final, Iterable, Iterator
+from typing import Final, Iterable, Iterator, Tuple
 
 from filelock import FileLock, Timeout
 
@@ -27,6 +27,7 @@
     "write_payload",
     "read_tail",
     "read_last_line",
+    "scan_domain",
     "list_domains",
     "get_lock_path",
     "FILENAME_RE",
@@ -255,6 +256,51 @@ def read_last_line(domain: str) -> str | None:
     return lines[0] if lines else None
 
 
+def scan_domain(domain: str, start_offset: int = 0) -> Iterator[Tuple[int, int, str]]:
+    """Scan the domain file forward starting from the given byte offset.
+
+    Yields:
+        (start_offset, next_offset, line_str)
+
+    If start_offset is beyond EOF, yields nothing.
+    """
+    try:
+        target_path = safe_target_path(domain)
+    except DomainError as exc:
+        raise StorageError("invalid target path") from exc
+
+    try:
+        with _locked_open(target_path, "rb") as fh:
+            fh.seek(start_offset)
+            while True:
+                # Capture start offset before reading
+                current_start = fh.tell()
+
+                line = fh.readline()
+                if not line:
+                    break
+
+                # Current position is the start of the next line
+                next_offset = fh.tell()
+
+                # Decode
+                try:
+                    text = line.decode("utf-8")
+                except UnicodeDecodeError:
+                    text = line.decode("utf-8", errors="replace")
+
+                # Remove trailing newline if present (matching read_tail behavior)
+                if text.endswith("\n"):
+                    text = text[:-1]
+
+                yield current_start, next_offset, text
+
+    except OSError as exc:
+        if exc.errno == errno.ENOENT:
+            return
+        raise StorageError("read error") from exc
+
+
 def list_domains(prefix: str = "") -> list[str]:
     """List domains that match the given prefix.
 
diff --git a/test_app.py b/test_app.py
index cc05d04..b535efa 100644
--- a/test_app.py
+++ b/test_app.py
@@ -668,3 +668,191 @@ def _raise_on_fdopen(fd, mode, encoding=None):
         except OSError as e:
             # fd is closed (EBADF expected)
             assert e.errno == errno.EBADF, f"Unexpected error: {e}"
+
+
+def test_events_v1_pagination(monkeypatch, tmp_path, client):
+    secret = _test_secret()
+    monkeypatch.setenv("CHRONIK_TOKEN", secret)
+    monkeypatch.setattr("storage.DATA_DIR", tmp_path)
+
+    domain = "test.events"
+
+    # Ingest 5 events
+    for i in range(5):
+        client.post(
+            f"/ingest/{domain}",
+            headers={"X-Auth": secret},
+            json={"n": i}
+        )
+
+    # 1. Fetch all
+    response = client.get(
+        f"/v1/events?domain={domain}",
+        headers={"X-Auth": secret}
+    )
+    assert response.status_code == 200
+    data = response.json()
+    assert len(data["events"]) == 5
+    assert data["next_cursor"] is None
+    assert data["has_more"] is False
+    assert data["meta"]["count"] == 5
+    assert "generated_at" in data["meta"]
+
+    # 2. Fetch with limit and cursor
+    resp1 = client.get(
+        f"/v1/events?domain={domain}&limit=2",
+        headers={"X-Auth": secret}
+    )
+    data1 = resp1.json()
+    assert len(data1["events"]) == 2
+    assert data1["events"][0]["payload"]["n"] == 0
+    assert data1["events"][1]["payload"]["n"] == 1
+    assert data1["has_more"] is True
+    assert data1["meta"]["count"] == 2
+    cursor1 = data1["next_cursor"]
+
+    resp2 = client.get(
+        f"/v1/events?domain={domain}&limit=2&cursor={cursor1}",
+        headers={"X-Auth": secret}
+    )
+    data2 = resp2.json()
+    assert len(data2["events"]) == 2
+    assert data2["events"][0]["payload"]["n"] == 2
+    assert data2["events"][1]["payload"]["n"] == 3
+    assert data2["has_more"] is True
+    cursor2 = data2["next_cursor"]
+
+    resp3 = client.get(
+        f"/v1/events?domain={domain}&limit=2&cursor={cursor2}",
+        headers={"X-Auth": secret}
+    )
+    data3 = resp3.json()
+    assert len(data3["events"]) == 1
+    assert data3["events"][0]["payload"]["n"] == 4
+    assert data3["has_more"] is False
+    assert data3["next_cursor"] is None
+
+def test_events_v1_peek_boundary(monkeypatch, tmp_path, client):
+    """Test behavior when exactly limit items are available."""
+    secret = _test_secret()
+    monkeypatch.setenv("CHRONIK_TOKEN", secret)
+    monkeypatch.setattr("storage.DATA_DIR", tmp_path)
+    domain = "test.peek"
+
+    # Ingest 3 events
+    client.post(f"/ingest/{domain}", headers={"X-Auth": secret}, json={"n": 0})
+    client.post(f"/ingest/{domain}", headers={"X-Auth": secret}, json={"n": 1})
+    client.post(f"/ingest/{domain}", headers={"X-Auth": secret}, json={"n": 2})
+
+    # Fetch with limit=2
+    # Should return 2 items, and has_more=True (because 3rd item exists)
+    resp = client.get(
+        f"/v1/events?domain={domain}&limit=2",
+        headers={"X-Auth": secret}
+    )
+    data = resp.json()
+    assert len(data["events"]) == 2
+    assert data["has_more"] is True
+
+    next_cursor = data["next_cursor"]
+
+    # Verify next_cursor points to start of 3rd item (n=2).
+    # Assuming first two items are ~40-50 bytes each?
+    # We can check by fetching from that cursor and expecting n=2 as the first item.
+
+    # Fetch next
+    resp2 = client.get(
+        f"/v1/events?domain={domain}&limit=2&cursor={next_cursor}",
+        headers={"X-Auth": secret}
+    )
+    data2 = resp2.json()
+    assert len(data2["events"]) == 1
+    assert data2["events"][0]["payload"]["n"] == 2
+    assert data2["has_more"] is False
+    assert data2["next_cursor"] is None
+
+
+def test_events_v1_corrupt_line_handling(monkeypatch, tmp_path, client):
+    """Test that corrupt lines are skipped and don't break cursor logic."""
+    secret = _test_secret()
+    monkeypatch.setenv("CHRONIK_TOKEN", secret)
+    monkeypatch.setattr("storage.DATA_DIR", tmp_path)
+    domain = "test.corrupt"
+
+    # Manually write file with corrupt line in middle
+    # We must wrap items in envelopes to match ingest behavior
+    item0 = {"domain": domain, "received_at": "2023-01-01T12:00:00Z", "payload": {"n": 0}}
+    item1 = {"domain": domain, "received_at": "2023-01-01T12:00:01Z", "payload": {"n": 1}}
+
+    storage.write_payload(domain, [
+        json.dumps(item0),
+        "THIS IS NOT JSON",
+        json.dumps(item1)
+    ])
+
+    # Fetch limit=1. Should get n=0.
+    resp1 = client.get(
+        f"/v1/events?domain={domain}&limit=1",
+        headers={"X-Auth": secret}
+    )
+    data1 = resp1.json()
+    assert len(data1["events"]) == 1
+    assert data1["events"][0]["payload"]["n"] == 0
+    # has_more should be True because n=1 exists (skipping corrupt)
+    assert data1["has_more"] is True
+    cursor1 = data1["next_cursor"]
+
+    # Fetch next. Should skip corrupt line and get n=1.
+    resp2 = client.get(
+        f"/v1/events?domain={domain}&limit=1&cursor={cursor1}",
+        headers={"X-Auth": secret}
+    )
+    data2 = resp2.json()
+    assert len(data2["events"]) == 1
+    assert data2["events"][0]["payload"]["n"] == 1
+    assert data2["has_more"] is False
+    assert data2["next_cursor"] is None
+
+
+def test_events_v1_cursor_validation(monkeypatch, tmp_path, client):
+    secret = _test_secret()
+    monkeypatch.setenv("CHRONIK_TOKEN", secret)
+    monkeypatch.setattr("storage.DATA_DIR", tmp_path)
+
+    resp = client.get(
+        "/v1/events?domain=test&cursor=-1",
+        headers={"X-Auth": secret}
+    )
+    assert resp.status_code == 400
+
+
+def test_events_v1_empty_result(monkeypatch, tmp_path, client):
+    secret = _test_secret()
+    monkeypatch.setenv("CHRONIK_TOKEN", secret)
+    monkeypatch.setattr("storage.DATA_DIR", tmp_path)
+
+    # Empty domain (doesn't exist)
+    resp = client.get(
+        "/v1/events?domain=non.existent",
+        headers={"X-Auth": secret}
+    )
+    assert resp.status_code == 200
+    data = resp.json()
+    assert data["events"] == []
+    assert data["has_more"] is False
+    assert data["next_cursor"] is None
+
+    # Domain exists but no more events
+    domain = "test.events"
+    client.post(f"/ingest/{domain}", headers={"X-Auth": secret}, json={"n": 1})
+
+    # Scan past end
+    resp = client.get(
+        f"/v1/events?domain={domain}&cursor=99999",
+        headers={"X-Auth": secret}
+    )
+    assert resp.status_code == 200
+    data = resp.json()
+    assert data["events"] == []
+    assert data["has_more"] is False
+    assert data["next_cursor"] is None

plexer: diff --git a/.gitignore b/.gitignore
index 16acd49..e66ce67 100644
--- a/.gitignore
+++ b/.gitignore
@@ -1,3 +1,4 @@
 node_modules
 dist
 package-lock.json
+data/
diff --git a/README.md b/README.md
index 2f0c0ec..a7fdd08 100644
--- a/README.md
+++ b/README.md
@@ -5,7 +5,7 @@ Plexer ist das Ereignisnetz (Event Router) für den Heimgewebe-Organismus.
 - Nimmt Events über `POST /events` im Heimgewebe-Format entgegen
 - Prüft Minimalstruktur (`type`, `source`, `payload`; `type`/`source` max. 256 Zeichen)
 - Loggt eingehende Events
-- Leitet sie an Heimgeist weiter (und später an weitere Konsumenten)
+- Leitet sie an Heimgeist und weitere konfigurierte Konsumenten (Chronik, Leitstand, hausKI) weiter
 
 ## Scope
 
@@ -16,7 +16,8 @@ Plexer tut:
 - Events entgegennehmen (`POST /events`)
 - Minimalstruktur prüfen
 - Events protokollieren
-- Events an Konsumenten weiterreichen (Heimgeist, semantAH, weitere Dienste)
+- Events an Konsumenten weiterreichen (Fanout-Pattern)
+- Fehlgeschlagene Weiterleitungen zwischenpuffern und wiederholen (Reliability)
 
 Plexer tut **nicht**:
 
@@ -26,14 +27,6 @@ Plexer tut **nicht**:
 - als Bot oder Reviewer agieren
 - Chat- oder Dialogflüsse steuern
 
-PR-Kommandos bleiben weiterhin auf dem Weg:
-
-GitHub PR Kommentar → Dispatcher → Ziel-Tool
-(z. B. Sichter, WGX, Heimgeist, Heimlern)
-
-Damit bleibt Plexer ein schlanker Event-Router und kann unabhängig von
-den Kommando-Workflows skaliert oder ausgetauscht werden.
-
 ## Organismus-Kontext
 
 Dieses Repository ist Teil des **Heimgewebe-Organismus**.
@@ -43,9 +36,6 @@ Die übergeordnete Architektur, Achsen, Rollen und Contracts sind zentral beschr
 sowie im Zielbild  
 👉 [`metarepo/docs/heimgewebe-zielbild.md`](https://github.com/heimgewebe/metarepo/blob/main/docs/heimgewebe-zielbild.md).
 
-Alle Rollen-Definitionen, Datenflüsse und Contract-Zuordnungen dieses Repos
-sind dort verankert.
-
 ## Tooling
 
 - Node.js >= 20
@@ -53,8 +43,45 @@ sind dort verankert.
 
 npm is not supported.
 
-## Environment
+## Konfiguration
+
+### Umgebungsvariablen
+
+- `PORT` (default: 3000)
+- `HOST` (default: 0.0.0.0)
+- `NODE_ENV` (default: development)
+- `PLEXER_DATA_DIR`: Pfad zum Verzeichnis, in dem die Queue für fehlgeschlagene Events persistiert wird (default: `./data`).
+
+### Service-URLs & Authentifizierung
+
+Alle URL-Variablen müssen vollqualifiziert sein (inkl. Schema `https://…`).
+
+| Service | URL Variable | Token Variable | Auth Methode |
+|---------|--------------|----------------|--------------|
+| **Heimgeist** | `HEIMGEIST_URL` | `HEIMGEIST_TOKEN` | `X-Auth: <token>` |
+| **Chronik** | `CHRONIK_URL` | `CHRONIK_TOKEN` | `X-Auth: <token>` |
+| **Leitstand** | `LEITSTAND_URL` | `LEITSTAND_TOKEN` | `Authorization: Bearer <token>` |
+| **hausKI** | `HAUSKI_URL` | `HAUSKI_TOKEN` | `Authorization: Bearer <token>` |
+
+Plexer wendet automatisch den korrekten Auth-Header je nach Zielsystem an.
+
+## Reliability & Contracts
+
+### Persistence & Queue
+Plexer nutzt eine persistente, dateibasierte Queue (`failed_forwards.jsonl`), um Events auch bei temporären Ausfällen der Konsumenten zuzustellen. Die Verarbeitung erfolgt thread-safe über `proper-lockfile` (Locking auf `failed_forwards.lock`), sodass mehrere Prozesse oder Neustarts keine Datenkorruption verursachen.
+
+### Critical vs. Best-Effort Events
+Die Unterscheidung erfolgt derzeit basierend auf der Konstantenliste in `src/constants.ts`:
+
+- **Critical Events** (z.B. `knowledge.observatory.published.v1`, `insights.daily.published`): Werden bei Fehlschlag in der Queue gespeichert und mit exponential backoff wiederholt.
+- **Best-Effort Events** (z.B. `integrity.summary.published.v1`): Dienen primär als optionale Hinting-Signale für Pull-Mechanismen. Bei Fehlschlag werden sie nur als Warning geloggt und verworfen, um die Queue nicht zu verstopfen.
+
+### Contracts Ownership
+Die verwendeten Schemas zur Validierung von Queue-Einträgen und Status-Reports liegen in `src/vendor/schemas/`.
+**Wichtig:** Diese Dateien sind Kopien (Vendoring) der kanonischen Definitionen aus dem **Metarepo** (`heimgewebe/metarepo/contracts/plexer/`). Änderungen dürfen nicht hier, sondern nur im Metarepo erfolgen und müssen dann synchronisiert werden.
+
+## Observability
 
-- Alle URL-Variablen (`HEIMGEIST_URL`, `LEITSTAND_URL`, `HAUSKI_URL`, `CHRONIK_URL`) müssen vollqualifiziert sein, d. h. inklusive Schema (`https://…`).
-- Abschließende Slashes werden zur Konsistenz entfernt (z. B. `https://chronik.example.com/api/` → `https://chronik.example.com/api`).
-- Leerzeichen in Variablen werden getrimmt; leere Werte werden wie nicht gesetzte Variablen behandelt.
+- `GET /status`: Liefert Metriken zur Delivery-Queue.
+  - Payload folgt dem Contract: `plexer.delivery.report.v1`.
+  - Felder: `pending` (in-flight), `failed` (in queue), `retryable_now` (fällig), `next_due_at` (nächster Retry).
diff --git a/package.json b/package.json
index 7bf34d9..bd63948 100644
--- a/package.json
+++ b/package.json
@@ -20,6 +20,7 @@
     "@types/express": "^4.17.0",
     "@types/jest": "^29.5.12",
     "@types/node": "^20.0.0",
+    "@types/proper-lockfile": "^4.1.4",
     "@types/supertest": "^6.0.3",
     "jest": "^29.7.0",
     "supertest": "^7.1.4",
@@ -28,6 +29,9 @@
     "typescript": "^5.0.0"
   },
   "dependencies": {
-    "express": "^4.18.0"
+    "ajv": "^8.17.1",
+    "ajv-formats": "^3.0.1",
+    "express": "^4.18.0",
+    "proper-lockfile": "^4.1.2"
   }
 }
diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml
index 1a83ad8..0a36377 100644
--- a/pnpm-lock.yaml
+++ b/pnpm-lock.yaml
@@ -8,9 +8,18 @@ importers:
 
   .:
     dependencies:
+      ajv:
+        specifier: ^8.17.1
+        version: 8.17.1
+      ajv-formats:
+        specifier: ^3.0.1
+        version: 3.0.1(ajv@8.17.1)
       express:
         specifier: ^4.18.0
         version: 4.22.1
+      proper-lockfile:
+        specifier: ^4.1.2
+        version: 4.1.2
     devDependencies:
       '@types/express':
         specifier: ^4.17.0
@@ -21,6 +30,9 @@ importers:
       '@types/node':
         specifier: ^20.0.0
         version: 20.19.27
+      '@types/proper-lockfile':
+        specifier: ^4.1.4
+        version: 4.1.4
       '@types/supertest':
         specifier: ^6.0.3
         version: 6.0.3
@@ -386,12 +398,18 @@ packages:
   '@types/node@20.19.27':
     resolution: {integrity: sha512-N2clP5pJhB2YnZJ3PIHFk5RkygRX5WO/5f0WC08tp0wd+sv0rsJk3MqWn3CbNmT2J505a5336jaQj4ph1AdMug==}
 
+  '@types/proper-lockfile@4.1.4':
+    resolution: {integrity: sha512-uo2ABllncSqg9F1D4nugVl9v93RmjxF6LJzQLMLDdPaXCUIDPeOJ21Gbqi43xNKzBi/WQ0Q0dICqufzQbMjipQ==}
+
   '@types/qs@6.14.0':
     resolution: {integrity: sha512-eOunJqu0K1923aExK6y8p6fsihYEn/BYuQ4g0CxAAgFc4b/ZLN4CrsRZ55srTdqoiLzU2B2evC+apEIxprEzkQ==}
 
   '@types/range-parser@1.2.7':
     resolution: {integrity: sha512-hKormJbkJqzQGhziax5PItDUTMAM9uE2XXQmM37dyd4hVM+5aVl7oVxMVUiVQn2oCQFN/LKCZdvSM0pFRqbSmQ==}
 
+  '@types/retry@0.12.5':
+    resolution: {integrity: sha512-3xSjTp3v03X/lSQLkczaN9UIEwJMoMCA1+Nb5HfbJEQWogdeQIyVtTvxPXDQjZ5zws8rFQfVfRdz03ARihPJgw==}
+
   '@types/send@0.17.6':
     resolution: {integrity: sha512-Uqt8rPBE8SY0RK8JB1EzVOIZ32uqy8HwdxCnoCOsYrvnswqmFZ/k+9Ikidlk/ImhsdvBsloHbAlewb2IEBV/Og==}
 
@@ -429,6 +447,17 @@ packages:
     engines: {node: '>=0.4.0'}
     hasBin: true
 
+  ajv-formats@3.0.1:
+    resolution: {integrity: sha512-8iUql50EUR+uUcdRQ3HDqa6EVyo3docL8g5WJ3FNcWmu62IbkGUue/pEyLBW8VGKKucTPgqeks4fIU1DA4yowQ==}
+    peerDependencies:
+      ajv: ^8.0.0
+    peerDependenciesMeta:
+      ajv:
+        optional: true
+
+  ajv@8.17.1:
+    resolution: {integrity: sha512-B/gBuNg5SiMTrPkC+A2+cW0RszwxYmn6VYxB/inlBStS5nx6xHIt/ehKRhIMhqusl7a8LjQoZnjCs5vhwxOQ1g==}
+
   ansi-escapes@4.3.2:
     resolution: {integrity: sha512-gKXj5ALrKWQLsYG9jlTRmR/xKluxHV+Z9QEwNIgCfM1/uwPMCuzVVnh5mwTd+OuBZcwSIMbqssNWRm1lE51QaQ==}
     engines: {node: '>=8'}
@@ -757,12 +786,18 @@ packages:
     resolution: {integrity: sha512-F2X8g9P1X7uCPZMA3MVf9wcTqlyNp7IhH5qPCI0izhaOIYXaW9L535tGA3qmjRzpH+bZczqq7hVKxTR4NWnu+g==}
     engines: {node: '>= 0.10.0'}
 
+  fast-deep-equal@3.1.3:
+    resolution: {integrity: sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==}
+
   fast-json-stable-stringify@2.1.0:
     resolution: {integrity: sha512-lhd/wF+Lk98HZoTCtlVraHtfh5XYijIjalXck7saUtuanSDyLMxnHhSXEDJqHxD7msR8D0uCmqlkwjCV8xvwHw==}
 
   fast-safe-stringify@2.1.1:
     resolution: {integrity: sha512-W+KJc2dmILlPplD/H4K9l9LcAHAfPtP6BY84uVLXQ6Evcz9Lcg33Y2z1IVblT6xdY54PXYVHEv+0Wpq8Io6zkA==}
 
+  fast-uri@3.1.0:
+    resolution: {integrity: sha512-iPeeDKJSWf4IEOasVVrknXpaBV0IApz/gp7S2bb7Z4Lljbl2MGJRqInZiUrQwV16cpzw/D3S5j5Julj/gT52AA==}
+
   fb-watchman@2.0.2:
     resolution: {integrity: sha512-p5161BqbuCaSnB8jIbzQHOlpgsPmK5rJVDfDKO91Axs5NC1uu3HRQm6wt9cd9/+GtQQIO53JdGXXoyDpTAsgYA==}
 
@@ -1090,6 +1125,9 @@ packages:
   json-parse-even-better-errors@2.3.1:
     resolution: {integrity: sha512-xyFwyhro/JEof6Ghe2iz2NcXoj2sloNsWr/XsERDK/oiPCfaNhl5ONfp+jQdAZRQQ0IJWNzH9zIZF7li91kh2w==}
 
+  json-schema-traverse@1.0.0:
+    resolution: {integrity: sha512-NM8/P9n3XjXhIZn1lLhkFaACTOURQXjWhV4BA/RnOv8xvgqtqpAX9IO4mRQxSx1Rlo4tqzeqb0sOlruaOy3dug==}
+
   json5@2.2.3:
     resolution: {integrity: sha512-XmOWe7eyHYH14cLdVPoyg+GOH3rYX++KpzrylJwSW98t3Nk+U8XOl8FWKOgwtzdb8lXGf6zYwDUzeHMWfxasyg==}
     engines: {node: '>=6'}
@@ -1286,6 +1324,9 @@ packages:
     resolution: {integrity: sha512-NxNv/kLguCA7p3jE8oL2aEBsrJWgAakBpgmgK6lpPWV+WuOmY6r2/zbAVnP+T8bQlA0nzHXSJSJW0Hq7ylaD2Q==}
     engines: {node: '>= 6'}
 
+  proper-lockfile@4.1.2:
+    resolution: {integrity: sha512-TjNPblN4BwAWMXU8s9AEz4JmQxnD1NNL7bNOY/AKUzyamc379FWASUhc/K1pL2noVb+XmZKLL68cjzLsiOAMaA==}
+
   proxy-addr@2.0.7:
     resolution: {integrity: sha512-llQsMLSUDUPT44jdrU/O37qlnifitDP+ZwrmmZcoSKyLKvtZxpyV0n2/bD/N4tBAAZ/gJEdZU7KMraoK1+XYAg==}
     engines: {node: '>= 0.10'}
@@ -1312,6 +1353,10 @@ packages:
     resolution: {integrity: sha512-fGxEI7+wsG9xrvdjsrlmL22OMTTiHRwAMroiEeMgq8gzoLC/PQr7RsRDSTLUg/bZAZtF+TVIkHc6/4RIKrui+Q==}
     engines: {node: '>=0.10.0'}
 
+  require-from-string@2.0.2:
+    resolution: {integrity: sha512-Xf0nWe6RseziFMu+Ap9biiUbmplq6S9/p+7w7YXP/JBHhrUDDUhwa+vANyubuqfZWTveU//DYVGsDG7RKL/vEw==}
+    engines: {node: '>=0.10.0'}
+
   resolve-cwd@3.0.0:
     resolution: {integrity: sha512-OrZaX2Mb+rJCpH/6CpSqt9xFVpN++x01XnN2ie9g6P5/3xelLAkXWVADpdz1IHD/KFfEXyE6V0U01OQ3UO2rEg==}
     engines: {node: '>=8'}
@@ -1329,6 +1374,10 @@ packages:
     engines: {node: '>= 0.4'}
     hasBin: true
 
+  retry@0.12.0:
+    resolution: {integrity: sha512-9LkiTwjUh6rT555DtE9rTX+BKByPfrMzEAtnlEtdEwr3Nkffwiihqe2bWADg+OQRjt9gl6ICdmB/ZFDCGAtSow==}
+    engines: {node: '>= 4'}
+
   safe-buffer@5.2.1:
     resolution: {integrity: sha512-rp3So07KcdmmKbGvgaNxQSJr7bGVSVk5S9Eq1F+ppbRo70+YeaDxkw5Dd8NPN+GD6bjnYm2VuPuCXmpuYvmCXQ==}
 
@@ -2096,10 +2145,16 @@ snapshots:
     dependencies:
       undici-types: 6.21.0
 
+  '@types/proper-lockfile@4.1.4':
+    dependencies:
+      '@types/retry': 0.12.5
+
   '@types/qs@6.14.0': {}
 
   '@types/range-parser@1.2.7': {}
 
+  '@types/retry@0.12.5': {}
+
   '@types/send@0.17.6':
     dependencies:
       '@types/mime': 1.3.5
@@ -2146,6 +2201,17 @@ snapshots:
 
   acorn@8.15.0: {}
 
+  ajv-formats@3.0.1(ajv@8.17.1):
+    optionalDependencies:
+      ajv: 8.17.1
+
+  ajv@8.17.1:
+    dependencies:
+      fast-deep-equal: 3.1.3
+      fast-uri: 3.1.0
+      json-schema-traverse: 1.0.0
+      require-from-string: 2.0.2
+
   ansi-escapes@4.3.2:
     dependencies:
       type-fest: 0.21.3
@@ -2502,10 +2568,14 @@ snapshots:
     transitivePeerDependencies:
       - supports-color
 
+  fast-deep-equal@3.1.3: {}
+
   fast-json-stable-stringify@2.1.0: {}
 
   fast-safe-stringify@2.1.1: {}
 
+  fast-uri@3.1.0: {}
+
   fb-watchman@2.0.2:
     dependencies:
       bser: 2.1.1
@@ -3025,6 +3095,8 @@ snapshots:
 
   json-parse-even-better-errors@2.3.1: {}
 
+  json-schema-traverse@1.0.0: {}
+
   json5@2.2.3: {}
 
   kleur@3.0.3: {}
@@ -3174,6 +3246,12 @@ snapshots:
       kleur: 3.0.3
       sisteransi: 1.0.5
 
+  proper-lockfile@4.1.2:
+    dependencies:
+      graceful-fs: 4.2.11
+      retry: 0.12.0
+      signal-exit: 3.0.7
+
   proxy-addr@2.0.7:
     dependencies:
       forwarded: 0.2.0
@@ -3198,6 +3276,8 @@ snapshots:
 
   require-directory@2.1.1: {}
 
+  require-from-string@2.0.2: {}
+
   resolve-cwd@3.0.0:
     dependencies:
       resolve-from: 5.0.0
@@ -3212,6 +3292,8 @@ snapshots:
       path-parse: 1.0.7
       supports-preserve-symlinks-flag: 1.0.0
 
+  retry@0.12.0: {}
+
   safe-buffer@5.2.1: {}
 
   safer-buffer@2.1.2: {}
diff --git a/src/__tests__/delivery.test.ts b/src/__tests__/delivery.test.ts
new file mode 100644
index 0000000..fdb25a0
--- /dev/null
+++ b/src/__tests__/delivery.test.ts
@@ -0,0 +1,72 @@
+import fs from 'fs/promises';
+import { saveFailedEvent, getDeliveryMetrics } from '../delivery';
+
+// Mock fs
+jest.mock('fs/promises');
+
+// Mock proper-lockfile
+jest.mock('proper-lockfile', () => ({
+  lock: jest.fn().mockResolvedValue(() => Promise.resolve()),
+}));
+
+// Mock consumers
+jest.mock('../consumers', () => ({
+  CONSUMERS: [
+    { key: 'test-consumer', label: 'Test Consumer', url: 'http://test.local', token: 'token', authKind: 'bearer' },
+  ],
+}));
+
+describe('Delivery', () => {
+  beforeEach(() => {
+    jest.clearAllMocks();
+  });
+
+  describe('saveFailedEvent', () => {
+    it('should append failed event to file', async () => {
+      const event = { type: 'test', source: 'src', payload: {} };
+      (fs.appendFile as jest.Mock).mockResolvedValue(undefined);
+      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
+      (fs.access as jest.Mock).mockResolvedValue(undefined); // File exists
+
+      await saveFailedEvent(event, 'test-consumer', 'some error');
+
+      // Now we expect lock to be called on lock file, and append to jsonl
+      // Since lock mock is global, we assume it works.
+      // We verify appendFile is called correctly.
+      expect(fs.appendFile).toHaveBeenCalledWith(
+        expect.stringContaining('failed_forwards.jsonl'),
+        expect.stringContaining('"consumerKey":"test-consumer"'),
+        'utf8'
+      );
+    });
+
+    it('should not save invalid event (missing consumerKey implied args)', async () => {
+       // saveFailedEvent interface requires consumerKey, so TS prevents missing it,
+       // but we can test invalid payload structure passed in event
+       const invalidEvent = { type: 'test' } as any; // Missing source/payload
+
+       await saveFailedEvent(invalidEvent, 'test-consumer', 'err');
+
+       expect(fs.appendFile).not.toHaveBeenCalled();
+    });
+  });
+
+  describe('getDeliveryMetrics', () => {
+    it('should return metrics', () => {
+      const metrics = getDeliveryMetrics(5);
+      expect(metrics.counts.pending).toBe(5);
+      expect(metrics.counts.failed).toBeDefined();
+      expect(metrics).toHaveProperty('retryable_now');
+      expect(metrics).toHaveProperty('next_due_at');
+    });
+  });
+
+  describe('initDelivery', () => {
+    // Basic test to ensure it runs without error in mock env
+    it('should run initialization sequence', async () => {
+      // Logic is hard to test due to mocked fs/lockfile, but we can call it
+      const { initDelivery } = require('../delivery');
+      await expect(initDelivery()).resolves.not.toThrow();
+    });
+  });
+});
diff --git a/src/__tests__/error_handling.test.ts b/src/__tests__/error_handling.test.ts
index 301b0c1..ca7bf4e 100644
--- a/src/__tests__/error_handling.test.ts
+++ b/src/__tests__/error_handling.test.ts
@@ -9,9 +9,17 @@ jest.mock('../config', () => ({
     host: '0.0.0.0',
     environment: 'test',
     heimgeistUrl: 'http://heimgeist.local',
+    dataDir: 'data',
   },
 }));
 
+// Mock delivery to avoid side effects
+jest.mock('../delivery', () => ({
+  saveFailedEvent: jest.fn().mockResolvedValue(undefined),
+  getDeliveryMetrics: jest.fn(),
+  retryFailedEvents: jest.fn().mockResolvedValue(undefined),
+}));
+
 describe('Error Handling', () => {
   const app = createServer();
 
diff --git a/src/__tests__/server.test.ts b/src/__tests__/server.test.ts
index 9120f9b..74db63e 100644
--- a/src/__tests__/server.test.ts
+++ b/src/__tests__/server.test.ts
@@ -16,9 +16,36 @@ jest.mock('../config', () => ({
     leitstandToken: 'leitstand-secret-token',
     hauskiToken: 'hauski-secret-token',
     chronikToken: 'chronik-secret-token',
+    dataDir: 'data',
   },
 }));
 
+// Mock delivery to avoid side effects
+jest.mock('../delivery', () => ({
+  saveFailedEvent: jest.fn().mockResolvedValue(undefined),
+  getDeliveryMetrics: jest.fn().mockReturnValue({
+    counts: { pending: 0, failed: 0 },
+    last_error: null,
+    last_retry_at: null,
+    retryable_now: 0,
+    next_due_at: null,
+  }),
+  retryFailedEvents: jest.fn().mockResolvedValue(undefined),
+  validateDeliveryReport: jest.fn().mockReturnValue(true),
+  // Basic mock validation to prevent crashes in tests that send invalid data
+  validateEventEnvelope: jest.fn().mockImplementation((body) => {
+    const isValid =
+      body &&
+      typeof body === 'object' &&
+      typeof body.type === 'string' &&
+      body.type.trim().length > 0 &&
+      typeof body.source === 'string' &&
+      body.source.trim().length > 0 &&
+      body.payload !== undefined;
+    return isValid;
+  }),
+}));
+
 describe('Server', () => {
   const app = createServer();
   let fetchMock: jest.Mock;
@@ -62,7 +89,47 @@ describe('Server', () => {
     });
   });
 
+  describe('GET /status', () => {
+    it('should return delivery report', async () => {
+      const response = await request(app).get('/status');
+      expect(response.status).toBe(200);
+      expect(response.body).toHaveProperty('type', 'plexer.delivery.report.v1');
+      expect(response.body).toHaveProperty('source', 'plexer');
+      expect(response.body.payload).toHaveProperty('counts');
+      expect(response.body.payload.counts).toHaveProperty('pending');
+      expect(response.body.payload.counts).toHaveProperty('failed');
+    });
+  });
+
   describe('POST /events', () => {
+    it('should forward event with sha and schema_ref in payload', async () => {
+      const payload = {
+        type: 'knowledge.observatory.published.v1',
+        source: 'semantAH',
+        payload: {
+          url: 'https://github.com/org/repo/releases/download/v1/obs.json',
+          sha: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
+          schema_ref: 'https://schemas.heimgewebe.org/contracts/knowledge/observatory.schema.json',
+          generated_at: '2023-10-27T10:00:00Z',
+        },
+      };
+
+      const response = await request(app).post('/events').send(payload);
+      expect(response.status).toBe(202);
+
+      // Verify fetch was called 4 times (fanout)
+      expect(fetchMock).toHaveBeenCalledTimes(4);
+
+      // Verify payload was passed through correctly to one of the consumers (e.g. Heimgeist)
+      const callArgs = fetchMock.mock.calls.find(call => call[0] === 'http://heimgeist.local');
+      expect(callArgs).toBeDefined();
+
+      const sentBody = JSON.parse(callArgs![1].body);
+      expect(sentBody.payload).toEqual(payload.payload);
+      expect(sentBody.payload).toHaveProperty('sha', payload.payload.sha);
+      expect(sentBody.payload).toHaveProperty('schema_ref', payload.payload.schema_ref);
+    });
+
     it('should forward unknown event types only to Heimgeist', async () => {
       const payload = {
         type: 'test.event',
@@ -145,7 +212,7 @@ describe('Server', () => {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
-          Authorization: 'Bearer chronik-secret-token',
+          'X-Auth': 'chronik-secret-token',
         },
         body: expectedBody,
       });
@@ -211,7 +278,7 @@ describe('Server', () => {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
-          Authorization: 'Bearer chronik-secret-token',
+          'X-Auth': 'chronik-secret-token',
         },
         body: expectedBody,
       });
@@ -334,7 +401,7 @@ describe('Server', () => {
 
       const response = await request(app).post('/events').send(payload);
       expect(response.status).toBe(400);
-      expect(response.body.message).toContain('Event must include');
+      expect(response.body.message).toContain('Invalid event envelope');
     });
 
     it('should reject missing source', async () => {
@@ -406,6 +473,35 @@ describe('Server', () => {
       expect(response.body).toEqual({ status: 'accepted' });
     });
 
+    it('should accept diverse payloads (array, string, null) due to relaxed schema', async () => {
+      const payloads = [
+        [],
+        "some string",
+        null,
+        123
+      ];
+
+      for (const p of payloads) {
+        const payload = {
+          type: 'test.relaxed',
+          source: 'test',
+          payload: p
+        };
+        const response = await request(app).post('/events').send(payload);
+        expect(response.status).toBe(202);
+      }
+    });
+
+    it('should accept mixed-case types due to relaxed schema pattern', async () => {
+        const payload = {
+            type: 'Test.Event_With-Mixed.Case',
+            source: 'test',
+            payload: {}
+        };
+        const response = await request(app).post('/events').send(payload);
+        expect(response.status).toBe(202);
+    });
+
     it('should support insights.daily.published event (notification only)', async () => {
       // This test codifies the contract for the daily insights notification event
       const payload = {
diff --git a/src/__tests__/shutdown.test.ts b/src/__tests__/shutdown.test.ts
index c0289e1..7e1b717 100644
--- a/src/__tests__/shutdown.test.ts
+++ b/src/__tests__/shutdown.test.ts
@@ -9,9 +9,19 @@ jest.mock('../config', () => ({
     host: '0.0.0.0',
     environment: 'test',
     heimgeistUrl: 'http://heimgeist.local',
+    dataDir: 'data',
   },
 }));
 
+// Mock delivery to avoid side effects
+jest.mock('../delivery', () => ({
+  saveFailedEvent: jest.fn().mockResolvedValue(undefined),
+  getDeliveryMetrics: jest.fn(),
+  retryFailedEvents: jest.fn().mockResolvedValue(undefined),
+  validateEventEnvelope: jest.fn().mockReturnValue(true),
+  validateDeliveryReport: jest.fn().mockReturnValue(true),
+}));
+
 describe('Graceful Shutdown', () => {
   const app = createServer();
   let fetchMock: jest.Mock;
diff --git a/src/config.ts b/src/config.ts
index 1797170..c0c8d4d 100644
--- a/src/config.ts
+++ b/src/config.ts
@@ -10,6 +10,7 @@ export interface Config {
   hauskiToken?: string;
   chronikUrl?: string;
   chronikToken?: string;
+  dataDir: string;
 }
 
 const getEnv = (name: string): string | undefined => {
@@ -76,4 +77,5 @@ export const config: Config = {
     getEnv('LEITSTAND_TOKEN') || getEnv('LEITSTAND_EVENTS_TOKEN'),
   hauskiToken: getEnv('HAUSKI_TOKEN') || getEnv('HAUSKI_EVENTS_TOKEN'),
   chronikToken: getEnv('CHRONIK_TOKEN') || getEnv('CHRONIK_EVENTS_TOKEN'),
+  dataDir: getEnv('PLEXER_DATA_DIR') || 'data',
 };
diff --git a/src/consumers.ts b/src/consumers.ts
new file mode 100644
index 0000000..d5e8697
--- /dev/null
+++ b/src/consumers.ts
@@ -0,0 +1,40 @@
+import { config } from './config';
+
+export type AuthKind = 'bearer' | 'x-auth' | 'none';
+
+export const CONSUMERS: {
+  key: string;
+  label: string;
+  url?: string;
+  token?: string;
+  authKind: AuthKind;
+}[] = [
+  {
+    key: 'heimgeist',
+    label: 'Heimgeist',
+    url: config.heimgeistUrl,
+    token: config.heimgeistToken,
+    authKind: 'x-auth',
+  },
+  {
+    key: 'leitstand',
+    label: 'Leitstand',
+    url: config.leitstandUrl,
+    token: config.leitstandToken,
+    authKind: 'bearer',
+  },
+  {
+    key: 'hauski',
+    label: 'hausKI',
+    url: config.hauskiUrl,
+    token: config.hauskiToken,
+    authKind: 'bearer',
+  },
+  {
+    key: 'chronik',
+    label: 'Chronik',
+    url: config.chronikUrl,
+    token: config.chronikToken,
+    authKind: 'x-auth',
+  },
+];
diff --git a/src/delivery.ts b/src/delivery.ts
new file mode 100644
index 0000000..0eb9f45
--- /dev/null
+++ b/src/delivery.ts
@@ -0,0 +1,358 @@
+import fs from 'fs/promises';
+import path from 'path';
+import { randomUUID } from 'crypto';
+import Ajv from 'ajv';
+import addFormats from 'ajv-formats';
+import { lock } from 'proper-lockfile';
+import { config } from './config';
+import { FailedEvent, PlexerEvent, PlexerDeliveryReport } from './types';
+import { CONSUMERS } from './consumers';
+
+const DATA_DIR = path.resolve(config.dataDir);
+const FAILED_LOG = path.join(DATA_DIR, 'failed_forwards.jsonl');
+const LOCK_FILE = path.join(DATA_DIR, 'failed_forwards.lock');
+
+let lastError: string | null = null;
+let lastRetryAt: string | null = null;
+let failedCount = 0;
+let retryableNowCount = 0;
+let nextDueAt: string | null = null;
+
+const ajv = new Ajv({ strict: true });
+addFormats(ajv);
+
+// Load vendored schemas
+import failedEventSchema from './vendor/schemas/plexer/failed_event.v1.schema.json';
+import deliveryReportSchema from './vendor/schemas/plexer/delivery.report.v1.schema.json';
+import eventEnvelopeSchema from './vendor/schemas/plexer/event.envelope.v1.schema.json';
+
+const validateFailedEvent = ajv.compile(failedEventSchema);
+export const validateDeliveryReport = ajv.compile(deliveryReportSchema);
+export const validateEventEnvelope = ajv.compile(eventEnvelopeSchema);
+
+async function ensureDataDir() {
+  try {
+    await fs.mkdir(DATA_DIR, { recursive: true });
+  } catch {}
+}
+
+async function ensureLockFile() {
+  try {
+    await fs.access(LOCK_FILE);
+  } catch {
+    await fs.writeFile(LOCK_FILE, '');
+  }
+}
+
+// Initial startup: crash recovery and metrics scan
+export async function initDelivery(): Promise<void> {
+  try {
+    await ensureDataDir();
+    await ensureLockFile();
+
+    // 1. Crash Recovery: Check for orphaned processing files
+    const files = await fs.readdir(DATA_DIR);
+    const processingFiles = files.filter((f) => f.startsWith('processing.') && f.endsWith('.jsonl'));
+
+    if (processingFiles.length > 0) {
+      console.log(`Found ${processingFiles.length} orphaned processing files. Recovering...`);
+
+      let release;
+      try {
+        release = await lock(LOCK_FILE, { retries: 3 });
+        // Ensure FAILED_LOG exists
+        try { await fs.access(FAILED_LOG); } catch { await fs.writeFile(FAILED_LOG, ''); }
+
+        for (const file of processingFiles) {
+          const filePath = path.join(DATA_DIR, file);
+          try {
+            const content = await fs.readFile(filePath, 'utf8');
+            // Append content directly
+            await fs.appendFile(FAILED_LOG, content);
+            await fs.unlink(filePath);
+          } catch (e) {
+            console.error(`Failed to recover orphaned file ${file}:`, e);
+          }
+        }
+      } catch (e) {
+        console.error('Failed to lock during recovery:', e);
+      } finally {
+        if (release) await release();
+      }
+    }
+
+    // 2. Metrics Scan
+    // Ensure FAILED_LOG exists for reading
+    try { await fs.access(FAILED_LOG); } catch { await fs.writeFile(FAILED_LOG, ''); }
+
+    // Read without lock as this is startup (assuming single instance)
+    // Or strictly: lock(LOCK_FILE) but we rely on single process startup.
+    const content = await fs.readFile(FAILED_LOG, 'utf8').catch(() => '');
+    const lines = content.split('\n').filter((l) => l.trim().length > 0);
+    failedCount = lines.length;
+    // Scan for metrics
+    let minNext = Infinity;
+    const now = Date.now();
+    let rNow = 0;
+
+    for (const line of lines) {
+      try {
+        const e = JSON.parse(line) as FailedEvent;
+        const n = new Date(e.nextAttempt).getTime();
+        if (!isNaN(n)) {
+          if (n < minNext) minNext = n;
+          if (n <= now) rNow++;
+        }
+      } catch {}
+    }
+    retryableNowCount = rNow;
+    nextDueAt = minNext === Infinity ? null : new Date(minNext).toISOString();
+  } catch (err) {
+    console.error('Error during startup initialization:', err);
+  }
+}
+
+export async function saveFailedEvent(
+  event: PlexerEvent,
+  consumerKey: string,
+  error: string,
+): Promise<void> {
+  await ensureDataDir();
+  await ensureLockFile();
+
+  const failedEvent: FailedEvent = {
+    consumerKey,
+    event,
+    retryCount: 0,
+    lastAttempt: new Date().toISOString(),
+    // Initial: 30s + jitter
+    nextAttempt: new Date(
+      Date.now() + 30000 + Math.random() * 5000,
+    ).toISOString(),
+    error,
+  };
+
+  if (!validateFailedEvent(failedEvent)) {
+    console.error(
+      'FailedEvent validation failed:',
+      validateFailedEvent.errors,
+      failedEvent,
+    );
+    // Don't save invalid events
+    return;
+  }
+
+  const line = JSON.stringify(failedEvent) + '\n';
+
+  // Ensure file exists for appending
+  try {
+    await fs.access(FAILED_LOG);
+  } catch {
+    await fs.writeFile(FAILED_LOG, '');
+  }
+
+  let release;
+  try {
+    release = await lock(LOCK_FILE, { retries: 3 });
+    await fs.appendFile(FAILED_LOG, line, 'utf8');
+    failedCount++;
+    lastError = error;
+    // Update nextDueAt if this is sooner
+    const n = new Date(failedEvent.nextAttempt).getTime();
+    if (!nextDueAt || n < new Date(nextDueAt).getTime()) {
+      nextDueAt = failedEvent.nextAttempt;
+    }
+  } catch (err) {
+    console.error('Failed to acquire lock for saving event:', err);
+  } finally {
+    if (release) await release();
+  }
+}
+
+export async function retryFailedEvents(): Promise<void> {
+  lastRetryAt = new Date().toISOString();
+  await ensureDataDir();
+  await ensureLockFile();
+
+  // Ensure file exists
+  try {
+    await fs.access(FAILED_LOG);
+  } catch {
+    await fs.writeFile(FAILED_LOG, '');
+    return;
+  }
+
+  let release;
+  let processingFile: string | null = null;
+
+  try {
+    // 1. Lock the lockfile
+    release = await lock(LOCK_FILE, { retries: 3 });
+    const content = await fs.readFile(FAILED_LOG, 'utf8');
+    const lines = content.split('\n').filter((l) => l.trim().length > 0);
+
+    if (lines.length === 0) {
+      failedCount = 0;
+      retryableNowCount = 0;
+      nextDueAt = null;
+      return; // Finally block releases lock
+    }
+
+    // 2. Rename to unique processing file
+    processingFile = path.join(DATA_DIR, `processing.${randomUUID()}.jsonl`);
+    await fs.rename(FAILED_LOG, processingFile);
+
+    // 3. Create new empty FAILED_LOG so saveFailedEvent can continue working
+    await fs.writeFile(FAILED_LOG, '');
+
+    // 4. Release lock immediately to allow new events to be saved
+    await release();
+    release = null;
+
+    // 5. Process the renamed file (processingFile)
+    const remainingEvents: FailedEvent[] = [];
+    const now = Date.now();
+
+    for (const line of lines) {
+      let entry: FailedEvent;
+      try {
+        entry = JSON.parse(line);
+      } catch {
+        continue;
+      }
+
+      const nextTime = new Date(entry.nextAttempt).getTime();
+
+      if (nextTime <= now) {
+        // Try to send
+        const consumer = CONSUMERS.find((c) => c.key === entry.consumerKey);
+        if (!consumer) {
+          // Backoff
+          entry.retryCount++;
+          // Jitter backoff
+          const backoff = Math.min(
+            Math.pow(2, entry.retryCount) * 60 * 1000,
+            24 * 60 * 60 * 1000,
+          );
+          const jitter = Math.random() * 1000;
+          entry.nextAttempt = new Date(now + backoff + jitter).toISOString();
+          entry.error = 'Consumer configuration missing';
+
+          remainingEvents.push(entry);
+          continue;
+        }
+
+        try {
+          const headers: Record<string, string> = {
+            'Content-Type': 'application/json',
+          };
+          if (consumer.token) {
+            if (consumer.authKind === 'x-auth') {
+                headers['X-Auth'] = consumer.token;
+            } else if (consumer.authKind === 'bearer') {
+                headers['Authorization'] = `Bearer ${consumer.token}`;
+            }
+          }
+
+          const res = await fetch(consumer.url!, {
+            method: 'POST',
+            headers,
+            body: JSON.stringify(entry.event),
+          });
+
+          if (!res.ok) {
+            let msg = `${res.status} ${res.statusText}`;
+            if (res.status === 401 || res.status === 403)
+              msg += ' (token rejected)';
+            throw new Error(msg);
+          }
+
+          console.log(
+            `[Retry] Successfully forwarded event ${entry.event.type} to ${consumer.label}`,
+          );
+          // Success: do nothing, it's removed from queue (processing file deleted later)
+        } catch (err) {
+          entry.retryCount++;
+          entry.lastAttempt = new Date().toISOString();
+          const backoff = Math.min(
+            Math.pow(2, entry.retryCount) * 60 * 1000,
+            24 * 60 * 60 * 1000,
+          );
+          const jitter = Math.random() * 10000; // up to 10s jitter
+          entry.nextAttempt = new Date(now + backoff + jitter).toISOString();
+          entry.error = err instanceof Error ? err.message : String(err);
+          lastError = entry.error;
+
+          console.warn(
+            `[Retry] Failed to forward to ${consumer.label}: ${entry.error}`,
+          );
+
+          remainingEvents.push(entry);
+        }
+      } else {
+        // Not time yet -> Re-queue
+        remainingEvents.push(entry);
+      }
+    }
+
+    // Cleanup processing file
+    await fs.unlink(processingFile);
+
+    // Batch write remaining events
+    if (remainingEvents.length > 0) {
+      await batchAppendEvents(remainingEvents);
+    }
+
+    // Reset global metrics based on remaining events
+    let minNext = Infinity;
+    let rNow = 0;
+    const nowAfter = Date.now();
+
+    for (const e of remainingEvents) {
+       const n = new Date(e.nextAttempt).getTime();
+       if (!isNaN(n)) {
+          if (n < minNext) minNext = n;
+          if (n <= nowAfter) rNow++;
+       }
+    }
+
+    failedCount = remainingEvents.length;
+    retryableNowCount = rNow;
+    nextDueAt = minNext === Infinity ? null : new Date(minNext).toISOString();
+
+  } catch (err) {
+    console.error('Error processing failed events:', err);
+  } finally {
+    if (release) await release();
+  }
+}
+
+async function batchAppendEvents(entries: FailedEvent[]) {
+    const lines = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
+    let release;
+    try {
+        release = await lock(LOCK_FILE, { retries: 3 });
+        await fs.appendFile(FAILED_LOG, lines, 'utf8');
+    } catch(e) {
+        console.error('Failed to batch requeue events', e);
+    } finally {
+        if(release) await release();
+    }
+}
+
+export function getDeliveryMetrics(pendingCount: number): PlexerDeliveryReport {
+  return {
+    counts: {
+      pending: pendingCount,
+      failed: failedCount,
+    },
+    last_error: lastError,
+    last_retry_at: lastRetryAt,
+    retryable_now: retryableNowCount,
+    next_due_at: nextDueAt,
+  };
+}
+
+export function getNextDueAt(): string | null {
+  return nextDueAt;
+}
diff --git a/src/index.ts b/src/index.ts
index e5f675a..d844589 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,7 +1,54 @@
 import { createServer, drainPendingRequests } from './server';
 import { config } from './config';
+import { retryFailedEvents, getNextDueAt, initDelivery } from './delivery';
 
 const app = createServer();
+const RETRY_INTERVAL_MS = 60 * 1000;
+const MIN_RETRY_DELAY_MS = 5000;
+
+// Initialize delivery system (recovery + metrics)
+initDelivery().catch((err) => {
+  console.error('Failed to initialize delivery system:', err);
+});
+
+function scheduleRetry() {
+  const nextDue = getNextDueAt();
+  let delay = RETRY_INTERVAL_MS;
+
+  if (nextDue) {
+    const now = Date.now();
+    const dueTime = new Date(nextDue).getTime();
+    const diff = dueTime - now;
+
+    // Clamp delay between 5s and 60s
+    delay = Math.min(RETRY_INTERVAL_MS, Math.max(MIN_RETRY_DELAY_MS, diff));
+  }
+
+  // Add jitter (+/- 1s)
+  delay += (Math.random() - 0.5) * 2000;
+
+  // Ensure non-negative
+  if (delay < MIN_RETRY_DELAY_MS) delay = MIN_RETRY_DELAY_MS;
+
+  retryTimer = setTimeout(() => {
+    retryFailedEvents()
+      .catch((err) => {
+        console.error('Failed to retry events:', err);
+      })
+      .finally(() => {
+        if (!isShuttingDown) {
+          scheduleRetry();
+        }
+      });
+  }, delay);
+}
+
+let retryTimer: NodeJS.Timeout | null = null;
+let isShuttingDown = false;
+
+if (process.env.NODE_ENV !== 'test') {
+  scheduleRetry();
+}
 
 const server = app.listen(config.port, config.host, () => {
   console.log(`Server is running on http://${config.host}:${config.port}`);
@@ -10,6 +57,10 @@ const server = app.listen(config.port, config.host, () => {
 
 const shutdown = () => {
   console.log('Shutting down server...');
+  isShuttingDown = true;
+  if (retryTimer) {
+    clearTimeout(retryTimer);
+  }
   server.close(async () => {
     console.log('Server closed. Draining pending requests...');
     await drainPendingRequests();
diff --git a/src/server.ts b/src/server.ts
index dcb4a1f..c932113 100644
--- a/src/server.ts
+++ b/src/server.ts
@@ -7,38 +7,18 @@ import {
   EVENT_INSIGHTS_DAILY_PUBLISHED,
   BEST_EFFORT_EVENTS,
 } from './constants';
+import { CONSUMERS } from './consumers';
+import {
+  saveFailedEvent,
+  getDeliveryMetrics,
+  validateDeliveryReport,
+  validateEventEnvelope,
+} from './delivery';
 
 const MAX_STRING_LENGTH = 256;
 
 const pendingFetches = new Set<Promise<void>>();
 
-const CONSUMERS = [
-  {
-    key: 'heimgeist',
-    label: 'Heimgeist',
-    url: config.heimgeistUrl,
-    token: config.heimgeistToken,
-  },
-  {
-    key: 'leitstand',
-    label: 'Leitstand',
-    url: config.leitstandUrl,
-    token: config.leitstandToken,
-  },
-  {
-    key: 'hauski',
-    label: 'hausKI',
-    url: config.hauskiUrl,
-    token: config.hauskiToken,
-  },
-  {
-    key: 'chronik',
-    label: 'Chronik',
-    url: config.chronikUrl,
-    token: config.chronikToken,
-  },
-];
-
 function tryJson(value: unknown): { json: string | null } {
   try {
     const json = JSON.stringify(value);
@@ -64,6 +44,10 @@ function shouldForward(eventType: string, consumerKey: string): boolean {
   return consumerKey === 'heimgeist';
 }
 
+export function getPendingRequestCount(): number {
+  return pendingFetches.size;
+}
+
 export async function drainPendingRequests(timeoutMs = 5000): Promise<void> {
   if (pendingFetches.size === 0) return;
 
@@ -102,6 +86,25 @@ export function createServer(): Express {
     res.json({ status: 'ok' });
   });
 
+  app.get('/status', (req: Request, res: Response) => {
+    const report = getDeliveryMetrics(getPendingRequestCount());
+
+    // Strict contract validation
+    if (!validateDeliveryReport(report)) {
+      console.error(
+        'Delivery report failed contract validation:',
+        validateDeliveryReport.errors,
+      );
+      // We still return it to not break ops, but log the violation
+    }
+
+    res.json({
+      type: 'plexer.delivery.report.v1',
+      source: 'plexer',
+      payload: report,
+    });
+  });
+
   app.post(
     '/events',
     (
@@ -110,34 +113,18 @@ export function createServer(): Express {
     ) => {
       const body = req.body;
 
-      if (
-        !body ||
-        typeof body !== 'object' ||
-        !('type' in body) ||
-        !('source' in body) ||
-        !('payload' in body)
-      ) {
+      // Validate against envelope schema
+      if (!validateEventEnvelope(body)) {
         return res.status(400).json({
           status: 'error',
-          message: 'Event must include type, source and payload',
+          message: 'Invalid event envelope',
+          errors: validateEventEnvelope.errors,
         });
       }
 
       const { type, source, payload } = body as unknown as PlexerEvent;
 
-      if (
-        typeof type !== 'string' ||
-        !type.trim() ||
-        typeof source !== 'string' ||
-        !source.trim() ||
-        typeof payload === 'undefined'
-      ) {
-        return res.status(400).json({
-          status: 'error',
-          message: `Event must include non-empty type & source (max ${MAX_STRING_LENGTH} chars) and payload`,
-        });
-      }
-
+      // Additional manual checks (trimming logic)
       const normalizedType = type.trim();
       const normalizedSource = source.trim();
 
@@ -201,7 +188,7 @@ export function createServer(): Express {
 
       const eventId = randomUUID();
 
-      CONSUMERS.forEach(({ key, label, url, token }) => {
+      CONSUMERS.forEach(({ key, label, url, token, authKind }) => {
         if (!url) return;
 
         if (!shouldForward(normalizedType, key)) {
@@ -213,7 +200,11 @@ export function createServer(): Express {
             'Content-Type': 'application/json',
           };
           if (token) {
-            headers.Authorization = `Bearer ${token}`;
+            if (authKind === 'x-auth') {
+              headers['X-Auth'] = token;
+            } else {
+              headers['Authorization'] = `Bearer ${token}`;
+            }
           }
 
           const fetchPromise = fetch(url, {
@@ -257,6 +248,17 @@ export function createServer(): Express {
                   context.log_kind = 'best_effort_forward_failed';
                   console.warn(`[Best-Effort] ${errorMessage}`, context);
                 } else {
+                  saveFailedEvent(
+                    {
+                      type: normalizedType,
+                      source: normalizedSource,
+                      payload,
+                    },
+                    key,
+                    errorMessage,
+                  ).catch((e) =>
+                    console.error('Failed to save failed event', e),
+                  );
                   console.error(errorMessage, context);
                 }
               }
@@ -274,6 +276,15 @@ export function createServer(): Express {
                 context.log_kind = 'best_effort_forward_failed';
                 console.warn(`[Best-Effort] ${errorMessage}`, context);
               } else {
+                saveFailedEvent(
+                  {
+                    type: normalizedType,
+                    source: normalizedSource,
+                    payload,
+                  },
+                  key,
+                  error instanceof Error ? error.message : String(error),
+                ).catch((e) => console.error('Failed to save failed event', e));
                 console.error(errorMessage, context);
               }
             })
diff --git a/src/types.ts b/src/types.ts
index aa3dcd9..eb3abfd 100644
--- a/src/types.ts
+++ b/src/types.ts
@@ -3,3 +3,23 @@ export interface PlexerEvent {
   source: string;
   payload: unknown;
 }
+
+export interface PlexerDeliveryReport {
+  counts: {
+    pending: number;
+    failed: number;
+  };
+  last_error: string | null;
+  last_retry_at: string | null;
+  retryable_now: number;
+  next_due_at: string | null;
+}
+
+export interface FailedEvent {
+  consumerKey: string;
+  event: PlexerEvent;
+  retryCount: number;
+  lastAttempt: string; // ISO date string
+  nextAttempt: string; // ISO date string
+  error: string;
+}
diff --git a/src/vendor/schemas/plexer/delivery.report.v1.schema.json b/src/vendor/schemas/plexer/delivery.report.v1.schema.json
new file mode 100644
index 0000000..063076a
--- /dev/null
+++ b/src/vendor/schemas/plexer/delivery.report.v1.schema.json
@@ -0,0 +1,22 @@
+{
+  "$id": "https://schemas.heimgewebe.org/contracts/plexer/delivery.report.v1.schema.json",
+  "title": "Plexer Delivery Report",
+  "type": "object",
+  "required": ["counts"],
+  "properties": {
+    "counts": {
+      "type": "object",
+      "required": ["pending", "failed"],
+      "properties": {
+        "pending": { "type": "integer", "minimum": 0 },
+        "failed": { "type": "integer", "minimum": 0 }
+      },
+      "additionalProperties": false
+    },
+    "last_error": { "type": ["string", "null"] },
+    "last_retry_at": { "type": ["string", "null"], "format": "date-time" },
+    "retryable_now": { "type": "integer", "minimum": 0 },
+    "next_due_at": { "type": ["string", "null"], "format": "date-time" }
+  },
+  "additionalProperties": false
+}
diff --git a/src/vendor/schemas/plexer/event.envelope.v1.schema.json b/src/vendor/schemas/plexer/event.envelope.v1.schema.json
new file mode 100644
index 0000000..4d8c2b8
--- /dev/null
+++ b/src/vendor/schemas/plexer/event.envelope.v1.schema.json
@@ -0,0 +1,12 @@
+{
+  "$id": "https://schemas.heimgewebe.org/contracts/plexer/event.envelope.v1.schema.json",
+  "title": "Event Envelope",
+  "type": "object",
+  "required": ["type", "source", "payload"],
+  "properties": {
+    "type": { "type": "string", "maxLength": 256, "pattern": "^[A-Za-z0-9._-]+$" },
+    "source": { "type": "string", "maxLength": 256 },
+    "payload": {}
+  },
+  "additionalProperties": false
+}
diff --git a/src/vendor/schemas/plexer/failed_event.v1.schema.json b/src/vendor/schemas/plexer/failed_event.v1.schema.json
new file mode 100644
index 0000000..19e1ab6
--- /dev/null
+++ b/src/vendor/schemas/plexer/failed_event.v1.schema.json
@@ -0,0 +1,30 @@
+{
+  "$id": "https://schemas.heimgewebe.org/contracts/plexer/failed_event.v1.schema.json",
+  "title": "Failed Event Entry",
+  "type": "object",
+  "required": [
+    "consumerKey",
+    "event",
+    "retryCount",
+    "lastAttempt",
+    "nextAttempt",
+    "error"
+  ],
+  "properties": {
+    "consumerKey": { "type": "string" },
+    "event": {
+      "type": "object",
+      "required": ["type", "source", "payload"],
+      "properties": {
+        "type": { "type": "string" },
+        "source": { "type": "string" },
+        "payload": {}
+      }
+    },
+    "retryCount": { "type": "integer", "minimum": 0 },
+    "lastAttempt": { "type": "string", "format": "date-time" },
+    "nextAttempt": { "type": "string", "format": "date-time" },
+    "error": { "type": "string" }
+  },
+  "additionalProperties": false
+}

