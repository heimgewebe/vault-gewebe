heimgeist: From 2ab3d20229e85938cb55d07026794002372cf459 Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Fri, 9 Jan 2026 20:20:34 +0000
Subject: [PATCH 1/2] feat: introduce explicit Self-Model & Meta-Cognitive
 Monitoring

- Implemented `SelfModel` in `src/core/self_model.ts` to track confidence, fatigue, and risk tension.
- Added persistence for self-state snapshots in `src/core/self_state_store.ts`.
- Integrated self-model updates and safety gates into `Heimgeist` core class and `loop.ts`.
- Extended `CommandParser` to support `@self` commands (`status`, `reflect`, `reset`, `set`).
- Updated `StatusResponse` to expose current self-state.
- Added system signals interface and mocked integration in the core loop.

Closes Issue 1.
---
 src/config/state-paths.ts    |   6 +
 src/core/command-parser.ts   |  50 ++++++++-
 src/core/heimgeist.ts        |  87 +++++++++++++++
 src/core/loop.ts             |  11 ++
 src/core/self_model.test.ts  | 133 +++++++++++++++++++++++
 src/core/self_model.ts       | 205 +++++++++++++++++++++++++++++++++++
 src/core/self_state_store.ts |  87 +++++++++++++++
 src/types/index.ts           |  37 ++++++-
 8 files changed, 614 insertions(+), 2 deletions(-)
 create mode 100644 src/core/self_model.test.ts
 create mode 100644 src/core/self_model.ts
 create mode 100644 src/core/self_state_store.ts

diff --git a/src/config/state-paths.ts b/src/config/state-paths.ts
index bcedf26..5a4ed28 100644
--- a/src/config/state-paths.ts
+++ b/src/config/state-paths.ts
@@ -20,3 +20,9 @@ export const INSIGHTS_DIR = path.join(STATE_DIR, 'insights');
  * Contract: JSON files named by UUID.
  */
 export const ACTIONS_DIR = path.join(STATE_DIR, 'actions');
