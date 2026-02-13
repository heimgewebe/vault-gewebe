# heimserver.context.md
Kanonischer operativer System-, Netzwerk- und Architekturkontext

⛔️ ENTHÄLT SICHERHEITSRELEVANTEN KONTEXT
⛔️ NICHT VERÖFFENTLICHEN

Stand: 2026-02-03
Host: heimserver
Primärer Nutzer: alex
Dokumentklasse: OPERATIV · KANONISCH

────────────────────────────────────────────────────────────


⸻

## 1. Systemidentität

Hostname: heimserver
Hardware: Lenovo ThinkCentre M70q Gen 4
CPU: Intel i7-13700T (16C / 24T)
RAM: 16 GiB
Swap: 4 GiB
Storage: NVMe ~476 GB
Firmware/BIOS: M4VKT2AA

Rolle:
- permanenter Heimserver
- Entwicklungs- und Orchestrierungsserver
- Träger des Heimgewebe-Organismus


⸻

## 2. Betriebssystem & Basissystem

OS: Ubuntu 24.04 LTS
Kernel: 6.8.x (generic)
Init-System: systemd

Service-Ebenen:
- systemd (system)
- systemd --user (linger aktiv für alex)

Updates:
- unattended-upgrades aktiv

Zeitsynchronisation:
- systemd-timesyncd


⸻

## 3. Netzwerk – auditierter Ist-Zustand

### Interfaces

lo
- 127.0.0.1/8
- ::1/128

eno2 (LAN)
- 192.168.178.46/24

wg0 (WireGuard)
- 10.7.0.1/24

wlo1
- vorhanden
- aktuell DOWN

Docker-bezogene Interfaces (nicht vertrauenswürdig):
- docker0: 172.17.0.0/16 (derzeit DOWN)
- br-*   : 172.18.0.0/16 (aktiv)
- veth*  : Container-Links (link-local)


⸻

## 4. Vertrauenszonen (KANONISCH)

### Vertrauenswürdig
- Loopback: 127.0.0.1/8
- LAN: 192.168.178.0/24
- WireGuard: 10.7.0.0/24

### Nicht vertrauenswürdig
- Docker-Netze: 172.16.0.0/12
- WAN / Internet

Docker gilt explizit NICHT als Vertrauenszone.


⸻

## 5. WireGuard – Transport-Layer

### Server (heimserver)

Interface: wg0
Address: 10.7.0.1/24
ListenPort: 51820/udp
PrivateKey: nur lokal gespeichert

### Peers

iPad:
- Address: 10.7.0.2/32
- AllowedIPs:
  - 10.7.0.0/24
  - 192.168.178.0/24
- PersistentKeepalive: 25

Status (Snapshot-abhängig):
- Handshake aktiv
- RX/TX vorhanden
- Latenz unauffällig

Unsicherheitsgrad Snapshot: ~0.25
Ursachen:
- Mobilfunk-Latenz
- iOS-Sleep-Zyklen


⸻

## 6. Architekturgrundsatz (KANONISCH)

### Grundsatz
- Dienste bleiben lokal
- Zugriff reist (LAN + WireGuard)
- Transport vor Dienst
- Komfort folgt Sicherheit

### Zielbild
Heimserver-only mit eingesperrtem Entry-Gateway.

### Erlaubt
- Reverse Proxy als internes Gateway
- Erreichbar ausschließlich aus:
  - LAN
  - WireGuard
- Backends strikt lokal oder Compose-intern

### Verboten
- Öffentliche Webdienste
- Reverse Proxy ohne Firewall-Caging
- Backends auf 0.0.0.0
- Temporäre Portöffnungen

Begründung:
Ein eingesperrter Reverse Proxy erhöht Komfort,
ohne die Angriffsfläche real zu vergrößern.


⸻

## 7. Firewall (UFW) – KANONISCHER IST-ZUSTAND

Firewall: UFW
Status: aktiv
IPv6: deaktiviert

### Default Policy
INPUT  = DROP
OUTPUT = ALLOW

### Erlaubte Inbound-Regeln
SSH:
- 22/tcp aus 192.168.178.0/24
- 22/tcp aus 10.7.0.0/24

WireGuard:
- 51820/udp (WAN)

HTTPS (Reverse Proxy):
- 443/tcp aus 192.168.178.0/24
- 443/tcp aus 10.7.0.0/24

### Explizit verboten
- WAN-Zugriff auf Webdienste
- Anywhere-SSH
- Docker-Netze als Quelle


⸻

## 8. Routing/Forwarding (WireGuard → LAN)

UFW Default enthält:
- `deny (routed)`

Das ist gewollt, kann aber WireGuard-LAN-Routing brechen, wenn keine expliziten Route-Regeln existieren.

IST (zu prüfen):
- IP-Forwarding aktiv:
  - `sysctl net.ipv4.ip_forward` (erwartet: `1`)
- Route-Policy erlaubt:
  - `sudo ufw status verbose` (routed = deny ist ok, wenn Route-Regeln gesetzt sind)

