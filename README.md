# vault-gewebe

Personal and shared knowledge vault for the Heimgewebe ecosystem.

## Overview

This repository contains the Obsidian vault used for storing knowledge, documentation, and notes related to the Heimgewebe project and personal life. While the content is primarily private, it interfaces with the Heimgewebe ecosystem through defined contracts.

## Collaboration with Heimgewebe

This vault is configured to collaborate with the Heimgewebe fleet by adhering to shared contracts (JSON Schemas) for its metadata.

### Configuration

The repository is equipped with scripts to ensure compatibility:

- **Contracts Sync**: Fetches the latest JSON schemas from the central `contracts` or `metarepo` repository.
- **Validation**: Checks that markdown files use valid frontmatter according to the schemas.

### Usage (WGX)

If you have `wgx` installed, you can use the following commands:

```bash
# Sync contracts and validate frontmatter
wgx run validate

# Check if .ai-context.yml is valid
wgx run ai-context-check
```

### Manual Usage

You can also run the scripts directly:

```bash
# 1. Sync contracts (requires sibling repos 'contracts' or 'metarepo')
./scripts/sync-contracts.sh

# 2. Validate frontmatter
./scripts/validate-frontmatter.py
```

## AI Context

The `.ai-context.yml` file defines the role of this vault within the ecosystem and its boundaries (e.g., it consumes schemas, produces a semantic index).
