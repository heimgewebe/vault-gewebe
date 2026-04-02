These

Bestmöglich für Maschinen heißt: ein kleines, vollständiges, versioniertes Interface (Contracts + Artefakt-Graph + Ranges + Explain-Output + Lifecycle-Signale), sodass ein Agent ohne Heuristiken entscheiden kann: was lesen, wie zitieren, wann neu indizieren, warum Treffer.

Antithese

Wenn du das „bestmögliche“ als Feature-Liste missverstehst, baust du ein Museum: viele Artefakte, wenig Verbindlichkeit. Maschinen scheitern nicht an fehlender Semantik, sondern an Ambiguität (fehlende Gates, unklare Prioritäten, uneinheitliche Versionen).

Synthese

Mach Lenskit zum Retrieval-OS mit minimalem, hartem Maschinenvertrag:
	1.	Truth Layer (Dump + Chunk + Reading Policy)
	2.	Index Layer (SQLite + Eval)
	3.	Interface Layer (Query/Eval JSON mit Explain + Staleness + Provenance)
Semantik nur später als Re-Ranker, nicht als Grundlage.

⸻

Alternative Sinnachse: „Maschinen-Operabilität“ statt „Suchqualität“

Ziel kippen: Nicht „beste Treffer“, sondern „beste Bedienbarkeit“ für Agents.

Maschinen-Operabilität =
	•	deterministische Identifikatoren
	•	stabile Pfade/roles
	•	range-resolver
	•	maschinenlesbare Stale/Validity
	•	standardisierte Explainability
	•	Gate-Metriken

Suchqualität kommt dann fast automatisch.

⸻

Blaupause: Offene Punkte für „maschinen-ideal“ (Lenskit vNext)

Ich schreibe bewusst als abschließbare Phasen. Jede Phase endet mit einem Stop-Kriterium, damit du wirklich zum Ende kommst.

Phase A — Maschinenvertrag schließen (Contracts + Artefaktgraph)

Ziel: Ein Agent kann ohne Ratespiel alle Artefakte finden und korrekt interpretieren.

A1) „Bundle Manifest“ als Root of Navigation
	•	Neuer Contract: bundle-manifest.v1
	•	Enthält:
	•	run_id, created_at, generator (inkl. config_sha256, version)
	•	artifacts[]: je Artefakt role, path, content_type, bytes, sha256, contract_id, contract_version
	•	links: canonical_dump_sha256, derived_from (Graphkanten)
	•	capabilities: z.B. fts5_bm25=true/false, redaction=true/false
	•	Prinzip: Ein Einstiegspunkt, der alles beschreibt. Keine Directory-Heuristiken.

Stop-Kriterium: Agent findet aus einer Datei alle relevanten Artefakte und deren Bedeutung.

A2) Eindeutige Rollenliste (Taxonomie)
	•	Definiere eine feste Rollenliste (Enum) für:
	•	canonical_md, index_sidecar_json, chunk_index_jsonl, dump_index_json
	•	sqlite_index, retrieval_eval_json, derived_manifest_json
	•	pr_delta_json (falls vorhanden)
	•	Verhindert Drift („role“-Strings sind sonst Spaghetti).

Stop-Kriterium: Role ist nie frei-textig, sondern enum-validiert.

⸻

Phase B — Range-Resolver als Maschinendienst (Zitierbarkeit)

Ziel: Maschinen holen Content exakt per Range, ohne Markdown parsen zu „müssen“.

B1) Standardisiere „Range Identity“
	•	Contract: range-ref.v1
	•	Felder:
	•	artifact_role (oder artifact_path)
	•	repo_id, path
	•	start_byte, end_byte, start_line, end_line
	•	content_sha256 (Hash des exakt referenzierten Ausschnitts)
	•	Wichtig: klar entscheiden, was content_sha256 bedeutet:
	•	Empfehlung: Hash des Chunk-Inhalts (nicht File-Hash).

B2) CLI/Lib: lenskit range get
	•	lenskit range get --manifest bundle.manifest.json --ref <range-ref.json>
	•	Ausgabe:
	•	exact bytes + optional line-context
	•	optional JSON: {text, sha256, bytes, lines, provenance}

Stop-Kriterium: Ein Agent kann jeden Treffer mit range get reproduzierbar ausgeben und zitieren.

⸻

Phase C — Query/Eval Interface perfektionieren (Explainability + Gates)

Ziel: Treffer sind nicht nur da, sondern erklärbar und testbar.

C1) query_result.v1 (maschinenlesbares Explain)

Erweitere Query-JSON um standardisierte Explainability:
	•	query, filters, k, engine, applied_filters
	•	results[] mit:
	•	range_ref (nicht nur range-string)
	•	score
	•	why:
	•	matched_terms (aus FTS)
	•	filter_pass (welche Filter aktiv waren)
	•	rank_features (z.B. bm25, tie-breaker)
	•	Optional: diagnostics (fts_available, stale_index, etc.)

