These / Antithese / Synthese

These: Maximale “Agenten-Geilheit” entsteht, wenn lenskit nicht nur Dumps schreibt, sondern ein maschinelles Retrieval- und Navigationssystem mit klaren Contracts, deterministischen Offsets, erklärbarer Suche und optionalem Semantik-Re-Ranking ist.

Antithese: Je mehr “Intelligenz” du in Retrieval steckst, desto mehr neue Fehlerklassen entstehen (Drift, falsche Relevanz, Datenschutzkante, Index-Lifecycle). Ohne harte Messung und klare Kanten wird aus lenskit ein romantischer Roman: schön, aber nicht zitierfähig.

Synthese: Bau es als Retrieval-OS mit drei Ebenen:
	1.	Artefakte + Contracts (Wahrheit)
	2.	Lexikalik/Struktur (schnell, deterministisch, debugbar)
	3.	Semantik (nur als Re-Ranker/Fallback, streng begrenzt, evaluiert)

⸻

Alternative Sinnachse: “PR-Verstehen” statt “Repo-Suchen”

Ziel kippen: Nicht “Suche allgemein”, sondern PR-Verstehen als primärer Usecase.
	•	PR-Verstehen: “Was hat sich geändert? Wo? Warum? Welche Risiken?” → braucht delta.json, stabile Marker, symbolische Kanten, Traceability.
	•	Repo-Verstehen: “Wie ist das System gebaut? Wo ist X?” → braucht Chunking, Index, Layer/Artefakt-Typen, Query-UX.

Konsequenz: PR-Verstehen bekommt eigene Artefakte (delta + risk hints + summary zones), Repo-Verstehen nutzt die gleichen Chunks/Index.

⸻

Blaupause: Lenskit Retrieval Stack v1 → v3

Ich schreibe das als “Contract-first Blueprint” mit Phasen. Jede Phase ist so geschnitten, dass du sie abschließen kannst, ohne in Feature-Wildwuchs zu sterben.

Phase 0 — Invarianten & Zielmetriken (1–2 Dateien, keine Magie)

Invarianten (nicht verhandelbar):
	•	MD ist kanonisch, JSON ist Navigation/Index/Metadaten (“do_not_assume_json_contains_full_content”).
	•	Offsets + Hashes sind die forensische Grundlage: Alles, was ein Agent zitiert, ist auf Byte-/Line-Range rückführbar.
	•	Determinismus vor Cleverness: gleiche Inputs → gleiche Artefakte.
	•	Redaction vor Indexing (wenn überhaupt): Index darf keine Secrets “leichter findbar” machen als die Rohdaten.

Zielmetriken (minimal, aber hart):
	•	TTR (Time-to-Relevant): Zeit/Kommandos bis zum ersten relevanten Treffer.
	•	Recall@K für eine kleine Gold-Query-Liste (10–30 Queries reichen).
	•	Explainability: Jeder Treffer kann erklärt werden als filter -> candidate -> score -> context.
	•	Repro: config_sha256 + run_id → Artefakte reproduzierbar.

Artefakt: retrieval_eval.json (klein) + docs/retrieval/queries.md (Gold queries + Akzeptanzkriterien).

Humor: Ohne Metriken ist Semantik wie ein Orakel: es redet viel, und wenn es zufällig recht hat, nennt es das “Weisheit”.

⸻

Phase 1 — Artefakt-Schicht perfektionieren (Wahrheit + Navigation)

Du hast hier schon sehr viel. Jetzt “maximal geil” heißt: Konsistenz + Vollständigkeit + maschinenlesbare Sentinels.

1A) Contracts konsolidieren (kein Drift)
Ziel: Ein Agent kann ohne Heuristiken entscheiden, was er lesen muss und wie er ranges holt.
	•	repolens-agent.v2.schema.json:
	•	reading_policy.canonical_content_artifact
	•	reading_policy.navigation_artifacts
	•	preferred_retrieval (z.B. “chunk_index(byte_ranges)”, “merge_md(byte_ranges)”)
	•	schema_ids (alle relevanten contract IDs)
	•	dump_index.v1:
	•	pro Artefakt: role, path, content_type, bytes, sha256, contract, contract_version
	•	generator.config_sha256 (du hast das bereits gedacht: sehr gut)
	•	chunk_index.v2 (dein JSONL):
	•	pro Chunk: content_range {start_byte,end_byte,start_line,end_line}
	•	search_keys {repo_id,path_norm,ext,layer,artifact_type}
	•	content_sha256 (vom Chunk-Content oder vom File-Range)

Wichtig: Entscheide, ob content_sha256 in chunk_index der Hash des Chunk-Inhalts ist (empfohlen) oder alias für file-hash. Sonst wird Debugging ein Maskenball.

