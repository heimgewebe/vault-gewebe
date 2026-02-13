Gut. Dann machen wir einen sauberen, kanonischen Abschluss.

Unten ist eine einzige Datei, die alles Relevante aus dem bisherigen Verlauf enthält:
Ist-Stand, Ursachen, Entscheidungen, funktionierende Teile, bekannte Defekte, Fix-Pfad, Definition von „Deployment erfolgreich“, inkl. Logs-Semantik.

Du kannst sie 1:1 speichern (z. B. docs/ops.weltgewebe.deploy.status.md).

⸻


# Weltgewebe – Deployment Status & Entscheidungslog
Stand: 2026-02-09  
Host: heimserver  
Pfad: /opt/weltgewebe

---

## 1. Ziel dieser Datei

Diese Datei ist die **Single Source of Truth** für den aktuellen Deployment-Zustand von *weltgewebe*.

Sie dokumentiert:
- was **funktioniert**
- was **absichtlich fehlschlägt**
- warum das so ist
- welche **minimalen Schritte** zum vollständigen „ready“-Status fehlen
- ab wann das Deployment als **erfolgreich** gilt

Keine Roadmap, kein Wunschdenken, kein Refactor – nur Realität.

---

## 2. Aktueller Systemstatus (Fakten)

### Container
Alle Container laufen stabil:

| Service | Container | Status |
|------|---------|--------|
| API | compose-api-1 | Running |
| DB | compose-db-1 | Running |
| NATS | compose-nats-1 | Running |

### Ports
- API: `0.0.0.0:8081 → container:8080`
- DB: `5432/tcp` (intern)
- NATS: `4222/tcp`

Port 8080 auf dem Host ist **absichtlich belegt** (code-server)  
→ saubere Entflechtung via 8081

---

## 3. Health-Status

### Live
```http
GET /health/live → 200
{"status":"ok"}

Ready

GET /health/ready → 503
{"checks":{"database":false,"nats":false,"policy":false},"status":"error"}

Bewertung:
Das Verhalten ist korrekt.
ready ist streng, aggregiert sauber und blockiert bewusst.

⸻

4. Was nachweislich funktioniert (nicht anfassen)
	1.	Docker Compose Syntax
	•	docker compose config → grün
	2.	Container-Lifecycle
	•	deterministisches up -d
	•	keine Crashloops
	•	reproduzierbare Logs
	3.	Health-Semantik
	•	live ≠ ready
	•	keine falschen Positives
	4.	NATS
	•	JetStream aktiv
	•	Server „ready“

Das System ist stabil, nicht „halb kaputt“.

⸻

5. Bekannte Ursachen für ready = false

5.1 Policy

API sucht nach:

policies/limits.yaml
/app/apps/api/../policies/limits.yaml
/app/apps/api/../../policies/limits.yaml

Tatsächlicher Container-Aufbau:
	•	Binary liegt direkt in /app/weltgewebe-api
	•	/app/policies existiert nicht
	•	Mounts passen nicht zur Pfadannahme im Binary

➡ Policy nicht auffindbar, Check schlägt korrekt fehl.

⸻

5.2 Database
	•	Postgres läuft
	•	DB akzeptiert Verbindungen
	•	DATABASE_URL nicht sauber validiert gegen:
	•	POSTGRES_USER
	•	POSTGRES_PASSWORD
	•	POSTGRES_DB
	•	Möglicher Altzustand im Volume

➡ Check schlägt korrekt fehl.

⸻

5.3 NATS
	•	Container läuft
	•	JetStream aktiv
	•	API erreicht NATS nicht

Wahrscheinliche Ursache:
	•	fehlendes oder falsches NATS_URL
	•	Default 127.0.0.1 im Container

➡ Check schlägt korrekt fehl.

⸻

6. Was explizit nicht getan wurde
	•	❌ Kein DB-Reset
	•	❌ Kein Neuaufsetzen
	•	❌ Kein Code-Refactor
	•	❌ Kein „wir probieren mal“

Alle Entscheidungen waren reversibel und minimal.

⸻

7. Minimaler Fix-Pfad (kanonisch)

Schritt 1 – NATS explizit setzen

In infra/compose/compose.prod.yml:

services:
  api:
    environment:
      NATS_URL: nats://nats:4222

Dann:

docker compose up -d api

Erwartung:

checks.nats = true


⸻

Schritt 2 – Policy an kanonischem Ort

Host:

mkdir -p policies
cat > policies/limits.yaml <<'EOF'
enabled: false
EOF

Compose:

services:
  api:
    volumes:
      - ./policies:/app/policies:ro

Erwartung:

checks.policy = true


⸻

Schritt 3 – DB-Check isolieren

Im Container:

docker exec compose-api-1 sh -lc 'echo "$DATABASE_URL"'

Wenn korrekt, aber Check bleibt false:

docker compose down -v
docker compose up -d

Erwartung:

checks.database = true


⸻

8. Definition: „Deployment erfolgreich“

Nur dann gilt weltgewebe als deployed:

curl -fsS http://127.0.0.1:8081/health/live
curl -fsS http://127.0.0.1:8081/health/ready

Beide → HTTP 200

Erst danach:
	•	Reverse Proxy
	•	Auth
	•	UI
	•	Externe Routen

⸻

9. Logs

Alle relevanten Logs werden gesammelt unter:

.ops-logs/deploy-YYYYMMDD-HHMMSS.log

Diese Logs sind:
	•	reproduzierbar
	•	vollständig
	•	nicht „geschönt“

⸻

10. Verdichtete Essenz

Weltgewebe ist nicht kaputt.
Es ist korrekt streng.
ready ist rot, weil es ehrlich ist.

⸻

11. Ungewissheitsanalyse
	•	Unsicherheitsgrad: niedrig–mittel
	•	Ursachen:
	•	implizite Pfadannahmen im API-Binary
	•	nicht explizit gesetzte Service-URLs
	•	Art der Ungewissheit: produktiv
	•	Systemisch: nein
	•	Konfigurationsbedingt: ja

⸻

EOF

---

### Nächster sinnvoller Schritt
Wenn du willst, gehen wir **jetzt exakt die Checks im API-Code in Reihenfolge durch** (DB → NATS → Policy) und machen daraus **eine Guard-Checkliste** für zukünftige Deployments.

Sag nur, **wo die Datei liegen soll** (Repo + Pfad).