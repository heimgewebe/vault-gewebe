diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
index 18e03be8..a0972a31 100644
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -41,11 +41,8 @@ jobs:
           filters: |
             docs:
               - '**/*.md'
-              - '**/*.yml'
-              - '**/*.yaml'
               - '.markdownlint.*'
               - '.yamllint*'
-              - '.github/workflows/ci.yml'
 
   ci:
     needs: docs-changes
@@ -200,11 +197,27 @@ jobs:
           cargo-deny --version
           just --version
 
+      # CI Test Architecture:
+      #   ci.yml — build, lint, typecheck (web + API), cargo test, cargo-deny (via just ci),
+      #            plus guard script tests (compose, token-leak, metrics-ref).
+      #   web.yml (Gate A) — web unit tests (vitest) + Playwright E2E. Path-scoped to apps/web/**.
+      #   Vitest deliberately runs only in web.yml to avoid double execution on PRs
+      #   that trigger both workflows. See also: Justfile ci recipe, web.yml header.
       - name: Validate project
         env:
           CARGO_TERM_COLOR: always
         run: just ci
 
+      - name: Guard script tests
+        run: |
+          set -euo pipefail
+          for t in scripts/tests/test_token_leak_guard.sh \
+                   scripts/tests/test_compose_volumes_guard.sh \
+                   scripts/tests/test_metrics_ref_guard.sh; do
+            echo "── $t ──"
+            bash "$t"
+          done
+
   web-e2e:
     name: Web E2E
     runs-on: ubuntu-latest
diff --git a/.github/workflows/web.yml b/.github/workflows/web.yml
index cf1878b0..b4d0daeb 100644
--- a/.github/workflows/web.yml
+++ b/.github/workflows/web.yml
@@ -1,4 +1,7 @@
 ---
+# Web Check (Gate A) — canonical location for web unit tests (vitest) and Playwright E2E.
+# ci.yml does NOT run vitest; it handles build/lint/typecheck + API tests + guard tests.
+# This split avoids double vitest execution when both workflows trigger on the same PR.
 name: Web Check (Gate A)
 
 permissions:
@@ -82,6 +85,9 @@ jobs:
           restore-keys: |
             ${{ runner.os }}-${{ runner.arch }}-playwright-
 
+      - name: Unit tests (Vitest)
+        run: pnpm test:unit
+
       - name: "Playwright: setup browsers (CI)"
         # WICHTIG: Nicht "0" setzen – jede nicht-leere Zeichenkette gilt als truthy
         # und verhindert weiterhin den Download. Ein leerer String sorgt dafür,
diff --git a/Justfile b/Justfile
index 46bad8fc..87149309 100644
--- a/Justfile
+++ b/Justfile
@@ -18,6 +18,10 @@ reset-web:
 alias c := ci
 
 ci:
+	# Web: build, lint, typecheck (budget + prettier + eslint + svelte-check).
+	# Unit tests (vitest) run canonically in web.yml, not here, to avoid
+	# double execution when both ci.yml and web.yml trigger on the same PR.
+	# web.yml is path-scoped to apps/web/** and runs test:unit before Playwright.
 	@echo "==> Web: install, sync, build, typecheck"
 	if [ -d apps/web ]; then \
 		pushd apps/web >/dev/null; \
diff --git a/apps/api/src/auth/role.rs b/apps/api/src/auth/role.rs
index 3912aa02..db8eb3f9 100644
--- a/apps/api/src/auth/role.rs
+++ b/apps/api/src/auth/role.rs
@@ -19,3 +19,57 @@ impl Role {
         }
     }
 }
+
+#[cfg(test)]
+mod tests {
+    use super::*;
+    use serde_json::json;
+
+    #[test]
+    fn from_str_lossy_exact_matches() {
+        assert_eq!(Role::from_str_lossy("admin"), Role::Admin);
+        assert_eq!(Role::from_str_lossy("weber"), Role::Weber);
+        assert_eq!(Role::from_str_lossy("gast"), Role::Gast);
+        assert_eq!(Role::from_str_lossy("guest"), Role::Gast);
+    }
+
+    #[test]
+    fn from_str_lossy_case_insensitive() {
+        assert_eq!(Role::from_str_lossy("Admin"), Role::Admin);
+        assert_eq!(Role::from_str_lossy("ADMIN"), Role::Admin);
+        assert_eq!(Role::from_str_lossy("Weber"), Role::Weber);
+        assert_eq!(Role::from_str_lossy("WEBER"), Role::Weber);
+    }
+
+    #[test]
+    fn from_str_lossy_trims_whitespace() {
+        assert_eq!(Role::from_str_lossy(" admin "), Role::Admin);
+        assert_eq!(Role::from_str_lossy("\tadmin\n"), Role::Admin);
+    }
+
+    #[test]
+    fn from_str_lossy_unknown_falls_back_to_gast() {
+        assert_eq!(Role::from_str_lossy("unknown"), Role::Gast);
+        assert_eq!(Role::from_str_lossy("superadmin"), Role::Gast);
+        assert_eq!(Role::from_str_lossy(""), Role::Gast);
+    }
+
+    #[test]
+    fn serde_serialization() {
+        assert_eq!(serde_json::to_value(&Role::Admin).unwrap(), json!("admin"));
+        assert_eq!(serde_json::to_value(&Role::Weber).unwrap(), json!("weber"));
+        assert_eq!(serde_json::to_value(&Role::Gast).unwrap(), json!("gast"));
+    }
+
+    #[test]
+    fn serde_deserialization() {
+        let admin: Role = serde_json::from_value(json!("admin")).unwrap();
+        assert_eq!(admin, Role::Admin);
+
+        let weber: Role = serde_json::from_value(json!("weber")).unwrap();
+        assert_eq!(weber, Role::Weber);
+
+        let gast: Role = serde_json::from_value(json!("gast")).unwrap();
+        assert_eq!(gast, Role::Gast);
+    }
+}
diff --git a/apps/api/src/auth/session.rs b/apps/api/src/auth/session.rs
index 9ef66a21..7d990a25 100644
--- a/apps/api/src/auth/session.rs
+++ b/apps/api/src/auth/session.rs
@@ -72,3 +72,67 @@ impl SessionStore {
         store.remove(session_id);
     }
 }
+
+#[cfg(test)]
+mod tests {
+    use super::*;
+
+    #[test]
+    fn create_produces_session_with_correct_account_id() {
+        let store = SessionStore::new();
+        let session = store.create("account-42".to_string());
+        assert_eq!(session.account_id, "account-42");
+    }
+
+    #[test]
+    fn create_produces_unique_session_ids() {
+        let store = SessionStore::new();
+        let s1 = store.create("a".to_string());
+        let s2 = store.create("b".to_string());
+        assert_ne!(s1.id, s2.id);
+    }
+
+    #[test]
+    fn get_returns_created_session() {
+        let store = SessionStore::new();
+        let session = store.create("account-1".to_string());
+        let retrieved = store.get(&session.id);
+        assert!(retrieved.is_some());
+        assert_eq!(retrieved.unwrap().account_id, "account-1");
+    }
+
+    #[test]
+    fn get_returns_none_for_unknown_id() {
+        let store = SessionStore::new();
+        assert!(store.get("nonexistent-id").is_none());
+    }
+
+    #[test]
+    fn delete_removes_session() {
+        let store = SessionStore::new();
+        let session = store.create("account-1".to_string());
+        store.delete(&session.id);
+        assert!(store.get(&session.id).is_none());
+    }
+
+    #[test]
+    fn session_expires_at_is_approximately_one_day() {
+        let store = SessionStore::new();
+        let before = Utc::now();
+        let session = store.create("account-1".to_string());
+        let after = Utc::now();
+
+        let expected_min = before + Duration::days(1);
+        let expected_max = after + Duration::days(1);
+
+        assert!(session.expires_at >= expected_min);
+        assert!(session.expires_at <= expected_max);
+    }
+
+    #[test]
+    fn is_expired_returns_false_for_new_session() {
+        let store = SessionStore::new();
+        let session = store.create("account-1".to_string());
+        assert!(!session.is_expired());
+    }
+}
diff --git a/apps/api/src/auth/tokens.rs b/apps/api/src/auth/tokens.rs
index 98f1de61..5c4d7d02 100644
--- a/apps/api/src/auth/tokens.rs
+++ b/apps/api/src/auth/tokens.rs
@@ -85,3 +85,75 @@ impl TokenStore {
         None
     }
 }
+
+#[cfg(test)]
+mod tests {
+    use super::*;
+
+    #[test]
+    fn hash_token_consistent() {
+        let hash1 = TokenStore::hash_token("test-token");
+        let hash2 = TokenStore::hash_token("test-token");
+        assert_eq!(hash1, hash2);
+    }
+
+    #[test]
+    fn hash_token_different_inputs_produce_different_hashes() {
+        let hash1 = TokenStore::hash_token("token-a");
+        let hash2 = TokenStore::hash_token("token-b");
+        assert_ne!(hash1, hash2);
+    }
+
+    #[test]
+    fn create_returns_uuid_format() {
+        let store = TokenStore::new();
+        let token = store.create("user@example.com".to_string());
+        assert!(
+            uuid::Uuid::parse_str(&token).is_ok(),
+            "Token should be valid UUID"
+        );
+    }
+
+    #[test]
+    fn peek_returns_email_for_valid_token() {
+        let store = TokenStore::new();
+        let token = store.create("user@example.com".to_string());
+        assert_eq!(store.peek(&token), Some("user@example.com".to_string()));
+    }
+
+    #[test]
+    fn peek_returns_none_for_unknown_token() {
+        let store = TokenStore::new();
+        assert_eq!(store.peek("nonexistent-token"), None);
+    }
+
+    #[test]
+    fn consume_returns_email_and_removes_token() {
+        let store = TokenStore::new();
+        let token = store.create("user@example.com".to_string());
+
+        let first = store.consume(&token);
+        assert_eq!(first, Some("user@example.com".to_string()));
+
+        let second = store.consume(&token);
+        assert_eq!(second, None);
+    }
+
+    #[test]
+    fn consume_returns_none_for_unknown_token() {
+        let store = TokenStore::new();
+        assert_eq!(store.consume("nonexistent-token"), None);
+    }
+
+    #[test]
+    fn expired_token_returns_none_for_peek_and_consume() {
+        let store = TokenStore::new();
+        let token =
+            store.create_with_expiry("user@example.com".to_string(), Duration::milliseconds(1));
+
+        std::thread::sleep(std::time::Duration::from_millis(50));
+
+        assert_eq!(store.peek(&token), None);
+        assert_eq!(store.consume(&token), None);
+    }
+}
diff --git a/apps/api/src/routes/meta.rs b/apps/api/src/routes/meta.rs
index 5bbde55c..94070e1c 100644
--- a/apps/api/src/routes/meta.rs
+++ b/apps/api/src/routes/meta.rs
@@ -16,3 +16,20 @@ async fn version() -> Json<Value> {
         "build_timestamp": info.build_timestamp,
     }))
 }
