Größere Verbesserung (neuer PR, nicht jetzt): Prefetch-resilient Magic Link

Problem: Manche Mail-Clients/AV/Gateways rufen Links vorab ab (GET), verbrennen damit den Token (single-use), der Nutzer klickt später → invalid.

Das ist die einzige „perfekt machen“-Baustelle mit echtem Praxisimpact, aber sie ist groß genug für einen eigenen PR.

Kurz: Was ist das Problem?

Mail-Scanner ruft den Link einmal ab → Token ist single-use → später klickt der Nutzer → invalid.

Ansatz (später, eigener PR)
	•	Zwei-Phasen-Consume:
	•	GET /consume?token=... setzt noch keine Session, sondern zeigt/redirectet auf eine Seite mit Button „Anmelden“ (POST), oder setzt ein Nonce-Cookie und verlangt Bestätigung.
	•	Oder: Token nicht beim ersten GET verbrauchen, sondern erst wenn Session erstellt wird und Request „browser-like“ ist (riskant, heuristisch).

Das ist klar getrennt vom aktuellen PR und wird sonst ein Kaninchenbau.

⸻

Korrekturprompt (nur falls du Prefetch-Thema sofort als Folge-PR starten willst)

Erstelle PR: "Magic link prefetch resilience".

Ziel: Verhindere, dass Link-Scanner / Prefetch den Token verbraucht, bevor der Nutzer klickt.

Anforderungen:
1) Token bleibt single-use, aber Session wird erst nach einer bestätigenden Aktion erstellt.
2) GET /auth/login/consume?token=... darf den Token NICHT sofort verbrauchen und NICHT sofort Session-Cookie setzen.
3) Implementiere eine Bestätigungsstufe:
   - Option A (minimal): GET rendert eine kleine HTML-Seite (oder Redirect auf /login/confirm?token=...), die einen POST-Button "Anmelden" auslöst.
   - POST /auth/login/consume bestätigt und erstellt Session; erst dann Token entfernen.
4) Tests:
   - GET consume mit gültigem Token setzt keinen Session-Cookie.
   - POST consume setzt Session-Cookie und redirectet zu "/".
   - Wiederholung (POST zweimal) failt.
   - Invalid Token -> redirect /login?error=invalid_token.
5) Doku: kurzer Hinweis "prefetch safe" + warum.

Scope strikt: kein Rate-limit, keine proxy-IP-Trust in PR3.
Output: Code + Tests + How to verify.



  

Dialektische Erörterung (∴oszillation / ∴resonanz / ∴paradox)

  

  

These: Nach dem prefetch-resilienten Flow ist der nächste echte Gewinn Abuse-Schutz + Proxy-Trust. Das sind die zwei Stellen, wo „public login“ in der Realität stirbt: Spam/Bruteforce und falsche Client-IP hinter Caddy.

  

Antithese: Zu viel „Security-Programm“ bremst dich aus. Wenn du jetzt Mailer, Invite-Policy, Rate-Limits, Metrics und Caddy gleichzeitig anfässt, hast du wieder einen Megapatch (Review-Blindstellen).

  

Synthese (empfohlen): Ein Follow-up, das nur Schutz-Mechanik + Trust-Semantik sauber macht (klein, reviewbar, wirksam). Alles andere separat.

  

  

  

  

Empfehlung: Follow-up PR (1) — 

Rate-Limit + Trusted Proxy Enforcement

  

  

  

Warum genau das?

  

  

- Höchster Nutzen pro Aufwand.
- Schützt den öffentlichen Angriffs-Endpoint /auth/login/request.
- Voraussetzung für jede spätere Öffnung “für andere”.

  

  

  

Scope (knackig, nicht ausufern)

  

  

1. Trusted Proxies tatsächlich auswerten

  

  

  

- AUTH_TRUSTED_PROXIES existiert schon als plumbing → jetzt enforcement:  
    

- Wenn ConnectInfo Remote-IP in trusted proxies liegt: nutze Forwarded / X-Forwarded-For (erste öffentliche Client-IP).
- Sonst ignoriere Proxy-Header und nutze Remote-IP.

