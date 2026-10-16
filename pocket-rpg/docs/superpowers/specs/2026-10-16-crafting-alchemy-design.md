# Pocket RPG Crafting and Alchemy Design

Date: 2026-10-16
Status: Approved from prior game-design decisions

## Goal

Add the first complete Crafting + Alchemy vertical slice on top of Gathering/Farming materials: specialized workshops, exact recipes, permanent recipe knowledge, crafted equipment instances with rarity/properties/upgrades/rerolls, stackable alchemy outputs, and schema v5 persistence.

## Architecture

Stackable materials/consumables continue to use InventoryState.stacks.

Non-stackable crafted equipment uses InventoryState.instances. Each instance references an existing base ItemDefinition and stores only per-instance rarity, upgrade level, and rolled property IDs.

Crafting state is persistent and contains:
- crafting skill
- alchemy skill
- known recipe IDs
- next item-instance number

All crafting formulas are pure TypeScript in `game-core/crafting`. React only dispatches commands and displays previews/results.

## Inventory Instances

`InventoryState.instances` is optional at the TypeScript boundary for backwards compatibility, but schema v5 always persists it as an array.

Equipment instance:
- instanceId: `crafted-N`
- baseItemId
- rarity: common | quality | rare | epic
- upgradeLevel: integer 0–5
- properties: unique property IDs

No crafted Unique rarity. Unique remains special-content only.

Inventory mass includes stack mass plus every equipment instance's base ItemDefinition weight.

Existing merchant/loot/fishing/farming/gathering helpers must preserve `instances` whenever they return a new InventoryState.

## Workshops

Tillanium gains:
- forge
- tailor
- alchemy

Recipes require their authored workshop. Crafting is instantaneous at the proper workshop and always succeeds if requirements/materials are met.

No dismantling.

## Skills

Persistent skills:
- Crafting
- Alchemy

Both use existing SkillState/addSkillXp formulas.

Equipment recipes use Crafting skill.
Alchemy recipes use Alchemy skill.

Recipe learning itself has no skill requirement.

## Starter Recipes

Known from a new game:
- healing-potion
- weak-injury-medicine
- travel-bag

Additional recipe scrolls are ordinary stack items:
- recipe-medium-injury-medicine
- recipe-strong-injury-medicine
- recipe-iron-short-sword
- recipe-wooden-shield
- recipe-light-armor

Recipe scroll is consumed when learned.
Learning an already-known recipe consumes the scroll and grants 5 gold instead.
A recipe may be learned before its skill requirement is met.

## Bought Materials

Tillanium general merchant also sells:
- iron-ingot
- wood-plank
- leather

Material classes:
- ordinary gathered/farmed/bought material: class 0
- any `*-rare` gathered/farmed material: class 1

Recipe rarity preview uses quantities as weights when averaging material class.

## Recipes

Alchemy:
- healing-potion: wild-herb ×2 + wild-berries ×1; Alchemy 0; XP 20
- weak-injury-medicine: medicinal-herb ×1 + wild-herb ×1; Alchemy 0; XP 24
- medium-injury-medicine: medicinal-herb ×2 + wild-berries ×2; Alchemy 20; XP 36
- strong-injury-medicine: medicinal-herb-rare ×2 + wild-berries-rare ×1; Alchemy 50; XP 60

Equipment:
- travel-bag: leather ×2 + plant-fiber ×3; Tailor; Crafting 0; XP 25
- light-armor: leather ×3 + flax ×2; Tailor; Crafting 20; XP 40
- wooden-shield: wood-plank ×4 + plant-fiber ×2; Forge; Crafting 20; XP 40
- iron-short-sword: iron-ingot ×3 + wood-plank ×1; Forge; Crafting 35; XP 55

All recipes use exact fixed quantities. No substitutions.

## Equipment Rarity

Rarity indices:
- common = 0
- quality = 1
- rare = 2
- epic = 3

Maximum rarity unlocked by Crafting level:
- 0–19: common
- 20–49: quality
- 50–79: rare
- 80–100: epic

