

DATEI 1 (kanonisch, operativ)

docs/runbooks/ops.runbook.weltgewebe.deploy.md

Diese Datei ist die einzige operative Wahrheit.
Wenn etwas hier anders steht als irgendwo sonst: diese Datei gewinnt.

⸻


# Ops Runbook – Weltgewebe Deployment (Heimserver)

## Status
**KANONISCH · PRODUKTIV · AUDITIERBAR**

Dieses Runbook definiert die einzig zulässige Prozedur für Deployments von
Weltgewebe auf dem Heimserver.

---

## Grundprinzipien (nicht verhandelbar)

1. **Keine Auto-Updates**
2. **Absolute Pfade überall**
3. **Ein Einstiegspunkt**
4. **Preflight vor jedem Deploy**
5. **Erst rendern, dann starten**

Abweichungen gelten als **Drift**.

---

## Verzeichnisannahmen

```text
/opt/weltgewebe
├── infra/compose/compose.prod.yml
├── .env
├── apps/
│   └── api/
│       └── policies/
│           └── limits.yaml

Diese Struktur ist Voraussetzung.

⸻

Single Entry Point

Alle produktiven Aktionen erfolgen aus:

cd /opt/weltgewebe

Relativpfade außerhalb dieses CWD sind verboten.

⸻

Preflight (Pflicht)

set -euo pipefail

REPO="/opt/weltgewebe"
COMPOSE="$REPO/infra/compose/compose.prod.yml"
ENVFILE="$REPO/.env"

test -d "$REPO"
test -f "$COMPOSE"
test -f "$ENVFILE"

docker compose -f "$COMPOSE" --env-file "$ENVFILE" config > /tmp/weltgewebe.rendered.yml

Regel:
Wenn docker compose config fehlschlägt → STOP.

⸻

Deployment (API-only, deterministisch)

docker compose -f "$COMPOSE" --env-file "$ENVFILE" up -d --no-deps api

Kein Alias.
Keine Line-Continuation.
Kein Wrapper mit implizitem Kontext.

⸻

Status & Logs

docker compose -f "$COMPOSE" --env-file "$ENVFILE" ps
docker compose -f "$COMPOSE" --env-file "$ENVFILE" logs --tail=120 api


⸻

Policy-Datei (Limits)

Kanonischer Ort:

apps/api/policies/limits.yaml

Minimal gültige Fail-Open-Policy:

enabled: false

Diese Datei muss existieren.
Fehlt sie → API bleibt im Warnzustand.

⸻

Bekannte Fehlerklassen

❌ yaml: line 1 did not find expected key

→ Compose oder .env ist syntaktisch kaputt
→ Nie ein Laufzeitproblem

❌ couldn't find env file

→ falsches CWD oder relativer Pfad
→ immer Benutzerfehler

⸻

Dokumenten-Hierarchie
	1.	Dieses Runbook
	2.	Incident-Dokumente (historisch)
	3.	Design-Dokumente (begründend)

⸻

Änderungspolitik

Änderungen an diesem Dokument:
	•	bewusst
	•	reviewed
	•	versioniert

„Quick Fixes“ ohne Update dieses Runbooks gelten als technische Schuld.

zusatz: Ja — unbedingt, aber präzise und sparsam.
Nicht als Anekdote, sondern als kanonische Stolperstelle + deterministische Lösung. Sonst läuft genau jemand (inkl. Zukunfts-du) wieder hinein.

⸻

Dialektische Einordnung

These (Dokumentieren):
Das Problem war strukturell, nicht situativ:
	•	YAML-Listen sind struktur- und nicht stringbasiert
	•	partielle Ersetzungen (sed/awk) an Compose-Dateien sind gefährlich
	•	Port-Konflikt 8080 ist systemisch plausibel (code-server, dev-tools)

→ Das ist wissenswert und wiederholungsrelevant.

Antithese (Nicht überdokumentieren):
Zu viel Detail erzeugt Rauschen. Logs, Screenshots, Debug-Odysseen gehören nicht in die Doku.

Synthese:
👉 Eine kurze, harte „Known Pitfall + Fix“-Notiz.
Keine Geschichte. Kein Drama. Nur Regel + geprüfter Fix.

⸻

Konkrete Empfehlung: Ja, aber genau so

Ort

👉 ops.runbook.weltgewebe.deploy.md
Abschnitt z. B.:

## Known Pitfalls

oder

## Troubleshooting


⸻

📌 Vorschlag: Text 1:1 einfügbar

### Port-Konflikt & YAML-Falle: `services.api.ports`

**Symptom**
- `docker compose config` bricht ab mit  
  `services.api.ports must be a list`
- oder API startet nicht / Port 8080 bereits belegt

**Ursache**
- `ports:` ist eine YAML-Liste.  
  String-basierte Ersetzungen (sed/awk) können die Listenstruktur zerstören.
- Zusätzlich ist Port `8080` auf dem Host häufig bereits belegt
  (z. B. durch code-server).

**Regel**
- Compose-Dateien **nicht** partiell „patchen“.
- Struktur immer vollständig und explizit schreiben.

**Korrekt**
```yaml
services:
  api:
    ports:
      - "8081:8080"

