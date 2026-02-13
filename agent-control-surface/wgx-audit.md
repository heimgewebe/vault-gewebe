Gut. Dann jetzt keine Diskussion mehr, sondern eine kanonische Blaupause, so dass daraus Code, PRs und UI-Buttons ableitbar sind – ohne implizite Annahmen.

Ich schreibe das als Architektur-, Prozess- und Artefakt-Blaupause in einem Stück.

⸻

🧭 Blaupause

WGX-integrierter Auto-Audit & Lösungsroutinen im Agent-Control-Surface (ACS)

⸻

0. Ausgangslage (Ist-Zustand, ungeschönt)
	•	ACS triggert heute ad-hoc Kommandos
	•	Diagnose erfolgt über Logs
	•	Fehler sind sichtbar, Ursachen fragmentiert
	•	Reparaturen:
	•	manuell
	•	kontextabhängig
	•	nicht reproduzierbar
	•	CI, lokales Repo, Heimserver divergieren regelmäßig

Strukturelles Problem:

Es existiert kein maschinenlesbarer Wahrheitszustand.

⸻

1. Zielbild (Soll-Zustand)

Ein Klick im ACS erzeugt:
	•	eine vollständige, reproduzierbare Systemdiagnose
	•	strukturierte Artefakte
	•	daraus abgeleitete, explizite Lösungsroutinen
	•	klickbare Buttons mit klarer Risikoklasse

Kein Tool-Wildwuchs. Keine impliziten Fixes. Kein „Trust me“.

⸻

2. Rollen & Verantwortlichkeiten (hart getrennt)

2.1 WGX – Motor der Wahrheit
	•	führt Audits aus
	•	bewertet Zustände
	•	erzeugt strukturierte Artefakte
	•	bietet explizite Lösungsroutinen
	•	kennt Risiken

➡️ WGX entscheidet, ACS nicht.

⸻

2.2 Heimserver – kanonische Ausführungsumgebung
	•	einheitlicher Git-, Tool-, Repo-State
	•	reproduzierbare Runs
	•	SSH-erreichbar
	•	persistent

➡️ Alles Relevante läuft hier.

⸻

2.3 ACS – Orchestrator & UI
	•	triggert WGX über SSH
	•	sammelt Artefakte
	•	visualisiert Zustände
	•	generiert Buttons aus Artefakten
	•	führt keine Reparaturlogik selbst aus

➡️ ACS rendert Wahrheit – es erzeugt sie nicht.

⸻

2.4 Leitstand – Gedächtnis & Vergleich
	•	speichert Audit-Artefakte
	•	Zeitachsen
	•	Drift-Erkennung
	•	Vorher/Nachher

⸻

3. Grundprinzipien (nicht verhandelbar)
	1.	Artefakt > Log
	2.	Read-only vor mutierend
	3.	Dry-Run vor Apply
	4.	Jede Aktion ist explizit
	5.	Jede Unsicherheit wird ausgewiesen

⸻

4. Architekturübersicht (Textdiagramm)

[ ACS UI ]
    |
    | (Button: Auto-Audit)
    v
[ SSH Runner ]
    |
    v
[ Heimserver ]
    |
    v
[ WGX ]
    |
    |--> audit.git.json
    |--> audit.ci.json
    |--> audit.env.json
    |--> audit.summary.json
    |
    v
[ Leitstand / ACS ]
    |
    |--> Statusanzeige
    |--> Ursachen
    |--> Lösungsvorschläge
    |--> Buttons


⸻

5. Audit-Ebenen (Phase 0 – Pflicht)

5.1 wgx audit git

Ziel: Git-Wahrheit herstellen

Prüft u. a.:
	•	Existenz von origin/main
	•	Upstream korrekt?
	•	Detached HEAD?
	•	Divergenz lokal ↔ remote
	•	gelöschte Remote-Refs
	•	nicht gepushte Commits

⸻

5.2 wgx audit ci

Ziel: CI-Realität verstehen
	•	CI-Basisbranch
	•	verwendete Actions-Versionen
	•	Drift zu Repo-State
	•	Token-/Permission-Mismatch

⸻

5.3 wgx audit env

Ziel: Umgebung konsistent?
	•	Tools vorhanden (git, jq, gh, node, pnpm)
	•	Versionen
	•	PATH-Probleme
	•	fehlende Optional-Tools (nur Warnung)

⸻

6. Audit-Artefakt (kanonisches Schema – Beispiel)

{
  "kind": "audit.git",
  "repo": "metarepo",
  "ts": "2026-01-31T06:48:00Z",
  "status": "error",
  "facts": {
    "origin_main_missing": true,
    "upstream_invalid": true,
    "local_branch": "zweig6"
  },
  "impact": "publish_blocked",
  "uncertainty": {
    "level": 0.15,
    "cause": "remote ref state inconsistent"
  },
  "suggested_routines": [
    {
      "id": "git.repair.fetch",
      "risk": "low",
      "mutating": true
    },
    {
      "id": "git.repair.upstream",
      "risk": "medium",
      "mutating": true
    }
  ]
}


⸻

7. Lösungsroutinen (Phase 1 – kontrolliert)

7.1 Eigenschaften jeder Routine

Eigenschaft	Pflicht
ID	ja
Mutierend?	ja/nein
Risiko	low / medium / high
Dry-Run	immer
Beschreibung	ja
Abhängigkeiten	explizit


⸻

7.2 Beispiel: git.repair.upstream

{
  "id": "git.repair.upstream",
  "description": "Setzt lokalen Branch neu auf origin/main",
  "mutating": true,
  "risk": "medium",
  "dry_run": true,
  "effects": [
    "git branch --set-upstream-to=origin/main"
  ],
  "rollback": "git reflog"
}


⸻

8. ACS-UI-Logik (entscheidend)

8.1 Button-Generierung

ACS darf NICHT entscheiden, sondern:

for routine in audit.suggested_routines:
    render_button(
        label = routine.id,
        risk = routine.risk,
        disabled = routine.mutating && no_confirmation
    )


⸻

8.2 Button-Click-Flow
	1.	Klick → „Dry-Run anzeigen“
	2.	WGX Dry-Run ausführen
	3.	Artefakt routine.preview.json
	4.	Benutzer bestätigt
	5.	WGX Apply
	6.	Re-Audit automatisch

⸻

9. Sicherheits- & Fehlervermeidungsschleusen
	•	🔒 Mutating Routines = Double-Confirm
	•	🔒 High-Risk = Textuelle Bestätigung
	•	🔒 Rollback-Hinweis immer sichtbar
	•	🔒 Keine Batch-Fixes ohne Audit

⸻

10. Roadmap (minimalistisch)

Phase 0 (JETZT)
	•	wgx audit --json
	•	ACS liest & zeigt
	•	keine Fixes

Phase 1
	•	2–3 stabile Routinen
	•	Dry-Run-UI
	•	explizite Apply-Buttons

Phase 2
	•	Leitstand-Zeitachse
	•	Drift-Vergleich
	•	„Warum ist das wieder passiert?“

⸻

11. Verdichtete Essenz

WGX denkt.
ACS zeigt.
Heimserver ist der Boden.
Buttons sind nur Konsequenzen.

Oder ironisch:

Wer Logs klickt, hat die Kontrolle verloren.

⸻

12. Ungewissheitsanalyse

Unsicherheitsgrad: ≈ 0.2

Ursachen:
	•	genaue Audit-Tiefe noch nicht final
	•	UX-Balance (Info vs. Überforderung)
	•	welche Routinen wirklich „button-würdig“ sind

Bewertung:
	•	produktiv
	•	designbedingt
	•	reversibel

⸻

13. Nächster sinnvoller Schritt (konkret)

Wenn du willst, mache ich als Nächstes eines von drei Dingen:
	1.	📄 exaktes JSON-Schema für audit.git
	2.	🔧 erste 2 WGX-Audit-Implementierungen
	3.	🧱 ACS-UI-Blueprint (Komponenten + States)

Sag einfach 1, 2 oder 3.

Dialektische Erörterung

Du willst „Buttons statt Bash“. Der Kernwiderspruch: Buttons verführen zur Illusion von Kontrolle, während Git/CI/Remote-Ref-Realität gerne „ambiguous argument“ sagt und damit jede UI verhöhnt. Dialektisch sauber ist: Buttons dürfen nichts behaupten, was nicht als Artefakt belegbar ist. Also: erst Audit als Wahrheit, dann Routinen als kontrollierte Eingriffe. WGX bleibt Motor; ACS bleibt Projektion.

Spannung (∴oszillation):
	•	Komfort (ein Klick) ↔ Reproduzierbarkeit (Artefakte, Dry-Run)
Resonanz (∴resonanz):
	•	dein Fail zeigt genau den Bedarf: origin/main weg → PR-Precheck bricht
