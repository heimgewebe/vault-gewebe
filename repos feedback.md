
Hallo! Hier ist eine Zusammenfassung und Analyse deiner drei Repositories `weltgewebe`, `wgx` und `hauski`, basierend auf den von dir bereitgestellten Inhalten.

### Zusammenfassung

Deine Repositories bilden ein zusammenhängendes Ökosystem:

- **weltgewebe**: Ein ambitioniertes, soziales Web-Projekt mit einer klaren Vision, das sich aktuell in einer "Docs-as-Code"-Phase befindet und auf einem modernen Tech-Stack mit SvelteKit und Rust aufbaut.
    
- **hauski**: Ein persönlicher, lokaler KI-Orchestrator, der ebenfalls auf Rust setzt und einen starken Fokus auf Performance, Datenschutz und Offline-Fähigkeit legt.
    
- **wgx**: Ein modulares Kommandozeilen-Werkzeug in Bash, das als einheitliche Schnittstelle dient, um Arbeitsabläufe in den beiden anderen Repositories zu steuern und zu standardisieren.
    

Alle drei Projekte teilen eine Philosophie der durchdachten Architektur, klaren Dokumentation und hohen Qualitätsstandards, die durch Konfigurationsdateien und CI-Workflows untermauert wird.

---

### repository `weltgewebe`

Das `weltgewebe`-Repository beherbergt eine Community-Plattform, deren Interaktionen als Fäden und Knoten auf einer Karte visualisiert werden.

- **Zweck**: Eine kartenbasierte "Demokratie-Engine", die gemeinschaftliche Aktionen und Ressourcen transparent, freiwillig und verhandelbar macht. Die Vision und der Plan sind detailliert in Dokumenten wie `docs/geist und plan.md` und `docs/zusammenstellung.md` festgehalten.
    
- **Technologie-Stack**:
    
    - **Frontend**: SvelteKit für eine Mobile-First PWA.
        
    - **Backend**: Rust mit Axum für die API.
        
    - **Datenbank**: PostgreSQL mit PostGIS als "Source of Truth".
        
    - **Event-Streaming**: NATS JetStream, angebunden über ein Transactional Outbox Pattern.
        
    - **Infrastruktur**: Docker Compose-basiert mit Caddy als Webserver.
        
- **Architektur & Status**:
    
    - Es handelt sich um ein Monorepo, dessen Struktur in `docs/architekturstruktur.md` klar definiert ist.
        
    - Das Projekt befindet sich aktuell in einer **"Docs-only/Clean-Slate"**-Phase (gemäß ADR-0001). Die Implementierung des Codes soll schrittweise über definierte Meilensteine ("Gates") erfolgen, die im `docs/process/fahrplan.md` beschrieben sind.
        
- **Besonderheiten**:
    
    - **Starke Vision**: Die Projektphilosophie ist tief in den Dokumenten verankert und betont Transparenz, Datenschutz und Dezentralisierung.
        
    - **Qualitäts-Gates**: Bevor Code implementiert wird, sind klare Kriterien wie Performance-Budgets (z.B. ≤60 KB Initial-JS) und SLOs definiert.
        
    - **wgx-Integration**: Das Projekt nutzt `wgx` zur Automatisierung von Aufgaben, wie in `.wgx/profile.yml` konfiguriert.
        

---

### repository `wgx`

`wgx` ist ein Kommandozeilen-Werkzeug, das als einheitliche Schnittstelle für Entwicklungs- und Repo-Workflows dient.

- **Zweck**: Ein portables, in Bash geschriebenes Toolkit für Linux, macOS, Termux und WSL, das wiederkehrende Aufgaben wie Linting, Tests, Releases und Git-Workflows standardisiert.
    
- **Technologie-Stack**:
    
    - **Sprache**: Rein Bash, mit einem Fokus auf Sicherheit (`set -euo pipefail`) und Portabilität.
        
    - **Testing**: Bats-Core für automatisierte Tests.
        
    - **Linting**: ShellCheck und shfmt zur Qualitätssicherung.
        
