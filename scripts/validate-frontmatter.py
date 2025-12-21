#!/usr/bin/env python3
"""
Validates the frontmatter of markdown files in the vault against JSON schemas in contracts/.
"""
import os
import sys
import glob
import json
import argparse
from pathlib import Path
from typing import Dict, Any, List

try:
    import frontmatter
    import jsonschema
    import yaml
except ImportError as e:
    print(f"ERROR: Missing dependency: {e}")
    print("Run: pip install python-frontmatter jsonschema PyYAML")
    sys.exit(1)

CONTRACTS_DIR = Path("contracts")

def load_schemas() -> Dict[str, Any]:
    schemas = {}
    if not CONTRACTS_DIR.exists():
        print(f"WARNING: {CONTRACTS_DIR} does not exist. Skipping validation.")
        return schemas

    for schema_file in CONTRACTS_DIR.glob("*.schema.json"):
        try:
            with open(schema_file, 'r') as f:
                schema = json.load(f)
                # Map schema ID or filename to schema object
                # Assuming filename convention: type.schema.json matches type in frontmatter?
                # Or we check if frontmatter has a 'type' field matching the schema name.
                name = schema_file.name.replace(".schema.json", "")
                schemas[name] = schema
        except Exception as e:
            print(f"ERROR loading schema {schema_file}: {e}")
    return schemas

def validate_file(filepath: Path, schemas: Dict[str, Any]) -> List[str]:
    errors = []
    try:
        post = frontmatter.load(filepath)
        metadata = post.metadata

        # Determine which schema to apply
        # Strategy 1: 'type' field in frontmatter
        # Strategy 2: specific folders (not implemented here yet)

        doc_type = metadata.get('type')
        if doc_type and doc_type in schemas:
            try:
                jsonschema.validate(instance=metadata, schema=schemas[doc_type])
            except jsonschema.ValidationError as e:
                errors.append(f"Schema validation failed for type '{doc_type}': {e.message}")

        # If no type matches, we currently skip validation
        # You could enforce that all files must have a type, but that might be too strict for a vault.

    except Exception as e:
        errors.append(f"Failed to parse frontmatter: {e}")

    return errors

def main():
    parser = argparse.ArgumentParser(description="Validate vault markdown frontmatter.")
    parser.add_argument("--root", default=".", help="Root directory to scan")
    args = parser.parse_args()

    schemas = load_schemas()
    if not schemas:
        print("No schemas loaded. syncing contracts might be needed.")
        # We don't fail here because maybe there are no contracts yet.
        sys.exit(0)

    print(f"Loaded schemas: {list(schemas.keys())}")

    root_path = Path(args.root)
    # Exclude certain dirs
    excludes = {".git", ".obsidian", ".wgx", "contracts", "scripts", "node_modules"}

    error_count = 0
    file_count = 0

    for root, dirs, files in os.walk(root_path):
        dirs[:] = [d for d in dirs if d not in excludes]

        for file in files:
            if file.endswith(".md"):
                file_count += 1
                filepath = Path(root) / file
                errs = validate_file(filepath, schemas)
                if errs:
                    print(f"FAIL: {filepath}")
                    for e in errs:
                        print(f"  - {e}")
                    error_count += 1

    print(f"\nScanned {file_count} files.")
    if error_count > 0:
        print(f"Found errors in {error_count} files.")
        sys.exit(1)
    else:
        print("All files passed validation.")
        sys.exit(0)

if __name__ == "__main__":
    main()
