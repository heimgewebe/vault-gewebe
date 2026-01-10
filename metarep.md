∴ Dialektische Erörterung

These: „Der Workflow scheitert, weil yq nicht im PATH ist – also installiere yq systemweit und fertig.“

Das löst Symptome, aber kollidiert mit eurer Fleet-Idee „pin + reproducible + tools/bin“. Systemweite Installation ist bequem, aber sie verschiebt Wahrheit aus dem Repo heraus (und macht Runner-Drift wahrscheinlicher).

Antithese: „Wir bleiben strikt bei tools/bin/yq und dem Pin-Skript – keine globalen Installs.“

Das ist architekturkonform. Nur: euer aktuelles scripts/tools/yq-pin.sh hat einen Bootstrap-Zirkelschluss: Es versucht die gepinnte yq-Version aus toolchain.versions.yml mit yq selbst zu lesen. Wenn yq noch nicht existiert, kann es die Version nicht lesen → kann nicht downloaden → endet im Zustand „yq nicht gefunden“. Genau diese Logik ist im Skript sichtbar: read_pinned_version liest .yq via ${YQ_LOCAL} oder yq (command) – beides kann am Anfang fehlen.  ￼

Synthese (ideal):
Bleibt bei der Repo-internen Pin-Installation, aber macht yq-pin.sh bootstrappable ohne yq:
	•	read_pinned_version bekommt einen Fallback-Parser (grep/awk/sed), der die Zeile yq: aus toolchain.versions.yml extrahiert.
	•	Danach kann der Downloadpfad sauber laufen (der ist im Skript bereits robust: OS/Arch → URL → Download → Checksums → Install).  ￼

Damit passt es auch zur Fehlermeldung aus eurer Composite Action: Sie sucht tools/bin/yq und PATH, findet beides nicht, und bricht genau dort ab.  ￼

⸻

Konkrete Fehlerursache (präzise)
	1.	Bootstrap-Zirkelschluss in yq-pin.sh: read_pinned_version() kann ohne vorhandenes yq die gepinnte yq-Version nicht aus toolchain.versions.yml lesen.  ￼
	2.	Composite Action ist prinzipiell ok, sie macht PATH-Export, ruft yq-pin.sh ensure auf, prüft danach tools/bin/yq oder command -v yq. Aber weil Punkt (1) verhindert, dass tools/bin/yq überhaupt entsteht, läuft sie in den Fail-Branch.  ￼

⸻

Fix (Patch-Plan) – metarepo

A) scripts/tools/yq-pin.sh reparieren (Bootstrappable Version-Read)

Ziel: read_pinned_version() muss ohne yq funktionieren.

Minimaler, robuster Ansatz (YAML-simple):
	•	nimm die erste Zeile yq: (ohne Einrückungsvoodoo)
	•	trimme Spaces und Quotes
	•	akzeptiere 4.49.2 oder v4.49.2 (euer Code normalisiert ohnehin zu v…)  ￼

Jules-Anweisung (Patch):
	1.	In scripts/tools/yq-pin.sh innerhalb von read_pinned_version():
	•	wenn ${YQ_LOCAL} und yq fehlen, nutze Fallback:
	•	grep -E '^[[:space:]]*yq[[:space:]]*:' toolchain.versions.yml | head -n1
	•	Wert extrahieren (sed 's/.*:[[:space:]]*//')
	•	Quotes entfernen (tr -d "'\"")
	2.	Wenn Ergebnis leer ist → hard fail mit klarer Meldung (kein silent fallback; passt zu eurer „Artifact Truth“-Haltung).
	3.	Danach läuft download_yq() normal weiter.

Damit ist der Kreis gebrochen: yq wird aus dem Pin ohne yq bestimmt, dann installiert, dann kann yq später YAML/JSON machen.

B) Composite Action setup-yq minimal härten (optional, aber sinnvoll)

Eure Composite Action exportiert PATH und setzt GITHUB_PATH bereits korrekt.  ￼
Ich würde nur ergänzen:
	•	Direkt nach yq-pin.sh ensure ein ls -la tools/bin und file tools/bin/yq in die Diagnostics-Gruppe, wenn etwas schiefgeht (ihr habt schon einen ERR-trap; das passt).  ￼

Wichtig: Keine „installiere systemweit als stiller Fallback“. Wenn ihr das wollt, dann nur als explizite, geloggte Notfall-Schiene (und zwar sichtbar als Ausnahme, nicht als Normalität).

C) scripts/tools/validate-toolchain.sh ist grundsätzlich ok, aber…

Das Skript ist gut als 3-Phasen-Validator. Der einzige echte Haken war: es setzt yq voraus – und das muss durch A) zuverlässig hergestellt werden.

