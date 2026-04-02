# Incident-Dokumentation

## Edge-Gateway Startfehler (Port-Konflikt 8081)

### Kontext

Service:

edge-caddy

Stack:

/opt/heimgewebe/edge  
docker compose

Ziel:

https://weltgewebe.home.arpa

Symptom initial:

connection refused

---

# 1 Problem

Der Edge-Gateway Container startete nicht.

Docker meldete:

failed to set up container networking  
failed to bind host port  
127.0.0.1:8081 address already in use

Der Container blieb im Zustand:

Created

statt:

Up

Dadurch wurden auch die Ports **80/443 nie gebunden**.

---

# 2 Diagnose

### Portprüfung

sudo ss -tulpn | grep 8081

Ergebnis:

0.0.0.0:8081 users:(("pihole-FTL"))

Der Port wurde bereits von **Pi-hole** belegt.

---

### Compose-Konfiguration

rg 8081 docker-compose.override.yml

Ergebnis:

127.0.0.1:8081:8081

Edge-Caddy versuchte also ebenfalls Port **8081** zu binden.

---

# 3 Ursache

Port-Konflikt:

|Service|Port|
|---|---|
|Pi-hole|8081|
|Edge-Caddy|8081|

Wichtiges Linux-Bind-Verhalten:

0.0.0.0:PORT blockiert alle spezifischen IP-binds

Das bedeutet:

0.0.0.0:8081  
blockiert  
127.0.0.1:8081

---

# 4 Lösung

Port-Mapping aus dem Edge-Compose entfernt.

### Änderung

Datei:

/opt/heimgewebe/edge/docker-compose.override.yml

Entfernt:

127.0.0.1:8081:8081

---

### Restart

docker compose down  
docker compose up -d

---

# 5 Ergebnis

Container startet korrekt:

docker ps

zeigt:

edge-caddy   Up  
0.0.0.0:80->80  
0.0.0.0:443->443

Der Gateway ist erreichbar.

---

# 6 Architektur-Erkenntnis

Edge-Gateway sollte **nur die notwendigen Ports besitzen**.

Empfohlene Minimalports:

80  
443

Debug- oder Adminports sollten:

• nicht im Edge liegen  
oder  
• auf andere Ports gelegt werden

---

# 7 Präventionsregel

Für Heimserver-Stacks:

Edge Gateway  
=  
exklusive Ports

Beispiel:

|Service|Ports|
|---|---|
|Edge|80, 443|
|Pi-hole|53, 8081|
|Apps|>9000|