Ideale Blaupause für agentenfreundliche, selbstordnende, selbstverlinkende und selbstbeobachtende Repos

1. Zweck

Diese Blaupause standardisiert Repos so, dass sie:
	•	für Menschen schnell erfassbar sind,
	•	für Agents deterministisch lesbar sind,
	•	neue und alte Dokumente automatisch sichtbar halten,
	•	neue und alte Implementierungen automatisch einordnen,
	•	Relationen zwischen Doku, Code, Skripten, Workflows, Tests und Konfigurationen explizit machen,
	•	Historie nicht verlieren, sondern historisieren,
	•	Blindstellen, Drift, Wissenslücken und implizite Kopplungen artefaktisch sichtbar machen,
	•	ohne Heimgewebe-Bindung allgemein anwendbar bleiben.  ￼  ￼

Die Blaupause ist modular:
	•	Pflichtkern für alle Repos
	•	Erweiterungen für kritische, größere oder Multi-Repo-Systeme
	•	Observatoriums-Modul für diagnostische Selbstbeobachtung statt bloßer Ordnung  ￼  ￼

⸻

2. Leitprinzipien

2.1 Wahrheitsschichten trennen

Jede Aussageklasse hat genau einen primären Ort:
	•	repo.meta.yaml = Repo-Identität und Strukturwahrheit
	•	README.md = menschlicher Einstieg
	•	AGENTS.md = agentischer Lesepfad und Arbeitsgrenzen
	•	docs/ = Architektur, Entscheidungen, Referenz, Guides, Runbooks
	•	docs/_generated/ = generierte Übersichten und Diagnosen
	•	agent-policy.yaml = maschinenlesbare Änderungsgrenzen
	•	Checks / CI / Guards = Durchsetzung  ￼

2.2 Discovery statt Handpflege

Neue relevante Dateien dürfen nicht unsichtbar bleiben, nur weil niemand manuell einen Link gesetzt hat.
Das Repo braucht eine Discovery-Logik, die neue Doku- und Implementierungsartefakte erkennt und fehlende Einordnung meldet.  ￼

2.3 Historisierung statt Verschwinden

Alte Dokumente und Implementierungen bleiben sichtbar als:
	•	active
	•	deprecated
	•	superseded
	•	archived
	•	experimental

Ablösungen werden explizit modelliert, nicht still vollzogen.  ￼

2.4 Relationen statt bloßer Links

Verweise müssen semantisch lesbar sein.
Das Repo arbeitet mit stabilen Relationstypen wie:
	•	documents
	•	documented_by
	•	implemented_by
	•	verifies_with
	•	depends_on
	•	produces
	•	consumes
	•	supersedes
	•	deprecated_by  ￼

2.5 Deterministische Übersichten

Übersichten sind keine händischen Schaufenster, sondern aus Metadaten und Discovery-Ergebnissen generierte Karten.  ￼

2.6 Delegationssicherheit

Das Repo soll nicht nur lesbar, sondern kontrolliert bearbeitbar sein.
Dafür braucht es explizite Safe Paths, Guarded Paths, Forbidden Paths und Proof Gates.  ￼

2.7 Irrtumsdiagnostik statt bloßer Intelligenzbehauptung

Die tiefere Frage lautet nicht nur: „Wie machen wir Repos intelligenter?“, sondern: „Wie machen wir Repo-Irrtümer früh sichtbar?“
Darum ergänzt diese Blaupause Ordnung um ein Repo-Observatorium, das Drift, Wissenslücken, implizite Abhängigkeiten und semantische Fault Lines diagnostisch sichtbar macht.  ￼  ￼

2.8 Diagnostisch zuerst, strafend später

Heuristische Beobachtungen sollen zuerst berichten, nicht sofort blockieren.
Das Observatorium ist diagnostisch zuerst, nicht punitiv.  ￼  ￼

⸻

3. Repo-Typen

Typ A — Kern-/Steuerungsrepos

Beispiele:
	•	Architektur
	•	Orchestrierung
	•	Contract-SoT
	•	Policy-/CI-Kerne

Anforderung: höchste Strenge.  ￼

Typ B — Produkt-/Service-Repos

Beispiele:
	•	Apps
	•	APIs
	•	UIs
	•	Dienste
	•	Deployments

