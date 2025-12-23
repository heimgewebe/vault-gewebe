# Heimgewebe Labs - Implementation Plan (Pilot Phase)

This directory contains experimental artifacts for standardizing the Heimgewebe ecosystem.

**Status:** PROTOTYPE / PILOT
**Caution:** Do not run fleet-wide without testing on pilot repos first.

## 1. Overview

The goal is to reduce configuration drift by standardizing:
1.  **Context:** `.ai-context.yml` (Machine-readable Project Definition)
2.  **Standards:** `.editorconfig` (Code Style)
3.  **Tooling:** Centralized JSONL scripts in `tools`.

## 2. Usage

### A. Pilot Rollout Script

The `rollout.sh` script is designed to safely apply standards to a small set of pilot repositories first.

**Prerequisites:**
*   `gh` CLI installed & authenticated.
*   `jq` installed.
*   `GH_TOKEN` set.

**Target Repositories:**
By default, the script only targets **Pilot Repos** (e.g., `tools`, `mitschreiber`).
To run on other repos, create a `repos.txt` file in this directory with one repo slug per line (e.g., `heimgewebe/wgx`).

**Execution:**
```bash
# Check syntax first
bash -n rollout.sh

# Run Pilot
export GH_TOKEN=...
./rollout.sh
```

### B. Roadmap & Doku (Metarepo)

Apply the roadmap patch to the metarepo:
```bash
git apply patches/metarepo-roadmap.patch
```

### C. JSONL Tools Consolidation

We are moving to a "Canonical Tools" model.

1.  **Update Tools Repo:**
    ```bash
    cd tools
    git apply ../heimgewebe-labs/patches/tools-repo-canonical.patch
    ```

2.  **Update Consumers (Deprecation):**
    Apply deprecation headers to local scripts in other repos.
    ```bash
    cd aussensensor
    git apply ../heimgewebe-labs/patches/consumer-jsonl-deprecation.patch
    ```

## 3. Future Architecture (WGX-First)

*   **Long-term Goal:** Move health checks and standard enforcement into `wgx` (e.g., `wgx guard` task) rather than duplicating workflows in every repo.
*   **Current State:** These workflows serve as an interim solution to establish a baseline hygiene.

## 4. Verification

*   **Repo Slugs:** Ensure `repos.txt` (if used) contains valid GitHub slugs. Invalid slugs will cause the script to fail.
*   **YAML Validity:** The `.ai-context.yml` template is strict YAML. Do not introduce unstructured text headers.
