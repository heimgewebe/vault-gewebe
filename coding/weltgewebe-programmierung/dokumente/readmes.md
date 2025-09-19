Verzeichnis-READMEs für das Weltgewebe-Projekt

apps/web – SvelteKit-Frontend

Verzeichniszweck

Das apps/web-Verzeichnis enthält das moderne Web-Frontend der Weltgewebe-Anwendung, basierend auf SvelteKit (mit optionaler Qwik-Integration für Sonderfälle). Hier liegen alle UI-Komponenten, Routen, Styles und statischen Assets. Ziel ist eine performante, benutzerfreundliche Single-Page-Applikation.

Lokaler Einstieg & Entwicklung
	•	Voraussetzungen: Installiere Node.js (LTS-Version) und npm (oder pnpm/yarn).
	•	Abhängigkeiten: Im Ordner apps/web einmal npm install ausführen.
	•	Dev-Server: npm run dev startet den Entwicklungs-Server mit Hot-Reload. Standard-Port: http://localhost:3000.
	•	Umgebungsvariablen: Lege eine .env-Datei an (z.B. API_BASE_URL=http://localhost:8080), falls das Frontend externe Dienste nutzt.
	•	Testing: (Falls Tests vorhanden) Führe npm run test aus (z.B. mit Vitest, Jest oder Playwright).

Produktion & Build
	•	Build: npm run build erzeugt ein optimiertes Produktions-Build.
	•	Preview: npm run preview startet einen lokalen Server für die statischen Dateien.
	•	Deployment: Die generierten Dateien können auf einem Webserver (z.B. Caddy, Vercel etc.) bereitgestellt werden.
	•	Performance-Budgets: In der CI sind ggf. Schwellenwerte für Page-Speed (Lighthouse) definiert – schnelle Ladezeiten und minimale Long Tasks sind wichtig.

Qualitäts- und Projektregeln
	•	Code-Formatierung: Führe vor jedem Commit npm run lint und npm run format (ESLint/Prettier) aus.
	•	Performance: Achte auf effiziente Komponenten (keine unnötigen Re-Renders, geringe Bundle-Größe). Drittbibliotheken sparsam einsetzen.
	•	Barrierefreiheit: Prüfe zentrale Seiten auf Accessibility (z.B. Lighthouse-Audit im CI).
	•	Telemetrie: (Sofern implementiert) Sammle Web-Vitals oder Performance-Logs, um die Nutzererfahrung zu überwachen.

Mitwirken
	•	Halte dich an den bestehenden SvelteKit-Code-Stil. Neue Komponenten/Seiten sollten nach dem Namensschema (z.B. .svelte unter routes/) organisiert werden.
	•	Dokumentiere wichtige Komponentenfunktionalität in Kommentaren oder in docs/.
	•	Bei Änderungen immer lokale Tests/Builds verifizieren, dann per Pull Request ins Haupt-Repo einbringen.
	•	Sieh dir bei Bedarf weiterführende Dokumentation in docs/ an (z.B. Styleguides, Deployment-Anleitungen).

apps/api – Rust-basierte API

Verzeichniszweck

Das apps/api-Verzeichnis enthält den Haupt-Backend-Service der Weltgewebe-Plattform, implementiert in Rust. Diese API verarbeitet Anfragen aus dem Frontend, führt Geschäftslogik aus, greift auf die PostgreSQL-Datenbank zu und veröffentlicht Ereignisse auf dem Event-Bus (NATS JetStream) gemäß dem Transactional-Outbox-Pattern.

Lokaler Einstieg & Entwicklung
	•	Voraussetzungen: Rust (empfohlen: aktuelle stabile Version), Cargo und PostgreSQL (z.B. lokal oder in Docker).
	•	Umgebungsvariablen: Erstelle ggf. eine Datei .env oder setze Variablen direkt. Wichtige Variablen sind z.B. DATABASE_URL (Postgres-Verbindungsstring) und NATS_URL.
	•	Datenbank: Führe vor dem Start die Datenbank-Migrationen aus (z.B. mit Diesel: diesel migration run oder einem anderen Migrationstool).
	•	Start: Im Verzeichnis apps/api cargo run ausführen. Die API lauscht standardmäßig auf http://localhost:8080.
	•	Tests: Mit cargo test wird die Test-Suite ausgeführt (Unit-Tests, Integrationstests).

Produktion & Build
	•	Release-Build: cargo build --release erstellt optimierte Binaries für die Produktion.
	•	Deployment: Nutze das erzeugte Binary oder baue ein Docker-Image (docker build .) für die Deployment-Pipeline. GitHub Actions (siehe ci/) kann den Release automatisch ausrollen.
	•	API-Dokumentation: Halte API-Endpunkte dokumentiert (z.B. in OpenAPI/Swagger oder Markdown im Repo), damit Client-Teams wissen, was sie erwarten.

Qualitäts- und Projektregeln
	•	Code-Formatierung: Vor dem Commit cargo fmt und cargo clippy ausführen, um Format- und Linting-Fehler zu vermeiden.
	•	Logging & Telemetrie: Die API nutzt strukturiertes Logging (tracing o.Ä.) und stellt einen /metrics-Endpoint für Prometheus bereit. Prüfe Logs regelmäßig auf Fehler.
	•	Ausfallsicherheit: Durch das Outbox-Pattern und Transaktionen bleiben Daten- und Event-Zustände konsistent. Beachte dies bei Änderungen am Datenmodell oder Event-Flow.
	•	Sicherheit: Validierung von Eingaben (Input Sanitization) ist Pflicht. Verwende HTTPS/CORS nach Vorgaben und sichere Secret-Handling (z.B. Umgebungsvariablen, Vault).

Mitwirken
	•	Neue Endpunkte: Füge Rust-Module hinzu und registriere die Routen im Haupt-Servercode. Schreibe sinnvolle Unit-Tests für Business-Logik.
	•	Datenbankänderungen: Pflege Migrationen sorgfältig (neue Tabellen, Spalten mit Migrationsskripten).
	•	Beachte semantische Versionierung in Cargo.toml. Bei Breaking Changes eine neue Major-Version in Betracht ziehen.
	•	Überprüfe die CI-Ergebnisse (Tests/Lints) bei Pull Requests und ergänze Dokumentation (z.B. docs/adr) wenn nötig.

apps/worker – Event-Projektoren & DSGVO-Rebuilder

Verzeichniszweck

Im apps/worker-Ordner befinden sich Hintergrundprozesse, die asynchron im System laufen:
	•	Event-Projektoren: Diese Verbraucher (Consumers) abonnieren Events vom NATS JetStream und aktualisieren daraufhin Read-Modelle oder Caches (z.B. Volltext-Index, abgeleitete Sichten).
	•	DSGVO-Rebuilder: Hintergrund-Tasks zur Erfüllung der Datenschutzanforderungen (DSGVO). Sie verarbeiten z.B. Lösch- und Archivierungs-Events (Forget-Pipeline), pseudonymisieren/anonymisieren Daten oder setzen Datenretention um.

Lokaler Einstieg & Entwicklung
	•	Voraussetzungen: Rust, Cargo und ein laufender NATS-Server (mit JetStream) sowie ggf. Zugang zur Datenbank.
	•	Konfiguration: Lege eine .env-Datei an mit Werten wie NATS_URL, DATABASE_URL usw. (siehe Projektdokumentation).
	•	Start: Die einzelnen Worker laufen als eigene Binaries. Beispiel: cargo run --bin event_projector und cargo run --bin dsgvo_rebuilder.
	•	Tests: Mit cargo test werden alle Worker-bezogenen Tests ausgeführt (Unit-Tests, ggf. Mock-Tests für Event-Verarbeitung).

Besondere Qualitätsanforderungen
	•	Idempotenz: Die Event-Handler müssen idempotent sein. Ein Event kann mehrfach geliefert werden; Wiederholungen dürfen Read-Modelle nicht verfälschen.
	•	Lastenmanagement: Arbeite mit sinnvollen Batch-Größen und Wartezeiten, um bei hoher Event-Rate die Datenbank und andere Ressourcen nicht zu überlasten.
	•	Monitoring: Worker sollen Metriken exportieren (z.B. Anzahl verarbeiteter Events, Lag im JetStream, Verarbeitungszeit). Nutze strukturierte Logs für Fehler und Ausfälle.
	•	DSGVO-Workflows: Implementiere Lösch-Workflows gemäß festgelegter Datenlebenszyklen. Teste die „Forget-Pipeline“ mit Pseudodaten und verifiziere den Erfolg anhand der Logs.

Mitwirken
	•	Neue Projektionen: Beim Hinzufügen eines neuen Consumers achte auf konsistente Stream-/Consumer-Namen und dokumentiere die neuen Events.
	•	Fehlerbehandlung: Definiere für wiederholte Fehlerfälle Dead-Letter-Queues oder Alerts.
	•	Dokumentation: Beschreibe neue Prozesse in den Runbooks (docs/runbooks) inklusive benötigter Konfiguration.
	•	Verwende asynchrone Muster (z.B. Tokio) korrekt, um Blockierungen zu vermeiden. Achte auf Thread-Sicherheit (Sync/Send) bei geteilten Ressourcen.

infra – Betrieb, Deployment & Monitoring

Verzeichniszweck

Das infra-Verzeichnis fasst alle Infrastruktur- und Deployment-Komponenten zusammen, die für Betrieb und Entwicklung notwendig sind. Dazu gehören Docker-Compose-Dateien, Caddy-Konfiguration, Datenbank-Skripte, Monitoring-Setups u.v.m.
	•	Docker-Compose: Enthält z.B. docker-compose.yml mit Definition aller Dienste (API, Frontend, DB, NATS, Monitoring, etc.) für lokale Umgebungen.
	•	Caddy: Der Caddyfile für den Reverse-Proxy (TLS, HTTP/3, Weiterleitungen) und Load-Balancing.
	•	Datenbank: Skripte oder Migrations-Config für PostgreSQL (Initialisierung, Seeds).
	•	Monitoring: Prometheus- und Grafana-Konfigurationen (Exporter, Dashboards, Alerts) zur Überwachung der Plattform.
	•	Sonstiges: Deployment-Tools (z.B. Terraform, Nomad-Jobs) und Hilfsskripte für Infrastrukturmanagement.

Lokales Setup
	•	Voraussetzungen: Installiere Docker und Docker Compose (empfohlene Version beachten).
	•	Beispiel-Umgebungen: Kopiere ggf. .env.example nach .env und passe Parameter an (Ports, Passwörter).
	•	Start: Im Projekt-Root oder infra-Ordner docker-compose up -d ausführen. Alle Services (inkl. API, Frontend, DB, NATS, Caddy, Prometheus, Grafana usw.) werden gestartet.
	•	Überprüfung: Mit docker-compose ps und docker-compose logs -f prüfen, ob alle Container erfolgreich hochgefahren sind. Caddy ist über http://localhost erreichbar.

Qualität & Best Practices
	•	Infrastruktur-as-Code: Halte alle Scripte, Dockerfiles und Konfigurationen versioniert. Änderungen erfordern Code-Review.
	•	Ressourcenlimits: Definiere CPU- und Speichergrenzen in Compose (limits/reservations), damit Services lokal und im CI stabil laufen.
	•	Sicherheit: Speichere keine geheimen Schlüssel im Repo. Nutze .env oder Secret-Management (z.B. Docker Secrets, Vault).
	•	Backups: Lege Mechanismen für DB-Backups und Restore fest (siehe Runbooks in docs/).

Mitwirken
	•	Neue Dienste: Ergänze Docker-Compose, wenn zusätzliche Container nötig sind (neues Microservice, Datenbank, Caching). Achte auf konsistente Netzwerke/Volumes.
	•	Caddy-Konfiguration: Aktualisiere den Caddyfile für neue Domains oder Subdomains. Caddy übernimmt TLS-Automatisierung.
	•	Monitoring: Erweitere prometheus.yml um neue Scrape-Jobs für hinzugekommene Services und erstelle zugehörige Grafana-Dashboards.
	•	Deployment-Skripte: Falls z.B. Terraform oder Nomad/Jenkins genutzt wird, passe die IaC-Definitionen an neue Gegebenheiten an.

docs – Technische Dokumentation, ADRs, Runbooks, Datenmodell

Verzeichniszweck

Das docs-Verzeichnis dient als zentrale Ablage aller Projektdokumentationen:
	•	Architektur-Entscheidungen (ADRs): Begründete Entscheidungen zu Architektur, Frameworks, Bibliotheken oder Abläufen. Jede wichtige Änderung bekommt eine eigene ADR.
	•	Runbooks: Praxisorientierte Handbücher für Betrieb und Notfall (z.B. Anleitung: „Wie stelle ich eine lokale DB wieder her?“ oder „Neues Release ausrollen“).
	•	Datenmodell: Beschreibungen des Datenmodells (Entitätsdiagramme, Tabellenübersichten). Erklärt, wie die Daten strukturiert sind.
	•	Weitere Dokumente: Onboarding- oder Styleguides, API-Referenzen, Glossar usw.

Nutzung
	•	Lies ADRs, um Hintergründe getroffener Entscheidungen zu verstehen (z.B. „Warum Rust für die API?“).
	•	Folge Runbooks bei Routine-Operationen und Notfällen (z.B. Datenbank-Restore, Account-Entfernungen, Sicherheitsvorfälle).
	•	Aktuelle Datenbank-Änderungen dokumentieren (neue Tabellen/Spalten) im Datenmodell-Bereich.
	•	Verwende ein Format (Markdown), das leicht zu lesen und zu durchsuchen ist.

Format & Tools
	•	Die meisten Dokumente liegen als Markdown-Dateien vor. Sie können z.B. mit MkDocs oder Hugo zu einer Website gebaut werden.
	•	Halte dich an einheitliche Schreib- und Formatierungsregeln (z.B. linksbündige Listen, Codeblöcke mit Syntaxhervorhebung).
	•	Bei Codeänderungen sollten PRs auch relevante Dokumente aktualisieren.

Mitwirken
	•	Erstelle bei wichtigen Designänderungen eine neue ADR (z.B. „2025-09-12-Separation-Frontend-Backend.md“).
	•	Ergänze Runbooks, wenn du wiederkehrende Aufgaben automatisierst oder verbesserst.
	•	Aktualisiere das Datenmodell bei allen DB-Änderungen und synchronisiere es mit den Migrationen.
	•	Pflege das Inhaltsverzeichnis oder eine README.md in docs, damit neue Kollegen schnell finden, was sie suchen.

ci – CI/CD, GitHub Actions, Skripte, Budgets

Verzeichniszweck

Im ci-Ordner befindet sich alles rund um die automatisierte Integration und Auslieferung (CI/CD) des Projekts:
	•	GitHub Actions Workflows: YAML-Konfigurationen in .github/workflows/ oder hier definiert, um Builds, Tests und Deployments zu automatisieren.
	•	Skripte: Hilfs-Skripte (z.B. zum Release-Tagging, Versionsverwaltung, statische Code-Analysen).
	•	Budgets: Definitionen und Konfig-Dateien für Performance- oder Kostenbudgets (z.B. Lighthouse-Budgets, Action-Minutenlimits).

Pipeline-Übersicht
	•	Build & Test: Bei jedem Push in main (bzw. bei PRs) laufen folgende Schritte: Linting, Kompilierung (Frontend & Backend), Unit-Tests und Integrationstests.
	•	Deployment: Nach Merge in den Hauptbranch wird ein Release-Build erstellt und (je nach Umgebung) Deployment-Skripte ausgeführt.
	•	Benachrichtigungen: CI-Ergebnisse (Erfolg/Fehlschlag) werden üblicherweise in das Repository/Issue-Tracker gemeldet (z.B. über Status-Badges oder Chat-Integrationen).
	•	Parallelisierung: Jobs für Frontend, Backend und Worker können parallel laufen, um Zeit zu sparen.

Besonderheiten
	•	Caches: Nutze Cache-Mechanismen (z.B. Cargo-Cache, npm-Cache), um Build-Zeit in der CI zu reduzieren.
	•	Runner & Kosten: Achte auf eingesetzte Runner (Shared vs. Self-Hosted). Beobachte das Minuten-/Kostenbudget für GitHub Actions, um Ausgaben zu kontrollieren.
	•	Performance-Budgets: Es können z.B. kontinuierliche Performance-Checks (Lighthouse) eingebaut sein. Überschreitungen lösen Failures oder Warnungen aus.
	•	Sicherheits-Checks: Integration von statischen Analysen oder Security-Scans (abhängig von Tools) wird empfohlen.

Mitwirken
	•	Neue Workflows oder Änderungen an bestehenden: Lege oder passe .yml-Dateien in .github/workflows an.
	•	Skripte aktualisieren: Wenn sich Buildprozesse ändern (z.B. neue Test-Frameworks), müssen entsprechende Skripte im ci-Ordner angepasst werden.
	•	Dokumentation: Beschreibe besondere CI-Schritte oder Policies in den Readmes oder in docs/.
	•	Branch-Strategie einhalten: Beachte Namenskonventionen und die Regeln (z.B. Fast-Forward-Rebase) für Pull Requests und Merges.