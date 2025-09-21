#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

echo "[setup] apt-get install deps..."
sudo apt-get update -y
sudo apt-get install -y --no-install-recommends \
  jq moreutils curl unzip git-lfs python3 ca-certificates \
  vale

echo "[setup] enable git lfs"
git lfs install --skip-repo || true

echo "[setup] node tooling (markdownlint, cspell, jsonlint)"
core_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$core_dir"

# package.json minimal falls nicht vorhanden
if [ ! -f package.json ]; then
  cat > package.json <<'JSON'
{
  "name": "vault-gewebe",
  "private": true,
  "scripts": {
    "lint:md": "markdownlint '**/*.md' -i node_modules",
    "lint:spell": "cspell '**/*.{md,mdx,txt}' --no-must-find-files",
    "lint:json": "find . -type f \\( -name '*.json' -o -name '*.canvas' -o -name '*.jsonc' \\) -print0 | xargs -0 -I{} sh -c \"jq -e . '{}' >/dev/null\"",
    "lint": "npm run lint:md && npm run lint:spell && npm run lint:json",
    "fix:md": "markdownlint --fix '**/*.md' -i node_modules"
  },
  "devDependencies": {
    "cspell": "^8.14.2",
    "markdownlint": "^0.33.0",
    "markdownlint-cli": "^0.41.0"
  }
}
JSON
fi

npm i --silent

# Vale Basis-Setup
if [ ! -f .vale.ini ]; then
  cat > .vale.ini <<'INI'
StylesPath = .vale/styles
MinAlertLevel = suggestion
Packages = Google, proselint

[*.{md,mdx}]
BasedOnStyles = Vale, Google, proselint
BlockIgnores = (?s)```.*?``` # Codeblöcke ignorieren
INI
fi

mkdir -p .vale/styles

# EditorConfig
if [ ! -f .editorconfig ]; then
  cat > .editorconfig <<'EC'
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
max_line_length = off
EC
fi

# CSpell Konfiguration
if [ ! -f .cspell.json ]; then
  cat > .cspell.json <<'JSON'
{
  "$schema": "https://raw.githubusercontent.com/streetsidesoftware/cspell/main/cspell.schema.json",
  "version": "0.2",
  "language": "de,en",
  "ignorePaths": ["node_modules", ".git", ".devcontainer", ".github"],
  "words": [
    "Weltgewebe","Garnrolle","Fäden","Unschaerferadius","Unschaerfe",
    "PostGIS","MapLibre","JetStream","ADR","HausKI","wgx","vale"
  ]
}
JSON
fi

# markdownlint Konfiguration (Optional)
if [ ! -f .markdownlint.jsonc ]; then
  cat > .markdownlint.jsonc <<'JSONC'
{
  "default": true,
  "MD013": false, // line length off
  "MD033": false  // inline HTML allowed
}
JSONC
fi

# Gitattributes: Canvas = JSON (Diff!)
if ! grep -q '\*\.canvas' .gitattributes 2>/dev/null; then
  {
    echo "*.canvas linguist-language=JSON"
    echo "*.canvas text eol=lf"
  } >> .gitattributes
fi

# Wartungsscript
mkdir -p scripts
cat > scripts/maintain.sh <<'SH'
#!/usr/bin/env bash
set -Eeuo pipefail
echo "[maintain] Lint Markdown"
npm run lint:md
echo "[maintain] Spellcheck"
npm run lint:spell
echo "[maintain] JSON/.canvas prüfen"
npm run lint:json
echo "[maintain] Vale"
vale --version >/dev/null 2>&1 && vale . || echo "vale optional (nicht installiert?)"
echo "[maintain] OK"
SH
chmod +x scripts/maintain.sh

echo "[setup] done."