∴ Dialektische Erörterung (∴modus.recherche im Dump) — „Linkproblem“ & PR #640

These: Die Links sind nicht „kaputt“, sondern zeigen auf falsche Orte

Im Dump ist klar erkennbar:
	•	Im metarepo existieren die Ziel-Dokumente, aber nicht unter docs/…, sondern unter
docs/system/heimgewebe-organismus.md und docs/system/heimgewebe-zielbild.md.
	•	Im hausKI-Repo existieren hauski-skizze.md und hauski-stack.md, aber unter docs/…, nicht im Repo-Root.

Damit erklärt sich beides:
	•	Lychee macht aus relativen Root-Links faktisch file:///…/hauski-stack.md → nicht gefunden, weil Datei in docs/ liegt.
	•	GitHub-Link auf metarepo/blob/main/docs/heimgewebe-… → 404, weil Datei real in docs/system/… liegt.

Antithese: Man könnte es „quick & dirty“ über Ignore lösen

Du könntest 404s und file://-Pfadprobleme schlicht ignorieren (Lycheeignore / Excludes).
Das ist aber Drift-fördernd: Es macht den Check zahm, nicht die Doku wahr.

Synthese: „Kanonische Pfade“ + „kompatible Shims“ (optional)

Ideal (robust):
	1.	Alle Repos linken auf die kanonischen Pfade im metarepo (docs/system/...).
	2.	Optional im metarepo: Stub-Dateien an den alten Orten (docs/heimgewebe-…) als Weiterleitung, falls du Backlinks stabil halten willst.
	3.	Der metarepo-Guard (organismus-readme-guard.yml) muss zur Realität passen (sonst bewacht er ein Phantom).

Und ja: Das ist exakt die Sorte Problem, bei der ein Organismus lernt, ob er „Wahrheit“ als Pfad oder als Vertrag versteht.

⸻

Konkrete Lösung in diesem PR (hausKI#640)

1) Fix in hausKI/README.md (lokale Dateien)

Ersetze Root-Links durch docs/…:

- [`hauski-skizze.md`](hauski-skizze.md) – …
- [`hauski-stack.md`](hauski-stack.md) – …
+ [`docs/hauski-skizze.md`](docs/hauski-skizze.md) – …
+ [`docs/hauski-stack.md`](docs/hauski-stack.md) – …

Damit verschwindet das file:///home/runner/work/hausKI/hausKI/...-Elend sofort.

2) Fix in hausKI/README.md (metarepo-Links)

Ersetze die falschen docs/...-Ziele durch docs/system/...:

- https://github.com/heimgewebe/metarepo/blob/main/docs/heimgewebe-zielbild.md
- https://github.com/heimgewebe/metarepo/blob/main/docs/heimgewebe-organismus.md
+ https://github.com/heimgewebe/metarepo/blob/main/docs/system/heimgewebe-zielbild.md
+ https://github.com/heimgewebe/metarepo/blob/main/docs/system/heimgewebe-organismus.md

Das ist die direkte Ursache der 404.

Mini-Falle: Falls metarepo privat ist und dein CI-Token dort keinen Zugriff hat, kann GitHub trotzdem 404 liefern. Dann ist es kein Pfad-Problem, sondern ein Auth/Visibility-Problem. Im Dump wirkt es aber primär wie Pfad.

⸻

Anweisung pro Repo (ideal, damit das nicht wiederkommt)

Repo: hausKI
	•	README: lokale Doku immer als docs/... referenzieren, nicht Root.
	•	metarepo-Links: immer kanonisch auf docs/system/....
	•	Optional: Ergänze eine kleine „Docs-Index“-Sektion im docs/-Verzeichnis und linke nur dorthin (stabilisiert URLs, senkt Link-Churn).

Repo: metarepo

Du hast zwei saubere Optionen — wähle eine (oder kombiniere):

Option A (streng kanonisch): Guard + Referenzen auf docs/system/... umstellen
	•	Update .github/workflows/organismus-readme-guard.yml:
	•	Prüfe auf docs/system/heimgewebe-organismus.md
	•	Prüfe auf docs/system/heimgewebe-zielbild.md

Option B (kompatibel): Zusätzlich Stub-Dateien an alten Pfaden
	•	Lege an:
	•	docs/heimgewebe-organismus.md
	•	docs/heimgewebe-zielbild.md
	•	Inhalt minimal: „Moved to …“ + Link auf docs/system/...
	•	Dann kannst du (a) Guard unverändert lassen oder (b) beides erlauben.

Ich würde A + B nehmen, wenn du Backlinks aus alten Repos erwartest. Nur A, wenn du bewusst breaking Link-Changes akzeptierst.

Repo: wgx / allgemeine CI-Regel

Wenn Lychee Teil des Standard-Guards ist:
	•	Ein kanonisches Linkziel (z.B. metarepo/docs/system/...) sollte als „Contract“ gelten.
	•	Optional eine repoweite Regel: „Keine Root-Docs links, wenn Datei in docs/ liegt“ (kleiner Guard, große Wirkung).

⸻

Vermeidbare Fehler (automatisch markiert)
	•	Fehler 1: „Die Datei ist nicht da“ — sie ist da, aber am anderen Pfad (docs/…).
	•	Fehler 2: „Die metarepo-Dokumente fehlen“ — sie existieren, aber in docs/system/….
	•	Fehler 3: Lychee-Ignore als Dauerlösung → macht Checks blind und driftet dich langfristig in Doku-Fäulnis.

⸻

Risikoabschätzung
	•	Technisches Risiko (niedrig): README-Linkänderungen sind harmlos.
	•	Organisatorisches Risiko (mittel): Wenn mehrere Repos bereits auf alte metarepo-Pfade linken, erzeugt Umzug ohne Stubs „stillen Link-Tod“.
	•	Semantisches Risiko (mittel): „Kanonischer Pfad“ ist implizit. Ohne explizite Konvention kommt das wieder.

⸻

Verdichtete Essenz

Die Links sind falsch, weil hausKI-Docs unter docs/ liegen und metarepo-Zielbild/Organismus unter docs/system/.
Fix im PR: README-Links auf docs/... bzw. metarepo/docs/system/... ändern.
Ideal langfristig: metarepo-Guard anpassen und optional Stubs für Backward-Compatibility.

⸻

Ungewissheit (mit Ursachenanalyse)

Unsicherheitsgrad: 0.22
Ursachen:
	1.	Ich sehe die PR-Ansicht auf GitHub nicht zuverlässig in voller Detailtiefe (dynamische GitHub-UI), arbeite daher primär dump-basiert.
	2.	Ich kenne nicht sicher, ob metarepo im CI-Kontext von hausKI per Token als privat zugreifbar ist — 404 kann Pfad oder Auth bedeuten.
	3.	Ich habe deine aktuelle .lycheeignore/Lychee-Config im PR-Kontext nicht vollständig gegengeprüft; möglich ist ein Pattern-Mismatch.

⸻

Eine produktive, leicht böse Ironie

Link-Checks sind wie Wachhunde: Wenn du ihnen beibringst, „404“ zu ignorieren, bellen sie weniger — und beißen irgendwann dich.

⸻

Leitfragen (kritischer / vollständiger)
	1.	War das die kritischste Erörterung? Fast. Kritischer wäre ein expliziter „Docs-Pfad-Contract“ im metarepo, den WGX/Guards durchsetzen.
	2.	Unbeleuchtete Punkte: Repo-übergreifende Backlinks (wer linkt schon auf die alten Pfade?) — das entscheidet, ob Stubs Pflicht sind.

@jules: in diesem repo nur die anweisungen für dieses repo ausführen!