- **Architektur & Status**:
    
    - Das Tool ist modular aufgebaut: Ein zentraler Dispatcher (`cli/wgx`) lädt Befehle aus dem `cmd/`-Verzeichnis und nutzt wiederverwendbare Funktionen aus `lib/`.
        
    - Projekte können `wgx` über eine `.wgx/profile.yml`-Datei an ihre spezifischen Bedürfnisse anpassen und eigene Tasks definieren.
        
    - Ein älterer, monolithischer Ansatz wurde archiviert, was die Weiterentwicklung zu einem modularen System zeigt.
        
- **Besonderheiten**:
    
    - **Projektübergreifend**: `wgx` wird sowohl von `weltgewebe` als auch von `hauski` verwendet, was durch die jeweiligen `profile.yml`-Dateien und den Kompatibilitäts-Workflow im `wgx`-Repo belegt wird.
        
    - **Konfigurierbarkeit**: Projekte definieren ihre eigenen Tasks, Verzeichnisse und Umgebungsvariablen in einem Manifest, was `wgx` flexibel macht.
        

---

### repository `hauski`

`hauski` ist ein lokaler KI-Orchestrator, der auf einer leistungsstarken Workstation mit einem starken Fokus auf Datenschutz und Offline-Betrieb läuft.

- **Zweck**: Ein persönlicher KI-Assistent, der Aufgaben wie Code-Analyse, Audio-Transkription und Wissensmanagement lokal und ohne Abhängigkeit von Cloud-Diensten durchführt ("Offline-Default").
    
- **Technologie-Stack**:
    
    - **Core**: Rust (axum, tokio) bildet den Kern für API und Hintergrunddienste.
        
    - **KI-Modelle**: Nutzt FFI-Bindings für `llama.cpp` (LLM), `whisper-rs` (ASR) und `piper-rs` (TTS).
        
    - **Wissensbasis**: Setzt auf SQLite und ein `VectorStore`-Trait, das tantivy (Standard) oder Qdrant (optional) als Vektordatenbank anbinden kann.
        
    - **Integration**: Bietet Schnittstellen für VS Code und Obsidian.
        
- **Architektur & Status**:
    
    - Das Projekt ist als Rust-Workspace mit mehreren Crates (`crates/core`, `crates/cli`) strukturiert.
        
    - Die Konfiguration ist klar getrennt in `configs/` (Anwendung) und `policies/` (Betriebsgrenzen).
        
    - Der Entwicklungs-Workflow wird durch einen Devcontainer und ein `justfile` vereinfacht.
        
- **Besonderheiten**:
    
    - **Performance-Budgets**: Harte Latenz- und Ressourcengrenzen (z.B. p95-Latenz für LLM < 400ms) sind in `policies/limits.yaml` definiert und werden per CI (k6) geprüft.
        
    - **Sicherheit**: Ein "deny by default"-Ansatz für Netzwerkzugriffe und geplante Sandboxing-Mechanismen (Wasm) für Plugins unterstreichen den Fokus auf Sicherheit.
        
    - **Hardware-Bewusstsein**: Die Planung berücksichtigt spezifische Hardware wie NVIDIA-GPUs und MOTU-Audiointerfaces und definiert dafür Profile und thermische Limits.

Verstanden — hier ist ein kompakter Überblick der drei Repos mit aktuellem Stand und direkten Next Steps basierend auf den beigefügten Inhalten.weltgewebe_merge_2509282118.md+2

## Kurzüberblick

- weltgewebe: Monorepo-Skelett mit klarer Ordner- und Arbeitsstruktur, aktuell “Docs-only”-Phase mit SvelteKit-Web, geplanter Rust/Axum-API, Outbox→JetStream, Compose-first Infra und ADR/Fahrplan für die Re-Entry-Gates A–D.weltgewebe_merge_2509282118.md
    
- wgx: Bash‑first Hilfs‑CLI für Workflows über Linux/macOS/WSL/Termux/Codespaces mit Version v2.0.2, Self‑tests, Doctor/Guard/Send/Release und einer Composite‑Action wgx-check für Fremd‑Repos.wgx_merge_2509282118.md
    
