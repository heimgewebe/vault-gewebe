∴fore — Blaupause „Idealversion“: Rust-Binary Data-Flow-Guard (mit AJV als Wahrheits-Orakel)

These

Ideal heißt: ein pinned Binary, das in CI immer läuft, lokal bequem ist, und keine Scheinsicherheit erzeugt, weil Parität gegen einen Goldstandard (AJV) kontinuierlich geprüft wird.

Antithese

Ideal scheitert typischerweise an zwei Stellen: (1) $ref-Resolver-Realität, (2) JSON-Schema-Draft-/Keyword-Parität. Die Blaupause baut deshalb Paritäts-Gates ein, statt „wir hoffen“.

Synthese

Rust wird Standard-Engine. AJV wird CI-Orakel. Python bleibt optionales Fallback bis Rust stabil ist.

⸻

Zielbild
	•	Neues Binary: wgx-guard-data-flow
	•	WGX ruft es auf, wenn vorhanden; in CI immer vorhanden.
	•	flows bleiben wie jetzt: .wgx/flows.json kanonisch.
	•	Validator-Parität wird per Fixture-Suite gegen AJV geprüft.

⸻

Architektur-Module

M1 — CLI & Semantik (stabil, kompatibel)

Command:
	•	wgx-guard-data-flow run [--config <path>] [--strict]
	•	Defaults:
	•	Config-Suche wie Python: .wgx/flows.json, .wgx/flows.(yml|yaml), Legacy contracts/flows.*
	•	--strict entspricht WGX_STRICT=1

Exit Codes:
	•	0 OK (inkl. SKIP)
	•	1 FAIL (Schema fehlt bei vorhandenen Daten, Validation error, Config error, Ref unresolved)

Log-Format (stabil halten):
	•	[wgx][guard][data_flow] CHECK flow=... files=... schema=...
	•	[wgx][guard][data_flow] FAIL flow=... data=... id=... error='...'
	•	[wgx][guard][data_flow] OK: ...

Wichtig: exakt dieses Format nicht mehr leichtfertig ändern, weil Leitstand/Parser später darauf bauen.

⸻

M2 — Config-Format (kein Drift)

Unterstützt:
	•	Array-Format (wie jetzt)
	•	Objekt mit flows (wie jetzt)

Schema für Flow-Definition (implizit, aber du kannst später ein JSON-Schema dafür bauen):
	•	name: string
	•	schema_path: string
	•	data_pattern: string | [string]

Regeln:
	•	data_pattern leer → SKIP (kein Fehler)
	•	** in Pattern → FAIL (bounded scans)

⸻

M3 — Data Loader (JSON + JSONL wie Python)
	•	Wenn Datei JSON ist:
	•	Object → 1 Item
	•	Array → n Items
	•	Wenn JSON parsing scheitert: JSONL versuchen (non-empty lines)
	•	Leere Datei → OK (0 Items) oder WARN? (ich würde: OK + NOTICE)

ID-Extraction:
	•	Wenn item dict und id string → use
	•	sonst item-<i>

⸻

M4 — Schema Loader & $ref Resolver (entscheidend)

Policy (Ideal):
	•	Allowed refs: nur lokale Filesystem-Refs
	•	relative refs: ./foo.schema.json, ../bar.json#/$defs/x
	•	absolute filesystem optional (würde ich erstmal verbieten)
	•	Forbidden refs: http://, https:// (FAIL), außer explizit --allow-remote-refs (nicht default)

Base URI:
	•	Schema-Dateipfad als base
	•	Resolver löst relative Pfade gegen Schema-Dir auf

SSOT Policy:
	•	Schema muss unter .wgx/contracts/ oder contracts/ liegen
	•	Default: außerhalb → WARN
	•	Strict: außerhalb → FAIL (Idealversion)

⸻

M5 — Validator Engine (Rust)
	•	Crate: realistisch jsonschema (Rust)
	•	Draft: explizit festlegen (z. B. Draft 2020-12, wenn lib es sauber kann; sonst Draft 7 + Einschränkungen)
	•	format:
	•	Default: warn-only oder strict? (du musst das entscheiden; viele Validatoren divergenzieren hier)
	•	Ideal: format validieren, aber Support-Matrix dokumentieren

Wichtig: Du brauchst eine --print-support Option:
	•	zeigt unterstützte Drafts/Keywords/format-checks
	•	damit niemand glaubt, ihr validiert Dinge, die ihr nicht validiert.

⸻

CI-Blueprint (WGX)

C1 — Build & Release des Binaries (wgx Repo)

