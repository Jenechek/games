# Gathering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add automatic Gathering with location pools, broad focus, skill progression, rare resources, discoveries, real overload checks, schema v4 persistence, and UI.

**Architecture:** Gathering is a pure TypeScript subsystem under `game-core/peaceful/gathering`. Persistent skill/discoveries live in `GameState`; active session remains runtime-only. Integration follows the existing Fishing/Farming provider loop and existing inventory overload helpers.

**Tech Stack:** TypeScript, React, Vite, Node test runner, IndexedDB, GitHub Actions.

**Spec:** `pocket-rpg/docs/superpowers/specs/2026-10-16-gathering-design.md`

## Global Constraints

- Base cycle is 5000 ms.
- Focus multiplies matching category weights by exactly 3.
- Resource pools never deplete.
- Rare chance caps at 50%.
- Rare variants replace ordinary output and keep the same quantity/mass.
- Active Gathering is runtime-only.
- Save schema becomes v4.
- Overload >= 1.2 blocks Gathering and Fishing.

## Review Focus

- Focus must alter weights without making focused resources guaranteed.
- Reload must keep skill/discoveries but stop the active session.
- Unknown or duplicate discovered IDs in v4 must fail closed.
- Starting another incompatible peaceful activity must not allow two loops to run simultaneously.
- Real inventory mass must drive Fishing/Gathering overload checks.

---

### Task 1: Gathering domain, pools, focus, yield, rare results

**Files:**
- Create: `src/game-core/peaceful/gathering/types.ts`
- Create: `src/game-core/peaceful/gathering/gathering.ts`
- Create: `src/content/gathering.ts`
- Create: `tests/gathering.test.mjs`

**Interfaces:**
- Produces `createDefaultGatheringState()`
- Produces `gatheringSpeedMultiplier()`, `gatheringCycleMs()`
- Produces `focusedResourceWeights()`, `chooseGatheringResource()`
- Produces `rollGatheringYield()`, `gatheringRareChance()`
- Produces `startGathering()`, `advanceGathering()`, `stopGathering()`

- [ ] Write failing tests for speed formula, 5000 ms base, authored pools, focus ×3, focused resource remaining non-guaranteed, yield bounds/bias, rare chance cap, rare replacement, XP, and discovery.
- [ ] Verify RED because Gathering module is absent.
- [ ] Implement minimal domain/content.
- [ ] Verify full `npm test` GREEN.
- [ ] Commit `feat(pocket-rpg): add gathering core`.

---

### Task 2: Encyclopedia view and inventory item definitions

**Files:**
- Modify: `src/game-core/peaceful/gathering/gathering.ts`
- Modify: `src/content/items.ts`
- Modify: `tests/gathering.test.mjs`

**Interfaces:**
- Produces `gatheringLocationView(locationId,state)`
- Adds ordinary/rare resource item definitions with matching mass

- [ ] Write failing tests for vague undiscovered category hints, exact discovered labels, global discovery visibility, and ordinary/rare item masses.
- [ ] Verify RED.
- [ ] Implement view helper and item definitions.
- [ ] Verify full suite GREEN.
- [ ] Commit `feat(pocket-rpg): add gathering discoveries and items`.

---

### Task 3: Save schema v4

**Files:**
- Modify: `src/game-core/game-state.ts`
- Modify: `src/storage/schema.ts`
- Modify: `src/storage/migrations.ts`
- Modify: `src/storage/indexed-db.ts`
- Modify: `tests/storage.test.mjs`

**Interfaces:**
- `GameState` gains `gathering: GatheringState`
- `migrateSave()` returns schema v4 from v1/v2/v3/v4

- [ ] Write failing v3→v4 and v4 round-trip tests.
- [ ] Write failing malformed skill/discovery tests, including unknown and duplicate resource IDs.
- [ ] Confirm runtime Gathering session is not serialized.
- [ ] Implement v4 schema/migrations.
- [ ] Verify full suite GREEN.
- [ ] Commit `feat(pocket-rpg): persist gathering with save v4`.

---

### Task 4: Runtime integration, peaceful exclusivity, and real overload checks

**Files:**
- Modify: `src/app/game-controller.ts`
- Modify: `src/app/GameProvider.tsx`
- Modify: `src/content/locations.ts`
- Create: `tests/gathering-flow.test.mjs`

**Interfaces:**
- Runtime state gains `gatheringSession`
- Commands gain `startGatheringCmd(focus)`, `stopGatheringCmd()`
- Produces `currentLoadRatio(...)`
- Produces peaceful exclusivity guards

- [ ] Write failing tests that combat/recovery/farming/overload block Gathering.
- [ ] Write failing tests that Gathering stops Fishing, Fishing stops Gathering, and travel/combat/merchant/Farming interrupt Gathering.
- [ ] Write failing test that load ratio uses real inventory mass/capacity and exact 1.2 cutoff.
- [ ] Update Fishing start to use the same real load ratio.
- [ ] Integrate Gathering tick/results/log and persistence.
- [ ] Verify full suite + React type-check + build GREEN.
- [ ] Commit `feat(pocket-rpg): integrate gathering gameplay`.

---

### Task 5: Gathering UI and final review

**Files:**
- Create: `src/app/components/GatheringPanel.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/app.css`
- Modify: `README.md`

- [ ] Add level/XP, hints, discoveries, focus selector, cycle countdown, Start/Stop controls, disabled explanations.
- [ ] Run full GitHub Actions verification.
- [ ] Self-review whole branch; fix Critical/Important findings via RED→GREEN.
- [ ] Create PR only after branch CI is green.

## Self-review

- Mining and woodcutting remain excluded.
- Gathering supplies future botanical/material inputs without adding recipes.
- General XP is explicitly deferred rather than inconsistently wired only for Gathering.
- Existing Fishing overload shortcut is corrected as part of the shared peaceful-activity integration.
