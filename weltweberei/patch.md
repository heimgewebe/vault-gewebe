# 🌐 PATCH v15_1_1 — Kollektive Demokratie mit Hetzner-Effizienz

**Kompakt, produktionsbereit, konsequent kollektiv. Vereint radikale Transparenz mit robuster Infrastruktur.**

***

## A) Ziele (optimiert)

- **Ron komplettieren**: Jede Handlung (Stimmen, Spenden, Beiträge, Fäden, Knoten-Inhalte, Delegationen) nach 84 Tagen optional anonymisierbar (Opt-in, "sofort übertragen", Daily-Job)
- **Hybrid-Indexierung**: Weltöffentlich sichtbar, aber Index nur über Monatsarchive; Live-Ströme mit noindex/noarchive
- **Komplett kollektive Moderation**: Keine moderatoren; alle Entscheidungen über 7+7-Tage-Anträge mit Cycle-Detection bei Delegationen
- **Strafbare Inhalte**: Sofortiges Legal-Freeze + 24h-Prüfung mit vollständiger Audit-Spur (eigener Pfad)
- **Hetzner-First**: Terraform-Stacks, Performance-Budgets, Governance-Analytics, Kosten-Tracking
- **Mobile-First messbar**: P95 TTI ≤ 2,5s (4G), P95 FCP ≤ 1,8s, P95 API ≤ 300ms
- **Demokratie-Analytics**: Partizipation, Machtkonzentration, Konsensqualität überwachen

***

## B) System-Änderungen (präzise)

### 0) Leitplanken & Prinzipien

**Ersetzen/Ergänzen:**
- **Sichtbarkeit & Indexierung**: "Das Weltgewebe ist weltöffentlich. Hybrid-Indexierung: Live-Ströme (/map, /feed, /api/*) tragen noindex,noarchive; Monatsarchive (/archive/YYYY-MM) tragen index,follow und sind die kanonische Referenz."
- **Kollektive Moderation**: "Keine einzelnen moderatoren. Alle Moderationsentscheidungen erfolgen über kollektive Anträge im 7+7-Tage-Rhythmus. Outcomes steuern nur Darstellung/Distribution, niemals Textinhalte."
- **Hetzner-First**: "Phase A startet verbindlich auf Hetzner Cloud (DE); Terraform-Stacks unter /terraform/hetzner/*."
- **Delegationen erweitert**: "Stimmübertragung mit Cycle-Detection, 4-Wochen-Ablauf bei Inaktivität, direkte Stimme überschreibt temporär alle Delegationen."
- **Mindestalter**: "Teilnahme ab 16 Jahren; darunter nur mit Zustimmung Sorgeberechtigter."
- **Mobile-First-Ziele**: P95 TTI ≤ 2,5s (4G), P95 FCP ≤ 1,8s, P95 API ≤ 300ms.

### 1) UX & Onboarding

**Einfügen:**
- **Consent-Flow (erste Sitzung)**:
  1. Weltöffentlichkeit & Hybrid-Index: "Live ist für alle sichtbar, Index erfolgt über Monatsarchive."
  2. Ron-Opt-in: "Nach 84 Tagen können alle deine Handlungen automatisiert zu 'Ron' übertragen werden." (Toggle + "sofort übertragen")
  3. Kollektive Governance: "Alle Entscheidungen werden kollektiv getroffen. Stimmen sind namentlich sichtbar; mit Ron-Opt-in werden sie nach 84 Tagen zu 'Ron'."
  4. Delegationen: "Du kannst deine Stimme an andere übertragen. Delegationen sind sichtbar und verfallen nach 4 Wochen Inaktivität."
- **Ron-Filter**: Standard AN, damit Neulinge erkennen, wie "Ron" wirkt.
- **Barrierefreiheit**: Fokus-Ringe, 48px-Hit-Areas, Min-Kontrast 4,5:1, Screenreader-Labels für Marker, Timer, Fäden, Delegationspfeile.

### 2) Domäne & Regeln