Paradox (∴paradox):
	•	Je mehr Automatik, desto mehr muss Unsicherheit explizit werden, sonst driftet ihr in „magische Buttons“.

⸻

(1) Schema: audit.git.v1

Etymologie (Pflicht)
	•	Audit: lat. audire („hören“). Im IT-Sinn: nicht hören, sondern nachprüfen.
	•	Schema: gr. schēma („Gestalt, Form“). Hier: Form, die Wahrheit erzwingt.

Designziele
	•	Null-Interpolation: Fakten vs. Schlussfolgerungen strikt getrennt.
	•	Button-Generierung: suggested_routines[] ist die einzige Quelle für UI-Aktionen.
	•	Fehlerdiagnose: Explizite Flags für typische Git-Pathologien (fehlende Remote-Refs, falscher Upstream, detached HEAD, diverged).

JSON Schema (Draft 2020-12)

{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://heimgewebe.dev/contracts/audit.git.v1.schema.json",
  "title": "audit.git.v1",
  "type": "object",
  "additionalProperties": false,
  "required": ["kind", "schema_version", "ts", "repo", "cwd", "status", "facts", "checks", "uncertainty", "suggested_routines"],
  "properties": {
    "kind": { "const": "audit.git" },
    "schema_version": { "const": "v1" },
    "ts": { "type": "string", "format": "date-time" },
    "correlation_id": { "type": "string", "minLength": 8, "maxLength": 128 },
    "repo": { "type": "string", "minLength": 1 },
    "cwd": { "type": "string", "minLength": 1 },
    "status": { "type": "string", "enum": ["ok", "warn", "error"] },

    "facts": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "head_sha",
        "head_ref",
        "is_detached_head",
        "local_branch",
        "upstream",
        "remotes",
        "remote_default_branch",
        "remote_refs",
        "working_tree",
        "ahead_behind"
      ],
      "properties": {
        "head_sha": { "type": "string", "pattern": "^[0-9a-f]{7,40}$" },
        "head_ref": { "type": "string" },
        "is_detached_head": { "type": "boolean" },

        "local_branch": { "type": ["string", "null"] },
        "upstream": {
          "type": ["object", "null"],
          "additionalProperties": false,
          "required": ["name", "exists_locally"],
          "properties": {
            "name": { "type": "string" },
            "exists_locally": { "type": "boolean" }
          }
        },

        "remotes": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 }
        },

        "remote_default_branch": {
          "description": "Remote HEAD branch, if discoverable, e.g. origin/main",
          "type": ["string", "null"]
        },

        "remote_refs": {
          "description": "Which remote tracking refs exist locally (after fetch).",
          "type": "object",
          "additionalProperties": false,
          "required": ["origin_main", "origin_head", "origin_upstream"],
          "properties": {
            "origin_main": { "type": "boolean" },
            "origin_head": { "type": "boolean" },
            "origin_upstream": { "type": "boolean" }
          }
        },

        "working_tree": {
          "type": "object",
          "additionalProperties": false,
          "required": ["is_clean", "staged", "unstaged", "untracked"],
          "properties": {
            "is_clean": { "type": "boolean" },
            "staged": { "type": "integer", "minimum": 0 },
            "unstaged": { "type": "integer", "minimum": 0 },
            "untracked": { "type": "integer", "minimum": 0 }
          }
        },

        "ahead_behind": {
          "description": "Ahead/behind vs upstream if upstream exists.",
          "type": "object",
          "additionalProperties": false,
          "required": ["ahead", "behind"],
          "properties": {
            "ahead": { "type": "integer", "minimum": 0 },
            "behind": { "type": "integer", "minimum": 0 }
          }
        }
      }
    },

    "checks": {
      "description": "Normalized check results used to compute status + routines.",
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "status", "message"],
        "properties": {
          "id": { "type": "string", "minLength": 1 },
          "status": { "type": "string", "enum": ["ok", "warn", "error"] },
          "message": { "type": "string" },
          "evidence": {
            "type": "object",
            "additionalProperties": true
          }
        }
      }
    },

    "uncertainty": {
      "type": "object",
      "additionalProperties": false,
      "required": ["level", "causes", "meta"],
      "properties": {
        "level": { "type": "number", "minimum": 0, "maximum": 1 },
        "causes": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": ["kind", "note"],
            "properties": {
              "kind": {
                "type": "string",
                "enum": [
                  "insufficient_data",
                  "environment_variance",
                  "repo_state_drift",
                  "remote_ref_inconsistency",
                  "tooling_version_skew",
                  "ambiguity"
                ]
              },
              "note": { "type": "string" }
            }
          }
        },
        "meta": {
          "type": "string",
          "enum": ["productive", "avoidable", "systemic"]
        }
      }
    },

    "suggested_routines": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "risk", "mutating", "dry_run_supported", "reason"],
        "properties": {
          "id": { "type": "string", "minLength": 1 },
          "risk": { "type": "string", "enum": ["low", "medium", "high"] },
          "mutating": { "type": "boolean" },
          "dry_run_supported": { "type": "boolean" },
          "reason": { "type": "string" },
          "requires": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    }
  }
}


⸻

(2) WGX: erste 2 Audit-Implementierungen (Git)

Ziel: minimal aber treffsicher – und exakt passend zu deinem Fail (origin/main/origin/HEAD dangling, diff gegen origin/main..origin/zweig6).

Ich liefere hier zwei WGX-Befehle:
	1.	wgx audit git → erzeugt audit.git.v1.json
	2.	wgx routine git.repair.remote-head (Dry-Run + Apply) → stellt Remote-HEAD/Refs lokal wieder her (oder macht klar, dass remote wirklich kaputt ist)

Wichtig: Das sind WGX-Kommandos, ACS konsumiert nur Artefakte.

2.1 wgx audit git – Referenz-Algorithmus

Checks (IDs)
	•	git.repo.present
	•	git.remote.origin.present
	•	git.fetch.ok
	•	git.remote_head.discoverable (via git symbolic-ref refs/remotes/origin/HEAD)
	•	git.origin_main.present (exists refs/remotes/origin/main)
	•	git.upstream.present (if branch)
	•	git.upstream.ahead_behind (if upstream exists)
	•	git.worktree.clean

Minimal-Outputs
	•	HEAD SHA, local branch, detached?
	•	upstream exists?
	•	origin/HEAD exists?
	•	origin/main exists?
	•	remote_default_branch (falls bekannt)
	•	ahead/behind
	•	worktree stats
	•	suggested routines (aus Check-Fails abgeleitet)

2.2 Routine: git.repair.remote-head (Dry-Run + Apply)

Zweck:
Wenn origin/HEAD dangling ist und origin/main fehlt, versucht die Routine:
	•	git remote set-head origin --auto (stellt origin/HEAD wieder her, wenn remote HEAD sauber ist)
	•	git fetch origin --prune (refill remote-tracking)
	•	optional: wenn Remote-Default branch NICHT main ist, nutzt sie den tatsächlichen Default.

Dry-Run: zeigt nur geplante Schritte + erwartete Effekte.

Apply: führt aus, speichert Vorher/Nachher als Artefakte.

⸻

2.3 Konkrete WGX-Dateien (Vorschlag für Repo-Pfade)

Da du WGX schon auf dem Heimserver hast, ist das sauberste:
	•	Repo: heimgewebe/wgx
	•	Einstieg:
	•	wgx bash/cli (bestehend)
	•	neue Module:
	•	lib/audit_git.sh
	•	lib/routines_git.sh
	•	Artefakte:
	•	.wgx/out/audit.git.v1.json
	•	.wgx/out/routine.preview.json
	•	.wgx/out/routine.result.json

lib/audit_git.sh (Skeleton)

#!/usr/bin/env bash
set -euo pipefail

