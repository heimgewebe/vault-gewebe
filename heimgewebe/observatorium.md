leitstand: From 15fb11b4a94dc6b2eee4030894ecdc4b1bab24a3 Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Sun, 28 Dec 2025 07:48:06 +0000
Subject: [PATCH 1/3] feat: distinguish raw observatory from published insights

Separated the Observatory UI into 'Verdichtete Erkenntnis' (Published Daily) and 'Erkenntnisraum' (Raw Observatory) sections. Implemented loading of insights.daily.json with fixture fallback in both the server and static build script. This ensures clear distinction between raw observations and committed historical insights.
---
 scripts/build-static.mjs         | 34 ++++++++++++++++++++++--
 src/fixtures/insights.daily.json | 19 ++++++++++++++
 src/server.ts                    | 30 +++++++++++++++++++++-
 src/views/observatory.ejs        | 44 ++++++++++++++++++++++++++++++++
 4 files changed, 124 insertions(+), 3 deletions(-)
 create mode 100644 src/fixtures/insights.daily.json

diff --git a/scripts/build-static.mjs b/scripts/build-static.mjs
index 1a32268..b4bad3e 100644
--- a/scripts/build-static.mjs
+++ b/scripts/build-static.mjs
@@ -85,13 +85,43 @@ async function main() {
 
   const observatoryUrl = process.env.OBSERVATORY_URL || "https://github.com/heimgewebe/semantAH/releases/download/knowledge-observatory/knowledge.observatory.json";
 
+  await mkdir(join(OUT, "observatory"), { recursive: true });
+  // Load insights.daily.json for static build
+  const insightsArtifactPath = join(ROOT, 'artifacts', 'insights.daily.json');
+  const insightsFixturePath = join(ROOT, 'src', 'fixtures', 'insights.daily.json');
+  let insightsDaily = null;
+  let insightsDailySource = null;
+  const isStrict = process.env.NODE_ENV === 'production' || process.env.OBSERVATORY_STRICT === '1';
+
+  try {
+    const content = await readFile(insightsArtifactPath, 'utf-8');
+    if (content.trim()) {
+      insightsDaily = JSON.parse(content);
+      insightsDailySource = 'artifact';
+      console.log(`Loaded insights daily from artifact: ${insightsArtifactPath}`);
+    }
+  } catch (e) {
+    if (!isStrict) {
+       try {
+         const content = await readFile(insightsFixturePath, 'utf-8');
+         insightsDaily = JSON.parse(content);
+         insightsDailySource = 'fixture';
+         console.warn('Loaded insights daily from fixture (fallback)');
+       } catch (e2) {
+         console.warn('Could not load insights.daily fixture:', e2.message);
+       }
+    } else {
+        console.warn('Insights daily artifact missing in strict mode (optional but noted).');
+    }
+  }
+
   await mkdir(join(OUT, "observatory"), { recursive: true });
   await renderTo(
     join(OUT, "observatory", "index.html"),
     "observatory",
-    { data: observatoryData },
+    { data: observatoryData, insightsDaily },
     {
-      view_meta: { source_kind: sourceKind },
+      view_meta: { source_kind: sourceKind, insights_source_kind: insightsDailySource },
       observatoryUrl: observatoryUrl
     }
   );
diff --git a/src/fixtures/insights.daily.json b/src/fixtures/insights.daily.json
new file mode 100644
index 0000000..f7ac3b3
--- /dev/null
+++ b/src/fixtures/insights.daily.json
@@ -0,0 +1,19 @@
+{
+  "id": "daily-insight-fixture",
+  "generated_at": "2023-10-27T10:00:00Z",
+  "source": "semantAH",
+  "uncertainty_score": 0.06,
+  "top_signals": [
+    {
+      "id": "ins-1",
+      "type": "insight.negation",
+      "verdict": "conflict",
+      "score": 0.95,
+      "relation": {
+        "thesis": "A",
+        "antithesis": "B"
+      }
+    }
+  ],
+  "observatory_ref": "obs-hash-123"
+}
diff --git a/src/server.ts b/src/server.ts
index 2eece42..4796532 100644
--- a/src/server.ts
+++ b/src/server.ts
@@ -79,10 +79,38 @@ app.get('/observatory', async (_req, res) => {
       }
     }
 
+    // Load insights.daily.json (Compressed/Published Knowledge)
+    const insightsArtifactPath = join(process.cwd(), 'artifacts', 'insights.daily.json');
+    const insightsFixturePath = join(process.cwd(), 'src', 'fixtures', 'insights.daily.json');
+    let insightsDaily = null;
+    let insightsDailySource = null;
+
+    try {
+      const content = await readFile(insightsArtifactPath, 'utf-8');
+      if (content.trim()) {
+        insightsDaily = JSON.parse(content);
+        insightsDailySource = 'artifact';
+      }
+    } catch (e) {
+      // Fallback to fixture if not strict
+      if (!isStrict) {
+         try {
+           const content = await readFile(insightsFixturePath, 'utf-8');
+           insightsDaily = JSON.parse(content);
+           insightsDailySource = 'fixture';
+           console.warn('Insights Daily loaded from fixture (fallback)');
+         } catch (e2) {
+           console.warn('Could not load insights.daily fixture:', e2 instanceof Error ? e2.message : String(e2));
+         }
+      }
+    }
+
     res.render('observatory', {
       data,
+      insightsDaily,
       view_meta: {
-        source_kind: sourceKind
+        source_kind: sourceKind,
+        insights_source_kind: insightsDailySource
       }
     });
   } catch (error) {
diff --git a/src/views/observatory.ejs b/src/views/observatory.ejs
index 35fb064..b7cf4d8 100644
--- a/src/views/observatory.ejs
+++ b/src/views/observatory.ejs
@@ -58,6 +58,50 @@
     </div>
   <% } %>
 
