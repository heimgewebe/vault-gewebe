Understood. I will now consolidate the best approach—favoring canonical SHA formatting, wrapping Chronik events as base-event objects, and enforcing a strict envelope schema with payload flexibility in Plexer—then outline the necessary corrections for each repository. I’ll provide a structured summary of tasks (correction prompts) for metarepo, hausKI, chronik, and plexer, ensuring alignment with the consistency checklist across all repos. I’m preparing the response now.


**Empfohlene Vorgehensweise (Konsistenz-Checkliste)**

1. **SHA-Format** – Option K: Eingaben dürfen sowohl `sha256:<hex>` als auch `<hex>` akzeptieren, intern wird jedoch ausschließlich das kanonische Format `sha256:<64-hex-chars>` gespeichert. So bleiben alte Producer kompatibel, aber die Speicherung ist eindeutig.
2. **Chronik /v1/events Payload-Typ** – Option B: Chronik sollte immer Base-Event-Objekte zurückgeben. Jede Event-Zeile wird zu einem `base.event` mit Feldern `kind`, `version`, `id`, `meta.occurred_at`, `meta.producer`, `data`. Der Contract `event.batch.v1` bleibt unverändert (Verweis auf `base.event.schema.json`).
3. **Plexer Envelope Striktheit** – Option S: Das Envelope-Schema muss strict sein (type, source, payload sind erforderlich), der `payload`-Typ aber unbeschränkt (`{}` statt `"object"`), damit beliebige JSON-Strukturen zugelassen werden.

Diese Konsistenzpunkte sollten im Metarepo als Single Source of Truth (SSOT) verankert werden und dann in allen Diensten umgesetzt werden.

---

## Korrekturprompts pro Repository

### 🛠️ `heimgewebe/metarepo`

1. **Schema-Pfad korrigieren**: In `contracts/chronik/event.batch.v1.schema.json` ist aktuell `$ref` auf `contracts/events/base.event.schema.json`. Prüfen, ob diese Datei exakt so existiert; sonst anlegen oder den Pfad z. B. auf `contracts/events/base.event.v1.schema.json` anpassen.
2. **Plexer Envelope**: In `contracts/plexer/event.envelope.v1.schema.json` den `payload`-Typ zu `{}` ändern, damit „any“ erlaubt ist, und optional `type`-Pattern `^[A-Za-z0-9._-]+$` sowie maximale Länge 256 definieren.
3. **Delivery-Report-Konsistenz**: Das Schema `contracts/plexer/delivery.report.v1.schema.json` erlaubt Felder `delivered` und `retried`. Wenn Plexer diese Werte nicht ermittelt, sollten sie optional gemacht oder aus dem Beispiel (`examples/plexer/delivery.report.v1.example.json`) entfernt werden. Keine Extrafelder bei `additionalProperties: false`.
4. **Event-Schemas vereinheitlichen**: In `knowledge.observatory.published.v1`, `insights.daily.published.v1`, `integrity.summary.published.v1` folgende Felder einfügen oder überarbeiten:

   * `sha` optional: Pattern `^sha256:[a-f0-9]{64}$`.
   * `schema_ref` optional: Format `uri` und Host muss `schemas.heimgewebe.org` sein.
5. **Deprecated Alias korrekt behandeln**: In `consumers.yaml` `insights.daily.published` als deprecated alias markieren und sicherstellen, dass die `.v1`-Variante (`insights.daily.published.v1`) vom Plexer als canonical genutzt wird.
6. **Neue Eventtypen eintragen**: Neue Einträge wie `knowledge.observatory.published.v1`, `heimlern.ingest.state.v1` etc. in `consumers.yaml` sind korrekt, aber prüfen, ob zugehörige Event-Contract-Dateien im Repo existieren und gepflegt sind.
7. **SHA-Kanonisierung dokumentieren**: In `README.md` oder den Leitlinien vermerken, dass SHA in Metadaten stets im Format `sha256:<64-hex>` gespeichert wird.

### 🛠️ `heimgewebe/hausKI`

