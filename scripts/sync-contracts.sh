#!/usr/bin/env bash
set -euo pipefail

# Scripts to sync contracts from sibling repositories
TARGET_DIR="contracts"
mkdir -p "$TARGET_DIR"

SOURCES=(
  "../contracts"
  "../metarepo/contracts"
  "../heimgewebe/contracts"
)

FOUND=0

for src in "${SOURCES[@]}"; do
  if [[ -d "$src" ]]; then
    echo "Syncing contracts from $src..."
    # Copy all schema files
    cp "$src"/*.schema.json "$TARGET_DIR/" 2>/dev/null || true
    FOUND=1
  fi
done

if [[ $FOUND -eq 0 ]]; then
  echo "WARNING: No contracts repository found in sibling directories (${SOURCES[*]})."
  echo "Ensure you have 'contracts' or 'metarepo' checked out nearby."
  # Non-fatal for now, as we might be in an isolated env
  exit 0
fi

echo "Contracts synced to $TARGET_DIR."
ls -l "$TARGET_DIR"/*.schema.json 2>/dev/null || echo "No schemas found."