SOLL (wenn Routing benötigt wird):
- IP-Forwarding dauerhaft aktiv:
  - `/etc/sysctl.d/99-heimserver-forwarding.conf`:
    - `net.ipv4.ip_forward=1`
- UFW Route-Allow:
  - `sudo ufw route allow in on wg0 out on eno2 from 10.7.0.0/24 to 192.168.178.0/24`
  - optional Rückrichtung (falls nötig):
    - `sudo ufw route allow in on eno2 out on wg0 from 192.168.178.0/24 to 10.7.0.0/24`

Validierung:
- Client im WG-Netz erreicht LAN-Host (z. B. 192.168.178.1, 192.168.178.46)
- `sudo ufw status verbose` zeigt Route-Regeln


⸻

## 9. Docker & Firewall-Käfig (KANONISCH)

Docker ist aktiv, aber nicht vertrauenswürdig.

Regeln:
- keine Container-Ports nach WAN
- Reverse Proxy ist einziger Eintrittspunkt
- zusätzliche Absicherung über DOCKER-USER chain


⸻

## 10. DOCKER-USER Chain – Umsetzung & Persistenz

Status:
- konzeptionell kanonisch
- Umsetzung ist Pflicht, sobald Docker Ports published (auch wenn nur 127.0.0.1 geplant ist)

Ziel:
- Docker darf UFW nicht umgehen.
- 80/443 nur aus:
  - 192.168.178.0/24
  - 10.7.0.0/24

Umsetzung (iptables, IST/SOLL kompatibel):

1) Regeln setzen (Beispiel):
- ACCEPT für LAN/WG → 80/443
- DROP für sonst → 80/443

2) Persistenz:
- bevorzugt: nftables (langfristig)
- alternativ: iptables-persistent

Validierung:
- `sudo iptables -S DOCKER-USER`
- Test: Zugriff von einer NICHT erlaubten Quelle schlägt fehl


⸻

## 11. Reverse Proxy (Caddy)

Implementierung: Caddy (Docker)
Rolle: Entry-Gateway

Status:
- Docker-Caddy ist kanonisch
- systemd-Caddy ist verboten und maskiert

Caddy-Admin:
- 127.0.0.1:2019 (intern)
- nicht veröffentlicht

TLS:
- internal CA

Sichtbarkeit:
- ausschließlich LAN + WireGuard


⸻

## 12. Docker-Caddy: Publish-Matrix (IST)

IST-Snapshot (relevant):
- 80/tcp  -> aktuell auf 127.0.0.1 gebunden
- 443/tcp -> aktuell auf 127.0.0.1 gebunden
- 443/udp -> kann als QUIC/HTTP3 veröffentlicht sein (prüfen!)
- 2019/tcp -> Admin-Port-Publish ist ein Sonderrisiko (prüfen!)

Pflichtprüfung:
- `docker ps --format 'table {{.Names}}\t{{.Ports}}' | grep caddy`
- `sudo ss -lntup | egrep '(:80|:443|:2019)\b'`

SOLL:
- Admin-Port niemals aus LAN/WG erreichbar veröffentlichen.
  - entweder gar nicht publishen,
  - oder strikt an 127.0.0.1 binden.
- QUIC (443/udp) nur, wenn bewusst genutzt; sonst deaktivieren oder cagen wie 443/tcp.


⸻

## 13. Weltgewebe-Caddy (bestehende Site)

