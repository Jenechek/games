# Pocket RPG — Magic Combat Progression

Date: 2026-10-19
Status: Implemented

## Scope

This stage activates the previously reserved Magic combat-domain weight.

Agreed combat-domain weights remain:
- Weapon: 100%
- Armor: 80%
- Blocking: 70%
- Magic: 30%

Magic XP is not inferred from generic action names.

A combat action must explicitly carry and actually apply a magical effect.

## Initial authored branch

The first shared Magic branch is:

- Magic, depth 0
- Arcane, depth 1
- Concentration, depth 2
- Arcane Focus, depth 3

This follows the generic hierarchy rule:
Magic -> School/Domain -> Subdiscipline -> Spell type.

The branch is shared infrastructure. The current playable source is the Mage class.

## Basic Mage spell

Arcane Focus:
- mana cost: 20;
- base effect: focus +0.08 accuracy;
- duration: 3 rounds;
- skill path: Magic / Arcane / Concentration / Arcane Focus.

The spell reuses the existing focus combat effect.

It does not introduce:
- a new damage type;
- magic resistance;
- hidden armor penetration;
- a new resource;
- a separate spell-XP formula.

## Runtime action model

Magic is an explicit CombatAction type.

A magic action contains:
- mana cost;
- exact skill path;
- an authored combat effect;
- effect magnitude;
- effect duration.

The combat log records:
- the player-main action;
- success;
- the magic skill path;
- whether a magical effect was actually applied.

Magic progression reads the combat log, not the class name or action label.

## Eligibility

Magic XP is granted only when magicEffectApplied is true.

Therefore:
- ordinary attack -> no Magic XP;
- generic heal -> no Magic XP unless a future authored action explicitly marks a magic effect;
- generic stun -> no Magic XP unless explicitly magical;
- insufficient mana -> no effect and no Magic XP;
- zero-magnitude magic -> no effect and no Magic XP;
- stunned player whose main action does not execute -> no Magic XP.

A negative mana cost is clamped to zero and cannot restore mana.

## XP formula

Shared action baseline:
- success: 20 XP;
- failure: 5 XP.

Magic domain share:
- 30% of the action baseline is calculated first;
- the resulting domain XP then uses a normal 100% branch weight inside the authored Magic path.

This preserves the global rule that branch weights stay within 50–100% while keeping the agreed Magic share at exactly 30%.

Successful Arcane Focus chain:
- Magic: 6 XP;
- Arcane: 9.9 XP;
- Concentration: 16.335 XP;
- Arcane Focus: 26.95275 XP.

The generic failed-action rule remains 25% before depth scaling:
- Magic: 1.5 XP;
- Arcane: 2.475 XP;
- Concentration: 4.08375 XP;
- Arcane Focus: 6.7381875 XP.

The current Arcane Focus application is deterministic once valid, so the runtime normally uses the success path. The failure path remains available for future resistible or accuracy-based magic.

## Primary effect

The generic skill rule remains:
- +0.2% primary effect per level;
- max +20% per node at level 100;
- applicable ancestors/descendants combine multiplicatively.

Arcane Focus primary effect is focus magnitude.

At level 100 in all four nodes:
- multiplier = 1.2^4 = 2.0736;
- base 0.08 focus becomes 0.165888.

The spell uses the skill multiplier at cast time.

A level gained from the cast affects later casts, not the effect instance already applied.

## Multi-domain action behavior

One player-main action may train multiple relevant domains.

Casting Arcane Focus:
- Weapon: 0%, because no weapon attack occurred;
- Armor: 80% if protective body armor is equipped;
- Blocking: 70% if a blocking offHand is equipped;
- Magic: 30% because the magic effect was applied.

Unrelated peaceful skills receive 0%.

## Auto combat

For Mage only:
- if Arcane Focus is absent or has one round remaining;
- and the player has at least 20 mana;
- auto combat casts Arcane Focus as the main action.

Otherwise auto combat uses the existing ordinary attack choice.

This avoids repeatedly recasting the same buff every round.

## Manual combat

Mage receives a separate Arcane Focus button.

The button is disabled when mana is insufficient.

Other classes do not receive this spell action.

## Persistence

Schema v16 adds four Magic skill nodes to the canonical persisted skillProgression.

Schema v15 is preserved as a legacy shape containing:
- profession skills;
- weapon skills;
- armor skills;
- blocking skill;
- equipment loadout;
- no Magic nodes.

v15 -> v16:
- preserves all existing SkillState values exactly;
- preserves equipment loadout exactly;
- adds Magic / Arcane / Concentration / Arcane Focus at 0/0;
- does not infer historical magical usage.

Current v16 validation requires the complete exact skill id set.

Unknown, missing or malformed Magic entries fail closed.

## Deferred expansion

Future work can add more schools and spells without changing the 30% domain weight.

Future magic should:
- declare an explicit magic skill path;
- log whether the magical effect actually occurred;
- use the shared action XP rules;
- avoid granting Magic XP merely because the character is a Mage;
- remain compatible with simultaneous weapon/armor/blocking progression when genuinely relevant.
