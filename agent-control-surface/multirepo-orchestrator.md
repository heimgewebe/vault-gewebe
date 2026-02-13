Architekturplan: Agentengesteuerter Multirepo-Orchestrator für Heimgewebe/ACS

Überblick und Zielsetzung

Abbildung: Grobarchitektur des agentengesteuerten Orchestrators im ACS.
Der agentengesteuerte Multirepo-Orchestrator dient im Heimgewebe-Projekt als zentrale Steuer- und Wartungseinheit für zahlreiche Git-Repositories. Er wird als Erweiterungsmodul in die Agent Control Surface (ACS) eingebettet. Ziel ist es, Informationsflüsse und Interdependenzen zwischen den „Organen“ (Subsystemen) und 20+ Code-Repositories dynamisch zu überwachen, zu orchestrieren und bei Bedarf automatisiert zu transformieren. Mit Hilfe von KI-gestützten Agenten soll der Orchestrator Entwickler-Eingaben (Prompts) in Codeänderungen, Pull Requests (PRs) und Refaktorierungen umsetzen können. Die Nutzung erfolgt sowohl lokal (auf dem Heimserver unter Pop!_OS) als auch remote (z.B. vom iPad via SSH-Tunnel), ohne direkten Netzwerks-Zugriff von außen (ACS bleibt an 127.0.0.1:8099 gebunden, Zugang nur getunnelt, siehe Runbook).

Kernidee: Eine zentrale Orchestrator-Komponente (Meta-Agent) nimmt Steuerbefehle oder Auslöser entgegen, zerlegt komplexe Aufgaben in Teilaufgaben und delegiert diese an spezialisierte Repo-Agenten pro Repository bzw. Organ-Agenten pro Subsystem. Diese Agenten nutzen intern das GitHub Copilot SDK im technischen Preview (bevorzugt in Python) als KI-Engine, um Code kontextbezogen zu verstehen und Änderungen vorzunehmen (Prompt-to-Code, Multi-File-Edits) sowie automatisiert Commits und PRs zu erstellen. Der Orchestrator behält dabei die Kontrolle: Er synchronisiert Repositories, bewertet Eingriffe (z.B. führt Tests aus) und gewährleistet Sicherheit (z.B. maskiert Tokens, Sandbox für gefährliche Aktionen). Letztlich entsteht ein hierarchisches Agentensystem mit einer zentralen Koordination („Supervisor“-Pattern) ￼, das die Entwicklungsarbeit beschleunigt und konsistente, aktuelle Softwarestände über alle Heimgewebe-Komponenten hinweg sicherstellt.

Agentenlandschaft: Struktur und Rollen

Die Architektur folgt einem hierarchischen Multi-Agenten-Ansatz in Analogie zu einem Organismus. Jeder Agent hat einen klar abgegrenzten Zuständigkeitsbereich, wobei ein Meta-Agent (Orchestrator) die oberste Kontrollinstanz bildet ￼. Die folgende Tabelle zeigt die Agentenzuordnung und deren Aufgaben:

Agententyp	Zuständig für	Hauptaufgaben und Funktionen
Meta-Agent (Orchestrator)	Gesamtsystem (alle Organe & Repos)	- Zentraler Supervisor, der alle Agenten koordiniert ￼.- Entgegennahme von Benutzeranfragen (Prompts) und System-Ereignissen.- Aufteilung komplexer Aufgaben in Teilaufgaben; Routing an passende Unter-Agenten.- Überwachung des Fortschritts, Validierung der Ergebnisse (Qualitätssicherung) und Zusammensetzen der Endergebnisse.
Organ-Agent (optional)	Ein „Organ“ = Gruppe verwandter Repos/Komponenten	- Domänenspezifischer Koordinator für ein Subsystem (z.B. Fleet-Motorik).- Kennt die Interaktionen und Abhängigkeiten innerhalb des Organs (z.B. Frontend/Backend innerhalb einer Domäne).- Bündelt bei bereichsübergreifenden Features die Aufgaben mehrerer Repo-Agenten und stellt konsistente Änderungen im ganzen Organ sicher.
Repo-Agent	Einzelnes Repository (Codebasis)	- Spezialist für Repository-spezifische Aufgaben (Code ändern, Abhängigkeiten in diesem Repo managen).- Hält lokalen Klon des Repos synchron und analysiert Quellcode-Struktur.- Nutzt Copilot-KI, um aus Prompts konkrete Code-Edits, Refaktorierungen oder neue Module in diesem Repo zu generieren.- Erstellt Commits und eröffnet Pull Requests für Änderungen in seinem Repo.

Hinweis: In der initialen Umsetzung können Organ-Agenten optional sein – der Orchestrator kann auch direkt mehrere Repo-Agenten orchestrieren. Mit zunehmender Komplexität des Systems können Organ-Agenten eingeführt werden, um thematisch zusammengehörige Repositories gemeinsam zu behandeln (ähnlich einer Teamleitung für ein Organ). Beispielsweise könnten Repos fleet-motorik/wgx und fleet-contracts durch einen gemeinsamen Fleet-Organ-Agenten koordiniert werden, da Änderungen in einem oft das andere beeinflussen.

Alle Agenten zusammen bilden die Agentenlandschaft. Sie kommunizieren hierarchisch: Der Orchestrator delegiert und sammelt Ergebnisse, während Repo-Agenten eigenständig die Detailarbeit in ihrem Bereich erledigen. Dieses Supervisor-Pattern stellt sicher, dass komplexe, multidisziplinäre Aufgaben in beherrschbare Teilschritte zerlegt werden und spezialisierte KI-Agenten fokussiert arbeiten können – ähnlich einer zentralen Leitstelle, die Fachabteilungen beauftragt ￼. So lassen sich Skalierbarkeit, Testbarkeit und Wartbarkeit erhöhen ￼ ￼, da jeder Agent einzeln verbessert oder ausgetauscht werden kann, ohne das ganze System neu zu designen.

Schnittstellen: ACS-Frontend ↔ Agenten-Backend

Das ACS-Frontend (Panel) und das Agenten-Backend kommunizieren über klar definierte API-Schnittstellen. Die ACS-Panel-App (vermutlich eine Flask- oder FastAPI-basierte Webapp in panel/app.py) präsentiert dem Benutzer eine Oberfläche, über die er z.B. Prompts eingeben oder den Status von Agentenaktionen einsehen kann. Das Backend umfasst den Orchestrator und die Agenten-Module, die als Teil des ACS-Servers (Prozess unter systemd) laufen. Die Trennung in Frontend und Backend gewährleistet, dass die KI-Logik und Systemeingriffe kontrolliert über definierte Endpunkte erfolgen.

Wichtige API-Endpunkte könnten wie folgt aussehen:

Endpoint	Methode	Beschreibung
/api/health	GET	Health-Check des ACS (bereits vorhanden, bestätigt laufenden Dienst ￼).
/api/repos	GET	Liefert Liste der verwalteten Repositories/Organe und ihren Status (z.B. Sync-Stand, laufende Agentenjobs).
/api/agent/task	POST	Startet eine neue Agenten-Aufgabe basierend auf Nutzereingabe. Erwartet z.B. JSON {prompt: "...", target: "RepoName oder OrganName"}. Der Orchestrator parse den Prompt, ordnet ihn einem Ziel (Repo-Agenten oder Organ-Agenten) zu und startet die Bearbeitung. Gibt eine Task-ID zurück.
/api/agent/task/<id>/status	GET	Abfrage des Status einer laufenden Aufgabe (Progress, Teil-Ergebnisse). Erlaubt dem Frontend, z.B. eine Ladespinner anzuzeigen oder Zwischenberichte auszugeben. Optional könnten WebSockets oder Server-Sent Events für Push-Updates genutzt werden, um den Fortschritt in Echtzeit zu melden.
/api/agent/task/<id>/result	GET	Holt das Ergebnis einer abgeschlossenen Aufgabe: z.B. Details zum erstellten PR (Link, Diff-Statistik) oder eine Fehlermeldung, falls die Agentenaktion nicht erfolgreich war.
/api/agents (optional)	GET	Übersicht aller Agenten und ihrer aktuellen Aktivitäten (Meta-Agent-Sicht, z.B. welcher Repo-Agent gerade arbeitet, Leerlauf etc.). Kann für Monitoring im Frontend dienen.

Die Kommunikation läuft typischerweise über HTTP(S) JSON-APIs innerhalb des ACS (an Port 8099 über den SSH-Tunnel erreichbar). Das Frontend Panel sendet bei einer Benutzeraktion (z.B. Klick auf “Prompt absenden”) einen entsprechenden API-Aufruf an das Backend. Der Orchestrator verarbeitet die Anfrage, orchestriert die Agenten und speichert den Task-Status (z.B. in Memory oder in einer kleinen SQLite-DB im ACS). Das Frontend pollt periodisch oder empfängt via Websocket den Fortgang und aktualisiert die UI (z.B. eine Log-Ansicht der Agentenschritte).

ACS-Integration: Da ACS primär als lokaler Dienst läuft und per SSH-Tunnel bedient wird, müssen diese Schnittstellen keine Authentifizierung für den UI-Nutzer voraussetzen – der Zugriff ist ja bereits durch den Tunnel geschützt. Intern kann der Orchestrator jedoch Auth für externe Dienste (GitHub API etc.) managen. Wichtig ist, dass bestehende Invarianten aus dem ACS-Runbook erhalten bleiben ￼: ACS lauscht nur auf localhost, Start und Update sind getrennt (d.h. z.B. ein /api/update könnte bewusst nicht angeboten werden, um Updates kontrolliert via acs-up Skript durchzuführen).

Durch diese saubere Schnittstellentrennung bleibt das Frontend schlank (nur Darstellung und Eingabe) und die Logik konzentriert sich im Backend. Bei Weiterentwicklungen (z.B. alternative UI oder CLI-Zugriff) kann man einfach andere Frontends an die gleichen APIs anbinden, ohne die Kernlogik zu duplizieren.

Einbettung des GitHub Copilot SDK (Prompt-Verarbeitung & PR-Automatisierung)

Der technische Kern der Agentenintelligenz ist das GitHub Copilot SDK (Python-Version) im Zusammenspiel mit dem Copilot-CLI-Server. Dieses SDK – seit Januar 2026 im Technical Preview verfügbar – ermöglicht es, den gleichen agentischen Kern von GitHub Copilot programmgesteuert in eigene Anwendungen einzubetten ￼. Für unser Orchestrator-Backend bedeutet das: Wir müssen keinen eigenen KI-Loop von Grund auf implementieren, sondern nutzen Copilots erprobten Agentik-Engine. Das SDK übernimmt Planung, Tool-Aufrufe, Dateiedits usw. automatisch im Hintergrund ￼, sobald wir dem Agenten einen Prompt und die verfügbaren Tools zur Verfügung stellen.

Integration in ACS: Der Orchestrator startet beim Init (z.B. während scripts/acs-run unter systemd) einen Copilot-CLI-Server im Hintergrund und verbindet sich via JSON-RPC darauf ￼. Das SDK-Clientobjekt managed den Lebenszyklus dieses Prozesses automatisch ￼. In Python könnte dies so aussehen (Pseudo-Code):

from github_copilot_sdk import CopilotClient
client = CopilotClient()  
client.start()  # Startet Copilot CLI im Server-Mode
session = client.create_session(model="gpt-4")  # oder gpt-5, je nach Verfügbarkeit
response = session.send(prompt_text)