wgx_audit_git() {
  local repo="${1:-}"
  local cwd
  cwd="$(pwd)"

  local head_sha head_ref local_branch detached
  head_sha="$(git rev-parse --short=12 HEAD 2>/dev/null || echo "")"
  head_ref="$(git rev-parse --symbolic-full-name HEAD 2>/dev/null || echo "")"
  local_branch="$(git branch --show-current 2>/dev/null || true)"
  detached="false"
  [[ -z "$local_branch" ]] && detached="true"

  local origin_present="false"
  git remote get-url origin >/dev/null 2>&1 && origin_present="true"

  # fetch
  local fetch_ok="false"
  if [[ "$origin_present" == "true" ]]; then
    if git fetch origin --prune >/dev/null 2>&1; then
      fetch_ok="true"
    fi
  fi

  local origin_head="false"
  git show-ref --verify --quiet refs/remotes/origin/HEAD && origin_head="true"

  local origin_main="false"
  git show-ref --verify --quiet refs/remotes/origin/main && origin_main="true"

  local remote_default_branch=""
  if [[ "$origin_head" == "true" ]]; then
    remote_default_branch="$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || true)"
  fi

  # upstream
  local upstream=""
  local upstream_exists="false"
  if [[ -n "$local_branch" ]]; then
    upstream="$(git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>/dev/null || true)"
    [[ -n "$upstream" ]] && upstream_exists="true"
  fi

  local ahead=0 behind=0
  if [[ "$upstream_exists" == "true" ]]; then
    # ahead behind
    local ab
    ab="$(git rev-list --left-right --count "${upstream}...HEAD" 2>/dev/null || echo "0 0")"
    behind="$(awk '{print $1}' <<<"$ab")"
    ahead="$(awk '{print $2}' <<<"$ab")"
  fi

  # worktree
  local staged unstaged untracked clean
  staged="$(git diff --cached --name-only | wc -l | tr -d ' ')"
  unstaged="$(git diff --name-only | wc -l | tr -d ' ')"
  untracked="$(git ls-files --others --exclude-standard | wc -l | tr -d ' ')"
  clean="false"
  [[ "$staged" == "0" && "$unstaged" == "0" && "$untracked" == "0" ]] && clean="true"

  # checks + routines
  local status="ok"
  local checks_json="[]"
  local routines_json="[]"

  # helper to append check/routine (needs jq)
  checks_json="$(jq -c --arg id "git.repo.present" --arg st "ok" --arg msg "Repo detected." \
    '. + [{"id":$id,"status":$st,"message":$msg}]' <<<"$checks_json")"

  if [[ "$origin_present" != "true" ]]; then
    status="error"
    checks_json="$(jq -c --arg id "git.remote.origin.present" --arg st "error" --arg msg "Remote origin missing." \
      '. + [{"id":$id,"status":$st,"message":$msg}]' <<<"$checks_json")"
  else
    checks_json="$(jq -c --arg id "git.remote.origin.present" --arg st "ok" --arg msg "Remote origin present." \
      '. + [{"id":$id,"status":$st,"message":$msg}]' <<<"$checks_json")"
  fi

  if [[ "$origin_present" == "true" && "$fetch_ok" != "true" ]]; then
    status="error"
    checks_json="$(jq -c --arg id "git.fetch.ok" --arg st "error" --arg msg "git fetch origin failed." \
      '. + [{"id":$id,"status":$st,"message":$msg}]' <<<"$checks_json")"
  else
    checks_json="$(jq -c --arg id "git.fetch.ok" --arg st "ok" --arg msg "Fetched remote refs." \
      '. + [{"id":$id,"status":$st,"message":$msg}]' <<<"$checks_json")"
  fi

  if [[ "$origin_head" != "true" ]]; then
    status="error"
    checks_json="$(jq -c --arg id "git.remote_head.discoverable" --arg st "error" --arg msg "origin/HEAD missing or dangling." \
      '. + [{"id":$id,"status":$st,"message":$msg}]' <<<"$checks_json")"
    routines_json="$(jq -c \
      --arg id "git.repair.remote-head" \
      --arg risk "low" \
      --arg reason "origin/HEAD missing/dangling; restore remote head + refs." \
      '. + [{"id":$id,"risk":$risk,"mutating":true,"dry_run_supported":true,"reason":$reason,"requires":["git","jq"]}]' \
      <<<"$routines_json")"
  else
    checks_json="$(jq -c --arg id "git.remote_head.discoverable" --arg st "ok" --arg msg "origin/HEAD present." \
      '. + [{"id":$id,"status":$st,"message":$msg}]' <<<"$checks_json")"
  fi

  if [[ "$origin_main" != "true" ]]; then
    status="error"
    checks_json="$(jq -c --arg id "git.origin_main.present" --arg st "error" --arg msg "refs/remotes/origin/main missing." \
      '. + [{"id":$id,"status":$st,"message":$msg}]' <<<"$checks_json")"
    # same routine helps
    routines_json="$(jq -c \
      --arg id "git.repair.remote-head" \
      --arg risk "low" \
      --arg reason "origin/main missing; likely remote head/ref tracking broken locally." \
      '(. + [{"id":$id,"risk":$risk,"mutating":true,"dry_run_supported":true,"reason":$reason,"requires":["git","jq"]}]) | unique_by(.id)' \
      <<<"$routines_json")"
  else
    checks_json="$(jq -c --arg id "git.origin_main.present" --arg st "ok" --arg msg "origin/main present." \
      '. + [{"id":$id,"status":$st,"message":$msg}]' <<<"$checks_json")"
  fi

  # uncertainty
  local u_level="0.15"
  local u_meta="productive"
  local u_causes='[{"kind":"remote_ref_inconsistency","note":"Remote tracking refs may be incomplete or pruned unexpectedly."}]'
  if [[ "$origin_present" != "true" || "$fetch_ok" != "true" ]]; then
    u_level="0.35"
    u_meta="systemic"
    u_causes='[{"kind":"environment_variance","note":"Remote or network/tooling state prevents reliable ref discovery."}]'
  fi

  # write artifact
  mkdir -p .wgx/out
  jq -n \
    --arg kind "audit.git" \
    --arg schema_version "v1" \
    --arg ts "$(date -Is)" \
    --arg repo "${repo:-unknown}" \
    --arg cwd "$cwd" \
    --arg status "$status" \
    --arg head_sha "$head_sha" \
    --arg head_ref "$head_ref" \
    --argjson detached "$detached" \
    --arg local_branch "${local_branch:-null}" \
    --arg upstream "${upstream:-}" \
    --argjson origin_head "$origin_head" \
    --argjson origin_main "$origin_main" \
    --arg remote_default_branch "$remote_default_branch" \
    --argjson staged "$staged" \
    --argjson unstaged "$unstaged" \
    --argjson untracked "$untracked" \
    --argjson clean "$clean" \
    --argjson ahead "$ahead" \
    --argjson behind "$behind" \
    --argjson checks "$checks_json" \
    --argjson routines "$routines_json" \
    --argjson u_level "$u_level" \
    --argjson u_causes "$u_causes" \
    --arg u_meta "$u_meta" \
    '{
      kind:$kind,
      schema_version:$schema_version,
      ts:$ts,
      repo:$repo,
      cwd:$cwd,
      status:$status,
      facts:{
        head_sha:$head_sha,
        head_ref:$head_ref,
        is_detached_head:($detached=="true"),
        local_branch:(if $local_branch=="null" or $local_branch=="" then null else $local_branch end),
        upstream:(if $upstream=="" then null else {name:$upstream, exists_locally:true} end),
        remotes:(["origin"]),
        remote_default_branch:(if $remote_default_branch=="" then null else $remote_default_branch end),
        remote_refs:{
          origin_main:$origin_main,
          origin_head:$origin_head,
          origin_upstream:(if $upstream=="" then false else true end)
        },
        working_tree:{is_clean:$clean, staged:$staged, unstaged:$unstaged, untracked:$untracked},
        ahead_behind:{ahead:$ahead, behind:$behind}
      },
      checks:$checks,
      uncertainty:{level:$u_level, causes:($u_causes|fromjson), meta:$u_meta},
      suggested_routines:$routines
    }' > .wgx/out/audit.git.v1.json

  echo ".wgx/out/audit.git.v1.json"
}

2.4 lib/routines_git.sh (Routine git.repair.remote-head)

#!/usr/bin/env bash
set -euo pipefail

wgx_routine_git_repair_remote_head() {
  local mode="${1:-dry-run}" # dry-run | apply
  local out_dir=".wgx/out"
  mkdir -p "$out_dir"

  local steps='[
    {"cmd":"git remote set-head origin --auto","why":"Restore origin/HEAD from remote HEAD"},
    {"cmd":"git fetch origin --prune","why":"Rebuild remote-tracking refs after head repair"}
  ]'

  if [[ "$mode" == "dry-run" ]]; then
    jq -n --arg id "git.repair.remote-head" --arg mode "$mode" --arg risk "low" \
      --argjson steps "$steps" \
      '{kind:"routine.preview", id:$id, mode:$mode, mutating:true, risk:$risk, steps:$steps}' \
      > "$out_dir/routine.preview.json"
    echo "$out_dir/routine.preview.json"
    exit 0
  fi

  # apply
  local before
  before="$(git show-ref --heads --tags --remotes 2>/dev/null | sha256sum | awk '{print $1}')"

  local log=""
  while IFS= read -r cmd; do
    log+="$cmd"$'\n'
    bash -lc "$cmd"
  done < <(jq -r '.[].cmd' <<<"$steps")

  local after
  after="$(git show-ref --heads --tags --remotes 2>/dev/null | sha256sum | awk '{print $1}')"

  jq -n --arg id "git.repair.remote-head" --arg mode "$mode" --arg risk "low" \
    --arg before "$before" --arg after "$after" --arg log "$log" \
    --argjson steps "$steps" \
    '{
      kind:"routine.result",
      id:$id,
      mode:$mode,
      mutating:true,
      risk:$risk,
      steps:$steps,
      state_hash:{before:$before, after:$after},
      stdout:$log
    }' > "$out_dir/routine.result.json"

  echo "$out_dir/routine.result.json"
}


