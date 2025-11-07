nice — here are repo-specific, drop-in templates tailored for hauski, hauski-audio, sichter, and semantah. They follow the same rollout pattern as before (idempotent, minimal changes) and you can pipe them through Jules exactly like the earlier runbook — just swap the per-repo ai-context.yml and (where noted) add an extra workflow or two.

⸻

hauski (TypeScript/Node, web + agents)

.ai-context.yml

AI Context Configuration for hauski
Version: 1.0

project:
  name: "hauski"
  description: "Conversational UI and agent gateway for the Heimgewebe."
  role: "User-facing assistant (web & API), orchestrating WGX/semantah."
  language: "TypeScript/Node (Next.js or Vite), Bash (ops)"

dependencies:
  internal:
    - semantah         # knowledge ingestion/search
    - heimlern         # scoring & policy feedback
    - wgx              # local workflows & orchestration
  external:
    - OpenAI/LLM APIs (abstracted)
    - Redis/Queue (optional)
    - Postgres (profile/session optional)

architecture:
  entry_points:
    - apps/web (SSR/SPA)
    - api/ (agent endpoints)
  key_modules:
    - agents/ (action & tool adapters)
    - workflows/ (high-level orchestration)
    - ui/ (chat + task panes)
  data_flow:
    input: "User prompts & events"
    processing: "Routing → agents → tools → semantah"
    output: "Answers, actions, traces"

conventions:
  branching: "main + feature/* + hotfix/*"
  commit_prefix: "hauski"
  ci_platform: "GitHub Actions"
  code_style:
    js_ts: "eslint + prettier"
    bash: "shellcheck"

documentation:
  architecture_decisions: "docs/adr/"
  runbook: "docs/runbook.md"
  api_reference: "docs/api.md"

extra workflow (recommended): .github/workflows/next-build-and-playwright.yml

name: Build & E2E (hauski)
on:
  push:
    paths:
      - "apps/web/**"
      - "package.json"
      - "pnpm-lock.yaml"
      - "packages/**"
  pull_request:
    paths:
      - "apps/web/**"
      - "package.json"
      - "pnpm-lock.yaml"
      - "packages/**"
jobs:
  build-and-e2e:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }

      - uses: pnpm/action-setup@v4
        with: { version: 9 }

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20.19.0'
          cache: 'pnpm'

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm -w run lint

      - name: Build
        run: pnpm -w run build

      - name: Install Playwright
        run: pnpm dlx playwright install --with-deps

      - name: Test (Playwright)
        run: pnpm -w run test:e2e


⸻

hauski-audio (Rust + audio DSP / streaming)

.ai-context.yml

AI Context Configuration for hauski-audio
Version: 1.0

project:
  name: "hauski-audio"
  description: "Low-latency audio pipeline for capture, VAD, streaming & transcription."
  role: "Audio I/O and pre-processing for hauski + agents."
  language: "Rust (core), Bash (ops), minimal Python (tools)"

dependencies:
  internal:
    - hauski      # consumer of transcripts/events
    - semantah    # index of transcripts (optional)
  external:
    - PortAudio / rodio (or OS-native)
    - Whisper/ASR service (pluggable)
    - WebRTC (optional)

architecture:
  entry_points:
    - crates/engine (pipeline core)
    - crates/vad, crates/rt (components)
  key_modules:
    - audio::capture
    - audio::codec
    - pipeline::segmenter
    - pipeline::transcriber (adapter)
  data_flow:
    input: "Raw mic frames"
    processing: "VAD → segment → encode → ASR"
    output: "Transcripts + timing → hauski/semantah"

conventions:
  branching: "main + feature/* + hotfix/*"
  commit_prefix: "hauski-audio"
  ci_platform: "GitHub Actions"
  code_style:
    rust: "rustfmt + clippy (deny warnings)"

documentation:
  architecture_decisions: "docs/adr/"
  runbook: "docs/runbook.md"

extra workflow (recommended): .github/workflows/rust-audio-ci.yml

name: Rust CI (hauski-audio)
on:
  push:
    paths:
      - "**/*.rs"
      - "Cargo.toml"
      - "Cargo.lock"
  pull_request:
    paths:
      - "**/*.rs"
      - "Cargo.toml"
      - "Cargo.lock"
jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      CARGO_TERM_COLOR: always
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: rustfmt, clippy
      - name: Build
        run: cargo build --workspace --locked
      - name: Clippy (deny warnings)
        run: cargo clippy --workspace --all-targets -- -D warnings
      - name: Test
        run: cargo test --workspace --locked -- --nocapture


⸻

sichter (review pipelines, gating, policies)

.ai-context.yml

AI Context Configuration for sichter
Version: 1.0

project:
  name: "sichter"
  description: "Policy & review pipeline: labels, ownership, status checks, and merge gates."
  role: "Repository hygiene + change governance across Heimgewebe."
  language: "TypeScript (probot/bot) or Bash + GitHub Actions"

dependencies:
  internal:
    - merges       # (optional) merge queues
    - heimlern     # policy scoring (optional)
  external:
    - GitHub API
    - Codeowners/Labeler

