# 🌐 PATCH v15.2 — Synthese: Kollektive Governance + Hetzner-Infrastruktur

**Vereint das Beste aus beiden Welten: Konsequent kollektive Moderation ohne Moderatoren + robuste Hetzner-First-Infrastruktur mit Hybrid-Indexierung und Ron-System.**

***

## A) Ziele (optimiert & erweitert)

- **Ron komplettieren**: Jede Handlung (Stimmen, Spenden, Beiträge, Fäden, Knoten-Inhalte) nach 84 Tagen optional anonymisierbar (Opt-in, "sofort übertragen", Daily-Job)
- **Hybrid-Indexierung**: Weltöffentlich sichtbar, aber Index nur über Monatsarchive; Live-Ströme mit noindex/noarchive
- **Komplett kollektive Moderation**: Keine einzelnen Moderatoren; alle Entscheidungen über demokratische Anträge mit 7+7-Tage-Rhythmus
- **Strafbare Inhalte**: Sofortiges Legal-Freeze + 24h-Prüfung mit vollständiger Audit-Spur
- **Delegationen mit Cycle-Detection**: 4-Wochen-Ablauf, transitive Ketten, automatische Überschreibung durch direkte Stimme
- **Hetzner-First**: Terraform-Stacks, Performance-Budgets, Kosten-Tracking
- **Mobile-First messbar**: P95 TTI ≤ 2,5s (4G), P95 FCP ≤ 1,8s, P95 API ≤ 300ms
- **Governance-Analytics**: Proaktive Erkennung von Kampagnen, Machtkonzentrationen, Partizipationsproblemen

***

## B) System-Änderungen (detailliert)

### 0) Leitplanken & Prinzipien (erweitert)

**Sichtbarkeit & Indexierung:**
```
Das Weltgewebe ist weltöffentlich. Hybrid-Indexierung: Live-Ströme (/map, /feed, /api/*) 
tragen noindex, noarchive; Monatsarchive (/archive/YYYY-MM) tragen index,follow und sind 
die kanonische Referenz für Suchmaschinen.
```

**Kollektive Moderation (neu):**
```
Keine einzelnen Moderatoren. Alle Moderationsentscheidungen erfolgen über kollektive 
Anträge im 7+7-Tage-Rhythmus. Outcomes steuern nur Darstellung/Distribution, niemals Textinhalte.
```

**Delegationen erweitert:**
```
Stimmübertragung mit Cycle-Detection, 4-Wochen-Ablauf bei Inaktivität, direkte Stimme 
überschreibt temporär alle Delegationen. Transitive Ketten in Phase B möglich.
```

**Hetzner-First & Performance:**
```
Phase A startet verbindlich auf Hetzner Cloud (DE); Terraform-Stacks unter /terraform/hetzner/*.
Performance-Budgets: P95 TTI ≤ 2,5s (4G), P95 FCP ≤ 1,8s, P95 API ≤ 300ms.
```

**Mindestalter:**
```
Teilnahme ab 16 Jahren; darunter nur mit Zustimmung Sorgeberechtigter.
```

### 1) UX & Onboarding (optimiert)

**Consent-Flow (erste Sitzung):**
1. **Weltöffentlichkeit & Hybrid-Index**: "Live ist für alle sichtbar, Index erfolgt über Monatsarchive"
2. **Ron-Opt-in**: "Nach 84 Tagen können alle deine Handlungen automatisiert zu 'Ron' übertragen werden" (Toggle + "sofort übertragen")
3. **Kollektive Governance**: "Alle Entscheidungen werden kollektiv getroffen. Stimmen sind namentlich sichtbar; mit Ron-Opt-in werden sie nach 84 Tagen zu 'Ron'"
4. **Delegationen**: "Du kannst deine Stimme an andere übertragen. Delegationen sind sichtbar und verfallen nach 4 Wochen Inaktivität"

**Barrierefreiheit (erweitert):**
- Fokus-Ringe für alle interaktiven Elemente
- 48px Hit-Areas auf Mobile
- Min-Kontrast 4,5:1
- Screenreader-Labels für Marker, Timer, Fäden, Delegationspfeile
- Semantische ARIA-Struktur für Governance-Prozesse

