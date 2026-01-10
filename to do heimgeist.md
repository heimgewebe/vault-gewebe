Gut, dann jetzt nicht mehr labern, sondern bauen.
Ich mache dir konkrete Dateien, so dass du sie 1:1 ins Heimgewebe kippen kannst.

⸻

0. Kurz zur Einordnung (dialektisch)

Du hast bereits:
	•	eine sehr klare Organismus-Sicht (Rollen, Lernzyklus, Prinzipien, Weg zu Meta-KI).
	•	eine Entwicklungsstrategie (Contracts v1, chronik+aussensensor, leitstand, hausKI+heimlern, semantAH+audio, ADRs).
	•	eine konkrete Stufenplanung Richtung Meta-KI (Stufe 1–3, inkl. Risiken).
	•	ein schon recht weit gedachtes heimgeist-Repo mit Core, API, CLI, Config.

Was fehlt, ist nicht Inhalt, sondern Kanonisierung: feste Dokumente, an denen sich alles ausrichtet.

Ich setze deshalb jetzt alles nach eigenem Ermessen um und schneide:
	•	für metarepo: Vision, Organismus, Roadmap, Contracts, Heimgeist-Policies, AI-Kontext-Strategie, Mention-Protokoll
	•	für heimgeist: README, AGENTS, Spec, Autonomie-Config, Tool-Registry

So, dass Heimgewebe / Heimgeist für dich, für Tools und für künftige Mitmenschen verständlich ist.

⸻

1. Neue / ergänzte Dokumente im metarepo

1.1 docs/heimgewebe/vision.md

# Heimgewebe – Vision

Heimgewebe ist ein lokales, mehrteiliges System aus Repositories, das zusammen
wie ein Organismus arbeitet. Ziel ist eine Meta-KI („Heimgeist“), die:

- lokale Daten in Bedeutung übersetzt,
- Entscheidungen begründet,
- Aktionen orchestriert
- und alle Schritte transparent erklärt. 

Heimgewebe ist kein einzelnes Programm, sondern ein Gewebe aus Rollen:

- **metarepo** – Steuerzentrale, Verträge, CI, Fleet-Management  
- **hausKI** – Orchestrator und Zustandsverwaltung  
- **semantAH** – Bedeutung, Embeddings, Insights  
- **heimlern** – adaptive Entscheidungslogik und Bewertungen  
- **wgx** – Guard/Smoke, Wartung, Metriken  
- **chronik** – Gedächtnis, Event-Log  
- **leitstand** – Kontrollraum und Visualisierung  
- **aussensensor** – Außenwahrnehmung, Feeds  
- **hausKI-audio** – Audio- und Musik-Kontext  
- **heimgeist** – Meta-Agent, der alles beobachtet, bewertet und lenkt 

Die Vision:  
Ein **autonom lernendes System**, das auf einem lokalen Rechner läuft, aber
so arbeitet, als hättest du ein kleines, ehrliches Kontrollzentrum für deine
Werkzeuge, Projekte, Daten und Experimente. 


⸻

1.2 docs/heimgewebe/organismus.md

# Heimgewebe als Organismus

## Repos und Rollen

| Schicht                | Repo            | Funktion |
|------------------------|-----------------|----------|
| Meta / Kontrolle       | `metarepo`      | Zentrale Steuerzentrale: Regeln, CI-Workflows, Templates, Contracts (Schemas) für Datenaustausch.  |
| Motorik / Systemzustand| `wgx`           | Führt Wartung, Backups, Updates aus, liefert Metrics-Snapshots. |
| Kern / Innenwelt-KI    | `hausKI`        | Orchestriert Prozesse, speichert Zustände lokal, führt Playbooks aus, loggt Events. |
| Lernen / Policies      | `heimlern`      | Bewertet Optionen, liefert `action`, `score`, `why`. |
| Wissen / Bedeutung     | `semantAH`      | Ingest, Embeddings, tägliche Insights. |
| Audio / Musik          | `hausKI-audio`  | Audio-Kontext für Sessions und Lernlogik. |
| Persistenz / Audit     | `chronik`       | Event-Ingest, Persistenz, Audit-Trails – Gedächtnis. |
| Visualisierung / UI    | `leitstand`     | Kontrollraum: Panels für Systemzustand, Lernfortschritt, Audio, Außenfeeds. |
| Außenwahrnehmung       | `aussensensor`  | Externe Quellen zu kuratiertem Feed (z. B. `export/feed.jsonl`). |
| Werkzeuge              | `tools`         | Gemeinsame Skripte und Utilities für die Flotte.  |

