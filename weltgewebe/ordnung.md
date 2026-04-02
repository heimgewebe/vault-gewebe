diff --git a/Makefile b/Makefile
index 81636d19..7c19e524 100644
--- a/Makefile
+++ b/Makefile
@@ -3,6 +3,7 @@
 docs-guard:
 	python3 -m unittest discover scripts/docmeta/tests/
 	python3 -m scripts.docmeta.validate_schema
+	python3 -m scripts.docmeta.validate_relations
 	python3 -m scripts.docmeta.check_repo_index_consistency
 	python3 -m scripts.docmeta.check_doc_review_age
 	python3 -m scripts.docmeta.review_impact
@@ -10,10 +11,10 @@ docs-guard:
 	python3 -m scripts.docmeta.generate_audit_gaps
 	python3 -m scripts.docmeta.check_links
 	bash scripts/docmeta/generate-doc-index.sh
-	bash scripts/docmeta/generate-backlinks.sh
+	python3 -m scripts.docmeta.generate_backlinks
 	bash scripts/docmeta/generate-impl-index.sh
-	bash scripts/docmeta/orphan-guard.sh
-	bash scripts/docmeta/generate-supersession-map.sh
+	python3 -m scripts.docmeta.generate_orphans
+	python3 -m scripts.docmeta.generate_supersession_map
 	python3 -m scripts.docmeta.generate_system_map
 	python3 -m scripts.docmeta.generate_architecture_drift
 	python3 -m scripts.docmeta.generate_doc_coverage
@@ -22,6 +23,8 @@ docs-guard:
 	python3 -m scripts.docmeta.generate_change_resonance
 	python3 -m scripts.docmeta.generate_staleness_report
 	python3 -m scripts.docmeta.generate_agent_readiness
+	python3 -m scripts.docmeta.generate_relations_analysis
+	python3 -m scripts.docmeta.generate_relates_to_audit
 	git diff --exit-code docs/_generated/
 
 up:
diff --git a/architecture/blueprint.docmeta-engine.md b/architecture/blueprint.docmeta-engine.md
index 2303e7e8..88a4038a 100644
--- a/architecture/blueprint.docmeta-engine.md
+++ b/architecture/blueprint.docmeta-engine.md
@@ -1,10 +1,12 @@
 ---
 id: blueprint.docmeta-engine
+title: Docmeta Engine Blueprint
+summary: Blaupause zur schrittweisen Umsetzung einer selbsterhaltenden Dokumentationsarchitektur.
 role: norm
 organ: governance
 status: canonical
 last_reviewed: 2026-03-03
-depends_on: []
+relations: []
 verifies_with: []
 ---
 
diff --git a/architecture/docmeta.schema.md b/architecture/docmeta.schema.md
index c4931059..92112e29 100644
--- a/architecture/docmeta.schema.md
+++ b/architecture/docmeta.schema.md
@@ -1,14 +1,17 @@
 ---
 id: docmeta.schema
+title: Docmeta Schema
+summary: Schema-Definition und Konventionen für Frontmatter-Metadaten in kanonischen Entry-Docs.
 role: norm
 organ: docmeta
 status: canonical
 last_reviewed: 2026-03-02
-depends_on: []
+relations: []
 verifies_with:
   - scripts/docmeta/check_repo_index_consistency.py
   - scripts/docmeta/check_doc_review_age.py
   - scripts/docmeta/generate_system_map.py
+  - scripts/docmeta/validate_relations.py
 ---
 
 # Docmeta Schema
@@ -17,14 +20,116 @@ Dieses Dokument definiert das Schema für Frontmatter-Metadaten in den kanonisch
 
 > **Hinweis:** Das Frontmatter wird bewusst durch einen eingeschränkten, deterministischen
 > Mini-Parser gelesen. Strukturierte YAML-Blocklisten werden ausdrücklich nur für die
-> Felder `depends_on`, `verifies_with` und `audit_gaps` garantiert.
+> Felder `relations`, `verifies_with` und `audit_gaps` garantiert.
+
+## Pflichtfelder (alle Dokumente)
 
 * **id**: Eindeutiger Identifier des Dokuments.
+* **title**: Menschenlesbarer Titel.
+* **status**: Status (canonical | active | deprecated | draft).
+* **summary**: Nicht-leere Zusammenfassung (Platzhalter werden abgelehnt).
+
+## Optionales Feld
+
+* **doc_type**: Dokumenttyp (z.B. blueprint, reference, concept, runbook, generated).
+
+## Relationen (`relations`)
+
+Einziger kanonischer Relationsmechanismus. Jede Relation ist ein Objekt mit `type` und `target`.
+
+```yaml
+relations:
+  - type: relates_to
+    target: docs/blueprints/ui-state-machine.md
+  - type: supersedes
+    target: docs/konzepte/garnrolle.md
+```
+
+### Relationstypen
+
+| Typ | Semantik | Konsument |
+| --- | --- | --- |
+| `relates_to` | Allgemeine thematische Querverbindung | backlinks, orphan-guard |
+| `depends_on` | Dieses Dokument setzt das Zieldokument voraus | backlinks, orphan-guard |
+| `supersedes` | Dieses Dokument löst das Zieldokument ab | backlinks, orphan-guard, supersession-map |
+
+Andere Typen sind **nicht erlaubt** und werden vom Guard abgelehnt.
+
+### Autorenregeln — Wann welchen Typ verwenden?
+
+**`relates_to`** — lose, kontextuelle Verbindung.
+Zwei Dokumente behandeln verwandtes Thema, ohne harte Abhängigkeit.
+
+* ✅ ADR → Blueprint, der den gleichen Feature-Bereich betrifft
+* ✅ Konzeptdokument → Spec, die das Konzept konkretisiert
+* ❌ NICHT verwenden, wenn ein Dokument ohne das andere sinnlos wäre → dann `depends_on`
+* ❌ NICHT verwenden, wenn ein Dokument das andere ersetzt → dann `supersedes`
+
+**`depends_on`** — funktionale oder logische Abhängigkeit.
+Dieses Dokument setzt das Zieldokument inhaltlich voraus.
+
+* ✅ Spec, die auf dem Datenmodell aufbaut:
+
+  ```yaml
+  relations:
+    - type: depends_on
+      target: docs/datenmodell.md
+  ```
+
+* ✅ Runbook, das eine Deployment-Anleitung referenziert
+* ❌ NICHT verwenden für lose thematische Nähe → dann `relates_to`
+
+**`supersedes`** — Ablösung.
+Dieses Dokument ersetzt das Zieldokument vollständig.
+
+* ✅ Neues Konzeptdokument löst altes ab:
+
+  ```yaml
+  relations:
+    - type: supersedes
+      target: docs/konzepte/alt.md
+  ```
+
+* ❌ NICHT verwenden, wenn beide Dokumente weiterhin gültig sind → dann `relates_to`
+
+### Referenzformat (PATH-Policy)
+
+Targets verwenden **repo-root-relative Pfade** (z.B. `docs/blueprints/ui-state-machine.md`).
+
+**Regeln:**
+
+1. **Format**: Immer repo-root-relativ (z.B. `docs/konzepte/foo.md`)
+2. **Keine absoluten Pfade** (`/docs/...` ist ungültig)
+3. **Keine IDs** als Targets — Pfade sind direkt navigierbar und eindeutig
+4. **Target muss existieren** — der Guard prüft, ob die Datei vorhanden ist
+5. **Keine Selbstreferenzen** — ein Dokument darf nicht auf sich selbst zeigen
+6. **Keine Duplikate** — identische (type, target)-Paare werden abgelehnt
+
+**Bei Umbenennung:**
+Wenn eine Zieldatei umbenannt wird, müssen alle `target:`-Einträge, die darauf
+verweisen, manuell angepasst werden. Der Guard erkennt verwaiste Targets als Fehler.
+Ein repo-weites `grep -r 'target: docs/alter-pfad.md'` hilft beim Auffinden.
+
+### Guard-Validierung
+
+`validate_relations.py` prüft automatisch:
+
+| Regel | Fehler bei Verstoß |
+| --- | --- |
+| `relations` muss Liste sein | `must be a list` |
+| Jeder Eintrag muss `type` + `target` haben | `missing required key` |
+| Nur erlaubte Typen | `unknown relation type` |
+| Target muss existieren | `does not exist` |
+| Keine absoluten Pfade | `not absolute` |
+| Keine Selbstreferenzen | `self-reference detected` |
+| Keine Duplikate | `duplicate relation` |
+| Keine Extra-Keys | `unexpected keys` |
+
+## Zone-spezifische Felder (architecture/, runtime/, runbooks/)
+
 * **role**: Rolle des Dokuments (norm | reality | runbooks | action).
 * **organ**: (Optional) Architektonisches Ownership-Feld für maschinelles Routing
   (z.B. governance, runtime, contracts, docmeta, deploy).
-* **status**: Status (canonical).
 * **last_reviewed**: Datum der letzten Überprüfung im Format YYYY-MM-DD.
-* **depends_on**: Liste von Dokumenten-IDs, von denen dieses Dokument abhängt.
 * **verifies_with**: Liste von Checks/Scripts, die dieses Dokument verifizieren.
 * **audit_gaps**: Liste von bekannten Lücken, offenen Fragen oder technischen Schulden (optional).
diff --git a/architecture/overview.md b/architecture/overview.md
index 23b2c5bf..2764f385 100644
--- a/architecture/overview.md
+++ b/architecture/overview.md
@@ -1,10 +1,12 @@
 ---
 id: overview
+title: Architecture Overview
+summary: Überblick über die Systemarchitektur und zentrale Designentscheidungen.
 role: norm
 organ: governance
 status: canonical
 last_reviewed: 2026-02-28
-depends_on: []
+relations: []
 verifies_with: []
 ---
 
diff --git a/architecture/security.md b/architecture/security.md
index ce41feae..f4028e8f 100644
--- a/architecture/security.md
+++ b/architecture/security.md
@@ -1,10 +1,12 @@
 ---
 id: security
+title: Security Architecture
+summary: Sicherheitsarchitektur, Bedrohungsmodell und Schutzmechanismen.
 role: norm
 organ: governance
 status: canonical
 last_reviewed: 2026-02-28
-depends_on: []
+relations: []
 verifies_with: []
 ---
 
diff --git a/contracts/docmeta.schema.json b/contracts/docmeta.schema.json
index 8c6e1daf..3e2b1f92 100644
--- a/contracts/docmeta.schema.json
+++ b/contracts/docmeta.schema.json
@@ -1,11 +1,59 @@
 {
   "$schema": "http://json-schema.org/draft-07/schema#",
+  "description": "Unified DocMeta schema — single canonical model for all repo documents. One relation mechanism: relations[].",
   "type": "object",
   "properties": {
     "id": {
       "type": "string",
       "minLength": 1
     },
+    "title": {
+      "type": "string",
+      "minLength": 1
+    },
+    "summary": {
+      "type": "string",
+      "minLength": 1
+    },
+    "status": {
+      "type": "string",
+      "enum": [
+        "canonical",
+        "active",
+        "deprecated",
+        "draft"
+      ]
+    },
+    "doc_type": {
+      "type": "string",
+      "minLength": 1
+    },
+    "relations": {
+      "type": "array",
+      "items": {
+        "type": "object",
+        "properties": {
+          "type": {
+            "type": "string",
+            "enum": [
+              "relates_to",
+              "depends_on",
+              "supersedes"
+            ]
+          },
+          "target": {
+            "type": "string",
+            "minLength": 1
+          }
+        },
+        "required": [
+          "type",
+          "target"
+        ],
+        "additionalProperties": false
+      },
+      "description": "Canonical relation mechanism. Each entry is a typed relationship to a target document (repo-root-relative path)."
+    },
     "role": {
       "type": "string",
       "enum": [
@@ -13,34 +61,25 @@
         "reality",
         "runbooks",
         "action"
-      ]
+      ],
+      "description": "Zone-specific: document role within the zone hierarchy."
     },
     "organ": {
       "type": "string",
       "minLength": 1,
-      "pattern": "^[a-z0-9-]+$"
-    },
-    "status": {
-      "type": "string",
-      "enum": [
-        "canonical"
-      ]
+      "pattern": "^[a-z0-9-]+$",
+      "description": "Zone-specific: organizational unit."
     },
     "last_reviewed": {
       "type": "string",
       "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
     },
-    "depends_on": {
-      "type": "array",
-      "items": {
-        "type": "string"
-      }
-    },
     "verifies_with": {
       "type": "array",
       "items": {
         "type": "string"
-      }
+      },
+      "description": "Zone-specific: scripts that verify this document."
     },
     "audit_gaps": {
       "type": "array",
@@ -51,11 +90,9 @@
   },
   "required": [
     "id",
-    "role",
+    "title",
     "status",
-    "last_reviewed",
-    "depends_on",
-    "verifies_with"
+    "summary"
   ],
   "additionalProperties": false
 }
diff --git a/docs/_generated/agent-readiness.md b/docs/_generated/agent-readiness.md
index f1e77320..c1f604ce 100644
--- a/docs/_generated/agent-readiness.md
+++ b/docs/_generated/agent-readiness.md
@@ -3,7 +3,6 @@ id: docs.generated.agent-readiness
 title: Agent Readiness
 doc_type: generated
 status: active
-canonicality: derived
 summary: Zusammenfassung der agentischen Reife.
 ---
 
diff --git a/docs/_generated/architecture-drift.md b/docs/_generated/architecture-drift.md
index c6877c87..fd761a40 100644
--- a/docs/_generated/architecture-drift.md
+++ b/docs/_generated/architecture-drift.md
@@ -3,7 +3,6 @@ id: docs.generated.architecture-drift
 title: Architecture Drift
 doc_type: generated
 status: active
-canonicality: derived
 summary: Automatisch generierter Report über Architektur-Drift.
 ---
 
diff --git a/docs/_generated/backlinks.md b/docs/_generated/backlinks.md
index 3ab5299b..bc5787bf 100644
--- a/docs/_generated/backlinks.md
+++ b/docs/_generated/backlinks.md
@@ -3,7 +3,6 @@ id: docs.generated.backlinks
 title: Backlinks Graph
 doc_type: generated
 status: active
-canonicality: derived
 summary: Automatisch generierter Graph der Rückverweise.
 ---
 
@@ -11,10 +10,302 @@ summary: Automatisch generierter Graph der Rückverweise.
 
 Generated automatically. Do not edit.
 
+## docs/adr/0042-consume-semantah-contracts.md
+
+- [relates_to] docs/x-repo/semantAH.md
+
+## docs/adr/ADR-0003__privacy-ungenauigkeitsradius-ron.md
+
+- [relates_to] docs/konzepte/garnrolle-und-verortung.md
+
+## docs/adr/ADR-0005-auth.md
+
+- [relates_to] docs/adr/ADR-0006__auth-magic-link-session-passkey.md
+- [relates_to] docs/specs/auth-blueprint.md
+
+## docs/adr/ADR-0006__auth-magic-link-session-passkey.md
+
+- [relates_to] docs/adr/ADR-0005-auth.md
+- [relates_to] docs/blueprints/auth-roadmap.md
+- [relates_to] docs/blueprints/weltgewebe.auth-and-ui-routing.md
+- [relates_to] docs/reports/auth-status-matrix.md
+- [relates_to] docs/specs/auth-api.md
+- [relates_to] docs/specs/auth-blueprint.md
+- [relates_to] docs/specs/auth-state-machine.md
+- [relates_to] docs/specs/auth-ui.md
+
+## docs/architekturstruktur.md
+
+- [relates_to] docs/adr/ADR-0001__clean-slate-docs-monorepo.md
+- [relates_to] docs/datenmodell.md
+- [relates_to] docs/techstack.md
+- [relates_to] docs/vision.md
+- [relates_to] docs/zusammenstellung.md
+
+## docs/blueprints/auth-roadmap.md
+
+- [relates_to] docs/adr/ADR-0006__auth-magic-link-session-passkey.md
+- [relates_to] docs/reports/auth-status-matrix.md
+- [relates_to] docs/specs/auth-blueprint.md
+
+## docs/blueprints/map-blaupause.md
+
+- [relates_to] docs/blueprints/map-roadmap.md
+
+## docs/blueprints/map-roadmap.md
+
+- [relates_to] docs/blueprints/map-blaupause.md
+
+## docs/blueprints/ui-blaupause.md
+
+- [relates_to] docs/blueprints/ui-roadmap.md
+- [relates_to] docs/blueprints/ui-state-machine.md
+- [relates_to] docs/blueprints/weltgewebe.auth-and-ui-routing.md
+
 ## docs/blueprints/ui-roadmap.md
 
-- [related_docs] docs/blueprints/ui-blaupause.md
+- [relates_to] docs/blueprints/ui-blaupause.md
+- [relates_to] docs/blueprints/ui-state-machine.md
 
 ## docs/blueprints/ui-state-machine.md
 
-- [related_docs] docs/blueprints/ui-blaupause.md
+- [relates_to] docs/blueprints/ui-blaupause.md
+- [relates_to] docs/blueprints/ui-roadmap.md
+
+## docs/blueprints/versionierungs-blaupause.md
+
+- [relates_to] docs/blueprints/versionierungs-statusgrundlage.md
+
+## docs/blueprints/versionierungs-statusgrundlage.md
+
+- [relates_to] docs/blueprints/versionierungs-blaupause.md
+
+## docs/datenmodell.md
+
+- [relates_to] docs/adr/0043-edge-vs-conversation.md
+- [relates_to] docs/architekturstruktur.md
+- [relates_to] docs/domain/vocabulary.md
+- [relates_to] docs/specs/contract.md
+- [relates_to] docs/techstack.md
+
+## docs/deploy/README.md
+
+- [relates_to] docs/blueprints/weltgewebe.deploy.plan.md
+- [relates_to] docs/deploy/CHANGELOG.md
+- [relates_to] docs/deploy/DRIFT_POLICY.md
+- [relates_to] docs/deploy/heim-first-phase0.md
+- [relates_to] docs/deploy/heimserver.deployment.md
+- [relates_to] docs/deploy/heimserver.integration.md
+- [relates_to] docs/deploy/security.md
+- [relates_to] docs/deploy/vps.md
+- [relates_to] docs/deploy/weltgewebe.naming.md
+- [relates_to] docs/deployment.md
+- [relates_to] docs/deployment_governance.md
+- [relates_to] docs/edge/systemd/README.md
+- [relates_to] docs/runbook.md
+
+## docs/deploy/heimserver.deployment.md
+
+- [relates_to] docs/deploy/README.md
+- [relates_to] docs/deploy/heim-first-phase0.md
+- [relates_to] docs/deploy/heimserver.integration.md
+- [relates_to] docs/runbooks/ops.runbook.weltgewebe-selfhost-deploy.md
+
+## docs/deploy/heimserver.integration.md
+
+- [relates_to] docs/deploy/README.md
+- [relates_to] docs/deploy/heimserver.deployment.md
+
+## docs/deploy/security.md
+
+- [relates_to] docs/deploy/README.md
+- [relates_to] docs/deployment.md
+
+## docs/deployment.md
+
+- [relates_to] docs/blueprints/versionierungs-blaupause.md
+- [relates_to] docs/blueprints/weltgewebe.config.diff.md
+- [relates_to] docs/blueprints/weltgewebe.deploy.plan.md
+- [relates_to] docs/deploy/DRIFT_POLICY.md
+- [relates_to] docs/deploy/README.md
+- [relates_to] docs/deploy/heimserver.deployment.md
+- [relates_to] docs/deploy/heimserver.integration.md
+- [relates_to] docs/deploy/security.md
+- [relates_to] docs/deployment_governance.md
+- [relates_to] docs/runbook.md
+- [relates_to] docs/runbooks/ops.runbook.weltgewebe-selfhost-deploy.md
+
+## docs/deployment_governance.md
+
+- [relates_to] docs/deploy/README.md
+- [relates_to] docs/deployment.md
+
+## docs/dev/codespaces.md
+
+- [relates_to] docs/quickstart-gate-c.md
+- [relates_to] docs/runbooks/codespaces-recovery.md
+
+## docs/domain/modules.md
+
+- [relates_to] docs/domain/vocabulary.md
+
+## docs/domain/vocabulary.md
+
+- [relates_to] docs/adr/0043-edge-vs-conversation.md
+- [relates_to] docs/datenmodell.md
+- [relates_to] docs/domain/modules.md
+- [relates_to] docs/reference/glossar.md
+- [relates_to] docs/specs/contract.md
+
+## docs/inhalt.md
+
+- [relates_to] docs/geist-und-plan.md
+- [relates_to] docs/overview/inhalt.md
+- [relates_to] docs/vision.md
+- [relates_to] docs/zusammenstellung.md
+
+## docs/konzepte/garnrolle-und-verortung.md
+
+- [relates_to] docs/adr/ADR-0003__privacy-ungenauigkeitsradius-ron.md
+- [relates_to] docs/konzepte/garnrolle.md
+- [relates_to] docs/specs/privacy-api.md
+- [relates_to] docs/specs/privacy-ui.md
+
+## docs/konzepte/garnrolle.md
+
+- [relates_to] docs/konzepte/garnrolle-und-verortung.md
+- [supersedes] docs/konzepte/garnrolle-und-verortung.md
+
+## docs/overview/inhalt.md
+
+- [relates_to] docs/overview/zusammenstellung.md
+
+## docs/policies/orientierung.md
+
+- [relates_to] docs/weltgewebe-agenten-manifest.md
+
+## docs/process/README.md
+
+- [relates_to] docs/process/bash-tooling-guidelines.md
+- [relates_to] docs/process/fahrplan.md
+- [relates_to] docs/process/sprache.md
+
+## docs/process/bash-tooling-guidelines.md
+
+- [relates_to] docs/process/README.md
+
+## docs/process/fahrplan.md
+
+- [relates_to] docs/adr/ADR-0002__reentry-kriterien.md
+- [relates_to] docs/adr/ADR-0004__fahrplan-verweis.md
+- [relates_to] docs/process/README.md
+- [relates_to] docs/quickstart-gate-c.md
+
+## docs/process/sprache.md
+
+- [relates_to] docs/process/README.md
+
+## docs/quickstart-gate-c.md
+
+- [relates_to] docs/dev/codespaces.md
+
+## docs/reports/auth-status-matrix.md
+
+- [relates_to] docs/adr/ADR-0006__auth-magic-link-session-passkey.md
+- [relates_to] docs/blueprints/auth-roadmap.md
+
+## docs/runbook.md
+
+- [relates_to] docs/deployment.md
+- [relates_to] docs/runbook.observability.md
+- [relates_to] docs/runbooks/README.md
+
+## docs/runbook.observability.md
+
+- [relates_to] docs/runbook.md
+
+## docs/runbooks/README.md
+
+- [relates_to] docs/runbooks/codespaces-recovery.md
+- [relates_to] docs/runbooks/ops.runbook.weltgewebe-selfhost-deploy.md
+- [relates_to] docs/runbooks/uv-tooling.md
+
+## docs/runbooks/codespaces-recovery.md
+
+- [relates_to] docs/dev/codespaces.md
+- [relates_to] docs/runbooks/README.md
+
+## docs/runbooks/ops.runbook.weltgewebe-selfhost-deploy.md
+
+- [relates_to] docs/runbooks/README.md
+
+## docs/runbooks/uv-tooling.md
+
+- [relates_to] docs/runbooks/README.md
+
+## docs/specs/auth-api.md
+
+- [relates_to] docs/specs/auth-state-machine.md
+- [relates_to] docs/specs/auth-ui.md
+
+## docs/specs/auth-blueprint.md
+
+- [relates_to] docs/adr/ADR-0006__auth-magic-link-session-passkey.md
+- [relates_to] docs/blueprints/auth-roadmap.md
+
+## docs/specs/auth-state-machine.md
+
+- [relates_to] docs/specs/auth-api.md
+- [relates_to] docs/specs/auth-ui.md
+
+## docs/specs/auth-ui.md
+
+- [relates_to] docs/specs/auth-api.md
+- [relates_to] docs/specs/auth-state-machine.md
+
+## docs/specs/contract.md
+
+- [relates_to] docs/domain/vocabulary.md
+
+## docs/specs/privacy-api.md
+
+- [relates_to] docs/specs/privacy-ui.md
+
+## docs/specs/privacy-ui.md
+
+- [relates_to] docs/specs/privacy-api.md
+
+## docs/techstack.md
+
+- [relates_to] docs/architekturstruktur.md
+- [relates_to] docs/datenmodell.md
+
+## docs/vision.md
+
+- [relates_to] docs/architekturstruktur.md
+- [relates_to] docs/geist-und-plan.md
+- [relates_to] docs/inhalt.md
+- [relates_to] docs/overview/inhalt.md
+- [relates_to] docs/policies/orientierung.md
+- [relates_to] docs/weltgewebe-agenten-manifest.md
+- [relates_to] docs/zusammenstellung.md
+
+## docs/weltgewebe-agenten-manifest.md
+
+- [relates_to] docs/policies/orientierung.md
+
+## docs/x-repo/peers-learnings.md
+
+- [relates_to] docs/x-repo/semantAH.md
+
+## docs/x-repo/semantAH.md
+
+- [relates_to] docs/adr/0042-consume-semantah-contracts.md
+- [relates_to] docs/x-repo/peers-learnings.md
+
+## docs/zusammenstellung.md
+
+- [relates_to] docs/inhalt.md
+- [relates_to] docs/overview/zusammenstellung.md
+- [relates_to] docs/vision.md
+
diff --git a/docs/_generated/change-resonance.md b/docs/_generated/change-resonance.md
index 6dab8b2a..8d2e072b 100644
--- a/docs/_generated/change-resonance.md
+++ b/docs/_generated/change-resonance.md
@@ -3,7 +3,6 @@ id: docs.generated.change-resonance
 title: Change Resonance
 doc_type: generated
 status: active
-canonicality: derived
 summary: Wenn sich X ändert, prüfe oder aktualisiere Y.
 ---
 
diff --git a/docs/_generated/doc-coverage.md b/docs/_generated/doc-coverage.md
index 9d3a805e..8d622db6 100644
--- a/docs/_generated/doc-coverage.md
+++ b/docs/_generated/doc-coverage.md
@@ -3,7 +3,6 @@ id: docs.generated.doc-coverage
 title: Doc Coverage
 doc_type: generated
 status: active
-canonicality: derived
 summary: Automatisch generierter Report über die Dokumentationsabdeckung.
 ---
 
diff --git a/docs/_generated/doc-index.md b/docs/_generated/doc-index.md
index df55cec7..2f3a4541 100644
--- a/docs/_generated/doc-index.md
+++ b/docs/_generated/doc-index.md
@@ -3,7 +3,6 @@ id: docs.generated.doc-index
 title: Doc Index
 doc_type: generated
 status: active
-canonicality: derived
 summary: Automatisch generierter Dokumenten-Index.
 ---
 
@@ -11,69 +10,76 @@ summary: Automatisch generierter Dokumenten-Index.
 
 Generated automatically. Do not edit.
 
