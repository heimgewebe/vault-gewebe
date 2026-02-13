## Dialektische Erörterung

**These**  
Du brauchst einen **ACS-“Git Health / Repair”-Flow**, der _die konkrete Fehlerklasse_ (`cannot lock ref`, `dangling origin/HEAD`, kaputte `refs/remotes/origin/*`) zuverlässig erkennt und **gestuft** behebt, ohne Magie: Diagnose → sanfte Reparatur → gezielte Ref-Löschung → optional pack-refs. Dazu: klare UI-Meldungen + ActionResults.

**Antithese**  
Wenn ACS Git-Refs verändert, ist das ein Vertrauens- und Haftungsthema: „Hat ACS meine Branches gelöscht?“ Der Flow muss deshalb **transparenter** sein als ein Terminal. Ein Button ohne Preview ist schlechter als gar keiner.

**Synthese**  
Wir bauen:

1. **Read-only Diagnose** (null Risiko)
    
2. **Geführte Reparatur** (3 Stufen, jeweils einzeln, mit Output, ohne “silent fix”)
    
3. **Auto-Offer** im Publish-Flow: Wenn `git.fetch` an genau dieser Klasse scheitert, zeigt UI “Fix anbieten”.
    

---

## Folge-PR Erstellungs-Prompt (Plan + Umsetzung)

Kopiere das als Prompt für deinen PR-Ersteller (Jules/Copilot/whatever). Kein Rumlabern, direkt umsetzen.

```text
TITLE
ACS: Add Git Remote Ref Healthcheck + Guided Repair (prune/update-ref/pack-refs) with UI actions

CONTEXT
In ACS PR Wizard "Publish" can fail during git.fetch with errors like:
- "cannot lock ref ..."
- "unable to resolve reference refs/remotes/origin/HEAD"
- "refs/remotes/origin/HEAD has become dangling"
User currently fixes manually via:
  git remote prune origin
  git fetch --prune origin
  git update-ref -d refs/remotes/origin/main
  git update-ref -d refs/remotes/origin/HEAD
  git pack-refs --all --prune
Need a safe, transparent, guided repair flow inside ACS (not a magic button).

GOALS
1) Add a read-only "Git Diagnose" action for a repo (no writes).
2) Add a guided "Repair remote tracking refs" flow with 3 stages:
   A) prune+fetch
   B) delete specific broken refs (origin/HEAD + optionally origin/<base>) then fetch
   C) pack-refs prune then fetch
3) Surface results as ActionResults and show a clear status banner in the UI.
4) Integrate with Publish: when git.fetch fails with known ref-lock/dangling patterns, UI should suggest running the repair flow.

NON-GOALS / SAFETY
- Never modify local branches refs/heads/*
- Never modify remote (GitHub) branches
- Never force push / rebase / reset
- Repairs only touch refs/remotes/origin/* and packed-refs housekeeping.
- Always show the exact commands that will run and their stdout/stderr.
- Do not auto-run repair without explicit user click.

IMPLEMENTATION PLAN

A) Backend: new helpers in panel/app.py (or a small module panel/git_health.py if cleaner)
1) classify_git_ref_error(stderr: str) -> dict
   Detect patterns:
   - "cannot lock ref"
   - "unable to resolve reference"
   - "has become dangling"
   - "packed refs are corrupt" (if appears)
   Return structured fields: kind, hint, affected_ref(optional)
2) git_remote_diagnose(path) -> ActionResult
   Run read-only commands:
   - git status --porcelain
   - git remote -v
   - git show-ref (filter refs/remotes/origin)
   - git symbolic-ref refs/remotes/origin/HEAD (ok if fails)
   - git rev-parse --abbrev-ref --symbolic-full-name @{u} (ok if fails)
   Collect into ActionResult(s) or one aggregated ActionResult with sections.
3) git_remote_repair_stage_a(path, base_branch, head_ref_name) -> ActionResult
   - git remote prune origin
   - git fetch --prune origin
4) git_remote_repair_stage_b(path, base_branch) -> ActionResult
   - git update-ref -d refs/remotes/origin/HEAD || true
   - optionally also: refs/remotes/origin/<base_branch> if classify says base ref is broken (gate by checkbox in UI)
   - git fetch --prune origin
5) git_remote_repair_stage_c(path) -> ActionResult
   - git pack-refs --all --prune
   - git fetch --prune origin
Each stage returns ActionResult with ok, error_kind (e.g. ref_repair_failed), message, stdout, stderr, code.

B) Backend: endpoints / job wiring
1) Extend existing job model to support running:
   - git.diagnose
   - git.repair.stage_a
   - git.repair.stage_b
   - git.repair.stage_c
Prefer to reuse existing job queue/polling used by Publish.
2) Ensure all results recorded with record_job_result(job_id, result).

C) Frontend: panel/templates/index.html
1) Add new buttons in PR Wizard:
   - "Diagnose Git"
   - "Repair Git Refs (Stage A)"
   - "Repair Git Refs (Stage B)"
   - "Repair Git Refs (Stage C)"
2) Add a small info box explaining:
   "Only cleans local tracking refs refs/remotes/origin/*; does not delete branches on GitHub."
3) When Publish fails:
   If last failing ActionResult is git.fetch and classify_git_ref_error matches, show inline suggestion:
   "Looks like local remote refs are inconsistent. Run Repair Stage A."
4) Status banner:
   Already improved in earlier patch: keep that pattern. Ensure last failing action is summarized.

D) Tests (pytest)
Add tests similar to test_publish_remote_protocol.py style with run_side_effect:
1) classify_git_ref_error detection for each pattern
2) repair stage A runs remote prune + fetch
3) stage B runs update-ref -d for origin/HEAD and then fetch
4) stage C runs pack-refs then fetch
5) publish failure path: when git.fetch returns stderr containing "cannot lock ref", ensure UI suggestion flag (or result.error_kind) is set.
If UI suggestion is hard to test, ensure backend returns error_kind like "ref_lock" and message includes hint.

E) Contracts / result shape
If ActionResult schema exists, extend allowed action values:
- git.diagnose
- git.repair.stage_a
- git.repair.stage_b
- git.repair.stage_c
Add error_kind values:
- ref_lock
- dangling_ref
- resolve_ref_failed
- ref_repair_failed
Keep backward compatible.

FILES TO TOUCH
- panel/app.py (or new panel/git_health.py imported by app.py)
- panel/templates/index.html
- tests/test_git_health.py (new) and/or extend tests/test_publish_remote_protocol.py
- If there is a schema/type file for ActionResult, update it accordingly.

ACCEPTANCE CRITERIA
- User can click "Diagnose Git" and see output in publish log.
- If publish fails with dangling/lock refs error, UI suggests repair.
- Running Stage A fixes common cases; Stage B/C available for stubborn cases.
- No changes to local branches or remote branches.
- Tests cover key patterns and command sequences.

NOTES
- Keep the UX explicit: show commands that will run.
- Use timeouts similar to other git operations (20-60s).
```

