From 20894ab79d7d7253747d8c906093e8e481fb25bb Mon Sep 17 00:00:00 2001
From: "copilot-swe-agent[bot]" <198982749+Copilot@users.noreply.github.com>
Date: Fri, 2 Jan 2026 20:33:45 +0000
Subject: [PATCH 1/8] Initial plan


From d11416ae36e1b96320505a41f9969e9f6a6c3f64 Mon Sep 17 00:00:00 2001
From: "copilot-swe-agent[bot]" <198982749+Copilot@users.noreply.github.com>
Date: Fri, 2 Jan 2026 20:42:05 +0000
Subject: [PATCH 2/8] feat(indexd): add source_ref and ingested_at metadata
 fields

Co-authored-by: alexdermohr <216529510+alexdermohr@users.noreply.github.com>
---
 Cargo.lock               |  4 ++++
 crates/indexd/Cargo.toml |  4 ++++
 crates/indexd/src/lib.rs | 17 +++++++++++++++++
 docs/modules/indexd.md   | 29 +++++++++++++++++++++++++++--
 docs/modules/memory.md   | 12 ++++++++++++
 5 files changed, 64 insertions(+), 2 deletions(-)

diff --git a/Cargo.lock b/Cargo.lock
index af1fab89..d1e692dd 100644
--- a/Cargo.lock
+++ b/Cargo.lock
@@ -684,9 +684,13 @@ dependencies = [
 name = "hauski-indexd"
 version = "0.1.0"
 dependencies = [
+ "anyhow",
  "axum",
+ "chrono",
+ "rusqlite",
  "serde",
  "serde_json",
+ "tempfile",
  "tokio",
  "tower",
  "tracing",
diff --git a/crates/indexd/Cargo.toml b/crates/indexd/Cargo.toml
index eb5b6234..8dc70824 100644
--- a/crates/indexd/Cargo.toml
+++ b/crates/indexd/Cargo.toml
@@ -10,6 +10,10 @@ serde.workspace = true
 serde_json.workspace = true
 tokio.workspace = true
 tracing.workspace = true
+rusqlite.workspace = true
+chrono.workspace = true
+anyhow.workspace = true
 
 [dev-dependencies]
 tower = { workspace = true, features = ["util"] }
+tempfile.workspace = true
diff --git a/crates/indexd/src/lib.rs b/crates/indexd/src/lib.rs
index 09efef19..088758b1 100644
--- a/crates/indexd/src/lib.rs
+++ b/crates/indexd/src/lib.rs
@@ -5,6 +5,7 @@ use axum::{
     routing::post,
     Json, Router,
 };
+use chrono::{DateTime, Utc};
 use serde::{Deserialize, Serialize};
 use serde_json::Value;
 use std::{borrow::Cow, cmp::Ordering, collections::HashMap, sync::Arc, time::Instant};
@@ -49,6 +50,8 @@ struct DocumentRecord {
     namespace: String,
     chunks: Vec<ChunkPayload>,
     meta: Value,
+    source_ref: Option<String>,
+    ingested_at: DateTime<Utc>,
 }
 
 impl IndexState {
@@ -76,6 +79,7 @@ impl IndexState {
             namespace,
             chunks,
             meta,
+            source_ref,
         } = payload;
         let namespace = normalize_namespace(&namespace);
         let mut store = self.inner.store.write().await;
@@ -88,6 +92,8 @@ impl IndexState {
                 namespace: namespace.clone(),
                 chunks,
                 meta,
+                source_ref,
+                ingested_at: Utc::now(),
             },
         );
         ingested
@@ -136,6 +142,8 @@ impl IndexState {
                     } else {
                         chunk.meta.clone()
                     },
+                    source_ref: doc.source_ref.clone(),
+                    ingested_at: doc.ingested_at.to_rfc3339(),
                 });
             }
         }
@@ -236,6 +244,8 @@ pub struct UpsertRequest {
     pub chunks: Vec<ChunkPayload>,
     #[serde(default)]
     pub meta: Value,
+    #[serde(default)]
+    pub source_ref: Option<String>,
 }
 
 #[derive(Debug, Deserialize, Clone)]
@@ -280,6 +290,9 @@ pub struct SearchMatch {
     pub score: f32,
     pub text: String,
     pub meta: Value,
+    #[serde(skip_serializing_if = "Option::is_none")]
+    pub source_ref: Option<String>,
+    pub ingested_at: String,
 }
 
 fn default_namespace() -> String {
@@ -352,6 +365,7 @@ mod tests {
                     meta: json!({"chunk": 0}),
                 }],
                 meta: json!({"doc": "rust"}),
+                source_ref: Some("test_file.rs:42".into()),
             })
             .await;
 
@@ -366,6 +380,7 @@ mod tests {
                     meta: json!({"chunk": 0}),
                 }],
                 meta: json!({"doc": "cooking"}),
+                source_ref: None,
             })
             .await;
 
@@ -397,6 +412,7 @@ mod tests {
                     meta: json!({"chunk": 0}),
                 }],
                 meta: json!({"doc": "trim"}),
+                source_ref: None,
             })
             .await;
 
@@ -438,6 +454,7 @@ mod tests {
                     meta: json!({"chunk": 0}),
                 }],
                 meta: json!({"doc": "empty"}),
+                source_ref: None,
             })
             .await;
 
diff --git a/docs/modules/indexd.md b/docs/modules/indexd.md
index db8a6f65..1eb54457 100644
--- a/docs/modules/indexd.md
+++ b/docs/modules/indexd.md
@@ -1,20 +1,45 @@
 # Modul: indexd
 
-**Rolle:** Speicherung und semantische Suche
+**Rolle:** Langzeitgedächtnis (episodisch, semantisch)
 **Komponente:** `hauski-indexd` (Crate)
 
 ---
 
 ## Überblick
 
-`indexd` implementiert die Indexierungs- und Query-Schicht von hausKI.
+`indexd` implementiert die Indexierungs- und Query-Schicht von hausKI als **persistentes semantisches Gedächtnis**.
 Zentral ist das **`VectorStore`-Trait**, das abstrakte Such- und Embedding-Backends erlaubt (z. B. *tantivy+hnsw* oder *Qdrant*).
 
+## Abgrenzung zu Memory
+
+| Aspekt | Memory (Arbeitsgedächtnis) | indexd (Langzeitgedächtnis) |
+|--------|----------------------------|------------------------------|
+| **Persistenz** | SQLite K/V | SQLite + Vektoren |
+| **Lebensdauer** | TTL-basiert (Sekunden bis Minuten) | Persistent, episodisch |
+| **Datentyp** | Key/Value (Bytes) | Dokumente + Embeddings + Metadaten |
+| **Zugriff** | Direkt per Key | Semantische Suche, Namespace-Filter |
+| **Anwendung** | Session-State, kurzfristige Flags | Chronik, OS-Kontext, Code-Snippets, Insights |
+
 ### Hauptaufgaben
 - Speichern von Dokument-Embeddings (Text, OS-Kontext, Memory-Snippets)
 - Durchführen semantischer Queries (Top-k, Score, Namespace-Filter)
 - Bereitstellen der Index-Metriken für `/metrics`
 