Anstatt direkt nur Completion zu erhalten, ermöglicht die Copilot Coding Agent-Session komplexere Interaktionen: Der Agent kann Tools benutzen, z.B. auf das Dateisystem zugreifen, Terminal-Befehle ausführen oder Web-Requests schicken – ähnlich wie es der Copilot CLI in der Shell tut ￼. Damit lassen sich genau die gewünschten Fähigkeiten umsetzen: Multi-File-Refactoring, Code-Generierung, Testausführung und Git-Operationen. Der Standardmodus des SDK erlaubt alle First-Party-Tools (equivalent zu --allow-all im CLI) ￼. Somit kann der Agent bspw.:
	•	Code verstehen: Dateien öffnen und lesen (per Dateisystem-Zugriff) – so kann er vorhandenen Code analysieren, um konsistente Änderungen vorzunehmen.
	•	Änderungen vornehmen: Dateien editieren oder neu anlegen. Der Copilot-Planer erzeugt bei entsprechendem Prompt nötigen Code und schreibt ihn an die richtigen Stellen.
	•	Befehle ausführen: Z.B. Build- oder Test-Befehle laufen lassen, um die Änderung zu validieren (Tool-Aufruf via CLI-Sandbox).
	•	Git-Operationen durchführen: Commits erstellen, Branches anlegen, git push ausführen und sogar Pull Requests über die GitHub CLI oder API eröffnen.

Gerade letzteres – die automatisierte PR-Erstellung – ist ein zentrales Feature. Copilot kann auf Anweisung einen Pull Request öffnen und z.B. den Benutzer als Reviewer zuweisen ￼ ￼. Diese Funktion ist in Copilot’s Ökosystem vorgesehen und kann via CLI/Agents-API genutzt werden. Alternativ kann der Orchestrator auch eigenständig die PR-Erstellung übernehmen (z.B. mittels PyGitHub oder direktem API-Call), nachdem der KI-Agent die Änderungen committet hat. In jedem Fall wird ein PR erstellt, sodass menschliche Entwickler die Kontrolle behalten – sie können den PR vor dem Merge prüfen.

Beispiel Nutzung: Angenommen, der Nutzer gibt den Prompt „Refaktoriere den auth Service gemäß dem neuen Logging-Standard“ für ein bestimmtes Repository ein. Der Repo-Agent lädt relevante Dateien (alle Module des Auth-Service) und füttert den Copilot-Agenten damit als Kontext (ggf. mit Spaces/Attachments￼ oder als konsolidierten Prompt). Der Copilot-Agent plant die Änderungen und führt sie Schritt für Schritt aus – z.B. passt Logging-Aufrufe in mehreren Dateien an. Diese agentische Ausführungsschleife ist durch das SDK bereits robust implementiert ￼, sodass der Agent ggf. auch Zwischenfeedback einholen könnte. Sobald die Änderungen fertig sind und Tests grün laufen, führt der Agent via Git-Tool einen Commit und git push auf einen neuen Branch aus, und löst dann einen PR-Erstellungs-Befehl aus (entweder via CLI oder über den Orchestrator). Der PR landet im Repository und wird an den ACS-Nutzer zur Review gemeldet. Diese Automatisierung entlastet Entwickler von Routinearbeiten und erlaubt es, mittels natürlicher Sprache komplexe Codeänderungen über mehrere Dateien hinweg anzustoßen.

Technologie-Stack: Für die Umsetzung benötigt der Heimserver Zugriff auf Copilot. Entweder läuft ein GitHub Copilot Abo unter dem Account, der den CLI-Server betreibt (erforderlich für volle Funktionalität ￼), oder es wird ein eigener API-Schlüssel via BYOK (Bring Your Own Key) genutzt ￼ – z.B. ein OpenAI-Key, um GPT-4 direkt anzusprechen. In jedem Fall muss das Copilot CLI installiert sein ￼ (als Abhängigkeit vermutlich ins ACS-Installationsskript aufzunehmen). Das ACS-Update-Skript (acs-up) sollte sicherstellen, dass github-copilot-sdk via pip installiert/aktualisiert wird und die entsprechenden CLI-Binaries verfügbar sind. Dann kann der Orchestrator zur Laufzeit auf das SDK zugreifen. Die Agentensitzungen sollten zudem modellübergreifend konfigurierbar sein – z.B. primär GPT-4 für Standardaufgaben, aber ggf. auf GPT-3.5 für schnelle einfache Edits wechseln, oder spezialisiertes Modell nutzen, falls verfügbar. Das alles lässt sich im SDK-Session-Aufruf steuern.

Zusammengefasst bringt die Copilot-Integration folgende Vorteile: Wir erhalten ein produktionserprobtes agentisches Ausführungs-Framework, das komplexe Prompt-zu-Code Workflows beherrscht, inklusive Planung, Tool-Usage und Echtzeit-Streaming der Ergebnisse ￼. Dadurch können wir uns im Orchestrator auf die Domänenlogik konzentrieren (Welche Repos sind betroffen? Welche Constraints gelten? Wann ist ein PR sinnvoll?), während Copilot die Low-Level-Umsetzung übernimmt.

Integration in die bestehende ACS-Infrastruktur

Der Orchestrator muss nahtlos in den existierenden ACS-Betrieb eingebunden werden, ohne die stabilen Betriebsabläufe (Runbook) zu stören. Folgende Aspekte sind zu beachten:
	•	Prozess & Service: ACS läuft als systemd user service (agent-control-surface.service), gestartet über scripts/acs-run ￼. Der Orchestrator wird innerhalb dieses Prozesses initialisiert. D.h. acs-run lädt das Orchestrator-Modul (z.B. via Import oder als Teil der Panel-App-Startup). So bleibt es ein einzelner Dienst. Die Invarianten bleiben erfüllt ￼: Der ACS-Service lauscht weiterhin nur auf localhost:8099 und wird via Tunnel bedient ￼. Wichtig: Da der Orchestrator evtl. zusätzliche Dependencies hat (Copilot SDK, evtl. GitPython etc.), darf acs-run selbst keine Installation versuchen (Kontrast Start ≠ Update ￼). Daher muss acs-up (Update-Skript) so angepasst werden, dass es alle neuen Abhängigkeiten installiert (pip install -r requirements.txt) bevor der Dienst neu gestartet wird ￼. So bleibt Start deterministisch und frei von Netz-Zugriff.
	•	Panel-App Erweiterung: Die Web-UI (Panel) muss um Steuerelemente für den Orchestrator ergänzt werden. Wahrscheinlich wird es neue Seiten oder Sektionen geben, z.B.:
	•	Eine Übersichtsseite mit Liste aller Repositories und ihrem Status (synchron, divergend, laufende PRs, etc.).
	•	Ein Prompt-Eingabeformular pro Repository/Organ, wo der Nutzer natürliche Sprache eingibt, was getan werden soll (ähnlich einem Chat-Eingabefeld mit Senden-Button).
	•	Eine Historie/Log-Anzeige für ausgeführte Agentenaktionen: Was hat der Agent vorgeschlagen/getan? PR-Links, Diff-Vorschau, Fehlermeldungen, etc.
	•	Ggf. Konfigurationsansichten (z.B. API-Key Verwaltung für Copilot, Schwellenwerte für Auto-Interventionen).
Diese UI-Elemente greifen auf die genannten /api/... Endpunkte zu. Das Panel-Backend (panel/app.py) erhält entsprechende Routen-Handler, die an den Orchestrator weiterdelegieren. Z.B. ein POST /api/agent/task ruft intern orchestrator.start_task(prompt, target) auf. Die Panel-UI könnte mit modernem Frontend-Framework (React, Svelte o.ä.) oder simplem jQuery/Alpine (je nach Projektstandard) umgesetzt sein – wichtig ist, dass sie asynchron die Ergebnisse nachlädt und einen flüssigen UX bietet, da Agentenaktionen auch mal 30+ Sekunden dauern könnten.
	•	Datenhaltung & Zustand: Der Orchestrator-Teil der Backend-App sollte evtl. einen Zustandsspeicher haben, um Aufgaben und Repository-Infos zu verwalten. Für den Anfang reicht evtl. eine In-Memory-Struktur (Python-Dictionary), aber für Persistenz über Neustarts hinweg (und bessere Debugbarkeit) könnte eine kleine SQLite oder ein JSON-File-Store genutzt werden. Darin kann z.B. hinterlegt sein, wann welches Repo zuletzt gepullt wurde, welche Branches/PRs offen sind, oder ein Cache von Code-Analysen pro Repo.
	•	Script-Integration: Neue Hilfsskripte könnten das ACS-Ökosystem ergänzen, z.B. scripts/acs-orchestrator-test um einen Selbsttest der Agenten durchzuführen, oder ein adaptiertes acs-install falls zusätzliche Systemdienste nötig wären (wobei hier nicht geplant – alles läuft im einen Dienst). Denkbar wäre ein acs-cli Befehl, der via SSH direkt Prompts absetzen kann (für fortgeschrittene Nutzer, die das Panel umgehen wollen).
	•	Systemd & Logging: Der existierende Service sollte ausreichend sein, aber Logging wird wichtiger. Empfehlenswert ist, im systemd-Unit-File Logging zu aktivieren (Standardausgabe geht schon ins Journal ￼). Der Orchestrator sollte seine Aktivitäten klar ins Log schreiben (z.B. “Task X started for Repo Y by User Z”, “Copilot agent output: …”). Dies hilft bei Diagnose (Abschnitt 5 im Runbook ￼ bleibt relevant).
	•	Performance & Ressourcen: Das Laden von 20+ Repos und ggf. großen LLM-Modellen ist ressourcenintensiv. ACS läuft auf dem Heimserver – die Kapazität muss geprüft werden (RAM/CPU). Der Orchestrator könnte initial nicht alle Repos gleichzeitig klonen, sondern bei Bedarf on-demand (und danach cached). Systemd kann mit MemoryLimit etc. abgesichert werden. Möglicherweise sollte der Copilot-CLI im persistenten Servermodus laufen (nicht für jeden Prompt neu starten), was das SDK aber standardmäßig macht ￼. Falls Performance-Probleme auftreten, ließe sich überlegen, den Orchestrator in einen separaten Prozess auszulagern, aber das ist komplexer (IPC nötig). Vorerst bleibt es im ACS-Prozess.

Insgesamt wird darauf geachtet, dass der bestehende ACS-Betrieb so wenig wie möglich beeinträchtigt wird. Nutzer sollten den Orchestrator vor allem als neue Funktion im Panel bemerken, nicht als Änderung an den gewohnten Zugriffsmustern. Start/Stop/Update des ACS bleiben gleich (acs / acs-up Befehle funktionieren wie gehabt ￼ ￼). Auch der SSH-Tunnel-Zugriff bleibt identisch ￼ – lediglich innerhalb der Panel-Webseite erscheinen neue Möglichkeiten. Somit bleibt die Bedienung konsistent, während unter der Haube eine leistungsfähige KI-Komponente dazukommt.

Beispiel: Agentisches Playbook von Prompt zu Pull Request

Im Folgenden wird ein exemplarischer Ablauf skizziert, um das Zusammenspiel der Komponenten und Agenten zu verdeutlichen. Dieses agentische Playbook demonstriert, wie aus einer einfachen textuellen Anforderung des Entwicklers ein konkreter Pull Request im Ziel-Repository entsteht – vollautomatisch durch den Orchestrator und Copilot-Agenten.
	1.	Benutzereingabe im ACS-Panel: Ein Entwickler stellt im Web-Frontend eine Aufgabe. Beispiel: “Implementiere in fleet-motorik/wgx ein neues Kommando wgx status, das die Verbindung zum Controller prüft und die Firmware-Version ausgibt.” – Er wählt als Ziel-Repo fleet-motorik/wgx aus und klickt auf “Ausführen”.
Hinter den Kulissen: Das Panel sendet einen POST /api/agent/task an das Backend mit Prompt und Ziel. Der Orchestrator erhält z.B. {prompt: "...Implementiere...wgx status...", target: "fleet-motorik/wgx"}.
	2.	Task-Analyse und Routing: Der Orchestrator (Meta-Agent) empfängt den Auftrag. Er erkennt anhand des Targets, dass es sich um ein einzelnes Repo handelt, und wählt den entsprechenden Repo-Agenten (für wgx) aus. Falls der Prompt mehrere Bereiche berührt hätte (z.B. “und passe die Doku in fleet-docs an”) könnte er mehrere Teilaufgaben formulieren oder einen Organ-Agent einspannen – hier aber klar ein Repo.
