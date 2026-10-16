# Pocket RPG — Crafting and Alchemy Design

Date: 2026-10-16
Status: Implemented

## Balance goals

Crafting and alchemy extend existing progression without replacing combat attributes, equipment drops, gathering, farming, or injury recovery.

- crafting is deterministic in success, but quality of the result remains progression-driven;
- ordinary crafting cannot produce Unique equipment;
- Luck contributes only a small secondary bonus;
- rare gathered/farmed resources matter as higher-class materials instead of creating a separate rarity system;
- combat potions are useful tactical actions but cannot be consumed every round indefinitely.

## Materials and result class

Each material has an authored material type and class 1–5.

Recipes require exact material types and quantities. Substitution with unrelated types is not allowed.

If several material classes are used, result class is the weighted average by consumed units. A fractional average chooses between neighboring classes probabilistically. Example: 2.7 gives class 3 with 70% probability and class 2 with 30%.

Current normal farm/gathering resources are class 1. Their existing rare variants are class 2.

## Equipment rarity

Crafted equipment rarity is rolled separately from material class.

- Common is the only possible rarity at skill 0.
- Quality begins at skill 10.
- Rare begins at skill 35.
- Epic begins at skill 70.
- Unique is never produced by ordinary crafting.

The roll uses crafting skill plus at most 5 effective levels from Luck. At skill 100, Epic remains below 20% of crafted results.

Rarity base-stat multipliers are:
- Common 1.00
- Quality 1.06
- Rare 1.12
- Epic 1.20
- Unique 1.30

Material class adds 7.5% per class above class 1. Individual numeric base stats then receive a narrow ±3% roll.

Rare and Epic crafted equipment receive one compatible inherent property. Upgrade milestones may add more.

## Equipment instances, upgrades, rerolls

Equipment is stored as individual instances rather than inventory stacks.

Every crafted item starts at +0. Upgrades are guaranteed when their cost is paid.

Each upgrade multiplies every current numeric stat and numeric property value by 1.25. +3 and +5 each add one compatible random property.

Upgrade gold costs for class-1 equipment are 10 / 20 / 35 / 55 / 80 for +1 through +5. Higher item classes increase the gold cost by 25% per class above 1.

Upgrade material costs rise by level. +3 and above also consume class-2-or-higher material of the equipment's relevant material family.

Reroll changes one selected rerollable property and costs 8 gold. Fixed Unique properties remain non-rerollable.

## Workshops and recipes

Tillanium currently provides a tailor workshop and an alchemist workshop. Workshops are free and have no quality tier.

Recipes are known permanently in the current vertical, but remain gated by skill level. This avoids adding a separate recipe-acquisition loop before quests, factions, and multi-city progression exist.

Batch crafting rolls every produced item separately and grants the sum of its XP.

## Current alchemy catalog

Restorative recipes:
- Healing Potion — 25 HP, Alchemy 0.
- Mana Draught — 30 Mana, Alchemy 20.
- Vigor Draught — 30 Stamina, Alchemy 20.
- Weak / Medium / Strong injury medicine retain the existing injury-system behavior and remain unusable in combat.

Combat tonics:
- Focus Tonic — +8 percentage points to attack accuracy for 3 rounds, Alchemy 10.
- Battle Tonic — +10% outgoing basic physical attack damage for 3 rounds, Alchemy 50.

Higher item class improves combat-potion magnitude by 7.5% per class above 1.

## Potion saturation

Combat potions consume the already-established one additional item action per round.

Saturation maximum: 100.

- Healing Potion: 70
- Focus Tonic: 60
- Battle Tonic: 60
- Mana Draught: 45
- Vigor Draught: 45

At the end of each successfully completed combat round, saturation falls by 20.

This makes a potion immediately useful but prevents healing or buff chains from replacing character defense, resource management, injury consequences, or equipment progression.

Repeated use of the same timed tonic keeps the stronger magnitude and extends remaining duration by one round, capped at six rounds.