Anforderung: klare Struktur, Runbooks, Risiko- und Änderungsgrenzen.  ￼

Typ C — Tool-/Library-Repos

Beispiele:
	•	CLI
	•	Utilities
	•	SDKs
	•	Hilfstools

Anforderung: schlanker Kern, gute Commands, klare Zuständigkeiten.  ￼

Typ D — Wissens-/Doku-/Experiment-Repos

Beispiele:
	•	Roadmaps
	•	Blaupausen
	•	Forschungsrepos
	•	Prototypen

Anforderung: leichte Struktur, saubere Kanonizität, weniger harte Guards.  ￼

⸻

4. Pflichtkern für alle Repos

4.1 README.md

Pflichtinhalt:
	•	Zweck des Repos
	•	Scope und Nicht-Scope
	•	wichtigste Zonen
	•	wichtigste Einstiegspfade
	•	relevante Start-/Build-/Test-Befehle
	•	Verweis auf AGENTS.md
	•	Verweis auf docs/index.md
	•	kurzer Status des Repos  ￼

⸻

4.2 AGENTS.md

Pflichtsektionen:

# AGENTS

## Purpose
## Read This First
## Canonical Sources
## Discovery Rules
## Generated Files
## Safe Read Paths
## Guarded / Risky Paths
## Required Checks
## Common Traps
## Open Gaps

Pflichtinhalt:
	•	empfohlene Lesereihenfolge
	•	kanonische Wahrheitsquellen
	•	Discovery-Regeln
	•	generated Dateien
	•	sichere und riskante Pfade
	•	Mindestvalidierung vor Änderungen
	•	typische Fehlannahmen
	•	epistemische Lücken  ￼

⸻

4.3 repo.meta.yaml

Maschinenlesbare Repo-Selbstbeschreibung.

repo_name: example-repo
repo_type: service   # core | service | tool | library | knowledge | experimental
role: short-role-label
status: active       # active | experimental | frozen | deprecated
summary: >
  Short machine-readable summary of the repo purpose.

owners:
  - team-or-person

primary_languages:
  - python
  - markdown

entrypoints:
  - README.md
  - AGENTS.md
  - docs/index.md

canonical_sources:
  - repo.meta.yaml
  - AGENTS.md
  - docs/index.md

discovery_roots:
  - docs/
  - src/
  - scripts/
  - tests/
  - .github/workflows/

generated_artifacts:
  - docs/_generated/doc-index.md
  - docs/_generated/system-map.md
  - docs/_generated/orphans.md

safe_read_paths:
  - README.md
  - AGENTS.md
  - docs/

guarded_write_paths:
  - docs/
  - scripts/
  - src/

forbidden_write_paths:
  - docs/_generated/

required_checks:
  - repo-structure-guard
  - docs-relations-guard
  - generated-files-guard

indexing:
  enabled: true
  require_frontmatter_for_docs: true
  require_registry_for_critical_impl: false
  fail_on_untyped_docs: true
  fail_on_missing_doc_index: true
  fail_on_orphans: false
  fail_on_unmapped_critical_impl: false

related_repos: []

keywords:
  - docs
  - agent-ready

￼

⸻

4.4 docs/index.md

Kanonischer Dokuindex.

Pflichtinhalt:
	•	Dokumentgruppen
	•	Lesereihenfolge
	•	kanonische Dokumente
	•	generated Übersichten
	•	Entscheidungen
	•	Guides
	•	Runbooks, falls vorhanden
	•	Archiv-/Historisierungslogik
	•	Observatoriums-Sektion, falls Observatorium aktiviert ist  ￼  ￼

Standard:
	•	docs/index.md
	•	keine Nummerierung als Default  ￼

⸻

4.5 docs/_generated/

Reservierter Bereich für generierte Übersichten und Diagnoseartefakte.

Mindestens vorgesehen, auch wenn anfangs nur wenige Artefakte erzeugt werden.  ￼

⸻

4.6 Minimaler Guard-Satz

Mindestens folgende Checks müssen existieren:
	•	Kernartefakte vorhanden
	•	repo.meta.yaml parsebar
	•	docs/index.md vorhanden
	•	referenzierte Dateien existieren
	•	generated Dateien werden nicht manuell gepflegt  ￼

