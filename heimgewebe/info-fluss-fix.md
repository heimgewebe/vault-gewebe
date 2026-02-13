Verifikationsmatrix der technischen Informationsflüsse

Informationsfluss	Umsetzung in Code/Config	Aktive Nutzung/Tests	Dokumentation/Contracts	Produktionsreife	Status
Aussensensor → Chronik	Ja: Bash-Skript push_chronik.sh postet NDJSON an Chronik-Ingest (alternativ über Rust-Binary) ￼. Feed-Format durch Schema validiert ￼.	Ja: CI validiert Feed gegen Schema und kann Push an Chronik ausführen ￼. Feed enthält Demo-Eintrag für grüne Tests ￼.	Ja: README und ADRs erklären Datenfluss und bevorzugten Chronik-Pfad ￼ ￼; Contracts (aussen.event.schema.json) definiert.	Weitgehend: Skripte mit Fehlerbehandlung, Token-Auth und Fallback (curl) implementiert ￼. Noch manuell getriggert (Daemon erst geplant) ￼.	🟢 Grün (voll funktionsfähig)
Aussensensor → Heimlern	Teilweise: Übergangspfad per Skript push_heimlern.sh sendet Feed direkt an Heimlern-Ingest-API ￼. Nutzung von HEIMLERN_INGEST_URL (z.B. localhost:8787) ￼.	Eingeschränkt: Nur MVP-Workaround. Bevorzugt ist inzwischen Chronik ￼. Keine Hinweise auf automatische Ausführung in CI (nur manuell).	Ja: README markiert diesen Pfad ausdrücklich als vorübergehenden MVP ￼ und erläutert die Nutzung ￼.	Begrenzt: Funktionaler CURL-Post mit rudimentärer Fehlerbehandlung ￼. Allerdings existiert vermutlich kein echter Heimlern-Server (8787) – dieser Pfad ist geplant, aber nicht produktiv verfügbar.	🟡 Gelb (implementiert, aber Übergangslösung)
Mitschreiber → Chronik (OS-Kontext)	Ja: Mitschreiber sendet Events os.context.state und os.context.text.embed an Chronik-Ingest ￼. Konfiguration über CHRONIK_INGEST_URL und Token ￼. Der FastAPI-Ingest (/ingest/os/context/...) in Chronik ist vorhanden ￼ ￼.	Ja, teilweise: Mitschreiber ist als Prototyp markiert ￼, aber JSONL-Contracts und CI-Validation (validate.yml) stellen sicher, dass erzeugte Events dem Schema entsprechen ￼.	Ja: README beschreibt Rollen (Producer/Consumer) und Datenflüsse ausführlich ￼ ￼. Contracts für os.context.* im Metarepo vorhanden ￼.	Ansatzweise: Lokaler Dienst (Opt-in) mit Privacy-Gates und WAL ￼. Events werden in Chronik persistiert; Robustheit (TTL, Redaction) adressiert ￼. Allerdings noch “Prototype” (Feinschliff und Langzeiterprobung fehlen).	🟡 Gelb (funktional, aber noch im Prototyp-Stadium)
Chronik → SemantAH (Event-Insights)	Ja: SemantAH importiert Chronik-Daten read-only. Script cli/ingest_chronik.py liest z.B. chronik/data/aussen.jsonl und extrahiert neueste Einträge ￼ ￼. Ausgabe als insights/today.json für Vault/Obsidian ￼.	Ja: Täglicher GitHub-Workflow generiert insights.daily.json aus Chronik-Daten ￼. Tests (pytest) prüfen Export-Logik. Nutzung aber read-only (Chronik fungiert als Quelle).	Ja: SemantAH-README Quickstart erwähnt Chronik-Export ￼; Detaillierte Doku in docs/runbooks/semantics-intake.md (siehe Quickstart) und Schema insights.schema.json für Output vorhanden ￼ ￼.	Teilweise: Pipeline erzeugt Zusammenfassung (Top N Events, max 10KB ￼ ￼) und validiert Schema. Läuft nicht in Echtzeit, sondern als Batch (täglich) – ausreichend für Tagesreports, aber keine Live-Integration.	🟡 Gelb (integriert, aber nur batchweises Auslesen)
Chronik → Heimgeist (Event-Feed)	Geplant: Heimgeist hat einen ChronikClient vorgesehen, um neue Events abzuholen ￼. In Code bisher nur MockClient implementiert ￼ ￼ – kein echter Polling/Streaming aus Chronik.	Nein: Derzeit verarbeitet Heimgeist nur eingespielte Test-Events über den Mock (FIFO) ￼. Kein Live-Zugriff auf Chronik-Dateien/API (die nextEvent()-Funktion ist Platzhalter) ￼.	Konzeptuell: Die Observer-Rolle von Heimgeist ist definiert ￼ und Organismus-Dokumentation skizziert den Flow Chronik→Heimgeist ￼. Aber keine User-Doku zu einer realen Umsetzung, da noch nicht umgesetzt.	Nein: Ohne echten Chronik-Adapter fehlen Robustheit und Fehlermanagement. Heimgeist kann aktuell nicht autonom Events aus Chronik beziehen – diese Integration ist rot.	🔴 Rot (noch nicht umgesetzt – nur Mock)
Chronik → Heimlern (Lern-Daten)	Nein: Direktintegration nicht vorhanden. Laut Zielbild sollen Consumer (z.B. Heimlern) künftig über Chronik lesen ￼, anstatt direkt beliefert zu werden. Code in Heimlern zeigt keine Chronik-Anbindung.	Nein: Heimlern verarbeitet derzeit Kontexte aus Dateien/Fixtures (Rust-Examples) ￼. Ein geplanter Ingest-Service (Endpoint auf :8787) ist nicht implementiert, daher keine aktive Nutzung.	Ja, indirekt: Aussensensor-README nennt Zielarchitektur („nur Chronik; Consumer lesen von dort“) ￼. Heimlern-Docs erwähnen Contracts/Policies, aber keinen Live-Datenstrom.	Nein: Lern-Pipeline läuft isoliert (Snapshots, Bandit-Entscheidungen) ￼. Die Einbindung von Chronik als Echtzeit-Datenquelle ist noch Zukunftsmusik – keine Fehlerbehandlung o.Ä. vorhanden.	🔴 Rot (nur geplant, nicht implementiert)
SemantAH → Chronik (Erkenntnisse zurück)	Kaum: SemantAH erzeugt derzeit Artefakte (Embeddings, Graph, Insights) lokal ￼ ￼, aber schreibt keine Events in Chronik. Embedding-Events im Chronik-Beispiel (komponent: semantAH) stammen vom Mitschreiber-Flow ￼ ￼, nicht aus direkter SemantAH-Aktion.	Nein: Kein Prozess erkennbar, der Ergebnisse aus SemantAH wieder als Event an Chronik sendet. (Knowledge-Observatory wird als JSON veröffentlicht, aber nicht in Chronik eingespeist.)	Teilweise: Contracts existieren (z.B. embedding.computed als Event-Kind ￼), aber keine Dokumentation eines SemantAH->Chronik Push. Die semantAH-Doku fokussiert auf Files und Index, nicht Event-Ausgabe.	Nein: Es fehlt eine Umsetzung, wie SemantAH-Resultate (z.B. neue Graph-Kanten oder Erkenntnisse) ins Event-Backbone zurückfließen. Vermutlich war vorgesehen, Insights als Events (heimgeist.insight o.ä.) zu publizieren, was aber noch nicht realisiert ist.	🔴 Rot (kein aktiver Rückfluss implementiert)
Heimgeist → Chronik (Self-State & Insights)	Ja (teils): Heimgeist publiziert Self-State-Snapshots als Event in Chronik. Bei jedem Update ruft publishSelfStateSnapshot() ChronikClient.append auf ￼ und erzeugt Event heimgeist.self_state.snapshot ￼. Insight-Events sind vorgesehen (Event-Typ heimgeist.insight) aber im Code noch nicht via Chronik umgesetzt.	Eingeschränkt: Self-State-Events würden bei realem ChronikClient gesendet – aktuell erfolgt dies nur im Mock (Logger-Ausgabe) ￼. Es gibt Tests für Snapshot-Format/Schema ￼, aber kein End-to-End-Test gegen einen laufenden Chronik-Service.	Ja: Schema und Contract für heimgeist.self_state.snapshot.v1 sind definiert ￼ ￼. Kommentare im Code betonen den Contract (Kind, Version etc.) ￼. Insights: Role Archivist erwähnt „schreibt Insights zu Chronik“ ￼, aber keine Nutzer-Doku zur Umsetzung.	Moderat: Die Event-Struktur wird strikt validiert bei Ingest (Chronik überprüft Heimgeist-Payloads auf Schema ￼). Allerdings ist die Integration nicht “live” – ChronikClient ist (noch) ein Platzhalter ￼. Fehlerhandling im Append-Aufruf erfolgt (Warn-Log bei Fehlschlag) ￼. Ohne echten Client aber keine echte Retry/Network-Logik.	🟡 Gelb (Self-State wird vorbereitet und schemavalide geloggt, aber Systemintegration noch unvollständig)
Heimgeist → Leitstand (Zustandsanzeige)	Ja: Heimgeist schreibt seinen Self-State-Bundle (aktueller Zustand + Historie) als JSON-Artifakt self_state.json ins Artefakt-Verzeichnis ￼ ￼. Atomarer Schreibvorgang (Temp-Datei + Rename) implementiert ￼ ￼. Leitstand lädt diese Datei beim Rendern des Observatory-Dashboards ￼ ￼.	Ja: Bei laufendem Heimgeist mit Persistence wird das Artefakt laufend aktualisiert (max 50 Einträge Historie) ￼. Leitstand nutzt es: Fallback auf fixtures/self_state.json falls kein Artefakt da ￼. Tests verifizieren Schema-Konformität (Bundle vs. Schema) ￼.	Ja: Schema heimgeist.self_state.bundle.v1 dokumentiert Aufbau (current+history) und ist im Repo abgelegt ￼ ￼. Kommentare im Code erläutern Vertrags-Einhaltung (Schema-Feld muss exakt stimmen) ￼. README/ADR beschreiben Leitstand-Integration zwar knapp, aber im Code-Kontext erkennbar.	Hoch: Lösung ist dateibasiert, aber robust umgesetzt (Logging bei Fehler, altes File wird vor Rename ggf. gelöscht ￼). Geringe Komplexität, dafür klare Trennung – dieser Flow ist bereits praktisch einsetzbar.	🟢 Grün (implementiert und im UI verwertet)
SemantAH → Leitstand (Knowledge Observatory)	Ja: SemantAH erzeugt täglich ein Knowledge-Observatory-Artefakt knowledge.observatory.json (via GH Actions um 06:15 UTC) ￼ ￼. Dieses JSON enthält Kennzahlen/Signale zur semantischen Infrastruktur. Leitstand lädt es (aus artifacts oder fallback Fixture) ins Dashboard ￼ ￼.	Ja (batch): Täglicher Workflow publish-knowledge-observatory.yml generiert den Snapshot und veröffentlicht ihn als Release-Asset. Leitstand erwartet die lokale Datei; ein Auto-Download erfolgt z.Z. über manuelle Schritte oder Plexer-Notification (zukünftig) ￼ ￼. In Tests/CI wird v.a. auf Schema-Drift geachtet (Drift-Report) ￼.	Ja: Ausführliche Doku im SemantAH-Repo (docs/semantAH/observatory.md) beschreibt Zweck, Format (Schema knowledge.observatory.schema.json) und Konsumenten ￼ ￼. Leitstand-Code prüft Schema-Version und Strictness beim Laden ￼.	Teilweise: Die Kennzahlen (derzeit nur Gesamtcounts) sind valide und werden versioniert veröffentlicht. Allerdings muss das Artefakt manuell/per Script ins Leitstand-Artifacts-Verzeichnis gelangen (derzeit kein vollautomatischer Transfer ins laufende System außer man nutzt den GitHub Release + Plexer-Weg). Konzept ist solide (Vermeidung von Interpretationslogik im Observatory ￼), Implementierung schrittweise (MVP).	🟡 Gelb (Datenfluss etabliert, Automatisierung noch ausbaufähig)
SemantAH → Heimgeist (Feedback/Fragen)	Geplant: SemantAH liefert potenziell Meta-Daten an Heimgeist (z.B. suggested_questions im Observatory-Report ￼ ￼). Derzeit jedoch kein mechanischer Transfer. Heimgeist könnte Observatory-Daten aus Datei lesen – im Code noch nicht implementiert.	Nein: Heimgeist nutzt Observatory-Daten bisher nicht direkt. Laut Doku soll Heimgeist perspektivisch Muster in den Observatory-Signalen erkennen ￼, aber es gibt keine Funktion, die knowledge.observatory.json einliest.	Ja (Plan): Die Verbraucherrolle Heimgeist für Observatory ist in der Doku erwähnt ￼, jedoch keine technische Anleitung, da Umsetzung fehlt.	Nein: Ohne Implementation keine Bewertung der Robustheit. Momentan bleibt dieser Rückkopplungsfluss theoretisch.	🔴 Rot (noch nicht realisiert)
Externe Events → Plexer → Heimgeist	Ja: Der Plexer-Service nimmt externe Events via POST /events entgegen ￼ (z.B. von GitHub Actions) und routet sie intern weiter (derzeit primär an Heimgeist) ￼ ￼. Z.B. sendet SemantAH bei Insights-Publikation ein Event insights.daily.published.v1 an Plexer ￼, der es an Heimgeist weiterleitet.	Ja: Dieser Mechanismus wird bereits genutzt, um asynchrone Ergebnisse ins System zu spielen (z.B. tägliche Insights-Fertigmeldung ￼ ￼). Heimgeist-CoreLoop lauscht auf solche Event-Typen (insights.daily.published.v1 ist in Filterliste) ￼.	Ja: Plexer-README beschreibt klar Scope und Routing ￼ ￼. Event-Typen und -Struktur (min. type, source, payload) sind definiert und werden im Log vermerkt ￼.	Grundlegend: Plexer prüft Minimalformat und loggt, leitet dann stumpf weiter ￼. Keine komplexe Logik – daher kaum Fehleranfälligkeit außer Ausfall selbst. Der Flow hängt von Heimgeists Fähigkeit ab, das Event sinnvoll zu verarbeiten (derzeit vermutlich nur Logging/Inspection).	🟡 Gelb (Events gelangen ins System, aber weitere Verarbeitung ist simpel gehalten)