+### Namespace-Konventionen
+
+indexd nutzt Namespaces zur semantischen Trennung verschiedener Datenquellen:
+
+| Namespace | Beschreibung | Beispiel-Inhalte |
+|-----------|--------------|------------------|
+| `chronik` | Ereignis-Historie aus OS/App-Events | System-Events, User-Actions |
+| `osctx` | Betriebssystem-Kontext | Prozesse, Netzwerk, Hardware-State |
+| `code` | Code-Snippets und Entwickler-Artefakte | Funktionen, Klassen, Commits |
+| `docs` | Dokumentation und Wissensartefakte | Markdown, PDFs, API-Docs |
+| `insights` | Generierte Insights und Metawissen | Analyse-Ergebnisse, Zusammenfassungen |
+| `default` | Fallback für unspezifizierte Inhalte | Allgemeine Einträge |
+
+Alle Namespaces werden normalisiert (getrimmt, Fallback zu `default` bei leer/whitespace).
+
 ---
 
 ## Architektur
diff --git a/docs/modules/memory.md b/docs/modules/memory.md
index f700e4bc..5526374f 100644
--- a/docs/modules/memory.md
+++ b/docs/modules/memory.md
@@ -1,8 +1,20 @@
 # Memory (SQLite + TTL, MVP)
 
+**Rolle:** Arbeitsgedächtnis (kurzlebig, TTL-basiert)
+
 Ein schlanker Key/Value-Speicher mit optionalem TTL und Pin-Flag.
 Nur sichtbar, wenn `HAUSKI_EXPOSE_CONFIG=true`.
 
+## Abgrenzung zu indexd
+
+| Aspekt | Memory (Arbeitsgedächtnis) | indexd (Langzeitgedächtnis) |
+|--------|----------------------------|------------------------------|
+| **Persistenz** | SQLite K/V | SQLite + Vektoren |
+| **Lebensdauer** | TTL-basiert (Sekunden bis Minuten) | Persistent, episodisch |
+| **Datentyp** | Key/Value (Bytes) | Dokumente + Embeddings + Metadaten |
+| **Zugriff** | Direkt per Key | Semantische Suche, Namespace-Filter |
+| **Anwendung** | Session-State, kurzfristige Flags | Chronik, OS-Kontext, Code-Snippets, Insights |
+
 ## Endpunkte
 
 | Route            | Methode | Body                                                           | Antwort                                                          |

From bfe813fd41611e65b64cf3aa4ee20912b8ec017b Mon Sep 17 00:00:00 2001
From: "copilot-swe-agent[bot]" <198982749+Copilot@users.noreply.github.com>
Date: Fri, 2 Jan 2026 20:46:34 +0000
Subject: [PATCH 3/8] feat(indexd): add /stats and /related endpoints with
 tests

Co-authored-by: alexdermohr <216529510+alexdermohr@users.noreply.github.com>
---
 crates/indexd/src/lib.rs | 261 +++++++++++++++++++++++++++++++++++++++
 1 file changed, 261 insertions(+)

diff --git a/crates/indexd/src/lib.rs b/crates/indexd/src/lib.rs
index 088758b1..989aba2e 100644
--- a/crates/indexd/src/lib.rs
+++ b/crates/indexd/src/lib.rs
@@ -154,6 +154,105 @@ impl IndexState {
         }
         matches
     }
