heimserver.context.md

Kanonischer operativer System-, Netzwerk- und Architekturkontext

⛔️ ENTHÄLT SICHERHEITSRELEVANTEN KONTEXT
⛔️ NICHT VERÖFFENTLICHEN

Stand: 2026-02-03
Host: heimserver
Primärer Nutzer: alex
Dokumentklasse: OPERATIV · KANONISCH

────────────────────────────────────────────────────────────

1. Systemidentität

Hostname: heimserver
Hardware: Lenovo ThinkCentre M70q Gen 4
CPU: Intel i7-13700T (16C / 24T)
RAM: 16 GiB
Swap: 4 GiB
Storage: NVMe ~476 GB
Firmware/BIOS: M4VKT2AA

Rolle
	•	permanenter Heimserver
	•	Entwicklungs- und Orchestrierungsserver
	•	Träger des Heimgewebe-Organismus

⸻

2. Betriebssystem & Basissystem

OS: Ubuntu 24.04 LTS
Kernel: 6.8.x (generic)
Init-System: systemd

Service-Ebenen:
	•	systemd (system)
	•	systemd –user (linger aktiv für alex)

Updates:
	•	unattended-upgrades aktiv

Zeitsynchronisation:
	•	systemd-timesyncd

⸻

3. Netzwerk – auditierter Ist-Zustand

Interfaces

Loopback
	•	127.0.0.1/8
	•	::1/128

LAN
	•	eno2: 192.168.178.46/24

WireGuard
	•	wg0: 10.7.0.1/24

WLAN
	•	wlo1: vorhanden, aktuell DOWN

Docker-Netze (nicht vertrauenswürdig)
	•	docker0: 172.17.0.0/16 (derzeit DOWN)
	•	br-*: 172.18.0.0/16 (aktiv)
	•	veth*: Container-Links (link-local)

⸻

4. Vertrauenszonen (KANONISCH)

Vertrauenswürdig
	•	Loopback: 127.0.0.1/8
	•	LAN: 192.168.178.0/24
	•	WireGuard: 10.7.0.0/24

Nicht vertrauenswürdig
	•	Docker-Netze: 172.16.0.0/12
	•	WAN / Internet

Grundsatz:
Docker gilt explizit nicht als Vertrauenszone.

⸻

5. WireGuard – Transport-Layer

Server (heimserver)

Interface: wg0
Address: 10.7.0.1/24
ListenPort: 51820/udp
PrivateKey: nur lokal gespeichert

Peers

iPad
	•	Address: 10.7.0.2/32
	•	AllowedIPs:
	•	10.7.0.0/24
	•	192.168.178.0/24
	•	PersistentKeepalive: 25

Status (Snapshot-abhängig):
	•	Handshake aktiv
	•	RX/TX vorhanden
	•	Latenz unauffällig

Unsicherheitsgrad Snapshot: ~0.25
Ursachen:
	•	Mobilfunk-Latenz
	•	iOS-Sleep-Zyklen

⸻

6. Architekturgrundsatz (KANONISCH)

Leitprinzipien
	•	Dienste bleiben lokal
	•	Zugriff reist (LAN + WireGuard)
	•	Transport vor Dienst
	•	Komfort folgt Sicherheit

Zielbild

Heimserver-only mit strikt eingesperrtem Entry-Gateway.

Erlaubt
	•	Reverse Proxy als internes Gateway
	•	Erreichbar ausschließlich aus LAN und WireGuard
	•	Backends strikt lokal oder Compose-intern

Verboten
	•	öffentliche Webdienste
	•	Reverse Proxy ohne Firewall-Caging
	•	Backends auf 0.0.0.0
	•	temporäre Portöffnungen

Begründung:
Ein eingesperrter Reverse Proxy erhöht Komfort,
ohne die Angriffsfläche real zu vergrößern.

⸻

7. Firewall – KANONISCHER IST-ZUSTAND

Firewall-Stack
	•	iptables (KANONISCH)
	•	netfilter-persistent (Persistenz)

UFW:
	•	bewusst entfernt
	•	keine Doppelsteuerung
	•	keine parallelen Regelwerke

Grundsatz
	•	INPUT restriktiv
	•	OUTPUT erlaubt
	•	FORWARD nur implizit, wo funktional notwendig

Kanonische Inbound-Policy (explizit)

