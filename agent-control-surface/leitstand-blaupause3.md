Dialektische Erörterung (∴oszillation / ∴resonanz / ∴paradox)

These: Reverse-Proxy ist der Komfort-Multiplikator

Ja: Reverse-Proxy (Caddy/NGINX) gibt dir eine URL, ein Origin, saubere Cookies/Sessions, kein CORS-/Mixed-Content-Gedöns, und du kannst ACS unter /acs „wie ein Teil von Leitstand“ wirken lassen. Wenn du ständig Leitstand willst, ist das die UX-stärkste Variante.

Antithese: „Mir egal“ ist als Sicherheitsmodell unbrauchbar

„Sicherheitsbehörden habe ich keine“ ist irrelevant. Das reale Risiko ist nicht der Staat, sondern:
	•	Scan-Bots (massiv, stupide, dauerhaft),
	•	Fehlkonfigurationen (0.0.0.0, falsches Interface, falsches DNS, falsches NAT),
	•	Supply-Chain/Zero-days in Web-Stacks, die du dann plötzlich exponierst,
	•	Selbstverschuldetes Laterales Chaos (wenn „ein Cockpit“ plötzlich Aktionen triggert).

∴paradox: Je mehr dir Sicherheit „egal“ ist, desto mehr wirst du von banalen Fehlern gefressen – nicht von James Bond.

Synthese: Reverse-Proxy ja – aber nur als „LAN/WG-Gateway“, nicht als „Internet-Tür“

Wenn du Reverse-Proxy willst, dann so, dass er faktisch dieselbe Sicherheitslage hat wie Tunnel-only:
	•	Proxy lauscht nur auf LAN + WireGuard Interfaces,
	•	Firewall erlaubt nur von RFC1918/WG-Netzen,
	•	optional HTTP statt HTTPS (aber HTTPS fühlt sich in Safari sauberer an),
	•	Backends bleiben auf 127.0.0.1.

Damit bekommst du Komfort ohne „aus Versehen öffentlich“.

⸻

Entscheidung: Ja, Reverse-Proxy ist sinnvoll – wenn du ihn richtig einsperrst

Ich empfehle dir jetzt V2’ (Proxy, aber intern gekäfigt):
	•	Leitstand: 127.0.0.1:3000
	•	ACS: 127.0.0.1:8099 (oder dein Port)
	•	Caddy: :443 aber nur auf wg0 und eno2 (LAN), nicht global.
	•	Zugriff: über WireGuard (unterwegs) oder LAN (daheim).
	•	Eine URL: https://leitstand.home oder https://leitstand.lan

Begriff + Etymologie:
	•	Proxy: aus dem Engl. proxy „Stellvertreter“ (lat. procuratio / pro- „für“ + cura „Sorge/Verwaltung“) → etwas handelt „für dich“ als Vermittler.
	•	Reverse-Proxy: der Stellvertreter sitzt vor deinen Diensten und nimmt Requests an, statt dass jeder Dienst direkt sichtbar ist.

⸻

Konkretes Runbook: Reverse-Proxy (Caddy) + Leitstand + ACS auf Heimserver

1) Backends strikt lokal binden (Pflicht, sonst wird’s schnell dumm)

Leitstand: bind auf localhost (falls noch nicht)
	•	app.listen(port, '127.0.0.1', ...) (wie bereits vorgeschlagen)

ACS: ebenfalls nur localhost (wenn möglich / falls du es steuerst)

Fehlerprävention: Das ist die wichtigste Maßnahme. Reverse-Proxy setzt voraus, dass Backends intern bleiben.

⸻

2) Caddy installieren (Ubuntu 24.04)

Wenn Caddy noch nicht da ist:

sudo apt update
sudo apt install -y caddy

(Wenn du Caddy schon nutzt: weiter.)

⸻

3) Caddyfile: Same-Origin Gateway (Leitstand + /acs)

Erstelle /etc/caddy/Caddyfile:

