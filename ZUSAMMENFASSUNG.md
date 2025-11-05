# Zusammenfassung des Wissens im Vault

Dieses Dokument fasst das Wissen zusammen, das in diesem Obsidian Vault enthalten ist. Es beschreibt ein Ökosystem von miteinander verbundenen Softwareprojekten, ihre gemeinsame Entwicklungsphilosophie und die nächsten Schritte in ihrer Entwicklung.

## Das Projekt-Ökosystem

Das Vault beschreibt vier Hauptprojekte, die ein zusammenhängendes Ökosystem bilden:

*   **weltgewebe:** Ein ambitioniertes soziales Web-Projekt mit einer klaren Vision. Es befindet sich derzeit in einer "Docs-as-Code"-Phase und basiert auf einem modernen Tech-Stack mit SvelteKit und Rust. Das Projekt legt großen Wert auf Datenschutz, Transparenz und Dezentralisierung.

*   **hauski:** Ein persönlicher, lokaler KI-Orchestrator, der ebenfalls auf Rust setzt. Der Fokus liegt auf Performance, Datenschutz und Offline-Fähigkeit. `hauski` soll Aufgaben wie Code-Analyse, Audio-Transkription und Wissensmanagement lokal ausführen.

*   **wgx:** Ein modulares Kommandozeilen-Werkzeug in Bash, das als einheitliche Schnittstelle dient, um Arbeitsabläufe in den anderen Repositories zu steuern und zu standardisieren. Es ist portabel und läuft unter Linux, macOS, Termux und WSL.

*   **semantAH:** Ein semantischer Suchindex, der wahrscheinlich als Komponente für die anderen Projekte dient. Die Entwicklung konzentriert sich auf die Implementierung der Kernfunktionalität der Ähnlichkeitssuche.

## Entwicklungsphilosophie und -prozess

Alle Projekte teilen eine gemeinsame Philosophie, die sich durch folgende Punkte auszeichnet:

*   **Datenschutz und Offline-Fähigkeit:** Die Projekte sind so konzipiert, dass sie die Daten der Nutzer schützen und so weit wie möglich ohne eine ständige Verbindung zum Internet funktionieren.
*   **Performance:** Es gibt klare Performance-Ziele und -Budgets, um sicherzustellen, dass die Software schnell und effizient ist.
*   **Hohe Codequalität:** Der Entwicklungsprozess legt großen Wert auf sauberen, gut dokumentierten und getesteten Code.
*   **Automatisierung:** Wiederkehrende Aufgaben werden durch den Einsatz von Tools wie `wgx`, Devcontainern und CI/CD-Pipelines automatisiert.
*   **Meta-Reflexion:** Der Entwicklungsprozess selbst wird kontinuierlich analysiert und verbessert, wie das Dokument `review zyklus.md` zeigt.

## Nächste Schritte

Die `to do`-Dateien geben einen klaren Einblick in die nächsten Schritte für jedes Projekt:

*   **hauski:** Die Priorität liegt auf der Verbesserung der Infrastruktur, der CI/CD-Pipeline und der Implementierung von Sicherheitsrichtlinien.
*   **semantAH:** Die Kernfunktionalität der Cosinus-Ähnlichkeitssuche soll implementiert werden.
*   **weltgewebe:** Die konzeptionelle Arbeit wird fortgesetzt, um Widersprüche zu beseitigen und die Spezifikationen vor der Implementierung zu schärfen.
*   **wgx:** Das Tool wird durch die Implementierung von Pre-Commit-Hooks, einer CI-Pipeline und einer besseren Dokumentation weiter verbessert.

## Prototyp

Die Datei `prototyp.md` enthält ein Bash-Skript, das eine Python-Flask-Webanwendung namens "HausKI Jukebox" erstellt und ausführt. Diese Anwendung dient als Steuerungspanel für einen Mopidy-Musikserver und ist ein Beispiel für die Art von lokalen, auf den Benutzer ausgerichteten Anwendungen, die im `hauski`-Projekt entwickelt werden sollen.