+
+#[cfg(test)]
+mod tests {
+    use crate::telemetry::BuildInfo;
+
+    #[test]
+    fn build_info_version_is_not_empty() {
+        let info = BuildInfo::collect();
+        assert!(!info.version.is_empty(), "version must not be empty");
+    }
+
+    #[test]
+    fn build_info_version_matches_cargo_pkg() {
+        let info = BuildInfo::collect();
+        assert_eq!(info.version, env!("CARGO_PKG_VERSION"));
+    }
+}
diff --git a/apps/web/package.json b/apps/web/package.json
index 38f39dac..93009f96 100644
--- a/apps/web/package.json
+++ b/apps/web/package.json
@@ -25,6 +25,7 @@
     "lint": "prettier -c . && eslint . --max-warnings=0",
     "screenshot": "node scripts/record-screenshot.mjs",
     "build:e2e": "cross-env VITE_PUBLIC_ENABLE_TEST_MAP=true pnpm build --mode test",
+    "test:unit": "vitest run",
     "test": "playwright test",
     "test:report": "playwright show-report",
     "test:ci": "playwright test --reporter=dot,html,junit",
@@ -54,7 +55,8 @@
     "svelte": "^5.53.5",
     "svelte-check": "^4.3.2",
     "typescript": "5.9.2",
-    "vite": "^5.4.10"
+    "vite": "^5.4.10",
+    "vitest": "^2.1.9"
   },
   "dependencies": {
     "maplibre-gl": "4.7.1",
diff --git a/apps/web/pnpm-lock.yaml b/apps/web/pnpm-lock.yaml
index 1770dba4..d520af27 100644
--- a/apps/web/pnpm-lock.yaml
+++ b/apps/web/pnpm-lock.yaml
@@ -67,13 +67,16 @@ importers:
         version: 5.53.5
       svelte-check:
         specifier: ^4.3.2
-        version: 4.3.4(svelte@5.53.5)(typescript@5.9.2)
+        version: 4.3.4(picomatch@4.0.3)(svelte@5.53.5)(typescript@5.9.2)
       typescript:
         specifier: 5.9.2
         version: 5.9.2
       vite:
         specifier: ^5.4.10
         version: 5.4.21(@types/node@20.19.25)
+      vitest:
+        specifier: ^2.1.9
+        version: 2.1.9(@types/node@20.19.25)
 
 packages:
   "@epic-web/invariant@1.0.0":
@@ -892,6 +895,56 @@ packages:
       }
     engines: { node: ^18.18.0 || ^20.9.0 || >=21.1.0 }
 
+  "@vitest/expect@2.1.9":
+    resolution:
+      {
+        integrity: sha512-UJCIkTBenHeKT1TTlKMJWy1laZewsRIzYighyYiJKZreqtdxSos/S1t+ktRMQWu2CKqaarrkeszJx1cgC5tGZw==,
+      }
+
+  "@vitest/mocker@2.1.9":
+    resolution:
+      {
+        integrity: sha512-tVL6uJgoUdi6icpxmdrn5YNo3g3Dxv+IHJBr0GXHaEdTcw3F+cPKnsXFhli6nO+f/6SDKPHEK1UN+k+TQv0Ehg==,
+      }
+    peerDependencies:
+      msw: ^2.4.9
+      vite: ^5.0.0
+    peerDependenciesMeta:
+      msw:
+        optional: true
+      vite:
+        optional: true
+
+  "@vitest/pretty-format@2.1.9":
+    resolution:
+      {
+        integrity: sha512-KhRIdGV2U9HOUzxfiHmY8IFHTdqtOhIzCpd8WRdJiE7D/HUcZVD0EgQCVjm+Q9gkUXWgBvMmTtZgIG48wq7sOQ==,
+      }
+
+  "@vitest/runner@2.1.9":
+    resolution:
+      {
+        integrity: sha512-ZXSSqTFIrzduD63btIfEyOmNcBmQvgOVsPNPe0jYtESiXkhd8u2erDLnMxmGrDCwHCCHE7hxwRDCT3pt0esT4g==,
+      }
+
+  "@vitest/snapshot@2.1.9":
+    resolution:
+      {
+        integrity: sha512-oBO82rEjsxLNJincVhLhaxxZdEtV0EFHMK5Kmx5sJ6H9L183dHECjiefOAdnqpIgT5eZwT04PoggUnW88vOBNQ==,
+      }
+
+  "@vitest/spy@2.1.9":
+    resolution:
+      {
+        integrity: sha512-E1B35FwzXXTs9FHNK6bDszs7mtydNi5MIfUWpceJ8Xbfb1gBMscAnwLbEu+B44ed6W3XjL9/ehLPHR1fkf1KLQ==,
+      }
+
+  "@vitest/utils@2.1.9":
+    resolution:
+      {
+        integrity: sha512-v0psaMSkNJ3A2NMrUEHFRzJtDPFn+/VWZ5WxImB21T9fjucJRmS7xCS3ppEnARb9y11OAzaD+P2Ps+b+BGX5iQ==,
+      }
+
   acorn-jsx@5.3.2:
     resolution:
       {
@@ -955,6 +1008,13 @@ packages:
       }
     engines: { node: ">= 0.4" }
 
+  assertion-error@2.0.1:
+    resolution:
+      {
+        integrity: sha512-Izi8RQcffqCeNVgFigKli1ssklIbpHnCYc6AknXGYoB6grJqyeby7jv12JUQgmTAnIDnbck1uxksT4dzN3PWBA==,
+      }
+    engines: { node: ">=12" }
+
   axobject-query@4.1.0:
     resolution:
       {
@@ -987,6 +1047,13 @@ packages:
       }
     engines: { node: ">=8" }
 
+  cac@6.7.14:
+    resolution:
+      {
+        integrity: sha512-b6Ilus+c3RrdDk+JhLKUAQfzzgLEPy6wcXqS7f/xe1EETvsDP6GORG7SFuOs6cID5YkqchW/LXZbX5bc8j7ZcQ==,
+      }
+    engines: { node: ">=8" }
+
   callsites@3.1.0:
     resolution:
       {
@@ -994,6 +1061,13 @@ packages:
       }
     engines: { node: ">=6" }
 
+  chai@5.3.3:
+    resolution:
+      {
+        integrity: sha512-4zNhdJD/iOjSH0A05ea+Ke6MU5mmpQcbQsSOkgdaUMJ9zTlDTD/GYlwohmIE2u0gaxHYiVHEn1Fw9mZ/ktJWgw==,
+      }
+    engines: { node: ">=18" }
+
   chalk@4.1.2:
     resolution:
       {
@@ -1001,6 +1075,13 @@ packages:
       }
     engines: { node: ">=10" }
 
