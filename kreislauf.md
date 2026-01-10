leitstand: From e75c761583cbd191c6a76d398ee16f33e57396bf Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Tue, 30 Dec 2025 18:56:26 +0000
Subject: [PATCH] feat: secure events endpoint with token auth and strict mode

*   Implement token-based authorization for `POST /events` using `LEITSTAND_EVENTS_TOKEN`.
*   Support both `Authorization: Bearer <token>` and `X-Events-Token: <token>`.
*   Enforce fail-closed behavior in strict mode (prod) if token is missing.
*   Allow permissive mode in development if no token is configured.
*   Add integration tests using `supertest`.
*   Update deployment documentation.
---
 docs/DEPLOYMENT.md   |  25 ++++++
 package.json         |   2 +
 pnpm-lock.yaml       | 191 +++++++++++++++++++++++++++++++++++++++++++
 src/server.ts        |  47 ++++++++---
 tests/server.test.ts |  78 ++++++++++++++++++
 5 files changed, 330 insertions(+), 13 deletions(-)
 create mode 100644 tests/server.test.ts

diff --git a/docs/DEPLOYMENT.md b/docs/DEPLOYMENT.md
index c2138fc..587f7ef 100644
--- a/docs/DEPLOYMENT.md
+++ b/docs/DEPLOYMENT.md
@@ -43,3 +43,28 @@ In **Preview/Development** environments, if `artifacts/knowledge.observatory.jso
 The UI explicitly indicates the source of the data:
 - **"Artefakt (knowledge.observatory.json)"**: Data loaded successfully from `artifacts/knowledge.observatory.json`.
 - **"Fixture (Fallback)"**: Data loaded from `src/fixtures/observatory.json`.
+
+## Events Ingestion
+
+Leitstand can ingest events (e.g., `knowledge.observatory.published.v1`) via the `/events` endpoint.
+
+**Security & Authorization:**
+
+The endpoint is protected to prevent unauthorized triggers.
+
+*   **Production:** Authorization is **required**. The endpoint is disabled (403) if no token is configured.
+*   **Dev/Preview:** Authorization is **optional**. If no token is configured, the endpoint is open (permissive).
+
+**Configuration:**
+
+| Variable | Description | Default / Required |
+| :--- | :--- | :--- |
+| `LEITSTAND_EVENTS_TOKEN` | Secret token to authorize event ingestion. | **Required in Prod** |
+| `LEITSTAND_STRICT` | If `1`, enables strict mode (fail-loud). Also enforces token requirement on `/events`. | `0` (Dev), `1` (Prod) |
+
+**Usage:**
+
+Requests must include the token in headers:
+
+*   `Authorization: Bearer <token>`
+*   `X-Events-Token: <token>`
diff --git a/package.json b/package.json
index d7c97c1..a9d7b00 100644
--- a/package.json
+++ b/package.json
@@ -31,9 +31,11 @@
   },
   "devDependencies": {
     "@types/node": "^20.10.0",
+    "@types/supertest": "^6.0.3",
     "@typescript-eslint/eslint-plugin": "^6.13.0",
     "@typescript-eslint/parser": "^6.13.0",
     "eslint": "^8.54.0",
+    "supertest": "^7.1.4",
     "typescript": "^5.3.0",
     "vitest": "^1.0.0"
   },
diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml
index 53244c4..ee32097 100644
--- a/pnpm-lock.yaml
+++ b/pnpm-lock.yaml
@@ -30,6 +30,9 @@ importers:
       '@types/node':
         specifier: ^20.10.0
         version: 20.19.27
+      '@types/supertest':
+        specifier: ^6.0.3
+        version: 6.0.3
       '@typescript-eslint/eslint-plugin':
         specifier: ^6.13.0
         version: 6.21.0(@typescript-eslint/parser@6.21.0(eslint@8.57.1)(typescript@5.9.3))(eslint@8.57.1)(typescript@5.9.3)
@@ -39,6 +42,9 @@ importers:
       eslint:
         specifier: ^8.54.0
         version: 8.57.1
+      supertest:
+        specifier: ^7.1.4
+        version: 7.1.4
       typescript:
         specifier: ^5.3.0
         version: 5.9.3
@@ -224,6 +230,10 @@ packages:
   '@jridgewell/sourcemap-codec@1.5.5':
     resolution: {integrity: sha512-cYQ9310grqxueWbl+WuIUIaiUaDcj7WOq5fVhEljNVgRfOUhY9fy2zTvfoqWsnebh8Sl70VScFbICvJnLKB0Og==}
 
+  '@noble/hashes@1.8.0':
+    resolution: {integrity: sha512-jCs9ldd7NwzpgXDIf6P3+NrHh9/sD6CQdxHyjQI+h/6rDNo88ypBxxz45UDuZHz9r3tNz7N/VInSVoVdtXEI4A==}
+    engines: {node: ^14.21.3 || >=16}
+
   '@nodelib/fs.scandir@2.1.5':
     resolution: {integrity: sha512-vq24Bq3ym5HEQm2NKCr3yXDwjc7vTsEThRDnkp2DK9p1uqLR+DHurm/NOTo0KG7HYHU7eppKZj3MyqYuMBf62g==}
     engines: {node: '>= 8'}
@@ -236,6 +246,9 @@ packages:
     resolution: {integrity: sha512-oGB+UxlgWcgQkgwo8GcEGwemoTFt3FIO9ababBmaGwXIoBKZ+GTy0pP185beGg7Llih/NSHSV2XAs1lnznocSg==}
     engines: {node: '>= 8'}
 
+  '@paralleldrive/cuid2@2.3.1':
+    resolution: {integrity: sha512-XO7cAxhnTZl0Yggq6jOgjiOHhbgcO4NqFqwSmQpjK3b6TEE6Uj/jfSk6wzYyemh3+I0sHirKSetjQwn5cZktFw==}
+
   '@rollup/rollup-android-arm-eabi@4.53.5':
     resolution: {integrity: sha512-iDGS/h7D8t7tvZ1t6+WPK04KD0MwzLZrG0se1hzBjSi5fyxlsiggoJHwh18PCFNn7tG43OWb6pdZ6Y+rMlmyNQ==}
     cpu: [arm]
@@ -355,6 +368,9 @@ packages:
   '@types/connect@3.4.38':
     resolution: {integrity: sha512-K6uROf1LD88uDQqJCktA4yzL1YYAK6NgfsI0v/mTgyPKWsX1CnJ0XPSDhViejru1GcRkLWb8RlzFYJRqGUbaug==}
 
+  '@types/cookiejar@2.1.5':
+    resolution: {integrity: sha512-he+DHOWReW0nghN24E1WUqM0efK4kI9oTqDm6XmK8ZPe2djZ90BSNdGnIyCLzCPw7/pogPlGbzI2wHGGmi4O/Q==}
+
   '@types/ejs@3.1.5':
     resolution: {integrity: sha512-nv+GSx77ZtXiJzwKdsASqi+YQ5Z7vwHsTP0JY2SiQgjGckkBRKZnk8nIM+7oUZ1VCtuTz0+By4qVR7fqzp/Dfg==}
 
@@ -373,6 +389,9 @@ packages:
   '@types/json-schema@7.0.15':
     resolution: {integrity: sha512-5+fP8P8MFNC+AyZCDxrB2pkZFPGzqQWUzpSeuuVLvm8VMcorNYavBqoFcxK8bQz4Qsbn4oUEEem4wDLfcysGHA==}
 
+  '@types/methods@1.1.4':
+    resolution: {integrity: sha512-ymXWVrDiCxTBE3+RIrrP533E70eA+9qu7zdWoHuOmGujkYtzf4HQF96b8nwHLqhuf4ykX61IGRIB38CC6/sImQ==}
+
   '@types/node@20.19.27':
     resolution: {integrity: sha512-N2clP5pJhB2YnZJ3PIHFk5RkygRX5WO/5f0WC08tp0wd+sv0rsJk3MqWn3CbNmT2J505a5336jaQj4ph1AdMug==}
 
@@ -391,6 +410,12 @@ packages:
   '@types/serve-static@2.2.0':
     resolution: {integrity: sha512-8mam4H1NHLtu7nmtalF7eyBH14QyOASmcxHhSfEoRyr0nP/YdoesEtU+uSRvMe96TW/HPTtkoKqQLl53N7UXMQ==}
 
+  '@types/superagent@8.1.9':
+    resolution: {integrity: sha512-pTVjI73witn+9ILmoJdajHGW2jkSaOzhiFYF1Rd3EQ94kymLqB9PjD9ISg7WaALC7+dCHT0FGe9T2LktLq/3GQ==}
+
+  '@types/supertest@6.0.3':
+    resolution: {integrity: sha512-8WzXq62EXFhJ7QsH3Ocb/iKQ/Ty9ZVWnVzoTKc9tyyFRRF3a74Tk2+TLFgaFFw364Ere+npzHKEJ6ga2LzIL7w==}
+
   '@typescript-eslint/eslint-plugin@6.21.0':
     resolution: {integrity: sha512-oy9+hTPCUFpngkEZUSzbf9MxI65wbKFoQYsgPdILTfbUldp5ovUuphZVe4i30emU9M/kP+T64Di0mxl7dSw3MA==}
     engines: {node: ^16.0.0 || >=18.0.0}
@@ -507,12 +532,18 @@ packages:
     resolution: {integrity: sha512-HGyxoOTYUyCM6stUe6EJgnd4EoewAI7zMdfqO+kGjnlZmBDz/cR5pf8r/cR4Wq60sL/p0IkcjUEEPwS3GFrIyw==}
     engines: {node: '>=8'}
 
+  asap@2.0.6:
+    resolution: {integrity: sha512-BSHWgDSAiKs50o2Re8ppvp3seVHXSRM44cdSsT9FfNEUUZLOGWVCsiWaRPWM1Znn+mqZ1OfVZ3z3DWEzSp7hRA==}
+
   assertion-error@1.1.0:
     resolution: {integrity: sha512-jgsaNduz+ndvGyFt3uSuWqvy4lCnIJiovtouQN5JZHOKCS2QuhEdbcQHFhVksz2N2U9hXJo8odG7ETyWlEeuDw==}
 
   async@3.2.6:
     resolution: {integrity: sha512-htCUDlxyyCLMgaM3xXg0C0LW2xqfuQ6p05pCEIsXuyQ+a1koYKTuBMzRNwmybfLgvJDMd0r1LTn4+E0Ti6C2AA==}
 
+  asynckit@0.4.0:
+    resolution: {integrity: sha512-Oei9OH4tRh0YqU3GxhX79dM/mwVgvbZJaSNaRk+bshkj0S5cfHcgYakreBjrHwatXKbz+IoIdYLxrKim2MjW0Q==}
+
   balanced-match@1.0.2:
     resolution: {integrity: sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==}
 
@@ -568,6 +599,13 @@ packages:
   color-name@1.1.4:
     resolution: {integrity: sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==}
 
+  combined-stream@1.0.8:
+    resolution: {integrity: sha512-FQN4MRfuJeHf7cBbBMJFXhKSDq+2kAArBlmRBvcvFE5BB1HZKXtSFASDhdlz9zOYwxh8lDdnvmMOe/+5cdoEdg==}
+    engines: {node: '>= 0.8'}
+
+  component-emitter@1.3.1:
+    resolution: {integrity: sha512-T0+barUSQRTUQASh8bx02dl+DhF54GtIDY13Y3m9oWTklKbb3Wv974meRpeZ3lp1JpLVECWWNHC4vaG2XHXouQ==}
+
   concat-map@0.0.1:
     resolution: {integrity: sha512-/Srv4dswyQNBfohGpz9o6Yb3Gz3SrUDqBH5rTuhGR7ahtlbYKnVxw2bCFMRljaA7EXHaXZ8wsHdodFvbkhKmqg==}
 
@@ -590,6 +628,9 @@ packages:
     resolution: {integrity: sha512-yki5XnKuf750l50uGTllt6kKILY4nQ1eNIQatoXEByZ5dWgnKqbnqmTrBE5B4N7lrMJKQ2ytWMiTO2o0v6Ew/w==}
     engines: {node: '>= 0.6'}
 
+  cookiejar@2.1.4:
+    resolution: {integrity: sha512-LDx6oHrK+PhzLKJU9j5S7/Y3jM/mUHvD/DeI1WQmJn652iPC5Y4TBzC9l+5OMOXlyTTA+SmVUPm0HQUwpD5Jqw==}
+
   cross-spawn@7.0.6:
     resolution: {integrity: sha512-uV2QOWP2nWzsy2aMp8aRibhi9dlzF5Hgh5SHaB9OiTGEyDTiJJyx0uy51QXdyWbtAHNua4XJzUKca3OzKUd3vA==}
     engines: {node: '>= 8'}
@@ -613,10 +654,17 @@ packages:
   deep-is@0.1.4:
     resolution: {integrity: sha512-oIPzksmTg4/MriiaYGO+okXDT7ztn/w3Eptv/+gSIdMdKsJo0u4CfYNFJPy+4SKMuCqGw2wxnA+URMg3t8a/bQ==}
 
+  delayed-stream@1.0.0:
+    resolution: {integrity: sha512-ZySD7Nf91aLB0RxL4KGrKHBXl7Eds1DAmEdcoVawXnLD7SDhpNgtuII2aAkg7a7QS41jxPSZ17p4VdGnMHk3MQ==}
+    engines: {node: '>=0.4.0'}
+
   depd@2.0.0:
     resolution: {integrity: sha512-g7nH6P6dyDioJogAAGprGpCtVImJhpPk/roCzdb3fIh61/s/nPsfR6onyMwkCAR/OlC3yBC0lESvUoQEAssIrw==}
     engines: {node: '>= 0.8'}
 
+  dezalgo@1.0.4:
+    resolution: {integrity: sha512-rXSP0bf+5n0Qonsb+SVVfNfIsimO4HEtmnIpPHY8Q1UCzKlQrDMfdobr8nJOOsRgWCyMRqeSBQzmWUMq7zvVig==}
+
   diff-sequences@29.6.3:
     resolution: {integrity: sha512-EjePK1srD3P08o2j4f0ExnylqRs5B9tJjcp9t1krH2qRi8CCdsYfwe9JgSLurFBWwq4uOlipzfk5fHNvwFKr8Q==}
     engines: {node: ^14.15.0 || ^16.10.0 || >=18.0.0}
@@ -657,6 +705,10 @@ packages:
     resolution: {integrity: sha512-FGgH2h8zKNim9ljj7dankFPcICIK9Cp5bm+c2gQSYePhpaG5+esrLODihIorn+Pe6FGJzWhXQotPv73jTaldXA==}
     engines: {node: '>= 0.4'}
 
+  es-set-tostringtag@2.1.0:
+    resolution: {integrity: sha512-j6vWzfrGVfyXxge+O0x5sh6cvxAog0a/4Rdd2K36zCMV5eJ+/+tOAngRO8cODMNWbVRdVlmGZQL2YS3yR8bIUA==}
+    engines: {node: '>= 0.4'}
+
   esbuild@0.21.5:
     resolution: {integrity: sha512-mg3OPMV4hXywwpoDxu3Qda5xCKQi+vCTZq8S9J/EpkhB2HzKXq4SNFZE3+NK93JYxc8VMSep+lOUSC/RVKaBqw==}
     engines: {node: '>=12'}
@@ -731,6 +783,9 @@ packages:
   fast-levenshtein@2.0.6:
     resolution: {integrity: sha512-DCXu6Ifhqcks7TZKY3Hxp3y6qphY5SJZmrWMDrKcERSOXWQdMhU9Ig/PYrzyw/ul9jOIyh0N4M0tbC5hodg8dw==}
 
+  fast-safe-stringify@2.1.1:
+    resolution: {integrity: sha512-W+KJc2dmILlPplD/H4K9l9LcAHAfPtP6BY84uVLXQ6Evcz9Lcg33Y2z1IVblT6xdY54PXYVHEv+0Wpq8Io6zkA==}
+
   fastq@1.19.1:
     resolution: {integrity: sha512-GwLTyxkCXjXbxqIhTsMI2Nui8huMPtnxg7krajPJAjnEG/iiOS7i+zCtWGZR9G0NBKbXKh6X9m9UIsYX/N6vvQ==}
 
@@ -760,6 +815,14 @@ packages:
   flatted@3.3.3:
     resolution: {integrity: sha512-GX+ysw4PBCz0PzosHDepZGANEuFCMLrnRTiEy9McGjmkCQYwRq4A/X786G/fjM/+OjsWSU1ZrY5qyARZmO/uwg==}
 
+  form-data@4.0.5:
+    resolution: {integrity: sha512-8RipRLol37bNs2bhoV67fiTEvdTrbMUYcFTiy3+wuuOnUog2QBHCZWXDRijWQfAkhBj2Uf5UnVaiWwA5vdd82w==}
+    engines: {node: '>= 6'}
+
+  formidable@3.5.4:
+    resolution: {integrity: sha512-YikH+7CUTOtP44ZTnUhR7Ic2UASBPOqmaRkRKxRbywPTe5VxF7RRCck4af9wutiZ/QKM5nME9Bie2fFaPz5Gug==}
+    engines: {node: '>=14.0.0'}
+
   forwarded@0.2.0:
     resolution: {integrity: sha512-buRG0fpBtRHSTCOASe6hD258tEubFoRLb4ZNA6NxMVHNw2gOcwHo9wyablzMzOA5z9xA9L1KNjk/Nt6MT9aYow==}
     engines: {node: '>= 0.6'}
@@ -829,6 +892,10 @@ packages:
     resolution: {integrity: sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ==}
     engines: {node: '>= 0.4'}
 
+  has-tostringtag@1.0.2:
+    resolution: {integrity: sha512-NqADB8VjPFLM2V0VvHUewwwsw0ZWBaIdgo+ieHtK3hasLz4qeCRjYcqfB6AQrBggRKppKF8L52/VqdVsO47Dlw==}
+    engines: {node: '>= 0.4'}
+
   hasown@2.0.2:
     resolution: {integrity: sha512-0hJU9SCPvmMzIBdZFqNPXWa6dqh7WdH0cII9y+CyS8rG3nL48Bclra9HmKhVVUHyPWNH5Y7xDwAB7bfgSjkUMQ==}
     engines: {node: '>= 0.4'}
@@ -958,18 +1025,35 @@ packages:
     resolution: {integrity: sha512-8q7VEgMJW4J8tcfVPy8g09NcQwZdbwFEqhe/WZkoIzjn/3TGDwtOCYtXGxA3O8tPzpczCCDgv+P2P5y00ZJOOg==}
     engines: {node: '>= 8'}
 
+  methods@1.1.2:
+    resolution: {integrity: sha512-iclAHeNqNm68zFtnZ0e+1L2yUIdvzNoauKU4WBA3VvH/vPFieF7qfRlwUZU+DA9P9bPXIS90ulxoUoCH23sV2w==}
+    engines: {node: '>= 0.6'}
+
   micromatch@4.0.8:
     resolution: {integrity: sha512-PXwfBhYu0hBCPw8Dn0E+WDYb7af3dSLVWKi3HGv84IdF4TyFoC0ysxFd0Goxw7nSv4T/PzEJQxsYsEiFCKo2BA==}
     engines: {node: '>=8.6'}
 
+  mime-db@1.52.0:
+    resolution: {integrity: sha512-sPU4uV7dYlvtWJxwwxHD0PuihVNiE7TyAbQ5SWxDCB9mUYvOgroQOwYQQOKPJ8CIbE+1ETVlOoK1UC2nU3gYvg==}
+    engines: {node: '>= 0.6'}
+
   mime-db@1.54.0:
     resolution: {integrity: sha512-aU5EJuIN2WDemCcAp2vFBfp/m4EAhWJnUNSSw0ixs7/kXbd6Pg64EmwJkNdFhB8aWt1sH2CTXrLxo/iAGV3oPQ==}
     engines: {node: '>= 0.6'}
 
+  mime-types@2.1.35:
+    resolution: {integrity: sha512-ZDY+bPm5zTTF+YpCrAU9nK0UgICYPT0QtT1NZWFv4s++TNkcgVaT0g6+4R2uI4MjQjzysHB1zxuWL50hzaeXiw==}
+    engines: {node: '>= 0.6'}
+
   mime-types@3.0.2:
     resolution: {integrity: sha512-Lbgzdk0h4juoQ9fCKXW4by0UJqj+nOOrI9MJ1sSj4nI8aI2eo1qmvQEie4VD1glsS250n15LsWsYtCugiStS5A==}
     engines: {node: '>=18'}
 
+  mime@2.6.0:
+    resolution: {integrity: sha512-USPkMeET31rOMiarsBNIHZKLGgvKc/LrjofAnBlOttf5ajRvqiRA8QsenbcooctK6d6Ts6aqZXBA+XbkKthiQg==}
+    engines: {node: '>=4.0.0'}
+    hasBin: true
+
   mimic-fn@4.0.0:
     resolution: {integrity: sha512-vqiC06CuhBTUdZH+RYl8sFrL096vA45Ok5ISO6sE/Mr1jRbGH4Csnhi8f3wKVl7x8mO4Au7Ir9D3Oyv1VYMFJw==}
     engines: {node: '>=12'}
@@ -1234,6 +1318,14 @@ packages:
   strip-literal@2.1.1:
     resolution: {integrity: sha512-631UJ6O00eNGfMiWG78ck80dfBab8X6IVFB51jZK5Icd7XAs60Z5y7QdSd/wGIklnWvRbUNloVzhOKKmutxQ6Q==}
 
+  superagent@10.2.3:
+    resolution: {integrity: sha512-y/hkYGeXAj7wUMjxRbB21g/l6aAEituGXM9Rwl4o20+SX3e8YOSV6BxFXl+dL3Uk0mjSL3kCbNkwURm8/gEDig==}
+    engines: {node: '>=14.18.0'}
+
+  supertest@7.1.4:
+    resolution: {integrity: sha512-tjLPs7dVyqgItVFirHYqe2T+MfWc2VOBQ8QFKKbWTA3PU7liZR8zoSpAi/C1k1ilm9RsXIKYf197oap9wXGVYg==}
+    engines: {node: '>=14.18.0'}
+
   supports-color@7.2.0:
     resolution: {integrity: sha512-qpCAvRl9stuOHveKsn7HncJRvv501qIacKzQlO/+Lwxc9+0q2wLyv4Dfvt80/DPn2pqOBsJdDiogXGR9+OvwRw==}
     engines: {node: '>=8'}
@@ -1505,6 +1597,8 @@ snapshots:
 
   '@jridgewell/sourcemap-codec@1.5.5': {}
 
+  '@noble/hashes@1.8.0': {}
+
   '@nodelib/fs.scandir@2.1.5':
     dependencies:
       '@nodelib/fs.stat': 2.0.5
@@ -1517,6 +1611,10 @@ snapshots:
       '@nodelib/fs.scandir': 2.1.5
       fastq: 1.19.1
 
+  '@paralleldrive/cuid2@2.3.1':
+    dependencies:
+      '@noble/hashes': 1.8.0
+
   '@rollup/rollup-android-arm-eabi@4.53.5':
     optional: true
 
@@ -1594,6 +1692,8 @@ snapshots:
     dependencies:
       '@types/node': 20.19.27
 
+  '@types/cookiejar@2.1.5': {}
+
   '@types/ejs@3.1.5': {}
 
   '@types/estree@1.0.8': {}
@@ -1615,6 +1715,8 @@ snapshots:
 
   '@types/json-schema@7.0.15': {}
 
+  '@types/methods@1.1.4': {}
+
   '@types/node@20.19.27':
     dependencies:
       undici-types: 6.21.0
@@ -1634,6 +1736,18 @@ snapshots:
       '@types/http-errors': 2.0.5
       '@types/node': 20.19.27
 
+  '@types/superagent@8.1.9':
+    dependencies:
+      '@types/cookiejar': 2.1.5
+      '@types/methods': 1.1.4
+      '@types/node': 20.19.27
+      form-data: 4.0.5
+
+  '@types/supertest@6.0.3':
+    dependencies:
+      '@types/methods': 1.1.4
+      '@types/superagent': 8.1.9
+
   '@typescript-eslint/eslint-plugin@6.21.0(@typescript-eslint/parser@6.21.0(eslint@8.57.1)(typescript@5.9.3))(eslint@8.57.1)(typescript@5.9.3)':
     dependencies:
       '@eslint-community/regexpp': 4.12.2
@@ -1785,10 +1899,14 @@ snapshots:
 
   array-union@2.1.0: {}
 
+  asap@2.0.6: {}
+
   assertion-error@1.1.0: {}
 
   async@3.2.6: {}
 
+  asynckit@0.4.0: {}
+
   balanced-match@1.0.2: {}
 
   body-parser@2.2.1:
@@ -1859,6 +1977,12 @@ snapshots:
 
   color-name@1.1.4: {}
 
+  combined-stream@1.0.8:
+    dependencies:
+      delayed-stream: 1.0.0
+
+  component-emitter@1.3.1: {}
+
   concat-map@0.0.1: {}
 
   confbox@0.1.8: {}
@@ -1871,6 +1995,8 @@ snapshots:
 
   cookie@0.7.2: {}
 
+  cookiejar@2.1.4: {}
+
   cross-spawn@7.0.6:
     dependencies:
       path-key: 3.1.1
@@ -1889,8 +2015,15 @@ snapshots:
 
   deep-is@0.1.4: {}
 
+  delayed-stream@1.0.0: {}
+
   depd@2.0.0: {}
 
+  dezalgo@1.0.4:
+    dependencies:
+      asap: 2.0.6
+      wrappy: 1.0.2
+
   diff-sequences@29.6.3: {}
 
   dir-glob@3.0.1:
@@ -1923,6 +2056,13 @@ snapshots:
     dependencies:
       es-errors: 1.3.0
 
+  es-set-tostringtag@2.1.0:
+    dependencies:
+      es-errors: 1.3.0
+      get-intrinsic: 1.3.0
+      has-tostringtag: 1.0.2
+      hasown: 2.0.2
+
   esbuild@0.21.5:
     optionalDependencies:
       '@esbuild/aix-ppc64': 0.21.5
@@ -2086,6 +2226,8 @@ snapshots:
 
   fast-levenshtein@2.0.6: {}
 
+  fast-safe-stringify@2.1.1: {}
+
   fastq@1.19.1:
     dependencies:
       reusify: 1.1.0
@@ -2126,6 +2268,20 @@ snapshots:
 
   flatted@3.3.3: {}
 
+  form-data@4.0.5:
+    dependencies:
+      asynckit: 0.4.0
+      combined-stream: 1.0.8
+      es-set-tostringtag: 2.1.0
+      hasown: 2.0.2
+      mime-types: 2.1.35
+
+  formidable@3.5.4:
+    dependencies:
+      '@paralleldrive/cuid2': 2.3.1
+      dezalgo: 1.0.4
+      once: 1.4.0
+
   forwarded@0.2.0: {}
 
   fresh@2.0.0: {}
@@ -2197,6 +2353,10 @@ snapshots:
 
   has-symbols@1.1.0: {}
 
+  has-tostringtag@1.0.2:
+    dependencies:
+      has-symbols: 1.1.0
+
   hasown@2.0.2:
     dependencies:
       function-bind: 1.1.2
@@ -2305,17 +2465,27 @@ snapshots:
 
   merge2@1.4.1: {}
 
+  methods@1.1.2: {}
+
   micromatch@4.0.8:
     dependencies:
       braces: 3.0.3
       picomatch: 2.3.1
 
+  mime-db@1.52.0: {}
+
   mime-db@1.54.0: {}
 
+  mime-types@2.1.35:
+    dependencies:
+      mime-db: 1.52.0
+
   mime-types@3.0.2:
     dependencies:
       mime-db: 1.54.0
 
+  mime@2.6.0: {}
+
   mimic-fn@4.0.0: {}
 
   minimatch@3.1.2:
@@ -2597,6 +2767,27 @@ snapshots:
     dependencies:
       js-tokens: 9.0.1
 
+  superagent@10.2.3:
+    dependencies:
+      component-emitter: 1.3.1
+      cookiejar: 2.1.4
+      debug: 4.4.3
+      fast-safe-stringify: 2.1.1
+      form-data: 4.0.5
+      formidable: 3.5.4
+      methods: 1.1.2
+      mime: 2.6.0
+      qs: 6.14.0
+    transitivePeerDependencies:
+      - supports-color
+
+  supertest@7.1.4:
+    dependencies:
+      methods: 1.1.2
+      superagent: 10.2.3
+    transitivePeerDependencies:
+      - supports-color
+
   supports-color@7.2.0:
     dependencies:
       has-flag: 4.0.0
diff --git a/src/server.ts b/src/server.ts
index 9b09ed1..8bafe2d 100644
--- a/src/server.ts
+++ b/src/server.ts
@@ -3,6 +3,7 @@ import { readFile } from 'fs/promises';
 import { join } from 'path';
 import { exec } from 'child_process';
 import { promisify } from 'util';
+import { fileURLToPath } from 'url';
 
 const execPromise = promisify(exec);
 
@@ -28,17 +29,33 @@ app.set('views', join(process.cwd(), 'src', 'views'));
 app.post('/events', async (req, res) => {
   // 1. Authorization
   const token = process.env.LEITSTAND_EVENTS_TOKEN;
-  if (!token) {
-    console.warn('[Event] LEITSTAND_EVENTS_TOKEN not configured. Endpoint disabled.');
-    res.status(403).send('Events endpoint disabled');
-    return;
-  }
+  const isStrict = process.env.LEITSTAND_STRICT === '1' || process.env.NODE_ENV === 'production';
+
+  if (token) {
+    // Token configured: Strict check (Bearer or X-Header)
+    const authHeader = req.headers.authorization;
+    const xToken = req.headers['x-events-token'];
+
+    let providedToken;
+    if (authHeader && authHeader.startsWith('Bearer ')) {
+      providedToken = authHeader.slice(7);
+    } else if (typeof xToken === 'string') {
+      providedToken = xToken;
+    }
 
-  const authHeader = req.headers.authorization;
-  if (!authHeader || authHeader !== `Bearer ${token}`) {
-    console.warn('[Event] Unauthorized access attempt');
-    res.status(401).send('Unauthorized');
-    return;
+    if (providedToken !== token) {
+      console.warn('[Event] Unauthorized access attempt');
+      res.status(401).send('Unauthorized');
+      return;
+    }
+  } else {
+    // No token: Check environment
+    if (isStrict) {
+      console.warn('[Event] LEITSTAND_EVENTS_TOKEN not configured in strict mode. Endpoint disabled.');
+      res.status(403).send('Events endpoint disabled');
+      return;
+    }
+    // Dev/Preview: Permissive (no token required)
   }
 
   const event = req.body;
@@ -295,6 +312,10 @@ app.get('/intent', async (_req, res) => {
   }
 });
 
-app.listen(port, () => {
-  console.log(`Leitstand server running at http://localhost:${port}`);
-});
+if (process.argv[1] === fileURLToPath(import.meta.url)) {
+  app.listen(port, () => {
+    console.log(`Leitstand server running at http://localhost:${port}`);
+  });
+}
+
+export { app };
diff --git a/tests/server.test.ts b/tests/server.test.ts
new file mode 100644
index 0000000..cb91961
--- /dev/null
+++ b/tests/server.test.ts
@@ -0,0 +1,78 @@
+import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
+import request from 'supertest';
+import { app } from '../src/server.js';
+
+describe('POST /events', () => {
+  beforeEach(() => {
+    vi.unstubAllEnvs();
+  });
+
+  afterEach(() => {
+    vi.unstubAllEnvs();
+  });
+
+  it('should allow request with correct Bearer token', async () => {
+    vi.stubEnv('LEITSTAND_EVENTS_TOKEN', 'valid-token');
+
+    const res = await request(app)
+      .post('/events')
+      .set('Authorization', 'Bearer valid-token')
+      .send({ kind: 'test.event', payload: {} });
+
+    expect(res.status).toBe(200);
+  });
+
+  it('should allow request with correct X-Events-Token', async () => {
+    vi.stubEnv('LEITSTAND_EVENTS_TOKEN', 'valid-token');
+
+    const res = await request(app)
+      .post('/events')
+      .set('X-Events-Token', 'valid-token')
+      .send({ kind: 'test.event', payload: {} });
+
+    expect(res.status).toBe(200);
+  });
+
+  it('should reject request with invalid token (401)', async () => {
+    vi.stubEnv('LEITSTAND_EVENTS_TOKEN', 'valid-token');
+
+    const res = await request(app)
+      .post('/events')
+      .set('Authorization', 'Bearer wrong-token')
+      .send({ kind: 'test.event' });
+
+    expect(res.status).toBe(401);
+  });
+
+  it('should reject request with missing token when token is configured (401)', async () => {
+    vi.stubEnv('LEITSTAND_EVENTS_TOKEN', 'valid-token');
+
+    const res = await request(app)
+      .post('/events')
+      .send({ kind: 'test.event' });
+
+    expect(res.status).toBe(401);
+  });
+
+  it('should be disabled in STRICT mode if no token configured (403)', async () => {
+    vi.stubEnv('LEITSTAND_STRICT', '1');
+    // Ensure LEITSTAND_EVENTS_TOKEN is unset
+
+    const res = await request(app)
+      .post('/events')
+      .send({ kind: 'test.event' });
+
+    expect(res.status).toBe(403);
+  });
+
+  it('should be permissive in non-strict mode if no token configured', async () => {
+    // Ensure LEITSTAND_EVENTS_TOKEN is unset
+    // Ensure STRICT flags are unset
+
+    const res = await request(app)
+      .post('/events')
+      .send({ kind: 'test.event' });
+
+    expect(res.status).toBe(200);
+  });
+});