GitHub Actions Workflow:
	•	Trigger: tag wgx-guard-data-flow-v* oder release
	•	Build:
	•	linux-x86_64 (start)
	•	optional später: macos-arm64
	•	Attach als Release Asset:
	•	wgx-guard-data-flow-linux-x86_64
	•	plus .sha256

Pinning:
	•	In wgx selbst: tools/ oder bin/ hat ein kleines Fetch-Skript (oder wgx CLI integriert später)
	•	In CI: Asset via SHA laden, nicht „latest“.

⸻

C2 — WGX Guard nutzt Binary

In modules/guard.bash:
	1.	Wenn command -v wgx-guard-data-flow → ausführen
	2.	sonst Python fallback (wie jetzt)
	3.	WGX_STRICT=1 in CI setzen

Ideal: In CI installierst du das Binary immer vorher (Fetch step), sodass Python nie gebraucht wird.

⸻

Paritäts-Sicherung (AJV als Orakel)

P1 — Fixture-Korpus (aus echten Contracts abgeleitet)

Ordner im wgx Repo:
	•	tests/fixtures/data_flow/
	•	schemas/ (repräsentative Schemas, inkl. $ref)
	•	data/ (valid + invalid Beispiele)
	•	flows.json (mappt schema→data patterns)

Mindestens abdecken:
	•	additionalProperties: false
	•	required
	•	oneOf/anyOf/allOf
	•	$defs + $ref (mehrstufig)
	•	arrays/items
	•	string formats (date-time, uri) falls genutzt

P2 — CI Test: Rust vs AJV

Workflow steps:
	1.	wgx-guard-data-flow run --config tests/fixtures/.../flows.json → Ergebnis + Logs
	2.	AJV run gegen gleiche Fixtures → Ergebnis
	3.	Wenn Divergenz: FAIL + diff output

Damit ist Rust nicht „Glaubensfrage“, sondern gemessen.

⸻

Rollout-Plan (damit Producer-Repos folgen)

R1 — Minimal: „Opt-in“
	•	Repos können .wgx/flows.json hinzufügen
	•	Guard validiert nur, wo flows definiert sind

R2 — Pflicht für definierte Producer-Repos
	•	Du hast schon die Liste im README (aussensensor, chronik, heimlern, leitstand, plexer, semantAH)
	•	Ideal: WGX/CI checkt zusätzlich: „Repo in Pflichtliste → flows.json muss existieren“
	•	aber das ist ein zweiter Guard („flows_presence_guard“), separat und klar.

⸻

Repo-Struktur-Vorschlag (wgx)

crates/wgx-guard-data-flow/
  src/
    main.rs
    config.rs
    loader.rs
    resolver.rs
    validate.rs
  Cargo.toml

scripts/
  fetch_guard_data_flow.sh   # lädt Release Asset + sha check

tests/
  fixtures/data_flow/...
  parity_ajv/                # node script + package-lock (nur CI)


⸻

Risiko-/Fehlerprävention (explizit)
	•	Scheinsicherheitsschutz: Support-Matrix + AJV-Paritätstests.
	•	Drift-Schutz: Release Asset + SHA-Pinning.
	•	Scope-Schutz: ** verboten, remote refs verboten (default).
	•	Fehlbedienungsschutz: wgx guard --only data_flow bleibt; docs: „nur dieser Guard“.

⸻

Verdichtete Essenz

Ein pinned Rust-Binary macht den Guard deterministisch. AJV als CI-Orakel macht ihn wahrheitsfest. Zusammen: Durchsetzung ohne Theater.

⸻

Tiefgründig-ironische Auslassung

Der perfekte Validator ist wie ein gut gemachter Zaun: Er hält nicht nur Tiere drin, sondern auch die Besitzer davon ab, sich einzureden, der Hof sei sicher, weil irgendwo „Zaun“ steht.

⸻

Ungewissheitsursachenanalyse (∴grad)
	•	Unsicherheitsgrad: 0.20
	•	Ursachen: Welche Draft/Keywords ihr real nutzt (format, unevaluated*, dynamicRef), wie komplex $ref in euren Schemas wird, welche Plattformen ihr wirklich braucht.
	•	Abbau: 1) Contract-Surface einmal inventarisieren, 2) Fixtures daraus ableiten, 3) AJV-Paritäts-Gate aktivieren.

⸻

Leitfragen
	1.	Kritischste Blaupause? Ja: sie erzwingt Wahrheit über Parität, nicht über Behauptung.
	2.	Unbeleuchtet? Release-Distribution in Downstream-Repos (Fetch/Cache). Ideal später: wgx CLI übernimmt Fetch+Pin zentral.