**Ron – Geltungsbereich erweitern:**
- "Nach 84 Tagen ist jede Handlung optional zu 'Ron' übertragbar: Stimmen, Spenden, Beiträge, Fäden, Knoten-Inhalte, Delegationen."
- "Ausstieg via Ron = sofortige Übertragung aller Inhalte zu 'Ron'; Rollen-Entfernung 84 Tage später."

**Kollektive Moderation (ohne moderatoren):**
- Flag → Moderations-Antrag (7 Tage Einspruch + ggf. 7 Tage Abstimmung).
- **Outcomes (keine Textänderung)**:
  - "belassen" (unverändert)
  - "kennzeichnen" (Hinweisbanner)
  - "ausblenden_hinter_klick" (zugänglich, aber nicht gepusht)
  - "entzwirnen" (falls verzwirnt)
  - "ron_now" (sofortige Ron-Übertragung mit Zustimmung)
  - "de_boost" (keine prominente Platzierung)
- Event-Log bleibt unverändert; Entscheidungen sind eigene Events.

**Delegationen mit Cycle-Detection:**
- 4-Wochen-Ablauf bei Inaktivität des Delegierenden.
- Cycle-Detection für transitive Ketten (Phase B).
- Direkte Stimme überschreibt temporär alle Delegationen TO dieser Person für den jeweiligen Antrag.

**Strafbare Inhalte (Rechtspflicht, eigener Pfad):**
- Legal-Freeze (sofort): Gemeldeter Verdacht "strafbar" löst Verbergung in der Darstellung aus (kein Feed, keine Liste, kein Snippet); kein Text-Rewrite.
- Prüfung ≤ 24h durch Legal-Trustee; bei Bestätigung Löschung der Darstellung + beweissichere Archivierung offline; bei Fehlverdacht Rücknahme des Freeze.
- Audit-Sichtbarkeit: Sichtbarer Knotenrest: "Legal-Freeze am [Datum], Vorgang #..."

**Hinweis**: Dieser Pfad ist ausschließlich für mutmaßlich strafbare Inhalte; alle anderen Fälle gehen über den Kollektiv-Antrag.

### 3) Events (erweitert)

```json
// Ron-Transfers (alle Typen)
{ "type": "VoteTransferredToRon",
  "payload": { "voteId": "...", "originalVoter": "rolle-...", "ronId": "ron-..." } }

{ "type": "DonationTransferredToRon",
  "payload": { "donationId": "...", "amount": 23.00, "originalDonor": "rolle-...", "ronId": "ron-..." } }

{ "type": "DelegationTransferredToRon",
  "payload": { "delegationId": "...", "originalDelegator": "rolle-...", "ronId": "ron-..." } }

// Kollektive Moderation
{ "type": "ModerationFlagCreated",
  "payload": { "contentId": "...", "flaggerRoleId": "...", "reason": "doxxing|spam|hate|offtopic" } }

{ "type": "CollectiveModerationMotionOpened",
  "payload": { "contentId": "...", "motionId": "antrag-...", "proposedOutcome": "...", "noModerators": true } }

{ "type": "CollectiveModerationDecision",
  "payload": { "motionId": "antrag-...", "decision": "belassen|kennzeichnen|ausblenden_hinter_klick|de_boost|ron_now",
               "voteTally": { "ja": ..., "nein": ..., "enthaltung": ... }, "collectiveOnly": true } }

// Erweiterte Delegationen
{ "type": "DelegationCreatedWithCycleCheck",
  "payload": { "delegationId": "...", "fromRole": "...", "toRole": "...", "cycleDetected": false, "chainLength": 2 } }

{ "type": "DelegationOverriddenByDirectVote",
  "payload": { "delegationId": "...", "antragId": "...", "overriddenAt": "..." } }

// Legal-Freeze
{ "type": "LegalFlagReceived",
  "payload": { "contentId": "...", "category": "strafbar_verdacht", "source": "nutzer|externe_stelle" } }

{ "type": "LegalFreezeInitiated",
  "payload": { "contentId": "...", "frozenAt": "...", "estimatedReviewTime": "24h" } }

{ "type": "LegalDecision",
  "payload": { "contentId": "...", "outcome": "remove_display|unfreeze", "by": "legal_trustee", 
               "reason": "strafbar|kein_strafrecht", "reviewDuration": "18h" } }

// Governance Analytics
{ "type": "GovernanceAnomalyDetected",
  "payload": { "type": "low_participation|delegation_concentration|consensus_degradation", "severity": "warning|alert" } }
```