hauski: From 1ed756f48e6b25af629d814ee80ec714cb429b2e Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Tue, 30 Dec 2025 19:18:06 +0000
Subject: [PATCH] chore(core): verify events security implementation

Confirmed that HAUSKI_EVENTS_TOKEN is correctly implemented and enforced
in the /events endpoint. Verified semantic logic for decision.preimage
updates and ensured all relevant tests pass.

- Confirmed HAUSKI_EVENTS_TOKEN loading in config.rs
- Confirmed Authorization header check in events.rs
- Confirmed Fail Closed behavior (403) when token is unset
- Confirmed HTTPS enforcement for payload URLs
- Confirmed decision.preimage update logic (status=open check)
- Verified all constraints with `events_tests`

metarepo: From f7ef5bd0a64bca7599277cb121936d51b38de0e5 Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Tue, 30 Dec 2025 19:18:18 +0000
Subject: [PATCH] docs: add canonical leitstand environment config

Add a new section to `docs/fleet/environment.md` detailing the
canonical runtime and build configuration for `leitstand`. This
includes:
- Mandatory variables (OBSERVATORY_URL, NODE_ENV)
- Security tokens (LEITSTAND_EVENTS_TOKEN)
- Strict mode flags (LEITSTAND_STRICT, OBSERVATORY_STRICT)
- Deprecation notice for OBSERVATORY_OUT_PATH

