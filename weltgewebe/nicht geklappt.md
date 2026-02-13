Dialektische Erörterung (∴oszillation / ∴resonanz / ∴paradox)

These: Du hast das “wgx-snapshot”-Problem korrekt erkannt – aber der PR trägt noch immer Sprengstoff

Die Umbenennung scripts/wgx-deploy-snapshot.sh → scripts/deploy-snapshot.sh plus Anpassungen in • .github/workflows/deploy-drift-guard.yml • docs/deploy/* ist semantisch sauber: Der Snapshot ist weltgewebe-deploy-Mitigation, nicht “WGX” als Fleet-Motorik. Das passt zu deinem Ziel “vorankommen” und reduziert Verwirrung.

∴resonanz: Das ist exakt die Art “kleiner, klarer Semantik-Fix”, die künftige Drift-Diskussionen abkürzt.

Antithese: “Wenn ich schon umbenenne, kann ich gleich Infra/Build auch anfassen”

Genau hier kippt’s wieder: der gleiche PR enthält weiterhin • Caddy health route entfernt, • Caddy-Downgrade + undeterministisches xcaddy build, • cargo fetch ohne --locked, • deny.toml-Änderungen.

Das sind vier unabhängige Risikoflächen, die mit “disabled accounts” und “deploy snapshot rename” nur lose zusammenhängen.

∴paradox

Du baust einen Drift-Guard, der Infra-Änderungen erzwingt “mitzudenken” – und im selben PR erzeugst du potentiell mehr Drift (und Supply-Chain-Diffusität) als du mitigierst. Der Guard wird dann zum Alarm, den du selbst auslöst, während du gerade das Brandmeldegerät montierst.

⸻

Entscheidung: PR ist immer noch nicht ideal (Scope zu breit). Aber: Die Snapshot-Umbenennung ist sinnvoll – nur nicht zusammen mit Caddy/Docker/deny.

Was ich in diesem PR halten würde (wenn du wirklich abschließen willst)

Variante A (schnell mergebar): PR fokussieren auf: 1. Disabled-Account Checks + Tests 2. Trusted proxy rate-limit Tests + Doku 3. Snapshot-Script Rename + Workflow/Doku-Anpassung (Drift-Guard konsistent halten)

Das ist schon “viel”, aber thematisch noch Ops/Auth/Drift zusammenhängend.

Was raus muss (Folge-PR oder komplett verwerfen, weil riskant) 1. infra/caddy/Caddyfile.prod: Health route darf nicht verschwinden • Der Block :80 { @health ... } ist ops-kritisch (lokale Checks/CI/Readiness). • Trusted-proxies Kommentar: ok, aber nicht durch Löschen der Health route erkaufen. 2. infra/caddy/Dockerfile: Downgrade + undeterministischer Build • FROM caddy:2.8.4* → 2.7.6* ohne Beleg ist riskant. • RUN xcaddy build ohne explizite Version ist Supply-Chain drift. • Wenn caddy-ratelimit wirklich >=2.8 braucht, ist das sogar funktional gefährlich. 3. apps/api/Dockerfile: cargo fetch ohne --locked • Das macht Builds weniger reproduzierbar und kann CI/Prod unbemerkt verändern. • “Stubs entfernen” ist ein eigenes Thema (Caching/Layering) → nicht nötig für Auth. 4. deny.toml: Policy-Achse • Ohne Beleg (cargo-deny output) ist das reines CI-Roulette.

Fehlerprävention (hart): Wenn du diese vier Dinge drin lässt, riskierst du: “PR hängt im Review” oder “mergebar, aber bricht Ops/CI”.

⸻

Deine Frage “wgx-snapshot – wirklich so nennen?”

Du hast sie praktisch schon beantwortet: nein, und die Umbenennung auf deploy-snapshot.sh ist richtig – wenn das Script in diesem Repo als Deploy-Mitigationswerkzeug verstanden wird.

Aber: Dann sollte die Semantik überall konsistent sein (was du bereits tust: drift-guard + docs). Das passt.

⸻

Minimaler Korrekturplan (damit du fertig wirst)

Sofort-Korrektur im selben PR (empfohlen) • Revert: • infra/caddy/Dockerfile (zurück auf pinned + deterministisch) • infra/caddy/Caddyfile.prod Health route wiederherstellen (Kommentar kann bleiben) • apps/api/Dockerfile (zurück auf cargo fetch --locked + Stub-Logik, sofern sie vorher bewusst war) • deny.toml (zurück) • Behalten: • scripts/deploy-snapshot.sh rename + minimale Kommentaränderung (ohne “Drift Fix” Behauptung) • .github/workflows/deploy-drift-guard.yml Regex update • docs/deploy/* + runbook trusted-proxy Abschnitt • Auth disabled logic + Tests
Alternativ: Split in 2 PRs (wenn du ultra-schnell mergen willst) • PR1: Auth disabled + tests • PR2: Snapshot rename + drift-guard + docs • Alles andere (Caddy/Docker/deny) bleibt draußen
⸻

Korrekturprompt für Agent (präzise, ausführlich, ohne Scope creep)

Ziel: PR mergebar machen, Scope: (Auth disabled + Deploy snapshot rename + Trusted proxy docs/tests). Alles was Supply-chain/Version/Policy betrifft: raus.

Revert riskante Änderungen (vollständig):

git checkout -- infra/caddy/Dockerfile
git checkout -- apps/api/Dockerfile
git checkout -- deny.toml
infra/caddy/Caddyfile.prod reparieren:

Stelle den früheren :80 Health-Serverblock wieder her: :80 { @health { path /health/ready; method GET HEAD } handle @health { reverse_proxy api:8080 } handle { respond 404 } }
Zusätzlich darf im global options block der trusted_proxies Kommentar bleiben, aber Health-Route darf nicht entfernt werden.
Keine weiteren Behavior-Änderungen.
Snapshot rename konsistent halten:

Verifiziere, dass rename wirklich stattgefunden hat: scripts/deploy-snapshot.sh existiert, scripts/wgx-deploy-snapshot.sh nicht mehr.
Prüfe Referenzen:
.github/workflows/deploy-drift-guard.yml (Regex)
docs/deploy/DRIFT_POLICY.md (Tabelle)
docs/deploy/README.md (Beispielcommand)
ggf. weitere Stellen via ripgrep: rg -n "wgx-deploy-snapshot|deploy-snapshot.sh" .
Auth disabled finalisieren:

apps/api/src/routes/auth.rs Änderungen sauber einfügen (request_login + consume_login_post).
Wenn Patch weiterhin nicht greift: keine context-based apply. Stattdessen: öffne die Datei, suche exakt nach Funktionssignaturen und editiere direkt. Verwende minimale, lokale Edits.
Tests:

cargo fmt (nur falls CI verlangt)
cargo test -p weltgewebe_api (oder workspace-äquivalent)
Stelle sicher, dass cargo-deny nicht durch deny.toml Änderungen betroffen ist (weil revert).
Ergebnischeck:

git diff --stat: muss hauptsächlich auth.rs, accounts.rs, tests, docs, workflow, script-rename zeigen.
Keine Caddy/Dockerfile/deny Änderungen mehr außer ggf. Caddyfile Health-restore + Kommentar.
⸻

Mikro-Review: Snapshot-Rename + Drift-Guard

Das ist gut. Ein kleiner Hinweis: • In deploy-drift-guard.yml greifst du auf .github/workflows/deploy-snapshot.yml zu (die heißt in deinem Regex so). Stelle sicher, dass die Datei im Repo wirklich exakt so heißt (yaml vs yml). Sonst bekommt man “Guard schreit immer”.

⸻

Verdichtete Essenz

deploy-snapshot.sh statt wgx-deploy-snapshot.sh ist die richtige Semantik. Der PR wird aber nur fertig, wenn du Caddy/Docker/deny wieder rausnimmst und die Health route zurückbringst. Danach ist das Ding mergebar.

⸻

Ungewissheitsdarstellung • Unsicherheitsgrad: 0.23 • Interpolationsgrad: 0.10 • Ursachen: Ich sehe nicht deine CI-Workflows vollständig (ob Health route zwingend gebraucht wird, ob cargo-deny enforced ist, ob deploy-snapshot workflow Datei exakt so heißt). Meine Empfehlung ist deshalb konservativ: deterministische Builds beibehalten, Health-Route nicht entfernen, deny.toml nicht anfassen ohne Belege.

⸻

Ein witziger, aber nützlicher Satz (damit’s hängen bleibt)

Ein PR, der gleichzeitig Auth hardent, Caddy umbaut, Docker reproduzierbar “entlockt” und deny.toml trimmt, ist wie ein Ersatzradwechsel bei 180 km/h – technisch beeindruckend, aber keiner will neben dir im Auto sitzen.