### 4) System-Architektur & Hetzner

- **Phase A**: Hetzner CX22/CX32 (API + Datenbank + Nachrichtensystem + In-Memory-Cache) + Netdata + Healthchecks + Governance-Analytics.
- **Phase B**: LB11 + getrennte API/Worker + Block-Storage für PostgreSQL; Read-Replica optional für Analytics.
- **Backups**: Tägliche Datenbank-Dumps + Nachrichten-Streams (Object Storage DE).
- **Sicherheit**: Gegenseitige Transportverschlüsselung intern (mTLS), TLS 1.3 extern, Content-Security-Policy strikt (kein eval), Rate-Limits (100 Schreib-Requests/5min/IP; 240 Lese-Requests/5min/IP), WebAuthn + Magic-Link für Governance-Aktionen.
- **Hybrid-Index – Header & Routing**:
  - Live-Seiten: `X-Robots-Tag: noindex, noarchive` (Karte, Feed, API).
  - Archive: `X-Robots-Tag: index, follow` + `Link rel="canonical"` auf die Monatsseite.
  - Sitemap.xml listet nur `/archive/YYYY-MM`.
- **Kosten-Metriken**: `wg_hetzner_monthly_costs_eur`, `wg_cost_per_active_user_eur`, `wg_governance_processing_costs_eur` im Gewebekonto-Dashboard.

### 5) Performance & Monitoring

- **API-Budget**: P95 < 300ms, P99 < 800ms; Governance-Endpoints: P95 < 200ms.
- **Map-Budget**: 1000 Marker @ 60fps Desktop, 30fps Mobile; P90 Map-Projektion < 500ms; Delegationsfäden-Rendering < 100ms zusätzlich.
- **Background-Jobs**: Ron-Job ≤ 5min/Tag; Governance-Timer Backlog = 0; Delegation-Expiry-Check ≤ 2min/Tag.
- **Governance-Analytics**: 
  - `wg_governance_participation_rate` (Anteil aktiver Stimmen)
  - `wg_delegation_concentration_gini` (Machtverteilung)
  - `wg_moderation_response_time_hours` (Kollektive Reaktionszeit)
  - `wg_consensus_quality_score` (Durchschnittliche Mehrheit)
- **Alarme**: HetznerCostsHighPhaseA > 200€ (warn), RonTransferFailures (warn), SlowAPIResponses P95>1000ms (warn), LowGovernanceParticipation < 0.2 (warn), HighDelegationConcentration > 0.8 (warn).

### 6) Recht & UX

**Hinweise (Onboarding + Profil):**
- "Inhalte sind weltöffentlich sichtbar. Suchmaschinen indexieren die Monatsarchive."
- "Mit Ron-Opt-in kannst du deine Identität ab 84 Tagen von allen Handlungen lösen."
- "Alle Moderation erfolgt kollektiv über Anträge - keine einzelnen moderatoren."
- "Delegationen sind sichtbar und verfallen nach 4 Wochen Inaktivität."
- "Vollständiger JSON-Export verfügbar."

**Minderjährige**: Gate wie oben.
**Export**: Vollständiger JSON-Export inkl. Ron-Historie + Governance-Teilnahme + Delegationen (Button im Profil).
**Ausstieg**: Über Ron (sofortige Übertragung), Rollen-Entfernung nach 84 Tagen.

### 7) Implementierung (Delta)