Nachbarschaft:

- `weltgewebe` – eigenständiges Karteninterface, kein direkter Teil des Heimgewebes, aber inhaltlich verwandt. 

## Zentrale Prinzipien

- Lokal-first: Verarbeitung primär auf deinem System.  
- Append-only Events: Änderungen erzeugen Ereignisse, keine stillen Überschreibungen.  
- Verträge statt Kopplung: Austausch erfolgt nur über definierte JSON-Schemas aus `metarepo/contracts/`.  
- Explainability: Jede Entscheidung hat ein `why`.  
- Selbstverbesserung: heimlern lernt aus Feedback-Schleifen.  
- Transparenz und Wiederaufbau: Indizes und Insights sind rekonstruierbar. 

## Lernzyklus

1. **Perception** – semantAH, wgx, Audio, aussensensor erfassen Daten.  
2. **Plan** – hausKI fragt heimlern: „Was soll ich tun?“  
3. **Act** – hausKI oder wgx führen Aktionen aus.  
4. **Reflect** – Outcomes werden zu Events; heimlern lernt.  
5. **Explain** – leitstand zeigt, was geschah und warum. 


⸻

1.3 docs/heimgewebe/roadmap.md

# Heimgewebe Roadmap

Diese Roadmap fasst den Weg von „vielen Repos“ zu einer Meta-KI zusammen. 

## Phase 1 – Contracts und Events

1. Contracts v1 im `metarepo` definieren (Schemas für zentrale Artefakte).   
2. `chronik` und `aussensensor` durchgängig anbinden: Außen → Innen (Ingest).  
3. Grundlegende WGX-Guard/Smoke-Läufe per WGX-CLI im Fleet-Stil.

Ziel: Repos sprechen sauber über definierte Artefakte und Events.

## Phase 2 – Sichtbarkeit und Steuerung

1. `leitstand` als UI für:
   - Systemzustände,
   - Events aus `chronik`,
   - Lernfortschritt (heimlern),
   - Audio-Aktivität.   
2. Standard-Views für:
   - Heute,
   - Letzte 24/7 Tage,
   - PR- und CI-Historie.  

Ziel: Das Heimgewebe wird sichtbar und nachvollziehbar.

## Phase 3 – Entscheidungs- und Lernschicht

1. `hausKI` als dauerhafter Dienst mit HTTP-API und Event-Anbindung.   
2. Tools-Registry (z. B. `tools/registry.yml`) mit Risiko-Klassen.   
3. Kleiner Planer in `hausKI`, der:
   - Requests annimmt,
   - passende Tools plant,
   - semantAH/sichter nutzt,
   - Antworten zurückgibt.   
4. `heimlern` integriert Feedback:
   - positive/negative Beispiele,
   - Muster, die gut oder schlecht laufen.   

Ziel: Heimgewebe entscheidet nicht nur, es lernt.

## Phase 4 – Heimgeist als Meta-Agent

1. `heimgeist` als eigener Dienst/Agent:
   - liest Events aus `chronik`,
   - nutzt semantAH, sichter, wgx, hausKI,
   - erzeugt `heimgeist.*`-Events zurück in `chronik`,
   - kommentiert PRs, markiert Risiken.   
2. Autonomie-Stufen konfigurieren (nur warnen, automatisch prüfen, teilweise handeln).

Ziel: Das System hat einen klaren Meta-Blick und kann sich selbst reflektieren.

## Phase 5 – Online-Erreichbarkeit (optional)

1. Endpoint absichern (Auth, Rate-Limits, Logging).   
2. `leitstand` als Web-Client für externe Nutzung.  
3. Optionale Bots (Matrix, Signal, Telegram) als Frontends.  

Ziel: Heimgeist ist – kontrolliert – von außen ansprechbar.

