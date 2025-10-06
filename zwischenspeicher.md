
---

# 2) `pyproject.toml`: doppelte „dev“-Dependencies bereinigen

**Entscheidung:** Eine _einzige_ Quelle der Wahrheit.  
Ich schlage vor, **PEP 621-konform** zu bleiben und die `dev`-Tools unter  
`[project.optional-dependencies]` zu führen. Das ist standard-kompatibel (auch ohne uv) und funktioniert mit `pip/uv` gleichermaßen:

- Installation mit uv: `uv sync --extra dev`
    
- Installation mit pip: `pip install .[dev]`
    

Dafür entfernen wir die redundanten uv-`dependency-groups`. (Falls ihr später mehrere, klar getrennte Gruppen braucht, kann man die wieder einführen — aber **ohne** Duplikate, d. h. die Gruppen referenzieren dann die Extras aus `project.optional-dependencies`.)

**Patch (entfernt `[tool.uv.dependency-groups]` und lässt `project.optional-dependencies.dev` als Kanon):**

```bash
(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'PATCH'
*** Begin Patch
*** Update File: pyproject.toml
@@
-[tool.uv.dependency-groups]
-# Duplikat der dev-Extras – bitte nicht doppelt pflegen.
-# Die Pflege erfolgt künftig ausschließlich unter
-# [project.optional-dependencies]. Siehe Hinweis weiter unten.
-dev = [
-    "ruff>=0.6",
-    "pre-commit>=3.8",
-    "mkdocs>=1.6",
-    "mkdocs-material>=9.5",
-    "mkdocs-minify-plugin>=0.8",
-    "mkdocs-git-revision-date-localized-plugin>=1.3",
-    "pytest>=8.3",
-    "rich>=13.9",
-]
+## Hinweis:
+## Dev-Tools werden nur noch hier unter den PEP 621-konformen Extras gepflegt.
+## Installation:
+##   - uv:  `uv sync --extra dev`
+##   - pip: `pip install .[dev]`
*** End Patch
PATCH
)
```

> Ergebnis: keine doppelte Pflege mehr. uv-Nutzung bleibt 100 % kompatibel (`uv sync --extra dev`).

---

wenn du diese zwei Patches durch hast, sag kurz Bescheid — dann schaue ich im Anschluss noch mal über das Repo, ob sich durch das Mergen irgendwo neue „Follow-ups“ ergeben (z. B. ein kurzer Hinweis in `CONTRIBUTING.md` zu `uv sync --extra dev` und `pre-commit`).