Raw rarity score:
`weightedAverageMaterialClass + CraftingLevel/50 + max(0,Luck-10)*0.005`

Clamp score to 0–3 and to the currently unlocked maximum.

The score is split between adjacent rarity indices:
- floor(score): probability `1-fraction`
- ceil(score): probability `fraction`

If floor and ceil become equal after caps, probability is 100% for that rarity.

This probability table is displayed before crafting.

Craft max is Epic.

## Rarity Effects

Base numeric-stat multiplier:
- common: 1.00
- quality: 1.05
- rare: 1.10
- epic: 1.20

Base properties:
- common: 0
- quality: 0
- rare: 1
- epic: 1

Property strength does not scale with rarity.

Property pools by base stats:
- damage > 0: keen (+8% damage)
- mitigation > 0: reinforced (+0.03 mitigation)
- evasion > 0: nimble (+0.04 evasion)
- blockChance > 0: steadfast (+0.05 blockChance)
- capacity > 0: roomy (+5 capacity)

Generic fallback properties allow upgrade slots even for narrow items:
- light (+5% travel/carry utility; stored as authored property only for now)
- balanced (+3% broad effectiveness; stored as authored property only for now)

An item never contains duplicate property IDs.

## Upgrades

Crafted equipment starts at upgrade 0.

Maximum upgrade: 5.

Upgrade is guaranteed if enough gold:
- upgrade 1: 20 gold
- upgrade 2: 40
- upgrade 3: 60
- upgrade 4: 80
- upgrade 5: 100

Every upgrade multiplies all numeric base stats by another ×1.25.

At upgrade 3 add one random non-duplicate property.
At upgrade 5 add one additional random non-duplicate property.

Requirements never change with rarity or upgrade.

## Reroll

Any property slot may be rerolled outside combat at the appropriate workshop.

Cost: 10 gold per reroll.

The replacement is selected from the item's eligible property pool excluding every property already present in other slots. If there is no alternative, reroll is rejected without spending gold.

Unlimited rerolls are allowed.

## Derived Stats

`effectiveInstanceStats(instance, itemDefs)`:
1. start with the base item's numeric stats
2. multiply every numeric stat by rarity multiplier
3. multiply every numeric stat by `1.25 ** upgradeLevel`
4. apply the stored property matching that stat
5. properties with no currently wired numeric field remain metadata and do not invent a second combat calculation path

## Crafting Output

Alchemy recipe:
- consumes materials
- adds one stack of its output item
- grants Alchemy XP

Equipment recipe:
- consumes materials
- rolls rarity from preview probabilities
- creates one equipment instance at upgrade 0
- rolls base property count from rarity
- increments next instance number
- grants Crafting XP

Batch crafting may be added later; this stage crafts one recipe activation at a time. Each activation is independent.

Crafting may make the player overloaded; overload does not prevent crafting itself.

## Persistence

Advance schema v4 → v5.

v5 persists:
- InventoryState.stacks
- InventoryState.instances
- crafting state

Migrations:
- v1→v5: previous defaults + empty instances + default crafting
- v2→v5: preserve injuries + previous defaults + empty instances + default crafting
- v3→v5: preserve farming + empty instances + default gathering/crafting
- v4→v5: preserve gathering/farming + empty instances + default crafting
- v5 validates instance IDs, base item IDs, rarity, upgrade 0–5, unique properties, known recipe IDs, skills and next instance number

Runtime crafting UI state is not persisted.

## UI

Add CraftingPanel in Tillanium.

Display:
- Crafting / Alchemy levels and XP
- available workshops
- known recipes
- material requirements and current quantities
- skill/workshop readiness
- rarity probability preview for equipment
- craft button
- crafted equipment instances with rarity, upgrade, effective stats and properties
- upgrade button and gold cost
- reroll buttons per property slot

Recipe scrolls in inventory show a Learn action.

## Deferred

- dismantling
- cooking
- substitutions
- multi-craft batch UI
- item durability
- Unique crafting
- recipe drops from combat
- equipment-slot UI and actual equipping
- property effects not already represented by existing numeric item stats