Legende: Grün = produktiv einsetzbar (vollständig umgesetzt und erprobt); Gelb = teilweise umgesetzt oder in Betrieb (MVP/Prototyp, Limitierungen vorhanden); Rot = nur geplant oder Lücke (noch nicht implementiert). Unklare Annahmen oder veraltete Pläne wurden oben entsprechend gekennzeichnet – z.B. der direkte Heimlern-Ingest (MVP) ist überholt, Chronik dient nun als zentrale Drehscheibe ￼. Ebenso ist die Chronik-Heimgeist-Kopplung noch nicht live, obwohl konzeptionell vorgesehen. Insgesamt zeigen sich einige blinde Flecken bei den Rückflüssen (SemantAH/Heimlern zurück ins System), die bislang höchstens auf dem Papier stehen.



Dialektische Erörterung (∴fore)

These: Heimgewebe hat schon jetzt reale Datenadern (Events/Artefakte), aber die Rückkopplungen (Consumer→Producer, “Downstream→Backbone”) sind teilweise Attrappen: Mock-Clients, Release-Assets ohne automatischen Transport, MVP-Direktpfade, die die Zielarchitektur unterlaufen. Das macht das System funktional, aber nicht organisch geschlossen.

Antithese: Das ist nicht “Kaputt”, sondern ein bewusster Evolutionszustand: Batch-Publishing (GH Release Assets) und “Fire-and-forget”-Fanout sind robuste Minimalformen, die Drift sichtbar halten und Komplexität sparen. Plexer kodifiziert bereits Fanout für zentrale Events (Observatory/Integrity) ￼.

