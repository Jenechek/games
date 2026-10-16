# Injuries and Defeat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent defeat consequences: injuries, unconscious recovery, forced rest, injury medicine, save migration, gameplay locks, and UI.

**Architecture:** Keep defeat consequences in a dedicated pure TypeScript `game-core/injuries` subsystem. Combat continues to resolve combat only; the application layer invokes injury consequences when player HP reaches zero. Persistent injury state is stored in `GameState` and migrated from save schema v1 to v2.

**Tech Stack:** TypeScript, React, Vite, Node test runner, IndexedDB, GitHub Actions.

**Spec:** `pocket-rpg/docs/superpowers/specs/2026-10-16-injuries-defeat-design.md`

## Global Constraints

- Six fixed body zones: head, torso, left arm, right arm, left leg, right leg.
- Severity range is 0–3.
- Ordinary defeat applies 1 injury roll; boss/miniboss defeat applies exactly 3 sequential rolls.
- Unconscious duration is exactly 15 seconds.
- Forced rest starts only when more than 5 zones are injured.
- Forced-rest duration is total severity × 30 seconds.
- Weak medicine heals 2 total severity levels; medium 4; strong all.
- Weak/medium cannot be used during forced rest; strong can and cancels rest.
- Medicine cannot be used while unconscious.
- Save schema becomes version 2; v1 saves migrate without losing progress.
- React must not calculate injury rules.

## Review Focus

- All six zones already at severity 3 must terminate safely without an infinite reroll.
- A reload during unconscious/rest must preserve remaining time and normalize expired timestamps.
- A defeat must not move the player to another location.
- Strong medicine during forced rest must clear both injuries and the rest timer atomically.
- Recovery locks must block travel/combat/fishing/merchant actions but never block inventory viewing.

---

### Task 1: Injury domain model, rolls, medicine, and penalties

**Files:**
- Create: `pocket-rpg/src/game-core/injuries/types.ts`
- Create: `pocket-rpg/src/game-core/injuries/injuries.ts`
- Create: `pocket-rpg/tests/injuries.test.mjs`

**Interfaces:**
- Produces: `BodyZone`, `InjuryState`, `cleanInjuryState()`
- Produces: `applyInjuryRoll(state, rng)`
- Produces: `applyInjuryRolls(state, count, rng)`
- Produces: `healInjuries(state, levels, rng)`
- Produces: `clearAllInjuries(state)`
- Produces: `injuryPenaltySummary(state)`

- [ ] Write failing tests asserting: one roll adds one severity level; repeat roll escalates; severity never exceeds 3; severity-3 zones are excluded; all-severe state returns unchanged; three rolls apply exactly three sequential increments where eligible.
- [ ] Run `npm test`; expected new injury tests fail because the module does not exist.
- [ ] Implement the listed interfaces with deterministic `SeededRng` selection.
- [ ] Add failing tests for weak=2 levels, medium=4 levels, strong=all, and penalty helpers: head -3pp accuracy/level, torso -5% max HP/level, right arm -5% physical attack/level, left arm -5% block/parry effectiveness/level, each leg +5% travel time/level.
- [ ] Implement the medicine/penalty helpers.
- [ ] Run `npm test`; expected all tests pass.
- [ ] Commit: `feat(pocket-rpg): add injury domain rules`

---

### Task 2: Defeat consequences, unconscious state, and forced rest

**Files:**
- Create: `pocket-rpg/src/game-core/injuries/defeat.ts`
- Modify: `pocket-rpg/tests/injuries.test.mjs`

**Interfaces:**
- Consumes: `InjuryState`, `applyInjuryRolls`
- Produces: `applyDefeatConsequences(injuries, defeatKind, now, rng)`
- Produces: `reconstructRecovery(injuries, now)`
- Produces: `isUnconscious(injuries, now)`
- Produces: `isForcedRest(injuries, now)`
- Produces: `isRecoveryLocked(injuries, now)`

- [ ] Write failing tests for ordinary defeat = 1 roll + `unconsciousUntil=now+15000`; boss/miniboss = 3 rolls; current location is not part of or modified by this API.
- [ ] Write failing tests that forced rest starts only when all 6 zones are injured, with `restUntil = unconsciousUntil + totalSeverity*30000`.
- [ ] Implement defeat consequences and timestamp reconstruction.
- [ ] Write failing tests that expired unconscious/rest timestamps normalize to null and recovery locks reflect current timestamps.
- [ ] Implement reconstruction/lock helpers.
- [ ] Run `npm test`; expected all tests pass.
- [ ] Commit: `feat(pocket-rpg): add defeat recovery flow`

---

### Task 3: Persist injuries and migrate save schema v1 → v2