+  <!-- PUBLISHED KNOWLEDGE SECTION -->
+  <h2 class="section-title">Verdichtete Erkenntnis (Published Daily)</h2>
+  <div style="background: #e8f5e9; border: 1px solid #c8e6c9; padding: 15px; border-radius: 5px; margin-bottom: 30px;">
+    <% if (locals.insightsDaily) { %>
+       <div style="margin-bottom: 10px;">
+         <strong>Source:</strong>
+         <% if (locals.view_meta && locals.view_meta.insights_source_kind === 'artifact') { %>
+            insights.daily.json (Artifact)
+         <% } else { %>
+            insights.daily.json (Fixture)
+         <% } %>
+       </div>
+       <div style="margin-bottom: 10px;">
+         <strong>Uncertainty Score:</strong> <%= locals.insightsDaily.uncertainty_score || 'n/a' %>
+       </div>
+       <div style="margin-bottom: 10px;">
+         <strong>Observatory Ref:</strong> <%= locals.insightsDaily.observatory_ref || 'n/a' %>
+       </div>
+
+       <% if (locals.insightsDaily.top_signals && locals.insightsDaily.top_signals.length > 0) { %>
+         <h4>Top Signals (Published)</h4>
+         <div class="insights">
+           <% locals.insightsDaily.top_signals.forEach(function(signal) { %>
+             <div class="insight-card" style="border-left: 5px solid #28a745;">
+               <h4><%= signal.type || 'Signal' %></h4>
+               <div class="insight-meta">ID: <%= signal.id %></div>
+               <% if (signal.verdict) { %>
+                 <div class="verdict" style="color: #28a745;">Verdict: <%= signal.verdict %></div>
+               <% } %>
+             </div>
+           <% }); %>
+         </div>
+       <% } else { %>
+         <p>No top signals in daily digest.</p>
+       <% } %>
+
+    <% } else { %>
+       <p style="color: #666; font-style: italic;">No daily insights published yet.</p>
+    <% } %>
+  </div>
+
+  <!-- RAW KNOWLEDGE SECTION -->
+  <h2 class="section-title">Erkenntnisraum (Raw Observatory)</h2>
+
   <div id="runtime-observatory" style="margin-top: 20px; padding: 15px; background: #eef; border: 1px solid #ccd; border-radius: 5px; display: none;">
     <h3>Debug: Runtime Fetch</h3>
     <div id="obs-runtime-status">Initializing...</div>

From 8c5caafa7745bd2696fcbea8c65aa1b125c0b58a Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Sun, 28 Dec 2025 08:12:51 +0000
Subject: [PATCH 2/3] fix: align insights.daily fixture and view with schema
 contract

Updated src/fixtures/insights.daily.json to match the strict schema contract (ts, topics, questions, deltas, metadata). Adjusted src/views/observatory.ejs and src/insights.ts to render and type these fields correctly, ensuring UI and data validation compliance.
---
 src/fixtures/insights.daily.json | 34 ++++++++++---------
 src/insights.ts                  | 10 ++++++
 src/views/observatory.ejs        | 56 ++++++++++++++++++++++----------
 3 files changed, 66 insertions(+), 34 deletions(-)

