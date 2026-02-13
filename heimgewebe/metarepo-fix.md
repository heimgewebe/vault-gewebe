Nein – diesen metarepo-PR würde ich in der jetzigen Form noch nicht mergen, gerade wegen des Contracts-Aspekts. Er macht SSOT-Behauptungen, die derzeit mehrere bereits diskutierte PRs faktisch inkonsistent machen (hausKI, chronik, plexer).

⸻

Prämissencheck (bevor man „merge“ sagt)

Prämisse A: „metarepo/contracts ist SSOT und alle Services richten sich danach.“
→ Nur dann mergebar, wenn die anderen PRs bereits kompatibel sind oder mit diesem PR gemeinsam nachgezogen werden.

Prämisse B: „Wir definieren hier Draft 2020-12 + Canonical URIs, und das passt überall.“
→ Gute Zielrichtung, aber es gibt konkrete Format-Kollisionen (SHA, Envelope, Chronik Batch).

⸻

Konkrete Inkonsistenzen zu den bisherigen PRs

1) SHA-Format kollidiert mit hausKI-PR
	•	metarepo-PR (README + Event-Schemas): SHA muss sha256:<64-hex> sein (^sha256:[a-f0-9]{64}$).
	•	hausKI-PR: normalisiert sha256: weg und speichert raw 64-hex (ohne Prefix).

➡️ Entscheidung nötig (kanonisch):
	•	Entweder: kanonisch mit Prefix → hausKI-PR muss geändert werden (nicht strippen; höchstens validieren).
	•	Oder: Schema erlaubt beides (z.B. ^(sha256:)?[a-f0-9]{64}$) und Service speichert bevorzugt kanonisch.

Aktuell ist es ein harter Widerspruch: SSOT sagt A, Implementierung macht B.

⸻

2) Plexer-Envelope kollidiert mit Plexer-PR
	•	metarepo-PR contracts/plexer/event.envelope.v1.schema.json:
	•	payload ist type: object
	•	additionalProperties: false
	•	Plexer-PR (aus dem Diff oben): tests sagen explizit „relaxed schema“ und akzeptieren payload: [] | "string" | null | 123 + gemischte Groß/Kleinschreibung in type.

➡️ Das ist nicht nur „leicht anders“, das ist konzeptionell anders:
SSOT macht Envelope strict, Plexer implementiert relaxed.

⸻

3) Chronik Batch-Contract kollidiert mit Chronik-PR (Pull Endpoint)
	•	metarepo-PR contracts/chronik/event.batch.v1.schema.json:
	•	events.items referenziert .../contracts/events/base.event.schema.json
	•	Beispiel zeigt kind/version/id/meta/data – also ein Base-Event-Modell.
	•	Chronik-PR /v1/events liefert rohe JSON-Lines aus der Domain (z.B. { "n": 0 } aus den Tests) – kein Base-Event-Wrapper.

➡️ Entweder:
	•	Chronik muss beim Pull immer Base-Events liefern (inkl. kind/version/meta/...), oder
	•	Der Contract muss das tatsächliche Format modellieren (z.B. „EventLine“/„DomainLine“), oder events.items ist „any JSON“.

Aktuell: Contract behauptet Base-Event, Implementation liefert beliebige Payloads.

⸻

4) Plexer Delivery Report Schema vs. Plexer Implementation
	•	metarepo-PR contracts/plexer/delivery.report.v1.schema.json enthält optional delivered/retried in counts (nicht required, ok),
	•	Plexer-PR liefert aktuell pending/failed + retryable/next_due/last_error/last_retry.

➡️ Das ist kompatibel, solange additionalProperties:false nicht durch extra Felder verletzt wird (in Plexer-PR passt es). Aber: du hast zusätzlich ein Event-Wrapper contracts/events/plexer.delivery.report.v1.schema.json angelegt – Plexer liefert /status als Envelope (type/source/payload). Das passt, wenn /status wirklich so bleibt.

⸻

5) Base-URI / $id Hygiene

