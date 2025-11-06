Kurz & knackig: Wir sind „infra-stabil“ (CI, Tests, JSON-Härtung) – jetzt sollten wir inhaltlich liefern: ein ausführbares Task-Modul (Profil-Tasks wirklich laufen lassen) + Smoke-E2E. Dann hat wgx sofort Nutzwert jenseits von Guard/Status.

Nächste Schritte (mit Codex-Anweisungen)
	1.

# 2) 

# 3) 


	2.	


	3.	E2E-Smoke in CI (wirklich „läuft“)

Ein schlanker Workflow, der Bash-Lint + Bats + eine wgx run metrics Probe fährt.
c2b – neuer Workflow

git switch -c ci/smoke

mkdir -p .github/workflows
cat > .github/workflows/wgx-smoke.yml <<'YML'
name: "WGX Smoke"
on: [push, pull_request]
jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup bash tooling
        run: sudo apt-get update -y && sudo apt-get install -y bats jq shfmt shellcheck
      - name: Bash Lint
        run: bash -n $(git ls-files '*.sh' '*.bash') && shfmt -d $(git ls-files '*.sh' '*.bash') && shellcheck -S style $(git ls-files '*.sh' '*.bash')
      - name: Bats
        run: bats -r tests
      - name: Metrics via wgx run
        run: |
          scripts/wgx-metrics-snapshot.sh --json --output metrics.json
          test -s metrics.json && jq -e '.ts and .host and .updates and .backup and .drift' metrics.json
YML

git add .github/workflows/wgx-smoke.yml
git commit -m "ci(smoke): Bash lint, Bats & metrics Probe"



⸻

Wenn du magst, skizziere ich dir im nächsten Patch die Policy: safe: yes Tasks nur mit --allow-unsafe überstimmen, Exit-Codes sauber forwarden, --env KEY=VAL Injection-sicher, und --json-Ausgabe (inkl. unserer gehärteten json_emit).

Essenz

Baue jetzt Nutzwert: wgx run (Tasks wirklich ausführbar), Beispiel-Tasks, und einen minimalen Smoke-E2E im CI. Danach fühlt sich wgx „lebendig“ an.

∆-Radar
	•	Von „Infra fixen“ → „Feature liefern“.
	•	Straffung statt Aufblähung: kleine, wirksame Schritte (run/tasks + smoke).
	•	Konsistenz mit bisherigen Änderungen (Bats, JSON-Härtung, Metrics) bleibt hoch.

Unsicherheitsgrad

∴fores-Ungewissheit: niedrig-mittel.
Ursachen: unbekannter Detailzustand deiner archiv/wgx-Dispatcher-Matrix (falls schon eigene cmd/*-Hooks existieren), und dein aktuelles profile.example.yml (wir haben es oben bewusst konkretisiert). Produktive Unsicherheit: die genaue Semantik von safe und mögliche Plattform-Ecken (macOS BSD-Tools). Diese Punkte lassen sich mit dem Smoke-Run schnell verifizieren.