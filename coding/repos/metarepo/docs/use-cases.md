# Use-Cases & Ablaufbeispiele

Diese Seite sammelt typische Arbeitsabläufe und verweist auf die passenden Skripte sowie
Detaildokumentation.

### Wie finde ich den richtigen Ablauf?

| Ziel | Einstieg |
| --- | --- |
| **Events testen** (Aussensensor → Leitstand → Heimlern) | Abschnitt [Außen-Event ingestieren & Policy-Feedback erhalten](#ingest-e2e) |
| **Flottenzustand prüfen** (Health, Drift, Index) | Abschnitt [Fleet-Gesundheitscheck & Drift-Erkennung](#2-fleet-gesundheitscheck--drift-erkennung) |
| **Templates ausrollen oder zurückholen** | Abschnitt [Templates in Sub-Repos aktualisieren](#3-templates-in-sub-repos-aktualisieren) |
| **Weitere Spezialfälle / Runbooks** | [Weitere Beispiele](#weitere-beispiele) |

<a id="ingest-e2e"></a>
## 1. Außen-Event ingestieren & Policy-Feedback erhalten

1. **Event vorbereiten** – neue Zeile in `aussensensor/export/feed.jsonl` schreiben und mit den
   Repo-Tools validieren (siehe [`aussensensor/docs/`](https://github.com/heimgewebe/aussensensor/tree/main/docs)).
2. **Ingest auslösen** – `scripts/e2e/run_aussen_to_heimlern.sh` im Metarepo ausführen oder den
   dort beschriebenen curl-Aufruf nutzen. Voraussetzungen siehe [docs/e2e.md](./e2e.md).
3. **Leitstand prüfen** – Panels / JSONL-Ablage im `leitstand`-Repo kontrollieren.
4. **Policy-Feedback einsammeln** – `heimlern` erzeugt `policy_feedback.jsonl`; Details siehe
   [`heimlern/docs/`](https://github.com/heimgewebe/heimlern/tree/main/docs).

## 2. Fleet-Gesundheitscheck & Drift-Erkennung

1. `just smoke` im Metarepo ausführen, um read-only Checks über alle Repos laufen zu lassen.
2. `wgx doctor --all` ruft detaillierte Drifts & Health-Indikatoren ab.
3. Optional `make all`, um [Org-Index](./org-index.md) und [Org-Graph](./org-graph.mmd) neu zu
   generieren.
4. Ergebnisse als Report in [`reports/sync-logs/`](../reports/sync-logs) dokumentieren
   (`just log-sync`).

## 3. Templates in Sub-Repos aktualisieren

1. Änderungen in `templates/**` im Metarepo vornehmen.
2. `./scripts/sync-templates.sh --push-to <repo> --pattern "templates/**"` für Ziel-Repo ausführen.
3. In Pull-Requests der Ziel-Repos Drift-Berichte (`reports/*.md`) beilegen.
4. Bei Rückportierungen `--pull-from` nutzen, um Verbesserungen aus Sub-Repos wieder aufzunehmen.

## Weitere Beispiele

- [Runbooks](./runbooks.md) – Detaillierte Schritt-für-Schritt-Anleitungen für Spezialfälle.
- [Fleet-Operations](./fleet.md) – Abläufe für Betriebsrunden (Smoke, Doctor, Rollouts).
- [WGX-Konzepte](./wgx-konzept.md) – Hintergrund zu `wgx`-Kommandos & Policies.
