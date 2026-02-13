# heimserver.context.md
Kanonischer operativer System-, Netzwerk- und Entwicklungs­kontext

⛔️ Diese Datei enthält sicherheitsrelevanten Kontext und Schlüsselmaterial-Hinweise.  
⛔️ Nicht veröffentlichen.

Stand: 2026-02-03  
Host: heimserver  
Primärer Nutzer: alex  
Dokumentklasse: OPERATIV (kanonisch)

────────────────────────────────────────────────────────────

## Systemidentität

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

────────────────────────────────────────────────────────────

## Betriebssystem

OS: Ubuntu 24.04 LTS  
Kernel: 6.8.x (generic)  
Init-System: systemd  
Service-Modell:
- systemd (system)
- systemd --user (linger aktiv)

Updates:
- unattended-upgrades aktiv

────────────────────────────────────────────────────────────

## Netzwerk – auditierter Ist-Zustand

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

Docker-Interfaces (nicht vertrauenswürdig):
- docker0: 172.17.0.0/16 (derzeit DOWN)
- br-*: 172.18.0.0/16 (aktiv)
- veth*: Container-Links (link-local)

────────────────────────────────────────────────────────────

## Vertrauenszonen (KANONISCH)

### Vertrauenswürdig
- Loopback: 127.0.0.1/8
- LAN: 192.168.178.0/24
- WireGuard: 10.7.0.0/24

### Nicht vertrauenswürdig
- Docker-Netze: 172.16.0.0/12
- WAN / Internet

Docker gilt explizit **nicht** als Vertrauenszone.

────────────────────────────────────────────────────────────

## WireGuard – operativ (Transport-Layer)

### Server (heimserver)

Interface: wg0  
Address: 10.7.0.1/24  
ListenPort: 51820/udp  
PrivateKey: **nur lokal gespeichert**

### Peers

iPad:
- Address: 10.7.0.2/32
- AllowedIPs: 10.7.0.0/24, 192.168.178.0/24
- PersistentKeepalive: 25

Status (Snapshot-abhängig):
- Handshake aktiv
- RX/TX vorhanden
- Latenz unauffällig

Unsicherheitsgrad Snapshot: ~0.25  
Ursachen:
- Mobilfunk-Latenz
- iOS-Sleep-Zyklen

────────────────────────────────────────────────────────────

## Architekturentscheidung (KANONISCH)

### Grundsatz

- Dienste bleiben lokal
- Zugriff reist (LAN + WireGuard)
- Transport vor Dienst
- Komfort ist nachgelagert, nicht vorgelagert

### Zielbild

Heimserver-only mit **eingesperrtem Entry-Gateway**.

### Erlaubt

- Reverse Proxy als **internes Gateway**
- Erreichbar ausschließlich aus:
  - LAN
  - WireGuard
- Backends strikt auf 127.0.0.1

### Verboten

- Öffentliche Exponierung von Webdiensten
- Reverse Proxy ohne Firewall-Caging
- Backends auf 0.0.0.0
- Temporäre Portöffnungen („nur kurz testen“)

Begründung:
Ein eingesperrter Reverse Proxy erhöht Komfort und Kohärenz,
ohne die Angriffsfläche real zu vergrößern.

────────────────────────────────────────────────────────────

## Firewall (KANONISCH)

### Prinzip

INPUT = DROP  
Explizite Allow-List  
Firewall ist **Primärschutz**, nicht optional.

### Tooling

Firewall: UFW  
Status: aktiv (Pflicht)

### Erlaubte Inbound-Verbindungen

- SSH: 22/tcp (LAN + WireGuard)
- WireGuard: 51820/udp (WAN)
- HTTPS (Reverse Proxy): 443/tcp **nur** aus:
  - 192.168.178.0/24
  - 10.7.0.0/24

### Explizit verboten

- Zugriff aus Docker-Netzen
- „Anywhere“-Regeln
- WAN-Zugriff auf Webdienste

### Persistenz

Firewall-Regeln müssen reboot-fest sein  
(UFW / netfilter-persistent).

────────────────────────────────────────────────────────────

## Firewall-Drift-Guard (KANONISCH)

Ziel:
Automatische Erkennung von Abweichungen zwischen Sollbild
und real geöffneten Listenern.

### Komponenten

Script:
- /usr/local/lib/heimserver/firewall-guard.sh

