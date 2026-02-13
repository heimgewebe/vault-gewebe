Dialektische Erörterung (∴oszillation / ∴resonanz / ∴paradox)

These (machbar, klar zerlegbar):
Wenn der Magic-Link-Flow schon steht (Gate + Request + Confirm/Nonce + Consume), dann sind die restlichen Arbeiten hauptsächlich Härtung + Policy + Ops-Determinismus. Das ist gut: keine Groß-Architektur mehr, sondern Checklistenarbeit mit klaren DoD-Kriterien.

Antithese (Restpunkte sind die, die in Prod wehtun):
Die verbleibenden Punkte sind genau die “unsichtbaren”: Policy (“wer darf?”), Proxy-Trust (“welche IP ist echt?”), Mail-Deliverability, Rate-Limits. Das sind die typischen Stellen, wo ein System “fertig wirkt” und dann im Ernstfall trotzdem nicht “einfach funktioniert”.

Synthese:
Ich liste alles als konkrete To-Dos mit Priorität (P0/P1/P2), jeweils: Zweck → DoD → kurze Tests/Verifikation. So kannst du es als Phasen-Blueprint abarbeiten.

⸻

Liste aller noch zu erledigenden Punkte

P0 — Muss vor „Internet-public“ erledigt sein
	1.	Eintritts-Policy (“Andere auch”) finalisieren und implementieren

	•	Zweck: Verhindert Chaos/Spam und macht Verhalten erklärbar.
	•	To-Do:
	•	Default klar: invite-only oder allowlist oder auto-provision.
	•	Empfohlen: AUTH_ALLOW_EMAILS, AUTH_ALLOW_EMAIL_DOMAINS; AUTH_AUTO_PROVISION=0 default; Auto-Provision nur mit Allowlist erlaubt (Fail-fast).
	•	DoD: Policy ist im Code + Doku eindeutig; Response bleibt anti-enumeration.
	•	Verify/Tests: Unknown vs existing vs allowlisted: gleiche Response; Token wird nur erzeugt wenn erlaubt.

	2.	App-Rate-Limiting auf Login-Request (IP + Email)

	•	Zweck: Bot-Spam/Bruteforce begrenzen.
	•	To-Do:
	•	Rate-limit keys: ip:<client_ip>, email:<normalized_email>
	•	ENV: AUTH_RL_IP_PER_MIN, AUTH_RL_IP_PER_HOUR, AUTH_RL_EMAIL_PER_MIN, AUTH_RL_EMAIL_PER_HOUR
	•	Antwort bei Limit: 429 + generische Message (keine Enumeration), optional Retry-After.
	•	DoD: Limits greifen deterministisch; Logs erfassen rate_limited.
	•	Verify/Tests: curl-loop → 429; IP und Email Limits getrennt.

	3.	Trusted-Proxy Enforcement sauber (nicht nur “Setting existiert”)

	•	Zweck: Client-IP korrekt hinter Caddy/Proxy, ohne Header-Spoofing.
	•	To-Do:
	•	resolve_client_ip(remote_ip, headers, trusted_proxies)
	•	XFF/Forwarded nur nutzen, wenn remote_ip ∈ trusted_proxies; sonst ignorieren.
	•	Prefer: RFC 7239 Forwarded, fallback X-Forwarded-For; “erste öffentliche IP” bevorzugen.
	•	DoD: Spoofing funktioniert nicht; echte Client-IP wird korrekt.
	•	Verify/Tests: untrusted remote + spoofed XFF → client_ip == remote; trusted remote → XFF greift.

	4.	Runbook: AUTH_TRUSTED_PROXIES & Caddy trusted_proxies deterministisch dokumentieren

	•	Zweck: Kein „geratenes CIDR“ im Incident.
	•	To-Do:
	•	Schrittfolge: wie Proxy-CIDR/IP ermittelt wird (docker network inspect / reale LB CIDRs).
	•	Klar trennen: Caddy trusted_proxies (wirkt auf {remote_host}/Rate-limit) vs App AUTH_TRUSTED_PROXIES (Audit/Logik).
	•	DoD: Operator kann in 2 Minuten herausfinden, was einzutragen ist.
	•	Verify: Runbook-Steps auf frischer Maschine nachvollziehbar.

	5.	Edge-Rate-Limit (Caddy) für Auth-Endpoints final prüfen

	•	Zweck: Defense-in-depth: Blockt Missbrauch bevor App Last frisst.
	•	To-Do:
	•	POST /auth/login/request limit (konservativ)
	•	GET/POST /auth/login/consume* limit (konservativ, UX nicht stören)
	•	Client-IP Sichtbarkeit prüfen (sonst sperrst du CDN statt User).
	•	DoD: 429 am Edge reproduzierbar; normale Nutzer merken nichts.
	•	Verify: curl-loop gegen Endpoints; Logs zeigen unterschiedliche client IPs.

⸻