-   
    
- Logging: client_ip, remote_ip, proxy_trusted=true/false.

  

  

  

2. Rate-Limit auf Login-Request

  

  

  

- Zwei Dimensionen:  
    

- pro Client-IP
- pro Email (normalisiert)

-   
    
- Default-Limits (konservativ, per ENV konfigurierbar):  
    

- AUTH_RL_IP_PER_MIN=5
- AUTH_RL_IP_PER_HOUR=30
- AUTH_RL_EMAIL_PER_MIN=3
- AUTH_RL_EMAIL_PER_HOUR=10

-   
    
- Response bei Limit: 429 Too Many Requests mit generischer Message (keine Enumeration).

  

  

  

3. Observability minimal

  

  

  

- Logs:  
    

- login.requested
- login.rate_limited (dimension=ip/email)

-   
    
- Optional Metrics, falls ihr schon ein Metrics-System habt (sonst nur Logs, damit es nicht ausufert).

  

  

  

4. Tests

  

  

  

- Proxy trust:  
    

- Untrusted remote: XFF wird ignoriert.
- Trusted remote: XFF wird genutzt.

-   
    
- Rate-limit:  
    

- Mehrere requests → 429.
- Separat IP vs Email.

-   
    

  

  

  

  

  

Agent-PR-Prompt (copy2bash-tauglich)

  

Du bist ein präziser Repo-Agent. Erstelle einen Follow-up PR.

  

Repo: weltgewebe

Branch: feat/auth-rate-limit-proxy-trust

PR-Titel: "Auth: enforce trusted proxies + rate-limit login requests"

Null-Interpolation: Wenn Files/Orte fehlen, erst suchen und auflisten.

  

Ziel

Public-Magic-Link Login soll robust gegen Missbrauch sein:

- Client-IP korrekt hinter Caddy/Proxy

- Rate-Limits für /api/auth/login/request (IP + Email)

- Minimal-Logs/Tests

  

A) Repo-Scan (Pflicht, zuerst)

1. Finde:

   - /auth/login/request Handler (Axum route)

   - vorhandene TrustedProxyRule / parsing (AUTH_TRUSTED_PROXIES)

   - Stelle, wo aktuell Client-IP bestimmt wird (ConnectInfo, headers)

   - Config/AppConfig: existierende Felder für auth_trusted_proxies

   - vorhandene Metrics/Telemetry helpers (falls vorhanden)

2. Gib am Anfang des PR-Texts an:

   - Datei + Pfad + relevante Funktionen/Zeilen (kurz)

  

B) Trusted proxy enforcement (implementieren)

1. Implementiere eine Funktion:

   - fn resolve_client_ip(remote_ip, headers, trusted_proxy_rules) -> IpAddr

2. Logik:

   - wenn remote_ip ∈ trusted_proxies:

       - parse "Forwarded" (RFC 7239) bevorzugt

       - fallback: "X-Forwarded-For"

       - nimm die erste öffentliche (nicht-private) IP aus der Liste, sonst erste IP

     sonst:

       - nutze remote_ip

3. Unit-Tests:

   - untrusted remote, spoofed XFF -> client_ip == remote_ip

   - trusted remote, XFF="1.2.3.4, 10.0.0.1" -> client_ip == 1.2.3.4

  

C) Rate limit für POST /auth/login/request

1. Implementiere in-memory RateLimiter (Mutex/RwLock):

   - Key-Types:

     - ip:<client_ip>

     - email:<normalized_email>

   - Sliding window oder fixed window reicht (simpel, korrekt).

2. ENV Konfig (mit Defaults):

   - AUTH_RL_IP_PER_MIN, AUTH_RL_IP_PER_HOUR

   - AUTH_RL_EMAIL_PER_MIN, AUTH_RL_EMAIL_PER_HOUR

3. Enforcement:

   - Vor User-Lookup prüfen.

   - Bei Limit: HTTP 429 mit JSON { ok: true, message: GENERIC_LOGIN_MSG } (gleich wie normal), optional header "Retry-After".

