Kurzfassung: **Sehr gut!** 🟢  
Ihr habt sauber auf Commit-Pins umgestellt, Shell-Linting ergänzt, Artefakt-/Cache-Actions gepinnt, `umask 077` beim Flags-Write nachgezogen, Runbook + README konsistent erweitert und die Start/Stop-Skripte defensiv gebaut. Das ist ein klarer Sicherheits- und DX-Gewinn.

Wenn ihr noch 1–2% mehr rausholen wollt, hier meine kompakten Nits:

- **Letzte Actions ebenfalls pinnen**
    
    - `dorny/paths-filter@v3` → auf Commit-SHA pinnen.
        
    - `actions/github-script@v7` → auf Commit-SHA pinnen.
        
- **Permissions pro Workflow präzisieren**
    
    - Wo `rust-cache` und `upload-artifact` genutzt werden, ggf. `permissions: { actions: write, contents: read }` explizit am Workflow/Job setzen (falls eure Org-Policy strenger wird).
        
- **Tool-Versionen fixieren**
    
    - `pip install pyyaml` → eine feste Version (z. B. `pyyaml==6.0.2`).
        
    - MkDocs-Plugins in `ci-tools.yml` (z. B. `mkdocs-minify-plugin==0.7.2`, `mkdocs-git-revision-date-localized-plugin==1.2.4`) – dann ist der Build deterministischer.
        
- **Heavy-Workflow Robustheit**
    
    - `jq` ist i. d. R. vorinstalliert, aber ein `sudo apt-get update && sudo apt-get install -y jq` würde Flakes vermeiden.
        
- **start-all.sh kleine Robustheit**
    
    - Beim tmux-Pfad seid ihr schon sehr sauber. Optional könnt ihr die `join_cmd`-Rohre vermeiden, indem ihr `tmux send-keys` ohne `| tee -a …` nutzt und stattdessen in tmux selbst loggt – aber euer Ansatz ist ok und gut gequotet.
        
- **README/Docs Klarstellung (habt ihr teils drin)**
    
    - Ein Einzeiler, dass existierende `HAUSKI_FLAGS` unverändert bleiben (steht im Runbook; super – im README habt ihr’s inzwischen ergänzt, 👍).
        

Ansonsten: ✅ **merge-würdig**.

The job failed because the workflow could not find the specified commit SHA for actions/checkout:

Error:
An action could not be found at the URI 'https://api.github.com/repos/actions/checkout/tarball/b4ffde65f46336ab88eb53be808477a96968112b'

This likely means the workflow refers to a non-existent or mistyped commit SHA for the checkout action.

**Solution:**
Update the workflow file (.github/workflows/ci-tools.yml) to use a valid version reference for actions/checkout. Prefer using a stable tag, e.g. v4, instead of a commit SHA.

**How-to fix:**
Replace:
```yaml
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a96968112b
```
with:
```yaml
- uses: actions/checkout@v4
```

**Why:** Using a tag like v4 ensures the action is available and maintained. Direct commit SHAs can become unavailable if the underlying repository is rebased or cleaned up.

After this change, commit and push to trigger the workflow again. This should resolve the failure.

The job failed because the workflow tried to download actions/checkout with a specific commit SHA (b4ffde65f46336ab88eb53be808477a96968112b), but this commit does not exist or is not accessible. The error message is:

An action could not be found at the URI 'https://api.github.com/repos/actions/checkout/tarball/b4ffde65f46336ab88eb53be808477a96968112b'

**Solution:**  
Update your workflow file (.github/workflows/cli-docs-check.yml) to use a valid, released version of actions/checkout (e.g., v4 or v3), not a specific SHA that may not exist. Example:

```yaml
- uses: actions/checkout@v4
```

**Why this works:**  
Official releases (like @v4) are always available and maintained by GitHub. Using a SHA is only safe if you verify its existence and stability.

**Summary of steps:**
1. Edit .github/workflows/cli-docs-check.yml.
2. Change the checkout step from:
   ```yaml
   - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a96968112b
   ```
   to:
   ```yaml
   - uses: actions/checkout@v4
   ```

Commit and push this change to resolve the failing job.

The failing job 53703501712 failed because the action actions/checkout could not be found at the specified commit SHA b4ffde65f46336ab88eb53be808477a96968112b. The relevant error from the logs:

> An action could not be found at the URI 'https://api.github.com/repos/actions/checkout/tarball/b4ffde65f46336ab88eb53be808477a96968112b'