⸻

5. Standardstruktur

/
├─ README.md
├─ AGENTS.md
├─ repo.meta.yaml
├─ agent-policy.yaml                # optional, bei kritischen Repos Pflicht
├─ docs/
│  ├─ index.md
│  ├─ decisions/
│  ├─ runbooks/
│  ├─ guides/
│  ├─ reference/
│  ├─ archive/
│  └─ _generated/
├─ src/
├─ scripts/
├─ tests/
├─ .github/workflows/
└─ audit/

Nicht jeder Ordner muss sofort existieren.
Wichtig ist die semantische Platzordnung.  ￼

⸻

6. Dokumentmodell

6.1 Dokumenttypen
	•	identity
	•	architecture
	•	decision
	•	runbook
	•	guide
	•	reference
	•	policy
	•	status
	•	generated
	•	archive
	•	experimental  ￼

6.2 Frontmatter für relevante Markdown-Dokumente

Pflicht für alle relevanten Markdown-Dateien außerhalb von README.md und generated Dateien.

---
id: docs.architecture.overview
title: Architekturüberblick
doc_type: architecture
status: active
canonicality: canonical           # canonical | derived | explanatory | deprecated | archived | experimental
summary: >
  Kurzbeschreibung des Dokuments.

documents:
  - src/app/
implemented_by:
  - src/app/main.py
depends_on:
  - repo.meta.yaml
related_docs:
  - docs/index.md
verifies_with:
  - scripts/check_docs.py
supersedes: []
deprecated_by: []
---

￼

6.3 Pflichtfelder
	•	id
	•	title
	•	doc_type
	•	status
	•	canonicality
	•	summary  ￼

6.4 Starke Empfehlungsfelder
	•	documents
	•	implemented_by
	•	depends_on
	•	related_docs
	•	verifies_with
	•	supersedes
	•	deprecated_by  ￼

⸻

7. Implementierungsmodell

7.1 Implementierungstypen
	•	service
	•	module
	•	cli
	•	workflow
	•	script
	•	config
	•	schema
	•	test
	•	deployment
	•	integration  ￼

7.2 Kritische Implementierungen

Kritische Implementierungen sind Pfade oder Artefakte, deren Änderung Betriebs-, Sicherheits-, Architektur- oder Schnittstellenfolgen haben kann.
Beispiele:
	•	src/-Kerne
	•	Deployments
	•	.github/workflows/
	•	produktive Skripte
	•	Schnittstellen-Schemas
	•	sicherheitsrelevante Konfigurationen  ￼  ￼

7.3 Registry für kritische Implementierungen

Für Repos ab mittlerer Kritikalität:

audit/impl-registry.yaml

implementations:
  - id: impl.service.api
    path: src/api/
    impl_type: service
    status: active
    documented_by:
      - docs/reference/api.md
    verified_by:
      - tests/test_api.py
    supersedes: []
    deprecated_by: []

  - id: impl.workflow.ci
    path: .github/workflows/ci.yml
    impl_type: workflow
    status: active
    documented_by:
      - docs/reference/ci.md
    verified_by:
      - scripts/check_workflows.py

Zweck:
	•	neue kritische Implementierungen werden sichtbar
	•	undokumentierte kritische Implementierungen werden meldbar
	•	alte Implementierungen bleiben historisiert  ￼

⸻

8. Discovery- und Einordnungslogik

8.1 Discovery-Rules

Alle discovery_roots werden regelmäßig gescannt.

Der Scan erkennt:
	•	neue Markdown-Dokumente
	•	neue Workflows
	•	neue Skripte
	•	neue Implementierungswurzeln
	•	fehlende Referenzziele
	•	Orphans
	•	nicht historisierte Altinhalte
	•	ungemappte kritische Implementierungen  ￼

8.2 Regeln für neue Dokumente

Ein neues Dokument gilt erst dann als vollständig eingebunden, wenn es:
	1.	Frontmatter trägt
	2.	durch docs/index.md oder Generatorlogik sichtbar wird
	3.	in docs/_generated/doc-index.md erscheint
	4.	mindestens eine sinnvolle Relation trägt, falls nicht absichtlich isoliert
	5.	bei Ablösung eine Historisierungsbeziehung trägt  ￼

8.3 Regeln für alte Dokumente