Synthese: Fehlendes sollte so umgesetzt werden, dass
	1.	Chronik tatsächlich “Single Point of Ingest” bleibt (Direktpfade abbauen)
	2.	Plexer als Verteiler nur Notifications sendet (klein, schematisch, URLs),
	3.	Consumer die Artefakte selbst holen/validieren/ablegen (Determinismus, Nachvollziehbarkeit),
	4.	jede neue Ader mindestens Smoke-Test + Contract-Check bekommt.

Nebenbei: “Ingest” (Etymologie) kommt über engl. ingest von lat. in- (hinein) + gerere (tragen, führen). Im Heimgewebe-Kontext: “hineintragen” ins Backbone – nicht “irgendwohin werfen”.

⸻

Anweisungen pro Repo (fehlende Teile umsetzen)

Ich konzentriere mich auf die Lücken, die du schon identifiziert hast: (A) Chronik→Heimgeist (echter Client), (B) Chronik→Heimlern (statt Direktpush), (C) SemantAH→Chronik (Observatory/Integrity optional als Event), (D) automatischer Artefakt-Transfer via Plexer, (E) Direktpfade abbauen.

1) Repo heimgeist – ChronikClient real machen (statt Mock)

Ist-Zustand: Heimgeist hat HTTP-API und Event-Endpoints (z.B. /heimgeist/events) ￼; Chronik-Anbindung ist derzeit nicht belastbar (Mock-Logik war im Dump als Problem sichtbar).

