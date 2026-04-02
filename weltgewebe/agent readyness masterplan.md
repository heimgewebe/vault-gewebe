**These:** Ja — kontrolliert angehen ist richtig. Für echte Agent-Readiness braucht ihr keinen Prompt-Kunstnebel, sondern eine **harte Repo-Diagnose**, dann eine **Priorisierungslogik**, dann erst **Umsetzung**.

**Antithese:** „Komplett-Sichtung und alles auf Linie bringen“ kann schnell in Dokumenten-Totalitarismus kippen: endlose Umräumung, ohne dass am Ende klarer ist, was eigentlich kanonisch ist. Vollständigkeit allein schafft keine Agentenfähigkeit.

**Synthese:** Wir machen daraus **ein Audit mit Entscheidungslogik**. Nicht „alles lesen und schön finden“, sondern:  
**Welche Dateien tragen Wahrheit? Welche widersprechen sich? Welche führen Agenten sicher? Welche erzeugen Drift?**

## Was wir da gerade machen

Wir bauen **kein Agentenfile**, sondern zuerst ein **Wahrheitssystem**, aus dem später jeder Agent sauber lesen kann.  
Ein Agent ist dann nur noch ein abgeleiteter Leser. Ohne dieses Fundament wird aus „KI-Unterstützung“ schnell „automatisierte höfliche Verwirrung“.

---

# Diagnose-Only: belegter Ist-Zustand

## 1) Es gibt bereits eine formale Agentenstruktur

**Belegt: `AGENTS.md`**

> `Begin with repo.meta.yaml and docs/index.md to understand the truth structure.`  
> `Canonical Sources`  
> `- repo.meta.yaml`  
> `- AGENTS.md`  
> `- docs/index.md`

**Deutung:**  
Es existiert bereits ein deklarierter Wahrheitskern. Das ist gut.  
**Aber:** Die Lesereihenfolge ist nur grob, nicht vollständig operationalisiert.

---

## 2) Das Repo hat bereits Policy-Grenzen

**Belegt: `agent-policy.yaml`**

> `forbidden_write_paths:`  
> `- docs/_generated/`  
> `requires_target_proof_for:`  
> `- .github/workflows/`  
> `- apps/`  
> `- deployment/`  
> `- infra/`  
> `- src/`

**Deutung:**  
Sehr gut: Patch-Disziplin und Schutzräume sind schon angelegt.  
**Aber:** Die Policy regelt vor allem **Schreibgrenzen**, noch nicht sauber genug die **Lesewahrheit** und **Konfliktauflösung**.

---

## 3) `repo.meta.yaml` definiert Struktur, aber noch nicht genug Konfliktlogik

**Belegt: `repo.meta.yaml`**

> `entrypoints:`  
> `- README.md`  
> `- AGENTS.md`  
> `- docs/index.md`

> `canonical_sources:`  
> `- repo.meta.yaml`  
> `- AGENTS.md`  
> `- docs/index.md`

> `generated_artifacts:`  
> `- docs/_generated/agent-readiness.md`

**Deutung:**  
Das Repo kennt Einstiegspfade, kanonische Quellen und sogar ein Agent-Readiness-Artefakt.  
**Aber:** Es fehlt noch explizit:

- **Quellrangfolge bei Widerspruch**
    
- **Domäneninvarianten als kompakter Agenten-Kern**
    
- **Prüfschritte, wann ein Agent abbrechen muss**
    

---

## 4) `docs/index.md` ist stark als Navigationskarte, aber noch kein Agenten-Protokoll

**Belegt: `docs/index.md`**

> `## Canonical Knowledge`  
> `### System`  
> `– Start: architekturstruktur.md`  
> `– Vertrauen & Garnrolle: konzepte/garnrolle-und-verortung.md`  
> `– UI State Machine: blueprints/ui-state-machine.md`

