## 0) Scope / Definitionen

- Repo-Root: `/opt/weltgewebe`
- Compose (Prod): `infra/compose/compose.prod.yml`
- Caddy (Prod): `infra/caddy/Caddyfile.prod`
- Policies (Host): `/opt/weltgewebe/policies`
- Policies (Container): `/app/policies` (read-only)
- API-Port (Host): `8081` → (Container `8080`)
- Health: `http://127.0.0.1:8081/health/ready`

Merksatz: **Compose ist Wahrheit zur Laufzeit.** `.env` nur, wenn Compose es importiert.

---

## 1) Preflight (Pflicht vor jeder Änderung)

```bash
set -euo pipefail
cd /opt/weltgewebe

docker compose -f infra/compose/compose.prod.yml config >/dev/null
docker compose -f infra/compose/compose.prod.yml ps
curl -fsS http://127.0.0.1:8081/health/ready || true

Erwartung:
	•	config ist grün
	•	ps zeigt api, db, nats (falls benutzt)
	•	health/ready liefert JSON mit status:"ok"

⸻

2) Start/Stop/Restart

Start (oder hochfahren)

docker compose -f infra/compose/compose.prod.yml up -d
docker compose -f infra/compose/compose.prod.yml ps

Nur API neu erstellen (ENV/Compose geändert)

docker compose -f infra/compose/compose.prod.yml up -d --force-recreate api
docker compose -f infra/compose/compose.prod.yml ps

Stop (sanft)

docker compose -f infra/compose/compose.prod.yml down

Cleanup von Orphans (kosmetisch, optional)

Warnung erscheint oft:
Found orphan containers ([compose-nats-1]) ...
Dann:

docker compose -f infra/compose/compose.prod.yml down --remove-orphans
docker compose -f infra/compose/compose.prod.yml up -d


⸻

3) Policies (kritischer Mount)

Soll-Zustand

In infra/compose/compose.prod.yml muss stehen:
	•	Host-Pfad absolut: /opt/weltgewebe/policies:/app/policies:ro

Warum: relative Pfade hängen am aktuellen Working Directory (oder werden anders gerendert) und führen zu “File not found” im Container.

Verifikation im Container

CID="$(docker compose -f infra/compose/compose.prod.yml ps -q api)"
docker exec "$CID" sh -lc '
set -e
ls -la /app/policies
test -f /app/policies/limits.yaml
sed -n "1,120p" /app/policies/limits.yaml
'


⸻

4) DB/NATS Connectivity

Die API prüft typischerweise:
	•	DATABASE_URL
	•	NATS_URL
	•	Policy-Laden

Schneller Check über health

curl -fsS http://127.0.0.1:8081/health/ready | cat

Erwartung (Beispiel):
	•	checks.database=true
	•	checks.nats=true
	•	checks.policy=true
	•	status=ok

Wenn psql not found

psql im Host ist optional. Debug besser im DB-Container:

DBID="$(docker compose -f infra/compose/compose.prod.yml ps -q db)"
docker exec -it "$DBID" psql -U "${POSTGRES_USER:-welt}" -d "${POSTGRES_DB:-welt}" -c '\l' || true


⸻

5) Update-Prozedur (Policy: bewusst, auditierbar)

Prinzip: erst verstehen, dann pullen.

Safe Update (Repo + Containers)

set -euo pipefail
cd /opt/weltgewebe

git fetch origin
git status --porcelain

# optional: anzeigen, was sich ändert
git log --oneline --decorate --max-count=10 HEAD..origin/main || true

# preflight: compose muss rendern
docker compose -f infra/compose/compose.prod.yml config >/dev/null

# update code
git pull --ff-only

# deploy: rebuild wenn lokal gebaut wird
docker compose -f infra/compose/compose.prod.yml up -d --build

# verify
docker compose -f infra/compose/compose.prod.yml ps
curl -fsS http://127.0.0.1:8081/health/ready


⸻

6) GitHub Push vom Server (SSH, kein Passwort)

GitHub akzeptiert kein Passwort für Git-Operationen.
Remote muss SSH sein.

Check

git remote -v
ssh -T git@github.com

Fix (HTTPS → SSH)

git remote set-url origin git@github.com:heimgewebe/weltgewebe.git
git remote -v


⸻

7) Debug-Knoten (wenn etwas “komisch” ist)

Logs API

docker compose -f infra/compose/compose.prod.yml logs --no-log-prefix --tail=200 api

Inspect ENV in Container

CID="$(docker compose -f infra/compose/compose.prod.yml ps -q api)"
docker exec "$CID" sh -lc 'env | sort | grep -E "DATABASE_URL|NATS_URL|API_BIND|POLICY" || true'

Häufigster Fehler: Policy-Datei fehlt

Symptom:
	•	checks.policy=false oder “No such file or directory”

Ursache:
	•	falscher Mount (relativ, falscher Pfad, falscher Dateiname)

Fix:
	•	Compose auf absoluten Pfad korrigieren
	•	API --force-recreate starten
	•	Container-Verifikation (siehe Abschnitt 3)

⸻

8) Sicherheits- und Drift-Hinweise
	•	Secrets nicht ins Repo. .env bleibt lokal.
	•	Absolute Pfade in Prod-Compose sind beabsichtigt.
	•	Orphan-Container Warnungen sind meist harmlos, aber sollten periodisch bereinigt werden.
	•	Wenn neue Services dazukommen: Ports/Volumes/Health erweitern und Runbook aktualisieren.

⸻

9) Minimaler Erfolgstest

Wenn das hier grün ist, ist Deploy “gut genug”:

docker compose -f infra/compose/compose.prod.yml ps
curl -fsS http://127.0.0.1:8081/health/ready

EOF

echo “OK: wrote docs/runbooks/ops.runbook.weltgewebe.deploy.md”
sed -n ‘1,120p’ docs/runbooks/ops.runbook.weltgewebe.deploy.md

---

### Verdichtete Essenz
Ein Deploy-Runbook ist eine Liste von **SSOT-Pfaden + geprüften Befehlen + Debug-Knoten**, die dich vor dem Klassiker schützt: „läuft doch“ (bis es das nachts nicht mehr tut).

---

### Ungewissheitsursachenanalyse
**Unsicherheitsgrad:** niedrig (≈ 0.12)  
**Ursachen:**
- Ich kenne nicht alle Repo-Konventionen/benannten Skripte in deinem aktuellen Stand, daher ist das Runbook bewusst generisch (Compose/Health/Logs sind verlässlich).
- Ob `docs/runbooks/` bei euch kanonisch ist, ist sehr wahrscheinlich, aber nicht garantiert (Pfad kann in eurer Doku-Policy abweichen).

**Interpolationsgrad:** niedrig-mittel (≈ 0.18)  
- Interpolation steckt nur in der Strukturierung/Bezeichnungen (Runbook-Layout), nicht in den konkreten, von dir bereits genutzten Pfaden/Befehlen.

**Risikoabschätzung:** gering  
- Datei anlegen/überschreiben ist risikoarm; kritisch ist nur, dass man Secrets nicht mit dokumentiert. Das Runbook enthält keine Secrets.