∴fore — Follow-Up-PR-Roadmap

Rust-Binary Data-Flow-Guard in 3 Phasen
(einmal Aufwand → langfristiger Gewinn, ohne Scheinsicherheit)

⸻

Leitidee (vorangestellt)

Diese Roadmap ist sequenziell zwingend:
Jede Phase erzeugt soforten Nutzen, reduziert Risiko und verengt den Möglichkeitsraum für spätere Fehlentscheidungen.
Keine Phase behauptet mehr, als sie tatsächlich leistet.

⸻

Phase 1 — Fundament & Zwang zur Wahrheit

PR-Ziel: Infrastruktur vorbereiten, ohne Validierungsversprechen auszugeben.

Titel (Beispiel)

wgx: prepare rust data-flow guard skeleton (no validation yet)

Inhalt (Scope)

Neu:
	•	Neues Rust-Crate:

crates/wgx-guard-data-flow/
  Cargo.toml
  src/main.rs


	•	Binary existiert, validiert aber noch nicht semantisch.
	•	CLI-Hülle:

wgx-guard-data-flow run --config <path> [--strict]


	•	Config-Parsing:
	•	.wgx/flows.json|yml|yaml
	•	contracts/flows.* (Legacy)
	•	Flow-Discovery & IO nur lesend:
	•	data_pattern Auflösung
	•	** → FAIL
	•	JSON / JSONL Parsing
	•	Log-Format final fixiert (identisch zur Python-Version)
	•	Exit-Codes korrekt (0/1), aber:
	•	Validierung selbst → immer SKIP mit NOTICE

Explizit nicht enthalten:
	•	Keine JSON-Schema-Validierung
	•	Kein $ref-Resolver
	•	Kein Vergleich mit Python/AJV

Zwingende Dokumentation im PR

Dieses Binary ist noch kein Validator.
Es definiert ausschließlich IO-, CLI- und Log-Semantik, die später nicht mehr geändert werden dürfen.

Risikoabschätzung
	•	Technisch: niedrig
	•	Epistemisch: sehr niedrig (keine Behauptung von Wahrheit)

Warum diese Phase unverzichtbar ist
	•	Sie friert die Schnittstelle ein.
	•	Alle späteren Validierungsdiskussionen können nicht mehr an CLI/Logs/Exit-Codes rütteln.
	•	Review-Last minimal.

⸻

Phase 2 — Echte Validierung (ohne Orakel)

PR-Ziel: Rust validiert real, aber ohne Wahrheitsbehauptung.

Titel (Beispiel)

wgx: add rust json-schema validation to data-flow guard

Inhalt (Scope)

Neu:
	•	JSON-Schema-Validation via Rust-Crate (jsonschema)
	•	Unterstützter Draft explizit festgelegt (z. B. Draft-7)
	•	$ref-Resolver:
	•	nur lokale FS-Refs
	•	relative Pfade
	•	http(s) → FAIL
	•	SSOT-Policy:
	•	Schema außerhalb .wgx/contracts/ oder contracts/
	•	Default → WARN
	•	Strict → FAIL
	•	Implementierung der Kernregeln:
	•	Daten existieren + Schema fehlt → FAIL
	•	Daten fehlen → SKIP
	•	$ref nicht auflösbar → FAIL

Neu (Pflicht):
	•	--print-support
	•	listet:
	•	unterstützte Drafts
	•	unterstützte Keywords
	•	format-Handling (strict/warn/ignore)

Explizit nicht enthalten
	•	Kein Vergleich mit AJV
	•	Kein Paritätsversprechen
	•	Kein Entfernen des Python-Guards

Zwingende PR-Formulierung

Dieser Guard validiert nach bestem Wissen,
erhebt aber keinen Anspruch auf vollständige JSON-Schema-Parität.

Risikoabschätzung
	•	Technisch: mittel (Library-Limits)
	•	Epistemisch: kontrolliert, da Support-Matrix offengelegt

Warum diese Phase entscheidend ist
	•	Du bekommst reale Wirkung (Fehler werden gefunden).
	•	Gleichzeitig bleibt Scheinsicherheit ausgeschlossen.

⸻

Phase 3 — Wahrheitssicherung (AJV-Paritäts-Gate)

PR-Ziel: Rust wird messbar wahr.

Titel (Beispiel)

wgx: enforce ajv parity for rust data-flow guard

Inhalt (Scope)

