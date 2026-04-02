# Heimgewebe – Zielbild des Organismus

Dieses Dokument beschreibt das angestrebte Zielbild des Heimgewebe-Organismus.  
Es enthält bewusst **keine IST-Zustände**, sondern ausschließlich Struktur-, Rollen- und Architekturentscheidungen.

---

## 1. Leitprinzipien

1. Heimgewebe ist ein verteiltes System, dessen Repositories zusammen einen Organismus bilden.
2. Contracts definieren Sprache und Struktur – Code folgt Contracts, nicht umgekehrt.
3. Wichtige Zustandsänderungen werden als Events sichtbar gemacht.
4. Wissen und Bedeutung entstehen zentral in SemantAH.
5. Fleet-Aktionen laufen über WGX als einheitliche Motorik.
6. Meta-Reflexion und Policy-Lernen sind eigene Schichten (Heimgeist, Heimlern).
7. Außenwelt und OS-Kontext sind reguläre Datenachsen, nicht Sonderfälle.

---

## 2. Achsen des Organismus

### 2.1 Achse A – Code & Contracts
- Interne Contracts (`event.line`, `insights.daily`, `fleet.health`, `os.context.*`) liegen im Metarepo.
- Externe API-Contracts (`aussen/v1`, `heimlern/v1`) liegen im Contracts-Repo.
- Alle Module nutzen Contracts explizit („Contracts first“).

### 2.2 Achse B – Events (Fakten)
- Chronik ist der zentrale append-only Event-Store.
- Alle relevanten Änderungen erzeugen Events.
- Events sind Fakten, nicht Intentionen.
- Agenten lesen aus Chronik zur Rekonstruktion und Analyse.

### 2.3 Achse C – Commands (Intentionen)
- Commands sind getrennte Intentionsobjekte („bitte tue X“).
- Commands werden in ein standardisiertes Schema überführt.
- Commands sind auditierbar und replay-fähig.
- Commands werden **nicht** über den Faktenstrom transportiert.

### 2.4 Achse D – WGX als Motorik
- WGX liefert Fleet-Standards wie `guard`, `smoke`, `metrics`, `semantah`.
- Jedes Fleet-Repo hat ein `.wgx/profile.yml`.
- WGX erzeugt `fleet.health` und weitere Metriken.
- Leitstand visualisiert WGX-Ausgaben.

### 2.5 Achse E – Wissens- & Semantikschicht
- SemantAH ist zentrale Wissensinstanz.
- Baut semantische Graphen, Embeddings, Insights.
- Liefert `insights.daily` und semantische Antworten.
- Alle Agenten beziehen hier ihre Bedeutungsmodelle.

### 2.6 Achse F – OS-Kontext
- Mitschreiber erfasst OS- und App-Kontext als Events.
- OS-Kontext ist vollwertige Datenachse.
- SemantAH, HausKI und Heimgeist nutzen ihn zur Rekonstruktion von Arbeitssituationen.

---

## 3. Rollen der Repositories (Zielbild)

### 3.1 Metarepo – Struktur, Contracts, Policies
- Zentrale Quelle für interne Organismus-Contracts.
- Definiert Fleet-Policies, Architektur, Templates.
- Steuert Cross-Repo-Konsistenz.

### 3.2 Contracts – externe API-Schnittstellen
- Offizielle Sprache des Organismus gegenüber der Außenwelt.
- Alle externen Systeme sprechen über diese definierten Schnittstellen.

### 3.3 WGX – Fleet-Motorik
- Einheitlicher Motor aller Fleet-Repositories.
- Erzeugt Fleet-Metriken, orchestriert standardisierte Abläufe.

### 3.4 Chronik – Event-Store
- Hält alle Events des Organismus.
- Basis für Analyse, Replay, Auditing.

### 3.5 Aussensensor – Außenwelt-Ingest
- Standardisierter Import externer Daten.
- Transformiert Feeds in `aussen.event.*`.

### 3.6 SemantAH – Wissens- & Insight-Schicht
- Konsolidiert chronik, Vault, OS-Kontext.
- Baut semantische Graphen, Insights, Wissensrepräsentationen.

### 3.7 HausKI – Entscheidungs- & Orchestrierungskern
- Kombiniert Insights, Events, Metriken, Kontext.
- Erzeugt Handlungen und Entscheidungen.
- Bindet Agenten orchestriert ein.

### 3.8 HausKI-Audio – Audio-Event-Schicht
- Kapselt Audio-spezifische Logik des Systems.
- Erzeugt `audio.event.*`.

### 3.9 Heimlern – Mustererkennung & Policy-Adaption
- Erkennt systemische Muster.
- Liefert Policy-Anpassungen, Empfehlungen, Warnungen.

