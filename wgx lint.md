The job failed due to multiple issues, but the main actionable failures are:
1. The required variable version is missing.
2. The markdown linter markdownlint-cli2 found errors in your README.md and documentation files, causing a non-zero exit.

Here's how to fix the CI job:

---
### 1. Set the Version Variable
Ensure the ${version} variable is set in your workflow before it's accessed. If you are fetching a release, make sure to capture and export the version correctly for all subsequent steps. Example for bash:

```bash
# Example: Fetch version from Git tag or predefined environment variable
version=$(git describe --tags --abbrev=0 2>/dev/null || echo "unknown")
export version
```
If you're fetching release info through GitHub API, check parsing and assignment to version so it’s never unset.

Update your workflow YAML and scripts so steps needing $version can't run if it’s missing.

---
### 2. Fix Markdown Linting Errors
The linter specifically found:
- Inline HTML (MD033): lines 3 and 4, e.g. <p> or <img> tags.
- Long lines (MD013): several lines exceed 120 characters.
- Missing language in fenced code blocks (MD040): e.g. replace
  ```
  ```
  with
  ```sh
  ```
  or another language.

Example fixes for README.md:
```markdown
<!-- Remove or rewrite raw HTML, or disable MD033 for specific segments if necessary -->
<!--
<!-- HTML Example -->
<p>This is a paragraph.</p>
Replace with:
This is a paragraph.
-->

<!-- Shorten lines to ≤120 chars and specify language in code fences -->
```sh
# your shell command here
```
```

You may also configure markdownlint to ignore inline HTML for specific files if required:
```json
{
  "MD033": false
}
```
But only do this if inline HTML is truly necessary.

---
### Summary
- Set the version variable before use; check that all calls and assignments succeed.
- Fix lint errors: no raw HTML (unless configured otherwise), add code languages, keep lines ≤120 characters.

After fixing, commit the changes and re-run the workflow.

If you provide the workflow or script files (ci.yml, install/markdown scripts), I can suggest more precise code changes.

## Problem

Der Job schlägt bei der **Markdownlint**-Prüfung fehl. Die konkrete Fehlermeldung: 

```
docs/archive/wgx_monolith_20250925T130147Z.md:1 MD041/first-line-heading/first-line-h1 
First line in a file should be a top-level heading [Context: "```bash"]
```

## Lösung

Die Datei `docs/archive/wgx_monolith_20250925T130147Z.md` beginnt mit einem Code-Block (` ```bash`), anstatt mit einer Überschrift der Ebene 1 (`# Titel`).

**Optionen:**

### Option 1: Datei korrigieren (empfohlen)
Füge vor dem Code-Block eine H1-Überschrift hinzu: 

```markdown
# WGX Monolith Archiv (2025-09-25)

```bash
... 
```

### Option 2: Regel deaktivieren
Falls archivierte Dateien nicht diesem Standard entsprechen müssen, füge in `.markdownlint-cli2.jsonc` die Archiv-Dateien zu den Ausnahmen hinzu:

```jsonc
{
  "ignores": [
    "docs/archive/**"
  ]
}
```

Oder passe die Regel MD041 an:

```jsonc
{
  "config": {
    "MD041":  false
  }
}
```

### Option 3: Datei aus Git entfernen
Falls diese archivierte Datei nicht versioniert werden soll:

```bash
git rm docs/archive/wgx_monolith_20250925T130147Z.md
```

**Empfehlung:** Option 2 (Archiv-Ordner ausschließen) ist wahrscheinlich am sinnvollsten, da archivierte Dateien oft nicht mehr nachträglich formatiert werden. 