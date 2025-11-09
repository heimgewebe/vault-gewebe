3) perfekt — du bekommst jetzt den Agent-Workflow-Validator fertig verdrahtet:
	•	metarepo: legt die drei angekündigten Contracts wirklich an
(dev.tooling.schema.json, knowledge.graph.schema.json, agent.workflow.schema.json)
	•	wgx: bekommt ein CLI-Skript zum lokalen Validieren und einen CI-Workflow, der alle
Agent-Workflow-Manifeste prüft (JSON, nicht JSONL), gepinnt auf ajv-cli@5 und den Tag contracts-v1

Kopiere die Blöcke jeweils 1:1 ins Terminal im Root des entsprechenden Repos.

⸻

1) metarepo · neue Contracts anlegen

(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Add File: contracts/dev.tooling.schema.json
+{
+  "$schema": "https://json-schema.org/draft/2020-12/schema",
+  "$id": "https://schemas.heimgewebe.org/dev.tooling.schema.json",
+  "title": "Development Tooling Contract",
+  "type": "object",
+  "additionalProperties": false,
+  "properties": {
+    "language": {
+      "type": "string",
+      "enum": ["rust", "python", "typescript", "bash"]
+    },
+    "lsp_config": {
+      "type": "object",
+      "description": "IDE/LSP Konfiguration (z. B. rust-analyzer, pylsp, tsserver).",
+      "additionalProperties": true
+    },
+    "code_generation": {
+      "type": "object",
+      "additionalProperties": false,
+      "properties": {
+        "templates": { "type": "array", "items": { "type": "string" }, "default": [] },
+        "generators": { "type": "array", "items": { "type": "string" }, "default": [] },
+        "validation_rules": { "type": "array", "items": { "type": "string" }, "default": [] }
+      }
+    },
+    "test_framework": {
+      "type": "object",
+      "additionalProperties": false,
+      "properties": {
+        "kind": { "type": "string", "enum": ["cargo", "pytest", "node", "bash"] },
+        "watch": { "type": "boolean", "default": false }
+      }
+    }
+  },
+  "required": ["language"]
+}
+
*** End Patch
PATCH
)

(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Add File: contracts/knowledge.graph.schema.json
+{
+  "$schema": "https://json-schema.org/draft/2020-12/schema",
+  "$id": "https://schemas.heimgewebe.org/knowledge.graph.schema.json",
+  "title": "Knowledge Graph Export",
+  "type": "object",
+  "additionalProperties": false,
+  "properties": {
+    "nodes": {
+      "type": "array",
+      "items": {
+        "type": "object",
+        "additionalProperties": false,
+        "properties": {
+          "id": { "type": "string", "minLength": 1 },
+          "type": { "type": "string", "enum": ["concept", "code_entity", "document", "decision"] },
+          "labels": { "type": "array", "items": { "type": "string" }, "default": [] },
+          "props": { "type": "object", "additionalProperties": true }
+        },
+        "required": ["id", "type"]
+      },
+      "default": []
+    },
+    "edges": {
+      "type": "array",
+      "items": {
+        "type": "object",
+        "additionalProperties": false,
+        "properties": {
+          "source": { "type": "string", "minLength": 1 },
+          "target": { "type": "string", "minLength": 1 },
+          "relation": {
+            "type": "string",
+            "enum": ["implements", "references", "supersedes", "depends_on", "mentions", "fixes", "has_smell"]
+          },
+          "weight": { "type": "number" },
+          "meta": { "type": "object", "additionalProperties": true }
+        },
+        "required": ["source", "target", "relation"]
+      },
+      "default": []
+    },
+    "metadata": {
+      "type": "object",
+      "additionalProperties": false,
+      "properties": {
+        "last_updated": { "type": "string", "format": "date-time" },
+        "authors": { "type": "array", "items": { "type": "string" }, "default": [] },
+        "tags": { "type": "array", "items": { "type": "string" }, "default": [] }
+      },
+      "default": {}
+    }
+  },
+  "required": ["nodes", "edges"]
+}
+
*** End Patch
PATCH
)

(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Add File: contracts/agent.workflow.schema.json
+{
+  "$schema": "https://json-schema.org/draft/2020-12/schema",
+  "$id": "https://schemas.heimgewebe.org/agent.workflow.schema.json",
+  "title": "Agent Workflow Manifest",
+  "type": "object",
+  "additionalProperties": false,
+  "properties": {
+    "workflow_id": { "type": "string", "minLength": 1 },
+    "name": { "type": "string" },
+    "orchestration": { "type": "string", "enum": ["sequential", "parallel", "graph"], "default": "sequential" },
+    "agents": {
+      "type": "array",
+      "minItems": 1,
+      "items": {
+        "type": "object",
+        "additionalProperties": false,
+        "properties": {
+          "id": { "type": "string", "minLength": 1 },
+          "type": { "type": "string", "enum": ["code", "knowledge", "research", "supervisor", "ingest", "policy"] },
+          "capabilities": { "type": "array", "items": { "type": "string" }, "default": [] },
+          "inputs": { "type": "object", "additionalProperties": true, "default": {} },
+          "outputs": { "type": "object", "additionalProperties": true, "default": {} },
+          "command": {
+            "oneOf": [
+              { "type": "string" },
+              { "type": "array", "items": { "type": "string" } }
+            ]
+          },
+          "env": { "type": "object", "additionalProperties": { "type": "string" }, "default": {} }
+        },
+        "required": ["id", "type"]
+      }
+    },
+    "graph": {
+      "type": "object",
+      "additionalProperties": false,
+      "properties": {
+        "edges": {
+          "type": "array",
+          "items": {
+            "type": "object",
+            "additionalProperties": false,
+            "properties": {
+              "from": { "type": "string" },
+              "to": { "type": "string" },
+              "when": { "type": "string", "description": "optional condition/expression" }
+            },
+            "required": ["from", "to"]
+          },
+          "default": []
+        }
+      },
+      "default": { "edges": [] }
+    },
+    "policies": {
+      "type": "object",
+      "additionalProperties": false,
+      "properties": {
+        "retry_strategy": {
+          "type": "object",
+          "additionalProperties": false,
+          "properties": {
+            "max_retries": { "type": "integer", "minimum": 0, "default": 0 },
+            "backoff": { "type": "string", "enum": ["none", "fixed", "exponential"], "default": "none" }
+          },
+          "default": { "max_retries": 0, "backoff": "none" }
+        },
+        "timeout_sec": { "type": "integer", "minimum": 1 },
+        "cost_limits": {
+          "type": "object",
+          "additionalProperties": false,
+          "properties": {
+            "max_tokens": { "type": "integer", "minimum": 0 },
+            "max_requests": { "type": "integer", "minimum": 0 }
+          }
+        }
+      },
+      "default": {}
+    }
+  },
+  "required": ["workflow_id", "agents"]
+}
+
*** End Patch
PATCH
)