SSH
	•	22/tcp aus:
	•	192.168.178.0/24 (LAN)
	•	10.7.0.0/24 (WireGuard)

WireGuard
	•	51820/udp von WAN

Reverse Proxy
	•	443/tcp aus:
	•	192.168.178.0/24 (LAN)
	•	10.7.0.0/24 (WireGuard)

Explizit verboten
	•	WAN-Zugriff auf Webdienste
	•	Anywhere-SSH
	•	Docker-Netze als Quelle für Host-Ports

Historie
	•	2026-02-03: Migration von UFW → iptables + netfilter-persistent
Begründung: Eindeutigkeit, Auditierbarkeit, keine Regel-Überlagerung

⸻

8. Routing / Forwarding (WireGuard → LAN)

Status:
	•	IP-Forwarding aktiv (net.ipv4.ip_forward = 1)
	•	keine expliziten FORWARD- oder Route-Regeln notwendig

Verifikation (2026-02-03)
	•	WG-Client erreicht:
	•	FritzBox (192.168.178.1)
	•	heimserver (192.168.178.46)
	•	Test: ICMP (Ping) über WireGuard

Entscheidung
WG → LAN Routing funktioniert zuverlässig.
Keine zusätzlichen FORWARD-Regeln.

Begründung
Zusätzliche Regeln würden Redundanz und Driftgefahr erhöhen
ohne funktionalen Mehrwert.

Hinweis
Filterwirkung erfolgt über:
	•	bestehende iptables-Policies
	•	DOCKER-USER Chain

Explizite FORWARD-Policies bleiben möglich, sind aktuell nicht erforderlich.

⸻

9. Docker & Firewall-Käfig (KANONISCH)

Docker ist aktiv, aber nicht vertrauenswürdig.

Regeln:
	•	keine Container-Ports nach WAN
	•	Reverse Proxy ist einziger Eintrittspunkt
	•	zusätzliche Absicherung über DOCKER-USER Chain

⸻

10. DOCKER-USER Chain – Umsetzung & Persistenz

Status:
	•	aktiv
	•	persistent (netfilter-persistent)
	•	auditfest

Regeln (KANONISCH):
	•	ACCEPT TCP 80/443 aus:
	•	192.168.178.0/24
	•	10.7.0.0/24
	•	DROP sonst für 80/443
	•	RETURN für nicht relevante Pakete

Validierung:
	•	sudo iptables -S DOCKER-USER
	•	Zugriff auf 80/443 von nicht erlaubten Quellen scheitert zuverlässig

Wichtig (typischer Fehler):
DOCKER-USER wirkt nur, wenn Docker den Traffic tatsächlich durch FORWARD/DOCKER-Ketten führt. Das ist in Standard-Docker der Fall, aber bei Sonder-Setups (rootless / nft-backend / custom chains) muss man das gelegentlich verifizieren.

⸻

11. Reverse Proxy (Caddy)

Implementierung: Caddy (Docker)
Rolle: Entry-Gateway

Status:
	•	Docker-Caddy ist kanonisch
	•	Host-Caddy (systemd) ist verboten

Caddy-Admin:
	•	kein Publish
	•	keine Host-Exposition

TLS:
	•	internal CA

Sichtbarkeit:
	•	ausschließlich LAN + WireGuard

⸻

12. Docker-Caddy: Publish-Matrix (IST)

IST-Snapshot (2026-02-03):
	•	80/tcp  → 127.0.0.1
	•	443/tcp → 127.0.0.1
	•	kein 443/udp
	•	kein 2019/tcp

Status:
loopback-gekäfigt, kein Admin-Port, kein QUIC

⸻

13. Weltgewebe-Caddy (bestehende Site)