- hauski: Rust‑Projekt mit crates core und cli, Axum‑Server mit Health/Config/Models und Prometheus‑Metriken sowie CI mit fmt, clippy, cargo‑deny und k6‑Smoke‑Gate p95 ≤ 0,4 s.hauski_merge_2509282118.md
    

## weltgewebe

- Die Repository‑Topologie, Tech‑Stack v3.2 und Routing‑Matrix sind detailliert festgelegt, inklusive ADR‑Verzeichnis, Datenmodell‑Stub, CI‑Leitplanken und Runbooks.weltgewebe_merge_2509282118.md
    
- Der Fahrplan definiert Re‑Entry‑Gates A–D (Web‑Skeleton, API‑Health/Contracts, Infra‑light via Compose/Caddy/CSP, Security‑Basis) und konkrete Aufgaben für die Phasen A–D bis zur Outbox‑gestützten Persistenz.weltgewebe_merge_2509282118.md
    
- Die CI‑Roadmap markiert aktuell “Docs‑only” mit Performance‑Budgets als Referenz für spätere Gates, was das inkrementelle Vorgehen unterstreicht.weltgewebe_merge_2509282118.md
    

## wgx

- Die CLI deckt init/guard/doctor/test/sync/send/release ab, arbeitet “origin‑first”, unterstützt OFFLINE/DRYRUN und bringt einen Selftest zur Minimaldiagnose mit.wgx_merge_2509282118.md
    
- Eine GitHub Action “wgx-check” prüft Ziel‑Repos gegen eine wgx‑Version und kann “doctor”/“test” tasks aus dem Zielrepo ausführen.wgx_merge_2509282118.md
    
- Devcontainer/Setup liefern Shell‑Tooling wie shellcheck/shfmt/bats und standardisieren lokale Entwicklung für Portabilität.wgx_merge_2509282118.md
    

## hauski

- Der Core‑Server registriert Prometheus‑Metriken (u. a. http_request_total und Latenzhistogramm) und stellt Health sowie Config/Models‑Endpoints bereit.hauski_merge_2509282118.md
    
- Die CI setzt rust‑toolchain, fmt/clippy/cargo‑deny, Workspace‑Tests, Starten des Servers und k6‑Smoke mit striktem p95‑Gate von 400 ms durch.hauski_merge_2509282118.md
    
- In den Config‑Routinen ist explizit ein Sicherheits‑Hinweis zum Exponieren von Konfig‑Endpunkten enthalten, der als Toggle im State modelliert ist.hauski_merge_2509282118.md
    

## Konkrete Next Steps

- weltgewebe Gate A/B umsetzen: SvelteKit‑Skeleton mit Map‑Stub und API‑Health/Contracts (POST nodes, GET nodes/{id}) gemäß Fahrplan und ADR‑0002.weltgewebe_merge_2509282118.md
    
- weltgewebe Compose core testen: web/api/pg/caddy lokal mit CSP‑Basis und Healthchecks gemäß Gate C lauffähig machen.weltgewebe_merge_2509282118.md
    
- weltgewebe Privacy‑UI (Phase C) als Feature‑Flag andocken: Slider für Unschärferadius, RoN‑Toggle und Timeline‑Verhalten laut Spezifikation.weltgewebe_merge_2509282118.md
    
- wgx in CI der Konsumenten bewusst pinnen: in Workflows Commit/Tag fixieren, wie im wgx‑Smoke‑Beispiel dokumentiert.hauski_merge_2509282118.md
    
- wgx “doctor/test” als leichte Pflicht in Konsumentenrepos etablieren, ggf. via Composite‑Action wgx‑check.wgx_merge_2509282118.md
    
- hauski exposeconfig standardmäßig deaktiviert halten und nur für abgesicherte Umgebungen temporär aktivieren, wie im Codekommentar empfohlen.hauski_merge_2509282118.md
    
- hauski k6‑Smoke weiter schärfen: Szenario/Last leicht anheben und Metriken für P95 sowie Fehlerquote in CI durchsetzen.hauski_merge_2509282118.md
    