-| id | title | type | status | canonicality | path |
-| --- | --- | --- | --- | --- | --- |
-| adr.0042-consume-semantah-contracts | 0042 Consume Semantah Contracts | reference | active | derived | docs/adr/0042-consume-semantah-contracts.md |
-| adr.0043-edge-vs-conversation | 0043 Edge Vs Conversation | reference | active | derived | docs/adr/0043-edge-vs-conversation.md |
-| adr.ADR-0001__clean-slate-docs-monorepo | Adr 0001__Clean Slate Docs Monorepo | reference | active | derived | docs/adr/ADR-0001__clean-slate-docs-monorepo.md |
-| adr.ADR-0002__reentry-kriterien | Adr 0002__Reentry Kriterien | reference | active | derived | docs/adr/ADR-0002__reentry-kriterien.md |
-| adr.ADR-0003__privacy-ungenauigkeitsradius-ron | Adr 0003__Privacy Ungenauigkeitsradius Ron | reference | active | derived | docs/adr/ADR-0003__privacy-ungenauigkeitsradius-ron.md |
-| adr.ADR-0004__fahrplan-verweis | Adr 0004__Fahrplan Verweis | reference | active | derived | docs/adr/ADR-0004__fahrplan-verweis.md |
-| adr.ADR-0005-auth | Adr 0005 Auth | reference | active | derived | docs/adr/ADR-0005-auth.md |
-| blueprints.weltgewebe.auth-and-ui-routing | Weltgewebe.Auth And Ui Routing | reference | active | derived | docs/blueprints/weltgewebe.auth-and-ui-routing.md |
-| blueprints.weltgewebe.config.diff | Weltgewebe.Config.Diff | reference | active | derived | docs/blueprints/weltgewebe.config.diff.md |
-| blueprints.weltgewebe.deploy.plan | Weltgewebe.Deploy.Plan | reference | active | derived | docs/blueprints/weltgewebe.deploy.plan.md |
-| datenmodell | Datenmodell | reference | active | derived | docs/datenmodell.md |
-| deploy.CHANGELOG | Changelog | reference | active | derived | docs/deploy/CHANGELOG.md |
-| deploy.DRIFT_POLICY | Drift_Policy | reference | active | derived | docs/deploy/DRIFT_POLICY.md |
-| deploy.README | Readme | reference | active | derived | docs/deploy/README.md |
-| deploy.heim-first-phase0 | Heim First Phase0 | reference | active | derived | docs/deploy/heim-first-phase0.md |
-| deploy.heimserver.deployment | Heimserver.Deployment | reference | active | derived | docs/deploy/heimserver.deployment.md |
-| deploy.heimserver.integration | Heimserver.Integration | reference | active | derived | docs/deploy/heimserver.integration.md |
-| deploy.security | Deploy Security | architecture | active | canonical | docs/deploy/security.md |
-| deploy.vps | Vps | reference | active | derived | docs/deploy/vps.md |
-| deploy.weltgewebe.naming | Weltgewebe.Naming | reference | active | derived | docs/deploy/weltgewebe.naming.md |
-| deployment-contract | Deployment Contract and Preflight Guard | guide | active | canonical | docs/deployment.md |
-| deployment_governance | Deployment_Governance | reference | active | derived | docs/deployment_governance.md |
-| dev.codespaces | Codespaces | reference | active | derived | docs/dev/codespaces.md |
-| docs.architecture.overview | Architekturüberblick | architecture | active | canonical | docs/architekturstruktur.md |
-| docs.index | Weltgewebe - Doku-Index | index | active | canonical | docs/index.md |
-| docs.runbook | Runbook | runbook | active | canonical | docs/runbook.md |
-| docs.runbook.observability | Observability Runbook | runbook | active | canonical | docs/runbook.observability.md |
-| docs.techstack | Techstack | architecture | active | canonical | docs/techstack.md |
-| docs.vision | Vision | reference | active | canonical | docs/vision.md |
-| domain.modules | Modules | reference | active | derived | docs/domain/modules.md |
-| domain.vocabulary | Vocabulary | reference | active | derived | docs/domain/vocabulary.md |
-| edge.systemd.README | Readme | reference | active | derived | docs/edge/systemd/README.md |
-| geist-und-plan | Geist Und Plan | reference | active | derived | docs/geist-und-plan.md |
-| inhalt | Inhalt | reference | active | canonical | docs/inhalt.md |
-| konzepte.garnrolle | Garnrolle | reference | active | derived | docs/konzepte/garnrolle.md |
-| konzepte.garnrolle-und-verortung | Weltgewebe – Garnrolle, Wohnsitz und emergentes Vertrauen | concept | active | canonical | docs/konzepte/garnrolle-und-verortung.md |
-| map-blaupause | Basemap-Architektur-Blaupause | blueprint | draft | canonical | docs/blueprints/map-blaupause.md |
-| map-roadmap | Basemap-Umsetzungsroadmap | roadmap | draft | canonical | docs/blueprints/map-roadmap.md |
-| overview.inhalt | Inhalt | reference | active | canonical | docs/overview/inhalt.md |
-| overview.zusammenstellung | Zusammenstellung | reference | active | canonical | docs/overview/zusammenstellung.md |
-| policies.orientierung | Orientierung | reference | active | derived | docs/policies/orientierung.md |
-| process.README | Readme | reference | active | derived | docs/process/README.md |
-| process.bash-tooling-guidelines | Bash Tooling Guidelines | reference | active | derived | docs/process/bash-tooling-guidelines.md |
-| process.fahrplan | Fahrplan | reference | active | derived | docs/process/fahrplan.md |
-| process.sprache | Sprache | reference | active | derived | docs/process/sprache.md |
-| quickstart-gate-c | Quickstart Gate C | reference | active | derived | docs/quickstart-gate-c.md |
-| reference.glossar | Glossar | reference | active | derived | docs/reference/glossar.md |
-| reports.cost-report | Cost Report | reference | active | derived | docs/reports/cost-report.md |
-| runbooks.README | Readme | reference | active | derived | docs/runbooks/README.md |
-| runbooks.codespaces-recovery | Codespaces Recovery | reference | active | derived | docs/runbooks/codespaces-recovery.md |
-| runbooks.ops.runbook.weltgewebe-selfhost-deploy | Ops.Runbook.Weltgewebe Selfhost Deploy | reference | active | derived | docs/runbooks/ops.runbook.weltgewebe-selfhost-deploy.md |
-| runbooks.uv-tooling | Uv Tooling | reference | active | derived | docs/runbooks/uv-tooling.md |
-| specs.auth-blueprint | Auth Blueprint | reference | active | derived | docs/specs/auth-blueprint.md |
-| specs.contract | Contract | reference | active | derived | docs/specs/contract.md |
-| specs.privacy-api | Privacy Api | reference | active | derived | docs/specs/privacy-api.md |
-| specs.privacy-ui | Privacy Ui | reference | active | derived | docs/specs/privacy-ui.md |
-| ui-blaupause | Weltgewebe UI-Blaupause | blueprint | canonical | This document is the canonical source of truth for the UI architecture. | docs/blueprints/ui-blaupause.md |
-| ui-roadmap | Weltgewebe UI Roadmap | blueprint | canonical | This document is the canonical source of truth for the UI implementation roadmap. | docs/blueprints/ui-roadmap.md |
-| ui-state-machine | Weltgewebe UI State Machine | blueprint | canonical | state-machine-contract | docs/blueprints/ui-state-machine.md |
-| versionierungs-blaupause | Weltgewebe Deploy-Versionierung und Browser-Aktualität | blueprint | draft | normative | docs/blueprints/versionierungs-blaupause.md |
-| weltgewebe-agenten-manifest | Weltgewebe Agenten Manifest | reference | active | derived | docs/weltgewebe-agenten-manifest.md |
-| x-repo.peers-learnings | Peers Learnings | reference | active | derived | docs/x-repo/peers-learnings.md |
-| x-repo.semantAH | Semantah | reference | active | derived | docs/x-repo/semantAH.md |
-| zusammenstellung | Zusammenstellung | reference | active | canonical | docs/zusammenstellung.md |
+| id | title | type | status | path |
+| --- | --- | --- | --- | --- |
+| adr.0042-consume-semantah-contracts | ADR-0042 — SemanticAH-Contracts konsumieren | reference | active | docs/adr/0042-consume-semantah-contracts.md |
+| adr.0043-edge-vs-conversation | ADR-0043 — Edge vs. Conversation | reference | active | docs/adr/0043-edge-vs-conversation.md |
+| adr.ADR-0001__clean-slate-docs-monorepo | ADR-0001 — Clean Slate und Docs-Monorepo | reference | active | docs/adr/ADR-0001__clean-slate-docs-monorepo.md |
+| adr.ADR-0002__reentry-kriterien | ADR-0002 — Reentry-Kriterien | reference | active | docs/adr/ADR-0002__reentry-kriterien.md |
+| adr.ADR-0003__privacy-ungenauigkeitsradius-ron | ADR-0003 — Privacy-Ungenauigkeitsradius und RoN | reference | active | docs/adr/ADR-0003__privacy-ungenauigkeitsradius-ron.md |
+| adr.ADR-0004__fahrplan-verweis | ADR-0004 — Fahrplan-Verweis | reference | active | docs/adr/ADR-0004__fahrplan-verweis.md |
+| adr.ADR-0005-auth | ADR-0005 — Auth (Cookie-basierte Sessions) | reference | active | docs/adr/ADR-0005-auth.md |
+| adr.ADR-0006-auth-magic-link-session-passkey | ADR-0006 — Auth: Magic Link, Session und optionaler Passkey | reference | active | docs/adr/ADR-0006__auth-magic-link-session-passkey.md |
+| blueprints.auth-roadmap | Auth Roadmap | roadmap | active | docs/blueprints/auth-roadmap.md |
+| blueprints.weltgewebe.auth-and-ui-routing | Auth und UI-Routing | reference | active | docs/blueprints/weltgewebe.auth-and-ui-routing.md |
+| blueprints.weltgewebe.config.diff | Config Diff | reference | active | docs/blueprints/weltgewebe.config.diff.md |
+| blueprints.weltgewebe.deploy.plan | Deploy-Plan | reference | active | docs/blueprints/weltgewebe.deploy.plan.md |
+| datenmodell | Datenmodell | reference | active | docs/datenmodell.md |
+| deploy.CHANGELOG | Deploy Changelog | reference | active | docs/deploy/CHANGELOG.md |
+| deploy.DRIFT_POLICY | Drift Policy | reference | active | docs/deploy/DRIFT_POLICY.md |
+| deploy.README | Deployment-Übersicht | reference | active | docs/deploy/README.md |
+| deploy.heim-first-phase0 | Heim-First Phase 0 | reference | active | docs/deploy/heim-first-phase0.md |
+| deploy.heimserver.deployment | Heimserver Deployment | reference | active | docs/deploy/heimserver.deployment.md |
+| deploy.heimserver.integration | Heimserver Integration | reference | active | docs/deploy/heimserver.integration.md |
+| deploy.security | Deploy Security | architecture | active | docs/deploy/security.md |
+| deploy.vps | VPS-Deployment | reference | active | docs/deploy/vps.md |
+| deploy.weltgewebe.naming | Weltgewebe Naming | reference | active | docs/deploy/weltgewebe.naming.md |
+| deployment-contract | Deployment Contract and Preflight Guard | guide | active | docs/deployment.md |
+| deployment_governance | Deployment Governance | reference | active | docs/deployment_governance.md |
+| dev.codespaces | Codespaces | reference | active | docs/dev/codespaces.md |
+| docs.architecture.overview | Architekturüberblick | architecture | active | docs/architekturstruktur.md |
+| docs.index | Weltgewebe - Doku-Index | index | active | docs/index.md |
+| docs.runbook | Runbook | runbook | active | docs/runbook.md |
+| docs.runbook.observability | Observability Runbook | runbook | active | docs/runbook.observability.md |
+| docs.techstack | Techstack | architecture | active | docs/techstack.md |
+| docs.vision | Vision | reference | active | docs/vision.md |
+| domain.modules | Modul-IDs | reference | active | docs/domain/modules.md |
+| domain.vocabulary | Domänenvokabular | reference | active | docs/domain/vocabulary.md |
+| edge.systemd.README | Edge Systemd | reference | active | docs/edge/systemd/README.md |
+| geist-und-plan | Geist und Plan | reference | active | docs/geist-und-plan.md |
+| inhalt | Inhalt | reference | active | docs/inhalt.md |
+| konzepte.garnrolle | Garnrolle | reference | deprecated | docs/konzepte/garnrolle.md |
+| konzepte.garnrolle-und-verortung | Weltgewebe – Garnrolle, Verortung und Rolle ohne Namen | concept | active | docs/konzepte/garnrolle-und-verortung.md |
+| map-blaupause | Basemap-Architektur-Blaupause | blueprint | draft | docs/blueprints/map-blaupause.md |
+| map-roadmap | Basemap-Umsetzungsroadmap | roadmap | draft | docs/blueprints/map-roadmap.md |
+| overview.inhalt | Inhalt (Übersicht) | reference | active | docs/overview/inhalt.md |
+| overview.zusammenstellung | Zusammenstellung (Übersicht) | reference | active | docs/overview/zusammenstellung.md |
+| policies.orientierung | Orientierung | reference | active | docs/policies/orientierung.md |
+| process.README | Prozess-Übersicht | reference | active | docs/process/README.md |
+| process.bash-tooling-guidelines | Bash Tooling Guidelines | reference | active | docs/process/bash-tooling-guidelines.md |
+| process.fahrplan | Fahrplan | reference | active | docs/process/fahrplan.md |
+| process.sprache | Sprache | reference | active | docs/process/sprache.md |
+| quickstart-gate-c | Quickstart Gate C | reference | active | docs/quickstart-gate-c.md |
+| reference.glossar | Glossar | reference | active | docs/reference/glossar.md |
+| reports.auth-status-matrix | Auth Status Matrix | reference | active | docs/reports/auth-status-matrix.md |
+| reports.cost-report | Cost Report | reference | active | docs/reports/cost-report.md |
+| runbooks.README | Runbooks-Übersicht | reference | active | docs/runbooks/README.md |
+| runbooks.codespaces-recovery | Codespaces Recovery | reference | active | docs/runbooks/codespaces-recovery.md |
+| runbooks.ops.runbook.weltgewebe-selfhost-deploy | Selfhost-Deploy Runbook | reference | active | docs/runbooks/ops.runbook.weltgewebe-selfhost-deploy.md |
+| runbooks.uv-tooling | UV-Tooling | reference | active | docs/runbooks/uv-tooling.md |
+| specs.auth-api | Auth API Spec | reference | active | docs/specs/auth-api.md |
+| specs.auth-blueprint | Auth Blueprint | reference | active | docs/specs/auth-blueprint.md |
+| specs.auth-state-machine | Auth State Machine | reference | active | docs/specs/auth-state-machine.md |
+| specs.auth-ui | Auth UI Spec | reference | active | docs/specs/auth-ui.md |
+| specs.contract | Datenvertrag | reference | active | docs/specs/contract.md |
+| specs.privacy-api | Privacy API | reference | active | docs/specs/privacy-api.md |
+| specs.privacy-ui | Privacy UI | reference | active | docs/specs/privacy-ui.md |
+| ui-blaupause | Weltgewebe UI-Blaupause | blueprint | canonical | docs/blueprints/ui-blaupause.md |
+| ui-roadmap | Weltgewebe UI Roadmap | blueprint | canonical | docs/blueprints/ui-roadmap.md |
+| ui-state-machine | Weltgewebe UI State Machine | blueprint | canonical | docs/blueprints/ui-state-machine.md |
+| versionierungs-blaupause | Weltgewebe Deploy-Versionierung und Browser-Aktualität | blueprint | draft | docs/blueprints/versionierungs-blaupause.md |
+| versionierungs-statusgrundlage | Weltgewebe – Versionierungs-Statusgrundlage | blueprint | active | docs/blueprints/versionierungs-statusgrundlage.md |
+| weltgewebe-agenten-manifest | Weltgewebe Agenten Manifest | reference | active | docs/weltgewebe-agenten-manifest.md |
+| x-repo.peers-learnings | Peers Learnings | reference | active | docs/x-repo/peers-learnings.md |
+| x-repo.semantAH | SemanticAH | reference | active | docs/x-repo/semantAH.md |
+| zusammenstellung | Zusammenstellung | reference | active | docs/zusammenstellung.md |
diff --git a/docs/_generated/impl-index.md b/docs/_generated/impl-index.md
index e51e671b..aaa12391 100644
--- a/docs/_generated/impl-index.md
+++ b/docs/_generated/impl-index.md
@@ -3,7 +3,6 @@ id: docs.generated.impl-index
 title: Implementation Index
 doc_type: generated
 status: active
-canonicality: derived
 summary: Automatisch generierter Index kritischer Implementierungen.
 ---
 
diff --git a/docs/_generated/implicit-dependencies.md b/docs/_generated/implicit-dependencies.md
index b9848671..8aeebc8b 100644
--- a/docs/_generated/implicit-dependencies.md
+++ b/docs/_generated/implicit-dependencies.md
@@ -3,7 +3,6 @@ id: docs.generated.implicit-dependencies
 title: Implicit Dependencies
 doc_type: generated
 status: active
-canonicality: derived
 summary: Heuristische Karte impliziter Abhängigkeiten.
 ---
 
@@ -17,6 +16,7 @@ Generated automatically. Do not edit.
 | --- | --- | --- | --- |
 | Makefile (docs-guard) | unittest | `python3 -m unittest discover scripts/docmeta/tests/` | *unclear* |
 | Makefile (docs-guard) | scripts.docmeta.validate_schema | `python3 -m scripts.docmeta.validate_schema` | *unclear* |
+| Makefile (docs-guard) | scripts.docmeta.validate_relations | `python3 -m scripts.docmeta.validate_relations` | *unclear* |
 | Makefile (docs-guard) | scripts.docmeta.check_repo_index_consistency | `python3 -m scripts.docmeta.check_repo_index_consistency` | *unclear* |
 | Makefile (docs-guard) | scripts.docmeta.check_doc_review_age | `python3 -m scripts.docmeta.check_doc_review_age` | *unclear* |
 | Makefile (docs-guard) | scripts.docmeta.review_impact | `python3 -m scripts.docmeta.review_impact` | *unclear* |
@@ -24,10 +24,10 @@ Generated automatically. Do not edit.
 | Makefile (docs-guard) | scripts.docmeta.generate_audit_gaps | `python3 -m scripts.docmeta.generate_audit_gaps` | *unclear* |
 | Makefile (docs-guard) | scripts.docmeta.check_links | `python3 -m scripts.docmeta.check_links` | *unclear* |
 | Makefile (docs-guard) | scripts/docmeta/generate-doc-index.sh | `bash scripts/docmeta/generate-doc-index.sh` | *unclear* |
-| Makefile (docs-guard) | scripts/docmeta/generate-backlinks.sh | `bash scripts/docmeta/generate-backlinks.sh` | *unclear* |
+| Makefile (docs-guard) | scripts.docmeta.generate_backlinks | `python3 -m scripts.docmeta.generate_backlinks` | *unclear* |
 | Makefile (docs-guard) | scripts/docmeta/generate-impl-index.sh | `bash scripts/docmeta/generate-impl-index.sh` | *unclear* |
-| Makefile (docs-guard) | scripts/docmeta/orphan-guard.sh | `bash scripts/docmeta/orphan-guard.sh` | *unclear* |
-| Makefile (docs-guard) | scripts/docmeta/generate-supersession-map.sh | `bash scripts/docmeta/generate-supersession-map.sh` | *unclear* |
+| Makefile (docs-guard) | scripts.docmeta.generate_orphans | `python3 -m scripts.docmeta.generate_orphans` | *unclear* |
+| Makefile (docs-guard) | scripts.docmeta.generate_supersession_map | `python3 -m scripts.docmeta.generate_supersession_map` | *unclear* |
 | Makefile (docs-guard) | scripts.docmeta.generate_system_map | `python3 -m scripts.docmeta.generate_system_map` | *unclear* |
 | Makefile (docs-guard) | scripts.docmeta.generate_architecture_drift | `python3 -m scripts.docmeta.generate_architecture_drift` | *unclear* |
 | Makefile (docs-guard) | scripts.docmeta.generate_doc_coverage | `python3 -m scripts.docmeta.generate_doc_coverage` | *unclear* |
@@ -36,3 +36,5 @@ Generated automatically. Do not edit.
 | Makefile (docs-guard) | scripts.docmeta.generate_change_resonance | `python3 -m scripts.docmeta.generate_change_resonance` | *unclear* |
 | Makefile (docs-guard) | scripts.docmeta.generate_staleness_report | `python3 -m scripts.docmeta.generate_staleness_report` | *unclear* |
 | Makefile (docs-guard) | scripts.docmeta.generate_agent_readiness | `python3 -m scripts.docmeta.generate_agent_readiness` | *unclear* |
+| Makefile (docs-guard) | scripts.docmeta.generate_relations_analysis | `python3 -m scripts.docmeta.generate_relations_analysis` | *unclear* |
+| Makefile (docs-guard) | scripts.docmeta.generate_relates_to_audit | `python3 -m scripts.docmeta.generate_relates_to_audit` | *unclear* |
diff --git a/docs/_generated/knowledge-gaps.md b/docs/_generated/knowledge-gaps.md
index c612ef69..95ac67f4 100644
--- a/docs/_generated/knowledge-gaps.md
+++ b/docs/_generated/knowledge-gaps.md
@@ -3,7 +3,6 @@ id: docs.generated.knowledge-gaps
 title: Knowledge Gaps
 doc_type: generated
 status: active
-canonicality: derived
 summary: Automatisch markierte Wissenslücken in der Repo-Landschaft.
 ---
 
diff --git a/docs/_generated/orphans.md b/docs/_generated/orphans.md
index dd0bc5d5..eea76927 100644
--- a/docs/_generated/orphans.md
+++ b/docs/_generated/orphans.md
@@ -3,7 +3,6 @@ id: docs.generated.orphans
 title: Orphans
 doc_type: generated
 status: active
-canonicality: derived
 summary: Automatisch generierte Liste verwaister Dokumente.
 ---
 
@@ -11,55 +10,4 @@ summary: Automatisch generierte Liste verwaister Dokumente.
 
 Generated automatically. Do not edit.
 
-- docs/adr/0042-consume-semantah-contracts.md
-- docs/adr/0043-edge-vs-conversation.md
-- docs/adr/ADR-0001__clean-slate-docs-monorepo.md
-- docs/adr/ADR-0002__reentry-kriterien.md
-- docs/adr/ADR-0003__privacy-ungenauigkeitsradius-ron.md
-- docs/adr/ADR-0004__fahrplan-verweis.md
-- docs/adr/ADR-0005-auth.md
-- docs/architekturstruktur.md
-- docs/blueprints/weltgewebe.auth-and-ui-routing.md
-- docs/blueprints/weltgewebe.config.diff.md
-- docs/blueprints/weltgewebe.deploy.plan.md
-- docs/datenmodell.md
-- docs/deploy/CHANGELOG.md
-- docs/deploy/DRIFT_POLICY.md
-- docs/deploy/heim-first-phase0.md
-- docs/deploy/heimserver.deployment.md
-- docs/deploy/heimserver.integration.md
-- docs/deploy/security.md
-- docs/deploy/vps.md
-- docs/deploy/weltgewebe.naming.md
-- docs/deployment.md
-- docs/deployment_governance.md
-- docs/dev/codespaces.md
-- docs/domain/modules.md
-- docs/domain/vocabulary.md
-- docs/geist-und-plan.md
-- docs/inhalt.md
-- docs/konzepte/garnrolle.md
-- docs/overview/inhalt.md
-- docs/overview/zusammenstellung.md
-- docs/policies/orientierung.md
-- docs/process/bash-tooling-guidelines.md
-- docs/process/fahrplan.md
-- docs/process/sprache.md
-- docs/quickstart-gate-c.md
-- docs/reference/glossar.md
 - docs/reports/cost-report.md
-- docs/runbook.md
-- docs/runbook.observability.md
-- docs/runbooks/codespaces-recovery.md
-- docs/runbooks/ops.runbook.weltgewebe-selfhost-deploy.md
-- docs/runbooks/uv-tooling.md
-- docs/specs/auth-blueprint.md
-- docs/specs/contract.md
-- docs/specs/privacy-api.md
-- docs/specs/privacy-ui.md
-- docs/techstack.md
-- docs/vision.md
-- docs/weltgewebe-agenten-manifest.md
-- docs/x-repo/peers-learnings.md
-- docs/x-repo/semantAH.md
-- docs/zusammenstellung.md
diff --git a/docs/_generated/relates-to-audit.md b/docs/_generated/relates-to-audit.md
new file mode 100644
index 00000000..61fc5024
--- /dev/null
+++ b/docs/_generated/relates-to-audit.md
@@ -0,0 +1,149 @@
+---
+id: docs.generated.relates-to-audit
+title: Relates-To Audit
+doc_type: generated
+status: active
+summary: Strukturelle Beobachtung der relates_to-Nutzung — Typen, Cluster, Beispiele.
+---
+
+## Weltgewebe Relates-To Audit
+
+Generated automatically. Do not edit.
+
+### Zusammenfassung
+
+| Metrik | Wert |
+| --- | --- |
+| Relationen gesamt | 140 |
+| — relates_to | 139 |
+| — supersedes | 1 |
+| relates_to Anteil | 99% |
+
+### Mögliche supersedes-Lücken
+
+> Dokument-Paare mit namensähnlichen Mustern, die möglicherweise eine supersedes-Relation benötigen.
+
+_Keine Lücken erkannt._
+
+### Cluster-Analyse (relates_to)
+
+> Zusammenhängende Gruppen im relates_to-Graphen.
+
+**Cluster 1** (30 Dokumente):
+
+- `docs/adr/ADR-0002__reentry-kriterien.md`
+- `docs/adr/ADR-0004__fahrplan-verweis.md`
+- `docs/blueprints/versionierungs-blaupause.md`
+- `docs/blueprints/versionierungs-statusgrundlage.md`
+- `docs/blueprints/weltgewebe.config.diff.md`
+- `docs/blueprints/weltgewebe.deploy.plan.md`
+- `docs/deploy/CHANGELOG.md`
+- `docs/deploy/DRIFT_POLICY.md`
+- `docs/deploy/README.md`
+- `docs/deploy/heim-first-phase0.md`
+- `docs/deploy/heimserver.deployment.md`
+- `docs/deploy/heimserver.integration.md`
+- `docs/deploy/security.md`
+- `docs/deploy/vps.md`
+- `docs/deploy/weltgewebe.naming.md`
+- `docs/deployment.md`
+- `docs/deployment_governance.md`
+- `docs/dev/codespaces.md`
+- `docs/edge/systemd/README.md`
+- `docs/process/README.md`
+- `docs/process/bash-tooling-guidelines.md`
+- `docs/process/fahrplan.md`
+- `docs/process/sprache.md`
+- `docs/quickstart-gate-c.md`
+- `docs/runbook.md`
+- `docs/runbook.observability.md`
+- `docs/runbooks/README.md`
+- `docs/runbooks/codespaces-recovery.md`
+- `docs/runbooks/ops.runbook.weltgewebe-selfhost-deploy.md`
+- `docs/runbooks/uv-tooling.md`
+
+**Cluster 2** (17 Dokumente):
+
+- `docs/adr/0043-edge-vs-conversation.md`
+- `docs/adr/ADR-0001__clean-slate-docs-monorepo.md`
+- `docs/architekturstruktur.md`
+- `docs/datenmodell.md`
+- `docs/domain/modules.md`
+- `docs/domain/vocabulary.md`
+- `docs/geist-und-plan.md`
+- `docs/inhalt.md`
+- `docs/overview/inhalt.md`
+- `docs/overview/zusammenstellung.md`
+- `docs/policies/orientierung.md`
+- `docs/reference/glossar.md`
+- `docs/specs/contract.md`
+- `docs/techstack.md`
+- `docs/vision.md`
+- `docs/weltgewebe-agenten-manifest.md`
+- `docs/zusammenstellung.md`
+
+**Cluster 3** (12 Dokumente):
+
+- `docs/adr/ADR-0005-auth.md`
+- `docs/adr/ADR-0006__auth-magic-link-session-passkey.md`
+- `docs/blueprints/auth-roadmap.md`
+- `docs/blueprints/ui-blaupause.md`
+- `docs/blueprints/ui-roadmap.md`
+- `docs/blueprints/ui-state-machine.md`
+- `docs/blueprints/weltgewebe.auth-and-ui-routing.md`
+- `docs/reports/auth-status-matrix.md`
+- `docs/specs/auth-api.md`
+- `docs/specs/auth-blueprint.md`
+- `docs/specs/auth-state-machine.md`
+- `docs/specs/auth-ui.md`
+
+**Cluster 4** (5 Dokumente):
+
+- `docs/adr/ADR-0003__privacy-ungenauigkeitsradius-ron.md`
+- `docs/konzepte/garnrolle-und-verortung.md`
+- `docs/konzepte/garnrolle.md`
+- `docs/specs/privacy-api.md`
+- `docs/specs/privacy-ui.md`
+
+**Cluster 5** (3 Dokumente):
+
+- `docs/adr/0042-consume-semantah-contracts.md`
+- `docs/x-repo/peers-learnings.md`
+- `docs/x-repo/semantAH.md`
+
+**Cluster 6** (2 Dokumente):
+
+- `docs/blueprints/map-blaupause.md`
+- `docs/blueprints/map-roadmap.md`
+
+### Konkrete Beispiele zur Prüfung
+
+> Dokumente mit den meisten relates_to-Zielen und ihren konkreten Relationen.
+
+**`docs/deploy/README.md`**:
+
+- relates_to → `docs/deploy/heimserver.deployment.md`
+- relates_to → `docs/deploy/heimserver.integration.md`
+- relates_to → `docs/deploy/security.md`
+- relates_to → `docs/deployment.md`
+- relates_to → `docs/deployment_governance.md`
+
+**`docs/adr/ADR-0006__auth-magic-link-session-passkey.md`**:
+
+- relates_to → `docs/adr/ADR-0005-auth.md`
+- relates_to → `docs/blueprints/auth-roadmap.md`
+- relates_to → `docs/reports/auth-status-matrix.md`
+- relates_to → `docs/specs/auth-blueprint.md`
+
+**`docs/deployment.md`**:
+
+- relates_to → `docs/deploy/README.md`
+- relates_to → `docs/deploy/security.md`
+- relates_to → `docs/deployment_governance.md`
+- relates_to → `docs/runbook.md`
+
+### Hinweise
+
+- Alle Ergebnisse dienen der strukturellen Sichtbarmachung.
+- `relates_to` ist kein Fehler — die Verteilung zeigt den aktuellen Stand.
+- Keine automatischen Korrekturen werden vorgenommen.
diff --git a/docs/_generated/relations-analysis.md b/docs/_generated/relations-analysis.md
new file mode 100644
index 00000000..2a4ab483
--- /dev/null
+++ b/docs/_generated/relations-analysis.md
@@ -0,0 +1,49 @@
+---
+id: docs.generated.relations-analysis
+title: Relations Analysis
+doc_type: generated
+status: active
+summary: Automatische Analyse des Relationsgraphen — Zyklen, Hubs, Isolation, Verteilung.
+---
+
+## Weltgewebe Relations Analysis
+
+Generated automatically. Do not edit.
+
+### Übersicht
+
+| Metrik | Wert |
+| --- | --- |
+| Dokumente gesamt | 71 |
+| Dokumente mit ausgehenden Relationen | 69 |
+| Dokumente als Ziel referenziert | 53 |
+| Relationen gesamt | 140 |
+| — relates_to | 139 |
+| — supersedes | 1 |
+| Isolierte Dokumente | 1 |
+| depends_on Zyklen | 0 |
+
+### Warnungen
+
+> Heuristische Hinweise — keine CI-Fehler. Zyklen deuten auf zirkuläre Abhängigkeiten, hohe Vernetzung auf zentrale Dokumente, die bei Änderungen besondere Aufmerksamkeit erfordern.
+
+- ⚠️ High inbound count (13): `docs/deploy/README.md` — central dependency, review carefully
+- ⚠️ High inbound count (11): `docs/deployment.md` — central dependency, review carefully
+
+### Zyklen (depends_on)
+
+_Keine Zyklen gefunden._
+
+### Hubs (hohe Vernetzung)
+
+**Eingehend (inbound):**
+
+- `docs/deploy/README.md` — 13 eingehende Relationen
+- `docs/deployment.md` — 11 eingehende Relationen
+
+### Isolierte Dokumente
+
+> Dokumente ohne eingehende und ausgehende Relationen (index.md/README.md ausgenommen).
+
+- `docs/reports/cost-report.md`
+
diff --git a/docs/_generated/staleness-report.md b/docs/_generated/staleness-report.md
index b51036b0..2ab75efc 100644
--- a/docs/_generated/staleness-report.md
+++ b/docs/_generated/staleness-report.md
@@ -3,7 +3,6 @@ id: docs.generated.staleness-report
 title: Staleness Report
 doc_type: generated
 status: active