Ich würde nicht npx-Fehlen als „skip schema validation“ akzeptieren, wenn setup-node sowieso läuft (ihr habt Node 20 im Workflow ergänzt). Wenn npx fehlen sollte, ist das ein Runner-Problem → lieber fail (Truth statt Grünfärberei).

⸻

Anweisung an Jules (copy/paste)

Repo: heimgewebe/metarepo

Aufgabe: Fix Bootstrap-Zirkelschluss bei yq, so dass toolchain-guard deterministisch läuft.

Do:
	1.	Patch scripts/tools/yq-pin.sh:

	•	In read_pinned_version() Fallback einbauen, der yq: aus toolchain.versions.yml ohne yq liest (grep/sed/awk).
	•	Wenn kein Wert gefunden wird: die "Pinned yq version not found in toolchain.versions.yml (expected key: yq: <version>)".

	2.	Lass die vorhandene Download-Logik unverändert (OS/Arch → URL → Download/Checksums → install nach tools/bin/yq). Die existiert bereits und ist ok.  ￼
	3.	Optional: In .github/actions/setup-yq/action.yml (oder wo der Shellblock liegt) bei ERR Diagnostics zusätzlich ls -la "$REPO_ROOT/tools/bin" ausgeben (habt ihr faktisch schon), plus file "$REPO_ROOT/tools/bin/yq".

Don’t:
	•	Kein stiller systemweiter Install als Default. Wenn überhaupt, dann als explizite Notfallroutine mit ::notice:: und klarer Begründung (Ausnahme).

Akzeptanzkriterien:
	•	toolchain-guard schafft „Ensure yq“ auf ubuntu und macos.
	•	command -v yq liefert was, oder tools/bin/yq existiert und ist executable.
	•	yq --version passt zur gepinnten Version.

⸻





⸻

Fehlerprävention (vermeidbare KI-Fallen)
	•	Falle: „Installiere yq global“ wirkt schnell, untergräbt aber euer Pin/Tools-Konzept und macht Fehler später schwerer reproduzierbar.
	•	Falle: „Fallbacks“ ohne Sichtbarkeit. Ihr habt euch in ADR-0029 explizit dagegen entschieden: Wahrheit > Grün.

⸻

Risikoabschätzung
	•	Technisches Risiko: niedrig–mittel. Der Fallback-Parser muss YAML-simple voraussetzen (key: value). Das ist in toolchain.versions.yml ohnehin das intendierte Format.
	•	Organisatorisches Risiko: niedrig. Änderung ist lokal in metarepo, betrifft aber CI in vielen Repos indirekt (weil toolchain-guard als Muster wirkt).

⸻

Für Dummies (kurz)

Dein Skript will wissen, welche yq-Version es herunterladen soll. Es versucht diese Info aus einer Datei zu lesen – aber benutzt dafür yq selbst. Wenn yq noch nicht da ist, klappt das nie. Lösung: Lies die Zeile yq: 4.49.2 erstmal mit ganz einfachen Bordmitteln (grep/sed), lade dann yq runter, danach darf yq wieder komplexe Dinge machen.

⸻

Verdichtete Essenz

Der Bug ist ein Bootstrap-Zirkelschluss: yq wird gebraucht, um die yq-Version zu lesen.
Fix: yq-pin.sh muss die gepinnte Version ohne yq lesen können, dann ist der Rest der Pipeline stabil.

⸻

Ungewissheitsursachenanalyse

Unsicherheitsgrad: 0.22 (niedrig–mittel)
Ursachen:
	•	Ich sehe den entscheidenden Ausschnitt von read_pinned_version() (und die Composite Action), aber nicht den gesamten Kontrollfluss von yq-pin.sh ensure in deiner aktuellen Branch-Version (kleine Abweichungen möglich).  ￼ ￼
	•	Runner-Umgebung (macOS vs ubuntu) kann bei uname/arch-Mapping Sonderfälle erzeugen; euer Script mappt x86_64→amd64 und arm64/aarch64→arm64, das ist meistens korrekt.  ￼

⸻

Leitfragen
	1.	War das die kritischste Erörterung? Fast. Noch kritischer wäre, zusätzlich zu prüfen, ob toolchain.versions.yml garantiert „YAML-simple“ bleibt (z. B. via Schema/Guard: keine Maps, keine Anker, keine Multiline).
	2.	Alles beleuchtet? Fast. Unbeleuchtet ist noch: ob ihr yq überhaupt noch braucht, wenn toolchain.versions.yml künftig sowieso per ajv aus JSON validiert wird (Langfrist: YAML evtl. abschaffen oder strikt als „nur key: string“ definieren).

Und ja: „yq ist nicht da, weil yq nicht da ist“ ist eine dieser Selbstreferenzen, die sich wie Philosophie anfühlen, aber in CI einfach nur Geld kosten.