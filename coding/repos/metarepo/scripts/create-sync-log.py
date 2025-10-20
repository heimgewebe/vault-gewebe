#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import getpass
import socket
import subprocess
from pathlib import Path

TEMPLATE_PATH = Path("reports/sync-logs/_TEMPLATE.sync-run.md")
OUTPUT_DIR = Path("reports/sync-logs")


def run_cmd(*args: str) -> str:
    try:
        completed = subprocess.run(args, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    except FileNotFoundError:
        return "n/a"
    except subprocess.CalledProcessError:
        return "n/a"
    lines = completed.stdout.strip().splitlines()
    return lines[0] if lines else "n/a"


def detect_branch() -> str:
    try:
        completed = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    except subprocess.CalledProcessError:
        return "unknown"
    branch = completed.stdout.strip()
    return branch or "unknown"


def build_replacements(args: argparse.Namespace) -> dict[str, str]:
    date_iso = args.date or dt.date.today().isoformat()
    repo_scope = args.repo_scope or "repos.yml"
    replacements: dict[str, str] = {
        "DATE_ISO": date_iso,
        "USER": getpass.getuser(),
        "HOST": socket.gethostname(),
        "REPO_SCOPE": repo_scope,
        "BRANCH_CONTEXT": detect_branch(),
        "GIT_VERSION": run_cmd("git", "--version"),
        "RSYNC_VERSION": run_cmd("rsync", "--version"),
        "GH_VERSION": run_cmd("gh", "--version"),
        "NETWORK_DESC": "unknown — fill in",
        "PROXY_SET": "unknown",
        "PREREQ_STATUS": "TBD",
        "PREREQ_NOTES": "TBD",
        "FLEET_STATUS": "TBD",
        "REPOS_LIST": "TBD",
        "VALIDATION_STATUS": "TBD",
        "MISSING_ITEMS": "TBD",
        "DRY_RUN": "TBD",
        "SYNC_RESULT": "TBD",
        "EXIT_CODE": "TBD",
        "BLOCKERS": "TBD",
        "FOLLOW_UP": "TBD",
    }
    return replacements


def render_template(template: Path, replacements: dict[str, str]) -> str:
    content = template.read_text(encoding="utf-8")
    for key, value in replacements.items():
        placeholder = f"{{{{{key}}}}}"
        content = content.replace(placeholder, value)
    return content


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Instantiate a sync attempt log from the shared template.")
    parser.add_argument("--date", help="ISO date for the log filename and placeholder (default: today)")
    parser.add_argument("--repo-scope", help="Description of the repo selection recorded in the log")
    parser.add_argument("--output", help="Custom output path for the log (default: reports/sync-logs/<date>-sync-run.md)")
    parser.add_argument("--template", default=str(TEMPLATE_PATH), help="Path to the template file")
    parser.add_argument("--force", action="store_true", help="Overwrite the output file if it already exists")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    template_path = Path(args.template)
    if not template_path.exists():
        raise SystemExit(f"Template not found: {template_path}")

    replacements = build_replacements(args)
    content = render_template(template_path, replacements)

    date_iso = replacements["DATE_ISO"]
    default_output = OUTPUT_DIR / f"{date_iso}-sync-run.md"
    output_path = Path(args.output) if args.output else default_output
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if output_path.exists() and not args.force:
        raise SystemExit(f"Refusing to overwrite existing log: {output_path}")

    output_path.write_text(content, encoding="utf-8")
    print(f"Created sync log draft: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
