# Pocket RPG Farming Design

Date: 2026-10-16
Status: Approved from prior game-design decisions

## Goal

Add persistent farming as the second peaceful profession after Fishing: permanent fields, timed planting, offline crop growth, sequential harvesting, rare crop variants, farming skill progression, and safe persistence.

## Core Rules

- Fields are persistent prepared-soil objects owned by the player.
- Fields can exist only at authored agricultural locations.
- Agricultural locations are either city-adjacent safe farmland or neutral farmland.
- Neutral farmland has no farming bonus over safe farmland.
- Neutral farmland may rarely trigger a weak hostile interruption only while the player is physically present and actively establishing, planting, or harvesting.
- Crops and fields cannot be stolen, damaged, or destroyed by enemies.
- The player may own multiple fields, but can physically work only one field at a time.
- Establishing a field is free, always takes exactly 30 real-time seconds, and grants no XP.
- Interrupting establishment before completion creates no field.
- Abandoning a field immediately frees its slot and permanently deletes all growing or mature crops in that field.
- Active establishment/planting/harvesting is not persisted. Reloading the game interrupts unfinished work.
- Persistent planted cells store timestamps, so crop growth continues while the game is closed.

## Farming Skill

Farming uses the existing generic `SkillState` and `addSkillXp()` progression formulas.

For this stage the farming subsystem stores its own `skill: SkillState` inside `FarmingState`. This preserves the approved skill math and keeps the farming implementation independent until the later global skill-book integration.

Field slots by Farming level:
- 0–19: 1 field
- 20–49: 2 fields
- 50–79: 3 fields
- 80–99: 4 fields
- 100: 5 fields

Field cell capacity:
`4 + 2 × floor(Farming level / 20)`

Existing fields automatically gain empty cells when Farming level raises the capacity.

## Seeds and Crop Cycles

- Seeds are unlock-once and then effectively unlimited.
- Seeds are not consumed during planting.
- `FarmingState.knownSeedIds` records permanent seed unlocks.
- Starter implementation begins with wheat, turnip, and flax seeds known.
- A field crop cycle uses one crop species.
- When the first cell of an empty field is planted, that crop becomes the field's `cycleCropId`.
- If planting is interrupted, later planting of that same unfinished field must continue with the same crop.
- A new crop may be chosen only after every cell from the previous cycle has been harvested and the field is completely empty.
- No automatic replant occurs after harvest.

## Planting

- Planting is an active peaceful activity and works one selected field at a time.
- The chosen field must be in the player's current location.
- The field auto-plants empty cells sequentially.
- Each completed cell remains planted if later work is interrupted.
- Current incomplete cell progress is lost on interruption.
- Base planting time per cell is 2000 ms.
- Work-speed multiplier:
  `min(2.0, 1 + FarmingLevel×0.005 + max(0,Vitality-10)×0.005 + max(0,Wisdom-10)×0.005)`
- Actual per-cell duration is base duration divided by that multiplier.
- Planting XP per completed cell is exactly 50% of that crop's normal harvest XP.
- Planting never receives rare-result XP retroactively.

## Crop Growth

Starter crops:
- Wheat: 5 minutes, yield 1–3, harvest XP 20, base rare chance 1%
- Turnip: 15 minutes, yield 1–2, harvest XP 28, base rare chance 1.5%
- Flax: 30 minutes, yield 2–4, harvest XP 36, base rare chance 2%

Growth begins from the timestamp when each individual cell finishes planting.
A cell is mature when `now >= maturesAt`.
Mature crops never spoil.

## Harvesting

- Harvesting is an active peaceful activity and works one selected field at a time.
- Harvest command queues only cells that are mature at command start.
- Mature cells are harvested sequentially.
- Each completed harvest immediately resolves yield, rare status, inventory output, and Farming XP.
- Current incomplete cell progress is lost on interruption.
- Base harvest time per cell is 1500 ms.
- Harvest uses the same Farming/Vitality/Wisdom speed multiplier as planting.

Yield:
- Quantity always stays inside the crop's authored min/max range.
- Higher Farming level biases the roll toward the upper end without changing min/max.
- Rare status never changes the quantity roll.

Rare chance:
`min(0.50, baseRareChance + FarmingLevel×0.0005 + max(0,Luck-10)×0.0005 + gearRareBonus)`

Rare harvest:
- replaces the ordinary result rather than adding to it;
- uses a separate inventory item ID but the same display crop name marked as rare;
- has the same unit mass as ordinary crop;
- uses the same quantity roll;
- grants 2× normal harvest XP;
- has only one rare tier.

When the last planted cell of a field is harvested, `cycleCropId` becomes null and the next crop may be chosen.

## Peaceful-Activity Exclusivity

- Fishing and active farming work are mutually exclusive.
- Starting farming stops Fishing.
- Starting Fishing is rejected while active farming work exists.
- Travel, combat, or merchant interaction interrupts active farming work.
- Inventory viewing does not interrupt farming.
- Unfinished current-cell progress is lost on interruption.
- Recovery locks from injuries also block starting farming.

## Neutral Farmland Interruption

- After each completed farming-work cell in neutral farmland, roll a 2% interruption chance.
- On success, active farming work stops and a weak hostile encounter begins.
- Initial neutral farming interruption enemy is a weakened young wolf.
- The interruption does not alter fields or crops.
- No ambush is rolled from offline crop growth because no active work is running offline.

## Persistence

Save schema advances from v2 to v3.

`FarmingState` persists:
- farming skill level/XP;
- owned fields;
- planted-cell timestamps;
- known seed IDs;
- next deterministic field number.

Active `FarmingWork` is runtime-only and is not saved.

Migration:
- v1 → v3: add clean injuries and default farming state;
- v2 → v3: preserve injuries and add default farming state;
- v3 → v3: validate full farming structure;
- malformed state fails closed.

## UI

Add `FarmingPanel` at agricultural locations.

Display:
- Farming level and XP;
- owned/maximum field slots;
- fields in the current location;
- field cell counts: empty / growing / mature;
- active work and next-cell countdown;
- crop buttons when planting is legal;
- harvest button when mature cells exist;
- abandon button with explicit destructive wording.

The UI dispatches commands only. Farming formulas stay in game-core.

## Deferred

Do not add in this phase:
- watering;
- fertilizer;
- crop disease;
- weather effects;
- field theft/damage;
- animal husbandry;
- cooking;
- seed rarity/quality;
- multi-field batch planting/harvesting;
- automatic replant;
- farming-specific quests;
- complex farming equipment beyond a future generic gear bonus input.
