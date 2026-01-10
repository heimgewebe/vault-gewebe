∴Rename-Operation contracts → contract-spiegel

(Checkliste + Patch-Abfolge, minimal-invasiv, drift-resistent)

⸻

0. Vorannahmen (Prämissencheck)
	•	SSOT bleibt: heimgewebe/metarepo/contracts/*.schema.json
	•	ADR 006 ist erledigt (superseded/gelöscht), leitstand = UI ✔︎
	•	Ziel ist semantische Entwaffnung, nicht Funktionsänderung.

Risikoabschätzung: mittel-niedrig (reine Umbenennung + Meta-Fixes, keine Logikänderung).

⸻

1. Reihenfolge (wichtig!)

Erst Semantik & Meta fixen → dann Repo rename → dann Referenzen.

⸻

2. Patch-Abfolge (konkret)

PATCH 1 — 

⸻

PATCH 2 — GitHub Rename

Aktion (GitHub UI):
	•	heimgewebe/contracts → heimgewebe/contract-spiegel

GitHub kümmert sich um Redirects, aber wir verlassen uns nicht darauf.

⸻

PATCH 3 — Globale Referenzen ziehen (kritischster Schritt)

3.1 AI-Contexts (alle Repos)
Suche & ersetze:
	•	contracts → contract-spiegel

Typische Stellen:
	•	dependencies.internal
	•	narrative Beschreibungen

Besonders prüfen:
	•	chronik
	•	semantAH
	•	hausKI
	•	heimlern
	•	metarepo

⸻

3.2 
⸻

PATCH 5 — WGX / Health-Check
	•	.wgx/profile.yml (falls vorhanden):
	•	name/description anpassen
	•	Prüfen:
	•	guard
	•	smoke
	•	schema validation
	•	Einmal voller CI-Durchlauf (wichtig für Vertrauen)

⸻

3. Was nicht tun (Fehlerprävention)
	•	❌ Repo löschen & neu anlegen (zerstört History)
	•	❌ Nur GitHub-Rename ohne Meta-Fixes
	•	❌ „contracts-mirror“ + alte AI-Rolle behalten
	•	❌ Redirects als Dauerlösung akzeptieren

⸻

4. Schnelltest nach der Operation (10-Min-Audit)
	•	Gibt es irgendwo noch den String heimgewebe/contracts? → 0 Treffer
	•	Behauptet irgendein AI-Context „central provider“? → Nein
	•	Sagt irgendein Doc, dass Schemas dort entstehen? → Nein
	•	CI grün? → Ja

Wenn alle vier: Operation gelungen.

⸻

5. Verdichtete Essenz

Du beseitigst die Verwechslungsgefahr nicht, indem du erklärst –
sondern indem du benennst, was es ist.

contract-spiegel ist kein Zentrum, kein Gesetz, kein Mythos.
Es ist ein Spiegel. Punkt.

⸻

6. Ungewissheitsursachenanalyse

Unsicherheitsgrad: ∴0.15
Ursache: verstreute Referenzen in CI/Docs, die man leicht übersieht.
Gegenmittel: string-basierte Vollsuche + ein grüner CI-Lauf.

⸻

Wenn du willst, mache ich als Nächstes:
	•	eine exakte Suchliste (Strings/Files),
	•	oder ein PR-Set („Patch 1–4“ sauber getrennt),
	•	oder eine Rename-Simulation („Was bricht, wenn wir’s tun?“).

Sag einfach, welchen Modus du willst.