Ein altes Dokument bleibt sichtbar und trägt einen Zustand:
	•	active
	•	deprecated
	•	archived
	•	experimental

Bei Ablösung zusätzlich:
	•	supersedes
	•	deprecated_by

Es bleibt sichtbar in:
	•	doc-index
	•	backlinks
	•	supersession-map, falls aktiviert
	•	Archivübersichten, falls vorhanden  ￼

8.4 Regeln für neue kritische Implementierungen

Eine neue kritische Implementierung gilt erst dann als vollständig eingebunden, wenn sie:
	1.	von Discovery erkannt wird
	2.	in der Implementierungs-Registry auftaucht oder bewusst ausgenommen ist
	3.	in impl-index erscheint, falls dieses Modul aktiv ist
	4.	mindestens einen Doku- oder Testbezug hat  ￼

8.5 Regeln für alte kritische Implementierungen

Alte kritische Implementierungen verschwinden nicht still.
Sie tragen einen Zustand und ggf. Nachfolgebeziehungen:
	•	deprecated
	•	superseded
	•	archived  ￼

⸻

9. Generated Übersichten

9.1 Pflicht für alle Repos

docs/_generated/doc-index.md
Listet alle relevanten Dokumente mit:
	•	Titel
	•	Typ
	•	Status
	•	Kanonizität
	•	Pfad
	•	zentrale Relationen  ￼

docs/_generated/system-map.md
Gibt Überblick über:
	•	Repo-Zonen
	•	Einstiegspfade
	•	Truth-Sources
	•	wichtige Schichten  ￼

docs/_generated/orphans.md
Listet:
	•	Dokumente ohne ausreichende Einordnung
	•	fehlende Referenzziele
	•	unklassifizierte relevante Inhalte  ￼

9.2 Pflicht für kritische oder reifere Repos

docs/_generated/impl-index.md
Listet kritische Implementierungen mit:
	•	ID
	•	Typ
	•	Pfad
	•	Status
	•	dokumentiert durch
	•	verifiziert durch  ￼

docs/_generated/backlinks.md
Rückverweise zwischen Dokumenten und Implementierungen.  ￼

docs/_generated/supersession-map.md
Historisierungskarte für:
	•	abgelöste Dokumente
	•	abgelöste Implementierungen
	•	Nachfolgerketten  ￼

docs/_generated/agent-readiness.md
Zusammenfassung der agentischen Reife:
	•	Kernartefakte vorhanden?
	•	Discovery aktiv?
	•	Orphans?
	•	ungemappte kritische Implementierungen?
	•	fehlende Relationen?
	•	Risky Zones definiert?  ￼

9.3 Regeln für generated Dateien

Generated Dateien:
	•	tragen klaren Header
	•	nennen ihre Quelle
	•	werden nicht manuell gepflegt
	•	werden durch Guards geschützt  ￼

⸻

10. Repo-Observatorium

10.1 Zweck

Das Observatorium erweitert das intelligente Repo um Selbstbeobachtung.
Es beantwortet nicht nur „Was ist da?“, sondern auch „Wo stimmt etwas nicht, fehlt etwas oder driftet etwas semantisch?“  ￼

10.2 Diagnoseachsen

docs/_generated/architecture-drift.md
Erkennt, wo reale Struktur von dokumentierter Soll-Struktur abweicht.
Fragen:
	•	neue oder unbekannte Pfade?
	•	verschobene kritische Pfade?
	•	wichtige Verzeichnisse ohne Doku-Verankerung?
	•	dokumentierte Systemteile vs. reale Struktur?  ￼

docs/_generated/doc-coverage.md
Bewertet Dokumentationsabdeckung kritischer Implementierungen.
Klassen:
	•	vollständig dokumentiert
	•	teilweise dokumentiert
	•	nur indirekt dokumentiert
	•	undokumentiert  ￼

docs/_generated/knowledge-gaps.md
Markiert Wissenslücken explizit.
Typen:
	•	Begriffslücke
	•	Zuständigkeitslücke
	•	Verifikationslücke
	•	Entscheidungsherkunft fehlt
	•	Runbook ohne SoT-Bezug  ￼

