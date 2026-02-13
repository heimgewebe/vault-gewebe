Hier ist eine neu erstellte, konsolidierte und kanonische code.server.md, die alles Gelernte (Architekturentscheidung, systemd-Unit, Blink-Eigenheiten, SSH-Nick, Repo-Struktur) sauber integriert.
Du kannst sie 1:1 als neue Datei ablegen.

⸻


# Heimserver – VS Code Web (code-server)

Stand: 2026-01-22  
Host: heimserver  
OS: Ubuntu 24.04.3 LTS  
User: alex

---

## Zweck & Zielbild

Ziel ist eine **stabile, sichere und iPad-taugliche Entwicklungsumgebung**, bei der:

- VS Code als **Web UI** genutzt wird
- alle Rechenlast auf dem Heimserver liegt
- Zugriff ausschließlich **transportiert**, nicht exponiert wird
- Copilot, Codex und Jules innerhalb von VS Code nutzbar sind
- kein Reverse Proxy, kein öffentlich erreichbarer Port notwendig ist

---

## Architekturentscheidung

### Gewählte Variante: **Option A – SSH-Tunnel only**

- `code-server` bindet **ausschließlich lokal** (`127.0.0.1`)
- Zugriff erfolgt **nur über SSH Port-Forwarding**
- WireGuard stellt lediglich den Transport bereit
- kein TLS, kein Caddy, kein offener HTTP/HTTPS-Port

**Begründung:**

- minimaler Angriffsraum
- keine zusätzliche Komplexität
- optimal für iPad + Blink
- vollständig kontrollierbar und reversibel

---

## Komponenten

| Komponente | Rolle |
|---|---|
| WireGuard | sicherer Transport iPad ↔ Heimserver |
| Blink (iPad) | SSH + Portforward |
| code-server | VS Code Web UI |
| systemd (user) | Autostart & Stabilität |
| VS Code Extensions | Copilot, GitHub, etc. |
| Jules CLI | asynchroner Coding-Agent |

---

## Repository-Struktur (kanonisch)

```text
~/repos/
├─ heimgewebe/   → interner Organismus
├─ weltgewebe/   → öffentliche / diskursive Systeme
└─ misc/         → eigene Einzelprojekte (z. B. icf-tool)

Regeln:
	•	Repos entstehen nur per git clone
	•	keine leeren Repo-Ordner anlegen
	•	Migration zwischen Kategorien ist erlaubt und erwartet

Arbeits- und Hilfsverzeichnisse:

~/work/        → git worktrees, parallele PRs
~/artifacts/   → Exporte, Patches, Bundles
~/logs/        → Sessions, Agent-Logs
~/tmp/         → temporär


⸻

code-server Konfiguration

Pfad

~/.config/code-server/config.yaml

Kanonischer Inhalt

bind-addr: 127.0.0.1:8080
auth: password
password: <starkes_passwort>
cert: false

Wichtig:
	•	kein 0.0.0.0
	•	kein --without-connection-token
	•	kein TLS (läuft nur lokal)
	•	Auth bleibt aktiv (Defense in Depth)

⸻

systemd User Service

Pfad

~/.config/systemd/user/code-server.service

Finale Version

[Unit]
Description=code-server (VS Code Web UI)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/code-server --config %h/.config/code-server/config.yaml
Restart=always
RestartSec=2
StandardOutput=journal
StandardError=journal

# optionale Limits (bewusst konservativ)
# MemoryMax=2G
# CPUQuota=200%

[Install]
WantedBy=default.target

Aktivierung

systemctl --user daemon-reload
systemctl --user enable --now code-server

Autostart auch ohne aktive Login-Session:

sudo loginctl enable-linger alex

Status & Kontrolle

systemctl --user status code-server --no-pager
ss -lntp | grep 8080

Erwartet:

LISTEN 127.0.0.1:8080

Logs:

journalctl --user -u code-server -n 200 --no-pager


⸻

Zugriff vom iPad (Blink)

Prinzip

Der Tunnel läuft auf dem iPad, weil dort der Browser sitzt.
Auf dem Heimserver selbst darf kein zusätzlicher Tunnel laufen (Port wäre belegt).

⸻

SSH-Nick vsc (empfohlen)

~/.ssh/config auf dem iPad (Blink):

Host vsc
  HostName 10.7.0.1
  User alex
  LocalForward 8080 127.0.0.1:8080
  ExitOnForwardFailure yes
  ServerAliveInterval 30
  ServerAliveCountMax 3
  RequestTTY no
  RemoteCommand /bin/true

Effekt:
	•	kein Login-Shell
	•	kein MOTD
	•	reiner Tunnel

Tunnel starten

ssh vsc

	•	Passwortabfrage normal (solange kein SSH-Key auf dem iPad)
	•	Verbindung bleibt offen

Browser (iPad)

http://127.0.0.1:8080


⸻

Häufige Stolpersteine

Port 8080 lokal belegt (iPad)

Fix:

LocalForward 18080 127.0.0.1:8080

Browser:

http://127.0.0.1:18080


⸻

Blink-Eigenheiten
	•	kein nano
	•	chmod evtl. nicht verfügbar
	•	Copy/Paste kann Zeilenumbrüche entfernen

Regel:
Ein Befehl = eine Zeile = Enter.

⸻

Jules (CLI) auf dem Heimserver

Login ohne GUI:

jules login --no-launch-browser

Parallele Sessions:

jules new --repo <owner/repo> --parallel 3 "<task>"
jules remote list --session
jules remote pull --session <id> --apply


⸻

Sicherheitseigenschaften

✔ kein offener HTTP/HTTPS-Port
✔ kein Reverse Proxy
✔ kein 0.0.0.0 Binding
✔ Zugriff nur mit:
	•	WireGuard
	•	SSH
	•	code-server Auth

⸻

Erweiterungen (bewusst nicht aktiv)
	•	Caddy + TLS
	•	SSH-Key Auth auf dem iPad
	•	systemd Resource Limits
	•	getrennte VS-Code-Profile

⸻

Verdichtete Essenz

Der Dienst bleibt lokal.
Der Zugriff reist.

Alles andere ist unnötige Oberfläche.

⸻

Ungewissheitsanalyse
	•	Unsicherheitsgrad: 0.05
	•	Ursache: mögliche zukünftige Erweiterungen (Proxy/TLS)
	•	Status: stabil, produktionsfähig für den aktuellen Use-Case

---

Wenn du willst, mache ich als nächsten Schritt **eine zweite Datei**:

- `ssh.vsc.md` (nur Tunnel & Blink)
- oder `git.worktrees.md` (mehrere PRs parallel, sauber erklärt)
- oder `jules.workflow.md` (Jules + VS Code + PR-Flow)

Sag einfach.