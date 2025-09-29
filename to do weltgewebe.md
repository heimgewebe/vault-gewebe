Alles klar. Hier sind präzise Codex-Anweisungen in Blöcken für das weltgewebe-Repo, abgeleitet aus Stärken von wgx (CLI-Disziplin, Linting/CI) und der eigenen Zielstruktur/Techstack (damit’s wirklich passt). Ich verweise auf die vorhandene Repo-Struktur und Tech-Docs, damit Codex korrekt einordnet (Ordner/Dateien etc.).

⸻

Block 0 — Kontextanker (nur für Codex)
	•	Halte dich an die dokumentierte Zielstruktur des Repos (apps/web, apps/api, infra, ci, docs, …). Quelle: Architekturstruktur des Weltgewebes (Ordner, Pfade, Dienste).
	•	Backend: Rust/Axum, Frontend: SvelteKit, Infra via Compose-Profile, Monitoring/Prometheus vorgesehen; Events via NATS/Outbox.

⸻

Block 1 — 

Block 2 — Policies/Configs auslagern

Ziel: Governance-, Datenschutz- und Betriebsparameter versionieren (Docs sagen Privacy-by-Design, RoN-Anonymisierung, Timer 7/7/84 etc.).
	1.	Lege an:

	•	configs/app.defaults.yml (z. B. fade_days: 7, ron_days: 84, anonymize_opt_in: true, delegation_expire_days: 28)
	•	policies/limits.yml (Rate-Limits, Payload-Größen)
	•	policies/security.yml (CSP-Profile, erlaubte Origins)
	•	policies/retention.yml (Retention/Forget-Pfade konsistent zu DSGVO-Zielen). (Techstack sieht Data-Lifecycle/Forget-Pipeline vor.)

	2.	API-Start liest configs/app.defaults.yml; HA_* ENV overridet.

⸻

Block 3 — Schreib- & Lint-Disziplin wie wgx

Ziel: Sauberes Repo mit einheitlicher Sprache/Formatierung (wgx macht das vor: .editorconfig, .markdownlint.jsonc, Vale-Regel).
	1.	Kopiere/erzeuge:

	•	.editorconfig (UTF-8, LF, spaces, md: keep trailing whitespace=false) nach Root (angepasst).
	•	.markdownlint.jsonc → Regeln wie bei wgx (Headings, line length, code-fences). (wgx führt eine solche Datei; übernehmen mit Projekt-Sinnmaß.)
	•	.vale/ + .vale.ini → Stilprofil „English-only in code & docs“ (wgx hat wgxlint-Style als Beispiel).

	2.	README/Docs: Einheitlich Englisch in Entwickler-Docs (User-Facing Texte können deutsch bleiben, aber Code/Docs standardisiert). (Weltgewebe Docs existieren bereits; ergänze Hinweis in CONTRIBUTING.)

⸻

Block 4 — wgx-Integration (Contract + Tasks)