-canonicality: derived
 summary: Markiert veraltete oder abgelöste Dokumente.
 ---
 
diff --git a/docs/_generated/supersession-map.md b/docs/_generated/supersession-map.md
index 70087841..6fd9c591 100644
--- a/docs/_generated/supersession-map.md
+++ b/docs/_generated/supersession-map.md
@@ -3,7 +3,6 @@ id: docs.generated.supersession-map
 title: Supersession Map
 doc_type: generated
 status: active
-canonicality: derived
 summary: Automatisch generierte Karte der abgelösten Dokumente.
 ---
 
@@ -11,4 +10,4 @@ summary: Automatisch generierte Karte der abgelösten Dokumente.
 
 Generated automatically. Do not edit.
 
-_No supersession relations found._
+- docs/konzepte/garnrolle.md → superseded by → docs/konzepte/garnrolle-und-verortung.md
diff --git a/docs/_generated/system-map.md b/docs/_generated/system-map.md
index f719b2c5..e9aede8e 100644
--- a/docs/_generated/system-map.md
+++ b/docs/_generated/system-map.md
@@ -3,7 +3,6 @@ id: docs.generated.system-map
 title: System Map
 doc_type: generated
 status: active
-canonicality: derived
 summary: Automatisch generierte System Map.
 ---
 ## Weltgewebe System Map
@@ -17,7 +16,7 @@ Source: scripts/docmeta/generate_system_map.py
 |id|path|role|organ|status|last_reviewed|depends_on|verifies_with|freshness_status|missing_scripts|
 |---|---|---|---|---|---|---|---|---|---|
 |blueprint.docmeta-engine|architecture/blueprint.docmeta-engine.md|norm|governance|canonical|2026-03-03|||pass||
-|docmeta.schema|architecture/docmeta.schema.md|norm|docmeta|canonical|2026-03-02||scripts/docmeta/check_doc_review_age.py, scripts/docmeta/check_repo_index_consistency.py, scripts/docmeta/generate_system_map.py|pass||
+|docmeta.schema|architecture/docmeta.schema.md|norm|docmeta|canonical|2026-03-02||scripts/docmeta/check_doc_review_age.py, scripts/docmeta/check_repo_index_consistency.py, scripts/docmeta/generate_system_map.py, scripts/docmeta/validate_relations.py|pass||
 |overview|architecture/overview.md|norm|governance|canonical|2026-02-28|||pass||
 |security|architecture/security.md|norm|governance|canonical|2026-02-28|||pass||
 
diff --git a/docs/adr/0042-consume-semantah-contracts.md b/docs/adr/0042-consume-semantah-contracts.md
index 839906a3..5da30d15 100644
--- a/docs/adr/0042-consume-semantah-contracts.md
+++ b/docs/adr/0042-consume-semantah-contracts.md
@@ -1,10 +1,12 @@
 ---
 id: adr.0042-consume-semantah-contracts
-title: 0042 Consume Semantah Contracts
+title: ADR-0042 — SemanticAH-Contracts konsumieren
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Entscheidung zur Integration und zum Konsum von SemanticAH-Contracts.
+relations:
+  - type: relates_to
+    target: docs/x-repo/semantAH.md
 ---
 # ADR-0042: semantAH-Contracts konsumieren
 
diff --git a/docs/adr/0043-edge-vs-conversation.md b/docs/adr/0043-edge-vs-conversation.md
index f516ffd5..9aa5d314 100644
--- a/docs/adr/0043-edge-vs-conversation.md
+++ b/docs/adr/0043-edge-vs-conversation.md
@@ -1,10 +1,14 @@
 ---
 id: adr.0043-edge-vs-conversation
-title: 0043 Edge Vs Conversation
+title: ADR-0043 — Edge vs. Conversation
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Entscheidung zur Abgrenzung von Edge- und Conversation-Entitäten im Domänenmodell.
+relations:
+  - type: relates_to
+    target: docs/domain/vocabulary.md
+  - type: relates_to
+    target: docs/datenmodell.md
 ---
 # ADR 0043: Begriffsvereinheitlichung edge vs conversation
 
diff --git a/docs/adr/ADR-0001__clean-slate-docs-monorepo.md b/docs/adr/ADR-0001__clean-slate-docs-monorepo.md
index 2d612ca2..b57c4352 100644
--- a/docs/adr/ADR-0001__clean-slate-docs-monorepo.md
+++ b/docs/adr/ADR-0001__clean-slate-docs-monorepo.md
@@ -1,10 +1,12 @@
 ---
 id: adr.ADR-0001__clean-slate-docs-monorepo
-title: Adr 0001__Clean Slate Docs Monorepo
+title: ADR-0001 — Clean Slate und Docs-Monorepo
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Entscheidung für Clean-Slate-Ansatz und Docs-Monorepo-Struktur.
+relations:
+  - type: relates_to
+    target: docs/architekturstruktur.md
 ---
 # ADR-0001 — Clean-Slate als Docs-Monorepo
 
diff --git a/docs/adr/ADR-0002__reentry-kriterien.md b/docs/adr/ADR-0002__reentry-kriterien.md
index bdb53ec0..9cb5e9b0 100644
--- a/docs/adr/ADR-0002__reentry-kriterien.md
+++ b/docs/adr/ADR-0002__reentry-kriterien.md
@@ -1,10 +1,12 @@
 ---
 id: adr.ADR-0002__reentry-kriterien
-title: Adr 0002__Reentry Kriterien
+title: ADR-0002 — Reentry-Kriterien
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Entscheidung zu Reentry-Kriterien für das Projekt.
+relations:
+  - type: relates_to
+    target: docs/process/fahrplan.md
 ---
 # ADR-0002 — Re-Entry-Kriterien (Gates)
 
diff --git a/docs/adr/ADR-0003__privacy-ungenauigkeitsradius-ron.md b/docs/adr/ADR-0003__privacy-ungenauigkeitsradius-ron.md
index b80b6bb0..41406fdc 100644
--- a/docs/adr/ADR-0003__privacy-ungenauigkeitsradius-ron.md
+++ b/docs/adr/ADR-0003__privacy-ungenauigkeitsradius-ron.md
@@ -1,10 +1,12 @@
 ---
 id: adr.ADR-0003__privacy-ungenauigkeitsradius-ron
-title: Adr 0003__Privacy Ungenauigkeitsradius Ron
+title: ADR-0003 — Privacy-Ungenauigkeitsradius und RoN
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Entscheidung zum Privacy-Konzept mit Ungenauigkeitsradius und Rolle ohne Namen (RoN).
+relations:
+  - type: relates_to
+    target: docs/konzepte/garnrolle-und-verortung.md
 ---
 # ADR-0003 — Privacy: Ungenauigkeitsradius & RoN-Identitätsmodus (v2)
 
diff --git a/docs/adr/ADR-0004__fahrplan-verweis.md b/docs/adr/ADR-0004__fahrplan-verweis.md
index 5683e703..05f9769b 100644
--- a/docs/adr/ADR-0004__fahrplan-verweis.md
+++ b/docs/adr/ADR-0004__fahrplan-verweis.md
@@ -1,10 +1,12 @@
 ---
 id: adr.ADR-0004__fahrplan-verweis
-title: Adr 0004__Fahrplan Verweis
+title: ADR-0004 — Fahrplan-Verweis
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Entscheidung zur Verknüpfung des Fahrplans mit der Architekturplanung.
+relations:
+  - type: relates_to
+    target: docs/process/fahrplan.md
 ---
 # ADR-0004 — Fahrplan als kanonischer Verweis
 
diff --git a/docs/adr/ADR-0005-auth.md b/docs/adr/ADR-0005-auth.md
index 4b2af9d0..3bfa0b7b 100644
--- a/docs/adr/ADR-0005-auth.md
+++ b/docs/adr/ADR-0005-auth.md
@@ -1,10 +1,12 @@
 ---
 id: adr.ADR-0005-auth
-title: Adr 0005 Auth
+title: ADR-0005 — Auth (Cookie-basierte Sessions)
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Vorangegangene Auth-Entscheidung zu cookie-basierten Sessions und Rollen.
+relations:
+  - type: relates_to
+    target: docs/adr/ADR-0006__auth-magic-link-session-passkey.md
 ---
 # ADR-0005: Minimales Authentifizierungskonzept (Historisches Fundament)
 
diff --git a/docs/adr/ADR-0006__auth-magic-link-session-passkey.md b/docs/adr/ADR-0006__auth-magic-link-session-passkey.md
index 6ea6da82..88aaed7e 100644
--- a/docs/adr/ADR-0006__auth-magic-link-session-passkey.md
+++ b/docs/adr/ADR-0006__auth-magic-link-session-passkey.md
@@ -3,8 +3,16 @@ id: adr.ADR-0006-auth-magic-link-session-passkey
 title: ADR-0006 — Auth: Magic Link, Session und optionaler Passkey
 doc_type: reference
 status: active
-canonicality: canonical
 summary: Beschreibt das kanonische Auth-Modell aus Magic Link, persistenter Session, optionalem Passkey und Step-up Auth.
+relations:
+  - type: relates_to
+    target: docs/blueprints/auth-roadmap.md
+  - type: relates_to
+    target: docs/reports/auth-status-matrix.md
+  - type: relates_to
+    target: docs/specs/auth-blueprint.md
+  - type: relates_to
+    target: docs/adr/ADR-0005-auth.md
 ---
 
 # ADR-0006 — Auth: Magic Link + Session + optionaler Passkey
diff --git a/docs/architekturstruktur.md b/docs/architekturstruktur.md
index b88e4f30..c716fc52 100644
--- a/docs/architekturstruktur.md
+++ b/docs/architekturstruktur.md
@@ -3,9 +3,15 @@ id: docs.architecture.overview
 title: Architekturüberblick
 doc_type: architecture
 status: active
-canonicality: canonical
 summary: >
   Kurzbeschreibung der Architektur und Struktur.
+relations:
+  - type: relates_to
+    target: docs/techstack.md
+  - type: relates_to
+    target: docs/datenmodell.md
+  - type: relates_to
+    target: docs/vision.md
 ---
 # Architektur & Struktur
 
diff --git a/docs/blueprints/auth-roadmap.md b/docs/blueprints/auth-roadmap.md
index 03d0a502..aa745dba 100644
--- a/docs/blueprints/auth-roadmap.md
+++ b/docs/blueprints/auth-roadmap.md
@@ -3,10 +3,16 @@ id: blueprints.auth-roadmap
 title: Auth Roadmap
 doc_type: roadmap
 status: active
-canonicality: canonical
 summary: >
   Exekutive Roadmap zur schrittweisen Kanonisierung, Verifikation und
   Vollendung der Auth-Architektur im Weltgewebe.
+relations:
+  - type: relates_to
+    target: docs/adr/ADR-0006__auth-magic-link-session-passkey.md
+  - type: relates_to
+    target: docs/reports/auth-status-matrix.md
+  - type: relates_to
+    target: docs/specs/auth-blueprint.md
 ---
 
 # Auth Roadmap – Weltgewebe
diff --git a/docs/blueprints/map-blaupause.md b/docs/blueprints/map-blaupause.md
index 604c88b0..ba80602a 100644
--- a/docs/blueprints/map-blaupause.md
+++ b/docs/blueprints/map-blaupause.md
@@ -3,11 +3,13 @@ id: map-blaupause
 title: Basemap-Architektur-Blaupause
 doc_type: blueprint
 status: draft
-canonicality: canonical
 summary: >
   Architektur-Blaupause für einen souveränen Basemap-Stack basierend auf
   MapLibre, PMTiles und einer reproduzierbaren Tile-Generierungs-Pipeline
   für Weltgewebe-Overlays.
+relations:
+  - type: relates_to
+    target: docs/blueprints/map-roadmap.md
 ---
 
 # Basemap-Architektur-Blaupause
diff --git a/docs/blueprints/map-roadmap.md b/docs/blueprints/map-roadmap.md
index 0f9624dc..6d41304e 100644
--- a/docs/blueprints/map-roadmap.md
+++ b/docs/blueprints/map-roadmap.md
@@ -3,9 +3,11 @@ id: map-roadmap
 title: Basemap-Umsetzungsroadmap
 doc_type: roadmap
 status: draft
-canonicality: canonical
 summary: >
   Roadmap zur schrittweisen operativen Umsetzung der souveränen Basemap-Architektur.
+relations:
+  - type: relates_to
+    target: docs/blueprints/map-blaupause.md
 ---
 
 # Basemap-Umsetzungsroadmap
diff --git a/docs/blueprints/ui-blaupause.md b/docs/blueprints/ui-blaupause.md
index 1f4c800a..410f956d 100644
--- a/docs/blueprints/ui-blaupause.md
+++ b/docs/blueprints/ui-blaupause.md
@@ -3,11 +3,12 @@ id: ui-blaupause
 title: Weltgewebe UI-Blaupause
 doc_type: blueprint
 status: canonical
-canonicality: This document is the canonical source of truth for the UI architecture.
 summary: Defines the core principles, layout, and interaction model for the Weltgewebe mobile-first UI.
-related_docs:
-  - docs/blueprints/ui-state-machine.md
-  - docs/blueprints/ui-roadmap.md
+relations:
+  - type: relates_to
+    target: docs/blueprints/ui-state-machine.md
+  - type: relates_to
+    target: docs/blueprints/ui-roadmap.md
 ---
 
 # Weltgewebe – UI-Blaupause
diff --git a/docs/blueprints/ui-roadmap.md b/docs/blueprints/ui-roadmap.md
index efbe21a7..df181e2f 100644
--- a/docs/blueprints/ui-roadmap.md
+++ b/docs/blueprints/ui-roadmap.md
@@ -3,8 +3,12 @@ id: ui-roadmap
 title: Weltgewebe UI Roadmap
 doc_type: blueprint
 status: canonical
-canonicality: This document is the canonical source of truth for the UI implementation roadmap.
 summary: Konkrete Priorisierung und Meilensteinplanung für den Ausbau der Weltgewebe UI.
+relations:
+  - type: relates_to
+    target: docs/blueprints/ui-blaupause.md
+  - type: relates_to
+    target: docs/blueprints/ui-state-machine.md
 ---
 
 # Weltgewebe UI Roadmap
diff --git a/docs/blueprints/ui-state-machine.md b/docs/blueprints/ui-state-machine.md
index 7c4b4c7f..c025a31e 100644
--- a/docs/blueprints/ui-state-machine.md
+++ b/docs/blueprints/ui-state-machine.md
@@ -3,8 +3,12 @@ id: ui-state-machine
 title: Weltgewebe UI State Machine
 doc_type: blueprint
 status: canonical
-canonicality: "state-machine-contract"
 summary: Kanonische Zustandsmaschine der Weltgewebe-UI und verbindliche Implementierungsregeln.
+relations:
+  - type: relates_to
+    target: docs/blueprints/ui-blaupause.md
+  - type: relates_to
+    target: docs/blueprints/ui-roadmap.md
 ---
 
 # Weltgewebe UI State Machine
diff --git a/docs/blueprints/versionierungs-blaupause.md b/docs/blueprints/versionierungs-blaupause.md
index 6ee0eee3..0993c2de 100644
--- a/docs/blueprints/versionierungs-blaupause.md
+++ b/docs/blueprints/versionierungs-blaupause.md
@@ -3,8 +3,12 @@ id: versionierungs-blaupause
 title: "Weltgewebe Deploy-Versionierung und Browser-Aktualität"
 doc_type: blueprint
 status: draft
-canonicality: normative
 summary: "Blaupause für eine saubere, beobachtbare Deploy-Identität, die konsistent von Build bis zur UI-Diagnose bleibt."
+relations:
+  - type: relates_to
+    target: docs/blueprints/versionierungs-statusgrundlage.md
+  - type: relates_to
+    target: docs/deployment.md
 ---
 
 # Weltgewebe Deploy-Versionierung und Browser-Aktualität
diff --git a/docs/blueprints/versionierungs-statusgrundlage.md b/docs/blueprints/versionierungs-statusgrundlage.md
index e97b968e..71f8d343 100644
--- a/docs/blueprints/versionierungs-statusgrundlage.md
+++ b/docs/blueprints/versionierungs-statusgrundlage.md
@@ -3,8 +3,10 @@ id: versionierungs-statusgrundlage
 title: "Weltgewebe – Versionierungs-Statusgrundlage"
 doc_type: blueprint
 status: active
-canonicality: normative
 summary: "Belastbare Arbeitsgrundlage und Ist-Stand-Dokumentation für alle Folgeschritte zur Weltgewebe-Versionierung."
+relations:
+  - type: relates_to
+    target: docs/blueprints/versionierungs-blaupause.md
 ---
 
 # Weltgewebe – Versionierungs-Statusgrundlage
diff --git a/docs/blueprints/weltgewebe.auth-and-ui-routing.md b/docs/blueprints/weltgewebe.auth-and-ui-routing.md
index 9e0254c7..dbaf2b97 100644
--- a/docs/blueprints/weltgewebe.auth-and-ui-routing.md
+++ b/docs/blueprints/weltgewebe.auth-and-ui-routing.md
@@ -1,10 +1,14 @@
 ---
 id: blueprints.weltgewebe.auth-and-ui-routing
-title: Weltgewebe.Auth And Ui Routing
+title: Auth und UI-Routing
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Blaupause für Auth-Integration und UI-Routing im Weltgewebe.
+relations:
+  - type: relates_to
+    target: docs/adr/ADR-0006__auth-magic-link-session-passkey.md
+  - type: relates_to
+    target: docs/blueprints/ui-blaupause.md
 ---
 # Blueprint: Heim-first Auth & UI Routing
 
diff --git a/docs/blueprints/weltgewebe.config.diff.md b/docs/blueprints/weltgewebe.config.diff.md
index 359a750f..b536a31e 100644
--- a/docs/blueprints/weltgewebe.config.diff.md
+++ b/docs/blueprints/weltgewebe.config.diff.md
@@ -1,10 +1,12 @@
 ---
 id: blueprints.weltgewebe.config.diff
-title: Weltgewebe.Config.Diff
+title: Config Diff
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Vergleich und Dokumentation von Konfigurationsunterschieden.
+relations:
+  - type: relates_to
+    target: docs/deployment.md
 ---
 # Blueprint Configuration Diff
 
diff --git a/docs/blueprints/weltgewebe.deploy.plan.md b/docs/blueprints/weltgewebe.deploy.plan.md
index b6146d7e..32fd8bef 100644
--- a/docs/blueprints/weltgewebe.deploy.plan.md
+++ b/docs/blueprints/weltgewebe.deploy.plan.md
@@ -1,10 +1,14 @@
 ---
 id: blueprints.weltgewebe.deploy.plan
-title: Weltgewebe.Deploy.Plan
+title: Deploy-Plan
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Deployment-Planungsdokument für das Weltgewebe.
+relations:
+  - type: relates_to
+    target: docs/deployment.md
+  - type: relates_to
+    target: docs/deploy/README.md
 ---
 # Migrationsplan: Heim-first Deployment (Phase 0)
 
diff --git a/docs/datenmodell.md b/docs/datenmodell.md
index f59e65d4..0c90e6cc 100644
--- a/docs/datenmodell.md
+++ b/docs/datenmodell.md
@@ -3,8 +3,14 @@ id: datenmodell
 title: Datenmodell
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Dokumentation des PostgreSQL-Datenmodells mit Kernentitäten, Beziehungen und Lese-Modellen.
+relations:
+  - type: relates_to
+    target: docs/architekturstruktur.md
+  - type: relates_to
+    target: docs/domain/vocabulary.md
+  - type: relates_to
+    target: docs/techstack.md
 ---
 # Datenmodell
 
diff --git a/docs/deploy/CHANGELOG.md b/docs/deploy/CHANGELOG.md
index ac92cd7c..f2a3be21 100644
--- a/docs/deploy/CHANGELOG.md
+++ b/docs/deploy/CHANGELOG.md
@@ -1,10 +1,12 @@
 ---
 id: deploy.CHANGELOG
-title: Changelog
+title: Deploy Changelog
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Änderungsprotokoll der Deployment-Konfiguration.
+relations:
+  - type: relates_to
+    target: docs/deploy/README.md
 ---
 # Deployment-Änderungsprotokoll
 
diff --git a/docs/deploy/DRIFT_POLICY.md b/docs/deploy/DRIFT_POLICY.md
index 7037b75e..e525023e 100644
--- a/docs/deploy/DRIFT_POLICY.md
+++ b/docs/deploy/DRIFT_POLICY.md
@@ -1,10 +1,14 @@
 ---
 id: deploy.DRIFT_POLICY
-title: Drift_Policy
+title: Drift Policy
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Richtlinie zur Erkennung und Behandlung von Deployment-Drift.
+relations:
+  - type: relates_to
+    target: docs/deploy/README.md
+  - type: relates_to
+    target: docs/deployment.md
 ---
 # Drift-Taxonomie & Guard-Policy
 
diff --git a/docs/deploy/README.md b/docs/deploy/README.md
index 0528a2b0..f827bdd4 100644
--- a/docs/deploy/README.md
+++ b/docs/deploy/README.md
@@ -1,10 +1,20 @@
 ---
 id: deploy.README
-title: Readme
+title: Deployment-Übersicht
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Kanonischer Deployment-Stand und normative Beschreibung der Laufzeitumgebung.
+relations:
+  - type: relates_to
+    target: docs/deployment.md
+  - type: relates_to
+    target: docs/deployment_governance.md
+  - type: relates_to
+    target: docs/deploy/heimserver.deployment.md
+  - type: relates_to
+    target: docs/deploy/heimserver.integration.md
+  - type: relates_to
+    target: docs/deploy/security.md
 ---
 # Weltgewebe – Deployment
 
diff --git a/docs/deploy/heim-first-phase0.md b/docs/deploy/heim-first-phase0.md
index 9bb7897d..f262f041 100644
--- a/docs/deploy/heim-first-phase0.md
+++ b/docs/deploy/heim-first-phase0.md
@@ -1,10 +1,14 @@
 ---
 id: deploy.heim-first-phase0
-title: Heim First Phase0
+title: Heim-First Phase 0
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Phase-0-Planung für den Heim-First-Deployment-Ansatz.
+relations:
+  - type: relates_to
+    target: docs/deploy/README.md
+  - type: relates_to
+    target: docs/deploy/heimserver.deployment.md
 ---
 # Heim-first UI (Phase 0) Deployment
 
diff --git a/docs/deploy/heimserver.deployment.md b/docs/deploy/heimserver.deployment.md
index a14c549a..75549eb2 100644
--- a/docs/deploy/heimserver.deployment.md
+++ b/docs/deploy/heimserver.deployment.md
@@ -1,10 +1,16 @@
 ---
 id: deploy.heimserver.deployment
-title: Heimserver.Deployment
+title: Heimserver Deployment
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Deployment-Runbook für Weltgewebe auf dem Heimserver.
+relations:
+  - type: relates_to
+    target: docs/deploy/README.md
+  - type: relates_to
+    target: docs/deploy/heimserver.integration.md
+  - type: relates_to
+    target: docs/deployment.md
 ---
 # Weltgewebe – Deployment Runbook (Heimserver)
 
diff --git a/docs/deploy/heimserver.integration.md b/docs/deploy/heimserver.integration.md
index 8b18e051..b459be4b 100644
--- a/docs/deploy/heimserver.integration.md
+++ b/docs/deploy/heimserver.integration.md
@@ -1,10 +1,16 @@
 ---
 id: deploy.heimserver.integration
-title: Heimserver.Integration
+title: Heimserver Integration
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: API-Integrationsdokumentation für das Heimserver-Deployment.
+relations:
+  - type: relates_to
+    target: docs/deploy/README.md
+  - type: relates_to
+    target: docs/deploy/heimserver.deployment.md
+  - type: relates_to
+    target: docs/deployment.md
 ---
 # Weltgewebe API – Heimserver Integration
 
