Wir machen Nägel mit Köpfen – aber in kleinen, gut verdaulichen Stücken.

Ich schlage vor: Wir starten jetzt konkret mit C1 (Observatorium) und bereiten C2/C3 nur leicht vor. Also: heute bekommt Heimgewebe ein erstes, echtes „Themenradar“.

⸻

1. Prämissencheck (kurz)
	•	Du hast im Metarepo jetzt:
	•	Roadmap
	•	knowledge.observatory.schema.json
	•	project.scenario.schema.json
	•	Damit ist der logische nächste Schritt:
	•	Irgendetwas produziert ein knowledge.observatory-Dokument.
	•	Irgendwo kannst du es anschauen (notfalls noch ohne hübsches UI).

→ Also: Erst semantAH Observatorium-MVP, dann leitstand-Dummy, dann heimgeist Szenarien.

⸻

2. Nächster Schritt 1: Observatorium-MVP in semantAH

2.1 Ziel (konkret)

Ein kleiner Job/Command in semantAH, der:
	•	eine Handvoll Quellen nimmt (für MVP reicht 1 Vault-Note + 1 Dummy-Event),
	•	ein knowledge.observatory-JSON baut, das vom neuen Schema validiert wird,
	•	das Ergebnis z. B. nach data/observatory/observatory-<datum>.json schreibt.

2.2 To-do-Liste (ca. in dieser Reihenfolge)
	1.	Output-Verzeichnis festlegen
Z. B. im semantAH-Repo:
	•	data/observatory/ (liegt bei dir evtl. schon ähnlich als data/…)
	2.	Kleinen Job anlegen
Beispiel-Skelett (Pfade/Namen musst du ggf. an dein Repo anpassen):

// src/jobs/observatory_mvp.rs

use chrono::{DateTime, Utc};
use serde::Serialize;
use std::{fs, path::Path};

#[derive(Serialize)]
struct ObservatoryTopic {
    topic_id: String,
    title: String,
    summary: Option<String>,
    signals: Option<ObservatorySignals>,
    sources: Vec<ObservatorySource>,
    suggested_questions: Vec<String>,
    suggested_next_steps: Vec<String>,
    meta: Option<serde_json::Value>,
}

#[derive(Serialize)]
struct ObservatorySignals {
    activity_score: Option<f64>,
    conflict_score: Option<f64>,
    novelty_score: Option<f64>,
}

#[derive(Serialize)]
struct ObservatorySource {
    source_type: String,
    ref_: String,
    weight: Option<f64>,
    tags: Vec<String>,
}

#[derive(Serialize)]
struct KnowledgeObservatory {
    observatory_id: String,
    generated_at: DateTime<Utc>,
    source: String,
    topics: Vec<ObservatoryTopic>,
}

pub fn run_observatory_mvp(output_dir: &Path) -> anyhow::Result<()> {
    let now = Utc::now();
    let obs = KnowledgeObservatory {
        observatory_id: format!("obs-{}", now.to_rfc3339()),
        generated_at: now,
        source: "semantAH-observatory-mvp".to_string(),
        topics: vec![ObservatoryTopic {
            topic_id: "topic-heimgewebe-capabilities".to_string(),
            title: "Heimgewebe Capabilities 2026".to_string(),
            summary: Some(
                "Grobe Landkarte der geplanten Fähigkeiten: Observatorium, Intent, Szenarien, Selbst-Loop."
                    .to_string(),
            ),
            signals: Some(ObservatorySignals {
                activity_score: Some(0.8),
                conflict_score: Some(0.2),
                novelty_score: Some(0.7),
            }),
            sources: vec![ObservatorySource {
                source_type: "vault_note".to_string(),
                ref_: "vault-gewebe/organismus/heimgewebe-capabilities.md".to_string(),
                weight: Some(1.0),
                tags: vec!["plan".into(), "capabilities".into()],
            }],
            suggested_questions: vec![
                "Welche Capability soll als nächstes vertieft werden?".into(),
                "Wo fehlen noch Contracts oder Jobs im Organismus?".into(),
            ],
            suggested_next_steps: vec![
                "semantAH-Observatorium mit echten Cluster-Heuristiken füttern".into(),
                "Leitstand-Panel bauen, das Topics anzeigt".into(),
            ],
            meta: None,
        }],
    };

    fs::create_dir_all(output_dir)?;
    let file_name = format!("observatory-{}.json", now.format("%Y%m%d-%H%M%S"));
    let path = output_dir.join(file_name);
    let json = serde_json::to_string_pretty(&obs)?;
    fs::write(&path, json)?;
    Ok(())
}

Hinweis: Das ist bewusst „dumm“ – keine echten Cluster, aber Schema-konform und sofort sichtbar.

	3.	Job in dein CLI / deine Binärdatei einhängen
Irgendwo hast du eine main/CLI (z. B. src/bin/semantah-cli.rs oder ähnlich).
Dort:

mod jobs;

use std::path::PathBuf;
use clap::Parser; // oder was du nutzt

#[derive(Parser)]
enum Command {
    ObservatoryMvp {
        #[arg(long, default_value = "data/observatory")]
        output_dir: PathBuf,
    },
    // ...
}