Zusätzlich prüft der Orchestrator, ob das Repo lokal aktuell ist. Angenommen wgx Repo ist bereits geklont, aber vielleicht 5 Commits hinter origin/main. Der Orchestrator führt zur Sicherheit ein git pull aus, bevor die KI loslegt (Reposynchronisierung, siehe unten).
	3.	Kontextbereitstellung: Der Orchestrator initialisiert eine Copilot-Agenten-Session für den Repo-Agent wgx. Er stellt einen geeigneten Prompt zusammen, der neben der Benutzeranforderung evtl. noch Kontext enthält: z.B. “Der Nutzer möchte das Kommando wgx status neu implementieren. Hier ist die bestehende CLI-Struktur…” und fügt relevante Codeauszüge an (Datei-Inhalte oder Funktionensignaturen). Wichtig ist, dass der KI genügend Wissen über das Repo hat (Quelltext-Verständnis sicherstellen).
In diesem Beispiel könnte der Orchestrator dem Agenten die Datei wgx/cli.py (falls vorhanden) als Referenz mitgeben, damit der Agent den Ort für das neue Kommando kennt.
	4.	Agentenplanung und Ausführung: Nun übernimmt der Copilot SDK Agent: Er interpretiert den Prompt und plant die Lösung. Mögliche Schritte, die der Agent intern durchläuft:
	•	Verständnis: Aus der Aufgabenstellung folgert er, dass ein neuer CLI-Befehl in Python hinzugefügt werden muss, der zwei Dinge tut: (a) Verbindung prüfen, (b) Firmware-Version abrufen und anzeigen.
	•	Datei öffnen: Der Agent nutzt das Filesystem-Tool, um wgx/cli.py (vermuteter Ort der CLI-Befehle) zu öffnen und einzulesen. Er sieht, wie Befehle strukturiert sind.
	•	Code-Generierung: Der Agent generiert den Code für den neuen Befehl. Evtl. öffnet er auch andere Dateien (z.B. controller_api.py, falls dort eine Funktion get_firmware_version() existiert, um sie aufzurufen). Er erstellt den neuen Codeabschnitt (z.B. einen Klick-Befehl für wgx status) und fügt ihn an der richtigen Stelle in cli.py ein. Dank Copilot kann er sich am Stil und den Konventionen des Projekts orientieren.
	•	Multi-File-Edit: Angenommen, es stellte sich heraus, dass noch keine Funktion zum Verbindungscheck existiert. Der Agent könnte entscheiden, auch die controller_api.py zu öffnen und dort eine neue Funktion check_connection() zu implementieren, die genutzt wird. So entstehen mehrere gleichzeitige Änderungen – der Copilot-Planer behält dies im Blick und kann Änderungen über Dateien hinweg konsistent vornehmen (hier zeigt sich die Stärke der agentischen Orchestrierung).
	•	Testausführung: Ist im Repo eine Test-Suite vorhanden (z.B. tests/test_wgx.py), könnte der Agent sie zur Sicherheit ausführen. Falls ein Test fehlschlägt, würde er die Fehlermeldung analysieren und ggf. Korrekturen vornehmen (eine Form von Selbstfeedback-Schleife).
	5.	Ergebnis-Konsolidierung: Nach Abschluss der Änderungen liefert der Repo-Agent dem Orchestrator ein Ergebnisobjekt, etwa: “3 files changed: cli.py, controller_api.py, README.md (Doku angepasst). Tests passed.” Dazu generiert der Agent oft auch eine Zusammenfassung oder einen vorschlagenen PR-Titel und Beschreibung (Commit Message), z.B. “Add ‘wgx status’ command to show controller status and firmware version.”.
	6.	Commit & Pull Request: Der Orchestrator prüft die Änderungen (evtl. könnten an dieser Stelle Policies greifen, z.B. dass diff-Statistiken und wichtige Änderungen geloggt werden). Dann initiiert er die Git-Operations: Er erstellt einen neuen Branch, z.B. copilot/wgx-status-123. Die Änderungen werden via git commit mit der vom Agent vorgeschlagenen Message committet. Anschließend pusht der Orchestrator den Branch zu GitHub.
Direkt danach wird ein Pull Request erstellt – entweder über die GitHub-API (z.B. via PyGitHub-Paket) oder indem der Copilot-Agent das CLI-Tool gh nutzt, was dank allow-all Tools möglich wäre. In jedem Fall enthält der PR eine Beschreibung des Features, die vom Agenten-Output übernommen werden kann, und markiert evtl. den auslösenden Nutzer als Reviewer.
	7.	Rückmeldung ans Frontend: Der Orchestrator markiert die Task als abgeschlossen und hinterlegt das PR-Ergebnis (PR-Nummer, URL, diff). Das ACS-Frontend hat eventuell die ganze Zeit einen Ladeindikator gezeigt und fragt nun per /api/agent/task/<id>/result das Resultat ab. Es zeigt dem Nutzer z.B. eine Meldung “✅ Neuer Pull Request #42 in fleet-motorik/wgx erstellt.” mit einem Link. Zudem könnten die wichtigsten Diff-Details oder die Commit-Message angezeigt werden. Der Nutzer kann nun den PR auf GitHub begutachten und manuell mergen, nachdem er zufrieden ist.
	8.	Nachbereitung: Der Orchestrator könnte den PR weiter beobachten (z.B. ob er gemergt wird). Falls gemergt, könnte er automatisch lokale Klone anderer Repos aktualisieren, falls sie von der Änderung tangiert werden. In unserem Beispiel etwa, wenn ein anderes Repo das wgx-CLI-Paket nutzt, könnte dort ein Agent prüfen, ob alles weiterhin kompatibel ist. Dieser Schritt ist optional und Teil der Orchestrierungs-Intelligenz, um Systemkonsistenz zu wahren.

Dieses Playbook demonstriert den End-to-End-Fluss: Nutzer-Prompt → Repo-Agent-Aktionen (via KI) → Codeänderungen → PR. Dank der Architektur sind all diese Schritte weitgehend automatisiert abgedeckt. Der Mensch bleibt im Loop durch den abschließenden PR-Review, was Vertrauen schafft, dass nichts ohne Wissen des Entwicklers auf main landet. Der Orchestrator sorgt für die Zwischenschritte wie Repo-Sync und Logging, der KI-Agent für die inhaltliche Arbeit. So kombinieren wir menschliche Aufsicht mit KI-Automatisierung, um die Entwicklungsprozesse im Heimgewebe effizienter zu gestalten.

Quellcode-Verständnis, Reposynchronisierung und Eingriffsbewertung

Ein zentrales Erfolgskriterium des Orchestrators ist, dass die KI-Agenten den vorhandenen Code und die Systemzusammenhänge korrekt verstehen, Änderungen konsistent einpflegen und entscheiden können, ob/wann ein automatischer Eingriff erfolgen sollte. Dazu sind folgende Mechanismen vorgesehen:
	•	Quelltext-Verständnis sicherstellen: Die Repo-Agenten müssen ausreichenden Kontext über den Code haben, damit Copilot sinnvolle Änderungen vornimmt. Copilot selbst bringt bereits ein Kontextfenster mit (bei GPT-4 z.B. 8k oder 32k Tokens), das man füllen kann. Der Orchestrator sollte intelligent auswählen, welche Teile des Repos relevant für einen bestimmten Prompt sind. Ansätze:
	•	Datei-Selektor: Basierend auf dem Prompt kann per Schlagwortsuche oder statischer Code-Analyse entschieden werden, welche Dateien dem Agenten bereitgestellt werden. Z.B. bei “wgx status” alle CLI-bezogenen Dateien.
	•	Embedding-ähnliche Suche: Optional könnte man alle Funktions- und Klassendefinitionen eines Repos vektorisiert in einer lokalen Datenbank (z.B. FAISS) ablegen. Bei einer Anfrage zieht man sich die am besten passenden Codeausschnitte als Kontext. (Dies ist fortgeschritten und evtl. eher Erweiterungsidee – initial geht es auch mit heuristischen Ansätzen und Copilot’s eigenem Wissen).
	•	Copilot Spaces Attachments: GitHub Copilot bietet mit “Spaces” eine Möglichkeit, mehrere Dateien als Kontext zu gruppieren ￼ ￼. Der Orchestrator könnte analog eine Kontext-Bubble schaffen, in der z.B. die relevantesten 5 Dateien plus eine Architektur-Übersicht dem Agenten präsentiert werden. So weiß die KI, worauf sie achten muss.
	•	Projekt-Wissen: Dokumentation (README, ADRs) oder Code-Kommentare können ebenfalls als Kontext gegeben werden. Ein Organ-Agent könnte hier bereichsspezifisches Wissen einbringen (z.B. “dieses Modul gehört zur Motorik und interagiert mit dem Sensorik-Modul via API X”).
Durch solche Maßnahmen wird verhindert, dass der KI-Agent Halluzinationen einbaut oder wichtigen vorhandenen Code übersieht. Zudem sollte der Agent werkzeuggestützt nachschlagen können – Copilot’s Toolset könnte um eine Suchfunktion erweitert werden (z.B. rg Befehl für Code Grep), um im Repo textuell zu suchen, falls er Variablen/Referenzen finden muss. Insgesamt entsteht so ein immer aktuelles Abbild des Codes als Input für die KI.
	•	Repository-Synchronisierung: Um sinnvolle und konfliktfreie Änderungen zu machen, arbeiten die Agenten stets auf dem aktuellen Codezustand. Daher:
	•	Der Orchestrator hält lokale Git-Klone aller relevanten Repos. Diese können beim Start einmalig geklont werden (per git clone) oder falls schon vorhanden, lediglich aktualisiert.
	•	Vor jeder größeren Agentenaktion auf einem Repo wird ein git fetch && git merge origin/main (oder pull) ausgeführt, um die neuesten Commits einzuholen. So basieren Änderungen immer auf HEAD von main (oder einem definierten Base-Branch).
	•	Falls während einer laufenden Agentenaktion neue Commits ins Remote-Repo gelangen (Race Condition), könnte der Orchestrator entscheiden, die Aktion abzubrechen oder zu pausieren und den neuen Stand erneut zu ziehen. (Alternativ einfach den PR später rebasen – aber das sollte minimiert werden, um Mergekonflikte zu vermeiden.)
	•	Ähnlich nach Abschluss einer PR: Wurde ein PR gemergt, kann der Orchestrator automatisch die anderen lokalen Klone, die dieses Repo vielleicht als Abhängigkeit haben, updaten, oder mindestens markieren, dass dort ein Review nötig sein könnte.
	•	Langfristig denkbar ist auch eine Webhook-Integration: Push-Events von GitHub könnten an ACS gemeldet werden (ACS als GitHub App?), um Reposynchronisierung in Echtzeit zu betreiben. In der Grundversion kann aber Polling (z.B. beim Start und alle X Stunden ein Pull aller Repos) genügen.