docs/_generated/implicit-dependencies.md
Heuristische Karte impliziter Kopplungen aus Workflows, Skripten, Compose-Dateien, Konfigurationen und Docs.
Format:
	•	source
	•	inferred_dependency
	•	evidence
	•	documented (yes | no | unclear)  ￼

docs/_generated/change-resonance.md
Regelkarte: „Wenn X sich ändert, prüfe oder aktualisiere Y.“
Mindestens abbilden:
	•	Infra-/Compose-Änderungen → Deploy-Doku / Runbooks / Referenzconfigs
	•	Workflow-Änderungen → AGENTS.md oder Policy-Doku
	•	Contract-Änderungen → Doku und Verifikationsreferenzen
	•	Generator-Skript-Änderungen → regenerierte _generated-Outputs  ￼

docs/_generated/staleness-report.md
Markiert Doku-Nekromantie.
Gruppen:
	•	deprecated but linked
	•	superseded without successor guidance
	•	active-looking but stale
	•	archive candidates  ￼

docs/_generated/agent-readiness.md
Bewertet Delegierbarkeit des Repos.
Dimensionen:
	•	canonical entry clarity
	•	documentation coverage of critical paths
	•	generated artefact availability
	•	policy presence
	•	guarded path clarity
	•	drift visibility
	•	discoverability  ￼

10.3 Observatoriums-Integration in docs/index.md

Falls aktiviert, eigener Abschnitt:

## Repo Observatorium

- docs/_generated/architecture-drift.md
- docs/_generated/doc-coverage.md
- docs/_generated/knowledge-gaps.md
- docs/_generated/implicit-dependencies.md
- docs/_generated/change-resonance.md
- docs/_generated/staleness-report.md
- docs/_generated/agent-readiness.md

Jeweils mit Kurzbeschreibung.  ￼

10.4 Observatoriums-Technik