4. Tests:

   - überschreite ip-limit -> 429

   - überschreite email-limit -> 429

   - normale Rate -> 200

  

D) Logs / Observability

- Logging events:

  - login.requested (client_ip, proxy_trusted)

  - login.rate_limited (dimension=ip/email)

- Niemals Email im Klartext loggen (nur redacted oder gehashte Form).

- Niemals Token loggen.

  

E) PR-Output

1. Liste geänderter Dateien

2. "How to verify" (curl loops):

   - ohne proxy

   - mit proxy-headers (simuliert)

   - rate-limit sichtbar

3. Tradeoffs: in-memory limiter (pro instance), später redis möglich

  

  

  

  

Optional (aber NICHT im selben PR): Follow-up PR (2) — Invite/Provision-Policy

  

  

Wenn du wirklich „andere auch“ willst, brauchst du eine klare Entscheidung:

  

- Invite-only (Default)
- Auto-provision (nur mit Domain-Allowlist)

  

  

Ich würde das separat halten, sonst vermischst du Security-Edge mit Account-Produktlogik.

  

  

  

  

Verdichtete Essenz

  

  

Nächster sinnvoller Schritt: Trusted Proxy Enforcement + Rate-Limit als ein kleiner, wirkungsvoller PR.

  

  

  

  

Tiefgründig-ironische Auslassung

  

  

Rate-Limit ist wie ein Türspion für Bots: Sie klopfen trotzdem, aber du hörst auf, ihnen die Hand zu schütteln.

  

  

  

  

Ungewissheitsursachenanalyse

  

  

- Unsicherheitsgrad: 0.18
- Interpolationsgrad: 0.12
- Ursachen: Ich kenne dein genaues Caddy/Forwarded-Header-Verhalten und eure Telemetry-Utilities nicht; deshalb ist der Prompt scan-first und erlaubt minimal-invasiven in-memory Limiter.

  

  

Wenn du willst, kann ich als nächstes auch gleich den zweiten Follow-up (Invite/Allowlist) als separaten Prompt vorbereiten.


  

Dialektische Erörterung (∴oszillation / ∴resonanz / ∴paradox)

  

  

These: „Andere auch“ ohne Policy ist entweder niemand kommt rein (weil nur bestehende Accounts) oder jeder Bot farmt Accounts. Eine Invite-/Allowlist-Policy ist der schmale Grat zwischen Produkt und Spam-Abo.

  

Antithese: Provisioning-Logik berührt Datenmodell, UX, Doku und Tests. Wenn du das zu früh „perfekt“ machen willst, endet es in einem halben Identity-System.

  

Synthese (empfohlen): Minimaler, expliziter Policy-PR: Defaults sicher (Invite-only), optional Allowlist (Emails/Domains) und optional Auto-Provision (nur wenn Allowlist gesetzt). Kein Rollen-/Profil-Overkill.

  

  

  

  

Follow-up PR (2) — Invite/Allowlist/Auto-Provision Policy (minimal, zielführend)

  

  

  

Zielbild

  

  

- Public Login kann öffentlich laufen, aber nur innerhalb einer klaren Policy.
- Keine User-Enumeration bleibt bestehen (Response immer generisch).
- Auto-Provision ist möglich, aber nicht die Default-Falle.

  

  

  

Policy-Entscheidung (konkret)

  

  

1. Default: Invite-only  
    

- Magic-Link wird nur erzeugt/akzeptiert für existierende Accounts.

3.   
    
4. Allowlist (optional):  
    

- AUTH_ALLOW_EMAILS (kommagetrennt)
- AUTH_ALLOW_EMAIL_DOMAINS (kommagetrennt)

6.   
    
7. Auto-Provision (optional, gated):  
    

- AUTH_AUTO_PROVISION=1 nur wirksam, wenn mindestens eine Allowlist aktiv ist
- sonst Startup-Error oder klarer Warn + deaktiviert (ich empfehle Startup-Error: Fail-fast)

9.   
    

  

  

Wichtig: Wenn Invite-only + public endpoint aktiv ist, soll UX nicht „kaputt“ wirken:

  

