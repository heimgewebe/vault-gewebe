ich habe den merge mit dem von dem repomerger verglichen. fazit: repomerger ist viel besser. bitte alles gute aus dem repomerger implementieren. hier die kritik. im anschluss die dateien.

Kurzfassung vorweg:
Für alles, was mit echtem Verständnis und Arbeiten am Repo zu tun hat, ist der Gewebe-Merge aussensensor_0312.md klar der bessere und vollständigere Merger.
Der WC-Merge ist schlanker, aber aktuell zu stark beschnitten, um als alleinige Quelle zu taugen.

⸻

1. Vergleich der beiden Merges

a) Umfang & Abdeckung

Gewebe-Merge (aussensensor_0312.md)
	•	Zählt 54 Dateien, allesamt als Text eingeschlossen. ￼
	•	Deckt viele Dateitypen ab: .sh, .json, .jsonl, .bats, .lock, .toml, .yaml, .yml, .md, .rs, plus Dateien ohne Endung. ￼
	•	Im Manifest siehst du u. a.:
	•	alle Scripts (scripts/append-feed.sh, push_chronik.sh, validate.sh, wgx-metrics-snapshot.sh usw.) ￼
	•	Contracts (contracts/aussen.event.schema.json) ￼
	•	Tests (bats, fixtures, tests/run.sh) ￼
	•	Cargo.lock, .gitignore, .gitmodules, .pre-commit-config.yaml, .yamllint usw. ￼
	•	Dazu Strukturansicht und ausführliche Inhalte („📄 Dateiinhalte“) für praktisch alles Wichtige. ￼