Aktive Routen:
	•	/api/*        → api:8080
	•	/health/*     → api:8080
	•	/health/proxy → respond 200
	•	/             → externer Web-Upstream (Cloudflare / Vercel)

Diese Site bleibt unverändert.

⸻

14. Leitstand – Zielintegration

Rolle:
	•	permanenter Beobachtungsraum
	•	Viewer first, Actor second

Ziel-URL:
https://leitstand.lan

Status:
	•	Compose-Service geplant
	•	Zugriff ausschließlich über Caddy
	•	Same-Origin mit ACS
	•	Umsetzung bewusst nachgelagert (Transport & Sicherheit abgeschlossen)

Kanonischer Zielzustand (Caddy-Site)

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

15. ACS – Zielintegration

Rolle:
	•	Operations-Interface
	•	kontrollierter Actor

Status:
	•	Compose-Service geplant
	•	Zugriff nur via leitstand.lan/acs/
	•	kein Direktzugriff

⸻

16. Leitstand – Zugriffs- und Aktionspolicy

Standardmodus:
	•	READ-ONLY

Aktionen:
	•	ausschließlich über ACS
	•	keine impliziten Übergänge
	•	keine Fallback-Pfade vom Leitstand zu Write-Operationen

Begründung:
Ein Beobachtungsraum darf nicht unbemerkt zum Akteur werden.

⸻

17. code-server (VS Code Web)

Bindung:
	•	127.0.0.1:8080

Zugriff:
	•	ausschließlich via SSH LocalForward
	•	kein Reverse Proxy
	•	kein TLS

Architekturentscheidung:
code-server bleibt Host-Service und wird nicht in Compose integriert.

⸻

18. Jules

Jules ist CLI/TUI-only.
	•	kein Webserver
	•	keine Ports
	•	keine Bindings

⸻

19. Interne Namensauflösung (KANONISCH)

Quelle:
	•	FritzBox DNS/DHCP

Namen:
	•	heimserver → 192.168.178.46
	•	leitstand.lan → 192.168.178.46

Status:
funktional im LAN, WireGuard-Clients nutzen Heim-DNS

Status (IST vs. SOLL)

IST:
	•	leitstand.lan nicht garantiert auf allen Clients konsistent auflösbar
	•	Validierung über:
	•	getent hosts leitstand.lan
	•	dig leitstand.lan @192.168.178.1 (falls verfügbar)
	•	ping leitstand.lan

SOLL:
	•	FritzBox-DNS/DHCP liefert leitstand.lan -> 192.168.178.46 konsistent
	•	WireGuard-Clients nutzen DNS = 192.168.178.1 (FritzBox)

⸻

20. Firewall-Strategie – Entscheidung

Entscheidung:
iptables bleibt kanonisch.

Begründung:
	•	stabil
	•	transparent
	•	umgesetzt
	•	auditierbar

nftables:
	•	bewusst nicht umgesetzt
	•	mögliche spätere Migration
	•	kein aktueller Handlungsbedarf

⸻

21. Service-Orchestrierung – Kanonische Regel

systemd:
	•	Transport
	•	Zugriff
	•	Host-nahe Dienste (z. B. SSH, WireGuard, code-server)

Docker / Compose:
	•	HTTP-/HTTPS-Dienste
	•	UIs
	•	APIs
	•	Proxies

Mischformen:
	•	verboten (Ausnahmen müssen explizit dokumentiert werden)

⸻

22. Kritische Persistenz (Hinweis)

Kritisch:
	•	WireGuard-Schlüssel
	•	iptables-Regeln (Persistenz via netfilter-persistent)
	•	Docker-Volumes (Caddy, Leitstand, ACS)

Nicht kritisch:
	•	Container-Images
	•	temporäre Artefakte
	•	Logs ohne Audit-Relevanz

⸻

23. Drift-Regel (bindend)

Jede Änderung an:
	•	Firewall
	•	Routing
	•	Ports
	•	Proxies
	•	Services

→ Pflicht zur Aktualisierung dieser Datei.

⸻

24. Verdichtete Essenz

Der Dienst bleibt lokal.
Der Zugriff reist.
Der Proxy vermittelt.
Die Wahrheit steht hier.

⸻

25. Ungewissheitsursachenanalyse

Unsicherheitsgrad: 0.11
Interpolationsgrad: 0.06

Restunsicherheiten (konkret):
	•	Mobilfunk-Variabilität (WireGuard-Handshake und Latenz)
	•	DNS-Abhängigkeit FritzBox (Client-seitig nicht immer stabil kontrollierbar)
	•	iptables-Regel-Sicht: ohne kompletten iptables-save bleibt ein kleiner Anteil “nur aus Ausschnitten abgeleitet”

Vermeidbar vs. systembedingt:
	•	vermeidbar: fehlender vollständiger iptables-save Snapshot im Kontextdokument
	•	systembedingt: Mobilfunk/WG-Volatilität

────────────────────────────────────────────────────────────
ENDE DER KANONISCHEN DATEI
────────────────────────────────────────────────────────────