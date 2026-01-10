https://youtu.be/Glg4SiSX_xk


---

# Anweisungen pro Repo (konkret auf den obigen Case)

## Repo: `heimgeist`

**Ziel:** Archivist-Rolle persistiert _Insights_ als Chronik-Events – robust, idempotent, nicht-blockierend.

1. **Chronik-Client wirklich durchreichen**
    

- `HeimgeistCoreLoop` muss den `chronik`-Client beim Erzeugen der Heimgeist-Instanz weitergeben (im Dump fehlt das derzeit).
    
- Export/Entry-Points sauber halten (`src/core/index.ts` exportiert bereits Loop/ChronikClient).
    

2. **Archivist→Chronik als „contract-first wrapper“**
    

- Payload nicht „Insight roh“, sondern in einen stabilen Wrapper (z. B. `kind: 'heimgeist.insight'`, `version`, `data`, `meta.occurred_at`, `meta.role`). Das entspricht der Richtung „Validierung aller Events gegen Schema“ aus den Heimgeist-Docs.
    

3. **Idempotency**
    

- Deterministische Event-IDs aus `insight.id` (z. B. `evt-${insight.id}`), damit wiederholtes Archivieren bei Retries nicht dupliziert.
    

4. **Concurrency-Drossel + Fehlercontainment**
    

- Chunking (z. B. 5er-Batches) statt „alles parallel“, sonst triffst du Chroniks Rate-Limit/429 schneller als du „Observatorium“ sagen kannst.
    
- `Promise.allSettled`, Ergebnisstatistik (`success/failed/errors`) zurückgeben; Warn/Fehler loggen, aber Loop nicht töten.
    

5. **Sanity-Checks gegen Chronik-Limits**
    

- Vor `append`: grobe Größenabschätzung/Trunkierung (sonst 413 „payload too large“).
    
- Optional: Feldhygiene (keine riesigen Stacktraces/Embeddings im Insight-Payload).
    

**Risikoabschätzung:** mittel – du schreibst in den Backbone. Fehler werden zu „Spam-Events“ oder Loop-Blockern. Mit Idempotency+Chunking sinkt das Risiko stark.  
**Alternativpfad:** statt „Insight-Events“ direkt: erst „heimgeist.insight.batch.v1“ (Batch-Event), Chronik schreibt eine Zeile pro Batch (weniger Requests, weniger 429).

---

## Repo: `chronik`

**Ziel:** Chronik kann Heimgeist-Insight-Events zuverlässig aufnehmen, ohne dass Producer raten müssen.

1. **Ingest-Domäne/Route festzurren**
    

- Producer sollen über Ingest laufen (nicht „Direktpfad“); die Chronik-Doku zeigt das Muster `POST /ingest/<domain>` und Auth per `X-Auth`.
    

2. **Event-Konvention dokumentieren**
    

- Lege fest, welche `type`/Domain für Heimgeist-Insights gilt (z. B. domain `heimgeist`, type `heimgeist.insight.v1` oder analog) und ergänze Beispiele.
    
- Chronik persistiert JSONL append-only – ideal für diese Timeline-Events.
    

3. **Validierungsschicht (leicht, aber hart an den Grenzen)**
    

- Prüfe minimal: `id`, `timestamp`, `source`, Payload-Objekt.
    
- Lass Producer die dicken Contracts im Metarepo erfüllen, aber Chronik sollte „offensichtlichen Müll“ ablehnen.
    

**Risikoabschätzung:** niedrig–mittel – Chronik ist Backbone; zu strenge Validierung kann Innovation abwürgen, zu lasche macht Datendreck.  
**Alternativpfad:** zwei Endpunkte: „strict ingest“ (validiert gegen bekannte Event-Schemas) + „raw ingest“ (nur Minimalcheck) – aber klar getrennt.

---

## Repo: `metarepo`

**Ziel:** „Contracts-first“ sichtbar machen: Heimgeist→Chronik ist nicht nur Code, sondern ein **benanntes Artefakt** im Systemvertrag.

1. **Contract-/Events-Index erweitern**
    