**Ron-Filter:**
- Standard AN für neue Nutzer, damit sie sehen wie Ron-Anonymisierung wirkt
- Klare Visualisierung der Anonymisierungseffekte

### 2) Domäne & Regeln (kollektiv + technisch)

**Ron-System (präzisiert):**
```typescript
// Vollständiger Geltungsbereich
const RON_TRANSFERABLE_TYPES = [
  'stimmen',        // Abstimmungen in Anträgen
  'spenden',        // Goldfäden zum Gewebekonto  
  'beiträge',       // Thread-Posts, Kommentare
  'fäden',          // Alle Fadentypen (Gespräch, Gestaltung, etc.)
  'knoten-inhalte', // Knoten-Erstellungen und -Edits
  'delegationen'    // Stimmübertragungen
];

// Ausstieg via Ron = sofortige Übertragung ALLER Inhalte zu Ron; 
// Rollen-Entfernung 84 Tage später
```

**Kollektive Moderation (ohne Moderatoren):**
```
Flag → Moderations-Antrag → 7 Tage Einspruch → ggf. 7 Tage Abstimmung → Kollektive Entscheidung

Outcomes (keine Textänderung):
- "belassen" (unverändert)
- "kennzeichnen" (Hinweisbanner)  
- "ausblenden_hinter_klick" (zugänglich, aber nicht gepusht)
- "entzwirnen" (falls verzwirnt)
- "ron_now" (sofortige Ron-Übertragung mit Zustimmung)
- "de_boost" (keine prominente Platzierung)

Event-Log bleibt unverändert; Entscheidungen sind eigene Events.
```

**Delegationen mit Cycle-Detection (erweitert):**
```typescript
class EnhancedDelegationManager {
  // Cycle-Detection für transitive Delegationen (Phase B)
  private async checkForCycle(fromRoleId: string, toRoleId: string): Promise<boolean> {
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
  
  // Direkte Stimme überschreibt temporär alle Delegationen TO dieser Person
  async voteWithDelegationOverride(antragId: string, voterId: string, choice: VoteChoice) {
    const delegatedVoters = await this.getDelegatingTo(voterId);
    
    // Markiere Delegationen als temporär überschrieben für diesen Antrag
    for (const delegatedVoter of delegatedVoters) {
      await this.markDelegationOverridden(delegatedVoter.id, antragId);
    }
    
    const weight = await this.getVoteWeight(voterId);
    await this.governanceManager.submitVote(antragId, voterId, choice, weight);
  }
}
```

**Strafbare Inhalte (eigener Pfad):**
```
Legal-Freeze (sofort): Gemeldeter Verdacht "strafbar" löst Verbergung in der Darstellung aus 
(kein Feed, keine Liste, kein Snippet); kein Text-Rewrite.

Prüfung ≤ 24h durch Legal-Trustee; bei Bestätigung Löschung der Darstellung + 
beweissichere Archivierung offline; bei Fehlverdacht Rücknahme des Freeze.

Audit-Sichtbarkeit: Sichtbarer Knotenrest: "Legal-Freeze am [Datum], Vorgang #..."

Hinweis: Dieser Pfad ist ausschließlich für mutmaßlich strafbare Inhalte; 
alle anderen Fälle gehen über den Kollektiv-Antrag.
```

### 3) Events (vollständig erweitert)