Service:
- firewall-guard.service

Timer:
- firewall-guard.timer (alle 5 Minuten)

### Verhalten

- OK:
  - Log-Eintrag
- Abweichung:
  - Exit ≠ 0
  - Log mit Port/Protokoll/Prozess

Neue öffentliche Dienste dürfen nur **bewusst**
und nach Aktualisierung dieses Dokuments entstehen.

────────────────────────────────────────────────────────────

## Reverse Proxy (Entry-Gateway)

### Rolle

- Komfort-Gateway
- Same-Origin-Vereinheitlichung
- interner TLS-Endpunkt

Der Proxy ist **keine Sicherheitsinstanz**.

### Implementierung

- Proxy: Caddy
- Port: 443/tcp
- TLS: internal CA
- Sichtbarkeit: ausschließlich LAN + WireGuard (Firewall)

### Bindings (KANONISCH)

Leitstand:
- intern: 127.0.0.1:3000
- extern: https://leitstand.lan

ACS:
- intern: 127.0.0.1:8099
- extern: https://leitstand.lan/acs/

────────────────────────────────────────────────────────────

## Leitstand (Heimgewebe-Cockpit)

### Rolle

- permanenter Beobachtungs- und Zustandsraum
- Viewer first, Actor second
- kein Primär-Actor

### Betrieb

- systemd user service
- restart on failure
- Logs → journald

### Datenquelle

Leitstand liest Artefakte, keine Live-States:
- chronik (Events / Timeline)
- semantAH (Observatorium / Insights)
- wgx / webmaschine (Health, Drift)

────────────────────────────────────────────────────────────

## code-server

### Bindung

127.0.0.1:8080

### Zugriff

- ausschließlich via SSH LocalForward
- kein Reverse Proxy
- kein TLS-Gateway

### systemd-User-Service

Pfad:
~/.config/systemd/user/code-server.service

────────────────────────────────────────────────────────────

## Zugriff vom iPad (Blink)

### SSH-Config (Blink)

Host vsc  
HostName 10.7.0.1  
User alex  
LocalForward 8080 127.0.0.1:8080  
ExitOnForwardFailure yes  
ServerAliveInterval 30  
ServerAliveCountMax 3  
RequestTTY no  
RemoteCommand /bin/true  

### Nutzung

ssh vsc  

Browser:
http://127.0.0.1:8080

────────────────────────────────────────────────────────────

## Jules

Jules ist **CLI/TUI only**.

- kein Web-Server
- keine offenen Ports
- keine Bindings

Workflow:
- jules new
- jules remote list --session
- jules remote pull --session --apply

────────────────────────────────────────────────────────────

## Docker

Docker ist aktiv, aber **nicht vertrauenswürdig**.

Regeln:
- keine Container-Ports nach außen
- kein Docker-Bypass der Firewall
- Kommunikation nur intern oder über explizite Gateways

Docker gilt als Drift-Quelle.

────────────────────────────────────────────────────────────

## Sicherheit – Zusammenfassung

✔ keine öffentlichen Webdienste  
✔ Backends nur localhost  
✔ Reverse Proxy eingesperrt  
✔ Firewall erzwingt Realität  
✔ Zugriff nur LAN + WireGuard  

Gesamtrisiko: niedrig–mittel (~0.18)

Restursachen:
- Docker-Dynamik
- menschliche Fehlkonfiguration

────────────────────────────────────────────────────────────

## Drift-Regel (bindend)

Dieses Dokument ersetzt **alle früheren Versionen**.

Jede Änderung an:
- Ports
- Services
- Netzgrenzen
- Proxies
- Tunneln
- Containern
- Schlüsselmaterial

→ **Pflicht zur Aktualisierung dieser Datei**

────────────────────────────────────────────────────────────

## Verdichtete Essenz

Der Dienst bleibt lokal.  
Der Zugriff reist.  
Der Proxy vermittelt.  
Die Wahrheit steht hier.

────────────────────────────────────────────────────────────

## Ungewissheitsursachenanalyse

Unsicherheitsgrad: 0.09  

Ursachen:
- Mobilfunk-Variabilität (WireGuard)
- Docker als dynamischer Faktor
- DNS-Quelle (leitstand.lan) implementierungsabhängig

Status:
stabil, auditfest, entscheidungsfähig