> `## Policies & Orientierung`  
> `– Agenten-Manifest: weltgewebe-agenten-manifest.md`  
> `– Privacy: specs/privacy-api.md, specs/privacy-ui.md`

**Deutung:**  
Sehr guter menschlicher Einstieg.  
**Aber:** Für Agenten ist das noch zu sehr **Bibliothek** und zu wenig **Operationsprotokoll**.

---

## 5) Zentrale Domänenwahrheiten sind vorhanden und stark

**Belegt: `docs/specs/privacy-api.md`**

> `Das Modell nutzt mode: "verortet" | "ron" als basalen Identitätsmodus`

**Belegt: `docs/specs/privacy-ui.md`**

> `Beim ersten Einstieg ... befindet sich der Nutzer im RoN-Startmodus.`

> `Nicht erlaubt`  
> `- nachträglicher RoN-Toggle`  
> `- Vermischung von Identität und Sichtbarkeit`

**Belegt: `docs/adr/ADR-0003__privacy-ungenauigkeitsradius-ron.md`**

> `RoN ist kein bloßer nachträglicher Privacy-Toggle ... sondern ein eigenständiger, kanonischer Identitätsmodus.`

**Deutung:**  
Hier liegt bereits echte Agentenwahrheit: präzise, normativ, implementierungsrelevant.  
Das ist ein starker Kern für spätere Agentenregeln.

---

## 6) Die UI-State-Machine ist bereits agententauglich präzise

**Belegt: `docs/blueprints/ui-state-machine.md`**

> `Die UI kennt genau drei globale Zustände:`  
> `navigation`  
> `fokus`  
> `komposition`

> `Diese Variable ist die einzige globale Zustandsquelle.`

> `Diese Zustände dürfen nie auftreten:`  
> `systemState === "fokus" AND selection === null`

**Deutung:**  
Exzellent für Agent-Readiness. Das ist schon fast „maschinenlesbare Normativität in Markdown“.

---

# Resonanz- und Kontrastprüfung: zwei plausible Deutungen

## Deutung A — „Repo ist fast agent-ready“

Plausibel, weil:

- kanonische Quellen definiert sind,
    
- Policies existieren,
    
- zentrale Domänenregeln stark dokumentiert sind,
    
- UI- und Privacy-Invarianten klar beschrieben sind.
    

## Deutung B — „Repo ist erst formal agent-ready“

Ebenso plausibel, weil:

- Einstieg, Wahrheit, Konfliktlösung und Abbruchbedingungen noch nicht zu einem **strikten Leseprotokoll** verschmolzen sind,
    
- `docs/index.md` eher Navigations- als Entscheidungsdokument ist,
    
- generated readiness erwähnt wird, aber nicht als durchsetzbare operative Instanz sichtbar ist.
    

**Mein Zwischenurteil:**  
**Deutung B ist derzeit stärker.**  
Ihr seid **gut vorbereitet**, aber noch nicht **hart operationalisiert**.

---

# Epistemische Leere

**X fehlt, nötig für Y.**

- **Konfliktauflösungsregel fehlt**, nötig für eindeutige Agentenentscheidungen bei widersprüchlichen Docs.
    
- **Explizites Leseprotokoll fehlt**, nötig für reproduzierbares Verhalten über verschiedene Agenten hinweg.
    
- **Abbruch-/Escalation-Regel fehlt**, nötig damit Agenten bei Unklarheit nicht interpolieren.
    
- **Vollständige Sichtung aller relevanten Dokumente fehlt**, nötig für eine belastbare Endbewertung.
    
- **Generated-Readiness-Artefakte sind noch nicht geprüft**, nötig um zu sehen, ob das Repo seine eigene Ordnung bereits maschinell spiegelt.
    

---

# Masterplan

## Phase 0 — Audit-Rahmen festziehen

Ziel: Bevor wir „verbessern“, definieren wir, **wonach** wir bewerten.

**Ergebnisartefakte**

- Audit-Achsen
    
- Bewertungsmatrix
    
