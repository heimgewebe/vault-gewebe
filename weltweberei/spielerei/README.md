# Weltweberei / Weltgewebe — Initial Repository

Dieses Repository ist der Startpunkt für das Projekt **Weltweberei / Weltgewebe** (mobile-first, Hetzner-first).
**Mandatorische Referenzdokumente:** `docs/inhalt.md` und `docs/zusammenstellung.md`

> ⚠️ Platzhalter-Hinweis: Bitte füge die *verbindlichen Inhalte* aus deinen Dateien **inhalt.md** und **zusammenstellung.md**
> in die Dateien unter `docs/` ein. Alle weiteren Blaupausen (z. B. v15_1+) dienen nur als Orientierung.

## Monorepo-Layout

```
apps/
  api/        # FastAPI-Backend (Events, Knoten, Fäden, Garn; Append-only vorbereitet)
  web/        # SvelteKit-Frontend (MapLibre, Mobile-First, Drawer/Filter)
packages/
  schemas/    # JSON-Schemas für Events, Knoten, Fäden, Garn
docs/
  inhalt.md
  zusammenstellung.md
infra/
  hetzner/    # Terraform-Grundgerüst für Hetzner
  ansible/    # Ansible-Playbooks (Deploy, Rolling Update)
.github/
  workflows/  # CI
```

## Schnellstart (lokal)

Voraussetzungen: Node.js 20+, pnpm 9+, Python 3.11+, uv oder pip, Terraform (optional), Docker (optional).

### Frontend
```
cd apps/web
pnpm install
pnpm dev
```

### Backend
```
cd apps/api
uv venv -p 3.11
uv pip install -r requirements.txt
uv run fastapi dev app/main.py --host 0.0.0.0 --port 8000
```

Dann: `http://localhost:5173` (Frontend) greift auf `http://localhost:8000` (Backend) zu.

## Deploy (Hetzner-first, Platzhalter)
Siehe `infra/hetzner/terraform` und `infra/ansible`. Aktuell sind dort Minimal-Templates hinterlegt.