Umsetzungsschritte:
	1.	Adapter bauen: ChronikClient implementieren, der
	•	Notifications von Plexer akzeptiert (POST /heimgeist/events existiert) ￼,
	•	bei bestimmten Eventtypen Artefakt-URLs pullt (z.B. knowledge observatory) und lokal in artifacts/ ablegt.
	2.	Eventtypen anschließen: Mindestens:
	•	knowledge.observatory.published.v1 (Fanout-Event existiert im Plexer-Test) ￼
	•	integrity.summary.published.v1 (wird ebenfalls fanoutet) ￼
	3.	Validation Gate: Vor dem Ablegen: AJV/Schema-Check (oder Python) gegen das jeweilige Contract-Schema.
	4.	Smoke-Test: Einen Integrationstest, der
	•	ein Plexer-Event simuliert,
	•	Download stubbt,
	•	validiert, dass die Datei in artifacts/ landet und Schema ok ist.

Fehlerprävention (typisch vermeidbar):
	•	Nicht den Asset-Body im Event mitsenden → Event muss klein bleiben (Plexer-Test kodifiziert das: Payload < 1000 chars) ￼.
	•	Keine “latest”-URLs, sondern stabile Release-Assets (Plexer-Test prüft stabile URL-Patterns) ￼.

Alternativpfade:
	•	A1: Heimgeist holt Artefakte direkt aus GitHub Release URLs (pull).
	•	A2: Chronik hostet Artefakte (push) – mehr Kopplung/Storage, dafür weniger GitHub-Abhängigkeit.