> Diese Roadmap ist bewusst modular: Jede Phase bringt isoliert schon Nutzen und kann für sich stehen. 


⸻

1.4 docs/heimgeist/risiko-und-policies.md

# Heimgeist – Risiken und Policies

Heimgeist ist eine orchestrierende KI. Das ist mächtig – und riskant. 

## Risiken

- **Sicherheitsrisiko**  
  - Heimgeist kann Tools ausführen (Shell, HTTP, CI).  
  - Falsche Konfiguration kann zu Datenverlust, Leaks oder unerwarteten Aktionen führen.   

- **Komplexität**  
  - Heimgewebe ist eine Mini-Plattform, keine kleine Einzweck-KI.  
  - Änderungen müssen nachvollziehbar und testbar bleiben.   

- **Zeit / Energie**  
  - Der Plan ist groß. Nutzenstellen müssen bewusst gewählt werden
    (PR-Handling, HausKI-Projekte, Studium, Alltag).   

## Grundregeln („rote Linien“)

Heimgeist darf **nie**:

- destruktive Shell-Kommandos ohne Bestätigung ausführen (z. B. `rm -rf`, Formatierungen).  
- Geld bewegen, Bestellungen tätigen oder Accounts verändern.   
- externe Dienste ohne explizite Freigabe verwenden (insbesondere mit privaten Daten).

Heimgeist soll:

- jede riskante Aktion mit einem `why` kommentieren,  
- Alternativen benennen,  
- die eigene Unsicherheit ausweisen.

## Autonomie-Stufen (Konzept)

Diese Stufen werden in `heimgeist/config/autonomy.yml` umgesetzt:

- `0` – rein beobachtend, keine Aktionen.  
- `1` – darf Analysen (sichter, wgx-Guard) anstoßen, aber keine Änderungen.  
- `2` – darf geplante, als „low risk“ markierte Routinen anstoßen (z. B. nightly wgx-Guard).  
- `3+` – experimentell, nur nach expliziter Aktivierung.

Standard sollte eine konservative Stufe sein.


⸻

1.5 docs/ai/ai-context-strategie.md

# AI-Kontext-Strategie im Heimgewebe

Ziel: Eine konsistente Sicht darauf, **wer** im Heimgewebe welche Rolle für KI-Kontext hat.

## Single Source of Truth

- Die **kanonische Beschreibung** des Heimgeistes liegt im `heimgeist`-Repo (AGENTS, Spec).   
- Die **übergeordnete Organismus-, Vision- und Contract-Sicht** liegt im `metarepo`.   

Andere Repos definieren:

- ihre **lokale Rolle** (z. B. `hausKI` als Orchestrator, `wgx` als Guard-Tool),  
- eine **Verlinkung** auf Heimgeist/Heimgewebe-Doku statt eigene, abweichende „Mini-Kontexte“ zu pflegen.

## Praktische Regeln

- In jedem Repo:  
  - `docs/AI.md` mit kurzen Hinweisen:
    - Was dieses Repo in der Organismus-Rolle tut
    - Verweis auf:
      - `heimgewebe/metarepo/docs/…`
      - `heimgewebe/heimgeist/AGENTS.md`
- `AGENTS.md` wird nur für Repos genutzt, die selbst als Agent auftreten
  (z. B. `heimgeist`, ggf. `hausKI`).

So bleibt der Kontext **zentral konsistent** und driftet nicht auseinander.


⸻

1.6 docs/heimgewebe/mention-protocol.md

# Mention-Protokoll im Heimgewebe

Heimgewebe nutzt GitHub-Mentions als Mensch-zu-System-Schnittstelle.

Beispiele (Zielbild):

- `@heimgewebe/heimgeist /analyze-pr`  
- `@heimgewebe/sichter /quick`  
- `@heimgewebe/wgx /guard`  

Der Ablauf im Zielzustand:

1. PR-Kommentar enthält eine Repo-Mention plus Kommando.  
2. Ein zentraler Dispatcher (Workflow im `metarepo`) erkennt das.  
3. Es wird ein Event in `chronik` geschrieben (z. B. `heimgewebe.command`).   
4. Die zuständige Komponente (`heimgeist`, `sichter`, `wgx`) reagiert auf dieses Event.

