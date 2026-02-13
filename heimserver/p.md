set -euo pipefail

# ============================================================
# Schritt 1A — Ausgangslage prüfen (nur lesen)
# ============================================================

CADDY_CONTAINER="${CADDY_CONTAINER:-compose-caddy-1}"

echo "== 1A.1 Container läuft? =="
docker ps --format '{{.Names}}' | grep -qx "$CADDY_CONTAINER" && echo "OK: $CADDY_CONTAINER läuft" || {
  echo "FEHLER: Container '$CADDY_CONTAINER' läuft nicht."
  echo "Hinweis: docker ps | grep caddy"
  exit 1
}

echo
echo "== 1A.2 Ports laut Docker =="
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E "(^NAME|${CADDY_CONTAINER})" || true

echo
echo "== 1A.3 Listener am Host (80/443/2019) =="
sudo ss -lntup | egrep '(:80|:443|:2019)\b' || true

echo
echo "== 1A.4 DOCKER-USER ist aktuell leer? =="
sudo iptables -S DOCKER-USER || true

set -euo pipefail

# ============================================================
# Schritt 1B — Compose-Metadaten aus Container-Labels ziehen
# (so finden wir die echte Compose-Datei ohne Rate-Spiel)
# ============================================================

CADDY_CONTAINER="${CADDY_CONTAINER:-compose-caddy-1}"

project="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' "$CADDY_CONTAINER")"
service="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.service" }}' "$CADDY_CONTAINER")"
workdir="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}' "$CADDY_CONTAINER")"
cfg_files="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project.config_files" }}' "$CADDY_CONTAINER")"

echo "project = $project"
echo "service = $service"
echo "workdir = $workdir"
echo "configs = $cfg_files"

if [[ -z "${project:-}" || -z "${service:-}" || -z "${workdir:-}" || -z "${cfg_files:-}" ]]; then
  echo "FEHLER: Compose-Labels unvollständig."
  exit 1
fi

echo
echo "== 1B.1 Config-Dateien als Liste =="
IFS=',' read -r -a cfg_arr <<< "$cfg_files"
for f in "${cfg_arr[@]}"; do
  f="$(echo "$f" | xargs)"
  echo "- $f"
done

set -euo pipefail

# ============================================================
# Schritt 1C — Backups der Compose-Datei(en) anlegen
# ============================================================

CADDY_CONTAINER="${CADDY_CONTAINER:-compose-caddy-1}"
cfg_files="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project.config_files" }}' "$CADDY_CONTAINER")"
IFS=',' read -r -a cfg_arr <<< "$cfg_files"
ts="$(date +%Y%m%d-%H%M%S)"

echo "== 1C Backups erstellen (ts=$ts) =="

for f in "${cfg_arr[@]}"; do
  f="$(echo "$f" | xargs)"
  if [[ -f "$f" ]]; then
    sudo cp -a "$f" "${f}.bak.${ts}"
    echo "OK: ${f}.bak.${ts}"
  else
    echo "WARN: nicht gefunden: $f"
  fi
done

set -euo pipefail

# ============================================================
# Schritt 1D — In der/den Compose-Datei(en) die Caddy-Publish-Zeilen finden
# ============================================================

CADDY_CONTAINER="${CADDY_CONTAINER:-compose-caddy-1}"
cfg_files="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project.config_files" }}' "$CADDY_CONTAINER")"
IFS=',' read -r -a cfg_arr <<< "$cfg_files"

echo "== 1D Suche nach 2019 / 443/udp / ports: =="

for f in "${cfg_arr[@]}"; do
  f="$(echo "$f" | xargs)"
  [[ -f "$f" ]] || continue
  echo
  echo "--- $f ---"
  sudo grep -nE '(^[[:space:]]*ports:|2019|443/udp|443:|80:)' "$f" || true
done

set -euo pipefail

# ============================================================
# Schritt 1E — Datei editieren (manuell), dann Compose rendern/validieren
# ============================================================