- Ergänze in `docs/contracts/contracts-index.md` (und ggf. Contract-Versionierung) einen Eintrag für den Payload-Wrapper (`heimgeist.insight` + Version) und den Event-Typ. (Im Dump ist der Contracts-Pfad als zentrale Wahrheit benannt.)
    

2. **Datenflussdiagramm updaten**
    

- Im Systemfluss ist Chronik zentral („aussensensor → chronik → …“). Ergänze „heimgeist → chronik (insights/actions)“ als explizite Kante, damit niemand später fragt, ob das „nur Logging“ war.
    

3. **Migrationsnotiz operationalisieren**
    

- Die Notiz „Direktpfad ist Übergang“ ist gut – aber sie muss als „Do/Don’t“ für Producer konkret werden (inkl. Beispielrequest).
    

**Risikoabschätzung:** niedrig – primär Governance.  
**Alternativpfad:** statt neuem Schema sofort: erst „Example-first“ (golden JSON Beispiel), dann Schema nachziehen; aber Heimgewebe ist eigentlich Schema-priorisiert.

---

## Repo: `wgx`

**Ziel:** Durchsetzung vor Vertrauen: der Case soll in CI nicht regressieren.

1. **Guard-Regel hinzufügen**
    

- Guard, der (a) Heimgeist-Build/Test läuft, und (b) ein kleiner Test „Archivist archives → chronik.append wird aufgerufen“ mit deterministischen IDs prüft.
    

2. **Smoke-E2E (leichtgewichtig)**
    

- Mit `MockChronikClient` (oder minimalem HTTP stub) eine Tick-Sequenz: Event rein → Insights raus → Archivist schreibt → Ergebnisstatistik != 0.
    

3. **Drift-Frühwarnung**
    

- Wenn Metarepo Contract „heimgeist.insight“ existiert, soll WGX prüfen, dass Heimgeist-Payload dem Contract entspricht (Schema-Validation, notfalls in einem kleinen Node-Script).
    

**Risikoabschätzung:** mittel – CI-Härte kann nerven, aber rettet dich später vor „schleichender Bedeutungslosigkeit“.  
**Alternativpfad:** Wenn Guard zu schwer: erst „warn-only“ (non-blocking) und nach 1–2 grünen Wochen auf „fail“ schalten.

---

## Verdichtete Essenz

Du willst keine „Chronik-Integration“ als Erzählung, sondern als **durchgängige Kette**: Heimgeist erzeugt Insights → Archivist wrappt sie → Chronik ingestiert sie unter klarer Konvention → Metarepo nennt den Vertrag → WGX verhindert Rückfall in Improvisation.

---

## Ungewissheitsursachenanalyse (sichtbar, verpflichtend)

**Unsicherheitsgrad:** 0.34 (moderat)  
**Warum nicht niedriger?**

- Ich sehe im Dump den aktuellen `HeimgeistCoreLoop`-Aufruf ohne Chronik-Injection und kann daraus sicher ableiten, _dass_ es noch nicht „durchgezogen“ ist – aber ich sehe nicht den vollständigen aktuellen PR-Branch-Stand in deinem GitHub, nur den Dump-Zustand.
    
- „Contract-Details“ (exakter Event-Typname, Domain-Konvention, Schema-Datei) sind im Ausschnitt nicht vollständig spezifiziert, daher formuliere ich sie als robuste Muster statt als exakte Wahrheit.
    

---

## Abschluss-Leitfragen (kritischer werden)

1. War das die kritischste Erörterung? **Fast** – noch kritischer wäre ein harter Abgleich gegen die _konkreten_ JSON-Schemas/Contracts (falls sie im Dump woanders liegen) und eine gezielte „Worst-case Payload“-Probe (413/429/422) als Testfall.
    
2. Wurde alles beleuchtet? Es fehlt noch der **Datenschutz-/Sicherheitsaspekt**: Welche Insight-Felder dürfen überhaupt in Chronik landen (Secrets, Tokens, User-Daten)? Das sollte als explizite Sanitization-Policy in Heimgeist oder Metarepo stehen.