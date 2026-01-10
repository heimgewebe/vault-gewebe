The job 56698194676 failed due to a code formatting issue detected by Prettier in the file tests/drawers.spec.ts. The relevant log output:

```
Checking formatting...
[warn] tests/drawers.spec.ts
[warn] Code style issues found in the above file. Run Prettier with --write to fix.
 ELIFECYCLE  Command failed with exit code 1.
error: Recipe `ci` failed on line 37 with exit code 1
```

**Solution:**  
You must run Prettier with the --write flag to automatically fix the formatting issues in tests/drawers.spec.ts.

Run this command locally:
```sh
npx prettier --write tests/drawers.spec.ts
```
or if your project uses a package script:
```sh
pnpm prettier --write tests/drawers.spec.ts
```
Then commit and push the changes:
```sh
git add tests/drawers.spec.ts
git commit -m "Fix code style: run Prettier on drawers.spec.ts"
git push
```

**Background:**  
- This is a CI enforcement of code style to ensure consistency and readability.
- Running Prettier with --write will modify the file in place to match your project's formatting rules.

**No further code changes are needed**—just fix the formatting as instructed by the logs, commit, and rerun the pipeline.



The job failed due to code style issues detected by Prettier in the file tests/drawers.spec.ts. The relevant error from the logs:

[warn] tests/drawers.spec.ts
[warn] Code style issues found in the above file. Run Prettier with --write to fix.
 ELIFECYCLE  Command failed with exit code 1.

**Solution**:
You need to correct the formatting in tests/drawers.spec.ts using Prettier. Run the following command in your repository root:

```sh
pnpm prettier --write tests/drawers.spec.ts
```

Or, if you use yarn or npm:

```sh
npx prettier --write tests/drawers.spec.ts
```
Afterwards, commit the changes and push them.

**Why?**
Your project enforces code style as part of the CI process. Any file that isn't formatted according to Prettier will cause the job to fail, blocking merges. This is consistent with your project's principles of transparency and code clarity.

**Additional note**: No other errors in the logs indicate failed backend logic or test logic, the issue is limited to code formatting.