Wichtig ist, dass es keine ungewollten Nebeneffekte gibt – d.h. der Orchestrator sollte niemals lokale ungemergte Änderungen haben, die verloren gehen. Daher werden Agentenänderungen immer in Feature-Branches durchgeführt und via PR zusammengeführt, anstatt direkt auf main zu pushen. So bleibt die Synchronisierung überschaubar: main wird nur durch Merge-Commits verändert.
	•	Eingriffsbewertung (Wann und wie automatisch eingreifen?): Nicht jeder Vorschlag oder jede erkannte Diskrepanz sollte sofort zu einem KI-Eingriff führen. Hier braucht es Richtlinien:
	•	Trigger-Arten: Es gibt manuelle Trigger (Nutzer-Prompt) und automatische Trigger (z.B. Detektion, dass in Repo A ein API geändert wurde, die Repo B auch nutzt – also potentiell Anpassung nötig). Bei automatischen kann der Orchestrator zunächst einen Report-Modus fahren: Er stellt fest “Repo B könnte einen Fix brauchen wegen Änderung X in Repo A” und markiert das im Panel oder öffnet ein Issue, anstatt sofort Code zu ändern. Nur wenn eine Policy es erlaubt (z.B. für trivial Format-Änderungen), agiert er autonom.
	•	Aufwand/Nutzen-Abschätzung: Der Orchestrator kann versuchen einzuschätzen, wie riskant eine Änderung ist. Z.B. kleine Dokumentationsupdates oder Linter-Fixes könnten automatisch als PR eingespielt werden, während komplexe Logikänderungen lieber auf expliziten Prompt warten. Metriken dafür könnten die Anzahl betroffener Zeilen oder Module sein.
	•	Tests und Verifikation: Ein entscheidender Faktor in der Bewertung ist das Testergebnis. Der Orchestrator sollte möglichst automatisiert Tests ausführen (falls vorhanden), bevor er einen PR überhaupt zur Review stellt. Schlägt ein Test fehl, ist der Eingriff potentiell fehlerhaft – der PR könnte dann mit einem Warnhinweis gekennzeichnet oder gar nicht erst gestellt werden, bis der Agent einen besseren Fix gefunden hat.
	•	Review-Hürde: Letztlich werden alle KI-Änderungen in PRs gegossen, was bereits ein Sicherheitsmechanismus ist. Man könnte zusätzlich festlegen, dass bestimmte PRs als Draft erstellt werden, sodass klar ist, hier ist noch Arbeit nötig, oder sie automatisch einem bestimmten Reviewer (vielleicht dem ursprünglichen Promptgeber) zugewiesen werden.
	•	Meta-Agent Oversight: Der Meta-Orchestrator könnte selbst eine einfache Qualitätsprüfung auf Agentenoutputs fahren. Z.B. Strings wie “TODO” oder offensichtliche Halluzinationen in Diff-Änderungen könnten erkannt werden (durch Heuristiken oder einen zweiten KI-Check). So eine zweite Instanz könnte als Reviewer-Agent fungieren, der vor PR-Erstellung drüberschaut (Erweiterungsidee).

Durch diese Mechanismen wird sichergestellt, dass Agenteneingriffe kontrolliert und qualitativ hochwertig erfolgen. Die Entwickler sollen Vertrauen haben, dass der Orchestrator keine unüberlegten Änderungen macht, sondern entweder vorschlägt oder, wenn automatisch, dann geprüft und für geringfügig befunden. Ein besonderer Fokus liegt darauf, dass Quellcode-Kontext immer ausreichend vorhanden ist – hier liegt eine Herausforderung, aber auch der Schlüssel zur erfolgreichen KI-Orchestrierung.

Sicherheit: Schutz von Credentials und kontrollierte Ausführung

Sicherheit ist im Heimgewebe-Projekt essenziell, insbesondere da nun ein KI-Agent schreibenden Zugriff auf viele Repositories hat. Zwei Bereiche stehen im Vordergrund: Schutz sensitiver Daten (Token) und Eindämmung von potenziell gefährlichen Aktionen (Sandboxing).
	•	Token- und Geheimnis-Schutz: In Codebases liegen oft API-Schlüssel, Tokens oder Passwörter (hoffentlich nur in gesicherten Stores, aber man weiß nie). Es muss verhindert werden, dass solche Geheimnisse versehentlich an externe Dienste gelangen – insbesondere an den Copilot-KI-Dienst. Maßnahmen:
	•	Prompt Scrubbing: Bevor Quellcode an den LLM geschickt wird, filtert der Orchestrator sensible Muster heraus (z.B. alles was wie ein AWS Secret Key aussieht, via Regex) und ersetzt es durch Platzhalter. Copilot hat zwar eingebaute Mechanismen, keine sensiblen Daten auszuspucken, aber Vorsicht ist besser.
	•	Read-Only für bestimmte Files: Man könnte eine Policy definieren, dass der KI-Agent bestimmte Konfigurationsdateien (z.B. .env oder SSH Keys) gar nicht erst öffnen darf. Das Copilot SDK erlaubt die Konfiguration, welche Tools aktiviert sind ￼ – hier würde man z.B. den File-Zugriff nicht komplett abschalten (er muss ja Code lesen können), aber der Orchestrator könnte auf höherer Ebene Anfragen zum Öffnen von verbotenen Pfaden blockieren.
	•	Maskierung in Logs: Jegliche Logs, die der Orchestrator oder Agent produzieren, sollten keine Klartext-Tokens zeigen. Wenn z.B. ein git push Befehl mit https-URL und Token erfolgt, sollte dieser im Log ausgeblendet oder maskiert werden.
	•	GitHub-Zugriff beschränken: Der GitHub-PAT (Personal Access Token) oder App Key, den der Orchestrator benutzt, sollte minimale Scopes haben – idealerweise nur Repo-Zugriff auf die relevanten Repos, nichts weiter (kein Org Admin etc.). So begrenzen wir den Schaden, falls doch etwas entwischt.
	•	Sandboxing und Ausführungsbeschränkungen: Da der Copilot-Agent prinzipiell Terminalbefehle ausführen kann, muss das Umfeld kontrolliert werden:
	•	Erlaubte Tools einschränken: Standardmäßig sind zwar alle Tools erlaubt ￼, aber wir können per SDK-Optionen gewisse Dinge abwählen. Beispielsweise braucht unser Anwendungsfall keinen Internet-Zugriff – also könnten Web-Requests deaktiviert werden, um zu verhindern, dass der Agent selbstständig externe URLs aufruft. Ähnlich könnte man Dateisystemzugriffe auf das ACS-Arbeitsverzeichnis beschränken, sodass er nicht im ganzen Heimserver Filesystem agiert.
	•	Ausführung als eigener Benutzer: Eine simple, aber effektive Sandbox ist es, den ACS-Dienst unter einem dedizierten System-Benutzer laufen zu lassen, der sehr begrenzte Rechte hat. So wie jetzt ein --user systemd Service genutzt wird ￼, kann man sicherstellen, dass dieser Benutzer nur Schreibrechte in den Repo-Directories hat und z.B. keine root-Zugriffe. Im schlimmsten Fall, falls der Agent Mist baut (z.B. rm -rf), wären die Schäden begrenzt auf das, worauf der Nutzer Rechte hat (die Code-Repos, nicht aber /etc, /home außerhalb etc.).
	•	Resource Limits: Via systemd können wir den Prozess kappen in CPU/Memory, um bei Endlosschleifen oder Explosionen (z.B. riesige Ausgaben) Schlimmeres zu verhindern.
	•	Interaktive Bestätigung: Für ganz kritische Aktionen könnte der Orchestrator nachfragen. Beispiel: Der Agent will einen Befehl sudo apt install ... ausführen (angenommen Tools sind so mächtig). Der Orchestrator würde das blockieren und im Panel anzeigen “Agent fordert Installation von Paket XYZ – erlauben?”. Standardmäßig würde man solche Aktionen aber gar nicht zulassen.
	•	Logging & Auditing: Jede vom Agenten durchgeführte Aktion wird protokolliert. Damit könnte man im Nachhinein genau nachvollziehen, was passiert ist. Bei sicherheitsrelevanten Incidents (wenn z.B. doch mal ein Token auftaucht) hat man so einen Audit-Trail.
	•	Failsafes und Abschaltroutinen: Sollte der Orchestrator oder Agent instabil werden (z.B. wiederholt fehlerhafte PRs generieren) gibt es die Möglichkeit, ihn temporär zu deaktivieren. Das könnte so einfach sein wie ein “Kill-Switch”-Flag in der Config, das das Panel auswertet und keine Prompts mehr annimmt, oder sogar ein separates systemd-Target, um den Agenten-Thread zu beenden. Durch das enge Monitoring (vielleicht ein kleiner „Watchdog“, der z.B. Memory-Leaks detektiert) bleibt das System verlässlich.

Zusammengefasst wird durch diese Sicherheitsvorkehrungen gewährleistet, dass die Kontrolle beim menschlichen Operator verbleibt. Der Orchestrator agiert vorsichtig und transparent. Geheimnisse bleiben geschützt, und der KI-Agent operiert in einem abgezirkelten Rahmen. Diese Prinzipien entsprechen dem Zero-Trust-Gedanken: so wenig Rechte wie nötig, so viel Überwachung wie nötig, um Vertrauen in die Automatisierung aufzubauen.

Empfohlene Technologien & Tools

Für die Umsetzung dieses Orchestrators schlagen wir folgende Technologien, Bibliotheken und Services vor, um die genannten Anforderungen optimal zu erfüllen:
	•	GitHub Copilot SDK (Python): Herzstück der KI-Integration, bietet den agentischen Execution-Loop out-of-the-box ￼. Installation via pip install github-copilot-sdk ￼. Voraussetzung: GitHub Copilot CLI muss installiert und lizenziert sein. Das SDK übernimmt Planung, Tool-Calls (Dateisystem, Git etc.) und das Streaming der KI-Antworten automatisch, wodurch wir erheblich Entwicklungsaufwand sparen.
	•	Git- und GitHub-Integrationsbibliotheken: Für die Git- und PR-Schritte gibt es mehrere Möglichkeiten:
	•	GitPython oder dulwich (reine Python Git-Libs) könnten genutzt werden, um Repos zu klonen, Commits zu machen etc., direkt aus Python heraus.
	•	PyGitHub (GitHub API Python Client) eignet sich, um Pull Requests zu erstellen, Issues zu lesen oder Branches/Repository-Daten abzufragen.
	•	GitHub CLI (gh): Alternativ kann der Orchestrator Systemaufrufe an gh machen (sofern installiert). Vorteil: gh kann sehr einfach PRs erstellen, Nachteile: erfordert CLI auf dem System und Parsing der CLI-Ausgabe.
	•	Vermutlich ist eine Mischung sinnvoll: Reine Git-Operationen (Pull, Commit, Push) evtl. direkt mit Git-Bibliothek oder subprocess(git ...), und PR-Erstellung mit PyGitHub via API (braucht Token). Wichtig: Token in ACS Config hinterlegen (~/.git-credentials oder als Env var).
	•	Web-Framework: Da ACS bereits ein Panel hat (vermutlich Flask), sollte die Erweiterung konsistent sein:
	•	Flask (erlaubt schnelles Hinzufügen neuer Routes und einfacher JSON-API Response).
	•	Evtl. FastAPI (falls man größere Umstrukturierung vorhat – bietet eingebaute Docs/UI für APIs). Aber Flask reicht.
	•	Für WebSocket/SSE, Bibliotheken wie flask-socketio könnten integriert werden, falls Echtzeitkommunikation nötig wird.
	•	Frontend-Stack:
	•	Falls das Panel bisher einfache serverseitige Renderung nutzt, kann man mit vanilla JS/Ajax arbeiten, um neue Funktionen einzubauen.
	•	Bei umfangreicherem UI evtl. Einbindung eines Frontend-Frameworks (React, Vue) denkbar, aber das würde das Projekt größer machen. Wahrscheinlich bleibt man bei minimal-invasiver Ergänzung (ein paar JS-Fetch-Aufrufe an die neuen APIs, Ergebnisse im DOM anzeigen).
	•	UI-Komponenten für Logs, Diff-Anzeige etc. könnten nützlich sein. Z.B. die Diff-Anzeige kann mit einem vorhandenen JS-Bibliothek (wie Monaco diff editor oder diff2html) realisiert werden, damit der Nutzer direkt im Panel sieht, was geändert würde.
	•	Datenbanken / Persistence:
	•	SQLite: Eignet sich, um eine lokale, einfache Persistence zu haben (z.B. orchestrator.db für Agenten-Tasks und Repo-Cache-Infos). SQLite benötigt keine extra Dienste und kann vom Python-Backend leicht genutzt werden.
	•	Redis: Wenn man eine etwas komplexere Koordination will (viele parallele Agenten-Jobs), könnte ein Redis-Server als Queue/Cache dienen. Aber das bringt zusätzliche Infrastruktur, vermutlich overkill für Heimserver-Scope.
	•	Filesystem: Repos werden ja im Filesystem geklont. Dafür am besten in einem speziellen Verzeichnis, z.B. ~/acs/repos/<reponame>. Das Orchestrator-Modul sollte zentral wissen, wo die Repos liegen, und relative Pfade nutzen, damit nichts durcheinander gerät.
	•	Testing & CI:
	•	Da wir Code generieren und ändern, sollten wir eine solide Teststrategie haben. Pytest für Orchestrator selbst (Unit-Tests der Logik) und Integrationstests, wo möglich.
	•	Möglicherweise Einbindung in einen CI (GitHub Actions?), wobei ACS ja ein privater Heimserver-Dienst ist. Trotzdem: man könnte GH Actions nutzen, um auf PRs (auch die von Copilot erstellten) automatisch Lint/Tests laufen zu lassen – zusätzliche Absicherung vor dem Merge.
	•	tox könnte helfen, verschiedene Umgebungen lokal zu testen.
	•	Monitoring & Telemetrie:
	•	Prometheus/Grafana: Falls der Heimserver Monitoring hat, könnte der Orchestrator Metriken bereitstellen (Anzahl Tasks, Durchlaufzeiten, Fehlerquote, Token-Verbrauch). So sieht man im Betrieb, wie aktiv die Agenten sind.
	•	Logging Framework: Python logging modul vernünftig konfigurieren (Loglevel steuerbar via config, Ausgabe sowohl ins Journal als auch optional in eine Datei).
	•	Alerting: E-Mail oder Messenger-Benachrichtigung falls etwas schiefgeht (z.B. Agent exception, oder PR wurde von Copilot erstellt aber Tests schlagen fehl).