**API:**
```typescript
// Ron-System (erweitert)
POST /api/me/ron/transfer-now
  body: { types: ["threads","faeden","votes","spenden","knoten","delegationen"] }

GET /api/ron/stats
  -> { usersEnabled, itemsTransferredByType, lastRun, avgTransferTime }

// Kollektive Moderation (ohne moderatoren)
POST /api/content/{id}/flag
  body: { reason: "doxxing|spam|hate|offtopic", explanation?: string }

GET /api/moderation/motions?status=open
  -> { motions: CollectiveModerationMotion[] }

POST /api/moderation/motions/{id}/vote
  body: { vote: "ja"|"nein"|"enthaltung", reasoning?: string }

// Erweiterte Delegationen
POST /api/delegations/create
  body: { toRoleId: string, duration?: number }

GET /api/delegations/chains/{roleId}
  -> { chain: DelegationChain, cycleDetected: boolean }

// Legal (unverändert)
POST /api/legal/{id}/freeze         // legal_trustee
POST /api/legal/{id}/decision       // legal_trustee
```

**Ron-Manager (erweitern):**
```typescript
switch (item.type) {
  case 'vote':       await this.transferVoteToRon(item.id, rolleId); break;
  case 'donation':   await this.transferDonationToRon(item.id, rolleId); break;
  case 'delegation': await this.transferDelegationToRon(item.id, rolleId); break;
  // bestehend: 'faden', 'thread_post', 'knoten_content'
}
```

**Cycle-Detection (neu):**
```typescript
async checkForCycle(fromRoleId: string, toRoleId: string): Promise<boolean> {
  const visited = new Set<string>();
  const stack = [toRoleId];
  
  while (stack.length > 0) {
    const currentRole = stack.pop()!;
    if (currentRole === fromRoleId) return true; // Zyklus gefunden
    if (visited.has(currentRole)) continue;
    
    visited.add(currentRole);
    const nextDelegations = await this.getActiveDelegationsFrom(currentRole);
    stack.push(...nextDelegations.map(d => d.toRole));
  }
  return false;
}
```

**Hybrid-Index – Server-Konfiguration (nginx):**
```nginx
# Live-Streams
location ~ ^/(map|feed|api) {
  add_header X-Robots-Tag "noindex, noarchive" always;
  add_header Cache-Control "no-cache, must-revalidate" always;
}

# Monatsarchive
location ^~ /archive/ {
  add_header X-Robots-Tag "index, follow" always;
  add_header Link '<https://weltgewebe.net/archive/$year-$month>; rel="canonical"' always;
  add_header Cache-Control "public, max-age=86400" always;
}
```

### 8) Datenbank-Migrationen

```sql
-- Ron erweitert (alle Typen)
ALTER TABLE abstimmungen ADD COLUMN transferred_to_ron BOOLEAN DEFAULT FALSE;
ALTER TABLE abstimmungen ADD COLUMN ron_transferred_at TIMESTAMPTZ;

ALTER TABLE spenden ADD COLUMN transferred_to_ron BOOLEAN DEFAULT FALSE;
ALTER TABLE spenden ADD COLUMN ron_transferred_at TIMESTAMPTZ;

ALTER TABLE delegationen ADD COLUMN transferred_to_ron BOOLEAN DEFAULT FALSE;
ALTER TABLE delegationen ADD COLUMN ron_transferred_at TIMESTAMPTZ;

-- Kollektive Moderation (ohne moderatoren)
CREATE TABLE moderation_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  flagger_role_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('doxxing','spam','hate','offtopic')),
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE collective_moderation_motions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  related_content_id UUID NOT NULL,
  proposed_outcome TEXT NOT NULL CHECK (proposed_outcome IN ('belassen','kennzeichnen','ausblenden_hinter_klick','de_boost','ron_now')),
  antrag_id UUID REFERENCES antraege(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  final_decision TEXT
);

-- Erweiterte Delegationen
ALTER TABLE delegationen ADD COLUMN chain_length INTEGER DEFAULT 1;
ALTER TABLE delegationen ADD COLUMN overridden_for_antraege UUID[];
ALTER TABLE delegationen ADD COLUMN last_activity_check TIMESTAMPTZ DEFAULT now();

-- Legal-Freeze
ALTER TABLE contents ADD COLUMN legal_frozen BOOLEAN DEFAULT FALSE;
ALTER TABLE contents ADD COLUMN legal_freeze_start TIMESTAMPTZ;
ALTER TABLE contents ADD COLUMN legal_decision TEXT CHECK (legal_decision IN ('remove_display','unfreeze'));

-- Governance Analytics
CREATE TABLE governance_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value DECIMAL NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indizes (optimiert)
CREATE INDEX CONCURRENTLY idx_votes_ron_elig ON abstimmungen(created_at) WHERE transferred_to_ron = false;
CREATE INDEX CONCURRENTLY idx_spend_ron_elig ON spenden(created_at) WHERE transferred_to_ron = false;
CREATE INDEX CONCURRENTLY idx_deleg_ron_elig ON delegationen(created_at) WHERE transferred_to_ron = false;
CREATE INDEX CONCURRENTLY idx_flags_content ON moderation_flags(content_id);
CREATE INDEX CONCURRENTLY idx_collective_motions ON collective_moderation_motions(related_content_id, resolved_at);
CREATE INDEX CONCURRENTLY idx_delegations_chains ON delegationen(chain_length, is_active);
```