diff --git a/src/fixtures/insights.daily.json b/src/fixtures/insights.daily.json
index f7ac3b3..e536716 100644
--- a/src/fixtures/insights.daily.json
+++ b/src/fixtures/insights.daily.json
@@ -1,19 +1,21 @@
 {
-  "id": "daily-insight-fixture",
-  "generated_at": "2023-10-27T10:00:00Z",
-  "source": "semantAH",
-  "uncertainty_score": 0.06,
-  "top_signals": [
-    {
-      "id": "ins-1",
-      "type": "insight.negation",
-      "verdict": "conflict",
-      "score": 0.95,
-      "relation": {
-        "thesis": "A",
-        "antithesis": "B"
-      }
-    }
+  "ts": "2025-12-28",
+  "topics": [
+    ["observatory", 0.9],
+    ["insights.daily", 0.7],
+    ["leitstand-ui", 0.5]
   ],
-  "observatory_ref": "obs-hash-123"
+  "questions": [
+    "Welche Topics aus knowledge.observatory sind stabil über 3 Tage?",
+    "Welche Deltas sind echte Trendwechsel und welche Rauschen?"
+  ],
+  "deltas": [
+    "Neue Observatory-Quelle verfügbar (Artifact statt Fixture).",
+    "UI trennt Raw Observatory und Published Daily klarer."
+  ],
+  "source": "semantAH.daily",
+  "metadata": {
+    "observatory_ref": "obs-example-001",
+    "uncertainty": 0.12
+  }
 }
diff --git a/src/insights.ts b/src/insights.ts
index 2a544c4..90c0ba1 100644
--- a/src/insights.ts
+++ b/src/insights.ts
@@ -17,6 +17,14 @@ export interface DailyInsights {
   questions: string[];
   /** Delta/changes detected */
   deltas: string[];
+  /** Optional source identifier */
+  source?: string;
+  /** Optional metadata */
+  metadata?: {
+    observatory_ref?: string;
+    uncertainty?: number;
+    [key: string]: unknown;
+  };
 }
 
 /**
@@ -50,6 +58,8 @@ export async function loadDailyInsights(path: string): Promise<DailyInsights> {
       topics,
       questions: Array.isArray(data.questions) ? data.questions.filter((q: unknown): q is string => typeof q === 'string') : [],
       deltas: Array.isArray(data.deltas) ? data.deltas.filter((d: unknown): d is string => typeof d === 'string') : [],
+      source: typeof data.source === 'string' ? data.source : undefined,
+      metadata: typeof data.metadata === 'object' && data.metadata !== null ? data.metadata : undefined,
     };
   } catch (error) {
     if (error instanceof SyntaxError) {
diff --git a/src/views/observatory.ejs b/src/views/observatory.ejs
index b7cf4d8..68bde90 100644
--- a/src/views/observatory.ejs
+++ b/src/views/observatory.ejs
@@ -71,27 +71,47 @@
          <% } %>
        </div>
        <div style="margin-bottom: 10px;">
-         <strong>Uncertainty Score:</strong> <%= locals.insightsDaily.uncertainty_score || 'n/a' %>
-       </div>
-       <div style="margin-bottom: 10px;">
-         <strong>Observatory Ref:</strong> <%= locals.insightsDaily.observatory_ref || 'n/a' %>
+         <strong>Date:</strong> <%= locals.insightsDaily.ts || 'n/a' %>
        </div>
 
-       <% if (locals.insightsDaily.top_signals && locals.insightsDaily.top_signals.length > 0) { %>
-         <h4>Top Signals (Published)</h4>
-         <div class="insights">
-           <% locals.insightsDaily.top_signals.forEach(function(signal) { %>
-             <div class="insight-card" style="border-left: 5px solid #28a745;">
-               <h4><%= signal.type || 'Signal' %></h4>
-               <div class="insight-meta">ID: <%= signal.id %></div>
-               <% if (signal.verdict) { %>
-                 <div class="verdict" style="color: #28a745;">Verdict: <%= signal.verdict %></div>
-               <% } %>
-             </div>
+       <% if (locals.insightsDaily.metadata) { %>
+         <% if (locals.insightsDaily.metadata.observatory_ref) { %>
+            <div style="margin-bottom: 10px;">
+              <strong>Observatory Ref:</strong> <%= locals.insightsDaily.metadata.observatory_ref %>
+            </div>
+         <% } %>
+         <% if (typeof locals.insightsDaily.metadata.uncertainty !== 'undefined') { %>
+            <div style="margin-bottom: 10px;">
+              <strong>Uncertainty:</strong> <%= locals.insightsDaily.metadata.uncertainty %>
+            </div>
+         <% } %>
+       <% } %>
+
+       <% if (locals.insightsDaily.topics && locals.insightsDaily.topics.length > 0) { %>
+         <h4>Topics (Weighted)</h4>
+         <ul style="margin-top: 5px; margin-bottom: 15px;">
+           <% locals.insightsDaily.topics.forEach(function(t) { %>
+             <li><%= t[0] %> <span style="color:#666; font-size:0.9em;">(<%= t[1] %>)</span></li>
+           <% }); %>
+         </ul>
+       <% } %>
+
+       <% if (locals.insightsDaily.questions && locals.insightsDaily.questions.length > 0) { %>
+         <h4>Open Questions</h4>
+         <ul style="margin-top: 5px; margin-bottom: 15px;">
+           <% locals.insightsDaily.questions.forEach(function(q) { %>
+             <li><%= q %></li>
+           <% }); %>
+         </ul>
+       <% } %>
+
+       <% if (locals.insightsDaily.deltas && locals.insightsDaily.deltas.length > 0) { %>
+         <h4>Deltas (Changes)</h4>
+         <ul style="margin-top: 5px; margin-bottom: 15px;">
+           <% locals.insightsDaily.deltas.forEach(function(d) { %>
+             <li><%= d %></li>
            <% }); %>
-         </div>
-       <% } else { %>
-         <p>No top signals in daily digest.</p>
+         </ul>
        <% } %>
 
     <% } else { %>

From 019c7737f936cef3788658e47489cbaa614b1efb Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Sun, 28 Dec 2025 08:30:24 +0000
Subject: [PATCH 3/3] feat: add URL fetch support for insights.daily.json

Implemented operational support for fetching insights.daily.json from a remote URL (INSIGHTS_DAILY_URL) during both static build and server runtime. This ensures the dashboard can display published insights in environments where local artifacts are absent, falling back to fixtures only in non-strict development modes.
---
 scripts/build-static.mjs | 48 ++++++++++++++++++++++++++++++----------
 src/server.ts            | 20 +++++++++++++++--
 2 files changed, 54 insertions(+), 14 deletions(-)

diff --git a/scripts/build-static.mjs b/scripts/build-static.mjs
index b4bad3e..c20e15d 100644
--- a/scripts/build-static.mjs
+++ b/scripts/build-static.mjs
@@ -85,14 +85,16 @@ async function main() {
 
   const observatoryUrl = process.env.OBSERVATORY_URL || "https://github.com/heimgewebe/semantAH/releases/download/knowledge-observatory/knowledge.observatory.json";
 
-  await mkdir(join(OUT, "observatory"), { recursive: true });
   // Load insights.daily.json for static build
   const insightsArtifactPath = join(ROOT, 'artifacts', 'insights.daily.json');
   const insightsFixturePath = join(ROOT, 'src', 'fixtures', 'insights.daily.json');
+  const insightsDailyUrl = process.env.INSIGHTS_DAILY_URL; // e.g. from semantAH release
+
   let insightsDaily = null;
   let insightsDailySource = null;
   const isStrict = process.env.NODE_ENV === 'production' || process.env.OBSERVATORY_STRICT === '1';
 
+  // 1. Try local artifact
   try {
     const content = await readFile(insightsArtifactPath, 'utf-8');
     if (content.trim()) {
@@ -101,17 +103,39 @@ async function main() {
       console.log(`Loaded insights daily from artifact: ${insightsArtifactPath}`);
     }
   } catch (e) {
-    if (!isStrict) {
-       try {
-         const content = await readFile(insightsFixturePath, 'utf-8');
-         insightsDaily = JSON.parse(content);
-         insightsDailySource = 'fixture';
-         console.warn('Loaded insights daily from fixture (fallback)');
-       } catch (e2) {
-         console.warn('Could not load insights.daily fixture:', e2.message);
-       }
-    } else {
-        console.warn('Insights daily artifact missing in strict mode (optional but noted).');
+    // 2. Try URL fetch if no artifact and URL is provided (Live Fetch during build)
+    if (insightsDailyUrl) {
+      try {
+        console.log(`Fetching insights daily from URL: ${insightsDailyUrl}`);
+        const response = await fetch(insightsDailyUrl);
+        if (response.ok) {
+           insightsDaily = await response.json();
+           insightsDailySource = 'fetch';
+           // Optionally write to artifact path to cache it?
+           // await writeFile(insightsArtifactPath, JSON.stringify(insightsDaily, null, 2));
+           console.log('Loaded insights daily from URL');
+        } else {
+           console.warn(`Failed to fetch insights daily from ${insightsDailyUrl}: ${response.status} ${response.statusText}`);
+        }
+      } catch (fetchErr) {
+        console.warn(`Error fetching insights daily: ${fetchErr.message}`);
+      }
+    }
+
+    // 3. Fallback to fixture
+    if (!insightsDaily) {
+        if (!isStrict) {
+           try {
+             const content = await readFile(insightsFixturePath, 'utf-8');
+             insightsDaily = JSON.parse(content);
+             insightsDailySource = 'fixture';
+             console.warn('Loaded insights daily from fixture (fallback)');
+           } catch (e2) {
+             console.warn('Could not load insights.daily fixture:', e2.message);
+           }
+        } else {
+            console.warn('Insights daily artifact missing in strict mode (optional but noted).');
+        }
     }
   }
 
diff --git a/src/server.ts b/src/server.ts
index 4796532..6b6afad 100644
--- a/src/server.ts
+++ b/src/server.ts
@@ -82,9 +82,12 @@ app.get('/observatory', async (_req, res) => {
     // Load insights.daily.json (Compressed/Published Knowledge)
     const insightsArtifactPath = join(process.cwd(), 'artifacts', 'insights.daily.json');
     const insightsFixturePath = join(process.cwd(), 'src', 'fixtures', 'insights.daily.json');
+    const insightsDailyUrl = process.env.INSIGHTS_DAILY_URL;
+
     let insightsDaily = null;
     let insightsDailySource = null;
 
+    // 1. Try local artifact
     try {
       const content = await readFile(insightsArtifactPath, 'utf-8');
       if (content.trim()) {
@@ -92,8 +95,21 @@ app.get('/observatory', async (_req, res) => {
         insightsDailySource = 'artifact';
       }
     } catch (e) {
-      // Fallback to fixture if not strict
-      if (!isStrict) {
+      // 2. Try URL fetch (Live) if not strict and URL provided
+      if (!isStrict && insightsDailyUrl) {
+         try {
+           const response = await fetch(insightsDailyUrl);
+           if (response.ok) {
+             insightsDaily = await response.json();
+             insightsDailySource = 'fetch';
+           }
+         } catch (fetchErr) {
+            console.warn('Runtime fetch for insights.daily failed:', fetchErr instanceof Error ? fetchErr.message : String(fetchErr));
+         }
+      }
+
+      // 3. Fallback to fixture
+      if (!insightsDaily && !isStrict) {
          try {
            const content = await readFile(insightsFixturePath, 'utf-8');
            insightsDaily = JSON.parse(content);
			
			
			
			semantah: From 63dde418ae38869884961a74acfb284120e468a4 Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Sun, 28 Dec 2025 07:56:27 +0000
Subject: [PATCH 1/2] feat: Integrate Observatory into Daily Insights

- Modify `scripts/export_daily_insights.py` to optionally ingest `knowledge.observatory.json`.
- Implement derivation of `uncertainty` and `observatory_ref` metadata.
- Prioritize Observatory topics over Vault scan when available.
- Update `.github/workflows/publish-insights-daily.yml` to fetch the Observatory snapshot and publish the `insights.daily.published.v1` event.
- Ensure strict adherence to "The Ideal Solution" from the dump.
---
 .github/workflows/publish-insights-daily.yml | 26 ++++++-
 scripts/export_daily_insights.py             | 81 +++++++++++++++++---
 2 files changed, 93 insertions(+), 14 deletions(-)

diff --git a/.github/workflows/publish-insights-daily.yml b/.github/workflows/publish-insights-daily.yml
index 8d94324..5a736ce 100644
--- a/.github/workflows/publish-insights-daily.yml
+++ b/.github/workflows/publish-insights-daily.yml
@@ -33,10 +33,31 @@ jobs:
       - name: Install dependencies
         run: uv sync
 
+      - name: Fetch Latest Observatory Snapshot
+        env:
+          GH_TOKEN: ${{ github.token }}
+        run: |
+          mkdir -p artifacts
+          # Attempt to download the latest stable observatory snapshot.
+          # We use || true to proceed even if it fails (e.g. first run),
+          # relying on the script's fallback logic.
+          gh release download knowledge-observatory \
+            --pattern "knowledge.observatory.json" \
+            --output "artifacts/knowledge.observatory.json" \
+            --clobber || echo "::warning::Could not fetch knowledge.observatory.json (might be first run)"
+
       - name: Generate Daily Insights
         run: |
           mkdir -p artifacts
-          uv run scripts/export_daily_insights.py --output artifacts/insights.daily.json
+          # Pass observatory path if it exists
+          OBS_ARG=""
+          if [[ -f "artifacts/knowledge.observatory.json" ]]; then
+            OBS_ARG="--observatory artifacts/knowledge.observatory.json"
+          fi
+
+          uv run scripts/export_daily_insights.py \
+            --output artifacts/insights.daily.json \
+            $OBS_ARG
 
       - name: Publish Release Asset
         env:
@@ -77,9 +98,10 @@ jobs:
           echo "::notice::Notifying Plexer: ts=$TS, generated_at=$GEN_AT, url=$URL"
 
           # Construct minimal notification payload
+          # TYPE updated to insights.daily.published.v1 as per instructions
           PAYLOAD=$(cat <<EOF
           {
-            "type": "insights.daily.published",
+            "type": "insights.daily.published.v1",
             "source": "semantAH",
             "payload": {
               "ts": "$TS",
diff --git a/scripts/export_daily_insights.py b/scripts/export_daily_insights.py
index 2729138..491d8a2 100755
--- a/scripts/export_daily_insights.py
+++ b/scripts/export_daily_insights.py
@@ -15,13 +15,16 @@
     "deltas": [],
     "source": "semantAH",
     "metadata": {
-      "generated_at": "YYYY-MM-DDTHH:MM:SSZ"
+      "generated_at": "YYYY-MM-DDTHH:MM:SSZ",
+      "observatory_ref": "obs-...",  # Optional: Reference to observatory
+      "uncertainty": 0.2              # Optional: Aggregated uncertainty (0.0-1.0)
     }
   }
 
 Verhalten:
   - Validiert Output gegen das Schema.
-  - Wenn kein Vault gefunden wird, wird ein minimaler, gültiger Stub erzeugt.
+  - Priorisiert `knowledge.observatory.json` als Quelle für Topics und Metadaten.
+  - Fallback auf Vault-Scan, wenn kein Observatory vorhanden.
 """
 
 from __future__ import annotations
@@ -109,7 +112,7 @@ def _iter_markdown_files(root: Path) -> Iterable[Path]:
         yield path
 
 
-def _derive_topics(root: Path, files: Iterable[Path]) -> List[Tuple[str, float]]:
+def _derive_topics_from_vault(root: Path, files: Iterable[Path]) -> List[Tuple[str, float]]:
     """
     Leitet grobe Themen aus Top-Level-Ordnern ab.
     """
@@ -127,7 +130,6 @@ def _derive_topics(root: Path, files: Iterable[Path]) -> List[Tuple[str, float]]
         counter[topic] += 1
 
     if not has_files:
-        # Fallback – Schema trotzdem bedienen
         return [("vault", 1.0)]
 
     items = counter.most_common(MAX_TOPICS)
@@ -141,17 +143,66 @@ def _derive_topics(root: Path, files: Iterable[Path]) -> List[Tuple[str, float]]
     ]
 
 
-def _build_payload(vault_root: Optional[Path]) -> DailyInsights:
+def _derive_topics_from_observatory(obs_data: dict) -> List[Tuple[str, float]]:
+    """
+    Extrahiert Topics aus dem Observatory-Payload.
+    """
+    raw_topics = obs_data.get("topics", [])
+    if not raw_topics:
+        return [("observatory-empty", 1.0)]
+
+    # Map [topic, confidence] -> [topic, score]
+    # We take top N by confidence
+    sorted_topics = sorted(raw_topics, key=lambda x: x.get("confidence", 0.0), reverse=True)
+    selected = sorted_topics[:MAX_TOPICS]
+
+    return [
+        (t["topic"], round(t.get("confidence", 0.0), WEIGHT_PRECISION))
+        for t in selected
+        if "topic" in t
+    ]
+
+
+def _build_payload(vault_root: Optional[Path], observatory_path: Optional[Path]) -> DailyInsights:
     """
     Baut das Tages-Insights-Payload.
     """
     today = date.today().isoformat()
+    metadata = {"generated_at": iso_now()}
+    topics = []
 
-    if vault_root and vault_root.is_dir():
-        files = _iter_markdown_files(vault_root)
-        topics = _derive_topics(vault_root, files)
-    else:
-        topics = [("vault", 1.0)]
+    # Priority: Observatory -> Vault -> Stub
+    observatory_used = False
+    if observatory_path and observatory_path.exists():
+        try:
+            obs_data = json.loads(observatory_path.read_text(encoding="utf-8"))
+            topics = _derive_topics_from_observatory(obs_data)
+
+            # Enrich metadata
+            if "observatory_id" in obs_data:
+                metadata["observatory_ref"] = obs_data["observatory_id"]
+
+            # Calculate aggregated uncertainty (1.0 - avg_confidence)
+            raw_topics = obs_data.get("topics", [])
+            if raw_topics:
+                avg_conf = sum(t.get("confidence", 0.0) for t in raw_topics) / len(raw_topics)
+                metadata["uncertainty"] = round(1.0 - avg_conf, 2)
+            else:
+                metadata["uncertainty"] = 1.0 # Max uncertainty if no topics
+
+            observatory_used = True
+            print(f"::notice:: Derived insights from Observatory: {observatory_path}")
+        except Exception as e:
+            print(f"::warning:: Failed to read observatory data: {e}", file=sys.stderr)
+
+    if not observatory_used:
+        if vault_root and vault_root.is_dir():
+            files = _iter_markdown_files(vault_root)
+            topics = _derive_topics_from_vault(vault_root, files)
+            print(f"::notice:: Derived insights from Vault: {vault_root}")
+        else:
+            topics = [("vault", 1.0)]
+            print("::notice:: Using stub insights (no vault, no observatory)")
 
     return DailyInsights(
         ts=today,
@@ -159,7 +210,7 @@ def _build_payload(vault_root: Optional[Path]) -> DailyInsights:
         questions=[],
         deltas=[],
         source="semantAH",
-        metadata={"generated_at": iso_now()},
+        metadata=metadata,
     )
 
 
@@ -177,6 +228,12 @@ def main() -> int:
         default=os.environ.get("VAULT_ROOT"),
         help="Path to the vault root (optional).",
     )
+    parser.add_argument(
+        "--observatory",
+        type=Path,
+        default=None,
+        help="Path to knowledge.observatory.json input (optional).",
+    )
     parser.add_argument(
         "--schema",
         type=Path,
@@ -193,7 +250,7 @@ def main() -> int:
     )
     schema_path = Path(schema_path)
 
-    insights = _build_payload(args.vault_root).to_json()
+    insights = _build_payload(args.vault_root, args.observatory).to_json()
 
     # Validate
     validate_payload(insights, schema_path)

From 63b0dd7d1dc42af6500d47dc3a39a941d1c22eb7 Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Sun, 28 Dec 2025 11:55:04 +0000
Subject: [PATCH 2/2] feat: Integrate Observatory into Daily Insights

- Modify `scripts/export_daily_insights.py` to optionally ingest `knowledge.observatory.json`.
- Implement derivation of `uncertainty` and `observatory_ref` metadata.
- Prioritize Observatory topics over Vault scan when available.
- Update `.github/workflows/publish-insights-daily.yml` to fetch the Observatory snapshot and publish the `insights.daily.published.v1` event.
- Ensure strict adherence to "The Ideal Solution" from the dump.
- Update tests to cover new observatory integration.
---
 tests/test_export_daily_insights.py | 55 +++++++++++++++++++++++++++++
 1 file changed, 55 insertions(+)

diff --git a/tests/test_export_daily_insights.py b/tests/test_export_daily_insights.py
index ed5dce4..95bb3b7 100644
--- a/tests/test_export_daily_insights.py
+++ b/tests/test_export_daily_insights.py
@@ -74,3 +74,58 @@ def test_export_daily_insights_with_vault(tmp_path):
     topics = dict(data["topics"])
     assert "test_topic" in topics
     assert topics["test_topic"] == 1.0
+
+
+def test_export_daily_insights_with_observatory(tmp_path):
+    # Mock observatory file
+    obs_path = tmp_path / "knowledge.observatory.json"
+    obs_data = {
+        "observatory_id": "test-obs-123",
+        "generated_at": "2025-01-01T00:00:00Z",
+        "source": {"component": "test", "version": "1"},
+        "topics": [
+            {"topic": "Alpha", "confidence": 0.9},
+            {"topic": "Beta", "confidence": 0.8},
+            {"topic": "Gamma", "confidence": 0.1} # Low confidence
+        ],
+        "signals": [],
+        "blind_spots": [],
+        "considered_but_rejected": []
+    }
+    obs_path.write_text(json.dumps(obs_data))
+
+    output_path = tmp_path / "out_obs.json"
+    script = _script_path()
+
+    subprocess.run(
+        [
+            sys.executable,
+            str(script),
+            "--output",
+            str(output_path),
+            "--observatory",
+            str(obs_path),
+        ],
+        check=True,
+        capture_output=True,
+        text=True,
+        cwd=str(script.parents[1]),
+    )
+
+    data = json.loads(output_path.read_text(encoding="utf-8"))
+
+    # Verify observatory data usage
+    topics = dict(data["topics"])
+    assert "Alpha" in topics
+    assert topics["Alpha"] == 0.9
+    assert "Beta" in topics
+    assert topics["Beta"] == 0.8
+
+    # Check metadata additions
+    meta = data["metadata"]
+    assert "observatory_ref" in meta
+    assert meta["observatory_ref"] == "test-obs-123"
+
+    # Check uncertainty (1 - avg(0.9, 0.8, 0.1) = 1 - 0.6 = 0.4)
+    assert "uncertainty" in meta
+    assert meta["uncertainty"] == 0.4

metarepo: From 393ee5559d631bd6f2d7f389c5089735483977aa Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Sun, 28 Dec 2025 07:57:11 +0000
Subject: [PATCH] feat(observatory): enhance reusable validator for guard
 integration

Updates .github/workflows/reusable-validate-observatory.yml to serve as the canonical validator for the WGX guard workflow.

- Adds inputs for STRICT mode and FAIL_ON_EMPTY.
- Adds documentation warning against duplication in WGX.
- Adds validation step for insights.daily.published.v1 artifacts.
- Refactors AJV flag handling.

This enables strict enforcement of the Knowledge Observatory -> Insights Daily -> Published Event pipeline.
---
 .../reusable-validate-observatory.yml         | 131 ++++++++++++++++--
 1 file changed, 117 insertions(+), 14 deletions(-)

diff --git a/.github/workflows/reusable-validate-observatory.yml b/.github/workflows/reusable-validate-observatory.yml
index 33d5fd1..ad3d1eb 100644
--- a/.github/workflows/reusable-validate-observatory.yml
+++ b/.github/workflows/reusable-validate-observatory.yml
@@ -1,21 +1,34 @@
----
+# Dieser Reusable wird von wgx-guard aufgerufen; keine Duplikate in wgx.
 name: validate-observatory
 permissions:
   contents: read
 
-"on":
+on:
   workflow_call:
+    inputs:
+      STRICT:
+        description: "Enforce strict schema validation (fail on errors)"
+        required: false
+        type: boolean
+        default: false
+      FAIL_ON_EMPTY:
+        description: "Fail if no relevant files are found"
+        required: false
+        type: boolean
+        default: false
   workflow_dispatch:
   push:
     paths:
       - "**/insights.daily.json"
       - "**/knowledge.observatory.json"
+      - "**/insights.daily.published.json"
       - ".github/workflows/reusable-validate-observatory.yml"
     branches: [main]
   pull_request:
     paths:
       - "**/insights.daily.json"
       - "**/knowledge.observatory.json"
+      - "**/insights.daily.published.json"
       - ".github/workflows/reusable-validate-observatory.yml"
 
 jobs:
@@ -39,10 +52,14 @@ jobs:
           echo "Agent-Mode: skipping npm install, checking ajv-cli"
           command -v ajv >/dev/null 2>&1 || { echo "::error::ajv-cli not available in Agent-Mode"; exit 1; }
 
+      # ------------------------------------------------------------------
+      # Validate insights.daily.json
+      # ------------------------------------------------------------------
       - name: Validate insights.daily.json
         shell: bash
         env:
-          # Use raw URL from metarepo/main
+          FAIL_ON_EMPTY: ${{ inputs.FAIL_ON_EMPTY }}
+          STRICT_MODE: ${{ inputs.STRICT }}
           SCHEMA_URL: >-
             https://raw.githubusercontent.com/heimgewebe/metarepo/main/contracts/insights.daily.schema.json
         run: |
@@ -53,7 +70,12 @@ jobs:
           )
 
           if (( ${#FILES[@]} == 0 )); then
-            echo "::notice::Keine insights.daily.json gefunden."
+            if [[ "$FAIL_ON_EMPTY" == "true" ]]; then
+               echo "::error::Keine insights.daily.json gefunden, aber FAIL_ON_EMPTY=true."
+               exit 1
+            else
+               echo "::notice::Keine insights.daily.json gefunden."
+            fi
           else
             echo "Prüfe ${#FILES[@]} insights.daily.json Datei(en)…"
 
@@ -61,11 +83,6 @@ jobs:
               if [ -f contracts/insights.daily.schema.json ]; then
                 cp contracts/insights.daily.schema.json /tmp/insights.schema.json
               else
-                 # Fallback for consuming repos in Agent Mode?
-                 # In Agent Mode without network, we need the schema locally.
-                 # If this runs in another repo, contracts/ might not be there.
-                 # But standard Agent Mode assumes network restriction.
-                 # For now, we assume schema is present or curl works if not strict agent mode.
                 echo "::warning::Local schema not found in Agent-Mode, skipping validation"
                 exit 0
               fi
@@ -73,17 +90,29 @@ jobs:
               curl -fsSL "$SCHEMA_URL" -o /tmp/insights.schema.json
             fi
 
+            # Determine AJV flags
+            AJV_FLAGS="--spec=draft2020 -c ajv-formats"
+            if [[ "$STRICT_MODE" == "true" ]]; then
+               AJV_FLAGS="$AJV_FLAGS --strict=true"
+            else
+               AJV_FLAGS="$AJV_FLAGS --strict=log"
+            fi
+
             for f in "${FILES[@]}"; do
-              # Skip if in node_modules or .git
               if [[ "$f" == *"node_modules"* || "$f" == *".git"* ]]; then continue; fi
               echo "→ $f"
-              ajv validate --spec=draft2020 --strict=log -c ajv-formats -s /tmp/insights.schema.json -d "$f"
+              ajv validate $AJV_FLAGS -s /tmp/insights.schema.json -d "$f"
             done
           fi
 
+      # ------------------------------------------------------------------
+      # Validate knowledge.observatory.json
+      # ------------------------------------------------------------------
       - name: Validate knowledge.observatory.json
         shell: bash
         env:
+          FAIL_ON_EMPTY: ${{ inputs.FAIL_ON_EMPTY }}
+          STRICT_MODE: ${{ inputs.STRICT }}
           SCHEMA_URL: >-
             https://raw.githubusercontent.com/heimgewebe/metarepo/main/contracts/knowledge.observatory.schema.json
         run: |
@@ -94,7 +123,12 @@ jobs:
           )
 
           if (( ${#FILES[@]} == 0 )); then
-            echo "::notice::Keine knowledge.observatory.json gefunden."
+            if [[ "$FAIL_ON_EMPTY" == "true" ]]; then
+               echo "::error::Keine knowledge.observatory.json gefunden, aber FAIL_ON_EMPTY=true."
+               exit 1
+            else
+               echo "::notice::Keine knowledge.observatory.json gefunden."
+            fi
           else
             echo "Prüfe ${#FILES[@]} knowledge.observatory.json Datei(en)…"
 
@@ -109,10 +143,79 @@ jobs:
               curl -fsSL "$SCHEMA_URL" -o /tmp/observatory.schema.json
             fi
 
+            AJV_FLAGS="--spec=draft2020 -c ajv-formats"
+            if [[ "$STRICT_MODE" == "true" ]]; then
+               AJV_FLAGS="$AJV_FLAGS --strict=true"
+            else
+               AJV_FLAGS="$AJV_FLAGS --strict=log"
+            fi
+
+            for f in "${FILES[@]}"; do
+              if [[ "$f" == *"node_modules"* || "$f" == *".git"* ]]; then continue; fi
+              echo "→ $f"
+              ajv validate $AJV_FLAGS -s /tmp/observatory.schema.json -d "$f"
+            done
+          fi
+
+      # ------------------------------------------------------------------
+      # Validate insights.daily.published.json (Events)
+      # ------------------------------------------------------------------
+      - name: Validate insights.daily.published.json
+        shell: bash
+        env:
+          FAIL_ON_EMPTY: ${{ inputs.FAIL_ON_EMPTY }}
+          STRICT_MODE: ${{ inputs.STRICT }}
+          # Canonical URL for the event schema
+          SCHEMA_URL: >-
+            https://raw.githubusercontent.com/heimgewebe/metarepo/main/contracts/events/insights.daily.published.v1.schema.json
+        run: |
+          set -euo pipefail
+          shopt -s nullglob globstar
+          declare -a FILES=(
+            **/insights.daily.published.json
+            **/insights.daily.published.v1.json
+          )
+
+          if (( ${#FILES[@]} == 0 )); then
+            # No error here even if FAIL_ON_EMPTY is true?
+            # The prompt implies published events are crucial, but maybe not present in every run.
+            # However, if FAIL_ON_EMPTY is requested, we should probably honor it or handle it specifically.
+            # Given instructions: "Guard 2: insights.daily.published.v1 muss schema-valid sein"
+            # I will apply FAIL_ON_EMPTY logic here too if set.
+            if [[ "$FAIL_ON_EMPTY" == "true" ]]; then
+               echo "::notice::Keine insights.daily.published.json gefunden (FAIL_ON_EMPTY active)."
+               # Not strictly failing here unless we want to force publication existence?
+               # The user says: "Trigger explizit: insights.daily -> insights.daily.published.v1"
+               # If the caller sets FAIL_ON_EMPTY, they likely expect files.
+               echo "::error::Keine insights.daily.published.json gefunden."
+               exit 1
+            else
+               echo "::notice::Keine insights.daily.published.json gefunden."
+            fi
+          else
+            echo "Prüfe ${#FILES[@]} insights.daily.published.json Datei(en)…"
+
+            if [[ "${AGENT_MODE:-}" != "" ]]; then
+              if [ -f contracts/events/insights.daily.published.v1.schema.json ]; then
+                cp contracts/events/insights.daily.published.v1.schema.json /tmp/published.schema.json
+              else
+                echo "::warning::Local schema not found in Agent-Mode, skipping validation"
+                exit 0
+              fi
+            else
+              curl -fsSL "$SCHEMA_URL" -o /tmp/published.schema.json
+            fi
+
+            AJV_FLAGS="--spec=draft2020 -c ajv-formats"
+            if [[ "$STRICT_MODE" == "true" ]]; then
+               AJV_FLAGS="$AJV_FLAGS --strict=true"
+            else
+               AJV_FLAGS="$AJV_FLAGS --strict=log"
+            fi
+
             for f in "${FILES[@]}"; do
-               # Skip if in node_modules or .git
               if [[ "$f" == *"node_modules"* || "$f" == *".git"* ]]; then continue; fi
               echo "→ $f"
-              ajv validate --spec=draft2020 --strict=log -c ajv-formats -s /tmp/observatory.schema.json -d "$f"
+              ajv validate $AJV_FLAGS -s /tmp/published.schema.json -d "$f"
             done
           fi
		   
		   wgx: From b0bf2d0da2bc2163d552bb4b53a81a07e08bfdfb Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Sun, 28 Dec 2025 07:57:44 +0000
Subject: [PATCH 1/2] ci(guard): integrate canonical observatory validation
 from metarepo

- Add `validate-observatory` job to `.github/workflows/wgx-guard.yml`
- Invoke `heimgewebe/metarepo` reusable workflow pinned to `8a509b1`
- Ensures canonical validation for insights.daily.json and knowledge.observatory.json without duplicating logic in wgx
---
 .github/workflows/wgx-guard.yml | 5 +++++
 1 file changed, 5 insertions(+)

diff --git a/.github/workflows/wgx-guard.yml b/.github/workflows/wgx-guard.yml
index 335c5e9..ef113c0 100644
--- a/.github/workflows/wgx-guard.yml
+++ b/.github/workflows/wgx-guard.yml
@@ -60,3 +60,8 @@ jobs:
             echo "::warning::Neither guard nor smoke task found in profile"
             exit 0
           fi
+
+  validate-observatory:
+    uses: heimgewebe/metarepo/.github/workflows/reusable-validate-observatory.yml@8a509b1da5e3b13b2f0d444227d0c5e3b6805a0a
+    permissions:
+      contents: read

From 29175c953ca931cba43a7c30c35a4db1be9914ab Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Sun, 28 Dec 2025 11:57:20 +0000
Subject: [PATCH 2/2] ci(guard): configure strictness for observatory
 validation

- Set `STRICT: true` to enforce schema validation for existing files.
- Set `FAIL_ON_EMPTY: false` to allow execution in repos without observatory artifacts.
- Ensures the guard is robust against schema drift while remaining fair to non-observatory repos.
---
 .github/workflows/wgx-guard.yml | 3 +++
 1 file changed, 3 insertions(+)

diff --git a/.github/workflows/wgx-guard.yml b/.github/workflows/wgx-guard.yml
index ef113c0..de19176 100644
--- a/.github/workflows/wgx-guard.yml
+++ b/.github/workflows/wgx-guard.yml
@@ -63,5 +63,8 @@ jobs:
 
   validate-observatory:
     uses: heimgewebe/metarepo/.github/workflows/reusable-validate-observatory.yml@8a509b1da5e3b13b2f0d444227d0c5e3b6805a0a
+    with:
+      STRICT: true
+      FAIL_ON_EMPTY: false
     permissions:
       contents: read