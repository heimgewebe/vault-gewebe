📘 heimserver — Infrastruktur-Betriebsdokumentation

Stand: 2026-02-12
Host: heimserver
Modus: produktiv, Clean-Reset validiert

⸻

1. Systembasis

1.1 OS

Ubuntu 24.04 (nftables via iptables-nft Backend)

1.2 DNS-Hoheit

systemd-resolved
	•	deaktiviert
	•	gestoppt

/etc/resolv.conf

nameserver 127.0.0.1

Ziel: vollständige DNS-Kontrolle über Pi-hole.

⸻

2. Netzwerk-Topologie

Interface	Rolle	Adresse
eno2	LAN	192.168.178.46
wg0	WireGuard	10.7.0.1/24
lo	Loopback	127.0.0.1

IPv6:
	•	Nur link-local (fe80::)
	•	Keine globale IPv6-Exposition

⸻

3. Docker DNS-Stack

Pfad:

/opt/heimgewebe/dns/docker-compose.yml

3.1 Unbound
	•	Image: mvance/unbound:latest
	•	Container: dns-unbound
	•	Binding:
	•	127.0.0.1:5335 → 53/tcp
	•	127.0.0.1:5335 → 53/udp
	•	Rolle: rekursiver Resolver

Isolation: nicht extern erreichbar.

⸻

3.2 Pi-hole
	•	Image: pihole/pihole:latest
	•	Container: dns-pihole
	•	network_mode: host
	•	Listener:
	•	0.0.0.0:53
	•	
	•	Upstream:

127.0.0.1#5335



Rolle:
DNS-Policy + Forwarder + Filter.

⸻

4. Aktive Listener (verifiziert)

Aus ss -tulpn:

Port	Service	Scope
22	sshd	0.0.0.0 + ::
53	pihole-FTL	0.0.0.0 + ::
5335	docker-proxy (unbound)	127.0.0.1
80	docker-proxy	öffentlich LAN
443	docker-proxy	öffentlich LAN

Eigentümer Port 53:
→ ausschließlich pihole-FTL

⸻

5. Firewall-Zustand (nft / iptables-nft)

5.1 table ip filter

Policy:

policy accept

Explizite Regeln:

iifname "eno2" tcp dport 53 accept
iifname "eno2" udp dport 53 accept
iifname "wg0"  tcp dport 53 accept
iifname "wg0"  udp dport 53 accept

SSH:
läuft ohne explizite Allow-Regel, da Policy ACCEPT.

5.2 NAT

Masquerade:

10.7.0.0/24 → eno2

Docker-managed chains aktiv.

5.3 ip6 filter

Policy ACCEPT
Kein restriktives IPv6-Regime.

⸻

6. SSH

Server
	•	Port 22
	•	Bind: 0.0.0.0 + ::

Client-Konfiguration

Host heimserver-lan
    HostName 192.168.178.46
    User alex

Host heimserver-wg
    HostName 10.7.0.1
    User alex

Erreichbar über:
	•	LAN
	•	WireGuard (wenn Tunnel aktiv)

⸻

7. Funktionstests

DNS lokal

dig @127.0.0.1 google.com +short

DNS LAN

dig @192.168.178.46 google.com +short

DNS WireGuard

dig @10.7.0.1 google.com +short

Ergebnis:
→ valide A-Records

⸻

SSH-Test

nc -vz 192.168.178.46 22

→ succeeded

⸻

8. Reboot-Verhalten

Getestet:
	•	DNS bleibt funktional
	•	SSH bleibt erreichbar
	•	WireGuard muss clientseitig aktiv sein

⸻

9. Persistenzstatus

Bereich	Status
Docker Auto-Start	aktiv
systemd-resolved	deaktiviert
iptables Regeln	persistent gespeichert
nft Ruleset	iptables-nft verwaltet
Compose File	statisch

Nicht dokumentiert:
	•	iptables-save Export
	•	wg show
	•	Fritzbox DHCP DNS-Verteilung
	•	Cold-Boot Protokoll

⸻

10. Sicherheitsniveau

Bereich	Bewertung
DNS-Isolation	gut
SSH-Exposition	LAN + WG
Default-Policy	permissiv
IPv6	nicht gehärtet
host-network	moderates Risiko

Gesamtrisiko: mittel-niedrig (kein WAN-Portforwarding angenommen)

⸻

11. Offene Punkte
	1.	Vollständiger nft Dump archivieren
	2.	Fritzbox DNS-Zuweisung dokumentieren
	3.	Optional: nft-native Hardening
	4.	Optional: Default DROP-Policy definieren

⸻

12. Infrastruktur-Reifegrad

Phase 1 – Funktionalität ✔
Phase 2 – Dokumentation teilweise ✔
Phase 3 – Audit-Level Snapshot ☐
Phase 4 – Härtung ☐

⸻

13. Entscheidende Lehre

Firewall-Härtung ohne Baseline-Definition erzeugt Self-Lockout-Risiko.
Service → Netzwerk → Security → Persistenz.
Nicht umgekehrt.

⸻

Unsicherheitsanalyse

Unsicherheitsgrad: 0.16
Ursache:
	•	Router-Konfiguration nicht einsehbar
	•	Kein vollständiger Persistenz-Dump

Interpolationsgrad: 0.11
Annahme:
	•	Keine WAN-Portfreigaben aktiv
	•	Fritzbox verteilt 192.168.178.46 als DNS

⸻

Essenz

Der heimserver ist stabil, funktional und kontrolliert.
Er ist noch nicht maximal gehärtet, aber reproduzierbar betreibbar.
Der Überblick fehlt nicht technisch, sondern strukturell – jetzt ist er wieder hergestellt.