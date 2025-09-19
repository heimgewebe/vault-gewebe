HausKI – Handout (Funktion & Technik)

Stand: 2025‑09‑19 · Ziel: Überblick für Planung & Umsetzung · System: Pop!_OS (Ryzen 7 5700X, RTX 4070 Ti Super, 32 GB RAM, 2 TB NVMe, MOTU M2)

⸻

0) Kurzfassung

HausKI ist ein lokales KI‑Orchestrator‑System auf deinem Rechner. Es verbindet Obsidian/Canvas, VS Code/GitHub, Audio (Qobuz/Unterricht/Aufnahme), Kommunikation (E‑Mail/Messenger) und Systemautomationen. Alle Kernfunktionen laufen offline mit Open‑Source‑Bausteinen; Cloud ist optional und per Policy strikt kontrolliert. Persistentes Gedächtnis und On‑the‑fly‑Kommentierung sind fest eingeplant.

⸻

1) Funktionen (Was HausKI tut)

1.1 Orchestrator & System
	•	Policy‑Router lokal↔Cloud (Default: lokal). Regeln: Privacy, Kosten, Latenz, Qualität.
	•	Jobs & Flows: YAML‑Workflows (z. B. Audio→Transkript→Zusammenfassung→Obsidian→PR‑Draft).
	•	GPU‑Scheduler: VRAM‑Belegung, Prioritäten, Power‑Limits, Thermik.
	•	Health‑Daemon: journald‑Triage, apt/flatpak‑Drift, Snapshots/Restore, Auto‑Fix‑Vorschläge.

1.2 Gedächtnis & Live‑Kommentar
	•	Persistentes Gedächtnis (Schichten: short_term, working_context, long_term; TTL, Pins, Themen‑Buckets).
	•	On‑the‑fly‑Kommentierung (VS Code, Obsidian, CLI): Hinweise nur bei klarem Mehrwert (Δ‑Schwelle, Cooldowns).
	•	Konflikt‑Detektor: „Neue Notiz widerspricht X/Y“ – Quellen & Abwägungen einblenden.
	•	Modus „Prof. Dr. Kranich“: Gegenposition, Humor, Unsicherheitsgrad sichtbar.

1.3 Obsidian / Canvas
	•	Text→Canvas‑Knoten inkl. Auto‑Layout, Farbcodes nach Domäne.
	•	Mindmapception: Sub‑Canvas‑Auslagerung mit Backlinks.
	•	Graph‑Lint: Duplikate, Waisen, unbalancierte Bäume, fehlende Quellen.
	•	Semantische Suche (Hybrid Vektor+Symbolik) & Narrativ‑Generator (Briefing/PRD/Pitch).
	•	Canvas‑Diff: visuelle Diffs zwischen Ständen.

1.4 Code, DevOps & Repos
	•	PR‑Drafter (Titel, Beschreibung, Breaking Changes, Testplan, Reviewer‑Checkliste).
	•	Review‑Copilot lokal (Semgrep‑Heuristiken, Security‑Hints, Anti‑Leak‑Checks).
	•	CI/CD‑Kurator (Caches, Concurrency, Matrix; Smoke‑Tests vorschlagen).
	•	Repo‑Navigator (semantische Queransicht: „Erkläre Init‑Sequenz“, „Finde Event‑Store‑Zugriffe“).
	•	Infra‑Synthesizer (devcontainer/docker aus Projekt‑Signaturen generieren/aktualisieren).

1.5 Audio (MOTU M2)
	•	Wiedergabe‑Profile: Hi‑Fi (Qobuz), Lautheit‑Normalisierung, sanfter Kopfhörer‑Crossfeed.
	•	Unterrichts‑Profile: Loopback+Mic, Low‑Latency, Auto‑Gain, Ducking bei Sprechen.
	•	Transkription lokal: Whisper.cpp (GPU), SRT/MD mit Timestamps.
	•	„Luthier“-Agent: Akkord/Tempo‑Erkennung, Tab‑Skizzen, Übungs‑Marker („hier warst du unsauber“).
	•	TTS‑Antwort: HausKI liest Kommentare vor (Piper/XTTS lokal).