fn main() -> anyhow::Result<()> {
    let cmd = Command::parse();
    match cmd {
        Command::ObservatoryMvp { output_dir } => {
            jobs::observatory_mvp::run_observatory_mvp(&output_dir)?;
        }
        // ...
    }
    Ok(())
}


	4.	Validation-Schritt gegen das Schema (optional, aber geil)
Wenn du irgendwo ajv oder eine Rust-JSONSchema-Lib nutzt, kannst du direkt:
	•	contracts/knowledge.observatory.schema.json laden
	•	das erzeugte JSON dagegen validieren
→ Das wäre der erste echte „Contract-First“-Test für das Observatorium.
	5.	Mini-Doc in semantAH
Eine kurze Ergänzung in README.md oder docs/ von semantAH:

## Observatory-MVP

SemantAH kann ein einfaches `knowledge.observatory`-Dokument erzeugen:

```bash
cargo run -- observatory-mvp --output-dir data/observatory

Das Ergebnis entspricht contracts/knowledge.observatory.schema.json aus dem Metarepo.





⸻

3. Nächster Schritt 2: Leitstand-Dummy-View

Sobald der Job läuft und JSONs im Filesystem liegen, kommt die kleinste mögliche Sicht darauf:

Ziel

Leitstand zeigt:
	•	eine Liste aller observatory-*.json Dateien,
	•	pro Datei: generated_at und die title der Topics.

To-dos (grob)
	1.	Endpoint oder File-Loader im leitstand
	•	Kleiner Endpoint /observatory (oder nur internes Modul), der:
	•	das Verzeichnis liest (z. B. via Konfig),
	•	jede Datei als KnowledgeObservatory lädt (serde),
	•	generated_at + Topic-Liste extrahiert.
	2.	Mini-UI-Komponente
	•	Very basic:
	•	Dropdown „Snapshot auswählen“
	•	Liste der Topics mit:
	•	Titel
	•	optional Activity-Score
In der ersten Version reicht jede x-beliebige Darstellung. Hauptsache: du siehst, dass der Organismus ein Themenbild von sich erzeugt.

⸻

4. Nächster Schritt 3: Heimgeist-Szenarien (Vorbereitung)

Das können wir danach angehen. Minimaler Plan:
	1.	Heimgeist-Job, der:
	•	ein bestimmtes topic_id (z. B. aus dem letzten Observatorium) nimmt,
	•	drei ProjectScenario-Objekte baut (konservativ/ambitioniert/experimentell),
	•	sie als JSON-Dateien oder event.line schreibt.
	2.	Später:
	•	Leitstand-Erweiterung: „Zu diesem Topic Szenarien anzeigen“.

Wenn du willst, kann ich dir im nächsten Schritt direkt ein Rust-Skelett für den Heimgeist-Szenarien-Job bauen, analog zu oben – mit minimal drei Szenarien und sauberem Schema-Anschluss.

⸻

5. Fehler- & Risikoabschätzung
	•	Pfade/Modulnamen stimmen evtl. nicht 1:1 mit deinen Repos überein.
→ Gegenmaßnahme: Code-Skelett als Vorlage sehen, nicht als 1:1-Patch. Erst rg observatory_mvp / rg jobs nutzen, Struktur abgleichen.
	•	Gefahr: du bleibst beim MVP stehen
→ Aber: selbst der „dumme“ Observatorium-Snapshot ist schon wertvoll, weil er:
	•	Contract testet,
	•	Leitstand-Integration übt,
	•	später leicht durch bessere Heuristiken ersetzt werden kann.
	•	Zu viel Magic im ersten Schritt
→ Deswegen: keine Clustering-Logik, keine Vektoren – nur 1–2 hartcodierte Topics mit echten Quellen-Refs. Semantik kommt später.

⸻

6. Verdichtete Essenz
	•	Nächster konkreter Schritt:
In semantAH einen kleinen Job bauen (observatory_mvp), der ein knowledge.observatory-JSON schreibt, und ihn per CLI aufrufbar machen.
	•	Direkt danach:
Im leitstand eine simple Ansicht, die diese JSONs einliest und Topics pro Snapshot anzeigt.
	•	Heimgeist/Szenarien kommen als nächster Block, wenn das Observatorium sichtbar ist.

Damit hast du den ersten echten Baustein deines „semantischen Observatoriums“ – noch nicht klug, aber schon existent. Sozusagen die Kindergartenzeichnung deines späteren Meta-Hirns.

⸻

7. Ungewissheitsanalyse

Unsicherheitsgrad: 0.27
	•	Ich kenne deine exakte semantAH- und leitstand-Ordnerstruktur nicht.
	•	Ob du Rust, TypeScript oder noch etwas anderes im Leitstand nutzt, ist nicht 100 % klar.
	•	Die Skelett-Codes sind deshalb bewusst generisch, damit du sie leicht anpassen kannst.

Wenn du magst, kannst du mir als nächstes kurz einen Auszug der semantAH-Struktur (z. B. tree -L 2) als Dump geben – dann kann ich den Job als wirklich passenden Patch gießen. Bis dahin sind die obigen Schritte aber schon ein gut gangbarer Fahrplan.