Ziel: Weltgewebe nutzt zentrale CLI statt lokaler Script-Wildwuchs. (wgx liefert zentrale Kommandos mit cmd/*.bash, modules/*.bash, Tests via Bats.)
	1.	Datei: .wgx/profile.yml

wgx:
  apiVersion: v1
  requiredWgx: "^2.0"
  repoKind: "app"
  tasks:
    dev: ["infra:up:core", "web:dev", "api:dev"]
    test: ["api:test", "web:test"]
    lint: ["lint:md", "lint:vale", "lint:sh"]
  env:
    BASE_URL: "http://localhost:8787"

	2.	Datei: .wgx/tasks.yml (nur Adapter, Logik bleibt bei wgx)

lint:md: { run: "npx markdownlint-cli2 '**/*.md'" }
lint:vale: { run: "vale docs/ README.md" }
lint:sh: { run: "shfmt -d . && shellcheck $(git ls-files '*.sh' '*.bash' || true)" }
api:test: { run: "cargo test --manifest-path apps/api/Cargo.toml" }
web:test: { run: "pnpm -C apps/web test" }
infra:up:core: { run: "docker compose -f infra/compose/compose.core.yml up -d --build" }
web:dev: { run: "pnpm -C apps/web dev" }
api:dev: { run: "cargo run --manifest-path apps/api/Cargo.toml" }

	3.	Dokumentation in docs/beitrag.md ergänzen: „Nutze wgx-Befehle; keine lokalen Alias-Skripte.“ (wgx trennt cmd/modules + Tests sauber.)

⸻

Block 5 — CI-Workflows (aus wgx abgeleitete Strenge)

Ziel: Konsistente Gates: Lint, Build, Tests, Smoke. (wgx hat mehrere Workflows inkl. compat-on-demand.)
	1.	ci/github/workflows/web.yml
	•	Jobs: node setup, pnpm install, wgx lint (md/vale/sh), pnpm build, pnpm test.
	2.	ci/github/workflows/api.yml
	•	Jobs: toolchain-cache, cargo fmt -- --check, cargo clippy -D warnings, cargo test, Start API in Hintergrund + k6 Smoke gegen /health/*.
	•	k6 via docker run grafana/k6 run -e BASE_URL=http://host.docker.internal:8787 apps/api/tests/smoke_k6.js.
	3.	ci/github/workflows/infra.yml
	•	Compose core up (db, caddy, api), run readiness checks, then tear-down. Compose-Profile existieren im Zielmodell.
	4.	Optional compat.yml
	•	Fixture-Tests für Event-Schemas/DB-Migrations (golden files) → verhindert Breaking Changes (analog „compat“-Gedanke in wgx).

⸻

Block 6 — CONTRIBUTING (klar & streng)

Ziel: Entwicklerleitplanken (wie bei wgx).
	1.	Datei: docs/beitrag.md (oder CONTRIBUTING.md im Root) erweitern um:
	•	„Use English in code & docs.“
	•	„Run wgx lint and wgx test before PR.“
	•	Commit-Konvention (Conventional Commits), PR-Template, Review-Checklist (Lint/Tests/Docs/Tickets).
	2.	Verweise auf vorhandene Projekt-Dokumente (Zusammenstellung, Inhalt, Techstack) für Domänenverständnis.

⸻

Block 7 — Dev-Bootstrap (Onboarding in 1 Befehl)

Ziel: „Dev up in 5-10 min“.
	1.	Datei: scripts/bootstrap.sh
	•	prüft: pnpm, rustup, docker, shfmt, shellcheck, vale, markdownlint-cli2
	•	installiert fehlende Tools lokal (oder gibt klare Hinweise).
	•	ruft wgx dev → Compose core hoch, Web+API im Dev-Modus.
	2.	Devcontainer (optional): /.devcontainer analog wgx minimal (git, gh, node, shellcheck/shfmt/bats), Post-Create installiert Linter.

⸻

Block 8 — Infra Compose (profile-basiert)

Ziel: reproduzierbare lokale Umgebung, später CI-Smoke.
	1.	Ergänze/prüfe Profile:
	•	infra/compose/compose.core.yml → web, api, db, caddy
	•	infra/compose/compose.observ.yml → prometheus, grafana + Scrape /metrics
	•	infra/compose/compose.stream.yml → nats/JetStream
	•	infra/compose/compose.search.yml → Typesense/Meili
(Pfad/Dateinamen sind im Architekturplan festgelegt.)
	2.	infra/monitoring/prometheus.yml → scrape api:8787/metrics. (Monitoring-Ordner ist vorgesehen.)

⸻

Block 9 — Rollout-Plan (inkrementell, risikoarm)
	1.	PR-1: Block 3 (Lint) + CONTRIBUTING (Block 6) → nur Meta, kein Runtime-Risiko.
	2.	PR-2: Block 1 (Health + Metrics) + minimaler Router-Wire.
	3.	PR-3: Block 8 (Compose core) + Block 5 (API-CI ohne k6).
	4.	PR-4: k6-Smoke in CI + Observability-Compose.
	5.	PR-5: Block 4 (wgx-Contract/Tasks) + Block 7 (Bootstrap).

⸻

Verdichtete Essenz
	•	Jetzt: Lint/CONTRIBUTING rein.
	•	Dann: Health/Metrics + k6-Smoke.
	•	Parallel: wgx-Contract & Tasks → einheitliche Kommandos.
	•	Ziel: Von „Doc-stark“ zu „ops-hart“ – mit minimalem Risiko.

Ironische Auslassung

Die Karte zeigt alle Fäden der Welt – nur der CI-Faden fehlte noch. Jetzt weben wir ihm einen strammen Knoten: Lint links, Smoke rechts, und in der Mitte ein Router, der „OK“ sagt.

∴ Ungewissheit (Grad: niedrig-mittel)
	•	Was sicher ist: Zielstruktur/Techstack und wgx-Disziplin sind dokumentiert (zitiert).
	•	Was unklar ist: Exakter aktueller Codezustand der API/Web-Apps, bestehende Ports, vorhandene Tooling-Versionen → ich habe Defaults/Adapter vorgeschlagen.
	•	Produktiv: Unklarheit wird durch inkrementelle PR-Reihenfolge abgefedert.

∆-Radar

Wir schwenken von Erzähl-Exzellenz zu Durchführungs-Exzellenz: weniger Poster, mehr Pipelines. Mutation: Straffung der Dev-Regeln (wgx-Like), Verstärkung der Betriebsfähigkeit (Health/Smoke/Compose), Seitwärts in Richtung wgx-Kompatibilität.

⸻

Wenn du willst, packe ich dir daraus direkt PR-Vorlagen (Branch-Namen, Commit-Messages, Datei-Skeletons) in einem nächsten Schritt zusammen.