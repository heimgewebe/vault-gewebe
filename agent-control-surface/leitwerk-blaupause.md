Gut – dann jetzt **konsequent, korrigiert und ohne falsche Anker**.  
Du hast recht: **Codex ist kein einbindbarer Runtime-Agent**. Punkt.  
Codex ist _Entwicklungsumgebung_, nicht Teil des Organismus.

Ich überarbeite die Blaupause daher **fundamental präzisiert**, ohne Umfangsbloat, aber mit **klarer Implementierbarkeit**.

---

# **Blaupause: leitwerk (final, bereinigt)**

## Agentengesteuerte Multirepo-Koordination für Heimgewebe

_(ACS Control-Surface · Jules/Copilot SDK als Agent-Engines · eigene Engine optional)_

---

## Dialektische Erörterung

### These

Ein autopoetisches Heimgewebe entsteht nicht durch „KI, die Code schreibt“, sondern durch **verantwortete Handlungsketten**:

> **Command → Planung → Ausführung → Guard → Artefakt → Beobachtung → Rückkopplung**

**leitwerk** ist das Organ, das diese Kette **ausführt und zusammenhält**.  
Nicht denkend, nicht deutend – **handelnd, absichernd, dokumentierend**.

---

### Antithese

Wenn Agenten direkt schreiben dürfen (egal ob Copilot oder Jules), entstehen:

- implizite Entscheidungen ohne Ort,
    
- verdeckte Semantikverschiebungen,
    
- PRs ohne Systemgedächtnis.
    

Das ist keine Agentik, sondern **delegierte Verantwortungslosigkeit**.

---

### Synthese

Die stabile Form ist:

> **leitwerk koordiniert – Agenten liefern Vorschläge – Guards entscheiden**

Agenten sind austauschbar.  
leitwerk ist invariant.

---

## 1) Zielbild (präzise, umsetzende Variante)

**leitwerk** ist ein in ACS eingebettetes (Sidecar-basiertes) Koordinationsorgan, das:

- menschliche Prompts **und** systemische Trigger verarbeitet,
    
- daraus **strukturierte Arbeitspläne** erzeugt,
    
- agentische Engines **gezielt** aufruft (Jules CLI, Copilot SDK, später eigene),
    
- alle Änderungen **branch-only** ausführt,
    
- **pro Repo** nachvollziehbare PRs erzeugt,
    
- **WGX-Guards zwingend** ausführt,
    
- jeden Schritt als **Artefakt + Event** in Chronik persistiert,
    
- und damit den Organismus veränderbar hält, ohne ihn zu destabilisieren.
    

---

## 2) Unverhandelbare Invarianten

- **metarepo = Control-Plane** (Fleet-SoT, Policies, interne Contracts).
    
- **Contracts-first**: kein relevantes Artefakt ohne Schema.
    
- **Events ≠ Commands**: leitwerk nimmt Commands an, emittiert Events.
    
- **Branch-only**: niemals `main`/`master`.
    
- **WGX entscheidet**, nicht der Agent.
    
- **Observability = Audit**, nicht Dashboard.
    
- **Unsicherheit ist explizit** (Artefakt, kein Bauchgefühl).
    

---

## 3) Rollenklärung (korrigiert)

### leitwerk (ausführend)

**Tut:**

- plant Arbeitsschritte,
    
- koordiniert Repos,
    
- ruft Agent-Engines auf,
    
- wendet Patches an,
    
- startet Guards,
    
- erzeugt PRs,
    
- schreibt Events & Artefakte.
    

**Tut nicht:**

- kein Selbstmodell,
    
- keine semantische Bewertung,
    
- keine Policy-Neugewichtung.
    

---

### agent-control-surface (ACS)

**Tut:**

- UI für Prompts, Pläne, Status,
    
- explizite Freigaben (Repos, Pfade, Ausführung),
    
- Anzeige von Plan → Diff → Guard → PR.
    

**Kein Autopilot. Keine stillen Writes.**

---

### Heimgeist

**Tut:**

- verarbeitet Artefakte aus leitwerk,
    
- erkennt Drift, Spannungen, Wiederholungen,
    
- schreibt Reflexions- und Aktionsartefakte.
    

**Tut nicht:**

- keine Repo-Änderungen,
    
- keine Agent-Steuerung.
    

---

### Agent-Engines (austauschbar)