CADDY_CONTAINER="${CADDY_CONTAINER:-compose-caddy-1}"
project="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' "$CADDY_CONTAINER")"
service="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.service" }}' "$CADDY_CONTAINER")"
workdir="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}' "$CADDY_CONTAINER")"
cfg_files="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project.config_files" }}' "$CADDY_CONTAINER")"
IFS=',' read -r -a cfg_arr <<< "$cfg_files"

main_cfg="$(echo "${cfg_arr[0]}" | xargs)"

echo "== 1E.1 Editiere die Haupt-Compose-Datei =="
echo "Datei: $main_cfg"
echo
echo "Entferne im Caddy-Service unter 'ports:' konsequent:"
echo "  - jede 2019-Publish-Zeile"
echo "  - jede 443/udp-Publish-Zeile"
echo
echo "Behalte (falls du intern bleiben willst) nur TCP 80/443 an 127.0.0.1."
echo

sudo ${EDITOR:-nano} "$main_cfg"

echo
echo "== 1E.2 Compose rendern (muss ohne Fehler durchlaufen) =="
ts="$(date +%Y%m%d-%H%M%S)"
docker compose --project-directory "$workdir" -p "$project" -f "$main_cfg" config >/tmp/"${project}.rendered.${ts}.yml"
echo "OK: /tmp/${project}.rendered.${ts}.yml"

set -euo pipefail

# ============================================================
# Schritt 1F — Nur Caddy-Service neu starten (no-deps)
# ============================================================

CADDY_CONTAINER="${CADDY_CONTAINER:-compose-caddy-1}"
project="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project" }}' "$CADDY_CONTAINER")"
service="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.service" }}' "$CADDY_CONTAINER")"
workdir="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}' "$CADDY_CONTAINER")"
cfg_files="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.project.config_files" }}' "$CADDY_CONTAINER")"
IFS=',' read -r -a cfg_arr <<< "$cfg_files"
main_cfg="$(echo "${cfg_arr[0]}" | xargs)"

echo "== 1F Caddy updaten: project=$project service=$service =="
docker compose --project-directory "$workdir" -p "$project" -f "$main_cfg" up -d --no-deps "$service"

set -euo pipefail

# ============================================================
# Schritt 1G — Post-Checks: 2019 weg? 443/udp weg?
# ============================================================

CADDY_CONTAINER="${CADDY_CONTAINER:-compose-caddy-1}"

echo "== 1G.1 Ports laut Docker =="
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E "(^NAME|${CADDY_CONTAINER})" || true

echo
echo "== 1G.2 Host-Listener (80/443/2019) =="
sudo ss -lntup | egrep '(:80|:443|:2019)\b' || true

echo
echo "== 1G.3 Erwartung =="
echo "- KEIN :2019 mehr (weder tcp listener noch docker publish)"
echo "- KEIN 443/udp publish mehr"
echo "- ggf. weiterhin 127.0.0.1:80 und 127.0.0.1:443"

set -euo pipefail

# ============================================================
# Optional 1H — Wenn :2019 immer noch da ist: Verursacher finden
# ============================================================

echo "== 1H.1 Wer lauscht auf 2019? =="
sudo lsof -nP -iTCP:2019 -sTCP:LISTEN || true

echo
echo "== 1H.2 Alle Caddy-Prozesse =="
ps -ef | grep -E '[c]addy' || true

echo
echo "== 1H.3 Falls ein Host-Caddy läuft (sollte nicht): stoppen =="
sudo systemctl status caddy --no-pager || true
sudo systemctl disable --now caddy 2>/dev/null || true
sudo systemctl mask caddy 2>/dev/null || true

# ============================================================
# NÄCHSTER SCHRITT (Phase 2) — erst nach erfolgreichem Schritt 1:
# - DOCKER-USER Regeln setzen (wenn du auf 0.0.0.0 bindest)
# - Leitstand/ACS als Compose-Services integrieren
# ============================================================
echo "Schritt 1 abgeschlossen. Wenn 2019 & 443/udp weg sind: Phase 2."