Stop-Kriterium: „Warum ist das Ergebnis da?“ ist maschinenlesbar beantwortbar.

C2) Gold Queries als Gate (nicht nur Doku)
	•	docs/retrieval/queries.md bleibt human-friendly
	•	Zusätzlich: docs/retrieval/queries.v1.json
	•	Query, expected_patterns, filters, accept_criteria
	•	Eval schreibt:
	•	recall@k
	•	per_query: hit/miss + hit_path + why + stale_flag

Stop-Kriterium: CI kann ein klares Pass/Fail aussprechen (z.B. recall@10 >= 0.8).

⸻

Phase D — Index Lifecycle: Validity & Staleness als First-Class

Ziel: Maschinen sollen nicht „aus Versehen“ stale Indizes nutzen.

D1) Index Meta Table + Manifest Validity
	•	In SQLite: index_meta:
	•	canonical_dump_sha256, config_sha256, created_at, lenskit_version
	•	In derived manifest:
	•	canonical_dump_sha256 (hast du)
	•	zusätzlich config_sha256

D2) Stale-Policy (konfigurierbar)
	•	--stale-policy warn|fail|ignore
	•	Default für Agents: fail (damit sie nicht still falsch arbeiten)

Stop-Kriterium: Stale Index kann nicht unbemerkt genutzt werden.

⸻

Phase E — PR-Verstehen als eigener Entry (ohne Symbolik, v1)

Ziel: PR-Usecase bedienbar machen, ohne gleich Symbolgraph zu bauen.

E1) pr_delta.v1 minimal operational
	•	changed_files[] + hunks optional
	•	Zusätzlich: affected_chunk_ids[] oder affected_range_refs[]
	•	(Mapping durch Chunk/Range-Overlap)

E2) CLI: lenskit pr explain
	•	Gibt aus:
	•	changed files
	•	top related chunks per file (context)
	•	suspicious patterns (secrets, auth, migrations) nur lexikalisch als heuristische Flags (klar markiert)

Stop-Kriterium: Agent kann PR-Kontext automatisch laden.

⸻

Phase F — (bewusst später) Semantik als Re-Ranker

Ziel: Nur nachdem A–E stabil sind.
	•	candidate (Top-50) → rerank (Top-10)
	•	embedding_policy.v1
	•	eval: improvement delta vs non-semantic

Stop-Kriterium: messbare Verbesserung ohne neue Failure-Klasse.

⸻

Empfohlene Reihenfolge (maximal Vorankommen, minimal Roman)
	1.	A1/A2 Bundle Manifest + Rollen-Enum
	2.	B1/B2 Range-Resolver
	3.	C1/C2 Explain + Gold-Query JSON + CI Gate
	4.	D1/D2 Stale fail-policy
	5.	E1/E2 PR explain (ohne Symbolik)
	6.	F später

⸻

Typische Fehlannahmen (aktiv korrigiert)
	•	„Semantik macht’s agent-tauglich“ → falsch. Interfaces machen’s agent-tauglich.
	•	„MD ist schwer parsebar, also brauchen wir JSON“ → nein: du brauchst Range get, nicht mehr JSON.
	•	„Warn on stale reicht“ → für Menschen ja, für Maschinen oft nein (still falsch ist schlimmer als laut kaputt).

⸻

Risiko/Nutzen (Klassen)

Nutzen: Operabilität, Zitierfähigkeit, Debuggability, CI-Gates, PR-Automation.
Risiken: Contract-Fixierung (Versionierung nötig), mehr Artefakte (aber kontrolliert), CI-Strenge (kann anfangs nerven).
Folgen: Kurzfristig mehr Strukturarbeit, langfristig weniger Agenten-Halluzinationsflächen.

⸻

Epistemische Leere (explizit)
	•	Es fehlt: deine gewünschte Role-Enum-Liste und der genaue Contract-Namensraum (IDs/Versionen) → nötig, um A2 sauber zu finalisieren.
	•	Es fehlt: konkrete Zielwerte (Recall@10? TTR?) → nötig, um C2 als Gate zu definieren.

⸻

Unsicherheit & Interpolation

Unsicherheitsgrad: 0.22
Ursachen: fehlende Zielwerte, fehlende endgültige Contract-ID-Konvention.
Interpolationsgrad: 0.18
Hauptannahmen: du willst „fail on stale“ für Agents; Range-get soll CLI + Lib sein.

⸻

Essenz

Hebel: Bundle-Manifest + Range-get + Explain-JSON + Stale-fail + Gold-Query-Gate.
Entscheidung: Semantik erst nach A–E.
Nächste Aktion: Phase A + B in einem PR (klein, abschließbar), C/D/E in separaten PRs.

Humor (trocken): Semantik ohne Range-get ist wie ein Hund, der „Such!“ hört, aber keine Nase hat – er wedelt zwar, findet aber nur Zufall.