diff --git a/docs/deploy/security.md b/docs/deploy/security.md
index ac50d3a9..d15a5df7 100644
--- a/docs/deploy/security.md
+++ b/docs/deploy/security.md
@@ -3,14 +3,12 @@ id: deploy.security
 title: Deploy Security
 doc_type: architecture
 status: active
-canonicality: canonical
 summary: Security configuration and CSP rules for deployment.
-role: reality
-organ: deploy
-last_reviewed: 2026-03-06
-depends_on: []
-verifies_with: []
-audit_gaps: []
+relations:
+  - type: relates_to
+    target: docs/deployment.md
+  - type: relates_to
+    target: docs/deploy/README.md
 ---
 
 ## Deploy Security
diff --git a/docs/deploy/vps.md b/docs/deploy/vps.md
index d4598657..6011945f 100644
--- a/docs/deploy/vps.md
+++ b/docs/deploy/vps.md
@@ -1,10 +1,12 @@
 ---
 id: deploy.vps
-title: Vps
+title: VPS-Deployment
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Dokumentation zum VPS-basierten Deployment.
+relations:
+  - type: relates_to
+    target: docs/deploy/README.md
 ---
 # VPS Deployment Runbook
 
diff --git a/docs/deploy/weltgewebe.naming.md b/docs/deploy/weltgewebe.naming.md
index 2b378b82..2e81ced9 100644
--- a/docs/deploy/weltgewebe.naming.md
+++ b/docs/deploy/weltgewebe.naming.md
@@ -1,10 +1,12 @@
 ---
 id: deploy.weltgewebe.naming
-title: Weltgewebe.Naming
+title: Weltgewebe Naming
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Namenskonventionen für Deployment-Artefakte und Container.
+relations:
+  - type: relates_to
+    target: docs/deploy/README.md
 ---
 # Weltgewebe Naming Policy
 
diff --git a/docs/deployment.md b/docs/deployment.md
index ef543cbf..a47417c4 100644
--- a/docs/deployment.md
+++ b/docs/deployment.md
@@ -3,9 +3,17 @@ id: deployment-contract
 title: Deployment Contract and Preflight Guard
 doc_type: guide
 status: active
-canonicality: canonical
 summary: Anleitung und Dokumentation zum Deployment.
 last_reviewed: "2026-03-05"
+relations:
+  - type: relates_to
+    target: docs/deploy/README.md
+  - type: relates_to
+    target: docs/deployment_governance.md
+  - type: relates_to
+    target: docs/deploy/security.md
+  - type: relates_to
+    target: docs/runbook.md
 ---
 
 ## Required runtime artifacts
diff --git a/docs/deployment_governance.md b/docs/deployment_governance.md
index 006ee62d..86aa84c0 100644
--- a/docs/deployment_governance.md
+++ b/docs/deployment_governance.md
@@ -1,10 +1,14 @@
 ---
 id: deployment_governance
-title: Deployment_Governance
+title: Deployment Governance
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Port-Ownership-Regeln und Health-Check-Strategie für Heimserver-Deployments.
+relations:
+  - type: relates_to
+    target: docs/deployment.md
+  - type: relates_to
+    target: docs/deploy/README.md
 ---
 # Deployment Governance: Port Ownership
 
diff --git a/docs/dev/codespaces.md b/docs/dev/codespaces.md
index f9da6ff9..a34ce301 100644
--- a/docs/dev/codespaces.md
+++ b/docs/dev/codespaces.md
@@ -3,8 +3,12 @@ id: dev.codespaces
 title: Codespaces
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Anleitung zur Entwicklung in GitHub Codespaces.
+relations:
+  - type: relates_to
+    target: docs/quickstart-gate-c.md
+  - type: relates_to
+    target: docs/runbooks/codespaces-recovery.md
 ---
 # Codespaces: Dev-Server schnell starten
 
diff --git a/docs/domain/modules.md b/docs/domain/modules.md
index c8b915ce..91f3fd54 100644
--- a/docs/domain/modules.md
+++ b/docs/domain/modules.md
@@ -1,10 +1,12 @@
 ---
 id: domain.modules
-title: Modules
+title: Modul-IDs
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Kanonische Policy für Modul-IDs im Weltgewebe (profile, forum, responsibilities).
+relations:
+  - type: relates_to
+    target: docs/domain/vocabulary.md
 ---
 # Modul-IDs im Weltgewebe
 
diff --git a/docs/domain/vocabulary.md b/docs/domain/vocabulary.md
index 24a2d530..6360226f 100644
--- a/docs/domain/vocabulary.md
+++ b/docs/domain/vocabulary.md
@@ -1,10 +1,16 @@
 ---
 id: domain.vocabulary
-title: Vocabulary
+title: Domänenvokabular
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Zuordnung von Domänenbegriffen zu technischen API-Konzepten (node, role, edge, conversation, message).
+relations:
+  - type: relates_to
+    target: docs/domain/modules.md
+  - type: relates_to
+    target: docs/datenmodell.md
+  - type: relates_to
+    target: docs/specs/contract.md
 ---
 |Domäne|Deutsch|Technik/API|Bedeutung|
 |---|---|---|---|
diff --git a/docs/edge/systemd/README.md b/docs/edge/systemd/README.md
index 1fc64351..9a312da4 100644
--- a/docs/edge/systemd/README.md
+++ b/docs/edge/systemd/README.md
@@ -1,10 +1,12 @@
 ---
 id: edge.systemd.README
-title: Readme
+title: Edge Systemd
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Systemd-Konfiguration für den Edge-Gateway-Dienst.
+relations:
+  - type: relates_to
+    target: docs/deploy/README.md
 ---
 # Edge systemd units (optional)
 
diff --git a/docs/geist-und-plan.md b/docs/geist-und-plan.md
index aeb3a674..67538fb9 100644
--- a/docs/geist-und-plan.md
+++ b/docs/geist-und-plan.md
@@ -1,10 +1,14 @@
 ---
 id: geist-und-plan
-title: Geist Und Plan
+title: Geist und Plan
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Philosophie-Extraktion und Planaufschlüsselung für das Weltgewebe-Projekt.
+relations:
+  - type: relates_to
+    target: docs/vision.md
+  - type: relates_to
+    target: docs/inhalt.md
 ---
 Hier ist eine (meinerseits strukturierte) Analyse und Extraktion des „Geistes und Plans“ der
 Weltweberei basierend auf der Website weltweberei.org.
diff --git a/docs/index.md b/docs/index.md
index 4191920f..5dfa790e 100644
--- a/docs/index.md
+++ b/docs/index.md
@@ -3,7 +3,6 @@ id: docs.index
 title: Weltgewebe - Doku-Index
 doc_type: index
 status: active
-canonicality: canonical
 summary: >
   Kanonischer Doku-Index für das Projekt Weltgewebe.
 ---
@@ -22,6 +21,14 @@ Kanonische Navigation. Neue UI-Dokumente bestehenden Kategorien zuordnen.
 – **Vertrauen & Garnrolle:** [konzepte/garnrolle-und-verortung.md](konzepte/garnrolle-und-verortung.md)
 – **UI State Machine:** [blueprints/ui-state-machine.md](blueprints/ui-state-machine.md)
 – **Techstack:** [techstack.md](techstack.md)
+– **Datenmodell:** [datenmodell.md](datenmodell.md)
+– **Vision:** [vision.md](vision.md)
+
+### Domäne
+
+– **Vokabular:** [domain/vocabulary.md](domain/vocabulary.md)
+– **Module:** [domain/modules.md](domain/modules.md)
+– **Datenvertrag:** [specs/contract.md](specs/contract.md)
 
 ### UI-System
 
@@ -29,22 +36,53 @@ Kanonische Navigation. Neue UI-Dokumente bestehenden Kategorien zuordnen.
 – **UI State Machine:** [blueprints/ui-state-machine.md](blueprints/ui-state-machine.md) (Regelwerk)
 – **UI Roadmap:** [blueprints/ui-roadmap.md](blueprints/ui-roadmap.md) (Planung)
 
+### Karten-Architektur
+
+– **Basemap-Blaupause:** [blueprints/map-blaupause.md](blueprints/map-blaupause.md) (Architektur)
+– **Basemap-Roadmap:** [blueprints/map-roadmap.md](blueprints/map-roadmap.md) (Umsetzung)
+
 ### Auth-Architektur (Kanonisch)
 
 – **ADR-0006:** [adr/ADR-0006__auth-magic-link-session-passkey.md](adr/ADR-0006__auth-magic-link-session-passkey.md) (Führendes Zielbild)
 – **Auth Roadmap:** [blueprints/auth-roadmap.md](blueprints/auth-roadmap.md) (Umsetzungspfad)
 – **Auth Status Matrix:** [reports/auth-status-matrix.md](reports/auth-status-matrix.md) (Aktueller Repo-Beweis)
+– **Auth Specs:** [specs/auth-api.md](specs/auth-api.md), [specs/auth-ui.md](specs/auth-ui.md), [specs/auth-state-machine.md](specs/auth-state-machine.md)
+
+### Deployment & Betrieb
+
+– **Deployment Contract:** [deployment.md](deployment.md)
+– **Deployment Governance:** [deployment_governance.md](deployment_governance.md)
+– **Deploy-Übersicht:** [deploy/README.md](deploy/README.md)
+– **Security:** [deploy/security.md](deploy/security.md)
+– **Heimserver:** [deploy/heimserver.deployment.md](deploy/heimserver.deployment.md), [deploy/heimserver.integration.md](deploy/heimserver.integration.md)
+– **Runbook:** [runbook.md](runbook.md)
+– **Observability:** [runbook.observability.md](runbook.observability.md)
 
 ### Prozess
 
-– **Prozess & Fahrplan:** [process/README.md](process/README.md)
+– **Prozess & Fahrplan:** [process/README.md](process/README.md), [process/fahrplan.md](process/fahrplan.md)
 – **ADRs:** [adr/](adr/)
 – **Runbooks:** [runbooks/README.md](runbooks/README.md)
 – **Glossar:** [reference/glossar.md](reference/glossar.md)
+– **Sprache:** [process/sprache.md](process/sprache.md)
+– **Bash-Richtlinien:** [process/bash-tooling-guidelines.md](process/bash-tooling-guidelines.md)
 – **Inhalt/Story:** [inhalt.md](inhalt.md), [zusammenstellung.md](zusammenstellung.md)
-– **X-Repo Learnings:** [x-repo/peers-learnings.md](x-repo/peers-learnings.md)
+– **Vision & Geist:** [geist-und-plan.md](geist-und-plan.md)
+– **X-Repo Learnings:** [x-repo/peers-learnings.md](x-repo/peers-learnings.md), [x-repo/semantAH.md](x-repo/semantAH.md)
 – **Beitragen:** [../CONTRIBUTING.md](../CONTRIBUTING.md)
 
+### Policies & Orientierung
+
+– **Orientierung:** [policies/orientierung.md](policies/orientierung.md)
+– **Agenten-Manifest:** [weltgewebe-agenten-manifest.md](weltgewebe-agenten-manifest.md)
+– **Privacy:** [specs/privacy-api.md](specs/privacy-api.md), [specs/privacy-ui.md](specs/privacy-ui.md)
+
+### Entwicklung
+
+– **Quickstart Gate C:** [quickstart-gate-c.md](quickstart-gate-c.md)
+– **Codespaces:** [dev/codespaces.md](dev/codespaces.md)
+– **Codespaces Recovery:** [runbooks/codespaces-recovery.md](runbooks/codespaces-recovery.md)
+
 ## Generated Knowledge Maps
 
 - [Doc Index](_generated/doc-index.md)
diff --git a/docs/inhalt.md b/docs/inhalt.md
index fae0c89c..0a67ef2d 100644
--- a/docs/inhalt.md
+++ b/docs/inhalt.md
@@ -3,8 +3,12 @@ id: inhalt
 title: Inhalt
 doc_type: reference
 status: active
-canonicality: canonical
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Konzeptuelle Beschreibung des Weltgewebe – Funktionsweise, UI, Organisation.
+relations:
+  - type: relates_to
+    target: docs/vision.md
+  - type: relates_to
+    target: docs/zusammenstellung.md
 ---
 # Inhalt (MANDATORISCH)
 
diff --git a/docs/konzepte/garnrolle-und-verortung.md b/docs/konzepte/garnrolle-und-verortung.md
index dd44c61d..7f32a4e9 100644
--- a/docs/konzepte/garnrolle-und-verortung.md
+++ b/docs/konzepte/garnrolle-und-verortung.md
@@ -3,8 +3,14 @@ id: konzepte.garnrolle-und-verortung
 title: "Weltgewebe – Garnrolle, Verortung und Rolle ohne Namen"
 doc_type: concept
 status: active
-canonicality: canonical
 summary: "Kanonisches Konzept für Garnrolle, Verortung, Ungenauigkeitsradius und Rolle ohne Namen bei der Accounterstellung im Weltgewebe."
+relations:
+  - type: relates_to
+    target: docs/adr/ADR-0003__privacy-ungenauigkeitsradius-ron.md
+  - type: relates_to
+    target: docs/konzepte/garnrolle.md
+  - type: supersedes
+    target: docs/konzepte/garnrolle.md
 ---
 
 # Weltgewebe – Garnrolle, Verortung und Rolle ohne Namen
diff --git a/docs/konzepte/garnrolle.md b/docs/konzepte/garnrolle.md
index 1bccea36..73a13cb2 100644
--- a/docs/konzepte/garnrolle.md
+++ b/docs/konzepte/garnrolle.md
@@ -3,8 +3,10 @@ id: konzepte.garnrolle
 title: Garnrolle
 doc_type: reference
 status: deprecated
-canonicality: derived
 summary: Veraltetes Dokument. Bitte docs/konzepte/garnrolle-und-verortung.md nutzen.
+relations:
+  - type: relates_to
+    target: docs/konzepte/garnrolle-und-verortung.md
 ---
 # Garnrolle (Veraltet)
 
diff --git a/docs/overview/inhalt.md b/docs/overview/inhalt.md
index 3e742c29..b0a5fc4b 100644
--- a/docs/overview/inhalt.md
+++ b/docs/overview/inhalt.md
@@ -1,10 +1,14 @@
 ---
 id: overview.inhalt
-title: Inhalt
+title: Inhalt (Übersicht)
 doc_type: reference
 status: active
-canonicality: canonical
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Überblicksdarstellung des Weltgewebe-Inhalts und der Projektstruktur.
+relations:
+  - type: relates_to
+    target: docs/inhalt.md
+  - type: relates_to
+    target: docs/vision.md
 ---
 # Einführung: Ethik- & UX-First-Startpunkt
 
diff --git a/docs/overview/zusammenstellung.md b/docs/overview/zusammenstellung.md
index ca721fd3..297d8ef9 100644
--- a/docs/overview/zusammenstellung.md
+++ b/docs/overview/zusammenstellung.md
@@ -1,10 +1,14 @@
 ---
 id: overview.zusammenstellung
-title: Zusammenstellung
+title: Zusammenstellung (Übersicht)
 doc_type: reference
 status: active
-canonicality: canonical
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Systematische Zusammenfassung aus der Übersichtsperspektive.
+relations:
+  - type: relates_to
+    target: docs/zusammenstellung.md
+  - type: relates_to
+    target: docs/overview/inhalt.md
 ---
 # Systematik & Strukturüberblick
 
diff --git a/docs/policies/orientierung.md b/docs/policies/orientierung.md
index 347f4a1f..e9cbd1c2 100644
--- a/docs/policies/orientierung.md
+++ b/docs/policies/orientierung.md
@@ -3,8 +3,12 @@ id: policies.orientierung
 title: Orientierung
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Governance-Orientierung und Leitprinzipien für das Weltgewebe-Projekt.
+relations:
+  - type: relates_to
+    target: docs/vision.md
+  - type: relates_to
+    target: docs/weltgewebe-agenten-manifest.md
 ---
 # Leitfaden · Ethik & Systemdesign (Weltgewebe)
 
diff --git a/docs/process/README.md b/docs/process/README.md
index 5e3e39d9..d5e60725 100644
--- a/docs/process/README.md
+++ b/docs/process/README.md
@@ -1,10 +1,16 @@
 ---
 id: process.README
-title: Readme
+title: Prozess-Übersicht
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Übersicht über Abläufe, Konventionen und den Fahrplan des Projekts.
+relations:
+  - type: relates_to
+    target: docs/process/fahrplan.md
+  - type: relates_to
+    target: docs/process/sprache.md
+  - type: relates_to
+    target: docs/process/bash-tooling-guidelines.md
 ---
 # Prozess
 
diff --git a/docs/process/bash-tooling-guidelines.md b/docs/process/bash-tooling-guidelines.md
index 9ea4e998..9b1eef70 100644
--- a/docs/process/bash-tooling-guidelines.md
+++ b/docs/process/bash-tooling-guidelines.md
@@ -3,8 +3,10 @@ id: process.bash-tooling-guidelines
 title: Bash Tooling Guidelines
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Richtlinien für Shell-Skripting und Bash-Tooling im Projekt.
+relations:
+  - type: relates_to
+    target: docs/process/README.md
 ---
 # Bash-Tooling-Richtlinien
 
diff --git a/docs/process/fahrplan.md b/docs/process/fahrplan.md
index 27c3c132..7ecdeae0 100644
--- a/docs/process/fahrplan.md
+++ b/docs/process/fahrplan.md
@@ -3,8 +3,10 @@ id: process.fahrplan
 title: Fahrplan
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Zeitlicher Ablauf und Meilensteine des Projekts (Gates A–D).
+relations:
+  - type: relates_to
+    target: docs/process/README.md
 ---
 # Fahrplan
 
diff --git a/docs/process/sprache.md b/docs/process/sprache.md
index b7529250..33b8b776 100644
--- a/docs/process/sprache.md
+++ b/docs/process/sprache.md
@@ -3,8 +3,10 @@ id: process.sprache
 title: Sprache
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Sprachrichtlinien und Konventionen für Dokumentation und Kommunikation.
+relations:
+  - type: relates_to
+    target: docs/process/README.md
 ---
 # Sprache & Ton im Weltgewebe
 
diff --git a/docs/quickstart-gate-c.md b/docs/quickstart-gate-c.md
index f63efa58..825c76ae 100644
--- a/docs/quickstart-gate-c.md
+++ b/docs/quickstart-gate-c.md
@@ -3,8 +3,12 @@ id: quickstart-gate-c
 title: Quickstart Gate C
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Schnellstart-Anleitung für den Gate-C-Dev-Stack.
+relations:
+  - type: relates_to
+    target: docs/process/fahrplan.md
+  - type: relates_to
+    target: docs/dev/codespaces.md
 ---
 # Quickstart · Gate C (Dev-Stack)
 
diff --git a/docs/reference/glossar.md b/docs/reference/glossar.md
index 997e51a9..a2104827 100644
--- a/docs/reference/glossar.md
+++ b/docs/reference/glossar.md
@@ -3,8 +3,10 @@ id: reference.glossar
 title: Glossar
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Schnellreferenz der zentralen Begriffe im Weltgewebe-Projekt.
+relations:
+  - type: relates_to
+    target: docs/domain/vocabulary.md
 ---
 # Glossar
 
diff --git a/docs/reports/auth-status-matrix.md b/docs/reports/auth-status-matrix.md
index 234c455c..30c279ac 100644
--- a/docs/reports/auth-status-matrix.md
+++ b/docs/reports/auth-status-matrix.md
@@ -3,8 +3,12 @@ id: reports.auth-status-matrix
 title: Auth Status Matrix
 doc_type: reference
 status: active
-canonicality: canonical
 summary: Wahrheitsfilter und Statusmatrix der Auth-Architektur (Alt-/Ist-Linie vs Ziel-/Soll-Linie) zur Erkennung von Architekturdrift.
+relations:
+  - type: relates_to
+    target: docs/adr/ADR-0006__auth-magic-link-session-passkey.md
+  - type: relates_to
+    target: docs/blueprints/auth-roadmap.md
 ---
 
 # Auth Status Matrix – Weltgewebe
diff --git a/docs/reports/cost-report.md b/docs/reports/cost-report.md
index e7dde3ec..fcf3288a 100644
--- a/docs/reports/cost-report.md
+++ b/docs/reports/cost-report.md
@@ -3,8 +3,7 @@ id: reports.cost-report
 title: Cost Report
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Kostenübersicht und Ressourcenverbrauch des Projekts.
 ---
 # Cost Report 2025-10
 
diff --git a/docs/runbook.md b/docs/runbook.md
index 62fb9f6c..5a68c548 100644
--- a/docs/runbook.md
+++ b/docs/runbook.md
@@ -3,9 +3,15 @@ id: docs.runbook
 title: Runbook
 doc_type: runbook
 status: active
-canonicality: canonical
 summary: >
   Allgemeines operatives Runbook.
+relations:
+  - type: relates_to
+    target: docs/runbook.observability.md
+  - type: relates_to
+    target: docs/deployment.md
+  - type: relates_to
+    target: docs/deploy/README.md
 ---
 ## Runbook
 
diff --git a/docs/runbook.observability.md b/docs/runbook.observability.md
index 09fdfd3e..c06746cb 100644
--- a/docs/runbook.observability.md
+++ b/docs/runbook.observability.md
@@ -3,9 +3,11 @@ id: docs.runbook.observability
 title: Observability Runbook
 doc_type: runbook
 status: active
-canonicality: canonical
 summary: >
   Runbook für Systembeobachtung und Metriken.
+relations:
+  - type: relates_to
+    target: docs/runbook.md
 ---
 ## Observability – Local Profile
 
diff --git a/docs/runbooks/README.md b/docs/runbooks/README.md
index 46df89ee..6bcb0d9a 100644
--- a/docs/runbooks/README.md
+++ b/docs/runbooks/README.md
@@ -1,10 +1,18 @@
 ---
 id: runbooks.README
-title: Readme
+title: Runbooks-Übersicht
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Übersicht und Index der operativen Runbooks.
+relations:
+  - type: relates_to
+    target: docs/runbook.md
+  - type: relates_to
+    target: docs/runbooks/codespaces-recovery.md
+  - type: relates_to
+    target: docs/runbooks/ops.runbook.weltgewebe-selfhost-deploy.md
+  - type: relates_to
+    target: docs/runbooks/uv-tooling.md
 ---
 # Runbooks
 
diff --git a/docs/runbooks/codespaces-recovery.md b/docs/runbooks/codespaces-recovery.md
index a53fd5e0..314aff65 100644
--- a/docs/runbooks/codespaces-recovery.md
+++ b/docs/runbooks/codespaces-recovery.md
@@ -3,8 +3,12 @@ id: runbooks.codespaces-recovery
 title: Codespaces Recovery
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Wiederherstellungsanleitung für GitHub-Codespaces-Umgebungen.
+relations:
+  - type: relates_to
+    target: docs/runbooks/README.md
+  - type: relates_to
+    target: docs/dev/codespaces.md
 ---
 # Codespaces Recovery
 
diff --git a/docs/runbooks/ops.runbook.weltgewebe-selfhost-deploy.md b/docs/runbooks/ops.runbook.weltgewebe-selfhost-deploy.md
index 6ac4a18c..d6076434 100644
--- a/docs/runbooks/ops.runbook.weltgewebe-selfhost-deploy.md
+++ b/docs/runbooks/ops.runbook.weltgewebe-selfhost-deploy.md
@@ -1,10 +1,16 @@
 ---
 id: runbooks.ops.runbook.weltgewebe-selfhost-deploy
-title: Ops.Runbook.Weltgewebe Selfhost Deploy
+title: Selfhost-Deploy Runbook
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Operatives Runbook für Selfhost-Deployments des Weltgewebe.
+relations:
+  - type: relates_to
+    target: docs/runbooks/README.md
+  - type: relates_to
+    target: docs/deployment.md
+  - type: relates_to
+    target: docs/deploy/heimserver.deployment.md
 ---
 # Ops Runbook: Weltgewebe Self-Hosted Deployment
 
diff --git a/docs/runbooks/uv-tooling.md b/docs/runbooks/uv-tooling.md
index 0609d32d..345e4137 100644
--- a/docs/runbooks/uv-tooling.md
+++ b/docs/runbooks/uv-tooling.md
@@ -1,10 +1,12 @@
 ---
 id: runbooks.uv-tooling
-title: Uv Tooling
+title: UV-Tooling
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Anleitung zum Einsatz von uv als Python-Paketmanager.
+relations:
+  - type: relates_to
+    target: docs/runbooks/README.md
 ---
 # UV Tooling – Ist-Stand & Ausbauoptionen
 
diff --git a/docs/specs/auth-api.md b/docs/specs/auth-api.md
index ae7446fd..f7fc4ae1 100644
--- a/docs/specs/auth-api.md
+++ b/docs/specs/auth-api.md
@@ -3,8 +3,14 @@ id: specs.auth-api
 title: Auth API Spec
 doc_type: reference
 status: active
-canonicality: derived
 summary: Spezifiziert Endpunkte, Token-Typen, Geräteverwaltung, Passkeys und Step-up Auth für das Auth-System.
+relations:
+  - type: relates_to
+    target: docs/adr/ADR-0006__auth-magic-link-session-passkey.md
+  - type: relates_to
+    target: docs/specs/auth-ui.md
+  - type: relates_to
+    target: docs/specs/auth-state-machine.md
 ---
 
 # Auth API Spec
diff --git a/docs/specs/auth-blueprint.md b/docs/specs/auth-blueprint.md
index b81c65cc..8782c5ee 100644
--- a/docs/specs/auth-blueprint.md
+++ b/docs/specs/auth-blueprint.md
@@ -3,8 +3,14 @@ id: specs.auth-blueprint
 title: Auth Blueprint
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Ältere Implementierungslinie für Auth (an ADR-0005 gebunden), abgelöst durch ADR-0006.
+relations:
+  - type: relates_to
+    target: docs/adr/ADR-0006__auth-magic-link-session-passkey.md
+  - type: relates_to
+    target: docs/adr/ADR-0005-auth.md
+  - type: relates_to
+    target: docs/blueprints/auth-roadmap.md
 ---
 # Blaupause: Schrittweise Implementierung von Account- und Login-Logik im Weltgewebe
 
diff --git a/docs/specs/auth-state-machine.md b/docs/specs/auth-state-machine.md
index c72c11bf..4c22434c 100644
--- a/docs/specs/auth-state-machine.md
+++ b/docs/specs/auth-state-machine.md
@@ -3,8 +3,14 @@ id: specs.auth-state-machine
 title: Auth State Machine
 doc_type: reference
 status: active
-canonicality: canonical
 summary: Beschreibt die kanonischen Zustände und Transitionen des Weltgewebe-Auth-Systems.
+relations:
+  - type: relates_to
+    target: docs/adr/ADR-0006__auth-magic-link-session-passkey.md
+  - type: relates_to
+    target: docs/specs/auth-api.md
+  - type: relates_to
+    target: docs/specs/auth-ui.md
 ---
 
 # Auth State Machine
diff --git a/docs/specs/auth-ui.md b/docs/specs/auth-ui.md
index 7a7de5e4..20796c14 100644
--- a/docs/specs/auth-ui.md
+++ b/docs/specs/auth-ui.md
@@ -3,8 +3,14 @@ id: specs.auth-ui
 title: Auth UI Spec
 doc_type: reference
 status: active
-canonicality: derived
 summary: Beschreibt Login-, Wiederkehr-, Step-up- und Geräteverwaltungsflüsse für die Auth-UI.
+relations:
+  - type: relates_to
+    target: docs/adr/ADR-0006__auth-magic-link-session-passkey.md
+  - type: relates_to
+    target: docs/specs/auth-api.md
+  - type: relates_to
+    target: docs/specs/auth-state-machine.md
 ---
 
 # Auth UI Spec
