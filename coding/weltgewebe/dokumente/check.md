bash -lc '
set -Eeuo pipefail
mkdir -p .devcontainer/scripts .vscode .github/workflows

# 1) Devcontainer-Konfiguration (reentry-ready)
cat > .devcontainer/devcontainer.json <<JSON
{
  "name": "Weltgewebe – Devcontainer (Reentry)",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
  "remoteUser": "vscode",
  "overrideCommand": false,

  "workspaceFolder": "/workspaces/${localWorkspaceFolderBasename}",

  "postCreateCommand": "bash .devcontainer/scripts/postCreate.sh",
  "postStartCommand": "bash .devcontainer/scripts/postStart.sh",

  "customizations": {
    "vscode": {
      "extensions": [
        "esbenp.prettier-vscode",
        "dbaeumer.vscode-eslint",
        "rust-lang.rust-analyzer",
        "tamasfe.even-better-toml",
        "redhat.vscode-yaml",
        "streetsidesoftware.code-spell-checker"
      ],
      "settings": {
        "terminal.integrated.defaultProfile.linux": "bash (safe)",
        "terminal.integrated.profiles.linux": {
          "bash":        { "path": "/bin/bash", "args": [] },
          "bash (safe)": { "path": "/bin/bash", "args": ["--noprofile","--norc"] }
        },
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "editor.formatOnSave": true
      }
    }
  },

  "containerUser": "vscode",
  "updateRemoteUserUID": true
}
JSON

# 2) postCreate: Toolchain (Node+pnpm, Rust+just, Python, Vale) + optionale Web-Install
cat > .devcontainer/scripts/postCreate.sh <<'\''SH'\'' 
#!/usr/bin/env bash
set -Eeuo pipefail

echo "▶ postCreate: baseline apt"
sudo apt-get update -y
sudo apt-get install -y --no-install-recommends \
  curl ca-certificates unzip zip jq git make build-essential \
  ripgrep fd-find python3 python3-pip

echo "▶ postCreate: Node 20 + corepack/pnpm"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
if command -v corepack >/dev/null 2>&1; then
  corepack enable || true
  corepack prepare pnpm@latest --activate || true
fi

echo "▶ postCreate: Rustup + just"
if ! command -v rustup >/dev/null 2>&1; then
  curl -fsSf https://sh.rustup.rs | sh -s -- -y --profile minimal
  echo '\''export PATH="$HOME/.cargo/bin:$PATH"'\'' >> "$HOME/.bashrc"
fi
source "$HOME/.cargo/env"
rustup toolchain install stable -c rustfmt clippy
cargo install just --locked || true

echo "▶ postCreate: Vale"
if ! command -v vale >/dev/null 2>&1; then
  curl -fsSL https://install.goreleaser.com/github.com/errata-ai/vale.sh | sh
  echo '\''export PATH="$HOME/.vale/bin:$PATH"'\'' >> "$HOME/.bashrc"
fi

echo "▶ postCreate: repo-sanity (optional installs)"
# Web-Gate A: wenn apps/web existiert, Dependencies installieren (nicht fatal, wenn nicht)
if [ -f "apps/web/package.json" ]; then
  (cd apps/web && pnpm install || npm install) || true
fi

echo "✅ postCreate done"
SH
chmod +x .devcontainer/scripts/postCreate.sh

# 3) postStart: Login/RC-Fallen entschärfen (kein --login nötig, aber sicher ist sicher)
cat > .devcontainer/scripts/postStart.sh <<'\''SH'\'' 
#!/usr/bin/env bash
set -Eeuo pipefail
# harte exec zsh etc. aus User-RCs neutralisieren
for f in "$HOME/.bashrc" "$HOME/.profile" "$HOME/.bash_profile" "$HOME/.bash_login"; do
  [ -f "$f" ] || continue
  sed -i '\''s/^[[:space:]]*exec[[:space:]]\+zsh.*/# exec zsh # guarded/'\'' "$f" || true
done
echo "✅ postStart ok"
SH
chmod +x .devcontainer/scripts/postStart.sh

# 4) VS Code – Terminal sicher als Default
cat > .vscode/settings.json <<JSON
{
  "terminal.integrated.defaultProfile.linux": "bash (safe)",
  "terminal.integrated.profiles.linux": {
    "bash":        { "path": "/bin/bash", "args": [] },
    "bash (safe)": { "path": "/bin/bash", "args": ["--noprofile","--norc"] }
  },
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true
}
JSON

# 5) CI für Vale (optional soft – bricht PRs nicht ab)
cat > .github/workflows/vale.yml <<'\''YML'\'' 
name: prose-vale
on:
  pull_request:
  push:
    branches: [main]
jobs:
  vale:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Vale
        run: |
          curl -fsSL https://install.goreleaser.com/github.com/errata-ai/vale.sh | sh
          echo "$HOME/.vale/bin" >> $GITHUB_PATH
      - name: Run Vale (soft)
        run: vale --minAlertLevel=warning --no-exit --output=summary .
YML

# 6) Commit
git add .devcontainer .vscode .github/workflows/vale.yml
git commit -m "devcontainer(reentry): Node20+pnpm, Rust+just, Python, Vale; safe terminal; postCreate/postStart robust"
echo "✅ Commit erstellt. Nächster Schritt: Command Palette → Codespaces: Rebuild Container"
'