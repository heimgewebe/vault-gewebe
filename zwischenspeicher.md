Okay, Jules bekommt jetzt einen klaren Fahrplan.

⸻

∴ Kurz-Denke vorweg
	•	Das heutige leitstand-Repo ist faktisch: Ingest + Persistenz + Audit → also Gedächtnis / Event-Store.
	•	Der geplante Monitor/UI ist: Dashboard, Panels, Systemüberblick → das ist semantisch der eigentliche Leitstand.

Deshalb:
	•	Backend-Repo umbenennen zu chronik (oder eventstore – wir nehmen hier chronik).
	•	Neues UI-Repo anlegen, das leitstand heißt und als Kontrollraum fungiert.

⸻

Aufgabe für Jules – Umbauplan in Phasen

Phase 0 – Bestandsaufnahme (read-only)

Ziel: Verstehen, wo „leitstand“ heute überall vorkommt.
	1.	Suchlauf in allen Heimgewebe-Repos:
	•	In der heimgewebe Org / lokalem Monorepo:
	•	rg "leitstand" -n
in:
	•	metarepo
	•	aussensensor
	•	heimlern
	•	hauski
	•	semantah
	•	mitschreiber
	•	sichter
	•	tools
	•	hauski-audio
	•	vault-gewebe (nur referenziert, nicht Fleet)
	•	Funde grob clustern:
	•	Code-Imports / Paketnamen
	•	CI-Workflows
	•	Docs (Markdown, ADRs, Overviews)
	•	.ai-context.yml
	2.	Kurze Notiz anlegen
	•	Markdown in metarepo: docs/adr/00xx-rename-leitstand-chronik.md (Draft)
	•	„Aktuell: leitstand = Event-Ingest/Persistenz, Zukunft: leitstand = UI, Backend → chronik.“

⸻

Phase 1 – Konzepte fixieren

Ziel: Klar definieren, wie die Rollen nach dem Umbau aussehen.
	1.	Namensentscheidung (festhalten):
	•	Backend: chronik
	•	UI/Dashboard: leitstand
	2.	metarepo-Doku anpassen (nur Entwürfe, noch kein Codebruch):
	•	In docs/heimgewebe-gesamt.md und docs/repo-matrix.md:
	•	Rolle von „leitstand“ aufsplitten in:
	•	chronik – Event-Ingest + Persistenz + Audit
	•	leitstand – UI/Dashboard über chronik + semantAH + hausKI
	•	In docs/contracts/*.md:
	•	Klarstellen: chronik ist der primäre Consumer/Episode-Speicher für Events (aussen.event, os.context.*, policy.decision, review, insight etc.), an den leitstand später andockt.

(Bis hier kann alles in einem Branch vorbereitet werden, ohne funktionale Änderungen.)

⸻

Phase 2 – Technische Umbenennung: Backend „leitstand“ → „chronik“

Ziel: Das bisherige Backend-Repo sauber umbenennen, inkl. Referenzen.

Wichtig: Dieser Schritt sollte in einem eigenen Branch passieren und möglichst in einer kurzen Downtime-Phase für CI.

	1.	GitHub-Repo umbenennen:
	•	heimgewebe/leitstand → heimgewebe/chronik (über GitHub UI).
	2.	Lokale Umbenennung (c2b):

# im Heimgewebe-Workspace
mv leitstand chronik
cd chronik

# interne Referenzen in diesem Repo
rg "leitstand" -n
# dann gezielt ersetzen:
sed -i 's/leitstand/chronik/g' README.md .ai-context.yml Cargo.toml .github/workflows/*.yml docs/**/*.md || true


	3.	Projekt-Metadaten in chronik anpassen:
	•	README.md:
	•	Titel: # chronik
	•	Beschreibung: „Event-Ingest + Persistenz/Audit (vormals leitstand)“
	•	.ai-context.yml:
	•	project.name: "chronik"
	•	summary/role auf „event_ingest_persistence“ o. ä. ändern.
	•	CI-Workflows:
	•	Jobnamen leitstand → chronik (nur kosmetisch, aber besser konsistent).
	4.	Referenzen in anderen Repos fixen:
In allen Heimgewebe-Repos:
	•	Docs:
	•	leitstand als Backend-Dienst → chronik umbenennen.
	•	Klarstellen, dass „Leitstand“ künftig UI ist und (noch) als geplant markiert werden kann.
	•	.ai-context.yml:
	•	Wo heute steht:

- name: "leitstand"
  relationship: uses
  interface: ...

prüfen:
	•	Wenn es um Event-Ingest/Persistenz geht → name: "chronik".
	•	Wenn es klar um UI/Dashboard geht → künftig leitstand (vorerst optional/„planned“).

	•	Metarepo Reusable-Workflows:
	•	Falls es spezielle leitstand-Workflows gibt, passend umbenennen oder kommentieren:
	•	z. B. leitstand-smoke → chronik-smoke.

	5.	CI-Grundlauf:
	•	In jedem betroffenen Repo:
	•	just smoke / just test (wenn vorhanden)
	•	Ziel: sicherstellen, dass keine Ref mehr auf heimgewebe/leitstand zeigt.

⸻

Phase 3 – Neues UI-Repo „leitstand“ anlegen