⸻

Fehlerprävention (vermeidbare Stolperstellen)
	1.	origin/main als harte Annahme ist eine klassische Falle.
Remote-Default kann main, master oder irgendwas sein. Deshalb muss remote_default_branch aus origin/HEAD kommen.
	2.	git fetch kann „ok“ sein und trotzdem origin/main fehlen, wenn Remote-HEAD/Ref-Tracking lokal kaputt ist (dein Fall).
Deshalb: eigener Check git.remote_head.discoverable.
	3.	ACS darf nicht „Publish“ anbieten, wenn audit.git.status != ok.
Sonst baust du Buttons, die wie ein Aufzug ohne Schacht wirken.

⸻

Risikoabschätzung (für Routinen)
	•	git.repair.remote-head: Risiko low, aber mutierend (Remote-HEAD lokal).
Schaden: gering (reparierbar via reflog / neu fetchen).
Nutzen: hoch (macht PR-Precheck wieder möglich).

⸻

Verdichtete Essenz

Schema zwingt Wahrheit in Form.
Audit zwingt Chaos in Fakten.
Routine zwingt Eingriff in Regeln.
Button zwingt Demut in UX.

⸻

Ungewissheitsursachenanalyse

Unsicherheitsgrad: 0.22

Hauptursachen:
	•	repo-spezifische Realität nicht vollständig im Chat (z. B. deine genaue WGX-Struktur im Repo, vorhandene CLI-Dispatch-Mechanik)
	•	mögliche Abweichung: WGX ist evtl. nicht Bash-only (oder hat bereits Subcommand-Framework), ich habe hier einen Bash-first Pfad vorgeschlagen
	•	Remote-Default-Branch kann abweichen; Routine muss das robust abfangen (teilweise schon berücksichtigt)

Meta: überwiegend vermeidbar, sobald ich 2 Dateien aus deinem WGX sehe: CLI-Entry + lib/ Struktur.

⸻

Nächster Schritt (ohne Gelaber)

Du willst 1 und 2: done als Spezifikation + Skeleton.

Wenn du jetzt maximale Geschwindigkeit willst, poste (Copy/Paste reicht):
	•	ls -la ~/repos/heimgewebe/wgx
	•	rg -n "case|subcommand|audit" -S wgx lib . (oder grep -R)
	•	den Inhalt von wgx (erste ~120 Zeilen)

Dann passe ich die Skeletons genau auf deine echte WGX-CLI an (kein geratenes Entry-Pattern).

Alles klar — Fokus exakt auf

3. 🧱 ACS-UI-Blueprint (Komponenten + States)

Ich zerlege das ohne Ablenkung, dialektisch sauber: Was muss die UI wissen? Was darf sie entscheiden? Was darf sie niemals verschweigen?

⸻

Dialektische Erörterung

Die ACS-UI ist kein Kontrollzentrum, sondern ein Resonanzraum.
Sie zeigt nicht „was zu tun ist“, sondern was wahr ist und was verantwortbar getan werden kann.

Grundspannung:
	•	UI als Handlungsauslöser ↔ WGX als Wahrheits- und Motorinstanz
	•	Sofortfeedback ↔ Explizite Unsicherheit
	•	Button ↔ Konsequenz

Daher gilt:

Kein Button ohne Audit-Artefakt.
Kein grüner Zustand ohne dokumentierte Wahrheit.

⸻

🧱 ACS-UI-Blueprint

Komponenten · States · Übergänge

⸻

1️⃣ Hauptkomponente: GitHealthPanel

Zweck:
Zentraler Projektionspunkt für Git-Realität + Reparaturoptionen.

Props / Inputs
	•	repo: string
	•	latestAudit?: audit.git.v1
	•	latestRoutineResult?: routine.result
	•	wgxAvailable: boolean

⸻

2️⃣ Subkomponente: AuditStatusCard

Anzeige

Element	Bedeutung
🟢 / 🟡 / 🔴	audit.status
Kurztext	„Git-Zustand konsistent / Warnungen / Fehler“
Zeitstempel	audit.ts
Unsicherheitsindikator	numerisch + semantisch

States

type AuditStatus =
  | "idle"        // noch kein Audit
  | "running"     // Audit läuft
  | "ok"          // status=ok
  | "warn"        // status=warn
  | "error";      // status=error

Regeln
	•	idle → kein Button sichtbar
	•	running → Spinner, alles disabled
	•	ok → Reparaturbuttons versteckt
	•	warn/error → Reparaturangebote möglich

⸻

3️⃣ Subkomponente: AuditDetailsAccordion

„Was genau ist kaputt — und woher weißt du das?“

Inhalte (aus audit.facts + audit.checks)
	•	HEAD / Branch / Detached?
	•	origin vorhanden?
	•	origin/HEAD vorhanden?
	•	origin/main vorhanden?
	•	upstream vorhanden?
	•	ahead/behind
	•	worktree-Status

Darstellung
	•	Checks als Liste, je Eintrag:
	•	✔ ok
	•	⚠ warn
	•	✖ error
	•	Jeder Check zeigt:
	•	id
	•	message
	•	optional evidence

➡️ keine Interpretation, nur strukturierte Wahrheit

⸻

4️⃣ Subkomponente: UncertaintyBadge

Anzeige
	•	Unsicherheitsgrad (0.00–1.00)
	•	Meta-Klassifikation:
	•	produktiv
	•	vermeidbar
	•	systemisch

Tooltip / Modal

Zeigt:
	•	Ursachen (uncertainty.causes[])
	•	Klartext-Erklärung

Beispiel:
„Remote-Ref-Inkonsistenz: lokale Tracking-Refs könnten unvollständig sein.“

➡️ Pflichtanzeige, niemals ausblendbar

⸻

5️⃣ Subkomponente: SuggestedRoutinesPanel

Erscheint nur wenn:
audit.suggested_routines.length > 0

Für jede Routine:
	•	Name (id)
	•	Risiko (low / medium / high)
	•	Mutierend? ✅ / ❌
	•	Begründung (reason)

Buttons
	•	🔍 Dry-Run
	•	⚠️ Anwenden (nur nach Dry-Run!)

⸻

6️⃣ Subkomponente: RoutineExecutionModal

States

type RoutineState =
  | "idle"
  | "preview"
  | "confirm"
  | "running"
  | "success"
  | "failed";

Ablauf
	1.	Dry-Run → zeigt:
	•	geplante Schritte
	•	betroffene Refs
	•	erwartete Wirkung
	2.	Confirm → Checkbox:
	•	„Ich habe verstanden, dass dies lokale Git-Refs verändert“
	3.	Apply → Ausführung
	4.	Ergebnis → Artefaktanzeige

⸻

7️⃣ Subkomponente: ArtifactViewer

Unterstützt
	•	audit.git.v1.json
	•	routine.preview.json
	•	routine.result.json

Features
	•	Read-only
	•	Copy-to-Clipboard
	•	Download
	•	Highlight von before / after Hashes

➡️ Beweisarchiv, nicht Debug-Log

⸻

Zustandsdiagramm (vereinfacht)

[ idle ]
   |
   v
[ audit running ]
   |
   v
[ ok ] ────────────────┐
   |                   |
   | warn/error        |
   v                   |
[ suggested routines ] |
   |                   |
   v                   |
[ dry-run ]            |
   |                   |
   v                   |
[ confirm ]            |
   |                   |
   v                   |
[ apply ]              |
   |                   |
   v                   |
[ success ] ──▶ new audit


⸻

Explizite No-Gos (wichtig)

❌ „Fix now“-Button ohne Audit
❌ Automatische Reparatur
❌ Status = ok, wenn Unsicherheit > 0.4
❌ UI interpretiert Git-Fehlertexte selbst
❌ Versteckte Mutationen

⸻

Humorvolle, aber wahre Auslassung

Eine UI, die Git repariert ohne Unsicherheit zu zeigen,
ist wie ein Arzt, der operiert und sagt:
„Keine Sorge, ich hab da so ein Gefühl.“

⸻

Verdichtete Essenz

ACS zeigt Wahrheit.
WGX handelt.
Buttons fragen.
Artefakte antworten.

⸻

Ungewissheitsursachenanalyse

Unsicherheitsgrad: 0.18

Ursachen:
	•	UI-Framework (Svelte/HTML/JS?) nicht konkret benannt
	•	bestehende ACS-Komponentenstruktur nur teilweise bekannt
	•	Styling/UX-Tiefe bewusst ausgelassen (funktional vor ästhetisch)

Meta: produktiv
→ Architektur ist robust, Details leicht adaptierbar