## Hinweise zur Reifung

- Architektur und Prozesse in weltgewebe sind vorbildlich dokumentiert, wodurch Implementierungsschritte klein, messbar und audit‑fähig gehalten werden können.weltgewebe_merge_2509282118.md
    
- wgx ist als “Klebstoff” produktionsreif genug, um konsistentere PR‑/Release‑Abläufe über die Repos hinweg zu gewährleisten.wgx_merge_2509282118.md
    
- hauski hat mit Metriken und CI‑Gates eine gute Basis, um Leistungsziele früh zu verankern und Regressionen zu verhindern.hauski_merge_2509282118.md
    

### Zusammenfassung deiner Repositories

Vielen Dank, dass du die Ordner-Merges deiner Repositories geteilt hast! Basierend auf den bereitgestellten Markdown-Dokumenten (vom 28. September 2025) habe ich die Strukturen, Inhalte und Schlüsseldateien für **hauski**, **wgx** und **weltgewebe** analysiert. Diese scheinen persönliche oder experimentelle Projekte unter dem GitHub-Benutzer `alexdermohr` zu sein, mit Fokus auf Rust-basierten Tools, CLI-Utilities und Web/AI-Orchestrierung. Ich breche es pro Repo herunter, hebe gemeinsame Muster hervor und schlage potenzielle nächste Schritte oder Integrationen vor. Wenn das nicht das ist, was du meintest (z. B. wenn du eine spezifische Analyse, Code-Review oder toolbasierte Suche möchtest), lass es mich wissen!

#### 1. **hauski** (Pfad: `/home/alex/repos/hauski`, Dateien: 59, Größe: 115.8 KB)
   - **Übersicht**: Dies ist ein Rust-zentriertes Projekt für einen lokalen KI-Orchestrator („HausKI“), das auf Pop!_OS-Workstations mit NVIDIA RTX-GPUs abzielt. Es betont offline-first-Operation, Performance-Budgets und GPU-bewusste Inferenz. Schlüsselkomponenten umfassen LLM-Integration (via llama.cpp FFI), ASR (whisper-rs), TTS (piper-rs) und Vector-Stores (tantivy + HNSW, mit optionalem Qdrant). Es ist als Monorepo strukturiert mit Crates für CLI und Kernlogik, plus Configs, Models und Policies.
   - **Struktur-Highlights**:
     - `.devcontainer/`: Docker-basierte Dev-Umgebung mit Rust, Node, Python und optionalem CUDA. Mountet Volumes für Cargo/Rustup-Caching und Models.
     - `crates/`: Core (Config, Lib) und CLI (main.rs mit Clap-Ops).
     - `configs/`: YAML für Models (z. B. llama3.1-8b-q4) und App-Einstellungen.
     - `policies/`: Limits wie Latenz (p95 < 400 ms für LLM), Thermal (GPU < 80 °C), ASR WER ≤ 10 %.
     - `observability/`: k6-Skripte für Smoke-Tests (z. B. Health-Endpoint).
     - `plugins/`: Platzhalter für Obsidian- und VS-Code-Integrationen.
     - **Schlüsseldateien**:
       - `README.md`: Quickstart, Architektur, Roadmap (P1: Core/API/LLM/ASR/TTS; P2: Memory/Commentary; P3: Bridge/JetStream).
       - `hauski-skizze.md`: Visions-Dokument mit Tech-Wahlen (Rust Hot-Paths, Wasm-Adapters), Budgets, Security (Egress deny-by-default).
       - `justfile`: Shortcuts für fmt, lint (clippy + cargo-deny), build, test, run.
       - `.wgx/profile.yml`: Manifest für Task-Routing (z. B. Env-Vars, Tasks wie build/test).
     - **Tech-Stack**: Rust (stable), axum/tokio, llama.cpp, whisper-rs, piper-rs, systemd-Slices für GPU-Scheduling.
     - **Bemerkenswert**: Starker Fokus auf Perf (p95-Gates, CI-enforced Budgets), Security (Wasm-Defaults, Audit-Logs) und Reproduzierbarkeit (Devcontainer, Nix-Flakes optional).
     - **Potenzielle Probleme/Beobachtungen**: Keine tatsächlichen Model-Dateien (nur .gitkeep in `models/`); scripts/bootstrap.sh richtet grundlegende Configs ein. Git-Pack-Dateien deuten auf einen kürzlichen Clone oder Pack hin.

