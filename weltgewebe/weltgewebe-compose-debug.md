# Weltgewebe – Compose-Debug-Log & Fixes

Datum: 2026-02-08  
Host: heimserver  
Repo: /opt/weltgewebe  

---

## Ausgangslage

Beim Deployment von `weltgewebe` via Docker Compose traten wiederholt scheinbar inkonsistente Fehler auf:

- `Couldn't find env file: /home/alex/.env`
- API-Build schlägt fehl (`cargo build` / `cargo fetch`)
- Caddy startet, restartet oder lässt sich nicht zuverlässig loggen
- Port 80/443 zeitweise „address already in use“

---

## Zentrale Ursache (Root Cause)

Docker Compose interpretiert `--env-file .env` relativ zum aktuellen Working Directory (CWD).

Wird ein Compose-Befehl nicht aus dem Repo-Root (`/opt/weltgewebe`) ausgeführt, sucht Docker die `.env` Datei z. B. unter:

```
/home/alex/.env
```

→ existiert dort nicht → Compose bricht ab.

---

## Deterministischer Fix (Guarded)

```bash
set -euo pipefail

REPO=/opt/weltgewebe
ENV_FILE="$REPO/.env"
COMPOSE_FILE="$REPO/infra/compose/compose.prod.yml"

cd "$REPO"

test -f "$ENV_FILE" || {
  echo "FATAL: .env fehlt unter $ENV_FILE"
  exit 1
}

docker compose   --env-file "$ENV_FILE"   -f "$COMPOSE_FILE"   up -d
```

---

## Alias-Empfehlung

```bash
wg-compose() {
  local REPO=/opt/weltgewebe
  docker compose     --env-file "$REPO/.env"     -f "$REPO/infra/compose/compose.prod.yml"     "$@"
}
```

---

## Status

- db: healthy  
- api: healthy  
- caddy: running  

---

## Verdichtete Essenz

Docker Compose ist streng, nicht schlau.  
Wer nicht im Repo-Root steht, existiert für `.env` nicht.

---

## Ungewissheitsanalyse

Unsicherheitsgrad: 0.05  
Ursache: relative Pfadangabe  
Systemisch: ja  
Vermeidbar: ja
