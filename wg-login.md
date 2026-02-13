Dialektische Erörterung

These (∴resonanz): Ja – „das Obige“ ist jetzt explizit im Prompt mitberücksichtigt

Du hast die wichtigsten Korrekturen bereits im Diff (Test-IDs statt .first(), Dev/Public split, Token-hash, gating). Was noch fehlte, war: PR-Text als Steuerinstrument, damit das Merge nicht „heimlich öffentlich“ wirkt und damit die Security-Follow-ups nicht verdampfen. Genau das bauen wir jetzt in den Prompt ein.

Antithese (∴kontrast): Wo der Prompt bewusst unangenehm ehrlich sein muss
	•	AuthStatus in Prod sichtbar ist keine „kleine DX-Änderung“, sondern UI-Produktverhalten. Wenn du das nicht klar schreibst, liest es später jemand als Versehen.
	•	Magic-Link in Logs ist dev-ok, public später nicht. Das muss im PR-Body als Follow-up-Block stehen, nicht als „vielleicht irgendwann“.

Synthese (∴paradox → produktiv)

Du merge-st eine „public shape“ mit Hard-Off-Schalter (AUTH_PUBLIC_LOGIN=0) und deklarierst im PR sauber: „UI existiert, Funktion standardmäßig aus“. Gleichzeitig definierst du die Follow-ups als Checkliste, sodass später niemand so tut, als wäre das „fertig“.

Ironische Randnotiz: Sicherheit ist wie ein Rauchmelder: Er nervt am Tag der Installation, aber er ist ziemlich still, wenn du ihn brauchst.

⸻

Neuer Folge-PR-Erstellungsprompt (inkl. aller obigen Punkte)

Erstelle einen Pull Request für Weltgewebe.

PR Titel
"Auth: dev login split + gated public magic-link + deterministic tests"

Kurzbeschreibung (1 Absatz)
Dieser PR trennt den dev-only Login (Impersonation) klar vom perspektivisch öffentlichen Login.
Dev bleibt unter /auth/dev/*, der öffentliche Login wird als Magic-Link Flow vorbereitet, ist aber
standardmäßig deaktiviert (AUTH_PUBLIC_LOGIN=0). Zusätzlich werden Playwright-Tests
stabilisiert, indem UI-Elemente eindeutig per data-testid adressiert werden (kein .first()).

Änderungen (bullet list, nach Bereichen)

API (apps/api)
- Rename endpoint: POST /auth/login -> POST /auth/dev/login (dev-only impersonation via account_id)
- Add public magic-link flow (gated):
  - POST /auth/login/request  (email → token; always returns generic OK message to avoid enumeration)
  - GET  /auth/login/consume?token=... (consume token → create session cookie → redirect)
- Add TokenStore (in-memory):
  - stores only hashed tokens (sha2/SHA256), 15 min TTL, single-use
  - cleanup on create + consume to keep memory bounded
- Extend AccountInternal: add email: Option<String> and load from account source
- Add env flags (documented in apps/api/README.md):
  - AUTH_PUBLIC_LOGIN (default 0; enables /auth/login/request)
  - APP_BASE_URL (default http://localhost:5173; used to build magic link)
- Update CSRF note: endpoints exempted for initial session creation are /auth/dev/login and /auth/login/request
- Update ApiState to include tokens: TokenStore and adapt health/test scaffolding accordingly

WEB (apps/web)
- Auth store API split:
  - rename login(accountId) -> devLogin(accountId) and call /api/auth/dev/login
  - add requestLogin(email) -> POST /api/auth/login/request (credentials include)
- Add /login page:
  - form requests magic link by email
  - shows "Check your inbox" generic success response
  - handles "Public login disabled" error when endpoint returns 404/403
- AuthStatus:
  - now visible when browser=true (prod-visible UI decision)
  - unauthenticated users get Login link to /login
  - add data-testid="auth-status-logout" to disambiguate logout button in tests
- GewebekontoWidget + dev auth page:
  - updated to use devLogin and add data-testid="widget-logout" for deterministic test targeting
- Playwright + mock API:
  - mock updated to /api/auth/dev/login
  - schaufenster-ownership.spec.ts now asserts widget logout via getByTestId("widget-logout") (no ambiguous selectors)

Verification / evidence
- Include verification scripts/screenshots if present (verification/*) as demonstration artifacts
- server_output.txt demonstrates dev "email_outbox" magic-link generation

WICHTIG: Produkt-/Sicherheitsrahmung (separate section im PR body)
- Public login is gated behind AUTH_PUBLIC_LOGIN and defaults to OFF.
- Request endpoint returns generic OK regardless of whether the email exists (anti-enumeration).
- Tokens are stored hashed and are single-use with TTL.
- Current "email delivery" is dev logging (target=email_outbox), not a production mailer.

Testing (was wurde lokal ausgeführt)
- Frontend: pnpm lint / format / test (Playwright) → all tests passing (8/8)
- Backend: cargo test (falls ausgeführt; andernfalls explizit "not run locally" sagen)

Risikoabschätzung (kurz, ehrlich)
- Niedriges Risiko im Defaultbetrieb, da AUTH_PUBLIC_LOGIN=0 und der Flow damit nicht aktiv ist.
- Mittel, sobald public login aktiviert wird: braucht Rate-Limits, token hygiene, header hardening.

Follow-ups (Checkbox-Liste, muss in PR rein)
- [ ] Rate limit POST /auth/login/request (IP + email + global)
- [ ] Never log raw magic-link tokens in production (log correlation_id only)
- [ ] Add Referrer-Policy: no-referrer (or intermediate consume page) to reduce token leakage via Referer
- [ ] Consider token pepper (AUTH_TOKEN_PEPPER) for hash hardening
- [ ] Consider persistent token store (DB/Redis) if multi-instance or restarts matter
- [ ] Add explicit UX for invalid_token on /login (read query param error=invalid_token)
- [ ] Add audit note: GET consume is fine but ensure SameSite + CSRF posture remains correct

Erzeuge als Output:
1) PR Titel
2) PR Beschreibung exakt im GitHub-Format (Markdown), inkl. den Sektionen:
   - Summary
   - Changes (API / Web / Tests)
   - Security Notes
   - Testing
   - Risks
   - Follow-ups (checkboxes)


⸻

Kurz: Was aus dem markierten Satz konkret im Prompt steckt
	•	„Merge“ → Prompt ist merge-ready, weil er die Produktentscheidung (AuthStatus prod-visible) explizit macht.
	•	„Follow-up Ticket rate limiting + no-referrer + token-not-in-logs“ → ist als Checkbox-Liste integriert, damit es nicht untergeht.

⸻

Ungewissheitsursachenanalyse (∴Grad der Ungewissheit)

Unsicherheitsgrad: 0.19
Ursachen:
	•	Ich sehe die Repo-Policies nur über das, was du im Verlauf und im Diff gezeigt hast, nicht über euer vollständiges Security-Header-Setup oder Reverse-Proxy-Konfiguration.
	•	Ob AuthStatus in Prod sichtbar sein soll, ist eine Zielentscheidung; der Prompt reduziert das Risiko durch klare Deklaration.

⸻

Verdichtete Essenz

Der neue Prompt macht das Merge verantwortbar, weil er die öffentliche Oberfläche als „gated“ deklariert und die drei wichtigsten Security-Nacharbeiten als verpflichtende Follow-up-Checkboxen festnagelt.