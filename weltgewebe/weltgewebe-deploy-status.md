set -euo pipefail
cd /opt/weltgewebe

mkdir -p docs/ops

cat > docs/ops/ops.weltgewebe.deploy.status.md <<'EOF'
# Weltgewebe – Deployment Status & Entscheidungslog
Stand: 2026-02-09  
Host: heimserver  
Pfad: /opt/weltgewebe

---

## 1. Zweck

Diese Datei ist die **Single Source of Truth** für den aktuellen Deployment-Zustand
von *weltgewebe* auf dem Heimserver.

Sie dokumentiert:
- was **funktioniert**
- was **bewusst fehlschlägt**
- warum das so ist
- den **minimalen Fix-Pfad**
- die Definition von **„Deployment erfolgreich“**

Keine Roadmap. Kein Refactor. Nur Realität.

---

## 2. Aktueller Status (Fakten)

### Container
Alle relevanten Container laufen stabil:

- compose-api-1 → Running
- compose-db-1  → Running
- compose-nats-1 → Running

### Ports
- API: Host `8081` → Container `8080`
- DB: `5432/tcp` (intern)
- NATS: `4222/tcp`

Host-Port `8080` ist absichtlich belegt (z. B. code-server).

---

## 3. Health

### Live
`GET /health/live` → **200 OK**

### Ready
`GET /health/ready` → **503**

Payload:
```json
{"checks":{"database":false,"nats":false,"policy":false},"status":"error"}