# heimserver.firewall-setup.md
Operative Dokumentation – Firewall-Härtung (UFW)  
Zwischenstand vor Reverse-Proxy-Aktivierung

⛔️ Nicht veröffentlichen.  
⛔️ Bestandteil des sicherheitsrelevanten Systemkontexts.

Stand: 2026-02-03  
Host: heimserver  
Autor: alex  
Status: ABGESCHLOSSEN (Phase 1)

────────────────────────────────────────────────────────────

## Zweck dieses Dokuments

Dieses Dokument beschreibt die **konkret umgesetzte Firewall-Härtung**
des Heimservers als **Voraussetzung** für alle weiteren Schritte
(Reverse-Proxy, Leitstand, ACS).

Es dient als:
- operativer Nachweis
- Audit-Referenz
- spätere Einbindung in `heimserver.context.md`

────────────────────────────────────────────────────────────

## Ausgangslage (Ist vor Phase 1)

- Keine Firewall installiert
- Dienste potenziell auf allen Interfaces erreichbar
- Sicherheitsannahmen nur konzeptionell, nicht technisch erzwungen

Risiko:
- unbeabsichtigte Exponierung
- falsches Sicherheitsgefühl
- keine Durchsetzungsschicht

────────────────────────────────────────────────────────────

## Zielbild (Soll)

- Default: **alles verboten**
- Zugriff nur dort, wo explizit gewollt
- Trennung:
  - Transport (WireGuard)
  - Zugriff (SSH)
  - Dienste (HTTPS über Proxy)
- Keine impliziten Öffnungen
- Keine IPv6-Seitenkanäle

────────────────────────────────────────────────────────────

## Umsetzung – Phase 1 (Firewall)

### 1. Installation

Firewall-Tool:
- UFW (Uncomplicated Firewall)

Installation:
```bash
sudo apt update
sudo apt install -y ufw

Dabei wurden entfernt:
	•	iptables-persistent
	•	netfilter-persistent

Begründung:
Nur eine Instanz darf Firewall-Persistenz kontrollieren.

────────────────────────────────────────────────────────────

2. Grundregeln (Default-Policy)

sudo ufw default deny incoming
sudo ufw default allow outgoing

Ergebnis:
	•	Eingehender Traffic standardmäßig blockiert
	•	Ausgehender Traffic erlaubt

────────────────────────────────────────────────────────────

3. Erlaubte Basisdienste

SSH (nur intern)

sudo ufw allow from 192.168.178.0/24 to any port 22 proto tcp
sudo ufw allow from 10.7.0.0/24 to any port 22 proto tcp

Begründung:
	•	kein SSH aus dem Internet
	•	Zugriff nur aus:
	•	LAN
	•	WireGuard

WireGuard (Transport-Layer)

sudo ufw allow 51820/udp

Begründung:
	•	WireGuard benötigt WAN-Erreichbarkeit
	•	ist selbst authentifiziert und verschlüsselt

────────────────────────────────────────────────────────────

4. HTTPS für internen Reverse-Proxy (vorbereitend)

sudo ufw allow from 192.168.178.0/24 to any port 443 proto tcp
sudo ufw allow from 10.7.0.0/24 to any port 443 proto tcp

Begründung:
	•	Port 443 wird ausschließlich für einen
intern gekäfigten Reverse-Proxy vorgesehen
	•	kein WAN-Zugriff auf Webdienste

────────────────────────────────────────────────────────────

5. IPv6-Behandlung

IPv6 wurde bewusst deaktiviert:

sudo sed -i 's/IPV6=yes/IPV6=no/' /etc/default/ufw
sudo ufw reload

Begründung:
	•	kein aktiver IPv6-Usecase
	•	Vermeidung impliziter Regel-Duplikation
	•	Reduktion von Fehlkonfigurationsrisiken

────────────────────────────────────────────────────────────

Finaler Firewall-Status (verifiziert)

Status: active
Default: deny (incoming), allow (outgoing)

22/tcp   ALLOW IN  192.168.178.0/24
22/tcp   ALLOW IN  10.7.0.0/24
443/tcp  ALLOW IN  192.168.178.0/24
443/tcp  ALLOW IN  10.7.0.0/24
51820/udp ALLOW IN Anywhere

Keine:
	•	Anywhere-SSH-Regeln
	•	WAN-Webports
	•	IPv6-Regeln

────────────────────────────────────────────────────────────

Sicherheitsbewertung
	•	Angriffsfläche stark reduziert
	•	WAN nur für WireGuard offen
	•	Alle Webdienste intern gekäfigt
	•	Firewall erzwingt Architektur

Gesamtrisiko (nach Phase 1): niedrig–mittel (~0.15)

Restursachen:
	•	Docker-Dynamik
	•	zukünftige Fehlkonfigurationen ohne Drift-Guard

────────────────────────────────────────────────────────────

Bedeutung für Folgephasen

Diese Firewall-Konfiguration ist:
	•	Voraussetzung für Reverse-Proxy
	•	Invariante für Leitstand-Deploy
	•	nicht optional

Jede Abweichung:
→ Pflicht zur Aktualisierung des Systemkontexts.

────────────────────────────────────────────────────────────

Verdichtete Essenz

Erst wird verboten.
Dann wird erlaubt.
Alles andere ist Hoffnung.

────────────────────────────────────────────────────────────

Ungewissheitsursachenanalyse

Unsicherheitsgrad: 0.07

Ursachen:
	•	zukünftige Konfigurationsänderungen
	•	Docker-Ports, falls unkontrolliert

Status:
abgeschlossen, auditfest, integrationsbereit