1. **SHA-Präfix nicht strippen**: In `crates/core/src/events.rs` die Validierung so anpassen, dass `sha` den Prefix `sha256:` nicht entfernt, sondern nur prüft und ins kanonische Format (`sha256:<lowercase-hex>`) normalisiert.
2. **`schema_ref` validieren**: Sicherstellen, dass `schema_ref` nur gültig ist, wenn die Domain `schemas.heimgewebe.org` ist. Andere Hosts müssen verworfen werden.
3. **Optional statt required**: Sowohl `sha` als auch `schema_ref` sollen optional sein, damit ältere Producer nicht brechen.
4. **RecheckReason**: Das Struct `RecheckReason` benötigt `Serialize`/`Deserialize` nur, wenn es persistiert oder übertragen wird. Ansonsten reicht die manuelle Übernahme in den offenen Items.
5. **Tests aktualisieren**: Anpassen der Tests in `events_tests.rs`, sodass `sha` und `schema_ref` mit Präfix akzeptiert werden und korrekt normalisiert in `recheck_reason` erscheinen.

### 🛠️ `heimgewebe/chronik`

1. **/v1/events Response**: Den Handler so anpassen, dass jede Event-Zeile aus der Datei zu einem `base.event` wird. Beispielsweise:

   * `kind`: `"base.event"`.
   * `version`: 1.
   * `id`: generieren oder aus log ableiten.
   * `meta.occurred_at`: Option zur Angabe des Zeitpunkts im log.
   * `meta.producer`: extrahiert aus dem Ingest (z. B. Domain).
   * `data`: enthält das ursprüngliche JSON aus der Zeile.
     Somit entspricht das Resultat dem Contract `event.batch.v1`.
2. **Contract alternativ anpassen**: Wenn man bei der jetzigen Realität bleiben will (Rohdaten zurückgeben), müsste man `contracts/chronik/event.batch.v1.schema.json` auf `items: {}` ändern. Der Contracts-first-Ansatz wird jedoch empfohlen.
3. **Testanpassungen**: In den Tests `event.n` durch `event.data.n` ersetzen, wenn base-event-Struktur verwendet wird.
4. **Kursor-Semantik**: Verhalten bei EOF ist korrekt (`next_cursor = null`). Nur dokumentieren.

### 🛠️ `heimgewebe/plexer`

1. **Envelope-Schema synchronisieren**: Sicherstellen, dass `src/vendor/schemas/plexer/event.envelope.v1.schema.json` und das Schema im Metarepo identisch sind (Payload-Typ `{}` statt `{"type":"object"}`).
2. **Type-Pattern**: Wenn `strict` gewählt wird, sollte das Schema den Event-Typ nur aus `[A-Za-z0-9._-]` (Mixed Case nur wenn erforderlich) akzeptieren. Tests, die Mixed-Case und beliebige Payloads zulassen, sind ggf. anzupassen.
3. **Authentifizierungsheader**: Für Chronik (X-Auth) und Heimgeist (X-Auth) sowie Leitstand/HausKI (Bearer) korrekt setzen. Ihre Tests reflektieren dies.
4. **Vendoring & CI**: Einen automatischen Skript (`scripts/vendor-contracts.sh`) einführen, der die Schamas aus metarepo synchronisiert. In der CI sicherstellen, dass die Versionen identisch sind.
5. **Delivery-Queue & Report**: `/status` liefert jetzt ein Event (`plexer.delivery.report.v1`), das dem Contract `events/plexer.delivery.report.v1.schema.json` entsprechen muss. Prüfen, ob es als Event publiziert oder nur intern genutzt wird; ggf. das Schema anpassen oder den Contract im metarepo in `events/` eintragen.
6. **Best-Effort vs. Critical**: Die Unterscheidung aus `src/constants.ts` (critical events mit backoff, best-effort mit Warnung) beibehalten.

### 🛠️ Weitere Hinweise

* In allen Repos sollte die Verwendung von `schema_ref` und `sha` nur optional sein, um ältere Producer und Consumer nicht zu brechen.
* `consumers.yaml` muss mit den Event-Schemas synchron sein; Deprecated alias sollten klar deklariert und canonical Typen verwendet werden.
* Einen CI-Check einführen, der `ajv compile` über alle Schemas laufen lässt, um $ref-Fehler früh zu erkennen.

---

@jules: in diesem repo nur die anweisungen für dieses repo ausführen! 