diff --git a/docs/specs/contract.md b/docs/specs/contract.md
index e62b15ae..b75d7995 100644
--- a/docs/specs/contract.md
+++ b/docs/specs/contract.md
@@ -1,10 +1,14 @@
 ---
 id: specs.contract
-title: Contract
+title: Datenvertrag
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Spezifikation der Datenverträge zwischen Frontend und API.
+relations:
+  - type: relates_to
+    target: docs/domain/vocabulary.md
+  - type: relates_to
+    target: docs/datenmodell.md
 ---
 # Weltgewebe Contract – Löschkonzept (Tombstone & Key-Erase)
 
diff --git a/docs/specs/privacy-api.md b/docs/specs/privacy-api.md
index a2da78ed..ec700b32 100644
--- a/docs/specs/privacy-api.md
+++ b/docs/specs/privacy-api.md
@@ -1,10 +1,14 @@
 ---
 id: specs.privacy-api
-title: Privacy Api
+title: Privacy API
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: API-Spezifikation für datenschutzrelevante Endpunkte.
+relations:
+  - type: relates_to
+    target: docs/specs/privacy-ui.md
+  - type: relates_to
+    target: docs/konzepte/garnrolle-und-verortung.md
 ---
 # Privacy API (ADR-0003)
 
diff --git a/docs/specs/privacy-ui.md b/docs/specs/privacy-ui.md
index 65f4b474..731db01c 100644
--- a/docs/specs/privacy-ui.md
+++ b/docs/specs/privacy-ui.md
@@ -1,10 +1,14 @@
 ---
 id: specs.privacy-ui
-title: Privacy Ui
+title: Privacy UI
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: UI-Spezifikation für datenschutzrelevante Oberflächen und Interaktionen.
+relations:
+  - type: relates_to
+    target: docs/specs/privacy-api.md
+  - type: relates_to
+    target: docs/konzepte/garnrolle-und-verortung.md
 ---
 # Privacy UI (ADR-0003)
 
diff --git a/docs/techstack.md b/docs/techstack.md
index 398d8fc3..35f16d19 100644
--- a/docs/techstack.md
+++ b/docs/techstack.md
@@ -3,9 +3,13 @@ id: docs.techstack
 title: Techstack
 doc_type: architecture
 status: active
-canonicality: canonical
 summary: >
   Dokumentation des verwendeten Technologie-Stacks.
+relations:
+  - type: relates_to
+    target: docs/architekturstruktur.md
+  - type: relates_to
+    target: docs/datenmodell.md
 ---
 Weltgewebe Tech Stack
 
diff --git a/docs/vision.md b/docs/vision.md
index f2bcbe7d..d853f40c 100644
--- a/docs/vision.md
+++ b/docs/vision.md
@@ -3,9 +3,15 @@ id: docs.vision
 title: Vision
 doc_type: reference
 status: active
-canonicality: canonical
 summary: >
   Vision und Ziele des Projekts.
+relations:
+  - type: relates_to
+    target: docs/inhalt.md
+  - type: relates_to
+    target: docs/zusammenstellung.md
+  - type: relates_to
+    target: docs/architekturstruktur.md
 ---
 Das Weltgewebe ist als soziale, technologische und ethische Infrastruktur konzipiert – ein digitales
 Gemeinwesen, das Nachbarschaften, Engagement und demokratische Aushandlung sichtbar und nachvollziehbar macht.
diff --git a/docs/weltgewebe-agenten-manifest.md b/docs/weltgewebe-agenten-manifest.md
index b33c24fa..1a4682e1 100644
--- a/docs/weltgewebe-agenten-manifest.md
+++ b/docs/weltgewebe-agenten-manifest.md
@@ -3,8 +3,12 @@ id: weltgewebe-agenten-manifest
 title: Weltgewebe Agenten Manifest
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Manifest der Agentenprinzipien – dienend, nicht-autoritativ, ermöglichend.
+relations:
+  - type: relates_to
+    target: docs/policies/orientierung.md
+  - type: relates_to
+    target: docs/vision.md
 ---
 # Weltgewebe-Agenten-Manifest
 
diff --git a/docs/x-repo/peers-learnings.md b/docs/x-repo/peers-learnings.md
index e99b54ae..cf36cfbb 100644
--- a/docs/x-repo/peers-learnings.md
+++ b/docs/x-repo/peers-learnings.md
@@ -3,8 +3,10 @@ id: x-repo.peers-learnings
 title: Peers Learnings
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Erkenntnisse und Learnings aus verwandten Peer-Projekten.
+relations:
+  - type: relates_to
+    target: docs/x-repo/semantAH.md
 ---
 
 # Kurzfassung: Übertragbare Praktiken aus HausKI, semantAH und WGX-Profil
diff --git a/docs/x-repo/semantAH.md b/docs/x-repo/semantAH.md
index 95afee47..2c606cbb 100644
--- a/docs/x-repo/semantAH.md
+++ b/docs/x-repo/semantAH.md
@@ -1,10 +1,14 @@
 ---
 id: x-repo.semantAH
-title: Semantah
+title: SemanticAH
 doc_type: reference
 status: active
-canonicality: derived
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Integrations-Notizen und Verknüpfung mit dem SemanticAH-Ökosystem.
+relations:
+  - type: relates_to
+    target: docs/x-repo/peers-learnings.md
+  - type: relates_to
+    target: docs/adr/0042-consume-semantah-contracts.md
 ---
 Weltgewebe könnte perspektivisch semantAH-Exports konsumieren.
 Aktueller Stand: keine aktive Anbindung, keine CI-Validierung, keine Import-Jobs.
diff --git a/docs/zusammenstellung.md b/docs/zusammenstellung.md
index 37130219..5fcfb301 100644
--- a/docs/zusammenstellung.md
+++ b/docs/zusammenstellung.md
@@ -3,8 +3,14 @@ id: zusammenstellung
 title: Zusammenstellung
 doc_type: reference
 status: active
-canonicality: canonical
-summary: Automatisch hinzugefügtes Frontmatter.
+summary: Systematische Zusammenfassung von Prinzipien, Domänenmodell, Governance und UI-Architektur.
+relations:
+  - type: relates_to
+    target: docs/vision.md
+  - type: relates_to
+    target: docs/inhalt.md
+  - type: relates_to
+    target: docs/architekturstruktur.md
 ---
 # Zusammenstellung (MANDATORISCH)
 
diff --git a/runbooks/README.md b/runbooks/README.md
index 6fe78b90..30e02765 100644
--- a/runbooks/README.md
+++ b/runbooks/README.md
@@ -1,10 +1,12 @@
 ---
 id: runbooks.readme
+title: Runbooks
+summary: Operative Runbooks für Betrieb, Wartung und Fehlerbehebung.
 role: runbooks
 organ: ops
 status: canonical
 last_reviewed: 2026-02-28
-depends_on: []
+relations: []
 verifies_with: []
 ---
 
diff --git a/runtime/README.md b/runtime/README.md
index 0cdcf6fb..a9741002 100644
--- a/runtime/README.md
+++ b/runtime/README.md
@@ -1,10 +1,12 @@
 ---
 id: runtime.readme
+title: Runtime Reality
+summary: Aktueller Laufzeitzustand und beobachtetes Systemverhalten.
 role: reality
 organ: runtime
 status: canonical
 last_reviewed: 2026-02-28
-depends_on: []
+relations: []
 verifies_with: []
 ---
 
diff --git a/scripts/docmeta/check_repo_index_consistency.py b/scripts/docmeta/check_repo_index_consistency.py
index 4434127b..13edaf4a 100644
--- a/scripts/docmeta/check_repo_index_consistency.py
+++ b/scripts/docmeta/check_repo_index_consistency.py
@@ -2,7 +2,7 @@
 import sys
 import json
 
-from scripts.docmeta.docmeta import REPO_ROOT, parse_repo_index, parse_frontmatter, parse_review_policy, normalize_list_field
+from scripts.docmeta.docmeta import REPO_ROOT, parse_repo_index, parse_frontmatter, parse_review_policy, normalize_list_field, extract_depends_on
 
 def main():
     try:
@@ -68,7 +68,7 @@ def main():
             if role not in ('norm', 'reality', 'runbooks', 'action'):
                 errors.append(f"Invalid role '{role}' in '{rel_file_path}'. Must be norm|reality|runbooks|action.")
 
-            depends_on = normalize_list_field(frontmatter.get('depends_on', []))
+            depends_on = extract_depends_on(frontmatter)
             verifies_with = normalize_list_field(frontmatter.get('verifies_with', []))
 
             if doc_id:
diff --git a/scripts/docmeta/docmeta.py b/scripts/docmeta/docmeta.py
index 04e776b6..97404aba 100644
--- a/scripts/docmeta/docmeta.py
+++ b/scripts/docmeta/docmeta.py
@@ -5,7 +5,7 @@
 
 def normalize_list_field(value):
     """
-    Normalizes a frontmatter list field (like depends_on or verifies_with)
+    Normalizes a frontmatter list field (like relations or verifies_with)
     which could be a string, a stringified list, a list, or None,
     and returns a clean list of strings.
     """
@@ -18,6 +18,24 @@ def normalize_list_field(value):
         return value
     return []
 
+
+def extract_depends_on(frontmatter):
+    """
+    Extract depends_on targets from the relations array.
+    Returns a list of target strings where type == 'depends_on'.
+    For zone files with relations: [], returns [].
+    """
+    relations = frontmatter.get('relations', [])
+    if not isinstance(relations, list):
+        return []
+    deps = []
+    for entry in relations:
+        if isinstance(entry, dict) and entry.get('type') == 'depends_on':
+            target = entry.get('target', '')
+            if target:
+                deps.append(target)
+    return deps
+
 def parse_frontmatter(file_path):
     if not os.path.exists(file_path):
         return None
@@ -33,6 +51,7 @@ def parse_frontmatter(file_path):
     frontmatter_text = match.group(1)
     data = {}
     current_key = None
+    current_dict_entry = None
 
     for line in frontmatter_text.splitlines():
         # Keep original indentation to identify block lists
@@ -41,8 +60,25 @@ def parse_frontmatter(file_path):
             continue
 
         if line.startswith(' ') and stripped_line.startswith('- ') and current_key:
-            if current_key in ['depends_on', 'verifies_with', 'audit_gaps']:
-                # It's a block list item
+            if current_key == 'relations':
+                # Flush any pending dict entry
+                if current_dict_entry is not None:
+                    if isinstance(data[current_key], list):
+                        data[current_key].append(current_dict_entry)
+                    current_dict_entry = None
+
+                val = stripped_line[2:].strip()
+                if ':' in val:
+                    # Dict-style list item: "- type: relates_to"
+                    k, v = val.split(':', 1)
+                    current_dict_entry = {k.strip(): v.strip()}
+                else:
+                    # Bare list item
+                    if isinstance(data[current_key], list):
+                        data[current_key].append(val)
+                continue
+            elif current_key in ['verifies_with', 'audit_gaps']:
+                # It's a block list item (string values)
                 val = stripped_line[2:].strip()
                 # Handle quoted strings in lists
                 if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
@@ -55,9 +91,23 @@ def parse_frontmatter(file_path):
                         data[current_key] = [data[current_key], val]
                     else:
                         data[current_key] = [val]
+                continue
+
+        # Handle continuation keys within a relations dict entry
+        if (line.startswith(' ') and current_key == 'relations'
+                and current_dict_entry is not None and ':' in stripped_line
+                and not stripped_line.startswith('- ')):
+            k, v = stripped_line.split(':', 1)
+            current_dict_entry[k.strip()] = v.strip()
             continue
 
         if ':' in line:
+            # Flush pending dict entry before processing new top-level key
+            if current_dict_entry is not None and current_key == 'relations':
+                if isinstance(data.get(current_key), list):
+                    data[current_key].append(current_dict_entry)
+                current_dict_entry = None
+
             key, val = line.split(':', 1)
             key = key.strip()
             val = val.strip()
@@ -70,7 +120,7 @@ def parse_frontmatter(file_path):
                         items[i] = item[1:-1]
                 val = items
                 current_key = None # Completed inline list
-            elif val == '' and key in ['depends_on', 'verifies_with', 'audit_gaps']:
+            elif val == '' and key in ['relations', 'verifies_with', 'audit_gaps']:
                 # Initialize empty list for potential block list parsing on valid fields
                 val = []
                 current_key = key # Track to append items
@@ -85,6 +135,11 @@ def parse_frontmatter(file_path):
 
             data[key] = val
 
+    # Flush any remaining dict entry
+    if current_dict_entry is not None and current_key == 'relations':
+        if isinstance(data.get(current_key), list):
+            data[current_key].append(current_dict_entry)
+
     return data
 
 def parse_repo_index(manifest_path=None, strict_manifest=False):
diff --git a/scripts/docmeta/docs-relations-guard.sh b/scripts/docmeta/docs-relations-guard.sh
index 4aa0b725..8ec21459 100755
--- a/scripts/docmeta/docs-relations-guard.sh
+++ b/scripts/docmeta/docs-relations-guard.sh
@@ -31,7 +31,7 @@ with open(file_path, 'r', encoding='utf-8') as f:
             break
         frontmatter.append(line)
 
-required_fields = ['id:', 'title:', 'doc_type:', 'status:', 'canonicality:', 'summary:']
+required_fields = ['id:', 'title:', 'status:', 'summary:']
 fm_str = ''.join(frontmatter)
 
 missing = []
@@ -48,6 +48,38 @@ if missing:
     print(f'ERROR: Frontmatter missing fields {missing} in {file_path}')
     sys.exit(1)
 
