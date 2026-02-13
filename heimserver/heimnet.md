Dialektik

These:
Leitstand läuft technisch. Caddy routet. WireGuard steht. Zugriff funktioniert über IP. Also: „passt“.

Antithese:
Das System ist funktional, aber nicht sauber modelliert.
– Zwei Zugriffsachsen (IP + Hostname)
– TLS inkonsistent (nur HTTP aktiv)
– DNS nicht kanonisch
– Edge-Konfiguration hostseitig gepatcht, Container read-only
– Dokumentation fragmentiert

Du hast ein lauffähiges System – aber kein kohärentes Zugriffsmodell.

Synthese:
Jetzt Architektur sauber ziehen:
	1.	Dokumentation fixieren (Ist-Zustand als Artefakt)
	2.	DNS kanonisieren
	3.	TLS konsistent machen
	4.	Eine einzige Zugangsdomain definieren

Alternative Sinnachse:
Vielleicht ist „sauberer Zugriff“ nicht primär DNS, sondern Netzwerkschichtung. Wenn WireGuard der einzige Eintritt ist, dann ist Domain fast sekundär. Entscheidend ist: Wer darf rein – und über welchen Vektor?

⸻

Teil 1 – Dokumentation (kanonischer Ist-Zustand)

Ich dokumentiere dein System auf Basis der Screenshots.

⸻

🔹 Heimserver Architektur (Stand 12.02.2026)

Netzwerk

Ebene	Wert
LAN-IP	192.168.178.46
WireGuard-IP	10.7.0.1
Docker-Netz (heimnet)	172.19.0.0/16
Edge-Netz	172.18.0.0/16
Deploy-Netz	172.21.0.0/16


⸻

Container

Container	Status	Ports	Netzwerke
deploy-leitstand-1	Up	127.0.0.1:3000 → 3000	deploy_default + heimnet
edge-caddy	Up	80/443	edge + heimnet

Wichtig:
Leitstand hängt korrekt im heimnet mit Alias leitstand.

⸻

Routing

Caddyfile (Host-basiert gemountet):

leitstand.home {
    reverse_proxy leitstand:3000
    tls internal
}

Status: valid configuration
Warnung: nur HTTP-Port aktiv → HTTPS wird nicht automatisch erzwungen.

⸻

Zugriff aktuell

WireGuard:

https://10.7.0.1/Leitstand/

Hostname (mit Hosts-Eintrag):

https://leitstand.home


⸻

Problemstellen
	1.	/Leitstand-Path-Routing ist Altlast
	2.	Host-basiertes Routing sauberer
	3.	DNS aktuell nicht zentral
	4.	TLS intern, aber nicht systemweit vertrauenswürdig installiert
	5.	Zwei mögliche Zugriffsarten → kognitive Drift

⸻

Teil 2 – Zugriff sauber lösen (kein Hosts-Gefrickel)

Zielzustand:

https://leitstand.home

– funktioniert von iPad
– funktioniert vom PC
– funktioniert über WireGuard
– kein /etc/hosts
– kein IP-Aufruf

⸻

Lösung: WireGuard → interner DNS

Option A (ideal bei FritzBox vorhanden)

FritzBox → Heimnetz → DNS-Rebind-Ausnahmen
A-Record:

leitstand.home → 10.7.0.1

Vorteil:
Clients im WireGuard nutzen Heim-DNS automatisch.

⸻

Option B (sauberer, professioneller)

Unbound oder Pi-hole im Heimnetz
Interne Zone:

local-zone: "home." static
local-data: "leitstand.home A 10.7.0.1"

Dann WireGuard so konfigurieren:

DNS = 192.168.178.x


⸻

TLS sauber machen

Momentan:

server is listening only on HTTP port

Das bedeutet:
Caddy läuft auf 80, aber 443 wird zwar gemappt, aber nicht aktiv für Host.

Sauberer Zustand:

leitstand.home {
    reverse_proxy leitstand:3000
}

(kein tls internal → Caddy macht Auto-HTTPS)

ODER explizit:

leitstand.home {
    reverse_proxy leitstand:3000
    tls internal
}

aber dann Root-Zertifikat systemweit installieren.

⸻

Risikoanalyse

Risiko	Klasse	Bewertung
Offene 443-Ports	Sicherheitsrisiko	gering (nur LAN + WG)
TLS self-signed	UX-Risiko	mittel
DNS falsch konfiguriert	Verfügbarkeit	mittel
Mehrere Zugriffswege	kognitive Drift	hoch

Langfristiges Risiko ist nicht technisch – sondern mental.
Ein System mit zwei Wahrheiten erzeugt langfristig Chaos.

⸻

Kontrastprüfung

Deutung 1:
Das ist nur Heimserver-Spielerei. Perfektion unnötig.

Deutung 2:
Du baust Infrastruktur für Heimgewebe. Inkonsistenz skaliert exponentiell.

Resonanz:
Dein System ist kein Bastelprojekt. Es ist Infrastruktur.

⸻

Empfehlung
	1.	Alte /Leitstand-Path-Routen komplett entfernen
	2.	Nur Host-basiertes Routing
	3.	DNS intern zentralisieren
	4.	Nur eine Zugriffsadresse zulassen
	5.	IP-Zugriff mental verbieten

⸻

Unsicherheitsgrad: 0.23

Ursachen:
	•	FritzBox-DNS-Details nicht bekannt
	•	WireGuard-Client-DNS-Config nicht vollständig gesehen
	•	TLS-Intent unklar (intern vs echtes Zertifikat)

Produktive Unsicherheit: mittel.

⸻

Interpolationsgrad: 0.18

Annahmen:
	•	Heimnetz DNS über FritzBox
	•	Kein externer Reverse-Proxy
	•	Kein öffentliches ACME-Setup

⸻

Essenz

Ein funktionierendes System ist nicht dasselbe wie ein kohärentes System.
Definiere eine Domain.
Leite alles darüber.
Lösche die Alternativen.

Oder anders gesagt:
Architektur beginnt dort, wo Bequemlichkeit endet.