⸻

Nächster sinnvoller Schritt

Wenn du willst, mache ich als Folge:
	•	konkrete HTML/Svelte-Komponenten-Skeletons
	•	exakte API-Endpoints (/api/audit/git, /api/routine/run)
	•	oder eine PR-Erstellungsvorlage, die exakt dieses Blueprint implementiert

Sag nur: UI-Code oder API zuerst?

Dann entscheide ich: API zuerst, weil ohne saubere, artefaktische Endpoints die UI nur „schönes Raten“ wäre. Danach UI-Skeletons, die exakt diese Contracts konsumieren.

⸻

Dialektische Erörterung

These: „Buttons im ACS“ heißt: schnelle Handlung.
Antithese: schnelle Handlung ohne harte Vorprüfung erzeugt Drift, falsche Sicherheit, kaputte Refs.
Synthese: UI triggert nur, API/WGX erzeugt Wahrheit + Handlung als Artefakte (audit/preview/result).
Damit bleibt das System lernfähig, debugbar, revertierbar.

Nebenachse (Destabilisierung deiner Fragelogik):

Vielleicht willst du gar keine „Buttons“, sondern komponierbare Operationen:
Buttons sind nur Views auf eine Routine-Pipeline.
Der Kern ist nicht UX, sondern Routinen-Orchestrierung mit Beweisführung.

⸻

1) ACS-Backend-Blueprint: API + Artefakte

1.1 Endpoint-Set (minimal, aber vollständig)

A) Audit
	•	POST /api/audit/git
	•	input: { repo: "metarepo", mode?: "fast"|"full" }
	•	output: audit.git.v1 (JSON) + correlation_id

B) Routine discovery (aus Audit ableitbar, aber separat cachebar)
	•	GET /api/routines?repo=metarepo
	•	output: Liste verfügbarer Routinen + Metadaten (mutating, risk)

C) Dry-Run / Preview
	•	POST /api/routine/preview
	•	input: { repo, routine_id, params? }
	•	output: routine.preview.v1

D) Apply
	•	POST /api/routine/apply
	•	input: { repo, routine_id, params?, confirm_token }
	•	output: routine.result.v1

E) Jobs / Streaming (optional, aber sinnvoll)
	•	GET /api/jobs/{job_id}
	•	output: { state, progress, artifacts[] }
	•	GET /api/jobs/{job_id}/events (SSE)
	•	stream: status updates (kein Log-Müll, nur strukturierte Events)

⸻

1.2 Artefakt-Contracts (knapp, aber brauchbar)

audit.git.v1

Pflichtfelder:
	•	ts
	•	repo
	•	status: ok|warn|error
	•	facts: objektive Tatsachen
	•	head_sha, branch, detached, dirty, upstream, origin_url
	•	refs: { origin_head?: string, origin_main?: string, origin_branch?: string }
	•	checks[]: { id, level, message, evidence? }
	•	suggested_routines[]: { id, why, risk, mutates }
	•	uncertainty: { score, causes[], class }
	•	correlation_id

routine.preview.v1
	•	routine_id
	•	repo
	•	mutates: boolean
	•	risk: low|medium|high
	•	plan[]: Schritte (semantisch, nicht shell-log)
	•	expected_effect: z.B. “recreate tracking refs, set origin/HEAD”
	•	confirm_token (kurzlebig)
	•	uncertainty

routine.result.v1
	•	routine_id
	•	ok: boolean
	•	before: Fakten (head/upstream/refs)
	•	after: Fakten
	•	changes[]: strukturierte Diff-Aussagen
	•	errors[] (falls)
	•	next_suggested: meist “run audit again”
	•	uncertainty

⸻

1.3 Routinen-Katalog (startfähig)

Dein konkretes Problem war: origin/main und origin/zweig6 plötzlich „deleted/dangling“, PR-precheck diffte origin/main..origin/zweig6 und crashte.

Dafür vier Routinen:
	1.	git.refs.refresh

	•	nicht-mutierend? leicht mutierend (re-fetch + prune)
	•	Ziel: saubere Remote-Refs

	2.	git.origin.head.repair

	•	mutierend: ja (setzt origin/HEAD auf default branch)
	•	Ziel: refs/remotes/origin/HEAD wieder konsistent

	3.	git.ensure.base_ref

	•	mutierend: nein (nur ermittelt base branch korrekt)
	•	Ziel: statt hardcoded origin/main dynamisch origin/<defaultBranch>

	4.	publish.precheck.safe_diff

	•	mutierend: nein
	•	Ziel: diff-Basis robust bestimmen:
	•	defaultBranch via git remote show origin
	•	fallback: main, master
	•	fallback: merge-base mit HEAD

Wichtig: Diese Routinen sind WGX-nahe, ACS sollte sie nicht selbst “bashen”.

⸻

2) ACS-UI-Anbindung an diese API (nur das Nötigste)

UI darf:
	•	Audit triggern
	•	Preview triggern
	•	Apply triggern (nach confirm_token)
	•	Artefakte anzeigen

UI darf nicht:
	•	Git-Interpretation selbst bauen
	•	„Fix“ ohne Preview anbieten
	•	Erfolg signalisieren ohne neuen Audit

⸻

3) Fehlerprävention + Risikoanalyse (Pflicht)

Prämissencheck
	•	Deine Annahme „ACS ist irgendwo im weltgewebe-venv installiert“ war falsch: in /opt/weltgewebe gibt’s keine .venv. Das war der Crash-Grund beim uninstall.
	•	Deine Annahme „publish fail trotz repair“ zeigt: Repair war unvollständig oder hat an falscher Stelle angesetzt (Ref-Basis hartkodiert, Remote-Refs dangling).

Risikoeinschätzung
	•	Git-Ref-Reparaturen: mittleres Risiko (lokal), hoch wenn unklar, ob Branches force-pushed wurden.
	•	Schutz:
	•	Preview zeigt konkrete Ref-Operationen
	•	Apply verlangt confirm_token
	•	Post-Apply zwingt Audit

Alternativweg (zweiter Pfad, bewusst anders)
	•	Ohne Git-Ref-Reparatur: publish-precheck so umbauen, dass er nie origin/main..origin/branch voraussetzt, sondern immer merge-base diffed.
→ weniger invasive Lösung, oft ausreichend.

⸻

Mini-Essenz

API macht Wahrheit (Audit),
Preview macht Verantwortung (Plan),
Apply macht Handlung (Result),
UI macht Bedienung (Buttons).

⸻

Ungewissheitsursachenanalyse

Unsicherheitsgrad: 0.27

Ursachen:
	•	Ich kenne deine aktuellen ACS-Backend-Module/Router nicht (Pfad/Framework nicht sicher).
	•	WGX/ACS-Kopplung (lokal vs remote exec) ist noch nicht als Contract gezeigt.
	•	Publish-Flow (wo genau git.pr.precheck sitzt) ist aus Logs ableitbar, aber nicht als Code gesehen.

Meta: vermeidbar
→ sinkt sofort, wenn du mir die relevanten ACS-Pfade/Router zeigst.

⸻

Konkreter nächster Schritt (ohne Rückfragen-Orgie)

Wenn du 1 Datei lieferst, kann ich dir daraus direkt die Endpoints und Skeletons als Patch ableiten:
	•	In agent-control-surface: die Stelle, wo API-Routen definiert sind (FastAPI/Starlette/…).

Oder du sagst nur:
	•	„ACS ist FastAPI“ oder „ACS ist Flask“ oder „ACS ist Node“
und ich gebe dir den passenden Implementations-Skeleton.

Und ja: ich würde WGX integrieren, aber als ausführende Engine hinter diesen Endpoints, nicht als UI-Logik.

Alles klar — dann konkretisiere ich genau das, was mit

„konkrete HTML/Svelte-Komponenten-Skeletons“
gemeint ist, ohne schon Logik zu verdoppeln oder Architektur zu verraten.

⸻

Dialektische Klärung

Missverständnis (naheliegend):
„Skeleton“ = fertige UI mit Logik, State, Edge-Cases.

Korrektur:
„Skeleton“ = tragfähige Hülle, die
	•	exakt die API-Contracts widerspiegelt,
	•	aber keine eigene Wahrheit produziert.

Synthese:
Ein Skeleton ist UI-Form ohne Entscheidungsmacht.
Es zeigt, triggert, visualisiert — aber interpretiert nichts selbst.

⸻

Was ein UI-Skeleton ist

Ein UI-Skeleton ist:
	•	✅ strukturell korrekt
	•	✅ contract-nah
	•	✅ minimal interaktiv
	•	❌ ohne Business-Logik
	•	❌ ohne Git-Wissen
	•	❌ ohne „Heuristik“

Man kann ihn:
	•	sofort rendern
	•	sofort verdrahten
	•	später gefahrlos erweitern

