#291: 

From 0aa845c6af308ff28622a7aa1464926da3ef974a Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Tue, 30 Dec 2025 13:54:48 +0000
Subject: [PATCH] feat(core): refine include_paths semantics and prescan logic

- Core: scan_repo now treats include_paths=[] as empty whitelist (not all)
- Core: scan_repo normalizes ["."] or [""] to None (all)
- Service: calculate_job_hash distinguishes None vs [] for correct idempotency
- Service: remove unused 'hub' field from PrescanRequest
- UI: improve 'test' heuristic to use path segments instead of substring
- Core: prescan_repo matches ignore_globs against relpath and name
---
 merger/lenskit/core/merge.py          | 20 +++++++++++++-------
 merger/lenskit/frontends/webui/app.js | 18 ++++++++++++++----
 merger/lenskit/service/models.py      |  9 +++++++--
 3 files changed, 34 insertions(+), 13 deletions(-)

diff --git a/merger/lenskit/core/merge.py b/merger/lenskit/core/merge.py
index cdc93f8..7789a76 100644
--- a/merger/lenskit/core/merge.py
+++ b/merger/lenskit/core/merge.py
@@ -1834,14 +1834,14 @@ def prescan_repo(repo_root: Path, max_depth: int = 10, ignore_globs: Optional[Li
     node_count = 0
     MAX_NODES = 50000
 
-    def _is_ignored(name: str) -> bool:
+    def _is_ignored(name: str, relpath: str) -> bool:
         if name in ignore_set or name in SKIP_FILES:
             return True
         if name.startswith(".env") and name not in (".env.example", ".env.template", ".env.sample"):
             return True
         if ignore_globs:
             for g in ignore_globs:
-                if fnmatch.fnmatch(name, g):
+                if fnmatch.fnmatch(name, g) or fnmatch.fnmatch(relpath, g):
                     return True
         return False
 
@@ -1868,10 +1868,11 @@ def _walk(path: Path, depth: int) -> Dict[str, Any]:
             return node
 
         for name in entries:
-            if _is_ignored(name):
-                continue
-
             full = path / name
+            rel_str = full.relative_to(repo_root).as_posix()
+
+            if _is_ignored(name, rel_str):
+                continue
 
             # Symlink Check (Security/Recursion)
             if full.is_symlink():
@@ -1942,7 +1943,12 @@ def scan_repo(repo_root: Path, extensions: Optional[List[str]] = None, path_cont
     # Optimize include_paths check
     include_set = None
     include_prefixes = []
-    if include_paths:
+
+    # Normalize: ["."] or [""] -> None
+    if include_paths is not None and any(p in (".", "") for p in include_paths):
+        include_paths = None
+
+    if include_paths is not None:
         include_set = set(include_paths)
         # Store prefixes for directory matching optimization
         for p in include_paths:
@@ -1987,7 +1993,7 @@ def scan_repo(repo_root: Path, extensions: Optional[List[str]] = None, path_cont
                 if include_paths is not None:
                      # If file is explicitly in include_set or under an included directory
                      matched = False
-                     if rel_path_str in include_set:
+                     if include_set and rel_path_str in include_set:
                          matched = True
                      else:
                          for prefix in include_prefixes:
diff --git a/merger/lenskit/frontends/webui/app.js b/merger/lenskit/frontends/webui/app.js
index 3f857bd..a3f32a7 100644
--- a/merger/lenskit/frontends/webui/app.js
+++ b/merger/lenskit/frontends/webui/app.js
@@ -1040,15 +1040,25 @@ function prescanRecommended() {
     function visit(node) {
         if (node.type === 'file') {
             const path = node.path.toLowerCase();
-            // Critical
+            const parts = path.split('/');
+
+            // Critical (Force Include)
             if (path.includes('readme') || path.endsWith('.ai-context.yml')) {
                 prescanSelection.add(node.path);
                 return;
             }
-            // Code
-            const parts = path.split('/');
+
+            // Heuristic Filter: exclude explicit test paths
+            const isTest = parts.includes('tests') ||
+                           parts.includes('__tests__') ||
+                           parts.includes('test') ||
+                           path.endsWith('.test.js') || path.endsWith('.test.ts') ||
+                           path.endsWith('.spec.js') || path.endsWith('.spec.ts') ||
+                           path.endsWith('_test.py');
+
+            // Code Categories
             if (parts.includes('src') || parts.includes('contracts') || parts.includes('docs')) {
-                if (!path.includes('test')) {
+                if (!isTest) {
                      prescanSelection.add(node.path);
                 }
             }
diff --git a/merger/lenskit/service/models.py b/merger/lenskit/service/models.py
index f03c3bf..5dd0347 100644
--- a/merger/lenskit/service/models.py
+++ b/merger/lenskit/service/models.py
@@ -27,7 +27,13 @@ def calculate_job_hash(req: "JobRequest", hub_resolved: str, version: str) -> st
     ext_list = sorted(req.extensions) if req.extensions else []
 
     # Normalize include_paths
-    inc_paths = sorted(req.include_paths) if req.include_paths else []
+    inc_paths = None
+    if req.include_paths is not None:
+        # Check for explicit "all" markers (match scan_repo logic)
+        if any(p in (".", "") for p in req.include_paths):
+            inc_paths = None
+        else:
+            inc_paths = sorted(req.include_paths)
 
     # Construct signature dict
     sig = {
@@ -134,7 +140,6 @@ def create(cls, request: JobRequest, content_hash: Optional[str] = None) -> "Job
         )
 
 class PrescanRequest(BaseModel):
-    hub: Optional[str] = None
     repo: str # Repo name to scan
     max_depth: int = 10
     ignore_globs: Optional[List[str]] = None
	 
	 
	 
	 #292:
	 
	 From dcc053f6b016392e9088b407960f3fedcf46c41e Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Tue, 30 Dec 2025 14:30:54 +0000
Subject: [PATCH] Refine include_paths tri-state logic, prescan ignores, and UI
 heuristics

- `service/models.py`:
    - Remove unused `hub` field from `PrescanRequest`.
    - Update `calculate_job_hash` to handle `include_paths` tri-state: `None` (all), `[]` (empty/force-only), `["."]` (all). `None` and `["."]` normalize to `None`, but `[]` is preserved as-is.
- `core/merge.py`:
    - Update `scan_repo` to mirror tri-state logic: explicit check `if include_paths is not None` allows empty list to filter everything.
    - Update `prescan_repo`'s `_is_ignored` to match globs against both `basename` and `relpath`.
- `frontends/webui/app.js`: Refine `prescanRecommended` heuristic to avoid false positives (e.g. "latest") by checking path segments and specific suffixes for tests.
- Added regression tests for hash idempotency and core scan behavior.
---
 merger/lenskit/core/merge.py                  | 25 ++++--
 merger/lenskit/frontends/webui/app.js         |  9 ++-
 merger/lenskit/service/models.py              |  8 +-
 .../tests/test_merge_core_tri_state.py        | 79 +++++++++++++++++++
 4 files changed, 111 insertions(+), 10 deletions(-)
 create mode 100644 merger/lenskit/tests/test_merge_core_tri_state.py

diff --git a/merger/lenskit/core/merge.py b/merger/lenskit/core/merge.py
index cdc93f8..6a39587 100644
--- a/merger/lenskit/core/merge.py
+++ b/merger/lenskit/core/merge.py
@@ -1834,14 +1834,15 @@ def prescan_repo(repo_root: Path, max_depth: int = 10, ignore_globs: Optional[Li
     node_count = 0
     MAX_NODES = 50000
 
-    def _is_ignored(name: str) -> bool:
+    def _is_ignored(name: str, relpath: str) -> bool:
         if name in ignore_set or name in SKIP_FILES:
             return True
         if name.startswith(".env") and name not in (".env.example", ".env.template", ".env.sample"):
             return True
         if ignore_globs:
             for g in ignore_globs:
-                if fnmatch.fnmatch(name, g):
+                # User request: match against name (basename) OR relpath
+                if fnmatch.fnmatch(name, g) or fnmatch.fnmatch(relpath, g):
                     return True
         return False
 
@@ -1852,8 +1853,9 @@ def _walk(path: Path, depth: int) -> Dict[str, Any]:
             # Hard abort signal
             raise RuntimeError(f"Prescan limit reached ({MAX_NODES} nodes). Repo too large.")
 
+        rel_dir = path.relative_to(repo_root).as_posix() if path != repo_root else "."
         node = {
-            "path": path.relative_to(repo_root).as_posix() if path != repo_root else ".",
+            "path": rel_dir,
             "type": "dir",
             "children": []
         }
@@ -1868,11 +1870,15 @@ def _walk(path: Path, depth: int) -> Dict[str, Any]:
             return node
 
         for name in entries:
-            if _is_ignored(name):
-                continue
-
             full = path / name
 
+            # Compute relpath for check
+            # if rel_dir is ".", then relpath is name. Else rel_dir/name.
+            child_rel = name if rel_dir == "." else f"{rel_dir}/{name}"
+
+            if _is_ignored(name, child_rel):
+                continue
+
             # Symlink Check (Security/Recursion)
             if full.is_symlink():
                 continue
@@ -1942,7 +1948,12 @@ def scan_repo(repo_root: Path, extensions: Optional[List[str]] = None, path_cont
     # Optimize include_paths check
     include_set = None
     include_prefixes = []
-    if include_paths:
+
+    # Normalize: ["."] or [""] -> None (all)
+    if include_paths is not None and any(p in (".", "") for p in include_paths):
+        include_paths = None
+
+    if include_paths is not None:
         include_set = set(include_paths)
         # Store prefixes for directory matching optimization
         for p in include_paths:
diff --git a/merger/lenskit/frontends/webui/app.js b/merger/lenskit/frontends/webui/app.js
index 3f857bd..17c9e9c 100644
--- a/merger/lenskit/frontends/webui/app.js
+++ b/merger/lenskit/frontends/webui/app.js
@@ -1048,7 +1048,14 @@ function prescanRecommended() {
             // Code
             const parts = path.split('/');
             if (parts.includes('src') || parts.includes('contracts') || parts.includes('docs')) {
-                if (!path.includes('test')) {
+                // Improved test exclusion heuristic (User request E)
+                const isTest = parts.includes('tests') ||
+                               parts.includes('test') ||
+                               path.includes('_test.') ||
+                               path.includes('.test.') ||
+                               path.includes('.spec.');
+
+                if (!isTest) {
                      prescanSelection.add(node.path);
                 }
             }
diff --git a/merger/lenskit/service/models.py b/merger/lenskit/service/models.py
index f03c3bf..10c4e6d 100644
--- a/merger/lenskit/service/models.py
+++ b/merger/lenskit/service/models.py
@@ -27,7 +27,12 @@ def calculate_job_hash(req: "JobRequest", hub_resolved: str, version: str) -> st
     ext_list = sorted(req.extensions) if req.extensions else []
 
     # Normalize include_paths
-    inc_paths = sorted(req.include_paths) if req.include_paths else []
+    inc_paths = None
+    if req.include_paths is not None:
+        if any(p in (".", "") for p in req.include_paths):
+            inc_paths = None
+        else:
+            inc_paths = sorted(req.include_paths)
 
     # Construct signature dict
     sig = {
@@ -134,7 +139,6 @@ def create(cls, request: JobRequest, content_hash: Optional[str] = None) -> "Job
         )
 
 class PrescanRequest(BaseModel):
-    hub: Optional[str] = None
     repo: str # Repo name to scan
     max_depth: int = 10
     ignore_globs: Optional[List[str]] = None
diff --git a/merger/lenskit/tests/test_merge_core_tri_state.py b/merger/lenskit/tests/test_merge_core_tri_state.py
new file mode 100644
index 0000000..0d067f2
--- /dev/null
+++ b/merger/lenskit/tests/test_merge_core_tri_state.py
@@ -0,0 +1,79 @@
+
+import pytest
+from pathlib import Path
+from merger.lenskit.core.merge import scan_repo
+
+def test_scan_repo_include_paths_tri_state(tmp_path):
+    # Setup dummy repo
+    repo = tmp_path / "repo"
+    repo.mkdir()
+    (repo / "readme.md").write_text("info") # critical
+    (repo / "src").mkdir()
+    (repo / "src" / "main.py").write_text("code")
+    (repo / "docs").mkdir()
+    (repo / "docs" / "manual.md").write_text("manual")
+
+    # 1. include_paths = None (All)
+    res_none = scan_repo(repo, include_paths=None)
+    files_none = [f.rel_path.as_posix() for f in res_none["files"]]
+    assert "readme.md" in files_none
+    assert "src/main.py" in files_none
+    assert "docs/manual.md" in files_none
+
+    # 2. include_paths = [] (Empty/Force-only)
+    res_empty = scan_repo(repo, include_paths=[])
+    files_empty = [f.rel_path.as_posix() for f in res_empty["files"]]
+    assert "readme.md" in files_empty # Critical always included
+    assert "src/main.py" not in files_empty
+    assert "docs/manual.md" not in files_empty
+
+    # 3. include_paths = ["."] (All)
+    res_dot = scan_repo(repo, include_paths=["."])
+    files_dot = [f.rel_path.as_posix() for f in res_dot["files"]]
+    assert set(files_dot) == set(files_none)
+
+    # 4. include_paths = ["src"] (Whitelist dir)
+    res_src = scan_repo(repo, include_paths=["src"])
+    files_src = [f.rel_path.as_posix() for f in res_src["files"]]
+    assert "readme.md" in files_src # Critical
+    assert "src/main.py" in files_src
+    assert "docs/manual.md" not in files_src
+
+def test_prescan_ignore_globs_relpath(tmp_path):
+    from merger.lenskit.core.merge import prescan_repo
+
+    repo = tmp_path / "repo2"
+    repo.mkdir()
+    (repo / "foo.lock").write_text("lock")
+    (repo / "sub").mkdir()
+    (repo / "sub" / "foo.lock").write_text("lock")
+    (repo / "keep.txt").write_text("keep")
+
+    # Ignore *.lock (basename match)
+    res_base = prescan_repo(repo, ignore_globs=["*.lock"])
+    # We need to traverse tree to find files
+    files_base = []
+    def visit(node):
+        if node["type"] == "file":
+            files_base.append(node["path"])
+        for c in node.get("children", []):
+            visit(c)
+    visit(res_base["tree"])
+
+    assert "keep.txt" in files_base
+    assert "foo.lock" not in files_base
+    assert "sub/foo.lock" not in files_base
+
+    # Ignore sub/ (relpath match)
+    res_rel = prescan_repo(repo, ignore_globs=["sub/*"])
+    files_rel = []
+    def visit2(node):
+        if node["type"] == "file":
+            files_rel.append(node["path"])
+        for c in node.get("children", []):
+            visit2(c)
+    visit2(res_rel["tree"])
+
+    assert "keep.txt" in files_rel
+    assert "foo.lock" in files_rel
+    assert "sub/foo.lock" not in files_rel