1.6 Kommunikation (lokal)
	•	E‑Mail: IMAP‑Lesen (Maildir/mbsync), Zusammenfassungen, Antwort‑Entwürfe (Tonfall „Alexander“), ICS‑Extraktion; SMTP nur nach Freigabe.
	•	Messenger: Matrix (API‑nativ), Signal (signal‑cli), Telegram (Bot). Slack/Discord optional via Webhooks (Policy beachten).
	•	Smart‑Benachrichtigungen: „Thread enthält Entscheidung X bis Freitag“; Antwort‑Diff (minimaler Änderungsvorschlag).
	•	Verknüpfung: wichtige Threads ↔ Obsidian‑Knoten (Zitat‑Snippets als Quellenanker).

1.7 Weltgewebe‑Bridge
	•	GeoJSON‑Exporter (Knoten/Fäden → Ortswebereien; Freigabe‑Stufen: privat/vertraulich/öffentlich).
	•	NATS‑Publisher (Ereignis‑Streams; Dry‑Run mit Anonymisierung).
	•	„Cui‑Bono“-Prüfer: markiert implizite Machtannahmen; Vorschläge für transparente Formulierungen.

1.8 Sicherheit & Datenschutz
	•	No‑Leak‑Guard: harte Egress‑Policy (Default: deny), Whitelist pro Ziel; Red‑Team‑Self‑Tests.
	•	KMS‑mini: Schlüssel/Token via age/libsodium; Audit‑Logs signiert (Append‑only JSON‑Lines).
	•	RBAC: Rollen (Admin, Operator, Gast) für sensiblere Aktionen.

⸻

2) Technik (Wie HausKI funktioniert)

2.1 Architektur (ASCII)

Clients (Obsidian • VSCode • CLI • Audio • Comm)
        │
        ▼
┌──────────────────────────┐
│          CORE (API)      │
│ Orchestrator • Event-Bus │
│ Adapters (obsidian_fs,   │
│          git, mail, imap)│
│ Security (KMS-mini)      │
└───────┬─────┬───────┬────┘
        │     │       │
        ▼     ▼       ▼
  Indexd   Daemon   Bridge
 (Vector   (backup, (Weltgewebe:
  + SQL)    bench,   GeoJSON,
            audio,   NATS)
            comm,    
            comment)
        │
        ▼
 Inference-Gateway (Policies, Routing, lokal↔remote)
        │
        ▼
 LLM-Runner (eigene OSS-Modelle)
  llama.cpp • vLLM • gguf • LoRA/PEFT • Embeddings

2.2 Module
	•	core/: FastAPI, Task‑Routing, Event‑Bus, Adapter (Obsidian‑FS, Git, IMAP/SMTP), Security/KMS‑mini.
	•	gateway/: Prompt‑Policies, Model‑Routing, Budgetierung, Fallbacks.
	•	llm‑runner/: llama.cpp (GGUF auf GPU), optional vLLM; OpenAI‑kompatible API; LoRA/PEFT.
	•	indexd/: SQLite (Metadaten) + Vektorstore (Faiss/HNSW/Qdrant‑kompatibel), RAG‑Pipelines, Memory‑Schichten.
	•	daemon/: backup/bench/audio/comm/commentary (systemnahe Dienste).
	•	bridge/: GeoJSON/NATS, MapLibre‑Hooks.
	•	plugins/: Obsidian‑Plugin (Canvas‑APIs), VS Code‑Extension (PRs, Suche).
	•	cli/: Typer‑CLI (tasks, logs, audio, status, policy).
	•	infra/: devcontainer, docker, scripts, models.yml, policies/.

2.3 Datenflüsse (Beispiele)
	•	Audio→Text→Wissen: WAV → Whisper.cpp → SRT/MD → Indexd (Embeddings) → Obsidian‑Linking.
	•	Code→PR‑Draft: Git‑Diff → PR‑Drafter → Entwurf in VS Code → Review‑Copilot‑Hinweise.
	•	Mail→Briefing: IMAP‑Pull → Thread‑Summary → Antwort‑Entwurf → ICS‑Erzeugung → Obsidian‑Quelle.

2.4 APIs & CLI
	•	APIs: POST /v1/chat/completions, /v1/embeddings, /asr/transcribe, /obsidian/canvas/suggest, /code/pr/draft, GET /health.
	•	CLI (Auszug):

hauski models pull llama3.1-8b-q4
hauski asr transcribe input.wav --model medium --out out.srt
hauski obsidian link --vault ~/Vault --auto
hauski pr draft --repo ~/weltgewebe-repo
hauski comm mail sync --inbox
hauski policy set routing.local_required=true
hauski audio profile set hifi-qobuz

