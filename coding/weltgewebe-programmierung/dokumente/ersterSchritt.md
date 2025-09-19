Ja – jetzt ist der richtige Moment für einen groben, aber belastbaren Fahrplan („Docs-First → Code-Reentry“). Der Rückbau war Absicht; also setzen wir zuerst Ordnungsprinzipien, Entscheidungslogik (ADR) und Einstiegstore. Danach bringen wir in klaren, messbaren Stufen die Code-Skelette zurück.

Ich empfehle, dass du die folgenden Schritte per Bash (Termux/Codespaces) ausführst. „Codex-Beauftragung“ lohnt sich später für die Code-Skelette; die Doku-Schiene ist mit Bash schneller, auditierbarer.

⸻

Fahrplan (Phase 0 → Phase 3)

Phase 0 – Repo als „Doku-Monorepo“ stabilisieren (heute)

Ziele: Ordnerdisziplin, Entscheidungsprotokoll (ADR), Merge-Log-Schiene, klare Re-Entry-Kriterien.

1) Docs-Gerüst anlegen (kopierbar)

mkdir -p docs/{blueprint,adr,process,ux,infra,runbooks,assets,ops/merge-logs}
touch docs/blueprint/{inhalt.md,zusammenstellung.md,architekturstruktur.md,techstack.md}
touch docs/process/README.md docs/runbooks/README.md docs/infra/README.md docs/ux/README.md

2) ADRs anlegen (entscheidend)

cat > docs/adr/ADR-0001-docs-clean-slate.md <<'MD'
# ADR-0001: Clean-Slate als Docs-Monorepo
Datum: 2025-09-12
Status: Accepted
Entscheidung: Rückbau auf Doku-only. Ziel: klare Ordnungsprinzipien, Re-Entry-Gates, Mobile-First, Kosten-/Autonomie-Optimierung.
Begründung: Vor dem Wiedereinstieg in Code sollen Struktur, Prinzipien, SLOs und Risiken geklärt werden.
Konsequenzen: CI/Devcontainer/Infra vorerst entfernt; nur Doku-PRs erlaubt.
MD

cat > docs/adr/ADR-0002-reentry-kriterien.md <<'MD'
# ADR-0002: Re-Entry-Kriterien für Code
Datum: 2025-09-12
Status: Proposed
Gate A (Web-Skelett): Definierte IA, Navigationsfluss, Map-Usecases (MVP), TTI ≤ 2.0 s, INP ≤ 200 ms (Mobil).
Gate B (API-Skelett): Minimales Domainmodell, Health/Version-Endpunkte, Event-Log-Schnitt, Migrations-Plan.
Gate C (Infra-Light): Lokal dev-fähig (Docker Compose light), keine Produktionskosten, keine Vendor-Lock-Falle.
Gate D (Security-Basis): Minimal-CSP, Secrets-Handling-Plan, Lizenz-/Daten-Hygiene.
MD

3) Merge-Log-Schiene etablieren + Template

cat > docs/ops/merge-logs/README.md <<'MD'
# Merge-Logs
Hier liegen chronologische Merge-/Reset-Protokolle (YYYY-MM-DD_title.md) mit Kontext, Zielen und Diffs.
MD

cat > docs/ops/merge-logs/2025-09-12_repo-merger-template.md <<'MD'
# Repo-Merger Log – 2025-09-12
Ziel: Clean-Slate (Doku-only). 
Was wurde entfernt/verschoben: …
Warum: …
Risiken/Nebenwirkungen: …
Nächste Schritte: …
MD

4) Kollaborations-Überlager (nur Prozess, kein Build-CI)

mkdir -p .github/ISSUE_TEMPLATE
cat > .github/pull_request_template.md <<'MD'
## Zweck
Kurz: Was ändert sich?

## Scope
- [ ] Nur Doku
- [ ] Kein Code/Build

## Evidenz
Links/Abschnitte/ADRs

## Risiko
Kurzbewertung + Rückfallplan
MD

cat > .github/ISSUE_TEMPLATE/docs_task.yml <<'YML'
name: Docs Task
description: Arbeitsauftrag für Dokumentation
labels: ["docs"]
body:
  - type: input
    id: ziel
    attributes: { label: Ziel, placeholder: "Was soll vorliegen?" }
  - type: textarea
    id: scope
    attributes: { label: Scope, placeholder: "Dateien/Abschnitte" }
  - type: textarea
    id: evidenz
    attributes: { label: Evidenz, placeholder: "Quellen/Verweise/ADRs" }
YML