```json
// Ron-Transfers (alle Typen)
{ "type": "VoteTransferredToRon",
  "payload": { "voteId": "...", "originalVoter": "rolle-...", "ronId": "ron-..." } }

{ "type": "DonationTransferredToRon", 
  "payload": { "donationId": "...", "amount": 23.00, "originalDonor": "rolle-...", "ronId": "ron-..." } }

{ "type": "DelegationTransferredToRon",
  "payload": { "delegationId": "...", "originalDelegator": "rolle-...", "ronId": "ron-..." } }

// Kollektive Moderation (ohne Moderatoren)
{ "type": "ModerationFlagCreated",
  "payload": { "contentId": "...", "flaggerRoleId": "...", "reason": "doxxing|spam|hate|offtopic" } }

{ "type": "ModerationMotionOpened", 
  "payload": { "contentId": "...", "motionId": "antrag-...", "proposedOutcome": "...", "createdByCollective": true } }

{ "type": "ModerationDecision",
  "payload": { "motionId": "antrag-...", "decision": "belassen|kennzeichnen|ausblenden_hinter_klick|de_boost|ron_now",
               "voteTally": { "ja": ..., "nein": ..., "enthaltung": ... }, "collectiveDecision": true } }

// Erweiterte Delegationen
{ "type": "DelegationCreatedWithCycleCheck",
  "payload": { "delegationId": "...", "fromRole": "...", "toRole": "...", "cycleDetected": false, "chainLength": 2 } }

{ "type": "DelegationOverriddenByDirectVote",
  "payload": { "delegationId": "...", "antragId": "...", "overriddenAt": "..." } }

{ "type": "DelegationExpiredDueToInactivity", 
  "payload": { "delegationId": "...", "lastActivityDate": "...", "inactiveDays": 28 } }

// Legal-Freeze (unverändert aber erweitert)
{ "type": "LegalFlagReceived",
  "payload": { "contentId": "...", "category": "strafbar_verdacht", "source": "nutzer|externe_stelle", "reporterId": "..." } }

{ "type": "LegalFreezeInitiated",
  "payload": { "contentId": "...", "frozenAt": "...", "estimatedReviewTime": "24h" } }

{ "type": "LegalDecision", 
  "payload": { "contentId": "...", "outcome": "remove_display|unfreeze", "by": "legal_trustee", 
               "reason": "strafbar|kein_strafrecht", "reviewDuration": "18h" } }

// Governance Analytics
{ "type": "GovernanceAnomalyDetected",
  "payload": { "type": "high_objection_rate|vote_camping|delegation_concentration", "severity": "warning|alert" } }
```

### 4) System-Architektur & Hetzner (optimiert)

**Phase A (erweitert):**
- Hetzner CX22/CX32 (API + Datenbank + Nachrichtensystem + In-Memory-Cache)
- Netdata + Healthchecks + Custom Governance Metrics
- Kollektive Moderation läuft über Standard-Governance-Engine

**Phase B (optimiert):**
- LB11 + getrennte API/Worker + Block-Storage für PostgreSQL
- Read-Replica optional für Analytics
- Erweiterte Delegations-Processing-Worker

**Sicherheit (erweitert):**
- Gegenseitige Transportverschlüsselung intern (mTLS)
- TLS 1.3 extern, Content-Security-Policy strikt (kein eval)
- Rate-Limits: 100 Schreib-Requests/5min/IP; 240 Lese-Requests/5min/IP
- WebAuthn + Magic-Link für alle Governance-Aktionen

**Hybrid-Index (detailliert):**
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

# Kollektive Moderationsentscheidungen auch in Archiven
location ^~ /archive/moderation/ {
  add_header X-Robots-Tag "index, follow" always;
}
```

**Kosten-Metriken (erweitert):**
```typescript
export const enhancedCostMetrics = {
  hetznerMonthlyCosts: new Gauge({
    name: 'wg_hetzner_monthly_costs_eur',
    labelNames: ['resource_type', 'phase']
  }),
  
  costPerActiveUser: new Gauge({
    name: 'wg_cost_per_active_user_eur'
  }),
  
  governanceProcessingCosts: new Gauge({
    name: 'wg_governance_processing_costs_eur',
    help: 'CPU-Kosten für Abstimmungen, Delegationen, Timer'
  }),
  
  ronProcessingCosts: new Gauge({
    name: 'wg_ron_processing_costs_eur', 
    help: 'Storage- und Processing-Kosten für Ron-Transfers'
  })
};
```

### 5) Performance & Monitoring (governance-optimiert)

**API-Budget (erweitert):**
- P95 < 300ms, P99 < 800ms
- Governance-Endpoints: P95 < 200ms (kritisch für Abstimmungen)
- Ron-Transfer-Endpoints: P95 < 500ms

**Map-Budget:**
- 1000 Marker @ 60fps Desktop, 30fps Mobile
- P90 Map-Projektion < 500ms
- Delegationsfäden-Rendering < 100ms zusätzlich

**Background-Jobs (erweitert):**
- Ron-Job ≤ 5min/Tag
- Governance-Timer Backlog = 0
- Delegation-Expiry-Check ≤ 2min/Tag
- Kollektive Moderation Processing ≤ 1min/Antrag

**Governance-Analytics (neu):**
```typescript
export const governanceAnalytics = {
  participationRate: new Gauge({
    name: 'wg_governance_participation_rate',
    help: 'Anteil aktiver Stimmen zu Gesamtrollen'
  }),
  
  delegationConcentration: new Gauge({
    name: 'wg_delegation_concentration_gini',
    help: 'Gini-Index der Stimmgewichtsverteilung'
  }),
  
  moderationResponseTime: new Histogram({
    name: 'wg_moderation_response_time_hours',
    help: 'Zeit von Flag bis kollektiver Entscheidung',
    buckets: [1, 6, 24, 72, 168] // 1h bis 1 Woche
  }),
  
  consensusQuality: new Gauge({
    name: 'wg_consensus_quality_score',
    help: 'Durchschnittliche Mehrheit bei Abstimmungen (0-1)'
  })
};
```

**Alarme (governance-erweitert):**
```yaml
- alert: LowGovernanceParticipation
  expr: wg_governance_participation_rate < 0.2
  for: 24h
  labels:
    severity: warning
  annotations:
    summary: "Niedrige Governance-Beteiligung"

