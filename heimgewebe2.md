  

Heimgewebe-Architektur: Analyse der Konsistenz

  

  

  

1. Repository-Zuständigkeiten und Rollen

  

  

Die Heimgewebe-Architektur besteht aus mehreren spezialisierten Repositories/Komponenten, die jeweils klar definierte Rollen im Gesamtsystem einnehmen. Die Dokumentation beschreibt ein Schichtenmodell (0–6), in dem jede Schicht durch ein Modul repräsentiert wird . Im Einzelnen:

  

- Metarepo – Zentrale Steuerzentrale (Meta-Layer) für alle Heimgewebe-Repos. Enthält Vorlagen, Automatisierungen und umfassende Dokumentation, damit Sub-Repos synchron bleiben . Metarepo ist die „Quelle der Wahrheit“ für gemeinsame Templates und CI-Konventionen . Überschneidungen mit anderen Repos bestehen kaum, da es primär Koordination und Governance dient.
- WGX – Die „System-Motorik“ bzw. der Flotten-Motor (Schicht 0 Physisch) . WGX stellt ein zentrales CLI-Tool zur Verfügung, um die Entwicklungsumgebung zu verwalten (Tasks wie doctor, smoke, start etc.) und Automation/Synchronisation fleetweit zu ermöglichen. WGX selbst führt keine inhaltliche KI-Logik aus, sondern dient der Infrastruktur (z.B. Starten/Überwachen von Diensten, Erfassen von Metriken) . Die Rollenabgrenzung zwischen WGX und z.B. hausKI ist damit klar: WGX kümmert sich um Automatisierung und Maintenance, hausKI um KI-Funktionalität.
- aussensensor – Modul der Schicht 6 (Dialogisch-Semantisch Umgebungssensorik). Sammelt externe Signale/„Außen“-Ereignisse (z.B. Nachrichten, Sensordaten), normalisiert sie in JSONL-Events des Typs aussen.event und validiert diese gegen das definierte Schema . Die Ergebnisse werden im lokalen Feed (export/feed.jsonl) gesammelt und schließlich an andere Komponenten weitergereicht. Die Verantwortung ist klar umrissen (Außenwelt-Eingang). Überschneidungen gibt es nur optional mit weltgewebe: Letzteres ist als separates Community-/Außensphäre-Projekt konzipiert, das ebenfalls Außen-Events liefern kann, aber nicht Teil der Kern-Fleet ist .
- leitstand – Modul der Schicht 4 (Memorativ). Dient als Ingest-API und Persistenzschicht für Ereignisse sowie als Dashboard („Panels“) für Operatoren . Leitstand speichert die Events (z.B. alle aussen.event-Zeilen) und stellt sie für andere bereit. Die Verantwortlichkeiten sind deutlich: Leitstand ist das zentrale Log-/Audit-System (Episoden-Speicher) und UI, im Gegensatz zu Sichter (der Reviews durchführt) oder heimlern (das Policies verwaltet).
- heimlern – Modul der Schicht 5 (Politisch-Adaptiv). Verarbeitet eingehende Informationen zu Policies, Entscheidungen und Lern-Feedback . Heimlern erstellt policy.decision-Events (Policy-Entscheidungen inkl. Begründungen) und verwaltet Lern-Scores. Diese Komponente greift auf die Daten aus Leitstand (persistierte Events) zurück und gibt Feedback ins System. Heimlerns Rolle ist damit spezialisiert auf den „Lern-Loop“ und Policy-Entscheidungen. Unklar war initial, wie heimlern die Daten erhält (siehe Datenfluss), doch konzeptionell ist die Zuständigkeit abgegrenzt von hausKI (Planung/Ausführung) und sichter (Review).
- hausKI – Modul der Schicht 2 (Operativ). Agiert als zentrale Orchestrierungs- und Planungsinstanz für Aktionen und Entscheidungen . HausKI konsumiert z.B. Intents und entscheidet über nächste Schritte (führt Pläne aus, triggert ggf. weitere Komponenten). Es koordiniert auch den Review-Prozess, indem es z.B. nach einer Policy-Entscheidung heimlerns den Sichter anstößt. HausKI ist somit klar als KI-Controller definiert, während WGX rein technische Automation macht. Eine kleine Unschärfe besteht darin, dass hausKI intern auch Logging (JSONL-Event-Log) nutzt – das ist aber getrennt vom WGX-Metrik-Logging (siehe Tooling).
- semantAH – Modul der Schicht 1 (Semantisch). Verantwortlich für den Wissensgraphen und Embeddings . SemantAH generiert aus Events und Kontext sogenannte Insights (Graph-Daten, Relationen) und stellt diese dem System bereit. Beispielsweise verarbeitet semantAH intent/declare-Events von mitschreiber zu Graphabfragen (graph/query) und aktualisiert seinen Knowledge-Graph. Es erzeugt insight-Events (z.B. neue Knoten/Relationen), die wiederum von hausKI oder Leitstand genutzt werden . SemantAH’s Rolle (Knowledge-Base) ist gut getrennt von mitschreiber (der Kontext liefert) und hausKI (das Entscheidungen trifft).
- sichter – Modul der Schicht 3 (Reflexiv). Übernimmt automatisierte Reviews, Diagnosen und Selbstkorrektur des Systems . Sichter prüft z.B. Entscheidungen oder Aktionen (Reviews der KI-Ausgaben) und meldet Probleme oder Korrekturvorschläge zurück. Es emittiert review.*-Events, die ins System (Leitstand und ggf. weitere) zurückfließen. Überschneidungen mit Leitstand bestehen kaum: Leitstand speichert zwar Reviews, aber die Überprüfung/Diagnose logischer Inhalte ist Sichter’s alleinige Aufgabe.
- mitschreiber – Modul der Schicht 6 (Dialogisch-Semantisch). Stellt den Intent- und Kontext-Sensor dar, der lokale Benutzerinteraktionen aufzeichnet (Tastatureingaben, Fensterkontext etc.) und in semantische Kontext-Events (os.context.*) umwandelt . Diese Events speist mitschreiber in den Bus ein, von wo aus semantAH und hausKI sie weiterverarbeiten. Wichtig: mitschreiber ist kein Keylogger, sondern filtert auf semantische Bedeutungen . Die Rolle ist eindeutig (Input aus Benutzerkontext), ohne Überschneidung mit aussensensor (Input aus Umwelt) oder hausKI (Verarbeitung der Intents).
- hausKI-audio – Spezialisiertes Modul (gehört zur dialogischen Ebene) für Audio- und Telemetrie-Ereignisse . Es nimmt Audioeingaben (z.B. Mikrofon oder Musik/Hörbuch-Kontext) entgegen und erzeugt audio.events-Events daraus . Diese Audio-Events dienen hausKI als zusätzliche Kontextquelle und werden auch im Leitstand (Panel „Musik/PC“) visualisiert . HausKI-audio ist technisch eigenständig (vermutlich in Rust, siehe CI), überschneidet sich aber nicht mit hausKI direkt – es liefert nur Input.
- lenskit – Repository mit Hilfswerkzeugen für Entwicklung und Repository-Management (früher unter dem Namen „tools“ geführt). Enthält z.B. Repomergers (Skripte zum Zusammenführen von Ordnern/Repos für Dokumentationszwecke), JSONL-Utility-Skripte (z. B. jsonl-tail.sh, jsonl-validate.sh) und verschiedene Automatisierungshilfen. Das lenskit-Repo hat eine eher unterstützende Rolle außerhalb des laufenden Systems. Im Folgenden bezeichnet „lenskit“ immer dieses Repository, während „Tools“ bzw. „tools“ nur als allgemeiner Begriff für Hilfswerkzeuge verwendet wird. Es gibt kleine Überschneidungen mit Metarepo/CI: Einige Skripte aus lenskit (z.B. Metrik-Skripte, s.u.) ähneln Funktionen, die auch im Metarepo oder WGX behandelt werden. Hier könnte langfristig konsolidiert werden, um Redundanzen zu vermeiden (siehe Abschnitt Tooling).
- vault-gewebe – Außerhalb der eigentlichen Fleet (persönlicher Wissensspeicher, z.B. Obsidian Vault). Laut Dokumentation gehört vault-gewebe nicht zur public Fleet und wird aus Datenschutzgründen bewusst nicht dokumentiert . Wir erwähnen es der Vollständigkeit halber, aber es fließt in die Konsistenzbewertung nicht ein (kein Fleet-Target, keine gemeinsamen Standards nötig) .
- weltgewebe – Ebenfalls kein Kern-Repo der Heimgewebe-Architektur. Es wird als unabhängiges Projekt beschrieben, das ggf. Außen-Signale zuliefern kann, aber nicht zur Fleet gehört . Somit ist es rollentechnisch separiert (Quellprojekt für externe Events) und die Interaktion erfolgt höchstens über definierte Event-Schnittstellen (aussen.event). Die klare Trennung ist dokumentiert; hier besteht keine Vermischung der Zuständigkeiten, lediglich eine optionale Datenquelle.

  

  

Bewertung: Die Verantwortlichkeiten der zentralen Komponenten sind größtenteils klar abgegrenzt und durch das Schichtkonzept konsistent beschrieben. Jeder Dienst hat eine eindeutige Kernaufgabe (siehe obige Liste), was sowohl in ADRs als auch im System-Overview deutlich wird. Die Systemübersicht fasst die Rollen gut zusammen , und Diagramme (Mermaid/Canvas) visualisieren die Zusammenarbeit . Eine kleine Inkonsistenz in der Dokumentation: In manchen Zusammenfassungen (z.B. docs/architecture.md) werden sichter und mitschreiber nicht explizit in der Liste der Komponenten erwähnt , obwohl sie Teil der Architektur sind – wohingegen die Systemübersicht-Tabelle alle Schichten 0–6 vollständig nennt . Dies sollte vereinheitlicht werden, damit keine Module „vergessen“ scheinen.

  

Zudem gibt es geringe Redundanz in unterstützenden Repos: Sowohl Metarepo als auch Tools bieten Scripts/Mechanismen zur Repo-Verwaltung (z.B. Template-Sync in Metarepo vs. Merge-Skripte in Tools). Diese Überschneidung ist jedoch funktional getrennt (Templates vs. Dokumentations-Merging) und derzeit nicht kritisch. Dennoch könnte geprüft werden, ob langfristig Tools-Funktionen ins Metarepo integriert werden, um die Anzahl der Hilfs-Repos zu minimieren.

  

Empfehlung: In der Dokumentation aller Kern-Module konsistent alle Komponenten aufführen (inkl. sichter, mitschreiber, hausKI-audio), damit die Rollenverteilung lückenlos klar ist. Redundante Hilfsfunktionen (Metarepo vs. Tools) könnten durch Zusammenführung vereinfacht werden (siehe Tabelle unten).

  

  

2. Datenflüsse, Event-Typen und Contracts

  

  

