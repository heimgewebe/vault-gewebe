#276: From 35d6da770fab12a2041b5d0862a60ba50d7d7bef Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Sat, 27 Dec 2025 16:10:20 +0000
Subject: [PATCH 1/4] fix(core): unconditional calculation of metadata flags

Fixes `UnboundLocalError` when accessing `content_present` in cases where `text_files_count > 0`, by moving flag calculation out of the `else` block.
Corrects indentation of meta keys in the `meta_dict` structure.
---
 merger/lenskit/core/merge.py | 22 +++++++++++-----------
 1 file changed, 11 insertions(+), 11 deletions(-)

diff --git a/merger/lenskit/core/merge.py b/merger/lenskit/core/merge.py
index 78c3684..45d42b8 100644
--- a/merger/lenskit/core/merge.py
+++ b/merger/lenskit/core/merge.py
@@ -3001,14 +3001,14 @@ def iter_report_blocks(
     else:
         coverage_pct = 0.0
 
-        # Flags for machine readability of content presence
-        # Plan-Only means NO content, NO manifest (usually), NO structure.
-        # Check actual logic below: plan_only causes early return before structure/manifest/content.
-        content_present = not plan_only
-        # Manifest is present unless plan_only (logic: if plan_only: return)
-        manifest_present = not plan_only
-        # Structure is present unless plan_only OR machine_lean
-        structure_present = (not plan_only) and (level != "machine-lean")
+    # Flags for machine readability of content presence
+    # Plan-Only means NO content, NO manifest (usually), NO structure.
+    # Check actual logic below: plan_only causes early return before structure/manifest/content.
+    content_present = not plan_only
+    # Manifest is present unless plan_only (logic: if plan_only: return)
+    manifest_present = not plan_only
+    # Structure is present unless plan_only OR machine_lean
+    structure_present = (not plan_only) and (level != "machine-lean")
 
     meta_dict: Dict[str, Any] = {
         "merge": {
@@ -3027,9 +3027,9 @@ def iter_report_blocks(
             "generated_at": now.strftime('%Y-%m-%dT%H:%M:%SZ'),  # ISO-8601 timestamp
             "total_files": total_files,        # Total number of files in the merge
             "total_size_bytes": total_size,    # Sum of all file sizes
-                "content_present": content_present,
-                "manifest_present": manifest_present,
-                "structure_present": structure_present,
+            "content_present": content_present,
+            "manifest_present": manifest_present,
+            "structure_present": structure_present,
             "coverage": {
                 "included_files": included_count,
                 "text_files": text_files_count,

From f4675c25c6bc10a1dbcd1caf1d1d44d7ce5918b1 Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Sat, 27 Dec 2025 16:26:10 +0000
Subject: [PATCH 2/4] fix(core): unconditional calculation of metadata flags
 with regression test

- Fix `UnboundLocalError` by moving `content_present`, `manifest_present`, and `structure_present` calculation out of `else` block.
- Correct indentation of metadata keys in `meta_dict`.
- Add regression test `test_iter_report_blocks_meta_flags_regression`.
- Refine comments to clarify dependencies on `plan_only` logic.
---
 merger/lenskit/core/merge.py            |  2 +-
 merger/lenskit/tests/test_merge_core.py | 51 +++++++++++++++++++++++++
 2 files changed, 52 insertions(+), 1 deletion(-)

diff --git a/merger/lenskit/core/merge.py b/merger/lenskit/core/merge.py
index 45d42b8..c01b6c6 100644
--- a/merger/lenskit/core/merge.py
+++ b/merger/lenskit/core/merge.py
@@ -3003,7 +3003,7 @@ def iter_report_blocks(
 
     # Flags for machine readability of content presence
     # Plan-Only means NO content, NO manifest (usually), NO structure.
-    # Check actual logic below: plan_only causes early return before structure/manifest/content.
+    # Check actual logic below: plan_only currently causes early return before structure/manifest/content.
     content_present = not plan_only
     # Manifest is present unless plan_only (logic: if plan_only: return)
     manifest_present = not plan_only
diff --git a/merger/lenskit/tests/test_merge_core.py b/merger/lenskit/tests/test_merge_core.py
index 69cef95..63db9fa 100644
--- a/merger/lenskit/tests/test_merge_core.py
+++ b/merger/lenskit/tests/test_merge_core.py
@@ -12,7 +12,9 @@
     classify_file_v2,
     _generate_run_id,
     determine_inclusion_status,
+    iter_report_blocks,
     FileInfo,
+    ExtrasConfig,
     DEBUG_CONFIG
 )
 
@@ -95,5 +97,54 @@ def test_determine_inclusion_status(self):
         fi.is_text = False
         self.assertEqual(determine_inclusion_status(fi, "max", 0), "omitted")
 
+    def test_iter_report_blocks_meta_flags_regression(self):
+        """
+        Regression test for UnboundLocalError when calculating meta flags.
+        Ensures content_present etc. are defined even when text_files_count > 0.
+        """
+        # Create a mock text file info
+        fi = FileInfo(
+            root_label="test-repo",
+            abs_path=Path("/tmp/fake/path.txt"),
+            rel_path=Path("path.txt"),
+            size=100,
+            is_text=True,
+            md5="dummy",
+            category="source",
+            tags=[],
+            ext=".txt",
+            skipped=False,
+            reason=None,
+            content=None,
+            inclusion_reason="normal"
+        )
+        files = [fi]
+        sources = [Path("/tmp/fake")]
+
+        # Capture output
+        output_blocks = []
+        try:
+            for block in iter_report_blocks(
+                files=files,
+                level="dev",
+                max_file_bytes=0,
+                sources=sources,
+                plan_only=False,
+                code_only=False,
+                debug=False,
+                extras=ExtrasConfig()
+            ):
+                output_blocks.append(block)
+        except UnboundLocalError:
+            self.fail("iter_report_blocks raised UnboundLocalError (meta flags scope bug)")
+
+        full_output = "".join(output_blocks)
+
+        # Verify keys are present in the YAML block
+        # We look for the strings in the markdown output
+        self.assertIn("content_present: true", full_output)
+        self.assertIn("manifest_present: true", full_output)
+        self.assertIn("structure_present: true", full_output)
+
 if __name__ == '__main__':
     unittest.main()

From 274836594972d9f5720c23ad70e13181acc711dd Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Sat, 27 Dec 2025 16:45:35 +0000
Subject: [PATCH 3/4] fix(core): unconditional calculation of metadata flags
 with regression test

- Fix `UnboundLocalError` by moving `content_present`, `manifest_present`, and `structure_present` calculation out of `else` block.
- Correct indentation of metadata keys in `meta_dict`.
- Add hardened regression test `test_iter_report_blocks_meta_flags_regression`.
- Refine comments to clarify dependencies on `plan_only` logic.
---
 merger/lenskit/tests/test_merge_core.py | 16 +++++++++-------
 1 file changed, 9 insertions(+), 7 deletions(-)

diff --git a/merger/lenskit/tests/test_merge_core.py b/merger/lenskit/tests/test_merge_core.py
index 63db9fa..d01537f 100644
--- a/merger/lenskit/tests/test_merge_core.py
+++ b/merger/lenskit/tests/test_merge_core.py
@@ -101,6 +101,7 @@ def test_iter_report_blocks_meta_flags_regression(self):
         """
         Regression test for UnboundLocalError when calculating meta flags.
         Ensures content_present etc. are defined even when text_files_count > 0.
+        Hardened to be deterministic and FS-independent.
         """
         # Create a mock text file info
         fi = FileInfo(
@@ -121,7 +122,7 @@ def test_iter_report_blocks_meta_flags_regression(self):
         files = [fi]
         sources = [Path("/tmp/fake")]
 
-        # Capture output
+        # Capture output until @meta block is complete (avoid FS access for content)
         output_blocks = []
         try:
             for block in iter_report_blocks(
@@ -132,19 +133,20 @@ def test_iter_report_blocks_meta_flags_regression(self):
                 plan_only=False,
                 code_only=False,
                 debug=False,
-                extras=ExtrasConfig()
+                extras=ExtrasConfig.none()  # Ensure no side-effects
             ):
                 output_blocks.append(block)
+                if "<!-- @meta:end -->" in block:
+                    break
         except UnboundLocalError:
             self.fail("iter_report_blocks raised UnboundLocalError (meta flags scope bug)")
 
         full_output = "".join(output_blocks)
 
-        # Verify keys are present in the YAML block
-        # We look for the strings in the markdown output
-        self.assertIn("content_present: true", full_output)
-        self.assertIn("manifest_present: true", full_output)
-        self.assertIn("structure_present: true", full_output)
+        # Verify keys are present in the YAML block (robust regex check)
+        self.assertRegex(full_output, r"content_present:\s*(true|True)")
+        self.assertRegex(full_output, r"manifest_present:\s*(true|True)")
+        self.assertRegex(full_output, r"structure_present:\s*(true|True)")
 
 if __name__ == '__main__':
     unittest.main()

From 31c00cfcbb8fd1aab4efd89d735eef5315621fb6 Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Sat, 27 Dec 2025 16:56:38 +0000
Subject: [PATCH 4/4] fix(core): unconditional calculation of metadata flags
 with regression test and forensics

- Fix `UnboundLocalError` by moving `content_present`, `manifest_present`, and `structure_present` calculation out of `else` block.
- Correct indentation of metadata keys in `meta_dict`.
- Add hardened regression test `test_iter_report_blocks_meta_flags_regression`.
- Add temporary forensic logging (build ID, file path, meta flags) to diagnose deployment issues.
- Refine comments to clarify dependencies on `plan_only` logic.
---
 merger/lenskit/core/merge.py | 11 +++++++++++
 1 file changed, 11 insertions(+)

diff --git a/merger/lenskit/core/merge.py b/merger/lenskit/core/merge.py
index c01b6c6..56aca36 100644
--- a/merger/lenskit/core/merge.py
+++ b/merger/lenskit/core/merge.py
@@ -23,6 +23,11 @@
 except Exception:  # pragma: no cover
     yaml = None
 
+# Forensik für Deployment-Debugging (User Request)
+LENSKIT_BUILD_ID = "meta-flags-fix-2025-12-27-1"
+print("[lenskit] merge.py loaded from:", __file__)
+print("[lenskit] build:", LENSKIT_BUILD_ID)
+
 
 _NON_ALNUM = re.compile(r"[^a-z0-9]+")
 
@@ -3010,6 +3015,12 @@ def iter_report_blocks(
     # Structure is present unless plan_only OR machine_lean
     structure_present = (not plan_only) and (level != "machine-lean")
 
+    # Forensik-Log für Debugging
+    print("[lenskit] meta flags:", plan_only, level, "->",
+          "content_present=", content_present,
+          "manifest_present=", manifest_present,
+          "structure_present=", structure_present)
+
     meta_dict: Dict[str, Any] = {
         "merge": {
             "spec_version": SPEC_VERSION,
			 
			 
			 #277: From dd8ba1d270da554f8160dcbafabb993bdaa36007 Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Sat, 27 Dec 2025 17:10:23 +0000
Subject: [PATCH] fix(core): always define meta flags in iter_report_blocks

Fixes UnboundLocalError when text_files_count > 0 by computing content_present/manifest_present/structure_present unconditionally.
Corrects meta_dict indentation so flags are emitted at the correct level; adds regression test.
---
 merger/lenskit/core/merge.py            | 25 +++++++-------
 merger/lenskit/tests/test_merge_core.py | 43 +++++++++++++++++++++++++
 2 files changed, 56 insertions(+), 12 deletions(-)

diff --git a/merger/lenskit/core/merge.py b/merger/lenskit/core/merge.py
index 78c3684..c0c9f5a 100644
--- a/merger/lenskit/core/merge.py
+++ b/merger/lenskit/core/merge.py
@@ -2994,6 +2994,16 @@ def iter_report_blocks(
 
     # Coverage-Infos für KIs: Wie viel des relevanten Textbestands ist wirklich als Voll-Content drin?
     total_files = len(files)
+
+    # Flags for machine readability of content presence
+    # Plan-Only means NO content, NO manifest (usually), NO structure.
+    # Check actual logic below: plan_only causes early return before structure/manifest/content.
+    content_present = not plan_only
+    # Manifest is present unless plan_only (logic: if plan_only: return)
+    manifest_present = not plan_only
+    # Structure is present unless plan_only OR machine_lean
+    structure_present = (not plan_only) and (level != "machine-lean")
+
     text_files_count = len(text_files)
     if text_files_count:
         coverage_raw = (included_count / text_files_count) * 100.0
@@ -3001,15 +3011,6 @@ def iter_report_blocks(
     else:
         coverage_pct = 0.0
 
-        # Flags for machine readability of content presence
-        # Plan-Only means NO content, NO manifest (usually), NO structure.
-        # Check actual logic below: plan_only causes early return before structure/manifest/content.
-        content_present = not plan_only
-        # Manifest is present unless plan_only (logic: if plan_only: return)
-        manifest_present = not plan_only
-        # Structure is present unless plan_only OR machine_lean
-        structure_present = (not plan_only) and (level != "machine-lean")
-
     meta_dict: Dict[str, Any] = {
         "merge": {
             "spec_version": SPEC_VERSION,
@@ -3027,9 +3028,9 @@ def iter_report_blocks(
             "generated_at": now.strftime('%Y-%m-%dT%H:%M:%SZ'),  # ISO-8601 timestamp
             "total_files": total_files,        # Total number of files in the merge
             "total_size_bytes": total_size,    # Sum of all file sizes
-                "content_present": content_present,
-                "manifest_present": manifest_present,
-                "structure_present": structure_present,
+            "content_present": content_present,
+            "manifest_present": manifest_present,
+            "structure_present": structure_present,
             "coverage": {
                 "included_files": included_count,
                 "text_files": text_files_count,
diff --git a/merger/lenskit/tests/test_merge_core.py b/merger/lenskit/tests/test_merge_core.py
index 69cef95..55eb3bd 100644
--- a/merger/lenskit/tests/test_merge_core.py
+++ b/merger/lenskit/tests/test_merge_core.py
@@ -12,6 +12,7 @@
     classify_file_v2,
     _generate_run_id,
     determine_inclusion_status,
+    iter_report_blocks,
     FileInfo,
     DEBUG_CONFIG
 )
@@ -95,5 +96,47 @@ def test_determine_inclusion_status(self):
         fi.is_text = False
         self.assertEqual(determine_inclusion_status(fi, "max", 0), "omitted")
 
+    def test_unbound_local_error_regression(self):
+        """
+        Regression test for UnboundLocalError when text_files_count > 0.
+        Ensures content_present/manifest_present/structure_present are always defined.
+        """
+        fi = FileInfo(
+            root_label="test_repo",
+            abs_path=Path("/tmp/test.txt"),
+            rel_path=Path("test.txt"),
+            size=100,
+            is_text=True,
+            md5="abc",
+            category="source",
+            tags=[],
+            ext=".txt",
+            content="hello",
+            inclusion_reason="normal"
+        )
+
+        # We need at least one text file to trigger the else-branch avoidance in legacy code
+        files = [fi]
+        # sources expects List[Path] according to signature
+        sources = [Path("/tmp/test_repo")]
+
+        # Should not raise UnboundLocalError
+        iterator = iter_report_blocks(
+            files=files,
+            level="dev",
+            max_file_bytes=1000,
+            sources=sources,
+            plan_only=False
+        )
+
+        # Consume iterator to verify no crash
+        # We catch UnboundLocalError specifically to fail with clarity,
+        # but unittest will catch it anyway.
+        try:
+            for _ in iterator:
+                pass
+        except UnboundLocalError:
+            self.fail("iter_report_blocks raised UnboundLocalError! Fix is likely inactive or broken.")
+
 if __name__ == '__main__':
     unittest.main()