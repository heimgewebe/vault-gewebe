# heimserver – Leitstand / Caddy / Firewall  
## Zwischenstand & Audit-Dokumentation (KANONISCHER ARBEITSSTAND)

Stand: 2026-02-03  
Host: heimserver  
Autor: alex  
Status: **operativ, stabilisiert – noch nicht final integriert**  

⛔️ **Hinweis:** Dieses Dokument ist ein Arbeits- und Auditprotokoll.  
Es wird **nach Abschluss** in `heimserver.context.md` integriert.  
Zwischenstände dürfen hier explizit sein.

---

## 1. Ziel & Leitmotiv

**Zielbild (ideal):**

- Leitstand als **ständig erreichbares Cockpit**
- erreichbar **im LAN und über WireGuard**
- **eine URL**, ein Origin, keine Tunnel-Rituale
- keine versehentliche Öffentlichkeit
- klare Trennung:
  - *Transport* (WireGuard)
  - *Gateway* (Caddy)
  - *Backends* (Leitstand, ACS, Weltgewebe-API)

**Architekturmaxime:**  
> *Compose ist Wahrheit. Host-Services sind Hilfskonstrukte.*

---

## 2. Ausgangslage (vor Eingriffen)

### 2.1 Netzwerk

- LAN: `192.168.178.46/24`
- WireGuard: `10.7.0.1/24`
- Docker-Bridge(s): vorhanden
- WireGuard aktiv, stabil

### 2.2 Dienste

- **Docker-Caddy** existiert als Teil des *Weltgewebe-Compose*
- **Host-Caddy** war zusätzlich installiert (systemd)
- Leitstand & ACS liefen (teilweise) als Host-Services (`127.0.0.1`)
- UFW **nicht** initial aktiv

---

## 3. Kritischer Befund (Audit)

### 3.1 Doppel-Caddy-Konflikt

Es existierten **zwei Caddy-Instanzen**:

1. Docker:
   - Container: `compose-caddy-1`
   - Admin-Port: `127.0.0.1:2019`
   - Ports: `127.0.0.1:80`, `127.0.0.1:443`
2. Host (systemd):
   - versuchte ebenfalls `127.0.0.1:2019`

**Folge:**  
- systemd-Caddy konnte nicht starten  
- Admin-Port-Kollision (`address already in use`)  
- unklare Wahrheitsebene

**Bewertung:** ❌ Architekturbruch

---

## 4. Getroffene Entscheidungen (KANONISCH)

### 4.1 Caddy-Instanz

- **Docker-Caddy ist kanonisch**
- systemd-Caddy ist **verboten**

Maßnahmen:
```bash
sudo systemctl disable --now caddy
sudo systemctl mask caddy

Status:
	•	Loaded: masked
	•	Host-Caddy endgültig außer Betrieb

⸻

5. Docker-Caddy – Ist-Zustand

5.1 Containerstatus

compose-caddy-1   Up   restart=unless-stopped

Restart-Policy bewusst gesetzt:

unless-stopped

5.2 Aktuelle Port-Bindings (IST)

127.0.0.1:80   -> 80/tcp
127.0.0.1:443  -> 443/tcp
127.0.0.1:2019 -> 2019/tcp (Admin)

Bewertung:
	•	sicher
	•	aber nur lokal erreichbar
	•	noch kein LAN/WG-Gateway

⸻

6. Aktuelle Caddyfile (Weltgewebe)

(Auszug, relevant)

{
        encode zstd gzip

        handle_path /api/* {
                reverse_proxy api:8080
        }

        handle /health/* {
                reverse_proxy api:8080
        }

        handle /health/proxy {
                respond 200
        }

        reverse_proxy /* {env.WEB_UPSTREAM_URL} {
                header_up Host {env.WEB_UPSTREAM_HOST}
                header_up X-Forwarded-Proto {scheme}
                header_up X-Forwarded-Host {host}
                header_up X-Forwarded-For {remote_host}
        }

        header {
                X-Frame-Options "DENY"
                Referrer-Policy "no-referrer"
                X-Content-Type-Options "nosniff"
        }
}

Bedeutung:
	•	/ → externer Web-Upstream (Cloudflare/Vercel)
	•	/api/* → interner API-Container
	•	kein Leitstand, kein ACS

⸻

7. Firewall – neu eingeführt

7.1 UFW Grundkonfiguration

Default: deny incoming
Default: allow outgoing

7.2 Erlaubte Zugriffe

SSH 22/tcp:
- 192.168.178.0/24
- 10.7.0.0/24

WireGuard:
- 51820/udp (any)

HTTPS 443/tcp:
- 192.168.178.0/24
- 10.7.0.0/24

IPv6: deaktiviert.

Bewertung:
✔ korrekt
⚠️ Docker kann UFW umgehen → DOCKER-USER nötig

⸻

8. Offene technische Wahrheiten (bewusst)

8.1 Leitstand
	•	aktuell kein Container
	•	mutmaßlich Host-Service (127.0.0.1:3000)
	•	muss für „idealen Weg“ in Compose überführt werden

8.2 ACS
	•	Host-Service (127.0.0.1:8099, uvicorn)
	•	kann entweder:
	•	interimistisch via host-gateway angebunden werden
	•	oder ebenfalls containerisiert werden

⸻

9. Idealer Weg (vorab festgelegt, noch nicht umgesetzt)

Weg 2 – sauber & kanonisch:
	•	Leitstand als Compose-Service
	•	ACS optional ebenfalls Compose-Service
	•	Docker-Caddy proxyt intern:
	•	leitstand:3000
	•	acs:8099
	•	Caddy published:
	•	443 auf 192.168.178.46 und 10.7.0.1
	•	zusätzliche Absicherung:
	•	DOCKER-USER chain (iptables)
	•	DNS:
	•	leitstand.lan

Warum dieser Weg:
	•	keine Host-↔Container-Sonderpfade
	•	keine host.docker.internal-Magie
	•	maximale Kohärenz mit Weltgewebe-Invarianten
	•	langfristig wartbar

⸻

10. Bewusster Stopppunkt

Bis hierhin wurde nur stabilisiert, nicht erweitert.

✔ Host-Caddy eliminiert
✔ Docker-Caddy eindeutig
✔ Firewall eingeführt
✔ Konflikte sichtbar gemacht

Nächster Schritt (nach dieser Doku):

Leitstand als Compose-Service entwerfen und integrieren
(inkl. sauberer Caddy-Site leitstand.lan)

⸻

11. Verdichtete Essenz

Zwei Caddys waren ein Fehler.
Jetzt gibt es eine Wahrheit.
Der ideale Weg führt vollständig über Compose.

⸻

12. Ungewissheitsursachenanalyse

Unsicherheitsgrad: 0.18

Ursachen:
	•	Leitstand ist noch kein Container
	•	endgültige Caddy-Sites noch nicht definiert
	•	DOCKER-USER-Persistenz noch offen

Bewertung:
Diese Unsicherheiten sind strukturell, nicht chaotisch,
und werden im nächsten Schritt gezielt aufgelöst.

