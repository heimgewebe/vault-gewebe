Die Ursache des Fehlers ist:
Der Job kann die GitHub Action rhysd/actionlint@v1 nicht finden, da die Version v1 entweder falsch oder nicht verfügbar ist.

**Lösung:**
Im Workflow-File (.github/workflows/ci.yml) sollte die Action auf eine existierende Version gesetzt werden. Die aktuell empfohlene Version ist v1.6.23 – siehe die Releases auf https://github.com/rhysd/actionlint.

**Code-Vorschlag (ci.yml):**
Ersetze:
```yaml
- uses: rhysd/actionlint@v1
```
durch:
```yaml
- uses: rhysd/actionlint@v1.6.23
```

**Prüfe nach dem Commit:**
- Workflow erneut ausführen, um sicherzustellen, dass der Fehler behoben ist.

**Hinweis:** Nutze stets konkrete und aktuell veröffentlichte Tags für Actions, um solche Fehler und ungewollte Updates zu vermeiden.

GitHub Copilot Chat Assistant

Problem
- The job failed because the workflow step "uses: rhysd/actionlint@v1" cannot be resolved: "Unable to resolve action `rhysd/actionlint@v1`, unable to find version `v1`" (see job logs).
- The failure originates at .github/workflows/ci.yml (ref 76179ea6a5b7d678e1757771f457025e4b6949a5), lines ~483–488: https://github.com/heimgewebe/metarepo/blob/76179ea6a5b7d678e1757771f457025e4b6949a5/.github/workflows/ci.yml

Two robust fixes (pick one)

1) Preferred: Pin the action to a valid tag or commit SHA
- Rationale: Using a specific, existing tag or commit prevents resolution failures when floating tags are removed/renamed.
- How to find a valid ref:
  - Query the action repo releases/tags (locally or in CI):
    - git: git ls-remote --tags https://github.com/rhysd/actionlint.git
    - GitHub API: curl -s https://api.github.com/repos/rhysd/actionlint/releases/latest | jq -r .tag_name
- Change the workflow to use that exact tag or a commit SHA. Example template (replace <TAG_OR_SHA> with a real tag or sha you found):

  Replace these lines:
  uses: rhysd/actionlint@v1
  with:
    args: -color

  With:
  uses: rhysd/actionlint@<TAG_OR_SHA>
  with:
    args: -color

- Implementation notes:
  - Prefer a stable release tag (e.g. vX.Y.Z) or the commit SHA.
  - Commit the change and re-run CI.

2) Alternative fallback: Install and run the actionlint binary directly (avoid using the GitHub Action)
- Rationale: If the action repo is transient or you want full control, download a released binary and run it from the runner. This also gives reproducible behavior and better auditability.
- Add an install step before the lint step, then run actionlint as a command. Example (Linux runner example — adapt for macOS runners):

  - name: Install actionlint
    run: |
      set -euo pipefail
      # Replace vX.Y.Z with a real release tag
      TAG="vX.Y.Z"
      ARCH="amd64"
      OS="linux"
      ASSET="actionlint_${TAG}_${OS}_${ARCH}.tar.gz" # adjust if release name differs
      curl -fsSL -o /tmp/actionlint.tar.gz "https://github.com/rhysd/actionlint/releases/download/${TAG}/${ASSET}"
      tar -xzf /tmp/actionlint.tar.gz -C /tmp
      sudo mv /tmp/actionlint /usr/local/bin/actionlint
      actionlint --version

  - name: Lint GitHub Actions workflows
    run: |
      actionlint -color

- Implementation notes:
  - Verify the exact release asset name on the actionlint releases page and update ASSET accordingly.
  - For macOS adjust OS/ARCH and installation path.

Extra recommendations
- Always pin third-party actions to a specific tag or SHA to maintain reproducibility and avoid transient resolution errors.
- Add a short comment in the workflow near the action explaining the chosen ref and the date/version it was pinned to (transparency).
- After applying the fix, re-run the failing workflow.

Example minimal patch (template) — edit .github/workflows/ci.yml at ref 76179ea6a5b7d678e1757771f457025e4b6949a5:

- Locate:
  uses: rhysd/actionlint@v1
  with:
    args: -color