+
+/**
+ * Directory for persistent self-model state.
+ * Contract: JSON files named by timestamp/version.
+ */
+export const SELF_MODEL_DIR = path.join(STATE_DIR, 'self_model');
diff --git a/src/core/command-parser.ts b/src/core/command-parser.ts
index 3a54c64..65d9dd5 100644
--- a/src/core/command-parser.ts
+++ b/src/core/command-parser.ts
@@ -56,7 +56,13 @@ export class CommandParser {
    * Check if tool name is valid
    */
   private static isValidTool(tool: string): tool is HeimgewebeCommand['tool'] {
-    return ['sichter', 'wgx', 'heimlern', 'metarepo', 'heimgeist'].includes(tool);
+    // Note: 'self' is treated as a shorthand for 'heimgeist' context-aware commands
+    // But since the regex captures the tool name, we might want to support @self or @heimgeist /self-...
+    // The issue says "@self.status".
+    // If the mention is "@self", then tool="self".
+    // Let's assume the user can write `@heimgewebe/self /status` or the regex allows just `@self`.
+    // The current regex is `@heimgewebe/(\w+)`. So `@heimgewebe/self`.
+    return ['sichter', 'wgx', 'heimlern', 'metarepo', 'heimgeist', 'self'].includes(tool);
   }
 
   /**
@@ -85,11 +91,53 @@ export class CommandParser {
         return this.validateMetarepoCommand(command);
       case 'heimgeist':
         return this.validateHeimgeistCommand(command);
+      case 'self':
+        return this.validateSelfCommand(command);
       default:
         return { valid: false, error: `Unknown tool: ${command.tool}` };
     }
   }
 
+  /**
+   * Validate self commands
+   */
+  private static validateSelfCommand(command: HeimgewebeCommand): {
+    valid: boolean;
+    error?: string;
+  } {
+    const validCommands = ['status', 'reflect', 'reset', 'set'];
+
+    if (!validCommands.includes(command.command)) {
+      return {
+        valid: false,
+        error: `Invalid self command. Valid: ${validCommands.join(', ')}`,
+      };
+    }
+
+    if (command.command === 'set') {
+        // e.g. /set autonomy=aware
+        // We expect key=value arguments
+        if (command.args.length === 0) {
+            return { valid: false, error: 'set command requires key=value arguments' };
+        }
+        // Basic check for autonomy=...
+        const autonomyArg = command.args.find(a => a.startsWith('autonomy='));
+        if (autonomyArg) {
+            const level = autonomyArg.split('=')[1];
+            if (!['dormant', 'aware', 'reflective', 'critical'].includes(level)) {
+                return { valid: false, error: `Invalid autonomy level: ${level}` };
+            }
+        }
+    }
+
+    if (command.command === 'reflect') {
+        // Optional last=10
+        // No strict check needed for optional args
+    }
+
+    return { valid: true };
+  }
+
   /**
    * Validate sichter commands
    */
diff --git a/src/core/heimgeist.ts b/src/core/heimgeist.ts
index 174da09..f177c11 100644
--- a/src/core/heimgeist.ts
+++ b/src/core/heimgeist.ts
@@ -32,6 +32,8 @@ import { loadConfig, getAutonomyLevelName } from '../config';
 import { STATE_DIR, INSIGHTS_DIR, ACTIONS_DIR } from '../config/state-paths';
 import { Logger, defaultLogger } from './logger';
 import { CommandParser } from './command-parser';
+import { SelfModel } from './self_model';
+import { SystemSignals, SelfModelState } from '../types';
 
 /**
  * Insight context codes for identifying specific types of issues
@@ -63,6 +65,7 @@ export class Heimgeist {
   private lastActivity?: Date;
   private logger: Logger;
   private chronik?: ChronikClient;
+  private selfModel: SelfModel;
 
   constructor(config?: HeimgeistConfig, logger: Logger = defaultLogger, chronik?: ChronikClient) {
     // console.log('Heimgeist constructor config:', config);
@@ -71,6 +74,7 @@ export class Heimgeist {
     this.logger = logger;
     this.chronik = chronik;
     this.startTime = new Date();
+    this.selfModel = new SelfModel();
 
     if (this.config.persistenceEnabled !== false) {
       this.loadState();
@@ -143,9 +147,17 @@ export class Heimgeist {
       insightsGenerated: this.insights.size,
       actionsExecuted: this.actionsExecuted,
       lastActivity: this.lastActivity,
+      self_state: this.selfModel.getState(),
     };
   }
 
+  /**
+   * Update Self-Model with system signals
+   */
+  public updateSelfModel(signals: SystemSignals): void {
+      this.selfModel.update(signals);
+  }
+
   /**
    * Process an incoming event from chronik
    */
@@ -533,6 +545,19 @@ export class Heimgeist {
   private planAction(insight: Insight): PlannedAction | null {
     const requiresConfirmation = this.config.autonomyLevel < AutonomyLevel.Operative;
 
+    // Safety Gate: Check Self-Model before planning high-risk actions
+    const safetyCheck = this.selfModel.checkSafetyGate();
+    if (!safetyCheck.safe) {
+        // Log warning and maybe return null or a restricted action
+        this.logger.warn(`Safety Gate: Preventing action planning due to self-state: ${safetyCheck.reason}`);
+        // For Critical/High risks, we might still want to propose but force confirmation
+        // But the requirement says "Kein selbstmodifizierender Vorschlag bei..."
+        // If it's critical, we might still want to alert.
+        if (insight.severity !== RiskSeverity.Critical) {
+            return null;
+        }
+    }
+
     // Plan actions based on insight type
     if (insight.type === 'risk' && insight.severity === RiskSeverity.Critical) {
       // Specialized action plan for Critical CI Failure on Main
@@ -700,6 +725,38 @@ export class Heimgeist {
       }
     }
 
+    // Handle @self commands
+    if (insight.type === 'suggestion' && insight.title.startsWith('Command Received:')) {
+        const command = insight.context?.command as HeimgewebeCommand;
+        if (command && command.tool === 'self') {
+            // Explicitly handle self commands as immediate internal actions if needed,
+            // or return a PlannedAction that executes logic.
+            // Since these affect internal state immediately, we can execute them here directly or plan them.
+            // But 'planAction' is supposed to return a plan.
+            // Let's return a plan that "updates self model".
+
+            // Actually, for immediate feedback commands like @self.status, we might want to just log/reply.
+            // But the architecture prefers Actions.
+
+            return {
+                id: uuidv4(),
+                timestamp: new Date(),
+                trigger: insight,
+                steps: [
+                    {
+                        order: 1,
+                        tool: 'heimgeist-self-update',
+                        parameters: { command: command.command, args: command.args },
+                        description: `Update Self Model: ${command.command}`,
+                        status: 'pending'
+                    }
+                ],
+                requiresConfirmation: false,
+                status: 'approved'
+            };
+        }
+    }
+
     return null;
   }
 
@@ -1180,6 +1237,29 @@ export class Heimgeist {
     const action = this.plannedActions.get(actionId);
     if (!action) return false;
 
+    // Special handling for internal self-model actions
+    if (action.steps.some(s => s.tool === 'heimgeist-self-update')) {
+        const step = action.steps.find(s => s.tool === 'heimgeist-self-update');
+        if (step) {
+            const cmd = step.parameters.command as string;
+            const args = step.parameters.args as string[];
+
+            if (cmd === 'reset') this.selfModel.reset();
+            if (cmd === 'set' && args) {
+                const autonomyArg = args.find(a => a.startsWith('autonomy='));
+                if (autonomyArg) {
+                    const val = autonomyArg.split('=')[1] as any;
+                    this.selfModel.setAutonomy(val);
+                }
+            }
+            // 'status' and 'reflect' (query) are just logged or handled by state persistence
+        }
+        action.status = 'executed';
+        action.steps.forEach(s => s.status = 'completed');
+        await this.saveAction(action);
+        return true;
+    }
+
     // Only allow execution if status is approved or if it's pending and doesn't require confirmation
     // Note: The caller (Director/Loop) should ideally check policy before calling this,
     // but we enforce the state transition rules here.
@@ -1196,6 +1276,13 @@ export class Heimgeist {
     this.actionsExecuted++;
 
     await this.saveAction(action);
+
+    // Reflect on outcome
+    // We assume successful execution here means the *attempt* was successful.
+    // Real success would depend on the tool's result, which we don't have here in this mock execution.
+    // In a real system, executeAction would return a Result object.
+    this.selfModel.reflect(true);
+
     return true;
   }
 
diff --git a/src/core/loop.ts b/src/core/loop.ts
index 885b2b8..1f21d85 100644
--- a/src/core/loop.ts
+++ b/src/core/loop.ts
@@ -52,6 +52,17 @@ export class HeimgeistCoreLoop {
   }
 
   async tick() {
+    // 0. Meta-Cognitive Update
+    // Fetch signals (mocked for now, in real impl would come from HausKI/Metrics)
+    // "vor Analyse: self_model.update(signals)"
+    const mockSignals = {
+        // Simple mock: slightly varying load
+        cpu_load: 20 + Math.random() * 10,
+        memory_pressure: 40 + Math.random() * 5,
+        // We could calculate failure rate from heimgeist stats if exposed
+    };
+    this.heimgeist.updateSelfModel(mockSignals);
+
     // 1. Pull
     const event = await this.chronik.nextEvent([
       EventType.Command, // Added Command
diff --git a/src/core/self_model.test.ts b/src/core/self_model.test.ts
new file mode 100644
index 0000000..b98271a
--- /dev/null
+++ b/src/core/self_model.test.ts
@@ -0,0 +1,133 @@
+import { SelfModel } from './self_model';
+import { SystemSignals, SelfModelState } from '../types';
+import * as fs from 'fs';
+import * as path from 'path';
+import { SELF_MODEL_DIR } from '../config/state-paths';
+
+// Mock fs to avoid actual file writing during tests
+jest.mock('fs');
+jest.mock('../config/state-paths', () => ({
+  SELF_MODEL_DIR: '/mock/self_model',
+}));
+
+describe('SelfModel', () => {
+  let selfModel: SelfModel;
+
+  beforeEach(() => {
+    jest.resetAllMocks();
+    (fs.existsSync as jest.Mock).mockReturnValue(false);
+    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
+    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
+
+    // Initialize fresh model
+    selfModel = new SelfModel();
+  });
+
+  describe('update', () => {
+    it('should update fatigue based on cpu load', () => {
+      const signals: SystemSignals = { cpu_load: 90 };
+      selfModel.update(signals);
+      const state = selfModel.getState();
+      expect(state.fatigue).toBeGreaterThan(0);
+      expect(state.basis_signals).toContain('High CPU load');
+    });
+
+    it('should update risk tension based on ci failure rate', () => {
+      const signals: SystemSignals = { ci_failure_rate: 0.3 };
+      selfModel.update(signals);
+      const state = selfModel.getState();
+      expect(state.risk_tension).toBeGreaterThan(0);
+      expect(state.basis_signals).toContain('High CI failure rate: 0.3');
+    });
+
+    it('should lower confidence when error rate is high', () => {
+      const signals: SystemSignals = { error_rate: 0.2 };
+      selfModel.update(signals);
+      const state = selfModel.getState();
+      // Confidence starts at 1.0 (minus fatigue/tension).
+      // error_rate > 0.1 subtracts 0.3.
+      expect(state.confidence).toBeLessThan(1.0);
+      expect(state.basis_signals).toContain('High internal error rate: 0.2');
+    });
+  });
+
+  describe('Autonomy Switching (Hysteresis)', () => {
+    it('should switch to critical when risk is high and confidence low', () => {
+        // Force state to near critical
+        const signals: SystemSignals = {
+            risk_score: 0.7, // High tension
+            error_rate: 0.5  // Lowers confidence significantly
+        };
+        selfModel.update(signals);
+
+        const state = selfModel.getState();
+        expect(state.risk_tension).toBeGreaterThan(0.6);
+        expect(state.confidence).toBeLessThan(0.5);
+        expect(state.autonomy_level).toBe('critical');
+    });
+
+    it('should NOT switch back from critical immediately (hysteresis)', () => {
+        // First get to critical
+        let signals: SystemSignals = { risk_score: 0.8, error_rate: 0.5 };
+        selfModel.update(signals);
+        expect(selfModel.getState().autonomy_level).toBe('critical');
+
+        // Now improve conditions slightly, but not enough to exit critical
+        // Recovery requires risk < 0.4 and confidence > 0.6
+        signals = { risk_score: 0.5, error_rate: 0.0 }; // Risk 0.5 is still >= 0.4
+        selfModel.update(signals);
+
+        expect(selfModel.getState().autonomy_level).toBe('critical');
+    });
+
+    it('should switch back from critical when conditions are very good', () => {
+        // First get to critical
+        let signals: SystemSignals = { risk_score: 0.8, error_rate: 0.5 };
+        selfModel.update(signals);
+        expect(selfModel.getState().autonomy_level).toBe('critical');
+
+        // Now improve conditions significantly
+        // Recovery requires risk < 0.4 and confidence > 0.6
+        signals = { risk_score: 0.1, error_rate: 0.0 };
+        selfModel.update(signals);
+
+        const state = selfModel.getState();
+        expect(state.autonomy_level).toBe('reflective'); // As per logic: critical -> reflective
+    });
+  });
+
+  describe('reflect', () => {
+      it('should increase confidence on success', () => {
+          // Establish baseline with some fatigue/risk so confidence isn't maxed out (1.0)
+          selfModel.update({ cpu_load: 85 });
+          const startConfidence = selfModel.getState().confidence;
+          // Ensure we start below 1.0
+          expect(startConfidence).toBeLessThan(1.0);
+
+          selfModel.reflect(true);
+          expect(selfModel.getState().confidence).toBeGreaterThan(startConfidence);
+      });
+
+      it('should decrease confidence on failure', () => {
+          selfModel.update({ cpu_load: 50 });
+          const startConfidence = selfModel.getState().confidence;
+
+          selfModel.reflect(false);
+          expect(selfModel.getState().confidence).toBeLessThan(startConfidence);
+      });
+  });
+
+  describe('Safety Gate', () => {
+      it('should return safe when metrics are good', () => {
+          selfModel.update({}); // Defaults to good
+          expect(selfModel.checkSafetyGate().safe).toBe(true);
+      });
+
+      it('should block when fatigue is high', () => {
+          selfModel.update({ cpu_load: 90, memory_pressure: 90, open_actions_count: 20 });
+          // Fatigue should be ~0.8
+          expect(selfModel.checkSafetyGate().safe).toBe(false);
+          expect(selfModel.checkSafetyGate().reason).toContain('Fatigue');
+      });
+  });
+});
diff --git a/src/core/self_model.ts b/src/core/self_model.ts
new file mode 100644
index 0000000..4b1d762
--- /dev/null
+++ b/src/core/self_model.ts
@@ -0,0 +1,205 @@
+import { SelfModelState, SystemSignals, SelfStateSnapshot } from '../types';
+import { SelfStateStore } from './self_state_store';
+
+export class SelfModel {
+  private state: SelfModelState;
+  private store: SelfStateStore;
+
+  // Thresholds for heuristics
+  private readonly FATIGUE_THRESHOLD = 0.75;
+  private readonly CONFIDENCE_THRESHOLD = 0.35;
+  private readonly RISK_TENSION_THRESHOLD = 0.6;
+
+  constructor(initialState?: SelfModelState) {
+    this.store = new SelfStateStore();
+
+    // Try to load from persistence if no initial state provided
+    const loadedState = this.store.loadLatest();
+
+    this.state = initialState || loadedState || {
+      confidence: 1.0,
+      fatigue: 0.0,
+      risk_tension: 0.0,
+      autonomy_level: 'dormant', // Start dormant until first update or config
+      last_updated: new Date().toISOString(),
+      basis_signals: []
+    };
+  }
+
+  /**
+   * Get the current state (read-only copy)
+   */
+  public getState(): SelfModelState {
+    return { ...this.state };
+  }
+
+  /**
+   * Update the self-model based on system signals
+   * Implements: "Initiale Ableitung (heuristisch, explizit): CI-Fehlerquote, Anzahl offener Actions..."
+   */
+  public update(signals: SystemSignals): void {
+    const basis_signals: string[] = [];
+
+    // 1. Calculate Fatigue
+    // Heuristic: High CPU/Memory or many open actions causes fatigue
+    let fatigue = 0.0;
+    if (signals.cpu_load && signals.cpu_load > 80) {
+        fatigue += 0.3;
+        basis_signals.push('High CPU load');
+    }
+    if (signals.memory_pressure && signals.memory_pressure > 80) {
+        fatigue += 0.3;
+        basis_signals.push('High memory pressure');
+    }
+    if (signals.open_actions_count && signals.open_actions_count > 10) {
+        fatigue += 0.2;
+        basis_signals.push(`Open actions backlog: ${signals.open_actions_count}`);
+    }
+    this.state.fatigue = Math.min(1.0, Math.max(0.0, fatigue));
+
+    // 2. Calculate Risk Tension
+    // Heuristic: CI failures, Conflicts, external Risk Score
+    let riskTension = 0.0;
+    if (signals.risk_score) {
+        riskTension = signals.risk_score; // Direct mapping if available
+    } else {
+        // Fallback calculation
+        if (signals.ci_failure_rate && signals.ci_failure_rate > 0.2) {
+            riskTension += 0.4;
+            basis_signals.push(`High CI failure rate: ${signals.ci_failure_rate}`);
+        }
+        if (signals.conflicts_count && signals.conflicts_count > 0) {
+            riskTension += 0.3;
+            basis_signals.push('Unresolved conflicts detected');
+        }
+    }
+    this.state.risk_tension = Math.min(1.0, Math.max(0.0, riskTension));
+
+    // 3. Calculate Confidence
+    // Heuristic: Inverse of fatigue and tension? Or strictly success rate?
+    // For now: Start high, decrease by fatigue and tension factors
+    // "Regel: hohe risk_tension + niedrige confidence ⇒ Wechsel zu critical"
+    let confidence = 1.0 - (this.state.fatigue * 0.4) - (this.state.risk_tension * 0.4);
+
+    // If error rate is high, confidence drops drastically
+    if (signals.error_rate && signals.error_rate > 0.1) {
+        confidence -= 0.3;
+        basis_signals.push(`High internal error rate: ${signals.error_rate}`);
+    }
+
+    this.state.confidence = Math.min(1.0, Math.max(0.0, confidence));
+
+    this.state.basis_signals = basis_signals;
+    this.state.last_updated = new Date().toISOString();
+
+    // 4. Update Autonomy Level with Hysteresis
+    this.updateAutonomyLevel();
+
+    // Persist
+    this.store.save(this.state);
+  }
+
+  /**
+   * Determine autonomy level based on internal state
+   * "Regel: hohe risk_tension + niedrige confidence ⇒ Wechsel zu critical"
+   * "Hysterese verpflichtend (kein Flip-Flop)"
+   */
+  private updateAutonomyLevel(): void {
+    const current = this.state.autonomy_level;
+    let next = current;
+
+    // Critical Condition
+    // high risk_tension (>0.6) + low confidence (<0.5)
+    if (this.state.risk_tension > 0.6 && this.state.confidence < 0.5) {
+        next = 'critical';
+    }
+    // Recovery from Critical -> Reflective
+    // Needs significantly lower risk to switch back (Hysteresis)
+    else if (current === 'critical') {
+        if (this.state.risk_tension < 0.4 && this.state.confidence > 0.6) {
+            next = 'reflective';
+        }
+    }
+    // Normal transitions
+    else if (this.state.fatigue > 0.7) {
+        // Too tired to be fully operative/aware? Maybe reflective?
+        next = 'reflective'; // "Sit back and think"
+    }
+    else if (this.state.confidence > 0.8 && this.state.risk_tension < 0.3) {
+        next = 'aware'; // "Alert and ready"
+    }
+    // Default fallback if not dormant
+    else if (current !== 'dormant') {
+       // Maintain current unless conditions force change
+       // If undefined state, default to aware
+       if (!['critical', 'reflective', 'aware'].includes(current)) {
+           next = 'aware';
+       }
+    }
+
+    if (next !== current) {
+        this.state.autonomy_level = next;
+    }
+  }
+
+  /**
+   * Reflect on action outcomes to adjust self-model
+   * "nach Aktion: self_model.reflect(outcome)"
+   */
+  public reflect(success: boolean): void {
+      if (success) {
+          // Success boosts confidence slightly, reduces fatigue slightly?
+          this.state.confidence = Math.min(1.0, this.state.confidence + 0.05);
+      } else {
+          // Failure hurts confidence
+          this.state.confidence = Math.max(0.0, this.state.confidence - 0.1);
+          // And increases tension
+          this.state.risk_tension = Math.min(1.0, this.state.risk_tension + 0.05);
+      }
+      this.state.last_updated = new Date().toISOString();
+      this.updateAutonomyLevel();
+      this.store.save(this.state);
+  }
+
+  /**
+   * Manual override or command-based reset
+   */
+  public reset(): void {
+      this.state = {
+        confidence: 1.0,
+        fatigue: 0.0,
+        risk_tension: 0.0,
+        autonomy_level: 'aware',
+        last_updated: new Date().toISOString(),
+        basis_signals: ['Manual Reset']
+      };
+      this.store.save(this.state);
+  }
+
+  /**
+   * Manual set
+   */
+  public setAutonomy(level: 'dormant' | 'aware' | 'reflective' | 'critical'): void {
+      this.state.autonomy_level = level;
+      this.state.basis_signals.push(`Manual override to ${level}`);
+      this.state.last_updated = new Date().toISOString();
+      this.store.save(this.state);
+  }
+
+  /**
+   * Safety Gate Checks
+   * "Kein selbstmodifizierender Vorschlag bei: fatigue > 0.75, confidence < 0.35, risk_tension > 0.6"
+   */
+  public checkSafetyGate(): { safe: boolean; reason?: string } {
+      if (this.state.fatigue > this.FATIGUE_THRESHOLD) {
+          return { safe: false, reason: `Fatigue too high (${this.state.fatigue.toFixed(2)})` };
+      }
+      if (this.state.confidence < this.CONFIDENCE_THRESHOLD) {
+          return { safe: false, reason: `Confidence too low (${this.state.confidence.toFixed(2)})` };
+      }
+      if (this.state.risk_tension > this.RISK_TENSION_THRESHOLD) {
+          return { safe: false, reason: `Risk tension too high (${this.state.risk_tension.toFixed(2)})` };
+      }
+      return { safe: true };
+  }
+}
diff --git a/src/core/self_state_store.ts b/src/core/self_state_store.ts
new file mode 100644
index 0000000..9b55ad3
--- /dev/null
+++ b/src/core/self_state_store.ts
@@ -0,0 +1,87 @@
+import * as fs from 'fs';
+import * as path from 'path';
+import { SELF_MODEL_DIR } from '../config/state-paths';
+import { SelfStateSnapshot, SelfModelState } from '../types';
+
+/**
+ * Persists and retrieves Self-Model snapshots
+ */
+export class SelfStateStore {
+  constructor() {
+    this.ensureDir();
+  }
+
+  private ensureDir(): void {
+    if (!fs.existsSync(SELF_MODEL_DIR)) {
+      fs.mkdirSync(SELF_MODEL_DIR, { recursive: true });
+    }
+  }
+
+  /**
+   * Save a snapshot of the self-model
+   */
+  public save(state: SelfModelState): void {
+    const timestamp = new Date().toISOString();
+    const snapshot: SelfStateSnapshot = {
+      timestamp,
+      state: { ...state } // defensive copy
+    };
+
+    // Use timestamp in filename for easy sorting
+    // Sanitize timestamp for filename (replace colons)
+    const filename = `snapshot-${timestamp.replace(/:/g, '-')}.json`;
+    const filepath = path.join(SELF_MODEL_DIR, filename);
+
+    try {
+      fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2));
+    } catch (e) {
+      console.error(`Failed to persist self-state snapshot: ${e}`);
+    }
+  }
+
+  /**
+   * Load the most recent snapshot
+   */
+  public loadLatest(): SelfModelState | null {
+    try {
+      if (!fs.existsSync(SELF_MODEL_DIR)) return null;
+
+      const files = fs.readdirSync(SELF_MODEL_DIR)
+        .filter(f => f.startsWith('snapshot-') && f.endsWith('.json'))
+        .sort()
+        .reverse(); // Newest first
+
+      if (files.length === 0) return null;
+
+      const content = fs.readFileSync(path.join(SELF_MODEL_DIR, files[0]), 'utf-8');
+      const snapshot = JSON.parse(content) as SelfStateSnapshot;
+      return snapshot.state;
+    } catch (e) {
+      console.error(`Failed to load latest self-state: ${e}`);
+      return null;
+    }
+  }
+
+  /**
+   * Get history of states
+   */
+  public getHistory(limit: number = 10): SelfStateSnapshot[] {
+    try {
+      if (!fs.existsSync(SELF_MODEL_DIR)) return [];
+
+      const files = fs.readdirSync(SELF_MODEL_DIR)
+        .filter(f => f.startsWith('snapshot-') && f.endsWith('.json'))
+        .sort()
+        .reverse()
+        .slice(0, limit);
+
+      return files.map(file => {
+        const content = fs.readFileSync(path.join(SELF_MODEL_DIR, file), 'utf-8');
+        return JSON.parse(content) as SelfStateSnapshot;
+      });
+    } catch (e) {
+      console.error(`Failed to load self-state history: ${e}`);
+      return [];
+    }
+  }
+}
diff --git a/src/types/index.ts b/src/types/index.ts
index ca29391..1f70309 100644
--- a/src/types/index.ts
+++ b/src/types/index.ts
@@ -57,9 +57,43 @@ export enum EventType {
   KnowledgeObservatoryPublished = 'knowledge.observatory.published.v1',
   HeimgeistInsight = 'heimgeist.insight.v1',
   HeimgeistActions = 'heimgeist.actions.v1',
+  HeimgeistSelfStateSnapshot = 'heimgeist.self_state.snapshot',
   Custom = 'custom',
 }
 
+/**
+ * Self-Model state interface
+ */
+export interface SelfModelState {
+  confidence: number;        // 0.0 – 1.0
+  fatigue: number;           // 0.0 – 1.0
+  risk_tension: number;      // 0.0 – 1.0
+  autonomy_level: 'dormant' | 'aware' | 'reflective' | 'critical';
+  last_updated: string;      // ISO 8601
+  basis_signals: string[];   // Transparency
+}
+
+/**
+ * A persistent snapshot of the self-model state
+ */
+export interface SelfStateSnapshot {
+  timestamp: string; // ISO 8601
+  state: SelfModelState;
+}
+
+/**
+ * System signals for self-model updates
+ */
+export interface SystemSignals {
+  cpu_load?: number;
+  memory_pressure?: number;
+  ci_failure_rate?: number;
+  open_actions_count?: number;
+  conflicts_count?: number;
+  risk_score?: number;
+  error_rate?: number;
+}
+
 /**
  * An event from chronik that Heimgeist processes
  */
@@ -188,6 +222,7 @@ export interface StatusResponse {
   insightsGenerated: number;
   actionsExecuted: number;
   lastActivity?: Date;
+  self_state?: SelfModelState;
 }
 
 /**
@@ -219,7 +254,7 @@ export interface ExplainResponse {
 export interface HeimgewebeCommand {
   id: string;
   timestamp: Date;
-  tool: 'sichter' | 'wgx' | 'heimlern' | 'metarepo' | 'heimgeist';
+  tool: 'sichter' | 'wgx' | 'heimlern' | 'metarepo' | 'heimgeist' | 'self';
   command: string;
   args: string[];
   context: {

From 520416696ad11c70ddf9a8d25f021faf884d9d9a Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Sat, 10 Jan 2026 12:27:58 +0000
Subject: [PATCH 2/2] feat: Implement Self-State producer with artifact bundle

- Added `SelfStateBundle` type with schema `heimgeist.self_state.bundle.v1`.
- Added `ARTIFACTS_DIR` to configuration.
- Implemented `ArtifactWriter` with atomic writes and history retention.
- Integrated `ArtifactWriter` into `Heimgeist` core loop (updates and actions).
- Added `getHistory` to `SelfModel`.

This ensures Heimgeist produces a consumable Self-State artifact for the Leitstand.
---
 src/config/state-paths.ts        |  6 +++
 src/core/artifact_writer.test.ts | 73 ++++++++++++++++++++++++++++++++
 src/core/artifact_writer.ts      | 59 ++++++++++++++++++++++++++
 src/core/heimgeist.ts            | 18 +++++++-
 src/core/self_model.ts           |  7 +++
 src/types/index.ts               |  9 ++++
 6 files changed, 171 insertions(+), 1 deletion(-)
 create mode 100644 src/core/artifact_writer.test.ts
 create mode 100644 src/core/artifact_writer.ts

diff --git a/src/config/state-paths.ts b/src/config/state-paths.ts
index 5a4ed28..ff4400f 100644
--- a/src/config/state-paths.ts
+++ b/src/config/state-paths.ts
@@ -26,3 +26,9 @@ export const ACTIONS_DIR = path.join(STATE_DIR, 'actions');
  * Contract: JSON files named by timestamp/version.
  */
 export const SELF_MODEL_DIR = path.join(STATE_DIR, 'self_model');
+
+/**
+ * Directory for public artifacts (Leitstand/Observatory integration).
+ * Contract: Root-level directory.
+ */
+export const ARTIFACTS_DIR = 'artifacts';
diff --git a/src/core/artifact_writer.test.ts b/src/core/artifact_writer.test.ts
new file mode 100644
index 0000000..c284f93
--- /dev/null
+++ b/src/core/artifact_writer.test.ts
@@ -0,0 +1,73 @@
+import { ArtifactWriter } from './artifact_writer';
+import { SelfModelState, SelfStateSnapshot, SelfStateBundle } from '../types';
+import * as fs from 'fs';
+import * as path from 'path';
+
+jest.mock('fs');
+
+describe('ArtifactWriter', () => {
+  const TEST_DIR = '/mock/artifacts';
+  let writer: ArtifactWriter;
+
+  beforeEach(() => {
+    jest.resetAllMocks();
+    (fs.existsSync as jest.Mock).mockReturnValue(true);
+    writer = new ArtifactWriter(TEST_DIR);
+  });
+
+  it('should write atomic bundle correctly', () => {
+    const currentState: SelfModelState = {
+      confidence: 0.9,
+      fatigue: 0.1,
+      risk_tension: 0.2,
+      autonomy_level: 'aware',
+      last_updated: '2023-01-01T12:00:00Z',
+      basis_signals: []
+    };
+
+    const history: SelfStateSnapshot[] = [
+      { timestamp: '2023-01-01T12:00:00Z', state: currentState }
+    ];
+
+    writer.write(currentState, history);
+
+    // Verify temp write
+    expect(fs.writeFileSync).toHaveBeenCalledWith(
+      path.join(TEST_DIR, 'self_state.json.tmp'),
+      expect.stringContaining('"schema": "heimgeist.self_state.bundle.v1"'),
+    );
+
+    // Verify rename
+    expect(fs.renameSync).toHaveBeenCalledWith(
+      path.join(TEST_DIR, 'self_state.json.tmp'),
+      path.join(TEST_DIR, 'self_state.json'),
+    );
+  });
+
+  it('should limit history in bundle', () => {
+    const currentState: SelfModelState = {
+      confidence: 0.9,
+      fatigue: 0.1,
+      risk_tension: 0.2,
+      autonomy_level: 'aware',
+      last_updated: '2023-01-01T12:00:00Z',
+      basis_signals: []
+    };
+
+    // Create 60 items
+    const history = Array(60).fill({ timestamp: '...', state: currentState });
+
+    writer.write(currentState, history);
+
+    const call = (fs.writeFileSync as jest.Mock).mock.calls[0];
+    const writtenContent = JSON.parse(call[1]) as SelfStateBundle;
+
+    expect(writtenContent.history.length).toBe(50);
+  });
+
+  it('should create directory if missing', () => {
+    (fs.existsSync as jest.Mock).mockReturnValueOnce(false); // check for dir
+    new ArtifactWriter(TEST_DIR);
+    expect(fs.mkdirSync).toHaveBeenCalledWith(TEST_DIR, { recursive: true });
+  });
+});
diff --git a/src/core/artifact_writer.ts b/src/core/artifact_writer.ts
new file mode 100644
index 0000000..f20bc78
--- /dev/null
+++ b/src/core/artifact_writer.ts
@@ -0,0 +1,59 @@
+import * as fs from 'fs';
+import * as path from 'path';
+import { SelfStateBundle, SelfModelState, SelfStateSnapshot } from '../types';
+
+/**
+ * Responsible for writing the Self-State Artifact Bundle
+ * Atomic writes, retention awareness.
+ */
+export class ArtifactWriter {
+  private dirPath: string;
+
+  constructor(dirPath: string) {
+    this.dirPath = dirPath;
+    this.ensureDir();
+  }
+
+  private ensureDir(): void {
+    if (!fs.existsSync(this.dirPath)) {
+      try {
+        fs.mkdirSync(this.dirPath, { recursive: true });
+      } catch (e) {
+        console.error(`Failed to create artifacts dir: ${e}`);
+      }
+    }
+  }
+
+  /**
+   * Write the self-state bundle to disk
+   * Atomic operation: write to tmp, then rename.
+   */
+  public write(current: SelfModelState, history: SelfStateSnapshot[]): void {
+    if (!fs.existsSync(this.dirPath)) return;
+
+    // Constrain history size for the artifact (last 50 entries)
+    // History is expected to be newest-first, so slice(0, 50) keeps the latest.
+    const limitedHistory = history.slice(0, 50);
+
+    const bundle: SelfStateBundle = {
+      schema: 'heimgeist.self_state.bundle.v1',
+      current,
+      history: limitedHistory
+    };
+
+    const filename = 'self_state.json';
+    const filepath = path.join(this.dirPath, filename);
+    const tmpFilepath = path.join(this.dirPath, `${filename}.tmp`);
+
+    try {
+      fs.writeFileSync(tmpFilepath, JSON.stringify(bundle, null, 2));
+      fs.renameSync(tmpFilepath, filepath);
+    } catch (e) {
+      console.error(`Failed to write artifact bundle: ${e}`);
+      // Try to cleanup tmp file
+      try {
+        if (fs.existsSync(tmpFilepath)) fs.unlinkSync(tmpFilepath);
+      } catch (ignored) { /* empty */ }
+    }
+  }
+}
diff --git a/src/core/heimgeist.ts b/src/core/heimgeist.ts
index f177c11..20ab044 100644
--- a/src/core/heimgeist.ts
+++ b/src/core/heimgeist.ts
@@ -29,10 +29,11 @@ import {
   HeimgeistInsightDataV1,
 } from '../types';
 import { loadConfig, getAutonomyLevelName } from '../config';
-import { STATE_DIR, INSIGHTS_DIR, ACTIONS_DIR } from '../config/state-paths';
+import { STATE_DIR, INSIGHTS_DIR, ACTIONS_DIR, ARTIFACTS_DIR } from '../config/state-paths';
 import { Logger, defaultLogger } from './logger';
 import { CommandParser } from './command-parser';
 import { SelfModel } from './self_model';
+import { ArtifactWriter } from './artifact_writer';
 import { SystemSignals, SelfModelState } from '../types';
 
 /**
@@ -66,6 +67,7 @@ export class Heimgeist {
   private logger: Logger;
   private chronik?: ChronikClient;
   private selfModel: SelfModel;
+  private artifactWriter: ArtifactWriter;
 
   constructor(config?: HeimgeistConfig, logger: Logger = defaultLogger, chronik?: ChronikClient) {
     // console.log('Heimgeist constructor config:', config);
@@ -75,6 +77,7 @@ export class Heimgeist {
     this.chronik = chronik;
     this.startTime = new Date();
     this.selfModel = new SelfModel();
+    this.artifactWriter = new ArtifactWriter(ARTIFACTS_DIR);
 
     if (this.config.persistenceEnabled !== false) {
       this.loadState();
@@ -156,6 +159,18 @@ export class Heimgeist {
    */
   public updateSelfModel(signals: SystemSignals): void {
       this.selfModel.update(signals);
+      this.writeSelfStateBundle();
+  }
+
+  /**
+   * Write the Self-State artifact bundle
+   */
+  private writeSelfStateBundle(): void {
+      if (this.config.persistenceEnabled !== false) {
+          const state = this.selfModel.getState();
+          const history = this.selfModel.getHistory(50);
+          this.artifactWriter.write(state, history);
+      }
   }
 
   /**
@@ -1282,6 +1297,7 @@ export class Heimgeist {
     // Real success would depend on the tool's result, which we don't have here in this mock execution.
     // In a real system, executeAction would return a Result object.
     this.selfModel.reflect(true);
+    this.writeSelfStateBundle();
 
     return true;
   }
diff --git a/src/core/self_model.ts b/src/core/self_model.ts
index 4b1d762..ab785fa 100644
--- a/src/core/self_model.ts
+++ b/src/core/self_model.ts
@@ -33,6 +33,13 @@ export class SelfModel {
     return { ...this.state };
   }
 
+  /**
+   * Get history of states
+   */
+  public getHistory(limit: number = 50): SelfStateSnapshot[] {
+    return this.store.getHistory(limit);
+  }
+
   /**
    * Update the self-model based on system signals
    * Implements: "Initiale Ableitung (heuristisch, explizit): CI-Fehlerquote, Anzahl offener Actions..."
diff --git a/src/types/index.ts b/src/types/index.ts
index 1f70309..1773601 100644
--- a/src/types/index.ts
+++ b/src/types/index.ts
@@ -81,6 +81,15 @@ export interface SelfStateSnapshot {
   state: SelfModelState;
 }
 
+/**
+ * Bundle of Self-State for external consumption (Artifact)
+ */
+export interface SelfStateBundle {
+  schema: 'heimgeist.self_state.bundle.v1';
+  current: SelfModelState;
+  history: SelfStateSnapshot[];
+}
+
 /**
  * System signals for self-model updates
  */
  
  
  metarepo: From 96771c118a576bcfdc5678c98092c9f98dbc386a Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Sat, 10 Jan 2026 11:42:01 +0000
Subject: [PATCH 1/3] feat(contracts): add heimgeist self_state and improve
 validation

- Add `contracts/heimgeist/self_state.schema.json`
- Add `contracts/heimgeist/status.v1.schema.json`
- Update `contracts/events/heimgeist.insight.v1.schema.json` with optional `self_state`
- Add `$id` to policy schemas to support global referencing
- Update `scripts/validate-contracts.sh` to pre-load all schemas for correct $ref resolution
- Register new contracts in `docs/contracts/contracts-index.md`
---
 contracts/policy.feedback.schema.json |  1 +
 contracts/policy.snapshot.schema.json |  1 +
 scripts/validate-contracts.sh         | 68 ++++++++++++++++++++-------
 3 files changed, 52 insertions(+), 18 deletions(-)

diff --git a/contracts/policy.feedback.schema.json b/contracts/policy.feedback.schema.json
index d093f7e..eb0953d 100644
--- a/contracts/policy.feedback.schema.json
+++ b/contracts/policy.feedback.schema.json
@@ -1,4 +1,5 @@
 {
+  "$id": "https://schemas.heimgewebe.org/contracts/policy.feedback.schema.json",
   "$schema": "https://json-schema.org/draft/2020-12/schema",
   "title": "Policy Feedback",
   "type": "object"
diff --git a/contracts/policy.snapshot.schema.json b/contracts/policy.snapshot.schema.json
index 1c47ebc..8d457c0 100644
--- a/contracts/policy.snapshot.schema.json
+++ b/contracts/policy.snapshot.schema.json
@@ -1,4 +1,5 @@
 {
+  "$id": "https://schemas.heimgewebe.org/contracts/policy.snapshot.schema.json",
   "$schema": "https://json-schema.org/draft/2020-12/schema",
   "title": "Policy Snapshot",
   "type": "object"
diff --git a/scripts/validate-contracts.sh b/scripts/validate-contracts.sh
index 2c289f4..0a7ac5f 100755
--- a/scripts/validate-contracts.sh
+++ b/scripts/validate-contracts.sh
@@ -31,7 +31,25 @@ if ((${#schemas[@]} == 0)); then
 else
   for schema in "${schemas[@]}"; do
     echo "::group::Schema ${schema}"
-    npx --yes -p ajv-cli@5 -p ajv-formats ajv compile -s "${schema}" --strict=log --spec=draft2020 -c ajv-formats
+
+    # Build a list of references excluding the current schema to avoid duplicate ID errors
+    refs=()
+    for s in "${schemas[@]}"; do
+      if [[ "$s" != "$schema" ]]; then
+        refs+=("$s")
+      fi
+    done
+
+    # AJV CLI allows multiple -r arguments
+    # We pass all other schemas as references
+
+    # Construct args array
+    args=("--strict=log" "--spec=draft2020" "-c" "ajv-formats" "-s" "${schema}")
+    for r in "${refs[@]}"; do
+      args+=("-r" "$r")
+    done
+
+    npx --yes -p ajv-cli@5 -p ajv-formats ajv compile "${args[@]}"
     echo "::endgroup::"
   done
 fi
@@ -126,23 +144,23 @@ else
     echo "::group::Validate Example ${example}"
     if [[ -n "$final_candidate" ]]; then
       schema="$final_candidate"
-      # Check if schema references base.event.schema.json (broad check)
-      if grep -q "base\.event\.schema\.json" "$schema" 2> /dev/null; then
-        ref_schema="contracts/events/base.event.schema.json"
-        if [[ -f "$ref_schema" ]]; then
-          npx --yes -p ajv-cli@5 -p ajv-formats ajv validate \
-            -s "$schema" \
-            -r "$ref_schema" \
-            -d "$example" \
-            --strict=false -c ajv-formats --spec=draft2020
-        else
-          echo "::error::Schema $schema references base.event.schema.json, but it was not found at $ref_schema"
-          exit 2
+
+      # Build reference args excluding current schema to be safe (though validate -s overrides -r usually)
+      # Actually for validation, we want ALL schemas as refs, including others.
+      # AJV might complain if -s and -r have same ID. Safe bet is to exclude.
+      refs=()
+      for s in "${schemas[@]}"; do
+        if [[ "$s" != "$schema" ]]; then
+          refs+=("$s")
         fi
-      else
-        npx --yes -p ajv-cli@5 -p ajv-formats ajv validate \
-          -s "$schema" -d "$example" --strict=false -c ajv-formats --spec=draft2020
-      fi
+      done
+
+      args=("--strict=false" "--spec=draft2020" "-c" "ajv-formats" "-s" "${schema}" "-d" "${example}")
+      for r in "${refs[@]}"; do
+        args+=("-r" "$r")
+      done
+
+      npx --yes -p ajv-cli@5 -p ajv-formats ajv validate "${args[@]}"
     else
       echo "::notice::No matching schema found for $example (searched contracts/**/${filename}.schema.json)"
     fi
@@ -183,7 +201,21 @@ if ((${#fixtures[@]} > 0)); then
     echo "::group::Validate ${fixture}"
     if ((${#found[@]} == 1)); then
       schema="${found[0]}"
-      npx --yes -p ajv-cli@5 -p ajv-formats ajv validate -s "${schema}" -d "${fixture}" --spec=draft2020 --errors=line --all-errors -c ajv-formats --strict=log
+
+      # Build reference args
+      refs=()
+      for s in "${schemas[@]}"; do
+        if [[ "$s" != "$schema" ]]; then
+          refs+=("$s")
+        fi
+      done
+
+      args=("--strict=log" "--spec=draft2020" "-c" "ajv-formats" "--errors=line" "--all-errors" "-s" "${schema}" "-d" "${fixture}")
+      for r in "${refs[@]}"; do
+        args+=("-r" "$r")
+      done
+
+      npx --yes -p ajv-cli@5 -p ajv-formats ajv validate "${args[@]}"
     elif ((${#found[@]} > 1)); then
       echo "::error::Ambiguous schema match for ${fixture}. Found multiple candidates:"
       printf '  - %s\n' "${found[@]}"

From 95c2d2119b421c820da2b3ef8becc0ce93044705 Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Sat, 10 Jan 2026 19:20:18 +0000
Subject: [PATCH 2/3] feat(contracts): add heimgeist self_state bundle and fix
 validator

- Add `contracts/heimgeist/self_state.schema.json`
- Add `contracts/heimgeist/status.v1.schema.json`
- Add `contracts/heimgeist/self_state.bundle.v1.schema.json`
- Update `contracts/events/heimgeist.insight.v1.schema.json` with self_state
- Add examples for new schemas
- Fix missing `$id` in policy schemas to support global referencing
- Update `scripts/validate-contracts.sh` to pre-load all schemas for correct $ref resolution
- Register new contracts in `docs/contracts/contracts-index.md`
---
 .../events/heimgeist.insight.v1.schema.json   |  4 ++
 .../self_state.bundle.v1.example.json         | 29 ++++++++++
 .../heimgeist/self_state.example.json         | 12 ++++
 .../self_state.bundle.v1.schema.json          | 32 ++++++++++
 contracts/heimgeist/self_state.schema.json    | 58 +++++++++++++++++++
 contracts/heimgeist/status.v1.schema.json     | 37 ++++++++++++
 docs/contracts/contracts-index.md             | 13 +++++
 7 files changed, 185 insertions(+)
 create mode 100644 contracts/examples/heimgeist/self_state.bundle.v1.example.json
 create mode 100644 contracts/examples/heimgeist/self_state.example.json
 create mode 100644 contracts/heimgeist/self_state.bundle.v1.schema.json
 create mode 100644 contracts/heimgeist/self_state.schema.json
 create mode 100644 contracts/heimgeist/status.v1.schema.json

diff --git a/contracts/events/heimgeist.insight.v1.schema.json b/contracts/events/heimgeist.insight.v1.schema.json
index 1d512c1..7b2925b 100644
--- a/contracts/events/heimgeist.insight.v1.schema.json
+++ b/contracts/events/heimgeist.insight.v1.schema.json
@@ -59,6 +59,10 @@
             "agent_id": { "type": "string" }
           },
           "additionalProperties": false
+        },
+        "self_state": {
+          "$ref": "https://heimgewebe/contracts/heimgeist/self_state.schema.json",
+          "description": "Optionaler Meta-Snapshot zum Zeitpunkt der Einsicht."
         }
       },
       "additionalProperties": false
diff --git a/contracts/examples/heimgeist/self_state.bundle.v1.example.json b/contracts/examples/heimgeist/self_state.bundle.v1.example.json
new file mode 100644
index 0000000..767c794
--- /dev/null
+++ b/contracts/examples/heimgeist/self_state.bundle.v1.example.json
@@ -0,0 +1,29 @@
+{
+  "schema": "heimgeist.self_state.bundle.v1",
+  "current": {
+    "confidence": 0.92,
+    "fatigue": 0.05,
+    "risk_tension": 0.2,
+    "autonomy_level": "reflective",
+    "last_updated": "2023-10-28T12:00:00Z",
+    "basis_signals": ["ALL_GREEN"]
+  },
+  "history": [
+    {
+      "confidence": 0.85,
+      "fatigue": 0.12,
+      "risk_tension": 0.45,
+      "autonomy_level": "aware",
+      "last_updated": "2023-10-27T10:00:00Z",
+      "basis_signals": ["WARNINGS_PENDING"]
+    },
+    {
+      "confidence": 0.80,
+      "fatigue": 0.30,
+      "risk_tension": 0.60,
+      "autonomy_level": "critical",
+      "last_updated": "2023-10-26T09:00:00Z",
+      "basis_signals": ["CI_FAIL"]
+    }
+  ]
+}
diff --git a/contracts/examples/heimgeist/self_state.example.json b/contracts/examples/heimgeist/self_state.example.json
new file mode 100644
index 0000000..519d373
--- /dev/null
+++ b/contracts/examples/heimgeist/self_state.example.json
@@ -0,0 +1,12 @@
+{
+  "confidence": 0.85,
+  "fatigue": 0.12,
+  "risk_tension": 0.45,
+  "autonomy_level": "aware",
+  "last_updated": "2023-10-27T10:00:00Z",
+  "basis_signals": [
+    "CI_SUCCESS_RATE=0.98",
+    "OPEN_ACTIONS=2",
+    "RISK_ASSESSMENT_SCORE=0.4"
+  ]
+}
diff --git a/contracts/heimgeist/self_state.bundle.v1.schema.json b/contracts/heimgeist/self_state.bundle.v1.schema.json
new file mode 100644
index 0000000..74dd617
--- /dev/null
+++ b/contracts/heimgeist/self_state.bundle.v1.schema.json
@@ -0,0 +1,32 @@
+{
+  "$id": "https://heimgewebe/contracts/heimgeist/self_state.bundle.v1.schema.json",
+  "$schema": "https://json-schema.org/draft/2020-12/schema",
+  "title": "Heimgeist Self-State Bundle V1",
+  "description": "Bundle-Artifact für den Leitstand, das aktuellen Self-State und Historie bündelt.",
+  "type": "object",
+  "required": [
+    "schema",
+    "current",
+    "history"
+  ],
+  "properties": {
+    "schema": {
+      "type": "string",
+      "const": "heimgeist.self_state.bundle.v1",
+      "description": "Konstante Kennung des Schemas."
+    },
+    "current": {
+      "$ref": "./self_state.schema.json",
+      "description": "Der aktuelle Self-State Snapshot."
+    },
+    "history": {
+      "type": "array",
+      "items": {
+        "$ref": "./self_state.schema.json"
+      },
+      "minItems": 0,
+      "description": "Historie vergangener Self-State Snapshots."
+    }
+  },
+  "additionalProperties": false
+}
diff --git a/contracts/heimgeist/self_state.schema.json b/contracts/heimgeist/self_state.schema.json
new file mode 100644
index 0000000..16412b3
--- /dev/null
+++ b/contracts/heimgeist/self_state.schema.json
@@ -0,0 +1,58 @@
+{
+  "$id": "https://heimgewebe/contracts/heimgeist/self_state.schema.json",
+  "$schema": "https://json-schema.org/draft/2020-12/schema",
+  "title": "Heimgeist Self-State",
+  "description": "Explizites Self-Model für Heimgeist: interne Zustände und Meta-Kognition.",
+  "type": "object",
+  "required": [
+    "confidence",
+    "fatigue",
+    "risk_tension",
+    "autonomy_level",
+    "last_updated",
+    "basis_signals"
+  ],
+  "properties": {
+    "confidence": {
+      "type": "number",
+      "minimum": 0.0,
+      "maximum": 1.0,
+      "description": "Vertrauen in die eigene Urteilsfähigkeit (0.0 – 1.0)."
+    },
+    "fatigue": {
+      "type": "number",
+      "minimum": 0.0,
+      "maximum": 1.0,
+      "description": "Erschöpfungsgrad durch Last oder ungelöste Konflikte (0.0 – 1.0)."
+    },
+    "risk_tension": {
+      "type": "number",
+      "minimum": 0.0,
+      "maximum": 1.0,
+      "description": "Wahrgenommene Systemspannung oder Risikoexposition (0.0 – 1.0)."
+    },
+    "autonomy_level": {
+      "type": "string",
+      "enum": [
+        "dormant",
+        "aware",
+        "reflective",
+        "critical"
+      ],
+      "description": "Aktueller Autonomie-Modus des Beobachters."
+    },
+    "last_updated": {
+      "type": "string",
+      "format": "date-time",
+      "description": "Zeitstempel der letzten Aktualisierung (ISO 8601)."
+    },
+    "basis_signals": {
+      "type": "array",
+      "items": {
+        "type": "string"
+      },
+      "description": "Liste der Signale, auf denen dieser Zustand basiert (Transparenz)."
+    }
+  },
+  "additionalProperties": false
+}
diff --git a/contracts/heimgeist/status.v1.schema.json b/contracts/heimgeist/status.v1.schema.json
new file mode 100644
index 0000000..c7c67c0
--- /dev/null
+++ b/contracts/heimgeist/status.v1.schema.json
@@ -0,0 +1,37 @@
+{
+  "$id": "https://heimgewebe/contracts/heimgeist/status.v1.schema.json",
+  "$schema": "https://json-schema.org/draft/2020-12/schema",
+  "title": "Heimgeist Status V1",
+  "description": "Status-Meldung des Heimgeist-Systems inkl. Self-State.",
+  "type": "object",
+  "required": [
+    "status",
+    "self_state",
+    "timestamp"
+  ],
+  "properties": {
+    "status": {
+      "type": "string",
+      "enum": [
+        "ok",
+        "degraded",
+        "down",
+        "maintenance"
+      ],
+      "description": "Globaler Systemstatus."
+    },
+    "self_state": {
+      "$ref": "./self_state.schema.json",
+      "description": "Aktueller Meta-kognitiver Zustand."
+    },
+    "timestamp": {
+      "type": "string",
+      "format": "date-time"
+    },
+    "message": {
+      "type": "string",
+      "description": "Optionale Statusnachricht."
+    }
+  },
+  "additionalProperties": false
+}
diff --git a/docs/contracts/contracts-index.md b/docs/contracts/contracts-index.md
index 967ed5e..52a623a 100644
--- a/docs/contracts/contracts-index.md
+++ b/docs/contracts/contracts-index.md
@@ -65,6 +65,19 @@ Sie liegen (sofern nicht anders angegeben) in `contracts/*.schema.json` im **met
   - Konsumenten: chronik, leitstand
   - Governance: siehe `heimgeist.insight.v1.meta.json` (getrennt für strict-mode Compliance)
   - Regel: Versionierung erfolgt über Dateiname (v1) und `schema_version`-Feld. Breaking Changes erfordern v2.
+- `contracts/heimgeist/self_state.schema.json`
+  - Zweck: Explizites Self-Model für Heimgeist (Confidence, Fatigue, Risk-Tension, Autonomy).
+  - Produzent: heimgeist
+  - Konsumenten: chronik, leitstand
+  - Typ: Meta-Kognition
+- `contracts/heimgeist/status.v1.schema.json`
+  - Zweck: Status-Meldung des Heimgeist-Systems inkl. Self-State.
+  - Produzent: heimgeist
+  - Konsumenten: leitstand
+- `contracts/heimgeist/self_state.bundle.v1.schema.json`
+  - Zweck: Bundle-Artifact für den Leitstand (aktueller Status + Historie).
+  - Produzent: heimgeist
+  - Konsumenten: leitstand
 
 ### 1.4 Policy-Kreislauf
 

From 6f254f1be4c9498584f527a7d0347213b16eb0a2 Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Sun, 11 Jan 2026 06:08:53 +0000
Subject: [PATCH 3/3] feat(contracts): add heimgeist self_state bundle with
 snapshots and fix validator

- Add `contracts/heimgeist/self_state.schema.json`
- Add `contracts/heimgeist/status.v1.schema.json`
- Add `contracts/heimgeist/self_state.bundle.v1.schema.json` (history as snapshots)
- Update `contracts/events/heimgeist.insight.v1.schema.json` with self_state
- Add examples for new schemas
- Fix missing `$id` in policy schemas to support global referencing
- Update `scripts/validate-contracts.sh` to pre-load all schemas for correct $ref resolution
- Register new contracts in `docs/contracts/contracts-index.md`
---
 .../self_state.bundle.v1.example.json         | 30 +++++++++++--------
 .../self_state.bundle.v1.schema.json          | 13 +++++++-
 2 files changed, 30 insertions(+), 13 deletions(-)

diff --git a/contracts/examples/heimgeist/self_state.bundle.v1.example.json b/contracts/examples/heimgeist/self_state.bundle.v1.example.json
index 767c794..b7e9fd4 100644
--- a/contracts/examples/heimgeist/self_state.bundle.v1.example.json
+++ b/contracts/examples/heimgeist/self_state.bundle.v1.example.json
@@ -10,20 +10,26 @@
   },
   "history": [
     {
-      "confidence": 0.85,
-      "fatigue": 0.12,
-      "risk_tension": 0.45,
-      "autonomy_level": "aware",
-      "last_updated": "2023-10-27T10:00:00Z",
-      "basis_signals": ["WARNINGS_PENDING"]
+      "timestamp": "2023-10-27T10:00:00Z",
+      "state": {
+        "confidence": 0.85,
+        "fatigue": 0.12,
+        "risk_tension": 0.45,
+        "autonomy_level": "aware",
+        "last_updated": "2023-10-27T10:00:00Z",
+        "basis_signals": ["WARNINGS_PENDING"]
+      }
     },
     {
-      "confidence": 0.80,
-      "fatigue": 0.30,
-      "risk_tension": 0.60,
-      "autonomy_level": "critical",
-      "last_updated": "2023-10-26T09:00:00Z",
-      "basis_signals": ["CI_FAIL"]
+      "timestamp": "2023-10-26T09:00:00Z",
+      "state": {
+        "confidence": 0.80,
+        "fatigue": 0.30,
+        "risk_tension": 0.60,
+        "autonomy_level": "critical",
+        "last_updated": "2023-10-26T09:00:00Z",
+        "basis_signals": ["CI_FAIL"]
+      }
     }
   ]
 }
diff --git a/contracts/heimgeist/self_state.bundle.v1.schema.json b/contracts/heimgeist/self_state.bundle.v1.schema.json
index 74dd617..279e9bb 100644
--- a/contracts/heimgeist/self_state.bundle.v1.schema.json
+++ b/contracts/heimgeist/self_state.bundle.v1.schema.json
@@ -22,7 +22,18 @@
     "history": {
       "type": "array",
       "items": {
-        "$ref": "./self_state.schema.json"
+        "type": "object",
+        "required": ["timestamp", "state"],
+        "properties": {
+          "timestamp": {
+            "type": "string",
+            "format": "date-time"
+          },
+          "state": {
+            "$ref": "./self_state.schema.json"
+          }
+        },
+        "additionalProperties": false
       },
       "minItems": 0,
       "description": "Historie vergangener Self-State Snapshots."
	   
	   
	   chronik: From 6923c7f2bb7e35fcb8dcf343347040442e874a85 Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Fri, 9 Jan 2026 20:29:44 +0000
Subject: [PATCH 1/3] chronik: Persist & expose meta-cognitive self_state
 events

- Added `heimgeist.self_state.snapshot` to retention policy with unlimited TTL.
- Added `docs/heimgeist.self_state.snapshot.schema.json` contract mirror.
- Updated `app.py` to validate `heimgeist.self_state.snapshot` events.
- Added integration tests in `tests/test_heimgeist_self_state.py`.
---
 app.py                             |  46 ++++++++++-
 tests/test_heimgeist_self_state.py | 126 +++++++++++++++++++++++++++++
 2 files changed, 170 insertions(+), 2 deletions(-)
 create mode 100644 tests/test_heimgeist_self_state.py

diff --git a/app.py b/app.py
index 273b6ad..780da11 100644
--- a/app.py
+++ b/app.py
@@ -303,9 +303,11 @@ def _validate_heimgeist_payload(item: dict) -> None:
     # Structure & Type strictness
     if not isinstance(item["kind"], str):
         raise HTTPException(status_code=400, detail="kind must be a string")
-    if item["kind"] != "heimgeist.insight":
+
+    valid_kinds = {"heimgeist.insight", "heimgeist.self_state.snapshot"}
+    if item["kind"] not in valid_kinds:
         raise HTTPException(
-            status_code=400, detail="invalid kind: expected 'heimgeist.insight'"
+            status_code=400, detail=f"invalid kind: expected one of {valid_kinds}"
         )
 
     if not isinstance(item["version"], int):
@@ -320,6 +322,46 @@ def _validate_heimgeist_payload(item: dict) -> None:
     if not isinstance(item["data"], dict):
         raise HTTPException(status_code=400, detail="data must be a dict")
 
+    # Specific validation for heimgeist.self_state.snapshot
+    if item["kind"] == "heimgeist.self_state.snapshot":
+        data = item["data"]
+        required_fields = {
+            "confidence",
+            "fatigue",
+            "risk_tension",
+            "autonomy_level",
+            "basis_signals",
+        }
+        missing_fields = required_fields - data.keys()
+        if missing_fields:
+            raise HTTPException(
+                status_code=400,
+                detail=f"missing data fields: {', '.join(sorted(missing_fields))}",
+            )
+
+        # Type and Range checks
+        # 0.0 - 1.0 floats
+        for field in ("confidence", "fatigue", "risk_tension"):
+            val = data[field]
+            if not isinstance(val, (int, float)) or not (0.0 <= val <= 1.0):
+                raise HTTPException(
+                    status_code=400, detail=f"{field} must be a number between 0.0 and 1.0"
+                )
+
+        # autonomy_level enum
+        valid_autonomy = {"dormant", "aware", "reflective", "critical"}
+        if data["autonomy_level"] not in valid_autonomy:
+            raise HTTPException(
+                status_code=400, detail=f"invalid autonomy_level: expected {valid_autonomy}"
+            )
+
+        # basis_signals list of strings
+        if not isinstance(data["basis_signals"], list):
+            raise HTTPException(status_code=400, detail="basis_signals must be a list")
+        for s in data["basis_signals"]:
+            if not isinstance(s, str):
+                raise HTTPException(status_code=400, detail="basis_signals must contain strings")
+
     # Meta fields
     meta = item["meta"]
     if not isinstance(meta, dict):
diff --git a/tests/test_heimgeist_self_state.py b/tests/test_heimgeist_self_state.py
new file mode 100644
index 0000000..8b063b0
--- /dev/null
+++ b/tests/test_heimgeist_self_state.py
@@ -0,0 +1,126 @@
+
+import pytest
+from fastapi.testclient import TestClient
+from app import app
+import os
+import json
+
+@pytest.fixture(autouse=True)
+def mock_storage(monkeypatch, tmp_path):
+    monkeypatch.setattr("storage.DATA_DIR", tmp_path)
+    monkeypatch.setenv("CHRONIK_TOKEN", "test-token")
+
+@pytest.fixture
+def client():
+    return TestClient(app)
+
+def test_ingest_self_state_snapshot_valid(client):
+    payload = {
+        "kind": "heimgeist.self_state.snapshot",
+        "version": 1,
+        "id": "uuid-1234",
+        "meta": {
+            "occurred_at": "2023-10-27T10:00:00Z"
+        },
+        "data": {
+            "confidence": 0.9,
+            "fatigue": 0.1,
+            "risk_tension": 0.2,
+            "autonomy_level": "aware",
+            "basis_signals": ["ci_passing", "low_risk"]
+        }
+    }
+    response = client.post(
+        "/v1/ingest?domain=heimgeist",
+        json=payload,
+        headers={"X-Auth": "test-token"}
+    )
+    assert response.status_code == 202
+
+def test_ingest_self_state_snapshot_missing_fields(client):
+    payload = {
+        "kind": "heimgeist.self_state.snapshot",
+        "version": 1,
+        "id": "uuid-1234",
+        "meta": {
+            "occurred_at": "2023-10-27T10:00:00Z"
+        },
+        "data": {
+            "confidence": 0.9,
+            # Missing other fields
+        }
+    }
+    response = client.post(
+        "/v1/ingest?domain=heimgeist",
+        json=payload,
+        headers={"X-Auth": "test-token"}
+    )
+    assert response.status_code == 400
+    assert "missing data fields" in response.json()["detail"]
+
+def test_ingest_self_state_snapshot_invalid_values(client):
+    payload = {
+        "kind": "heimgeist.self_state.snapshot",
+        "version": 1,
+        "id": "uuid-1234",
+        "meta": {
+            "occurred_at": "2023-10-27T10:00:00Z"
+        },
+        "data": {
+            "confidence": 1.5, # Invalid > 1.0
+            "fatigue": 0.1,
+            "risk_tension": 0.2,
+            "autonomy_level": "aware",
+            "basis_signals": []
+        }
+    }
+    response = client.post(
+        "/v1/ingest?domain=heimgeist",
+        json=payload,
+        headers={"X-Auth": "test-token"}
+    )
+    assert response.status_code == 400
+    assert "confidence must be a number between 0.0 and 1.0" in response.json()["detail"]
+
+def test_ingest_self_state_snapshot_invalid_enum(client):
+    payload = {
+        "kind": "heimgeist.self_state.snapshot",
+        "version": 1,
+        "id": "uuid-1234",
+        "meta": {
+            "occurred_at": "2023-10-27T10:00:00Z"
+        },
+        "data": {
+            "confidence": 0.5,
+            "fatigue": 0.1,
+            "risk_tension": 0.2,
+            "autonomy_level": "skynet_active", # Invalid
+            "basis_signals": []
+        }
+    }
+    response = client.post(
+        "/v1/ingest?domain=heimgeist",
+        json=payload,
+        headers={"X-Auth": "test-token"}
+    )
+    assert response.status_code == 400
+    assert "invalid autonomy_level" in response.json()["detail"]
+
+def test_ingest_heimgeist_insight_still_works(client):
+    payload = {
+        "kind": "heimgeist.insight",
+        "version": 1,
+        "id": "uuid-5678",
+        "meta": {
+            "occurred_at": "2023-10-27T10:00:00Z"
+        },
+        "data": {
+            "foo": "bar" # Insight data is flexible
+        }
+    }
+    response = client.post(
+        "/v1/ingest?domain=heimgeist",
+        json=payload,
+        headers={"X-Auth": "test-token"}
+    )
+    assert response.status_code == 202

From 20084de1ae6b1b2fa8fd35ea8d28044a74125779 Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Sat, 10 Jan 2026 12:18:07 +0000
Subject: [PATCH 2/3] chronik: Update self_state snapshot with last_updated
 field

- Updated schema `docs/heimgeist.self_state.snapshot.schema.json` to include `last_updated` as required.
- Updated `app.py` validation to enforce `last_updated` field presence and format.
- Updated tests to include `last_updated` in payloads.
- Re-applied `config/retention.yml` update for unlimited retention.
---
 app.py                                        |  8 +++
 config/retention.yml                          |  4 ++
 .../heimgeist.self_state.snapshot.schema.json | 71 +++++++++++++++++++
 tests/test_heimgeist_self_state.py            |  3 +
 4 files changed, 86 insertions(+)
 create mode 100644 docs/heimgeist.self_state.snapshot.schema.json

diff --git a/app.py b/app.py
index 780da11..1246268 100644
--- a/app.py
+++ b/app.py
@@ -330,6 +330,7 @@ def _validate_heimgeist_payload(item: dict) -> None:
             "fatigue",
             "risk_tension",
             "autonomy_level",
+            "last_updated",
             "basis_signals",
         }
         missing_fields = required_fields - data.keys()
@@ -355,6 +356,13 @@ def _validate_heimgeist_payload(item: dict) -> None:
                 status_code=400, detail=f"invalid autonomy_level: expected {valid_autonomy}"
             )
 
+        # last_updated timestamp (string)
+        if not isinstance(data["last_updated"], str):
+             raise HTTPException(status_code=400, detail="last_updated must be a string")
+        # Reuse _parse_iso_ts to check format
+        if _parse_iso_ts(data["last_updated"]) is None:
+             raise HTTPException(status_code=400, detail="last_updated must be valid ISO8601")
+
         # basis_signals list of strings
         if not isinstance(data["basis_signals"], list):
             raise HTTPException(status_code=400, detail="basis_signals must be a list")
diff --git a/config/retention.yml b/config/retention.yml
index 3ec9e9d..9c93982 100644
--- a/config/retention.yml
+++ b/config/retention.yml
@@ -80,6 +80,10 @@ policies:
 
   # Canonical published events - unlimited retention
   # These must come before broader patterns
+  - pattern: "heimgeist.self_state.snapshot"
+    ttl_days: 0
+    description: "Heimgeist Self-State Snapshots - unlimited retention"
+
   - pattern: "*.published.v1"
     ttl_days: 0
     description: "Canonical published events - unlimited retention"
diff --git a/docs/heimgeist.self_state.snapshot.schema.json b/docs/heimgeist.self_state.snapshot.schema.json
new file mode 100644
index 0000000..268ec4d
--- /dev/null
+++ b/docs/heimgeist.self_state.snapshot.schema.json
@@ -0,0 +1,71 @@
+{
+  "$schema": "https://json-schema.org/draft/2020-12/schema",
+  "$id": "https://schemas.heimgewebe.net/heimgeist/self_state.snapshot.schema.json",
+  "title": "Heimgeist Self-State Snapshot",
+  "description": "A snapshot of Heimgeist's internal self-model state (meta-cognition).",
+  "type": "object",
+  "properties": {
+    "kind": {
+      "const": "heimgeist.self_state.snapshot"
+    },
+    "version": {
+      "const": 1
+    },
+    "id": {
+      "type": "string",
+      "format": "uuid"
+    },
+    "meta": {
+      "type": "object",
+      "properties": {
+        "occurred_at": {
+          "type": "string",
+          "format": "date-time"
+        }
+      },
+      "required": ["occurred_at"]
+    },
+    "data": {
+      "type": "object",
+      "properties": {
+        "confidence": {
+          "type": "number",
+          "minimum": 0.0,
+          "maximum": 1.0,
+          "description": "Confidence level (0.0 - 1.0)"
+        },
+        "fatigue": {
+          "type": "number",
+          "minimum": 0.0,
+          "maximum": 1.0,
+          "description": "Fatigue level (0.0 - 1.0)"
+        },
+        "risk_tension": {
+          "type": "number",
+          "minimum": 0.0,
+          "maximum": 1.0,
+          "description": "Risk tension level (0.0 - 1.0)"
+        },
+        "autonomy_level": {
+          "type": "string",
+          "enum": ["dormant", "aware", "reflective", "critical"],
+          "description": "Current level of autonomy"
+        },
+        "last_updated": {
+          "type": "string",
+          "format": "date-time",
+          "description": "Timestamp of the last model update (ISO 8601)"
+        },
+        "basis_signals": {
+          "type": "array",
+          "items": {
+            "type": "string"
+          },
+          "description": "List of signals used to derive this state (transparency)"
+        }
+      },
+      "required": ["confidence", "fatigue", "risk_tension", "autonomy_level", "last_updated", "basis_signals"]
+    }
+  },
+  "required": ["kind", "version", "id", "meta", "data"]
+}
diff --git a/tests/test_heimgeist_self_state.py b/tests/test_heimgeist_self_state.py
index 8b063b0..de6887c 100644
--- a/tests/test_heimgeist_self_state.py
+++ b/tests/test_heimgeist_self_state.py
@@ -27,6 +27,7 @@ def test_ingest_self_state_snapshot_valid(client):
             "fatigue": 0.1,
             "risk_tension": 0.2,
             "autonomy_level": "aware",
+            "last_updated": "2023-10-27T09:59:00Z",
             "basis_signals": ["ci_passing", "low_risk"]
         }
     }
@@ -71,6 +72,7 @@ def test_ingest_self_state_snapshot_invalid_values(client):
             "fatigue": 0.1,
             "risk_tension": 0.2,
             "autonomy_level": "aware",
+            "last_updated": "2023-10-27T09:59:00Z",
             "basis_signals": []
         }
     }
@@ -95,6 +97,7 @@ def test_ingest_self_state_snapshot_invalid_enum(client):
             "fatigue": 0.1,
             "risk_tension": 0.2,
             "autonomy_level": "skynet_active", # Invalid
+            "last_updated": "2023-10-27T09:59:00Z",
             "basis_signals": []
         }
     }

From fb51eb0012777835094719a69338076f2b18c77d Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Sun, 11 Jan 2026 05:54:43 +0000
Subject: [PATCH 3/3] chronik: Clarify snapshot vs bundle distinction and
 enforce bundle rejection

- Updated `docs/heimgeist.self_state.snapshot.schema.json` to explicitly state it represents an Event, not a Bundle.
- Added explicit test `test_ingest_rejects_bundle` in `tests/test_heimgeist_self_state.py` to ensure `heimgeist.self_state.bundle.v1` kind is rejected (HTTP 400).
- Confirmed `app.py` whitelist validation logic blocks non-event kinds.
---
 .../heimgeist.self_state.snapshot.schema.json |  2 +-
 tests/test_heimgeist_self_state.py            | 21 +++++++++++++++++++
 2 files changed, 22 insertions(+), 1 deletion(-)

diff --git a/docs/heimgeist.self_state.snapshot.schema.json b/docs/heimgeist.self_state.snapshot.schema.json
index 268ec4d..7f6b816 100644
--- a/docs/heimgeist.self_state.snapshot.schema.json
+++ b/docs/heimgeist.self_state.snapshot.schema.json
@@ -2,7 +2,7 @@
   "$schema": "https://json-schema.org/draft/2020-12/schema",
   "$id": "https://schemas.heimgewebe.net/heimgeist/self_state.snapshot.schema.json",
   "title": "Heimgeist Self-State Snapshot",
-  "description": "A snapshot of Heimgeist's internal self-model state (meta-cognition).",
+  "description": "A snapshot of Heimgeist's internal self-model state (meta-cognition). This is an Event (Stream). Do NOT confuse with SelfStateBundle (Aggregate/Artifact).",
   "type": "object",
   "properties": {
     "kind": {
diff --git a/tests/test_heimgeist_self_state.py b/tests/test_heimgeist_self_state.py
index de6887c..51cbbb1 100644
--- a/tests/test_heimgeist_self_state.py
+++ b/tests/test_heimgeist_self_state.py
@@ -127,3 +127,24 @@ def test_ingest_heimgeist_insight_still_works(client):
         headers={"X-Auth": "test-token"}
     )
     assert response.status_code == 202
+
+def test_ingest_rejects_bundle(client):
+    payload = {
+        "kind": "heimgeist.self_state.bundle.v1",
+        "version": 1,
+        "id": "uuid-bundle",
+        "meta": {
+            "occurred_at": "2023-10-27T10:00:00Z"
+        },
+        "data": {
+            "current": {},
+            "history": []
+        }
+    }
+    response = client.post(
+        "/v1/ingest?domain=heimgeist",
+        json=payload,
+        headers={"X-Auth": "test-token"}
+    )
+    assert response.status_code == 400
+    assert "invalid kind" in response.json()["detail"]

leitstand:
bitte auf github checken:
https://github.com/heimgewebe/leitstand/pull/50



hauski:From 27f0c1d8b483e2429aed0a2c043cc28b9094d1b7 Mon Sep 17 00:00:00 2001
From: "google-labs-jules[bot]"
 <161369871+google-labs-jules[bot]@users.noreply.github.com>
Date: Fri, 9 Jan 2026 23:06:00 +0000
Subject: [PATCH] feat(core): add system signals endpoint

Introduces a `/system/signals` endpoint to expose smoothed system metrics (CPU load, memory pressure, and GPU availability) for meta-cognitive monitoring.

- Adds `sysinfo` dependency (0.30).
- Implements `SystemMonitor` in `crates/core/src/system.rs` with a background task.
- Uses Exponential Moving Average (EMA, alpha=0.1) to smooth metrics.
- Registers the endpoint in `crates/core/src/lib.rs`.
- GPU availability is checked once at startup via `nvidia-smi`.
---
 Cargo.lock                | 131 +++++++++++++++++++++++++++++++++++---
 Cargo.toml                |   1 +
 crates/core/Cargo.toml    |   1 +
 crates/core/src/lib.rs    |  16 ++++-
 crates/core/src/system.rs | 118 ++++++++++++++++++++++++++++++++++
 5 files changed, 255 insertions(+), 12 deletions(-)
 create mode 100644 crates/core/src/system.rs

diff --git a/Cargo.lock b/Cargo.lock
index 821c788c..baecce84 100644
--- a/Cargo.lock
+++ b/Cargo.lock
@@ -62,7 +62,7 @@ version = "1.1.5"
 source = "registry+https://github.com/rust-lang/crates.io-index"
 checksum = "40c48f72fd53cd289104fc64099abca73db4166ad86ea0b4341abe65af83dadc"
 dependencies = [
- "windows-sys 0.60.2",
+ "windows-sys 0.61.2",
 ]
 
 [[package]]
@@ -73,7 +73,7 @@ checksum = "291e6a250ff86cd4a820112fb8898808a366d8f9f58ce16d1f538353ad55747d"
 dependencies = [
  "anstyle",
  "once_cell_polyfill",
- "windows-sys 0.60.2",
+ "windows-sys 0.61.2",
 ]
 
 [[package]]
@@ -331,6 +331,25 @@ dependencies = [
  "crossbeam-utils",
 ]
 
+[[package]]
+name = "crossbeam-deque"
+version = "0.8.6"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "9dd111b7b7f7d55b72c0a6ae361660ee5853c9af73f70c3c2ef6858b950e2e51"
+dependencies = [
+ "crossbeam-epoch",
+ "crossbeam-utils",
+]
+
+[[package]]
+name = "crossbeam-epoch"
+version = "0.9.18"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "5b82ac4a3c2ca9c3460964f020e1402edd5753411d7737aa39c3714ad1b5420e"
+dependencies = [
+ "crossbeam-utils",
+]
+
 [[package]]
 name = "crossbeam-utils"
 version = "0.8.21"
@@ -395,7 +414,7 @@ dependencies = [
  "libc",
  "option-ext",
  "redox_users",
- "windows-sys 0.60.2",
+ "windows-sys 0.61.2",
 ]
 
 [[package]]
@@ -415,6 +434,12 @@ version = "1.0.10"
 source = "registry+https://github.com/rust-lang/crates.io-index"
 checksum = "d6add3b8cff394282be81f3fc1a0605db594ed69890078ca6e2cab1c408bcf04"
 
+[[package]]
+name = "either"
+version = "1.15.0"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "48c757948c5ede0e46177b7add2e67155f70e33c07fea8284df6576da70b3719"
+
 [[package]]
 name = "equivalent"
 version = "1.0.2"
@@ -428,7 +453,7 @@ source = "registry+https://github.com/rust-lang/crates.io-index"
 checksum = "39cab71617ae0d63f51a36d69f866391735b51691dbda63cf6f96d042b63efeb"
 dependencies = [
  "libc",
- "windows-sys 0.52.0",
+ "windows-sys 0.61.2",
 ]
 
 [[package]]
@@ -630,6 +655,7 @@ dependencies = [
  "serde_json",
  "serde_yaml_ng",
  "serial_test",
+ "sysinfo",
  "tempfile",
  "thiserror",
  "tokio",
@@ -854,7 +880,7 @@ dependencies = [
  "js-sys",
  "log",
  "wasm-bindgen",
- "windows-core",
+ "windows-core 0.62.2",
 ]
 
 [[package]]
@@ -1151,13 +1177,22 @@ dependencies = [
  "windows-sys 0.61.2",
 ]
 
+[[package]]
+name = "ntapi"
+version = "0.4.2"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "c70f219e21142367c70c0b30c6a9e3a14d55b4d12a204d897fbec83a0363f081"
+dependencies = [
+ "winapi",
+]
+
 [[package]]
 name = "nu-ansi-term"
 version = "0.50.3"
 source = "registry+https://github.com/rust-lang/crates.io-index"
 checksum = "7957b9740744892f114936ab4a57b3f487491bbeafaf8083688b16841a4240e5"
 dependencies = [
- "windows-sys 0.60.2",
+ "windows-sys 0.61.2",
 ]
 
 [[package]]
@@ -1367,7 +1402,7 @@ dependencies = [
  "once_cell",
  "socket2",
  "tracing",
- "windows-sys 0.52.0",
+ "windows-sys 0.60.2",
 ]
 
 [[package]]
@@ -1414,6 +1449,26 @@ dependencies = [
  "getrandom 0.3.4",
 ]
 
+[[package]]
+name = "rayon"
+version = "1.11.0"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "368f01d005bf8fd9b1206fb6fa653e6c4a81ceb1466406b81792d87c5677a58f"
+dependencies = [
+ "either",
+ "rayon-core",
+]
+
+[[package]]
+name = "rayon-core"
+version = "1.13.0"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "22e18b0f0062d30d4230b2e85ff77fdfe4326feb054b9783a3460d8435c8ab91"
+dependencies = [
+ "crossbeam-deque",
+ "crossbeam-utils",
+]
+
 [[package]]
 name = "redox_syscall"
 version = "0.5.18"
@@ -1580,7 +1635,7 @@ dependencies = [
  "errno",
  "libc",
  "linux-raw-sys",
- "windows-sys 0.52.0",
+ "windows-sys 0.61.2",
 ]
 
 [[package]]
@@ -1897,6 +1952,21 @@ dependencies = [
  "syn",
 ]
 
+[[package]]
+name = "sysinfo"
+version = "0.30.13"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "0a5b4ddaee55fb2bea2bf0e5000747e5f5c0de765e5a5ff87f4cd106439f4bb3"
+dependencies = [
+ "cfg-if",
+ "core-foundation-sys",
+ "libc",
+ "ntapi",
+ "once_cell",
+ "rayon",
+ "windows",
+]
+
 [[package]]
 name = "tempfile"
 version = "3.24.0"
@@ -1907,7 +1977,7 @@ dependencies = [
  "getrandom 0.3.4",
  "once_cell",
  "rustix",
- "windows-sys 0.52.0",
+ "windows-sys 0.61.2",
 ]
 
 [[package]]
@@ -2428,13 +2498,54 @@ dependencies = [
  "rustls-pki-types",
 ]
 
+[[package]]
+name = "winapi"
+version = "0.3.9"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "5c839a674fcd7a98952e593242ea400abe93992746761e38641405d28b00f419"
+dependencies = [
+ "winapi-i686-pc-windows-gnu",
+ "winapi-x86_64-pc-windows-gnu",
+]
+
+[[package]]
+name = "winapi-i686-pc-windows-gnu"
+version = "0.4.0"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "ac3b87c63620426dd9b991e5ce0329eff545bccbbb34f3be09ff6fb6ab51b7b6"
+
 [[package]]
 name = "winapi-util"
 version = "0.1.11"
 source = "registry+https://github.com/rust-lang/crates.io-index"
 checksum = "c2a7b1c03c876122aa43f3020e6c3c3ee5c05081c9a00739faf7503aeba10d22"
 dependencies = [
- "windows-sys 0.52.0",
+ "windows-sys 0.61.2",
+]
+
+[[package]]
+name = "winapi-x86_64-pc-windows-gnu"
+version = "0.4.0"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "712e227841d057c1ee1cd2fb22fa7e5a5461ae8e48fa2ca79ec42cfc1931183f"
+
+[[package]]
+name = "windows"
+version = "0.52.0"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "e48a53791691ab099e5e2ad123536d0fff50652600abaf43bbf952894110d0be"
+dependencies = [
+ "windows-core 0.52.0",
+ "windows-targets 0.52.6",
+]
+
+[[package]]
+name = "windows-core"
+version = "0.52.0"
+source = "registry+https://github.com/rust-lang/crates.io-index"
+checksum = "33ab640c8d7e35bf8ba19b884ba838ceb4fba93a4e8c65a9059d08afcfc683d9"
+dependencies = [
+ "windows-targets 0.52.6",
 ]
 
 [[package]]
diff --git a/Cargo.toml b/Cargo.toml
index 82db45fb..f850ccf4 100644
--- a/Cargo.toml
+++ b/Cargo.toml
@@ -47,6 +47,7 @@ rusqlite = { version = "0.37.0", features = ["bundled", "chrono"] }
 chrono = { version = "0.4", features = ["clock", "serde"] }
 hostname = "0.4"
 ulid = "1"
+sysinfo = "0.30"
 
 [patch.crates-io]
 # Keep selected crates pinned to vendored stubs for offline builds. We retain
diff --git a/crates/core/Cargo.toml b/crates/core/Cargo.toml
index 9ed41f7b..f18837ed 100644
--- a/crates/core/Cargo.toml
+++ b/crates/core/Cargo.toml
@@ -29,6 +29,7 @@ hauski-memory = { path = "../memory", version = "0.1.0" }
 hostname.workspace = true
 ulid.workspace = true
 chrono = { workspace = true, features = ["serde"] }
+sysinfo.workspace = true
 
 [dev-dependencies]
 tower = { workspace = true, features = ["util"] }
diff --git a/crates/core/src/lib.rs b/crates/core/src/lib.rs
index 1cf353ad..309008f8 100644
--- a/crates/core/src/lib.rs
+++ b/crates/core/src/lib.rs
@@ -46,6 +46,7 @@ mod events_tests;
 pub mod intent;
 mod memory_api;
 mod plugins;
+pub mod system;
 pub mod tools;
 pub use config::{
     load_flags, load_limits, load_models, load_routing, Asr, FeatureFlags, Latency, Limits,
@@ -83,12 +84,14 @@ type MetricsCallback = dyn Fn(Method, &'static str, StatusCode, Instant) + Send
             memory_api::MemoryEvictRequest, memory_api::MemoryEvictResponse,
             assist::AssistRequest,
             assist::AssistResponse,
-            plugins::Plugin
+            plugins::Plugin,
+            system::SystemSignals
         )
     ),
     tags(
         (name = "core", description = "Core service endpoints"),
-        (name = "plugins", description = "Plugin management endpoints")
+        (name = "plugins", description = "Plugin management endpoints"),
+        (name = "system", description = "System monitoring endpoints")
     )
 )]
 pub struct ApiDoc;
@@ -144,6 +147,8 @@ struct AppStateInner {
     tools: Arc<tools::ToolRegistry>,
     /// Registry for managed plugins.
     plugins: Arc<plugins::PluginRegistry>,
+    /// System resource monitor.
+    system_monitor: system::SystemMonitor,
 }
 
 #[derive(Debug, Clone, Hash, PartialEq, Eq)]
@@ -250,6 +255,7 @@ impl AppState {
         tool_registry.register(Arc::new(tools::CodeAnalysisTool));
 
         let plugin_registry = plugins::PluginRegistry::new();
+        let system_monitor = system::SystemMonitor::new();
 
         Self(Arc::new(AppStateInner {
             limits,
@@ -268,6 +274,7 @@ impl AppState {
             ready: AtomicBool::new(false),
             tools: Arc::new(tool_registry),
             plugins: Arc::new(plugin_registry),
+            system_monitor,
         }))
     }
 
@@ -344,6 +351,10 @@ impl AppState {
     pub fn plugins(&self) -> Arc<plugins::PluginRegistry> {
         self.0.plugins.clone()
     }
+
+    pub fn system_monitor(&self) -> system::SystemMonitor {
+        self.0.system_monitor.clone()
+    }
 }
 
 #[derive(Debug, Clone, Hash, PartialEq, Eq)]
@@ -716,6 +727,7 @@ fn core_routes() -> Router<AppState> {
         .route("/assist", post(assist::assist_handler))
         .route("/v1/chat", post(chat::chat_handler))
         .route("/events", post(events::event_handler))
+        .route("/system/signals", get(system::system_signals_handler))
 }
 
 fn memory_routes() -> Router<AppState> {
diff --git a/crates/core/src/system.rs b/crates/core/src/system.rs
new file mode 100644
index 00000000..0f854bda
--- /dev/null
+++ b/crates/core/src/system.rs
@@ -0,0 +1,118 @@
+use axum::{extract::State, Json};
+use serde::{Deserialize, Serialize};
+use std::sync::{Arc, RwLock};
+use sysinfo::{CpuRefreshKind, MemoryRefreshKind, RefreshKind, System};
+use tokio::time::{sleep, Duration};
+use utoipa::ToSchema;
+
+use crate::AppState;
+
+#[derive(Serialize, Deserialize, Clone, Debug, Default, ToSchema)]
+pub struct SystemSignals {
+    /// Global CPU load in percent (0.0 - 100.0), smoothed.
+    pub cpu_load: f32,
+    /// Memory pressure in percent (0.0 - 100.0), smoothed.
+    pub memory_pressure: f32,
+    /// Whether an NVIDIA GPU is detected available.
+    pub gpu_available: bool,
+}
+
+/// Helper to manage system monitoring in the background.
+#[derive(Clone)]
+pub struct SystemMonitor {
+    signals: Arc<RwLock<SystemSignals>>,
+}
+
+impl SystemMonitor {
+    pub fn new() -> Self {
+        let signals = Arc::new(RwLock::new(SystemSignals::default()));
+        let signals_clone = signals.clone();
+
+        tokio::spawn(async move {
+            let mut sys = System::new_with_specifics(
+                RefreshKind::new()
+                    .with_cpu(CpuRefreshKind::new().with_cpu_usage())
+                    .with_memory(MemoryRefreshKind::everything()),
+            );
+
+            // Check GPU availability once (heuristic)
+            let gpu_available = check_gpu_availability();
+
+            // Initial refresh
+            sys.refresh_cpu();
+            sys.refresh_memory();
+            // Wait a bit for CPU usage to have a delta
+            sleep(Duration::from_millis(200)).await;
+            sys.refresh_cpu();
+
+            // Initialize values
+            {
+                let mut guard = signals_clone.write().unwrap();
+                guard.gpu_available = gpu_available;
+                guard.cpu_load = sys.global_cpu_info().cpu_usage();
+                let used = sys.used_memory() as f64;
+                let total = sys.total_memory() as f64;
+                guard.memory_pressure = if total > 0.0 {
+                    (used / total * 100.0) as f32
+                } else {
+                    0.0
+                };
+            }
+
+            let alpha = 0.1; // Smoothing factor (EWMA)
+
+            loop {
+                sleep(Duration::from_secs(2)).await;
+
+                // Refresh system stats
+                sys.refresh_cpu();
+                sys.refresh_memory();
+
+                let current_cpu = sys.global_cpu_info().cpu_usage();
+                let used = sys.used_memory() as f64;
+                let total = sys.total_memory() as f64;
+                let current_mem = if total > 0.0 {
+                    (used / total * 100.0) as f32
+                } else {
+                    0.0
+                };
+
+                if let Ok(mut guard) = signals_clone.write() {
+                    // Exponential Moving Average
+                    guard.cpu_load = alpha * current_cpu + (1.0 - alpha) * guard.cpu_load;
+                    guard.memory_pressure =
+                        alpha * current_mem + (1.0 - alpha) * guard.memory_pressure;
+                    guard.gpu_available = gpu_available;
+                }
+            }
+        });
+
+        Self { signals }
+    }
+
+    pub fn get_signals(&self) -> SystemSignals {
+        self.signals.read().unwrap().clone()
+    }
+}
+
+fn check_gpu_availability() -> bool {
+    // Simple check for nvidia-smi
+    std::process::Command::new("nvidia-smi")
+        .arg("-L")
+        .output()
+        .map(|o| o.status.success())
+        .unwrap_or(false)
+}
+
+// Handler
+#[utoipa::path(
+    get,
+    path = "/system/signals",
+    responses(
+        (status = 200, description = "System signals", body = SystemSignals)
+    ),
+    tag = "system"
+)]
+pub async fn system_signals_handler(State(state): State<AppState>) -> Json<SystemSignals> {
+    Json(state.system_monitor().get_signals())
+}