- Prioritätslogik
    
- Stop-Kriterien für spätere Änderungen
    

**Audit-Achsen**

1. Einstieg
    
2. Kanonizität
    
3. Domäneninvarianten
    
4. Architektur-/UI-Invarianten
    
5. Schreib-/Patch-Grenzen
    
6. Generated Knowledge
    
7. Test-/CI-Anbindung
    
8. Agenten-Lesbarkeit
    
9. Drift-/Widerspruchslage
    

---

## Phase 1 — Vollsichtung und Inventur

Ziel: Alle relevanten Doku- und Policy-Dateien erfassen und klassifizieren.

**Wir sichten mindestens diese Klassen:**

- Root: `README.md`, `AGENTS.md`, `repo.meta.yaml`, `agent-policy.yaml`, `CONTRIBUTING.md`
    
- `docs/index.md`
    
- alle `docs/specs/`
    
- alle `docs/adr/`
    
- alle `docs/blueprints/`
    
- `docs/policies/`, `docs/process/`, `docs/reference/`
    
- `docs/_generated/` nur lesend, nie schreibend
    
- relevante CI-/Guard-Dateien in `.github/workflows/` und `scripts/docmeta*`
    

**Pro Datei erfassen wir:**

- Rolle
    
- Normativitätsgrad
    
- Zielgruppe: Mensch / Agent / beide
    
- Konfliktpotenzial
    
- Veraltungsrisiko
    
- Änderungsbedarf
    

**Lieferobjekt:**  
eine **Agent-Readiness-Landkarte**.

---

## Phase 2 — Kanonizitätsprüfung

Ziel: Herausarbeiten, **was Wahrheit ist** und was nur Hilfstext.

**Fragen**

- Welche Dateien sind bindend?
    
- Welche sind nur navigierend?
    
- Welche sind historisch?
    
- Welche wiederholen Normen doppelt?
    
- Welche widersprechen implizit anderen Quellen?
    

**Ergebnis**

- Rangordnung der Quellen, z. B.:
    
    1. ADRs / Specs für Domänen- und Verhaltenswahrheit
        
    2. `repo.meta.yaml` + `AGENTS.md` für Agenten- und Repo-Wahrheit
        
    3. `docs/index.md` für Navigation
        
    4. Generated Files für Diagnose, nicht für Ursprung
        

Das ist eine plausible Zielrichtung, **aber noch nicht final belegt**, bis die Vollsichtung fertig ist.

---

## Phase 3 — Drift- und Widerspruchsanalyse

Ziel: Sichtbar machen, wo Agenten heute falsch lesen könnten.

**Typische Driftklassen**

- Begriffsdrift: `RoN`, `verortet`, `public_pos`, `Ungenauigkeitsradius`
    
- Prozessdrift: Diagnose vs. Patch
    
- Architekturdrift: UI-State-Machine vs. Implementierungsdoku
    
- Quellendrift: ADR/Spec sagt A, Navigationsseite suggeriert B
    
- Maschinen-/Menschen-Doppelung: gute Doku, aber schlechte Agentenlesbarkeit
    

**Lieferobjekt:**  
eine **Widerspruchs- und Resonanzmatrix**.

---

## Phase 4 — Sollbild „Agenten-Leseprotokoll“

Ziel: Das Repo so verdichten, dass jeder Agent denselben Lesepfad hat.

**Dieses Sollbild enthält**

- feste Lesereihenfolge
    
- Quellrangfolge
    
- Abbruchregeln
    
- Interpolationsverbot bei nachlieferbaren Infos
    
- Domäneninvarianten in kompakter Form
    
- Pfadregeln für Diagnose/Patch
    

Wichtig:  
Das ist **nicht** der Custom Agent.  
Das ist die **kanonische Repo-Schicht**, aus der der Agent später abgeleitet wird.

---

## Phase 5 — Umsetzungsplan

Erst hier wird geändert.

**Wahrscheinliche Maßnahmen**

