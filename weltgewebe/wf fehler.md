Die Fehlermeldung im Log zeigt: "'toolchain' is a required input", was darauf hinweist, dass der Build wegen einer fehlenden Toolchain-Konfiguration fehlschlägt. Im Workflow (.github/workflows/api.yml) wird der Rust-Toolchain-Step jedoch korrekt ausgeführt:

```yaml
- name: Install rust toolchain
  uses: dtolnay/rust-toolchain@stable
  with:
    toolchain: "1.89.0"
    components: rustfmt, clippy
```

Ein weiteres Problem zeigt sich im Testlauf (apps/api):

```
store.create_with_expiry("user@example.com".to_string(), Duration::milliseconds(1));
std::thread::sleep(std::time::Duration::from_millis(50));
```
Dieser Test schlägt fehl, weil die Ablaufzeit (`Duration::milliseconds(1)`) zu kurz gesetzt ist – Ein Sleep von 50ms garantiert, dass das Objekt abläuft, bevor es geprüft werden kann.

Lösungsvorschläge:

1. Überprüfe, ob alle betroffenen Steps wirklich mit Rust 1.89.0 ausgeführt werden und die toolchain als Input beim Step verwendet wird (ggf. Workflow-Cache leeren).
2. Passe im Test die Ablaufzeit nach oben an, z. B.:

```rust
store.create_with_expiry("user@example.com".to_string(), Duration::milliseconds(100));
std::thread::sleep(std::time::Duration::from_millis(50));
```

Damit garantierst du, dass der Eintrag während des Tests nicht bereits abgelaufen ist. So sollte der Job erfolgreich durchlaufen.

Der Job **68312196529** schlägt nicht wegen Build/Typecheck fehl, sondern weil **Prettier im Web-CI-Lint Schritt Formatierungsabweichungen findet** und dadurch mit Exit Code 1 abbricht.

Aus den Logs:
- `Code style issues found in 6 files. Run Prettier with --write to fix.`
- u. a. betroffen:  
  - `apps/web/src/lib/stores/uiInvariants.test.ts`  
  - `apps/web/src/lib/utils/guards.test.ts`  
  - `apps/web/vitest.config.ts`