2.5 Systemdienste (systemd)
	•	hauski-core.service – API & Orchestrator
	•	hauski-gateway.service – Prompting & Routing
	•	hauski-llm.service – Modell‑Runner
	•	hauski-indexd.service – Index & Suche
	•	hauski-daemon.service – backup/bench/audio/comm/commentary
	•	hauski-bridge.service – Weltgewebe‑Verbindung

2.6 Audio‑Stack
	•	PipeWire für Routing, EasyEffects für EQ/NR/Kompressor, MOTU M2 als Interface.
	•	Profile: Hi‑Fi (Qobuz), Unterricht (Loopback+Mic), Aufnahme (Low‑Latency, Hi‑Res).

2.7 Sicherheit
	•	Egress‑Policy (deny‑by‑default), Whitelists, Rate‑Limits.
	•	Secrets via age/sops, keine Klartext‑Tokens.
	•	Sandbox: Runner in eigener cgroup/Namespace, optional ohne Netz.
	•	Audit‑Logs: signierte JSON‑Lines, Hash‑Verkettung.

⸻

3) Betrieb & Qualität

3.1 KPIs
	•	ASR: WER ≤ 10 % bei Studio‑Sprache.
	•	LLM‑Latenz: lokal < 400 ms (8B‑Klasse, kurze Antworten).
	•	GPU‑Thermik: < 80 °C unter Dauerlast, dGPU‑Power ≤ 220 W bei ASR/LLM‑Mix.
	•	Kommentar‑Signal: ≥ 80 % der Einblendungen werden nicht weggeklickt.
	•	PR‑Drafter: Reviewer‑Zeit −30 %.

3.2 Risiken & Abwehr
	•	Over‑Notification → Δ‑Schwellen, Cooldowns, Quiet‑Power‑Modus.
	•	Datenleck → harte Egress‑Policy, Red‑Team‑Tests, RBAC.
	•	Modell‑Drift → policies/ & models.yml Git‑versioniert, Canary‑Rollouts.
	•	Energie/Hitze → Scheduler, Nacht‑Batches, Power‑Limits.

3.3 Roadmap (Priorisierung)

P1 (jetzt): Core+Gateway+Runner Basis · Whisper→Obsidian‑Auto‑Verlinkung · PR‑Drafter · Audio‑Profile · No‑Leak‑Guard.

P2 (nächste 6–10 Wochen): Indexd (Semantik) · Graph‑Lint & Canvas‑Diff · On‑the‑fly‑Kommentierung (Quiet‑Default) · E‑Mail/Matrix‑Integration.

P3 (später): CI/CD‑Kurator · Weltgewebe‑Bridge (GeoJSON/NATS) · Luthier‑Agent · Fortgeschrittene Memory‑Verdichtung · Federation.

⸻

4) Anhänge

4.1 Projektstruktur (Start)

hauski/
├─ core/ gateway/ llm-runner/ indexd/
├─ daemon/{backup,bench,audio,comm,commentary}
├─ bridge/ plugins/{obsidian,vscode} cli/ infra/
└─ policies/ models.yml README.md

4.2 Beispiel models.yml

llms:
  - id: llama3.1-8b-q4
    engine: llama.cpp
    path: /models/llama3.1-8b-q4.gguf
    max_ctx: 8192
    gpu_layers: auto
asr:
  - id: whisper-medium-de
    engine: whisper.cpp
    path: /models/whisper/medium.bin
embeddings:
  - id: bge-small
    engine: local
    path: /models/emb/bge-small

4.3 Beispiel Policy policies/routing.yaml

rules:
  - name: private-notes-local-only
    when: source in ["obsidian", "local_files"]
    action: require_local: true
  - name: long-synthesis
    when: tokens_out > 2000
    action: prefer: cloud
budgets:
  month_usd: 0  # lokal-only default
  hard_stop: true


⸻

Meta‑Hinweise (Transparenz)
	•	Unsicherheitsgrad: gering–mittel (Messenger‑APIs können sich ändern; Diarisierung je nach Lizenz/Modell).
	•	Kontrastvektor: Radikale Minimal‑Variante: nur Whisper→Obsidian, PR‑Draft, Graph‑Lint, Health‑Daemon.
	•	Negationsprojektion: „Cloud‑Only ist billiger und simpler; lokal ist Overkill.“
	•	Auditmarker: P1‑Tasks sind grob; nächste Iteration liefert konkrete Commands/Unit‑Files.