- Replace with (Option 1 — pin to a tag you verified):
  uses: rhysd/actionlint@<TAG_OR_SHA>
  with:
    args: -color

Or (Option 2 — install binary and run):
- Insert before lint step:
  - name: Install actionlint
    run: |
      set -euo pipefail
      TAG="vX.Y.Z"   # replace with actual tag found
      curl -fsSL -o /tmp/actionlint.tar.gz "https://github.com/rhysd/actionlint/releases/download/${TAG}/actionlint_${TAG}_linux_amd64.tar.gz"
      tar -xzf /tmp/actionlint.tar.gz -C /tmp
      sudo mv /tmp/actionlint /usr/local/bin/actionlint
      actionlint --version

- Replace the existing uses step with:
  - name: Lint GitHub Actions workflows
    run: actionlint -color

If you want, I can:
- Suggest a concrete tag/sha if you want me to look up the rhysd/actionlint repo for available releases (I will need to fetch tags/releases first), or
- Create the exact workflow diff ready to commit once you confirm which option you prefer.
  
  Fehlerzusammenfassung
- Der Job schlägt beim Schritt "Run scripts/tools/yq-pin.sh" fehl (Exit code 1). Die Logs zeigen keinen Output aus dem Script — das deutet darauf, dass das Script sehr früh (beim Start) wegen eines ungebundenen Variablenzugriffs oder weil es mit einer Shell ausgeführt wurde, die BASH-spezifische Variablen nicht bereitstellt, abgebrochen ist. Alternativ kann das Script ohne Ausführungsbit committed worden sein und deshalb anders gestartet worden sein.
- Datei: scripts/tools/yq-pin.sh (ref: 76179ea6a5b7d678e1757771f457025e4b6949a5)
  Link: https://github.com/heimgewebe/metarepo/blob/76179ea6a5b7d678e1757771f457025e4b6949a5/scripts/tools/yq-pin.sh

Wahrscheinliche Ursachen
1. Verwendung von ${BASH_SOURCE[0]} zusammen mit set -u — wenn das Script mit /bin/sh oder einer Shell ohne BASH_SOURCE ausgeführt wird, führt das zu einem "unbound variable" Abbruch.
2. Script wurde ohne Ausführungsbit committed; das Action-Runner-Verhalten kann dann dazu führen, dass ein anderer Shell-Startpfad gewählt wird.
3. Sehr frühes Scheitern (keine Logs) kann auch durch fehlende Shell-Interpreter-Kompatibilität passieren.

Schnelle, sichere Lösung (konkret & minimal)
- Mache die Nutzung von BASH_SOURCE robust gegen Nicht-Bash-Umgebungen.
- Ergänze direktes, frühes Logging und Fehlertrap, damit beim nächsten Lauf die Ursache sichtbar wird.
- Prüfe und setze das Ausführungsbit im Repository oder rufe das Script explizit mit bash auf.
- Füge Fallbacks für curl/wget hinzu und prüfe existenz/erreichbarkeit schon vor dem Download.

Vorgeschlagener Patch (replace / update Kopf des Scripts)
Ersetze die ersten Zeilen (etwa bis zur Definition BIN_DIR) durch dieses robustere Block (Diff-Stil — ersetze Zeilen 2..11):

```diff
-#!/usr/bin/env bash
-set -euo pipefail
-# Pin & Ensure für mikefarah/yq v4.x – ohne Netz zur Laufzeit.
-# Erwartet, dass ein kompatibles Binary entweder in ./tools/bin/yq liegt oder im PATH verfügbar ist.
-
-REQ_MAJOR=4
-ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
-TOOLS_DIR="${ROOT_DIR}/tools"
-BIN_DIR="${TOOLS_DIR}/bin"
-YQ_LOCAL="${BIN_DIR}/yq"
+#!/usr/bin/env bash
+set -euo pipefail
+# Pin & Ensure für mikefarah/yq v4.x – ohne Netz zur Laufzeit.
+# Erwartet, dass ein kompatibles Binary entweder in ./tools/bin/yq liegt oder im PATH verfügbar ist.
+
+REQ_MAJOR=4
+# Robust gegen Ausführung mit non-bash shells: fallback auf $0 wenn BASH_SOURCE nicht gesetzt ist
+_script_src="${BASH_SOURCE[0]:-$0}"
+ROOT_DIR="$(cd "$(dirname "${_script_src}")/../.." && pwd)"
+TOOLS_DIR="${ROOT_DIR}/tools"
+BIN_DIR="${TOOLS_DIR}/bin"
+YQ_LOCAL="${BIN_DIR}/yq"
+
+# Early debug logging to surface errors in CI quickly
+log(){ printf '%s\n' "$*" >&2; }
+die(){ log "ERR: $*"; exit 1; }
+trap 'rc=$?; log "Script abgebrochen mit Status $rc"; exit $rc' ERR INT TERM
```

