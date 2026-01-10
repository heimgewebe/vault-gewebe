Die Fehlermeldung signalisiert, dass der Job mit dem Exit-Code 123 abgebrochen ist, nachdem der Befehl heimgeist::append_event "$event_id" "$payload" aufgerufen wurde. Außerdem zeigen die Logs Stellen, an denen Python-Importe getestet werden – vermutlich als Abhängigkeit oder für ein JSON-Handling im Shell-Skript.

Häufige Ursachen und Lösungen für diesen Fehler in eurem Stack:

1. Prüfe Python-Import
   - Die Zeile if ! import_error=$(python3 -c "import json, sys, os" 2>&1); then deutet darauf hin, dass Python-Module nicht korrekt importiert wurden. Wenn Python im Build-Image fehlt oder die Standardmodule korrupt sind, schlägt dies fehl.
   - Löse das mit:
     - Stelle sicher, dass das richtige Python3-Image/im Runner installiert ist.
     - Wenn ein eigener Runner verwendet wird: python3 --version und python3 -c "import json, sys, os" ausführen, prüfen ob Fehler auftreten.

2. Fehlende Abfrage auf Fehlercode von heimgeist::append_event
   - Die Funktion heimgeist::append_event gibt offenbar einen Fehler zurück (Exit-Code != 0), der im Skript nicht behandelt und durchgereicht wird.
   - Ergänze Fehlerbehandlung im Script:
     ```bash
     heimgeist::append_event "$event_id" "$payload"
     if [[ $? -ne 0 ]]; then
       echo "Fehler beim Append-Event" >&2
       exit 123
     fi
     ```

3. Git-Fehler/Git fetch fallback
   - Der Log erwähnt, dass git fetch fehlschlagen kann und dann auf die komplette Shell-File-List zurückgefallen wird. Prüfe, ob die Branch-/SHA-Referenz ("3a701becb8737f13d80c982c1bf6123b37a89f0b") für git fetch korrekt ist – ansonsten im Workflow-Definition ggf. fetch depth verringern oder CI-Branch-Handling prüfen.

Konkret solltest du:
- Sicherstellen, dass im Build-Image Python3 und die Standardbibliotheken verfügbar sind.
- Heimgeist-Skripte robust machen, d.h. Rückgabewerte immer explizit prüfen.
- Im Fail-Case mehr Kontext loggen: z.B. Umgebungsvariablen, Python-Installation, $event_id, $payload-Inhalt (wenn nicht sensibel).

Sollte das Problem beim heimgeist::append_event auftreten, prüfe im Skript (vermutlich bash), ob die Events korrekt serialisiert werden und das Event-Backend (z.B. NATS/DB) erreichbar ist. Das Fehlerhandling wie oben direkt nach append_event macht die Ursache im Log sofort sichtbar.

Besonders wichtig (für Weltgewebe):
- Keine stillen Quick-Fixes, Fehler nachvollziehbar loggen.
- Shell-Skripte stets robust gegen Umgebungsprobleme und Fehler in Event-Ketten absichern.

Wenn du möchtest, dass ich einen bestimmten Abschnitt im Workflow (z. B. die heimgeist-Funktion oder das Skript) oder die Job-Definition detailliert prüfe, bitte den entsprechenden Codeabschnitt oder Pfad bereitstellen.





The failing job (ID 58875481628) in the workflow 🦑 "shell-docs" (.github/workflows/shell-docs.yml) is aborting on download and parsing steps for assets from a GitHub release. The problem is:

- The step that fetches the GitHub Release for a specific tag (${version}) is either
  - receiving an empty response,
  - or the response contains "Not Found",
  - or the response does not include the required asset information (checksums.txt and vale.tar.gz).

### Solution

#### 1. Double check that the GitHub Release for the required tag exists
- Ensure that the release with the tag `${version}` exists on https://github.com/errata-ai/vale/releases.
- If the tag is generated dynamically, confirm it is being passed correctly to the fetch logic.

#### 2. Check the asset names
- The script expects an asset called vale_3.6.1_Linux_64-bit.tar.gz and checksums.txt.
- If these files do not exist or have a different name in the release, the fetch will fail.
- Solution: Rename the assets in the GitHub Release to match the expected names, or adapt the script to use the correct names.

#### 3. Defensive checks
If the API response format changes or assets are missing, the parsing logic may break (see all JSON and shell parsing in your logs). Add debugging output for `release_json` so the job output is more transparent.

#### 4. Network Issues & CI Token
If you use a GitHub Actions token with insufficient permissions or a wrong fetch URL, this may result in HTTP errors.
- Ensure the workflow uses a proper GITHUB_TOKEN or a PAT with `repo` scope.
- Confirm the `curl` fetch for the GitHub API uses authentication headers if rate-limits or permissions apply.

### Code Suggestions

**A. Add logging to debug missing assets:**
```bash
echo "Downloaded release JSON:"
echo "$release_json"
echo "$release_json" | jq '.' || echo "jq failed to parse"
```

**B. Improve asset fetching for robustness:**
If asset names differ, you can add logic to select the correct asset dynamically, for example:
```bash
# Current asset selection:
asset_name="vale_3.6.1_Linux_64-bit.tar.gz"
asset_url=$(echo "$release_json" | jq -r --arg name "$asset_name" '.assets[] | select(.name == $name) | .browser_download_url')

# Better (fallback) matching if names change slightly:
asset_url=$(echo "$release_json" | jq -r '.assets[] | select(.name | test("Linux.*tar.gz$")) | .browser_download_url // empty' | head -n1)
```

**C. Fail clearly if asset is not found:**
```bash
if [[ -z "$asset_url" ]]; then
  echo "::error::Required asset not found in release $version"
  exit 1
fi
```

#### If you want to make the script fail gracefully and display more debug info, try:
```bash
if [[ -z "$release_json" || "$release_json" == *"Not Found"* ]]; then
  echo "::error::Release $version not found or empty response"
  exit 1
fi
if ! echo "$release_json" | jq . >/dev/null 2>&1; then
  echo "::error::Release JSON could not be parsed"
  echo "$release_json"
  exit 1
fi
```

### Summary

- Ensure the correct release/tag and asset names exist.
- Improve logging for faster debugging in CI.
- Make fetching logic robust against minor upstream changes.

If you want a code suggestion for the relevant YAML or shell section, paste that part here, and I’ll adapt it for you.