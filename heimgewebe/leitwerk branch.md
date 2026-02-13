## Dialektische Erörterung: „Branch-Protection + CI-Policy“ ausarbeiten

### These

Wenn leitwerk ernst meint „Branch-only, kein Direkt-Write, Guards als Gate“, dann muss das **nicht in Notizen** stehen, sondern **im Durchsetzungssystem** wohnen: Branch-Protection + ein CI-Workflow, der die minimalen Regeln prüft.

### Antithese

Zu hart zu früh kann nerven: mehr Reibung, mehr „warum blockt das“, mehr Admin-Aufwand. Außerdem: Branch-Protection ist GitHub-Setting (nicht versioniert), CI ist Code (versioniert). Man will beides, aber sauber getrennt.

### Synthese

Du baust ein _zweistufiges Schloss_:

1. **GitHub Branch-Protection**: verhindert das „physische“ Direkt-Schreiben.
    
2. **CI-Policy (repo-code)**: verhindert „logisches“ Durchschlüpfen und liefert erklärbare Diagnostik.
    

Branch-Protection ist die Tür. CI ist der Türsteher, der auch sagt _warum_.

---

## Zielbild Phase 1 (konkret)

### A) Branch-Protection (GitHub Settings) – Minimal-Set

Für `main` (und ggf. `master`, falls vorhanden):

- **Require a pull request before merging**
    
- **Require status checks to pass before merging**
    
    - Pflicht-Checks:
        
        - `Guard contracts mirror` (hast du)
            
        - optional: `lint/test` falls existieren
            
- **Require linear history** (optional, aber oft gut)
    
- **Require conversation resolution** (optional)
    
- **Restrict who can push to matching branches** (wichtig: nur Admins)
    
- **Do not allow bypassing the above settings** (oder bypass nur Admins)
    

**Fehlerprävention:**

- Wenn du „Allow auto-merge“ nutzt: nur erlauben, wenn die Status-Checks stabil sind, sonst erzeugt das „Auto-merge Roulette“.
    

---

### B) CI-Policy im Repo (versioniert) – Minimal-Set

Du hast bereits einen Guard für `contracts/`. Für „Branch-only“ brauchst du einen zweiten Guard-Workflow, der **Direkt-Writes** (Pushes) auf geschützte Branches nicht „verhindert“ (das macht Protection), aber **sichtbar macht** und optional blockt, falls Protection mal falsch konfiguriert ist oder Repo gespiegelt wird.

#### Workflow 1 (existiert): `guard-contracts-mirror.yml`

- Trigger: `pull_request` inkl. `edited` (hast du)
    
- Zweck: Spiegelregel erzwingen (`SYNC_SOURCE:`)
    

#### Workflow 2 (neu): `guard-branch-only.yml` (Policy-Guard)

**Zweck:**

- PRs müssen von Branch kommen (nicht „main -> main“)
    
- optional: verbiete PRs, die direkt Policies ändern (wenn ihr das wollt)
    

**Trigger:**

- `pull_request` (opened/synchronize/reopened/edited)
    
- optional zusätzlich `push` auf `main` (nur für Alarm/Fail-fast)
    

**Checks (Phase 1 pragmatisch):**

- PR `head.ref` darf nicht `main` sein (keine PR aus main heraus)
    
- PR `base.ref` muss `main` sein (oder euer Zielbranch)
    
- optional: wenn `policies/**` geändert wird → „Meta-Prozess required“ (z. B. Label/PR-Template Feld)
    

Das ist die Stelle, wo du „Policy“ tatsächlich codierst.

---

## Konkreter Vorschlag: `guard-branch-only.yml`

```yaml
name: Guard branch-only workflow

on:
  pull_request:
    types: [opened, synchronize, reopened, edited]

jobs:
  guard-branch-only:
    runs-on: ubuntu-latest
    steps:
      - name: Enforce branch-only PRs
        env:
          BASE_REF: ${{ github.base_ref }}
          HEAD_REF: ${{ github.head_ref }}
        run: |
          set -euo pipefail

          if [[ "${BASE_REF}" != "main" ]]; then
            echo "Blocked: base branch must be main (got: ${BASE_REF})."
            exit 1
          fi

          if [[ "${HEAD_REF}" == "main" ]]; then
            echo "Blocked: PRs must come from a feature branch, not from main."
            exit 1
          fi

          echo "OK: branch-only policy satisfied (head=${HEAD_REF} -> base=${BASE_REF})."
```

**Warum so simpel?**  
Weil Branch-Protection die harte Barriere ist. CI ist die _erklärende Barriere_.

---

## Optional: Meta-Prozess für Policy-Änderungen (ohne Overkill)

Wenn du wirklich vermeiden willst, dass jemand „mal eben“ `policies/` ändert:

- In CI: Wenn `policies/**` betroffen → verlange `SYNC_SOURCE:`-analog ein Feld im PR-Body, z. B.
    
    - `POLICY_DECISION: <id>` oder `META_PROCESS: yes`
        
- Oder: GitHub-Label required (ist aber wieder Settings-lastig)
    

Phase 1 würde ich eher: **Warnen statt Blocken**, außer du bist schon im „Schutzhelm-Modus“.

---

## Prämissencheck (Pflicht)

- **Bist du alleiniger Maintainer?** Dann ist Branch-Protection vor allem Selbstschutz gegen „ich drücke aus Versehen“.
    
- **Gibt es mehrere Mitwirkende?** Dann ist Branch-Protection Pflicht, sonst ist „Policy“ nur Literatur.
    

---

## Alternativweg (wenn du GitHub-Settings vermeiden willst)

Wenn du Branch-Protection nicht anfassen willst/kannst:

- CI kann Direkt-Pushes erkennen (via `push` Workflow) und failing alarmieren.
    
- Aber: **zu spät**. Es verhindert nichts, es dokumentiert nur den Unfall.
    

Branch-Protection bleibt die einzige echte Prävention.

---

## Verdichtete Essenz

**Branch-Protection verhindert den Unfall, CI erklärt und standardisiert die Regeln.**  
Phase 1 braucht: Branch-only + required status checks (mindestens contracts mirror + branch-only guard).

---

## ∴fore — Ungewissheit

**Unsicherheitsgrad:** 0.18  
**Ursachen:**

- Ich kenne deine aktuellen Repo-Settings, Branch-Namen (`main` vs `master`) und bestehenden Workflows nicht vollständig.
    
- Unklar, ob `policies/` in leitwerk wirklich „heilig“ oder evolvierbar ist.
    

**Meta:** vermeidbar durch kurze Repo-Info (Default-Branch, gewünschte Härtegrade).

---

## Ironische Auslassung (kurz, aber pflichtgemäß)

Branch-Protection ist wie ein Türschloss: Es beleidigt niemanden persönlich – aber es erinnert jeden daran, dass „Vertrauen“ eine schlechte CI-Strategie ist.

Wenn du willst, formuliere ich dir auch den **PR-Erstellungsprompt** für den neuen `guard-branch-only.yml` inkl. Begründung und Testplan.