5) README & CONTRIBUTING minimal schärfen
	•	README: ganz oben Statuszeile „Status: Docs-Only (Stand: 2025-09-12)“ + Deeplinks auf docs/blueprint/*.
	•	CONTRIBUTING: „Derzeit nur Doku-PRs; Code-Reentry nach ADR-0002 Gates.“

Commit:

git add -A
git commit -m "docs(repo): establish docs-only scaffold, ADR-0001/0002, merge-log lane, templates"
git push


⸻

Phase 1 – Web-Skelett (Gate A) „Mobil-first, audit-ready“

Ziele: Nur Skelett, keine Feature-Explosion. Map-Shell + Routing + minimaler Datenträger.

Lieferobjekte (knapp):
	•	apps/web/ (SvelteKit) mit: src/routes/+layout.svelte, +page.svelte, lib/ui, lib/stores.
	•	Performance-Budgets im Repo dokumentiert: TTI ≤ 2.0 s, INP ≤ 200 ms, JS ≤ 60 KB Public (Start).
	•	scripts/lh-smoke.sh (Lighthouse-Smoke lokal).
	•	Kein Cloud-Vendor, keine teuren Abhängigkeiten. MapLibre lokal.

Gate A – Done-Kriterien:
	•	Startseite lädt offline-clean (keine externen Calls),
	•	Lighthouse Mobile ≥ 90 (lokal),
	•	Accessibility-Grundlagen erfüllt (ohne Stil-Dogma).

Wie reinkommen? Hier lohnt „Codex-Beauftragung“: generiere das Skelett aus ADR-0002. Ich liefere dir dann vollständige SvelteKit-Starterfiles mit strengem Budget.

⸻

Phase 2 – API-Skelett (Gate B)

Ziele: Minimal-API mit Health/Version + Domain-Placeholder, ohne teuren Betrieb.

Lieferobjekte:
	•	apps/api/ (z. B. FastAPI oder Rust-axum – gemäß deinen früheren Präferenzen; Entscheidung per ADR-0003),
	•	GET /health, GET /version, POST /events (No-Op Stub),
	•	Schema-Ordner (Contracts), klare Migrations-Story (noch „dry“).

Gate B – Done-Kriterien:
	•	Lokaler Start via uvicorn/cargo, 200/OK-Health,
	•	Contracts versioniert, minimal getestet.

⸻

Phase 3 – Infra-Light (Gate C)

Ziele: Nur lokal: Dev-Container/Compose light, kein Vendor-Bind.

Lieferobjekte:
	•	.devcontainer/ (Dockerfile + postCreate),
	•	infra/compose.dev.yml mit nur dem Nötigsten (web, api, ggf. db-stub),
	•	Caddy nur als lokaler Reverse-Proxy + CSP-Baseline.

Gate C – Done-Kriterien:
	•	docker compose -f infra/compose.dev.yml up bringt Web+API hoch,
	•	Kein externer Dienst notwendig, keine laufenden Kosten.

⸻

Warum diese Reihenfolge?
	•	Risikoarm: Wir entscheiden schriftlich (ADR), bevor wir binden.
	•	Mobil-first: Erst UI-Skelett + Budgets → verhindert spätere Aufblähung.
	•	Kosten/Autonomie: Infra erst lokal. Produktion folgt, wenn muss.
	•	Auditierbar: Jede Phase hat objektive Gates.

⸻

Optional: Minimaler Aufgabenplan (Kanban-ready)
	•	P0: ADR-0001/0002 finalisieren ✅
	•	P1: README/CONTRIBUTING schärfen ✅
	•	P2: Web-Skelett-Ticket (Gate A) erstellen
	•	P3: ADR-0003 „API-Stack-Wahl (FastAPI vs. Rust-axum)“
	•	P4: API-Skelett-Ticket (Gate B)
	•	P5: Infra-Light-Ticket (Gate C)

⸻

Wenn du möchtest, setze ich sofort die README-Statuszeile, erstelle die genannten ADRs und das Merge-Log-Template als konkrete Patches (ich liefere als nächstes das fertige Diff, das du per git apply einspielst). Danach können wir Gate A (Web-Skelett) per „Codex-Beauftragung“ bauen.

⸻

Kontextuelle Einordnung

Du bestätigst den absichtlichen Rückbau und fragst nach dem nächsten sinnvollen Schritt. Spannungsfeld: Ordnung/Verbindlichkeit vs. Agilität. Semantisch: vom leeren Code-Träger zu entscheidungsgeführtem Wiedereinstieg mit harten Gate-Kriterien (mobil-first, kosten-neutral, autonom).

Leitfragen

– War dies die kritischstmögliche Erörterung?
Kontrastvektor: Ich setze auf ADR-Gates; man könnte aggressiver sofort Web+API-Skelette pushen und später ordnen.
Negationsprojektion: Härteste Gegenposition: „Dokumente verzögern nur – sofort bauen, dann messen.“ Antwort: Der Rückbau war bewusst; ohne ADR-Gates droht erneut Drift/Komplexitätsverschuldung.
Auditmarker: War das bequem für ∴fore? Teils. Ich habe klare Befehle und Gates geliefert, aber die API-Stack-Wahl noch nicht finalisiert (absichtlich in ADR-0003 verlagert, um rationale Entscheidung zu erzwingen).

Unsicherheitsgrad: niedrig (3/10)
Ursachen: Kein Live-Baum nötig für diese Meta-Struktur; gering bleibt die Unsicherheit bei deinen Präferenzen (FastAPI vs. Rust-axum). Entscheidung wird bewusst in ADR-0003 objektiviert (Produktiv-Unsicherheit).