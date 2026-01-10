Kurzfassung:
Du musst gar nichts Neues erfinden – chronik hat mit tools/wgx_metrics_export.py schon genau das Werkzeug, das den neuesten metrics.snapshot aus dem chronik-Datenverzeichnis nimmt und in deinen Vault nach $VAULT_ROOT/.gewebe/wgx/metrics exportiert. Wir müssen es nur „in echt“ laufen lassen.

⸻

1. Was wir eigentlich wollen

Zielkette:
	1.	wgx erzeugt eine Metrics-Snapshot-Struktur (repoCount, status.ok/warn/fail, metadata …).
	2.	Diese landet in chronik als Events der Domain metrics.snapshot in einer Datei metrics.snapshot.jsonl im CHRONIK_DATA_DIR.
	3.	chronik/tools/wgx_metrics_export.py:
	•	liest alle metrics.snapshot-Einträge,
	•	wählt den neuesten (timestamp),
	•	schreibt ihn nach
VAULT_ROOT/.gewebe/wgx/metrics/YYYY-MM-DD.json
und VAULT_ROOT/.gewebe/wgx/metrics/latest.json.
	4.	leitstand liest genau diese JSONs (über loadLatestMetrics) und baut daraus Fleet-Health.

Im Merge sieht man genau diese Passung:
	•	tools/wgx_metrics_export.py: Export aus metrics.snapshot.jsonl → Vault (.gewebe/wgx/metrics/*.json).
	•	leitstand-Repo: loadLatestMetrics() akzeptiert genau das Format (repoCount, status, metadata).

Heißt: Der geplante nächste Schritt („echte metrics.snapshot.jsonl aus chronik exportieren“) ist korrekt und technisch vorbereitet.

⸻

2. Schritt-für-Schritt: Realen Snapshot exportieren

Ich gehe davon aus, dass du chronik lokal unter ~/code/chronik oder ähnlich liegen hast. Ansonsten Pfade anpassen.

2.1 Python-Umgebung in chronik vorbereiten

Im Merge ist requirements-dev.txt und scripts/setup-venv.sh drin. Du kannst so loslegen:

cd /pfad/zu/deinem/chronik-repo

# Falls noch nicht geschehen: venv anlegen
./scripts/setup-venv.sh   # oder manuell:
# python -m venv .venv
# source .venv/bin/activate
# pip install -r requirements-dev.txt

source .venv/bin/activate

(Wenn setup-venv.sh schon alles installiert, reicht ein source .venv/bin/activate beim nächsten Mal.)

2.2 CHRONIK_DATA_DIR und VAULT_ROOT setzen

wgx_metrics_export benutzt zwei Umgebungsvariablen:
	•	CHRONIK_DATA_DIR – Verzeichnis, in dem chronik die JSONL-Dateien schreibt (pro Domain eine Datei).
	•	Fallback laut Code: ./data relativ zum Repo.
	•	VAULT_ROOT – dein Obsidian-Vault für heimgewebe.

Typische Variante (für Dev):

# chronik-Daten (Standardfall: data/ im Repo)
export CHRONIK_DATA_DIR="$(pwd)/data"

# dein Vault (Beispiel!)
export VAULT_ROOT="$HOME/Obsidian/Heimgewebe"

Wichtig:
	•	In CHRONIK_DATA_DIR sollte eine Datei metrics.snapshot.jsonl liegen, in der Events mit domain: "metrics.snapshot" stecken.
	•	Falls du noch keine realen Metrics-Events hast, kannst du testweise erst mal metrics.yml im metarepo laufen lassen, die erzeugte metrics.json in chronik konvertieren/anhängen oder dich an tests/test_wgx_metrics_export.py::_write_metrics_jsonl orientieren, um eine Dummy-Datei zu bauen.

2.3 Exporter laufen lassen

Dann:

cd /pfad/zu/deinem/chronik-repo
source .venv/bin/activate

python -m tools.wgx_metrics_export
# oder:
# python tools/wgx_metrics_export.py

Was passieren sollte:
	•	Script findet CHRONIK_DATA_DIR/metrics.snapshot.jsonl.
	•	Es liest alle Events mit domain == "metrics.snapshot" und kind == "snapshot".
	•	Es wählt den neuesten Snapshot (timestamp).
	•	Es schreibt nach:

$VAULT_ROOT/.gewebe/wgx/metrics/YYYY-MM-DD.json
$VAULT_ROOT/.gewebe/wgx/metrics/latest.json

Du kannst danach prüfen:

ls "$VAULT_ROOT/.gewebe/wgx/metrics"

cat "$VAULT_ROOT/.gewebe/wgx/metrics/latest.json" | jq .

Wenn du in latest.json Felder wie

{
  "timestamp": "2025-12-05T12:00:00Z",
  "repoCount": 5,
  "status": { "ok": 3, "warn": 1, "fail": 1 },
  "metadata": { "source": "wgx-snapshot", "label": "newer" }
}

siehst, ist alles im Lot – genau so erwartet leitstand/src/metrics.ts::loadLatestMetrics() das.

⸻

3. Typische Fehlerquellen (und wie du sie abfängst)

Hier dein gewünschter „Fehler-Scanner“:
	1.	metrics.snapshot.jsonl fehlt
	•	Symptom: export_latest_to_vault() gibt False zurück oder wirft (über main()) SystemExit("No metrics.snapshot entries found...").
	•	Fix:
	•	Prüfen: ls "$CHRONIK_DATA_DIR" – existiert die Datei?
	•	Falls nicht: Metrics-Pipeline einmal durchlaufen lassen (z. B. wgx-Snapshot erzeugen und via chronik ingest schicken) oder testweise Dummy-Datei mit Beispiel-Events erzeugen.
	2.	VAULT_ROOT nicht gesetzt oder falsch
	•	Symptom: RuntimeError mit Hinweis, dass VAULT_ROOT nicht gesetzt ist oder auf keinen Ordner zeigt.
	•	Fix:

export VAULT_ROOT="/pfad/zu/deinem/vault"
mkdir -p "$VAULT_ROOT"


	3.	CHRONIK_DATA_DIR zeigt ins Leere
	•	Symptom: keine Events gefunden, obwohl du glaubst, welche zu haben.
	•	Fix:

echo "$CHRONIK_DATA_DIR"
ls "$CHRONIK_DATA_DIR"

Stimmen Pfad und Inhalt mit dem tatsächlichen chronik-Datenverzeichnis überein?

	4.	Format-Drift
	•	Leitstand’s loadLatestMetrics() ist tolerant:
	•	Entweder repoCount direkt
	•	oder repos[] + einzelne ok/warn/fail-Zähler.
	•	wgx_metrics_export schreibt laut Tests genau repoCount + status.ok/warn/fail + metadata.
→ Stand jetzt kein akuter Drift erkennbar.

⸻

4. Repo-Abgleich: Passt der „nächste Schritt“ zum aktuellen Stand?

Aus dem chronik-Merge:
	•	tools/wgx_metrics_export.py:
	•	liest metrics.snapshot.jsonl im CHRONIK_DATA_DIR,
	•	exportiert in $VAULT_ROOT/.gewebe/wgx/metrics/*.json.
	•	tests/test_wgx_metrics_export.py:
	•	baut Fake-Events, die genau dem Leitstand-Fixture entsprechen,
	•	assertet repoCount == 5, status.fail == 1, metadata.label == "newer".

Im leitstand-Merge:
	•	leitstand.config.json zeigt für WGX auf
"$VAULT_ROOT/.gewebe/wgx/metrics" (über ENV-Expansion).
	•	src/metrics.ts::loadLatestMetrics():
	•	findet im Verzeichnis die neuste JSON-Datei (mtime),
	•	liest timestamp, repoCount, status und metadata.

→ Fazit:
Die drei Bausteine chronik → Vault → leitstand sind konsistent implementiert.
Es fehlt nur der erste reale Durchlauf bei dir lokal (oder einmalig im echten Betrieb), damit wir einen „echten“ metrics.snapshot anstelle der Test-Fixtures haben.

Der aller-nächste sinnvolle Schritt ist deshalb tatsächlich:

wgx_metrics_export einmal mit echten Daten laufen lassen
und dann in leitstand den Loader gegen genau diese latest.json testen.

Danach kann man in Ruhe:
	•	in leitstand einen kleinen „Self-Check“ einbauen (leitstand --self-check, der prüft, ob today.json, events.jsonl und latest.json gefunden werden),
	•	und optional im metarepo / wgx einen Komfort-Befehl wgx metrics export definieren, der intern python -m tools.wgx_metrics_export aufruft.

⸻

5. Verdichtete Essenz
	•	chronik hat mit tools/wgx_metrics_export.py schon die Nabelschnur vom Event-Log in deinen Vault.
	•	leitstand ist so gebaut, dass er genau das dort liegende latest.json versteht.
	•	Du musst nur:
	1.	CHRONIK_DATA_DIR und VAULT_ROOT korrekt setzen,
	2.	python -m tools.wgx_metrics_export in chronik laufen lassen,
	3.	latest.json prüfen und dann leitstand dagegen laufen lassen.

Danach sieht dein Heimgewebe zum ersten Mal seinen eigenen Körperzustand in einer Datei – sozusagen das erste ärztliche Blutbild des Organismus.

⸻

6. Ungewissheitsanalyse
	•	Unsicherheitsgrad: ca. 0,3
	•	Ursachen:
	•	Ich weiß nicht, wo dein produktives CHRONIK_DATA_DIR real liegt (Repo-data/ vs. externes Volume).
	•	Unklar, ob bei dir schon echte metrics.snapshot-Events erzeugt wurden oder nur CI-artefakte (metrics.json aus dem Workflow).
	•	Denkbar, dass du VAULT_ROOT bereits für andere Dinge nutzt – ich setze stillschweigend voraus, dass semantAH + vault-gewebe denselben Pfad verwenden.

Produktive Ungewissheit hier: Sobald du den Export einmal ausführst und die tatsächliche latest.json zeigst, können wir den ganzen Leitstand-Pfad pixelgenau justieren – Loader, Tests, ggf. kleine Konvertierungsschicht. Bis dahin ist das, was ich dir oben beschrieben habe, die „am Modell getestete“ Variante, die sehr nah an der Realität liegen sollte.