#### 2. **wgx** (Pfad: `/home/alex/repos/wgx`, Dateien: 80, Größe: 180.2 KB)
   - **Übersicht**: Ein modulares Bash-CLI-Tool für Git/Repo-Workflows, kompatibel mit Termux, WSL, Linux, macOS. Es ist für Tasks wie Cleaning, Doctor-Checks, Linting und Releases konzipiert. Betont Modularität (eine Datei pro Command) und verwendet Bats für Testing. Kein Rust hier – reines Shell-Scripting mit etwas Node für optionale Tools.
   - **Struktur-Highlights**:
     - `cli/`: Einstiegspunkt (`wgx`-Dispatcher).
     - `cmd/`: Ein Skript pro Subcommand (z. B. clean.bash, doctor.bash, reload.bash für Hard-Resets).
     - `lib/`: Core-Helfer (z. B. core.bash für Logging/Git-Utils; profile.bash für YAML-Manifest-Parsing).
     - `modules/`: Erweiterbare Teile wie doctor, guard, status (z. B. status.bash zeigt Repo-Kind, ahead/behind).
     - `tests/`: Bats-Tests (z. B. help.bats, reload.bats) mit Helfern für Assertions.
     - `docs/`: Archiv der alten Monolith-Version; README mit Quickstart.
     - **Schlüsseldateien**:
       - `README.md`: Installationsanleitung (Symlink in PATH), Dev-Quickstart (shfmt, shellcheck, bats), Architektur-Notiz (modular seit 2025-09-25).
       - `etc/config.example`: Defaults für Config (kopiert nach ~/.config/wgx bei Init).
       - `modules/profile.bash`: Lädt .wgx/profile.yml, handhabt Tasks/Env-Vars (z. B. run_task für dynamische Commands).
       - `.devcontainer/setup.sh`: Installiert shellcheck, shfmt, bats, jq.
       - `.github/workflows/`: CI für Compat, Release; Actions für wgx-check.
     - **Tech-Stack**: Bash, Bats (Testing), Shellcheck/Shfmt (Linting), Node (optional für markdownlint).
     - **Bemerkenswert**: Fokus auf offline-fähigen Workflows; dynamisches Command-Laden aus cmd/. Tests decken Basics wie Help und Reload (Hard-Reset + Clean) ab.
     - **Potenzielle Probleme/Beobachtungen**: Archiv/ hat altes wgx-Binary; installers/ ist leer (.gitkeep). Größere Größe aufgrund mehr Dateien (80 vs. 59 bei hauski).