Hinweis
	•	Host-Port ≠ Container-Port bewusst trennen.
	•	Bei Bedarf bevorzugt: kein ports: im api, sondern Zugriff nur über Caddy.

---

## Verdichtete Essenz

> **Compose ist Struktur, nicht Text.**  
> Wer YAML wie ein Regex-Problem behandelt, debuggt später Container.

---

## Ungewissheitsanalyse

- **Unsicherheitsgrad:** 0.05  
- **Warum so niedrig:**  
  Das Muster (Listenbruch + Port 8080) ist klassisch, reproduzierbar und bereits erfolgreich behoben.
- **Produktivität der Ungewissheit:** gering — das ist eine klare Betriebsregel, keine offene Frage.

---

## Weiterführende (freiwillige) Verbesserung

Wenn du willst, können wir zusätzlich:
- eine **„Do not sed compose.yml“-Policy** ergänzen  
- oder ein Mini-Snippet: *„Compose nur über vollständige Rewrite-Steps ändern“*

Sag einfach: **„Docs minimal erweitern“** oder **„Policy härten“**.

---

# **DATEI 2 (begründend, strategisch)**
## `docs/design/deployment-principles.md`

> Diese Datei erklärt **warum** das Runbook so ist.  
> Sie hat **keine operative Autorität**.

---

```markdown
# Deployment-Prinzipien – Weltgewebe (Heimserver)

## Zweck

Dieses Dokument beschreibt die Designentscheidungen hinter dem
Weltgewebe-Deployment.

Es **erklärt**, es **befiehlt nicht**.

---

## Warum absolute Pfade?

Docker Compose wertet Pfade relativ zum **aktuellen Working Directory** aus.
Das ist:

- mächtig
- gefährlich
- nicht sichtbar

Absolute Pfade eliminieren:
- implizite Zustände
- Terminal-Kontextfehler
- Copy-Paste-Fehlschläge

---

## Warum `docker compose config` Pflicht ist

`config` ist:
- der einzige vollständige Wahrheitspunkt
- die reale Eingabe für Docker
- deterministisch

Alles andere ist **Interpretation**.

---

## Warum ein Einstiegspunkt?

Mehrere Einstiegspunkte erzeugen:
- unklare Verantwortung
- inkonsistente Fixes
- epistemische Drift

Ein Einstiegspunkt erzwingt:
- gleiche Pfade
- gleiche Umgebung
- gleiche Fehler

---

## Policy-Dateien: Fail-Open per Default

Policy-Dateien sind **externe Steuerung**.
Fehlende Policies dürfen **keinen Produktionsausfall** verursachen.

Daher:
- Existenzpflicht
- Inhalt optional
- `enabled: false` als sicherer Nullzustand

---

## Incident → Struktur

Jeder Incident erzeugt:
1. ein Incident-Dokument
2. eine Runbook-Anpassung **oder**
3. eine bewusste Entscheidung dagegen

Nicht rückgekoppelte Incidents gelten als **verlorenes Lernen**.

---

## Leitmotiv

> Stabilität entsteht nicht durch Komplexität,  
> sondern durch **sichtbare Zwangspunkte**.


⸻

Verdichtete Essenz
	•	Eine Wahrheit (Runbook)
	•	Eine Begründung (Design)
	•	Alles andere ist historisch

⸻

Ungewissheitsanalyse
	•	Unsicherheitsgrad: 0.19
	•	Ursachen: zukünftige Systemerweiterungen (weitere Services)
	•	Art: produktiv, erwartbar
	•	Absicherung: Runbook erzwingt neue Klarheit pro Erweiterung