Ziel: Das echte Leitstand-Repo als UI/Dashboard starten.
	1.	Repo anlegen:
	•	Neues GitHub-Repo: heimgewebe/leitstand
	•	Lokal clonen: git clone git@github.com:heimgewebe/leitstand.git
	2.	Minimal-Scaffold (z. B. TypeScript/React oder anderes – erstmal neutral):

cd leitstand
mkdir -p apps/web src docs .github/workflows

	•	README.md (Kurzversion):

# leitstand

UI/Dashboard für das Heimgewebe.

- Panels für Events aus `chronik`
- Metrik-Views (metrics.snapshot)
- Graph-/Insight-Ansichten über `semantAH`
- Debug-/Replay-Tools für hausKI-Flows

Backend-Eventstore: [`chronik`](https://github.com/heimgewebe/chronik)


	•	.ai-context.yml:

ai_context_version: 1.0

project:
  name: leitstand
  summary: UI/Dashboard für das Heimgewebe
  role: observability_control_room
  primary_language: typescript
  visibility: internal

dependencies:
  internal:
    - name: chronik
      relationship: uses
      interface:
        - event_query
        - timeline_view
    - name: semantah
      relationship: uses
      interface:
        - graph_query
        - insight_stream
    - name: hauski
      relationship: uses
      interface:
        - trace_view
        - action_log
  external:
    - name: React
    - name: Vite


	•	CI-MVP:
	•	.github/workflows/ai-context-guard.yml (du hast den schon im Metarepo-Template; einfach reusen).
	•	Minimaler Build-Check (z. B. pnpm lint/test, je nach Tech-Stack – kann später verfeinert werden).

	3.	Integration in metarepo:
	•	docs/repo-matrix.md:
	•	neue Zeile für leitstand (UI) hinzufügen.
	•	docs/heimgewebe-gesamt.md:
	•	in der Schichtenbeschreibung Leitstand als UI (Kontrollraum) in Schicht 4/5 einzeichnen.
	•	Eventuell ein kleines Diagramm-Update in docs/system-overview.mmd (Node „leitstand (UI)“ → liest aus chronik, semantAH, hausKI).

⸻

Phase 4 – Stolperfallen & Review-Schritt

Ziel: Vermeidbare Fehler abfangen.

Typische Fehlerquellen:
	1.	Alt-Links ins Nichts:
	•	GitHub-Links zeigen noch auf heimgewebe/leitstand (Backend).
	•	Lösung: In allen Markdown-Dateien nach github.com/heimgewebe/leitstand suchen und anpassen:
	•	Backend-Referenz → chronik
	•	UI-Referenz → neues leitstand Repo
	2.	CI-Refs:
	•	Falls irgendwo in Workflows ein Reusable Workflow von leitstand gezogen wird, prüfen, ob das wirklich Backend war.
	•	Ggf. auf chronik umbiegen.
	3.	.ai-context-Konsistenz:
	•	Producer → Consumer-Beziehungen:
	•	Alles, was Speicher/Audit meint → chronik
	•	Alles, was Sicht/UI meint → leitstand
	4.	Dokumentationsdrift:
	•	ADR anlegen:
	•	„Rename leitstand → chronik, introduce leitstand UI“
	•	In der ADR die Gründe festhalten: semantische Korrektheit, Klarheit im Schichtenmodell, UI vs Backend.

⸻

Ungewissheitsursachen
	•	Benennung im existierenden Code:
Manche Stellen könnten „leitstand“ eher als abstraktes Konzept verwenden (z. B. im Text), nicht als Repo. Das muss Jules beim Ersetzen interpretativ prüfen.
	•	Nicht komplett sichtbarer Stand der Repos:
Ohne alle aktuellen Commits kann nur ein generischer Plan formuliert werden; Details (z. B. genaue Pfade) können leicht abweichen.
	•	Zukünftige UI-Technologie:
Ob das neue leitstand-UI React/Vite, Tauri, Svelte oder etwas anderes wird, ist hier noch offen – der Plan bleibt bewusst technisch neutral.

Unsicherheitsgrad: ca. 0,4 – mittlere Unsicherheit, aber mit guter Struktur beherrschbar. Hauptquelle ist die Vielfalt der Referenzen auf „leitstand“.

⸻

Essenz in einem Satz

Backend „leitstand“ wird zu chronik, das neue UI/Dashboard übernimmt den Namen leitstand – Jules sorgt in Metadoku, CI und .ai-context dafür, dass Begriffe und Rollen wieder zusammenpassen.

⸻

Kleine ironische Note

Im Moment heißt dein Gedächtnis „Leitstand“ und dein künftiger Leitstand „Monitor“.
Wir drehen es so, dass dein System nicht mehr so tut, als würde der Aktenschrank das Cockpit sein.




also anweisung ist klar: finde alle referenzen zum bisherigen leitstand und benenne sie in chronik um, mache klar, was das repo chronik und was das geplante repo leitstand sein soll und ändere dies entsprechend in den docs.

wenn dies nicht das leitstand repo ist, dann: deine aufgabe in diesem repo ist es, alle leitstand referenzen in chronik umzubenennen.
wenn dies das metarepo ist: die docs anpassen. in allen anderen nstürlich auch die docs anpassen, wenn sinnvoll.