- alert: HighDelegationConcentration  
  expr: wg_delegation_concentration_gini > 0.8
  for: 12h
  labels:
    severity: warning
  annotations:
    summary: "Hohe Machtkonzentration durch Delegationen"

- alert: ModerationBacklog
  expr: count(wg_moderation_response_time_hours_bucket{le="72"}) > 10
  for: 6h
  labels:
    severity: warning
  annotations:
    summary: "Moderations-Rückstau - über 10 offene Fälle"
```

### 6) Recht & UX (kollektiv-optimiert)

**Hinweise (Onboarding + Profil):**
- "Inhalte sind weltöffentlich sichtbar. Suchmaschinen indexieren die Monatsarchive"
- "Mit Ron-Opt-in kannst du deine Identität ab 84 Tagen von allen Handlungen lösen"
- "Alle Moderation erfolgt kollektiv über Anträge - keine einzelnen Moderatoren"
- "Delegationen sind sichtbar und verfallen nach 4 Wochen Inaktivität"
- "Vollständiger JSON-Export verfügbar"

**Export (erweitert):**
```typescript
interface CollectiveExportData {
  personalData: PersonalInfo;
  activities: ActivityHistory;
  governance: {
    votes: Vote[];
    delegationsGiven: Delegation[];
    delegationsReceived: Delegation[];
    moderationFlags: ModerationFlag[];
    moderationVotes: ModerationVote[];
  };
  ronData: {
    transfers: RonTransfer[];
    eligibleContent: EligibleContent[];
    anonymizedContent: AnonymizedContent[];
  };
  collectiveDecisions: CollectiveDecision[];
}
```

### 7) Implementierung (synthesis-optimiert)

**API (erweitert):**
```typescript
// Ron-System
POST /api/me/ron/transfer-now
  body: { types: ["threads","faeden","votes","spenden","knoten","delegationen"] }

GET /api/ron/stats
  -> { usersEnabled, itemsTransferredByType, lastRun, avgTransferTime }

// Kollektive Moderation  
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

POST /api/delegations/{id}/extend
  body: { additionalWeeks: number }

// Legal (unverändert aber erweitert)
POST /api/legal/{id}/freeze         // legal_trustee
POST /api/legal/{id}/decision       // legal_trustee
  body: { decision: "remove_display"|"unfreeze", reason: string }