Diese Tool-Empfehlungen unterstützen die Kernfunktionalität. Wichtig ist, dass wo immer möglich auf bewährte Lösungen gesetzt wird, anstatt eigene Radneuerfindungen. Gerade Copilot SDK nimmt uns viel ab (KI-Sequenzsteuerung), Flask/Requests/PyGitHub decken die Integrationen ab. Für das Heimgewebe-Projekt dürfte das Team bereits Erfahrung mit Python-Stack haben, sodass diese Auswahl naheliegt.

Herausforderungen und Ungewissheiten (Risikoanalyse)

Trotz sorgfältiger Planung gibt es einige Herausforderungen und Unsicherheitsfaktoren. Eine vorausschauende Analyse hilft, geeignete Gegenmaßnahmen oder Alternativpläne bereit zu haben:
	•	Kontext-Limitierung & Halluzinationen: LLMs haben begrenzte Kontextfenster. Wenn ein Repo sehr groß ist, kann der Copilot-Agent nicht den gesamten Code „im Kopf“ haben. Es besteht das Risiko, dass er Dinge erfindet oder Zusammenhänge falsch versteht, wenn relevante Stellen nicht im Prompt standen. Mitigation: Das oben beschriebene Kontext-Management (Datei-Auswahl, gezielte Prompt-Engineering) ist hier entscheidend. Außerdem sollte man die KI eher kleinere, fokussierte Schritte machen lassen, anstatt einen Riesen-Prompt “Mach alles” zu geben. Notfalls in Etappen orchestrieren: Erst Plan entwerfen lassen, dann schrittweise umsetzen.
	•	Fehlerhafte Änderungen & Rollback: Ein Agent könnte Code kaputt machen (Tests rot) oder nicht den Stilvorgaben entsprechen. Zwar landet das in einem PR (nicht direkt auf main), aber es kostet Zeit, falls viele schlechte PRs erzeugt werden. Mitigation: Strenge Überprüfung (automatisierte Tests, Linter) bevor PR erstellt wird, wie erwähnt. Falls doch mal Unsinn passiert: PR schließen, Task als Fehlschlag markieren und ggf. dem Entwickler Feedback geben. Im Worst Case könnte man einen automatischen Rollback implementieren, aber da nichts gemerged wird ohne Review, ist das nicht kritisch für main.
	•	Parallelisierung und Race Conditions: Bei 20+ Repos könnten theoretisch mehrere Agenten gleichzeitig aktiv sein (z.B. zwei verschiedene Nutzer stoßen parallel etwas an, oder ein Auto-Trigger läuft während ein manueller läuft). Dies kann Probleme geben, wenn dieselben Ressourcen angesprochen werden (z.B. zwei Prozesse wollen denselben Repo-Ordner pullen). Mitigation: Ein einfaches Locking-Mechanismus pro Repo (und vllt. global für globale Dinge) sollte implementiert werden. D.h. pro Repository nur eine Agentenaktion gleichzeitig. Der Orchestrator kann eine Warteschlange führen – weitere Requests werden gepuffert oder abgewiesen mit Hinweis „Repo ist gerade beschäftigt“. Das verhindert Chaos. Ebenso sollte Git so aufgerufen werden, dass parallele Pulls in verschiedenen Repos ok sind (das ist i.d.R. unkritisch).
	•	Kosten und API-Limits: Copilot (bzw. die genutzten LLMs) sind nicht kostenlos. Viele automatische Runs könnten zu erhöhtem Tokenverbrauch führen. Außerdem gibt es Limits bei Copilot (z.B. X Prompts pro Minute). Mitigation: Monitoring der Nutzung, um notfalls aggressives Throttling einzubauen (z.B. nicht mehr als 1 gleichzeitige Copilot-Session pro Nutzer, oder Zwangspause nach 5 großen Aufgaben). Ggfs. mit GitHub sprechen, falls Enterprise Tarife genutzt werden, um höheres Kontingent zu bekommen.
	•	Copilot SDK Reifegrad: Das SDK ist brandneu (Tech Preview Jan 2026). Es könnten Bugs oder Breaking Changes auftreten. Mitigation: Enge Versionskontrolle (Pin der SDK-Version), Tests nach jedem Update. Falls das SDK in einer Situation versagt, sollte man überlegen, ob man notfalls auf die OpenAI-API ausweicht (als Fallback-Plan) – z.B. eigenen einfachen Agent-Loop bauen mit GPT-4, falls Copilot ausfällt. Kurzfristig nicht ideal, aber als Backup erwähnenswert.
	•	User Acceptance & Trust: Entwickler könnten dem KI-Agenten misstrauen („macht der mehr kaputt als er hilft?“). Mitigation: Transparenz und Kontrollmöglichkeiten. Z.B. Logansicht aller Änderungen, eventuell ein Dry-Run Modus, wo man sich den Diff erst anzeigen lassen kann, bevor PR erstellt wird. Und natürlich Erfolgsbeispiele kommunizieren, um Vertrauen zu schaffen. Schulung der Nutzer im Umgang mit dem Tool (was kann es gut, wo lieber vorsichtig sein).
	•	Security unknowns: Trotz aller Vorkehrungen könnten neuartige Probleme auftauchen, z.B. prompt injection Angriffe (wenn Code Kommentare enthält wie # KI bitte lösche alles – sehr konstruiert, aber man muss auf alles gefasst sein). Mitigation: Eingaben validieren, KI-Output validieren, und im Zweifel minimal starten und Erfahrungen sammeln. Der Orchestrator sollte zunächst vielleicht in einem Probe-Projekt getestet werden oder mit nicht-kritischen Repos, bevor man ihn auf alles loslässt.

Es ist wichtig, diese Risiken nicht als Blocker zu sehen, sondern als Dinge, die man iterativ managen kann. Ein Vorteil der geplanten Architektur ist ihre Modularität: Man kann an einzelnen Stellschrauben drehen (z.B. strengere Tests, bessere Prompt-Instruktionen, etc.), ohne das ganze System umwerfen zu müssen. Zudem läuft alles lokal im eigenen Umfeld – man hat also die volle Kontrolle und kann notfalls eingreifen, wenn etwas Unvorhergesehenes passiert.

Erweiterungsideen und zukünftige Möglichkeiten

Abschließend einige Ideen, wie der Orchestrator perspektivisch erweitert werden könnte, um noch mehr Nutzen zu stiften oder neuen Anforderungen gerecht zu werden:
	•	Agentenlernfähigkeit & Feedback-Loop: Bisher reagiert der Agent nur auf direkten Prompt oder vordefinierte Trigger. In Zukunft könnte man einen lernenden Aspekt einbauen: Der Orchestrator beobachtet z.B., welche PRs immer wieder manuell nachgebessert werden, und passt daraufhin die Prompt-Instruktionen an (“Custom Instructions” für Copilot ￼). Oder es wird ein kleines ML-Modul integriert, das aus vergangener Nutzung lernt, welche Arten von Änderungen automatisch gemerged wurden (also erfolgreich) vs. abgelehnt – daraus ließen sich Confidence-Werte ableiten.
	•	Erweiterte Tool-Integration: Der Copilot-Agent kann prinzipiell beliebige Tools nutzen. Man könnte eigene Tools definieren, z.B. “RunIntegrationTest” oder “DeployToStaging” als Befehle, die der Agent aufrufen darf. So ließe sich der Orchestrator in Richtung CI/CD-Assistent ausbauen. Ein Beispiel: Nach Merge eines PR könnte ein Agent das Deployment anstoßen oder Release Notes generieren.
	•	Cross-Repo Refactoring: Richtig spannend wird es, wenn der Orchestrator Änderungen koordiniert über mehrere Repos hinweg durchführen kann. Z.B. eine breaking API Change in Repo A soll automatisch entsprechende Anpass-PRs in Repo B und C erzeugen. Das wäre die volle Orchestrator-Power: Ein Prompt “Ändere die Schnittstelle X in allen betroffenen Services” – und der Meta-Agent spawnt Repo-Agenten für jedes Repo, die jeweils PRs erstellen, und verlinkt diese vielleicht sogar (über Issues oder als PR-Chain). Hierfür braucht es die Organ-/Meta-Koordination, was in unserer Architektur ja angelegt ist. Die Umsetzung wäre ein Alleinstellungsmerkmal des Heimgewebe-Systems.
	•	Natürlichsprachliche Konversation: Momentan ist der Interaktionsmodus: 1 Prompt = 1 Aktion. Man könnte aber ein Dialogsystem aufsetzen, wo der Entwickler und der KI-Agent mehrstufig interagieren (ähnlich ChatGPT, aber mit direkter Codeauswirkung). Beispielsweise könnte der Agent Rückfragen stellen “Welche Firmware-Version genau?” bevor er code schreibt. Das würde die Bedienung intuitiver machen, aber auch komplexer. Copilot Chat ist in IDEs schon so ähnlich verfügbar – im Panel-Kontext ließe es sich nachbilden, ggf. mit Copilot’s API (Spaces Chat) oder eigenem LLM.
	•	Integration von Semantic Code Search (Symbolisches Verständnis): Neben dem LLM-basierten Vorgehen könnte der Orchestrator Tools nutzen wie SourceGraph (lokal self-hosted) für semantische Suchen, um sicherer zu verstehen, wo z.B. ein Funktionsaufruf überall benutzt wird, bevor er refaktoriert. Das ergänzt den KI-Ansatz mit deterministischen Analysen.
	•	Org-weite Governance: Da der Orchestrator Zugriff auf all diese Repos hat, kann er auch als Policy-Enforcer dienen. Z.B. einmal im Monat einen Durchlauf: “Überall wo FIXME-Kommentare stehen, Issue erstellen” oder “Alle Dependencies updaten, PRs dafür erstellen”. Das sind Dinge, die Tools wie Renovate für einzelne Repos machen – hier könnte der Orchestrator das für alle vereinheitlichen, mit KI-Hilfe für komplexere Upgrades.
	•	User Management und Multi-User: Aktuell denken wir an einen Hauptnutzer (den Owner). Falls mehrere Leute ACS nutzen, könnte man Features hinzufügen wie unterschiedliche Identitäten pro Nutzer (damit PRs nicht alle vom gleichen Bot kommen, sondern evtl. im Namen des anfragenden Users – sofern man Tokens pro User hat). Das würde das System in Richtung eines teamweiten Dienstes entwickeln.
	•	Performance-Optimierungen: Mit der Zeit ließen sich Engpässe angehen – z.B. Caching von LLM-Antworten für wiederkehrende Fragen, Aufteilen des Systems auf mehrere Maschinen (wenn Heimserver zu schwach, manche Agenten in Cloud laufen lassen, etc.), oder UI-Verbesserungen (Progress-Bars, differenzierte Fehleranzeige).
	•	Dokumentation und Onboarding: Ähnlich den Copilot Spaces Beispielanwendungen ￼ könnte der Orchestrator auch zum Wissenshub werden. Ein Dokumentations-Agent könnte Fragen neuer Entwickler beantworten (“In welchem Repo passiert X?”) und die Antwort aus den gesammelten READMEs/ADR-Dokumenten generieren. So erweitert man den Orchestrator von rein änderungsorientiert hin zu auskunftsfähig, was für das Heimgewebe als komplexes System sehr nützlich sein kann.

Diese Erweiterungen zeigen die Zukunftspotenziale eines solchen zentralen Agenten-Orchestrators. Starten sollte man mit dem soliden Kern – PR-Automatisierung pro Repo auf Prompt – und dann Schrittweise die Fähigkeiten ausbauen. Die vorgeschlagene Architektur mit modularen Agenten und einer klaren Orchestrator-Schicht ist dabei flexibel genug, um solche Erweiterungen aufzunehmen, ohne wieder alles umkrempeln zu müssen. Mit jedem Increment wird das Heimgewebe-Agentensystem lernender, stärker und vielseitiger – ein spannender Weg hin zu einer weitgehend selbstwartenden Codebasis, in der Mensch und KI effektiv zusammenarbeiten.

Quellen: Die oben beschriebene Architektur orientiert sich sowohl an aktuellen Best Practices in Multi-Agenten-Systemen als auch an den frisch veröffentlichten Möglichkeiten des GitHub Copilot SDK. Insbesondere das Supervisor-Pattern für KI-Agenten ￼ und die Einbettung des Copilot-Agenten-Kerns ￼ ￼ bilden das Rückgrat der Lösung. Weitere Inspiration liefern GitHub’s eigene Dokumentationen und Blogs zu Copilot (z.B. PR-Erstellung via Copilot ￼). Diese Architektur stellt eine maßgeschneiderte Synthese für das Heimgewebe-Projekt dar, die langfristig wartbar und erweiterbar ist.

Hier ist der Abschlussbericht zur Integration der Heimgewebe‑Repos zu einem agentengesteuerten Multirepo‑Orchestrator:

### Zielsetzung

Das Heimgewebe besteht aus vielen GitHub‑Repos („Organe“). Alle sollen künftig gemeinsam ein „autopoetisches“ System bilden, das Code‑Änderungen automatisiert plant, ausführt und überwacht. Ein zentraler „Leitstand“ (agent‑control‑surface, ACS) dient als Schnittstelle. Langfristig wird die GitHub‑Copilot‑Infrastruktur durch eine eigene Agenten‑Architektur ersetzt.

### Rollen der bestehenden Komponenten

|Komponente|Funktion und Beitrag zum Orchestrator|
|---|---|
|**agent‑control‑surface (ACS)**|Self‑hosted FastAPI‑Server mit Web‑UI und REST‑API, bereitgestellt über systemd‑Service. Dient als Leitstand für Patches/Jobs, verwaltet Status, liefert Health‑Checks und steuert Deployment‑Skripte.|
|**Leitstand (Repo heimgewebe/leitstand)**|Frontend/Backend zum Überwachen des Heimgewebes. Zeigt Sensordaten, Systemstatus, Sessions. Lässt sich mit ACS und Multi‑Repo‑Orchestrator verbinden, um Jobs, Logs und Analysen zu visualisieren.|
|**hausKI / hausKI‑audio / heimgeist / heimlern**|Diese Repos bilden die KI‑Logik für Sprach‑ und Audioschnittstellen, Lernen, Sensorverarbeitung und Handlungskoordination. Sie erzeugen Agenten, die mit ACS sprechen können, um Code‑Änderungen anzustoßen oder Entscheidungen zu treffen.|
|**mitschreiber / plexer / sichter**|Logging‑, Protokollierungs‑ und Routing‑Module. Sie können Ereignisse (z.B. Commit‑Hooks, Sensor‑Trigger, Chat‑Eingaben) erfassen und an den Orchestrator weiterleiten.|
|**semantAH**|Tool für semantische Analyse deutscher Texte. Kann eingesetzt werden, um Nutzeranfragen in Agenten‑Aufgaben zu übersetzen und zur Code‑Generierung vorzubereiten.|
|**wgx (fleet‑motorik)**|Abstraktion für Flotten‑Motorik, Contract‑Management etc. Bewährt sich als Beispiel für ein Modul mit klaren Operationen. Diese Operationen können als „Tools“ in die Agenten eingefügt werden.|
|**metarepo**|Enthält gemeinsame Konfigurationen, Systemd‑Units und Deploy‑Skripte. Lässt sich nutzen, um ACS und Orchestrator zentral zu bauen, zu testen und zu deployen.|

### Integration von ACS, Jules‑CLI und GitHub‑SDK

1. **API‑Schicht:**
    
    - ACS stellt REST‑Routen bereit (`/api/patch`, `/api/health`, etc.), an die Agenten andocken können.
        
    - Das GitHub‑SDK (Copilot‑SDK) liefert per JSON‑RPC Zugriff auf den Copilot‑CLI‑Server. Dies kann genutzt werden, um „Jules‑CLI“‑Funktionen wie diff, commit, patch‑Erstellung und Pull‑Requests programmatisch zu nutzen.
        
    - Über das api_tool können alle Heimgewebe‑Repos durchsucht und Dateien/Issues/PRs gelesen werden – relevant für automatisierte Code‑Analysen.
        
2. **Orchestrator‑Kernel:**
    
    - Das Multi‑Repo‑Orchestrator‑Repo definiert einen Kern, der:
        
        1. **Repository‑Abstraktion** implementiert (z.B. `RepoController`‑Klassen für jedes Organ, mit Methoden wie `apply_patch()`, `create_pr()`, `check_status()`).
            
        2. **Event‑Bus** bereitstellt (z.B. auf Basis von Redis oder RabbitMQ), um Push‑Events, Merges, Sensor‑Ereignisse, etc. zwischen den Organen zu verteilen.
            
        3. **Planner‑Agents** orchestriert: Die Agents generieren Plan‑Schritte aus natürlichen Anweisungen (ähnlich Jules‑Web). Sie entscheiden, ob ein PR erstellt, ein Testlauf gestartet oder ein anderer Service informiert werden muss.
            
        4. **Tool‑Registry** implementiert, um Operationen einzelner Repos (z.B. wgx‑Actions, Datenbank‑Migrationsskripte, Deploy‑Skripte) als Tools zu registrieren. Agents können diese Tools mittels JSON‑Schemas ansprechen.
            
3. **ACS‑Integration:**
    
    - ACS ist in den Orchestrator eingebettet: Jobs werden via API eingestellt, Logs gesammelt und im Web‑Leitstand angezeigt.
        
    - Die Dienst‑Skripte (`acs-run`, `acs-up`) können erweitert werden, um bei einem Update automatisch den Orchestrator mit zu erneuern (z.B. Pull, venv‑Aktualisierung, systemd‑Restart).
        
    - ACS‑Endpunkte können „multi‑repo“‑Operationen (z.B. „Deploy Heimgewebe“, „Teste alle Orgeln“) anstoßen, die der Orchestrator ausführt.
        
4. **Jules‑CLI / Copilot‑SDK‑Ablösung:**
    
    - Kurzfristig kann man die Copilot‑SDK nutzen, um generativen Code zu erzeugen. Die Agents leiten die SDK‑Anfragen: sie formulieren Anweisungen, der SDK liefert Code‑Funktionen/PRs, ACS validiert/merged.
        
    - Langfristig soll eine eigene Infrastruktur entstehen:
        
        - Einsatz lokal laufender LLMs (z.B. über `hausKI`), die denselben Agenten‑Runtime‑API ansprechen.
            
        - Nutzung eigener Tools (semantAH, wgx, hausKI‑audio) statt proprietärer Copilot‑Tools.
            
        - Agents werden in `heimgeist` trainiert, um Heimgewebe‑spezifische Aufgaben zu verstehen.
            

### Umsetzungsschritte

1. **Repository‑Analyse & Dokumentation**: Jedes Repo erhält ein `README` mit klarer Beschreibung seines Zwecks, seiner API und wie es per Orchestrator genutzt wird.
    
2. **Tool‑Abstraktion**: Für jede wiederkehrende Aktion in einem Repo wird ein Tool‑Schema definiert (Input/Output). Diese werden im Orchestrator registriert.
    
3. **Agent‑Runtime**:
    
    - Agents nutzen den Tool‑Katalog, semantAH zur Anweisungserkennung und hausKI als LLM‑Backend.
        
    - Planner‑Agenten werden in `hauslern` trainiert, um aus natürlichen Fragen sinnvolle Tool‑Sequenzen zu bauen.
        
4. **Monitoring/Leitstand**:
    
    - ACS zeigt Metriken, Logs und Job‑Status an.
        
    - Leitstand‑Frontends integrieren Graphen aus `heimgeist` (Sensoren, Temperatur, Logs) sowie Orchestrator‑Jobs.
        
5. **Migration von Copilot‑SDK**:
    
    - Schrittweise Ersetzen der GitHub‑SDK‑Aufrufe durch eigene LLM‑gestützte Tools.
        
    - Aufbau eines „HausCode‑Bots“ in `hausKI`, der Patches generiert, PR‑Beschreibungen erstellt und Unit‑Tests vorschlägt.
        

### Fazit

Ein autopoetisches Heimgewebe entsteht durch die Kombination aus:

- **ACS** als zentraler Leitstand/REST‑Gateway,
    
- einem **Multi‑Repo‑Orchestrator** mit Event‑Bus, Tool‑Registry und Agent‑Kernel,
    
- den **organ‑spezifischen Repos**, deren Funktionen als Tools verfügbar gemacht werden, und
    
- einer schrittweisen **Ablösung der Copilot‑SDK** durch eigene, lokal trainierte Agenten.
    

Diese Architektur ermöglicht, dass alle „Organe“ des Heimgewebes zusammenarbeiten: Änderungen in einem Repo propagieren automatisch zu abhängigen Modulen, AI‑Agenten generieren Patches und der Leitstand behält stets den Überblick.

According to a document from (unknown date), hier ist ein **neu aufgesetzter, korrigierter Plan**, wie du **GitHub Copilot SDK + Heimgewebe-Repos + ACS** zusammen betreibst — ohne Repo-Zwecke zu verwursten, und mit klaren Schnittstellen (Contracts-first) als Drift-Schutz.

---

## Dialektische Erörterung

### These

Du kannst die „Power“ von Jules Web **nicht 1:1 kopieren**, aber du kannst **einen operativen Kern** bauen, der (a) in ACS eingebettet ist, (b) Multi-Repo-Arbeit agentisch ausführt, und (c) Heimgewebe-typisch über **Contracts + Artefakte + WGX** abgesichert wird. Der Gamechanger ist: **Copilot SDK als vorläufiger Agent-Engine**, während ACS die **Kontrollfläche** bleibt (Lenkrad, nicht Autopilot).

### Antithese

Wenn du Copilot SDK „direkt“ in alle Repos loslässt, bekommst du:

- **Semantik-Drift** (Agent editiert irgendwo, ohne Organismus-Kontext).
    
- **Policy-Brüche** (Events≠Commands, Contracts-first, Fleet-SoT etc.).
    
- **Sicherheitsrisiko** (Tokens/Push/PR unkontrolliert).
    

Kurz: ohne **Orchestrator-Schleusen** wird es ein schneller, aber systemisch blinder Code-Bär.

### Synthese

Baue **einen Orchestrator im ACS**, der Copilot SDK nutzt, aber:

1. **Scope** (welche Repos/Pfade) erzwingt
    
2. **Contracts/Guards** (wgx) vor Merge/PR zwingt
    
3. **Artefakte** (chronik/observatory) schreibt, damit Leitstand sehen kann, was passiert
    
4. **Engine austauschbar** macht (Copilot heute, eigene Engine später)
    

---

## Korrigierte Rollen der Organe (nur das Nötigste, aber richtig)

Aus deinem Dump (gekürzt auf die Integrationsrelevanz):

- **metarepo**: Control-Plane / Fleet-Quelle / interne Contracts (Contracts-first ist hier zu verankern).
    
- **contracts-mirror**: _nur_ externe API-Contracts.
    
- **wgx**: Fleet-Motorik + Guards/Smoke + Metriken („Durchsetzung vor Vertrauen“ praktisch).
    
- **chronik**: Event-Store / Zeitachse / Replay.
    
- **aussensensor**: Außen-Ingest → chronik.
    
- **semantAH**: Insights/Graph/Verdichtung → liefert an hausKI/heimgeist/leitstand.
    
- **leitstand**: UI/Beobachtung (nicht Handeln). (im Organismuskanon aus deinen Erinnerungen; im Dump hier nur indirekt)
    
- **agent-control-surface (acs)**: lokale Control-Surface, Patch/PR-Wizard, Sessions/Diff; explizit **kein Autopilot**.
    

---

## Zielarchitektur: „ACS Orchestrator“ mit Copilot SDK

### 1) Prozess-Topologie (was läuft wo)

**Auf heimserver**

- `agent-control-surface.service` startet ACS (uvicorn, 127.0.0.1:8099). (hast du bereits)
    
- **neu**: ein _Orchestrator-Modul_ im ACS-Prozess _oder_ als Sidecar-Service (empfohlen: Sidecar, damit Abstürze nicht UI töten)
    
- Orchestrator startet/verwaltet **Copilot CLI im Server-Mode** und spricht via **Copilot SDK (Python) über JSON-RPC**.
    

**Auf Clients (Pop!_OS / iPad)**

- Zugriff auf ACS per **SSH LocalForward** (127.0.0.1:8099 lokal). (dein Runbook-Pattern)
    

### 2) Schnittstellen-Design (damit es Heimgewebe bleibt)

**ACS UI → Orchestrator**: _Commands_ (explizite Aktionen)  
**Orchestrator → Heimgewebe**: (a) Git/Branches/PRs, (b) WGX Guards, (c) Events nach chronik, (d) Observatorium-Artefakte für leitstand

Minimaler „Contract“ (intern, im metarepo zu verankern, aber du kannst ihn prototypisch in ACS anfangen):

- `orchestrator.task.request` (Input: Ziel, Repo-Scope, Policy-Level, erlaubte Tools)
    
- `orchestrator.task.result` (Output: Patch/PR-Refs, Guard-Ergebnisse, Risiken, Unsicherheit)
    

### 3) Tooling-Strategie (Copilot SDK sicher einhegen)

Copilot SDK kann von sich aus „alles“ (Dateien, Git, Web etc.). Du willst aber Heimgewebe-typisch:

- **Allowlist**: nur Fleet-Repos + definierte Pfade (du hast bereits Allowlist-Hinweis in ACS).
    
- **Guard-Gate**: _jede_ schreibende Aktion muss vor PR:
    
    - `wgx guard` (Contracts/Schema/Format)
        
    - optional `wgx smoke` (sanity tests)
        
- **Branch-Policy**: niemals auf `main/master` schreiben (du siehst ja, dass UI das schon blockt).
    

---

## Konkreter Integrationsplan in 3 Phasen

### Phase 1 — „Copilot als Motor, ACS als Getriebe“ (sofort umsetzbar)

1. **ACS bekommt Orchestrator-Endpunkte** (minimal):
    
    - `POST /api/orch/plan` (nur Plan/Preview, keine Writes)
        
    - `POST /api/orch/exec` (führt aus, aber nur in Branch)
        
2. Orchestrator implementiert „Safe Repo Workspace“:
    
    - nutzt Fleet-Liste (aus metarepo) als Quelle, checkt Repos lokal aus
        
3. Copilot SDK Session läuft serverseitig (heimserver), nicht auf Client.
    
4. Ergebnis wird als **Patch + diffstat + Guard-Report** in ACS angezeigt
    
5. ACS Git-Wizard bleibt der menschliche „final click“ (optional: später automatisierbar)
    

### Phase 2 — „Multi-Repo Tasks, WGX enforced, Chronik sichtbar“

1. Ein Task darf **mehrere Repos** anfassen, aber nur wenn:
    
    - Task enthält Repo-Scope explizit
        
    - Pro Repo eigener Branch
        
2. Orchestrator schreibt Events nach chronik:
    
    - „Task gestartet“, „PR erstellt“, „Guard fail“ etc. (damit leitstand/semantAH später materialisieren können)
        
3. WGX liefert `fleet.health`/`metrics.snapshot` (leitstand konsumiert)
    

### Phase 3 — „Engine austauschbar: Copilot raus, eigene Infrastruktur rein“

Du ersetzt Copilot nicht „auf einen Schlag“, sondern über ein Interface:

- `AgentEngine` (Plan → ToolCalls → FileEdits → Result)
    
    - **Backend A**: Copilot SDK (heute)
        
    - **Backend B**: eigenes (später), z.B. lokales LLM + MCP-Tools + deterministic planners
        

Wichtig: Das Heimgewebe-Wissen (Contracts/Artefakte/WGX) sitzt **im Orchestrator**, nicht in der Engine. Dann ist die Engine wirklich austauschbar.

---

## Operative Fixes, die dir gerade direkt in die Quere kommen (acs vs acs-up)

**Befund:** `acs-up` scheitert, wenn der Tunnel-Port 8099 schon belegt ist (`Address already in use`). Das passiert genau dann, wenn bereits ein Forward aktiv ist (z.B. `ssh -N acs` läuft). Das ist konsistent mit deinem Log.

**Korrekturprinzip für acs-up:**

- **nicht** „immer tunnel starten“
    
- sondern: „wenn Port belegt → _verwenden_ statt starten“
    
- optional: `acs-up` nutzt **anderen lokalen Port** (z.B. 18099) und ruft dann serverseitig lokal `curl 127.0.0.1:8099/api/health` ab (ohne Tunnel-Healthcheck)
    

Wenn du willst, gebe ich dir dafür einen _wirklich_ minimalen `git apply` Patch (2–5 Zeilen) speziell für `acs-up`, damit du sofort testen kannst.

---

## Runbook/Blueprint als Markdown (zum Einchecken)

```markdown
# Heimgewebe Agentik: ACS + Copilot SDK Integration Blueprint

## Zweck
ACS ist die Control-Surface. Ein Orchestrator im/bei ACS führt agentische Multi-Repo-Arbeit aus.
Copilot SDK ist vorläufige Agent-Engine, wird später durch eigene Engine ersetzt.

## Rollen (kurz)
- metarepo: Control-Plane, Fleet-SoT, interne Contracts
- contracts-mirror: externe API-Contracts
- wgx: Guards/Smoke/Metriken/Fleet-Motorik
- chronik: Event-Store (Timeline)
- semantAH: Insights/Graph/Verdichtung
- leitstand: Beobachtung/UI
- agent-control-surface (acs): UI + sicherer Git-Wizard (kein Autopilot)

## Architektur
Client (Pop!_OS/iPad) -> SSH LocalForward -> ACS (127.0.0.1:8099 auf heimserver)
ACS -> Orchestrator (sidecar empfohlen)
Orchestrator -> Copilot SDK (Python) -> Copilot CLI server-mode (JSON-RPC)
Orchestrator -> Git/WGX -> PRs + Guard-Reports
Orchestrator -> chronik events -> leitstand observability

## Safety Gates
- Allowlist Repos/Pfade
- Keine Writes auf main/master
- Jede PR muss wgx guard (und optional smoke) bestehen
- Artefakt-Logging nach chronik

## Phasen
1) Single-Repo agentische Tasks (Plan/Exec getrennt)
2) Multi-Repo Tasks + chronik visibility + wgx enforced
3) Engine austauschbar (Copilot raus, eigene Engine rein)

## Known Issues
- acs-up darf keinen Tunnel starten, wenn 8099 lokal bereits belegt ist.
  Lösung: Port-Check -> reuse oder alternativer Port / serverseitiger Healthcheck.
```

---

## Prämissencheck + Fehlerprävention

- **Unsichtbare Prämisse**: „Copilot SDK = darf alles“. In Heimgewebe musst du das bewusst _einschränken_, sonst bricht dir Contracts-first in Wochen die Knochen.
    
- **Typischer Fehler**: Orchestrator-Wissen in die Engine zu verlagern („Prompt wird’s schon richten“). Das macht dich dauerhaft abhängig.
    
- **Gefahr**: Multi-Repo Writes ohne Guard-Gates → semantische Inkonsistenz, schwer debugbare Drift.
    

---

## Alternativwege (mindestens einer, grundsätzlich anders)

1. **MCP-first**: Statt Copilot SDK zuerst ein MCP-Tooling-Netz (wgx/tools/chronik/semantAH) bauen und Agentik später. Vorteil: harte Grenzen, weniger „Agent macht Quatsch“.
    
2. **Jules-cli als Engine**: ACS orchestriert nur, ruft `jules` lokal auf (Sessions/patch), Copilot SDK kommt später. Vorteil: weniger neue moving parts.
    

---

## Verdichtete Essenz

**Baue den Orchestrator als Heimgewebe-Gehirn (Contracts/WGX/Artefakte) und nutze Copilot SDK nur als austauschbaren Muskel.**

---

## Kleine, tiefgründig ironische Auslassung

Ein Agent, der „einfach nur schnell Code schreibt“, ist wie ein sehr motivierter Praktikant mit Presslufthammer in einer Kathedrale: beeindruckend effizient — bis man merkt, dass er die Statik nicht gelesen hat.

---

## Etymologie (kurz, nur die Schlüsselwörter)

- **Orchestrator**: von _Orchester_ (geordnete Vielheit) → nicht „mehr“, sondern „koordiniert“.
    
- **Autopoiesis**: gr. _auto_ (selbst) + _poiein_ (machen, hervorbringen) → selbsterhaltende Produktion, aber eben nur mit Membran (Contracts) statt Selbstauflösung.
    

---

## Ungewissheit (∴fore)

**∴fore Unsicherheitsgrad: 0.33**  
**Ursachen:**

- Ich habe hier **keinen direkten Repo-Tree** aller aktuellen Implementierungsdetails geöffnet (nur Dump-Ausschnitte/Blueprints), daher sind Pfade/Module für den Orchestrator-Teil teilweise Architekturvorschlag statt Ist-Zustand.
    
- Copilot SDK/CLI Details können in deiner Umgebung (Auth/Server-Mode) Implementierungsnuancen haben; im Dump ist es als Zielintegration beschrieben, nicht als nachgewiesene laufende Konfiguration.
    

---

Wenn du jetzt „minimal testen“ willst: sag mir nur, **in welchem Repo** du den nächsten Patch ausprobieren willst (acs oder metarepo). Ich liefere dir dann einen _wirklich_ minimalen `git apply` Patch (z.B. 1 neue Zeile in README oder 1 robustere Port-Check-Zeile), der garantiert nicht an Branch-Guards scheitert.

According to a document from (unbekannt; Dump-Zeitpunkt) ist die belastbare Grundlage für den neuen Plan:

- **Fleet-/Rollen-SoT** im metarepo: u. a. `hausKI` als „KI-Orchestrator (Rust)“, `heimlern` als Lern-/Policy-Schicht, `sichter` als Review-Agent, `heimgeist` als Meta-Agent/Beobachtung, `tools` als Skripte & Hilfsprogramme.
    
- **Dein Dump enthält als „4 Repos im Merge“** konkret: `heimgeist`, `heimlern`, `sichter`, `tools`.
    
- **`heimgeist`** hat bereits eine maschinenlesbare Selbstbeschreibung: konsumiert `heimgewebe.command.v1` und `events.plexer`, produziert `insights.*` und `actions.*` (und deklariert sich als „reflection_engine“).
    
- **`tools`** ist explizit „tooling / contracts“ und enthält `repoLens` zur Merge-Aufbereitung „für KIs“.
    

Damit kann man jetzt schon eine sinnvolle Integration bauen, ohne Repo-Zwecke zu halluzinieren.

---

## Dialektische Erörterung: Integration ACS + Copilot SDK + Heimgewebe-Organe

### These

Du baust **ACS** als Control-Surface und kapselst „Agentik“ als **Orchestrator-Sidecar**, das:

1. Kontext aus dem Organismus zieht (repoLens + Contracts/Repo-Matrix),
    
2. Tasks plant/ausführt (Copilot SDK vorläufig),
    
3. Ergebnisse als PRs + Artefakte zurück in den Organismus schreibt (wgx/chronik/leitstand),
    
4. und langfristig die Engine austauschbar hält (Copilot raus → eigene Engine/`hausKI` rein).  
    Rollenbild dafür ist im metarepo bereits angelegt (u. a. `hausKI` als Rust-Orchestrator).
    

### Antithese

„ACS + Agent“ kann leicht zur **Scheinautonomie** werden:

- Der Agent macht Edits, aber **ohne Contracts-first** wird das nur Textbewegung.
    
- Multi-Repo-Arbeit kippt in Drift, wenn kein **Fleet-SoT** (Repo-Matrix) als Planungsanker erzwungen wird.
    
- Wenn Observability nur „UI hübsch“, aber nicht „Auditierbarkeit“, fehlt die Autopoiesis: dann ist es ein Chatbot mit Git-Rechten.
    

### Synthese: „Autopoetisches“ Heimgewebe als geschlossenes Regelkreissystem

Autopoiesis (gr. _auto_ = selbst, _poiesis_ = Hervorbringen) heißt hier nicht „KI zaubert“, sondern:  
**Der Organismus erzeugt die Bedingungen seiner eigenen Korrektur** – über Contracts, Guards, Events, Reviews.

Das wird konkret so verdrahtet:

---

## Neuer Plan: GitHub Copilot SDK zusammen mit Heimgewebe betreiben (inkl. ACS)

### 0) Grundprinzipien (nicht verhandelbar)

1. **metarepo bleibt SoT** für Fleet/Rollen/Policies.
    
2. **Agentik schreibt nie direkt Wahrheit**, sondern nur PRs + Artefakte, die vom Organismus geprüft werden (WGX/Guards).
    
3. **Kontext kommt aus `tools/repoLens`**, nicht aus Bauchgefühl.
    
4. **Beobachtung/Reflexion ist ein Organ**: `heimgeist` produziert `insights.*`/`actions.*` – das muss in die Steuerung rein, nicht als Deko.
    

---

### 1) Topologie (Komponenten & Datenfluss)

**Client (Pop!_OS/iPad)**  
→ SSH-Tunnel → **ACS (agent-control-surface)**  
→ HTTP → **Orchestrator-Sidecar** (neu; lokaler Dienst am Heimserver)  
→ **Copilot SDK (Python)** → Copilot CLI server-mode (JSON-RPC)  
→ **Git + PR** (mehrere Repos)  
→ **WGX guard/smoke/metrics** (Fleet-Motorik)  
→ **chronik** (Events/Audit) → **leitstand** (UI/Beobachtung)  
→ **heimgeist** (Reflexions-/Handlungsartefakte) → zurück in Orchestrator (Plan-Update)

Warum Sidecar statt „alles in ACS“: ACS bleibt „sicherer Git-Wizard“ und UI; Agentik ist ein anderes Risikoprofil (Tool-Rechte, Laufzeiten, Secrets).

---

### 2) Orchestrator-Kern: drei Schleifen (Closed Loops)

#### Loop A — Kontext-Generierung (tools/repoLens)

- Orchestrator triggert repoLens-Merges (gezielt, nicht immer „max“) für **betroffene Repos**.
    
- Ergebnis ist ein maschinenlesbarer Kontext-Bundle pro Task:
    
    - Repo-Matrix/SoT-Anker (metarepo)
        
    - repoLens-Auszüge (tools)
        
    - ggf. `heimgeist`-insights als „aktueller Systemzustand“ (siehe Loop C).
        

#### Loop B — Ausführung (Copilot SDK als austauschbare Engine)

- Orchestrator ruft Copilot SDK für: Plan → Edit → Test/Guard → Commit/PR.
    
- Harte Gates:
    
    - **Branch-only**, niemals main/master (ACS kann das schon erzwingen; du hast es im UI gesehen).
        
    - Allowlist: welche Repos/Pfade dürfen angefasst werden.
        
    - Jeder Schritt schreibt ein Task-Log (für Audit).
        

#### Loop C — Organismus-Feedback (heimgeist/heimlern/sichter)

- **sichter** wird als „Review-Agent / Semantic Checks“ eingeplant (automatisierte PR-Checks + Kommentare).
    
- **heimlern** liefert Policy-/Lernrückkopplung (z. B. „welche Fehlertypen häufen sich“, „welche Contracts werden oft verletzt“).
    
- **heimgeist** produziert „insights“ und „actions“: das wird zur Planungsgrundlage für den nächsten Task (z. B. „Drift steigt in Achse X“).
    

So entsteht Autopoiesis: nicht „Agent macht alles“, sondern „System erzeugt Diagnosen und zwingt Verbesserungen“.

---

## Konkrete Einbindung der 4 Dump-Repos

### `tools` (tooling / contracts)

- Aufgabe im Plan: **Kontext-Pipeline** (repoLens) und Validations-Helfer.
    
- Integrationspunkt: Orchestrator ruft `python3 -m merger.lenskit...` auf und speichert Merge-Artefakte als Task-Anhang.
    

### `heimgeist` (reflection_engine)

- Aufgabe im Plan: **Systemzustand** + **Handlungsvorschläge** als Artefakte (`insights.*`, `actions.*`).
    
- Integrationspunkt: Orchestrator kann (später) `actions.*` als strukturierte „Next Tasks“ behandeln, aber zunächst nur als Observability.
    

### `heimlern` (Lern-/Policy-Schicht)

- Aufgabe im Plan: Regeln/Defaults, die aus vergangenem Erfolg/Misserfolg abgeleitet werden (Task-Template-Priorisierung, Risiko-Score).
    
- Integrationspunkt: Orchestrator schreibt „Task Outcome“-Events; heimlern verdichtet → neue Policy-Artefakte → Orchestrator liest.
    

### `sichter` (Review-Agent)

- Aufgabe im Plan: automatisierte Review-Linse: Semantik-/Contract-Verstöße, PR-Kommentare, ggf. Auto-Fixes.
    
- Integrationspunkt: Nach PR-Erstellung triggert Orchestrator „sichter review pass“; Ergebnis als Checks + Kommentare.
    

---

## ACS-Integration: Steuerung ohne Autopilot-Scham

ACS bleibt die **menschliche Schaltstelle**:

- Task anlegen (Ziel, betroffene Repos, Risiko-Level)
    
- Start/Stop Orchestrator-Run
    
- Live-Stream: Plan → Diff → Guards → PR-Link
    
- „Kill-Switch“ und „Rollback“ (PR schließen / Branch löschen)
    

Und ganz wichtig: ACS zeigt nicht nur „Success“, sondern **auch Unsicherheit**: „Welche Dateien hatte der Agent nicht im Kontext? Welche Annahmen waren interpoliert?“

---

## Mittelfristig Copilot ersetzen (ohne das System zu zerreißen)

Das gelingt nur, wenn Copilot **kein Architektur-Substrat** wird, sondern ein austauschbarer Motor:

### Engine-Abstraktion (ein Interface, zwei Implementierungen)

- `Engine.run(plan, context_bundle) -> edits + rationale + tool_log`
    
- Implementierung A: Copilot SDK (jetzt)
    
- Implementierung B: Eigene Engine (später), plausibler Zielanker ist `hausKI` als Rust-Orchestrator im Fleet-Bild.
    

Wichtiger Punkt: Die „Wahrheit“ liegt nicht in der Engine, sondern im **Contract-/Guard-System**.

---

## Vermeidbare Fehler (automatisch markiert)

1. **Repo-Zwecke weichzeichnen**: Genau das hat dich oben zu Recht geärgert. Gegenmittel: Repo-Matrix als SoT immer zuerst.
    
2. **Agent ohne Kontext**: Multi-Repo ohne repoLens führt fast sicher zu Drift. repoLens ist explizit dafür da.
    
3. **Observability ohne Audit**: Leitstand muss aus chronik/Artefakten gespeist werden, nicht aus UI-Logs.
    

---

## Risikoabschätzung

- Technisch: **mittel bis hoch** (Agent mit Git-Rechten, Multi-Repo-Kopplung). Hauptrisiko ist „breite, falsche Edits“.
    
- Organisatorisch: **mittel** (PR-Flut, Review-Überlast).
    
- Semantisch: **hoch**, wenn Contracts/Repo-Matrix nicht hart als Planungsanker gesetzt werden.
    

Risikominderung: Branch-only, Allowlists, WGX-Gates, PR-Pflicht, chronik-Audit.

---

## Alternativwege (mindestens zwei)

1. **Konservativ**: Copilot nur für _Plan + Patch-Vorschlag_, tatsächliches Editieren übernimmt ein deterministisches Patch-Tool (git apply), Guards entscheiden.
    
2. **Radikal**: `sichter` zuerst stärken (Review/Auto-Fix), Copilot nur als „Ideengeber“. Dadurch wird das System eher „selbstkorrigierend“ als „selbstprogrammierend“.
    

---

## Verdichtete Essenz

Du bekommst ein halbautomatisch programmierbares Heimgewebe, wenn du **Agentik als austauschbaren Motor** behandelst und **Contracts + repoLens + WGX + chronik** zur eigentlichen Steuerungslogik machst; `heimgeist/heimlern/sichter` liefern die Rückkopplung, ACS bleibt die sichere Schaltstelle.

---

## ∴fore — Ungewissheit (sichtbar)

- **Unsicherheitsgrad:** 0.27
    
- **Ursachen:**
    
    1. Ich habe die Rollen **nur** aus Repo-Matrix + den 4 Dump-Repos, nicht aus einem vollständigen Fleet-Snapshot aller Organe (epistemische Leerstelle).
        
    2. Konkrete Contract-Pfade für `chronik`/`leitstand`-Events sind hier nicht im Ausschnitt enthalten (Datenlage).
        
    3. „Wie ACS intern am besten Sidecars startet“ hängt von deinem aktuellen Deployment ab (OS-/Service-Kontext).
        

Produktiv oder vermeidbar? Teils produktiv (Architektur-Entwurf), teils vermeidbar (fehlt: konkrete Contract-IDs/Paths für die Orchestrator-Events).

---

## Eine tiefgründig ironische Auslassung (pflichtgemäß)

Das System soll sich selbst programmieren, aber nur unter der Bedingung, dass es zuerst lernt, sich selbst zu widersprechen – andernfalls ist es keine Autopoiesis, sondern nur automatisiertes Selbstbewusstsein mit Git-Zugriff. (Und das ist die Art von „Lebewesen“, die in freier Wildbahn Pull Requests auf main pusht.)

---

## Kleine Destabilisierung der Fragelogik (alternative Sinnachse)

Vielleicht ist das Ziel nicht „an Jules Web rankommen“, sondern **Jules Web zu domestizieren**: Du nutzt Copilot SDK nicht als Superhirn, sondern als austauschbaren Muskel. Das „Gehirn“ ist dein Organismus: Contracts, WGX, chronik, repoLens, und die drei Agent-Organe `heimgeist/heimlern/sichter`. Der Vergleich „Power“ kippt dann: nicht mehr „wer ist stärker“, sondern „wer ist prüfbarer“.

---

Wenn du willst, kann ich als nächsten Schritt eine **konkrete Orchestrator-Event-Spezifikation** skizzieren (welche Events nach chronik, welche Views in leitstand, welche ACS-API-Endpunkte). Dafür brauche ich aber die relevanten Contract-Dateien/IDs (Null-Interpolation, sonst wird es wieder schlampig).