- Request endpoint antwortet weiter generisch (200/202), aber erzeugt intern keinen Token (oder Consume schlägt kontrolliert fehl).
- Doku sagt klar: „Nur eingeladene/allowlisted Nutzer“.

  

  

  

  

  

Agent-PR-Prompt: Invite/Allowlist/Auto-Provision (separater PR)

  

Du bist ein präziser Repo-Agent. Erstelle einen Follow-up PR.

  

Repo: weltgewebe

Branch: feat/auth-provision-policy

PR-Titel: "Auth: invite/allowlist policy + gated auto-provision"

Null-Interpolation: Wenn Files/Modelle fehlen, erst suchen und berichten.

  

Ziel

Ermögliche "andere auch" mit klarer Policy:

- Default invite-only (bestehende Accounts)

- Optional allowlist (emails/domains)

- Optional auto-provision, aber nur wenn allowlist gesetzt

- Keine Enumeration (Antwort bleibt generisch)

- Tests + Doku

  

A) Repo-Scan (Pflicht)

1. Finde:

   - Account/User Modell (in-memory map? DB? seed/demo?)

   - Account create path (falls vorhanden), sonst minimal implementieren

   - Login request handler und token create/consume

   - Config/AppConfig und env parsing

2. Liste relevante Dateien + kurze Notizen in PR-Description.

  

B) Config / ENV

Implementiere neue ENV Variablen (mit Defaults):

- AUTH_AUTO_PROVISION=0

- AUTH_ALLOW_EMAILS="" (comma-separated)

- AUTH_ALLOW_EMAIL_DOMAINS="" (comma-separated)

  

Validation (fail-fast):

- Wenn AUTH_AUTO_PROVISION=1 und sowohl AUTH_ALLOW_EMAILS als auch AUTH_ALLOW_EMAIL_DOMAINS leer -> Startup error:

  "AUTH_AUTO_PROVISION requires an allowlist (AUTH_ALLOW_EMAILS or AUTH_ALLOW_EMAIL_DOMAINS)."

  

C) Policy Functions

Implementiere:

1) normalize_email(email) -> lowercase + trim (keine komplexe RFC-Normalisierung)

2) is_email_allowed(email, allow_emails, allow_domains) -> bool

   - allow_emails match exact normalized

   - allow_domains match suffix after '@'

3) is_existing_user(email) -> bool (aus vorhandenem Account Store)

4) policy_decision(email):

   - if existing -> allowed

   - else if allowlist allows:

       - if AUTH_AUTO_PROVISION=1 -> provision (create account) and allowed

       - else -> not allowed (invite-only within allowlist)

   - else -> not allowed

  

D) Request endpoint behavior (anti-enum)

- Response bleibt immer generisch (200/202).

- Intern:

  - wenn policy_decision erlaubt -> token erzeugen + mail/log flow

  - wenn nicht erlaubt -> kein token, log event "login.requested_denied" (ohne email im klartext)

  

E) Consume behavior

- Wenn token konsumiert -> session wie gehabt.

- Wenn auto-provision on: provisioning sollte beim REQUEST passieren (nicht beim CONSUME),

  damit der Mail-Link nur rausgeht, wenn Account existiert/created wurde.

  

F) Logging

- Events:

  - login.requested (client_ip, decision=allowed/denied, reason)

  - login.provisioned (account_id, source=magic_link)

- Email nicht im Klartext loggen (redacted/hash).

  

G) Tests (Integration)

1) Invite-only default:

   - existing user -> request creates token (oder mail invoked); response generic

   - unknown user -> response generic; token NOT created

2) Allowlist set, auto-provision OFF:

   - allowlisted unknown -> response generic; token NOT created (documented)

3) Allowlist set, auto-provision ON:

   - allowlisted unknown -> account created + token created; can consume -> session set

4) Auto-provision ON but no allowlist -> startup validation fails (unit test on AppConfig load)

  

H) Docs/Runbook