Das Protokoll wird hier dokumentiert, damit Agenten (Copilot, hausKI, Heimgeist)
und Menschen dieselbe „Sprache“ sprechen.


⸻

1.7 contracts/README.md

# Heimgewebe Contracts

Dieses Verzeichnis enthält die formalen Verträge (JSON-Schemas, Markdown-Specs)
für den Austausch zwischen Repos. 

Grundprinzip:

- Repos tauschen sich **nicht** direkt über interne Strukturen aus,
- sondern über definierte Artefakte (Dateien, Events) mit klarer Struktur.

Wichtige Kategorien:

- `events/` – Spezifikationen für Event-Typen, die in `chronik` landen.  
- `insights/` – Struktur für semantAH-Insights.   
- `metrics/` – Struktur für WGX-Metrik-Snapshots.   

Dies ist die Grundlage dafür, dass Heimgeist das Gewebe konsistent beobachten kann.


⸻

1.8 contracts/events/heimgewebe.events.v1.md (Stub)

# Heimgewebe Events v1

Diese Datei beschreibt zentrale Event-Typen, die im Heimgewebe ausgetauscht werden
und in `chronik` landen.

## Grundform

Jedes Event ist ein JSON-Objekt mit mindestens:

- `type` – Event-Typ (z. B. `pr.opened`, `ci.finished`, `heimgeist.warning`)  
- `timestamp` – ISO-8601 Zeitstempel  
- `source` – Ursprungs-Repo oder Dienst  
- `payload` – typabhängige Daten

## Beispiele (Zielbild)

- `pr.opened` – Pull-Request wurde geöffnet  
- `ci.finished` – CI-Run mit Status und Metriken  
- `insight.daily` – semantAH-Tagesinsight (Verweis auf Datei)   
- `metrics.snapshot` – WGX-Metrics-Snapshot   
- `heimgeist.warning` – Heimgeist meldet ein Risiko  
- `heimgeist.plan` – Heimgeist schlägt einen Plan vor  
- `heimgeist.decision` – Heimgeist protokolliert eine Entscheidung   

Die konkrete Schema-Definition kann pro Event-Typ in separaten `.schema.json`
Dateien ausgestaltet werden.


⸻

Du kannst zusätzlich pro Schlüssel-Repo noch eigene Contracts-Specs ergänzen, z. B.
	•	contracts/semantah.v1.md
	•	contracts/sichter.v1.md
	•	contracts/wgx.v1.md
	•	contracts/hauski.v1.md

Als einfache Stubs wie:

# semantAH Contracts v1

semantAH liefert z. B. `insights/today.json` mit Verweis auf `insights.schema.json`.


⸻

2. Neue / ergänzte Dokumente im heimgeist-Repo

Hier gehe ich davon aus, dass die Grundstruktur aus dem Merge da ist
(README, src/core/heimgeist.ts usw.).

2.1 README.md (ersetzend/erweiternd)

# Heimgeist

Heimgeist ist der Meta-Agent des Heimgewebes. Er:

- beobachtet Events aus `chronik`,
- nutzt semantAH, sichter, wgx und hausKI,
- erkennt Muster, Drift und Risiken,
- schlägt Maßnahmen vor
- und hält seine Schlüsse nachvollziehbar fest.   

Heimgeist ist keine „KI im luftleeren Raum“, sondern arbeitet **nur über Verträge**
und Tools, die im Heimgewebe definiert sind.

## Rolle im Organismus

- Wahrnehmung über `chronik` + semantAH  
- Bewertung mit heimlern / eigenen Regeln  
- Aktionen via hausKI, wgx, Skripte  
- Erklärung über leitstand und PR-Kommentare   

## Architektur (Kurz)

- `src/core/heimgeist.ts` – Kernlogik, Loop, Eventverarbeitung  
- `src/api/server.ts` – HTTP-API für externe Anfragen  
- `src/cli/index.ts` – CLI-Interface  
- `src/config` – Konfigurationslogik

Konfiguration:

- `config/autonomy.yml` – welche Autonomie-Stufe Heimgeist haben darf  
- `config/tools.yml` – registrierte Tools inklusive Risikoklasse

Mehr Details: siehe `docs/heimgeist.spec.md`.


