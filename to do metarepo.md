Die Aufgabe ist beim Link-Check gescheitert. Es gibt drei Hauptproblemtypen:

1. **Fehlende Markdown-Fragmente:**  
   - `docs/contracts.md#rollout-checkliste`  
   - `docs/leitlinien.md#contracts-first`  
   → Diese Fragmente (Überschriften mit diesen Namen) existieren nicht innerhalb der Ziel-Dateien oder sind falsch geschrieben.

2. **Fehlende Datei:**  
   - `docs/contracts/sichter.md`  
   → Die Datei `sichter.md` im Verzeichnis `docs/contracts/` ist nicht vorhanden oder im PR gelöscht.

3. **Broken Links zu externen Repos:**  
   - `https://github.com/heimgewebe/chronik`  
   - `https://github.com/heimgewebe/chronik/tree/main/docs`  
   → Das Repository existiert nicht oder ist privat.

### Lösungsvorschläge im Detail

#### 1. Fehlende Fragmente reparieren
- Öffne z.B. [`docs/contracts.md`](https://github.com/heimgewebe/metarepo/blob/ee3235bb0b7dcb1b37442d69caf5e601b88477fe/docs/contracts.md) und füge die Überschrift hinzu:
  ```markdown
  ## Rollout-Checkliste
  <!-- Inhalt der Checkliste -->
  ```
- Gleiches gilt für [`docs/leitlinien.md`](https://github.com/heimgewebe/metarepo/blob/ee3235bb0b7dcb1b37442d69caf5e601b88477fe/docs/leitlinien.md):
  ```markdown
  ## Contracts-First
  <!-- Inhalt -->
  ```
- Falls die Überschrift bereits existiert, kontrolliere die genaue Schreibweise und darauf, dass Sonderzeichen und Umlaute passen.

#### 2. Fehlende Datei erstellen  
Falls die Datei `docs/contracts/sichter.md` benötigt wird, erstelle eine leere oder mit Grundinhalt versehene Datei:
```markdown
# Sichter
<!-- Beschreibenden Inhalt ergänzen -->
```
Falls sie bewusst entfernt wurde, entferne den Link darauf aus der referenzierenden Datei (`docs/contracts/index.md` o.ä.).

#### 3. Broken externe Links
- Prüfe, ob das Ziel-Repo `heimgewebe/chronik` wirklich existiert oder noch erstellt werden muss.
- Falls es entfernt/privatisiert wurde, entferne die Links in den Markdown-Dateien:
  ```markdown
  [Chronik](https://github.com/heimgewebe/chronik)
  ```
- Alternativ: Mit `<!-- TODO: Link zu Chronik einfügen sobald verfügbar -->` kommentieren.

---

**Zusammengefasst:**  
- Fehlende Fragmente als Überschriften anlegen oder Links korrigieren.  
- Fehlende Dateien erstellen oder Links entfernen.  
- Broken externe Links bereinigen oder als TODO markieren.

Falls du gezielt eine der betroffenen Dateien per Code zeigst, kann ich die Korrekturen direkt für dich formulieren!



Die Ursache für den Fehler im Job 55390998558 liegt in folgendem CI-Skript-Schritt:

```bash
git add -N docs/org-index.md docs/org-graph.mmd
git diff --exit-code -- docs/org-index.md docs/org-graph.mmd || (echo "::warning::Org assets changed – commit in this PR" && exit 1)
```

Der Build schlägt fehl, weil sich die Dateien `docs/org-index.md` und/oder `docs/org-graph.mmd` geändert haben (bzw. Änderungen im PR vorliegen). Das Skript fordert, dass die Änderungen in diesem Pull Request committed werden.

### Lösung

**Commit die geänderten Dateien:**

1. Stelle sicher, dass `docs/org-index.md` und `docs/org-graph.mmd` im PR wirklich die gewünschten Änderungen enthalten.
2. Füge die Dateien deinem Commit hinzu:
   ```bash
   git add docs/org-index.md docs/org-graph.mmd
   git commit -m "Aktualisiere org-index und org-graph entsprechend aktuellen Events"
   git push
   ```
3. Falls die Änderung automatisch während der CI entsteht: Sorge dafür, dass die auslösende Aktion lokal ausgeführt wird und die Resultate committed werden – andernfalls gerät der CI-Status immer in Fehler.

**Hintergrund**  
Das Skript prüft, ob die genannten Assets „dirty“ sind, also nicht committed wurden. Damit wird Transparenz garantiert und verhindert, dass automatisch generierte Dateien „unsichtbar“ verändert werden – dies entspricht den Governance-Prinzipien.

---

**Kurzfassung:**  
Committe die geänderten Dateien `docs/org-index.md` und/oder `docs/org-graph.mmd` in deinem PR, damit die CI durchläuft. Vermeide uncommitted Änderungen in diesen Assets.

Direkter Bezug zum Workflow: [.github/workflows/org-assets.yml@ee3235bb0b7dcb1b37442d69caf5e601b88477fe](https://github.com/heimgewebe/metarepo/blob/ee3235bb0b7dcb1b37442d69caf5e601b88477fe/.github/workflows/org-assets.yml)


Die Ursache für den Fehler im Job 55390937282 liegt beim Versuch, Puppeteer zu starten, um Diagramme zu rendern. Die Fehlermeldung:
```
Error: Failed to launch the browser process!
[1114/093812.340797:FATAL:zygote_host_impl_linux.cc(127)] No usable sandbox!
Update your kernel or see https://chromium.googlesource.com/chromium/src/+/main/docs/linux/suid_sandbox_development.md
```
bedeutet, dass die Chromium-Browser-Instanz (die von Puppeteer genutzt wird) auf der CI-Maschine keinen passenden Sandbox-Modus findet.

**Lösung für CI/Linux-Umgebung:**

Puppeteer kann die Sandbox deaktivieren, indem die Option `--no-sandbox` gesetzt wird. Für die meisten CI-Umgebungen ist das ausreichend und DSGVO-konform – es ist kein „Quick Hack“, sondern offizieller Workaround für headless-Browser in CI.

**Strikte Umsetzung:**
Passe den Script-Aufruf so an, dass Puppeteer immer mit `--no-sandbox` ausgeführt wird.

**Code-Vorschlag:**

Erweitere den Puppeteer-Launch so (z.B. in deinem Render-Tool oder node.js-Script, das Puppeteer verwendet):

```js
const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```
Alternativ, falls du ein CLI-Tool wie mermaid-cli verwendest, dann:
```sh
mmdc -i input.mmd -o output.png --puppeteerConfigFile puppeteer-config.json
```
und die Datei `puppeteer-config.json`:
```json
{
  "args": ["--no-sandbox", "--disable-setuid-sandbox"]
}
```
**Zusätzlich** kannst du im CI-Workflow (z.B. .github/workflows/render-diagrams.yml) sicherstellen, dass vor dem Rendern die Umgebungsvariablen passend gesetzt sind:
```yaml
env:
  PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: 'true'
  PUPPETEER_ALLOW_NO_SANDBOX: 'true'
```

**Wichtig für Transparenz & Nachvollziehbarkeit:**  
Dokumentiere im Repository, warum `--no-sandbox` nötig ist, z.B. in README oder als Kommentar im Workflow.

**Damit wird der Fehler zuverlässig behoben, ohne Sicherheitsrisiken oder Quick Hacks.**