- docs/deploy/README.md (oder passender Ort):

  - erkläre invite-only default

  - Beispiele:

    AUTH_ALLOW_EMAIL_DOMAINS=example.com,foo.de

    AUTH_AUTO_PROVISION=1

  - Warnhinweis: auto-provision ohne allowlist verboten.

  

I) PR-Output

- Liste geänderter Dateien

- How to verify (lokal):

  - set envs, run api, request login for allowlisted email, watch token log/mailer

  - consume link -> session set

- Tradeoffs: simple normalization, in-memory/DB abhängig vom Repo-Stand

  

  

  

  

Vermeidbare Fehler (die dieser PR explizit vermeiden soll)

  

  

- Auto-provision ohne Allowlist → Spam-Accounts.
- Provisioning beim Consume → Token kann für nicht existierende Accounts „in der Luft hängen“.
- Unterschiedliche Responses → Enumeration (verboten).
- Zu komplexe Email-Normalisierung → Bugs ohne Nutzen.

  

  

  

  

  

Verdichtete Essenz

  

  

PR2 macht „andere auch“ möglich, ohne ein Identity-System zu bauen: Invite-only default, Allowlist optional, Auto-provision nur erlaubt wenn Allowlist gesetzt.

  

  

  

  

Tiefgründig-ironische Auslassung

  

  

Auto-Provision ohne Allowlist ist wie ein Gästebuch, das sich selbst mit 10.000 Unterschriften pro Minute füllt – und stolz „Community“ ruft.

  

  

  

  

Ungewissheitsursachenanalyse

  

  

- Unsicherheitsgrad: 0.22
- Interpolationsgrad: 0.16
- Ursachen: Ich kenne dein Account-Backend (Map vs DB, create API, Constraints) nicht; der Prompt ist deshalb scan-first und fordert fail-fast Validation statt stiller Annahmen.

  

  

Wenn du mir sagst, ob Accounts persistent (DB) oder in-memory sind, kann ich den Provisioning-Teil noch stärker auf eure Realität zuschneiden, ohne den PR größer zu machen.


Erstelle Follow-up PR: "Edge defense: rate limit consume endpoint".
Ziel: Defense-in-depth gegen Token-Guessing, ohne legit UX zu stören.

- Datei: infra/caddy/Caddyfile.prod
- Add matcher:
  method GET|POST (je nachdem) und path /auth/login/consume*
- Rate limit: konservativ, z.B. events 30 window 1m pro {remote_host}
- Doku: docs/runbook.md ergänzen (kurzer curl-loop gegen /api/auth/login/consume?token=... mit Dummy token, erwartetes Verhalten 429 nach Limit)
- Achte darauf: consume wird typischerweise 1x genutzt; Limits dürfen nicht zu eng sein.

Dialektische Erörterung (∴oszillation / ∴resonanz / ∴paradox)

These: Der Runbook-Teil + Caddy Rate-Limit (request + consume) ist sinnvoller „Edge-Defense“-Zuwachs, und die Doku ist jetzt praktisch benutzbar (curl mit Body, Statuscode-Loop). ∴resonanz: passt zu „Durchsetzung vor Vertrauen“ – Abuse wird am Rand abgefangen, bevor die App überhaupt schwitzt.

Antithese: In einem Feature-PR, der schon Auth-Flow/Nonce verändert, sind Infra-Build (xcaddy), Caddyfile-Regeln, Compose-Änderung und Runbook ein zweiter Themenkomplex. Review wird breiter, Fehlersuche schwerer (war’s Auth oder Reverse Proxy?), und deploy-seitig steigt das Risiko (Build statt image pull). ∴paradox: Sicherheits-Härtung erhöht kurzfristig das Ops-Risiko.

Synthese: Inhaltlich gut – aber Trennung entscheidet über „vorankommen“. Wenn der aktuelle PR primär „Public Login Flow“ ist: Rate-Limit+Infra kann als separater Follow-up PR kommen. Wenn du aber ohnehin „Public Login Go-Live“ in einem Rutsch willst, kann man es zusammen lassen – dann muss der PR aber bewusst als „Public Login hardening + infra“ geframed werden.