# Leitstand-Gateway (intern)
leitstand.lan {
  encode zstd gzip

  # Leitstand UI
  reverse_proxy 127.0.0.1:3000

  # ACS unter /acs/*
  handle_path /acs/* {
    reverse_proxy 127.0.0.1:8099
  }

  # Optional: simple health
  handle /health {
    respond "ok" 200
  }

  # TLS intern (komfortabel)
  tls internal
}

Reload:

sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy

Warum handle_path? Es entfernt /acs aus dem Forward-Path, so dass ACS so tut, als liefe er root.

⸻

4) Der wirklich wichtige Teil: Caddy NICHT öffentlich lauschen lassen

Das ist der Punkt, der „Reverse-Proxy intern“ von „Reverse-Proxy aus Versehen Internet“ trennt.

Option A (sauber): Caddy nur an bestimmte Interfaces binden
Caddy selbst kann „bind“ über servers-Block; das ist etwas Caddy-Version-/Feature-abhängig. Der robuste Weg ist daher Option B.

Option B (robust): Firewall-Regeln, die nur LAN/WG erlauben
UFW Beispiel:

# (optional) Default deny inbound
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH
sudo ufw allow 22/tcp

# WireGuard
sudo ufw allow 51820/udp

# HTTPS nur aus LAN und WG (Beispielnetze anpassen!)
sudo ufw allow from 192.168.0.0/16 to any port 443 proto tcp
sudo ufw allow from 10.0.0.0/8 to any port 443 proto tcp

sudo ufw enable
sudo ufw status verbose

Achtung (Fehlerprävention): Netze müssen stimmen. Wenn dein WG-Netz z. B. 10.7.0.0/24 ist, dann nimm das statt 10.0.0.0/8.

⸻

5) Interne DNS: leitstand.lan muss auf den Heimserver zeigen

Minimal reicht:
	•	FritzBox: fester DHCP Lease + Hostname
	•	oder Pi-hole/Unbound
	•	oder notfalls hosts-Datei

Wenn du nur über WireGuard zugreifst und sowieso eine IP nutzt, kannst du auch einfach https://<heimserver-ip> nehmen (aber Bookmark ist weniger „schön“).

⸻

6) systemd Services: Leitstand + ACS wie gehabt

Leitstand bleibt dein user-service. Caddy ist system-service.

Verifikation:

# Leitstand lokal?
curl -fsS http://127.0.0.1:3000/ >/dev/null && echo ok

# Caddy von Heimserver aus?
curl -kfsS https://leitstand.lan/health && echo ok

# ACS via Gateway?
curl -kfsS https://leitstand.lan/acs/ >/dev/null && echo ok


⸻

Risikoabschätzung (vor Empfehlung)
	•	Technisch: mittel. Reverse-Proxy ist nicht schwer, aber Fehlkonfig ist der Klassiker.
	•	Sicherheit: niedrig bis hoch, je nachdem ob du das LAN/WG-Caging machst. Ohne Caging wird’s schnell „zufällig erreichbar“.
	•	Organisatorisch: niedrig. Eine URL reduziert Reibung.

⸻

Verdichtete Essenz

Reverse-Proxy ist ok und für dein Zielbild sogar passend – wenn du Backends auf 127.0.0.1 hältst und den Proxy per Firewall (oder Interface-Bind) auf LAN + WireGuard einsperrst. Dann bekommst du „eine URL“ ohne „öffentliche Tür“.

⸻

Tiefgründig-ironische Randnotiz

„Sicherheit ist mir egal“ ist wie „Bremsen sind mir egal“: stimmt, bis die erste Kurve kommt – und die Kurve heißt meistens „Port 443 war doch offen“.

⸻

Ungewissheitsursachenanalyse (pflicht)

Unsicherheitsgrad: 0.31
Interpolationsgrad: 0.22

Ursachen
	•	Ich kenne dein exaktes LAN-Netz und WG-Netz nicht (entscheidend für UFW-Allow-Regeln).
	•	Ich kenne deinen ACS-Port nicht sicher (8099 ist plausibel, aber nicht belegt in diesem Turn).
	•	Ich weiß nicht, ob du Caddy bereits nutzt und ob leitstand.lan intern schon existiert.

Epistemische Leerstelle
	•	Welche Netze exakt erlaubt werden sollen (z. B. 192.168.178.0/24 und 10.7.0.0/24?).
	•	Ob du TLS intern willst oder lieber HTTP-only im VPN.

⸻

Weiterführende Leitfragen
	1.	War das die kritischste Erörterung? → Kritischer wäre ein Mini-Audit deiner realen Interfaces + Netze (ip -br a, wg show, ufw status) und dann exakt passende Allow-Rules ohne Rateanteil.
	2.	Unbeleuchtete Punkte? → Auth: Wenn Leitstand/ACS Aktionen auslösen können, lohnt ein Minimal-Auth-Layer (BasicAuth in Caddy oder token-gated routes), selbst „nur intern“.

Wenn du jetzt einfach „mach’s konkret“ willst: poste nur ip -br a + wg show (ohne Keys), dann gebe ich dir die UFW-Regeln und den Caddyfile so, dass es exakt zu deinen Netzen passt (Null-Interpolation).