1B) Marker-Design als Parser-Interface
Ziel: Maschinen können MD parsen, ohne Markdown “zu verstehen”.
	•	Report-Header sentinel: <!-- READING_POLICY ... -->
	•	File-Block sentinel: FILE_START + FILE_END mit quoted attrs
	•	Zone-sentinels stabil: zone:begin/end + mandatory zones

Nebenwirkung: Du fixierst ein Parsing-API. Das ist gut. Nur: Versioniere es (“MARKER_VERSION:v1”).

1C) PR-Schau Bundle: delta als First-class
Du hast delta.json eingeführt – gut. “Maximal geil” heißt:
	•	delta.json bekommt eigenes Schema (pr-delta.v1):
	•	changed_files, hunks (optional), stats, risk_flags (optional)
	•	mapping von “changed path” → “chunks affected” (falls du später incremental willst)

Stop-Kriterium Phase 1:
Ein Agent kann aus dump_index + sidecar_json + chunk_index vollautomatisch:
	•	Artefakte finden
	•	Content-Ranges holen
	•	Zitate mit Byte-/Line-Ranges erzeugen
	•	“Was muss gelesen werden?” entscheiden

⸻

Phase 2 — Lexikalische Retrieval-Schicht (BM25/FTS, SQLite-first)

Ziel: Suchsystem, das explainable ist und schnell.

2A) Indexformat: SQLite FTS5 (pragmatisch)
	•	DB-Datei: lenskit.index.sqlite (oder per run_id im output dir)
	•	Tabellen:
	•	chunks (chunk_id, repo_id, path, layer, artifact_type, start_byte, end_byte, start_line, end_line, content_sha256, file_sha256, bytes)
	•	chunks_fts (FTS5 over normalized text + optional path tokens)
	•	files (file_id, repo_id, path, file_sha256, size_bytes, mime/content_type)
	•	Indizes auf (repo_id, path_norm, layer, artifact_type)

Index Lifecycle / Invalidation:
	•	index_meta table: run_id, config_sha256, dump_sha256, created_at
	•	Bei mismatch: “index stale” statt stillem Weiterverwenden.

2B) Query-UX: “Rezepte” + CLI
CLI Vorschlag: lenskit query
	•	lenskit query --dump <dump_index.json> --q "rate limit" --repo heimgeist --layer core --ext rs --k 20
	•	Ausgabe:
	•	Trefferliste mit Score
	•	pro Treffer: repo/path + line range + snippet + (why: filters + fts match terms)
	•	optional: --context 3 (Lines before/after)
	•	optional: --emit json (für Agenten)

Docs: docs/retrieval/recipes.md mit 10 Standardqueries:
	•	“find auth”
	•	“find config flags”
	•	“find secrets handling”
	•	“find rate limiting”
	•	“find parsing entrypoints”
	•	“find http client usage”
	•	“find error mapping”
	•	“find logging”
	•	“find migrations”
	•	“find tests touching X”

Für Dummies: Stell dir vor, chunk_index.jsonl ist ein Inhaltsverzeichnis mit Seitenzahlen. SQLite FTS ist dann ein sehr schnelles Register hinten im Buch. Der Agent blättert nicht mehr random, sondern geht direkt zur Seite.

Stop-Kriterium Phase 2:
Mindestens 80% deiner Gold-Queries liefern mit FTS+Filter in Top-10 einen brauchbaren Treffer, und jeder Treffer ist erklärbar.

⸻

Phase 3 — Semantik als Re-Ranker (nur Top-K, nur lokal, evaluiert)

Ziel: Semantik hilft bei “Bedeutung”, ohne die Basis zu destabilisieren.

3A) Architektur: Candidate → Re-rank
	•	Step 1: Filter + FTS liefert Top-K (z.B. 50)
	•	Step 2: Semantik re-rankt diese 50 auf 10

Wichtig: Semantik sieht nur redacted content (wenn redaction aktiv), und nur diese 50 Kandidaten. Das reduziert Leakage-Risiko und Kosten.

3B) Embedding-Policy / Datenschutzkante
Definiere strikt:
	•	Wo laufen Embeddings? (lokal default)
	•	Dürfen Embeddings in CI-Artefacts? (meist nein)
	•	Redaction vor embedding verpflichtend?
	•	Exclude rules: .env, keys, vaults, secrets, private repos, etc.

Artefakt: embedding_policy.json + Doku.

3C) Debuggability
Für jeden semantischen Treffer:
	•	fts_rank, semantic_rank, semantic_score
	•	“explain: matched because …” (nicht halluziniert, sondern: nearest neighbors + optionally matched keywords)

