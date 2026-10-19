# Pocket RPG — Expanded Mage Magic Actions

Date: 2026-10-19
Status: Implemented

## Goal

Expand the real Magic domain without inventing new player classes or a new damage/resistance system.

The Mage now has three authored spells driven by one registry.

## Skill branches

Existing:
- Magic
  - Arcane
    - Concentration
      - Arcane Focus

New:
- Magic
  - Restoration
    - Healing
      - Arcane Mend
- Magic
  - Protection
    - Warding
      - Arcane Ward

All branches obey the existing maximum depth of four.

## Fixed unlocks

Spell availability is deterministic:
- Arcane Focus: Magic 0
- Arcane Mend: Magic 10
- Arcane Ward: Magic 20

10 and 20 are existing global unlock thresholds.

There is no ability-choice prompt and no mutually exclusive spell selection.

Once unlocked, a spell remains available.

## Spell registry

Magic content is authored through one registry.

Each spell defines:
- id
- label
- mana cost
- required Magic level
- exact skill path
- effect payload

Runtime, UI and auto-combat read the same definitions.

## Arcane Focus

- mana: 20
- base focus magnitude: +0.08 accuracy
- duration: 3 rounds
- path: Magic / Arcane / Concentration / Arcane Focus

Behavior remains compatible with schema v16.

## Arcane Mend

- unlock: Magic 10
- mana: 35
- base healing: 25 HP
- path: Magic / Restoration / Healing / Arcane Mend

Healing magnitude uses the shared skill multiplier.

At level 100 in all four applicable nodes:
- multiplier = 1.2^4 = 2.0736
- 25 base healing becomes 51.84 HP before max-HP clamping.

If the player is already at full HP:
- no healing occurs
- mana is not spent
- magicEffectApplied is false
- Magic XP is not granted

## Arcane Ward

- unlock: Magic 20
- mana: 30
- base ward magnitude: 10% mitigation
- duration: 3 rounds
- path: Magic / Protection / Warding / Arcane Ward

Ward magnitude uses the shared skill multiplier.

At four level-100 nodes:
- 10% becomes 20.736%.

Ward combines with equipment/body mitigation using the existing diminishing percentage model.

Example:
- armor mitigation 20%
- ward 10%
- combined mitigation = 1 - (1 - .20)(1 - .10) = 28%

The ward is applied before the enemy main action in the same round, so it can protect immediately.

Summon interception still happens before player mitigation, so the player's Ward does not reduce damage redirected into a summon.

## Generic magic payload

Magic actions now support:
- timed buff effects
- self healing

A magic action still carries its exact skill path.

The combat log still records:
- magicSkillPath
- magicEffectApplied
- success

Magic XP remains conditional on a real applied effect.

## XP

Magic domain share remains 30%.

Every successful spell path therefore receives:
- depth 0: 6 XP
- depth 1: 9.9 XP
- depth 2: 16.335 XP
- depth 3: 26.95275 XP

Arcane, Restoration and Protection do not leak XP into one another beyond the shared Magic root.

Weapon XP remains 0 for spell casts.

Armor and Blocking may progress simultaneously when corresponding equipment is genuinely active.

## Manual combat

Mage sees all authored spells.

Locked spells remain visible and show the required Magic level.

A spell button is disabled when:
- class is not Mage
- spell is locked
- mana is insufficient
- Mend has no missing HP to restore

## Auto combat priority

Mage auto-combat uses:
1. Arcane Mend at or below 40% HP, if available
2. Arcane Ward at or below 75% HP when Ward is absent or nearly expired
3. Arcane Focus when Focus is absent or nearly expired
4. ordinary attack

This prevents constant buff refresh and keeps healing emergency-oriented.

## Persistence

Schema v17 expands the canonical skill map with:
- restoration
- healing
- arcane-mend
- protection
- warding
- arcane-ward

Schema v16 remains a distinct legacy shape containing the original Magic / Arcane / Concentration / Arcane Focus nodes.

v16 -> v17:
- preserves all previous SkillState values exactly
- preserves equipment loadout exactly
- adds the six new nodes at 0/0
- does not infer historical healing or ward usage

v17 validation requires the exact complete skill id set.

## Deferred

Not introduced here:
- elemental damage types
- magic resistance
- penetration
- enemy spellcasting system
- new player classes
- class-tree migration

Those remain separate stages.