In eurer Pipeline passiert das hier:
- `.github/workflows/ci.yml` ruft `just ci` auf ([ade6e714…/.github/workflows/ci.yml#206-210](https://github.com/heimgewebe/weltgewebe/blob/ade6e7143d5c5c35ad6570757f7738d827e99f41/.github/workflows/ci.yml#L206-L210))
- `Justfile` führt in `apps/web` u. a. `pnpm run ci` aus ([ade6e714…/Justfile#25-33](https://github.com/heimgewebe/weltgewebe/blob/ade6e7143d5c5c35ad6570757f7738d827e99f41/Justfile#L25-L33))
- `apps/web/package.json` definiert `ci` als: Budget-Check + `pnpm lint` + `pnpm check:ci` ([ade6e714…/apps/web/package.json#35-36](https://github.com/heimgewebe/weltgewebe/blob/ade6e7143d5c5c35ad6570757f7738d827e99f41/apps/web/package.json#L35-L36))
- `lint` ist `prettier -c . && eslint ...` ([ade6e714…/apps/web/package.json#25-26](https://github.com/heimgewebe/weltgewebe/blob/ade6e7143d5c5c35ad6570757f7738d827e99f41/apps/web/package.json#L25-L26))  
  → also: **Prettier-Check ist “gating”**.

## Lösung (empfohlen): Prettier-Fixes committen
1. Lokal im Repo:
   ```bash
   cd apps/web
   pnpm install
   pnpm format
   ```
   (`format` ist `prettier -w .` → schreibt die Änderungen)

2. Danach prüfen:
   ```bash
   pnpm lint
   pnpm check:ci
   ```

3. Änderungen committen (das sind i. d. R. nur Whitespace/Quotes/Indentation).

Das behebt genau den CI-Abbruch, weil `prettier -c .` dann wieder “clean” ist.

## Konkreter Hinweis zu einem der genannten Files
`apps/web/vitest.config.ts` ist aktuell mit Tabs/Einrückung formatiert (siehe Datei: [ade6e714…/apps/web/vitest.config.ts](https://github.com/heimgewebe/weltgewebe/blob/ade6e7143d5c5c35ad6570757f7738d827e99f41/apps/web/vitest.config.ts)). Prettier wird das ggf. in das in eurem Projekt konfigurierte Standardformat überführen. Dasselbe gilt für die beiden genannten `*.test.ts` Dateien.

## Nicht empfohlen (aber möglich): CI “weicher” machen
Man könnte `prettier -c` in CI nicht-fatal machen oder nur warnen lassen. Das würde aber eure “strikte Transparenz und Reproduzierbarkeit” schwächen, weil Formatierungsdrift dann unbemerkt im PR landen kann. Daher: **besser formatieren und committen**.

The failing job **68312186333** (workflow **Docs Guard**, ref `ade6e7143d5c5c35ad6570757f7738d827e99f41`) fails in the unit tests for `scripts/docmeta/review_impact.py`:

- `test_linear_chain_no_cycles`: expected `docs/b.md` and `docs/a.md` to be listed as transitive impacts of `doc-c`, but got `[]`.
- `test_simple_cycle_detected`: expected the cycle warning to be printed to stderr and cycles to be detected.

Both failures point to the same root cause: **the dependency graph is being built with mismatched keys**.

## Root cause

In `scripts/docmeta/review_impact.py`, you build the reverse dependency map like this:

```python
depends_on = normalize_list_field(frontmatter.get('depends_on', []))
forward_deps[doc_id] = depends_on

for dep in depends_on:
    if dep not in dependencies:
        dependencies[dep] = []
    dependencies[dep].append(rel_file_path)
```

- `depends_on` contains **document IDs** (e.g. `doc-c`).
- But `dependencies[dep]` stores **file paths** (e.g. `docs/b.md`).
- Later, when computing impacts, you try to traverse from an impacted file back to an ID via `file_to_id` — but this only works if the impacted file path matches exactly the keys in `file_to_id` and the traversal is consistent.

This “mixed representation” (IDs as keys, file paths as values) makes the traversal fragile and is the reason the tests see no propagated impacts and inconsistent cycle behavior.

## Fix (recommended): make graphs ID-based, convert to file paths only for output

Change the reverse graph to store **dependent IDs**, not file paths. Then, when producing `transitive_impacts`, convert impacted IDs to file paths via `id_to_file`.

### Patch suggestion: `scripts/docmeta/review_impact.py`

Replace the graph building and impact traversal with the following pattern (minimal change, consistent semantics):

```python
# Build dependency graph:
# forward_deps: doc_id -> list of doc_ids it depends on
# reverse_deps: doc_id -> list of doc_ids that depend on it
reverse_deps = {}
forward_deps = {}
id_to_file = {}
missing_ids = []

...

doc_id = frontmatter.get('id')
...
id_to_file[doc_id] = rel_file_path

depends_on = normalize_list_field(frontmatter.get('depends_on', []))
forward_deps[doc_id] = depends_on

for dep_id in depends_on:
    reverse_deps.setdefault(dep_id, []).append(doc_id)
```

Then update the transitive impact computation:

```python
impact_data = {}
for doc_id, filepath in id_to_file.items():
    visited = set()
    queue = [doc_id]
    impacted_ids = set()

    while queue:
        current_id = queue.pop(0)
        if current_id in visited:
            continue
        visited.add(current_id)

        for dependent_id in reverse_deps.get(current_id, []):
            impacted_ids.add(dependent_id)
            queue.append(dependent_id)

    impacted_files = [
        id_to_file[i] for i in impacted_ids if i in id_to_file
    ]

    impact_data[doc_id] = {
        "file": filepath,
        "transitive_impacts": sorted(impacted_files),
    }
```

### Why this fixes both tests

- **`test_linear_chain_no_cycles`**:  
  If `doc-b` depends on `doc-c` and `doc-a` depends on `doc-b`, then `reverse_deps["doc-c"] = ["doc-b"]` and `reverse_deps["doc-b"] = ["doc-a"]`. BFS from `doc-c` yields `doc-b` then `doc-a`, which converts to `docs/b.md` and `docs/a.md` as expected.

- **`test_simple_cycle_detected`**:  
  Cycle detection already operates on `forward_deps` (ID → ID), so keeping everything ID-based makes cycle detection and reporting consistent. The script prints a warning to stderr when `cycles` is non-empty (lines 168–172 in the current file), matching the test expectation.

## Where this runs in CI

The failing command is triggered by `make docs-guard` (Makefile line 4), which runs:

- `python3 -m unittest discover scripts/docmeta/tests/`

and the workflow that executes it is:

- `.github/workflows/docs-guard.yml` (step “Run Docs Guard”)

## Quick verification locally

From repo root:

```bash
python3 -m unittest scripts/docmeta/tests/test_review_impact.py -v
```

After applying the patch above, both failing tests should pass, and the job should proceed to the remaining docs-guard steps.

The job `68312185347` is failing because **Prettier checks are being run during `pnpm install` (via lifecycle scripts) and they detect formatting issues**:

- The log shows Prettier warnings and then:
  - `Code style issues found in 6 files. Run Prettier with --write to fix.`
  - followed by `ELIFECYCLE Command failed with exit code 1.`

Even though the workflow step name is “Install dependencies”, the failure is coming from a script that runs as part of the install lifecycle (most commonly `postinstall` or another lifecycle hook).

## Fix (recommended): format the reported files and commit
In `apps/web/package.json`, formatting is defined as:

- `format`: `prettier -w .`
- `lint`: `prettier -c . && eslint . --max-warnings=0`

So the direct fix is to run Prettier in the web app and commit the results:

```bash
cd apps/web
pnpm format
git add -A
git commit -m "web: format (prettier)"
```

This will fix the 6 files Prettier complained about (the log shows at least these three among them):
- `src/lib/stores/uiInvariants.test.ts`
- `src/lib/utils/guards.test.ts`
- `vitest.config.ts`
(plus 3 more not shown in the snippet)

## Fix (CI hygiene): ensure Prettier doesn’t run during `pnpm install`
Right now CI is failing *before* it even reaches the explicit `pnpm lint` step in the workflow (`apps/web/.github/workflows/web.yml`, step “Lint”). That’s a signal that **format checking is happening during install**, which is brittle.

You already have:
- an explicit `pnpm lint` step in CI (correct place to fail)
- a `postinstall` in `apps/web/package.json` (`node ./scripts/verify-cookie-version.js`)

So the best adjustment is:

1) **Keep install-time scripts “verification-only” and non-formatting**  
2) Ensure Prettier is only enforced in the dedicated `pnpm lint` step.

Concretely: check whether someone recently added Prettier checking into an install lifecycle script (e.g. `preinstall`, `install`, `postinstall`, or a script invoked by them). If yes, move it into `lint` (already present) or a dedicated `format:check` script.

Example of what *not* to do in `postinstall`:
```json
"postinstall": "prettier -c . && node ./scripts/verify-cookie-version.js"
```

Example of the better structure:
```json
"scripts": {
  "format": "prettier -w .",
  "format:check": "prettier -c .",
  "lint": "pnpm format:check && eslint . --max-warnings=0",
  "postinstall": "node ./scripts/verify-cookie-version.js"
}
```

## Notes
- The cache restore warning (`Cache service responded with 400`) is noisy but **not the cause** of the failure here.
- The workflow file involved is `https://github.com/heimgewebe/weltgewebe/blob/ade6e7143d5c5c35ad6570757f7738d827e99f41/.github/workflows/web.yml` (ref `ade6e7143d5c5c35ad6570757f7738d827e99f41`). The actual failure is earlier than unit tests/build; it’s the formatting check that exits with code 1.

If you apply the Prettier write fix (`pnpm format` in `apps/web`) and commit, the job should pass unless there are additional lint/typecheck/test failures afterward.