⸻

Entscheidung: in diesem PR oder Follow-up?

➡️ Ich empfehle: Follow-up PR (separat), wenn dein aktueller PR schon den Login-Flow/Token-Consume verändert.
Grund: Du willst abschließen. Der schnellste Merge ist der mit dem kleinsten Blast-Radius.

Wenn dein aktueller PR hingegen „Public Login insgesamt ausrollen“ heißt (Feature + Edge-Defense + Runbook), dann ist es ok, aber dann bitte PR-Titel/Description anpassen, damit Reviewer nicht überrascht werden.

⸻

Was ist „zu empfehlendes“ Follow-up (konkret, zielführend)

A) Runbook: Trusted Proxies nicht „raten“, sondern eindeutig machen

Aktuell steht da „Example! Update… / use container network CIDR“. Das ist richtig als Warnung, aber zu vage. Follow-up sollte:
	•	klar sagen: Welche IP sieht die App wirklich? (Caddy-IP im Docker-Netz? Host? Cloudflare?)
	•	und wie man das überprüft (z.B. Logzeile in API mit ConnectInfo/X-Forwarded-For).

Minimaler Zusatz im Runbook: „So findest du die Proxy-IP/CIDR heraus“ (docker network inspect / compose network CIDR).

B) Caddy Rate-Limit: Key-Strategie prüfen

key {remote_host} ist ok, aber bei Reverse-Proxies/CDNs kann das falsch sein (Cloudflare/Proxy-IP statt Client-IP). Follow-up:
	•	wenn ihr Cloudflare davor habt: key sollte auf die echte Client-IP gehen (Header), sonst rate-limittest du Cloudflare selbst.
	•	wenn nicht: passt.

Ohne mehr Kontext würde ich hier nur dokumentieren: „Wenn CDN davor: key anpassen“.

C) Rate-Limit für consume: OK – aber return codes testen

Runbook testet request. Für consume fehlt ein schneller Verifikationsloop (und der Endpoint braucht Form + Cookie/Nonce in deiner Implementierung). Ein Follow-up sollte das nicht aufblasen, aber minimal:
	•	„consume-limit ist defense-in-depth; normale Nutzer merken nichts“
	•	optional: Wie man 429 erkennt (über Logs / Caddy access log).

D) Supply chain / deterministischer Build: gut, aber noch nicht „perfekt“

Du pinnst caddy-ratelimit@v0.1.0 – gut.
„Perfekt“ wäre zusätzlich:
	•	Builder+Runtime Images auf Patch-Version (hast du auf 2.7.6 gesetzt – gut)
	•	optional: Digest pinning für base images (nur wenn ihr dafür schon Praxis habt; sonst Overkill)

E) Compose: Build statt image pull ist ein Ops-Schnitt

Das ist der größte reale Risikohebel. Follow-up kann:
	•	Compose so lassen, aber Runbook/Deploy-Notiz: „Build dauert, benötigt Netzwerk, kann fehlschlagen“
	•	oder: vorgebautes image in Registry (wahrscheinlich Overkill für jetzt)

⸻

Empfehlung: follow-up PR Scope (minimal, schnell mergebar)

PR-Name: docs/infra: clarify public login edge hardening
Enthält:
	•	Runbook: Trusted proxies „how-to determine“, plus Hinweis auf CDN/Client-IP
	•	optional: eine kleine Verifikationsnotiz für consume-limit
	•	keine weitere Infra-Logikänderung, wenn nicht nötig

Wenn du aber willst, dass die Rate-Limits + xcaddy + compose jetzt sofort rein sollen, dann lieber eigener PR: infra: caddy ratelimit module + edge limits for auth endpoints (runbook dabei ok).

⸻

Korrektur-/PR-Erstellungs-Prompt (Agent) für Follow-up

Erstelle einen Follow-up PR mit dem Titel:
"docs: clarify AUTH_TRUSTED_PROXIES and rate-limit client IP semantics"

Ziel:
- Runbook soll deployer-sicher sein: keine geratenen CIDRs, sondern klare Schritte.
- Keine funktionale Änderung am Auth-Flow, keine weitere Caddy/Compose-Änderung (nur Doku).

