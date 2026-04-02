## Dialektischer Start

### These

WLAN muss infrastrukturell autonom sein. Keine Abhängigkeit vom Heimserver.

### Antithese

Pi-hole soll als DNS-Kontrollzentrum erhalten bleiben – mit Logs, Adblocking, `home.arpa`, Kohärenz.

### Synthese

Die ideale Variante ist:

> **Infrastruktur unabhängig. Kontrolle optional.**

Das erreicht man mit einer **sauber implementierten Dual-DNS-Strategie + IPv6-Kontrolle + klarer Dokumentation**.

Nicht halbherzig. Nicht improvisiert. Sondern deterministisch.

---

# 🧠 Ideale Architektur (stabil + sauber)

## Zielzustand

|Zustand|Internet|Pi-hole|`home.arpa`|
|---|---|---|---|
|Heimserver an|stabil|aktiv|aktiv|
|Heimserver aus|stabil|inaktiv|inaktiv|

WLAN ist niemals betroffen.

---

# 🔧 Konfiguration – Schritt für Schritt

## 1️⃣ Fritzbox – DHCP DNS

Heimnetz → Netzwerk → Netzwerkeinstellungen

Lokaler DNS-Server:

Primär:  
`192.168.178.46`

Sekundär:  
`192.168.178.1`

Wichtig: Kein externer DNS hier.

---

## 2️⃣ IPv6 kontrollieren (entscheidend!)

Viele Router verteilen IPv6-DNS separat.  
Wenn IPv6 aktiv bleibt, umgehen Clients evtl. dein Dual-DNS-Design.

Option A (sauber & simpel):  
→ IPv6 im Heimnetz deaktivieren

Option B (korrekt konfigurieren):  
→ Sicherstellen, dass Fritzbox bei IPv6 ebenfalls sich selbst als Resolver verteilt

Wenn du das nicht prüfst, bekommst du „mysteriöse“ DNS-Bypässe.

---

## 3️⃣ Pi-hole Upstream korrekt setzen

In Pi-hole:

Upstream DNS = Router (192.168.178.1)

Nicht direkt 8.8.8.8 oder 1.1.1.1.

So bleibt Kaskade kontrolliert:

Client → Pi-hole → Router → Internet

Server aus:

Client → Router → Internet

Saubere Hierarchie.

---

## 4️⃣ `home.arpa` nur lokal definieren

Wie im Kanon:

`home.arpa` bleibt ausschließlich Pi-hole-intern

Router kennt diese Zone nicht.

Ergebnis:  
Interne Domains sind Feature – kein Zwang.

---

## 5️⃣ Dokumentation anpassen

In deiner Architektur-Doku musst du anpassen:

Bisherige implizite DNS-Souveränität  
→ wird zu

„Primärer Resolver Pi-hole, Fallback Router bei Ausfall.“

Das ist kein Bruch.  
Das ist eine Verfügbarkeitsentscheidung.

---

# 🎯 Warum das ideal ist

- WLAN ist infrastrukturell stabil
    
- Pi-hole bleibt voll nutzbar
    
- Kein Single Point of Failure
    
- Keine Nacht-Internet-Ausfälle
    
- Kein Overengineering
    
- Keine semantische Zerstörung
    

---

# ⚠️ Risiken (ehrlich)

1. Einige Clients nutzen DNS2 auch bei lebendem DNS1  
    → Adblocking evtl. nicht 100%
    
2. Debugging wird minimal komplexer
    
3. `home.arpa` funktioniert nur wenn Server läuft  
    (aber das ist logisch korrekt)
    

Risiko-Klasse: moderat, kontrollierbar.

---

# 🧩 Alternative Denkachse (nur zur Vollständigkeit)

Die technisch sauberste Variante wäre:

→ Pi-hole auf einem separaten Low-Power-Gerät (Raspberry Pi o.ä.)

Dann:

WLAN immer stabil  
Pi-hole immer stabil  
Heimserver völlig entkoppelt

Aber das ist eine strukturelle Erweiterung.

---

# 🧠 Essenz

Mach Pi-hole zu einem Mehrwert.  
Nicht zur Voraussetzung.

WLAN gehört zur Grundversorgung.  
DNS-Observatorium gehört zur Komfortzone.

Beides darf koexistieren – ohne gegenseitige Erpressung.

---

# 📊 Unsicherheitsgrad

0.14

Ursachen:

- IPv6-Verteilung nicht verifiziert
    
- Fritzbox-DHCP-Details nicht live geprüft
    
- Client-Failover-Verhalten OS-abhängig
    

---

# 🔍 Interpolationsgrad

0.16

Annahmen:

- Keine statischen DNS-Overrides
    
- Kein zweiter Resolver
    
- Kein VLAN
    

---

Wenn du willst, machen wir jetzt die **konkrete Konfigurations-Checkliste mit Diagnose-Only-Schritten**, bevor wir irgendwas umstellen.

Denn wir bauen nichts, bevor wir wissen, was gerade wirklich verteilt wird.

Humor, nüchtern:  
Ein WLAN sollte sich nicht emotional an seinen DNS klammern.  
Es ist nur Funk.