+
+    pub async fn stats(&self) -> StatsResponse {
+        let store = self.inner.store.read().await;
+        let mut total_docs = 0;
+        let mut total_chunks = 0;
+        let mut namespace_counts = HashMap::new();
+
+        for (namespace, namespace_store) in store.iter() {
+            let doc_count = namespace_store.len();
+            let chunk_count: usize = namespace_store
+                .values()
+                .map(|doc| doc.chunks.len())
+                .sum();
+            
+            total_docs += doc_count;
+            total_chunks += chunk_count;
+            namespace_counts.insert(namespace.clone(), doc_count);
+        }
+
+        StatsResponse {
+            total_documents: total_docs,
+            total_chunks,
+            namespaces: namespace_counts,
+            budget_ms: self.inner.budget_ms,
+        }
+    }
+
+    pub async fn related(&self, doc_id: String, k: Option<usize>, namespace: Option<String>) -> Vec<SearchMatch> {
+        let store = self.inner.store.read().await;
+        let namespace = resolve_namespace(namespace.as_deref());
+        let Some(namespace_store) = store.get(namespace.as_ref()) else {
+            return Vec::new();
+        };
+        
+        let Some(source_doc) = namespace_store.get(&doc_id) else {
+            return Vec::new();
+        };
+        
+        let limit = k.unwrap_or(20).min(100);
+        let mut matches: Vec<SearchMatch> = Vec::new();
+        
+        // For now, use simple text-based similarity (compare all chunks with source)
+        // In future: use embedding-based similarity
+        for (other_doc_id, other_doc) in namespace_store.iter() {
+            if other_doc_id == &doc_id {
+                continue; // skip self
+            }
+            
+            for (idx, chunk) in other_doc.chunks.iter().enumerate() {
+                let Some(text) = chunk.text.as_ref() else {
+                    continue;
+                };
+                
+                // Simple heuristic: calculate overlap with source document text
+                let source_text: Vec<String> = source_doc
+                    .chunks
+                    .iter()
+                    .filter_map(|c| c.text.as_ref().map(|t| t.to_lowercase()))
+                    .collect();
+                
+                let text_lower = text.to_lowercase();
+                let mut score = 0.0f32;
+                for src_text in &source_text {
+                    let words: Vec<&str> = src_text.split_whitespace().collect();
+                    for word in words {
+                        if word.len() > 3 && text_lower.contains(word) {
+                            score += 0.1;
+                        }
+                    }
+                }
+                
+                if score > 0.0 {
+                    matches.push(SearchMatch {
+                        doc_id: other_doc.doc_id.clone(),
+                        namespace: other_doc.namespace.clone(),
+                        chunk_id: chunk
+                            .chunk_id
+                            .clone()
+                            .unwrap_or_else(|| format!("{}#{idx}", other_doc.doc_id)),
+                        score,
+                        text: text.clone(),
+                        meta: if chunk.meta.is_null() {
+                            other_doc.meta.clone()
+                        } else {
+                            chunk.meta.clone()
+                        },
+                        source_ref: other_doc.source_ref.clone(),
+                        ingested_at: other_doc.ingested_at.to_rfc3339(),
+                    });
+                }
+            }
+        }
+        
+        matches.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(Ordering::Equal));
+        if matches.len() > limit {
+            matches.truncate(limit);
+        }
+        matches
+    }
 }
 
 fn substring_match_score(
@@ -197,6 +296,8 @@ where
     Router::<S>::new()
         .route("/upsert", post(upsert_handler))
         .route("/search", post(search_handler))
+        .route("/stats", axum::routing::get(stats_handler))
+        .route("/related", post(related_handler))
 }
 
 async fn upsert_handler(
@@ -235,6 +336,34 @@ async fn search_handler(
         .into_response()
 }
 
+async fn stats_handler(State(state): State<IndexState>) -> Response {
+    let started = Instant::now();
+    let stats = state.stats().await;
+    state.record(Method::GET, "/index/stats", StatusCode::OK, started);
+    (StatusCode::OK, Json(stats)).into_response()
+}
+
+async fn related_handler(
+    State(state): State<IndexState>,
+    Json(payload): Json<RelatedRequest>,
+) -> Response {
+    let started = Instant::now();
+    let matches = state
+        .related(payload.doc_id, payload.k, payload.namespace)
+        .await;
+    let latency_ms = started.elapsed().as_secs_f64() * 1000.0;
+    state.record(Method::POST, "/index/related", StatusCode::OK, started);
+    (
+        StatusCode::OK,
+        Json(RelatedResponse {
+            matches,
+            latency_ms,
+            budget_ms: state.budget_ms(),
+        }),
+    )
+        .into_response()
+}
+
 #[derive(Debug, Deserialize)]
 pub struct UpsertRequest {
     pub doc_id: String,
@@ -269,6 +398,15 @@ pub struct SearchRequest {
     pub namespace: Option<String>,
 }
 
+#[derive(Debug, Deserialize)]
+pub struct RelatedRequest {
+    pub doc_id: String,
+    #[serde(default)]
+    pub k: Option<usize>,
+    #[serde(default)]
+    pub namespace: Option<String>,
+}
+
 #[derive(Debug, Serialize)]
 pub struct UpsertResponse {
     pub status: String,
@@ -282,6 +420,21 @@ pub struct SearchResponse {
     pub budget_ms: u64,
 }
 
+#[derive(Debug, Serialize)]
+pub struct RelatedResponse {
+    pub matches: Vec<SearchMatch>,
+    pub latency_ms: f64,
+    pub budget_ms: u64,
+}
+
+#[derive(Debug, Serialize)]
+pub struct StatsResponse {
+    pub total_documents: usize,
+    pub total_chunks: usize,
+    pub namespaces: HashMap<String, usize>,
+    pub budget_ms: u64,
+}
+
 #[derive(Debug, Serialize, Clone)]
 pub struct SearchMatch {
     pub doc_id: String,
@@ -481,4 +634,112 @@ mod tests {
         assert_eq!(spaced_results[0].doc_id, "doc-empty");
         assert_eq!(spaced_results[0].namespace, DEFAULT_NAMESPACE);
     }
+
+    #[tokio::test]
+    async fn stats_returns_correct_counts() {
+        let state = IndexState::new(60, Arc::new(|_, _, _, _| {}));
+
+        state
+            .upsert(UpsertRequest {
+                doc_id: "doc-1".into(),
+                namespace: "default".into(),
+                chunks: vec![
+                    ChunkPayload {
+                        chunk_id: Some("doc-1#0".into()),
+                        text: Some("First chunk".into()),
+                        embedding: Vec::new(),
+                        meta: json!({}),
+                    },
+                    ChunkPayload {
+                        chunk_id: Some("doc-1#1".into()),
+                        text: Some("Second chunk".into()),
+                        embedding: Vec::new(),
+                        meta: json!({}),
+                    },
+                ],
+                meta: json!({}),
+                source_ref: None,
+            })
+            .await;
+
+        state
+            .upsert(UpsertRequest {
+                doc_id: "doc-2".into(),
+                namespace: "custom".into(),
+                chunks: vec![ChunkPayload {
+                    chunk_id: Some("doc-2#0".into()),
+                    text: Some("Third chunk".into()),
+                    embedding: Vec::new(),
+                    meta: json!({}),
+                }],
+                meta: json!({}),
+                source_ref: None,
+            })
+            .await;
+
+        let stats = state.stats().await;
+        assert_eq!(stats.total_documents, 2);
+        assert_eq!(stats.total_chunks, 3);
+        assert_eq!(stats.namespaces.len(), 2);
+        assert_eq!(stats.namespaces.get("default"), Some(&1));
+        assert_eq!(stats.namespaces.get("custom"), Some(&1));
+    }
+
+    #[tokio::test]
+    async fn related_finds_similar_documents() {
+        let state = IndexState::new(60, Arc::new(|_, _, _, _| {}));
+
+        state
+            .upsert(UpsertRequest {
+                doc_id: "doc-rust".into(),
+                namespace: "default".into(),
+                chunks: vec![ChunkPayload {
+                    chunk_id: Some("doc-rust#0".into()),
+                    text: Some("Rust programming language with memory safety".into()),
+                    embedding: Vec::new(),
+                    meta: json!({}),
+                }],
+                meta: json!({}),
+                source_ref: None,
+            })
+            .await;
+
+        state
+            .upsert(UpsertRequest {
+                doc_id: "doc-rust-guide".into(),
+                namespace: "default".into(),
+                chunks: vec![ChunkPayload {
+                    chunk_id: Some("doc-rust-guide#0".into()),
+                    text: Some("A guide to memory management in Rust".into()),
+                    embedding: Vec::new(),
+                    meta: json!({}),
+                }],
+                meta: json!({}),
+                source_ref: None,
+            })
+            .await;
+
+        state
+            .upsert(UpsertRequest {
+                doc_id: "doc-python".into(),
+                namespace: "default".into(),
+                chunks: vec![ChunkPayload {
+                    chunk_id: Some("doc-python#0".into()),
+                    text: Some("Python scripting tutorial".into()),
+                    embedding: Vec::new(),
+                    meta: json!({}),
+                }],
+                meta: json!({}),
+                source_ref: None,
+            })
+            .await;
+
+        let related = state
+            .related("doc-rust".into(), Some(5), Some("default".into()))
+            .await;
+
+        // Should find doc-rust-guide as related (shares "rust" and "memory" words)
+        assert!(!related.is_empty());
+        assert!(related.iter().any(|m| m.doc_id == "doc-rust-guide"));
+    }
 }

From e771ff310f4484d76823eb40a7eefefc8838280e Mon Sep 17 00:00:00 2001
From: "copilot-swe-agent[bot]" <198982749+Copilot@users.noreply.github.com>
Date: Fri, 2 Jan 2026 20:48:12 +0000
Subject: [PATCH 4/8] docs(indexd): update module docs with budget and API
 details

Co-authored-by: alexdermohr <216529510+alexdermohr@users.noreply.github.com>
---
 crates/indexd/src/lib.rs | 30 ++++++++++++++++--------------
 docs/modules/indexd.md   | 40 +++++++++++++++++++++++++++++++++++-----
 2 files changed, 51 insertions(+), 19 deletions(-)

diff --git a/crates/indexd/src/lib.rs b/crates/indexd/src/lib.rs
index 989aba2e..15a7f7f1 100644
--- a/crates/indexd/src/lib.rs
+++ b/crates/indexd/src/lib.rs
@@ -163,11 +163,8 @@ impl IndexState {
 
         for (namespace, namespace_store) in store.iter() {
             let doc_count = namespace_store.len();
-            let chunk_count: usize = namespace_store
-                .values()
-                .map(|doc| doc.chunks.len())
-                .sum();
-            
+            let chunk_count: usize = namespace_store.values().map(|doc| doc.chunks.len()).sum();
+
             total_docs += doc_count;
             total_chunks += chunk_count;
             namespace_counts.insert(namespace.clone(), doc_count);
@@ -181,39 +178,44 @@ impl IndexState {
         }
     }
 
-    pub async fn related(&self, doc_id: String, k: Option<usize>, namespace: Option<String>) -> Vec<SearchMatch> {
+    pub async fn related(
+        &self,
+        doc_id: String,
+        k: Option<usize>,
+        namespace: Option<String>,
+    ) -> Vec<SearchMatch> {
         let store = self.inner.store.read().await;
         let namespace = resolve_namespace(namespace.as_deref());
         let Some(namespace_store) = store.get(namespace.as_ref()) else {
             return Vec::new();
         };
-        
+
         let Some(source_doc) = namespace_store.get(&doc_id) else {
             return Vec::new();
         };
-        
+
         let limit = k.unwrap_or(20).min(100);
         let mut matches: Vec<SearchMatch> = Vec::new();
-        
+
         // For now, use simple text-based similarity (compare all chunks with source)
         // In future: use embedding-based similarity
         for (other_doc_id, other_doc) in namespace_store.iter() {
             if other_doc_id == &doc_id {
                 continue; // skip self
             }
-            
+
             for (idx, chunk) in other_doc.chunks.iter().enumerate() {
                 let Some(text) = chunk.text.as_ref() else {
                     continue;
                 };
-                
+
                 // Simple heuristic: calculate overlap with source document text
                 let source_text: Vec<String> = source_doc
                     .chunks
                     .iter()
                     .filter_map(|c| c.text.as_ref().map(|t| t.to_lowercase()))
                     .collect();
-                
+
                 let text_lower = text.to_lowercase();
                 let mut score = 0.0f32;
                 for src_text in &source_text {
@@ -224,7 +226,7 @@ impl IndexState {
                         }
                     }
                 }
-                
+
                 if score > 0.0 {
                     matches.push(SearchMatch {
                         doc_id: other_doc.doc_id.clone(),
@@ -246,7 +248,7 @@ impl IndexState {
                 }
             }
         }
-        
+
         matches.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(Ordering::Equal));
         if matches.len() > limit {
             matches.truncate(limit);
diff --git a/docs/modules/indexd.md b/docs/modules/indexd.md
index 1eb54457..6b064cb3 100644
--- a/docs/modules/indexd.md
+++ b/docs/modules/indexd.md
@@ -66,18 +66,48 @@ index:
 
 ## Metriken & Budgets
 
-- `index_queries_total`
-- `index_query_duration_seconds`
-  *Budget:* p95 ≤ 60 ms
+- `index_queries_total` – Gesamtzahl aller Index-Anfragen (inkl. /search, /related)
+- `index_query_duration_seconds` – Latenzverteilung der Anfragen
+  *Budget:* p95 ≤ 60 ms (konfigurierbar über Limits)
+
+### Budget-Leitplanke
+
+Das System nutzt ein latenzbasiertes Budget:
+- Bei Überschreitung des Budgets (> 60 ms p95) sollten Degradations-Maßnahmen greifen
+- Aktuelle Implementierung: Warnung im Log, keine automatische Degradation
+- Zukünftig: Reduzierung von k, einfachere Filter, Caching
+
+### API-Endpunkte
+
+| Endpoint | Methode | Beschreibung |
+|----------|---------|--------------|
+| `/index/upsert` | POST | Dokument-Chunks mit Embeddings registrieren |
+| `/index/search` | POST | Semantische Suche mit Top-k und Namespace-Filter |
+| `/index/related` | POST | Ähnliche Dokumente zu einem gegebenen doc_id finden |
+| `/index/stats` | GET | Statistiken über den Index (Dokumente, Chunks, Namespaces) |
 
 ---
 
 ## Offene Aufgaben
 
-- [ ] HNSW-Backend dokumentieren
-- [ ] Beispiel-Querys ergänzen
+- [ ] SQLite-Persistenz implementieren (aktuell nur In-Memory)
+- [ ] HNSW-Backend für echte Vektor-Ähnlichkeitssuche
+- [ ] Beispiel-Querys in Dokumentation ergänzen
 - [ ] API-Spec per `utoipa` exportieren
 
+## Status
+
+**Implementiert:**
+- ✅ In-Memory-Store mit Namespace-Support
+- ✅ Substring-basierte Textsuche
+- ✅ Metadaten (source_ref, ingested_at)
+- ✅ /upsert, /search, /related, /stats Endpoints
+- ✅ Metriken-Integration
+
+**In Entwicklung:**
+- 🔄 SQLite-Persistenz
+- 🔄 Vektor-Embeddings und HNSW-Index
+
 ---
 
 **Letzte Aktualisierung:** 2025-10-23

From a6cae6da099d8af93c047e2dfae19e9e609f25a4 Mon Sep 17 00:00:00 2001
From: "copilot-swe-agent[bot]" <198982749+Copilot@users.noreply.github.com>
Date: Fri, 2 Jan 2026 20:51:08 +0000
Subject: [PATCH 5/8] test(indexd): add integration tests with 20+ event
 fixture corpus

Co-authored-by: alexdermohr <216529510+alexdermohr@users.noreply.github.com>
---
 crates/indexd/src/lib.rs                |   2 +-
 crates/indexd/tests/integration_test.rs | 242 ++++++++++++++++++++++++
 2 files changed, 243 insertions(+), 1 deletion(-)
 create mode 100644 crates/indexd/tests/integration_test.rs

diff --git a/crates/indexd/src/lib.rs b/crates/indexd/src/lib.rs
index 15a7f7f1..845c7d8d 100644
--- a/crates/indexd/src/lib.rs
+++ b/crates/indexd/src/lib.rs
@@ -73,7 +73,7 @@ impl IndexState {
         (self.inner.metrics)(method, path, status, started);
     }
 
-    async fn upsert(&self, payload: UpsertRequest) -> usize {
+    pub async fn upsert(&self, payload: UpsertRequest) -> usize {
         let UpsertRequest {
             doc_id,
             namespace,
diff --git a/crates/indexd/tests/integration_test.rs b/crates/indexd/tests/integration_test.rs
new file mode 100644
index 00000000..e5503206
--- /dev/null
+++ b/crates/indexd/tests/integration_test.rs
@@ -0,0 +1,242 @@
+use hauski_indexd::{
+    ChunkPayload, IndexState, SearchRequest, UpsertRequest,
+};
+use serde_json::json;
+use std::sync::Arc;
+
+/// Integration test with a small fixture corpus (20+ events)
+#[tokio::test]
+async fn test_fixture_corpus_indexing_and_search() {
+    let state = IndexState::new(60, Arc::new(|_, _, _, _| {}));
+
+    // Fixture 1-5: Rust programming topics
+    for i in 1..=5 {
+        state
+            .upsert(UpsertRequest {
+                doc_id: format!("rust-{}", i),
+                namespace: "code".into(),
+                chunks: vec![ChunkPayload {
+                    chunk_id: Some(format!("rust-{}#0", i)),
+                    text: Some(format!(
+                        "Rust programming topic {}: memory safety and ownership",
+                        i
+                    )),
+                    embedding: Vec::new(),
+                    meta: json!({"topic": "rust", "id": i}),
+                }],
+                meta: json!({"language": "rust"}),
+                source_ref: Some(format!("docs/rust-{}.md", i)),
+            })
+            .await;
+    }
+
+    // Fixture 6-10: Python scripting topics
+    for i in 6..=10 {
+        state
+            .upsert(UpsertRequest {
+                doc_id: format!("python-{}", i),
+                namespace: "code".into(),
+                chunks: vec![ChunkPayload {
+                    chunk_id: Some(format!("python-{}#0", i)),
+                    text: Some(format!("Python scripting tutorial {}: dynamic typing", i)),
+                    embedding: Vec::new(),
+                    meta: json!({"topic": "python", "id": i}),
+                }],
+                meta: json!({"language": "python"}),
+                source_ref: Some(format!("docs/python-{}.md", i)),
+            })
+            .await;
+    }
+
+    // Fixture 11-15: System events (chronik namespace)
+    for i in 11..=15 {
+        state
+            .upsert(UpsertRequest {
+                doc_id: format!("event-{}", i),
+                namespace: "chronik".into(),
+                chunks: vec![ChunkPayload {
+                    chunk_id: Some(format!("event-{}#0", i)),
+                    text: Some(format!(
+                        "System event {}: process started with high memory usage",
+                        i
+                    )),
+                    embedding: Vec::new(),
+                    meta: json!({"event_type": "process_start", "id": i}),
+                }],
+                meta: json!({"severity": "info"}),
+                source_ref: Some(format!("/var/log/events/{}.log", i)),
+            })
+            .await;
+    }
+
+    // Fixture 16-20: Documentation snippets
+    for i in 16..=20 {
+        state
+            .upsert(UpsertRequest {
+                doc_id: format!("doc-{}", i),
+                namespace: "docs".into(),
+                chunks: vec![ChunkPayload {
+                    chunk_id: Some(format!("doc-{}#0", i)),
+                    text: Some(format!("Documentation page {}: getting started guide", i)),
+                    embedding: Vec::new(),
+                    meta: json!({"section": "getting-started", "id": i}),
+                }],
+                meta: json!({"category": "tutorial"}),
+                source_ref: Some(format!("docs/page-{}.md", i)),
+            })
+            .await;
+    }
+
+    // Test 1: Search for Rust in code namespace
+    let rust_results = state
+        .search(&SearchRequest {
+            query: "rust".into(),
+            k: Some(10),
+            namespace: Some("code".into()),
+        })
+        .await;
+
+    assert!(
+        rust_results.len() >= 5,
+        "Expected at least 5 Rust results, got {}",
+        rust_results.len()
+    );
+    assert!(rust_results
+        .iter()
+        .all(|m| m.namespace == "code" && m.text.to_lowercase().contains("rust")));
+
+    // Test 2: Search for events in chronik namespace
+    let event_results = state
+        .search(&SearchRequest {
+            query: "process".into(),
+            k: Some(10),
+            namespace: Some("chronik".into()),
+        })
+        .await;
+
+    assert!(
+        event_results.len() >= 5,
+        "Expected at least 5 event results, got {}",
+        event_results.len()
+    );
+    assert!(event_results.iter().all(|m| m.namespace == "chronik"
+        && m.text.to_lowercase().contains("process")));
+
+    // Test 3: Stats should show correct counts
+    let stats = state.stats().await;
+    assert_eq!(stats.total_documents, 20);
+    assert_eq!(stats.total_chunks, 20);
+    assert_eq!(stats.namespaces.len(), 3);
+    assert_eq!(stats.namespaces.get("code"), Some(&10));
+    assert_eq!(stats.namespaces.get("chronik"), Some(&5));
+    assert_eq!(stats.namespaces.get("docs"), Some(&5));
+
+    // Test 4: Related documents should work
+    let related = state
+        .related("rust-1".into(), Some(5), Some("code".into()))
+        .await;
+
+    // Should find other Rust documents as related (they share "rust" and "memory" words)
+    assert!(
+        !related.is_empty(),
+        "Expected related documents, got empty list"
+    );
+    assert!(related.iter().any(|m| m.doc_id.starts_with("rust-")));
+}
+
+#[tokio::test]
+async fn test_namespace_isolation() {
+    let state = IndexState::new(60, Arc::new(|_, _, _, _| {}));
+
+    // Same text in different namespaces
+    state
+        .upsert(UpsertRequest {
+            doc_id: "shared-doc".into(),
+            namespace: "ns1".into(),
+            chunks: vec![ChunkPayload {
+                chunk_id: Some("shared-doc#ns1".into()),
+                text: Some("Shared content".into()),
+                embedding: Vec::new(),
+                meta: json!({}),
+            }],
+            meta: json!({}),
+            source_ref: None,
+        })
+        .await;
+
+    state
+        .upsert(UpsertRequest {
+            doc_id: "shared-doc".into(),
+            namespace: "ns2".into(),
+            chunks: vec![ChunkPayload {
+                chunk_id: Some("shared-doc#ns2".into()),
+                text: Some("Shared content".into()),
+                embedding: Vec::new(),
+                meta: json!({}),
+            }],
+            meta: json!({}),
+            source_ref: None,
+        })
+        .await;
+
+    // Search in ns1 should only return ns1 results
+    let ns1_results = state
+        .search(&SearchRequest {
+            query: "shared".into(),
+            k: Some(10),
+            namespace: Some("ns1".into()),
+        })
+        .await;
+
+    assert_eq!(ns1_results.len(), 1);
+    assert_eq!(ns1_results[0].namespace, "ns1");
+
+    // Search in ns2 should only return ns2 results
+    let ns2_results = state
+        .search(&SearchRequest {
+            query: "shared".into(),
+            k: Some(10),
+            namespace: Some("ns2".into()),
+        })
+        .await;
+
+    assert_eq!(ns2_results.len(), 1);
+    assert_eq!(ns2_results[0].namespace, "ns2");
+}
+
+#[tokio::test]
+async fn test_source_ref_and_ingested_at_populated() {
+    let state = IndexState::new(60, Arc::new(|_, _, _, _| {}));
+
+    state
+        .upsert(UpsertRequest {
+            doc_id: "doc-with-ref".into(),
+            namespace: "default".into(),
+            chunks: vec![ChunkPayload {
+                chunk_id: Some("doc-with-ref#0".into()),
+                text: Some("Content with source".into()),
+                embedding: Vec::new(),
+                meta: json!({}),
+            }],
+            meta: json!({}),
+            source_ref: Some("events/2024-01-01.log:42".into()),
+        })
+        .await;
+
+    let results = state
+        .search(&SearchRequest {
+            query: "content".into(),
+            k: Some(1),
+            namespace: None,
+        })
+        .await;
+
+    assert_eq!(results.len(), 1);
+    assert_eq!(
+        results[0].source_ref,
+        Some("events/2024-01-01.log:42".into())
+    );
+    assert!(!results[0].ingested_at.is_empty());
+    // Verify it's a valid RFC3339 timestamp
+    assert!(chrono::DateTime::parse_from_rfc3339(&results[0].ingested_at).is_ok());
+}

From 8fd7f572d43443ab40e7c873fe53c222322bc2a2 Mon Sep 17 00:00:00 2001
From: "copilot-swe-agent[bot]" <198982749+Copilot@users.noreply.github.com>
Date: Fri, 2 Jan 2026 20:54:18 +0000
Subject: [PATCH 6/8] refactor(indexd): address code review - extract magic
 numbers, clarify design

Co-authored-by: alexdermohr <216529510+alexdermohr@users.noreply.github.com>
---
 crates/indexd/src/lib.rs                | 10 +++++++---
 crates/indexd/tests/integration_test.rs |  9 ++++-----
 2 files changed, 11 insertions(+), 8 deletions(-)

diff --git a/crates/indexd/src/lib.rs b/crates/indexd/src/lib.rs
index 845c7d8d..8cb516ea 100644
--- a/crates/indexd/src/lib.rs
+++ b/crates/indexd/src/lib.rs
@@ -12,6 +12,8 @@ use std::{borrow::Cow, cmp::Ordering, collections::HashMap, sync::Arc, time::Ins
 use tokio::sync::RwLock;
 
 const DEFAULT_NAMESPACE: &str = "default";
+const MIN_WORD_LENGTH_FOR_SIMILARITY: usize = 3;
+const WORD_MATCH_SCORE_INCREMENT: f32 = 0.1;
 
 pub type MetricsRecorder = dyn Fn(Method, &'static str, StatusCode, Instant) + Send + Sync;
 
@@ -50,7 +52,9 @@ struct DocumentRecord {
     namespace: String,
     chunks: Vec<ChunkPayload>,
     meta: Value,
+    /// Optional source reference provided by the user (e.g., "events/2024-01-01.log:42")
     source_ref: Option<String>,
+    /// System-generated ingestion timestamp (always present, set at document creation)
     ingested_at: DateTime<Utc>,
 }
 
@@ -221,8 +225,9 @@ impl IndexState {
                 for src_text in &source_text {
                     let words: Vec<&str> = src_text.split_whitespace().collect();
                     for word in words {
-                        if word.len() > 3 && text_lower.contains(word) {
-                            score += 0.1;
+                        if word.len() > MIN_WORD_LENGTH_FOR_SIMILARITY && text_lower.contains(word)
+                        {
+                            score += WORD_MATCH_SCORE_INCREMENT;
                         }
                     }
                 }
@@ -375,7 +380,6 @@ pub struct UpsertRequest {
     pub chunks: Vec<ChunkPayload>,
     #[serde(default)]
     pub meta: Value,
-    #[serde(default)]
     pub source_ref: Option<String>,
 }
 
diff --git a/crates/indexd/tests/integration_test.rs b/crates/indexd/tests/integration_test.rs
index e5503206..0d4b4080 100644
--- a/crates/indexd/tests/integration_test.rs
+++ b/crates/indexd/tests/integration_test.rs
@@ -1,6 +1,4 @@
-use hauski_indexd::{
-    ChunkPayload, IndexState, SearchRequest, UpsertRequest,
-};
+use hauski_indexd::{ChunkPayload, IndexState, SearchRequest, UpsertRequest};
 use serde_json::json;
 use std::sync::Arc;
 
@@ -119,8 +117,9 @@ async fn test_fixture_corpus_indexing_and_search() {
         "Expected at least 5 event results, got {}",
         event_results.len()
     );
-    assert!(event_results.iter().all(|m| m.namespace == "chronik"
-        && m.text.to_lowercase().contains("process")));
+    assert!(event_results
+        .iter()
+        .all(|m| m.namespace == "chronik" && m.text.to_lowercase().contains("process")));
 
     // Test 3: Stats should show correct counts
     let stats = state.stats().await;

From cb335cb5a1ed4816a351d055733225e2de4b3135 Mon Sep 17 00:00:00 2001
From: "copilot-swe-agent[bot]" <198982749+Copilot@users.noreply.github.com>
Date: Fri, 2 Jan 2026 21:23:03 +0000
Subject: [PATCH 7/8] fix(indexd): address PR review - performance, docs,
 structured SourceRef

Co-authored-by: alexdermohr <216529510+alexdermohr@users.noreply.github.com>
---
 crates/indexd/src/lib.rs                | 43 ++++++++++++++++++-------
 crates/indexd/tests/integration_test.rs | 38 ++++++++++++++++++----
 docs/modules/indexd.md                  | 29 ++++++++++++++---
 3 files changed, 88 insertions(+), 22 deletions(-)

diff --git a/crates/indexd/src/lib.rs b/crates/indexd/src/lib.rs
index 8cb516ea..8303d58e 100644
--- a/crates/indexd/src/lib.rs
+++ b/crates/indexd/src/lib.rs
@@ -17,6 +17,19 @@ const WORD_MATCH_SCORE_INCREMENT: f32 = 0.1;
 
 pub type MetricsRecorder = dyn Fn(Method, &'static str, StatusCode, Instant) + Send + Sync;
 
+/// Structured reference to document source for provenance tracking.
+/// This replaces the previous Option<String> to provide clear semantics.
+#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
+pub struct SourceRef {
+    /// Origin namespace or system (e.g., "chronik", "osctx", "code", "docs")
+    pub origin: String,
+    /// Unique identifier within the origin (e.g., event_id, file path, hash)
+    pub id: String,
+    /// Optional location within the source (e.g., "line:42", "byte:1337-2048")
+    #[serde(skip_serializing_if = "Option::is_none")]
+    pub offset: Option<String>,
+}
+
 fn normalize_namespace(input: &str) -> String {
     let trimmed = input.trim();
     if trimmed.is_empty() {
@@ -52,8 +65,8 @@ struct DocumentRecord {
     namespace: String,
     chunks: Vec<ChunkPayload>,
     meta: Value,
-    /// Optional source reference provided by the user (e.g., "events/2024-01-01.log:42")
-    source_ref: Option<String>,
+    /// Structured source reference for provenance tracking
+    source_ref: Option<SourceRef>,
     /// System-generated ingestion timestamp (always present, set at document creation)
     ingested_at: DateTime<Utc>,
 }
@@ -201,6 +214,13 @@ impl IndexState {
         let limit = k.unwrap_or(20).min(100);
         let mut matches: Vec<SearchMatch> = Vec::new();
 
+        // Pre-compute source text once (outside loops for performance)
+        let source_text: Vec<String> = source_doc
+            .chunks
+            .iter()
+            .filter_map(|c| c.text.as_ref().map(|t| t.to_lowercase()))
+            .collect();
+
         // For now, use simple text-based similarity (compare all chunks with source)
         // In future: use embedding-based similarity
         for (other_doc_id, other_doc) in namespace_store.iter() {
@@ -214,12 +234,6 @@ impl IndexState {
                 };
 
                 // Simple heuristic: calculate overlap with source document text
-                let source_text: Vec<String> = source_doc
-                    .chunks
-                    .iter()
-                    .filter_map(|c| c.text.as_ref().map(|t| t.to_lowercase()))
-                    .collect();
-
                 let text_lower = text.to_lowercase();
                 let mut score = 0.0f32;
                 for src_text in &source_text {
@@ -300,6 +314,9 @@ where
     S: Clone + Send + Sync + 'static,
     IndexState: FromRef<S>,
 {
+    // Note: This router is nested under /index in core (see core/src/lib.rs),
+    // so routes like /stats become /index/stats when mounted.
+    // Metrics are recorded with full paths (/index/stats, etc.) for consistency.
     Router::<S>::new()
         .route("/upsert", post(upsert_handler))
         .route("/search", post(search_handler))
@@ -380,7 +397,7 @@ pub struct UpsertRequest {
     pub chunks: Vec<ChunkPayload>,
     #[serde(default)]
     pub meta: Value,
-    pub source_ref: Option<String>,
+    pub source_ref: Option<SourceRef>,
 }
 
 #[derive(Debug, Deserialize, Clone)]
@@ -450,7 +467,7 @@ pub struct SearchMatch {
     pub text: String,
     pub meta: Value,
     #[serde(skip_serializing_if = "Option::is_none")]
-    pub source_ref: Option<String>,
+    pub source_ref: Option<SourceRef>,
     pub ingested_at: String,
 }
 
@@ -524,7 +541,11 @@ mod tests {
                     meta: json!({"chunk": 0}),
                 }],
                 meta: json!({"doc": "rust"}),
-                source_ref: Some("test_file.rs:42".into()),
+                source_ref: Some(SourceRef {
+                    origin: "code".into(),
+                    id: "test_file.rs".into(),
+                    offset: Some("42".into()),
+                }),
             })
             .await;
 
diff --git a/crates/indexd/tests/integration_test.rs b/crates/indexd/tests/integration_test.rs
index 0d4b4080..fc752802 100644
--- a/crates/indexd/tests/integration_test.rs
+++ b/crates/indexd/tests/integration_test.rs
@@ -1,4 +1,4 @@
-use hauski_indexd::{ChunkPayload, IndexState, SearchRequest, UpsertRequest};
+use hauski_indexd::{ChunkPayload, IndexState, SearchRequest, SourceRef, UpsertRequest};
 use serde_json::json;
 use std::sync::Arc;
 
@@ -23,7 +23,11 @@ async fn test_fixture_corpus_indexing_and_search() {
                     meta: json!({"topic": "rust", "id": i}),
                 }],
                 meta: json!({"language": "rust"}),
-                source_ref: Some(format!("docs/rust-{}.md", i)),
+                source_ref: Some(SourceRef {
+                    origin: "docs".into(),
+                    id: format!("rust-{}.md", i),
+                    offset: None,
+                }),
             })
             .await;
     }
@@ -41,7 +45,11 @@ async fn test_fixture_corpus_indexing_and_search() {
                     meta: json!({"topic": "python", "id": i}),
                 }],
                 meta: json!({"language": "python"}),
-                source_ref: Some(format!("docs/python-{}.md", i)),
+                source_ref: Some(SourceRef {
+                    origin: "docs".into(),
+                    id: format!("python-{}.md", i),
+                    offset: None,
+                }),
             })
             .await;
     }
@@ -62,7 +70,11 @@ async fn test_fixture_corpus_indexing_and_search() {
                     meta: json!({"event_type": "process_start", "id": i}),
                 }],
                 meta: json!({"severity": "info"}),
-                source_ref: Some(format!("/var/log/events/{}.log", i)),
+                source_ref: Some(SourceRef {
+                    origin: "chronik".into(),
+                    id: format!("event-{}", i),
+                    offset: Some(format!("/var/log/events/{}.log", i)),
+                }),
             })
             .await;
     }
@@ -80,7 +92,11 @@ async fn test_fixture_corpus_indexing_and_search() {
                     meta: json!({"section": "getting-started", "id": i}),
                 }],
                 meta: json!({"category": "tutorial"}),
-                source_ref: Some(format!("docs/page-{}.md", i)),
+                source_ref: Some(SourceRef {
+                    origin: "docs".into(),
+                    id: format!("page-{}.md", i),
+                    offset: None,
+                }),
             })
             .await;
     }
@@ -218,7 +234,11 @@ async fn test_source_ref_and_ingested_at_populated() {
                 meta: json!({}),
             }],
             meta: json!({}),
-            source_ref: Some("events/2024-01-01.log:42".into()),
+            source_ref: Some(SourceRef {
+                origin: "chronik".into(),
+                id: "event-2024-01-01".into(),
+                offset: Some("42".into()),
+            }),
         })
         .await;
 