Beispiele:

- **Jules CLI**
    
- **GitHub Copilot SDK**
    
- später: eigene Engine
    

**Rolle:**

- Vorschläge erzeugen (Plan, Patch, Tool-Intent),
    
- **niemals** direkt final schreiben.
    

---

## 4) Architektur (minimal & realistisch)

```
User
 ↓
ACS
 ↓
leitwerk (Sidecar)
 ├─ Plan Builder
 ├─ Repo Graph Resolver (metarepo)
 ├─ Agent Adapter (Jules / Copilot SDK)
 ├─ Patch Applier (branch-only)
 ├─ WGX Enforcer
 └─ Event + Artefakt Writer → Chronik
```

---

## 5) Arbeitsfluss (konkret)

1. Prompt oder Trigger kommt rein
    
2. leitwerk erstellt **Plan-Artefakt**
    
3. Plan wird in ACS angezeigt (vor Ausführung)
    
4. Agent-Engine liefert:
    
    - Patch-Vorschläge
        
    - Begründung
        
    - Unsicherheitsbericht
        
5. leitwerk wendet Patch an (Branch)
    
6. WGX guard / smoke
    
7. PR wird erzeugt
    
8. Events + Artefakte → Chronik
    
9. Heimgeist bekommt Input
    

---

## 6) Task- & Artefaktmodell

### Task-Zustände

```
CREATED
→ PLANNED
→ EXECUTING
→ GUARDED
→ PR_CREATED
→ DONE | FAILED
```

### Kanonische Artefakte

- `plan.v1`
    
- `patchset.v1`
    
- `execution.log.v1`
    
- `guard.report.v1`
    
- `pr.manifest.v1`
    
- `uncertainty.report.v1`
    

Schemas: **metarepo-owned**.

---

## 7) Agent-Abstraktion (entscheidend)

```python
AgentEngine.run(
  task_request,
  context_bundle,
  constraints
) -> {
  plan,
  patches,
  rationale,
  uncertainty
}
```

leitwerk entscheidet **immer**, was davon realisiert wird.

---

## 8) Multi-Repo-Koordination

- Repos werden topologisch sortiert:
    
    1. Contract-Owner
        
    2. Produzenten
        
    3. Konsumenten
        
- Pro Repo:
    
    - eigener Branch
        
    - eigene PR
        
- PR-Chain-Manifest dokumentiert Abhängigkeiten
    
- Merge erst, wenn **alle Guards grün**
    

---

## 9) Sicherheit (Membran konkret)

- Repo- & Pfad-Allowlists
    
- Diff-Schwellen (Hard-Stop bei Überschreitung)
    
- Repo-Locking
    
- Kill-Switch jederzeit
    
- Secrets-Redaction vor Agent-Übergabe
    

---

## 10) Betrieb

### Services

- `agent-control-surface.service`
    
- `leitwerk.service`
    

Mit:

- `NoNewPrivileges=true`
    
- `ProtectSystem=strict`
    
- gezielten `ReadWritePaths`
    

---

## 11) Verdichtete Essenz

**leitwerk ist das Organ, das Agenten handhabbar macht.  
Es ersetzt keine Intelligenz – es ersetzt Verantwortungslosigkeit.**

---

## 12) Ironische Auslassung

Ein Agent ohne leitwerk ist wie ein Praktikant mit Generalschlüssel:  
hochmotiviert, erstaunlich schnell – und völlig ahnungslos, was tragend ist.

---

## ∴fore — Ungewissheit

**Unsicherheitsgrad:** 0.18

**Ursachen:**

- konkrete Agent-Adapter (Jules/Copilot SDK) noch nicht implementiert,
    
- finale Artefakt-Schemas noch nicht festgeschrieben.
    

**Meta:**  
Diese Ungewissheit ist **strukturell erlaubt**, weil leitwerk auf Austauschbarkeit und Guard-Zwang ausgelegt ist.

---

Wenn du willst, gehe ich als Nächstes **konkret** in eine dieser Richtungen:

1. **Minimal-MVP von leitwerk** (Dateien, Module, Schnittstellen)
    
2. **Agent-Adapter-Design** (Jules CLI vs. Copilot SDK)
    
3. **Plan-Schema v1** als Contract
    
4. **ACS-UI-Flows** (was sieht man wann)
    

Sag mir, wo wir einhaken.