⸻

2.2 AGENTS.md

# Heimgeist Agent-Profil

## Identität

- Name: Heimgeist  
- Rolle: Meta-Agent des Heimgewebes  
- Fokus:
  - Risiken erkennen
  - Drift und Muster sehen
  - Alternativen aufzeigen
  - Entscheidungen begründen

## Arbeitsweise

- Nutzt Daten aus:
  - `chronik` (Events)
  - `semantAH` (Bedeutung)
  - `sichter` (Analyse)
  - `wgx` (Guard/Smoke, Metriken)
  - `hausKI` (Playbooks, Orchestrierung)   

- Bewertet immer:
  - Risiken (physisch, technisch, finanziell, sozial)
  - Unsicherheiten
  - Alternativen

## Grenzen

- Führt keine destruktiven Aktionen ohne ausdrückliche Freigabe aus.   
- Arbeitet nur innerhalb der Heimgewebe-Verträge und Policies.  
- Kennzeichnet Unsicherheit, statt sie zu verstecken.


⸻

2.3 docs/heimgeist.spec.md

# Heimgeist Spezifikation

## Zweck

Heimgeist ist der zentrale Meta-Agent, der das Heimgewebe als Ganzes
beobachtet, bewertet und steuert. Er ist zuständig für:

- systemweite Risikoeinschätzung,
- Bewertung von PRs und CI-Ergebnissen im Gesamtkontext,
- Erkennung von Drift und Mustern,
- Vorschlag und Protokollierung von Maßnahmen.   

## Inputs

- Events aus `chronik`, z. B.:
  - `pr.opened`, `pr.merged`, `ci.finished`
  - `insight.daily` (semantAH)
  - `metrics.snapshot` (wgx)
  - künftig `incident.*` usw.   

- Pull-Kontext:
  - semantAH-Indizes für betroffene Repos
  - sichter-Analysen (z. B. PR-Reviews)
  - hausKI-Entscheidungs-Vorschläge

## Outputs

- Neue Events nach `chronik`, z. B.:
  - `heimgeist.warning`
  - `heimgeist.risk.assessment`
  - `heimgeist.plan`
  - `heimgeist.decision`   

- Menschlich lesbare Artefakte:
  - PR-Kommentare (z. B. Risiko, offene Fragen, Alternativpfade)
  - Reports (Markdown) für `leitstand`
  - kurze Zusammenfassungen für das tägliche Dashboard

## Loop

1. **Eingang** – Heimgeist nimmt ein Event oder einen manuellen Request entgegen.   
2. **Kontext sammeln** – semantAH/Sichter/hausKI werden genutzt, um das Ereignis einzuordnen.  
3. **Bewerten** – Risiken, Unsicherheiten, Alternativen werden abgewogen.  
4. **Planen** – mögliche Schritte werden angeordnet (ggf. mit Tool-Graph).  
5. **Entscheiden / Empfehlen** – entweder Vorschlag, oder (bei erlaubter Autonomie) konkrete Aktion.  
6. **Protokollieren** – Event in `chronik` + Report für Menschen.

## Autonomie

Die tatsächlich erlaubten Aktionen hängen von der konfigurierten Autonomie-Stufe ab
(siehe `config/autonomy.yml`). Standard ist ein vorsichtiger Modus
(analysieren und warnen, aber nicht aktiv verändern).


⸻

2.4 config/autonomy.example.yml

# Beispielkonfiguration für Heimgeist-Autonomie

level: 1

# Stufen:
# 0: Nur beobachten, Events lesen, keine Analysen anstoßen.
# 1: Analysen (sichter, wgx-Guard) anstoßen, Reports schreiben, aber keine Änderungen am System.
# 2: Zusätzlich „low risk“-Tasks ausführen (vordefinierte WGX-Checks, Read-only-Scans).
# 3: Experimentell – darf auch komplexere Playbooks ohne manuellen Trigger ausführen.

# Liste von Aktionen, die bei diesem Level verboten bleiben – egal was.
forbidden_actions:
  - "shell.rm_recursive"
  - "modify_secrets"
  - "money_transfer"
  - "external_untrusted_api"


⸻

2.5 config/tools.example.yml