Inputs:
	•	repo.meta.yaml
	•	agent-policy.yaml
	•	audit/impl-registry.yaml
	•	Frontmatter aus docs/**/*.md
	•	Dateibaum
	•	.github/workflows/*.yml
	•	relevante Infra-/App-/Contract-Pfade
	•	vorhandene generated Indizes

Engine:
	•	kleine Python-Module unter scripts/docmeta/

Outputs:
	•	nur Markdown-Artefakte unter docs/_generated/  ￼

⸻

11. Relationsvokabular

11.1 Dokumentbeziehungen
	•	depends_on
	•	related_docs
	•	documents
	•	implemented_by
	•	verifies_with
	•	supersedes
	•	deprecated_by  ￼

11.2 Implementierungsbeziehungen
	•	documented_by
	•	verified_by
	•	depends_on
	•	produces
	•	consumes
	•	supersedes
	•	deprecated_by  ￼

11.3 Regel

Jedes wichtige Dokument und jede kritische Implementierung soll mindestens eine sinnvolle Relation tragen, außer bei bewusst isolierten Sonderfällen.  ￼

⸻

12. Agentische Änderungsgrenzen

12.1 agent-policy.yaml

Für kritische Repos Pflicht, sonst empfohlen.

safe_read_paths:
  - README.md
  - AGENTS.md
  - docs/

guarded_write_paths:
  - docs/
  - scripts/
  - src/
  - .github/workflows/

forbidden_write_paths:
  - docs/_generated/
  - secrets/
  - snapshots/

requires_target_proof_for:
  - src/
  - infra/
  - deployment/
  - .github/workflows/

required_checks_before_patch:
  - repo-structure-guard
  - docs-relations-guard
  - generated-files-guard
  - lint
  - test

human_review_required_for:
  - security/
  - deployment/
  - credentials/

￼

12.2 Grundregel

Ein Agent darf nicht nur aufgrund von Plausibilität ändern.
Für riskante Zonen braucht es:
	•	Pfadnachweis
	•	Beleg
	•	definierte Validierung  ￼

⸻

13. Guard-System

13.1 Pflicht-Guards

repo-structure-guard
Prüft:
	•	Kernartefakte vorhanden
	•	repo.meta.yaml parsebar
	•	docs/index.md vorhanden
	•	generated Bereich vorhanden  ￼

docs-relations-guard
Prüft:
	•	Frontmatter vollständig
	•	relationale Ziele existieren
	•	Kanonizität gültig
	•	Historisierungsbeziehungen konsistent  ￼

generated-files-guard
Prüft:
	•	generated Dateien nicht manuell verändert
	•	Header und Quellverweise vorhanden  ￼

13.2 Empfohlene Guards

orphan-guard
Meldet:
	•	Dokumente ohne Relation
	•	unklassifizierte relevante Dateien
	•	fehlende Referenzziele  ￼

impl-doc-coverage-guard
Prüft:
	•	kritische Implementierungen haben Doku- oder Testbezug  ￼

supersession-guard
Prüft:
	•	supersedes / deprecated_by konsistent
	•	keine stillen Ablösungen
	•	keine zirkulären Nachfolgeketten  ￼

13.3 Schweregrade

Guards und Diagnosen arbeiten mit drei Stufen:
	•	info
	•	warn
	•	fail

Heuristische Reports sollen zunächst nicht CI blockieren.  ￼

⸻

14. Terminologie-Governance

14.1 docs/reference/glossary.md

Empfohlen ab mittlerer Komplexität.

Pflichtinhalte:
	•	Begriff
	•	Kurzdefinition
	•	erlaubte Synonyme
	•	veraltete Synonyme
	•	Abkürzung, falls relevant  ￼

Etymologie: „Glossar“ kommt von griechisch glossa, also Zunge oder schwer verständliches Wort. Ein Glossar ist damit keine Zierleiste, sondern die Rettungsstation für Begriffe, bevor sie zu höflich nickendem Nebel werden.  ￼

⸻

15. Entscheidungen

15.1 docs/decisions/

Jedes nichttriviale Repo soll Entscheidungen dokumentieren.  ￼

15.2 Pflichtinhalt pro Entscheidung
	•	Kontext
	•	Entscheidung
	•	Alternativen
	•	Folgen
	•	betroffene Pfade
	•	betroffene Dokumente
	•	betroffene Implementierungen  ￼

15.3 Historisierung von Entscheidungen

Überholte Entscheidungen:
	•	bleiben sichtbar
	•	werden markiert
	•	verlinken auf Nachfolger  ￼

⸻

16. Kleine Repos

Pflicht
	•	README.md
	•	AGENTS.md
	•	repo.meta.yaml
	•	docs/index.md
	•	docs/_generated/doc-index.md
	•	repo-structure-guard  ￼

Optional zunächst
	•	agent-policy.yaml
	•	impl-registry.yaml
	•	impl-index
	•	backlinks
	•	supersession-map
	•	agent-readiness
	•	Glossar
	•	Entscheidungen  ￼

⸻

17. Kritische Repos

Für Infrastruktur-, Security-, Deploy- und Betriebs-Repos zusätzlich verpflichtend:
	•	agent-policy.yaml
	•	audit/impl-registry.yaml
	•	docs/runbooks/
	•	docs/decisions/
	•	docs/_generated/impl-index.md
	•	docs/_generated/backlinks.md
	•	docs/_generated/supersession-map.md
	•	orphan-guard
	•	impl-doc-coverage-guard  ￼

Zusätzlich explizit zu benennen:
	•	Secrets-/Shadow-Bereiche außerhalb von Git
	•	niemals automatisch änderbare Pfade
	•	Proof Gates vor Änderungen
	•	zwingende Checks vor Patch  ￼

⸻

18. Reifegrade

R0 — Grundlesbar
	•	README
	•	AGENTS
	•	repo.meta
	•	docs/index
	•	Struktur-Guard  ￼

R1 — Geordnet
	•	Frontmatter
	•	doc-index
	•	system-map
	•	erste Relationen  ￼

R2 — Selbstverlinkend
	•	orphans
	•	backlinks
	•	Historisierungsrelationen
	•	stärkere Relations-Guards  ￼

R3 — Implementierungsgekoppelt
	•	impl-registry
	•	impl-index
	•	Doku-/Implementierungsverweise
	•	Coverage-Guard  ￼

R4 — Delegierbar
	•	agent-policy
	•	Risky Zones
	•	Proof Gates
	•	agent-readiness
	•	konsistente Historisierung  ￼

R5 — Selbstbeobachtend
	•	architecture-drift
	•	doc-coverage
	•	knowledge-gaps
	•	staleness-report
	•	diagnostische CI-Integration ohne Heuristik-Terror
	•	optional später: implicit-dependencies, change-resonance, risk-hotspots, term-drift, review-priority  ￼  ￼

⸻

19. Einführungsreihenfolge

Phase 1 — Ordnung herstellen

Einführen:
	•	Pflichtkern
	•	Frontmatter
	•	doc-index
	•	system-map
	•	grundlegende Relationen  ￼

Phase 2 — Verknüpfen und historisieren

Einführen:
	•	impl-registry
	•	impl-index
	•	backlinks
	•	supersession-map
	•	orphans
	•	Coverage-Guards  ￼

Phase 3 — Beobachten, nicht bestrafen

Einführen:
	•	architecture-drift
	•	doc-coverage
	•	knowledge-gaps
	•	agent-readiness

Nur generieren, noch keine harte CI-Blockade.  ￼

Phase 4 — Guard-Fähigkeit

Dann Guards ergänzen für:
	•	kritische Coverage-Lücken
	•	Drift in kritischen Pfaden
	•	veraltete kanonische Einstiegspunkte  ￼

Phase 5 — Resonanzlogik

Dann ergänzen:
	•	implicit-dependencies
	•	change-resonance

Erst später, weil heuristischer und fehleranfälliger.  ￼

⸻

20. Qualitätsmaßstab

Ein Repo erfüllt diese Blaupause gut, wenn ein Agent nach kurzer Lektüre sicher beantworten kann:
	1.	Was ist dieses Repo?
	2.	Was ist hier kanonisch?
	3.	Welche Dokumente lese ich zuerst?
	4.	Welche neuen Dokumente und Implementierungen wurden entdeckt?
	5.	Welche alten Inhalte sind deprecated, superseded oder archiviert?
	6.	Welche Doku beschreibt welchen Code?
	7.	Welche Implementierung ist wie dokumentiert und verifiziert?
	8.	Welche Inhalte sind verwaist?
	9.	Welche Pfade sind riskant?
	10.	Welche Blindstellen, Wissenslücken oder Drift-Signale gibt es?
	11.	Was fehlt für einen sicheren Eingriff?  ￼  ￼

⸻

21. Blaupausen-Kern in einem Satz

Jedes Repo soll relevante Dokumente und kritische Implementierungen automatisch entdecken, semantisch einordnen, historisieren, über generierte Übersichten mit belastbaren Verweisen sichtbar machen und seine eigenen Irrtümer diagnostisch offenlegen, sodass ein Agent nicht raten muss.  ￼  ￼

⸻

22. Unsicherheitsgrad

0.14

Ursachen:
	•	Die beiden Quelldateien liefern ein starkes Zielbild, aber keine vollständige, stack-spezifische Norm für alle möglichen Repo-Arten.
	•	Das Observatorium ist bewusst heuristisch; einzelne Diagnoseachsen sind deshalb nicht überall gleich präzise.  ￼  ￼

23. Interpolationsgrad

0.17

Hauptquellen:
	•	Zusammenführung zweier Zielbilder: intelligentes Repo + diagnostisches Observatorium
	•	Ergänzung eines zusätzlichen Reifegrads R5, um beide Modelle sauber zu integrieren
	•	Verallgemeinerung über Heimgewebe- und Nicht-Heimgewebe-Repos hinweg

24. Essenz

Hebel:
Nicht nur Ordnung, sondern Ordnung + Historisierung + Diagnose.

Entscheidung:
Der optimale Zielzustand ist kein bloß intelligentes Repo, sondern ein selbstbeobachtendes Repo, das seine Blindstellen artefaktisch zeigt.

Nächste Aktion:
Pflichtkern einführen, dann Verknüpfung und Historisierung, dann Observatorium diagnostisch zuschalten.

Der trockene Restwitz bleibt erhalten: Ein normales Repo sagt „Hier sind meine Dateien“. Ein gutes Repo sagt „Hier ist meine Struktur“. Ein reifes Repo sagt „Hier ist die Stelle, an der ich mir selbst nicht ganz traue“. Und dort beginnt meistens mehr Erkenntnis als in zehn grünen CI-Häkchen.


evaluiere gründlich, wie diese optimierung angewendet werden sollte. erstelle einen ausführlichen plan zur umsetzung. setze nacheinander um