#!/usr/bin/env bash
set -euo pipefail

# macOS Bash 3.2 kompatibel: mapfile optional halten
# Hinweis: Default ist reine *Syntax*-Validierung (kein -e), damit YAML-Roots false/null/0 nicht scheitern.
shopt -s nullglob
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
YQ_PIN="${ROOT_DIR}/scripts/tools/yq-pin.sh"
YQ_DEFAULT="${ROOT_DIR}/tools/bin/yq"

echo "---"
echo "Running local validation..."
echo "---"

echo "🔧 Ensuring yq v4 ist verfügbar..."
"${YQ_PIN}" ensure

if [[ -x "${YQ_DEFAULT}" ]]; then
    YQ_BIN="${YQ_DEFAULT}"
else
    YQ_BIN="$(command -v yq)"
fi

if [[ -z "${YQ_BIN}" ]]; then
    echo "❌ Kein yq-Binary gefunden, obwohl Sicherung lief."
    exit 1
fi

# YQ-Validierungs-Argumente:
# - Standard: ohne -e (nur Parse/Syntax prüfen)
# - Opt-in:   STRICT_YQ_E=1 setzt -e → Ausdruck muss truthy sein (bricht legitime YAMLs mit root=false/null/0)
YQ_ARGS=()
if [[ "${STRICT_YQ_E:-0}" == "1" ]]; then
    YQ_ARGS+=("-e")
fi

echo "🔎 Collecting YAML files..."
if declare -F mapfile >/dev/null 2>&1; then
  mapfile -d '' YAML_FILES < <(
    cd "${ROOT_DIR}" && \
    git ls-files -z --cached --others --exclude-standard -- '*.yml' '*.yaml'
  )
else
  YAML_FILES=()
  while IFS= read -r -d '' f; do
    YAML_FILES+=("$f")
  done < <(
    cd "${ROOT_DIR}" && \
    git ls-files -z --cached --others --exclude-standard -- '*.yml' '*.yaml'
  )
fi

if ((${#YAML_FILES[@]} == 0)); then
    echo "ℹ️ Keine YAML-Dateien gefunden."
else
    echo "🔎 Validating YAML files with ${YQ_BIN}..."
    for file in "${YAML_FILES[@]}"; do
        echo "Checking ${file}"
        # reine Syntaxprüfung: eval '.' ohne -e; optional -e via STRICT_YQ_E
        if ! "${YQ_BIN}" eval "${YQ_ARGS[@]}" '.' "${ROOT_DIR}/${file}" >/dev/null; then
            echo "❌ YAML validation failed for ${file}"
            exit 1
        fi
    done
    echo "✅ YAML validation successful."
fi

echo "---"

echo "🔎 Listing templates..."
if [[ -d "${ROOT_DIR}/templates" ]]; then
  find "${ROOT_DIR}/templates" -type f -print | sort
else
  echo "ℹ️ 'templates/' nicht vorhanden – überspringe Auflistung."
fi

echo "---"
echo "✅ Local validation finished."
