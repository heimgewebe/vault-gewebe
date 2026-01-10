Contributor
Copilot AI
left a comment
Pull request overview

This PR adds missing pandas stub methods (sample(), iloc, and reset_index()) required for property-based tests in test_push_index_property.py. The implementation includes comprehensive parameter validation, bounds checking, and documentation improvements based on previous review feedback.

Key changes:

Adds sample() method with validation for n and frac parameters, random state support, and without-replacement sampling
Implements IlocIndexer class with bounds checking for integer-location based indexing
Adds reset_index() method (returns copy since index tracking is not implemented)
💡 Add Copilot custom instructions for smarter, more guided reviews. Learn how to get started.

scripts/pandas_stub.py
        """
        if n is not None and frac is not None:
            raise ValueError("Cannot specify both n and frac")

Copilot AI
15 minutes ago
The sample() method should validate that n is non-negative when directly specified, similar to how frac is validated. Currently, negative values of n are silently clamped to 0 (line 139), but this is inconsistent with frac validation which raises a ValueError for negative values. Add a check like:

if n is not None and n < 0:
    raise ValueError("n must be non-negative")
before the frac validation block.

Suggested change
        if n is not None and n < 0:
            raise ValueError("n must be non-negative")
Copilot uses AI. Check for mistakes.
@alexdermohr	Reply...
scripts/pandas_stub.py

        if frac is not None:
            if frac < 0:
                raise ValueError("frac must be non-negative")
Copilot AI
15 minutes ago
For consistency in error messaging, consider rephrasing "frac must be non-negative" to "frac must be >= 0" to match the style of the error message on line 133 ("frac must be <= 1"). This creates a more uniform error message pattern.

Suggested change
                raise ValueError("frac must be non-negative")
                raise ValueError("frac must be >= 0")
Copilot uses AI. Check for mistakes.



From bd483dbeeaaaa8a3ce4fffaa5fe05e0953316c49 Mon Sep 17 00:00:00 2001
From: "copilot-swe-agent[bot]" <198982749+Copilot@users.noreply.github.com>
Date: Thu, 1 Jan 2026 01:06:52 +0000
Subject: [PATCH 1/6] Initial plan


From 47744bad15ac211c887dd5d8f0d17fe67d054224 Mon Sep 17 00:00:00 2001
From: "copilot-swe-agent[bot]" <198982749+Copilot@users.noreply.github.com>
Date: Thu, 1 Jan 2026 01:25:12 +0000
Subject: [PATCH 2/6] Fix pandas stub: add sample(), iloc, and reset_index()
 methods

Co-authored-by: alexdermohr <216529510+alexdermohr@users.noreply.github.com>
---
 scripts/pandas_stub.py | 42 ++++++++++++++++++++++++++++++++++++++++++
 1 file changed, 42 insertions(+)

diff --git a/scripts/pandas_stub.py b/scripts/pandas_stub.py
index 589924d..ce93822 100644
--- a/scripts/pandas_stub.py
+++ b/scripts/pandas_stub.py
@@ -9,6 +9,7 @@
 from __future__ import annotations
 
 import json
+import random
 from collections import defaultdict
 from copy import deepcopy
 from datetime import datetime
@@ -36,6 +37,22 @@ def __getitem__(self, idx: int) -> Any:  # pragma: no cover - convenience
         return self._values[idx]
 
 
+class IlocIndexer:
+    """Helper class for integer-location based indexing."""
+
+    def __init__(self, rows: List[Dict[str, Any]]):
+        self._rows = rows
+
+    def __getitem__(self, key: Any) -> "DataFrame":
+        """Support integer slicing like df.iloc[::-1] or df.iloc[0:5]"""
+        if isinstance(key, slice):
+            sliced_rows = self._rows[key]
+            return DataFrame(sliced_rows)
+        else:
+            # Single integer index
+            return DataFrame([self._rows[key]])
+
+
 class DataFrame:
     def __init__(self, data: Iterable[Dict[str, Any]] | None = None):
         rows = [deepcopy(row) for row in (data or [])]
@@ -58,6 +75,31 @@ def __len__(self) -> int:  # pragma: no cover - convenience
     def copy(self) -> "DataFrame":
         return DataFrame(deepcopy(self._rows))
 
+    def sample(
+        self,
+        n: int | None = None,
+        frac: float | None = None,
+        random_state: int | None = None,
+    ) -> "DataFrame":
+        """Return a random sample of rows from the DataFrame."""
+        if frac is not None:
+            n = int(len(self._rows) * frac)
+        if n is None:
+            n = 1
+
+        rng = random.Random(random_state)
+        sampled_rows = rng.sample(self._rows, min(n, len(self._rows)))
+        return DataFrame(sampled_rows)
+
+    def reset_index(self, drop: bool = False) -> "DataFrame":
+        """Reset the index of the DataFrame. In this stub, index is not tracked."""
+        return self.copy()
+
+    @property
+    def iloc(self) -> "IlocIndexer":
+        """Integer-location based indexing for selection by position."""
+        return IlocIndexer(self._rows)
+
     def __getitem__(self, key: str) -> Series:
         return Series([row.get(key) for row in self._rows])
 

From bad4467816dbbd71e4050950b3dc5407efda4796 Mon Sep 17 00:00:00 2001
From: "copilot-swe-agent[bot]" <198982749+Copilot@users.noreply.github.com>
Date: Thu, 1 Jan 2026 01:26:57 +0000
Subject: [PATCH 3/6] Improve sample() method to handle edge cases better

Co-authored-by: alexdermohr <216529510+alexdermohr@users.noreply.github.com>
---
 scripts/pandas_stub.py | 11 ++++++++++-
 1 file changed, 10 insertions(+), 1 deletion(-)

diff --git a/scripts/pandas_stub.py b/scripts/pandas_stub.py
index ce93822..f02d01b 100644
--- a/scripts/pandas_stub.py
+++ b/scripts/pandas_stub.py
@@ -82,13 +82,22 @@ def sample(
         random_state: int | None = None,
     ) -> "DataFrame":
         """Return a random sample of rows from the DataFrame."""
+        if n is not None and frac is not None:
+            raise ValueError("Cannot specify both n and frac")
+
         if frac is not None:
             n = int(len(self._rows) * frac)
         if n is None:
             n = 1
 
+        # Clamp n to valid range
+        n = min(max(0, n), len(self._rows))
+
+        # Create a shuffled copy using the random state
         rng = random.Random(random_state)
-        sampled_rows = rng.sample(self._rows, min(n, len(self._rows)))
+        indices = list(range(len(self._rows)))
+        rng.shuffle(indices)
+        sampled_rows = [self._rows[i] for i in indices[:n]]
         return DataFrame(sampled_rows)
 
     def reset_index(self, drop: bool = False) -> "DataFrame":

From eccba081300435d04583c6e443c7039214c040f5 Mon Sep 17 00:00:00 2001
From: "copilot-swe-agent[bot]" <198982749+Copilot@users.noreply.github.com>
Date: Thu, 1 Jan 2026 01:28:12 +0000
Subject: [PATCH 4/6] Add better error handling and use round() for frac
 sampling

Co-authored-by: alexdermohr <216529510+alexdermohr@users.noreply.github.com>
---
 scripts/pandas_stub.py | 12 ++++++++++--
 1 file changed, 10 insertions(+), 2 deletions(-)

diff --git a/scripts/pandas_stub.py b/scripts/pandas_stub.py
index f02d01b..3430094 100644
--- a/scripts/pandas_stub.py
+++ b/scripts/pandas_stub.py
@@ -49,7 +49,15 @@ def __getitem__(self, key: Any) -> "DataFrame":
             sliced_rows = self._rows[key]
             return DataFrame(sliced_rows)
         else:
-            # Single integer index
+            # Single integer index with bounds checking
+            if not isinstance(key, int):
+                raise TypeError(
+                    f"iloc indexer requires integer, not {type(key).__name__}"
+                )
+            if key < -len(self._rows) or key >= len(self._rows):
+                raise IndexError(
+                    f"index {key} is out of bounds for axis 0 with size {len(self._rows)}"
+                )
             return DataFrame([self._rows[key]])
 
 
@@ -86,7 +94,7 @@ def sample(
             raise ValueError("Cannot specify both n and frac")
 
         if frac is not None:
-            n = int(len(self._rows) * frac)
+            n = round(len(self._rows) * frac)
         if n is None:
             n = 1
 

From 802531e39474d3320c3eec35d0be9f40ae79e2a5 Mon Sep 17 00:00:00 2001
From: "copilot-swe-agent[bot]" <198982749+Copilot@users.noreply.github.com>
Date: Thu, 1 Jan 2026 01:29:34 +0000
Subject: [PATCH 5/6] Add comprehensive documentation to pandas stub methods

Co-authored-by: alexdermohr <216529510+alexdermohr@users.noreply.github.com>
---
 scripts/pandas_stub.py | 20 ++++++++++++++++++--
 1 file changed, 18 insertions(+), 2 deletions(-)

diff --git a/scripts/pandas_stub.py b/scripts/pandas_stub.py
index 3430094..d977460 100644
--- a/scripts/pandas_stub.py
+++ b/scripts/pandas_stub.py
@@ -89,7 +89,17 @@ def sample(
         frac: float | None = None,
         random_state: int | None = None,
     ) -> "DataFrame":
-        """Return a random sample of rows from the DataFrame."""
+        """Return a random sample of rows from the DataFrame.
+
+        Args:
+            n: Number of items to sample (default: 1 if frac is None).
+            frac: Fraction of rows to sample (overrides n if provided).
+            random_state: Seed for reproducible randomness.
+
+        Note:
+            This stub does not support the 'replace' parameter.
+            Sampling is always without replacement.
+        """
         if n is not None and frac is not None:
             raise ValueError("Cannot specify both n and frac")
 
@@ -109,7 +119,13 @@ def sample(
         return DataFrame(sampled_rows)
 
     def reset_index(self, drop: bool = False) -> "DataFrame":
-        """Reset the index of the DataFrame. In this stub, index is not tracked."""
+        """Reset the index of the DataFrame.
+
+        Note:
+            In this stub, index is not tracked, so this method simply
+            returns a copy of the DataFrame. The 'drop' parameter is
+            accepted for API compatibility but has no effect.
+        """
         return self.copy()
 
     @property

From be066efd3294a0122de55c4c7aea203dfa09c384 Mon Sep 17 00:00:00 2001
From: "copilot-swe-agent[bot]" <198982749+Copilot@users.noreply.github.com>
Date: Thu, 1 Jan 2026 07:41:07 +0000
Subject: [PATCH 6/6] Add frac validation and clarify CI-stub purpose in
 documentation

Co-authored-by: alexdermohr <216529510+alexdermohr@users.noreply.github.com>
---
 scripts/pandas_stub.py | 37 ++++++++++++++++++++++++++++++++-----
 1 file changed, 32 insertions(+), 5 deletions(-)

diff --git a/scripts/pandas_stub.py b/scripts/pandas_stub.py
index d977460..f15349e 100644
--- a/scripts/pandas_stub.py
+++ b/scripts/pandas_stub.py
@@ -1,9 +1,26 @@
 """A lightweight pandas stub for offline testing.
 
