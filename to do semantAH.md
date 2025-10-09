alles klar — hier ist die Anleitung in kleine, nacheinander gut machbare Häppchen mit klaren Akzeptanzkriterien.

1) 

2) 
⸻

3) Cosine-Search implementieren

Ziel: einfache Ähnlichkeitssuche über gespeicherte Vektoren.
	•	In store.rs:
	•	fn cosine(a:&[f32], b:&[f32]) -> f32
	•	pub fn search(&self, namespace:&str, query:&[f32], k:usize, _filters:&serde_json::Value) -> Vec<(doc_id, chunk_id, score)>
→ alle Items im Namespace scoren, absteigend sortieren, top-k zurück.
	•	In lib.rs /index/search:
	•	Erwartet filters optional; Query-Embedding kommt für jetzt in meta["embedding"] (wie bei Upsert).
	•	Antwort in SearchResponse.

Akzeptanzkriterien
	•	Neuer Test upsert_and_search_roundtrip:
	•	2 Chunks mit 3D-Vektoren, Query nahe an A → A vor B, Score(A) > Score(B).

⸻

4) API-Kontrakt minimal dokumentieren

Ziel: Konsument:innen wissen, was geschickt werden muss.
	•	README.md / docs/quickstart.md:
	•	Beispiel-POST /index/upsert Body (mit meta.embedding).
	•	Beispiel-POST /index/search Body (mit Query-meta.embedding).
	•	Smoke: curl -X POST .../search → leere oder sinnvolle results.

Akzeptanzkriterien
	•	Beispiele lassen sich mit laufendem indexd per curl ausführen.

⸻

5) Python-Kleber zum Hochschieben (ohne Netzabhängigkeit)

Ziel: vorhandene Embeddings in den Index schieben.
	•	Neues Script scripts/push_index.py:
	•	Liest .gewebe/embeddings.parquet (oder vorhandenes Artefakt) via pandas/pyarrow.
	•	Baut Batches: {doc_id, namespace, chunks:[{id,text,meta:{embedding}}]}.
	•	POST /index/upsert zu http://localhost:8080.
	•	Makefile:
	•	push-index: uv run python scripts/push_index.py.

Akzeptanzkriterien
	•	make push-index schiebt ohne Fehler; indexd-Logs zeigen „received upsert“.

⸻

6) Tests im CI einhängen

Ziel: Repro in GitHub Actions.
	•	Nix Großes ändern: cargo test deckt neue Tests ab.
	•	Optional: kleiner E2E-Schritt (ohne Netz):
	•	cargo run -p indexd & sleep 1 && curl -fsS localhost:8080/healthz.

Akzeptanzkriterien
	•	CI läuft grün, inkl. indexd-Tests.

⸻

7) (Optional) Fallback: Query-Text → Embedding im Dienst

Ziel: Komfort: /index/search akzeptiert query als Text.
	•	Später: embeddings-Crate (oder Python-Service) anbinden und für query den Vektor intern berechnen, falls kein meta.embedding kommt.

Akzeptanzkriterien
	•	/index/search funktioniert mit reinem query-Text; Ergebnisse plausibel.

⸻

Wenn du magst, liefere ich dir direkt die Patches für Schritte 2–3 (Store + Cosine + Tests) und Schritt 5 (push_index.py).