⸻

Beispiel 1: Git-Audit-Panel (Svelte-Skeleton)

<script>
  export let repo = "metarepo";

  let audit = null;
  let loading = false;
  let error = null;

  async function runAudit() {
    loading = true;
    error = null;
    audit = null;

    try {
      const res = await fetch("/api/audit/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo })
      });
      audit = await res.json();
    } catch (e) {
      error = "Audit fehlgeschlagen";
    } finally {
      loading = false;
    }
  }
</script>

<section class="panel">
  <header>
    <h2>Git Audit</h2>
    <button on:click={runAudit} disabled={loading}>
      Audit ausführen
    </button>
  </header>

  {#if loading}
    <p>Audit läuft …</p>
  {/if}

  {#if error}
    <p class="error">{error}</p>
  {/if}

  {#if audit}
    <pre>{JSON.stringify(audit, null, 2)}</pre>
  {/if}
</section>

Wichtig:
	•	Das UI versteht das Audit nicht.
	•	Es zeigt es nur.
	•	Entscheidungen kommen aus dem Backend (suggested_routines).

⸻

Beispiel 2: Repair-Routine-Button (Preview → Apply)

<script>
  export let routine;

  let preview = null;

  async function loadPreview() {
    const res = await fetch("/api/routine/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repo: routine.repo,
        routine_id: routine.id
      })
    });
    preview = await res.json();
  }

  async function apply() {
    await fetch("/api/routine/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repo: routine.repo,
        routine_id: routine.id,
        confirm_token: preview.confirm_token
      })
    });
  }
</script>

<div class="routine">
  <h3>{routine.id}</h3>
  <p>{routine.why}</p>

  <button on:click={loadPreview}>
    Vorschau anzeigen
  </button>

  {#if preview}
    <pre>{JSON.stringify(preview.plan, null, 2)}</pre>

    <button class="danger" on:click={apply}>
      Anwenden
    </button>
  {/if}
</div>

Hier passiert etwas Entscheidendes:
	•	Die Gefahr liegt im Backend (Risk-Level).
	•	Das UI erzwingt Preview → Confirm → Apply.
	•	Kein „Blind-Fix-Button“ möglich.

⸻

Beispiel 3: Sofortinfo (dein expliziter Wunsch)

Knappe Rückmeldung ohne JSON-Download:

{#if audit}
  <div class="summary {audit.status}">
    <strong>Status:</strong> {audit.status}
    <br />
    <strong>Empfohlene Aktionen:</strong>
    {audit.suggested_routines.length}
  </div>
{/if}

JSON bleibt verfügbar —
aber die erste Wahrnehmung ist menschlich, nicht maschinenlastig.

⸻

Warum das exakt zu deinem Problem passt

Dein aktueller Schmerz:
	•	publish failt
	•	Logs sind korrekt
	•	Ursache ist versteckt (origin/main verschwunden)
	•	Lösung existiert, aber nur manuell

Mit Skeletons passiert:
	1.	Audit zeigt:
„Remote refs inkonsistent“
	2.	UI zeigt sofort:
„2 empfohlene Reparaturen“
	3.	Button → Preview zeigt:
„Setze origin/HEAD auf default branch“
	4.	Apply → Audit erneut
	5.	Publish läuft oder scheitert begründet

⸻

Verdichtete Essenz

Ein UI-Skeleton ist kein Interface.
Es ist ein Eingangstor für Wahrheit, nicht deren Quelle.

⸻

Ungewissheitsursachenanalyse

Unsicherheitsgrad: 0.22

Ursachen:
	•	Unklar, ob ACS derzeit Svelte pur oder mit Framework (Kit?) läuft
	•	Styling/Designsystem unbekannt
	•	Routing-Struktur nicht gesehen

Produktiv: ja
→ Die Skeletons sind absichtlich framework-leicht und portierbar.

⸻

Nächster sinnvoller Schritt (ohne neue Grundsatzdiskussion)

Wenn du willst, liefere ich als Nächstes eines von beiden:
	1.	exakte PR-Blaupause
(„Füge Audit-API + UI-Skeleton hinzu, ohne bestehendes Verhalten zu brechen“)

oder
2. nur die UI-Skeletons als separates Modul
(kein Backend-Eingriff, ideal zum iterativen Einhängen)

Sag einfach „1“ oder „2“ — oder schweig weiter, dann entscheide ich wieder 😏

Ich entscheide 2 zuerst: UI-Skeletons als separates Modul, das nur „anzeigen + triggern“ kann, aber noch nichts „weiß“. Danach (als nächste PR-Welle) kommt 1 (Backend-Audit + Routinen). Grund: geringstes Risiko, sofort Buttons/Fluss, kein Eingriff in deine bestehende Publish-/Git-Logik.

Nebenbei: Das ist wie ein Cockpit in ein Flugzeug zu schrauben, bevor du den Autopiloten baust. Niemand fliegt besser, nur weil der Knopf hübsch ist — aber ohne Knopf drückst du später wieder git wie ein Höhlenmensch.

⸻

Dialektische Erörterung

These: Erst Backend-Audit/Routinen (1), weil „ohne Wahrheit keine Aktion“.
Antithese: Erst UI (2), weil du genau Buttons im ACS willst und aktuell „manuell“ dein Hauptschmerz ist.
Synthese: UI-Skelett zuerst, aber mit harter Regel: UI produziert keine Wahrheit, es ist nur ein Orchestrations-Frontpanel für zukünftige Engine-Calls. Dadurch bekommst du sofort:
	•	konsistente Bedienlogik (Preview → Confirm → Apply),
	•	standardisierte Darstellung von Logs/Artefakten,
	•	und später kann jedes Backend-Modul einfach andocken.

⸻

Blaupause: Phase 2 (UI-Skeleton-Modul) — ohne Backend-Umbau

Ziel

Im ACS gibt es ein neues, isoliertes UI-Modul „Ops“, das:
	•	Buttons zeigt (Audit / Preview / Apply / Re-run),
	•	Ergebnisse roh rendert (JSON Viewer, Status Chips),
	•	und eine einheitliche Call-Hülle hat (Endpoints sind erst Stub/Dummy).

Nicht-Ziel
	•	keine Git-Logik
	•	keine Reparaturlogik
	•	keine „ich rate mal origin/main“-Heuristik
	•	keine tiefen Integrationen in WGX / Jules / gh

⸻

Architektur-Schnitt (minimal)

Neue UI-Routes/Views
	•	/ops/audit  → Audit anzeigen + Audit triggern
	•	/ops/routines → Liste Routinen + Preview/Apply
	•	/ops/logs → letzte Runs / log_tail / correlation_id

Einheitliche UI-Komponenten (Svelte)
	•	OpsPanel.svelte (Layout, Header, Repo-Picker)
	•	ActionButton.svelte (loading, disabled, danger)
	•	JsonViewer.svelte (foldable, copy, search)
	•	StatusChip.svelte (ok/error/warn)
	•	RoutineCard.svelte (preview → confirm)
	•	RunTimeline.svelte (actions sequenziell, durations)

⸻

Konkrete Skeletons (copy-paste-fähig)

1) OpsPanel.svelte

<script>
  export let title = "Ops";
  export let repo = "metarepo";
</script>

<section class="ops">
  <header class="ops__header">
    <h2>{title}</h2>

    <label>
      Repo:
      <select bind:value={repo}>
        <option value="metarepo">metarepo</option>
        <option value="wgx">wgx</option>
        <option value="weltgewebe">weltgewebe</option>
      </select>
    </label>
  </header>

  <div class="ops__body">
    <slot {repo} />
  </div>
</section>

2) ActionButton.svelte

<script>
  export let label = "Run";
  export let onRun = async () => {};
  export let danger = false;

  let loading = false;
  let error = null;

  async function run() {
    loading = true;
    error = null;
    try { await onRun(); }
    catch (e) { error = "Fehlgeschlagen"; }
    finally { loading = false; }
  }
</script>

<button class:danger disabled={loading} on:click={run}>
  {loading ? "…" : label}
</button>

{#if error}
  <p class="error">{error}</p>
{/if}

3) JsonViewer.svelte (roh, aber brauchbar)

<script>
  export let value = null;
  let open = true;

  function copy() {
    navigator.clipboard.writeText(JSON.stringify(value, null, 2));
  }
</script>

