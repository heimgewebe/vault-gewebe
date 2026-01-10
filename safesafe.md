Hier kommt eine präzise, ausführbare Anweisungsliste für Jules, basierend auf deinen drei Punkten — dialektisch geprüft, strukturell sauber, risikobewusst, ohne Gendern, mit Essenz + Pointe + Ungewissheit.
(Die Punkte sind in Form eines „Auftragspakets“ geschrieben, das Jules 1:1 als Issue, PR-Checklist oder wgx morph-Task verwenden kann.)

⸻

📦 Anweisungen für Jules

(für: Heimgewebe-Organisation, Stand 15.11.2025)

⸻

1) Weltgewebe vollständig vom Heimgewebe entkoppeln

🎯 Ziel

Das „Weltgewebe“ ist künftig kein Subsystem des Heimgewebes.
Alle direkten oder indirekten Verknüpfungen müssen entfernt werden, sowohl konzeptionell als auch technisch.

🛠️ Aufgabenliste für Jules
	1.	Contracts entkoppeln
	•	Im Repo contracts/ sämtliche heimgewebe/…-Einträge prüfen.
	•	Prüfen, ob:
	•	contracts/heimgewebe/…/v1/*.proto
	•	contracts/json/*.schema.json
auf weltgewebe Bezug nehmen.
	•	Falls ja:
alle weltgewebe-spezifischen Schemas, Protos, Fixtures und Verify-Jobs löschen.
	2.	Chronik vom Weltgewebe trennen
	•	In chronik:
	•	ADRs prüfen
	•	docs/api.md, operations.md, openapi.yaml auf mögliche Weltgewebe-Endpunkte durchsuchen
	•	alle Bezüge auf “Nodes”, “Karte”, “Ortsgewebekonto”, “Weber”, “Knoten” entfernen.
	•	Sicherstellen, dass Chronik wieder reines Ereignis-Repo für Aussen/HausKI ist.
	3.	hausKI-Verweise entfernen
	•	In hausKI-Dokumenten und Policies:
	•	alle textlichen Referenzen an „Weltgewebe“ streichen.
	•	In hausKI-Skripten:
	•	prüfen, ob es ingest-Routen oder Tools mit weltgewebe-Bezug gibt → löschen.
	4.	WGX-Sammlungen
	•	In allen .wgx/profile.yml und .ai-context.yml-sammlung-Ordnern:
	•	Einträge weltgewebe.ai-context.yml entfernen.
	•	Bei Reusable-Workflows sicherstellen:
	•	kein Repo erwartet „weltgewebe“ als Abhängigkeit.
	5.	Metarepo säubern
	•	In metarepo:
	•	globales Governance-Dokument anpassen
	•	weltgewebe aus CI-Matrix entfernen
	•	weltgewebe aus Fleet-Definitionen nehmen
	6.	Neue Repo-Grenze festlegen
	•	weltgewebe wird als eigenständiger unabhängiger Layer betrachtet.
	•	Keine impliziten Verknüpfungen mehr im Heimgewebe.

🧯 Risikoabschätzung
	•	Niedrig: Entfernen von Dateien ist reversibel, keine Laufzeitgefahren.
	•	Mittel: CI-Jobs könnten auf fehlende Dateien stoßen → sequentialle PRs nötig.

⸻

2) WGX Fixes ausarbeiten und stabilisieren (v1)

🎯 Ziel

WGX bekommt ein stabiles v1-Profil: Bash-only, klar definierte Profile, keine Rust-Installation, konsistente CI.

🛠️ Aufgabenliste für Jules
	1.	CI korrigieren
	•	In allen Repos die Zeilen entfernen:
	•	cargo install wgx
	•	cargo install --git … wgx

	2.	WGX als Bash-CLI fixieren
Prüfen und durchsetzen:
	•	wgx besteht aus:
	•	wgx (Dispatcher)
	•	cmd/ (Subkommandos)
	•	lib/ (Helper)
	•	In keinem Repo darf ein Cargo.toml für wgx liegen.
	3.	Profile vereinheitlichen
	•	Jedes Repo erhält ein .wgx/profile.yml nach Standardstruktur:

class: <repo-typ>
tasks:
  smoke: "<befehl>"
  guard: "<befehl>"
metrics:
  snapshot: "<befehl>"


	•	Repo-Typen harmonisieren:
	•	python-tool, rust-service, docs-only, meta

	4.	WGX-Reusable-Workflows
	•	Einen einzigen Reusable-Workflow bereitstellen:
	•	.github/workflows/wgx-guard.yml
	•	.github/workflows/wgx-smoke.yml
	•	Alle Repos auf diese zentralen Workflows umstellen.
	5.	WGX Toolchain konsolidieren
	•	Doppelte Skripte löschen:
	•	wgx-metrics-snapshot.sh → nur eine Version halten.
	•	Logging vereinheitlichen (wgx/lib/logging.bash).
	6.	WGX v1 Tag definieren
	•	Version „v1-stable“ erstellen
	•	Release Notes:
	•	„WGX ist Bash-only“
	•	„Profile-Konvention fixiert“
	•	„Fleet-Mechanismen umgesetzt“

🧯 Risikoabschätzung
	•	Mittel: Anpassungen in CI können vorübergehend Jobs brechen → Schritt-für-Schritt-Migration.
	•	Niedrig: Bash-only vereinfacht die Toolchain.

⸻

3) 

🔵 Essenz
	•	Weltgewebe wird komplett abgetrennt.
	•	WGX wird v1-stabilisiert (Bash-only, Profile vereinheitlicht, CI bereinigt).
	•	SemantAH Phase-0 wird im echten Vault vorbereitet, aber noch nicht schreibend aktiviert.

⸻

🎭 Ironische Auslassung

Das Heimgewebe war kurz davor, Weltgewebe einzuverleiben wie ein viel zu großer Mitternachts-Snack – jetzt darf es wieder getrennt verdauen.

⸻

∴ Ungewissheitsgrad

0.31 – relativ klar
Ursachen:
	•	Einige weltgewebe-Verknüpfungen könnten textlich noch versteckt sein
	•	WGX-Profile über viele Repos uneinheitlich → Fleißarbeit
	•	SemantAH hängt von Vault-Ordnerstruktur ab → lokale Abweichungen möglich
Produktive Unschärfe: Migration gut steuerbar.

⸻

Wenn du willst, schreibe ich dir die PR-Beschreibungen für die drei Maßnahmen direkt mit — oder ich generiere die passenden wgx morph-Patches automatisch.