architecture:
  entry_points:
    - .github/workflows
    - bot/ (optional probot app)
  key_modules:
    - labeler
    - codeowners-enforcer
    - status-gates
  data_flow:
    input: "PR events (labels, reviews, checks)"
    processing: "Ownership rules → gates"
    output: "Status, labels, comments"

conventions:
  branching: "main + feature/* + hotfix/*"
  commit_prefix: "sichter"
  ci_platform: "GitHub Actions"

documentation:
  architecture_decisions: "docs/adr/"
  runbook: "docs/runbook.md"

extra workflows (recommended)

.github/workflows/labeler.yml

name: PR Labeler
on:
  pull_request_target:
    types: [opened, synchronize, reopened]
permissions:
  contents: read
  pull-requests: write
jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v5
        with:
          sync-labels: true

.github/workflows/required-status.yml

name: Required Checks Gate
on:
  pull_request:
    types: [opened, synchronize, reopened]
permissions:
  pull-requests: write
  statuses: read
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - name: Gate with required checks
        run: |
          set -euo pipefail
          # Example: enforce that repo-health & scripts-ci passed if they exist
          # (Non-blocking if workflows not present)
          echo "::notice::sichter gate active – configure required checks in branch protection."

If you want this to be enforcing, flip it into a required-contexts checker against the GitHub Status API and fail the job when required contexts are missing or failing.

⸻

semantah (knowledge ingestion, graph, search)

.ai-context.yml

AI Context Configuration for semantah
Version: 1.0

project:
  name: "semantah"
  description: "Knowledge graph ingestion + semantic search + retrieval for Heimgewebe."
  role: "Index & retrieval for hauski + agents. Exposes query APIs."
  language: "Python (ingestion/pipelines), Rust (optional high-perf components)"

dependencies:
  internal:
    - metarepo      # contracts + schemas for knowledge payloads
    - wgx           # extraction tools (AST/graph)
    - hauski        # serves queries
  external:
    - Vector DB (pgvector/SQLite+Fts5/Weaviate/FAISS)
    - Storage (S3/local)
    - LLM (optional for chunk/summary)

architecture:
  entry_points:
    - pipelines/ (ingest, chunk, embed)
    - api/ (query service)
  key_modules:
    - ingestion.contracts
    - chunkers, splitters
    - embeddings (adapters)
    - retriever
  data_flow:
    input: "Docs, code, ADRs, metrics"
    processing: "Normalize → chunk → embed → index"
    output: "Search, retrieve, cite"

conventions:
  branching: "main + feature/* + hotfix/*"
  commit_prefix: "semantah"
  ci_platform: "GitHub Actions"
  code_style:
    py: "ruff + black + pyright (type-check)"

documentation:
  architecture_decisions: "docs/adr/"
  runbook: "docs/runbook.md"
  api_reference: "docs/api.md"

extra workflow (recommended): .github/workflows/python-ingest-ci.yml

name: Python CI (semantah)
on:
  push:
    paths:
      - "pipelines/**"
      - "api/**"
      - "pyproject.toml"
      - "requirements*.txt"
  pull_request:
    paths:
      - "pipelines/**"
      - "api/**"
      - "pyproject.toml"
      - "requirements*.txt"
jobs:
  lint-test:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }

      - name: Install
        run: |
          python -m pip install --upgrade pip
          if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
          if [ -f pyproject.toml ]; then pip install -e .[dev] || pip install .; fi
          pip install ruff black pytest

      - name: Lint
        run: |
          ruff check .
          black --check .

      - name: Test
        run: pytest -q


⸻

How to roll out with Jules

Keep the same runbook as before. In your jules/templates/ai-context.yml, create four tailored copies named:

jules/templates/ai-context.hauski.yml
jules/templates/ai-context.hauski-audio.yml
jules/templates/ai-context.sichter.yml
jules/templates/ai-context.semantah.yml

Then tweak the run step for each repo like this (pseudo):

case "${repo##*/}" in
  hauski)          SRC="${JULES_RUN_ROOT}/${TPL}/ai-context.hauski.yml" ;;
  hauski-audio)    SRC="${JULES_RUN_ROOT}/${TPL}/ai-context.hauski-audio.yml" ;;
  sichter)         SRC="${JULES_RUN_ROOT}/${TPL}/ai-context.sichter.yml" ;;
  semantah)        SRC="${JULES_RUN_ROOT}/${TPL}/ai-context.semantah.yml" ;;
  *)               SRC="${JULES_RUN_ROOT}/${TPL}/ai-context.yml" ;; # generic
esac
[ -f ".ai-context.yml" ] || { cp -v "${SRC}" ".ai-context.yml" && sed -i "s|__REPO_NAME__|${repo##*/}|g" .ai-context.yml; }

Optionally also case-switch the extra workflows above (copy them in only for the matching repo). Everything else (editorconfig, branch cleanup, repo health, optional scripts CI) stays shared.

⸻

If you want, I can also prep repo-specific CODEOWNERS & labeler rules (e.g., ui/* → hauski-team, pipelines/* → semantah-team) and add a stricter “required contexts” gate for sichter that reads required contexts from a YAML file (so you can centrally change the policy without touching workflow logic).