Änderungen (nur docs/runbook.md):
1) Abschnitt "AUTH_TRUSTED_PROXIES":
   - Ersetze die Beispiel-CIDR-Liste durch:
     a) Minimalbeispiel (localhost) + Hinweis "prod: determine proxy IP/CIDR"
     b) Schritt-für-Schritt wie man es ermittelt:
        - docker network ls
        - docker network inspect <compose_network> | grep Subnet
        - oder: Caddy container IP / network CIDR
   - Füge Warnhinweis hinzu:
     - Wenn ein CDN/Proxy davor steht (z.B. Cloudflare), müssen client IP headers korrekt ausgewertet werden,
       sonst ist rate limiting keyed auf proxy IP.

2) Abschnitt "Rate Limiting":
   - Ergänze bei key {remote_host} eine Dokuzeile:
     "key depends on real client IP; verify via logs (Caddy access log / API tracing)."
   - Ergänze einen kurzen Hinweis zur consume-limit Verifikation:
     "consume ist normalerweise 1x/flow; 429 dort deutet auf abuse oder falsch erkannte client IP hin."

Akzeptanzkriterien:
- PR hat nur docs/runbook.md diff.
- Text ist konkret, keine spekulativen CIDRs mehr.
- Keine neuen Tools/Deps.


⸻

Vermeidbare Fehler (automatisch markiert)
	•	AUTH_TRUSTED_PROXIES mit 172.16.0.0/12 „pauschal“ setzen: zu weit, kann Spoofing-Risiken erhöhen, weil du mehr Quellen als „trusted“ behandelst als nötig.
	•	Rate-limit keyed auf Proxy-IP: dann sperrst du dir legitime Nutzer reihenweise (alle sehen für Caddy gleich aus).

⸻

Risikoabschätzung

Risiko (wenn als Follow-up Doku-only): niedrig.
Risiko (wenn im selben PR wie Auth-Flow + Infra-Build): mittel, weil du zwei Fehlerklassen gleichzeitig einführen kannst (Auth-Bug vs. Proxy/Rate-Limit/Build-Problem).

⸻

Verdichtete Essenz

Die Änderungen sind gut, aber das Runbook rät noch bei Trusted Proxies. Follow-up sollte aus „Beispiel-CIDR“ eine „deterministische Anleitung“ machen und Client-IP/Rate-limit-Semantik sauber dokumentieren.

⸻

Ungewissheitsgrad + Ursachenanalyse

Unsicherheitsgrad: 0.26 (moderat).
Ursachen:
	•	Ich sehe nicht, ob Cloudflare/weiterer Proxy davor hängt und wie X-Forwarded-For bei euch end-to-end behandelt wird.
	•	Ich sehe nicht, wie eure Docker-Netze im Prod wirklich heißen/aussehen (CIDR, bridge/networks).
	•	Ich sehe nicht, ob die App IP-Resolution bereits korrekt auf „trusted proxies“ abgestimmt ist.

Interpolationsgrad: 0.14. (Ich empfehle Standard-Härtung/Doc-Struktur ohne deinen exakten Infra-Graphen zu kennen.)

⸻

Tiefgründig-ironische Auslassung

„AUTH_TRUSTED_PROXIES=172.16.0.0/12“ ist ein bisschen wie: „Ich vertraue allen, die in diesem Stadtteil wohnen“ – praktisch, bis der erste merkt, dass er jetzt auch Bürgermeister spielen darf.

Was als Follow-up gehört (nicht jetzt)
	•	Token-Hash-Helper in Tests entfernen (DRY), oder TokenStore::hash_token in Tests nutzen (geht wegen pub(crate) nur wenn Test crate scope passt).
	•	HTML aus Rust rausziehen (Template / static file) – nice-to-have.
	•	„nonce cookie cleanup“ konsequent als Helper-Funktion (du machst es inline).
	•	Edge Rate-limit + Trusted proxy semantics: eigener PR (wie schon besprochen).