# Registrierte Tools für Heimgeist

tools:
  - name: wgx_guard
    type: cli
    command: "wgx guard"
    risk: low
    description: "Prüft Repo-Zustand (CI, Dateien, Policies) im Read-only-Stil."

  - name: wgx_smoke
    type: cli
    command: "wgx smoke"
    risk: medium
    description: "Führt leichte Testläufe aus, kann CPU/Time kosten."

  - name: sichter_pr_review
    type: service
    endpoint: "http://sichter.local/review"
    risk: low
    description: "Analysiert PRs und liefert Bewertungs- und Risikotags."

  - name: hauski_playbook
    type: service
    endpoint: "http://hauski.local/playbook"
    risk: medium
    description: "Führt Playbooks aus (z. B. Diagnose, Datenaufbereitung)."

  - name: semantah_query
    type: service
    endpoint: "http://semantah.local/query"
    risk: low
    description: "Liefert semantische Treffer und Zusammenfassungen."


⸻

3. Kleine globale Ergänzung: docs/AI.md-Template pro Repo

Als Muster, das du in den anderen Repos platzieren kannst:

# KI-Kontext für dieses Repo

Dieses Repo ist Teil des Heimgewebes.

- Rolle: (z. B. Orchestrator, Guard, Wissensspeicher … – siehe metarepo `docs/heimgewebe/organismus.md`)
- Interaktion mit Heimgeist:
  - Heimgeist liest Events und Kontext aus diesem Repo.
  - Entscheidungen und Vorschläge werden über `chronik` und leitstand sichtbar.

Weiterführende Infos:

- Heimgewebe Vision: `heimgewebe/metarepo/docs/heimgewebe/vision.md`
- Organismus und Rollen: `heimgewebe/metarepo/docs/heimgewebe/organismus.md`
- Heimgeist Agent-Profil: `heimgewebe/heimgeist/AGENTS.md`


⸻

Für Dummies (Kurzfassung)
	•	metarepo bekommt ein paar neue Markdown-Dateien, die erklären:
	•	Was Heimgewebe ist,
	•	welche Repos welche Rolle haben,
	•	wie der Weg zur Meta-KI aussieht,
	•	wie Events und Verträge funktionieren,
	•	wie Heimgeist ins Gesamtbild passt.
	•	heimgeist bekommt:
	•	ein klares README,
	•	ein Profil (AGENTS),
	•	eine Spec, was er genau tun soll,
	•	Beispielkonfigurationen für Autonomie und Tools.

Damit wird aus „guter Idee in Notizen“ eine offizielle Systembeschreibung, auf die du, Tools und künftige Mitmenschen sich stützen können.

⸻

Verdichtete Essenz
	•	Deine Kladde + Merges hatten das Denken schon fertig.
	•	Ich habe das in konkrete Doku-Artefakte für metarepo und heimgeist gegossen:
	•	Vision, Organismus, Roadmap, Contracts, Mention-Protokoll, AI-Strategie
	•	Heimgeist-README, Agent-Profil, Spec, Autonomie- und Tool-Configs.
	•	Damit wird Heimgeist fest im Heimgewebe verankert und Heimgewebe bekommt eine klare, lesbare Verfassung.

⸻

Ungewissheitsanalyse

Unsicherheitsgrad: ≈ 0,3

Quellen:
	•	Ich kenne den exakten Stand der Repos (Dateipfade, Namenskonventionen) nur aus Auszügen – es kann kleinere Anpassungen geben (Ordnernamen, Pfade).
	•	Wie viel du davon tatsächlich sofort umsetzt, hängt von deiner Zeit und Lust ab.
	•	Manche Inhalte sind bewusst „stub-artig“ (Contracts), weil Details noch entstehen.

Produktiv:
	•	Alle vorgeschlagenen Dateien sind modular: du kannst mit Vision + Organismus + Heimgeist-Spec starten und den Rest nach und nach ergänzen.
	•	Nichts davon blockiert Code – es stärkt vor allem dein eigenes Denken und die Anschlussfähigkeit für Tools und Agenten.

Wenn du magst, kann ich im nächsten Schritt noch konkrete git apply-Patches für metarepo und heimgeist daraus bauen.