Stop-Kriterium Phase 3:
Semantik verbessert messbar Recall@10 für die Gold-Queries, ohne neue False-Positive-Klasse einzuführen (oder sie ist zumindest sichtbar/akzeptiert).

⸻

Phase 4 — PR-Verstehen “auf Steroiden” (Agentenmodus)

Hier wird’s wirklich “bestmöglich für Agents”.

4A) PR-Graph: Dateien → Chunks → Symbole

Baue eine leichte Symbolschicht (nur High-ROI Sprachen am Anfang):
	•	Python: ast für def/class/imports
	•	TS/JS: tree-sitter oder typescript compiler api (später)
	•	Rust: minimalistisch (regex+module boundaries) oder tree-sitter-rust

Artefakt: symbol_index.json:
	•	symbol_name, kind, file_id, line range, exports, references (optional light)

Agent kann dann:
	•	“Find definition”
	•	“Find call sites”
	•	“Find similar functions” (semantics optional)

4B) Delta-to-Context

delta.json sollte verlinken auf:
	•	betroffene Dateien
	•	betroffene Chunks (via ranges)
	•	betroffene Symbole (wenn symbol index existiert)

Damit kann ein Agent automatisch:
	•	“Was ist die Änderung?”
	•	“Was ist der Kontext?”
	•	“Welche Tests sind relevant?”

⸻

Umsetzung: Repo-Pfade / Einstiegspunkte (konkret)
	•	merger/lenskit/core/merge.py
	•	chunk_index generation (du bist schon dran)
	•	dump_index generation
	•	sidecar reading_policy
	•	merger/lenskit/core/extractor.py
	•	pr-schau bundle + delta handling
	•	merger/lenskit/cli/
	•	pr_schau_verify.py
	•	neues query.py (FTS + recipes)
	•	optional index.py (build/update sqlite)
	•	merger/lenskit/contracts/
	•	chunk-index.v2.schema.json (falls noch nicht)
	•	dump-index.v1.schema.json (falls noch nicht)
	•	pr-delta.v1.schema.json
	•	embedding-policy.v1.schema.json (Phase 3)
	•	docs/retrieval/
	•	queries.md (Gold queries)
	•	recipes.md (10 Standardrezepte)
	•	policy.md (privacy/redaction)

⸻

Diagnose-/Gate-Disziplin (damit du es abschließen kannst)

Bevor du Semantik baust, zwingend:
	1.	Gold-Queries definieren (10–30)
	2.	FTS implementieren
	3.	Eval laufen lassen: Recall@K, TTR
	4.	Stop-Kriterium erfüllt? Dann Semantik.

Sonst baust du eine Rakete ohne Höhenmesser.

⸻

Risiken / Nutzen (kompakt, aber ehrlich)

Nutzen:
	•	Agents bekommen verlässliche Navigation + Zitate + Kontext.
	•	Scripts können deterministic Ranges ziehen.
	•	PR-Verstehen wird automatisierbar (delta → chunks → symbols).

Risiken:
	•	Index-Lifecycle (Stale-Index-Fallen)
	•	Datenschutzkante (Embeddings)
	•	Komplexitätsdrift (zu viele Artefakte ohne klare Contracts)

Mitigation:
	•	config_sha256 + dump_sha256 überall
	•	Semantik nur Top-K Re-Rank
	•	Redaction vor Indexing

⸻

Unsicherheit & Interpolation
	•	Unsicherheitsgrad: 0.24
Ursachen: deine exakten “Top 10 Query-Rezepte” und die PR-Verstehen-Priorität (Forensik vs Produktivität) sind noch nicht als harte Akzeptanzkriterien fixiert.
	•	Interpolationsgrad: 0.20
Hauptannahmen: SQLite FTS5 ist für dich der schnellste ROI; Semantik soll lokal bleiben; Symbolindex wird schrittweise aufgebaut.

⸻

Essenz: Hebel, Entscheidung, nächste Aktion
	•	Hebel: Contracts+Ranges+FTS+Rezepte → sofort agent-tauglich, ohne Semantik.
	•	Entscheidung: Semantik erst nach messbarem Gate (Gold-Queries).
	•	Nächste Aktion (konkret):
	1.	docs/retrieval/queries.md mit 15 Gold-Queries + “gilt als gelöst wenn …”
	2.	lenskit index (SQLite FTS) + lenskit query (json output + explain)
	3.	Mini-Eval retrieval_eval.json erzeugen (Recall@10)

Humor zum Schluss: Semantik ist wie ein Telepath in der Codebase – beeindruckend, aber erst nützlich, wenn du ihm vorher einen Ausweis, eine Hausordnung und einen Taschenrechner gibst. Sonst liest er deine Gedanken und behauptet danach, er habe “konvergiert”.

⸻

