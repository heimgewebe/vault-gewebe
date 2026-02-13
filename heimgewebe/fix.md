Durch die Analyse der Code‑Diffs und der im Metarepo definierten Contracts zeigen sich diverse Inkonsistenzen in der Verwendung der Contract‑Pfade. Um die Single‑Source‑of‑Truth‑Philosophie des Heimgewebes zu wahren, sollten die einzelnen Repositories harmonisiert werden. Im Folgenden finden Sie konkrete Korrekturvorschläge je Repository.

---

### **Metarepo**

* **Canonical Paths:** Die neuen Schemas haben teilweise das falsche `$id` (z. B. `heimgewebe/contracts/…` statt `schemas.heimgewebe.org/contracts/…`). Sämtliche Contracts müssen einen gültigen canonical URI besitzen und dem Draft‑2020‑12‑Schema entsprechen.
* **Contracts vollständig definieren:** Für Chronik, Plexer und Heimlern fehlen oder widersprechen sich die Schema‑Definitionen. Beispiel: `event.batch.v1` definiert `next_cursor` als `string|null`, während der Code ihn als Integer behandelt. Der Contract sollte exakt dem implementierten Datentyp entsprechen, oder der Code muss angepasst werden.
* **Governance‑Files trennen:** `heimlern.ingest.state.meta.json` ist Metadaten (Produzenten/Konsumenten), kein JSON‑Schema. Es sollte außerhalb des `contracts/`‑Ordners (z. B. `contracts-meta/`) liegen, damit Validierungs‑Scripts nur echte Schemas einbeziehen.

---

### **Plexer**

* **URL‑Normalisierung & Auth:** Verwenden Sie in der Config pro Service ein `authKind` (bearer, x-auth, none). Die Weiterleitung setzt dann korrekt den Header `Authorization: Bearer …` oder `X‑Auth: …`.
* **Metrics zählen:** `failedCount` darf nicht additiv wachsen; nach jedem Retry‑Lauf muss der Count neu berechnet werden (Anzahl der noch offenen Events). `retryable_now`, `next_due_at` und `failed` sollten stets konsistent mit der Queue sein.
* **Persistenz robust machen:** Verwenden Sie `proper-lockfile` zum Sichern der `failed_forwards.jsonl`. Beim Start sollte nach liegengebliebenen `processing.*.jsonl`‑Dateien gesucht und diese wieder zurückgeführt werden.
* **Contract‑Verbindlichkeit:** Validieren Sie eingehende Delivery‑Reports und save‑FailedEvent‑Objekte gegen die passenden metarepo‑Contracts (`contracts/plexer/delivery.report.v1.schema.json` bzw. `contracts/plexer/failed_event.v1.schema.json`).
* **Status‑Endpoint:** `/status` sollte genau den Contract `plexer.delivery.report.v1` erfüllen: Feld `counts` hat `pending`, `failed` (optional `retried`, `delivered`); Felder `last_retry_at`, `last_error`, `retryable_now`, `next_due_at` dürfen `null` sein.

---

### **Leitstand**

* **Contract‑Vendoring:** Statt lokale Schemas zu definieren, nutzen Sie die canonical Contracts aus dem Metarepo (z. B. via npm‑Package `@heimgewebe/contracts` oder per automatisiertem Vendor‑Script).
* **Fetch‑Skripte härten:**

  * Verifizieren Sie SHA256 über den tatsächlichen Inhalt und vergleichen Sie ihn mit dem im Event übermittelten `sha`‑Feld (nicht nur „sha256:“‑Prefix).
  * Validieren Sie Artefakte gegen die vendored Contracts mit einem Ajv‑Singleton.
  * Nur zugelassene Hostnamen (z. B. `raw.githubusercontent.com`, `objects.githubusercontent.com`) dürfen geladen werden.
* **Event‑Handler:** Schicken Sie bei Event `knowledge.observatory.published.v1` den `sha` und `schema_ref` an das Fetch‑Script (Umgebungsvariablen `OBSERVATORY_SHA` und `OBSERVATORY_SCHEMA_REF`). Für Plexer‑Reports prüfen Sie den Payload gegen das Contract‐Schema und speichern ihn als `artifacts/plexer.delivery.report.json`.
* **Runbook / Panel:** Das „Plexer Delivery Status“‑Panel sollte `pending`, `failed`, optional `retryable_now`, `next_due_at` anzeigen und farblich zwischen OK/BUSY/FAIL unterscheiden.

