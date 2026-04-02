cat > docs/runbooks/network.wireguard-lan-access.md <<'EOF'
# network.wireguard-lan-access

Status: STABIL
Scope: Heimserver + iPad WireGuard Client
Ziel: Zugriff auf interne Dienste (z.B. leitstand.heimgewebe.home.arpa) über VPN

---

## 1. Architektur

Client (iPad)
    ↓ WireGuard (10.7.0.2/32)
Heimserver wg0 (10.7.0.1)
    ↓ NAT (MASQUERADE)
LAN 192.168.178.0/24
    ↓
Pi-hole (192.168.178.46)
    ↓
Caddy (HTTPS Reverse Proxy)

Grundregel:
Ein DNS-System. Kein Splitbrain.

---

## 2. Server-Konfiguration

### /etc/wireguard/wg0.conf

[Interface]
Address = 10.7.0.1/24
ListenPort = 51820
PrivateKey = <hidden>

[Peer]
PublicKey = <iPad Public Key>
AllowedIPs = 10.7.0.2/32

---

### IP Forwarding

Prüfen:
    sysctl net.ipv4.ip_forward

Soll:
    net.ipv4.ip_forward = 1

---

### NAT-Regel

iptables:

    iptables -t nat -A POSTROUTING -s 10.7.0.0/24 -o eno2 -j MASQUERADE

Persistenz sicherstellen (iptables-persistent oder nftables).

---

## 3. iPad WireGuard Profil

### Interface

Address:
    10.7.0.2/32

DNS:
    192.168.178.46

NICHT:
    192.168.178.1

---

### Peer

Endpoint:
    <öffentliche-IP>:51820

AllowedIPs (empfohlen – Full Tunnel):

    0.0.0.0/0
    ::/0

Alternative (Split Tunnel):

    10.7.0.0/24
    192.168.178.0/24

---

## 4. DNS-Design

Interne Zone:
    heimgewebe.home.arpa

Resolver:
    Pi-hole (192.168.178.46)

Fritzbox darf NICHT primärer DNS für VPN-Clients sein.

---

## 5. Testprozedur

### Auf Server

DNS prüfen:

    sudo tcpdump -ni wg0 port 53

HTTP prüfen:

    sudo tcpdump -ni wg0 port 80 or port 443

---

### Vom iPad

Aufrufen:

    https://leitstand.heimgewebe.home.arpa

Erwartung:

    10.7.0.2 → 192.168.178.46:53

Wenn DNS zu 192.168.178.1 geht → Profil falsch.

---

## 6. Typische Fehlerbilder

### Problem:
Safari: „Server nicht gefunden“

Ursache:
DNS im WG-Profil zeigt auf Fritzbox.

---

### Problem:
Handshake OK, aber kein Zugriff auf LAN

Ursache:
Fehlendes NAT oder ip_forward=0

---

### Problem:
Seite lädt nicht, aber DNS korrekt

Ursache:
Firewall blockiert Forwarding.

---

## 7. Designprinzipien

- Ein Resolver.
- Kein Client-Sonderzustand.
- DNS im VPN-Profil explizit setzen.
- AllowedIPs bewusst wählen.
- Tests über tcpdump verifizieren.

---

## 8. Status

Stand: funktionierend
Verifiziert via tcpdump und HTTPS 200 OK.

EOF