P1 — Stark empfohlen für „ops-ready“
	6.	Mailer end-to-end produktionsfähig

	•	Zweck: “Button drücken → Mail kommt” in echt.
	•	To-Do:
	•	SMTP ENV vollständig + Validierung (Host/Port/User/Pass/From).
	•	Template: Link enthält korrekte APP_BASE_URL, TTL-Hinweis.
	•	Fehlerhandling: Mail-Send-Fehler → trotzdem keine Enumeration; observability event.
	•	DoD: In Prod kommt Mail zuverlässig an; Konfiguration ist dokumentiert.
	•	Verify/Tests: Mock-Mailer Test + optional „smtp sink“ (MailHog) in dev.

	7.	Dev-Fallback „Token im Log“ strikt als Dev-Only

	•	Zweck: Keine Token-Leaks in Prod.
	•	To-Do: AUTH_LOG_MAGIC_TOKEN=0 default; nur in dev aktivierbar; Logs nie Token im Klartext in Prod.
	•	DoD: Prod default ist “token niemals im Log”.
	•	Verify: Config-Matrix testet default.

	8.	Observability/Audit-Events vervollständigen

	•	Zweck: Fehlersuche ohne Geheimnisse zu loggen.
	•	To-Do:
	•	Events: login.requested, login.sent, login.consumed, login.failed, login.rate_limited
	•	Felder: client_ip, remote_ip, proxy_trusted, request_id/correlation_id, reason codes
	•	Email nur gehasht/redacted; Token nie.
	•	DoD: Ein Incident lässt sich aus Logs rekonstruieren.
	•	Verify: Integration test prüft Log-Emission (falls ihr das tut) oder manuell.

	9.	Cookie/Session Flags in realem TLS/Proxy-Setup verifizieren

	•	Zweck: “Klick → Session” bricht sonst subtil.
	•	To-Do:
	•	HttpOnly + Secure (bei https) + SameSite (typisch Lax)
	•	Domain/Path korrekt; hinter Proxy keine “mixed content”/redirect loops.
	•	DoD: Login funktioniert hinter Caddy+TLS stabil, auch nach Reload.
	•	Verify: Browser-Test: Cookie gesetzt, bleibt über Redirect; kein SameSite-Drop.

⸻

P2 — Nice-to-have / später, aber praxisrelevant
	10.	Persistenz/HA: Token-Store & Rate-Limiter robust machen

	•	Zweck: Neustarts / mehrere Instanzen.
	•	To-Do: Wenn aktuell in-memory: Plan für Redis/DB-Store (Token + Rate limit).
	•	DoD: Restart verliert nicht “in-flight” Tokens (optional), Multi-instance konsistent.
	•	Verify: Restart-Test / 2-Replica Test.

	11.	Monitoring/Alerting auf Abuse

	•	Zweck: Nicht erst merken, wenn Provider blockt.
	•	To-Do: Schwellwerte: rate_limited spikes, request volume, failed consumes.
	•	DoD: Alarm bei Anomalien.
	•	Verify: Simulierter spike → Alarm.

	12.	Account-Lifecycle (Deaktivieren/Löschen) + admin flows

	•	Zweck: “Andere auch” heißt irgendwann: moderieren.
	•	To-Do: Minimal: disable user; optional: invite management UI/CLI.
	•	DoD: Missbrauch kann beendet werden ohne Code-Änderung.

⸻

Verdichtete Essenz

Du bist funktional weit. Der Rest ist die „Realwelt-Schicht“: Policy (wer darf), Rate-Limits (Bots), Proxy-Trust (echte IP), Mailer (Zustellung), Runbook (ops-deterministisch).

⸻

Vermeidbare Fehler (automatisch markiert)
	•	Auto-Provision ohne Allowlist → Spamfarm.
	•	Trusted proxies zu breit → Header-Spoofing.
	•	Rate-Limit keyed auf Proxy/CDN-IP → alle Nutzer werden gemeinsam gedrosselt.
	•	Token-Logging als Prod-Default → operativ toxisch.

⸻

Risikoabschätzung
	•	P0-Punkte nicht erledigt + Internet-public: hohes Risiko (Spam/Abuse/Incident-Chaos).
	•	P1: mittleres Risiko, vor allem “funktioniert in echt” (Mailer/Cookies).
	•	P2: eher Skalierung/Operations.

⸻

Ungewissheitsursachenanalyse
	•	Unsicherheitsgrad: 0.20
	•	Interpolationsgrad: 0.10
	•	Ursachen: Ich sehe Gate/Flow/Runbook-Teile aus deinen Snippets und dem Merge-Kontext, aber nicht jedes Detail (Mailer-Implementation, TokenStore-Persistenz, genaue Proxy-Topologie). Daher liste ich To-Dos als “systemisch notwendig”, nicht als “sicher fehlend”.

⸻

Leitfragen
	1.	Kritischer möglich? Ja: mit exakten Dateipfaden/Tree könnte ich die Liste in “existiert/fehlt” umhängen statt “zu tun”.
	2.	Unbeleuchtet? CAPTCHA/PoW als Bot-Bremse (für Heimserver meist Overkill) und Session-Rotation bei Login (Sicherheits-Feinschliff).
	
	Neuer PR (optional): Delivery-Semantik verbessern (Token erst erzeugen, wenn (a) Mailer send ok oder (b) log mode aktiv) oder Token bei Send-Fail sofort invalidieren. Das ist ein Policy-Entscheid und zieht schnell weitere Fragen nach sich (Retries, observability, user feedback).


@jules: eruiere, was davon bereits erledigt ist und wasals nächstes zu tun ist. setze es dann um