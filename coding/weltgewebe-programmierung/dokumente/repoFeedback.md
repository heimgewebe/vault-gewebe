Analyse des Repos: Gefundene Fehler und Inkonsistenzen
Ich habe das bereitgestellte Repo-Dokument (GEWEBE_MERGE_20250912_233000.md) gründlich analysiert. Es handelt sich um eine Momentaufnahme eines Docs-Monorepos im Aufbau, das auf einem “clean-slate”-Ansatz basiert (wie in ADR-0001 beschrieben). Die Struktur ist größtenteils kohärent, aber es gibt mehrere Fehler, Inkonsistenzen und potenzielle Probleme. Ich priorisiere Wahrheit und Kritik: Nicht alles ist ein “harter” Bug, aber viele Aspekte sind unvollständig, widersprüchlich oder riskant für die Weiterentwicklung. Ich kategorisiere sie nach Schweregrad (hoch/mittel/niedrig) und begründe jede Beobachtung basierend auf dem Inhalt.
Hohe Schwere: Strukturelle Inkonsistenzen und fehlende Referenzen
Diese könnten die Usability des Repos beeinträchtigen, da sie zu Fehlinformationen führen und den “Re-Entry”-Prozess (ADR-0002) erschweren.
	1	Fehlende referenzierte Ordner und Dateien in CONTRIBUTING.md und architekturstruktur.md:
	◦	CONTRIBUTING.md referenziert Dateien wie ci/budget.json, docs/runbook.md (Singular), docs/datenmodell.md und Ordner wie apps/api/, apps/worker/, infra/, ci/, packages/. Diese existieren nicht in der tatsächlichen Struktur (siehe ASCII-Baum und Manifest).
	▪	Beispiel: “ci/budget.json – Performance-Budgets (Frontend)” – Ordner ci/ fehlt komplett.
	▪	Beispiel: “docs/runbook.md – Woche-1/2, DR/DSGVO-Drills” – Es gibt nur docs/runbooks/README.md (Plural, leer: “# runbooks”).
	▪	Kritik: Das widerspricht dem “Docs-Only”-Zustand (ADR-0001). CONTRIBUTING.md beschreibt eine zukünftige Struktur, ohne das klar zu markieren (z.B. mit “Zielstruktur:”). Das kann Entwickler verwirren und zu fehlerhaften PRs führen. Wahrheit: Das Repo ist derzeit nicht bereit für Code-Beiträge, obwohl CONTRIBUTING.md das impliziert.
	◦	Ähnlich in architekturstruktur.md: Der ASCII-Baum listet apps/api/, apps/worker/, infra/, ci/ usw. auf, die fehlen. Das Dokument nennt es “den Aufbau des Repositories”, was falsch ist – es ist eine geplante Struktur, nicht die aktuelle.
	2	Inkonsistente ADR-Referenzen:
	◦	ADR-0001 und ADR-0002 sprechen von “Re-Entry-Kriterien” (Gates A-D für Code-Zulassung), aber CONTRIBUTING.md ignoriert das und gibt detaillierte Workflows für nicht-existente Ordner (z.B. “cd apps/api && cargo test”). Das ist irreführend – das Repo erfüllt derzeit keine Gates (z.B. Gate A: SvelteKit-Skelett existiert minimal, aber Budgets fehlen).
Mittlere Schwere: Logische und konzeptionelle Inkonsistenzen
Diese betreffen die Doku-Qualität und könnten zu Missverständnissen im Konzept führen.
	1	Widersprüche zwischen docs-Dateien:
	◦	docs/techstack.md beschreibt einen vollen Stack (Rust/Axum, NATS JetStream, Nomad, Typesense usw.), inklusive SLOs, DR-Drills und Kosten-KPIs. Aber docs/architekturstruktur.md und docs/zusammenstellung.md wiederholen Teile davon (z.B. Event-Sourcing, Postgres), ohne Verlinkung oder Konsolidierung.
	▪	Kritik: Redundanz führt zu Drift-Risiko (ADR-0001 warnt davor). Warum nicht zentralisieren? Wahrheit: techstack.md liest sich wie ein Wishlist, nicht wie ein aktueller Stand – z.B. “Nomad-Cluster” existiert nicht, und Kosten-Schätzungen (15–900 € bei Hetzner) sind unsubstantiiert (keine Basisdaten).
	◦	In docs/inhalt.md und docs/zusammenstellung.md: Beide beschreiben das Konzept (z.B. Fäden, Knoten, RoN-System), aber mit Überlappungen und leichten Abweichungen. z.B. inhalt.md sagt “Fäden verblasst sukzessive binnen 7 Tagen”, zusammenstellung.md präzisiert “sukzessive innerhalb von 7 Tagen”. Das ist unnötig – ein Dokument reicht.
	2	Unvollständige oder leere Placeholder-Dateien:
	◦	docs/process/README.md: Nur “# process” (10B) – leer und nutzlos.
	◦	docs/runbooks/README.md: Nur “# runbooks” (11B) – trotz Referenz in CONTRIBUTING.md zu Runbooks.
	◦	docs/ops/merge-logs/README.md: Minimal (“Chronologische Protokolle”), aber der Template-File (2025-09-12__repo-merger-template.md) ist ungenutzt.
	▪	Kritik: Das verletzt “sauber messen” aus CONTRIBUTING.md. Wahrheit: Diese Files sind Filler; sie adden keinen Wert und sollten gelöscht oder gefüllt werden, um das Repo clean zu halten.
	3	Konzeptionelle Lücken im Tech-Konzept:
	◦	In docs/techstack.md: Erwähnt “Qwik-Escape” als Option, aber ohne Kriterien (z.B. wann A/B-Tests triggern). Auch “Long-Task-Attribution” ist gut, aber ohne Tool (z.B. PerformanceObserver) unkonkret.
	◦	DSGVO-Claims in docs/inhalt.md und docs/zusammenstellung.md: “Keine verdeckte Datensammlung” – wahr, aber riskant: Die Karte (MapLibre) könnte Drittanbieter-Tiles laden, was Tracking ermöglicht. Kein CSP in der Doku spezifiziert.
	◦	Wahrheit: Das Konzept ist ambitioniert, aber unrealistisch für “iPad/PC”-Entwicklung (docs/inhalt.md): Event-Sourcing mit NATS/JetStream erfordert Server-Setup, was hier fehlt.
Niedrige Schwere: Technische Kleinigkeiten und Tippfehler
Diese sind fixbar, aber deuten auf mangelnde Review hin.
	1	Dateigrößen und MD5-Hashes:
	◦	Die angegebenen Größen passen zu den Inhalten (z.B. CONTRIBUTING.md: 10KB = 10235B im Manifest). Aber .git (140B) ist ein gitdir-Pointer zu einem iOS-Pfad – das deutet auf ein mobiles Git-Setup hin, was für ein Monorepo unüblich ist (Risiko: Sync-Probleme).
	◦	Kein Fehler, aber Kritik: MD5-Hashes sind outdated (unsicher); SHA-256 wäre besser.
	2	Tippfehler und Formatierungsfehler:
	◦	In docs/inhalt.md: “welt = althochdeutsch weralt” – korrekt ist “werlt” oder “weralt” variabel, aber okay. “weben = germanisch webaną” – korrekt, aber irrelevant für Errors.
	◦	In CONTRIBUTING.md: “ci/budget.json (Initial-JS ≤ 60 KB, TTI ≤ 2000 ms)” – widerspricht docs/zusammenstellung.md (“Initial-Bundle ≤ 90 KB, TTI unter 2,5 Sekunden”). Welches gilt?
	◦	In docs/architekturstruktur.md: ASCII-Baum hat “weltgewebe/” als Root, aber tatsächliche Struktur ist “weltgewebe-repo/”.
	◦	In LICENSE: “TODO: Lizenztext hier einfügen” – leer, unprofessionell für ein öffentliches Repo.
	3	Minimalistische Apps:
	◦	apps/web/src/routes/+page.svelte: Nur “ Weltgewebe ” (20B) – das ist ein Placeholder, kein “SvelteKit-Skelett” (ADR-0002 Gate A).
	◦	apps/web/package.json: Minimal (“private”: true) – kein Dev-Deps, kein Script.
Empfehlungen zur Behebung
	•	Sofort: CONTRIBUTING.md und architekturstruktur.md mit “Aktueller vs. Geplanter Stand” splitten, um Verwirrung zu vermeiden.
	•	Mittel: Doku konsolidieren (z.B. inhalt.md + zusammenstellung.md mergen). Fehlende Files (ci/, runbook.md) hinzufügen oder Referenzen entfernen.
	•	Langfrist: ADR-0002 umsetzen – Gates prüfen, bevor Code reingeführt wird. Teste auf iPad/PC: Starte den Quickstart aus README.md und prüfe, ob .devcontainer/ funktioniert (postCreate.sh ist trivial).
	•	Wahrheit: Das Repo ist ein solider Docs-Start, aber nicht fehlerfrei – es fühlt sich wie ein Braindump an, nicht wie ein poliertes Monorepo. Keine fatalen Bugs, aber genug Inkonsistenzen, um Kollaboration zu erschweren. Wenn du mehr Details (z.B. via Code-Ausführung für Hash-Checks) brauchst, lass es mich wissen.