---

## Vermeidbare Fehler (vor dem Umsetzen)

- **Nicht** Stage B pauschal `origin/main` löschen. Nur `origin/HEAD` sicher; `origin/<base>` nur bei klarer Diagnose oder Checkbox.
    
- **Nicht** “auto-run repair” beim Publish-Fail. Nur “offer”.
    
- **Nicht** Diagnose als “ok” werten, wenn Commands failen: lieber ActionResult ok=false, aber nicht als fatal.
    

---

## Risikoabschätzung

- **Technisch:** niedrig bis mittel (Ref-Eingriffe), aber durch Stufen + Transparenz kontrolliert.
    
- **Organisatorisch:** niedrig (klarer Nutzen, nachvollziehbar).
    
- **UX-Vertrauen:** mittel – hängt komplett am Wording “nur lokale Tracking-Refs”.
    

---

## Verdichtete Essenz

Mach aus „Terminal-Zauber“ einen ACS-Repair-Assistenten: Diagnose → Stufe A/B/C → bei Publish-Fail nur anbieten.

---

## Ungewissheit & Ursachenanalyse

**Unsicherheitsgrad:** 0.22  
**Ursache:** Ich sehe nicht dein aktuelles ACS-Endpunktlayout / Job-API / ActionResult-Contract. Der Prompt ist trotzdem so geschrieben, dass ein Implementierer die Stellen findet und sauber integriert. Wenn ihr schon eine Job-Action-Registry habt, muss das mapping dort erfolgen.

Wenn du mir den relevanten Ausschnitt zu euren bestehenden Publish-Endpunkten/ActionResult-Struct gibst (oder den JSON-Log aus `/mnt/data/acs-publish-...json`), kann ich den Prompt noch härter auf eure tatsächlichen Namen/Paths pinnen (Null-Interpolation).