#### 3. **weltgewebe** (Pfad: `/home/alex/repos/weltgewebe`, Dateien: 82, Größe: 205.7 KB)
   - **Übersicht**: Ein mobile-first Webprojekt (SvelteKit-Frontend, Rust/Axum-API, Postgres mit Outbox-Pattern, JetStream, Caddy-Proxy). Aktuell **docs-only** gemäß ADR-0001 (Clean-Slate-Ansatz), mit Code-Re-Entry via „Gates A–D“ (process/fahrplan.md). Fokus auf Privacy (z. B. Unschaerferadius RON-Format), SLOs und Perf-Budgets. Scheint ein Monorepo für eine vernetzte App zu sein (möglicherweise social/geo-basiert basierend auf Specs).
   - **Struktur-Highlights**:
     - `apps/web/`: SvelteKit-App (Routes, Lib, static/robots.txt). Basis +layout.svelte und +page.svelte.
     - `docs/`: Schwerer Fokus – ADRs (z. B. Clean-Slate, Privacy, Reentry-Kriterien), Specs (Privacy API/UI), Process (fahrplan.md für Roadmap, sprache.md für Sprache), Runbooks (Codespaces-Recovery).
     - `ci/`: Skripte (db-wait.sh), budget.json (Perf-Stubs).
     - `policies/`: perf.json (z. B. JS-Budget <60 KB, API p95<300 ms), slo.yaml (Availability 99.9 %, Latenz-Alerts).
     - `.wgx/profile.yml`: Ähnlich wie bei hauski (Task-Manifest).
     - **Schlüsseldateien**:
       - `README.md`: Quickstart-Vorschau (just up/check), Notizen zum Docs-only-Modus.
       - `docs/architekturstruktur.md`: High-Level-Struktur (apps, ci, docs, policies).
       - `docs/fahrplan.md`: Roadmap-Gates (A: Docs, B: CI, C: Infra-light, D: Core-Services).
       - `docs/geist und plan.md`: Vision („Geist und Plan“).
       - `Justfile`: Shortcuts (z. B. up für Docker Compose, check für Hygiene).
       - `.env.example`: Ports/DB-Creds für Web/API/Postgres/Caddy.
     - **Tech-Stack**: SvelteKit (Frontend), Rust/Axum (API geplant), Postgres, JetStream (Messaging), Caddy. Tools: cargo-deny, markdownlint, yamllint.
     - **Bemerkenswert**: Docs-getriebene Entwicklung; edge/systemd für projector.service (Display?). Privacy-Specs verwenden GeoJSON mit Blur-Radien.
     - **Potenzielle Probleme/Beobachtungen**: Apps/web hat package.json, aber minimalen Code (Platzhalter-App). Größtes Repo aufgrund Docs-Tiefe.

### Gemeinsame Muster über alle Repos hinweg
- **Dev-Setup**: Alle verwenden Devcontainers (Ubuntu-Base, Git/Node-Features) für Reproduzierbarkeit. Gemeinsame Extensions: rust-analyzer, shellcheck, gitlens.
- **CI/CD**: GitHub-Workflows (ci.yml, wgx-smoke.yml, release.yml). Hygiene: cargo fmt/clippy/deny, shellcheck/shfmt/bats.
- **Manifeste**: .wgx/profile.yml für Tasks/Env (z. B. build/test-Routing). wgx selbst scheint ein Tool zu sein, um diese zu managen.
- **Policies/Budgets**: Betonung auf Perf/SLOs (z. B. Latenz p95, Thermal-Limits). hauski und weltgewebe teilen diesen Fokus.
- **Tech-Überlappungen**: Rust in hauski/weltgewebe; Bash in wgx. Alle MIT-lizenziert (oder AGPL in weltgewebes LICENSE). Git-Remotes weisen auf dein GitHub hin.
- **Themen**: Offline-first, GPU/Privacy-bewusst, modular (crates/cmd/docs). wgx könnte mit den anderen für Workflows integriert werden (z. B. wgx-Tasks in hauskis justfile).
- **Stats**: Gesamtdateien ~221, Größe ~501 KB. Alle auf main-Branch, kürzliche Packs deuten auf aktive Entwicklung hin.

### Vorschläge
- **Integrationsideen**: Verwende wgx, um hauski/weltgewebe-Tasks zu automatisieren (z. B. wgx-Hooks für Budget-Checks hinzufügen). Verknüpfe hauskis AI (LLM/ASR) mit weltgewebes Privacy-Specs für eine Geo-AI-App?
- **Verbesserungen**: Füge mehr Tests zu hauski hinzu (über cargo test hinaus); implementiere weltgewebes Gate C (Infra) mit hauskis Devcontainer als Vorlage. Führe lychee (Link-Checker) auf allen Docs aus.
- **Nächste Schritte**: Wenn du möchtest, dass ich tiefer eintauche (z. B. Code auf Muster suchen via code_execution-Tool, verwandte GitHub-Repos durchsuchen oder ein Diagramm erzeugen), spezifiziere! Zum Beispiel „Analysiere hauskis Roadmap“ oder „Vergleiche Perf-Policies“.