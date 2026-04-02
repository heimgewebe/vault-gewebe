These

Ein Folge-PR ist sinnvoll – aber nur unter strenger Prämisse: Diagnose → Minimal-Eingriff.
Aktuell geht es nicht mehr um „mehr bauen“, sondern um Belegbarkeit, Entkopplung und Rauschreduktion.

Antithese

Ein Folge-PR ist nicht sinnvoll, wenn er:
	•	neue Features/Guards einführt
	•	Tests erweitert „weil man schon dran ist“
	•	Architektur neu aufspannt
→ Das würde die erreichte Kohärenz wieder verwässern.

Synthese

Ja, sinnvoll – aber nur als chirurgischer PR mit klarer Kante.

⸻

🎯 Empfohlener Folge-PR (Scope strikt begrenzen)

Zielbild

Ein PR, der nur diese drei Dinge finalisiert:
	1.	Beweis der Guard-Kohärenz (run.sh ↔ CI)
	2.	Lockfile-Rauschreduktion
	3.	(optional, klein) PR-Zuschnitt nachträglich entflechten

⸻

🧪 Diagnose (Gate vor Umsetzung)

Ist-Zustand belegen (kein Raten):
	•	Snippet aus scripts/guard/run.sh mit exakt aufgerufenen Guards
	•	Snippet aus .github/workflows/ci.yml mit Guard-Tests
	•	rg -n "(test:unit|vitest)" → nur in web.yml
	•	Diff-Stat für pnpm-lock.yaml (Anzahl Zeilen + Gründe)

Hypothesen (max. 3):
	1.	run.sh und CI sind deckungsgleich, aber nicht explizit belegt
	2.	Lockfile enthält unnötigen Churn
	3.	PR ist funktional korrekt, aber semantisch zu breit

Stop-Kriterium:
Wenn 1)–3) durch Snippets/Outputs belegt sind → Patch erlaubt.

⸻

🔧 Anweisung an Copilot (Follow-Up PR)

AUFGABE:

Erstelle einen minimalen Folge-PR zur Abschlusshärtung.
Keine neuen Features. Keine neuen Tests. Kein Scope-Wachstum.

---

PHASE 1 — GUARD-KOHÄRENZ BEWEISEN (kein Refactor)

1. Zeige in PR-Description:
   - run.sh: exakte Guard-Aufrufe (Snippet)
   - ci.yml: exakte Guard-Tests (Snippet)
2. Wenn identisch:
   - KEINE Codeänderung
   - nur explizite Dokumentation (Kommentar/PR-Text)
3. Wenn nicht identisch:
   - minimal angleichen (Reihenfolge: compose → token → metrics)

STOP:
run.sh == CI Guard Scope (belegt, nicht behauptet)

---

PHASE 2 — LOCKFILE-DRIFT MINIMIEREN

1. Prüfe pnpm-lock.yaml:
   - ist Diff ausschließlich durch vitest erklärbar?
2. Falls nein:
   - pnpm install --frozen-lockfile
   - ggf. neu generieren
   - Diff minimieren
3. Keine funktionale Änderung

STOP:
Lockfile-Diff ist minimal und erklärbar

---

PHASE 3 — TEST-GOVERNANCE VERIFIZIEREN

1. Sicherstellen:
   - vitest nur in web.yml
   - nicht in ci.yml / Justfile
2. rg-Suche durchführen und Ergebnis im PR zeigen

STOP:
Genau ein Ausführungsort für Web-Unit-Tests

---

PHASE 4 — (OPTIONAL) PR-NACHSCHNITT

Wenn sinnvoll:
- separaten „docs-only“ Commit für Kommentare
ODER
- PR-Description klar in Achsen gliedern:
  (CI / Guards / Web / Rust / Lockfile)

KEINE Codeänderung notwendig

---

AUSGABE:

1. Minimaler Diff (nur wenn nötig)
2. Belege (Snippets)
3. Verifikationsstatus (lokal/CI)
4. Unsicherheitsgrad
5. Interpolationsgrad

---

ESSENZ:

Nicht verbessern.
Nicht erweitern.

Nur beweisen, dass das System wirklich das tut, was es behauptet.


⸻

⚠️ Risiko–Nutzen

Nutzen
	•	eliminiert letzte „Glaubensstellen“
	•	macht PR review-fest (belegt statt behauptet)
	•	reduziert Lockfile-Rauschen

Risiken
	•	zu viel „Aufräumen“ → unbeabsichtigte Änderungen
	•	Lockfile-Regen → erneuter Diff-Lärm

→ daher: strikt minimal bleiben

⸻

🔄 Alternative Sinnachse

Nicht:

„Was fehlt noch?“

sondern:

„Was wird aktuell nur geglaubt, aber nicht gezeigt?“

Der Folge-PR ist kein Bau-PR, sondern ein Beweis-PR.

⸻

Essenz

Ja, ein Folge-PR ist sinnvoll – aber nur als Beweis- und Entschlackungs-PR.
Alles andere wäre Rückschritt.

⸻

Unsicherheitsgrad: 0.13
Ursachen: kein vollständiger Live-Snapshot aller Dateien, nur Diff-Analyse

Interpolationsgrad: 0.08
Annahmen: run.sh vermutlich korrekt, Lockfile enthält potentiell unnötigen Churn

⸻

🪶 Humor mit Funktion:
Dein System ist jetzt wie ein sauber gebautes Haus, bei dem alle sagen: „Sieht stabil aus.“
Der Folge-PR ist der Moment, in dem jemand mit der Wasserwaage kommt – nicht um neu zu bauen, sondern um zu zeigen, dass es wirklich gerade ist.