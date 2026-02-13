# Runbook – Weltgewebe Deploy auf heimserver

Stand: 2026-02-08  
Repo: `/opt/weltgewebe`

## Ziel
Weltgewebe reproduzierbar starten, stoppen, debuggen – ohne implizite Annahmen
über Arbeitsverzeichnis, Shell-Kontext oder Erinnerungsleistung.

---

## Architektur-Überblick
- **db**: Postgres (persistentes Volume)
- **api**: weltgewebe-api (exponiert intern auf :8080)
- **caddy**: Reverse Proxy im Stack (intern)
- **Edge-Ports (80/443)**: werden **genau einmal** terminiert
  (entweder Host-Gateway oder externer Proxy)

---

## Kanonischer Einstiegspunkt (Pflicht)

Alle Operationen laufen über den Wrapper:

```bash
/opt/weltgewebe/scripts/weltgewebe <command>
```

Beispiele:
```bash
/opt/weltgewebe/scripts/weltgewebe doctor
/opt/weltgewebe/scripts/weltgewebe up
/opt/weltgewebe/scripts/weltgewebe logs api
```

**Warum:**  
`docker compose --env-file .env` ist relativ zum CWD eine UX-Falle.
Der Wrapper nutzt absolute Pfade und erzwingt Konsistenz.

---

## Preflight / Diagnose

Vor **jeder** Änderung:

```bash
/opt/weltgewebe/scripts/weltgewebe doctor
```

Der Doctor prüft:
- Docker-Daemon erreichbar
- `.env` vorhanden
- Compose-Konfiguration rendert (`compose config`)
- Aktive Host-Ports (80/443/8080)
- Aktuellen Service-Status (`compose ps`)

---

## Start / Stop / Restart

Start:
```bash
/opt/weltgewebe/scripts/weltgewebe up
```

Stop:
```bash
/opt/weltgewebe/scripts/weltgewebe down
```

Restart (kontrolliert):
```bash
/opt/weltgewebe/scripts/weltgewebe restart
```

---

## Logs & Status

Status:
```bash
/opt/weltgewebe/scripts/weltgewebe ps
```

Logs (alle):
```bash
/opt/weltgewebe/scripts/weltgewebe logs
```

Logs (ein Service):
```bash
/opt/weltgewebe/scripts/weltgewebe logs api
```

---

## Update-Policy

**Keine Auto-Updates.**  
Prinzip: *Erst verstehen, dann pullen.*

Empfohlene Reihenfolge:
```bash
/opt/weltgewebe/scripts/weltgewebe pull
/opt/weltgewebe/scripts/weltgewebe build api
/opt/weltgewebe/scripts/weltgewebe restart
```

---

## Häufige Fehler & Ursachen

### `.env` nicht gefunden
**Symptom:**
```
Couldn't find env file: /home/alex/.env
```

**Ursache:**  
Compose wurde außerhalb des Repo-Roots ausgeführt.

**Fix:**  
Wrapper verwenden (`scripts/weltgewebe …`).

---

### Port 80/443 bereits belegt
**Symptom:**
```
address already in use
```

**Ursache:**  
Auf dem Host läuft bereits ein Dienst (Caddy/nginx/apache) auf 80/443.

**Prüfen:**
```bash
sudo ss -ltnp | grep -E ':(80|443)\b' || true
```

**Strategien:**
- Empfohlen: Host-Gateway terminiert 80/443
- Alternativ: Host-Dienst stoppen oder Ports ändern

---

## Smoke-Checks

API Readiness (intern):
```bash
curl -fsS http://localhost:8080/health/ready
```

Erwartung: HTTP 200.

---

## Verdichtete Essenz

Weltgewebe läuft reproduzierbar, wenn:
1. der Wrapper genutzt wird,
2. Edge-Ports nur einmal terminiert werden,
3. der Doctor vor Änderungen grün ist.

---

## Ungewissheitsanalyse

- **Unsicherheitsgrad:** 0.22  
- **Ursachen:** Edge-Mode (Host-Gateway vs Stack-Proxy) bewusst offen gehalten  
- **Art:** vermeidbare, operative Ungewissheit  
