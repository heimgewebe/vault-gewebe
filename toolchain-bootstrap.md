∴ Dialektische Erörterung: „Jules jetzt“ (Phase-1-Stabilisierung)

These: Phase 1 muss die Invariante erzwingen: yq existiert deterministisch, bevor irgendwer toolchain.versions.yml parst.
Antithese: Zu viel Umbau (WGX/Agent-Mode/validate-toolchain Refactor) erzeugt neue Drift und verschiebt die Ursache.
Synthese: Minimaler, harter Patch: ein einziger, früher Bootstrap-Step (yq-pin ensure + PATH korrekt) + ein Assert. Rest unangetastet.

⸻

Jules-Anweisung (Phase 1, minimal-invasiv, pro Repo anwendbar)

Ziel: CI darf nie mehr bei „yq missing / not in PATH“ sterben.
Scope: Nur Workflow(s) + ggf. kleines Hilfsscript. Keine WGX-Neuerfindung, kein Agent-Mode-Umbau, kein validate-toolchain Refactor.

0) Arbeitsmodus (Pflicht)
	•	Arbeite nur im aktuellen Repo, keine Cross-Repo-Änderungen.
	•	Keine “nice to have”-Logs. Nur deterministische Invariante.
	•	Nach jedem Patch: grep/Check, dass yq nirgendwo vor Setup genutzt wird.

⸻

A) Finde die früheste Stelle, an der toolchain/yq genutzt wird
	1.	Suche nach yq-Nutzung und toolchain-Validation in .github/workflows/*.yml:
	•	yq 
	•	validate-toolchain
	•	toolchain.versions.yml
	•	scripts/tools/yq-pin.sh
	•	.github/actions/setup-yq
	2.	Identifiziere den ersten Step, der yq direkt oder indirekt braucht.

Ergebnis: In genau diesem Job muss ein „Setup yq“ davor.

⸻

B) Implementiere den deterministischen Bootstrap-Step (immer gleich)

Patch: „Setup yq“ + „Assert yq“ direkt vor erster Nutzung

Füge in betroffenen Jobs zwei Steps ein (so früh wie möglich, nach Checkout):

Step 1: Setup yq (via existing pin script)

- name: Toolchain: setup yq (deterministic)
  shell: bash
  run: |
    set -euo pipefail
    test -x scripts/tools/yq-pin.sh || { echo "::error::missing scripts/tools/yq-pin.sh"; ls -la scripts/tools || true; exit 1; }
    scripts/tools/yq-pin.sh ensure

    # IMPORTANT: GITHUB_PATH affects next steps only; export for this step too
    export PATH="$PWD/tools/bin:$PATH"
    echo "$PWD/tools/bin" >> "$GITHUB_PATH"

Step 2: Assert yq

- name: Toolchain: assert yq
  shell: bash
  run: |
    set -euo pipefail
    export PATH="$PWD/tools/bin:$PATH"
    echo "TRUTH: os=$(uname -s) arch=$(uname -m)"
    type -a yq
    yq --version

Regel: Danach darf yq überall verwendet werden. Davor: nicht.

⸻

C) Verhindere die häufigste GitHub-Actions-Falle (PATH wirkt erst später)

Wenn es später Steps gibt, die in derselben Step-Shell yq nutzen, stelle sicher:
	•	entweder yq wird dort über export PATH="$PWD/tools/bin:$PATH" ergänzt
	•	oder (besser) diese Steps sind nach dem Setup-Step, sodass $GITHUB_PATH greift.

Minimal: Lass den Assert-Step stehen. Wenn Assert „type -a yq“ ok ist, ist PATH in Folge-Steps ok.

⸻

D) Mach es robust gegen Arch/OS (ohne neue Download-Logik)

Keine curl-Downloads in Workflow. Das ist Drift.
Das Pin-Script ist der kanonische Mechanismus. Wenn es arch-bugs hat, wird das separat gefixt – aber Phase 1 zwingt erstmal „es muss laufen“.

⸻

E) Optional: ultra-kurzes Forensik-Artefakt (nur wenn ihr es schon nutzt)

Wenn in diesem Repo das Problem weiter fluktuiert (Netz/Runner), dann nicht mehr Log, sondern Artefakt.

Erstelle scripts/tools/toolchain-diag.sh (klein, 30–60 Zeilen) und rufe es nur bei failure() auf, um artifacts/toolchain.diag.txt zu erzeugen.
Wenn ihr das schon angefangen habt: ok. Wenn nicht: weglassen (Phase 1 fokussiert).

⸻

F) Definition of Done (Phase 1)

Jules muss am Ende nachweisen:
	1.	In CI-Logs steht vor toolchain-Reads:
	•	Toolchain: setup yq (deterministic) erfolgreich
	•	Toolchain: assert yq zeigt yq-Pfad und Version
	2.	Kein Step nutzt yq vor dem Setup.
	3.	CI läuft mindestens einmal grün (oder scheitert an echten Contract-Fehlern, nicht „yq missing“).

⸻

Commit-Vorschlag (sauber, klein)
	1.	ci: ensure deterministic yq bootstrap before toolchain validation
	2.	(optional) ci: add minimal toolchain diag artifact on failure

⸻

∴ Verdichtete Essenz

Nicht „mehr logging“.
Nur: yq-pin ensure + PATH + Assert vor der ersten yq-Nutzung. Das stabilisiert die Invariante mit minimalem Umbau.

⸻

Tiefgründig-ironische Auslassung

Wenn yq wieder verschwindet, ist das Heimgewebe nicht „kaputt“.
Es macht nur wieder dieses alte Spiel: „Zeig mir, wo deine Wahrheit wohnt – oder ich räume sie weg.“

⸻

Ungewissheit

Unsicherheitsgrad: 0.24
Warum: Ich sehe hier nicht den kompletten Workflow-Graph des spezifischen Repos; der genaue erste yq-Verbrauch kann variieren (toolchain-guard vs ci.yml).
Warum trotzdem ok: Die Anweisung ist strukturell: Setup+Assert direkt vor erster Nutzung – unabhängig vom konkreten Layout.

⸻

Jules-Prompt (copy/paste, repo-lokal)

@jules: In diesem Repo Phase-1 fix implementieren.
	1.	Finde in .github/workflows/*.yml den frühesten Step, der yq oder toolchain validation benötigt (yq / validate-toolchain / toolchain.versions.yml).
	2.	Direkt nach checkout und vor diesem Step zwei Steps einfügen:
	•	„Toolchain: setup yq (deterministic)“: scripts/tools/yq-pin.sh ensure, danach export PATH="$PWD/tools/bin:$PATH" und echo "$PWD/tools/bin" >> "$GITHUB_PATH".
	•	„Toolchain: assert yq“: type -a yq und yq --version (mit export PATH="$PWD/tools/bin:$PATH").
	3.	Keine curl-Downloads in Workflows hinzufügen. Keine WGX/Agent-Mode Änderungen. Keine validate-toolchain Refactors.
	4.	Commit message: ci: ensure deterministic yq bootstrap before toolchain validation.