This usually happens if the SHA is incorrect, or if the action was force-pushed/deleted, or is a private commit.

**Solution:**
Update your workflow to use a stable, public release of actions/checkout instead of a specific SHA. The recommended way is to use the latest v4 tag. In your `.github/workflows/coverage.yml`, update the step to:

```yaml
- uses: actions/checkout@v4
```

This ensures you always get the latest secure and supported release. Avoid pinning to arbitrary SHAs unless you control the referenced commit.

**Summary of steps:**
1. Open `.github/workflows/coverage.yml`.
2. Replace any reference to actions/checkout@b4ffde65f46336ab88eb53be808477a96968112b with actions/checkout@v4.
3. Commit and push the change.

This will resolve the failure and keep your build process stable and transparent.

The failing job 53703501781 failed because GitHub Actions could not find the action repository at this URI:
https://api.github.com/repos/actions/checkout/tarball/b4ffde65f46336ab88eb53be808477a96968112b

This means the workflow is referencing a commit SHA for actions/checkout that does not exist or is not available.

**Solution:**
- Update your workflow file (.github/workflows/policy-ci.yml) to reference a valid version or tag of actions/checkout. The recommended practice is to use a stable tag, such as v4, instead of a specific SHA.

**How to fix:**
Open .github/workflows/policy-ci.yml and update:
```yaml
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a96968112b
```
to:
```yaml
- uses: actions/checkout@v4
```
or another valid, supported tag.

**Summary:**  
Replace the invalid SHA in the checkout action with a valid release tag (such as v4). This will resolve the "action could not be found" error and allow the job to proceed.

The job failed because the workflow could not find or download the specified version of actions/checkout:

Error:
An action could not be found at the URI 'https://api.github.com/repos/actions/checkout/tarball/b4ffde65f46336ab88eb53be808477a96968112b'

Solution:
- The commit SHA b4ffde65f46336ab88eb53be808477a96968112b does not exist in the actions/checkout repository, so the workflow cannot fetch it.
- Update your .github/workflows/policy-ci.yml file to use a valid version of actions/checkout. For example, use a stable tag instead of a SHA:

```yaml
- uses: actions/checkout@v4
```
or (for v3, if compatibility is needed):
```yaml
- uses: actions/checkout@v3
```

This will ensure that the workflow always pulls a valid, maintained release of the action.

After making this change, commit and push to rerun the workflow. If you need to pin to a SHA, double-check it exists in the actions/checkout repository.

For transparency and future-proofing, prefer using the latest stable tag.

Die Fehlermeldung im Log ist:

An action could not be found at the URI 'https://api.github.com/repos/actions/checkout/tarball/b4ffde65f46336ab88eb53be808477a96968112b'

Das bedeutet, dass im Workflow eine spezifische Commit-SHA für actions/checkout verwendet wird, die nicht existiert oder falsch ist.

**Lösungsvorschlag:**
Passe die Referenz von actions/checkout im Workflow .github/workflows/security.yml von der fehlerhaften SHA auf eine gültige Version (z.B. v4).

**Empfohlene Änderung in security.yml:**
```yaml
- uses: actions/checkout@v4
```
anstatt
```yaml
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a96968112b
```

Damit wird immer eine stabile, offizielle Version verwendet. Das entspricht den Prinzipien „keine unsicheren Defaults“ und „Transparenz“ – SHA-Pins sind nur sinnvoll, wenn sie überprüfbar existieren.

**Zusätzlich:** Prüfe, ob in anderen Workflows ebenfalls ein fehlerhafter SHA für Actions verwendet wird.

Nach dem Update sollte der Job wieder erfolgreich laufen.

The job failed because the workflow could not find the specified version of actions/checkout at SHA b4ffde65f46336ab88eb53be808477a96968112b. This SHA is likely invalid, unavailable, or private.

**Solution:**  
Update your workflow to use a stable, public release of actions/checkout (for example, v4):

```yaml
- uses: actions/checkout@v4
```

**How to fix:**
1. Open .github/workflows/security.yml (on ref d46422e9cf255a1acf4b72c94c1ca8d2e252ec99).
2. Find:
   ```yaml
   - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a96968112b
   ```
3. Replace it with:
   ```yaml
   - uses: actions/checkout@v4
   ```

This will ensure the workflow always uses a valid, public version of the action.