Du fixst bei integrity.summary... das $id auf schemas.heimgewebe.org (gut).
Aber: der Batch-Contract referenziert base.event.schema.json. Wenn diese Datei nicht exakt unter dieser URI existiert, bricht AJV compile-Ref-Resolution.

➡️ Vor Merge muss verifiziert sein: jede $ref-Ziel-URI existiert im metarepo.

⸻

Empfehlung: Nicht mergen – aber mit klarer Sequenz

Pfad 1 (sauber, bevorzugt): „Contracts-first, dann Implementierungen“
	1.	Kanonische Entscheidungen festzurren:
	•	SHA: sha256:<hex> oder tolerant? (Empfehlung: tolerant beim Input, kanonisch beim Speichern)
	•	Plexer envelope: strict oder relaxed?
	•	Chronik pull: Base-Event oder raw lines?
	2.	Dann PRs anpassen:
	•	hausKI sha handling
	•	plexer envelope validation/tests
	•	chronik /v1/events + Schema

Pfad 2 (pragmatisch): „SSOT-PR splitten“

Diesen metarepo-PR aufteilen:
	•	Teil A: README + Governance-Meta + consumers.yaml Ergänzungen (ohne breaking Schemas)
	•	Teil B: Schemas, sobald die Implementierungen synchron sind

Damit kannst du Richtung geben, ohne sofort Wahrheit zu behaupten, die niemand erfüllt.

⸻

Typische vermeidbare Fehler (hier besonders wahrscheinlich)
	•	„SSOT mergen, Implementierungen später“ → das erzeugt sofort Drift-Normalität.
	•	„Schemas sind nur Doku“ → nein; AJV/CI wird daraus ein Gate machen.
	•	„Ein bisschen Inkompatibilität ist ok“ → im Organismus ist es ein Kaskadenfehler (Router + Chronik + hausKI hängen dran).

⸻

Risikoabschätzung (wenn du jetzt trotzdem mergst)
	•	Technisch: hoch (CI/Runtime-Breakage durch Schema-Mismatch; event routing kann Events droppen)
	•	Semantisch: hoch (zwei konkurrierende Wahrheiten: „was ist ein Event“)
	•	Organisatorisch: mittel (viel Nacharbeit, schwer zu entwirren)

⸻

Verdichtete Essenz

Der PR ist eine gute SSOT-Setzung, aber er widerspricht den aktuellen Implementierungs-PRs bei SHA-Format, Plexer-Envelope-Striktheit und Chronik-Batch-Format. Daher: jetzt nicht mergen, sondern erst die kanonischen Entscheidungen treffen bzw. den PR splitten.

⸻

Etymologie (relevant)
	•	„Contract“: aus lat. contractus („zusammengezogen, verdichtet“) → genau das: Verdichtung von Erwartungen zu prüfbarer Form.
	•	„Schema“: gr. schēma („Gestalt, Form“) → nicht Inhalt, sondern Formzwang.

⸻

Eine bewusste Destabilisierung der Fragelogik

Vielleicht ist die eigentliche Frage nicht „müssen wir mergen?“, sondern:
Wollen wir Event-Wahrheit über Schemas erzwingen (hard gate), oder über Beobachtung/Telemetry (soft gate) und erst später härten?
Heimgewebe schreit nach Contracts-first – aber wenn Router/Chronik real noch heterogen sind, kann ein zu früher Hard-Gate den Organismus „gesundvalidieren“ und praktisch lahmlegen.

⸻

Ironische Auslassung

Wenn SSOT sagt „so ist die Welt“ und die Welt sagt „nö“, gewinnt meistens nicht die Welt – sondern der rote CI-Balken. Das ist eine sehr konsequente Ontologie.

⸻

∴fore-Ungewissheit
	•	Unsicherheitsgrad: 0.27
	•	Ursachen: Ich sehe hier nur den Diff, nicht den vollständigen aktuellen metarepo-Baum (insb. ob contracts/events/base.event.schema.json wirklich existiert und wie andere Schemas aktuell aussehen).
	•	Meta: größtenteils vermeidbar – ein schneller AJV-Compile-Run über alle neuen $ref + Abgleich gegen die drei Implementierungs-PRs würde die Restunsicherheit fast eliminieren.