Aktive Routen:
- /api/*           → api:8080
- /health/*        → api:8080
- /health/proxy    → respond 200
- /               → externer Web-Upstream (Cloudflare / Vercel)

Diese Site bleibt unverändert.


⸻

## 14. Leitstand – Zielintegration

Rolle:
- permanenter Beobachtungsraum
- Viewer first, Actor second

Ziel-URL:
https://leitstand.lan

### Status (IST vs. SOLL)

IST:
- Leitstand kann aktuell als Host-Service auf 127.0.0.1 laufen.
- Compose-Integration ist geplant, aber nicht garantiert umgesetzt.

SOLL:
- eigener Compose-Service
- interner Port: 3000
- kein Public-Port
- Zugriff ausschließlich über Caddy (Same-Origin)

Caddy-Site (KANONISCH):

leitstand.lan {
  encode zstd gzip

  reverse_proxy leitstand:3000

  handle_path /acs/* {
    reverse_proxy acs:8099
  }

  handle /health {
    respond 200
  }

  tls internal
}


⸻

## 15. ACS – Zielintegration

Rolle:
- Operations-Interface
- kontrollierter Actor

### Status (IST vs. SOLL)

IST:
- ACS kann aktuell als Host-Service auf 127.0.0.1 laufen.
- Compose-Integration ist geplant, aber nicht garantiert umgesetzt.

SOLL:
- eigener Compose-Service
- interner Port: 8099
- kein Direktzugriff
- Zugriff nur via leitstand.lan/acs/


⸻

## 16. Leitstand – Zugriffs- und Aktionspolicy

Standardmodus:
- READ-ONLY

Erlaubt:
- Anzeigen von Zustand
- Anzeigen von Artefakten
- Anzeigen von Health / Drift

Verboten im Default:
- direkte Systemänderungen
- Job-Trigger
- Write-Operationen

Aktionen:
- dürfen ausschließlich über ACS erfolgen
- keine impliziten Fallbacks vom Leitstand zu ACS

Begründung:
Ein Beobachtungsraum darf nicht unbemerkt zum Akteur werden.


⸻

## 17. code-server (VS Code Web)

Bindung:
- 127.0.0.1:8080

Zugriff:
- ausschließlich via SSH LocalForward
- kein Reverse Proxy
- kein TLS

systemd-user-Service:
~/.config/systemd/user/code-server.service

Zugriff vom iPad:
- WireGuard
- SSH (Blink)
- Browser → http://127.0.0.1:8080

### Abgrenzung zu Caddy/Compose

code-server bleibt dauerhaft:
- Host-Service (systemd --user)
- 127.0.0.1-Bind
- Zugriff nur via SSH LocalForward

code-server wird nicht:
- hinter Caddy gehängt
- via 443 exposed
- in Compose „mitgeroutet“


⸻

## 18. Jules

Jules ist CLI/TUI-only.
- kein Webserver
- keine Ports
- keine Bindings

Workflow:
- jules new
- jules remote list --session
- jules remote pull --session --apply


⸻

## 19. Interne Namensauflösung (KANONISCH)

Kanonische Quelle für interne Hostnamen:
- FritzBox (lokales DNS / DHCP-Leases)

Definierte Namen:
- heimserver → 192.168.178.46
- leitstand.lan → 192.168.178.46

WireGuard-Clients:
- erhalten DNS-Auflösung über Heimnetz
- Split-DNS ist zulässig, aber nicht erforderlich

Verbote:
- /etc/hosts als dauerhafte Lösung
- manuelle DNS-Einträge auf Clients

Begründung:
DNS ist Teil der Architektur.
Hosts-Dateien erzeugen Drift und unterlaufen Auditierbarkeit.

### Status (IST vs. SOLL)

IST:
- `leitstand.lan` ist noch nicht garantiert auf allen Clients auflösbar.
- Validierung erfolgt per:
  - `getent hosts leitstand.lan`
  - `dig leitstand.lan @192.168.178.1` (falls verfügbar)
  - `ping leitstand.lan`

SOLL:
- FritzBox-DNS/DHCP liefert `leitstand.lan -> 192.168.178.46` konsistent.
- WireGuard-Clients nutzen DNS = 192.168.178.1 (FritzBox) oder einen expliziten internen Resolver.


⸻

## 20. Service-Orchestrierung – Kanonische Regel

systemd (system / user):
- Host-nahe Basisdienste
- Transport & Zugriff
- Beispiele:
  - SSH
  - WireGuard
  - code-server

Docker / Compose:
- alle HTTP-/HTTPS-Dienste
- alle UIs
- alle APIs
- alle Proxies

Mischformen:
- verboten
- explizite Ausnahmen müssen dokumentiert werden

Begründung:
Trennung verhindert Sonderpfade und semantische Drift.


⸻

## 21. Kritische Persistenz (Hinweis)

Kritisch zu sichern:
- WireGuard-Schlüsselmaterial
- Docker-Volumes:
  - Caddy (/data, /config)
  - Leitstand
  - ACS
- Konfigurationsdateien dieses Hosts

Nicht kritisch:
- Container-Images
- Build-Artefakte
- temporäre Logs

Begründung:
Wiederherstellbarkeit ist Teil der Betriebssicherheit,
auch ohne formales Backup-Konzept.


⸻

## 22. Drift-Regel (bindend)

Dieses Dokument ersetzt alle früheren Versionen.

Jede Änderung an:
- Ports
- Diensten
- Containern
- Proxies
- Firewalls
- Tunneln
- Schlüsselmaterial

→ Pflicht zur Aktualisierung dieser Datei.


⸻

## 23. Verdichtete Essenz

Der Dienst bleibt lokal.
Der Zugriff reist.
Der Proxy vermittelt.
Die Wahrheit steht hier.


⸻

## 24. Ungewissheitsursachenanalyse

Unsicherheitsgrad: 0.19
Interpolationsgrad: 0.08

Hauptursachen der Ungewissheit:
- Routing/Forwarding real aktiv? (UFW routed=deny vs. gewünschtes WireGuard-LAN-Routing) → ohne sysctl/ufw-route-Output nicht 100% belegbar.
- Docker-Caddy Publish-Details (2019/tcp, 443/udp) sind driftanfällig und müssen als „IST-Snapshot“ im Dokument stehen.
- DNS-Realität: FritzBox-DNS ist als Quelle gesetzt, aber Auflösung war zeitweise nicht vorhanden; ohne aktuelle Prüfung bleibt es ein Sollsatz.

Vermeidbar vs. systembedingt:
- vermeidbar: fehlende IST-Snapshots (docker ps / ss / sysctl / ufw route)
- systembedingt: Mobilfunk/WG-Handshake-Variabilität

────────────────────────────────────────────────────────────
ENDE DER KANONISCHEN DATEI
────────────────────────────────────────────────────────────