⸻

2) Repo heimlern – Ingest über Chronik statt Direktpush ermöglichen

Ist-Zustand: Es gibt im Aussensensor einen MVP-Direktpush zu Heimlern (scripts/push_heimlern.sh) und er ist ausdrücklich als Workaround markiert ￼.

Umsetzungsschritte:
	1.	Heimlern-Ingest definieren: Entscheide (contracts-first):
	•	Entweder Heimlern konsumiert Chronik-Eventlog (pull) periodisch,
	•	oder Chronik/plexer schickt Notifications + Heimlern zieht dann.
	2.	Minimal: Pull-Consumer (empfohlen):
	•	Heimlern erhält ein kleines CLI heimlern ingest chronik --since <cursor> (cursor = timestamp oder chronik event id).
	•	Persistiere Cursor in data/heimlern.cursor.
	3.	Contract: Im metarepo (siehe unten) einen heimlern.ingest.state-Contract (Cursor + last_ok + last_error) definieren, damit Leitstand/Heimgeist den Zustand sehen können.
	4.	Tests/CI: Smoke-Test, der ein kleines JSONL (Chronik-Format) einliest und mindestens einen Lernschritt/Statistik aktualisiert.

Fehlerprävention:
	•	Keine doppelte Wahrheit: solange Direktpush existiert, muss Heimlern klar markieren, dass Chronik-Pull “authoritative” ist (sonst Divergenz).

Alternativpfade:
	•	B1: Heimlern bekommt wieder ein HTTP-Ingest, aber nur Chronik darf posten (ACL), nicht Aussensensor.
	•	B2: Heimlern bleibt reiner Batch-Consumer (cron + file drop), keine APIs.

⸻

3) Repo aussensensor – Direktpfad abbauen, Chronik-only erzwingen

Ist-Zustand: scripts/push_heimlern.sh ist vorhanden und sagt selbst: “Zielarchitektur: ingest NUR via chronik.” ￼

Umsetzungsschritte:
	1.	Deprecation: In scripts/push_heimlern.sh:
	•	Default: exit 2 mit klarer Fehlermeldung, außer ALLOW_HEIMLERN_MVP=1.
	2.	E2E-Skript anpassen: Falls du ein E2E hast, das beides fährt, trenne in zwei Modi:
	•	“legacy-mvp” (optional)
	•	“chronik-only” (default)
(Im Dump ist ein E2E-Ablauf sichtbar, der beide Trockenläufe und Real-Läufe macht) ￼.
	3.	Docs/README: Direktpfad klar als deprecated markieren, mit Abschaltdatum.