-This module implements a very small subset of the pandas API used by
-`scripts.push_index`. It is **not** a full replacement for pandas, but it
-supports basic DataFrame construction from dictionaries, column access and
-assignment, `apply`, `groupby`, and conversion to records.
+⚠️  CI/Smoke Testing Only - Not a Pandas Replacement
+====================================================
+
+This module implements a minimal subset of the pandas API for CI/smoke testing
+without requiring the full pandas dependency. It is **intentionally incomplete**
+and **not semantically equivalent** to pandas.
+
+Supported operations:
+- DataFrame construction from dictionaries
+- Column access and assignment
+- `apply`, `groupby`, and conversion to records
+- `sample`, `iloc`, `reset_index` (limited implementations)
+
+Key differences from pandas:
+- `iloc[i]` returns a DataFrame, not a Series (for single integer index)
+- `sample(frac=...)` uses `round()` for row count calculation
+- No support for `replace` parameter in `sample()`
+- Index tracking is not implemented
+
+This stub should only be used for testing code paths, not for verifying
+pandas-compatible behavior or results.
 """
 
 from __future__ import annotations
@@ -44,7 +61,13 @@ def __init__(self, rows: List[Dict[str, Any]]):
         self._rows = rows
 
     def __getitem__(self, key: Any) -> "DataFrame":
-        """Support integer slicing like df.iloc[::-1] or df.iloc[0:5]"""
+        """Support integer slicing like df.iloc[::-1] or df.iloc[0:5]
+
+        Note:
+            Unlike pandas, single integer indexing (e.g., df.iloc[0]) returns
+            a DataFrame with one row, not a Series. This simplifies the stub
+            implementation but differs from pandas behavior.
+        """
         if isinstance(key, slice):
             sliced_rows = self._rows[key]
             return DataFrame(sliced_rows)
@@ -104,6 +127,10 @@ def sample(
             raise ValueError("Cannot specify both n and frac")
 
         if frac is not None:
+            if frac < 0:
+                raise ValueError("frac must be non-negative")
+            if frac > 1:
+                raise ValueError("frac must be <= 1")
             n = round(len(self._rows) * frac)
         if n is None:
             n = 1