---

### **Heimgeist**

* **Chronik‑Client:** Ein realer Chronik‑Client muss Auth‑Header (`X‑Auth`) senden und das Cursor‑Handling dem Contract entsprechend implementieren. Das Metarepo definiert `next_cursor` als `string|null`, Code und State‑Datei müssen diesen Typ übernehmen oder metarepo‑Contract ändern.
* **Artifacts‑Dir konfigurierbar:** Statt hart codierter `ARTIFACTS_DIR` sollte die Config ein `artifactsDir` definieren. Persistieren Sie Artefakte atomar; prüfen Sie SHA und `schema_ref`, und laden Sie strengere Contracts aus dem Metarepo.
* **Schema‑Validierung:** Verwenden Sie Ajv mit `strict: true` und `addFormats()`. Kompilieren Sie Schemas einmal (Knowledge Observatory, Integrity Summary) und cachen Sie die Validator‑Funktionen.

---

### **Heimlern**

* **Chronik‑Integration:** Pull‑API nutzt `cursor` (Byteoffset als Integer) und `limit`; `since` existiert nicht mehr. Entfernen Sie `since` im CLI oder übersetzen Sie ihn intern in einen Anfangs‑Cursor.
* **State‑Schema:** Das ingest‑State‐Contract (`heimlern.ingest.state.schema.json`) verlangt `cursor` als String. Angesichts des Byteoffsets ist ein Integer sinnvoll; passen Sie Schema oder Implementation an.
* **CLI‑Optionen:** `--domain` und `--limit` sollten Standardwerte haben; `--cursor` dient nur zum Override. Laden und Speichern des State im JSON‑Format; Fehlermeldungen in `last_error`.
* **File‑Mode trennen:** Bei Testdaten (JSONL) sollte nicht der Chronik‑Cursor als Timestamp genutzt werden; definieren Sie stattdessen ein separates Format (z. B. `cursor_ts`) und unterscheiden Sie die Modi explizit.

---

### **SemantAH**

* **Events mit SHA und Schema‑Ref:** Beim Publizieren von `knowledge.observatory.published.v1` und `insights.daily.published.v1` wird `sha` und `schema_ref` im Payload hinzugefügt. Das `sha`‐Feld muss der hexadezimale SHA256 des Artefakts sein (64 Zeichen). Der `schema_ref` muss dem `$id` des Artefakt‑Schemas entsprechen (z. B. `https://schemas.heimgewebe.org/contracts/knowledge/observatory.schema.json`) und nicht auf einen GitHub‐Blob verweisen.
* **Event‑Versand:** Verwenden Sie immer den korrekten Auth‑Header (für Plexer ist i.d.R. `X‑Auth`). Logs sollten bei Fehlern aussagekräftig sein; Workflow‑Erfolg darf nicht das fehlgeschlagene Event überdecken (stattdessen Warnung und optionaler Artefakt‑Upload).

---

### **WGX (Guard)**

* **Flow‑Definitionen zentralisieren:** Anstatt `schema_candidates` und `data_patterns` hart im Guard zu definieren, lesen Sie die Flow‑Deklarationen aus dem Metarepo (z. B. `consumers.yaml` oder eine `flows.yaml`).
* **Schema‑Auflösung:** Verwenden Sie einen Validator, der `$ref` korrekt auflöst (z. B. Ajv mit lokalem Schema‑Store) und Draft‑2020‑12 unterstützt.
* **Guard‑Verhalten:** Ein fehlendes Schema bei vorhandenem Data‑File sollte ein Fehler sein (keine stille Skip). Fehlen sowohl Schema als auch Daten, kann geskippt werden.
* **Test‑Flows realistisch:** BATS‑Tests sollten reale Contracts mit `additionalProperties:false` verwenden und Fehlerrückgabe der Guard prüfen. Breite Patterns wie `events/*.json` können zufällig JSONs einsammeln; definieren Sie stattdessen explizit zu prüfende Artefakte.

---

Durch diese Anpassungen wird das Heimgewebe‑Ökosystem pflegeleichter, konsistenter und resistenter gegen Drift.


@jules: in diesem repo nur die anweisungen für dieses repo ausführen! 