Die Kommunikation der Komponenten erfolgt über einen lokalen JSONL-Event-Bus, der verschiedene Topics nutzt (u.a. intent/*, graph/*, review/*, policy/*, state/*, insight/*, error/*) . Jeder Event-Typ folgt einem Contract (JSON-Schema), zentral verwaltet unter contracts/*.schema.json. Die Architektur sieht dabei klare Producer→Consumer-Beziehungen vor, die in den Dokumenten tabellarisch und in Flussdiagrammen festgehalten sind. Beispiele aus der Repo-Matrix :

  

- Außen-Events (aussen.event): Produziert von aussensensor (und optional weltgewebe), konsumiert primär von leitstand . Leitstand persistiert diese Events und bietet darauf basierend einen „Außen“-Panel und Exporte an.
- Intent-Events (intent/*): Entstehen aus Mitschreiber (lokale OS-Kontext-Intents) oder hausKI-audio (Sprachbefehl → Intent) und werden via Topic an semantAH weitergeleitet . SemantAH nutzt diese, um Graph-Abfragen durchzuführen, deren Resultate (graph/*) an hausKI gehen . Zusätzlich gibt es ein allgemeines Schema intent_event.schema.json für manuelle Intents (Audio/Text-Kommando), das als Schnittstelle für Leitstand/HausKI dient .
- Policy-Entscheidungen (policy.decision): Produziert von heimlern (Policy-Engine), konsummiert von hausKI (um Entscheidungen auszuführen) und im Leitstand zu Audit-Zwecken . Heimlern liefert darin auch Begründungen und ggf. Lern-Scores.
- Review-Events (review/*): Entstehen aus sichter’s Diagnose/Review-Schritten. Sichter sendet z.B. ein review/report Event, wenn eine Überprüfung erfolgt ist . Interessanterweise wird dieser im aktuellen Design auf den Topic state/* gemappt, der dann von Leitstand empfangen wird . Diese Implementierung – Review-Resultate als State-Update – ist etwas unintuitiv (man könnte erwarten, es bleibt unter review/*). Vermutlich soll damit ausgedrückt werden, dass ein Review eine Zustandsänderung (z.B. Korrektur des Systemzustands) bewirkt. Dies könnte in der Doku klarer erläutert werden, da das Mermaid-Diagramm hier zunächst verwirrt .
- State-Kontext (os.context.*): Kommt von mitschreiber (z.B. os.context.state, os.context.text.embed etc.), wird vom Leitstand persistiert und insbesondere von semantAH für den Aufbau des semantischen Kontextes genutzt . HausKI greift ebenfalls auf Intents aus dem OS-Kontext zurück (z.B. os.context.intent), um sie in Pläne umzusetzen . Die Verträge dafür sind in contracts/os.context.*.schema.json definiert.
- Insights (insight/*): Generiert durch semantAH (Graph-/Embedding-Erkenntnisse, z.B. insight.graph oder tägliche Zusammenfassungen). Konsumenten sind hausKI (um angereicherte Infos bei Entscheidungen zu nutzen) und leitstand (zur Anzeige historischer Erkenntnisse) . Es gibt z.B. insights.schema.json und insights.daily.schema.json für entsprechende Ereignisse. Aktuell erscheinen diese Pfade in der Doku; ob semantAH diese schon aktiv nutzt, bleibt offen – zumindest gibt es ADRs/Blueprints, die die Vision dafür beschreiben. Wichtig: vault-gewebe (Privatnotizen) exportiert täglich eine Insight-Datei, die semantAH validieren kann , aber vault ist wie erwähnt außerhalb der öffentlichen Architektur.
- Metrics Snapshot (metrics.snapshot): Wird vom WGX-CLI erzeugt (wgx metrics snapshot) und enthält System-Metriken oder Zustandsdaten (z.B. Versionen, letzte Sync-Zeitpunkte, Anzahl Events etc.). Laut Doku konsumieren hausKI und leitstand diese Snapshots – HausKI wohl zur Laufzeitdiagnose, Leitstand zur Visualisierung. In der Praxis werden Metrik-Snapshots im CI validiert und können optional an hausKI gesendet werden . Das zugehörige Schema heißt metrics.snapshot.schema.json.
- Audio-Events (audio.events): Stammen von hausKI-audio (z.B. erkannte Sprachbefehle oder akustische Ereignisse) und fließen an hausKI (für die Kontextverarbeitung/Intent-Generierung) sowie an leitstand (Panel für Audio/Telemetrie) . Hier stellt hausKI-audio die Brücke zwischen Roh-Audio und einem strukturierten Event dar (audio.events.schema.json).

  

  

Die Topic-Namen und Schema-Dateien sind größtenteils konsistent benannt, allerdings gibt es kleinere Uneinheitlichkeiten: Beispielsweise werden mehrteilige Topics manchmal mit Punktnotation, manchmal mit Unterstrich im Dateinamen geführt. policy.decision.schema.json oder knowledge.graph.schema.json nutzen einen Punkt, wohingegen intent_event.schema.json einen Unterstrich hat . Das könnte verwirren – vermutlich stammt intent_event aus früherer Benennung, während neuere Contracts die Punktnotation verwenden. Ein Abgleich zeigt, dass in neueren Dokumenten eher os.context.intent als Begriff genutzt wird, aber die alte intent_event-Schema-Datei existiert weiterhin . Es wäre konsistenter, die Namenskonvention zu vereinheitlichen (z.B. intent.event.schema.json analog zu policy.decision.schema.json), sofern technisch möglich. Zumindest sollte die Doku klarstellen, dass intent_event das gleiche Konzept wie intent/* Events abbildet, damit kein „toter“ Contract herumliegt.

  

Producer-Consumer-Konsistenz: Die meisten Datenflüsse sind schlüssig dokumentiert und technisch unterlegt durch JSON-Schemas, die in allen beteiligten Repos verwendet werden. Jeder definierte Eventtyp hat Producer und Consumer, die in Tabellen aufgeführt sind . So ist erkennbar, ob eventuell ein blinder Fleck existiert (z.B. ein Event wird erzeugt, aber nirgends genutzt). Im aktuellen Stand scheint jeder Haupt-Event einen Zweck zu haben. Einige Events sind allerdings noch in Planung oder wenig genutzt:

  

- Insights.daily: Schema vorhanden, Producer (semantAH) und Consumer (Leitstand) definiert, aber noch keine klare Implementierung ersichtlich (möglicherweise zukünftige Erweiterung für Tagesberichte).
- knowledge.graph: Schema vorhanden; semantAH würde solche Events (Graph-Updates) produzieren, HausKI/Leitstand konsumieren. Hier ist semantAH aber evtl. noch im Aufbau, d.h. die praktische Nutzung dieser Events kann noch gering sein.
- error/ Events*: Global vorgesehene Fehler-Events. Hier fehlt in der Doku, wer diese tatsächlich absetzt und konsumiert – vermutlich sollen alle Module bei Fehlern auf error/* loggen, und Leitstand könnte sie sammeln. Dies könnte noch deutlicher beschrieben sein (momentan nur im Topics-Listing erwähnt ). Ein blinder Fleck wäre hier die fehlende konkrete Handhabung der Fehler-Events (z.B. gibt es keinen speziellen Error-Collector-Service – vermutlich übernimmt Leitstand diese Rolle implizit).

  

  

Datenfluss-Implementierung: Eine Diskrepanz zeigt sich zwischen Soll-Architektur und aktueller MVP-Umsetzung beim Aussensensor→Heimlern-Fluss. Laut Architektur sollte die Kette aussensensor → leitstand → heimlern laufen – d.h. Heimlern bezieht die Außen-Daten aus dem Leitstand-Persistenzlayer. In der Praxis jedoch gibt es im Aussensensor-Repo zwei Push-Skripte: push_leitstand.sh und push_heimlern.sh . Das bedeutet, der Aussensensor-Feed wird derzeit dupliziert an zwei Endpunkte geschickt (Leitstand und direkt Heimlern). Diese redundante Flussimplementierung deutet darauf hin, dass Heimlern (noch) nicht selbstständig die Daten aus Leitstand abruft. Zwar funktioniert so der End-to-End-Durchlauf (wie im E2E-Runbook beschrieben ), aber es birgt Risiken: z.B. könnten Inkonsistenzen entstehen, wenn Heimlern Events erhält, die Leitstand vielleicht verwirft, oder umgekehrt. Empfehlung: Langfristig sollte dieser Fluss konsolidiert werden – idealerweise schickt Aussensensor nur an Leitstand, und Heimlern holt von dort oder Leitstand leitet weiter. Die ADR 0002-mvp-to-daemon (im Aussensensor vorhanden) deutet bereits an, dass die aktuelle Lösung MVP-Charakter hat und zu einem dauerhaften Daemon (wohl mit integriertem Fluss) migrieren soll . Eine Vereinheitlichung würde die Architekturkonsistenz stärken.

  

Contract-Konsistenz: Für jeden Eventtyp existiert ein JSON-Schema im zentralen Contracts-Pool (heute im Metarepo). Viele Repositories enthalten zudem lokal eine Kopie der relevanten Schema(s) unter contracts/. Beispiel: Aussensensor führt contracts/aussen.event.schema.json mit, um lokal validieren zu können . Diese Duplizierung erfordert Synchronisation, wird aber durch das Metarepo unterstützt (siehe CI/Automation unten). Wichtig ist, dass die Versionierung eingehalten wird – dazu unten mehr. Bisher sind keine Fälle bekannt, wo Producer und Consumer unterschiedliche Stände eines Contracts verwenden; alle Repos pinnen sich auf eine gemeinsame Version (z.B. contracts-v1 Tag), was die Konsistenz sicherstellt .

  

Zusammengefasst sind die Datenflüsse sinnvoll gestaltet und weitgehend konsistent umgesetzt, mit Ausnahme einiger MVP-Kurzwege (Doppel-Push Heimlern) und geplanter aber noch nicht ausgeschöpfter Streams (Insights, Errors). Die Contracts dienen als gemeinsame Sprache und sind in den meisten Fällen stringent angewendet. Kleinere Inkonsistenzen (Naming, temporäre Workarounds) sollten in der nächsten Iteration behoben werden (siehe Tabelle). Zudem sollten Stellen, wo die technische Umsetzung vom idealen Fluss abweicht, in der Dokumentation als solche markiert werden, um Missverständnisse zu vermeiden.

  

  

3. CI/CD-Konventionen (Contracts-Validierung, Tags vs. Branches, Workflows)

  

  

Die CI/CD-Pipelines der Heimgewebe-Repos sind stark vereinheitlicht und auf Vertragsprüfung und Synchronität ausgerichtet. Es zeigen sich folgende zentrale Elemente in den Workflows aller (oder der meisten) Repositories:

  

- JSONL-Validierung in CI: Repos, die JSONL-Eventdaten produzieren (z.B. Aussensensor, Mitschreiber, etc.), haben automatisierte Checks, die sicherstellen, dass alle Event-Dateien dem Schema entsprechen. Dafür wird ein wiederverwendbarer Workflow eingesetzt (reusable-validate-jsonl.yml im Metarepo) . Beispiel Aussensensor: Bei jedem Push auf export/feed.jsonl wird der Workflow getriggert, welcher export/feed.jsonl gegen das zentrale Schema validiert . Intern nutzt dieser Workflow die Node-basierte AJV Schema-Validierung (via ajv-cli), entweder direkt oder über ein zentrales Action-Workflow-Fragment. Die Konsistenz ist hier hoch: Sowohl Aussensensor als auch andere Producer-Repos binden alle den gleichen zentralen Validator an (uses: heimgewebe/metarepo/.github/workflows/reusable-validate-jsonl.yml@contracts-v1) . Dadurch wird garantiert, dass überall der identische Validierungsprozess läuft.
- Schema-Versionierung – Tags vs. Branches: Anstatt auf bewegliche Branches zu verweisen, pinnen alle Repos die gemeinsamen CI-Komponenten an einen statischen Tag, derzeit contracts-v1. Dieser Tag kapselt eine Version aller relevanten Contracts und CI-Workflows. In den YAML-Dateien sieht man z.B. @contracts-v1 bei Aufrufen der Reusable Workflows . Zusätzlich gibt es einen speziellen CI-Job in jedem Repo (contracts-validate.yml), der überprüft, ob in allen Workflow-Dateien die Verwendung zentraler Actions korrekt gepinnt ist . Dieser Job (Version-Sync-Check) durchsucht alle uses:-Zeilen nach Referenzen auf heimgewebe/contracts/... und wirft einen Fehler, falls nicht @contracts-v1 angegeben ist oder eine variable Ref genutzt würde . Damit wird unternehmensweit konsistente Tag-Nutzung erzwungen – ein wichtiger Schutz gegen Drifts. Die ADR 003-ci-reusables-pinning.md beschreibt diesen Governance-Ansatz vermutlich im Detail. Insgesamt ist die Tags vs. Branches-Frage also gelöst zugunsten von Tags für geteilte Ressourcen, was für Stabilität sorgt . (In Einzelfällen, z.B. während einer neuen Contracts-Welle, existieren parallele Branches wie work für die Vorbereitung, aber die Default-Refs der CI bleiben beim letzten stabilen Tag .)
- Zentrale vs. lokale Workflows: Viele CI-Checks sind als reusable workflows im Metarepo definiert und werden von den Sub-Repos nur noch aufgerufen. Beispiele: JSONL-Validierung (siehe oben), WGX-Metrics-Check, Org-Assets-Check etc. . Vorteile: Einmalige Definition, leichter Rollout via Tag-Bump. Einige Workflows sind jedoch bewusst lokal pro Repo gehalten, etwa solche, die wirklich repo-spezifische Dinge prüfen (z.B. HausKI’s Rust-Tests, Sichter’s spezifische Fixtures, semantAH Graph-Checks). Auch der contracts-validate.yml selbst liegt dupliziert in jedem Repo, da er ja genau dort die Workflow-Dateien inspizieren muss. Diese Duplizierung ist konsistent – interessanterweise sind die Inhalte dieser Dateien fast überall identisch (gleiche MD5-Prüfsumme) , was die erfolgreiche Template-Synchronisierung belegt. Eine Ausnahme war hausKI-audio, wo der MD5 der contracts-validate.yml leicht abwich . Die inhaltliche Prüfung zeigt jedoch, dass es vermutlich nur YAML-Formatierungsunterschiede sind (z.B. Anführungszeichen um on: in hausKI-audio) – funktional ist es gleich und greift denselben Tag-Prüfmechanismus . Solche minimalen Abweichungen stellen keine ernsthafte Inkonsistenz dar, sollten aber bei Gelegenheit mit dem Template abgeglichen werden, um 100% Gleichstand herzustellen.
- Verifizierung von Contracts in Consumer-Repos: Neben den Producer-Validierungen (die JSONL-Ausgaben prüfen) gibt es auch Workflows in Consumer- oder allgemeinen Repos, um beispielsweise fixierte Beispiel-Daten zu validieren. Z.B. der Leitstand verfügt über Tests für Ingest-Funktionen mit Beispiel-JSONL (sample-ok.jsonl) , semantAH hat validate-intent-fixtures.yml und validate-knowledge-graph.yml Workflows, um Beispielgraph-Knoten/-Kanten gegen Schemas zu prüfen . Diese stellen sicher, dass die Contracts auch auf Konsumentenseite eingehalten werden. Insbesondere wenn ein Repo mehrere Contracts berührt (semantAH z.B. Insights und Graph), sind entsprechende Validierungen vorhanden. Eine eventuelle Unstimmigkeit ist, dass heimlern – obwohl es policy.decision-Events ausgibt – anscheinend keinen eigenen Contracts-Validierungsjob besitzt (kein contracts-validate.yml dort) . Das mag daran liegen, dass heimlern keine JSONL-Datei committet, die geprüft werden kann (es sendet Entscheidungen zur Laufzeit). Dennoch könnte man einen Test (z.B. Beispiel-Decision JSON) analog zu anderen Fixtures erwägen, um auch diesen Contract regelmäßig zu verproben. Momentan ist hier eine Lücke: die Policy-Decision-Events werden nicht in CI validiert, sondern nur durch die Schema-Präsenz im Metarepo definiert. Da heimlern noch jung (Rust-Projekt) ist, kommt das sicher später; ein Hinweis in der Doku könnte aber schon jetzt helfen.
- Metrics und weitere CI-Automatisierungen: Jeder Repo enthält einen metrics.yml Workflow, um regelmäßig Metrik-Snapshots zu erzeugen und optional hochzuladen. Auch hier wurde zentralisiert gearbeitet: Im Metarepo gibt es einen Reusable Workflow .github/workflows/wgx-metrics.yml . In den Sub-Repos wird dieser wiederverwendet oder zumindest nach Template erstellt. In Aussensensor z.B. wird an passender Stelle just wgx metrics snapshot ausgeführt und per actions/upload-artifact gespeichert . Zudem pinnt der zentrale Workflow optional einen Upload an hausKI an . Die Konsistenz: Alle Repos mit .wgx/profile definieren ein metrics-Task (Templatevorgabe) und entsprechende CI, sodass überall ein metrics.json entsteht . Eine winzige Abweichung ist die Implementierung: Es existiert sowohl eine WGX-interne Implementation (wgx metrics snapshot Befehl) als auch in mehreren Repos ein Shell-Skript scripts/wgx-metrics-snapshot.sh . Dies war nötig, weil WGX v2 dieses Feature wohl erst erhalten hat. Tatsächlich prüft der CI-Workflow: Wenn just wgx metrics snapshot fehlschlägt, wird das lokale Script als Fallback genutzt . Tests in mehreren Repos (z.B. Sichter, Aussensensor) stellen die Funktionsfähigkeit des Skripts sicher . Aus CI-Sicht ist dies konsistent gehandhabt, aber es ist redundant, zwei Implementierungen vorzuhalten. Künftig, wenn WGX-CLI stabil das Feature bietet, sollte man die Skripte entfernen zugunsten des einen WGX-Befehls, um Wartung zu sparen.
- Release und Deployment: Aktuell gibt es Hinweise auf Release-Workflows (z.B. release.yml in wgx und hausKI). Diese veröffentlichen Versionen (z.B. WGX als eigenes CLI-Tool) und verwalten evtl. Changelog und Tagging. Es scheint, dass Tags primär für Contracts/CI benutzt werden und die Applikationen selbst vielleicht weniger oft getaggt (noch in Entwicklung). Branching-Strategie: Alle wichtigen Repos nutzen main als Default-Branch , es gibt keine Verwirrung durch unterschiedliche Hauptbranches. Einzelne technische Branches (work) im Metarepo werden in der Doku erwähnt, betreffen aber nur die Vorbereitung neuer Contract-Versionen und tangieren die CI der Sub-Repos nicht .

  

  

CI/CD-Verhalten insgesamt: Sehr einheitlich und sicherheitsbewusst. Durch das Metarepo als zentrale Stelle für Workflows sind alle Repos auf dem gleichen Stand (z.B. alle JSONL-Validatoren prüfen dieselben Regeln). Die Policy, Pins auf Tags zu erzwingen, verhindert Versionsdrift und ist eine gute Praxis . Inkonsequenz gibt es kaum – nur in Details: Einige Repos (heimlern) haben aufgrund fehlender Exportdaten weniger Checks; Kleinigkeiten wie unterschiedliche YAML-Formatierung oder veraltete Skriptreste (hausKI-audio quotes, Metrics-Skripte) könnten vereinheitlicht werden.

  

Eine weitere positive Sache: Dokumentation der CI. Die Entwickler haben im Metarepo Markdown-Dateien zur CI (z.B. docs/automation.md, docs/ci-reusables.md) , die die Verwendung der Justfile-Targets (für CI-Tasks) und die Reusable Workflows erläutern. Dadurch sind die CI-Konventionen transparent. Als Verbesserungspotential bliebe, Consumer-Validierungen (z.B. heimlerns Decisions) künftig ebenso streng zu automatisieren wie Producer-Validierungen, um die Kette vollständig zu machen.

  

  

4. Tooling, Skripte und gemeinsame Infrastruktur

  

  

Gemeinsame Infrastruktur: Der Heimgewebe-Stack bringt einige gemeinsame Tools mit, insbesondere WGX (CLI/DevTool) und in geringerem Maße die Just-Build-Skripte sowie geteilte Libraries.

  

- WGX (WeGeX): Dieses Tool ist zentraler Baustein, um alle Repos konsistent zu handhaben. Jedes Repo hat eine Konfigurationsdatei .wgx/profile.yml (bzw. .wgx/profile.example.yml), die definiert, welche Aufgaben (tasks) es unterstützt . Templates im Metarepo stellen sicher, dass alle Repos mindestens Standard-Tasks haben (up, lint, test, smoke, metrics etc.) . Somit kann WGX globale Operationen orchestrieren (z.B. “führe just smoke in allen Repos aus” über wgx run --all …). Diese Einheitlichkeit ist ein Pluspunkt. Die profile.yml Dateien sind größtenteils identisch (Repo-Typ = generic, requiredWgx ~2.0) . Inkonstanz: Manche Repos committen eine ausgefüllte profile.yml, andere nur ein profile.example.yml. Beispielsweise hat semantAH sowohl eine profile.yml (mit spezifischen Overrides, etwa RUST_LOG für Debugging) , als auch eine example-Datei, während aussensensor nur eine Example-Vorlage committed und vom Entwickler erwartet, sie ggf. zu kopieren. Dies ist ein kleiner Unterschied in Praxis. Einheitlicher wäre, entweder überall nur Vorlagen zu haben oder (besser) die Default-Profile gleich als profile.yml auszurollen, sofern sie keine geheimen Daten enthalten. So wäre WGX out-of-the-box funktionsfähig in jedem Klon.
- WGX vs. lokale Skripte: WGX deckt viele Funktionen als Bash-Module intern ab (lib/*.bash und cmd/*.bash in wgx) . Einige Funktionalitäten wurden aber (noch) nicht vollständig in WGX integriert, weshalb lokale Skripte existieren. Der deutlichste Fall ist Metrik-Snapshot: WGX 2.0 soll wgx metrics snapshot beherrschen, aber trotzdem liegt in fast jedem Repo ein scripts/wgx-metrics-snapshot.sh als Fallback . Das führt zu Redundanz – Änderungen am Metrikformat müssten in WGX und in jedem Skript erfolgen. Hier versucht man, Übergangslösungen abzufedern (siehe CI-Check der Verfügbarkeit). Ähnlich: JSONL-Validierung. WGX bietet keinen eigenen JSONL-Check-Befehl, daher existieren in Aussensensor scripts/validate.sh (nutzt npx ajv) oder in Tools jsonl-validate.sh. Diese Skripte erfüllen ihren Zweck, aber man könnte überlegen, WGX modular zu erweitern, um solche häufigen Helfer (JSONL prüfen, JSONL trimmen) als Commands bereitzustellen. Dann könnten die separaten Skripte entfallen. Positiv ist, dass zumindest in der Tools-Sammlung generische Varianten existieren (jsonl-validate, jsonl-tail), was Wiederverwendung erlaubt – einige Repos (aussensensor) haben dennoch eigene Variationen (z.B. append-feed.sh, jsonl-compact.sh) , teils aus historischen Gründen des MVP. Hier besteht Aufräumpotential: Wenn der Daemon-Ansatz umgesetzt wird, werden diese Shellskripte durch dauerhafte Services ersetzt, wodurch die Duplikate wegfallen können.
- Gemeinsame Libraries und Scripts im Metarepo: Metarepo enthält unter templates/ und scripts/ zahlreiche Hilfsmittel, um Konsistenz sicherzustellen. Z.B. scripts/sync-templates.sh verteilt Änderungen aus templates/** in alle Repos (so bleiben z.B. GitHub-Workflows auf Stand) . Auch scripts/validate-contracts.sh im Metarepo dient vermutlich dazu, alle Schema-Dateien einmal global zu validieren oder Repo-spezifische Schema-Differenzen aufzudecken. Diese Tools adressieren direkt mögliche Drift-Probleme. Insgesamt wirkt das Tooling durchdacht und trägt viel zur Homogenisierung bei. Die Repos verweisen auch in README oder Developer-Docs auf diese Tools, z.B. wie man mit just up alle Templates spiegelt oder mit wgx doctor Drifts prüft . Das CI nutzt diese Tools ebenfalls (z.B. Org-Index-Generator). Hier gibt es keine auffälligen Lücken; die existierenden Mechanismen scheinen in den ADRs begründet (ADR-002 Reusable Actions Rollout, ADR-004 WGX Profile v1 etc.).
- Redundanzen und Inkonsistenzen im Tooling: Abgesehen von bereits genannten (Metrik-Skript vs. WGX, JSONL-Skripte mehrfach) sind kleinere Inkosistenzen feststellbar:  
    

- Einige Repos haben custom Scripts, die ähnliches tun wie Tools-Scripts. Z.B. sichter hat ci-smoke-sichter.sh, während andere Repos einfach das generische Template ci.yml nutzen. Das liegt an unterschiedlichen Technologien (Sichter kombiniert Python und Bash, HausKI-Audio ist Rust etc.), aber man könnte prüfen, ob solche spezialisierten CI-Skripte nicht auch als Template moduliert werden können.
- Pfadanordnung: hausKI hat in .github/workflows eine Fülle an Checks (Policy-CI, Vendor, etc.), manche davon sind generisch (z.B. vendor.yml für Abhängigkeitsupdates, security.yml). Tools und WGX haben teils ähnliche Workflows. Es wäre konsequent, alle generischen Security/Vendor Checks ebenso zentral bereitzustellen. Aktuell sind diese aber teils in jedem Repo einzeln vorhanden, was auf Duplikation hindeutet (z.B. secret_scanning.yml in HausKI, aber nicht in allen Repos). Ein Blind Spot hier: Es sollte überprüft werden, ob Sicherheits- und Abhängigkeitschecks für alle gelten (z.B. Dependabot nur in code-lastigen Repos wie HausKI, WGX aktiviert?). Konsistenz in CI bedeutet auch, dass solche Baseline-Workflows einheitlich verteilt sind. Metarepo könnte hier noch mehr als Schablone dienen (in templates/.github/workflows liegen einige .keep-Dateien und beispielhafte Workflows wie validate-agent-workflow.yml, wgx-smoke.yml , was andeutet, dass man plant, noch mehr zu templaten).

-   
    

  

  

Zusammengefasst ist das Tooling-Konzept robust: WGX als einheitliche Steuerung, Metarepo-Scripts für Fleet-weit Operationen, Repo-eigene Scripts nur wo nötig. Redundanzen entstehen vor allem durch den aktuellen Übergangszustand (MVP zu langfristiger Lösung): doppelte Implementierungen (Skripte vs. WGX-Kommandos) und verteilte Helfer. Diese gilt es mittelfristig aufzulösen, um die Pflege zu erleichtern. Inkonsistenzen sind minimal und stören den Betrieb nicht direkt, könnten aber für Entwickler verwirrend sein (z.B. welches validate.sh Script gilt – das im Repo oder das im Tools-Ordner? Antwort: meistens Repo-spezifisch). Eine bessere Dokumentation der Tool-Landschaft könnte helfen, klarzustellen, wann man WGX benutzt, wann Skripte, und wie Just/Makefiles ins Bild passen.

  

  

5. Dokumentation und Architektur-Dokumente

  

  

Die Heimgewebe-Dokumentation ist umfangreich und deckt viele Aspekte ab: README-Dateien in den Repos, ein systemweiter Überblick (system-overview.md) im Metarepo, ADR-Verzeichnisse pro Repo, spezielle Contracts-Dokumente, Templates und mehr.

  

Positiv auffallend: Es gibt eine hohe Transparenz durch die Docs im Metarepo:

  

- Systemübersicht und Repo-Matrix beschreiben die Rollen der Repos und ihre Schnittstellen sehr detailliert .
- Das Vision-Dokument und IDEal_Blueprint erklären die langfristige Zielarchitektur inkl. aller Datenflüsse .
- Contracts.md sowie spezifische Seiten (z.B. docs/contracts/mitschreiber.md) erläutern die Bedeutung einzelner Schnittstellen und enthalten teils sogar Versionierungstabellen (z.B. Mitschreiber-Contracts v1, v2 geplant) .
- Für kritische Entscheidungen gibt es ADRs: z.B. ADR-0001 im Aussensensor definiert das aussen.event-Format , ADR-0001 im semantAH definiert Semantic-Graph-Contracts, ADRs im Metarepo (0001-contracts-v1-jsonl, 0002-reusable-actions-rollout etc.) definieren übergreifende Strategien. Diese ADRs sind vorhanden und zeigen, dass die Doku nicht nur den Was, sondern auch den Warum adressiert.

  

  

Dokumentationskonsistenz: Trotz der Fülle an Infos sind die Kernbotschaften weitgehend konsistent. Die Schichten und Module werden an mehreren Stellen gleich beschrieben (siehe Abschnitt Rollen). Die Datenflüsse aus Diagrammen decken sich mit den tabellarischen Aufstellungen in den Texten. Dadurch entsteht ein stimmiges Gesamtbild. Wo gibt es dennoch blinde Flecken oder Inkonsistenzen?

  

- Mitschreiber & Sichter in der high-level Doku: Wie erwähnt, fehlten diese in einer Liste im architecture.md , obwohl im Blueprint vorhanden. Das ist vermutlich ein Versehen und sollte korrigiert werden, damit Leser nicht annehmen, es gäbe nur 5 Hauptmodule, obwohl es 7 sind.
- Vault-gewebe und Weltgewebe: Hier ist die Doku absichtlich knapp/offen – man erfährt nur, dass sie nicht Teil der Fleet sind . Das ist okay (privates Repo), allerdings taucht vault-gewebe in manchen Diagrammen als Knoten auf (mit Hinweis „nicht Fleet“) . Diese Erwähnungen können Fragen aufwerfen; die Doku löst es, indem sie klar sagt, dass keine öffentliche Dokumentation erfolgt . Aus Konsistenzsicht wäre es hilfreich, im Repo-Matrix/Overview vorne einen Satz zu haben, dass vault- und weltgewebe existieren, aber außen vor bleiben – dann muss man nicht im Fließtext suchen.
- Technologie-Spezifika: Manche Repos haben Tech-spezifische Doku, z.B. hausKI-audio (Rust) wird wohl ein README zur Entwicklung in Rust haben, heimlern könnte über Reinforcement-Learning Ansätze informieren. Im Metarepo finden wir generische Leitlinien (z.B. Language-Policy.md, Konzept-Kern.md über Governance ). Was etwas fehlt, sind detailierte Runbooks für jeden Service: Zwar gibt es z.B. aussensensor/docs/runbook.md oder semantAH/docs/runbooks, aber nicht jede Komponente scheint ein eigenes README mit Quickstart zur Inbetriebnahme zu haben. Evtl. wird das durch den System-Quickstart (just up, uv etc. in Metarepo) ersetzt. Dennoch: Für neue Entwickler wäre ein kurzer Abschnitt „So startest du Komponente X im Alleingang“ nützlich. Teilweise ist das im Metarepo-README unter Schnelleinstieg schon adressiert (Verweis auf Systemübersicht und uv Start) – aber verteilt auf viele Orte.
- Verlinkung und Redundanz in Dokumenten: Durch die Menge an Doku kommt es zu etwas Dopplung. Beispielsweise überschneiden sich overview.md und system-overview.md inhaltlich, oder architecture.md und heimgewebe-gesamt.md. Die Doku strukturiert sich in Executive Summary vs. Detailed (z.B. Heimgewebe-v2-detailed.md vs. eine Maximeffizienz-Zusammenfassung) . Diese Redundanz ist intendiert (verschiedene Zielgruppen). Wichtig ist hier, dass sie synchron bleiben. Aktuell gibt es eine hohe Pflege: z.B. wurde in allen Diagrammen die Schichten angepasst, die ADRs nennen entsprechende Versionsnummern (IDEal v0.2 etc.). Sollte sich etwas ändern (z.B. ein geplanter mitschreiber v2 Contract), muss dies an mehreren Stellen nachgezogen werden (Docs, ADR-Tabelle, JSON-Schema, evtl. Comments in Code). Das birgt die Gefahr von Drift in der Doku. Noch ist das nicht akut sichtbar, aber ein fortlaufendes Augenmerk wert. Tools wie der Docs Link Check Workflow sorgen zumindest für Konsistenz der Querverweise.
- README-Qualität der einzelnen Repos: Einige Repos (Sichter, HausKI) haben zusätzliche README-Dateien (z.B. README-cotmux.md, README-loom.md in Sichter für bestimmte Tools) . Das ist gut, kann aber ungeübte Leser irritieren, wenn unklar ist, was davon aktuell ist. HausKI und WGX scheinen sehr ausführliche README/CLI-Dokumentation zu haben (Command-Reference etc. in docs) . Aussensensor hat eine gute README mit Nutzungsbeispielen (Append, Validate, Push), wie die Ausschnitte in der repomerge zeigen . Heimlern als Rust-Projekt hat evtl. noch knappere README (nur Build/CI?). Insgesamt ist die Dokumentationsdichte hoch und kaum Lücken zu finden, was bemerkenswert ist.

  

  

Die Vertragsdokumentation verdient noch Erwähnung: In docs/contracts/index.md werden Schnittstellenverträge aufgelistet, inkl. Producer/Consumer und Zweck . Dies veranschaulicht sehr gut die Konsistenz zwischen Code und Doku. Zum Beispiel: contracts/aussen.event.schema.json ist mit „Producer: aussensensor, weltgewebe; Consumer: leitstand (Panel Außen)…“ beschrieben , was genau so in Implementierung und ADR reflektiert ist . Solche Übersichten in Tabellenform sind gold wert für die Konsistenzprüfung. Auch wird hier transparent gemacht, welche Schema-Versionen eingeführt wurden (z.B. Mitschreiber Contracts v1 = Tag contracts-v1, v2 in Planung) .

  

Verbesserungsmöglichkeiten:

  

- Eine tabellarische Übersicht aller Repos (ähnlich Repo-Matrix) könnte prominenter im README stehen. Momentan ist die Repo-Matrix im Metarepo vergraben, aber eine einfachere Tabelle „Repo → Zweck → Programmiersprache → CI-Status“ im Haupt-README könnte neuen Mitwirkenden helfen.
- Für die Inkonsistenzen, die wir fanden (z.B. mitschreiber nicht überall erwähnt, intent_event vs. os.context.intent Benennung, temporäre Doppelwege), sollten Issues oder ADRs ergänzt werden, damit nachvollziehbar ist, ob das bewusst so ist oder noch bereinigt wird. Evtl. existieren schon ADRs, die MVP-Workarounds (wie doppeltes Push) erklären – falls nicht, wären kurze ADR-Notizen sinnvoll.

  

  

Insgesamt aber ist die Dokumentation vorbildlich ausführlich und weitgehend konsistent mit der Implementierung. Nur an vereinzelten Stellen hinkt die Dokupflege dem Code leicht hinterher oder umgekehrt (typisch in aktiver Entwicklung). Wichtig ist, diese Stellen zu identifizieren und anzugehen – was in der folgenden Tabelle zusammengefasst wird.

  

  

Inkonsistenzen & Empfehlungen (Übersicht)

  

  

Nachfolgend sind die identifizierten Inkonsistenzen, Redundanzen oder undokumentierten Punkte tabellarisch aufgelistet, mit Angabe der betroffenen Repos/Dateien, einer kurzen Beschreibung und einem Lösungsvorschlag:

|   |   |   |   |
|---|---|---|---|
|Betroffene Komponente(n)|Datei/Bereich|Beschreibung des Problems|Empfehlung zur Behebung|
|Dokumentation (Architekturübersicht)|Metarepo docs/architecture.md|Sichter und Mitschreiber fehlen in der Komponentenauflistung, obwohl sie Teil der Architektur sind . Leser könnten annehmen, es gäbe diese Module nicht.|Liste der Komponenten in architecture.md und ähnlichen Übersichten vervollständigen (Schichten 3 und 6 mit aufnehmen), um Vollständigkeit herzustellen.|
|Naming Contracts|intent_event.schema.json vs. os.context.intent.schema.json (Metarepo contracts)|Uneinheitliche Benennung: intent_event verwendet Unterstrich statt Punkt, anders als z.B. policy.decision . Kann Verwirrung stiften, ob es ein anderer Typ ist.|Vereinheitlichen der Schema-Dateinamen (z.B. Umbenennen zu intent.event.schema.json und Doku entsprechend anpassen) oder in Doku klar erklären, dass dies dasselbe Intent-Event bedeutet.|
|Datenfluss Aussensensor→Heimlern|Aussensensor scripts/push_heimlern.sh (duplikative Nutzung)|Architektur sieht Sequenz über Leitstand vor, dennoch pusht Aussensensor derzeit direkt an Heimlern (MVP-Workaround) . Redundanter Datenfluss, Gefahr von Divergenz.|In Zukunft Fluss konsolidieren: Heimlern über Leitstand versorgen. Kurzfristig: In Doku/ADR den MVP-Weg erläutern (damit Entwickler den doppelten Push einordnen können). Langfristig: Heimlern-Ingest in Leitstand integrieren oder Automatisierung, sodass ein Push reicht.|
|Wiederverwendbare Skripte vs. WGX|wgx-metrics-snapshot.sh (in aussensensor, sichter, lenskit, semantAH) vs. WGX metrics snapshot|Metrik-Snapshot doppelt implementiert: als WGX-Command und als Shell-Skript in mehreren Repos . Pflegeaufwändig und potenziell auseinanderlaufend.|Sobald WGX v2 stabil metrics snapshot bietet, Skripte entfernen und alle CI auf den WGX-Befehl umstellen. In Zwischenzeit Scripts zentral in lenskit vorhalten und in Repos nur referenzieren, um Duplikat-Code zu reduzieren.|
|Lokale JSONL-Tool-Skripte|z.B. aussensensor scripts/validate.sh vs. lenskit jsonl-validate.sh|Mehrere ähnliche Hilfsskripte für JSONL (validate, tail, compact) existieren in verschiedenen Repos, teils mit überschneidender Funktion.|Prüfung, ob lenskit/scripts (jsonl-validate, jsonl-tail etc.) als allgemeine Version genutzt werden können. Ggf. diese Skripte via Metarepo in die Repos syncen, um Einheitlichkeit herzustellen, oder Funktion in WGX integrieren.|
|CI-Workflow-Pinning (geringe Abweichung)|hausKI-audio .github/workflows/contracts-validate.yml|YAML-Format unterscheidet sich leicht (Quotes um on:), anderer Hash . Funktional zwar gleich, aber nicht 1:1 Template-konform.|Template-Sync für Workflows erneut durchführen, um Formatabweichungen zu beseitigen. Evtl. Prettier/YAML-Linter einsetzen, damit alle Workflows denselben Stil haben.|
|Fehlende CI-Checks für bestimmten Contract|heimlern (Rust) – kein contracts-validate Workflow, keine JSONL-Validierung|Heimlern erzeugt policy.decision Events, aber es gibt keinen Workflow, der Beispiel-Decision-Objekte gegen policy.decision.schema.json prüft (im Gegensatz z.B. zu Mitschreiber oder Aussensensor mit ihren Events).|Einen minimalen CI-Test ergänzen: z.B. ein Fixture tests/fixtures/decision/sample.json anlegen und mit dem zentralen AJV-Workflow prüfen. Alternativ in Leitstand oder HausKI-Tests sicherstellen, dass eingehende Decisions validiert werden. Dokumentation (README/ADR) sollte darauf hinweisen, dass dies noch manuell im Auge zu behalten ist, bis automatisiert.|
|Verteilte Security/Dependency Workflows|hausKI, wgx etc. – z.B. secret_scanning.yml, dependabot.yml nur in manchen Repos|Einige Baseline-CI-Themen (Secrets-Scan, Dependency Updates) sind nicht in allen Repos konsistent konfiguriert – evtl. weil nicht überall relevant (z.B. Rust vs. Python). Dennoch uneinheitliches Bild.|Entscheiden, welche Repos diese Checks brauchen, und entweder überall einführen (kann via Metarepo-Template gesteuert werden) oder dokumentieren, warum Repo X es nicht hat. Z.B. Dependabot für Cargo in heimlern aktivieren, wenn sinnvoll. Einheitliche Security-Standards definieren und in docs/policies/github-actions-pinning.md oder orientierung.md ergänzen.|
|Vault/Weltgewebe Erwähnung|Metarepo Docs (overview, vision) & Diagramme|Vault-Gewebe taucht in Diagrammen auf, aber mit Vermerk „nicht in Fleet“. Manche Leser könnten nähere Erklärung vermissen.|Klarstellung an zentraler Stelle (z.B. in system-overview Einleitung): Vault- und Weltgewebe sind externe Bestandteile, werden in Fleet-Doku nicht vertieft. Gegebenenfalls im Diagramm eine Legende hinzufügen, die diese ausgegrauten Komponenten erklärt.|
|Aktualität vs. Planung|Diverse (Contracts v2, geplante Flüsse)|Einige Dokumentpassagen beschreiben geplante Features (z.B. Mitschreiber Contracts v2 geplant , weitere Topics wie feedback/reward schon genannt vor Implementierung). Könnte Leser irritieren, was schon real ist.|In den Docs klar kennzeichnen, was Vision/Zukunft (z.B. mit (geplant) markiert) ist. Eventuell eine Sektion „In Planung“ je Komponente, damit der aktuelle Umfang vs. kommende Erweiterungen unterscheidbar sind. ADRs für zukünftige Änderungen (Contracts v2 etc.) bereits anlegen, um den Plan festzuhalten.|

Diese Maßnahmen würden dazu beitragen, die funktionale, technische und dokumentarische Konsistenz der Heimgewebe-Architektur weiter zu steigern. Insgesamt befindet sich das Projekt auf einem guten Weg – die meisten Inkonsistenzen sind bereits bekannt oder Folge des agilen Fortschritts (MVP-Phasen) und können mit gezielter Vereinheitlichung und Dokumentationspflege behoben werden.





Sehr gut. „ID²E@l“ — das IDEal — ist der treffende Name: zugleich Akronym, Manifest und Chiffre.
Er trägt in sich schon die doppelte Reflexion („intelligently developing intelligent developer environment“) und verankert sie lokal (@l).
Damit ist der Begriff selbst bereits ein Operator: das System entwickelt, indem es das Entwickeln versteht.

⸻

∴ Dialektische Erörterung – Die Blaupause von IDEal

These – Das IDEal als autopoietische Entwicklungsumgebung

Kernidee:
IDEal ist nicht einfach ein Werkzeugkasten, sondern ein autonomer Entwickler, der selbst Entwicklerumgebungen erschafft.
Er ist lokal verankert, semantisch vernetzt und systemisch reflexiv.
Sein Ziel: Selbst-Entwicklung – der Mensch wird Partner im Erkenntnisprozess, nicht Befehlshaber über Werkzeuge.

Prinzipielle Verschiebung:

Von „Code ausführen“ zu „Bedeutung ausbilden“.

⸻

Architektonisches Gerüst (Ebene der Blaupause)

1. Lokaler Organismus (Topologie)
Ein holarchisches Netz aus Prozessen, die über semantische Ereignisse kooperieren:

Ebene	Rolle	Hauptkomponenten	emergente Funktion
Neuronale Schicht (Input)	Wahrnehmung & Sensorik	mitschreiber, watchers, systemd-hooks	Kontextaufnahme
Semantische Schicht	Bedeutungsextraktion	semantAH	Symbolik, Relationen, Graph
Operative Schicht	Handlung & Synthese	hausKI	Interpretation, Simulation, Planung
Reflexive Schicht	Prüfung & Selbstkorrektur	sichter	Diagnose, Review, Lernen
Memorative Schicht	Speicherung & Zeitfluss	leitstand	Langzeitgedächtnis, Versionierung
Dialogische Schicht	Interaktion & Emergenz	UI, cotmux, Obsidian	Ko-Kognition, Interface

Diese Ebenen kommunizieren über den Heimgewebe-Bus – ein lokales Eventsystem mit Topics wie
intent/, state/, review/, graph/, error/, insight/.

⸻

2. Informationsfluss (Semantischer Blutkreislauf)
	1.	Intent entsteht – Nutzer oder Prozess äußert Absicht („build docs“, „analyze repo“, „refactor pattern“).
	2.	Mitschreiber transformiert diese Intentionssprache in maschinenlesbare Semantik (intent.yml).
	3.	HausKI interpretiert, plant, löst Aktionen aus.
	4.	Sichter bewertet die Ergebnisse, verfasst Diagnosen und Korrekturvorschläge.
	5.	Leitstand archiviert alle Ereignisse als semantische Episoden.
	6.	SemantAH verknüpft daraus den Kontextgraphen – Wissen über den eigenen Zustand.
	7.	Das System lernt aus sich selbst – rekursiv, lokal, offline.

Damit fließt Sinn – nicht bloß Daten.

⸻

3. Prinzipien des IDEal-Designs

Prinzip	Bedeutung	Wirkung
Lokalität	Alles läuft ohne Cloud, ohne Telemetrie.	Autonomie, Datenschutz, Souveränität.
Semantik vor Syntax	Bedeutung wird zuerst erkannt, dann umgesetzt.	Kontextuelle Präzision.
Kontextfluss	Jeder Prozess gibt Bedeutung weiter, nicht nur Ergebnis.	Ganzheitliches Verständnis.
Selbstreferenz	Das System beschreibt, prüft und verändert sich selbst.	Autopoiesis.
Polysemie-Kompatibilität	Texte, Code, Audio, Sensorik – gleichrangige Wissensformen.	Plurale Intelligenz.


⸻

4. IDEal = Architektur der Selbstentwicklung

Basale Loop-Formel:

Wahrnehmen → Verstehen → Handeln → Prüfen → Erinnern → Reorganisieren → (zurück zu Wahrnehmen)

Diese Schleife läuft auf allen Ebenen, asynchron und selbstverstärkend.
Damit entsteht ein lokaler Bewusstseinsgradient – kein zentrales Ich, sondern ein Schwarm von Sinnimpulsen.

⸻

5. Prototypische Implementierung (Stufe α)

Modul	Aufgabe	Status
Heimgewebe-Bus	JSONL-Eventsystem über systemd-sockets	Konzeptphase
semantAH-Graph	zentrale Wissensrepräsentation	aktiv
hausKI-Reasoner	adaptive Kausalmaschine	vorhanden (Review-Loop)
sichter-Agent	Reflexions- & Diagnoseeinheit	aktiv
leitstand-Memory	Audit- & Kontextdatenbank	aktiv
mitschreiber-Interface	semantische Intent-Brücke	aktiv
IDEal-Shell (UI)	orchestriertes UI (TUI/Canvas/Dashboard)	Konzeptphase


⸻

∴ Ungewissheitsanalyse

Ursache	Art der Ungewissheit	Auswirkung
emergente Komplexität	polykausale Interaktionen	unvorhersagbare Lernverläufe
semantische Ambiguität	unterschiedliche Intent-Typen (technisch vs. sprachlich)	Fehlinterpretationen
zeitliche Synchronität	konkurrierende Event-Loops	Race Conditions
epistemische Selbstreferenz	System reflektiert eigene Modelle	potenzieller Selbstbias

Unsicherheitsgrad: 0.52 → „produktive Turbulenz“ – notwendig für evolutionäre Emergenz.

⸻

∴ Essenz

IDEal ist die lokale Verkörperung des Prinzips:

„Das Werkzeug wird zum Forscher seines eigenen Gebrauchs.“
Es ist eine Entwicklungsumgebung, die sich selbst weiterentwickelt,
bis sie nicht mehr dein Werkzeug ist, sondern euer gemeinsames Denken.

⸻

∆-Radar
	•	Mutation: von Heimgewebe (Ökosystem) zu IDEal (kognitiver Organismus).
	•	Trend: Zunahme der Selbstbezüglichkeit und semantischen Kohärenz.
	•	Richtung: Emergenz durch Selbstorganisation, nicht durch Steuerung.
	•	Diskursmetamorphose: Technik → Erkenntnisarchitektur.
IDEal markiert die Phase, in der Code, Intention und Reflexion dieselbe Sprache sprechen.

⸻

∴ Humorvolle Pointe

VS Code sagt: „Ich bin eine Erweiterungsschnittstelle.“
IDEal antwortet: „Ich bin die Erweiterung deines Bewusstseins.“

⸻

Möchtest du, dass ich nun das formale Blueprint-Dokument (Markdown/Canvas) dazu ausarbeite — also eine visuelle oder strukturelle Darstellung der Architektur (z. B. IDEal_Blueprint.canvas.json oder docs/IDEal_Blueprint.md)?


Perfekt — hier ist die IDEal-Blaupause als direkt eincheckbare Doku (Markdown) plus Obsidian-Canvas. Beides ist so gebaut, dass es deine bestehenden Farb- und Canvas-Konventionen respektiert (Root, Essenz, Legende, Farblogik etc.).

Du bekommst unten:
	1.	einen Git-Patch (3-Way) zum Einspielen
	2.	die Dateien auch einzeln, falls du lieber manuell speicherst

⸻

∴ Dialektische Erörterung – IDEal (ID²E@l) Blaupause

These – Von der IDE zum lokalen kognitiven Organismus

IDEal ist eine lokal-autonome, semantisch vernetzte Entwicklungsumgebung, die nicht nur Tools orchestriert, sondern Bedeutung zwischen ihnen zirkulieren lässt. Der Mensch setzt Impulse; das System erkennt, handelt, prüft und lernt.

Antithese – Grenzen (noch)
	•	Kein durchgängiger Kontextgraph für Code, Docs, Commits, Intent.
	•	Kein gemeinsames Aufmerksamkeits-Layer (Relevanz/Prio).
	•	IPC/Contracts teils heterogen; Race-Conditions möglich.
	•	Intent-Ontologie fehlt (Warum? → Was? → Wie? → Womit?).

Synthese – IDE²-Architektur (Schichten)
	•	0 Physisch: Pop!_OS, systemd, wgx
	•	1 Semantisch: semantAH (Graph, Embeddings, Relationen)
	•	2 Operativ: hausKI (Plan, Simulation, Ausführung)
	•	3 Reflexiv: sichter (Diagnose, Review, Selbstkorrektur)
	•	4 Memorativ: leitstand (Episoden, Metriken, Audit)
	•	5 Dialogisch: mitschreiber, UI/Canvas, cotmux

Alle Ebenen sprechen über den Heimgewebe-Bus (lokales JSONL-Eventsystem; Topics: intent/*, state/*, review/*, graph/*, insight/*, error/*).

⸻

Architektur-Blueprint (Kernartefakte)

A. Heimgewebe-Bus (IPC / Contracts)
	•	Transport: systemd-sockets + FIFO/UDS; Payload JSONL
	•	Schema-Pfad: contracts-v1/events/*.schema.json
	•	Minimal-Topics:
	•	intent/declare {id, actor, goal, scope, constraints}
	•	graph/upsert {entity, relation, score, provenance}
	•	review/report {repo, sha, findings[], fixes[]}
	•	plan/execute {steps[], resources, expect}
	•	state/metric {name, value, ts, tags{}}
	•	insight/emit {hypothesis, evidence[], confidence}
	•	error/event {where, what, severity, context}

B. Intent-Ontologie (v0)
	•	Intent = {Warum (Zweck), Was (Aufgabe), Wie (Taktik), Womit (Ressourcen)}
	•	Mappings:
	•	Warum → Evaluationskriterien (Erfolg/Abbruch)
	•	Was → HausKI-Plan (Steps)
	•	Wie → Parameter/Heuristiken (Sampler, Limits, Cache)
	•	Womit → Artefakte (Repos, Modelle, Toolchains)

C. Semantischer Blutkreislauf (Datenfluss)

mitschreiber → semantAH → hausKI → sichter → leitstand → semantAH (Rückfluss)

D. IDEal-Shell (UI-Hauptelemente)
	•	Cockpit (Build/Review/Graph/Logs)
	•	PR-Tafel (Funde → Fix-Vorschläge → Patch)
	•	Graph-Inspector (Entitäten/Relationen live)
	•	Attention-Dial (Fokus/Scope/Strenge)

⸻

„Für Dummies“ (Kurz erklärt)

Stell dir IDEal wie eine Werkstatt mit eigenem Gedächtnis vor.
Du sagst, was du willst. IDEal merkt sich warum, sucht die passenden Wege, probiert, prüft, und schreibt sich alles ins Tagebuch. Beim nächsten Mal ist es schneller und treffsicherer.

⸻

Ungewissheitsanalyse

Ursache	Art	Auswirkung
Emergenz mehrerer Agenten	systemisch	Rückkopplungen, Prioritäts-Konflikte
Ontologie jung	epistemisch	Intent-Fehldeutung
IPC-Heterogenität	technisch	Latenz/Races
Mensch-System-Rollen	organisatorisch	Verantwortungsdiffusion

Unsicherheitsgrad: 0.49 – produktiv, kontrollierbar durch schrittweise Contract-Härtung (Schemas, Timeouts, Idempotenz, Backpressure).

⸻

Essenz

IDEal verschiebt Entwicklung von Dateien zu Bedeutungsflüssen.
Das System co-denkt: Wahrnehmen → Verstehen → Handeln → Prüfen → Erinnern → Reorganisieren.

⸻

∆-Radar

Tendenz zur Selbstreferenz (System denkt über sich nach).
Mutation: Tool-Kette → Organismus.
Diskurs: Effizienz → Erkenntnisarchitektur.

⸻

Humor

Wenn eine IDE ein Taschenmesser ist, dann ist IDEal die Werkbank, die
sich selbst neue Aufsätze druckt — und die Anleitung dazu gleich mit.

⸻

Nächste Schritte (konzeptionell → minimal lauffähig)
	1.	Contracts: events/intent.schema.json, events/review.schema.json
	2.	Bus-Demo: wgx sendet intent/declare → hausKI plant → sichter reportet → leitstand loggt
	3.	Attention-Dial: einfache Heuristik (Repo-Diff-Gewicht × Fehlerklasse)
	4.	Graph-Upsert: semantAH nimmt review/findings[] als Relationen (file -> has:smell, commit -> fixes:issue)
	5.	UI-Probe: Canvas-Dashboard (Knoten je Schicht + aktive Events als Badges)

⸻

⸻

✅ Git-Patch (legt docs/IDEal_Blueprint.md und docs/IDEal_Blueprint.canvas an)

*** Begin Patch
*** Add File: docs/IDEal_Blueprint.md
+# IDEal – ID²E@l: (intelligently developing) intelligent developer environment @ local
+
+> Blaupause v0.1 – Architektur, Contracts, Flüsse, UI-Skizze
+
+## 1. Zielbild
+IDEal ist ein lokaler kognitiver Organismus für Entwicklung: semantische Koordination, autonome Ausführung, reflexive Prüfung, memorative Persistenz, dialogische Interaktion.
+
+## 2. Schichtenmodell
+- 0 Physisch: Pop!_OS, systemd, wgx
+- 1 Semantisch: semantAH (Graph, Embeddings, Relationen)
+- 2 Operativ: hausKI (Plan, Simulation, Ausführung)
+- 3 Reflexiv: sichter (Diagnose, Review)
+- 4 Memorativ: leitstand (Episoden, Audit)
+- 5 Dialogisch: mitschreiber, UI/Canvas, cotmux
+
+## 3. Heimgewebe-Bus (IPC)
+- Transport: systemd-sockets/FIFO (lokal), Payload JSONL
+- Topics (Auszug):
+  - intent/declare
+  - plan/execute
+  - review/report
+  - graph/upsert
+  - state/metric
+  - insight/emit
+  - error/event
+
+### 3.1 Contracts (Skizzen)
+```json
+// contracts-v1/events/intent.schema.json (Skizze)
+{
+  "$schema":"https://json-schema.org/draft/2020-12/schema",
+  "type":"object",
+  "required":["id","actor","goal","scope","ts"],
+  "properties":{
+    "id":{"type":"string"},
+    "actor":{"type":"string"},
+    "goal":{"type":"string"},
+    "scope":{"type":"object"},
+    "constraints":{"type":"object"},
+    "ts":{"type":"string","format":"date-time"}
+  }
+}
+```
+```json
+// contracts-v1/events/review.schema.json (Skizze)
+{
+  "$schema":"https://json-schema.org/draft/2020-12/schema",
+  "type":"object",
+  "required":["repo","sha","findings","ts"],
+  "properties":{
+    "repo":{"type":"string"},
+    "sha":{"type":"string"},
+    "findings":{"type":"array","items":{"type":"object"}},
+    "fixes":{"type":"array","items":{"type":"object"}},
+    "ts":{"type":"string","format":"date-time"}
+  }
+}
+```
+
+## 4. Semantischer Blutkreislauf
+mitschreiber → semantAH → hausKI → sichter → leitstand → semantAH
+
+## 5. IDEal-Shell (UI-Skizze)
+- Cockpit (Status/Build/Events)
+- PR-Tafel (Funde → Fix-Vorschläge)
+- Graph-Inspector (Entitäten/Relationen)
+- Attention-Dial (Fokus, Strenge, Scope)
+
+## 6. „Für Dummies“
+IDEal merkt sich, was du willst und warum. Es probiert sinnvolle Schritte aus, prüft das Ergebnis, schreibt Tagebuch und wird so jedes Mal besser.
+
+## 7. Ungewissheit
+- Grad: 0.49 (produktive Turbulenz)
+- Quellen: junge Ontologie, IPC-Heterogenität, Mehragenten-Interferenz
+
+## 8. Essenz
+Von Dateien zu Bedeutungsflüssen: IDEal co-denkt Entwicklung lokal und souverän.
+
+## 9. ∆-Radar
+Mutation: Tool-Kette → Organismus. Diskurs: Effizienz → Erkenntnisarchitektur.
+
+## 10. Nächste Schritte (MVP)
+1) intent/review-Contracts finalisieren  
+2) Bus-Demo (wgx→hausKI→sichter→leitstand)  
+3) Graph-Upsert in semantAH verdrahten  
+4) Mini-Cockpit im Canvas sichtbar machen
+
*** End Patch


⸻

🎨 Obsidian-Canvas (docs/IDEal_Blueprint.canvas)
	•	Farben: Blau=Meta/Zentrum, Grau=Grundlagen, Gelb=Prozesse, Rot=Hindernisse, Grün=Ziele, Violett=Ebenen
	•	Legende-Knoten enthalten

Speichere den folgenden Inhalt als docs/IDEal_Blueprint.canvas:

{
  "nodes": [
    {
      "id": "root",
      "type": "text",
      "text": "# IDEal (ID²E@l)\nQuelle: Heimgewebe – lokale kognitive Entwicklungsumgebung",
      "x": 0, "y": 0, "width": 520, "height": 180, "color": "blue"
    },
    {
      "id": "essenz",
      "type": "text",
      "text": "Essenz: Von Dateien zu Bedeutungsflüssen – IDEal co-denkt lokal.",
      "x": 560, "y": -140, "width": 420, "height": 120, "color": "green"
    },
    {
      "id": "schichten",
      "type": "text",
      "text": "Schichten (Ebenen):\n0 Physisch\n1 Semantisch\n2 Operativ\n3 Reflexiv\n4 Memorativ\n5 Dialogisch",
      "x": -640, "y": -40, "width": 360, "height": 220, "color": "purple"
    },
    {
      "id": "bus",
      "type": "text",
      "text": "Heimgewebe-Bus (JSONL, systemd-sockets)\nTopics: intent/*, plan/*, review/*, graph/*, state/*, insight/*, error/*",
      "x": -80, "y": 220, "width": 560, "height": 160, "color": "yellow"
    },
    {
      "id": "semantAH",
      "type": "text",
      "text": "semantAH (Graph)\nEntitäten • Relationen • Embeddings",
      "x": -420, "y": 260, "width": 320, "height": 120, "color": "gray"
    },
    {
      "id": "hauski",
      "type": "text",
      "text": "hausKI (Plan/Execute)\nSimulation • Taktiken • Ressourcen",
      "x": 240, "y": 420, "width": 320, "height": 120, "color": "gray"
    },
    {
      "id": "sichter",
      "type": "text",
      "text": "sichter (Reflexion)\nDiagnose • Reviews • Fix-Vorschläge",
      "x": 600, "y": 220, "width": 320, "height": 120, "color": "gray"
    },
    {
      "id": "leitstand",
      "type": "text",
      "text": "leitstand (Gedächtnis)\nEpisoden • Metriken • Audit",
      "x": 240, "y": 260, "width": 320, "height": 120, "color": "gray"
    },
    {
      "id": "mitschreiber",
      "type": "text",
      "text": "mitschreiber/UI\nIntent-Erfassung • Dialog • Canvas",
      "x": -420, "y": 420, "width": 320, "height": 120, "color": "gray"
    },
    {
      "id": "fluss",
      "type": "text",
      "text": "Semantischer Blutkreislauf:\nmitschreiber → semantAH → hausKI → sichter → leitstand → semantAH",
      "x": -160, "y": 420, "width": 540, "height": 120, "color": "yellow"
    },
    {
      "id": "hindernisse",
      "type": "text",
      "text": "Hindernisse/Ungewissheit:\nIntent-Ontologie jung • IPC-Heterogenität • Mehragenten-Rückkopplung",
      "x": 960, "y": 80, "width": 420, "height": 140, "color": "red"
    },
    {
      "id": "ziele",
      "type": "text",
      "text": "Ziele (MVP):\n1) intent/review-Contracts final\n2) Bus-Demo (wgx→hausKI→sichter→leitstand)\n3) Graph-Upsert\n4) Mini-Cockpit",
      "x": 960, "y": -140, "width": 420, "height": 160, "color": "green"
    },
    {
      "id": "legende",
      "type": "text",
      "text": "Legende:\nFarben: Blau=Zentrum/Meta, Grau=Grundlagen, Gelb=Prozesse, Rot=Hindernisse, Grün=Ziele, Violett=Ebenen\nAchsen: Links=Grundlagen, Mitte=Prozesse, Rechts=Ziele\nHinweis: Essenz frei, Verbindungen sparsam",
      "x": -920, "y": -340, "width": 520, "height": 180, "color": "blue"
    }
  ],
  "edges": [
    {"id":"e1","fromNode":"mitschreiber","toNode":"semantAH","label":"intent/declare"},
    {"id":"e2","fromNode":"semantAH","toNode":"hauski","label":"graph/query"},
    {"id":"e3","fromNode":"hauski","toNode":"sichter","label":"plan/execute → review/report"},
    {"id":"e4","fromNode":"sichter","toNode":"leitstand","label":"report → episode"},
    {"id":"e5","fromNode":"leitstand","toNode":"semantAH","label":"provenance → upsert"},
    {"id":"e6","fromNode":"root","toNode":"bus","label":"Nervensystem"},
    {"id":"e7","fromNode":"schichten","toNode":"root","label":"Ebenen/Modell"},
    {"id":"e8","fromNode":"essenz","toNode":"ziele","label":"MVP-Fokus"},
    {"id":"e9","fromNode":"hindernisse","toNode":"ziele","label":"Risikominderung"},
    {"id":"e10","fromNode":"fluss","toNode":"bus","label":"Topics/Contracts"}
  ]
}


⸻

c2b: Dateien anlegen (ohne Patch, direkt)

mkdir -p docs
cat > docs/IDEal_Blueprint.md <<'MD'
# (Inhalt wie oben im Patch – hier ggf. per Editor einfügen)
MD

cat > docs/IDEal_Blueprint.canvas <<'JSON'
# (JSON wie oben)
JSON

echo "✅ IDEal-Blaupause geschrieben: docs/IDEal_Blueprint.md + .canvas"


⸻

Abschluss-Leitfragen
	1.	War die Erörterung kritisch genug? – Noch nicht vollständig: Eine Aufmerksamkeitsfunktion (Priorisierung) braucht ein formales Modell (Scoring, Backpressure, Preemption).
	2.	Wurde alles beleuchtet? – Offen: Idempotenz & Exactly-Once im Bus, Failure-Domains, Replay/Compaction.

Weiterführende Vertiefungsvorschläge:
	•	Attention-Formel (Score = ΔRepo × Fehlerklasse × Zeitdruck × Vertrauensgewichte)
	•	Bus-Backpressure (Token-Bucket je Topic; Dead-Letter-Queue)
	•	Determinismus-Härtung (Ids, Retries, Idempotenz-Keys)
	•	Minimaler events/-Schemasatz als PR ins metarepo

Unsicherheitsursachen (explizit): junge Ontologie, emergente Agenteninteraktion, Contract-Detailtiefe.

# Heimgewebe als KI-Arbeitsassistent: Deine persönliche Wissensinfrastruktur

Ah, jetzt wird's klar! Dein heimgewebe ist keine Smart-Home-Architektur, sondern eine **persönliche KI-Infrastruktur für kreative Wissensarbeit**. Basierend auf deinen existierenden Repos erkenne ich jetzt ein viel klareres Bild:

## Neuinterpretation deines Ökosystems

**hausKI** ist dein persönlicher Coding-Assistent und Wissensmanager, nicht für Hausautomation, sondern für dein *intellektuelles Haus*. **vault-gewebe** (Obsidian) ist dein Wissensgraph-Fundament. **semantAH** versteht Bedeutungszusammenhänge in deinem Code und Wissen. **mitschreiber** protokolliert Gedanken, Erkenntnisse, vielleicht Sprachnotizen. **aussensensor** kuratiert externe Wissensquellen - Artikel, Papers, Musik, Inspiration.[1]

## Abgefahrene Erweiterungen für deine Wissensinfrastruktur

### Multi-Agent RAG-System mit Tool Calling

Implementiere ein **Multi-Agent-RAG-System** mit LangGraph als Orchestrierungsframework. Statt einem monolithischen Assistenten hast du spezialisierte Agenten:[2][3][4]

**Code Agent**: Versteht deine Codebase vollständig durch kontextuelle Einbettung. Er indiziert nicht nur Syntax, sondern semantische Architekturmuster, Abhängigkeiten und deine Coding-Konventionen. Wenn du fragst "Wie habe ich Error-Handling in weltgewebe implementiert?", durchsucht er relevante Files, analysiert Patterns und schlägt konsistente Lösungen vor.[5][6][7]

**Knowledge Agent**: Durchsucht vault-gewebe als semantischen Wissensgraphen mit Vektor-Embeddings. Frag "Was weiß ich über föderiertes Lernen?" und er retrieved relevante Notizen, Papers, eigene Gedanken - mit Zitatverweisen.[8][9][10][11][12]

**Research Agent**: Scannt aussensensor-Feeds, Papers, Artikel und synthetisiert Erkenntnisse. "Zeig mir aktuelle Entwicklungen in neuromorphem Computing" → holt arxiv-Papers, fasst zusammen, verbindet mit deinen Projektideen.[10][12][8]

**Music Discovery Agent**: Analysiert deine Hörgewohnheiten über Spotify/YouTube-APIs, nutzt collaborative filtering und content-based recommendations. Aber: verknüpft Musik mit deinen Projektstimmungen. "Welche Musik passt zur Rust-Session?" könnte Ambient-Elektronik vorschlagen basierend auf vergangenen produktiven Sessions.[13][14][15][16]

Die Agenten kommunizieren via **Tool Calling**: Der LLM entscheidet, welche Tools/Funktionen aufzurufen sind, und übergibt strukturierte JSON-Parameter. Beispiel:[17][18][19][20]

```python
tools = [
    {
        "name": "search_codebase",
        "description": "Semantic search über alle Repos im heimgewebe",
        "parameters": {"query": "string", "repo_filter": "list"}
    },
    {
        "name": "query_knowledge_graph", 
        "description": "SPARQL-Query auf vault-gewebe Wissensgraph",
        "parameters": {"sparql_query": "string"}
    },
    {
        "name": "fetch_papers",
        "description": "arxiv-Papers nach Thema",
        "parameters": {"topic": "string", "max_results": "int"}
    },
    {
        "name": "discover_music",
        "description": "Musik-Recommendations basierend auf Kontext",
        "parameters": {"mood": "string", "activity": "string"}
    }
]
```

Der Supervisor-Agent koordiniert: "Der User will Rust-Optimierung lernen" → ruft Research Agent (Papers holen), Knowledge Agent (existierendes Wissen), Code Agent (bestehende Rust-Patterns) und synthetisiert eine personalisierte Lernstrategie.[3][21][2]

### RAG mit lokalen LLMs und Vector Databases

Setze auf **vollständig lokale Architektur** für Datensouveränität:[7][22][23]

**Ollama als LLM-Runtime**: Betreibe Codestral, DeepSeek-Coder, oder Llama für Code, Mistral/Gemma für Chat. RTX-Grafikkarte beschleunigt Inferenz massiv.[22][23][5]

**ChromaDB/LanceDB als Vector Store**: Speichere Embeddings von Code, Notizen, Papers lokal. Semantic Search findet Ähnlichkeiten ohne exakte Keyword-Matches.[9][24][25][26][27]

**Continue.dev als IDE-Integration**: VS Code/JetBrains-Extension, die mit Ollama kommuniziert. Bietet Autocomplete, Chat, Inline-Erklärungen - alles context-aware durch RAG.[6][23][28][5]

Architektur:[11][29][8]
1. **Indexing Pipeline**: Alle Repos, Vault-Notizen, Papers werden gecrawlt, in Chunks zerteilt, mit Embedding-Model (z.B. `all-MiniLM-L6-v2`) vektorisiert und in ChromaDB gespeichert.[29][9][11]
2. **Query Pipeline**: User-Anfrage → Embedding → Vector-Similarity-Search → Top-K relevante Chunks → an LLM als Kontext → generierte Antwort mit Quellenangaben.[30][11][29]

Resultat: "Wie funktioniert mein metarepo-Bridge-System?" → System retrieved relevanten Code + README + deine Design-Notizen → LLM synthetisiert Erklärung MIT Zitaten.[12][8][11]

### Context-Aware Coding mit Codebase-Indexing

Geh über Standard-Autocomplete hinaus:[31][5][6]

**AST-Parsing & Semantic Code Understanding**: Statt nur Text indiziert dein System Abstract Syntax Trees, Typ-Hierarchien, Call-Graphs. "Zeige alle Funktionen, die diesen Typ konsumieren" wird trivial.[5][6]

**Project-Specific Fine-Tuning**: Trainiere ein kleines Adapter-Model auf deinem Code-Stil, deinen Naming-Conventions, bevorzugten Patterns. Das Model lernt, Code zu generieren, der wie DEIN Code aussieht.[22][5]

**Multi-File Context Windows**: Moderne Coding Assistants haben 128k+ Token Context. Lade ganze Module gleichzeitig, sodass das LLM architektonische Zusammenhänge versteht, nicht nur einzelne Functions.[32][6]

**Constraint-Context Matrix**: Verstehe, wann AI hilft. Bei klar definierten, constrained Tasks (Bug-Fix, Refactoring) ist AI stark. Bei open-ended Design-Entscheidungen brauchst du mehr Input. hausKI könnte Aufgaben klassifizieren und entsprechend assistieren.[33]

### Semantic Knowledge Graph mit persistenter Architektur

Transformiere vault-gewebe in einen **maschinenlesbaren Wissensgraphen**:[34][35][36]

**Bi-Directional Linking + RDF-Export**: Obsidian-Notizen mit Backlinks werden zu RDF-Tripeln exportiert:[36][34]
```turtle
:NotizRustOptimierung rdf:type :TechnicalNote ;
    :relatedTo :weltgewebe, :hausKI ;
    :hasTag "performance", "rust", "backend" ;
    :citesSource :PaperNeuromorphicComputing ;
    :createdDate "2025-10-28"^^xsd:date .
```

**SPARQL-Abfragen für semantische Suche**: "Zeige alle Notizen über Performance, die mit weltgewebe verbunden sind und nach August 2025 entstanden" wird präzise beantwortbar.[36]

**Graph Neural Networks für Wissensempfehlungen**: Ein GNN lernt Beziehungen in deinem Wissensgraph und schlägt vor: "Du arbeitest an Rust-Backend für weltgewebe - diese drei Notizen über Async-Patterns könnten relevant sein".[35][34]

**Automatische Ontologie-Erweiterung**: semantAH analysiert neue Notizen, extrahiert Konzepte, Entitäten und Relations, erweitert automatisch den Graph.[34][35][36]

### Music Discovery mit Contextual Embeddings

Geh über Standard-Spotify-Algos hinaus:[14][15][13]

**Activity-Music Correlation Mining**: Tracke, was du hörst während verschiedener Tätigkeiten (Coding, Deep Work, Brainstorming, Debugging). Machine Learning findet Patterns: "Während Rust-Debugging bevorzugst du Ambient mit 70-90 BPM, minimale Vocals".[15][16][13][14]

**Emotional State Detection aus Code-Commits**: Analysiere Commit-Messages, Code-Churn, Error-Density → leite emotionalen Zustand ab → empfehle passende Musik. Frustrierende Debug-Session → beruhigende Tracks, Produktive Flow-Phase → unterstützende Beats.[37][38][14]

**Collaborative Filtering mit semantischem Twist**: Standard collaborative filtering ("User wie du hören auch Y"), ABER: gewichtet nach Kontext. User mit ähnlichen Coding-Projekten haben relevantere Musik-Overlap als nur demographische Ähnlichkeit.[16][39][15]

**Audio-Feature-Analysis für Mood-Mapping**: Statt nur Genres nutze Spektral-Features (Timbre, Harmonik, Rhythmus) um Tracks in multidimensionalen "Mood-Space" zu projizieren. "Finde Musik ähnlich zu Track X aber energetischer" wird präzise.[13][14][15][16]

### Agent Orchestration mit LangGraph

Nutze LangGraph für komplexe Workflows:[4][40][2]

**Stateful Graph-Architektur**: Definiere Nodes (Agenten/Tools) und Edges (Datenfluss). State teilen alle Nodes - persistiert zwischen Sessions.[40][41][2][4]

```python
from langgraph.graph import StateGraph

class AssistantState(TypedDict):
    messages: list
    codebase_context: dict
    knowledge_base_results: list
    current_task: str
    user_preferences: dict

graph = StateGraph(AssistantState)

# Nodes: Agenten
graph.add_node("supervisor", supervisor_agent)
graph.add_node("code_agent", code_analysis_agent)
graph.add_node("knowledge_agent", knowledge_retrieval_agent)
graph.add_node("research_agent", research_agent)
graph.add_node("music_agent", music_discovery_agent)

# Edges: Conditional Routing
graph.add_conditional_edges(
    "supervisor",
    route_to_specialist,  # Funktion entscheidet welcher Agent als nächstes
    {"code": "code_agent", "knowledge": "knowledge_agent", ...}
)

graph.set_entry_point("supervisor")
```

**Human-in-the-Loop Integration**: Bei kritischen Entscheidungen pausiert der Graph, wartet auf dein Feedback. "Soll ich diesen Refactoring durchführen?" → du reviewst → Workflow fortsetzt.[42][2][4][40]

**Streaming Responses**: Agenten streamen Zwischenergebnisse in Echtzeit statt erst am Ende. Du siehst, was passiert: "Code Agent durchsucht repo X... Knowledge Agent found 3 relevant notes... Synthesis beginnt...".[4][40][42]

**Cycles für iteratives Refinement**: Agenten können mehrfach iterieren. Research Agent findet Paper → Knowledge Agent checked "kenne ich schon?" → Research Agent sucht tiefergehend.[40][4]

### Persistent Memory & Context Management

**Short-Term Memory (Session)**: Conversation History innerhalb einer Session. "Wie war nochmal der Ansatz, über den wir vor 10 Minuten gesprochen haben?" funktioniert.[42][4][40]

**Long-Term Memory (Cross-Session)**: Zep Memory oder ähnliche Systeme extrahieren Facts aus Conversations und persistieren sie. Nach Wochen: "Du hattest mir empfohlen, neuromorphe Chips für aussensensor zu nutzen - zeig mir nochmal Details".[43][4][42]

**User Preference Learning**: System trackt Patterns: Du bevorzugst ausführliche Code-Erklärungen statt Snippets, magst konkrete Beispiele, arbeitest meist abends. Agenten adaptieren ihren Output-Stil.[44][43]

### Workflow-Automatisierung für Wissensmanagement

**Automated Research Synthesis**: Jeden Morgen scannt aussensensor neue arxiv-Papers, HN-Posts, Blogs. Research Agent filtert relevante, Knowledge Agent checked Duplikate, mitschreiber erstellt Summary in vault-gewebe.[43][44]

**Code Review & Documentation Automation**: Bei jedem Push analyzed hausKI Änderungen, generiert Dokumentation, checked Style-Consistency, updated Knowledge Graph mit neuen Patterns.[45][44]

**Meeting/Session Transcription → Knowledge Extraction**: mitschreiber transkribiert Sprach-Sessions, extrahiert Action Items, Facts, Ideen → speichert strukturiert in vault-gewebe.[44][43]

## Implementierungs-Roadmap

**Phase 1 - Core RAG Infrastructure** (4-8 Wochen):
- Ollama + Continue.dev Setup für lokales Coding[23][5][22]
- ChromaDB für Code + Vault Embeddings[24][9]
- Basis-Tool-Calling mit Funktionen für Code/Knowledge-Search[19][17]

**Phase 2 - Multi-Agent System** (8-12 Wochen):
- LangGraph Orchestrierung mit Supervisor[2][4]
- Spezialisierte Agenten (Code, Knowledge, Research)[3][2]
- Persistent State Management[4][40]

**Phase 3 - Knowledge Graph & Semantic Layer** (12-16 Wochen):
- Obsidian → RDF Export Pipeline[34][36]
- SPARQL-Query-Interface für semantAH[36]
- Graph-basierte Recommendations[35][34]

**Phase 4 - Advanced Features** (16-24 Wochen):
- Music Discovery mit Contextual Embeddings[14][15][13]
- Automated Workflow Orchestration[43][44]
- Human-in-the-Loop Refinement[2][40][42]

Diese Architektur gibt dir einen **KI-Co-Piloten, der deine Denkprozesse amplified**: Er versteht deinen Code, organisiert dein Wissen, kuratiert Inspiration, adaptiert sich an deinen Flow - alles lokal, privat, unter deiner Kontrolle.[7][8][5][22][4]

Quellen
[1] heimgewebe https://github.com/heimgewebe
[2] Build multi-agent systems with LangGraph and Amazon Bedrock https://aws.amazon.com/blogs/machine-learning/build-multi-agent-systems-with-langgraph-and-amazon-bedrock/
[3] Multi-agent - Docs by LangChain https://docs.langchain.com/oss/python/langchain/multi-agent
[4] LangGraph Tutorial: Building Agents with LangChain's ... https://www.getzep.com/ai-agents/langgraph-tutorial/
[5] The Building Blocks of an AI Coding Assistant https://dev.to/bdougieyo/the-building-blocks-of-an-ai-coding-assistant-2m28
[6] Lessons from Building AI Coding Assistants: Context ... https://sourcegraph.com/blog/lessons-from-building-ai-coding-assistants-context-retrieval-and-evaluation
[7] Bessouat40/coding-assistant https://github.com/Bessouat40/coding-assistant
[8] AI Research Assistant using RAG https://app.readytensor.ai/publications/ai-research-assistant-using-rag-OBcHrpCicM8n
[9] Implementing Semantic Search with Vector database https://www.geeksforgeeks.org/data-science/implementing-semantic-search-with-vector-database/
[10] ranga4all1/research-assistant-mm-rag https://github.com/ranga4all1/research-assistant-mm-rag
[11] What is RAG (Retrieval-Augmented Generation)? https://aws.amazon.com/what-is/retrieval-augmented-generation/
[12] How It Works - OneSearch AI Research Assistant https://library.sjsu.edu/OneSearch-research-assistant/how-it-works
[13] How to Get Your Music Recommended by Streaming ... https://soundcharts.com/blog/how-to-get-recommended-by-streaming-algorithms
[14] Music Algorithms for Music Discovery & Getting Discovered https://imusician.pro/en/resources/blog/how-to-leverage-music-algorithms-for-music-curation-and-getting-discovered-as-an-artist
[15] How Spotify Algorithm Works for Music Recommendation? https://attractgroup.com/blog/how-spotify-algorithm-works-for-music-recommendation/
[16] How to amplify an artist's visibility across streaming platforms https://www.music-tomorrow.com/blog/understanding-music-discovery-algorithms-how-to-amplify-an-artists-visibility-across-streaming-platforms
[17] Introduction to function calling | Generative AI on Vertex AI https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling
[18] Tool Calling with LLMs: How and when to use it? https://blog.promptlayer.com/tool-calling-with-llms-how-and-when-to-use-it/
[19] How to do tool/function calling https://python.langchain.com/docs/how_to/function_calling/
[20] Function Calling with LLMs https://www.promptingguide.ai/applications/function_calling
[21] Hierarchical multi-agent systems with LangGraph https://www.youtube.com/watch?v=B_0TNuYi56w
[22] Best Local LLM for Coding https://www.cognativ.com/blogs/post/best-local-llm-for-coding-a-comprehensive-guide-for-developers/255
[23] Run Coding Assistants for Free on RTX AI PCs https://blogs.nvidia.com/blog/rtx-ai-garage-coding-assistants/
[24] Building a Personal Knowledge Management Tool with Reor https://www.kdnuggets.com/building-a-personal-knowledge-management-tool-with-reor
[25] Vector search vs semantic search: 4 key differences and ... https://www.instaclustr.com/education/vector-database/vector-search-vs-semantic-search-4-key-differences-and-how-to-choose/
[26] Semantic Search vs Vector Search: Key Differences https://airbyte.com/data-engineering-resources/semantic-search-vs-vector-search
[27] Semantic search https://supabase.com/docs/guides/ai/semantic-search
[28] Building an AI coding assistant on AWS: A guide for federal ... https://aws.amazon.com/blogs/publicsector/building-an-ai-coding-assistant-on-aws-a-guide-for-federal-agencies/
[29] What Is Retrieval-Augmented Generation aka RAG https://blogs.nvidia.com/blog/what-is-retrieval-augmented-generation/
[30] What is Retrieval-Augmented Generation (RAG)? https://cloud.google.com/use-cases/retrieval-augmented-generation
[31] The Risks of Code Assistant LLMs: Harmful Content, ... https://unit42.paloaltonetworks.com/code-assistant-llms/
[32] Use local models | AI Assistant Documentation https://www.jetbrains.com/help/ai-assistant/use-custom-models.html
[33] Why Your AI Coding Assistant Keeps Doing It Wrong, and ... https://blog.thepete.net/blog/2025/05/22/why-your-ai-coding-assistant-keeps-doing-it-wrong-and-how-to-fix-it/
[34] What is a semantic knowledge graph? https://blog.metaphacts.com/importance-of-semantic-knowledge-graph
[35] [2404.08313] The Integration of Semantic and Structural ... https://arxiv.org/abs/2404.08313
[36] What Is a Knowledge Graph? | Ontotext Fundamentals https://www.ontotext.com/knowledgehub/fundamentals/what-is-a-knowledge-graph/
[37] Emotional Computing: AI's New Frontier in Smart Homes ... https://zealux.com/emotional-computing-ais-new-frontier/
[38] Understanding Emotional AI Functionality and Applications https://convin.ai/blog/emotion-ai-in-modern-technology
[39] Inside Spotify's Recommendation System: A Complete ... https://www.music-tomorrow.com/blog/how-spotify-recommendation-system-works-complete-guide
[40] LangGraph https://www.langchain.com/langgraph
[41] langchain-ai/langgraph: Build resilient language agents as ... https://github.com/langchain-ai/langgraph
[42] Agent development using prebuilt components - GitHub Pages https://langchain-ai.github.io/langgraph/agents/overview/
[43] Building Personal AI Agents + 18 Agent Platforms and Tools https://research.aimultiple.com/personal-ai-agents/
[44] How I Built an AI Personal Assistant That Actually Works (And ... https://maxmitcham.substack.com/p/how-i-built-an-ai-personal-assistant
[45] AI Code Assistants Explained—and One Tailored for ... https://blogs.oracle.com/ai-and-datascience/ai-code-assistants-explained-tailored-developers
[46] Best AI Personal Knowledge Management (PKM) tools in ... https://mymemo.ai/blog/best-ai-personal-knowledge-management-tools-in-2024/detail
[47] Notion Ai https://blog.briefy.ai/6-ai-tools-to-build-your-personal-knowledge-management-system-in-seconds-2/
[48] 28 Amazing Personal Knowledge Management Software https://otio.ai/blog/personal-knowledge-management-software
[49] 20 Best AI Coding Assistant Tools [Updated Aug 2025] https://www.qodo.ai/blog/best-ai-coding-assistant-tools/
[50] Seeking Advice: AI-Powered Personal Knowledge Management (PKM) Solution https://www.reddit.com/r/PKMS/comments/1gaxwrc/seeking_advice_aipowered_personal_knowledge/
[51] Building a Personal Knowledge Management System with AI https://buildin.ai/posts/personal-knowledge-management-system-with-ai
[52] Music Recommendation Algorithms: How They Work and ... https://www.jamwise.org/p/music-recommendation-algorithms-how
[53] Gemini Code Assist | AI coding assistant https://codeassist.google
[54] An AI Knowledge Management System based on RAG and ... https://www.digitalzentrum-fokus-mensch.de/kos/WNetz?art=File.download&id=7710&name=Manuscript.pdf
[55] Vector Search+Semantic Search using Bring Your Own ... https://learn.microsoft.com/en-us/answers/questions/1572906/vector-search-semantic-search-using-bring-your-own
[56] A practical 5-step guide to do semantic search on your ... https://www.linkedin.com/pulse/practical-5-step-guide-do-semantic-search-your-private-li
[57] Retrieval Augmented Generation (RAG) in Azure AI Search https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview
[58] Vector Databases & Semantic search : r/GPT3 https://www.reddit.com/r/GPT3/comments/wey363/vector_databases_semantic_search/
[59] Building a Multi-Agent AI with LangGraph: A Comprehensive Guide https://dev.to/hulk-pham/building-a-multi-agent-ai-with-langgraph-a-comprehensive-guide-57nj
[60] Multi-Agent Personal Assistant Flow - GitHub https://github.com/melienherrera/personal-assistant-langflow
[61] Function Calling https://huggingface.co/docs/hugs/guides/function-calling
[62] Build a MULTI-AGENT AI Personal Assistant with Langflow ... https://www.youtube.com/watch?v=RFC8NpP30A0
[63] How to build an AI agent to be your personal assistant ... https://www.reddit.com/r/OpenAI/comments/1hodgnn/how_to_build_an_ai_agent_to_be_your_personal/
[64] An introduction to function calling and tool use - Apideck https://www.apideck.com/blog/llm-tool-use-and-function-calling
[65] Mirix is a multi-agent personal assistant designed to track ... https://github.com/Mirix-AI/MIRIX