@@ -233,7 +253,11 @@ async fn test_source_ref_and_ingested_at_populated() {
     assert_eq!(results.len(), 1);
     assert_eq!(
         results[0].source_ref,
-        Some("events/2024-01-01.log:42".into())
+        Some(SourceRef {
+            origin: "chronik".into(),
+            id: "event-2024-01-01".into(),
+            offset: Some("42".into()),
+        })
     );
     assert!(!results[0].ingested_at.is_empty());
     // Verify it's a valid RFC3339 timestamp
diff --git a/docs/modules/indexd.md b/docs/modules/indexd.md
index 6b064cb3..69e55061 100644
--- a/docs/modules/indexd.md
+++ b/docs/modules/indexd.md
@@ -50,6 +50,31 @@ Alle Namespaces werden normalisiert (getrimmt, Fallback zu `default` bei leer/wh
 | **Store** | persistiert Embeddings (SQLite oder remote Vector-DB) |
 | **API** | REST-Endpunkte `/index`, `/query`, `/related` |
 
+### Provenance Tracking (source_ref)
+
+Dokumente können eine strukturierte Herkunftsreferenz (`SourceRef`) enthalten:
+
+```rust
+pub struct SourceRef {
+    pub origin: String,   // "chronik", "osctx", "code", "docs", "insights"
+    pub id: String,       // event_id, file path, hash
+    pub offset: Option<String>, // "line:42", "byte:1337-2048"
+}
+```
+
+Beispiel:
+```json
+{
+  "doc_id": "event-42",
+  "namespace": "chronik",
+  "source_ref": {
+    "origin": "chronik",
+    "id": "event-2024-01-01",
+    "offset": "42"
+  }
+}
+```
+
 ---
 
 ## Konfiguration
@@ -107,7 +132,3 @@ Das System nutzt ein latenzbasiertes Budget:
 **In Entwicklung:**
 - 🔄 SQLite-Persistenz
 - 🔄 Vektor-Embeddings und HNSW-Index
-
----
-
-**Letzte Aktualisierung:** 2025-10-23

From 943dc49795f1527180c8b304c8ab34e472dc933e Mon Sep 17 00:00:00 2001
From: "copilot-swe-agent[bot]" <198982749+Copilot@users.noreply.github.com>
Date: Fri, 2 Jan 2026 21:29:39 +0000
Subject: [PATCH 8/8] refactor(indexd): fix SourceRef test conventions, add
 usage guidelines

Co-authored-by: alexdermohr <216529510+alexdermohr@users.noreply.github.com>
---
 crates/indexd/tests/integration_test.rs |  4 +--
 docs/modules/indexd.md                  | 35 +++++++++++++++++++------
 2 files changed, 29 insertions(+), 10 deletions(-)

diff --git a/crates/indexd/tests/integration_test.rs b/crates/indexd/tests/integration_test.rs
index fc752802..bb73bacb 100644
--- a/crates/indexd/tests/integration_test.rs
+++ b/crates/indexd/tests/integration_test.rs
@@ -72,8 +72,8 @@ async fn test_fixture_corpus_indexing_and_search() {
                 meta: json!({"severity": "info"}),
                 source_ref: Some(SourceRef {
                     origin: "chronik".into(),
-                    id: format!("event-{}", i),
-                    offset: Some(format!("/var/log/events/{}.log", i)),
+                    id: format!("/var/log/events/{}.log", i),
+                    offset: Some(format!("line:{}", i * 10)), // Line position in log file
                 }),
             })
             .await;
diff --git a/docs/modules/indexd.md b/docs/modules/indexd.md
index 69e55061..8a8c8c79 100644
--- a/docs/modules/indexd.md
+++ b/docs/modules/indexd.md
@@ -62,17 +62,36 @@ pub struct SourceRef {
 }
 ```
 
-Beispiel:
+**Konventionen:**
+- `origin`: Quell-Namespace (chronik, osctx, code, docs, insights)
+- `id`: Eindeutige Referenz (Event-ID, Dateipfad, Commit-Hash)
+- `offset`: Position innerhalb der Quelle (Zeile, Byte-Range)
+  - ✅ Korrekt: `"line:42"`, `"byte:1337-2048"`, `"offset:123"`
+  - ❌ Falsch: Dateipfade gehören nach `id`, nicht nach `offset`
+
+Beispiele:
 ```json
+// Event aus Chronik-Log
 {
-  "doc_id": "event-42",
-  "namespace": "chronik",
-  "source_ref": {
-    "origin": "chronik",
-    "id": "event-2024-01-01",
-    "offset": "42"
-  }
+  "origin": "chronik",
+  "id": "/var/log/events/2024-01-01.log",
+  "offset": "line:42"
 }
+
+// Code-Snippet
+{
+  "origin": "code",
+  "id": "src/main.rs",
+  "offset": "line:100-120"
+}
+
+// Dokument ohne Positions-Info
+{
+  "origin": "docs",
+  "id": "README.md",
+  "offset": null
+}
+```
 ```
 
 ---
 
 
 
 Contributor
Copilot AI
left a comment
Pull request overview

This PR establishes semantic conventions for provenance tracking in the indexd semantic memory module. The main purpose is to prevent "drift seeds" where inconsistent test patterns become production anti-patterns by defining and documenting clear SourceRef usage conventions.

Key changes:

Introduced structured SourceRef type with origin, id, and offset fields for provenance tracking
Fixed test data conventions: file paths now correctly go in id field, position info in offset
Added comprehensive documentation for SourceRef usage patterns with examples and anti-patterns
Reviewed changes

Copilot reviewed 5 out of 6 changed files in this pull request and generated 4 comments.

Show a summary per file
crates/indexd/Cargo.toml
Comment on lines +13 to +19
rusqlite.workspace = true
chrono.workspace = true
anyhow.workspace = true

[dev-dependencies]
tower = { workspace = true, features = ["util"] }
tempfile.workspace = true
Copilot AI
6 minutes ago
The dependencies rusqlite, anyhow, and tempfile were added but are not currently used in the codebase. While the documentation mentions these are intended for future SQLite persistence implementation (docs/modules/indexd.md line 137), unused dependencies increase build times and binary size. Consider either removing these dependencies until they're actually needed, or adding a TODO comment in the code explaining the planned usage.

Suggested change
rusqlite.workspace = true
chrono.workspace = true
anyhow.workspace = true
[dev-dependencies]
tower = { workspace = true, features = ["util"] }
tempfile.workspace = true
chrono.workspace = true
[dev-dependencies]
tower = { workspace = true, features = ["util"] }
Copilot uses AI. Check for mistakes.
@alexdermohr	Reply...
docs/modules/indexd.md
  "offset": null
}
```
```
Copilot AI
6 minutes ago
Extra closing code fence creates invalid markdown. The JSON code block on line 73 is already closed on line 94, so this additional closing fence on line 95 will break the markdown rendering.