Weitere sichere Verbesserungen (einfügen in download_yq / cmd_ensure)
- Vor curl-Aufruf prüfen, ob curl oder wget vorhanden sind; falls nicht, aussagekräftig fehlschlagen.
- Vorheriges Logging (log "Trying curl" / "Trying wget") ausgeben.
- Bei Verwendung von mktemp die portable Template-Form sicherstellen (der derzeitige Aufruf ist OK für Linux, kann aber in macOS abweichen — für Actions-Runner ist es fine).

Beispiel: ersetze den Download-Teil durch:

```bash
ensure_dir

# prefer curl, fall back to wget
_downloader=""
if have_cmd curl; then
  _downloader="curl -fSL -o"
elif have_cmd wget; then
  _downloader="wget -qO"
else
  die "keine Download-Tools gefunden: curl oder wget erforderlich"
fi

tmp="$(mktemp "${YQ_LOCAL}.dl.XXXXXX")"
log "Downloading from ${yq_url} with ${_downloader%% *}"
if ${_downloader} "${tmp}" "${yq_url}"; then
  chmod +x "${tmp}" || true
  mv -f -- "${tmp}" "${YQ_LOCAL}"
  log "yq erfolgreich nach ${YQ_LOCAL} heruntergeladen."
else
  rm -f -- "${tmp}"
  if [[ -x "${YQ_LOCAL}" ]]; then
    log "Download fehlgeschlagen – benutze vorhandenen Pin unter ${YQ_LOCAL} (offline fallback)."
  else
    die "Download von yq fehlgeschlagen und kein nutzbarer Pin vorhanden."
  fi
fi
```

Workflow-/CI-Anpassungen
- Stelle sicher, dass das Script ausführbar committed ist:
  - Lokal: git update-index --add --chmod=+x scripts/tools/yq-pin.sh && git commit -m "make yq-pin.sh executable"
- Oder rufe explizit mit bash auf in Workflow:
  - run: bash scripts/tools/yq-pin.sh ensure
  - oder setze in Schritt: shell: bash

Prüf- und Debug-Schritte (lokal / CI)
1. Lokale Reproduktion:
   - bash -x scripts/tools/yq-pin.sh ensure
2. In CI: temporär mehr Logging aktivieren (set -x) und rerun.
3. Wenn Script wieder ohne Output abbricht, prüfe Runner-Shell: echo $SHELL und uname -a am Job-Beginn.

Warum das die Probleme behebt
- Der Hauptverdacht war ein ungebundener BASH_SOURCE-Zugriff bei non-bash-Aufruf; das führt sofort zu Exit (set -u). Die vorgeschlagene Änderung macht die Pfadbestimmung robust.
- Frühes Logging + trap sorgt dafür, dass beim nächsten Lauf aussagekräftige Logs anfallen statt stummem Exit.
- Explizite Nutzung von bash oder Setzen des +x-Bits verhindert Überraschungen durch unterschiedliche Shells/Invocation-Methoden.

Nächste Schritte (empfohlen)
1. Apply Patch (oder commit the executable bit) und push.
2. Rerun die Action.
3. Falls noch Fehler auftreten: poste die erweiterten Logs (mit set -x output). Ich helfe dann beim nächsten Schritt.

Wenn du möchtest, erstelle ich das genaue Commit-Diff (Patch) zum Einspielen in repo und eine vorgeschlagene Änderung für .github/workflows/toolchain-guard.yml, damit der Schritt explizit bash verwendet.