+# Reject placeholder summaries that carry no real information
+placeholder_patterns = [
+    'Automatisch hinzugefügtes Frontmatter',
+    'TODO',
+    'FIXME',
+    'PLACEHOLDER',
+]
+summary_value = ''
+in_summary = False
+for line in frontmatter:
+    stripped = line.strip()
+    if not in_summary:
+        if stripped.startswith('summary:'):
+            val = stripped[len('summary:'):].strip()
+            if val == '>' or val == '|':
+                in_summary = True
+                continue
+            summary_value = val.strip('\"').strip(\"'\")
+            break
+    else:
+        # In YAML block scalars (> or |), continuation lines are indented.
+        # An unindented line means the block ended.
+        if line[0:1] in ('', ' ', '\t') and stripped:
+            summary_value += (' ' if summary_value else '') + stripped
+        else:
+            break
+
+for pattern in placeholder_patterns:
+    if pattern.lower() in summary_value.lower():
+        print(f'ERROR: Placeholder summary detected in {file_path}: \"{summary_value}\"')
+        sys.exit(1)
+
 sys.exit(0)
 " "$file" || FAIL=1
 
diff --git a/scripts/docmeta/export_docs_index.py b/scripts/docmeta/export_docs_index.py
index 22be95e7..eb714cdd 100644
--- a/scripts/docmeta/export_docs_index.py
+++ b/scripts/docmeta/export_docs_index.py
@@ -2,7 +2,7 @@
 import sys
 import json
 
-from scripts.docmeta.docmeta import REPO_ROOT, parse_repo_index, parse_frontmatter, parse_review_policy, normalize_list_field
+from scripts.docmeta.docmeta import REPO_ROOT, parse_repo_index, parse_frontmatter, parse_review_policy, normalize_list_field, extract_depends_on
 
 def main():
     try:
@@ -48,7 +48,7 @@ def main():
                 role = frontmatter.get('role', '')
                 last_reviewed = frontmatter.get('last_reviewed', '')
 
-                depends_on = normalize_list_field(frontmatter.get('depends_on', []))
+                depends_on = extract_depends_on(frontmatter)
                 verifies_with = normalize_list_field(frontmatter.get('verifies_with', []))
 
                 doc_entry = {
diff --git a/scripts/docmeta/generate-backlinks.sh b/scripts/docmeta/generate-backlinks.sh
deleted file mode 100755
index 229c7c19..00000000
--- a/scripts/docmeta/generate-backlinks.sh
+++ /dev/null
@@ -1,99 +0,0 @@
-#!/usr/bin/env bash
-
-set -euo pipefail
-
-OUT_FILE="docs/_generated/backlinks.md"
-mkdir -p docs/_generated
-
-cat << 'HEADER' > "$OUT_FILE"
----
-id: docs.generated.backlinks
-title: Backlinks Graph
-doc_type: generated
-status: active
-canonicality: derived
-summary: Automatisch generierter Graph der Rückverweise.
----
-
-## Weltgewebe Backlinks
-
-Generated automatically. Do not edit.
-
-HEADER
-
-python3 -c "
-import os
-from collections import defaultdict
-import re
-
-out_file = 'docs/_generated/backlinks.md'
-backlinks = defaultdict(list)
-
-# Poor man's YAML frontmatter parser for basic relations
-def extract_relations(content):
-    relations = {}
-    if content.startswith('---'):
-        parts = content.split('---', 2)
-        if len(parts) >= 3:
-            fm_str = parts[1]
-            lines = fm_str.strip().split('\n')
-            current_key = None
-            for line in lines:
-                line = line.strip()
-                if not line:
-                    continue
-                # Match key: value or key:
-                if ':' in line and not line.startswith('- '):
-                    key, val = line.split(':', 1)
-                    key = key.strip()
-                    val = val.strip()
-                    current_key = key
-                    if val and val != '[]':
-                        # Simplistic array parsing like [a, b]
-                        if val.startswith('[') and val.endswith(']'):
-                            items = [i.strip() for i in val[1:-1].split(',') if i.strip()]
-                            relations[key] = items
-                        else:
-                            relations[key] = [val]
-                    else:
-                        relations[key] = []
-                elif line.startswith('- ') and current_key:
-                    val = line[2:].strip()
-                    if current_key not in relations:
-                        relations[current_key] = []
-                    relations[current_key].append(val)
-    return relations
-
-doc_files = []
-for root, dirs, files in os.walk('docs'):
-    if '_generated' in root:
-        continue
-    for file in files:
-        if file.endswith('.md'):
-            doc_files.append(os.path.join(root, file))
-
-for file in sorted(doc_files):
-    try:
-        with open(file, 'r', encoding='utf-8') as f:
-            content = f.read()
-            fm = extract_relations(content)
-            for rel in ['documents', 'implemented_by', 'related_docs', 'supersedes', 'depends_on']:
-                if rel in fm and fm[rel]:
-                    targets = fm[rel]
-                    for t in targets:
-                        backlinks[t].append((file, rel))
-    except Exception as e:
-        pass
-
-with open(out_file, 'a', encoding='utf-8') as f:
-    if not backlinks:
-        f.write('_No relations found._\n')
-    else:
-        for target in sorted(backlinks.keys()):
-            f.write(f'## {target}\n\n')
-            for source, rel in sorted(backlinks[target]):
-                f.write(f'- [{rel}] {source}\n')
-            f.write('\n')
-
-print(f'Generated {out_file}')
-"
diff --git a/scripts/docmeta/generate-doc-index.sh b/scripts/docmeta/generate-doc-index.sh
index 3b55a0ba..dab19257 100755
--- a/scripts/docmeta/generate-doc-index.sh
+++ b/scripts/docmeta/generate-doc-index.sh
@@ -11,7 +11,6 @@ id: docs.generated.doc-index
 title: Doc Index
 doc_type: generated
 status: active
-canonicality: derived
 summary: Automatisch generierter Dokumenten-Index.
 ---
 
@@ -19,8 +18,8 @@ summary: Automatisch generierter Dokumenten-Index.
 
 Generated automatically. Do not edit.
 
-| id | title | type | status | canonicality | path |
-| --- | --- | --- | --- | --- | --- |
+| id | title | type | status | path |
+| --- | --- | --- | --- | --- |
 HEADER
 
 # Create a temporary file to hold entries before sorting
@@ -37,10 +36,9 @@ find docs -type f -name "*.md" ! -path "docs/_generated/*" -print0 | while IFS=
     title=$(sed -n -e '/^---$/,/^---$/ p' "$file" | grep "^title:" | sed 's/^title: *//' | tr -d '"'\''')
     doc_type=$(sed -n -e '/^---$/,/^---$/ p' "$file" | grep "^doc_type:" | sed 's/^doc_type: *//' | tr -d '"'\''')
     status=$(sed -n -e '/^---$/,/^---$/ p' "$file" | grep "^status:" | sed 's/^status: *//' | tr -d '"'\''')
-    canonicality=$(sed -n -e '/^---$/,/^---$/ p' "$file" | grep "^canonicality:" | sed 's/^canonicality: *//' | tr -d '"'\''')
 
     if [ -n "$id" ]; then
-        echo "| $id | $title | $doc_type | $status | $canonicality | $file |" >> "$TEMP_ENTRIES"
+        echo "| $id | $title | $doc_type | $status | $file |" >> "$TEMP_ENTRIES"
     fi
 done
 
diff --git a/scripts/docmeta/generate-impl-index.sh b/scripts/docmeta/generate-impl-index.sh
index 2acfdd4b..a283fefd 100755
--- a/scripts/docmeta/generate-impl-index.sh
+++ b/scripts/docmeta/generate-impl-index.sh
@@ -11,7 +11,6 @@ id: docs.generated.impl-index
 title: Implementation Index
 doc_type: generated
 status: active
-canonicality: derived
 summary: Automatisch generierter Index kritischer Implementierungen.
 ---
 
diff --git a/scripts/docmeta/generate-supersession-map.sh b/scripts/docmeta/generate-supersession-map.sh
deleted file mode 100755
index b1bacfaa..00000000
--- a/scripts/docmeta/generate-supersession-map.sh
+++ /dev/null
@@ -1,91 +0,0 @@
-#!/usr/bin/env bash
-
-set -euo pipefail
-
-OUT_FILE="docs/_generated/supersession-map.md"
-mkdir -p docs/_generated
-
-cat << 'HEADER' > "$OUT_FILE"
----
-id: docs.generated.supersession-map
-title: Supersession Map
-doc_type: generated
-status: active
-canonicality: derived
-summary: Automatisch generierte Karte der abgelösten Dokumente.
----
-
-## Weltgewebe Supersession Map
-
-Generated automatically. Do not edit.
-
-HEADER
-
-python3 -c "
-import os
-
-out_file = 'docs/_generated/supersession-map.md'
-relations = []
-
-def extract_relations(content):
-    relations = {}
-    if content.startswith('---'):
-        parts = content.split('---', 2)
-        if len(parts) >= 3:
-            fm_str = parts[1]
-            lines = fm_str.strip().split('\n')
-            current_key = None
-            for line in lines:
-                line = line.strip()
-                if not line:
-                    continue
-                if ':' in line and not line.startswith('- '):
-                    key, val = line.split(':', 1)
-                    key = key.strip()
-                    val = val.strip()
-                    current_key = key
-                    if val and val != '[]':
-                        if val.startswith('[') and val.endswith(']'):
-                            items = [i.strip() for i in val[1:-1].split(',') if i.strip()]
-                            relations[key] = items
-                        else:
-                            relations[key] = [val]
-                    else:
-                        relations[key] = []
-                elif line.startswith('- ') and current_key:
-                    val = line[2:].strip()
-                    if current_key not in relations:
-                        relations[current_key] = []
-                    relations[current_key].append(val)
-    return relations
-
-for root, dirs, files in os.walk('docs'):
-    if '_generated' in root:
-        continue
-    for file in files:
-        if file.endswith('.md'):
-            file_path = os.path.join(root, file)
-            try:
-                with open(file_path, 'r', encoding='utf-8') as f:
-                    content = f.read()
-                    fm = extract_relations(content)
-                    if 'supersedes' in fm and fm['supersedes']:
-                        targets = fm['supersedes']
-                        for t in targets:
-                            relations.append((t, file_path))
-                    if 'deprecated_by' in fm and fm['deprecated_by']:
-                        targets = fm['deprecated_by']
-                        for t in targets:
-                            relations.append((file_path, t))
-            except Exception:
-                pass
-
-with open(out_file, 'a', encoding='utf-8') as f:
-    if not relations:
-        f.write('_No supersession relations found._\n')
-    else:
-        for old_doc, new_doc in sorted(relations):
-            f.write(f'- {old_doc} → superseded by → {new_doc}\n')
-
-print(f'Generated {out_file}')
-"
diff --git a/scripts/docmeta/generate_agent_readiness.py b/scripts/docmeta/generate_agent_readiness.py
index 14212338..7de5cb44 100644
--- a/scripts/docmeta/generate_agent_readiness.py
+++ b/scripts/docmeta/generate_agent_readiness.py
@@ -13,7 +13,6 @@
         f.write("title: Agent Readiness\n")
         f.write("doc_type: generated\n")
         f.write("status: active\n")
-        f.write("canonicality: derived\n")
         f.write("summary: Zusammenfassung der agentischen Reife.\n")
         f.write("---\n\n")
         f.write("## Weltgewebe Agent Readiness\n\n")
diff --git a/scripts/docmeta/generate_architecture_drift.py b/scripts/docmeta/generate_architecture_drift.py
index ea698bc6..cf02f122 100644
--- a/scripts/docmeta/generate_architecture_drift.py
+++ b/scripts/docmeta/generate_architecture_drift.py
@@ -13,7 +13,6 @@
         f.write("title: Architecture Drift\n")
         f.write("doc_type: generated\n")
         f.write("status: active\n")
-        f.write("canonicality: derived\n")
         f.write("summary: Automatisch generierter Report über Architektur-Drift.\n")
         f.write("---\n\n")
         f.write("## Weltgewebe Architecture Drift\n\n")
diff --git a/scripts/docmeta/generate_backlinks.py b/scripts/docmeta/generate_backlinks.py
new file mode 100644
index 00000000..f011b1a9
--- /dev/null
+++ b/scripts/docmeta/generate_backlinks.py
@@ -0,0 +1,66 @@
+"""
+Backlinks Generator — builds a reverse-reference graph from document relations.
+
+Uses the centralized relations parser (no duplicate parsing logic).
+
+Output: docs/_generated/backlinks.md
+"""
+
+import os
+import sys
+from collections import defaultdict
+
+from scripts.docmeta.docmeta import REPO_ROOT
+from scripts.docmeta.relations_parser import (
+    extract_relations_from_content,
+    collect_file_relations,
+)
+
+OUT_FILE = os.path.join(REPO_ROOT, "docs", "_generated", "backlinks.md")
+
+HEADER = """\
+---
+id: docs.generated.backlinks
+title: Backlinks Graph
+doc_type: generated
+status: active
+summary: Automatisch generierter Graph der Rückverweise.
+---
+
+## Weltgewebe Backlinks
+
+Generated automatically. Do not edit.
+
+"""
+
+
+def generate_backlinks():
+    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
+
+    file_relations = collect_file_relations(["docs"], REPO_ROOT)
+
+    backlinks = defaultdict(list)
+    for source_path, rels in file_relations.items():
+        for entry in rels:
+            if isinstance(entry, dict):
+                rel_type = entry.get("type", "")
+                target = entry.get("target", "")
+                if rel_type and target:
+                    backlinks[target].append((source_path, rel_type))
+
+    with open(OUT_FILE, "w", encoding="utf-8") as f:
+        f.write(HEADER)
+        if not backlinks:
+            f.write("_No relations found._\n")
+        else:
+            for target in sorted(backlinks.keys()):
+                f.write(f"## {target}\n\n")
+                for source, rel in sorted(backlinks[target]):
+                    f.write(f"- [{rel}] {source}\n")
+                f.write("\n")
+
+    print(f"Generated {os.path.relpath(OUT_FILE, REPO_ROOT)}")
+
+
+if __name__ == "__main__":
+    generate_backlinks()
diff --git a/scripts/docmeta/generate_change_resonance.py b/scripts/docmeta/generate_change_resonance.py
index cafaba5a..916838f7 100644
--- a/scripts/docmeta/generate_change_resonance.py
+++ b/scripts/docmeta/generate_change_resonance.py
@@ -13,7 +13,6 @@
         f.write("title: Change Resonance\n")
         f.write("doc_type: generated\n")
         f.write("status: active\n")
-        f.write("canonicality: derived\n")
         f.write("summary: Wenn sich X ändert, prüfe oder aktualisiere Y.\n")
         f.write("---\n\n")
         f.write("## Weltgewebe Change Resonance\n\n")
diff --git a/scripts/docmeta/generate_doc_coverage.py b/scripts/docmeta/generate_doc_coverage.py
index 39613bc5..53b8915c 100644
--- a/scripts/docmeta/generate_doc_coverage.py
+++ b/scripts/docmeta/generate_doc_coverage.py
@@ -99,7 +99,6 @@
         f.write("title: Doc Coverage\n")
         f.write("doc_type: generated\n")
         f.write("status: active\n")
-        f.write("canonicality: derived\n")
         f.write("summary: Automatisch generierter Report über die Dokumentationsabdeckung.\n")
         f.write("---\n\n")
         f.write("## Weltgewebe Doc Coverage\n\n")
diff --git a/scripts/docmeta/generate_implicit_dependencies.py b/scripts/docmeta/generate_implicit_dependencies.py
index 7fe7564a..c619100c 100644
--- a/scripts/docmeta/generate_implicit_dependencies.py
+++ b/scripts/docmeta/generate_implicit_dependencies.py
@@ -52,7 +52,6 @@
         f.write("title: Implicit Dependencies\n")
         f.write("doc_type: generated\n")
         f.write("status: active\n")
-        f.write("canonicality: derived\n")
         f.write("summary: Heuristische Karte impliziter Abhängigkeiten.\n")
         f.write("---\n\n")
         f.write("## Weltgewebe Implicit Dependencies\n\n")
diff --git a/scripts/docmeta/generate_knowledge_gaps.py b/scripts/docmeta/generate_knowledge_gaps.py
index 8d9484ed..248da4c5 100644
--- a/scripts/docmeta/generate_knowledge_gaps.py
+++ b/scripts/docmeta/generate_knowledge_gaps.py
@@ -67,7 +67,6 @@ def is_meaningful_gap(val):
         f.write("title: Knowledge Gaps\n")
         f.write("doc_type: generated\n")
         f.write("status: active\n")
-        f.write("canonicality: derived\n")
         f.write("summary: Automatisch markierte Wissenslücken in der Repo-Landschaft.\n")
         f.write("---\n\n")
         f.write("## Weltgewebe Knowledge Gaps\n\n")
diff --git a/scripts/docmeta/generate_orphans.py b/scripts/docmeta/generate_orphans.py
new file mode 100644
index 00000000..9b2de1b6
--- /dev/null
+++ b/scripts/docmeta/generate_orphans.py
@@ -0,0 +1,76 @@
+"""
+Orphan Guard — identifies documents with no inbound or outbound relations.
+
+Uses the centralized relations parser (no duplicate parsing logic).
+
+Output: docs/_generated/orphans.md
+"""
+
+import os
+import sys
+from collections import defaultdict
+
+from scripts.docmeta.docmeta import REPO_ROOT
+from scripts.docmeta.relations_parser import collect_file_relations
+
+OUT_FILE = os.path.join(REPO_ROOT, "docs", "_generated", "orphans.md")
+
+HEADER = """\
+---
+id: docs.generated.orphans
+title: Orphans
+doc_type: generated
+status: active
+summary: Automatisch generierte Liste verwaister Dokumente.
+---
+
+## Weltgewebe Orphans
+
+Generated automatically. Do not edit.
+
+"""
+
+
+def generate_orphans():
+    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
+
+    file_relations = collect_file_relations(["docs"], REPO_ROOT)
+
+    # Build set of all docs and backlinks map
+    all_docs = set()
+    backlinks = defaultdict(list)
+    for source_path, rels in file_relations.items():
+        all_docs.add(source_path)
+        for entry in rels:
+            if isinstance(entry, dict):
+                target = entry.get("target", "")
+                if target:
+                    backlinks[target].append(source_path)
+
+    orphans = []
+    for file_path in all_docs:
+        if file_path.endswith("index.md") or file_path.endswith("README.md"):
+            continue
+
+        is_targeted = file_path in backlinks
+        has_outgoing = any(
+            isinstance(e, dict) and e.get("target")
+            for e in file_relations.get(file_path, [])
+        )
+
+        if not is_targeted and not has_outgoing:
+            orphans.append(file_path)
+
+    with open(OUT_FILE, "w", encoding="utf-8") as f:
+        f.write(HEADER)
+        if not orphans:
+            f.write("_No orphans found._\n")
+        else:
+            for o in sorted(orphans):
+                f.write(f"- {o}\n")
+
+    print(f"Generated {os.path.relpath(OUT_FILE, REPO_ROOT)}")
+
+
+if __name__ == "__main__":
+    generate_orphans()
diff --git a/scripts/docmeta/generate_relates_to_audit.py b/scripts/docmeta/generate_relates_to_audit.py
new file mode 100644
index 00000000..0f6232fd
--- /dev/null
+++ b/scripts/docmeta/generate_relates_to_audit.py
@@ -0,0 +1,307 @@
+"""
+Relates-To Audit Generator — structural observation of relates_to usage.
+
+Read-only analysis that makes relates_to patterns visible:
+1. Type distribution: summary of relation types across the repo
+2. Supersedes gap detection: similar-named docs without supersedes links
+3. Cluster analysis: connected components in the relates_to subgraph
+4. Concrete examples: relation lists from docs with most relates_to for review
+
+No quota-based warnings, no percentage thresholds, no feedback loops.
+Pure structural observation.
+
+Output: docs/_generated/relates-to-audit.md
+"""
+
+import os
+import sys
+from collections import defaultdict
+
+from scripts.docmeta.docmeta import REPO_ROOT
+from scripts.docmeta.relations_parser import extract_relations_from_content
+
+MAX_NEGATIVE_EXAMPLES = 3
+
+# Heuristic suffixes that suggest supersession
+SUPERSESSION_SUFFIXES = ["-v2", "-v3", "-new", "-deprecated", "-legacy", "-alt", "-revised"]
+
+
+def collect_relations_graph():
+    """
+    Walk all docs/*.md (excluding _generated) and build the relations graph.
+
+    Returns:
+        edges: list of (source, type, target) tuples
+        all_docs: set of all doc paths found
+    """
+    docs_dir = os.path.join(REPO_ROOT, "docs")
+    edges = []
+    all_docs = set()
+
+    for root, dirs, files in os.walk(docs_dir):
+        if "_generated" in root:
+            continue
+        for file in files:
+            if not file.endswith(".md"):
+                continue
+            abs_path = os.path.join(root, file)
+            rel_path = os.path.relpath(abs_path, REPO_ROOT)
+            all_docs.add(rel_path)
+
+            try:
+                with open(abs_path, "r", encoding="utf-8") as f:
+                    content = f.read()
+            except Exception:
+                continue
+
+            relations = extract_relations_from_content(content)
+            for rel in relations:
+                if not isinstance(rel, dict):
+                    continue
+                rel_type = rel.get("type", "")
+                target = rel.get("target", "")
+                if rel_type and target:
+                    edges.append((rel_path, rel_type, target))
+
+    return edges, all_docs
+
+
+def compute_per_doc_type_counts(edges):
+    """
+    For each source document, count relations by type.
+
+    Returns:
+        dict: {doc: {"relates_to": n, "depends_on": n, "supersedes": n, "total": n}}
+    """
+    counts = defaultdict(lambda: {"relates_to": 0, "depends_on": 0, "supersedes": 0, "total": 0})
+    for source, rel_type, _ in edges:
+        if rel_type in counts[source]:
+            counts[source][rel_type] += 1
+        counts[source]["total"] += 1
+    return dict(counts)
+
+
+def find_supersedes_gaps(all_docs):
+    """
+    Phase 3: Find pairs of docs with similar names suggesting supersession.
+
+    Heuristic: strip known suffixes and compare base names within same directory.
+
+    Returns:
+        list of (doc_a, doc_b, reason) tuples
+    """
+    gaps = []
+    docs_by_dir = defaultdict(list)
+    for doc in all_docs:
+        dir_path = os.path.dirname(doc)
+        docs_by_dir[dir_path].append(doc)
+
+    for dir_path, docs in docs_by_dir.items():
+        basenames = {}
+        for doc in docs:
+            name = os.path.basename(doc)
+            stem = name.rsplit(".", 1)[0] if "." in name else name
+            basenames[doc] = stem
+
+        for doc_a in docs:
+            stem_a = basenames[doc_a]
+            for doc_b in docs:
+                if doc_a >= doc_b:
+                    continue
+                stem_b = basenames[doc_b]
+                reason = _check_supersession_pattern(stem_a, stem_b)
+                if reason:
+                    gaps.append((doc_a, doc_b, reason))
+
+    gaps.sort()
+    return gaps
+
+
+def _check_supersession_pattern(stem_a, stem_b):
+    """
+    Check if two stems suggest a supersession relationship.
+
+    Returns reason string or None.
+    """
+    for suffix in SUPERSESSION_SUFFIXES:
+        if stem_b == stem_a + suffix:
+            return f"'{stem_b}' looks like a revision of '{stem_a}' (suffix: {suffix})"
+        if stem_a == stem_b + suffix:
+            return f"'{stem_a}' looks like a revision of '{stem_b}' (suffix: {suffix})"
+    return None
+
+
+def find_relates_to_clusters(edges):
+    """
+    Phase 4: Build relates_to-only graph and find connected components.
+
+    Returns:
+        list of clusters, each cluster is a sorted list of doc paths,
+        sorted by cluster size (largest first)
+    """
+    adj = defaultdict(set)
+    nodes = set()
+    for source, rel_type, target in edges:
+        if rel_type == "relates_to":
+            adj[source].add(target)
+            adj[target].add(source)
+            nodes.add(source)
+            nodes.add(target)
+
+    visited = set()
+    clusters = []
+
+    for node in sorted(nodes):
+        if node in visited:
+            continue
+        # BFS to find connected component
+        component = []
+        queue = [node]
+        while queue:
+            current = queue.pop(0)
+            if current in visited:
+                continue
+            visited.add(current)
+            component.append(current)
+            for neighbor in sorted(adj.get(current, [])):
+                if neighbor not in visited:
+                    queue.append(neighbor)
+        if component:
+            clusters.append(sorted(component))
+
+    clusters.sort(key=lambda c: -len(c))
+    return clusters
+
+
+def compute_type_distribution(edges):
+    """Count relations by type for the summary."""
+    dist = defaultdict(int)
+    for _, rel_type, _ in edges:
+        dist[rel_type] += 1
+    return dict(dist)
+
+
+def collect_negative_examples(edges, doc_counts, max_examples=MAX_NEGATIVE_EXAMPLES):
+    """
+    Collect concrete relates_to relation lists from docs with high relates_to usage.
+
+    Selects docs with the most relates_to relations to show as concrete examples.
+
+    Returns:
+        list of (doc, [(target, rel_type), ...]) tuples, max_examples entries
+    """
+    # Find docs with the most relates_to, preferring docs that are 100% relates_to
+    candidates = []
+    for doc, counts in doc_counts.items():
+        rt = counts["relates_to"]
+        if rt >= 2:
+            candidates.append((doc, rt, counts["total"]))
+    candidates.sort(key=lambda x: (-x[1], x[0]))
+
+    # Collect relation details for top candidates
+    examples = []
+    for doc, _, _ in candidates[:max_examples]:
+        rels = []
+        for source, rel_type, target in edges:
+            if source == doc:
+                rels.append((target, rel_type))
+        rels.sort()
+        if rels:
+            examples.append((doc, rels))
+
+    return examples
+
+
+def write_output(edges, all_docs, doc_counts, supersedes_gaps, clusters,
+                 negative_examples):
+    """Write the relates-to-audit.md output file."""
+    out_file = os.path.join(REPO_ROOT, "docs", "_generated", "relates-to-audit.md")
+    os.makedirs(os.path.dirname(out_file), exist_ok=True)
+
+    type_dist = compute_type_distribution(edges)
+    total_rels = len(edges)
+    rt_count = type_dist.get("relates_to", 0)
+    rt_pct = (rt_count / total_rels * 100) if total_rels > 0 else 0
+
+    with open(out_file, "w", encoding="utf-8") as f:
+        f.write("---\n")
+        f.write("id: docs.generated.relates-to-audit\n")
+        f.write("title: Relates-To Audit\n")
+        f.write("doc_type: generated\n")
+        f.write("status: active\n")
+        f.write("summary: Strukturelle Beobachtung der relates_to-Nutzung — Typen, Cluster, Beispiele.\n")
+        f.write("---\n\n")
+        f.write("## Weltgewebe Relates-To Audit\n\n")
+        f.write("Generated automatically. Do not edit.\n\n")
+
+        # 1. Summary
+        f.write("### Zusammenfassung\n\n")
+        f.write("| Metrik | Wert |\n")
+        f.write("| --- | --- |\n")
+        f.write(f"| Relationen gesamt | {total_rels} |\n")
+        for rel_type in sorted(type_dist.keys()):
+            f.write(f"| — {rel_type} | {type_dist[rel_type]} |\n")
+        f.write(f"| relates_to Anteil | {rt_pct:.0f}% |\n")
+        f.write("\n")
+
+        # 2. Supersedes gaps
+        f.write("### Mögliche supersedes-Lücken\n\n")
+        f.write("> Dokument-Paare mit namensähnlichen Mustern, die möglicherweise eine supersedes-Relation benötigen.\n\n")
+        if supersedes_gaps:
+            for doc_a, doc_b, reason in supersedes_gaps:
+                f.write(f"- `{doc_a}` ↔ `{doc_b}` — {reason}\n")
+            f.write("\n")
+        else:
+            f.write("_Keine Lücken erkannt._\n\n")
+
+        # 3. Cluster analysis
+        f.write("### Cluster-Analyse (relates_to)\n\n")
+        f.write("> Zusammenhängende Gruppen im relates_to-Graphen.\n\n")
+        if clusters:
+            for i, cluster in enumerate(clusters):
+                f.write(f"**Cluster {i+1}** ({len(cluster)} Dokumente):\n\n")
+                for doc in cluster:
+                    f.write(f"- `{doc}`\n")
+                f.write("\n")
+        else:
+            f.write("_Keine Cluster gefunden._\n\n")
+
+        # 4. Concrete examples
+        f.write("### Konkrete Beispiele zur Prüfung\n\n")
+        f.write("> Dokumente mit den meisten relates_to-Zielen und ihren konkreten Relationen.\n\n")
+        if negative_examples:
+            for doc, rels in negative_examples:
+                f.write(f"**`{doc}`**:\n\n")
+                for target, rel_type in rels:
+                    f.write(f"- {rel_type} → `{target}`\n")
+                f.write("\n")
+        else:
+            f.write("_Keine Beispiele verfügbar._\n\n")
+
+        # 5. Disclaimer
+        f.write("### Hinweise\n\n")
+        f.write("- Alle Ergebnisse dienen der strukturellen Sichtbarmachung.\n")
+        f.write("- `relates_to` ist kein Fehler — die Verteilung zeigt den aktuellen Stand.\n")
+        f.write("- Keine automatischen Korrekturen werden vorgenommen.\n")
+
+    return out_file
+
+
+def main():
+    """Main entry point for the relates-to audit generator."""
+    try:
+        edges, all_docs = collect_relations_graph()
+        doc_counts = compute_per_doc_type_counts(edges)
+        supersedes_gaps = find_supersedes_gaps(all_docs)
+        clusters = find_relates_to_clusters(edges)
+        negative_examples = collect_negative_examples(edges, doc_counts)
+        out_file = write_output(edges, all_docs, doc_counts, supersedes_gaps,
+                                clusters, negative_examples)
+        print(f"Generated {out_file}")
+    except Exception as e:
+        print(f"Error generating relates-to audit: {e}", file=sys.stderr)
+        sys.exit(1)
+
+
+if __name__ == "__main__":
+    main()
diff --git a/scripts/docmeta/generate_relations_analysis.py b/scripts/docmeta/generate_relations_analysis.py
new file mode 100644
index 00000000..4b52a886
--- /dev/null
+++ b/scripts/docmeta/generate_relations_analysis.py
@@ -0,0 +1,317 @@
+"""
+Relations Analysis Generator — semantic graph analysis of document relations.
+
+Read-only analysis that makes relation quality visible:
+1. Cycle detection in depends_on chains
+2. Hub detection (high inbound/outbound counts)
+3. Isolated documents (no inbound AND no outbound relations)
+4. Type distribution statistics
+5. Semantic warnings (heuristic, non-blocking)
+
+Output: docs/_generated/relations-analysis.md
+"""
+
+import os
+import sys
+from collections import defaultdict
+
+from scripts.docmeta.docmeta import REPO_ROOT
+from scripts.docmeta.relations_parser import extract_relations_from_content
+
+# Thresholds for heuristic warnings
+HUB_OUTBOUND_THRESHOLD = 8
+HUB_INBOUND_THRESHOLD = 10
+
+
+def collect_relations_graph():
+    """
+    Walk all docs/*.md (excluding _generated) and build the relations graph.
+
+    Returns:
+        edges: list of (source, type, target) tuples
+        all_docs: set of all doc paths found
+    """
+    docs_dir = os.path.join(REPO_ROOT, "docs")
+    edges = []
+    all_docs = set()
+
+    for root, dirs, files in os.walk(docs_dir):
+        if "_generated" in root:
+            continue
+        for file in files:
+            if not file.endswith(".md"):
+                continue
+            abs_path = os.path.join(root, file)
+            rel_path = os.path.relpath(abs_path, REPO_ROOT)
+            all_docs.add(rel_path)
+
+            try:
+                with open(abs_path, "r", encoding="utf-8") as f:
+                    content = f.read()
+            except Exception:
+                continue
+
+            relations = extract_relations_from_content(content)
+            for rel in relations:
+                if not isinstance(rel, dict):
+                    continue
+                rel_type = rel.get("type", "")
+                target = rel.get("target", "")
+                if rel_type and target:
+                    edges.append((rel_path, rel_type, target))
+
+    return edges, all_docs
+
+
+def find_cycles(edges):
+    """
+    Detect cycles in depends_on edges using iterative DFS.
+
+    Returns:
+        list of cycles, each cycle is a list of node paths forming a loop
+    """
+    # Build adjacency list for depends_on only
+    graph = defaultdict(list)
+    for source, rel_type, target in edges:
+        if rel_type == "depends_on":
+            graph[source].append(target)
+
+    visited = set()
+    in_stack = set()
+    cycles = []
+
+    for start_node in graph:
+        if start_node in visited:
+            continue
+
+        # Iterative DFS with explicit stack
+        stack = [(start_node, [start_node], 0)]
+        while stack:
+            node, path, idx = stack.pop()
+
+            neighbors = graph.get(node, [])
+            if idx == 0:
+                if node in in_stack:
+                    # Found cycle — extract it
+                    if node in path[:-1]:
+                        cycle_start = path.index(node)
+                        cycles.append(path[cycle_start:])
+                    continue
+                if node in visited:
+                    continue
+                in_stack.add(node)
+
+            found_next = False
+            for i in range(idx, len(neighbors)):
+                neighbor = neighbors[i]
+                if neighbor in in_stack:
+                    # Cycle detected
+                    cycle_path = path + [neighbor]
+                    cycle_start = cycle_path.index(neighbor)
+                    cycles.append(cycle_path[cycle_start:])
+                elif neighbor not in visited:
+                    # Push continuation point, then explore neighbor
+                    stack.append((node, path, i + 1))
+                    stack.append((neighbor, path + [neighbor], 0))
+                    found_next = True
+                    break
+
+            if not found_next:
+                in_stack.discard(node)
+                visited.add(node)
+
+    return cycles
+
+
+def compute_degree_stats(edges, all_docs):
+    """
+    Compute inbound and outbound degree for each document.
+
+    Returns:
+        dict: {doc_path: {"outbound": int, "inbound": int, "outbound_by_type": {}, "inbound_by_type": {}}}
+    """
+    stats = {}
+    for doc in all_docs:
+        stats[doc] = {
+            "outbound": 0,
+            "inbound": 0,
+            "outbound_by_type": defaultdict(int),
+            "inbound_by_type": defaultdict(int),
+        }
+
+    for source, rel_type, target in edges:
+        if source in stats:
+            stats[source]["outbound"] += 1
+            stats[source]["outbound_by_type"][rel_type] += 1
+        if target in stats:
+            stats[target]["inbound"] += 1
+            stats[target]["inbound_by_type"][rel_type] += 1
+
+    return stats
+
+
+def find_isolated_docs(stats):
+    """Find documents with zero inbound AND zero outbound relations."""
+    isolated = []
+    for doc, s in sorted(stats.items()):
+        if s["outbound"] == 0 and s["inbound"] == 0:
+            # Skip index/README files — they are structural, not relational
+            basename = os.path.basename(doc)
+            if basename in ("index.md", "README.md"):
+                continue
+            isolated.append(doc)
+    return isolated
+
+
+def find_hubs(stats):
+    """Find documents with high outbound or inbound relation counts."""
+    outbound_hubs = []
+    inbound_hubs = []
+
+    for doc, s in sorted(stats.items()):
+        if s["outbound"] >= HUB_OUTBOUND_THRESHOLD:
+            outbound_hubs.append((doc, s["outbound"]))
+        if s["inbound"] >= HUB_INBOUND_THRESHOLD:
+            inbound_hubs.append((doc, s["inbound"]))
+
+    outbound_hubs.sort(key=lambda x: -x[1])
+    inbound_hubs.sort(key=lambda x: -x[1])
+    return outbound_hubs, inbound_hubs
+
+
+def compute_type_distribution(edges):
+    """Count relations by type."""
+    dist = defaultdict(int)
+    for _, rel_type, _ in edges:
+        dist[rel_type] += 1
+    return dict(dist)
+
+
+def generate_warnings(edges, stats, cycles):
+    """Generate semantic warnings (heuristic, non-blocking)."""
+    warnings = []
+
+    # Cycle warnings
+    for cycle in cycles:
+        chain = " → ".join(cycle)
+        warnings.append(f"⚠️ depends_on cycle: {chain}")
+
+    # Hub warnings
+    outbound_hubs, inbound_hubs = find_hubs(stats)
+    for doc, count in outbound_hubs:
+        warnings.append(f"⚠️ High outbound count ({count}): `{doc}` — possible over-linking")
+    for doc, count in inbound_hubs:
+        warnings.append(f"⚠️ High inbound count ({count}): `{doc}` — central dependency, review carefully")
+
+    # Supersession chain check: supersedes without deprecated status on target
+    # (light heuristic — just flag for human review)
+    supersession_targets = set()
+    for source, rel_type, target in edges:
+        if rel_type == "supersedes":
+            supersession_targets.add(target)
+
+    return warnings
+
+
+def write_output(edges, all_docs, stats, cycles, warnings):
+    """Write the relations-analysis.md output file."""
+    out_file = os.path.join(REPO_ROOT, "docs", "_generated", "relations-analysis.md")
+    os.makedirs(os.path.dirname(out_file), exist_ok=True)
+
+    type_dist = compute_type_distribution(edges)
+    isolated = find_isolated_docs(stats)
+    outbound_hubs, inbound_hubs = find_hubs(stats)
+
+    docs_with_relations = sum(1 for s in stats.values() if s["outbound"] > 0)
+    docs_as_targets = sum(1 for s in stats.values() if s["inbound"] > 0)
+
+    with open(out_file, "w", encoding="utf-8") as f:
+        f.write("---\n")
+        f.write("id: docs.generated.relations-analysis\n")
+        f.write("title: Relations Analysis\n")
+        f.write("doc_type: generated\n")
+        f.write("status: active\n")
+        f.write("summary: Automatische Analyse des Relationsgraphen — Zyklen, Hubs, Isolation, Verteilung.\n")
+        f.write("---\n\n")
+        f.write("## Weltgewebe Relations Analysis\n\n")
+        f.write("Generated automatically. Do not edit.\n\n")
+
+        # Overview
+        f.write("### Übersicht\n\n")
+        f.write(f"| Metrik | Wert |\n")
+        f.write(f"| --- | --- |\n")
+        f.write(f"| Dokumente gesamt | {len(all_docs)} |\n")
+        f.write(f"| Dokumente mit ausgehenden Relationen | {docs_with_relations} |\n")
+        f.write(f"| Dokumente als Ziel referenziert | {docs_as_targets} |\n")
+        f.write(f"| Relationen gesamt | {len(edges)} |\n")
+        for rel_type in sorted(type_dist.keys()):
+            f.write(f"| — {rel_type} | {type_dist[rel_type]} |\n")
+        f.write(f"| Isolierte Dokumente | {len(isolated)} |\n")
+        f.write(f"| depends_on Zyklen | {len(cycles)} |\n")
+        f.write("\n")
+
+        # Warnings
+        f.write("### Warnungen\n\n")
+        f.write("> Heuristische Hinweise — keine CI-Fehler. Zyklen deuten auf zirkuläre Abhängigkeiten, hohe Vernetzung auf zentrale Dokumente, die bei Änderungen besondere Aufmerksamkeit erfordern.\n\n")
+        if warnings:
+            for w in warnings:
+                f.write(f"- {w}\n")
+            f.write("\n")
+        else:
+            f.write("_Keine Warnungen._\n\n")
+
+        # Cycles
+        f.write("### Zyklen (depends_on)\n\n")
+        if cycles:
+            for cycle in cycles:
+                chain = " → ".join(f"`{c}`" for c in cycle)
+                f.write(f"- {chain}\n")
+        else:
+            f.write("_Keine Zyklen gefunden._\n")
+        f.write("\n")
+
+        # Hubs
+        f.write("### Hubs (hohe Vernetzung)\n\n")
+        if outbound_hubs or inbound_hubs:
+            if outbound_hubs:
+                f.write("**Ausgehend (outbound):**\n\n")
+                for doc, count in outbound_hubs:
+                    f.write(f"- `{doc}` — {count} ausgehende Relationen\n")
+                f.write("\n")
+            if inbound_hubs:
+                f.write("**Eingehend (inbound):**\n\n")
+                for doc, count in inbound_hubs:
+                    f.write(f"- `{doc}` — {count} eingehende Relationen\n")
+                f.write("\n")
+        else:
+            f.write("_Keine auffälligen Hubs._\n\n")
+
+        # Isolated documents
+        f.write("### Isolierte Dokumente\n\n")
+        f.write("> Dokumente ohne eingehende und ausgehende Relationen (index.md/README.md ausgenommen).\n\n")
+        if isolated:
+            for doc in isolated:
+                f.write(f"- `{doc}`\n")
+        else:
+            f.write("_Keine isolierten Dokumente._\n")
+        f.write("\n")
+
+    return out_file
+
+
+def main():
+    """Main entry point for the relations analysis generator."""
+    try:
+        edges, all_docs = collect_relations_graph()
+        stats = compute_degree_stats(edges, all_docs)
+        cycles = find_cycles(edges)
+        warnings = generate_warnings(edges, stats, cycles)
+        out_file = write_output(edges, all_docs, stats, cycles, warnings)
+        print(f"Generated {out_file}")
+    except Exception as e:
+        print(f"Error generating relations analysis: {e}", file=sys.stderr)
+        sys.exit(1)
+
+
+if __name__ == "__main__":
+    main()
diff --git a/scripts/docmeta/generate_staleness_report.py b/scripts/docmeta/generate_staleness_report.py
index 0e416a90..132abc2f 100644
--- a/scripts/docmeta/generate_staleness_report.py
+++ b/scripts/docmeta/generate_staleness_report.py
@@ -13,7 +13,6 @@
         f.write("title: Staleness Report\n")
         f.write("doc_type: generated\n")
         f.write("status: active\n")
-        f.write("canonicality: derived\n")
         f.write("summary: Markiert veraltete oder abgelöste Dokumente.\n")
         f.write("---\n\n")
         f.write("## Weltgewebe Staleness Report\n\n")
diff --git a/scripts/docmeta/generate_supersession_map.py b/scripts/docmeta/generate_supersession_map.py
new file mode 100644
index 00000000..48962fb6
--- /dev/null
+++ b/scripts/docmeta/generate_supersession_map.py
@@ -0,0 +1,59 @@
+"""
+Supersession Map Generator — maps which documents supersede others.
+
+Uses the centralized relations parser (no duplicate parsing logic).
+
+Output: docs/_generated/supersession-map.md
+"""
+
+import os
+import sys
+
+from scripts.docmeta.docmeta import REPO_ROOT
+from scripts.docmeta.relations_parser import collect_file_relations
+
+OUT_FILE = os.path.join(REPO_ROOT, "docs", "_generated", "supersession-map.md")
+
+HEADER = """\
+---
+id: docs.generated.supersession-map
+title: Supersession Map
+doc_type: generated
+status: active
+summary: Automatisch generierte Karte der abgelösten Dokumente.
+---
+
+## Weltgewebe Supersession Map
+
+Generated automatically. Do not edit.
+
+"""
+
+
+def generate_supersession_map():
+    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
+
+    file_relations = collect_file_relations(["docs"], REPO_ROOT)
+
+    supersession_relations = []
+    for source_path, rels in file_relations.items():
+        for entry in rels:
+            if isinstance(entry, dict):
+                rel_type = entry.get("type", "")
+                target = entry.get("target", "")
+                if rel_type == "supersedes" and target:
+                    supersession_relations.append((target, source_path))
+
+    with open(OUT_FILE, "w", encoding="utf-8") as f:
+        f.write(HEADER)
+        if not supersession_relations:
+            f.write("_No supersession relations found._\n")
+        else:
+            for old_doc, new_doc in sorted(supersession_relations):
+                f.write(f"- {old_doc} → superseded by → {new_doc}\n")
+
+    print(f"Generated {os.path.relpath(OUT_FILE, REPO_ROOT)}")
+
+
+if __name__ == "__main__":
+    generate_supersession_map()
diff --git a/scripts/docmeta/generate_system_map.py b/scripts/docmeta/generate_system_map.py
index f90164f1..a903a0a5 100644
--- a/scripts/docmeta/generate_system_map.py
+++ b/scripts/docmeta/generate_system_map.py
@@ -2,7 +2,7 @@
 import sys
 import datetime
 
-from scripts.docmeta.docmeta import REPO_ROOT, parse_repo_index, parse_frontmatter, parse_review_policy, normalize_list_field
+from scripts.docmeta.docmeta import REPO_ROOT, parse_repo_index, parse_frontmatter, parse_review_policy, normalize_list_field, extract_depends_on
 
 def main():
     try:
@@ -21,7 +21,6 @@ def main():
         "title: System Map",
         "doc_type: generated",
         "status: active",
-        "canonicality: derived",
         "summary: Automatisch generierte System Map.",
         "---",
         "## Weltgewebe System Map\n\nGenerated automatically. Do not edit.\n\nSource: scripts/docmeta/generate_system_map.py\n"
@@ -73,7 +72,7 @@ def main():
                 else:
                     freshness_status = "missing"
 
-                depends_on_list = normalize_list_field(frontmatter.get('depends_on', []))
+                depends_on_list = extract_depends_on(frontmatter)
                 depends_on_str = ', '.join(depends_on_list)
 
                 vw_list = normalize_list_field(frontmatter.get('verifies_with', []))
diff --git a/scripts/docmeta/orphan-guard.sh b/scripts/docmeta/orphan-guard.sh
deleted file mode 100755
index 3e9eb591..00000000
--- a/scripts/docmeta/orphan-guard.sh
+++ /dev/null
@@ -1,115 +0,0 @@
-#!/usr/bin/env bash
-
-set -euo pipefail
-
-OUT_FILE="docs/_generated/orphans.md"
-mkdir -p docs/_generated
-
-cat << 'HEADER' > "$OUT_FILE"
----
-id: docs.generated.orphans
-title: Orphans
-doc_type: generated
-status: active
-canonicality: derived
-summary: Automatisch generierte Liste verwaister Dokumente.
----
-
-## Weltgewebe Orphans
-
-Generated automatically. Do not edit.
-
-HEADER
-
-python3 -c "
-import os
-from collections import defaultdict
-import re
-
-out_file = 'docs/_generated/orphans.md'
-backlinks = defaultdict(list)
-all_docs = set()
-
-def extract_relations(content):
-    relations = {}
-    if content.startswith('---'):
-        parts = content.split('---', 2)
-        if len(parts) >= 3:
-            fm_str = parts[1]
-            lines = fm_str.strip().split('\n')
-            current_key = None
-            for line in lines:
-                line = line.strip()
-                if not line:
-                    continue
-                if ':' in line and not line.startswith('- '):
-                    key, val = line.split(':', 1)
-                    key = key.strip()
-                    val = val.strip()
-                    current_key = key
-                    if val and val != '[]':
-                        if val.startswith('[') and val.endswith(']'):
-                            items = [i.strip() for i in val[1:-1].split(',') if i.strip()]
-                            relations[key] = items
-                        else:
-                            relations[key] = [val]
-                    else:
-                        relations[key] = []
-                elif line.startswith('- ') and current_key:
-                    val = line[2:].strip()
-                    if current_key not in relations:
-                        relations[current_key] = []
-                    relations[current_key].append(val)
-    return relations
-
-for root, dirs, files in os.walk('docs'):
-    if '_generated' in root:
-        continue
-    for file in files:
-        if file.endswith('.md'):
-            all_docs.add(os.path.join(root, file))
-
-for file in all_docs:
-    try:
-        with open(file, 'r', encoding='utf-8') as f:
-            content = f.read()
-            fm = extract_relations(content)
-            for rel in ['related_docs', 'documents', 'depends_on', 'supersedes']:
-                if rel in fm and fm[rel]:
-                    targets = fm[rel]
-                    for t in targets:
-                        backlinks[t].append(file)
-    except Exception:
-        pass
-
-orphans = []
-for file in all_docs:
-    if file.endswith('index.md') or file.endswith('README.md'):
-        continue
-
-    is_targeted = file in backlinks
-
-    has_outgoing = False
-    try:
-        with open(file, 'r', encoding='utf-8') as f:
-            content = f.read()
-            fm = extract_relations(content)
-            for rel in ['related_docs', 'documents', 'depends_on', 'supersedes', 'implemented_by']:
-                if rel in fm and fm[rel]:
-                    has_outgoing = True
-                    break
-    except Exception:
-        pass
-
-    if not is_targeted and not has_outgoing:
-        orphans.append(file)
-
-with open(out_file, 'a', encoding='utf-8') as f:
-    if not orphans:
-        f.write('_No orphans found._\n')
-    else:
-        for o in sorted(orphans):
-            f.write(f'- {o}\n')
-
-print(f'Generated {out_file}')
-"
diff --git a/scripts/docmeta/relations_parser.py b/scripts/docmeta/relations_parser.py
new file mode 100644
index 00000000..0a192112
--- /dev/null
+++ b/scripts/docmeta/relations_parser.py
@@ -0,0 +1,119 @@
+"""
+Centralized relations parser — single source of truth for extracting
+relations[] from YAML frontmatter content strings.
+
+All tools that need to read relations from markdown files MUST use this
+module. No duplicate parsing logic anywhere else in the repository.
+"""
+
+import os
+
+
+def extract_relations_from_content(content):
+    """
+    Parse structured relations[] from YAML frontmatter content string.
+
+    Returns a list of entries found in the relations block. Each entry is
+    typically a dict preserving ALL keys found per relation entry (not just
+    type/target), so downstream validation can detect unexpected keys,
+    missing keys, and structural issues in real files.
+
+    Bare list items that are not key-value dicts are returned as-is (strings).
+    Consumers must handle non-dict entries defensively (e.g. isinstance check).
+    """
+    relations = []
+    if not content.startswith("---"):
+        return relations
+
+    parts = content.split("---", 2)
+    if len(parts) < 3:
+        return relations
+
+    fm_str = parts[1]
+    lines = fm_str.strip().split("\n")
+    in_relations = False
+    current_entry = None
+
+    for line in lines:
+        stripped = line.strip()
+        if not stripped:
+            continue
+
+        # Detect top-level key (not indented)
+        if not line[0:1] in (" ", "\t") and ":" in stripped:
+            key = stripped.split(":")[0].strip()
+            if key == "relations":
+                in_relations = True
+                # Handle inline empty: relations: []
+                val = stripped.split(":", 1)[1].strip()
+                if val == "[]":
+                    in_relations = False
+            else:
+                in_relations = False
+            # Flush pending entry before leaving relations block
+            if current_entry:
+                relations.append(current_entry)
+                current_entry = None
+            continue
+
+        if in_relations:
+            if stripped.startswith("- "):
+                # New list item — flush previous entry
+                if current_entry:
+                    relations.append(current_entry)
+                    current_entry = None
+
+                item = stripped[2:]  # strip leading "- "
+                if ":" in item:
+                    key = item.split(":", 1)[0].strip()
+                    val = item.split(":", 1)[1].strip()
+                    current_entry = {key: val}
+                else:
+                    # Bare list item (not a dict) — record as non-dict entry
+                    relations.append(item)
+            elif ":" in stripped and current_entry is not None:
+                # Continuation key within the current dict entry
+                key = stripped.split(":", 1)[0].strip()
+                val = stripped.split(":", 1)[1].strip()
+                current_entry[key] = val
+
+    # Flush any pending entry
+    if current_entry:
+        relations.append(current_entry)
+
+    return relations
+
+
+def collect_file_relations(scan_dirs, repo_root, exclude_generated=True):
+    """
+    Walk directories and collect all relations from markdown files.
+
+    Args:
+        scan_dirs: list of directory names relative to repo_root (e.g. ["docs"])
+        repo_root: absolute path to the repository root
+        exclude_generated: if True, skip '_generated' directories
+
+    Returns:
+        dict mapping repo-root-relative file path -> list of relation dicts
+    """
+    all_relations = {}
+    for scan_dir in scan_dirs:
+        dir_path = os.path.join(repo_root, scan_dir)
+        if not os.path.isdir(dir_path):
+            continue
+        for root, dirs, files in os.walk(dir_path):
+            if exclude_generated and "_generated" in root:
+                continue
+            for file in sorted(files):
+                if not file.endswith(".md"):
+                    continue
+                abs_path = os.path.join(root, file)
+                rel_path = os.path.relpath(abs_path, repo_root)
+                try:
+                    with open(abs_path, "r", encoding="utf-8") as f:
+                        content = f.read()
+                except Exception:
+                    continue
+                rels = extract_relations_from_content(content)
+                all_relations[rel_path] = rels
+    return all_relations
diff --git a/scripts/docmeta/review_impact.py b/scripts/docmeta/review_impact.py
index e7b92d9c..83d74cac 100644
--- a/scripts/docmeta/review_impact.py
+++ b/scripts/docmeta/review_impact.py
@@ -2,7 +2,7 @@
 import sys
 import json
 
-from scripts.docmeta.docmeta import REPO_ROOT, parse_repo_index, parse_frontmatter, parse_review_policy, normalize_list_field
+from scripts.docmeta.docmeta import REPO_ROOT, parse_repo_index, parse_frontmatter, parse_review_policy, normalize_list_field, extract_depends_on
 
 def main():
     try:
@@ -48,7 +48,7 @@ def main():
             id_to_file[doc_id] = rel_file_path
             file_to_id[rel_file_path] = doc_id
 
-            depends_on = normalize_list_field(frontmatter.get('depends_on', []))
+            depends_on = extract_depends_on(frontmatter)
 
             forward_deps[doc_id] = depends_on
 
diff --git a/scripts/docmeta/tests/test_generate_relates_to_audit.py b/scripts/docmeta/tests/test_generate_relates_to_audit.py
new file mode 100644
index 00000000..c177b3eb
--- /dev/null
+++ b/scripts/docmeta/tests/test_generate_relates_to_audit.py
@@ -0,0 +1,198 @@
+import unittest
+
+from scripts.docmeta.generate_relates_to_audit import (
+    compute_per_doc_type_counts,
+    find_supersedes_gaps,
+    find_relates_to_clusters,
+    _check_supersession_pattern,
+    collect_negative_examples,
+)
+
+
+class TestPerDocTypeCounts(unittest.TestCase):
+    """Tests for per-document relation type counting."""
+
+    def test_empty(self):
+        counts = compute_per_doc_type_counts([])
+        self.assertEqual(counts, {})
+
+    def test_single_doc(self):
+        edges = [
+            ("a.md", "relates_to", "b.md"),
+            ("a.md", "depends_on", "c.md"),
+            ("a.md", "relates_to", "d.md"),
+        ]
+        counts = compute_per_doc_type_counts(edges)
+        self.assertEqual(counts["a.md"]["relates_to"], 2)
+        self.assertEqual(counts["a.md"]["depends_on"], 1)
+        self.assertEqual(counts["a.md"]["total"], 3)
+
+    def test_multiple_docs(self):
+        edges = [
+            ("a.md", "relates_to", "b.md"),
+            ("b.md", "supersedes", "c.md"),
+        ]
+        counts = compute_per_doc_type_counts(edges)
+        self.assertEqual(counts["a.md"]["total"], 1)
+        self.assertEqual(counts["b.md"]["total"], 1)
+        self.assertEqual(counts["b.md"]["supersedes"], 1)
+
+
+class TestSupersedesGaps(unittest.TestCase):
+    """Tests for supersedes gap detection."""
+
+    def test_no_gaps_different_names(self):
+        gaps = find_supersedes_gaps({"docs/foo.md", "docs/bar.md"})
+        self.assertEqual(gaps, [])
+
+    def test_v2_suffix_detected(self):
+        gaps = find_supersedes_gaps({"docs/foo.md", "docs/foo-v2.md"})
+        self.assertEqual(len(gaps), 1)
+        self.assertIn("v2", gaps[0][2])
+
+    def test_deprecated_suffix_detected(self):
+        gaps = find_supersedes_gaps({"docs/api.md", "docs/api-deprecated.md"})
+        self.assertEqual(len(gaps), 1)
+        self.assertIn("deprecated", gaps[0][2])
+
+    def test_different_directories_no_match(self):
+        gaps = find_supersedes_gaps({"docs/a/foo.md", "docs/b/foo-v2.md"})
+        self.assertEqual(gaps, [])
+
+    def test_no_false_positive_unrelated(self):
+        gaps = find_supersedes_gaps({"docs/vision.md", "docs/techstack.md"})
+        self.assertEqual(gaps, [])
+
+
+class TestSupersessionPattern(unittest.TestCase):
+    """Tests for the supersession pattern heuristic."""
+
+    def test_v2_match(self):
+        result = _check_supersession_pattern("foo", "foo-v2")
+        self.assertIsNotNone(result)
+
+    def test_legacy_match(self):
+        result = _check_supersession_pattern("api", "api-legacy")
+        self.assertIsNotNone(result)
+
+    def test_no_match(self):
+        result = _check_supersession_pattern("vision", "techstack")
+        self.assertIsNone(result)
+
+    def test_reverse_order(self):
+        result = _check_supersession_pattern("foo-new", "foo")
+        self.assertIsNotNone(result)
+
+
+class TestRelatesToClusters(unittest.TestCase):
+    """Tests for relates_to cluster analysis."""
+
+    def test_empty(self):
+        clusters = find_relates_to_clusters([])
+        self.assertEqual(clusters, [])
+
+    def test_single_cluster(self):
+        edges = [
+            ("a.md", "relates_to", "b.md"),
+            ("b.md", "relates_to", "c.md"),
+        ]
+        clusters = find_relates_to_clusters(edges)
+        self.assertEqual(len(clusters), 1)
+        self.assertEqual(len(clusters[0]), 3)
+
+    def test_two_clusters(self):
+        edges = [
+            ("a.md", "relates_to", "b.md"),
+            ("c.md", "relates_to", "d.md"),
+        ]
+        clusters = find_relates_to_clusters(edges)
+        self.assertEqual(len(clusters), 2)
+        self.assertEqual(len(clusters[0]), 2)
+        self.assertEqual(len(clusters[1]), 2)
+
+    def test_depends_on_ignored(self):
+        edges = [
+            ("a.md", "depends_on", "b.md"),
+            ("c.md", "relates_to", "d.md"),
+        ]
+        clusters = find_relates_to_clusters(edges)
+        self.assertEqual(len(clusters), 1)
+        self.assertNotIn("a.md", clusters[0])
+
+    def test_sorted_by_size(self):
+        edges = [
+            ("a.md", "relates_to", "b.md"),
+            ("c.md", "relates_to", "d.md"),
+            ("c.md", "relates_to", "e.md"),
+        ]
+        clusters = find_relates_to_clusters(edges)
+        self.assertTrue(len(clusters[0]) >= len(clusters[1]))
+
+
+class TestCollectNegativeExamples(unittest.TestCase):
+    """Tests for concrete example collection."""
+
+    def test_empty(self):
+        result = collect_negative_examples([], {})
+        self.assertEqual(result, [])
+
+    def test_collects_examples(self):
+        edges = [
+            ("a.md", "relates_to", "b.md"),
+            ("a.md", "relates_to", "c.md"),
+            ("a.md", "relates_to", "d.md"),
+        ]
+        doc_counts = {
+            "a.md": {"relates_to": 3, "depends_on": 0, "supersedes": 0, "total": 3},
+        }
+        result = collect_negative_examples(edges, doc_counts, max_examples=3)
+        self.assertEqual(len(result), 1)
+        self.assertEqual(result[0][0], "a.md")
+        self.assertEqual(len(result[0][1]), 3)
+
+    def test_respects_max_examples(self):
+        edges = [
+            ("a.md", "relates_to", "x.md"),
+            ("a.md", "relates_to", "y.md"),
+            ("b.md", "relates_to", "x.md"),
+            ("b.md", "relates_to", "z.md"),
+            ("c.md", "relates_to", "x.md"),
+            ("c.md", "relates_to", "w.md"),
+            ("d.md", "relates_to", "x.md"),
+            ("d.md", "relates_to", "v.md"),
+        ]
+        doc_counts = {
+            "a.md": {"relates_to": 2, "depends_on": 0, "supersedes": 0, "total": 2},
+            "b.md": {"relates_to": 2, "depends_on": 0, "supersedes": 0, "total": 2},
+            "c.md": {"relates_to": 2, "depends_on": 0, "supersedes": 0, "total": 2},
+            "d.md": {"relates_to": 2, "depends_on": 0, "supersedes": 0, "total": 2},
+        }
+        result = collect_negative_examples(edges, doc_counts, max_examples=2)
+        self.assertEqual(len(result), 2)
+
+    def test_single_relation_excluded(self):
+        edges = [("a.md", "relates_to", "b.md")]
+        doc_counts = {
+            "a.md": {"relates_to": 1, "depends_on": 0, "supersedes": 0, "total": 1},
+        }
+        result = collect_negative_examples(edges, doc_counts)
+        self.assertEqual(result, [])
+
+    def test_sorted_by_most_relates_to(self):
+        edges = [
+            ("a.md", "relates_to", "x.md"),
+            ("a.md", "relates_to", "y.md"),
+            ("b.md", "relates_to", "x.md"),
+            ("b.md", "relates_to", "y.md"),
+            ("b.md", "relates_to", "z.md"),
+        ]
+        doc_counts = {
+            "a.md": {"relates_to": 2, "depends_on": 0, "supersedes": 0, "total": 2},
+            "b.md": {"relates_to": 3, "depends_on": 0, "supersedes": 0, "total": 3},
+        }
+        result = collect_negative_examples(edges, doc_counts, max_examples=2)
+        self.assertEqual(result[0][0], "b.md")
+
+
+if __name__ == "__main__":
+    unittest.main()
diff --git a/scripts/docmeta/tests/test_generate_relations_analysis.py b/scripts/docmeta/tests/test_generate_relations_analysis.py
new file mode 100644
index 00000000..87833633
--- /dev/null
+++ b/scripts/docmeta/tests/test_generate_relations_analysis.py
@@ -0,0 +1,224 @@
+import unittest
+from collections import defaultdict
+
+from scripts.docmeta.generate_relations_analysis import (
+    find_cycles,
+    compute_degree_stats,
+    find_isolated_docs,
+    find_hubs,
+    compute_type_distribution,
+    generate_warnings,
+    HUB_OUTBOUND_THRESHOLD,
+    HUB_INBOUND_THRESHOLD,
+)
+
+
+class TestFindCycles(unittest.TestCase):
+    """Tests for depends_on cycle detection."""
+
+    def test_no_cycles_empty(self):
+        cycles = find_cycles([])
+        self.assertEqual(cycles, [])
+
+    def test_no_cycles_linear(self):
+        edges = [
+            ("a.md", "depends_on", "b.md"),
+            ("b.md", "depends_on", "c.md"),
+        ]
+        cycles = find_cycles(edges)
+        self.assertEqual(cycles, [])
+
+    def test_simple_cycle(self):
+        edges = [
+            ("a.md", "depends_on", "b.md"),
+            ("b.md", "depends_on", "a.md"),
+        ]
+        cycles = find_cycles(edges)
+        self.assertTrue(len(cycles) > 0)
+        # Cycle should contain both nodes
+        cycle_nodes = set()
+        for cycle in cycles:
+            cycle_nodes.update(cycle)
+        self.assertIn("a.md", cycle_nodes)
+        self.assertIn("b.md", cycle_nodes)
+
+    def test_three_node_cycle(self):
+        edges = [
+            ("a.md", "depends_on", "b.md"),
+            ("b.md", "depends_on", "c.md"),
+            ("c.md", "depends_on", "a.md"),
+        ]
+        cycles = find_cycles(edges)
+        self.assertTrue(len(cycles) > 0)
+
+    def test_relates_to_ignored(self):
+        # relates_to edges should NOT trigger cycle detection
+        edges = [
+            ("a.md", "relates_to", "b.md"),
+            ("b.md", "relates_to", "a.md"),
+        ]
+        cycles = find_cycles(edges)
+        self.assertEqual(cycles, [])
+
+    def test_supersedes_ignored(self):
+        edges = [
+            ("a.md", "supersedes", "b.md"),
+            ("b.md", "supersedes", "a.md"),
+        ]
+        cycles = find_cycles(edges)
+        self.assertEqual(cycles, [])
+
+
+class TestDegreeStats(unittest.TestCase):
+    """Tests for degree computation."""
+
+    def test_empty(self):
+        stats = compute_degree_stats([], set())
+        self.assertEqual(stats, {})
+
+    def test_basic_counts(self):
+        all_docs = {"a.md", "b.md", "c.md"}
+        edges = [
+            ("a.md", "relates_to", "b.md"),
+            ("a.md", "depends_on", "c.md"),
+            ("b.md", "relates_to", "c.md"),
+        ]
+        stats = compute_degree_stats(edges, all_docs)
+        self.assertEqual(stats["a.md"]["outbound"], 2)
+        self.assertEqual(stats["a.md"]["inbound"], 0)
+        self.assertEqual(stats["b.md"]["outbound"], 1)
+        self.assertEqual(stats["b.md"]["inbound"], 1)
+        self.assertEqual(stats["c.md"]["outbound"], 0)
+        self.assertEqual(stats["c.md"]["inbound"], 2)
+
+
+class TestFindIsolated(unittest.TestCase):
+    """Tests for isolated document detection."""
+
+    def test_no_isolated(self):
+        stats = {
+            "docs/a.md": {"outbound": 1, "inbound": 0},
+            "docs/b.md": {"outbound": 0, "inbound": 1},
+        }
+        isolated = find_isolated_docs(stats)
+        self.assertEqual(isolated, [])
+
+    def test_isolated_found(self):
+        stats = {
+            "docs/a.md": {"outbound": 1, "inbound": 0},
+            "docs/lonely.md": {"outbound": 0, "inbound": 0},
+        }
+        isolated = find_isolated_docs(stats)
+        self.assertEqual(isolated, ["docs/lonely.md"])
+
+    def test_index_excluded(self):
+        stats = {
+            "docs/index.md": {"outbound": 0, "inbound": 0},
+            "docs/foo/README.md": {"outbound": 0, "inbound": 0},
+        }
+        isolated = find_isolated_docs(stats)
+        self.assertEqual(isolated, [])
+
+
+class TestFindHubs(unittest.TestCase):
+    """Tests for hub detection."""
+
+    def test_no_hubs(self):
+        stats = {
+            "docs/a.md": {
+                "outbound": 1, "inbound": 1,
+                "outbound_by_type": defaultdict(int),
+                "inbound_by_type": defaultdict(int),
+            },
+        }
+        outbound, inbound = find_hubs(stats)
+        self.assertEqual(outbound, [])
+        self.assertEqual(inbound, [])
+
+    def test_outbound_hub(self):
+        stats = {
+            "docs/hub.md": {
+                "outbound": HUB_OUTBOUND_THRESHOLD,
+                "inbound": 0,
+                "outbound_by_type": defaultdict(int),
+                "inbound_by_type": defaultdict(int),
+            },
+        }
+        outbound, inbound = find_hubs(stats)
+        self.assertEqual(len(outbound), 1)
+        self.assertEqual(outbound[0][0], "docs/hub.md")
+
+    def test_inbound_hub(self):
+        stats = {
+            "docs/central.md": {
+                "outbound": 0,
+                "inbound": HUB_INBOUND_THRESHOLD,
+                "outbound_by_type": defaultdict(int),
+                "inbound_by_type": defaultdict(int),
+            },
+        }
+        outbound, inbound = find_hubs(stats)
+        self.assertEqual(len(inbound), 1)
+        self.assertEqual(inbound[0][0], "docs/central.md")
+
+
+class TestTypeDistribution(unittest.TestCase):
+    """Tests for type distribution counting."""
+
+    def test_empty(self):
+        dist = compute_type_distribution([])
+        self.assertEqual(dist, {})
+
+    def test_counts(self):
+        edges = [
+            ("a.md", "relates_to", "b.md"),
+            ("a.md", "relates_to", "c.md"),
+            ("b.md", "depends_on", "c.md"),
+            ("c.md", "supersedes", "d.md"),
+        ]
+        dist = compute_type_distribution(edges)
+        self.assertEqual(dist["relates_to"], 2)
+        self.assertEqual(dist["depends_on"], 1)
+        self.assertEqual(dist["supersedes"], 1)
+
+
+class TestGenerateWarnings(unittest.TestCase):
+    """Tests for warning generation."""
+
+    def test_no_warnings(self):
+        edges = [("a.md", "relates_to", "b.md")]
+        stats = {
+            "a.md": {
+                "outbound": 1, "inbound": 0,
+                "outbound_by_type": defaultdict(int),
+                "inbound_by_type": defaultdict(int),
+            },
+            "b.md": {
+                "outbound": 0, "inbound": 1,
+                "outbound_by_type": defaultdict(int),
+                "inbound_by_type": defaultdict(int),
+            },
+        }
+        warnings = generate_warnings(edges, stats, [])
+        self.assertEqual(warnings, [])
+
+    def test_cycle_warning(self):
+        cycles = [["a.md", "b.md", "a.md"]]
+        warnings = generate_warnings([], {}, cycles)
+        self.assertTrue(any("cycle" in w for w in warnings))
+
+    def test_hub_warning(self):
+        stats = {
+            "docs/hub.md": {
+                "outbound": HUB_OUTBOUND_THRESHOLD + 1,
+                "inbound": 0,
+                "outbound_by_type": defaultdict(int),
+                "inbound_by_type": defaultdict(int),
+            },
+        }
+        warnings = generate_warnings([], stats, [])
+        self.assertTrue(any("outbound" in w.lower() or "over-linking" in w for w in warnings))
+
+
+if __name__ == "__main__":
+    unittest.main()
diff --git a/scripts/docmeta/tests/test_relations_parser.py b/scripts/docmeta/tests/test_relations_parser.py
new file mode 100644
index 00000000..22eb583f
--- /dev/null
+++ b/scripts/docmeta/tests/test_relations_parser.py
@@ -0,0 +1,335 @@
+"""
+Tests for the centralized relations parser and cross-tool consistency.
+
+Proves:
+1. relations_parser.py is the single source of truth
+2. All tools use the same parser (no divergent interpretations)
+3. parse_frontmatter() handles relations as List[Dict]
+4. collect_file_relations() works correctly
+"""
+
+import os
+import tempfile
+import unittest
+
+from scripts.docmeta.relations_parser import (
+    extract_relations_from_content,
+    collect_file_relations,
+)
+from scripts.docmeta.docmeta import parse_frontmatter, extract_depends_on
+
+
+class TestRelationsParserCentralized(unittest.TestCase):
+    """Tests that the centralized parser is the canonical implementation."""
+
+    def test_basic_extraction(self):
+        content = (
+            "---\n"
+            "id: test\n"
+            "relations:\n"
+            "  - type: relates_to\n"
+            "    target: docs/foo.md\n"
+            "  - type: supersedes\n"
+            "    target: docs/bar.md\n"
+            "---\n"
+            "body\n"
+        )
+        rels = extract_relations_from_content(content)
+        self.assertEqual(len(rels), 2)
+        self.assertEqual(rels[0], {"type": "relates_to", "target": "docs/foo.md"})
+        self.assertEqual(rels[1], {"type": "supersedes", "target": "docs/bar.md"})
+
+    def test_extra_keys_preserved(self):
+        """Extra keys MUST survive parsing so validators can reject them."""
+        content = (
+            "---\n"
+            "id: test\n"
+            "relations:\n"
+            "  - type: relates_to\n"
+            "    target: docs/foo.md\n"
+            "    label: something\n"
+            "---\n"
+        )
+        rels = extract_relations_from_content(content)
+        self.assertEqual(len(rels), 1)
+        self.assertIn("label", rels[0])
+        self.assertEqual(rels[0]["label"], "something")
+
+    def test_missing_type_not_dropped(self):
+        """Entry with target but no type must NOT be silently dropped."""
+        content = (
+            "---\n"
+            "id: test\n"
+            "relations:\n"
+            "  - target: docs/foo.md\n"
+            "---\n"
+        )
+        rels = extract_relations_from_content(content)
+        self.assertEqual(len(rels), 1)
+        self.assertIn("target", rels[0])
+        self.assertNotIn("type", rels[0])
+
+    def test_missing_target_not_dropped(self):
+        """Entry with type but no target must NOT be silently dropped."""
+        content = (
+            "---\n"
+            "id: test\n"
+            "relations:\n"
+            "  - type: relates_to\n"
+            "---\n"
+        )
+        rels = extract_relations_from_content(content)
+        self.assertEqual(len(rels), 1)
+        self.assertIn("type", rels[0])
+        self.assertNotIn("target", rels[0])
+
+    def test_empty_relations_list(self):
+        content = "---\nid: test\nrelations: []\n---\nbody\n"
+        rels = extract_relations_from_content(content)
+        self.assertEqual(rels, [])
+
+    def test_no_frontmatter(self):
+        content = "Just a markdown file."
+        rels = extract_relations_from_content(content)
+        self.assertEqual(rels, [])
+
+    def test_bare_list_item_returned_as_string(self):
+        """Bare list items (not key-value dicts) are returned as strings."""
+        content = (
+            "---\n"
+            "id: test\n"
+            "relations:\n"
+            "  - just-a-string\n"
+            "---\n"
+        )
+        rels = extract_relations_from_content(content)
+        self.assertEqual(len(rels), 1)
+        self.assertIsInstance(rels[0], str)
+
+
+class TestCollectFileRelations(unittest.TestCase):
+    """Tests for collect_file_relations helper."""
+
+    def test_collects_from_directory(self):
+        with tempfile.TemporaryDirectory() as tmpdir:
+            docs_dir = os.path.join(tmpdir, "docs")
+            os.makedirs(docs_dir)
+
+            # File with relations
+            with open(os.path.join(docs_dir, "a.md"), "w") as f:
+                f.write(
+                    "---\nid: a\nrelations:\n"
+                    "  - type: relates_to\n"
+                    "    target: docs/b.md\n"
+                    "---\n"
+                )
+
+            # File without relations
+            with open(os.path.join(docs_dir, "b.md"), "w") as f:
+                f.write("---\nid: b\nrelations: []\n---\n")
+
+            result = collect_file_relations(["docs"], tmpdir)
+            self.assertIn("docs/a.md", result)
+            self.assertIn("docs/b.md", result)
+            self.assertEqual(len(result["docs/a.md"]), 1)
+            self.assertEqual(result["docs/a.md"][0]["type"], "relates_to")
+            self.assertEqual(result["docs/b.md"], [])
+
+    def test_excludes_generated(self):
+        with tempfile.TemporaryDirectory() as tmpdir:
+            gen_dir = os.path.join(tmpdir, "docs", "_generated")
+            os.makedirs(gen_dir)
+            with open(os.path.join(gen_dir, "index.md"), "w") as f:
+                f.write("---\nid: gen\n---\n")
+
+            result = collect_file_relations(["docs"], tmpdir)
+            self.assertNotIn("docs/_generated/index.md", result)
+
+    def test_nonexistent_dir_skipped(self):
+        with tempfile.TemporaryDirectory() as tmpdir:
+            result = collect_file_relations(["nonexistent"], tmpdir)
+            self.assertEqual(result, {})
+
+
+class TestParseFrontmatterRelations(unittest.TestCase):
+    """Tests that parse_frontmatter() handles relations as List[Dict]."""
+
+    def test_relations_as_list_of_dicts(self):
+        content = (
+            "---\n"
+            "id: test\n"
+            "title: Test\n"
+            "relations:\n"
+            "  - type: relates_to\n"
+            "    target: docs/foo.md\n"
+            "  - type: depends_on\n"
+            "    target: docs/bar.md\n"
+            "---\n"
+        )
+        with tempfile.NamedTemporaryFile(
+            mode="w", suffix=".md", delete=False, encoding="utf-8"
+        ) as f:
+            f.write(content)
+            path = f.name
+
+        try:
+            data = parse_frontmatter(path)
+            self.assertIsNotNone(data)
+            rels = data.get("relations", [])
+            self.assertIsInstance(rels, list)
+            self.assertEqual(len(rels), 2)
+            # Must be dicts, not strings
+            self.assertIsInstance(rels[0], dict)
+            self.assertIsInstance(rels[1], dict)
+            self.assertEqual(rels[0]["type"], "relates_to")
+            self.assertEqual(rels[0]["target"], "docs/foo.md")
+            self.assertEqual(rels[1]["type"], "depends_on")
+            self.assertEqual(rels[1]["target"], "docs/bar.md")
+        finally:
+            os.remove(path)
+
+    def test_empty_relations_inline(self):
+        content = "---\nid: test\nrelations: []\n---\n"
+        with tempfile.NamedTemporaryFile(
+            mode="w", suffix=".md", delete=False, encoding="utf-8"
+        ) as f:
+            f.write(content)
+            path = f.name
+
+        try:
+            data = parse_frontmatter(path)
+            self.assertIsNotNone(data)
+            self.assertEqual(data.get("relations"), [])
+        finally:
+            os.remove(path)
+
+    def test_relations_with_extra_keys_preserved(self):
+        """parse_frontmatter must preserve extra keys in relation dicts."""
+        content = (
+            "---\n"
+            "id: test\n"
+            "relations:\n"
+            "  - type: relates_to\n"
+            "    target: docs/foo.md\n"
+            "    note: extra\n"
+            "---\n"
+        )
+        with tempfile.NamedTemporaryFile(
+            mode="w", suffix=".md", delete=False, encoding="utf-8"
+        ) as f:
+            f.write(content)
+            path = f.name
+
+        try:
+            data = parse_frontmatter(path)
+            rels = data.get("relations", [])
+            self.assertEqual(len(rels), 1)
+            self.assertIn("note", rels[0])
+            self.assertEqual(rels[0]["note"], "extra")
+        finally:
+            os.remove(path)
+
+    def test_relations_followed_by_other_fields(self):
+        """Relations block followed by other fields must parse correctly."""
+        content = (
+            "---\n"
+            "id: test\n"
+            "relations:\n"
+            "  - type: relates_to\n"
+            "    target: docs/foo.md\n"
+            "verifies_with:\n"
+            "  - scripts/check.py\n"
+            "---\n"
+        )
+        with tempfile.NamedTemporaryFile(
+            mode="w", suffix=".md", delete=False, encoding="utf-8"
+        ) as f:
+            f.write(content)
+            path = f.name
+
+        try:
+            data = parse_frontmatter(path)
+            rels = data.get("relations", [])
+            self.assertEqual(len(rels), 1)
+            self.assertIsInstance(rels[0], dict)
+            self.assertEqual(rels[0]["type"], "relates_to")
+            vw = data.get("verifies_with", [])
+            self.assertEqual(vw, ["scripts/check.py"])
+        finally:
+            os.remove(path)
+
+
+class TestExtractDependsOnWithDicts(unittest.TestCase):
+    """Tests that extract_depends_on works with proper dict-based relations."""
+
+    def test_filters_depends_on(self):
+        fm = {
+            "relations": [
+                {"type": "relates_to", "target": "docs/a.md"},
+                {"type": "depends_on", "target": "docs/b.md"},
+                {"type": "depends_on", "target": "docs/c.md"},
+            ]
+        }
+        deps = extract_depends_on(fm)
+        self.assertEqual(deps, ["docs/b.md", "docs/c.md"])
+
+    def test_empty_relations(self):
+        fm = {"relations": []}
+        deps = extract_depends_on(fm)
+        self.assertEqual(deps, [])
+
+    def test_no_relations_key(self):
+        fm = {}
+        deps = extract_depends_on(fm)
+        self.assertEqual(deps, [])
+
+
+class TestParserConsistency(unittest.TestCase):
+    """
+    Proves that the centralized parser and parse_frontmatter
+    produce consistent results for the same input.
+    """
+
+    def test_same_relations_from_both_paths(self):
+        """Both parsing paths must extract identical relation data."""
+        content = (
+            "---\n"
+            "id: consistency-test\n"
+            "title: Test\n"
+            "status: active\n"
+            "summary: Testing parser consistency.\n"
+            "relations:\n"
+            "  - type: relates_to\n"
+            "    target: docs/vision.md\n"
+            "  - type: depends_on\n"
+            "    target: docs/datenmodell.md\n"
+            "  - type: supersedes\n"
+            "    target: docs/old.md\n"
+            "---\n"
+            "Body text.\n"
+        )
+
+        # Path 1: centralized parser
+        rels_from_parser = extract_relations_from_content(content)
+
+        # Path 2: parse_frontmatter
+        with tempfile.NamedTemporaryFile(
+            mode="w", suffix=".md", delete=False, encoding="utf-8"
+        ) as f:
+            f.write(content)
+            path = f.name
+
+        try:
+            fm = parse_frontmatter(path)
+            rels_from_frontmatter = fm.get("relations", [])
+        finally:
+            os.remove(path)
+
+        # Both must produce the same result
+        self.assertEqual(len(rels_from_parser), len(rels_from_frontmatter))
+        for p, f in zip(rels_from_parser, rels_from_frontmatter):
+            self.assertEqual(p, f)
+
+
+if __name__ == "__main__":
+    unittest.main()
diff --git a/scripts/docmeta/tests/test_validate_relations.py b/scripts/docmeta/tests/test_validate_relations.py
new file mode 100644
index 00000000..f1849786
--- /dev/null
+++ b/scripts/docmeta/tests/test_validate_relations.py
@@ -0,0 +1,271 @@
+import os
+import tempfile
+import unittest
+
+from scripts.docmeta.validate_relations import (
+    validate_relations,
+    ALLOWED_TYPES,
+)
+from scripts.docmeta.relations_parser import extract_relations_from_content
+
+
+class TestValidateRelations(unittest.TestCase):
+    """Tests for validate_relations() — the core validation logic."""
+
+    def test_no_relations_field(self):
+        errors = validate_relations("docs/foo.md", {})
+        self.assertEqual(errors, [])
+
+    def test_empty_relations_list(self):
+        errors = validate_relations("docs/foo.md", {"relations": []})
+        self.assertEqual(errors, [])
+
+    def test_relations_not_a_list(self):
+        errors = validate_relations("docs/foo.md", {"relations": "bad"})
+        self.assertEqual(len(errors), 1)
+        self.assertIn("must be a list", errors[0])
+
+    def test_valid_relation(self):
+        # Create a temp file to act as the target
+        with tempfile.NamedTemporaryFile(
+            mode="w", suffix=".md", dir=os.environ.get("REPO_ROOT", "."), delete=False
+        ) as f:
+            f.write("---\nid: test\n---\n")
+            target_path = os.path.relpath(f.name, os.environ.get("REPO_ROOT", "."))
+
+        try:
+            fm = {"relations": [{"type": "relates_to", "target": target_path}]}
+            errors = validate_relations("docs/bar.md", fm)
+            self.assertEqual(errors, [])
+        finally:
+            os.remove(f.name)
+
+    def test_unknown_type(self):
+        fm = {"relations": [{"type": "implements", "target": "docs/something.md"}]}
+        errors = validate_relations("docs/foo.md", fm)
+        self.assertTrue(any("unknown relation type 'implements'" in e for e in errors))
+
+    def test_missing_type(self):
+        fm = {"relations": [{"target": "docs/something.md"}]}
+        errors = validate_relations("docs/foo.md", fm)
+        self.assertTrue(any("missing required key 'type'" in e for e in errors))
+
+    def test_missing_target(self):
+        fm = {"relations": [{"type": "relates_to"}]}
+        errors = validate_relations("docs/foo.md", fm)
+        self.assertTrue(any("missing required key 'target'" in e for e in errors))
+
+    def test_empty_target(self):
+        fm = {"relations": [{"type": "relates_to", "target": ""}]}
+        errors = validate_relations("docs/foo.md", fm)
+        self.assertTrue(any("'target' must be a non-empty string" in e for e in errors))
+
+    def test_absolute_path_rejected(self):
+        fm = {"relations": [{"type": "relates_to", "target": "/docs/foo.md"}]}
+        errors = validate_relations("docs/bar.md", fm)
+        self.assertTrue(any("repo-root-relative, not absolute" in e for e in errors))
+
+    def test_nonexistent_target(self):
+        fm = {"relations": [{"type": "relates_to", "target": "docs/does-not-exist-12345.md"}]}
+        errors = validate_relations("docs/foo.md", fm)
+        self.assertTrue(any("does not exist" in e for e in errors))
+
+    def test_self_reference(self):
+        fm = {"relations": [{"type": "relates_to", "target": "docs/foo.md"}]}
+        errors = validate_relations("docs/foo.md", fm)
+        self.assertTrue(any("self-reference" in e for e in errors))
+
+    def test_duplicate_relation(self):
+        fm = {
+            "relations": [
+                {"type": "relates_to", "target": "docs/target.md"},
+                {"type": "relates_to", "target": "docs/target.md"},
+            ]
+        }
+        errors = validate_relations("docs/foo.md", fm)
+        self.assertTrue(any("duplicate relation" in e for e in errors))
+
+    def test_extra_keys_rejected(self):
+        fm = {"relations": [{"type": "relates_to", "target": "docs/t.md", "label": "x"}]}
+        errors = validate_relations("docs/foo.md", fm)
+        self.assertTrue(any("unexpected keys" in e for e in errors))
+
+    def test_entry_not_dict(self):
+        fm = {"relations": ["just a string"]}
+        errors = validate_relations("docs/foo.md", fm)
+        self.assertTrue(any("expected object" in e for e in errors))
+
+    def test_allowed_types_exactly_three(self):
+        self.assertEqual(ALLOWED_TYPES, {"relates_to", "depends_on", "supersedes"})
+
+    def test_path_traversal_rejected(self):
+        """Targets with .. segments that escape the repo root must be rejected."""
+        fm = {"relations": [{"type": "relates_to", "target": "../../etc/passwd"}]}
+        errors = validate_relations("docs/foo.md", fm)
+        self.assertTrue(any("escapes repository root" in e or "does not exist" in e for e in errors))
+
+    def test_path_traversal_within_repo_ok(self):
+        """A target using .. but still resolving within the repo should not trigger
+        the traversal error (though it may fail the existence check)."""
+        # docs/../docs/foo.md resolves to docs/foo.md which is within repo
+        fm = {"relations": [{"type": "relates_to", "target": "docs/../docs/foo.md"}]}
+        errors = validate_relations("docs/bar.md", fm)
+        # Should NOT contain path traversal error
+        self.assertFalse(any("escapes repository root" in e for e in errors))
+
+
+class TestExtractRelationsFromContent(unittest.TestCase):
+    """Tests for extract_relations_from_content() — the YAML parser."""
+
+    def test_basic_extraction(self):
+        content = (
+            "---\n"
+            "id: test\n"
+            "relations:\n"
+            "  - type: relates_to\n"
+            "    target: docs/foo.md\n"
+            "  - type: supersedes\n"
+            "    target: docs/bar.md\n"
+            "---\n"
+            "body\n"
+        )
+        rels = extract_relations_from_content(content)
+        self.assertEqual(len(rels), 2)
+        self.assertEqual(rels[0], {"type": "relates_to", "target": "docs/foo.md"})
+        self.assertEqual(rels[1], {"type": "supersedes", "target": "docs/bar.md"})
+
+    def test_empty_relations_list(self):
+        content = "---\nid: test\nrelations: []\n---\nbody\n"
+        rels = extract_relations_from_content(content)
+        self.assertEqual(rels, [])
+
+    def test_no_relations_field(self):
+        content = "---\nid: test\ntitle: Hello\n---\nbody\n"
+        rels = extract_relations_from_content(content)
+        self.assertEqual(rels, [])
+
+    def test_no_frontmatter(self):
+        content = "Just a markdown file without frontmatter."
+        rels = extract_relations_from_content(content)
+        self.assertEqual(rels, [])
+
+    def test_relations_with_other_fields(self):
+        content = (
+            "---\n"
+            "id: test\n"
+            "title: Title\n"
+            "relations:\n"
+            "  - type: depends_on\n"
+            "    target: docs/dep.md\n"
+            "verifies_with:\n"
+            "  - scripts/check.py\n"
+            "---\n"
+        )
+        rels = extract_relations_from_content(content)
+        self.assertEqual(len(rels), 1)
+        self.assertEqual(rels[0], {"type": "depends_on", "target": "docs/dep.md"})
+
+    def test_single_relation(self):
+        content = (
+            "---\n"
+            "id: test\n"
+            "relations:\n"
+            "  - type: relates_to\n"
+            "    target: docs/only-one.md\n"
+            "---\n"
+        )
+        rels = extract_relations_from_content(content)
+        self.assertEqual(len(rels), 1)
+        self.assertEqual(rels[0]["target"], "docs/only-one.md")
+
+    def test_extra_keys_preserved_in_parser(self):
+        """Extra keys must survive parsing so validate_relations() can reject them."""
+        content = (
+            "---\n"
+            "id: test\n"
+            "relations:\n"
+            "  - type: relates_to\n"
+            "    target: docs/foo.md\n"
+            "    label: something\n"
+            "---\n"
+        )
+        rels = extract_relations_from_content(content)
+        self.assertEqual(len(rels), 1)
+        self.assertIn("label", rels[0])
+        self.assertEqual(rels[0]["label"], "something")
+
+    def test_missing_target_preserved(self):
+        """Entry with type but no target must be returned (not silently dropped)."""
+        content = (
+            "---\n"
+            "id: test\n"
+            "relations:\n"
+            "  - type: relates_to\n"
+            "---\n"
+        )
+        rels = extract_relations_from_content(content)
+        self.assertEqual(len(rels), 1)
+        self.assertIn("type", rels[0])
+        self.assertNotIn("target", rels[0])
+
+    def test_missing_type_preserved(self):
+        """Entry with target but no type must be returned (not silently dropped)."""
+        content = (
+            "---\n"
+            "id: test\n"
+            "relations:\n"
+            "  - target: docs/foo.md\n"
+            "---\n"
+        )
+        rels = extract_relations_from_content(content)
+        self.assertEqual(len(rels), 1)
+        self.assertIn("target", rels[0])
+        self.assertNotIn("type", rels[0])
+
+    def test_extra_keys_caught_end_to_end(self):
+        """Integration: extra keys in raw content produce validation errors."""
+        content = (
+            "---\n"
+            "id: test\n"
+            "relations:\n"
+            "  - type: relates_to\n"
+            "    target: docs/foo.md\n"
+            "    note: extra\n"
+            "---\n"
+        )
+        rels = extract_relations_from_content(content)
+        fm = {"relations": rels}
+        errors = validate_relations("docs/test.md", fm)
+        self.assertTrue(any("unexpected keys" in e for e in errors))
+
+    def test_missing_type_caught_end_to_end(self):
+        """Integration: entry with no type in raw content produces validation error."""
+        content = (
+            "---\n"
+            "id: test\n"
+            "relations:\n"
+            "  - target: docs/foo.md\n"
+            "---\n"
+        )
+        rels = extract_relations_from_content(content)
+        fm = {"relations": rels}
+        errors = validate_relations("docs/test.md", fm)
+        self.assertTrue(any("missing required key 'type'" in e for e in errors))
+
+    def test_missing_target_caught_end_to_end(self):
+        """Integration: entry with no target in raw content produces validation error."""
+        content = (
+            "---\n"
+            "id: test\n"
+            "relations:\n"
+            "  - type: relates_to\n"
+            "---\n"
+        )
+        rels = extract_relations_from_content(content)
+        fm = {"relations": rels}
+        errors = validate_relations("docs/test.md", fm)
+        self.assertTrue(any("missing required key 'target'" in e for e in errors))
+
+
+if __name__ == "__main__":
+    unittest.main()
diff --git a/scripts/docmeta/validate_relations.py b/scripts/docmeta/validate_relations.py
new file mode 100644
index 00000000..f80f7984
--- /dev/null
+++ b/scripts/docmeta/validate_relations.py
@@ -0,0 +1,157 @@
+"""
+Relations Guard — validates the structural and semantic integrity of relations[].
+
+Checks:
+1. Structure: relations is a list of objects with required keys (type, target)
+2. Allowed types: relates_to, depends_on, supersedes
+3. Target validity: target must be a repo-root-relative path to an existing file
+4. No duplicates: identical (type, target) pairs are rejected
+5. No self-references: a document must not point to itself
+6. No absolute paths in target
+7. No path traversal (target must resolve within the repository root)
+"""
+
+import os
+import sys
+
+from scripts.docmeta.docmeta import REPO_ROOT
+from scripts.docmeta.relations_parser import extract_relations_from_content
+
+ALLOWED_TYPES = {"relates_to", "depends_on", "supersedes"}
+
+
+def validate_relations(file_path, frontmatter):
+    """
+    Validate the relations[] field of a single document.
+
+    Args:
+        file_path: repo-root-relative path of the document (e.g. 'docs/vision.md')
+        frontmatter: parsed frontmatter dict
+
+    Returns:
+        list of error strings (empty = valid)
+    """
+    errors = []
+
+    relations = frontmatter.get("relations")
+
+    # relations field not present → OK (optional)
+    if relations is None:
+        return errors
+
+    # relations must be a list
+    if not isinstance(relations, list):
+        errors.append(f"{file_path}: 'relations' must be a list, got {type(relations).__name__}")
+        return errors
+
+    # Empty list is explicitly allowed
+    if len(relations) == 0:
+        return errors
+
+    seen = set()
+
+    for i, entry in enumerate(relations):
+        prefix = f"{file_path}: relations[{i}]"
+
+        # Each entry must be a dict (parsed from block list items)
+        if not isinstance(entry, dict):
+            errors.append(f"{prefix}: expected object with 'type' and 'target', got {type(entry).__name__}: {entry!r}")
+            continue
+
+        # Required keys
+        rel_type = entry.get("type")
+        target = entry.get("target")
+
+        if rel_type is None:
+            errors.append(f"{prefix}: missing required key 'type'")
+        elif not isinstance(rel_type, str) or not rel_type.strip():
+            errors.append(f"{prefix}: 'type' must be a non-empty string")
+        elif rel_type not in ALLOWED_TYPES:
+            errors.append(f"{prefix}: unknown relation type '{rel_type}' (allowed: {', '.join(sorted(ALLOWED_TYPES))})")
+
+        if target is None:
+            errors.append(f"{prefix}: missing required key 'target'")
+        elif not isinstance(target, str) or not target.strip():
+            errors.append(f"{prefix}: 'target' must be a non-empty string")
+        else:
+            # No absolute paths
+            if target.startswith("/"):
+                errors.append(f"{prefix}: target must be repo-root-relative, not absolute: '{target}'")
+
+            # No path traversal — target must resolve within REPO_ROOT
+            repo_root_real = os.path.realpath(REPO_ROOT)
+            abs_target = os.path.realpath(os.path.join(REPO_ROOT, target))
+            if not abs_target.startswith(repo_root_real + os.sep) and abs_target != repo_root_real:
+                errors.append(f"{prefix}: target '{target}' escapes repository root (path traversal)")
+
+            # Target must exist as a file
+            if not os.path.isfile(abs_target):
+                errors.append(f"{prefix}: target '{target}' does not exist")
+
+            # No self-references
+            if target == file_path:
+                errors.append(f"{prefix}: self-reference detected (document points to itself)")
+
+        # Duplicate check
+        if rel_type and target:
+            pair = (rel_type, target)
+            if pair in seen:
+                errors.append(f"{prefix}: duplicate relation ({rel_type}, {target})")
+            seen.add(pair)
+
+        # Extra keys check
+        extra_keys = set(entry.keys()) - {"type", "target"}
+        if extra_keys:
+            errors.append(f"{prefix}: unexpected keys {extra_keys}")
+
+    return errors
+
+
+def main():
+    errors = []
+
+    # Validate all directories that carry relations: in their frontmatter.
+    # This matches the repo-wide relations model documented in
+    # architecture/docmeta.schema.md.
+    scan_dirs = ["docs", "architecture", "runtime", "runbooks"]
+
+    for scan_dir in scan_dirs:
+        dir_path = os.path.join(REPO_ROOT, scan_dir)
+        if not os.path.isdir(dir_path):
+            continue
+        for root, dirs, files in os.walk(dir_path):
+            if "_generated" in root:
+                continue
+            for file in files:
+                if not file.endswith(".md"):
+                    continue
+
+                abs_path = os.path.join(root, file)
+                rel_path = os.path.relpath(abs_path, REPO_ROOT)
+
+                try:
+                    with open(abs_path, "r", encoding="utf-8") as f:
+                        content = f.read()
+                except Exception as e:
+                    errors.append(f"{rel_path}: cannot read file: {e}")
+                    continue
+
+                relations = extract_relations_from_content(content)
+
+                # Build a frontmatter-like dict for validation
+                fm = {"relations": relations}
+                file_errors = validate_relations(rel_path, fm)
+                errors.extend(file_errors)
+
+    if errors:
+        print(f"\n--- Relations validation errors ({len(errors)}) ---", file=sys.stderr)
+        for error in errors:
+            print(f"  ERROR: {error}", file=sys.stderr)
+        print("\nRelations validation failed.", file=sys.stderr)
+        sys.exit(1)
+
+    print("Relations validation passed (0 errors).")
+
+
+if __name__ == "__main__":
+    main()
diff --git a/scripts/docmeta/validate_schema.py b/scripts/docmeta/validate_schema.py
index 3b70c8d7..224defb9 100644
--- a/scripts/docmeta/validate_schema.py
+++ b/scripts/docmeta/validate_schema.py
@@ -86,10 +86,10 @@ def main():
                 continue
 
             # ensure arrays are properly formatted lists if possible.
-            # `depends_on` and `verifies_with` could be string parsed as strings by the basic yaml parser
+            # `relations` and `verifies_with` could be string parsed as strings by the basic yaml parser
             # Need to normalize them before validating
 
-            for key in ["depends_on", "verifies_with"]:
+            for key in ["relations", "verifies_with"]:
                 val = frontmatter.get(key)
                 if isinstance(val, str):
                     if val.startswith('[') and val.endswith(']'):