Suggested change
```
Copilot uses AI. Check for mistakes.
@alexdermohr	Reply...
crates/indexd/tests/integration_test.rs
            source_ref: Some(SourceRef {
                origin: "chronik".into(),
                id: "event-2024-01-01".into(),
                offset: Some("42".into()),
Copilot AI
6 minutes ago
The offset value "42" doesn't follow the documented SourceRef conventions. According to the documentation (lines 69-70 in docs/modules/indexd.md), offset should specify the position type, such as "line:42", "byte:1337-2048", or "offset:123". The plain "42" is ambiguous - it's unclear if this is a line number, byte offset, or some other position.
Copilot uses AI. Check for mistakes.
@alexdermohr	Reply...
crates/indexd/src/lib.rs
                source_ref: Some(SourceRef {
                    origin: "code".into(),
                    id: "test_file.rs".into(),
                    offset: Some("42".into()),
Copilot AI
6 minutes ago
The offset value "42" doesn't follow the documented SourceRef conventions. According to the documentation (lines 69-70 in docs/modules/indexd.md), offset should specify the position type, such as "line:42", "byte:1337-2048", or "offset:123". The plain "42" is ambiguous - it's unclear if this is a line number, byte offset, or some other position.

Suggested change
                    offset: Some("42".into()),
                    offset: Some("line:42".into()),
Copilot uses AI. Check for mistakes.