# Pocket RPG Gathering Design

Date: 2026-10-16
Status: Approved from prior game-design decisions

## Goal

Add Gathering as a persistent peaceful profession that supplies botanical/raw materials for future Crafting and Alchemy. Gathering runs automatically in repeatable cycles, supports broad focus rather than exact targeting, discovers location resources, produces rare variants, respects peaceful-activity locks and overload, and persists its skill/discoveries without persisting active work.

## Architecture

Create a pure TypeScript subsystem under `src/game-core/peaceful/gathering/`.

Persistent:
- Gathering skill
- discovered resource IDs

Runtime-only:
- active Gathering session
- current focus
- next cycle timestamp

React only displays state and dispatches commands.

## Resources

Starter resources:

1. `wild-herb` — Дикорастущие травы
   - category: herbs
   - yield: 1–3
   - base XP: 16
   - base rare chance: 1%
   - unit mass: 0.10

2. `medicinal-herb` — Лечебные травы
   - category: herbs
   - yield: 1–2
   - base XP: 26
   - base rare chance: 2%
   - unit mass: 0.10

3. `wild-berries` — Дикие ягоды
   - category: berries
   - yield: 1–3
   - base XP: 18
   - base rare chance: 1.5%
   - unit mass: 0.15

4. `plant-fiber` — Растительное волокно
   - category: fiber
   - yield: 1–3
   - base XP: 20
   - base rare chance: 1%
   - unit mass: 0.10

Each resource has exactly one rare variant:
- `<resourceId>-rare`
- same quantity roll
- same unit mass
- 2× Gathering XP
- replaces ordinary output instead of adding to it

No woodcutting or mining resources are introduced in this phase.

## Location Pools

Resource pools never deplete.

`tillanium-fields`
- wild-herb: 45
- plant-fiber: 55

`meadow`
- wild-herb: 40
- wild-berries: 35
- plant-fiber: 25

`forest-edge`
- medicinal-herb: 40
- wild-berries: 35
- plant-fiber: 25

`dark-forest`
- medicinal-herb: 55
- wild-berries: 25
- plant-fiber: 20

Locations without a Gathering pool cannot start Gathering.

## Focus

Focus is broad, not an exact target:
- balanced
- herbs
- berries
- fiber

Balanced uses authored location weights unchanged.

A non-balanced focus multiplies all resources of the matching category by exactly 3 before weighted selection. Other resources remain possible.

This preserves the approved rule that Gathering focus shifts probabilities rather than directly selecting one species/resource.

## Cycle Speed

Base cycle duration: 5000 ms.

Speed multiplier:
`min(2.0, 1 + GatheringLevel×0.005 + max(0,Agility-10)×0.005 + max(0,Intuition-10)×0.005)`

Actual cycle:
`ceil(5000 / speedMultiplier)`

Stopping, travel, combat, merchant interaction, starting farming, or reload discards partial cycle progress.

Inventory viewing does not interrupt.

## Yield

Yield remains inside the authored min/max range.

Higher Gathering skill biases the deterministic random roll toward the authored maximum but never changes the range.

Use the same monotonic skill-bias approach already used by Farming yield.

## Rare Chance

`min(0.50, baseRareChance + GatheringLevel×0.0005 + max(0,Luck-10)×0.0005 + gearRareBonus)`

Gear bonus is a pure input for future equipment and is 0 in the current UI.

## Skill

Persistent `GatheringState.skill` uses the existing generic `SkillState` and `addSkillXp()`.

Each completed cycle grants the selected resource's base XP; rare result grants 2×.

General character XP is not wired in this stage because the existing vertical slice still persists character XP as 0 and Fishing/Farming likewise do not feed the general XP pipeline. General XP integration belongs to the later progression-unification stage rather than being implemented only for Gathering.

## Discovery / Encyclopedia

Persistent `discoveredResourceIds` starts empty.

A resource becomes discovered on the first successful ordinary or rare Gathering result.

Before discovery, UI shows only vague category hints for the current location:
- herbs: «здесь встречаются травы»
- berries: «здесь можно найти ягоды»
- fiber: «здесь есть волокнистые растения»

After discovery, the exact resource label is displayed for that resource in the location resource list.

Discoveries are global: once a resource is discovered, its exact name is visible at every location where it occurs.

## Peaceful Exclusivity

- Gathering cannot start during combat, unconscious state, or forced rest.
- Gathering cannot start while Farming work is active.
- Starting Gathering stops Fishing.
- Starting Fishing stops Gathering.
- Starting Farming stops Gathering.
- Travel, combat, and merchant interaction stop Gathering.
- Inventory viewing does not stop Gathering.
- Reload stops Gathering because active session is runtime-only.

## Overload

Peaceful activity cutoff remains strictly below 120% carrying capacity.

Gathering start is rejected when `overloadRatio >= 1.2`.

Use the existing inventory mass/carrying capacity helpers and current item definitions. Current bag bonus remains 0 until equipment wiring is implemented.

This integration should also stop passing the hardcoded load ratio `1` into Fishing; Fishing start should use the same real calculated load ratio.

## Persistence

Advance save schema v3 → v4.

`GatheringState` persists:
- skill
- discoveredResourceIds

Active Gathering session is not persisted.

Migration:
- v1 → v4: clean injuries + default farming + default gathering
- v2 → v4: preserve injuries + default farming + default gathering
- v3 → v4: preserve injuries/farming + default gathering
- v4 → v4: validate complete Gathering state

Malformed v4 data fails closed.

## UI

Add `GatheringPanel` only at locations with a Gathering pool.

Display:
- Gathering level and XP
- vague category hints
- exact names of discovered resources
- focus selector
- Start/Stop Gathering
- current cycle countdown
- most recent result in the game log

Disabled-state explanation should cover recovery, combat, active farming, and overload.

## Deferred

Do not add:
- mining
- woodcutting
- depleted resource nodes
- gathering minigames
- weather
- gathering-specific random NPC events
- gathering tools/equipment progression beyond pure future bonus inputs
- general XP integration
- crafting recipes
- alchemy recipes