```

**Ron-Manager (vollständig):**
```typescript
class EnhancedRonManager {
  async transferAllTypesToRon(rolleId: string, types: string[]): Promise<RonTransferResult> {
    const results = [];
    
    for (const type of types) {
      switch (type) {
        case 'votes':
          results.push(await this.transferVotesToRon(rolleId));
          break;
        case 'donations': 
          results.push(await this.transferDonationsToRon(rolleId));
          break;
        case 'delegations':
          results.push(await this.transferDelegationsToRon(rolleId));
          break;
        case 'threads':
          results.push(await this.transferThreadsToRon(rolleId));
          break;
        case 'faeden':
          results.push(await this.transferFaedenToRon(rolleId));
          break;
        case 'knoten':
          results.push(await this.transferKnotenContentToRon(rolleId));
          break;
      }
    }
    
    return this.aggregateResults(results);
  }
}
```

### 8) Datenbank-Migrationen (vollständig)

```sql
-- Ron erweitert (alle Typen)
ALTER TABLE abstimmungen ADD COLUMN transferred_to_ron BOOLEAN DEFAULT FALSE;
ALTER TABLE abstimmungen ADD COLUMN ron_transferred_at TIMESTAMPTZ;

ALTER TABLE spenden ADD COLUMN transferred_to_ron BOOLEAN DEFAULT FALSE; 
ALTER TABLE spenden ADD COLUMN ron_transferred_at TIMESTAMPTZ;

ALTER TABLE delegationen ADD COLUMN transferred_to_ron BOOLEAN DEFAULT FALSE;
ALTER TABLE delegationen ADD COLUMN ron_transferred_at TIMESTAMPTZ;

-- Kollektive Moderation (ohne Moderatoren)
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
ALTER TABLE contents ADD COLUMN legal_decision_at TIMESTAMPTZ;

-- Analytics & Governance Tracking
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
CREATE INDEX CONCURRENTLY idx_contents_legal_frozen ON contents(legal_frozen, legal_freeze_start);
```

### 9) QA-Gates (synthesis-optimiert)

**Ron-System (erweitert):**
- ✅ Aktivieren → "sofort übertragen" funktioniert für alle 6 Typen
- ✅ Daily Job verarbeitet nur >84 Tage korrekt  
- ✅ Votes/Spenden/Delegationen erscheinen als Ron
- ✅ Ausstiegsprozess überträgt alle Inhalte und entfernt Rolle nach 84 Tagen

**Kollektive Moderation:**
- ✅ Flag → automatischer Moderations-Antrag → 7+7 Prozess
- ✅ Decision steuert Distribution, niemals Text
- ✅ Keine Moderatoren-Rollen im System
- ✅ Vollständige Audit-Spur aller kollektiven Entscheidungen

**Delegationen (erweitert):**
- ✅ Cycle-Detection funktioniert korrekt
- ✅ 4-Wochen-Ablauf bei Inaktivität
- ✅ Direkte Stimme überschreibt Delegationen temporär
- ✅ Stimmgewicht wird korrekt berechnet

**Legal-Freeze:**
- ✅ Meldung "strafbar" → sofort verborgen
- ✅ Prüfung ≤ 24h mit korrekter Audit-Spur
- ✅ Freeze/Unfreeze Events sichtbar

**Performance & Infrastructure:**
- ✅ Mobile-Budgets: P95 TTI ≤ 2,5s (4G), FCP ≤ 1,8s
- ✅ Karte flüssig bei 1000+ Markern inkl. Delegationspfeile
- ✅ Hetzner-Kosten & Kosten pro Nutzer korrekt getrackt
- ✅ Governance-Analytics erkennt Anomalien

***

## C) Warum diese Synthese optimal ist

**Maximale Demokratie**: Komplett kollektive Moderation ohne Machtkonzentration bei einzelnen Moderatoren, mit robusten Schutzmechanismen gegen Missbrauch.

**Technische Exzellenz**: Bewährte Hetzner-Infrastruktur, Performance-Budgets, Hybrid-Indexierung für SEO-Optimierung bei Datenschutz.

**Rechtssicherheit**: Legal-Freeze für Compliance, vollständige Audit-Trails, DSGVO-konforme Ron-Anonymisierung.

**Skalierbarkeit**: Governance-Analytics erkennen Probleme frühzeitig; Delegationssystem verhindert Partizipationsausfall; robuste Monitoring-Infrastruktur.

**Benutzerfreundlichkeit**: Mobile-First, Barrierefreiheit, klare Consent-Flows, vollständige Transparenz aller Prozesse.

***

**∴ Diese Synthese vereint konsequente Demokratie mit technischer Robustheit - ein kollektiv regiertes System, das produktionsbereit, rechtssicher und langfristig skalierbar ist.**