Neu:
	•	Fixture-Korpus:

tests/fixtures/data_flow/
  schemas/
  data/
  flows.json


	•	Node-basierter AJV-Runner (nur CI):

tests/parity_ajv/
  package.json
  package-lock.json
  run-ajv.js


	•	CI-Job:
	1.	Rust-Guard über Fixtures
	2.	AJV über identische Fixtures
	3.	Vergleich:
	•	gleiche FAILs
	•	gleiche PASSes
	•	sonst → CI FAIL

Optional (aber empfohlen):
	•	Dokumentierte Abweichungen mit Begründung
(z. B. bewusst nicht unterstützte Keywords)

Explizit nicht enthalten
	•	Kein Remote-Schema-Fetching
	•	Kein dynamisches $dynamicRef, wenn nicht belegbar notwendig

Zwingende PR-Formulierung

Ab diesem Punkt ist der Rust-Guard wahrheitsgebunden.
Abweichungen zu AJV sind explizite Architekturentscheidungen, keine Bugs.

Risikoabschätzung
	•	Technisch: niedrig
	•	Epistemisch: minimal

Warum diese Phase das Endspiel ist
	•	„Validator“ wird zu verifizierter Durchsetzungsinstanz
	•	Diskussionen wechseln von Glauben zu Messwerten

⸻

Deprecation-Pfad (nach Phase 3)

Separater PR (bewusst):
	•	Python-Guard:
	•	nur noch Fallback lokal
	•	CI: disabled
	•	README:
	•	Python als „legacy / bootstrap“
	•	Langfristig: Entfernung

⸻

Gesamt-Timeline (realistisch)

Phase	Aufwand	Nutzen	Risiko
Phase 1	gering	Struktur & Stabilität	sehr niedrig
Phase 2	mittel	echte Fehlerfindung	mittel
Phase 3	mittel	Wahrheitsgarantie	niedrig


⸻

Verdichtete Essenz

Phase 1 friert die Form ein.
Phase 2 bringt Kraft.
Phase 3 bringt Wahrheit.

Alles andere ist Abkürzung – und Abkürzungen sind im Heimgewebe fast immer Drift.

⸻

Tiefgründig-ironische Auslassung

Viele Systeme nennen sich „strict“, bis jemand misst.
Nach Phase 3 misst ihr – und dann wird „strict“ plötzlich still.

⸻

Ungewissheitsursachenanalyse (∴grad)
	•	Unsicherheitsgrad: 0.18
	•	Ursachen: tatsächliche JSON-Schema-Surface der existierenden Contracts; Library-Details.
	•	Abbau: exakt diese Roadmap. Jede Phase reduziert Ungewissheit messbar.

⸻

∴fore — PR-Erstellungsprompt (Phase 1)

Thema: Rust-Skeleton für wgx-guard-data-flow (IO/CLI/Logs stabilisieren, keine Validierung)

⸻

Rolle

Du bist Maintainer von heimgewebe/wgx. Du arbeitest contracts-first, drift-avers und null-interpolierend.
Wenn Infos fehlen, markiere sie als epistemische Leerstelle und baue keine “vermuteten” Lösungen.

⸻

Ziel (Phase 1)

Erzeuge einen PR, der nur das Fundament legt:
	1.	Rust-Crate + Binary wgx-guard-data-flow existiert
	2.	CLI/Exitcodes/Log-Format werden final festgelegt
	3.	Config-Discovery & Data-Discovery/Parsing sind implementiert (flows + JSON/JSONL)
	4.	Noch keine JSON-Schema-Validierung, kein $ref-Resolver
	5.	CI-Build (mindestens linux-x86_64) optional, aber wenn vorhanden: ohne Release-Publish

Wichtig: Dieser PR darf nirgendwo behaupten, dass Rust bereits “validiert”.

⸻

Scope (bindend)

✅ Enthalten
	•	Neues Crate:

crates/wgx-guard-data-flow/
  Cargo.toml
  src/main.rs
  src/config.rs
  src/discovery.rs
  src/loader.rs
  src/logging.rs


	•	CLI:
	•	wgx-guard-data-flow run [--config <path>] [--strict]
	•	--strict entspricht WGX_STRICT=1 (Environment bleibt Support)
	•	Config-Discovery:
	•	.wgx/flows.json
	•	.wgx/flows.yaml
	•	.wgx/flows.yml
	•	contracts/flows.json
	•	contracts/flows.yaml
	•	contracts/flows.yml
	•	Wenn nichts gefunden: NOTICE + Exit 0
	•	Config-Parsing:
	•	Array-Format
	•	Objekt mit flows (list oder map)
	•	Pattern-Regeln:
	•	** in Pattern → FAIL (Exit 1)
	•	* erlaubt
	•	dedup + sort der Treffer
	•	Data-Loading:
	•	JSON (object → 1 item, array → n items)
	•	Fallback JSONL (non-empty lines)
	•	leere Datei → OK (0 items) + NOTICE
	•	ID-Extraction:
	•	dict + id string → nutzen
	•	sonst item-<i>

