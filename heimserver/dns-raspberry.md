## Dialektischer Auftakt

### These

Ideale DNS-Konfiguration = maximale Kontrolle + maximale Verfügbarkeit + minimale Komplexität.

### Antithese

Mehr Komponenten erhöhen Drift-Risiko, Wartungsaufwand und Fehlersuche.

### Synthese

DNS wird **dedizierte, lautlose Infrastruktur** (Raspberry Pi).  
Router bleibt Router.  
Heimserver wird optional.

DNS ist Basisschicht, nicht Experiment.

---

# Zielzustand (klar definiert)

|Zustand|WLAN|Internet|home.arpa|Adblocking|
|---|---|---|---|---|
|Heimserver an|stabil|stabil|ja|ja|
|Heimserver aus|stabil|stabil|ja|ja|
|DNS-Pi aus (Notfall)|stabil|stabil (Router-Fallback)|nein|nein|

Keine Nacht-Ausfälle.  
Keine Abhängigkeit vom Heimserver.  
Keine Split-DNS-Experimente.

---

# Architektur-Plan

## 1️⃣ Hardware

### Raspberry Pi 4 (4 GB oder 8 GB)

- Ethernet (kein WLAN)
    
- FLIRC Case (passiv)
    
- offizielles 5V/3A Netzteil
    
- 32 GB SD **oder besser: kleine USB-SSD (empfohlen)**
    

Warum Pi 4:

- leise
    
- stromsparend (~3–5 W)
    
- ausreichend Leistung
    
- stabil
    

Warum SSD:

- weniger Korruption
    
- bessere Langzeitstabilität
    
- infrastrukturell sauberer
    

---

## 2️⃣ Netzwerktopologie

Client → DNS-Pi → Router → Internet

Heimserver ist komplett außen vor.

---

## 3️⃣ Fritzbox-Konfiguration

Heimnetz → Netzwerk → Netzwerkeinstellungen → IPv4

Lokaler DNS-Server:

→ **IP des DNS-Pi**

Beispiel:  
192.168.178.10

Wichtig:  
DNS-Pi bekommt feste IP (statische DHCP-Zuweisung).

---

## 4️⃣ DNS-Pi-Konfiguration

### Basis

- Raspberry Pi OS Lite
    
- SSH only
    
- kein Desktop
    
- kein unnötiger Service
    

### DNS-Stack

Option A (empfohlen):

- Pi-hole
    
- Unbound (lokaler Resolver)
    

Option B:

- Pi-hole mit externem DNS
    

Empfehlung: Unbound lokal → maximale Souveränität.

---

## 5️⃣ Redundanzstrategie

Fritzbox verteilt nur DNS-Pi.

Fallback im Notfall:

Wenn DNS-Pi stirbt:

- Feld „Lokaler DNS-Server“ entfernen
    
- Router übernimmt
    

Das ist manuelle Notfallstrategie – kein Dual-DNS-Chaos.

---

# IPv6-Strategie

Zwei saubere Varianten:

## Variante 1 (einfach)

IPv6 im Heimnetz deaktivieren.

## Variante 2 (korrekt)

DNSv6 ebenfalls auf DNS-Pi zeigen lassen.

Wichtig:  
Kein versteckter IPv6-Resolver darf Pi-hole umgehen.

---

# Sicherheits- & Wartungsplan

- monatliches `apt update && apt upgrade`
    
- Pi-hole Gravity-Update
    
- Backup von `/etc/pihole`
    
- optional: SD-Image sichern
    

---

# Energie-Bewertung

Pi 4 Idle ~4 W  
4 W × 24 × 365 ≈ 35 kWh  
≈ 10–15 € pro Jahr

Das ist akzeptabel für Infrastruktur.

---

# Risikoanalyse

|Risiko|Gegenmaßnahme|
|---|---|
|SD-Korruption|SSD|
|Netzteilprobleme|Originalnetzteil|
|Lüfterausfall|kein Lüfter|
|IP-Konflikt|statische DHCP-Zuweisung|
|IPv6-Bypass|prüfen/deaktivieren|

---

# Alternative Sinnachse

Du baust kein DNS.

Du baust:

„Namensautorität als unabhängige Basisschicht.“

Das ist eine Rollenklärung:

Router → Routing  
DNS-Pi → Namenswahrheit  
Heimserver → Dienste

Saubere Schichtung.

---

# Finale Entscheidungsempfehlung

Hardware:  
Raspberry Pi 4  
FLIRC Case  
Original-Netzteil  
USB-SSD

Software:  
Pi-hole + Unbound

Router:  
DNS → nur DNS-Pi

Kein Dual-DNS  
Keine Lüfter  
Keine Heimserver-Abhängigkeit

---

# Essenz

DNS wird ein kleines, stilles, eigenständiges Gehirn.

WLAN bleibt immer stabil.  
Heimserver darf schlafen.  
Architektur bleibt sauber.

---

# Unsicherheitsgrad

0.15

Ursachen:

- IPv6-Implementierung in deiner Fritzbox noch nicht geprüft
    
- SSD-Anbindung noch offen
    
- tatsächlicher Stromverbrauch variiert leicht
    

---

# Interpolationsgrad

0.17

Annahmen:

- DNS-only Einsatz
    
- keine zusätzlichen Container geplant
    
- kein VLAN-Split geplant
    

---

Wenn du willst, erstelle ich jetzt:

- exakte Einkaufsliste (final)
    
- Installationsreihenfolge Schritt für Schritt
    
- Integrations-Checkliste mit Testbefehlen
    

Und dann schließen wir dieses Kapitel sauber ab.