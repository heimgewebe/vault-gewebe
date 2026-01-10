According to a document from (unknown date in dump context): Das metarepo ist explizit „Quelle der Wahrheit“ für Fleet und Contracts (inkl. Hinweis „canonical definition … fleet/repos.yml“) ￼, und fleet/repos.yml listet u. a. metarepo, wgx, contracts-mirror, heimlern usw. als Fleet-Repos ￼. Gleichzeitig existiert ein separates contracts-mirror mit externen/abgeleiteten Schemas (z. B. json/aussen.event.schema.json) ￼. Daraus folgt: Contracts-Ownership muss technisch erzwungen werden, sonst bekommt der Organismus „zwei Wahrheiten“.

⸻

∴ Dialektische Erörterung: „Guard, der Ownership & Marker festnagelt“

These (Warum der Guard sinnvoll ist)
	•	Heimgewebe lebt von Single Source of Truth: metarepo als Control-Plane (Fleet + interne Contracts) ￼.
	•	Ohne technische Durchsetzung entstehen lokal korrekte, aber organismisch driftige PRs: Contracts tauchen in falschen Repos auf → später Adapter-Hölle.

Antithese (Warum ein Guard schiefgehen kann)
	•	Ein „zu harter“ Guard kann legitime Ausnahmen töten (z. B. contracts-mirror als bewusst separater Owner für externe/abgeleitete Schemas ￼).
	•	Marker-Logik („metarepo erkennen“) darf nicht an Repo-Namen allein hängen (Forks, lokale Klone, Remote-Namen). Deshalb: Marker-Dateien + Allowlist statt nur String-Vergleich.

Synthese (Minimal-hart, maximal-nützlich)