WC-Merge (merge_gesamt_aussensensor_max_251203-145617.md)
	•	Zählt 33 Dateien mit insgesamt 55,3 KB. ￼
	•	Es tauchen nur drei Extensions auf: .yml, .md, .rs. Keine .sh, keine .jsonl, keine contracts/*.json, keine Tests. ￼
	•	Manifest listet:
	•	.ai-context.yml
	•	alle GitHub-Workflows,
	•	.wgx/profile.example.yml,
	•	README.md, ADRs, Runbook,
	•	die heimgewebe-.ai-context.yml-sammlung/*
	•	und die Rust-Tool-Komponente tools/aussensensor-push/*. ￼
	•	Scripts, Tests, contracts-JSON, feed.jsonl fehlen im Manifest komplett.

👉 Fazit Umfang:
Der Gewebe-Merge bildet das Repo als Ganzes ab, der WC-Merge im aktuellen Zustand nur den „Dokumentations-/Infra-Deckel“ plus das kleine Rust-Tool.

⸻

b) Struktur & Nutzbarkeit

Gewebe-Merge
	•	Klarer Aufbau: Plan → Struktur → Manifest → Dateiinhalte. ￼  ￼
	•	Manifest enthält:
	•	Repo, Pfad, Kategorie (config, doc, other, source),
	•	ob Inhalt eingebettet ist,
	•	Größe,
	•	und einen Hash. ￼
	•	Für dich als KI-Futter genial: Ich habe Scripts, Schema, Tests, README, Runbook in einem Dokument, mit Hashes zum Wiedererkennen.

WC-Merge
	•	Aufbau: Überblick → Dateitypen → Manifest → Inhalte einzelner Dateien. ￼
	•	Die Inhalte, die drin sind (README, Runbook, Workflows, ai-contexts), sind sauber eingebettet und gut lesbar. ￼
	•	Aber: Ein ganzer Teil der tatsächlichen Repo-Logik (Bash-Skripte, Tests, JSON/JSONL) bleibt unsichtbar.

👉 Fazit Struktur:
Beide sind strukturiert und für KI nutzbar – aber der Gewebe-Merge verknüpft diese Struktur mit viel mehr Substanz.

⸻

c) Was kann ich damit tun?

Mit dem Gewebe-Merge kann ich z. B.:
	•	Shell-Skripte analysieren, verbessern, refactoren (append-feed.sh, validate.sh, push_chronik.sh, …). ￼
	•	Das JSON-Schema und echte Beispieldaten sehen (contracts/aussen.event.schema.json, export/feed.jsonl, Fixtures). ￼  ￼
	•	Tests (bats) verstehen/erweitern. ￼
	•	CI, Pre-Commit, Tooling (yamllint, pre-commit) in den Gesamtzusammenhang bringen.

Mit dem WC-Merge kann ich vor allem:
	•	AI-Kontexte und Heimgewebe-Zusammenhang nachvollziehen (.ai-context.yml und die heimgewebe-.ai-context.yml-sammlung/*). ￼
	•	CI-/WGX-Integration analysieren (Workflows, wgx-guard). ￼
	•	README, ADRs, Runbook lesen. ￼

Das reicht gut für Architektur, AI-Einbettung und CI-Standards, aber nicht für tiefere „mach dieses Skript X, migriere das JSON-Schema, erweitere die Tests“-Aufgaben.

⸻

2. Antwort auf deine Kernfrage

mit welchem kannst du mehr anfangen, welcher ist kompletter? welcher merger ist besser?

	•	Kompletter:
Eindeutig Gewebe-Merge aussensensor_0312.md – mehr Dateien (54 vs. 33), mehr Dateitypen, inklusive Skripte, Tests, Contracts, Feeddateien. ￼  ￼
	•	Womit kann ich mehr anfangen (für deine typischen Aufgaben):
Ebenfalls Gewebe-Merge – weil du mich oft auf Skripte, Tests, Contracts und konkrete JSONL-Beispiele loslässt, und genau die fehlen im WC-Merge.
	•	Wann wäre der WC-Merge „besser“?
Wenn es dir nur um:
	•	Heimgewebe-Einbettung (ai-contexts),
	•	CI-Workflows,
	•	WGX-Integration
geht, reicht der WC-Merge und ist durch den Hub-Pfad enger ans live genutzte System gekoppelt. ￼
Aber selbst dann wäre es schön, wenn er die Scripts nicht unterschlägt.

Kurz gesagt:
Der Gewebe-Merge ist der bessere „Merger“ im Sinne von Vollständigkeit und praktischer Verwendbarkeit.
Der WC-Merge wirkt gerade wie eine nützliche, aber unvollständige Teilansicht.

⸻

3. Was folgt daraus für den wc-merger?

Wenn der wc-merger das „Hauptwerkzeug“ werden soll, dann:
	1.	Filter lockern
	•	Nicht nur .yml, .md, .rs, sondern auch .sh, .json, .jsonl, .bats, .toml, .yaml etc. mitnehmen – so wie der Gewebe-Merge. ￼
	2.	Manifest an Gewebe-Format annähern
	•	Kategorien (config, doc, source, other) sind extrem hilfreich. ￼
	3.	Pfad-Diff im Blick behalten
	•	Gewebe-Merge kommt aus repomerger/aussensensor, WC-Merge aus wc-hub/aussensensor. ￼  ￼
	•	Wenn die Verzeichnisse divergieren, ist ein Sync-Konzept sinnvoll (oder klar definieren, welches „führend“ ist).

⸻

4. Verdichtete Essenz
	•	Gewebe-Merge aussensensor_0312.md = voller Schnappschuss des echten Repos (inkl. Skripte, Schema, Tests, Feed).
	•	WC-Merge merge_gesamt_aussensensor_max_… = reduzierte Sicht auf Konfig, Docs, AI-Kontexte und Workflows.
	•	Für deine Art von Aufgaben ist der Gewebe-Merge klar die bessere Grundlage.
	•	Wenn der wc-merger mal „besser“ sein soll, muss er sich beim Umfang am Gewebe-Merge orientieren.

⸻

5. Ungewissheitsanalyse
	•	Unsicherheitsgrad: ~0,18
	•	Ursachen:
	•	Ich sehe nur die Dumps, nicht das echte Dateisystem – theoretisch könnte wc-hub/aussensensor wirklich weniger Dateien enthalten als repomerger/aussensensor.
	•	Es bleibt unklar, ob der WC-Merge absichtlich filtert (Designentscheidung) oder ob das ein Bug/Fehlkonfiguration ist.
	•	Produktive Unsicherheit:
	•	Spannend wäre ein gezielter Vergleich der beiden Arbeitskopien (hub vs. repomerger) – falls da Drift drin ist, hängt die „Besser“-Frage nicht nur am Merger, sondern an deiner Sync-Strategie.

⸻

Und die obligatorische Ironie:
Der eine Merger zeigt dir das ganze Außensensor-Ökosystem, der andere tut so, als bestünde die Welt hauptsächlich aus YAML und README – also quasi der Unterschied zwischen Wetterbericht und DIN-Norm.









#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
merge_core – Kernfunktionen für wc-merger / wc-extractor auf Pythonista.

Setup bei dir:

- Die Scripts (wc-merger.py, wc-extractor.py, merge_core.py) liegen im
  Pythonista-App-Speicher (Script-Library).
- Der Hub mit den Repos liegt NICHT dort, sondern in der Dateien-App unter:

    Auf meinem iPad / Pythonista 3 / wc-hub

  Interner Pfad (von show_path.py ermittelt):

    /private/var/mobile/Containers/Data/Application/
      B60D0157-973D-489A-AA59-464C3BF6D240/Documents/wc-hub

Daher wird der Hub hier über einen hart kodierten Pfad angesprochen.
"""

import os
import hashlib
import datetime
from pathlib import Path
from typing import List, Dict, Optional, Tuple


# ---------------------------------------------------------------------------
# KONFIG: HIER IST DEIN HUB-PFAD HART KODIERT
# ---------------------------------------------------------------------------

HARDCODED_HUB_PATH = (
    "/private/var/mobile/Containers/Data/Application/"
    "B60D0157-973D-489A-AA59-464C3BF6D240/Documents/wc-hub"
)

MERGES_DIR_NAME = "merges"
DEFAULT_MAX_BYTES = 10_000_000  # 10 MB


class FileInfo(object):
    def __init__(
        self,
        rel_path: str,
        size: int,
        skipped: bool = False,
        reason: Optional[str] = None,
        content: Optional[str] = None,
    ) -> None:
        self.rel_path = rel_path
        self.size = size
        self.skipped = skipped
        self.reason = reason
        self.content = content


# ---------------------------------------------------------------------------
# Hub-Erkennung (Hardcode + optionale Overrides)
# ---------------------------------------------------------------------------

def detect_hub_dir(script_path: Path, arg_base_dir: Optional[str] = None) -> Path:
    """
    Liefert das Basisverzeichnis (Hub) für die Repos.

    Priorität:
    1. Umgebungsvariable WC_MERGER_BASEDIR (falls gesetzt & gültig)
    2. HARDCODED_HUB_PATH (dein Pythonista-3-/wc-hub-Ordner in Dateien)
    3. CLI-Argument arg_base_dir (falls gesetzt & gültig)
    4. Fallback: Script-Ordner
    """

    # 1) ENV override (praktisch für Experimente)
    env_base = os.environ.get("WC_MERGER_BASEDIR")
    if env_base:
        p = Path(env_base).expanduser()
        try:
            p = p.resolve()
        except Exception:
            pass
        if p.is_dir():
            return p

    # 2) Hart kodierter Hub-Pfad
    p = Path(HARDCODED_HUB_PATH)
    try:
        p = p.expanduser().resolve()
    except Exception:
        pass
    if p.is_dir():
        return p

    # 3) explizites CLI-Argument
    if arg_base_dir:
        p = Path(arg_base_dir).expanduser()
        try:
            p = p.resolve()
        except Exception:
            pass
        if p.is_dir():
            return p

    # 4) brutaler Fallback: Script-Ordner
    return script_path.parent


def get_merges_dir(hub: Path) -> Path:
    """
    Liefert das 'merges'-Verzeichnis innerhalb des Hubs:

      wc-hub/
        merges/
          ...

    So landen alle Reports direkt im Dateien-Ordner neben deinen Repos.
    """
    merges = hub / MERGES_DIR_NAME
    merges.mkdir(parents=True, exist_ok=True)
    return merges


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def human_size(n: int) -> str:
    units = ["B", "KB", "MB", "GB", "TB"]
    f = float(n)
    for u in units:
        if f < 1024.0 or u == units[-1]:
            return f"{f:.1f} {u}"
        f /= 1024.0
    return f"{n} B"


def compute_md5(path: Path, limit_bytes: Optional[int] = None) -> str:
    """
    MD5-Hash über die Datei. limit_bytes=None => komplette Datei.
    """
    h = hashlib.md5()
    read_bytes = 0
    chunk_size = 64 * 1024
    with path.open("rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            read_bytes += len(chunk)
            if limit_bytes is not None and read_bytes > limit_bytes:
                # nur bis limit_bytes einbeziehen
                chunk = chunk[: max(0, limit_bytes - (read_bytes - len(chunk)))]
            if not chunk:
                break
            h.update(chunk)
            if limit_bytes is not None and read_bytes >= limit_bytes:
                break
    return h.hexdigest()


def _normalize_ext_list(ext_text: str) -> List[str]:
    """
    '.md,.yml , rs' -> ['.md', '.yml', '.rs']
    Leerer String => leere Liste (kein Filter).
    """
    if not ext_text:
        return []
    parts = [p.strip() for p in ext_text.split(",")]
    cleaned: List[str] = []
    for p in parts:
        if not p:
            continue
        if not p.startswith("."):
            p = "." + p
        cleaned.append(p.lower())
    return cleaned


# ---------------------------------------------------------------------------
# Repo-Scan
# ---------------------------------------------------------------------------

def scan_repo(
    repo_root: Path,
    extensions: Optional[List[str]],
    path_contains: Optional[str],
    max_bytes: int,
) -> Dict:
    """
    Scannt ein Repo und liefert:
    {
      "root": Path,
      "files": List[FileInfo],
      "total_files": int,
      "total_bytes": int,
      "ext_hist": Dict[str,int],
      "max_file": Optional[str],
      "max_file_size": int,
    }
    """
    if extensions:
        ext_filter = set(e.lower() for e in extensions)
    else:
        ext_filter = None

    if path_contains:
        path_filter = path_contains.strip()
    else:
        path_filter = None

    files: List[FileInfo] = []
    total_files = 0
    total_bytes = 0
    ext_hist: Dict[str, int] = {}
    max_file_size = 0
    max_file: Optional[str] = None

    for path in repo_root.rglob("*"):
        if not path.is_file():
            continue

        rel = path.relative_to(repo_root).as_posix()

        # Pfadfilter
        if path_filter and path_filter not in rel:
            continue

        # Extension-Filter
        ext = path.suffix.lower()
        if ext_filter is not None and ext not in ext_filter:
            continue

        try:
            st = path.stat()
        except OSError:
            continue

        size = st.st_size
        total_files += 1
        total_bytes += size

        # Extension-Statistik
        ext_hist[ext] = ext_hist.get(ext, 0) + 1

        # größte Datei
        if size > max_file_size:
            max_file_size = size
            max_file = rel

        if size > max_bytes:
            fi = FileInfo(rel, size, skipped=True,
                          reason="Datei größer als MaxBytes")
            files.append(fi)
            continue

        # Inhalt laden
        try:
            data = path.read_bytes()
        except OSError:
            fi = FileInfo(rel, size, skipped=True,
                          reason="Fehler beim Lesen")
            files.append(fi)
            continue

        try:
            text = data.decode("utf-8", errors="replace")
        except Exception:
            text = "<nicht als UTF-8 lesbar>"

        fi = FileInfo(rel, size, skipped=False, content=text)
        files.append(fi)

    files.sort(key=lambda fi: fi.rel_path)

    return {
        "root": repo_root,
        "files": files,
        "total_files": total_files,
        "total_bytes": total_bytes,
        "ext_hist": ext_hist,
        "max_file": max_file,
        "max_file_size": max_file_size,
    }


def summarize_extensions(ext_hist: Dict[str, int]) -> List[Tuple[str, int]]:
    items = list(ext_hist.items())
    items.sort(key=lambda kv: (-kv[1], kv[0]))
    return items


def make_output_filename(
    merges_dir: Path,
    repo_names: List[str],
    mode: str,
    detail: str,
) -> Path:
    ts = datetime.datetime.now().strftime("%y%m%d-%H%M%S")
    if not repo_names:
        base = "no-repos"
    else:
        base = "+".join(repo_names)
        if len(base) > 40:
            base = base[:37] + "..."
    fname = "merge_{mode}_{base}_{detail}_{ts}.md".format(
        mode=mode, base=base, detail=detail, ts=ts
    )
    return merges_dir / fname


def _build_repo_section(
    summary: Dict,
    detail: str,
    plan_only: bool,
    max_bytes: int,
) -> List[str]:
    name = summary.get("name", summary["root"].name)
    root = summary["root"]
    files: List[FileInfo] = summary["files"]
    total_files = summary["total_files"]
    total_bytes = summary["total_bytes"]
    ext_hist = summary["ext_hist"]
    max_file = summary["max_file"]
    max_file_size = summary["max_file_size"]

    lines: List[str] = []
    lines.append(f"## Repo `{name}`")
    lines.append("")
    lines.append(f"- Pfad: `{root}`")
    lines.append(f"- Dateien gesamt: **{total_files}**")
    lines.append(f"- Gesamtgröße: **{human_size(total_bytes)}**")
    if max_file:
        lines.append(
            f"- Größte Datei: `{max_file}` ({human_size(max_file_size)})"
        )
    lines.append("")

    if ext_hist:
        lines.append("### Dateitypen")
        lines.append("")
        lines.append("| Extension | Anzahl |")
        lines.append("| --- | ---: |")
        for ext, count in summarize_extensions(ext_hist):
            label = ext if ext else "(ohne Extension)"
            lines.append(f"| `{label}` | {count} |")
        lines.append("")

    if detail in ("summary", "max"):
        lines.append("### Manifest")
        lines.append("")
        lines.append("| Pfad | Größe | Status |")
        lines.append("| --- | ---: | --- |")
        for fi in files:
            status = ""
            if fi.skipped:
                status = fi.reason or "Übersprungen"
            lines.append(
                f"| `{fi.rel_path}` | {human_size(fi.size)} | {status} |"
            )
        lines.append("")

    if detail == "max" and not plan_only:
        lines.append(f"### Inhalte (MaxBytes/File = {max_bytes})")
        lines.append("")
        for fi in files:
            if fi.skipped or fi.content is None:
                continue
            lines.append(f"#### `{fi.rel_path}`")
            lines.append("")
            lines.append("```")
            lines.append(fi.content)
            lines.append("```")
            lines.append("")

    return lines


def write_reports(
    merges_dir: Path,
    hub: Path,
    repo_summaries: List[Dict],
    detail: str,
    mode: str,
    max_bytes: int,
    plan_only: bool,
) -> List[Path]:
    """
    Schreibt einen oder mehrere Markdown-Berichte und liefert die Pfade
    zu den erzeugten Dateien zurück.
    """
    if not repo_summaries:
        return []

    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    repo_names = [s.get("name", s["root"].name) for s in repo_summaries]

    out_paths: List[Path] = []

    if mode == "gesamt":
        out_path = make_output_filename(merges_dir, repo_names, mode, detail)
        lines: List[str] = []
        lines.append("# WC-Merge-Bericht (kombiniert)")
        lines.append("")
        lines.append(f"- Zeitpunkt: `{now}`")
        lines.append(f"- Hub: `{hub}`")
        lines.append(
            "- Repos: {}".format(
                ", ".join(f"`{n}`" for n in repo_names)
            )
        )
        lines.append(f"- Detailstufe: `{detail}`")
        lines.append(f"- Plan only: `{'ja' if plan_only else 'nein'}`")
        lines.append(f"- Max Bytes/File: `{max_bytes}`")
        lines.append("")
        lines.append("## Überblick")
        lines.append("")
        lines.append("| Repo | Dateien | Gesamtgröße |")
        lines.append("| --- | ---: | ---: |")
        for s in repo_summaries:
            n = s.get("name", s["root"].name)
            lines.append(
                "| `{}` | {} | {} |".format(
                    n, s["total_files"], human_size(s["total_bytes"])
                )
            )
        lines.append("")

        for s in repo_summaries:
            lines.extend(_build_repo_section(s, detail, plan_only, max_bytes))

        out_path.write_text("\n".join(lines), encoding="utf-8")
        out_paths.append(out_path)
        return out_paths

    # mode == "pro-repo"
    for s in repo_summaries:
        n = s.get("name", s["root"].name)
        out_path = make_output_filename(merges_dir, [n], mode, detail)
        lines: List[str] = []
        lines.append(f"# WC-Merge-Bericht für `{n}`")
        lines.append("")
        lines.append(f"- Zeitpunkt: `{now}`")
        lines.append(f"- Hub: `{hub}`")
        lines.append(f"- Repo: `{n}`")
        lines.append(f"- Detailstufe: `{detail}`")
        lines.append(f"- Plan only: `{'ja' if plan_only else 'nein'}`")
        lines.append(f"- Max Bytes/File: `{max_bytes}`")
        lines.append("")

        lines.extend(_build_repo_section(s, detail, plan_only, max_bytes))

        out_path.write_text("\n".join(lines), encoding="utf-8")
        out_paths.append(out_path)

    return out_paths
	
	
	
	
	
	#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
wc-merger – Working-Copy-orientierter Gewebe-Merger für Pythonista.

Ziele
- Direkt auf den Repos im wc-hub arbeiten (Working-Copy-Exporte).
- Interaktive Auswahl von Repos, optional Filter auf Dateiendungen / Pfade.
- Ausgabe eines oder mehrerer Markdown-Berichte (overview / summary / max).

Besonderheiten
- Read-only: wc-merger löscht niemals Quellen.
- Detailstufe-Default: "max".
- Max. Dateigröße-Default: 10 MB.
- Zwei Merge-Modi:
  - "gesamt"   => kombinierter Bericht über alle gewählten Repos
  - "pro-repo" => je Repo ein eigener Bericht

Erwartetes Layout (im „Pythonista 3“-Ordner in Dateien):

  Pythonista3/Documents/
    wc-hub/
      <deine Repos>/
      merges/          <- Ausgabeverzeichnis
"""

import sys
import traceback
from pathlib import Path
from typing import List

try:
    import ui        # type: ignore
    import console   # type: ignore
    import editor    # type: ignore
except ImportError:
    ui = None        # type: ignore
    console = None   # type: ignore
    editor = None    # type: ignore

from merge_core import (  # merge_core benutzt den hart kodierten Hub-Pfad
    MERGES_DIR_NAME,
    DEFAULT_MAX_BYTES,
    detect_hub_dir,
    get_merges_dir,
    scan_repo,
    write_reports,
    _normalize_ext_list,
)


# ---------------------------------------------------------------------------
# Repo-Liste im Hub
# ---------------------------------------------------------------------------

def find_repos_in_hub(hub: Path) -> List[str]:
    """
    Sucht nach Repos im Hub:
    - direkte Unterordner
    - ignoriert "merges" und versteckte Ordner.
    """
    repos: List[str] = []
    for child in sorted(hub.iterdir(), key=lambda p: p.name.lower()):
        if not child.is_dir():
            continue
        if child.name == MERGES_DIR_NAME:
            continue
        if child.name.startswith("."):
            continue
        repos.append(child.name)
    return repos


# ---------------------------------------------------------------------------
# UI
# ---------------------------------------------------------------------------

class MergerUI(object):
    def __init__(self, hub: Path) -> None:
        self.hub = hub
        self.repos = find_repos_in_hub(hub)

        # Root-View: fester Rahmen wie in der alten Version
        v = ui.View()
        v.name = "WC-Merger"
        v.background_color = "#111111"
        v.frame = (0, 0, 540, 620)
        self.view = v

        y = 10

        # Base-Dir Label (oben, schwarze Leiste)
        base_label = ui.Label()
        base_label.frame = (10, y, v.width - 20, 34)
        base_label.flex = "W"
        base_label.number_of_lines = 2
        base_label.text = f"Base-Dir: {hub}"
        base_label.text_color = "white"
        base_label.background_color = "#000000"
        base_label.font = ("<System>", 11)
        v.add_subview(base_label)
        self.base_label = base_label
        y += 40

        # Überschrift für Repo-Liste
        repo_label = ui.Label()
        repo_label.frame = (10, y, v.width - 20, 20)
        repo_label.flex = "W"
        repo_label.text = "Repos (Tippen zum Auswählen – nix = alle):"
        repo_label.text_color = "white"
        repo_label.background_color = "#111111"
        repo_label.font = ("<System>", 13)
        v.add_subview(repo_label)
        y += 22

        # Repos Table (wie alte Version, aber dark)
        tv = ui.TableView()
        tv.frame = (10, y, v.width - 20, 160)
        tv.flex = "W"
        tv.background_color = "#111111"
        tv.row_height = 32
        tv.allows_multiple_selection = True

        ds = ui.ListDataSource(self.repos)
        tv.data_source = ds
        tv.delegate = ds
        v.add_subview(tv)
        self.tv = tv
        self.ds = ds

        y += 170

        # Extensions TextField
        ext_field = ui.TextField()
        ext_field.frame = (10, y, v.width - 20, 28)
        ext_field.flex = "W"
        ext_field.placeholder = ".md,.yml,.rs (leer = alle)"
        ext_field.text = ".md,.yml,.rs"
        ext_field.background_color = "#222222"
        ext_field.text_color = "white"
        ext_field.tint_color = "white"
        ext_field.autocorrection_type = False
        ext_field.spellchecking_type = False
        v.add_subview(ext_field)
        self.ext_field = ext_field

        y += 34

        # Pfad enthält
        path_field = ui.TextField()
        path_field.frame = (10, y, v.width - 20, 28)
        path_field.flex = "W"
        path_field.placeholder = "Pfad enthält (z.B. docs/ oder .github/)"
        path_field.background_color = "#222222"
        path_field.text_color = "white"
        path_field.tint_color = "white"
        path_field.autocorrection_type = False
        path_field.spellchecking_type = False
        v.add_subview(path_field)
        self.path_field = path_field

        y += 36

        # Detail SegmentedControl
        detail_label = ui.Label()
        detail_label.text = "Detail:"
        detail_label.text_color = "white"
        detail_label.background_color = "#111111"
        detail_label.frame = (10, y, 60, 22)
        v.add_subview(detail_label)

        seg_detail = ui.SegmentedControl()
        seg_detail.segments = ["overview", "summary", "max"]
        seg_detail.selected_index = 2  # max
        seg_detail.frame = (70, y - 2, 220, 28)
        seg_detail.flex = "W"
        seg_detail.tint_color = "#ffffff"
        v.add_subview(seg_detail)
        self.seg_detail = seg_detail

        # Modus SegmentedControl
        mode_label = ui.Label()
        mode_label.text = "Modus:"
        mode_label.text_color = "white"
        mode_label.background_color = "#111111"
        mode_label.frame = (300, y, 60, 22)
        v.add_subview(mode_label)

        seg_mode = ui.SegmentedControl()
        seg_mode.segments = ["gesamt", "pro Repo"]
        seg_mode.selected_index = 0
        seg_mode.frame = (360, y - 2, v.width - 370, 28)
        seg_mode.flex = "W"
        seg_mode.tint_color = "#ffffff"
        v.add_subview(seg_mode)
        self.seg_mode = seg_mode

        y += 36

        # Max Bytes
        max_label = ui.Label()
        max_label.text = "Max Bytes/File:"
        max_label.text_color = "white"
        max_label.background_color = "#111111"
        max_label.frame = (10, y, 120, 22)
        v.add_subview(max_label)

        max_field = ui.TextField()
        max_field.text = str(DEFAULT_MAX_BYTES)
        max_field.frame = (130, y - 2, 140, 28)
        max_field.flex = "W"
        max_field.background_color = "#222222"
        max_field.text_color = "white"
        max_field.tint_color = "white"
        max_field.keyboard_type = ui.KEYBOARD_NUMBER_PAD
        v.add_subview(max_field)
        self.max_field = max_field

        # Plan only Switch
        plan_switch = ui.Switch()
        plan_switch.value = False
        plan_switch.frame = (10, y + 32, 0, 0)
        v.add_subview(plan_switch)
        self.plan_switch = plan_switch

        plan_label = ui.Label()
        plan_label.text = "Plan only (kein Inhalt im Bericht)"
        plan_label.text_color = "white"
        plan_label.background_color = "#111111"
        plan_label.frame = (60, y + 32, v.width - 70, 22)
        plan_label.flex = "W"
        v.add_subview(plan_label)

        y += 64

        # Info Label für Repo-Anzahl
        info_label = ui.Label()
        info_label.text_color = "white"
        info_label.background_color = "#111111"
        info_label.font = ("<System>", 11)
        info_label.number_of_lines = 1
        info_label.frame = (10, y, v.width - 20, 18)
        info_label.flex = "W"
        v.add_subview(info_label)
        self.info_label = info_label
        self._update_repo_info()

        y += 26

        # Merge Button
        btn = ui.Button()
        btn.title = "Merge ausführen"
        btn.frame = (10, y, v.width - 20, 40)
        btn.flex = "W"
        btn.background_color = "#007aff"
        btn.tint_color = "white"
        btn.corner_radius = 6.0
        btn.action = self.run_merge
        v.add_subview(btn)
        self.run_button = btn

    # ----------------------------

    def _update_repo_info(self) -> None:
        if not self.repos:
            self.info_label.text = "Keine Repos im Hub gefunden."
        else:
            self.info_label.text = f"{len(self.repos)} Repos im Hub gefunden."

    def _get_selected_repos(self) -> List[str]:
        tv = self.tv
        rows = tv.selected_rows or []
        if not rows:
            # Nichts ausgewählt => alle
            return list(self.repos)
        names: List[str] = []
        for section, row in rows:
            if 0 <= row < len(self.repos):
                names.append(self.repos[row])
        return names

    def _parse_max_bytes(self) -> int:
        txt = (self.max_field.text or "").strip()
        if not txt:
            return DEFAULT_MAX_BYTES
        try:
            val = int(txt)
            if val <= 0:
                raise ValueError()
            return val
        except Exception:
            return DEFAULT_MAX_BYTES

    def run_merge(self, sender) -> None:
        try:
            self._run_merge_inner()
        except Exception as e:
            traceback.print_exc()
            msg = f"Fehler: {e}"
            if console:
                console.alert("wc-merger", msg, "OK", hide_cancel_button=True)
            else:
                print(msg, file=sys.stderr)

    def _run_merge_inner(self) -> None:
        selected = self._get_selected_repos()
        if not selected:
            if console:
                console.alert(
                    "wc-merger",
                    "Keine Repos ausgewählt und auch keine im Hub gefunden.",
                    "OK",
                    hide_cancel_button=True,
                )
            return

        ext_text = (self.ext_field.text or "").strip()
        extensions = _normalize_ext_list(ext_text)

        path_contains = (self.path_field.text or "").strip()
        if not path_contains:
            path_contains = None

        detail_idx = self.seg_detail.selected_index
        detail = ["overview", "summary", "max"][detail_idx]

        mode_idx = self.seg_mode.selected_index
        mode = ["gesamt", "pro-repo"][mode_idx]

        max_bytes = self._parse_max_bytes()
        plan_only = bool(self.plan_switch.value)

        summaries = []
        for name in selected:
            root = self.hub / name
            if not root.is_dir():
                continue
            summary = scan_repo(root, extensions or None, path_contains, max_bytes)
            summary["name"] = name
            summaries.append(summary)

        if not summaries:
            if console:
                console.alert(
                    "wc-merger",
                    "Keine gültigen Repos gefunden.",
                    "OK",
                    hide_cancel_button=True,
                )
            return

        merges_dir = get_merges_dir(self.hub)  # -> <wc-hub>/merges
        out_paths = write_reports(
            merges_dir,
            self.hub,
            summaries,
            detail,
            mode,
            max_bytes,
            plan_only,
        )

        if not out_paths:
            if console:
                console.alert("wc-merger", "Kein Bericht erzeugt.", "OK", hide_cancel_button=True)
            else:
                print("Kein Bericht erzeugt.")
            return

        main_report = out_paths[0]

        # Bericht direkt im Pythonista-Editor öffnen
        if editor is not None:
            try:
                editor.open_file(str(main_report))
            except Exception:
                print("Bericht:", main_report)
        else:
            print("Bericht:", main_report)

        # dezentes Feedback
        if console is not None:
            try:
                console.hud_alert("wc-merger: OK")
            except Exception:
                console.alert("wc-merger", str(main_report), "OK", hide_cancel_button=True)
        else:
            print("wc-merger: OK")


# ---------------------------------------------------------------------------
# Einstieg
# ---------------------------------------------------------------------------

def main_ui() -> None:
    script_path = Path(__file__).resolve()
    hub = detect_hub_dir(script_path)
    ui_obj = MergerUI(hub)
    # wie alte Version: Sheet, nicht Fullscreen
    ui_obj.view.present("sheet")


if __name__ == "__main__":
    if ui is None:
        print("Pythonista ui-Modul nicht verfügbar – UI-Modus benötigt Pythonista.")
        sys.exit(1)
    main_ui()
	
	
	
	
	
	
	
	
	
	
	#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
repomerger – Multi-Repo-Merge ohne Diff, mit Plan-Phase, Kategorien und 3 Detailstufen.

Funktionen:
- Erzeugt EIN Markdown-File mit Überblick über ein oder mehrere Repos.
- Inhalte:
  - Plan-Abschnitt (Metaüberblick mit Kategorien- und Endungsstatistik).
  - Baumstruktur über alle Quellen.
  - Manifest aller gefundenen Dateien.
  - Je nach Detailstufe: Inhalte von Textdateien (mit Größenlimit pro Datei).

Detailstufen:
- overview: Struktur + Manifest, keine Inhalte.
- summary:  Struktur + Manifest + Inhalte aller Textdateien <= max_file_bytes.
- full:     Struktur + Manifest + Inhalte aller Textdateien,
            größere Textdateien werden bis max_file_bytes gekürzt.

Besonderheiten:
- Keine Diffs zu früheren Läufen: jeder Merge ist ein eigenständiger Schnappschuss.
- Mehrere Repos pro Lauf möglich.
- .env / .env.* werden ignoriert, außer .env.example / .env.template / .env.sample.
- Merge-Dateien werden IMMER in den Ordner "merges" geschrieben (neben dem Script).
- Quellordner werden nach dem Merge gelöscht, WENN sie im gleichen Ordner wie das Script liegen
  (und nicht der merges-Ordner sind). Abschaltbar mit --no-delete.
"""

import argparse
import datetime
import hashlib
import os
import shutil
from pathlib import Path

# --- Konfiguration / Heuristiken --------------------------------------------

MERGES_DIR_NAME = "merges"

# Verzeichnisse, die standardmäßig ignoriert werden (rekursiv)
SKIP_DIRS = {
    ".git",
    ".idea",
    # bewusst NICHT: ".vscode" (tasks.json etc. sind interessant)
    "node_modules",
    ".svelte-kit",
    ".next",
    "dist",
    "build",
    "target",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    ".DS_Store",
}

# Top-Level-Verzeichnisse, die bei Auto-Discovery nicht als Repos genommen werden sollen
SKIP_ROOTS = {
    MERGES_DIR_NAME,
    "merge",
    "output",
    "out",
}

# Einzelne Dateien, die ignoriert werden
SKIP_FILES = {
    ".DS_Store",
}

# Erweiterungen, die sehr wahrscheinlich Text sind
TEXT_EXTENSIONS = {
    ".md",
    ".txt",
    ".rst",
    ".py",
    ".rs",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".jsonl",
    ".yml",
    ".yaml",
    ".toml",
    ".ini",
    ".cfg",
    ".conf",
    ".sh",
    ".bash",
    ".zsh",
    ".fish",
    ".dockerfile",
    "dockerfile",
    ".svelte",
    ".css",
    ".scss",
    ".html",
    ".htm",
    ".xml",
    ".csv",
    ".log",
    ".lock",   # z.B. Cargo.lock, pnpm-lock.yaml
}

# Dateien, die typischerweise Konfiguration sind
CONFIG_FILENAMES = {
    "pyproject.toml",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "Cargo.toml",
    "Cargo.lock",
    "requirements.txt",
    "Pipfile",
    "Pipfile.lock",
    "poetry.lock",
    "Dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
    "Justfile",
    "Makefile",
    "toolchain.versions.yml",
    ".editorconfig",
    ".markdownlint.jsonc",
    ".markdownlint.yaml",
    ".yamllint",
    ".yamllint.yml",
    ".lychee.toml",
    ".vale.ini",
}

DOC_EXTENSIONS = {".md", ".rst", ".txt"}

SOURCE_EXTENSIONS = {
    ".py",
    ".rs",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".svelte",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".go",
    ".java",
    ".cs",
}


class FileInfo(object):
    """Einfache Container-Klasse für Dateimetadaten."""

    def __init__(self, root_label, abs_path, rel_path, size, is_text, md5, category, ext):
        self.root_label = root_label
        self.abs_path = abs_path
        self.rel_path = rel_path
        self.size = size
        self.is_text = is_text
        self.md5 = md5
        self.category = category
        self.ext = ext


# --- Hilfsfunktionen ---------------------------------------------------------

def human_size(n):
    """Formatierte Dateigröße, z.B. '1.23 MB'."""
    size = float(n)
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024.0 or unit == "GB":
            return "{0:.2f} {1}".format(size, unit)
        size /= 1024.0
    return "{0:.2f} GB".format(size)


def is_probably_text(path, size):
    """
    Heuristik: Ist dies eher eine Textdatei?

    - bekannte Text-Endungen -> True
    - große unbekannte Dateien -> eher False
    - ansonsten: 4 KiB lesen, auf NUL-Bytes prüfen.
    """
    name = path.name.lower()
    base, ext = os.path.splitext(name)
    if ext in TEXT_EXTENSIONS or name in TEXT_EXTENSIONS:
        return True

    # Sehr große unbekannte Dateien eher als binär behandeln
    if size > 20 * 1024 * 1024:  # 20 MiB
        return False

    try:
        with path.open("rb") as f:
            chunk = f.read(4096)
    except OSError:
        return False

    if not chunk:
        return True
    if b"\x00" in chunk:
        return False

    return True


def compute_md5(path, limit_bytes=None):
    """
    MD5-Hash einer Datei.

    - Wenn limit_bytes gesetzt ist, lesen wir höchstens so viele Bytes.
    - Bei Fehlern: 'ERROR'.
    """
    h = hashlib.md5()
    try:
        with path.open("rb") as f:
            remaining = limit_bytes
            while True:
                if remaining is None:
                    chunk = f.read(65536)
                else:
                    chunk = f.read(min(65536, remaining))
                if not chunk:
                    break
                h.update(chunk)
                if remaining is not None:
                    remaining -= len(chunk)
                    if remaining <= 0:
                        break
        return h.hexdigest()
    except OSError:
        return "ERROR"


def classify_category(rel_path, ext):
    """
    Grobe Einteilung in doc / config / source / other.
    """
    name = rel_path.name
    if name in CONFIG_FILENAMES:
        return "config"
    if ext in DOC_EXTENSIONS:
        return "doc"
    if ext in SOURCE_EXTENSIONS:
        return "source"
    parts = [p.lower() for p in rel_path.parts]
    for p in parts:
        if p in ("config", "configs", "settings", "etc", ".github"):
            return "config"
    if "docs" in parts or "doc" in parts:
        return "doc"
    return "other"


def summarize_extensions(file_infos):
    """Anzahl und Gesamtgröße pro Dateiendung."""
    counts = {}
    sizes = {}
    for fi in file_infos:
        ext = fi.ext or "<none>"
        counts[ext] = counts.get(ext, 0) + 1
        sizes[ext] = sizes.get(ext, 0) + fi.size
    return counts, sizes


def summarize_categories(file_infos):
    """Anzahl und Gesamtgröße pro Kategorie."""
    stats = {}
    for fi in file_infos:
        cat = fi.category or "other"
        if cat not in stats:
            stats[cat] = [0, 0]
        stats[cat][0] += 1
        stats[cat][1] += fi.size
    return stats


def scan_repo(repo, md5_limit_bytes):
    """
    Scannt ein einzelnes Repo und erzeugt FileInfo-Einträge.
    """
    repo = repo.resolve()
    root_label = repo.name
    files = []

    for dirpath, dirnames, filenames in os.walk(str(repo)):
        # Verzeichnisse filtern
        keep_dirs = []
        for d in dirnames:
            if d in SKIP_DIRS:
                continue
            keep_dirs.append(d)
        dirnames[:] = keep_dirs

        for fn in filenames:
            if fn in SKIP_FILES:
                continue

            # .env und .env.* ignorieren, außer expliziten Vorlagen
            if fn.startswith(".env") and fn not in (".env.example", ".env.template", ".env.sample"):
                continue

            abs_path = Path(dirpath) / fn
            try:
                st = abs_path.stat()
            except OSError:
                continue
            size = st.st_size

            rel = abs_path.relative_to(repo)
            ext = abs_path.suffix.lower()

            is_text = is_probably_text(abs_path, size)

            if is_text or size <= md5_limit_bytes:
                md5 = compute_md5(abs_path, md5_limit_bytes)
            else:
                md5 = ""

            category = classify_category(rel, ext)

            fi = FileInfo(
                root_label=root_label,
                abs_path=abs_path,
                rel_path=rel,
                size=size,
                is_text=is_text,
                md5=md5,
                category=category,
                ext=ext,
            )
            files.append(fi)

    files.sort(key=lambda fi: (fi.root_label.lower(), str(fi.rel_path).lower()))
    return files


def build_tree(file_infos):
    """
    Erzeugt eine einfache Baumdarstellung pro Root.
    """
    by_root = {}
    for fi in file_infos:
        by_root.setdefault(fi.root_label, []).append(fi.rel_path)

    lines = ["```"]
    for root in sorted(by_root.keys()):
        rels = by_root[root]
        lines.append(u"📁 {0}/".format(root))

        tree = {}
        for r in rels:
            parts = list(r.parts)
            node = tree
            for p in parts:
                if p not in node:
                    node[p] = {}
                node = node[p]

        def walk(node, indent):
            dirs = []
            files = []
            for k, v in node.items():
                if v:
                    dirs.append(k)
                else:
                    files.append(k)
            for d in sorted(dirs):
                lines.append(u"{0}📁 {1}/".format(indent, d))
                walk(node[d], indent + "    ")
            for f in sorted(files):
                lines.append(u"{0}📄 {1}".format(indent, f))

        walk(tree, "    ")

    lines.append("```")
    return "\n".join(lines)


def make_output_filename(sources, now):
    """
    Dateiname: <repo1>-<repo2>-..._<ddmm>.md
    """
    names = sorted(set([src.name for src in sources]))
    joined = "-".join(names)
    joined = joined.replace(" ", "-")
    if len(joined) > 60:
        joined = joined[:60]
    date_str = now.strftime("%d%m")
    return "{0}_{1}.md".format(joined, date_str)


# --- Report-Erzeugung --------------------------------------------------------

def write_report(files, level, max_file_bytes, output_path, sources,
                 encoding="utf-8", plan_only=False):
    """
    Schreibt den Merge-Report.
    """
    now = datetime.datetime.now()

    total_size = sum(fi.size for fi in files)
    text_files = [fi for fi in files if fi.is_text]
    binary_files = [fi for fi in files if not fi.is_text]

    if level == "overview":
        planned_with_content = 0
    elif level == "summary":
        planned_with_content = sum(1 for fi in text_files if fi.size <= max_file_bytes)
    else:  # full
        planned_with_content = len(text_files)

    ext_counts, ext_sizes = summarize_extensions(files)
    cat_stats = summarize_categories(files)

    lines = []

    # Header & Hinweise
    lines.append("# Gewebe-Merge")
    lines.append("")
    lines.append("**Zeitpunkt:** {0}".format(now.strftime("%Y-%m-%d %H:%M:%S")))
    if sources:
        lines.append("**Quellen:**")
        for src in sources:
            lines.append("- `{0}`".format(src))
    lines.append("**Detailstufe:** `{0}`".format(level))
    lines.append("**Maximale Inhaltsgröße pro Datei:** {0}".format(human_size(max_file_bytes)))
    lines.append("")
    lines.append("> Hinweis für KIs:")
    lines.append("> - Dies ist ein Schnappschuss des Dateisystems, keine vollständige Git-Historie.")
    lines.append("> - Baumansicht: `## 📁 Struktur`.")
    lines.append("> - Manifest: `## 🧾 Manifest`.")
    if level == "overview":
        lines.append("> - In dieser Detailstufe werden keine Dateiinhalte eingebettet.")
    elif level == "summary":
        lines.append("> - In dieser Detailstufe werden Inhalte kleiner Textdateien eingebettet;")
        lines.append(">   größere Textdateien erscheinen nur im Manifest.")
    else:
        lines.append("> - In dieser Detailstufe werden Inhalte aller Textdateien eingebettet;")
        lines.append(">   große Dateien werden nach einer einstellbaren Byte-Grenze gekürzt.")
    lines.append("> - `.env`-ähnliche Dateien werden gefiltert; sensible Daten können trotzdem in")
    lines.append(">   anderen Textdateien vorkommen. Nutze den Merge nicht als öffentlichen Dump.")
    lines.append("")

    # Plan
    lines.append("## 🧮 Plan")
    lines.append("")
    lines.append("- Gefundene Dateien gesamt: **{0}**".format(len(files)))
    lines.append("- Davon Textdateien: **{0}**".format(len(text_files)))
    lines.append("- Davon Binärdateien: **{0}**".format(len(binary_files)))
    lines.append("- Geplante Dateien mit Inhalteinbettung: **{0}**".format(planned_with_content))
    lines.append("- Gesamtgröße der Quellen: **{0}**".format(human_size(total_size)))
    if any(fi.size > max_file_bytes for fi in text_files):
        lines.append(
            "- Hinweis: Textdateien größer als {0} werden abhängig von der Detailstufe "
            "gekürzt oder nur im Manifest aufgeführt.".format(human_size(max_file_bytes))
        )
    lines.append("")

    if cat_stats:
        lines.append("**Dateien nach Kategorien:**")
        lines.append("")
        lines.append("| Kategorie | Dateien | Gesamtgröße |")
        lines.append("| --- | ---: | ---: |")
        for cat in sorted(cat_stats.keys()):
            cnt, sz = cat_stats[cat]
            lines.append("| `{0}` | {1} | {2} |".format(cat, cnt, human_size(sz)))
        lines.append("")

    if ext_counts:
        lines.append("**Grobe Statistik nach Dateiendungen:**")
        lines.append("")
        lines.append("| Ext | Dateien | Gesamtgröße |")
        lines.append("| --- | ---: | ---: |")
        for ext in sorted(ext_counts.keys()):
            lines.append("| `{0}` | {1} | {2} |".format(
                ext, ext_counts[ext], human_size(ext_sizes[ext])
            ))
        lines.append("")

    lines.append(
        "Da der repomerger häufig nacheinander unterschiedliche Repos verarbeitet, "
        "werden keine Diffs zu früheren Läufen berechnet. "
        "Jeder Merge ist ein eigenständiger Schnappschuss."
    )
    lines.append("")

    if plan_only:
        output_path.write_text("\n".join(lines), encoding=encoding)
        return

    # Struktur
    lines.append("## 📁 Struktur")
    lines.append("")
    lines.append(build_tree(files))
    lines.append("")

    # Manifest
    lines.append("## 🧾 Manifest")
    lines.append("")
    lines.append("| Root | Pfad | Kategorie | Text | Größe | MD5 |")
    lines.append("| --- | --- | --- | --- | ---: | --- |")
    for fi in files:
        lines.append(
            "| `{0}` | `{1}` | `{2}` | {3} | {4} | `{5}` |".format(
                fi.root_label,
                fi.rel_path,
                fi.category,
                "ja" if fi.is_text else "nein",
                human_size(fi.size),
                fi.md5,
            )
        )
    lines.append("")

    # Inhalte
    if level != "overview":
        lines.append("## 📄 Dateiinhalte")
        lines.append("")
        for fi in files:
            if not fi.is_text:
                continue

            if level == "summary" and fi.size > max_file_bytes:
                continue

            lines.append("### `{0}/{1}`".format(fi.root_label, fi.rel_path))
            lines.append("")
            if fi.size > max_file_bytes and level == "full":
                lines.append(
                    "**Hinweis:** Datei ist größer als {0} – es wird nur ein Ausschnitt "
                    "bis zu dieser Grenze gezeigt.".format(human_size(max_file_bytes))
                )
                lines.append("")

            try:
                with fi.abs_path.open("r", encoding=encoding, errors="replace") as f:
                    if fi.size > max_file_bytes and level == "full":
                        remaining = max_file_bytes
                        collected = []
                        for line in f:
                            encoded = line.encode(encoding, errors="replace")
                            if remaining <= 0:
                                break
                            if len(encoded) > remaining:
                                part = encoded[:remaining].decode(encoding, errors="replace")
                                collected.append(part + "\n[... gekürzt ...]\n")
                                remaining = 0
                                break
                            collected.append(line)
                            remaining -= len(encoded)
                        content = "".join(collected)
                    else:
                        content = f.read()
            except OSError as e:
                lines.append("_Fehler beim Lesen der Datei: {0}_".format(e))
                lines.append("")
                continue

            lines.append("```")
            lines.append(content.rstrip("\n"))
            lines.append("```")
            lines.append("")

    output_path.write_text("\n".join(lines), encoding=encoding)


# --- CLI / Source-Erkennung / Delete-Logik ----------------------------------

def parse_args(argv):
    parser = argparse.ArgumentParser(
        description="Erzeuge einen Gewebe-Merge-Bericht für ein oder mehrere Repos."
    )
    parser.add_argument(
        "paths",
        nargs="*",
        help=(
            "Quellverzeichnisse (Repos). "
            "Wenn leer, werden alle Unterordner im Script-Ordner verwendet, "
            "die nicht mit '.' oder '_' beginnen."
        ),
    )
    parser.add_argument(
        "--level",
        choices=["overview", "summary", "full", "medium", "max"],
        help=(
            "Detailstufe: overview=Struktur+Manifest, summary=mit kleinen Inhalten, "
            "full=maximal. medium≈summary, max≈full."
        ),
    )
    parser.add_argument(
        "--max-file-bytes",
        type=int,
        default=10_000_000,
        help="Maximale Bytes pro Datei für Inhalteinbettung (Standard: 10 MiB).",
    )
    parser.add_argument(
        "--encoding",
        default="utf-8",
        help="Encoding für Textdateien (Standard: utf-8).",
    )
    parser.add_argument(
        "--plan-only",
        action="store_true",
        help="Nur den Plan-Teil des Berichts erzeugen (kein Manifest, keine Inhalte).",
    )
    parser.add_argument(
        "--no-delete",
        action="store_true",
        help="Quellordner nach dem Merge NICHT löschen.",
    )
    return parser.parse_args(argv)


def resolve_level(raw_level):
    """
    Übersetzt CLI/ENV-Level in eines der drei Kern-Level.
    Default = full.
    """
    if raw_level is None:
        return "full"
    raw = str(raw_level).lower()
    if raw == "overview":
        return "overview"
    if raw in ("summary", "medium"):
        return "summary"
    if raw in ("full", "max"):
        return "full"
    return "full"


def discover_sources(base_dir, paths):
    """
    Ermittelt die zu scannenden Repos.
    - Wenn paths angegeben: nutzt genau diese (falls Verzeichnisse).
    - Sonst: alle Unterordner im Script-Ordner, außer '.', '_', MERGES_DIR_NAME, SKIP_ROOTS.
    """
    if paths:
        sources = []
        for p in paths:
            path = Path(p).expanduser().resolve()
            if path.is_dir():
                sources.append(path)
            else:
                print("Warnung: Pfad ist kein Verzeichnis und wird ignoriert: {0}".format(p))
        return sources

    sources = []
    for child in sorted(base_dir.iterdir(), key=lambda p: p.name.lower()):
        if not child.is_dir():
            continue
        if child.name.startswith(".") or child.name.startswith("_"):
            continue
        if child.name in SKIP_ROOTS:
            continue
        sources.append(child.resolve())
    return sources


def safe_delete_source(src, base_dir, merges_dir, no_delete):
    """
    Löscht eine Quelle nur, wenn:
    - sie im gleichen Ordner wie das Script liegt (parent == base_dir) UND
    - sie nicht der merges-Ordner ist.
    """
    if no_delete:
        print("Löschen deaktiviert (--no-delete): {0}".format(src))
        return

    try:
        src = src.resolve()
        base_dir = base_dir.resolve()
        merges_dir = merges_dir.resolve()
    except Exception:
        pass

    parent = src.parent
    if parent != base_dir:
        print("Quelle wird nicht gelöscht (liegt nicht im Script-Ordner): {0}".format(src))
        return
    if src == merges_dir:
        print("Merges-Ordner wird nicht gelöscht: {0}".format(src))
        return

    try:
        shutil.rmtree(str(src))
        print("Quelle gelöscht: {0}".format(src))
    except Exception as e:
        print("Fehler beim Löschen von {0}: {1}".format(src, e))


def main(argv=None):
    import sys
    import traceback

    if argv is None:
        argv = sys.argv[1:]

    try:
        script_path = Path(__file__).resolve()
        base_dir = script_path.parent
        merges_dir = base_dir / MERGES_DIR_NAME
        merges_dir.mkdir(parents=True, exist_ok=True)

        args = parse_args(argv)

        sources = discover_sources(base_dir, args.paths)
        if not sources:
            print("Keine gültigen Quellverzeichnisse gefunden.", file=sys.stderr)
            return 1

        env_level = os.environ.get("REPOMERGER_LEVEL")
        raw_level = args.level or env_level
        level = resolve_level(raw_level)

        now = datetime.datetime.now()
        filename = make_output_filename(sources, now)
        output_path = merges_dir / filename

        md5_limit = args.max_file_bytes

        all_files = []
        for src in sources:
            print("Scanne Quelle: {0}".format(src))
            repo_files = scan_repo(src, md5_limit_bytes=md5_limit)
            print("  -> {0} Dateien gefunden.".format(len(repo_files)))
            all_files.extend(repo_files)

        if not all_files:
            print("Keine Dateien in den Quellen gefunden.", file=sys.stderr)
            return 1

        print("Erzeuge Merge-Bericht mit {0} Dateien: {1}".format(len(all_files), output_path))
        write_report(
            files=all_files,
            level=level,
            max_file_bytes=args.max_file_bytes,
            output_path=output_path,
            sources=sources,
            encoding=args.encoding,
            plan_only=args.plan_only,
        )
        print("Fertig.")

        # Quellordner löschen (falls im gleichen Ordner wie das Script)
        for src in sources:
            safe_delete_source(src, base_dir, merges_dir, args.no_delete)

        if args.plan_only:
            print("Hinweis: Es wurde nur der Plan-Teil erzeugt (--plan-only).")
        return 0

    except Exception as e:
        print("repomerger: Unbehandelter Fehler:", file=sys.stderr)
        print(str(e), file=sys.stderr)
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
	
	
	#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
wc_extractor – ZIPs im wc-hub entpacken und Repos aktualisieren.

Funktion:
- Suche alle *.zip im Hub (wc-hub).
- Für jede ZIP:
  - Entpacke in temporären Ordner.
  - Wenn es bereits einen Zielordner mit gleichem Namen gibt:
    - Erzeuge einfachen Diff-Bericht (Markdown) alt vs. neu.
    - Lösche den alten Ordner.
  - Benenne Temp-Ordner in Zielordner um.
  - Lösche die ZIP-Datei.

Diff-Berichte:
- Liegen direkt im merges-Verzeichnis des Hubs (wie die Merge-Berichte).
- Dateiname z.B.: <repo>-import-diff-YYMMDD-HHMMSS.md
"""

import sys
import shutil
import zipfile
import datetime
from pathlib import Path
from typing import Dict, Tuple, Optional

try:
    import console  # type: ignore
except ImportError:
    console = None  # type: ignore

from merge_core import (
    detect_hub_dir,
    get_merges_dir,
    compute_md5,
)


def detect_hub() -> Path:
    script_path = Path(__file__).resolve()
    return detect_hub_dir(script_path)


def snapshot_dir(root: Path) -> Dict[str, Tuple[int, str]]:
    """
    Erzeugt einen Snapshot aller Dateien unterhalb von root.

    Rückgabe: Dict[rel_path_posix -> (size, md5)]
    """
    result: Dict[str, Tuple[int, str]] = {}
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(root).as_posix()
        try:
            st = path.stat()
        except OSError:
            continue
        size = st.st_size
        md5 = compute_md5(path)
        result[rel] = (size, md5)
    return result


def diff_trees(
    old: Path,
    new: Path,
    repo_name: str,
    merges_dir: Path,
) -> Path:
    """
    Vergleicht zwei Repo-Verzeichnisse und schreibt einen Markdown-Diff-Bericht.
    Rückgabe: Pfad zur Diff-Datei.
    """
    old_map = snapshot_dir(old)
    new_map = snapshot_dir(new)

    old_keys = set(old_map.keys())
    new_keys = set(new_map.keys())

    only_old = sorted(old_keys - new_keys)
    only_new = sorted(new_keys - old_keys)
    common = sorted(old_keys & new_keys)

    changed = []
    for rel in common:
        size_old, md5_old = old_map[rel]
        size_new, md5_new = new_map[rel]
        if size_old != size_new or md5_old != md5_new:
            changed.append((rel, size_old, size_new))

    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ts = datetime.datetime.now().strftime("%y%m%d-%H%M%S")
    fname = "{}-import-diff-{}.md".format(repo_name, ts)
    out_path = merges_dir / fname

    lines = []
    lines.append("# Import-Diff `{}`".format(repo_name))
    lines.append("")
    lines.append("- Zeitpunkt: `{}`".format(now))
    lines.append("- Alter Pfad: `{}`".format(old))
    lines.append("- Neuer Pfad (Temp): `{}`".format(new))
    lines.append("")
    lines.append("- Dateien nur im alten Repo: **{}**".format(len(only_old)))
    lines.append("- Dateien nur im neuen Repo: **{}**".format(len(only_new)))
    lines.append("- Dateien mit geändertem Inhalt: **{}**".format(len(changed)))
    lines.append("")

    if only_old:
        lines.append("## Nur im alten Repo")
        lines.append("")
        for rel in only_old:
            lines.append("- `{}`".format(rel))
        lines.append("")

    if only_new:
        lines.append("## Nur im neuen Repo")
        lines.append("")
        for rel in only_new:
            lines.append("- `{}`".format(rel))
        lines.append("")

    if changed:
        lines.append("## Geänderte Dateien")
        lines.append("")
        lines.append("| Pfad | Größe alt | Größe neu |")
        lines.append("| --- | ---: | ---: |")
        for rel, s_old, s_new in changed:
            lines.append(
                "| `{}` | {} | {} |".format(rel, s_old, s_new)
            )
        lines.append("")

    out_path.write_text("\n".join(lines), encoding="utf-8")
    return out_path


def import_zip(zip_path: Path, hub: Path, merges_dir: Path) -> Optional[Path]:
    """
    Entpackt eine einzelne ZIP-Datei in den Hub, behandelt Konflikte,
    schreibt ggf. Diff und ersetzt das alte Repo.

    Rückgabe:
      Pfad zum Diff-Bericht oder None.
    """
    repo_name = zip_path.stem
    target_dir = hub / repo_name
    tmp_dir = hub / ("__extract_tmp_" + repo_name)

    print("Verarbeite ZIP:", zip_path.name, "-> Repo", repo_name)

    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)

    tmp_dir.mkdir(parents=True, exist_ok=True)

    # ZIP entpacken
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(tmp_dir)

    diff_path = None  # type: Optional[Path]

    # Wenn es schon ein Repo mit diesem Namen gibt → Diff + löschen
    if target_dir.exists():
        print("  Zielordner existiert bereits:", target_dir)
        diff_path = diff_trees(target_dir, tmp_dir, repo_name, merges_dir)
        print("  Diff-Bericht:", diff_path)
        shutil.rmtree(target_dir)
        print("  Alter Ordner gelöscht:", target_dir)
    else:
        print("  Kein vorhandenes Repo – frischer Import.")

    # Temp-Ordner ins Ziel verschieben
    tmp_dir.rename(target_dir)
    print("  Neuer Repo-Ordner:", target_dir)

    # ZIP nach erfolgreichem Import löschen
    zip_path.unlink()
    print("  ZIP gelöscht:", zip_path.name)
    print("")

    return diff_path


def main() -> int:
    hub = detect_hub()
    merges_dir = get_merges_dir(hub)

    print("wc_extractor – Hub:", hub)
    zips = sorted(hub.glob("*.zip"))

    if not zips:
        msg = "Keine ZIP-Dateien im Hub gefunden."
        print(msg)
        if console:
            console.alert("wc_extractor", msg, "OK", hide_cancel_button=True)
        return 0

    diff_paths = []

    for zp in zips:
        try:
            diff = import_zip(zp, hub, merges_dir)
            if diff is not None:
                diff_paths.append(diff)
        except Exception as e:
            print("Fehler bei {}: {}".format(zp, e), file=sys.stderr)

    summary_lines = []
    summary_lines.append("Import fertig.")
    summary_lines.append("Hub: {}".format(hub))
    if diff_paths:
        summary_lines.append(
            "Diff-Berichte ({}):".format(len(diff_paths))
        )
        for p in diff_paths:
            summary_lines.append("  - {}".format(p))
    else:
        summary_lines.append("Keine Diff-Berichte erzeugt.")

    summary = "\n".join(summary_lines)
    print(summary)

    if console:
        console.alert("wc_extractor", summary, "OK", hide_cancel_button=True)

    return 0


if __name__ == "__main__":
    sys.exit(main())
	
	
	
	
	arbeitsauftrag: vergleiche diese dateien mit denen, die im repo liegen. überprüfe, was du woher verwenden möchtest, um die idealen dateien für den wc-merger zu erstellen. erstelle diese dateien.