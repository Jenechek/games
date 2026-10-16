# Crafting and Alchemy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add recipe-based Crafting/Alchemy, non-stackable equipment instances, rarity, upgrades/rerolls, recipe learning, save schema v5, and a Tillanium crafting UI.

**Architecture:** Stackables remain in `InventoryState.stacks`; crafted equipment uses `InventoryState.instances`. Pure crafting formulas live under `game-core/crafting`; persistence adds a CraftingState and normalizes older saves.

**Tech Stack:** TypeScript, React, Vite, Node test runner, IndexedDB, GitHub Actions.

**Spec:** `pocket-rpg/docs/superpowers/specs/2026-10-16-crafting-alchemy-design.md`

## Global Constraints

- Crafting is instant and guaranteed when requirements are met.
- Equipment craft max rarity is Epic.
- Upgrades are 0–5 and guaranteed.
- Upgrade 3 and 5 add properties.
- Reroll costs 10 gold and cannot duplicate another property.
- Recipe materials are exact; no substitution.
- Recipe learning ignores skill requirement.
- Crafting may create overload and is not blocked by overload.
- Save schema becomes v5.

## Review Focus

- Inventory transforms must never drop `instances`.
- v5 migration must preserve all prior progress while adding instances/crafting.
- Rarity preview and actual sampling must use the same probability table.
- Upgrade/reroll failures must not spend gold or mutate the item.
- Instance IDs and next-instance number must remain collision-free after reload.

### Task 1: Item instances and invariant-preserving inventory

**Files:** modify inventory/items helpers and tests.

- [ ] RED tests for instance mass and preservation through merchant, loot, fishing, farming and gathering transforms.
- [ ] Add ItemInstance and optional InventoryState.instances.
- [ ] Make all InventoryState transforms preserve instances.
- [ ] GREEN full suite.
- [ ] Commit `feat(pocket-rpg): add equipment item instances`.

### Task 2: Crafting core, recipes, rarity, properties, upgrade/reroll

**Files:** create `game-core/crafting/*`, `content/crafting.ts`, tests.

- [ ] RED tests for recipes/material checks, skill/workshop checks, rarity probabilities, sampling, exact material consumption, stack/equipment outputs, XP.
- [ ] RED tests for effective stats, upgrade costs, level-3/5 property additions, duplicate exclusion, reroll cost/no-alternative behavior.
- [ ] Implement pure core.
- [ ] GREEN full suite.
- [ ] Commit `feat(pocket-rpg): add crafting and alchemy core`.

### Task 3: Recipe learning, merchant content and workshops

**Files:** content/items, merchants, locations, crafting tests.

- [ ] RED tests for starter recipes, scroll consumption, duplicate=5 gold, learning before skill, bought materials/scroll definitions, Tillanium workshops.
- [ ] Implement content and learning.
- [ ] GREEN full suite.
- [ ] Commit `feat(pocket-rpg): add crafting recipes and workshops`.

### Task 4: Save schema v5

**Files:** game-state, schema, migrations, indexed-db, storage tests.

- [ ] RED migration v4→v5 and v5 round-trip tests.
- [ ] RED malformed instance/crafting tests.
- [ ] Implement v5 migration/validation.
- [ ] Confirm runtime UI state excluded.
- [ ] GREEN full suite.
- [ ] Commit `feat(pocket-rpg): persist crafting with save v5`.

### Task 5: Runtime commands and CraftingPanel

**Files:** controller/provider, CraftingPanel, InventoryPanel, MerchantPanel, App/CSS/README, flow tests.

- [ ] RED controller tests for craft, learn, upgrade, reroll and combat/recovery restrictions.
- [ ] Wire commands and persistence.
- [ ] Add CraftingPanel + recipe learning and item instance display.
- [ ] Full GitHub Actions verification.
- [ ] Whole-branch review; fix Important/Critical via RED→GREEN.
- [ ] Create PR only when branch and PR CI are green.

## Self-review

The plan implements the approved instant recipe/workshop loop, equipment rarity, upgrades, rerolls and recipe learning. Dismantling, Unique crafting, batch UI and actual equipment-slot wiring remain explicitly deferred.