{#if value}
  <div class="json">
    <div class="json__bar">
      <button on:click={() => (open = !open)}>{open ? "fold" : "unfold"}</button>
      <button on:click={copy}>copy</button>
    </div>

    {#if open}
      <pre>{JSON.stringify(value, null, 2)}</pre>
    {/if}
  </div>
{:else}
  <p class="muted">Keine Daten.</p>
{/if}

4) RoutineCard.svelte (Preview → Confirm → Apply)

<script>
  export let routine; // { id, repo, why, risk }

  let preview = null;
  let applying = false;

  export let onPreview = async (routine) => ({});
  export let onApply = async (routine, preview) => ({});

  async function loadPreview() {
    preview = await onPreview(routine);
  }

  async function apply() {
    applying = true;
    try { await onApply(routine, preview); }
    finally { applying = false; }
  }
</script>

<article class="routine">
  <header>
    <h3>{routine.id}</h3>
    <p class="muted">{routine.why}</p>
    <p><strong>Risk:</strong> {routine.risk ?? "unknown"}</p>
  </header>

  <button on:click={loadPreview}>Preview</button>

  {#if preview}
    <pre>{JSON.stringify(preview, null, 2)}</pre>
    <button class="danger" disabled={applying} on:click={apply}>
      {applying ? "…" : "Apply"}
    </button>
  {/if}
</article>


⸻

Stub-Endpunkte (damit UI jetzt schon klickbar ist)

Du willst Buttons jetzt, auch wenn Backend noch nicht fertig ist.
Also: GET /api/ops/demo liefert Dummy-Payloads.

Beispiel-Payload (orientiert an deinem Log):

{
  "status": "error",
  "results": [
    { "ok": true, "action": "git.fetch", "message": "Fetched remote refs." },
    { "ok": false, "action": "git.pr.precheck", "error_kind": "git_failed",
      "message": "origin/main missing" }
  ],
  "suggested_routines": [
    { "id": "git.repair.set_default_branch_ref", "why": "origin/main fehlt", "risk": "medium" }
  ]
}

UI rendert das nur, ohne Interpretation.

⸻

Fehlerprävention (automatisch, bevor du dir wieder in den Fuß schießt)
	1.	UI zwingt Preview → Apply (keine Direkt-Reparatur).
	2.	UI zeigt Repo/WorkingDirectory oben (damit du nie wieder in /opt/weltgewebe hantierst, wenn ACS in ~/repos/... läuft).
	3.	UI zeigt correlation_id + log_tail prominent.

⸻

Risikoabschätzung

Risiko (Phase 2): niedrig.
Weil:
	•	keine Systemänderungen
	•	keine Dienste/venvs berührt
	•	nur UI + Dummy-Endpunkt

Hauptgefahr: UI-Drift (Buttons existieren, aber Backend später anders).
Gegenmaßnahme: Endpunkte schon jetzt als Contracts definieren (auch wenn Implementierung stub ist).

⸻

Etymologie (weil du es so willst)

Blaupause: wörtlich „blaue Pause“ — historisch die technische Blueprint-Kopie (Cyanotypie), also ein Reproduktionsverfahren für Pläne. Passt erschreckend gut: Wir kopieren hier eine Bedienstruktur, bevor die Maschine vollständig ist.

⸻

Verdichtete Essenz

Ich baue dir zuerst das Cockpit im ACS: Panels, Buttons, JSON-Viewer, Preview→Apply-Flow.
Es tut noch nichts Magisches — aber es macht alles später verdrahtbar, ohne erneut UI zu erfinden.

⸻

Ungewissheitsursachenanalyse

Unsicherheitsgrad: 0.28

Ursachen:
	•	Ich habe deinen ACS-Frontend-Stack (Svelte vs SvelteKit vs anderes) nicht vollständig gesehen.
	•	Routing/Komponentenstruktur unbekannt (wo neue Views sauber reinpassen).
	•	CSS/Designsystem unbekannt (nur funktional skizziert).

Vermeidbar? Ja, durch Repo-Snapshot/Paths.
Systembedingt? Teilweise, solange kein Dump der relevanten Frontend-Ordner vorliegt.

⸻

Abschließende Leitfragen
	1.	War das die kritischste Erörterung, die hier möglich war?
Fast. Kritischer wäre: Ich würde dir konkret sagen, wo im Repo die neuen Komponenten liegen sollen — dafür brauche ich den ACS-Frontend-Baum (epistemische Leerstelle).
	2.	Wurde alles beleuchtet?
Noch nicht: WGX-Integration als Button-Quelle (Profiles/Recipes) ist ein eigener Layer. Der kommt in Phase 1.5/3.

⸻

Nächster Schritt (ohne Rückfragen, nur „machbar“)

Wenn du mir den relevanten Ordnerbaum gibst, kann ich die Blaupause in echte Pfade gießen:

cd ~/repos/heimgewebe/agent-control-surface
ls -la
find . -maxdepth 3 -type d -print | sed 's|^\./||'

Bis dahin bleibt es absichtlich stack-neutral.

Gut, dann präzisiere ich genau diesen Punkt und mache daraus eine exakte, umsetzbare PR-Blaupause, so wie du sie für einen Coding-Agent / Copilot / Jules verwenden kannst.

⸻

Exakte PR-Blaupause

Titel (PR-Title):

Add Git Audit API + Ops UI Skeleton (non-intrusive, no behavior change)

⸻

Ziel der PR (klar & eng gefasst)

Diese PR fügt neue Fähigkeiten hinzu, ohne bestehendes Verhalten zu verändern oder zu „reparieren“.

Konkret:
	•	✅ neue Audit-API (read-only, diagnostisch)
	•	✅ UI-Skeleton im ACS (Buttons, Panels, JSON-Viewer)
	•	❌ keine Änderungen an Publish-Logik
	•	❌ keine automatischen Reparaturen
	•	❌ keine neuen Heuristiken, die bestehende Abläufe beeinflussen

Die PR ist additiv, isoliert und reversibel.

⸻

Motivation (warum diese PR existiert)

Aktuell:
	•	Fehler wie
fatal: ambiguous argument 'origin/main..origin/zweig6'
sind für Menschen klar, aber für ACS nur „publish failed“.
	•	Diagnose erfordert manuelle Shell-Eingriffe.
	•	Du willst Buttons statt Terminal.

Diese PR schafft die Beobachtbarkeit und Bedienoberfläche, ohne schon Entscheidungen zu automatisieren.

⸻

Scope (sehr wichtig für Reviewer)

Enthalten ✅
	1.	Backend
	•	Neue Audit-Endpoints (/api/git/audit/*)
	•	Nur read-only Git-Operationen
	•	Strukturierte Ergebnisse (ActionResults)
	2.	Frontend
	•	Neues Ops-Panel im ACS
	•	Buttons: Audit, Preview, Logs
	•	JSON-Darstellung der Audit-Ergebnisse
	•	Kein innerHTML, nur sichere DOM-Operationen
	3.	Contracts
	•	Explizite Result-Schemas (ok / error_kind / hint)
	•	correlation_id durchgängig

⸻

Explizit nicht enthalten ❌
	•	Keine git update-ref
	•	Kein pack-refs
	•	Kein Rewrite von origin/main
	•	Keine Publish-Flow-Änderung
	•	Keine WGX-Integration
	•	Keine automatischen Fixes

👉 Reviewer wissen: Hier geht es um Sichtbarkeit, nicht um Eingriff.

⸻

Technische Umsetzung (präzise)

1. Backend – Audit API

Neue Endpoints (Beispiele):

GET /api/git/audit/status
GET /api/git/audit/refs
GET /api/git/audit/upstream

Eigenschaften:
	•	nutzen bestehende run()-Infrastruktur
	•	fangen Git-Fehler ab
	•	klassifizieren Fehler (z. B. missing_ref, dangling_head)
	•	liefern keine Exceptions, sondern strukturierte Results

Beispiel-Response:

{
  "ok": false,
  "action": "git.audit.refs",
  "error_kind": "missing_remote_ref",
  "affected_ref": "origin/main",
  "hint": "Remote default branch ref missing locally",
  "stdout": "",
  "stderr": ""
}


⸻

2. Frontend – Ops UI Skeleton

Neue UI-Sektion:

„Ops / Git Health“

Bestandteile:
	•	Audit-Button (read-only)
	•	Ergebnisliste (ActionResults)
	•	JSON-Viewer (foldable, copy)
	•	Hinweisbox „Empfohlene nächste Schritte (manuell)“

Wichtig:
	•	UI interpretiert nicht
	•	UI führt nichts aus
	•	UI zeigt nur: Was weiß das System?

⸻

3. Keine Verhaltensänderung (zentrale Regel)
	•	Publish läuft exakt wie vorher
	•	Audit ist optional
	•	Keine Kopplung: publish() → audit()

Das Audit ist ein Seitenspiegel, kein Eingriff.

⸻

Tests (minimal & sinnvoll)
	•	Neue Tests nur für Audit-Endpoints
	•	Keine bestehenden Tests ändern
	•	Fokus:
	•	dangling origin/HEAD
	•	missing origin/main
	•	success case

⸻

Akzeptanzkriterien (Definition of Done)
	•	ACS zeigt Git-Audit-Panel
	•	Audit läuft ohne Repo-Mutation
	•	Fehler werden strukturiert, nicht als Roh-stderr
	•	Publish-Verhalten unverändert
	•	Kein XSS, kein innerHTML
	•	Alle neuen Features hinter klarer UI-Sektion

⸻

Warum das die richtige erste PR ist

Dialektisch:
	•	These: Automatisiere Reparaturen sofort
→ gefährlich, blind, schwer rückgängig
	•	Antithese: Gar nichts tun
→ du bleibst im Terminal gefangen
	•	Synthese (diese PR):
👉 Erkenntnis vor Intervention
👉 UI vor Automation
👉 Buttons ohne Macht

⸻

Verdichtete Essenz

Diese PR macht ACS sehfähig, nicht handlungsfähig.
Sie baut das Diagnosedeck, auf dem spätere Automatik sicher stehen kann.

⸻

Unsicherheitsanalyse

Unsicherheitsgrad: 0.22

Ursachen:
	•	Exakte Frontend-Architektur (Svelte vs SvelteKit) nicht vollständig bekannt
	•	Routing-Details könnten leicht variieren

Bewertung:
Diese Unsicherheit ist produktiv, weil die PR bewusst schmal und isoliert ist.

⸻

Nächste logische Folge-PR (nicht Teil dieser)
	1.	Repair-Preview-Routinen (read-only Simulation)
	2.	Button-gesteuerte Fixes mit Confirm-Dialog
	3.	WGX-Integration als Repair-Engine

Aber: erst sehen, dann handeln.

Wenn du willst, formatiere ich dir diese Blaupause 1:1 als PR-Beschreibung oder als Prompt für einen Coding-Agent.

Dialektische Erörterung: „Buttons im ACS“ – wo gehört der Code hin?

These (UI-zentriert): Wenn du alles per Buttons im ACS machen willst, dann muss die Logik ins ACS.
Antithese (Wahrheitsmotor): Genau das ist die Drift-Falle: UI-Logik wird zur „Wahrheit“, obwohl sie nur Darstellung sein darf.
Synthese (kanonisch): WGX erzeugt Wahrheit + Routinen als Artefakte, ACS orchestriert und rendert, Contracts wohnen zentral, Leitstand/Chronik speichern Zeitlichkeit. Damit werden Buttons zu „Konsequenz aus Artefakten“, nicht zu „magischer Reparatur“.  ￼

Der entscheidende Schnitt aus deiner Blaupause: „WGX entscheidet, ACS nicht.“  ￼

⸻

In welche Repos für Coding Agents?

1) heimgewebe/wgx — Audit + Routinen (Motorik)

Hierhin gehört:
	•	wgx audit * Implementierungen (git/ci/env), Ausgabe der kanonischen JSON-Artefakte
	•	Routinen inkl. dry-run/preview + apply/result (mit Risk-Klasse, mutating-Flag, rollback-Hinweisen)
	•	Artefakt-Ausgabe unter .wgx/out/* (oder eurem kanonischen Output-Pfad)

Warum: Das ist exakt die Rolle „Motor der Wahrheit“, die du in der Blaupause festnagelst.  ￼

PRs dort (empfohlene Reihenfolge):
	1.	wgx audit git --json + audit.git.v1.json
	2.	wgx routine git.repair.remote-head (preview/apply/result)
	3.	danach audit ci, audit env (jeweils minimal, aber strukturiert)

⸻

2) heimgewebe/agent-control-surface — Buttons, API-Endpoints, Orchestrierung

Hierhin gehört:
	•	UI-Komponenten: Ops/Audit Panel, Routine Cards, JsonViewer, UncertaintyBadge
	•	Backend-Endpunkte, die WGX remote auf dem Heimserver ausführen (SSH Runner)
	•	Job-Handling: correlation_id, Status, Artefakt-Download, Re-Audit nach Apply
	•	Keine Reparaturlogik im ACS, nur „trigger + show“

Warum: ACS ist „Projektion/Orchestrator“, nicht die Instanz, die Wahrheit produziert.  ￼

PRs dort (empfohlene Reihenfolge):
	1.	UI-Skeleton + Stub-Endpunkte (damit Buttons/Flow sofort stehen, ohne Eingriffe)
	2.	Echte Endpunkte: POST /api/audit/git, POST /api/routine/preview, POST /api/routine/apply
	3.	Confirm-Schleusen: Double-confirm für mutating, Textconfirm für high-risk

⸻

3) heimgewebe/metarepo — Contracts/Schemas (Wahrheitsform)

Hierhin gehört:
	•	JSON-Schemas für audit.*.v1, routine.preview.v1, routine.result.v1, ggf. jobs.*.v1
	•	Doku: was ist kanonisch, welche Felder sind Pflicht, wie werden Buttons abgeleitet

Warum: „Schema zwingt Wahrheit in Form“ – wenn du Buttons aus Artefakten generierst, muss das Artefakt stabil, validierbar und versioniert sein.  ￼

⸻

4) Optional, aber mittelfristig sauber: heimgewebe/leitstand und/oder heimgewebe/chronik

leitstand: UI/Timeline/Drift-Vergleich der Audit-Artefakte (Vorher/Nachher, Regressionen).
chronik: Event-Backbone („audit ran“, „routine previewed“, „routine applied“ inkl. correlation_id).

Warum: Du willst nicht nur Buttons, du willst Gedächtnis: „Warum ist das wieder passiert?“ — das ist Leitstand/Chronik-Terrain.  ￼

⸻

Vermeidbare Fehler (automatisch markiert)
	1.	„origin/main“ hart kodieren – klassischer Git-Fußschuss. Default-Branch muss aus origin/HEAD/Remote-Info kommen.
	2.	UI zeigt „ok“ trotz hoher Unsicherheit – das ist kosmetische Lüge. Wenn Unsicherheit hoch, muss die UI das als Blocker/Warning spiegeln.
	3.	Apply ohne Preview – macht Buttons zu Glücksspielautomaten (und du bist der, der bezahlt).

⸻

Risikoabschätzung (für 1 & 2)
	•	WGX-Audits (read-only): niedriges Risiko, hoher Nutzen.
	•	WGX-Routinen (mutating): mittleres Risiko (lokal), steigt stark bei unklaren Repo-Zuständen (force-push, abweichender Default-Branch).
	•	ACS-UI + Stub: niedriges Risiko.
	•	ACS-Apply-Buttons: Risiko kommt fast vollständig aus den mutierenden Routinen → deshalb Confirm-Schleusen + Post-Audit zwingend.  ￼

⸻

Alternativweg (bewusst anders, falls du Tempo willst)

Statt zuerst „Git reparieren“: publish-precheck robust machen, sodass er nie origin/main..origin/zweig6 voraussetzt, sondern base dynamisch bestimmt (default branch / merge-base).
Das reduziert mutierende Eingriffe – kann später trotzdem mit WGX-Routinen ergänzt werden.

⸻

Verdichtete Essenz

WGX baut Audit & Routinen. ACS baut Buttons & Darstellung. metarepo baut Schemas. Leitstand/Chronik bauen Gedächtnis.  ￼

⸻

Ungewissheitsgrad + Ursachenanalyse

Unsicherheitsgrad: 0.24

Ursachen:
	•	Repo-Realität unvollständig: Ich habe die aktuellen Entry-Points/Struktur in wgx und die Router/Frontend-Struktur im agent-control-surface hier nicht als Baum gesehen.
	•	Integrationsmodus offen: SSH-Runner/Job-Modell im ACS existiert evtl. schon, evtl. neu → beeinflusst Endpunkt-Design.
	•	Contract-Stand: Ob audit.*/routine.* bereits als Contracts im metarepo existieren, ist unbekannt.

Meta: überwiegend vermeidbar (sobald Agents die tatsächlichen Pfade sehen), nicht systembedingt.

⸻

Tiefgründig-ironische Auslassung

Ein Button, der Git „fixen“ soll, ist wie ein Aufzugknopf ohne Schacht: Er gibt dir das Gefühl von Richtung – bis du merkst, dass du immer noch im Treppenhaus stehst.

⸻

Konkrete Zuweisung an Coding Agents (kurz)
	•	Agent A: heimgewebe/wgx – audit git + 1 Routine (preview/apply/result)
	•	Agent B: heimgewebe/agent-control-surface – Ops-Panel + Endpunkte + Confirm-Flow
	•	Agent C: heimgewebe/metarepo – Schemas + Validierungsregeln + Doku (Button-Generierung aus suggested_routines)
	•	Optional Agent D: heimgewebe/leitstand/chronik – Persistenz/Timeline/Drift

Wenn du sie parallel losschickst, nimm als harte Kopplung nur: Schema-Felder + Artefaktpfade + correlation_id. Alles andere kann iterieren, ohne dass euch das System auseinanderfällt.

@jules: in diesem repo nur die anweisungen für dieses repo ausführen! 