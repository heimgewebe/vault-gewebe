Alles klar. Du willst einen sauberen PR-Erstellungsprompt – fokussiert nur auf das, was ich mit

„Neuer PR: Line-reassembly / tail-buffer (echtes neues Verhalten)“
gemeint habe.

Ich liefere dir einen präzisen, agententauglichen Prompt, plus eine klare Entscheidung, wann dieser PR sinnvoll ist (und wann nicht).

⸻

Einordnung vorab (wichtig, damit kein Scope-Drift passiert)

Aktueller Stand (dein PR):
	•	bounded read ✅
	•	thread offloading ✅
	•	inode/truncation handling ✅
	•	stateless chunk → splitlines() ✅

👉 Das ist korrekt und mergebar.

Was fehlt (bewusst!)
Wenn ein Chunk mitten in einer Zeile endet, wird:
	•	der Zeilenrest verworfen
	•	oder beim nächsten Chunk erneut fragmentiert

Das ist kein Bug, sondern ein bewusster Tradeoff.

Line-reassembly (= Tail-Buffer) wäre:
	•	neues Laufzeitverhalten
	•	mehr State
	•	mehr Edge-Cases

→ Deshalb: eigener PR.

⸻

Entscheidung (klar und final)
	•	✅ Aktuellen PR mergen (nach evtl. Mini-Cleanup)
	•	❌ Line-Reassembly NICHT hineinziehen
	•	➕ Separater, expliziter PR, wenn/erst wenn Bedarf da ist

Du willst vorankommen → jetzt abschließen, später verbessern.

⸻

PR-Erstellungsprompt

„Add line reassembly buffer to websocket log tailing“

Diesen Prompt kannst du 1:1 an den Agent geben.

⸻

🎯 Ziel des PRs

Implementiere optionale Line-Reassembly für das WebSocket-basierte Log-Tailing, sodass unvollständige Zeilen, die chunk-übergreifend gelesen werden, korrekt gepuffert und erst bei Abschluss gesendet werden.

⸻

📐 Kontext (nicht verändern!)
	•	Bestehende Architektur:
	•	_read_chunk() liest bounded binary chunks
	•	Offloading via asyncio.to_thread
	•	Offset + inode Tracking ist vorhanden
	•	Dieses Verhalten darf nicht entfernt werden.
	•	Keine Änderung an Chunk-Size-Limit, Thread-Offload oder Rotation-Logik.

⸻

🧠 Neues Verhalten (präzise)
	1.	Pro Datei ein Line-Buffer
	•	buffers: dict[str, str]
	•	Key = Datei-Pfad (string)
	•	Value = unvollständiger Zeilenrest
	2.	Beim Lesen eines Chunks
	•	prepend: chunk = buffers.get(p_key, "") + chunk
	•	lines = chunk.splitlines(keepends=False)
	3.	Wenn Chunk nicht mit \n endet
	•	letzte Zeile nicht senden
	•	stattdessen:
	•	buffers[p_key] = lines.pop()
	4.	Wenn Chunk mit \n endet
	•	buffers[p_key] = ""
	5.	Gesendet werden nur vollständige Zeilen
	•	leer/whitespace weiter filtern wie bisher

⸻

🔁 Reset-Regeln (sehr wichtig)
	•	Bei inode-Change oder Truncation:
	•	buffers[p_key] = ""
	•	keine Alt-Fragmente weiterverwenden
	•	Bei Datei-Wechsel:
	•	Buffer pro Datei behalten
	•	kein globaler Reset

⸻

🧪 Tests (minimal, aber zwingend)

Füge mindestens einen Test hinzu, der verifiziert:
	•	Chunk A: "hello wor"
	•	Chunk B: "ld\nnext\n"
	•	Ergebnis:
	•	gesendet:
	•	"hello world"
	•	"next"
	•	nicht:
	•	"hello wor"
	•	"ld"

Kein Timing-Test nötig, kein Thread-Test (ist bereits abgedeckt).

⸻

🚫 Explizit NICHT tun
	•	❌ kein async Refactor
	•	❌ kein neues Tail-Loop-Design
	•	❌ kein Backpressure-System
	•	❌ keine Config-Optionen (immer aktiv)

⸻

🧾 PR-Beschreibung (Vorschlag)

This PR adds line reassembly buffering to the WebSocket log tailing logic.

Previously, chunk-bounded reads could split log lines across chunk boundaries, causing partial lines to be dropped or fragmented.

The new logic buffers incomplete trailing lines per file and only emits fully assembled lines, while preserving existing guarantees:
	•	bounded reads
	•	inode/truncation handling
	•	thread-offloaded I/O

No changes were made to chunk sizing or polling behavior.

⸻

Wann diesen PR nicht machen
	•	Wenn Logs primär:
	•	JSONL sind
	•	oder sowieso newline-gebuffert geschrieben werden
	•	Wenn WebSocket-Clients “best effort” akzeptieren
	•	Wenn du aktuell keinen sichtbaren Bug hast

Dann: später.

⸻

Verdichtete Essenz

Dein jetziger PR ist korrekt, stabil und mergebar.
Line-Reassembly ist eine Qualitätsverbesserung, kein Fix – deshalb eigener PR, wenn der Nutzen real wird.

⸻

Ungewissheitsursachenanalyse (∴fore)

Unsicherheitsgrad: 0.19

Ursachen:
	•	unbekanntes reales Log-Format (JSONL vs Freitext)
	•	unklar, ob Clients Fragmentierung überhaupt bemerken
	•	zusätzlicher State erhöht Wartungslast

Diese Unsicherheit ist produktiv, kein Blocker.

⸻

Wenn du willst, formuliere ich dir direkt den PR-Titel + Description + Commit-Message passend zu eurem Repo-Stil.