Risiko: Niedrig-mittel (du brichst ggf. lokale Setups). Abfangen über Feature-Flag.

⸻

4) Repo semantAH – Publizieren + Plexer-Notification konsistent erweitern

Ist-Zustand:
	•	Workflow Publish Knowledge Observatory erzeugt artifacts/knowledge.observatory.json, validiert und published als Release Asset ￼ ￼.
	•	Optional: Notify Plexer (Integrität) ist im Workflow enthalten (POST ${PLEXER_URL}/events) ￼.
	•	Observatory-Doku beschreibt Download für Konsumenten (curl) ￼.

Fehlend: Einheitliche Notifications für alle relevanten Artefakte + event envelopes, die downstream automatisierbar sind.

Umsetzungsschritte:
	1.	Event-Envelopes standardisieren: Erzeuge pro Artefakt eine kleine event.json mit:
	•	type: knowledge.observatory.published.v1
	•	source: semantAH
	•	payload: { url, generated_at, sha, schema_ref }
	2.	Workflow-Schritt hinzufügen: Nach Release-Upload:
	•	curl -X POST "${PLEXER_URL%/}/events" -H "Authorization: Bearer ..." -d @event.json
	3.	Nicht nur Integrity: Gleiches Muster für:
	•	insights.daily.published (Plexer-Test codifiziert diesen Eventtyp bereits) ￼.
	4.	Contract-Check: Plexer-Event-Contract in metarepo festziehen (siehe metarepo).

Alternativpfade:
	•	C1: Plexer zieht Artefakte selbst (mehr Verantwortung im Router).
	•	C2: Leitstand/Heimgeist pollt GitHub Releases ohne Notification (weniger moving parts, aber weniger “Ereignis”).

⸻

5) Repo plexer – Konsumenten erweitern + Zustellung härten

Ist-Zustand: Plexer /events Fanout ist getestet:
	•	Unknown events → nur Heimgeist ￼
	•	knowledge.observatory.published.v1 → heimgeist, leitstand, hauski, chronik ￼
	•	“Fire and forget”: 202 auch bei Forward-Fehler, Fehler wird geloggt ￼.

Fehlend: Zustellgarantie/Retry und “Delivery State”.

Umsetzungsschritte:
	1.	Optionales Retry-Queue-Modul (klein halten):
	•	Bei Forward-Fehler: Event in data/failed_forwards.jsonl schreiben.
	•	Cron/Interval: Retry mit Backoff.
	2.	Delivery-Metrik: /status Endpoint oder metrics.json, der Anzahl Pending/Failed ausgibt (Leitstand kann es anzeigen).
	3.	Contract: In metarepo: plexer.delivery.report.v1 (counts + last_error + last_retry_at).
	4.	Nicht blockieren: Default bleibt 202, aber Observability wird besser.

Risiko: Mittel (Queue/Retry kann “Sturm” erzeugen). Backoff + Max-Retries erzwingt Begrenzung.

⸻

6) Repo leitstand – Artifact Puller + Reaktion auf Plexer Events

Ist-Zustand: Leitstand ist Konsument von Artefakten; der semantAH-Workflow liefert stabile Release Assets und Notifications existieren bereits ￼ ￼.

Fehlend: Vollautomatisches “Event→Download→Ablage”.

Umsetzungsschritte:
	1.	Endpoint /events (falls nicht vorhanden): Plexer kann leitstand anrufen (Token-geschützt).
	2.	Handler: Bei knowledge.observatory.published.v1:
	•	Download payload.url,
	•	validate gegen contracts/knowledge.observatory.schema.json,
	•	speichern in artifacts/knowledge.observatory.json.
	3.	UI-Refresh: Kein Live nötig, nur beim nächsten Page Load.
	4.	Test: Simuliere Event, stubbe Download, prüfe Datei-Update.

Alternativpfade:
	•	D1: Leitstand pollt einmal pro Stunde die Release Asset URL (keine Event-Integration).
	•	D2: Leitstand zieht Artefakte nur auf manuellen Trigger (weniger Automation, mehr Kontrolle).

⸻

7) Repo chronik – (Optional) Artifact-Index + Consumer Pull API

Ist-Zustand: Chronik ist Backbone/Ingress. Plexer kann Chronik als Consumer ansprechen (Fanout-Test nennt Chronik als Ziel) ￼.