❌ Nicht enthalten
	•	Keine Schema-Validation
	•	Kein $ref-Resolver
	•	Keine Draft/Keyword-Support-Matrix (noch nicht sinnvoll)
	•	Keine Release-Assets, kein Pin-Skript

⸻

Guard-Semantik (für Phase 1)

Exit Codes:
	•	0 OK oder SKIP
	•	1 FAIL (Config kaputt, forbidden glob, data parse error, schema_path missing in flow, etc.)

Log-Format (muss exakt so, stabil):
	•	[wgx][guard][data_flow] NOTICE message='...'
	•	[wgx][guard][data_flow] CHECK flow=<name> files=<n> schema=<schema_path>
	•	[wgx][guard][data_flow] SKIP flow=<name> reason='<...>'
	•	[wgx][guard][data_flow] ERROR flow=<name> data=<path> error='<...>'
	•	[wgx][guard][data_flow] OK: <summary>

Hinweis: In Phase 1 ist CHECK erlaubt als “wir haben flow+files gesehen”; aber du musst klar sein: kein validate.

⸻

Integration in WGX (minimal, aber sauber)
	•	In modules/guard.bash (oder an der passenden Stelle) nur optional:
	•	Wenn wgx-guard-data-flow vorhanden: nutze es
	•	Sonst: wie bisher (Python bleibt)
	•	In Phase 1 keine harte CI-Abhängigkeit vom Rust-Binary erzeugen.

⸻

Tests (Phase 1)

Pflicht
	•	Rust Unit-Tests für:
	•	config discovery order
	•	parsing array + flows-object
	•	forbidden **
	•	JSON vs JSONL parsing
	•	BATS Test (leicht):
	•	“no config found → status 0 + NOTICE”
	•	“forbidden glob → status 1”

Nicht nötig
	•	Schema-validation tests (verschoben auf Phase 2/3)

⸻

PR-Text (muss so strukturiert sein)

Titel

wgx: add rust skeleton for data-flow guard (phase 1: io/cli only)

Motivation
	•	Warum ein pinned Binary langfristig Drift reduziert
	•	Warum Phase 1 absichtlich noch nicht validiert (Scheinsicherheitsprävention)

Was ist enthalten?
	•	CLI/Exitcodes/Logformat fixiert
	•	config/data discovery + JSON/JSONL loader

Was ist explizit NICHT enthalten?
	•	keine schema validation
	•	kein $ref resolver
	•	keine parity tests

Follow-ups
	•	Phase 2: echte Validation + local $ref
	•	Phase 3: AJV parity gate

⸻

Reviewer-Checkliste (im PR)
	•	Der PR behauptet nirgendwo “validiert”
	•	Log-Format ist stabil und konsistent
	•	** führt zu Fail
	•	Config-Discovery-Reihenfolge entspricht Python
	•	JSON/JSONL loader entspricht Python-Semantik
	•	Exit-Codes nur 0/1

⸻

Arbeitsanweisung
	1.	Erstelle Branch, implementiere Crate + Binary + Tests.
	2.	Aktualisiere minimal docs/README, sodass Phase-1 Status klar ist.
	3.	PR erstellen mit obiger Struktur.
	4.	Keine zusätzlichen Refactors “nebenbei”.

⸻

Verdichtete Essenz (Pflichtsatz im PR)

Phase 1 fixiert die Form (CLI/Logs/Discovery) ohne Validierungsbehauptung. Wahrheit kommt erst in Phase 2/3.

⸻

Ungewissheitsursachenanalyse (für PR-Beschreibung)
	•	Unsicherheit: welche Draft/Keywords später nötig sind → deshalb Phase 1 ohne Validation.

⸻

Ende des Prompts

⸻

Tiefgründig-ironische Auslassung (optional im PR-Thread, nicht im Code)

Ein Guard ohne Validator ist wie ein Türsteher, der erstmal nur die Gästeliste sortiert. Aber wenn er sie nicht sortiert, braucht er später auch keine Muskeln mehr.