**Files:**
- Modify: `pocket-rpg/src/game-core/game-state.ts`
- Modify: `pocket-rpg/src/storage/schema.ts`
- Modify: `pocket-rpg/src/storage/migrations.ts`
- Modify: `pocket-rpg/src/storage/indexed-db.ts`
- Modify: `pocket-rpg/tests/storage.test.mjs`

**Interfaces:**
- `GameState` gains required `injuries: InjuryState`.
- Produces `SaveEnvelopeV2 { schemaVersion: 2; savedAt: number; state: GameState }`.
- `migrateSave(value)` accepts v1 and v2 and returns v2.
- `reconstructState(state, now)` reconstructs travel and recovery timestamps.

- [ ] Write failing migration test: a valid v1 save becomes v2 with `cleanInjuryState()`, preserving character/world/inventory.
- [ ] Write failing v2 round-trip test with active injuries/unconscious/rest timestamps.
- [ ] Implement schema v2 and migration.
- [ ] Extend `reconstructState` to call `reconstructRecovery`.
- [ ] Run `npm test`; expected all tests pass.
- [ ] Commit: `feat(pocket-rpg): persist injuries with save v2 migration`

---

### Task 4: Integrate defeat consequences, medicine, and recovery locks into app flow

**Files:**
- Modify: `pocket-rpg/src/app/game-controller.ts`
- Modify: `pocket-rpg/src/app/GameProvider.tsx`
- Modify: `pocket-rpg/src/content/items.ts`
- Modify: `pocket-rpg/src/content/merchants.ts`
- Create/Modify: `pocket-rpg/tests/recovery-flow.test.mjs`

**Interfaces:**
- Produces command guard `canPerformAction(injuries, actionKind, now)`.
- GameProvider applies defeat consequences for both auto and manual combat.
- Commands reject travel, encounter start, fishing, and merchant buy/sell during unconscious/forced rest.
- Inventory remains readable.
- Produces `useInjuryMedicine(tier)` command that consumes an item only on successful healing.

- [ ] Write failing tests for recovery action locks: travel/combat/fishing/merchant blocked; inventory access not represented as a blocked action.
- [ ] Implement pure command guard in `game-controller.ts`.
- [ ] Add three content items: weak/medium/strong injury medicine and add them to Tillanium merchant.
- [ ] Write failing tests that medicine consumption occurs only on successful healing; weak/medium rejected during rest; all medicine rejected while unconscious; strong during rest clears injuries and `restUntil`.
- [ ] Implement medicine command helper in game-core/controller boundary and wire it into GameProvider.
- [ ] Replace current simple `Поражение.` path with `applyDefeatConsequences` in both manual and auto combat flows.
- [ ] Include injuries in persisted GameState.
- [ ] Run `npm test`; expected all tests pass.
- [ ] Commit: `feat(pocket-rpg): integrate injury recovery into gameplay`

---

### Task 5: Injury UI and full verification

**Files:**
- Create: `pocket-rpg/src/app/components/InjuryPanel.tsx`
- Modify: `pocket-rpg/src/app/App.tsx`
- Modify: `pocket-rpg/src/app/components/LocationPanel.tsx`
- Modify: `pocket-rpg/src/app/components/FishingPanel.tsx`
- Modify: `pocket-rpg/src/app/components/MerchantPanel.tsx`
- Modify: `pocket-rpg/src/app/app.css`
- Modify: `.github/workflows/pocket-rpg.yml`
- Modify: `pocket-rpg/README.md`

**Interfaces:**
- InjuryPanel displays injured zones, severity labels, unconscious/rest countdowns, medicine counts, and medicine buttons.
- Existing gameplay panels receive recovery-lock state from GameProvider rather than duplicating rules.

- [ ] Add UI rendering for injuries and recovery timers.
- [ ] Disable/hide travel, encounter, fishing, and merchant controls when recovery-locked, with a visible explanation.
- [ ] Add medicine controls with correct disabled states.
- [ ] Update README to mention injuries/recovery and save migration.
- [ ] Run locally available `npm test`.
- [ ] Push and verify GitHub Actions stages: install, core tests, React type-check, Vite production build.
- [ ] Commit: `feat(pocket-rpg): add injury recovery UI`

---

## Self-review results

- Spec coverage: injury model, defeat rolls, unconscious, forced rest, medicine, penalties, persistence, migration, action locks, UI, and testing all map to Tasks 1–5.
- No deferred systems such as hospitals, doctors, limb loss, disease, or city respawn are included.
- Interfaces use one `InjuryState` across domain, persistence, controller, and UI.
- Review Focus is covered in Tasks 1–4.
- Plan remains smaller than the design spec and leaves implementation details to TDD where the spec does not pin an algorithm.