Fehlend: Ein klarer Consumer-Pull-Endpunkt für “since cursor” (für Heimlern/Heimgeist), plus ggf. Artefakt-Registry.

Umsetzungsschritte:
	1.	GET /v1/events?since=<cursor>&types=...:
	•	Cursor: ISO timestamp oder monotoner ID.
	2.	Server-side Limit + Pagination (sonst DOS durch große Logs).
	3.	Contract: chronik.event.batch.v1 (array + next_cursor).
	4.	Smoke-Test: API returns deterministic order.

Risiko: Mittel (API-Stabilität, Performance). Mit Limits/Pagination kontrollierbar.

⸻

8) Repo metarepo – Contracts-first: fehlende Contracts festziehen

Hier läuft die “Wahrheitsmaschine”: Wenn der Fluss nicht als Contract existiert, driftet er.

Umsetzungsschritte:
	1.	Plexer Event Envelope Contract: plexer.event.envelope.v1 (type/source/payload + size hints).
	2.	Delivery Report Contract: plexer.delivery.report.v1.
	3.	Heimlern Cursor Contract: heimlern.ingest.state.v1.
	4.	Chronik Batch API Contract: chronik.event.batch.v1.
	5.	Guards: WGX/CI: validate diese Artefakte überall, wo sie entstehen.

⸻

9) Repo wgx – Guard/Smoke für die neuen Adern

Ziel: Jede neue Ader bekommt mindestens einen “smoke” (End-to-End) und einen “guard” (Schema).

Umsetzungsschritte:
	1.	Smoke: Spin up (docker compose oder minimal node/python services) → Plexer → Leitstand/Heimgeist → Artefakt liegt auf Disk.
	2.	Guard: AJV validate für: event envelopes, observatory JSON, delivery report, ingest state.

⸻

Verdichtete Essenz

Wenn du nur eine Sache machst:
Baue “Event→Download→Validate→Ablage” als Standardmechanik in Heimgeist und Leitstand, getriggert durch Plexer Notifications; mache Heimlern zum Chronik-Consumer; deprecate aussensensor→heimlern. Der Rest ist Härtung (Retry/Reporting/Contracts).

⸻

Risikoabschätzung (vor Empfehlungen)
	•	Technisch: Mittel. Hauptgefahr ist “mehr Automation, mehr Kettenreaktionen” (Retries, Polling, Token).
	•	Organisatorisch: Niedrig-mittel. Breaking change durch Abschalten des MVP-Direktpfads.
	•	Sicherheitsfläche: Mittel. Mehr Endpoints (/events) + Tokens. Unbedingt: token scopes, rate limits.

⸻

Ungewissheitsursachenanalyse (verpflichtend)

Unsicherheitsgrad: 0.34 (moderat)
Ursachen:
	•	Ich kann aus dem Merge-Dump verlässlich Workflows/Skripte/Tests zitieren (z.B. semantAH publish workflow ￼, aussensensor MVP-Workaround ￼, plexer fanout tests ￼), aber nicht für jedes Repo alle konkreten Datei-/Modulnamen vollständig bestätigen, weil der aktuelle Ausschnitt nur Teilpfade zeigt.
	•	“Funktioniert wirklich” hängt von Deployments/Secrets (PLEXER_URL, Tokens) ab; der Dump belegt die vorgesehenen Stellen, nicht deinen aktuellen Runtime-Zustand.

⸻

Leitfragen zum Schluss
	1.	War das die kritischste Erörterung? Fast. Kritischer wäre: die Runtime-Topologie (wo laufen welche Services wirklich?) gegen CI/Contracts zu spiegeln. Vorschlag: einmal “docker compose / systemd units / ports” als Artefakt in Chronik oder Leitstand ablegen und als Observability-Quelle nutzen.
	2.	Von allen Seiten beleuchtet? Technisch ja (Events, Artefakte, CI). Unbeleuchtet bleibt: Berechtigungsmodell (Token scopes) und Backpressure (Ratenbegrenzung). Vorschlag: “Token-Scopes + Rate Limits” als eigenes Contract/Policy-Set.

Wenn du willst, kann ich als nächsten Schritt eine PR-Liste (repo → branch → konkrete Files/patch plan) ableiten – ohne weitere Fragen, nur aus diesen Anweisungen.



@jules: in diesem repo nur die anweisungen für dieses repo ausführen! 