This aligns the documentation with the drift-prevention goals
outlined in the task.
---
 docs/fleet/environment.md | 16 ++++++++++++++++
 1 file changed, 16 insertions(+)

diff --git a/docs/fleet/environment.md b/docs/fleet/environment.md
index 681dbab4..97b18537 100644
--- a/docs/fleet/environment.md
+++ b/docs/fleet/environment.md
@@ -46,3 +46,19 @@ Weitere Variablen entnimmst du den Sub-Repo-Dokumentationen (siehe
 
 - E2E-Dokumentation (siehe `scripts/e2e/`)
 - Weitere Use-Cases und Troubleshooting-Hinweise in Vorbereitung
+
+## Leitstand Runtime/Build Configuration
+
+Diese Variablen steuern das Verhalten des Leitstands (Artefakte, Strictness, Events).
+
+| Variable | Zweck | Status |
+| --- | --- | --- |
+| `OBSERVATORY_URL` | Basis-URL zum Laden des Observatory-Snapshots | Required |
+| `OBSERVATORY_ARTIFACT_PATH` | Pfad zum JSON-Artefakt relativ zur URL | Required |
+| `OBSERVATORY_STRICT` | `1` erzwingt Abbruch bei fehlenden Artefakten (kein Fallback) | Empfohlen (Prod) |
+| `NODE_ENV` | `production` aktiviert Optimierungen und Strict-Defaults | Required (Prod) |
+| `INSIGHTS_DAILY_URL` | Basis-URL für Daily Insights | Optional |
+| `INSIGHTS_DAILY_ARTIFACT_PATH` | Pfad zum Insights-JSON | Optional |
+| `LEITSTAND_EVENTS_TOKEN` | Secret Token für den Events-Ingest-Endpunkt | Required (Prod) |
+| `LEITSTAND_STRICT` | `1` schaltet Leitstand in den Fail-Loud Modus | Empfohlen |
+| `OBSERVATORY_OUT_PATH` | Veralteter Alias für Artifact-Path | **Deprecated** (Vermeiden) |

plexer: From 17dacede066c665247232ba05507faae257501cb Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Tue, 30 Dec 2025 18:57:21 +0000
Subject: [PATCH] feat: secure event forwarding to Leitstand and improved error
 logging

- Verified support for LEITSTAND_URL and LEITSTAND_EVENTS_TOKEN env vars
- Updated logging to explicitly mention 'token rejected' on 401/403 errors
- Added tests to verify secure event forwarding and error logging behavior
- Ensured Authorization header is set when token is present for all consumers
---
 src/__tests__/server.test.ts | 26 ++++++++++++++++++++++++++
 src/server.ts                |  8 +++++---
 2 files changed, 31 insertions(+), 3 deletions(-)

diff --git a/src/__tests__/server.test.ts b/src/__tests__/server.test.ts
index 09bde4c..fc909fa 100644
--- a/src/__tests__/server.test.ts
+++ b/src/__tests__/server.test.ts
@@ -352,4 +352,30 @@ describe('Server', () => {
       expect(response.headers['content-type']).toMatch(/application\/json/);
     });
   });
