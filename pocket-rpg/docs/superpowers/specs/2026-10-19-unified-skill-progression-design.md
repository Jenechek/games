# Pocket RPG — Unified Persisted Skill Progression

Date: 2026-10-19
Status: Implemented

## Goal

All already implemented non-class skills must expose one durable source of truth for level and XP.

Before this stage, progression lived in several unrelated places:
- FarmingState.skill;
- GatheringState.skill;
- CraftingState.skills.crafting;
- CraftingState.skills.alchemy;
- EconomyState.trading;
- DiplomacyState.skill;
- Fishing used a runtime-only lifetime XP scalar and lost progress on reload.

Schema v12 introduces one canonical persisted map.

## Canonical map

`skillProgression` contains exactly:

- fishing;
- farming;
- gathering;
- crafting;
- alchemy;
- trading;
- diplomacy.

Every entry is a normal `SkillState`:

- level 0–100;
- fractional XP preserved;
- shared XP curve from the existing skill progression engine.

The class skill is intentionally not included yet because the ordinary class-tree structure is not finalized.

## Compatibility mirrors

Existing subsystem functions still expect their historical nested skill fields.

To avoid a broad behavioral rewrite in the same migration, those fields remain temporarily:

- FarmingState.skill;
- GatheringState.skill;
- CraftingState.skills;
- EconomyState.trading;
- DiplomacyState.skill.

They are compatibility mirrors, not the canonical persisted API.

On save, the canonical map is written back into all mirrors.

On v12 validation, every mirror must exactly match the corresponding canonical entry, allowing only negligible floating-point noise.

A v12 payload with drift between the canonical map and a mirror fails closed.

Fishing has no legacy mirror and therefore exists only in the canonical map plus the transient runtime FishingGameState used during an active session.

## Runtime synchronization

Every existing source of skill XP updates the canonical map in the same state transition that updates its subsystem:

- Farming planting/harvest → farming;
- Gathering result → gathering;
- Crafting recipe → crafting;
- Alchemy recipe → alchemy;
- Stack/equipment sale → trading;
- Audience/mediation/faction request → diplomacy;
- Fishing catch → fishing.

Buying, item upgrades, property rerolls and other actions that do not already grant that skill XP do not change the map.

## Fishing migration

Fishing now uses the normal `SkillState` and `addSkillXp` path.

The old runtime scalar `fishingXp` is removed.

`advanceFishing` returns:
- updated runtime fishing state;
- updated fishing SkillState;
- exact XP gained in that advancement.

The exact XP gained is reused for character-XP progression, preserving the previous character-level balance.

Old saves cannot recover historical Fishing progress because it was never persisted. Therefore v1–v11 migrations initialize Fishing at level 0 / XP 0.

From v12 onward Fishing progress survives reloads.

## Schema v12 migration

v11→v12:
- keeps all existing gameplay state unchanged;
- copies persisted skill states into the canonical map without recalculation;
- initializes fishing at 0/0;
- preserves classState and summons.

Older schemas continue through their existing migrations and then receive the canonical map.

## Validation

A valid v12 skill map must:
- contain exactly the seven canonical ids;
- contain no unknown ids;
- contain a valid SkillState for every id;
- match every compatibility mirror.

This prevents partial, stale or ambiguous skill state from loading.

## UI

The shared Skill Tree panel now displays actual level and current XP for every canonical skill node present in the authored tree.

Specialized panels also read displayed progression from the canonical map:
- Fishing;
- Farming;
- Gathering;
- Crafting/Alchemy;
- Trading;
- Diplomacy.

## Deferred cleanup

The compatibility mirrors can be removed in a later refactor after subsystem APIs accept skill state explicitly.

That cleanup should not require another progression migration because the canonical v12 map is already sufficient.

## Next progression layer

The next logical use of the shared skill-tree core is combat weapon progression:

- persist authored weapon nodes;
- grant multi-branch XP per combat action;
- apply the agreed 100% weapon / weighted armor-blocking / conditional magic model;
- use hierarchy depth multipliers and shared skill bonuses;
- keep unrelated peaceful branches at 0% combat XP.