- `AGENTS.md` verschlanken und härten
    
- `repo.meta.yaml` um Konflikt-/Prioritätslogik ergänzen
    
- `docs/index.md` stärker als Navigation und weniger als Wahrheitsmischraum profilieren
    
- ggf. neue knappe Datei wie `docs/policies/agent-readiness.md` oder ähnliche kanonische Schicht
    
- Generated Readiness neu ausrichten, damit sie echte Diagnose statt nur Bestätigung liefert
    

**Wichtig:**  
Erst nach Target-Proof und Audit. Kein Halbgarschrauben.

---

## Phase 6 — Ableitung des Custom Agents

Erst wenn Phase 5 sauber ist.

Dann schreiben wir:

- `.github/agents/weltgewebe-review.agent.md`
    
- oder `.github/agents/weltgewebe-implementierung.agent.md`
    

Nicht vorher. Sonst schreibt der Agent seine eigene Theologie.

---

# Arbeitsmodus: Diagnose → Plan → Umsetzung

## Jetzt sofort: Diagnosepaket

Ich würde als nächsten Schritt **die Vollsichtung strukturiert durchführen** und dabei eine Tabelle bauen mit:

- Datei
    
- Funktion
    
- Kanonisch? ja/nein
    
- Agentenrelevant? hoch/mittel/niedrig
    
- Konfliktpotenzial
    
- Bemerkung
    
- Maßnahmeempfehlung
    

## Danach: Masterplan 2.0

Auf Basis der Vollsichtung liefere ich dir:

- die priorisierte Maßnahmenliste,
    
- die Reihenfolge,
    
- und die minimale Umbauarchitektur.
    

## Erst danach: konkrete Text-/Dateiänderungen

Sauber getrennt, reproduzierbar.

---

# Typische Fehlannahmen, die wir vermeiden

1. **„Mehr Doku = mehr Agent-Readiness“**  
    Nein. Mehr Doku kann auch mehr Drift bedeuten.
    
2. **„Generated Files können Wahrheit sein“**  
    Nein. Sie sind Diagnose oder Spiegel, nicht Ursprung.
    
3. **„Custom Agent löst Strukturprobleme“**  
    Nein. Er konserviert sie nur schneller.
    

---

# Empfehlung

**Ja: Wir gehen genau so vor.**  
**Diagnose zuerst, dann Plan, dann Umsetzung.**  
Und zwar als **Repo-Audit mit Kanonizitätsprüfung**, nicht als bloße Doku-Durchsicht.

---

# Konkrete nächste Aktion

Als nächstes sollten wir **Phase 1 starten: Vollsichtung und Inventur**.  
Ich arbeite dafür eine **Audit-Matrix aller bestehenden Weltgewebe-Dokumente und Policy-Dateien** aus und ordne jede Datei nach Rolle, Kanonizität, Agentenrelevanz und Drift-Risiko ein.

---

# Essenz

**Hebel:** Nicht Agenten prompten, sondern Repo-Wahrheit härten.  
**Entscheidung:** Kontrollierter Audit-Pfad ist der richtige Weg.  
**Nächste Aktion:** Vollsichtung + Inventurmatrix als Diagnosebasis.

**Unsicherheitsgrad:** 0.18  
**Ursachen:** Bisher nur Teilsichtung der kanonischen Kernquellen; vollständige Sichtung aller Docs, Generated Files, Workflows und Guards steht noch aus.

**Interpolationsgrad:** 0.16  
**Hauptannahmen:** Dass die bereits sichtbaren Kernquellen repräsentativ für das gesamte Repo sind; dass `docs/_generated/agent-readiness.md` aktuell eher Spiegel als harte Norm ist.

**Humor mit Erkenntniswert:** Ein Repo ohne klare Kanonizität ist wie ein Kloster mit fünf Evangelien und sieben Hausordnungen: sehr spirituell, aber niemand weiß, wer heute die Küche putzt.