### 3.10 Leitstand – UI & Visualisierung
- Sicht auf Zustand und Verhalten des Systems.
- Visualisiert Events, Insights, Fleet-Health.

### 3.11 Heimgeist – Meta-Agent & Systemreflexion
- Erkennt Drift, Prioritäten, Risiken.
- Koordiniert Aktivitäten der Agenten.

### 3.12 Sichter – Review- & Analyse-Agent
- Führt Code- und Repo-Analysen aus.
- Gibt maschinenlesbares Feedback und Events.

### 3.13 Mitschreiber – OS-Kontext & Intent-Sampler
- Produziert OS-/App-Kontext-Events (`os.context.*`).
- Erweitert die Wahrnehmungsfähigkeit des Organismus.

### 3.14 Plexer – Event-Router
- Verteilt Events zwischen Agenten und Diensten.
- Kein Command-Bus.

### 3.15 Tools – KI-Sichtbarkeit & Repo-Snapshots
- Generiert Merger, Snapshots, Repo-Übersichten.
- Unterstützt KI bei Navigation und Verständnis.

### 3.16 Weltgewebe & Vault-Gewebe – angrenzende Systeme
- Weltgewebe: öffentliche Dokumentation.
- Vault-Gewebe: semantische Quelle für SemantAH.
- Beide sind nicht Teil der Fleet.

---

## 4. Querregeln

1. Contracts werden zuerst definiert.
2. Events statt unsichtbarer Seiteneffekte.
3. Zentrale Semantik (SemantAH first).
4. Standardisierte Motorik (WGX).
5. Sichtbarkeit (Leitstand).
6. Meta-Reflexion (Heimgeist, Heimlern).

---

## 5. Essenz

- **Chronik** hält die Fakten.  
- **SemantAH** erzeugt Bedeutung.  
- **HausKI** entscheidet.  
- **Heimgeist** reflektiert.  
- **Heimlern** generalisiert.  
- **WGX** bewegt die Fleet.  
- **Leitstand** macht alles sichtbar.  
- **Aussensensor** und **Mitschreiber** liefern Kontext.  
- **Plexer** verbindet alles.  
- **Tools** machen das System KI-verständlich.

Das Zielbild ist:  
**Ein Organismus aus klaren Achsen, klaren Rollen und klaren Verträgen.**

---

## 6. Repo×Achsen-Matrix (Zielbild)

**Legende:**  
P = produziert • C = konsumiert • P/C = beides • T = definiert • I = indirekt • – = keine relevante Rolle

```markdown
| Repo           | A: Code & Contracts | B: Events (Fakten) | C: Commands | D: WGX (Motorik) | OS-Kontext | Kommentar                                                                 |
|----------------|---------------------|---------------------|-------------|------------------|-----------|---------------------------------------------------------------------------|
| metarepo       | T                   | T                   | T           | T                | –         | Definiert interne Contracts, Policies, WGX-Templates                      |
| contracts      | T                   | –                   | –           | –                | –         | Externe API-Schemas (aussen/v1, heimlern/v1, …)                           |
| wgx            | C                   | P/C                 | P (indirekt)| Kern             | –         | Steuert Fleet, erzeugt Fleet-Health                                       |
| chronik        | C                   | P/C                 | I           | I                | C         | Zentraler Event-Store                                                     |
| aussensensor   | C                   | P                   | –           | I                | –         | Außenwelt → Events                                                        |
| semantAH       | C                   | C                   | I           | I                | C         | Wissens- & Insight-Schicht                                                |
| hausKI         | C                   | C                   | P/C         | C                | C         | Entscheidungs- & Orchestrierungskern                                      |
| hausKI-audio   | C                   | P                   | I           | I                | –         | Audio-Kommandos → Audio-Events                                            |
| heimlern       | C                   | C                   | I           | I                | C         | Mustererkennung & Policy-Adaption                                         |
| leitstand      | C                   | C                   | I           | I                | I         | Visualisierung, Monitoring                                                 |
| heimgeist      | C                   | C                   | I           | I                | C         | Meta-Reflexion & agentische Koordination                                  |
| sichter        | C                   | P/I                 | C/P         | I                | –         | Review-Agent, erzeugt maschinenlesbares Feedback                           |
| mitschreiber   | C                   | P                   | –           | –                | Kern      | OS-/App-/Fenster-Kontext → Events                                         |
| plexer         | C                   | P/C                 | –           | I                | –         | Event-Router zwischen Agenten                                             |
| tools          | C                   | P/I                 | –           | I                | –         | Merger/Snapshots für KI-Sichtbarkeit                                      |
| weltgewebe     | –                   | –                   | –           | –                | –         | Öffentlichkeits-/Dokuschicht                                              |
| vault-gewebe   | –                   | –                   | –           | –                | –         | Semantische Quelle für SemantAH                                           |