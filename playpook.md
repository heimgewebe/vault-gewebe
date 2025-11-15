The job failed because the command wgx was not found (error: sh: 1: wgx: not found). This means the required CLI tool wgx was never installed or made available in the runner environment.

### Solution

1. **Ensure wgx Installation**
   - Add a step to your workflow to install wgx before using it. If wgx is a Rust crate, you typically install it with cargo:

   ```yaml
   - name: Install wgx
     run: cargo install wgx
   ```

   If your workflow uses a custom path for cargo binaries, ensure that `$CARGO_HOME/bin` is in your `$PATH`:

   ```yaml
   - name: Add Cargo to PATH
     run: echo "$HOME/.cargo/bin" >> $GITHUB_PATH
   ```

2. **Check for Conditional Install**
   - If the workflow requires a specific toolchain or version for wgx, specify it explicitly:

   ```yaml
   - name: Install wgx with specific toolchain
     run: cargo +stable install wgx
   ```

3. **Verify tool usage**
   - Make sure the next steps reference wgx only after installation.

### Code Suggestion for `.github/workflows/playbook-gate.yml`

Insert these steps before any usage of wgx:

```yaml
- name: Install Rust toolchain (if missing)
  run: |
    if ! command -v rustup > /dev/null; then
      curl --proto '=https' --tlsv1.2 --retry 10 --retry-connrefused --location --silent --show-error --fail https://sh.rustup.rs | sh -s -- --default-toolchain stable -y
      echo "$HOME/.cargo/bin" >> $GITHUB_PATH
    fi

- name: Install wgx
  run: cargo install wgx
```

### Next Steps

- Commit and push these changes to your workflow file: [.github/workflows/playbook-gate.yml@14cd9a1c7d2d1d8d4ee4b3453f0b1e797f4947c4](https://github.com/heimgewebe/hausKI/blob/14cd9a1c7d2d1d8d4ee4b3453f0b1e797f4947c4/.github/workflows/playbook-gate.yml).
- Rerun the workflow to confirm the fix.

If wgx requires build dependencies or OS packages, add install steps for those as well. This solution respects deployment transparency, avoids quick hacks, and ensures reproducibility.



hier die datei:

name: playbook-gate

on:
  pull_request:
  workflow_dispatch: {}

permissions:
  contents: read

jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Rust toolchain (stable)
        uses: dtolnay/rust-toolchain@stable
        with:
          toolchain: stable

      - name: Cache cargo + target
        uses: Swatinem/rust-cache@v2
        with:
          shared-key: ${{ runner.os }}-hauski-cli-${{ hashFiles('**/Cargo.lock') }}
          cache-on-failure: true

      - name: Build hauski binary
        run: cargo build --package hauski-cli --release

      - name: Run playbook
        run: ./target/release/hauski-cli assist --playbook playbooks/code_assist.yml

		
		
		
		bitte liefer mir die ideale datei