### 9) QA-Gates (Phase-A-Abschluss)

- **Ron-E2E**: Aktivieren → "sofort übertragen" zählt korrekt für alle 6 Typen; Daily Job verarbeitet nur >84 Tage; Votes/Spenden/Delegationen erscheinen als Ron.
- **Kollektive Moderation**: Flag → automatischer Moderations-Antrag → 7+7 Prozess → Decision steuert Distribution, niemals Text; keine moderatoren-Rollen im System.
- **Legal-Freeze**: Meldung "strafbar" → sofort verborgen (keine Listen, kein Snippet), Prüfung ≤ 24h, Audit-Events sichtbar.
- **Delegationen erweitert**: Cycle-Detection funktioniert; 4-Wochen-Ablauf bei Inaktivität; direkte Stimme überschreibt Delegationen temporär; Gewicht korrekt.
- **Governance-Analytics**: Partizipationsrate, Delegationskonzentration, Konsensqualität werden gemessen; Anomalien erkannt.
- **Mobile-Budgets**: P95 TTI ≤ 2,5s (4G), FCP ≤ 1,8s; Karte flüssig bei 1000+ Markern inkl. Delegationspfeile.
- **Kosten**: Hetzner-Kosten & Kosten pro aktivem Nutzer im Dashboard; Alarm-Regeln feuern korrekt.

***

## C) Warum dieser Patch passt

- **Maximale Demokratie**: Komplett kollektive Moderation ohne Machtkonzentration; robuste Delegationen mit Cycle-Detection.
- **Transparenz kanalisiert**: Der Suchmaschinen-Zugriff wird über Archive kanalisiert, Live-Tanz bleibt ungefiltert sichtbar.
- **Verantwortung & Schutz**: Ron löst Identität zeitversetzt von allen Handlungen (Opt-in); Legal-Freeze für Rechtspflicht.
- **Ops-tauglich**: Hetzner-Start, Performance-Budgets, Governance-Analytics, klare Migrationen.
- **Skalierbar**: Analytics erkennen Probleme frühzeitig; robuste Monitoring-Infrastruktur.

***

**∴ Kollektive Intelligenz trifft technische Robustheit**

*Wir schaffen ein System, das sich selbst regiert, sich selbst schützt und sich selbst optimiert - ohne einzelne Machtpositionen, mit vollständiger Transparenz und optionaler Anonymisierung.*

***

- Gibt es unthematisierte Aspekte? **Monitoring**: Koordinierte Angriffe auf Moderations-Anträge; **Legal**: Länderübergreifende Rechtsersuchen bei Hetzner-DE-Speicherort; **Performance**: Cache-Zeiten der Archive.