+  check-error@2.1.3:
+    resolution:
+      {
+        integrity: sha512-PAJdDJusoxnwm1VwW07VWwUN1sl7smmC3OKggvndJFadxxDRyFJBX/ggnu/KE4kQAB7a3Dp8f/YXC1FlUprWmA==,
+      }
+    engines: { node: ">= 16" }
+
   chokidar@4.0.3:
     resolution:
       {
@@ -1076,6 +1157,13 @@ packages:
       supports-color:
         optional: true
 
+  deep-eql@5.0.2:
+    resolution:
+      {
+        integrity: sha512-h5k/5U50IJJFpzfL6nO9jaaumfjO/f2NjK/oYB2Djzm4p9L+3T9qWpZqZ2hAbLPuuYq9wrU08WQyBTL5GbPk5Q==,
+      }
+    engines: { node: ">=6" }
+
   deep-is@0.1.4:
     resolution:
       {
@@ -1119,6 +1207,12 @@ packages:
         integrity: sha512-L18DaJsXSUk2+42pv8mLs5jJT2hqFkFE4j21wOmgbUqsZ2hL72NsUU785g9RXgo3s0ZNgVl42TiHp3ZtOv/Vyg==,
       }
 
+  es-module-lexer@1.7.0:
+    resolution:
+      {
+        integrity: sha512-jEQoCwk8hyb2AZziIOLhDqpm5+2ww5uIE6lkO/6jcOCusfk6LhMHpXXfBLXTZ7Ydyt0j4VoUQv6uGNYbdW+kBA==,
+      }
+
   esbuild@0.21.5:
     resolution:
       {
@@ -1244,6 +1338,12 @@ packages:
       }
     engines: { node: ">=4.0" }
 
+  estree-walker@3.0.3:
+    resolution:
+      {
+        integrity: sha512-7RUKfXgSMMkzt6ZuXmqapOurLGPPfgj6l9uRZ7lRGolvk0y2yocc35LdcxKC5PQZdn2DMqioAQ2NoWcrTKmm6g==,
+      }
+
   esutils@2.0.3:
     resolution:
       {
@@ -1251,6 +1351,13 @@ packages:
       }
     engines: { node: ">=0.10.0" }
 
+  expect-type@1.3.0:
+    resolution:
+      {
+        integrity: sha512-knvyeauYhqjOYvQ66MznSMs83wmHrCycNEN6Ao+2AeYEfxUIkuiVxdEa1qlGEPK+We3n0THiDciYSsCcgW/DoA==,
+      }
+    engines: { node: ">=12.0.0" }
+
   fast-deep-equal@3.1.3:
     resolution:
       {
@@ -1622,6 +1729,12 @@ packages:
         integrity: sha512-0KpjqXRVvrYyCsX1swR/XTK0va6VQkQM6MNo7PqW77ByjAhoARA8EfrP1N4+KlKj8YS0ZUCtRT/YUuhyYDujIQ==,
       }
 
+  loupe@3.2.1:
+    resolution:
+      {
+        integrity: sha512-CdzqowRJCeLU72bHvWqwRBBlLcMEtIvGrlvef74kMnV2AolS9Y8xUv1I0U/MNAWMhBlKIoyuEgoJ0t/bbwHbLQ==,
+      }
+
   lru-cache@10.4.3:
     resolution:
       {
@@ -1776,6 +1889,19 @@ packages:
       }
     engines: { node: ">=16 || 14 >=14.18" }
 
+  pathe@1.1.2:
+    resolution:
+      {
+        integrity: sha512-whLdWMYL2TwI08hn8/ZqAbrVemu0LNaNNJZX73O6qaIdCTfXutsLhMkjdENX0qhsQ9uIimo4/aQOmXkoon2nDQ==,
+      }
+
+  pathval@2.0.1:
+    resolution:
+      {
+        integrity: sha512-//nshmD55c46FuFw26xV/xFAaB5HF9Xdap7HJBBnrKdAd6/GxDBaNA1870O79+9ueg61cZLSVc+OaFlfmObYVQ==,
+      }
+    engines: { node: ">= 14.16" }
+
   pbf@3.3.0:
     resolution:
       {
@@ -1796,6 +1922,13 @@ packages:
       }
     engines: { node: ">=8.6" }
 
+  picomatch@4.0.3:
+    resolution:
+      {
+        integrity: sha512-5gTmgEY/sqK6gFXLIsQNH19lWb4ebPDLA4SdLP7dsWkIXHWlG66oPuVvXSGFPppYZz8ZDZq0dYYrbHfBCVUb1Q==,
+      }
+    engines: { node: ">=12" }
+
   playwright-core@1.55.1:
     resolution:
       {
@@ -2015,6 +2148,12 @@ packages:
       }
     engines: { node: ">=8" }
 
+  siginfo@2.0.0:
+    resolution:
+      {
+        integrity: sha512-ybx0WO1/8bSBLEWXZvEd7gMW3Sn3JFlW3TvX1nREbDLRNQNaeNN8WK0meBwPdAaOI7TtRRRJn/Es1zhrrCHu7g==,
+      }
+
   signal-exit@4.1.0:
     resolution:
       {
@@ -2036,6 +2175,18 @@ packages:
       }
     engines: { node: ">=0.10.0" }
 
+  stackback@0.0.2:
+    resolution:
+      {
+        integrity: sha512-1XMJE5fQo1jGH6Y/7ebnwPOBEkIEnT4QF32d5R1+VXdXveM0IBMJt8zfaxX1P3QhVwrYe+576+jkANtSS2mBbw==,
+      }
+
+  std-env@3.10.0:
+    resolution:
+      {
+        integrity: sha512-5GS12FdOZNliM5mAOxFRg7Ir0pWz8MdpYm6AY6VPkGpbA7ZzmbzNcBJQ0GPvvyWgcY7QAhCgf9Uy89I03faLkg==,
+      }
+
   string-width@4.2.3:
     resolution:
       {
@@ -2129,12 +2280,45 @@ packages:
         integrity: sha512-N+8UisAXDGk8PFXP4HAzVR9nbfmVJ3zYLAWiTIoqC5v5isinhr+r5uaO8+7r3BMfuNIufIsA7RdpVgacC2cSpw==,
       }
 
+  tinybench@2.9.0:
+    resolution:
+      {
+        integrity: sha512-0+DUvqWMValLmha6lr4kD8iAMK1HzV0/aKnCtWb9v9641TnP/MFb7Pc2bxoxQjTXAErryXVgUOfv2YqNllqGeg==,
+      }
+
+  tinyexec@0.3.2:
+    resolution:
+      {
+        integrity: sha512-KQQR9yN7R5+OSwaK0XQoj22pwHoTlgYqmUscPYoknOoWCWfj/5/ABTMRi69FrKU5ffPVh5QcFikpWJI/P1ocHA==,
+      }
+
+  tinypool@1.1.1:
+    resolution:
+      {
+        integrity: sha512-Zba82s87IFq9A9XmjiX5uZA/ARWDrB03OHlq+Vw1fSdt0I+4/Kutwy8BP4Y/y/aORMo61FQ0vIb5j44vSo5Pkg==,
+      }
+    engines: { node: ^18.0.0 || >=20.0.0 }
+
   tinyqueue@3.0.0:
     resolution:
       {
         integrity: sha512-gRa9gwYU3ECmQYv3lslts5hxuIa90veaEcxDYuu3QGOIAEM2mOZkVHp48ANJuu1CURtRdHKUBY5Lm1tHV+sD4g==,
       }
 
+  tinyrainbow@1.2.0:
+    resolution:
+      {
+        integrity: sha512-weEDEq7Z5eTHPDh4xjX789+fHfF+P8boiFB+0vbWzpbnbsEr/GRaohi/uMKxg8RZMXnl1ItAi/IUHWMsjDV7kQ==,
+      }
+    engines: { node: ">=14.0.0" }
+
+  tinyspy@3.0.2:
+    resolution:
+      {
+        integrity: sha512-n1cw8k1k0x4pgA2+9XrOkFydTerNcJ1zWCO5Nn9scWHTD+5tp8dghT2x1uduQePZTZgd3Tupf+x9BxJjeJi77Q==,
+      }
+    engines: { node: ">=14.0.0" }
+
   to-regex-range@5.0.1:
     resolution:
       {
@@ -2191,6 +2375,14 @@ packages:
         integrity: sha512-EPD5q1uXyFxJpCrLnCc1nHnq3gOa6DZBocAIiI2TaSCA7VCJ1UJDMagCzIkXNsUYfD1daK//LTEQ8xiIbrHtcw==,
       }
 
+  vite-node@2.1.9:
+    resolution:
+      {
+        integrity: sha512-AM9aQ/IPrW/6ENLQg3AGY4K1N2TGZdR5e4gu/MmmR2xR3Ll1+dib+nook92g4TV3PXVyeyxdWwtaCAiUL0hMxA==,
+      }
+    engines: { node: ^18.0.0 || >=20.0.0 }
+    hasBin: true
+
   vite@5.4.21:
     resolution:
       {
@@ -2236,6 +2428,34 @@ packages:
       vite:
         optional: true
 
+  vitest@2.1.9:
+    resolution:
+      {
+        integrity: sha512-MSmPM9REYqDGBI8439mA4mWhV5sKmDlBKWIYbA3lRb2PTHACE0mgKwA8yQ2xq9vxDTuk4iPrECBAEW2aoFXY0Q==,
+      }
+    engines: { node: ^18.0.0 || >=20.0.0 }
+    hasBin: true
+    peerDependencies:
+      "@edge-runtime/vm": "*"
+      "@types/node": ^18.0.0 || >=20.0.0
+      "@vitest/browser": 2.1.9
+      "@vitest/ui": 2.1.9
+      happy-dom: "*"
+      jsdom: "*"
+    peerDependenciesMeta:
+      "@edge-runtime/vm":
+        optional: true
+      "@types/node":
+        optional: true
+      "@vitest/browser":
+        optional: true
+      "@vitest/ui":
+        optional: true
+      happy-dom:
+        optional: true
+      jsdom:
+        optional: true
+
   vt-pbf@3.1.3:
     resolution:
       {
@@ -2258,6 +2478,14 @@ packages:
     engines: { node: ^16.13.0 || >=18.0.0 }
     hasBin: true
 
+  why-is-node-running@2.3.0:
+    resolution:
+      {
+        integrity: sha512-hUrmaWBdVDcxvYqnyh09zunKzROWjbZTiNy8dBEjkS7ehEDQibXJ7XvlmtbwuTclUiIyN+CyXQD4Vmko8fNm8w==,
+      }
+    engines: { node: ">=8" }
+    hasBin: true
+
   word-wrap@1.2.5:
     resolution:
       {
@@ -2732,6 +2960,46 @@ snapshots:
       "@typescript-eslint/types": 8.8.0
       eslint-visitor-keys: 3.4.3
 
+  "@vitest/expect@2.1.9":
+    dependencies:
+      "@vitest/spy": 2.1.9
+      "@vitest/utils": 2.1.9
+      chai: 5.3.3
+      tinyrainbow: 1.2.0
+
+  "@vitest/mocker@2.1.9(vite@5.4.21(@types/node@20.19.25))":
+    dependencies:
+      "@vitest/spy": 2.1.9
+      estree-walker: 3.0.3
+      magic-string: 0.30.21
+    optionalDependencies:
+      vite: 5.4.21(@types/node@20.19.25)
+
+  "@vitest/pretty-format@2.1.9":
+    dependencies:
+      tinyrainbow: 1.2.0
+
+  "@vitest/runner@2.1.9":
+    dependencies:
+      "@vitest/utils": 2.1.9
+      pathe: 1.1.2
+
+  "@vitest/snapshot@2.1.9":
+    dependencies:
+      "@vitest/pretty-format": 2.1.9
+      magic-string: 0.30.21
+      pathe: 1.1.2
+
+  "@vitest/spy@2.1.9":
+    dependencies:
+      tinyspy: 3.0.2
+
+  "@vitest/utils@2.1.9":
+    dependencies:
+      "@vitest/pretty-format": 2.1.9
+      loupe: 3.2.1
+      tinyrainbow: 1.2.0
+
   acorn-jsx@5.3.2(acorn@8.16.0):
     dependencies:
       acorn: 8.16.0
@@ -2759,6 +3027,8 @@ snapshots:
 
   aria-query@5.3.1: {}
 
+  assertion-error@2.0.1: {}
+
   axobject-query@4.1.0: {}
 
   balanced-match@1.0.2: {}
@@ -2776,13 +3046,25 @@ snapshots:
     dependencies:
       fill-range: 7.1.1
 
+  cac@6.7.14: {}
+
   callsites@3.1.0: {}
 
+  chai@5.3.3:
+    dependencies:
+      assertion-error: 2.0.1
+      check-error: 2.1.3
+      deep-eql: 5.0.2
+      loupe: 3.2.1
+      pathval: 2.0.1
+
   chalk@4.1.2:
     dependencies:
       ansi-styles: 4.3.0
       supports-color: 7.2.0
 
+  check-error@2.1.3: {}
+
   chokidar@4.0.3:
     dependencies:
       readdirp: 4.1.2
@@ -2816,6 +3098,8 @@ snapshots:
     dependencies:
       ms: 2.1.3
 
+  deep-eql@5.0.2: {}
+
   deep-is@0.1.4: {}
 
   deepmerge@4.3.1: {}
@@ -2830,6 +3114,8 @@ snapshots:
 
   emoji-regex@9.2.2: {}
 
+  es-module-lexer@1.7.0: {}
+
   esbuild@0.21.5:
     optionalDependencies:
       "@esbuild/aix-ppc64": 0.21.5
@@ -2966,8 +3252,14 @@ snapshots:
 
   estraverse@5.3.0: {}
 
+  estree-walker@3.0.3:
+    dependencies:
+      "@types/estree": 1.0.8
+
   esutils@2.0.3: {}
 
+  expect-type@1.3.0: {}
+
   fast-deep-equal@3.1.3: {}
 
   fast-glob@3.3.3:
@@ -2986,7 +3278,9 @@ snapshots:
     dependencies:
       reusify: 1.1.0
 
-  fdir@6.5.0: {}
+  fdir@6.5.0(picomatch@4.0.3):
+    optionalDependencies:
+      picomatch: 4.0.3
 
   fflate@0.8.2: {}
 
@@ -3136,6 +3430,8 @@ snapshots:
 
   lodash.merge@4.6.2: {}
 
+  loupe@3.2.1: {}
+
   lru-cache@10.4.3: {}
 
   magic-string@0.30.21:
@@ -3234,6 +3530,10 @@ snapshots:
       lru-cache: 10.4.3
       minipass: 7.1.2
 
+  pathe@1.1.2: {}
+
+  pathval@2.0.1: {}
+
   pbf@3.3.0:
     dependencies:
       ieee754: 1.2.1
@@ -3243,6 +3543,9 @@ snapshots:
 
   picomatch@2.3.1: {}
 
+  picomatch@4.0.3:
+    optional: true
+
   playwright-core@1.55.1: {}
 
   playwright@1.55.1:
@@ -3364,6 +3667,8 @@ snapshots:
 
   shebang-regex@3.0.0: {}
 
+  siginfo@2.0.0: {}
+
   signal-exit@4.1.0: {}
 
   sirv@3.0.2:
@@ -3374,6 +3679,10 @@ snapshots:
 
   source-map-js@1.2.1: {}
 
+  stackback@0.0.2: {}
+
+  std-env@3.10.0: {}
+
   string-width@4.2.3:
     dependencies:
       emoji-regex: 8.0.0
@@ -3404,11 +3713,11 @@ snapshots:
     dependencies:
       has-flag: 4.0.0
 
-  svelte-check@4.3.4(svelte@5.53.5)(typescript@5.9.2):
+  svelte-check@4.3.4(picomatch@4.0.3)(svelte@5.53.5)(typescript@5.9.2):
     dependencies:
       "@jridgewell/trace-mapping": 0.3.31
       chokidar: 4.0.3
-      fdir: 6.5.0
+      fdir: 6.5.0(picomatch@4.0.3)
       picocolors: 1.1.1
       sade: 1.8.1
       svelte: 5.53.5
@@ -3451,8 +3760,18 @@ snapshots:
 
   text-table@0.2.0: {}
 
+  tinybench@2.9.0: {}
+
+  tinyexec@0.3.2: {}
+
+  tinypool@1.1.1: {}
+
   tinyqueue@3.0.0: {}
 
+  tinyrainbow@1.2.0: {}
+
+  tinyspy@3.0.2: {}
+
   to-regex-range@5.0.1:
     dependencies:
       is-number: 7.0.0
@@ -3477,6 +3796,24 @@ snapshots:
 
   util-deprecate@1.0.2: {}
 
+  vite-node@2.1.9(@types/node@20.19.25):
+    dependencies:
+      cac: 6.7.14
+      debug: 4.4.3
+      es-module-lexer: 1.7.0
+      pathe: 1.1.2
+      vite: 5.4.21(@types/node@20.19.25)
+    transitivePeerDependencies:
+      - "@types/node"
+      - less
+      - lightningcss
+      - sass
+      - sass-embedded
+      - stylus
+      - sugarss
+      - supports-color
+      - terser
+
   vite@5.4.21(@types/node@20.19.25):
     dependencies:
       esbuild: 0.21.5
@@ -3490,6 +3827,41 @@ snapshots:
     optionalDependencies:
       vite: 5.4.21(@types/node@20.19.25)
 
+  vitest@2.1.9(@types/node@20.19.25):
+    dependencies:
+      "@vitest/expect": 2.1.9
+      "@vitest/mocker": 2.1.9(vite@5.4.21(@types/node@20.19.25))
+      "@vitest/pretty-format": 2.1.9
+      "@vitest/runner": 2.1.9
+      "@vitest/snapshot": 2.1.9
+      "@vitest/spy": 2.1.9
+      "@vitest/utils": 2.1.9
+      chai: 5.3.3
+      debug: 4.4.3
+      expect-type: 1.3.0
+      magic-string: 0.30.21
+      pathe: 1.1.2
+      std-env: 3.10.0
+      tinybench: 2.9.0
+      tinyexec: 0.3.2
+      tinypool: 1.1.1
+      tinyrainbow: 1.2.0
+      vite: 5.4.21(@types/node@20.19.25)
+      vite-node: 2.1.9(@types/node@20.19.25)
+      why-is-node-running: 2.3.0
+    optionalDependencies:
+      "@types/node": 20.19.25
+    transitivePeerDependencies:
+      - less
+      - lightningcss
+      - msw
+      - sass
+      - sass-embedded
+      - stylus
+      - sugarss
+      - supports-color
+      - terser
+
   vt-pbf@3.1.3:
     dependencies:
       "@mapbox/point-geometry": 0.1.0
@@ -3504,6 +3876,11 @@ snapshots:
     dependencies:
       isexe: 3.1.1
 
+  why-is-node-running@2.3.0:
+    dependencies:
+      siginfo: 2.0.0
+      stackback: 0.0.2
+
   word-wrap@1.2.5: {}
 
   wrap-ansi@7.0.0:
diff --git a/apps/web/src/lib/map/basemap.test.ts b/apps/web/src/lib/map/basemap.test.ts
new file mode 100644
index 00000000..ffb80391
--- /dev/null
+++ b/apps/web/src/lib/map/basemap.test.ts
@@ -0,0 +1,55 @@
+import { describe, it, expect } from "vitest";
+import { rewritePmtilesUrl, resolveBasemapStyle } from "./basemap";
+
+describe("rewritePmtilesUrl", () => {
+  it("rewrites bare pmtiles alias to local dev proxy", () => {
+    const result = rewritePmtilesUrl(
+      "pmtiles://basemap-hamburg.pmtiles",
+      "http://localhost:5173",
+    );
+    expect(result).toBe(
+      "pmtiles://http://localhost:5173/local-basemap/basemap-hamburg.pmtiles",
+    );
+  });
+
+  it("leaves fully qualified pmtiles URLs unchanged", () => {
+    const result = rewritePmtilesUrl(
+      "pmtiles://example.com/path/tiles.pmtiles",
+      "http://localhost:5173",
+    );
+    expect(result).toBe("pmtiles://example.com/path/tiles.pmtiles");
+  });
+
+  it("leaves non-pmtiles URLs unchanged", () => {
+    const result = rewritePmtilesUrl(
+      "https://example.com/style.json",
+      "http://localhost:5173",
+    );
+    expect(result).toBe("https://example.com/style.json");
+  });
+
+  it("leaves empty string unchanged", () => {
+    expect(rewritePmtilesUrl("", "http://localhost:5173")).toBe("");
+  });
+});
+
+describe("resolveBasemapStyle", () => {
+  it("returns styleUrl for remote-style mode", () => {
+    const result = resolveBasemapStyle({
+      mode: "remote-style",
+      styleUrl: "https://example.com/style.json",
+    } as any);
+    expect(result).toBe("https://example.com/style.json");
+  });
+
+  it("throws when remote-style has no styleUrl", () => {
+    expect(() => resolveBasemapStyle({ mode: "remote-style" } as any)).toThrow(
+      "styleUrl required",
+    );
+  });
+
+  it("returns local path for local-sovereign mode", () => {
+    const result = resolveBasemapStyle({ mode: "local-sovereign" } as any);
+    expect(result).toBe("/local-basemap/style.json");
+  });
+});
diff --git a/apps/web/src/lib/stores/governance.test.ts b/apps/web/src/lib/stores/governance.test.ts
new file mode 100644
index 00000000..25332cf0
--- /dev/null
+++ b/apps/web/src/lib/stores/governance.test.ts
@@ -0,0 +1,38 @@
+import { describe, it, expect, vi } from "vitest";
+import { get } from "svelte/store";
+
+vi.mock("$app/environment", () => ({ browser: false, dev: false }));
+
+import { createBooleanToggle } from "./governance";
+
+describe("createBooleanToggle", () => {
+  it("starts with initial value (default false)", () => {
+    const toggle = createBooleanToggle();
+    expect(get(toggle)).toBe(false);
+  });
+
+  it("starts with custom initial value", () => {
+    const toggle = createBooleanToggle(true);
+    expect(get(toggle)).toBe(true);
+  });
+
+  it("open sets to true", () => {
+    const toggle = createBooleanToggle(false);
+    toggle.open();
+    expect(get(toggle)).toBe(true);
+  });
+
+  it("close sets to false", () => {
+    const toggle = createBooleanToggle(true);
+    toggle.close();
+    expect(get(toggle)).toBe(false);
+  });
+
+  it("toggle flips value", () => {
+    const toggle = createBooleanToggle(false);
+    toggle.toggle();
+    expect(get(toggle)).toBe(true);
+    toggle.toggle();
+    expect(get(toggle)).toBe(false);
+  });
+});
diff --git a/apps/web/src/lib/stores/uiInvariants.test.ts b/apps/web/src/lib/stores/uiInvariants.test.ts
new file mode 100644
index 00000000..02d07fd5
--- /dev/null
+++ b/apps/web/src/lib/stores/uiInvariants.test.ts
@@ -0,0 +1,58 @@
+import { describe, it, expect } from "vitest";
+import { assertUiStateInvariant } from "./uiInvariants";
+
+const mockSelection = { type: "node" as const, id: "123" };
+const mockDraft = {
+  mode: "new-knoten" as const,
+  source: "action-bar" as const,
+};
+
+describe("assertUiStateInvariant", () => {
+  it("passes for navigation with no selection and no draft", () => {
+    expect(() =>
+      assertUiStateInvariant("navigation", null, null),
+    ).not.toThrow();
+  });
+
+  it("passes for fokus with selection and no draft", () => {
+    expect(() =>
+      assertUiStateInvariant("fokus", mockSelection, null),
+    ).not.toThrow();
+  });
+
+  it("passes for komposition with draft and no selection", () => {
+    expect(() =>
+      assertUiStateInvariant("komposition", null, mockDraft),
+    ).not.toThrow();
+  });
+
+  it("throws when both selection and draft are set", () => {
+    expect(() =>
+      assertUiStateInvariant("fokus", mockSelection, mockDraft),
+    ).toThrow("selection and kompositionDraft cannot both be set");
+  });
+
+  it("throws when fokus has no selection", () => {
+    expect(() => assertUiStateInvariant("fokus", null, null)).toThrow(
+      "systemState is 'fokus' but selection is null",
+    );
+  });
+
+  it("throws when navigation has selection", () => {
+    expect(() =>
+      assertUiStateInvariant("navigation", mockSelection, null),
+    ).toThrow("systemState is 'navigation' but selection is not null");
+  });
+
+  it("throws when komposition has no draft", () => {
+    expect(() => assertUiStateInvariant("komposition", null, null)).toThrow(
+      "systemState is 'komposition' but kompositionDraft is null",
+    );
+  });
+
+  it("throws when not komposition but draft is set", () => {
+    expect(() => assertUiStateInvariant("navigation", null, mockDraft)).toThrow(
+      "systemState is not 'komposition' but kompositionDraft is not null",
+    );
+  });
+});
diff --git a/apps/web/src/lib/utils/guards.test.ts b/apps/web/src/lib/utils/guards.test.ts
new file mode 100644
index 00000000..ec1762d8
--- /dev/null
+++ b/apps/web/src/lib/utils/guards.test.ts
@@ -0,0 +1,28 @@
+import { describe, it, expect } from "vitest";
+import { isRecord } from "./guards";
+
+describe("isRecord", () => {
+  it("returns true for plain objects", () => {
+    expect(isRecord({})).toBe(true);
+    expect(isRecord({ key: "value" })).toBe(true);
+  });
+
+  it("returns false for null", () => {
+    expect(isRecord(null)).toBe(false);
+  });
+
+  it("returns false for primitives", () => {
+    expect(isRecord(42)).toBe(false);
+    expect(isRecord("string")).toBe(false);
+    expect(isRecord(true)).toBe(false);
+    expect(isRecord(undefined)).toBe(false);
+  });
+
+  it("returns true for arrays (they are objects)", () => {
+    expect(isRecord([])).toBe(true);
+  });
+
+  it("returns true for Date objects", () => {
+    expect(isRecord(new Date())).toBe(true);
+  });
+});
diff --git a/apps/web/vitest.config.ts b/apps/web/vitest.config.ts
new file mode 100644
index 00000000..75825d50
--- /dev/null
+++ b/apps/web/vitest.config.ts
@@ -0,0 +1,10 @@
+import { defineConfig } from "vitest/config";
+import { sveltekit } from "@sveltejs/kit/vite";
+
+export default defineConfig({
+  plugins: [sveltekit()],
+  test: {
+    include: ["src/**/*.test.ts"],
+    environment: "node",
+  },
+});
diff --git a/scripts/docmeta/docmeta.py b/scripts/docmeta/docmeta.py
index 97404aba..70180c5d 100644
--- a/scripts/docmeta/docmeta.py
+++ b/scripts/docmeta/docmeta.py
@@ -77,7 +77,7 @@ def parse_frontmatter(file_path):
                     if isinstance(data[current_key], list):
                         data[current_key].append(val)
                 continue
-            elif current_key in ['verifies_with', 'audit_gaps']:
+            elif current_key in ['verifies_with', 'audit_gaps', 'depends_on']:
                 # It's a block list item (string values)
                 val = stripped_line[2:].strip()
                 # Handle quoted strings in lists
@@ -120,7 +120,7 @@ def parse_frontmatter(file_path):
                         items[i] = item[1:-1]
                 val = items
                 current_key = None # Completed inline list
-            elif val == '' and key in ['relations', 'verifies_with', 'audit_gaps']:
+            elif val == '' and key in ['relations', 'verifies_with', 'audit_gaps', 'depends_on']:
                 # Initialize empty list for potential block list parsing on valid fields
                 val = []
                 current_key = key # Track to append items
diff --git a/scripts/docmeta/review_impact.py b/scripts/docmeta/review_impact.py
index 83d74cac..188d2dca 100644
--- a/scripts/docmeta/review_impact.py
+++ b/scripts/docmeta/review_impact.py
@@ -4,6 +4,48 @@
 
 from scripts.docmeta.docmeta import REPO_ROOT, parse_repo_index, parse_frontmatter, parse_review_policy, normalize_list_field, extract_depends_on
 
+
+# --- Dependency resolution contract ---
+# ``depends_on`` (direct frontmatter field) is the *canonical* source for
+# dependency IDs.  The ``relations`` array (entries with
+# ``type: depends_on``) serves only as a **legacy fallback** for documents
+# that have not yet migrated to the direct field.
+#
+# When both sources provide data simultaneously, ``depends_on`` wins and a
+# warning is emitted so the duplication can be cleaned up.
+#
+# Long-term goal: unify on ``depends_on`` exclusively and remove the
+# relations fallback.
+def _get_depends_on(frontmatter, doc_id=None):
+    """Get dependency IDs from frontmatter.
+
+    Supports both the direct ``depends_on`` field and the ``relations``
+    array (entries with ``type: depends_on``).  The direct field takes
+    precedence; the relations fallback ensures compatibility when
+    ``parse_frontmatter`` does not handle ``depends_on`` as a block list.
+    """
+    deps = normalize_list_field(frontmatter.get('depends_on', []))
+    relations_deps = []
+    relations = frontmatter.get('relations', [])
+    if isinstance(relations, list):
+        for entry in relations:
+            if isinstance(entry, dict) and entry.get('type') == 'depends_on':
+                target = entry.get('target', '')
+                if target:
+                    relations_deps.append(target)
+    if deps and relations_deps:
+        label = f"'{doc_id}'" if doc_id else '<unknown>'
+        print(
+            f"Warning: document {label} defines depends_on in both "
+            "'depends_on' and 'relations'. "
+            "Using 'depends_on' as canonical source.",
+            file=sys.stderr,
+        )
+    if deps:
+        return deps
+    return relations_deps
+
+
 def main():
     try:
         policy = parse_review_policy()
@@ -14,12 +56,12 @@ def main():
         print(f"Error parsing manifest/policy: {e}", file=sys.stderr)
         sys.exit(1)
 
-    # Build dependency graph: id -> list of dependencies (edges from a doc to what it depends on)
-    # Also reverse graph: id -> list of dependent docs (edges from a doc to docs that depend on it)
-    dependencies = {} # id -> list of dependent docs (file paths)
-    forward_deps = {} # id -> list of ids it depends on
+    # Build dependency graph — all edges are ID-based.
+    # reverse_deps: id -> list of doc IDs that depend on it
+    # forward_deps: id -> list of doc IDs it depends on
+    reverse_deps = {}
+    forward_deps = {}
     id_to_file = {}
-    file_to_id = {}
     missing_ids = []
 
     zones = repo_index.get('zones', {})
@@ -46,16 +88,15 @@ def main():
                 continue
 
             id_to_file[doc_id] = rel_file_path
-            file_to_id[rel_file_path] = doc_id
 
-            depends_on = extract_depends_on(frontmatter)
+            depends_on = _get_depends_on(frontmatter, doc_id=doc_id)
 
             forward_deps[doc_id] = depends_on
 
-            for dep in depends_on:
-                if dep not in dependencies:
-                    dependencies[dep] = []
-                dependencies[dep].append(rel_file_path)
+            for dep_id in depends_on:
+                if dep_id not in reverse_deps:
+                    reverse_deps[dep_id] = []
+                reverse_deps[dep_id].append(doc_id)
 
     # Check for cycles
     def find_cycles():
@@ -93,12 +134,12 @@ def dfs(node):
 
     cycles = find_cycles()
 
-    # Calculate transitive impact for all documents
+    # Calculate transitive impact for all documents (fully ID-based traversal)
     impact_data = {}
     for doc_id, filepath in id_to_file.items():
         visited = set()
         queue = [doc_id]
-        impacted_files = set()
+        impacted_ids = set()
 
         while queue:
             current_id = queue.pop(0)
@@ -106,15 +147,17 @@ def dfs(node):
                 continue
             visited.add(current_id)
 
-            dependents = dependencies.get(current_id, [])
-            for dep_file in dependents:
-                impacted_files.add(dep_file)
-                if dep_file in file_to_id:
-                    queue.append(file_to_id[dep_file])
+            for dep_id in reverse_deps.get(current_id, []):
+                impacted_ids.add(dep_id)
+                queue.append(dep_id)
+
+        impacted_files = sorted(
+            id_to_file[i] for i in impacted_ids if i in id_to_file
+        )
 
         impact_data[doc_id] = {
             "file": filepath,
-            "transitive_impacts": sorted(list(impacted_files))
+            "transitive_impacts": impacted_files
         }
 
     # Save artifacts
diff --git a/scripts/docmeta/tests/test_generate_knowledge_gaps.py b/scripts/docmeta/tests/test_generate_knowledge_gaps.py
new file mode 100644
index 00000000..dc391ba4
--- /dev/null
+++ b/scripts/docmeta/tests/test_generate_knowledge_gaps.py
@@ -0,0 +1,72 @@
+import unittest
+
+from scripts.docmeta.generate_knowledge_gaps import is_meaningful_gap
+
+
+class TestIsMeaningfulGap(unittest.TestCase):
+    """Tests for the is_meaningful_gap filter function."""
+
+    def test_none_returns_false(self):
+        self.assertFalse(is_meaningful_gap(None))
+
+    def test_bool_true_returns_false(self):
+        self.assertFalse(is_meaningful_gap(True))
+
+    def test_bool_false_returns_false(self):
+        self.assertFalse(is_meaningful_gap(False))
+
+    def test_empty_string_returns_false(self):
+        self.assertFalse(is_meaningful_gap(""))
+
+    def test_placeholder_false(self):
+        self.assertFalse(is_meaningful_gap("false"))
+
+    def test_placeholder_true(self):
+        self.assertFalse(is_meaningful_gap("true"))
+
+    def test_placeholder_none(self):
+        self.assertFalse(is_meaningful_gap("none"))
+
+    def test_placeholder_null(self):
+        self.assertFalse(is_meaningful_gap("null"))
+
+    def test_placeholder_unknown(self):
+        self.assertFalse(is_meaningful_gap("unknown"))
+
+    def test_placeholder_na(self):
+        self.assertFalse(is_meaningful_gap("n/a"))
+
+    def test_placeholder_empty_list(self):
+        self.assertFalse(is_meaningful_gap("[]"))
+
+    def test_placeholder_empty_dict(self):
+        self.assertFalse(is_meaningful_gap("{}"))
+
+    def test_meaningful_string_gap_description(self):
+        self.assertTrue(is_meaningful_gap("Missing authentication docs"))
+
+    def test_meaningful_string_needs_review(self):
+        self.assertTrue(is_meaningful_gap("Needs review"))
+
+    def test_case_insensitivity_false_upper(self):
+        self.assertFalse(is_meaningful_gap("FALSE"))
+
+    def test_case_insensitivity_true_mixed(self):
+        self.assertFalse(is_meaningful_gap("True"))
+
+    def test_case_insensitivity_none_mixed(self):
+        self.assertFalse(is_meaningful_gap("None"))
+
+    def test_whitespace_only_returns_false(self):
+        self.assertFalse(is_meaningful_gap("   "))
+
+    def test_numeric_zero(self):
+        # str(0).strip().lower() == "0" which is not a placeholder
+        self.assertTrue(is_meaningful_gap(0))
+
+    def test_numeric_nonzero(self):
+        self.assertTrue(is_meaningful_gap(42))
+
+
+if __name__ == '__main__':
+    unittest.main()
diff --git a/scripts/docmeta/tests/test_review_impact.py b/scripts/docmeta/tests/test_review_impact.py
new file mode 100644
index 00000000..d61dc63f
--- /dev/null
+++ b/scripts/docmeta/tests/test_review_impact.py
@@ -0,0 +1,258 @@
+import io
+import json
+import os
+import shutil
+import tempfile
+import unittest
+from contextlib import redirect_stdout, redirect_stderr
+from unittest.mock import patch
+
+from scripts.docmeta.review_impact import main, _get_depends_on
+
+
+class TestReviewImpact(unittest.TestCase):
+    def setUp(self):
+        self.temp_dir = tempfile.mkdtemp()
+
+    def _write_doc(self, relpath, content):
+        full_path = os.path.normpath(os.path.join(self.temp_dir, relpath))
+        os.makedirs(os.path.dirname(full_path), exist_ok=True)
+        with open(full_path, 'w', encoding='utf-8') as f:
+            f.write(content)
+
+    def tearDown(self):
+        shutil.rmtree(self.temp_dir)
+
+    def _load_impact_json(self):
+        json_path = os.path.join(self.temp_dir, "artifacts", "docmeta", "impact.json")
+        with open(json_path, 'r', encoding='utf-8') as f:
+            return json.load(f)
+
+    # ------------------------------------------------------------------
+    # Tests
+    # ------------------------------------------------------------------
+    @patch('scripts.docmeta.review_impact.parse_review_policy')
+    @patch('scripts.docmeta.review_impact.parse_repo_index')
+    def test_linear_chain_no_cycles(self, mock_parse_repo_index, mock_parse_review_policy):
+        """A -> B -> C: no cycles, transitive impacts propagate."""
+        mock_parse_review_policy.return_value = {
+            "mode": "warn", "strict_manifest": False,
+            "warn_days": 90, "fail_days": 180,
+        }
+        repo_index = {
+            "zones": {
+                "norm": {
+                    "path": "docs/",
+                    "canonical_docs": ["a.md", "b.md", "c.md"],
+                }
+            }
+        }
+        mock_parse_repo_index.return_value = repo_index
+
+        # C has no deps, B depends on C, A depends on B
+        self._write_doc("docs/c.md", "---\nid: doc-c\n---\n")
+        self._write_doc("docs/b.md", "---\nid: doc-b\ndepends_on:\n  - doc-c\n---\n")
+        self._write_doc("docs/a.md", "---\nid: doc-a\ndepends_on:\n  - doc-b\n---\n")
+
+        captured_out = io.StringIO()
+        captured_err = io.StringIO()
+        with redirect_stdout(captured_out), redirect_stderr(captured_err):
+            with patch('scripts.docmeta.review_impact.REPO_ROOT', self.temp_dir):
+                main()
+
+        data = self._load_impact_json()
+        self.assertEqual(data["cycles"], [])
+
+        # Changing doc-c should transitively impact both doc-b and doc-a
+        impacts_c = data["impacts"]["doc-c"]["transitive_impacts"]
+        self.assertIn("docs/b.md", impacts_c)
+        self.assertIn("docs/a.md", impacts_c)
+
+        # Changing doc-b should impact doc-a
+        impacts_b = data["impacts"]["doc-b"]["transitive_impacts"]
+        self.assertIn("docs/a.md", impacts_b)
+
+        # doc-a has no dependents
+        self.assertEqual(data["impacts"]["doc-a"]["transitive_impacts"], [])
+
+    @patch('scripts.docmeta.review_impact.parse_review_policy')
+    @patch('scripts.docmeta.review_impact.parse_repo_index')
+    def test_simple_cycle_detected(self, mock_parse_repo_index, mock_parse_review_policy):
+        """A -> B -> A: cycle detected."""
+        mock_parse_review_policy.return_value = {
+            "mode": "warn", "strict_manifest": False,
+            "warn_days": 90, "fail_days": 180,
+        }
+        repo_index = {
+            "zones": {
+                "norm": {
+                    "path": "docs/",
+                    "canonical_docs": ["a.md", "b.md"],
+                }
+            }
+        }
+        mock_parse_repo_index.return_value = repo_index
+
+        self._write_doc("docs/a.md", "---\nid: doc-a\ndepends_on:\n  - doc-b\n---\n")
+        self._write_doc("docs/b.md", "---\nid: doc-b\ndepends_on:\n  - doc-a\n---\n")
+
+        captured_out = io.StringIO()
+        captured_err = io.StringIO()
+        with redirect_stdout(captured_out), redirect_stderr(captured_err):
+            with patch('scripts.docmeta.review_impact.REPO_ROOT', self.temp_dir):
+                main()
+
+        data = self._load_impact_json()
+        self.assertGreater(len(data["cycles"]), 0)
+
+        err = captured_err.getvalue()
+        self.assertIn("cycle", err.lower())
+
+    @patch('scripts.docmeta.review_impact.parse_review_policy')
+    @patch('scripts.docmeta.review_impact.parse_repo_index')
+    def test_no_dependencies(self, mock_parse_repo_index, mock_parse_review_policy):
+        """No dependencies at all: no cycles, no impacts."""
+        mock_parse_review_policy.return_value = {
+            "mode": "warn", "strict_manifest": False,
+            "warn_days": 90, "fail_days": 180,
+        }
+        repo_index = {
+            "zones": {
+                "norm": {
+                    "path": "docs/",
+                    "canonical_docs": ["a.md", "b.md"],
+                }
+            }
+        }
+        mock_parse_repo_index.return_value = repo_index
+
+        self._write_doc("docs/a.md", "---\nid: doc-a\n---\n")
+        self._write_doc("docs/b.md", "---\nid: doc-b\n---\n")
+
+        captured_out = io.StringIO()
+        captured_err = io.StringIO()
+        with redirect_stdout(captured_out), redirect_stderr(captured_err):
+            with patch('scripts.docmeta.review_impact.REPO_ROOT', self.temp_dir):
+                main()
+
+        data = self._load_impact_json()
+        self.assertEqual(data["cycles"], [])
+        self.assertEqual(data["impacts"]["doc-a"]["transitive_impacts"], [])
+        self.assertEqual(data["impacts"]["doc-b"]["transitive_impacts"], [])
+
+    @patch('scripts.docmeta.review_impact.parse_review_policy')
+    @patch('scripts.docmeta.review_impact.parse_repo_index')
+    def test_missing_id_strict_mode_exits(self, mock_parse_repo_index, mock_parse_review_policy):
+        """Documents missing 'id' in strict mode should cause exit."""
+        mock_parse_review_policy.return_value = {
+            "mode": "strict", "strict_manifest": False,
+            "warn_days": 90, "fail_days": 180,
+        }
+        repo_index = {
+            "zones": {
+                "norm": {
+                    "path": "docs/",
+                    "canonical_docs": ["no_id.md"],
+                }
+            }
+        }
+        mock_parse_repo_index.return_value = repo_index
+
+        self._write_doc("docs/no_id.md", "---\ntitle: No ID\n---\n")
+
+        captured_out = io.StringIO()
+        captured_err = io.StringIO()
+        with self.assertRaises(SystemExit) as ctx:
+            with redirect_stdout(captured_out), redirect_stderr(captured_err):
+                with patch('scripts.docmeta.review_impact.REPO_ROOT', self.temp_dir):
+                    main()
+
+        self.assertEqual(ctx.exception.code, 1)
+        self.assertIn("missing", captured_err.getvalue().lower())
+
+    @patch('scripts.docmeta.review_impact.parse_review_policy')
+    @patch('scripts.docmeta.review_impact.parse_repo_index')
+    def test_json_artifact_structure(self, mock_parse_repo_index, mock_parse_review_policy):
+        """Output JSON has expected top-level keys."""
+        mock_parse_review_policy.return_value = {
+            "mode": "warn", "strict_manifest": False,
+            "warn_days": 90, "fail_days": 180,
+        }
+        repo_index = {
+            "zones": {
+                "norm": {
+                    "path": "docs/",
+                    "canonical_docs": ["a.md"],
+                }
+            }
+        }
+        mock_parse_repo_index.return_value = repo_index
+
+        self._write_doc("docs/a.md", "---\nid: doc-a\n---\n")
+
+        captured_out = io.StringIO()
+        captured_err = io.StringIO()
+        with redirect_stdout(captured_out), redirect_stderr(captured_err):
+            with patch('scripts.docmeta.review_impact.REPO_ROOT', self.temp_dir):
+                main()
+
+        data = self._load_impact_json()
+        self.assertIn("missing_ids", data)
+        self.assertIn("cycles", data)
+        self.assertIn("impacts", data)
+
+        # Markdown artifact should also exist
+        md_path = os.path.join(self.temp_dir, "artifacts", "docmeta", "impact.md")
+        self.assertTrue(os.path.exists(md_path))
+
+
+class TestGetDependsOn(unittest.TestCase):
+    """Unit tests for the _get_depends_on helper."""
+
+    def test_direct_depends_on_only(self):
+        """Direct depends_on field is returned when present."""
+        fm = {'depends_on': ['doc-x', 'doc-y']}
+        self.assertEqual(_get_depends_on(fm), ['doc-x', 'doc-y'])
+
+    def test_relations_fallback(self):
+        """Relations array is used when depends_on is absent."""
+        fm = {
+            'relations': [
+                {'type': 'depends_on', 'target': 'doc-z'},
+            ],
+        }
+        self.assertEqual(_get_depends_on(fm), ['doc-z'])
+
+    def test_dual_source_warns(self):
+        """Warning emitted when both sources define depends_on."""
+        fm = {
+            'depends_on': ['doc-a'],
+            'relations': [
+                {'type': 'depends_on', 'target': 'doc-b'},
+            ],
+        }
+        captured_err = io.StringIO()
+        with redirect_stderr(captured_err):
+            result = _get_depends_on(fm, doc_id='test-doc')
+        # depends_on wins
+        self.assertEqual(result, ['doc-a'])
+        err = captured_err.getvalue()
+        self.assertIn("Warning", err)
+        self.assertIn("test-doc", err)
+        self.assertIn("depends_on", err)
+
+    def test_no_warning_single_source(self):
+        """No warning when only one source provides data."""
+        fm = {'depends_on': ['doc-a']}
+        captured_err = io.StringIO()
+        with redirect_stderr(captured_err):
+            _get_depends_on(fm, doc_id='test-doc')
+        self.assertEqual(captured_err.getvalue(), "")
+
+    def test_empty_returns_empty(self):
+        """Empty frontmatter returns empty list."""
+        self.assertEqual(_get_depends_on({}), [])
+
+
+if __name__ == '__main__':
+    unittest.main()
diff --git a/scripts/docmeta/tests/test_validate_schema.py b/scripts/docmeta/tests/test_validate_schema.py
new file mode 100644
index 00000000..0c537cf0
--- /dev/null
+++ b/scripts/docmeta/tests/test_validate_schema.py
@@ -0,0 +1,161 @@
+import unittest
+
+from scripts.docmeta.validate_schema import validate_data_against_schema
+
+
+class TestValidateDataAgainstSchema(unittest.TestCase):
+    """Tests for the validate_data_against_schema pure function."""
+
+    def test_valid_object_all_required_fields(self):
+        schema = {
+            "type": "object",
+            "required": ["id", "title"],
+            "properties": {
+                "id": {"type": "string"},
+                "title": {"type": "string"},
+            },
+        }
+        data = {"id": "doc-1", "title": "My Document"}
+        errors = validate_data_against_schema(data, schema)
+        self.assertEqual(errors, [])
+
+    def test_missing_required_field(self):
+        schema = {
+            "type": "object",
+            "required": ["id", "title"],
+            "properties": {
+                "id": {"type": "string"},
+                "title": {"type": "string"},
+            },
+        }
+        data = {"id": "doc-1"}
+        errors = validate_data_against_schema(data, schema)
+        self.assertEqual(len(errors), 1)
+        self.assertIn("title", errors[0])
+        self.assertIn("missing required field", errors[0])
+
+    def test_wrong_type_expected_object_got_string(self):
+        schema = {"type": "object", "properties": {}}
+        data = "not an object"
+        errors = validate_data_against_schema(data, schema)
+        self.assertEqual(len(errors), 1)
+        self.assertIn("expected object", errors[0])
+        self.assertIn("got str", errors[0])
+
+    def test_string_enum_invalid_value(self):
+        schema = {"type": "string", "enum": ["active", "draft", "archived"]}
+        data = "deleted"
+        errors = validate_data_against_schema(data, schema)
+        self.assertEqual(len(errors), 1)
+        self.assertIn("'deleted'", errors[0])
+        self.assertIn("not one of", errors[0])
+
+    def test_string_enum_valid_value(self):
+        schema = {"type": "string", "enum": ["active", "draft", "archived"]}
+        errors = validate_data_against_schema("active", schema)
+        self.assertEqual(errors, [])
+
+    def test_string_minlength_too_short(self):
+        schema = {"type": "string", "minLength": 5}
+        errors = validate_data_against_schema("ab", schema)
+        self.assertEqual(len(errors), 1)
+        self.assertIn("minLength", errors[0])
+
+    def test_string_minlength_exact(self):
+        schema = {"type": "string", "minLength": 3}
+        errors = validate_data_against_schema("abc", schema)
+        self.assertEqual(errors, [])
+
+    def test_string_pattern_no_match(self):
+        schema = {"type": "string", "pattern": r"^[a-z]+\.[a-z]+$"}
+        errors = validate_data_against_schema("UPPER", schema)
+        self.assertEqual(len(errors), 1)
+        self.assertIn("does not match pattern", errors[0])
+
+    def test_string_pattern_match(self):
+        schema = {"type": "string", "pattern": r"^[a-z]+\.[a-z]+$"}
+        errors = validate_data_against_schema("foo.bar", schema)
+        self.assertEqual(errors, [])
+
+    def test_array_items_schema_applied(self):
+        schema = {
+            "type": "array",
+            "items": {"type": "string", "minLength": 2},
+        }
+        data = ["ok", "x"]
+        errors = validate_data_against_schema(data, schema)
+        self.assertEqual(len(errors), 1)
+        self.assertIn("[1]", errors[0])
+        self.assertIn("minLength", errors[0])
+
+    def test_array_all_valid_items(self):
+        schema = {
+            "type": "array",
+            "items": {"type": "string"},
+        }
+        errors = validate_data_against_schema(["a", "b", "c"], schema)
+        self.assertEqual(errors, [])
+
+    def test_array_wrong_type(self):
+        schema = {"type": "array", "items": {"type": "string"}}
+        errors = validate_data_against_schema("not a list", schema)
+        self.assertEqual(len(errors), 1)
+        self.assertIn("expected array", errors[0])
+
+    def test_nested_object_validation(self):
+        schema = {
+            "type": "object",
+            "properties": {
+                "meta": {
+                    "type": "object",
+                    "required": ["version"],
+                    "properties": {
+                        "version": {"type": "string"},
+                    },
+                }
+            },
+        }
+        data = {"meta": {}}
+        errors = validate_data_against_schema(data, schema)
+        self.assertEqual(len(errors), 1)
+        self.assertIn("root.meta", errors[0])
+        self.assertIn("version", errors[0])
+
+    def test_additional_properties_rejected(self):
+        schema = {
+            "type": "object",
+            "additionalProperties": False,
+            "properties": {
+                "id": {"type": "string"},
+            },
+        }
+        data = {"id": "ok", "extra": "bad"}
+        errors = validate_data_against_schema(data, schema)
+        self.assertEqual(len(errors), 1)
+        self.assertIn("unexpected property", errors[0])
+        self.assertIn("extra", errors[0])
+
+    def test_additional_properties_allowed_by_default(self):
+        schema = {
+            "type": "object",
+            "properties": {
+                "id": {"type": "string"},
+            },
+        }
+        data = {"id": "ok", "extra": "fine"}
+        errors = validate_data_against_schema(data, schema)
+        self.assertEqual(errors, [])
+
+    def test_empty_data_no_required_fields(self):
+        schema = {
+            "type": "object",
+            "properties": {
+                "id": {"type": "string"},
+            },
+        }
+        errors = validate_data_against_schema({}, schema)
+        self.assertEqual(errors, [])
+
+
+if __name__ == '__main__':
+    unittest.main()
diff --git a/scripts/guard/metrics-ref-guard.sh b/scripts/guard/metrics-ref-guard.sh
index daef652c..b3810b5b 100755
--- a/scripts/guard/metrics-ref-guard.sh
+++ b/scripts/guard/metrics-ref-guard.sh
@@ -8,7 +8,7 @@ set -euo pipefail
 # drift when one value is bumped but the other is forgotten.
 
 SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
-REPO_ROOT="$(cd -- "${SCRIPT_DIR}/../.." >/dev/null 2>&1 && pwd)"
+REPO_ROOT="${REPO_ROOT:-$(cd -- "${SCRIPT_DIR}/../.." >/dev/null 2>&1 && pwd)}"
 
 WORKFLOW="${REPO_ROOT}/.github/workflows/metrics.yml"
 
diff --git a/scripts/guard/run.sh b/scripts/guard/run.sh
index d2ed8cfe..a71a5e15 100755
--- a/scripts/guard/run.sh
+++ b/scripts/guard/run.sh
@@ -1,6 +1,13 @@
 #!/usr/bin/env bash
 set -euo pipefail
 
+# Core guard orchestrator — runs all canonical CI guards.
+#
+# Core guards are fast, deterministic, and require no external runtime
+# dependencies (no Docker daemon, no network, no running services).
+# Guards that need Docker Compose or other environment-specific tooling
+# are non-core and live outside this orchestration (see guard_api_alias.sh).
+
 SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
 REPO_ROOT="$(cd -- "${SCRIPT_DIR}/../.." >/dev/null 2>&1 && pwd)"
 
diff --git a/scripts/guard/token-leak-guard.sh b/scripts/guard/token-leak-guard.sh
index c81ace2b..0a12ab2f 100755
--- a/scripts/guard/token-leak-guard.sh
+++ b/scripts/guard/token-leak-guard.sh
@@ -2,16 +2,25 @@
 set -euo pipefail
 
 SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
-REPO_ROOT="$(cd -- "${SCRIPT_DIR}/../.." >/dev/null 2>&1 && pwd)"
+REPO_ROOT="${REPO_ROOT:-$(cd -- "${SCRIPT_DIR}/../.." >/dev/null 2>&1 && pwd)}"
 
 echo "Checking for accidental token/secret leaks in text files..."
 
 set +e
 # Exclude narrowly scoped known-safe reference/example locations that intentionally contain auth-related example strings.
 # Keep this list minimal; whole-directory exclusions must not be introduced.
+# Exclusion justifications:
+#   token-leak-guard.sh       — contains the detection pattern itself
+#   test_token_leak_guard.sh  — test fixtures for this guard
+#   auth.rs                   — production auth route with token handling
+#   api_auth.rs               — integration tests for auth endpoints
+#   runbook.md                — operational docs with auth example commands
+#   auth-and-ui-routing.md    — architecture blueprint with auth flow examples
+#   verify_magic_link.py      — deployment verification script with auth URLs
 MATCHES=$(git -C "$REPO_ROOT" grep -i -E "token=[a-zA-Z0-9-]{10,}|/api/auth/(magic-link|login)/consume|Authorization:[[:space:]]*Bearer[[:space:]]+[a-zA-Z0-9-]{10,}|secret=[a-zA-Z0-9-]{10,}|password=[a-zA-Z0-9-]{10,}" \
   -- . \
   ':!scripts/guard/token-leak-guard.sh' \
+  ':!scripts/tests/test_token_leak_guard.sh' \
   ':!apps/api/src/routes/auth.rs' \
   ':!apps/api/tests/api_auth.rs' \
   ':!docs/runbook.md' \
diff --git a/scripts/guard_api_alias.sh b/scripts/guard_api_alias.sh
index ec3363ec..62e01932 100755
--- a/scripts/guard_api_alias.sh
+++ b/scripts/guard_api_alias.sh
@@ -1,6 +1,9 @@
 #!/usr/bin/env bash
 set -euo pipefail
 
+# Non-core guard — not part of the CI guard system (scripts/guard/run.sh).
+# Requires Docker Compose to render config; run manually or in Docker-capable environments.
+#
 # Guard scripts are executable, not meant to be sourced.
 if [[ "${BASH_SOURCE[0]}" != "$0" ]]; then
   echo "ERROR: scripts/guard_api_alias.sh must not be sourced. Run it as an executable."
diff --git a/scripts/tests/test_compose_volumes_guard.sh b/scripts/tests/test_compose_volumes_guard.sh
new file mode 100755
index 00000000..0db2c93d
--- /dev/null
+++ b/scripts/tests/test_compose_volumes_guard.sh
@@ -0,0 +1,150 @@
+#!/usr/bin/env bash
+set -euo pipefail
+
+# Test: scripts/guard-compose-no-relative-volumes.sh
+# Verifies that the compose volume guard correctly detects
+# relative host volume paths and enforces the prod allowlist.
+
+SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
+REPO_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
+GUARD_SCRIPT="$REPO_ROOT/scripts/guard-compose-no-relative-volumes.sh"
+
+TEMP_DIR="$(mktemp -d)"
+trap 'rm -rf "$TEMP_DIR"' EXIT
+
+PASS=0
+FAIL=0
+
+report() {
+  if [ "$1" -eq 0 ]; then
+    PASS=$((PASS + 1))
+    echo "PASS: $2"
+  else
+    FAIL=$((FAIL + 1))
+    echo "FAIL: $2"
+  fi
+}
+
+# Case 1: No relative volumes — should pass
+cat > "$TEMP_DIR/compose-clean.yml" <<'YAML'
+services:
+  api:
+    image: api:latest
+    volumes:
+      - db_data:/var/lib/postgresql/data
+      - /opt/weltgewebe/policies:/app/policies:ro
+YAML
+
+if bash "$GUARD_SCRIPT" "$TEMP_DIR/compose-clean.yml" >/dev/null 2>&1; then
+  report 0 "No relative volumes passes"
+else
+  report 1 "No relative volumes should pass"
+fi
+
+# Case 2: Relative volume in non-prod file — should fail
+cat > "$TEMP_DIR/compose-bad.yml" <<'YAML'
+services:
+  api:
+    image: api:latest
+    volumes:
+      - ./data:/app/data
+YAML
+
+if bash "$GUARD_SCRIPT" "$TEMP_DIR/compose-bad.yml" >/dev/null 2>&1; then
+  report 1 "Relative volume in non-prod should fail"
+else
+  report 0 "Relative volume in non-prod correctly rejected"
+fi
+
+# Case 3: Parent-relative volume — should fail
+cat > "$TEMP_DIR/compose-parent.yml" <<'YAML'
+services:
+  web:
+    image: web:latest
+    volumes:
+      - ../config/app.conf:/etc/app/app.conf:ro
+YAML
+
+if bash "$GUARD_SCRIPT" "$TEMP_DIR/compose-parent.yml" >/dev/null 2>&1; then
+  report 1 "Parent-relative volume should fail"
+else
+  report 0 "Parent-relative volume correctly rejected"
+fi
+
+# Case 4: Allowed Caddy mounts in compose.prod.yml — should pass
+cat > "$TEMP_DIR/compose.prod.yml" <<'YAML'
+services:
+  caddy:
+    image: caddy:latest
+    volumes:
+      - ../caddy/Caddyfile.prod:/etc/caddy/Caddyfile:ro
+      - ../caddy/heimserver:/etc/caddy/heimserver:ro
+YAML
+
+if bash "$GUARD_SCRIPT" "$TEMP_DIR/compose.prod.yml" >/dev/null 2>&1; then
+  report 0 "Allowed Caddy mounts in compose.prod.yml pass"
+else
+  report 1 "Allowed Caddy mounts in compose.prod.yml should pass"
+fi
+
+# Case 5: Non-allowed relative volume in compose.prod.yml — should fail
+cat > "$TEMP_DIR/compose.prod.yml" <<'YAML'
+services:
+  caddy:
+    image: caddy:latest
+    volumes:
+      - ../caddy/Caddyfile.prod:/etc/caddy/Caddyfile:ro
+      - ./secrets:/app/secrets
+YAML
+
+if bash "$GUARD_SCRIPT" "$TEMP_DIR/compose.prod.yml" >/dev/null 2>&1; then
+  report 1 "Non-allowed relative volume in compose.prod.yml should fail"
+else
+  report 0 "Non-allowed relative volume in compose.prod.yml correctly rejected"
+fi
+
+# Case 6: Missing compose file — should exit 2
+if bash "$GUARD_SCRIPT" "$TEMP_DIR/nonexistent.yml" >/dev/null 2>&1; then
+  report 1 "Missing compose file should fail"
+else
+  report 0 "Missing compose file correctly detected"
+fi
+
+# Case 7: Named volumes only — should pass
+cat > "$TEMP_DIR/compose-named.yml" <<'YAML'
+services:
+  db:
+    image: postgres:16
+    volumes:
+      - pgdata:/var/lib/postgresql/data
+volumes:
+  pgdata:
+YAML
+
+if bash "$GUARD_SCRIPT" "$TEMP_DIR/compose-named.yml" >/dev/null 2>&1; then
+  report 0 "Named volumes pass"
+else
+  report 1 "Named volumes should pass"
+fi
+
+# Case 8: Caddy mounts without :ro — should also pass
+cat > "$TEMP_DIR/compose.prod.yml" <<'YAML'
+services:
+  caddy:
+    image: caddy:latest
+    volumes:
+      - ../caddy/Caddyfile.prod:/etc/caddy/Caddyfile
+      - ../caddy/heimserver:/etc/caddy/heimserver
+YAML
+
+if bash "$GUARD_SCRIPT" "$TEMP_DIR/compose.prod.yml" >/dev/null 2>&1; then
+  report 0 "Caddy mounts without :ro pass (optional suffix)"
+else
+  report 1 "Caddy mounts without :ro should pass"
+fi
+
+echo ""
+echo "test_compose_volumes_guard: $PASS passed, $FAIL failed"
+if [ "$FAIL" -ne 0 ]; then
+  exit 1
+fi
diff --git a/scripts/tests/test_guard_cleanup.sh b/scripts/tests/test_guard_cleanup.sh
index 1bd1f747..f1a4f13f 100755
--- a/scripts/tests/test_guard_cleanup.sh
+++ b/scripts/tests/test_guard_cleanup.sh
@@ -1,6 +1,9 @@
 #!/usr/bin/env bash
 set -euo pipefail
 
+# Non-core guard test — not part of CI guard test suite.
+# Tests scripts/guard_api_alias.sh (a non-core guard that requires Docker).
+#
 # This test verifies that scripts/guard_api_alias.sh cleans up its
 # temporary stderr file properly, without needing to manipulate traps.
 
diff --git a/scripts/tests/test_metrics_ref_guard.sh b/scripts/tests/test_metrics_ref_guard.sh
new file mode 100755
index 00000000..d371744d
--- /dev/null
+++ b/scripts/tests/test_metrics_ref_guard.sh
@@ -0,0 +1,102 @@
+#!/usr/bin/env bash
+set -euo pipefail
+
+# Test: scripts/guard/metrics-ref-guard.sh
+# Verifies that the metrics ref guard correctly detects mismatches
+# between uses: ref and metarepo_ref in the metrics workflow.
+#
+# Tests call the REAL guard script via REPO_ROOT override — no
+# shadow reimplementation of guard logic.
+
+SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
+REPO_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
+GUARD_SCRIPT="$REPO_ROOT/scripts/guard/metrics-ref-guard.sh"
+
+TEMP_DIR="$(mktemp -d)"
+trap 'rm -rf "$TEMP_DIR"' EXIT
+
+PASS=0
+FAIL=0
+
+report() {
+  if [ "$1" -eq 0 ]; then
+    PASS=$((PASS + 1))
+    echo "PASS: $2"
+  else
+    FAIL=$((FAIL + 1))
+    echo "FAIL: $2"
+  fi
+}
+
+# Case 1: Matching refs — should pass
+mkdir -p "$TEMP_DIR/case1/.github/workflows"
+cat > "$TEMP_DIR/case1/.github/workflows/metrics.yml" <<'YAML'
+name: Metrics
+on:
+  workflow_dispatch:
+jobs:
+  metrics:
+    uses: heimgewebe/metarepo/.github/workflows/wgx-metrics.yml@abc123def456
+    with:
+      metarepo_ref: abc123def456
+      post_url: https://example.com
+YAML
+
+if REPO_ROOT="$TEMP_DIR/case1" bash "$GUARD_SCRIPT" >/dev/null 2>&1; then
+  report 0 "Matching refs pass"
+else
+  report 1 "Matching refs should pass"
+fi
+
+# Case 2: Mismatched refs — should fail with exit 1
+mkdir -p "$TEMP_DIR/case2/.github/workflows"
+cat > "$TEMP_DIR/case2/.github/workflows/metrics.yml" <<'YAML'
+name: Metrics
+on:
+  workflow_dispatch:
+jobs:
+  metrics:
+    uses: heimgewebe/metarepo/.github/workflows/wgx-metrics.yml@abc123def456
+    with:
+      metarepo_ref: xyz789different
+      post_url: https://example.com
+YAML
+
+if REPO_ROOT="$TEMP_DIR/case2" bash "$GUARD_SCRIPT" >/dev/null 2>&1; then
+  report 1 "Mismatched refs should fail"
+else
+  report 0 "Mismatched refs correctly detected"
+fi
+
+# Case 3: Missing workflow file — should fail with exit 2
+if REPO_ROOT="$TEMP_DIR/nonexistent" bash "$GUARD_SCRIPT" >/dev/null 2>&1; then
+  report 1 "Missing workflow should fail"
+else
+  report 0 "Missing workflow correctly detected"
+fi
+
+# Case 4: Quoted metarepo_ref — should still match
+mkdir -p "$TEMP_DIR/case4/.github/workflows"
+cat > "$TEMP_DIR/case4/.github/workflows/metrics.yml" <<'YAML'
+name: Metrics
+on:
+  workflow_dispatch:
+jobs:
+  metrics:
+    uses: heimgewebe/metarepo/.github/workflows/wgx-metrics.yml@sha256abc123
+    with:
+      metarepo_ref: "sha256abc123"
+      post_url: https://example.com
+YAML
+
+if REPO_ROOT="$TEMP_DIR/case4" bash "$GUARD_SCRIPT" >/dev/null 2>&1; then
+  report 0 "Quoted metarepo_ref correctly matches"
+else
+  report 1 "Quoted metarepo_ref should be stripped and match"
+fi
+
+echo ""
+echo "test_metrics_ref_guard: $PASS passed, $FAIL failed"
+if [ "$FAIL" -ne 0 ]; then
+  exit 1
+fi
diff --git a/scripts/tests/test_token_leak_guard.sh b/scripts/tests/test_token_leak_guard.sh
new file mode 100755
index 00000000..a9993cc9
--- /dev/null
+++ b/scripts/tests/test_token_leak_guard.sh
@@ -0,0 +1,95 @@
+#!/usr/bin/env bash
+set -euo pipefail
+
+# Test: scripts/guard/token-leak-guard.sh
+# Verifies that the token leak guard correctly detects and rejects
+# accidental secrets while allowing known-safe exclusions.
+#
+# Tests call the REAL guard script via REPO_ROOT override — no
+# shadow reimplementation of guard logic.
+
+SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
+REPO_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
+GUARD_SCRIPT="$REPO_ROOT/scripts/guard/token-leak-guard.sh"
+
+TEMP_DIR="$(mktemp -d)"
+trap 'rm -rf "$TEMP_DIR"' EXIT
+
+PASS=0
+FAIL=0
+
+report() {
+  if [ "$1" -eq 0 ]; then
+    PASS=$((PASS + 1))
+    echo "PASS: $2"
+  else
+    FAIL=$((FAIL + 1))
+    echo "FAIL: $2"
+  fi
+}
+
+# We need a git repository for git grep to work
+setup_git_repo() {
+  rm -rf "$TEMP_DIR/repo"
+  mkdir -p "$TEMP_DIR/repo"
+  cd "$TEMP_DIR/repo"
+  git init -q
+  git config user.email "test@test.com"
+  git config user.name "test"
+}
+
+# Case 1: Clean repo — no leaks
+setup_git_repo
+echo "Hello world" > file.txt
+git add . && git commit -q -m "clean"
+if REPO_ROOT="$TEMP_DIR/repo" bash "$GUARD_SCRIPT" >/dev/null 2>&1; then
+  report 0 "Clean repo passes"
+else
+  report 1 "Clean repo should pass"
+fi
+
+# Case 2: File with token= leak — must fail
+setup_git_repo
+echo "config token=abcdefghij1234567890" > config.txt
+git add . && git commit -q -m "with leak"
+if REPO_ROOT="$TEMP_DIR/repo" bash "$GUARD_SCRIPT" >/dev/null 2>&1; then
+  report 1 "File with token= leak should fail"
+else
+  report 0 "File with token= leak correctly detected"
+fi
+
+# Case 3: File with password= leak — must fail
+setup_git_repo
+echo "database password=supersecret123password" > db.txt
+git add . && git commit -q -m "with password"
+if REPO_ROOT="$TEMP_DIR/repo" bash "$GUARD_SCRIPT" >/dev/null 2>&1; then
+  report 1 "File with password= leak should fail"
+else
+  report 0 "File with password= leak correctly detected"
+fi
+
+# Case 4: File with Authorization Bearer leak — must fail
+setup_git_repo
+echo "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9" > api.txt
+git add . && git commit -q -m "with bearer"
+if REPO_ROOT="$TEMP_DIR/repo" bash "$GUARD_SCRIPT" >/dev/null 2>&1; then
+  report 1 "File with Bearer token leak should fail"
+else
+  report 0 "File with Bearer token leak correctly detected"
+fi
+
+# Case 5: Short token (9 chars, under the 10-char threshold) should NOT trigger
+setup_git_repo
+echo "token=abc12345x" > short.txt
+git add . && git commit -q -m "short token"
+if REPO_ROOT="$TEMP_DIR/repo" bash "$GUARD_SCRIPT" >/dev/null 2>&1; then
+  report 0 "Short token (9 chars, under threshold) correctly passes"
+else
+  report 1 "Short token (9 chars) should not trigger detection"
+fi
+
+echo ""
+echo "test_token_leak_guard: $PASS passed, $FAIL failed"
+if [ "$FAIL" -ne 0 ]; then
+  exit 1
+fi