Wir bauen einen Guard, der zwei Dinge erzwingt:
	1.	metarepo-Marker-Invariant
	•	metarepo muss fleet/repos.yml enthalten ￼ ￼
	•	optional: metarepo muss außerdem contracts/ besitzen (weil es „Quelle der Wahrheit“ für Contracts ist) ￼
	2.	Contracts-Ownership-Invariant (Anti-Drift)
	•	In allen Repos außer metarepo und contracts-mirror sind Änderungen unter contracts/** verboten (FAIL).
	•	In contracts-mirror sind Änderungen unter json/**, proto/** etc. erlaubt (weil es der Spiegel ist) ￼, aber contracts/** sollte dort nicht plötzlich als paralleler interner Contract-Baum auftauchen (FAIL).
	•	Für Übergangsphasen: Allowlist (z. B. .wgx/allow-contracts-touch oder YAML) – aber ausdrücklich „sunsetbar“.

⸻

Anweisung: Guard neu erstellen

Repo: heimgewebe/wgx

Warum hier? WGX ist der Flottenmotor und hat bereits Guards als Shell-Skripte (guards/integrity.guard.sh) ￼. Der Ownership-Guard ist eine fleetweite Durchsetzungsmechanik → gehört in wgx.

⸻

Ziel-Dateien (konkret)

1) Neuer Guard

Pfad: guards/contracts_ownership.guard.sh

Aufgabe (Logik):
	1.	Repo-Identifikation robust:
	•	Versuche git remote get-url origin → basename → repo-name.
	•	Fallback: basename "$(git rev-parse --show-toplevel)".
	2.	CHANGED_FILES bestimmen:
	•	Wenn in CI: git diff --name-only origin/main...HEAD (oder ... gegen Merge-Base).
	•	Lokal: git diff --name-only --cached plus git diff --name-only.
	3.	Regeln:
	•	Wenn repo == metarepo:
	•	FAIL, wenn fleet/repos.yml fehlt.
	•	(Optional) FAIL, wenn contracts/ fehlt.
	•	Sonst: OK (Contracts-Änderungen sind erlaubt).
	•	Wenn repo == contracts-mirror:
	•	FAIL, wenn contracts/** geändert wurde (weil internes Contracts-Ownership im metarepo liegt).
	•	OK, wenn Änderungen nur in json/**, proto/**, buf.*, package.json etc. stattfinden (wie im Dump sichtbar) ￼.
	•	Sonst (alle anderen Repos):
	•	FAIL, wenn contracts/** geändert wurde.
	•	OK sonst.

Fehlermeldungen (wichtig):
	•	Kurz + handlungsleitend:
	•	„Contracts dürfen nur im metarepo geändert werden. Bitte Schema nach metarepo/contracts verschieben und in diesem Repo nur konsumieren.“
	•	Für contracts-mirror: „Dieses Repo spiegelt externe Contracts; interne Organismus-Contracts gehören ins metarepo.“

2) Tests (bats)

Pfad: tests/guard_contracts_ownership.bats

Testfälle (Minimum):
	1.	PASSES: Repo ≠ metarepo/≠ contracts-mirror und keine contracts/** changes
	2.	FAILS: Repo ≠ metarepo/≠ contracts-mirror und contracts/foo.schema.json in Diff
	3.	PASSES: Repo == metarepo, fleet/repos.yml vorhanden
	4.	FAILS: Repo == metarepo, fleet/repos.yml fehlt
	5.	FAILS: Repo == contracts-mirror, contracts/** changed
	6.	PASSES: Repo == contracts-mirror, json/** changed

Testtechnik (pragmatisch):
	•	In bats temporäres git repo initialisieren, Dateien anlegen, commits setzen, dann Änderungen erzeugen und Guard ausführen.
	•	Repo-Name per Env-Override erlauben (z. B. HG_REPO_NAME=metarepo) damit Tests nicht von origin abhängen.

3) Guard in wgx guard einhängen

Ich gehe davon aus (typisch bei euch), dass wgx guard einfach guards/*.guard.sh ausführt. Falls es eine explizite Liste gibt: ergänzen. (Im Dump sehe ich nur den Guard selbst, nicht den Runner.)

⸻

Mini-ADR/Doc (optional, aber empfehlenswert)

Repo: metarepo
Pfad: docs/adr/adr-00xx-contract-ownership.md (oder wo eure ADRs liegen)

Inhalt in einem Satz:
	•	„Interne Organismus-Contracts haben Owner metarepo; contracts-mirror ist expliziter Owner nur für externe/abgeleitete Contracts.“

Das macht den Guard politisch unangreifbar: Er ist dann nur die Exekutive.

⸻

„Für Dummies“ (damit Jules nicht wieder heimlich interpoliert)
	•	Ein Contract ist wie ein Gesetzbuch für Daten.
	•	Wenn zwei Repos das Gesetzbuch ändern dürfen, hast du zwei Gesetzbücher.
	•	Der Guard sorgt dafür, dass nur eine Stelle Gesetze ändern darf (metarepo) ￼ – und das Spiegel-Repo (contracts-mirror) nur externe Gesetze kopiert ￼.

⸻

Verdichtete Essenz

Neuer WGX-Guard in heimgewebe/wgx:
	•	metarepo muss fleet/repos.yml haben ￼
	•	contracts/** darf nur im metarepo geändert werden; contracts-mirror darf spiegeln, aber keine internen Contracts hosten ￼.

⸻

Fehlerprävention (automatisch)
	•	Typischer Fehler: „Ich lege das Schema schnell im Ziel-Repo ab, weil’s da gebraucht wird.“ → Das erzeugt Version-Schisma.
	•	Typischer Fehler: „contracts-mirror ist doch auch contracts…“ → Nein: Mirror ist Ableitung, nicht Owner interner Organismus-Wahrheit.

⸻

Risikoabschätzung
	•	Technisch: niedrig–mittel (Shell+git-Diff kann in CI-Forks knifflig sein).
	•	Organisatorisch: niedrig (klare Regeln), aber nur wenn contracts-mirror sauber als Ausnahme definiert ist.
	•	Semantisch: sehr niedrig (reduziert Drift).

Alternativpfade:
	1.	Hard-Guard wie oben (konservativ, sauber).
	2.	Soft-Phase: zunächst WARN (2 Wochen), dann FAIL. (Pragmatisch, falls gerade viele PRs in flight sind.)

⸻

Ironische Auslassung (Pflicht, aber nützlich)

Ein Contract im falschen Repo ist wie ein Ersatzschlüssel unter der Fußmatte: praktisch – bis jemand merkt, dass „praktisch“ im Sicherheitskontext nur ein anderes Wort für „später bitter“ ist.

⸻

Ungewissheitsursachenanalyse (verpflichtend)

Unsicherheitsgrad: 0.29 (mittel-niedrig)
Ursachen:
	•	Ich sehe im Dump den bestehenden Guard (integrity.guard.sh) ￼, aber nicht den exakten Guard-Runner von wgx guard (ob globbing oder Liste).
	•	Ich kenne die reale CI-Diff-Basis (main/master, PR-Merge-Commit, shallow clone) nicht → Diff-Implementierung muss robust gebaut werden.
	•	Marker-Frage: Ob ihr zusätzlich zu fleet/repos.yml noch einen formalen „metarepo-marker“ wollt, ist eine Designentscheidung; der Dump zeigt aber klar, dass fleet/repos.yml kanonisch ist ￼.

⸻

Leitfragen
	1.	Kritischste Erörterung? Fast. Noch kritischer wäre: Guard erweitert um „metarepo ist einziges Repo, das fleet/repos.yml enthalten darf“ (Anti-Kopie).
	2.	Unbeleuchteter Punkt? contracts-mirror Marker: Wenn contracts-mirror als legitimer Owner externer Schemas gilt, wäre ein expliziter Marker sinnvoll (z. B. contracts-mirror.marker.yml) oder mindestens eine Allowlist, damit „Override“ nicht zur stillen Drift-Tür wird.

@jules: in diesem repo nur die anweisungen für dieses repo ausführen! 