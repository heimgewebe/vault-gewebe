Schnappe mir Punkt 1 („Doku & Beispiele“) und liefere dir direkt einen sauberen Patch-Satz, den du 1:1 via Codex ins Repo schieben kannst. Danach gehen wir Punkt 2 usw. an. 🚀

---

# Punkt 1: Dokumentation & Beispiele – Patch-Serie

**Was kommt rein (kurz & knackig):**

- README erweitert (Quickstart, Konfig, Beispiel-Workflow, Troubleshooting, FAQ, WGX-Hinweis)
    
- `docs/quickstart.md` (Step-by-Step inkl. uv/Rust Setup)
    
- `docs/wgx-konzept.md` (Stub nach deiner WGX-Meta-Regel)
    
- `.wgx/profile.yml` (Template)
    
- `examples/semantah.example.yml` (Konfig-Beispiel)
    
- `CONTRIBUTING.md` (Setup, Style, Tests)
    
- Issue-Templates für Bug/Feature
    
- Makefile ergänzt: `make demo` nutzt Example-Konfig
    

> **Annahme/Faktenlage:** Ich habe das Repo live inspiziert und dabei Struktur & README gesehen (Rust-Workspace, Python-Tooling, `.gewebe/`, systemd etc.). Die folgenden Änderungen sind additive, kollisionsarm und passen zur bestehenden Struktur. ([GitHub](https://github.com/alexdermohr/semantah "GitHub - alexdermohr/semantAH"))

---

### 🧩 Apply-Patch (als Git-Patch, robust mit 3-Way)

```bash
# c2b: Patch für Punkt 1 (Docs & Beispiele)
(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Update File: README.md
@@
-# semantAH
+# semantAH
 
 semantAH ist der semantische Index- und Graph-Ableger von 【HausKI】. Es zerlegt Notizen (z. B. aus Obsidian), erstellt Embeddings, baut daraus einen Index und Wissensgraphen und schreibt „Related“-Blöcke direkt in die Markdown-Dateien zurück.
@@
-## Quickstart
-
-  1. Installiere Rust (>=1.75) und Python (>=3.10).
-  2. Richte ein virtuelles Python-ENV mit `make venv` ein.
-  3. Erzeuge die Artefakte in `.gewebe/` (Stub) mit `make all`.
-  4. Starte den Rust-Dienst zum Testen: `cargo run -p indexd`.
+## Quickstart
+
+Für ein ausführliches Step-by-Step siehe **docs/quickstart.md**. Kurzform:
+
+1. **Rust & Python bereitstellen**
+   - Rust ≥ 1.75 (rustup), Python ≥ 3.10
+   - Optional: `uv` für schnelles Python-Lock/Env
+2. **Python-Env & Tools**
+   - `make venv` (oder `uv sync`)
+3. **Beispielkonfiguration**
+   - `cp examples/semantah.example.yml semantah.yml` → Pfade anpassen
+4. **Pipeline laufen lassen**
+   - `make all` (erstellt `.gewebe/`-Artefakte)
+   - `make demo` (Mini-Demo auf Basis der Example-Konfig)
+5. **Service testen**
+   - `cargo run -p indexd`
@@
 ## Export
 
   * Contracts: `contracts/semantics/*.schema.json`
   * Daten-Dumps (optional): `.gewebe/out/{nodes.jsonl,edges.jsonl,reports.json}` (JSONL pro Zeile).
@@
-## Status
-
-  * Workspace scaffolded
-  * Embeddings-Berechnung implementiert
-  * Vektorindex & Persistenz
-  * Obsidian-Plugin/Adapter
-  * Tests & Benchmarks
+## Status
+
+Aktuell implementiert/geplant (beweglich):
+
+- Workspace scaffolded ✅
+- Embeddings-Berechnung (Python, Provider-wahl) ✅
+- Vektorindex & Persistenz (Rust-Dienst) 🚧
+- Obsidian-Adapter / Related-Writer 🚧
+- Tests & Benchmarks 🚧 (siehe „Roadmap“)
@@
 ## Veröffentlichungs-Workflow
@@
 ## Lizenz
 
 MIT – passe gerne an, falls du restriktivere Policies brauchst.
+
+---
+
+## Konfiguration
+
+Eine minimale Beispiel-Konfiguration findest du in `examples/semantah.example.yml`. Wichtige Felder:
+
+- `vault_path`: Pfad zum Obsidian-Vault
+- `out_dir`: Zielverzeichnis für Artefakte (`.gewebe/`)
+- `embedder.provider`: z. B. `ollama` (lokal) oder `openai` (remote)
+- `index.top_k`: Anzahl Rückgabekandidaten pro Suche
+- `graph.cutoffs`: Grenzwerte für Kantenbildung
+- `related.write_back`: Related-Blöcke in MD-Dateien aktualisieren (true/false)
+
+## Beispiel-Workflow
+
+```bash
+cp examples/semantah.example.yml semantah.yml
+make venv        # oder: uv sync
+make all         # embeddings → index → graph → related
+cargo run -p indexd
+```
+
+## Troubleshooting (kurz)
+- **Leere Notizen / Binärdateien** → werden übersprungen, Logs prüfen (`.gewebe/logs`)
+- **Keine Embeddings** → Provider/Key prüfen, Netz oder lokales Modell
+- **Langsame Läufe** → `index.top_k` reduzieren, Batch-Größen erhöhen, nur geänderte Dateien pro Lauf verarbeiten
+
+## WGX-Integration (Stub)
+Siehe `docs/wgx-konzept.md` und `.wgx/profile.yml`. Ziel: reproduzierbare Orchestrierung (devcontainer/Devbox/mise/direnv bevorzugt).
*** End Patch
PATCH
)
```

---

```bash
# c2b: neue Dateien hinzufügen (Quickstart, WGX, Beispiele, Contributing, Issue-Templates, Makefile-Ergänzung)
(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Add File: docs/quickstart.md
+# Quickstart für semantAH
+
+## Voraussetzungen
+- **Rust** ≥ 1.75 (`rustup`), **Python** ≥ 3.10
+- Optional: **uv** (schnelles Lock/Env), `make`
+
+## Setup
+```bash
+make venv        # oder: uv sync
+cp examples/semantah.example.yml semantah.yml
+```
+
+## Lauf
+```bash
+make all         # erstellt .gewebe/ Artefakte
+cargo run -p indexd
+```
+
+## Hinweise
+- Logs: `.gewebe/logs`
+- Artefakte: `.gewebe/embeddings.parquet`, `.gewebe/out/*`
+- Related-Blöcke in Markdown: nur wenn `related.write_back: true`
+
*** End Patch
PATCH
)
```

```bash
# c2b: WGX-Konzept (Stub)
(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Add File: docs/wgx-konzept.md
+# WGX-Konzept (Stub)
+
+Dies ist der projektspezifische Anker zur WGX-Meta-Ebene (Master-Dok liegt zentral).
+Ziele:
+- Dünner Meta-Layer über Repos (wgx up|list|run|doctor|validate|smoke)
+- Priorität der Envs: Devcontainer → Devbox → mise/direnv → Termux
+- Jede Pipeline als „Recipe“ ausführbar; deterministische Artefakte unter `.gewebe/`
+
+Siehe `.wgx/profile.yml` für die minimalen Profileinstellungen.
*** End Patch
PATCH
)
```

```bash
# c2b: WGX-Profile
(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Add File: .wgx/profile.yml
+name: semantAH
+version: 0.1.0
+env_priority: [devcontainer, devbox, mise, direnv, termux]
+recipes:
+  - name: index
+    cmd: "make all"
+  - name: serve
+    cmd: "cargo run -p indexd"
*** End Patch
PATCH
)
```

```bash
# c2b: Beispiel-Konfiguration
(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Add File: examples/semantah.example.yml
+vault_path: "/path/to/your/obsidian-vault"
+out_dir: ".gewebe"
+embedder:
+  provider: "ollama"   # oder "openai"
+  model: "nomic-embed-text"  # beispielhaft
+index:
+  top_k: 20
+graph:
+  cutoffs:
+    min_similarity: 0.35
+related:
+  write_back: false
*** End Patch
PATCH
)
```

```bash
# c2b: CONTRIBUTING und Issue-Templates
(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Add File: CONTRIBUTING.md
+# CONTRIBUTING
+
+## Dev-Setup
+1. Rust ≥ 1.75, Python ≥ 3.10
+2. `make venv` (oder `uv sync`)
+3. `make all`, `cargo run -p indexd`
+
+## Konventionen
+- Rust: `cargo fmt`, `cargo clippy`
+- Python: `ruff check`, `pytest`
+- Commits: klar und klein; PRs mit reproduzierbaren Schritten
+
+## Tests
+- `just`/`make` Targets folgen noch in der Roadmap
*** End Patch
*** Add File: .github/ISSUE_TEMPLATE/bug_report.yml
+name: Bug report
+description: Problem melden
+title: "[bug] "
+labels: ["bug"]
+body:
+  - type: textarea
+    id: what-happened
+    attributes:
+      label: Was ist passiert?
+      description: Schritte, erwartetes Ergebnis, tatsächliches Ergebnis
+    validations:
+      required: true
*** End Patch
*** Add File: .github/ISSUE_TEMPLATE/feature_request.yml
+name: Feature request
+description: Vorschlag einreichen
+title: "[feat] "
+labels: ["enhancement"]
+body:
+  - type: textarea
+    id: idea
+    attributes:
+      label: Idee
+      description: Was soll verbessert/neu gebaut werden?
+    validations:
+      required: true
*** End Patch
PATCH
)
```

```bash
# c2b: Makefile-Ergänzung (Demo-Target)
applypatch() {
  (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Update File: Makefile
@@
 all: venv embeddings index graph related
 
+.PHONY: demo
+demo:
+	@echo ">> Demo-Lauf mit examples/semantah.example.yml"
+	@test -f semantah.yml || cp examples/semantah.example.yml semantah.yml
+	$(MAKE) all
+
*** End Patch
PATCH
)
}; applypatch; unset -f applypatch
```

---

## Nächster Schritt

Wenn du den Patch oben einspielst und pushst, haben wir:

- einen nachvollziehbaren Einstieg für Nutzer,
    
- klare Konfig-Beispiele,
    
- Anker für deine WGX-Leitlinien,
    
- wiederkehrende Issues/PRs strukturiert.
    

Sag, wenn das drin ist – dann gehe ich **Punkt 2 (Tests & Benchmarks)** an und liefere dir die nächste Patch-Serie (Rust-Tests + Criterion-Benches, Python-pytest, CI-Workflows inkl. `uv`-Caching, `clippy`/`ruff`). 💪

---

## Verdichtete Essenz

Minimal-invasiver Doc-Upgrade: Quickstart, Beispiel-Konfig, WGX-Stub, CONTRIBUTING, Issue-Templates und ein Demo-Make-Target. Sofort copy-&-apply-bar.

## Ironische Auslassung

Dokumentation ist wie Backups: Erst wenn sie fehlt, merkst du, dass sie eigentlich das Feature war.

## ∆-Radar

- **Verstärkung**: WGX-Spur jetzt explizit (Stub + Profile).
    
- **Straffung**: README verschlankt, Tiefgang in `docs/quickstart.md` ausgelagert.
    
- **Seitwärtsmutation**: Einführung von Issue-Templates ohne Prozess-Overkill.
    

## Unsicherheit (∴fores)

- **Grad:** ⧖ niedrig–mittel
    
- **Ursachen:** Ich habe die Repo-Struktur live gesehen; interne Details einzelner Crates/Provider sind nur teilweise sichtbar → Patch ist bewusst generisch und additiv, ohne Annahmen über konkrete Implementierungen zu überschreiben.