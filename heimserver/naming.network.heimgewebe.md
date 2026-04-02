# naming.network.heimgewebe

Status: KANONISCH
Scope: Heimnetz + WireGuard + DNS
Zweck: Eindeutige, driftfreie Namensordnung

---

## 1. Grundprinzip

Ein System.
Eine DNS-Quelle.
Explizite Rollen im Namen.

Keine impliziten Bedeutungen.
Keine doppelte Semantik.

---

## 2. Zonenstruktur

Interne Zone (Primär):

    heimgewebe.home.arpa

Begründung:
.home.arpa ist RFC-konform für interne Netze.

Externe Zone:
    keine (intern-only Architektur)

---

## 3. Hostnamen

Schema:

    <rolle>.<system>.heimgewebe.home.arpa

Beispiele:

    leitstand.heimgewebe.home.arpa
    heimserver.heimgewebe.home.arpa
    pihole.heimgewebe.home.arpa
    edge.heimgewebe.home.arpa

Regel:
Keine IPs in Dokumentation verwenden.
Nur DNS-Namen.

---

## 4. WireGuard-Namenskonvention

Tunnel-Namen entsprechen dem System, nicht dem Gerätetyp.

Erlaubt:

    heimserver
    heimserver-mobile
    heimserver-admin

Nicht erlaubt:

    fritz-tunnel
    vpn1
    test

Begründung:
Tunnel beschreibt Zielsystem, nicht Transportweg.

---

## 5. IP-Ordnung

VPN-Netz:

    10.7.0.0/24

Server:

    10.7.0.1

Clients:

    10.7.0.X (statisch vergeben, dokumentiert)

LAN:

    192.168.178.0/24

DNS-Authority:

    192.168.178.46 (Pi-hole)

---

## 6. DNS-Regeln

Primärer Resolver für VPN-Clients:

    192.168.178.46

Fritzbox ist Gateway.
Nicht Authority.

Split-DNS ist untersagt.

---

## 7. Caddy Host-Blöcke

Jeder Service erhält exakt einen FQDN.
Keine Mehrdeutigkeit.

Beispiel:

    leitstand.heimgewebe.home.arpa {
        reverse_proxy 127.0.0.1:3000
    }

Keine IP-Hosts.
Keine Wildcards ohne Begründung.

---

## 8. Persistenzregeln

- NAT-Regeln persistent
- WireGuard-Konfiguration versioniert
- DNS-Einträge dokumentiert

Dokument ist Source-of-Truth.
Nicht die Fritzbox-GUI.

---

## 9. Drift-Indikatoren

Wenn eines zutrifft, ist Naming inkohärent:

- DNS im Client zeigt auf Router
- Zwei unterschiedliche Resolver liefern verschiedene Antworten
- Tunnel-Name beschreibt Technik statt System
- IP wird als primäre Adresse benutzt

---

## 10. Kanonischer Zustand

- Tunnel aktiv
- DNS = Pi-hole
- AllowedIPs bewusst gewählt
- FQDN funktioniert über VPN
- Keine IP-Aufrufe notwendig

---

Stand: funktionierend