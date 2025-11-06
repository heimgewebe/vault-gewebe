# GitHub Actions Pinning-Policy

Unsere Workflows balancieren Lieferkettensicherheit mit operativer Zuverlässigkeit.
Dieses Dokument fasst die Richtlinien zusammen, die wir nach den jüngsten
Änderungen in den Workflow-Templates anwenden.

## 1 · Core-Actions (First-Party)

- Für `actions/checkout`, `actions/setup-python` und `actions/cache` nutzen wir die
  **stabilen Major-Tags** (`@v4`, `@v5`).
- GitHub pflegt diese Major-Tags semantisch, ohne sie rückwirkend auf inkompatible
  Commits zu verschieben.
- Major-Tags können auf neue Minor- oder Patch-Releases zeigen, garantieren aber laut
  SemVer der Action, dass keine Breaking Changes eingeführt werden.
- Dieser Ansatz vermeidet 404-Fehler, die durch das Aufräumen alter Commit-SHAs
  entstanden sind, und bleibt im Rahmen der GitHub-Empfehlungen.

| Action                     | Empfohlener Pin | Begründung              |
|----------------------------|-----------------|-------------------------|
| `actions/checkout`         | `@v4`           | stabiler Major-Tag      |
| `actions/setup-python`     | `@v5`           | stabiler Major-Tag      |
| `actions/cache`            | `@v4`           | stabiler Major-Tag      |

## 2 · Drittanbieter-Actions

- Drittanbieter-Actions pinnen wir weiterhin auf **veröffentlichte Release-Tags**
  (z. B. `lycheeverse/lychee-action@v2.0.2` oder `astral-sh/setup-uv@v3`).
- Release-Tags minimieren die Wahrscheinlichkeit von Force-Pushes und behalten
  Versionsinformationen für Supply-Chain-Audits.
- Sollte ein Release zurückgezogen werden, erlauben wir eine kurzfristige
  Umstellung auf einen funktionierenden Patch-Tag oder die letzte Major-Version,
  dokumentieren den Workaround aber im PR oder Issue.

## 3 · Ausnahmen & Audits

- Falls ein Core-Action-Major-Tag regressiv wird, dokumentieren wir die Abweichung
  im betroffenen Workflow und erstellen ein Issue.
- Für Sicherheitsspitzen (Audit, Incident Response) können Commits temporär auf
  exakte SHAs gepinnt werden. Danach stellen wir auf die Standard-Policy zurück.
- Abhängigkeiten von Dependabot: Für Actions lassen wir Major-Tag-Updates zu,
  blockieren aber direkte SHA-Replacements. Dadurch bleiben Auto-PRs nachvollziehbar.
- Wir nutzen keine `groups`-Konfiguration für `github-actions`, weil GitHub sie nicht
  unterstützt; so bleiben Updates pro Action getrennt und gut reviewbar.

## 4 · Umsetzung in Repos

- Das Metarepo dient als Kanon. Die Template-Workflows unter `.github/workflows/`
  reflektieren diese Policy bereits.
- Downstream-Repositories übernehmen die Einstellungen via `scripts/sync-templates.sh`.
  Bei individuellen Abweichungen muss die zuständige Fleet-Owner:in die Entscheidung
  dokumentieren.

---

**Stand:** 2024-11-22