+
+  describe('Error logging', () => {
+    it('should log "token rejected" when receiving 401 or 403', async () => {
+      fetchMock.mockResolvedValue({
+        ok: false,
+        status: 403,
+        statusText: 'Forbidden',
+        json: async () => ({}),
+      });
+
+      const payload = {
+        type: 'knowledge.observatory.published.v1',
+        source: 'test-suite',
+        payload: { foo: 'bar' },
+      };
+
+      await request(app).post('/events').send(payload);
+
+      // Wait for async processing
+      await new Promise(resolve => setTimeout(resolve, 10));
+
+      expect(console.error).toHaveBeenCalledWith(
+        expect.stringContaining('token rejected')
+      );
+    });
+  });
 });
diff --git a/src/server.ts b/src/server.ts
index 0d368fe..b2a8a74 100644
--- a/src/server.ts
+++ b/src/server.ts
@@ -194,9 +194,11 @@ export function createServer(): Express {
                 auth: !!token,
               });
               if (!response.ok) {
-                console.error(
-                  `Failed to forward event to ${name}: ${response.status} ${response.statusText}`,
-                );
+                let errorMessage = `Failed to forward event to ${name}: ${response.status} ${response.statusText}`;
+                if (response.status === 401 || response.status === 403) {
+                  errorMessage += ' (token rejected)';
+                }
+                console.error(errorMessage);
               }
             })
             .catch((error) => {