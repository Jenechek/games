# Pocket RPG — Combat Weapon Progression

Date: 2026-10-19
Status: Implemented first combat skill branch

## Scope

This stage connects the authored weapon hierarchy to actual combat.

Active chain:

- Weapons;
- One-handed;
- Swords;
- Short Sword.

No Armor, Shield or Magic nodes are invented in this stage.

The agreed cross-domain weights are nevertheless centralized for later branches:

- weapon: 100%;
- armor: 80%;
- blocking: 70%;
- magic: 30% when a magical effect applies.

Unrelated peaceful professions receive 0% combat XP.

## Current attack routing

The current combat vertical exposes one generic player main action: `attack`.

There is not yet a persisted equipment loadout that tells combat which owned weapon instance is actively equipped.

Therefore this stage maps the existing authored `attack` action to the only authored weapon action chain: Short Sword.

This is explicitly transitional.

When equipment loadout is implemented, the routing source must become the actually equipped weapon and the generic mapping must be removed.

The system must not guess an equipped item from inventory order.

## Action outcome

Combat resolution now records whether an attempted action succeeded and how much direct damage it produced.

For an attack:

- hit, including damage intercepted by a summon: success;
- miss: failure;
- shield block: failure;
- parry: failure;
- action skipped because the attacker is stunned: no action log entry and no skill XP.

This separates an attempted failed action from an action that never occurred.

## XP

The shared action baseline is used:

- successful action: 20 XP before skill weights;
- failed action: 5 XP, exactly 25% of baseline.

For the current Short Sword action all four weapon-chain nodes receive 100% weight.

Depth multipliers are then applied:

- Weapons, depth 0: 20 XP success / 5 XP failure;
- One-handed, depth 1: 33 / 8.25;
- Swords, depth 2: 54.45 / 13.6125;
- Short Sword, depth 3: 89.8425 / 22.460625.

XP is granted per actually executed player main attack in both manual and automatic combat.

Summon attacks do not train the player's weapon branch.

Enemy attacks do not train the player's weapon branch.

Character-level combat XP remains victory-based and unchanged.

## Weapon effect

Each node uses the generic +0.2% primary bonus per level.

Applicable nodes in the chain stack multiplicatively.

At level 100 in all four nodes:

1.20 × 1.20 × 1.20 × 1.20 = 2.0736 weapon-skill multiplier.

The multiplier is applied to the existing base player attack damage after injury and class multipliers.

When a skill level changes during combat, the stored combat damage is rescaled by the ratio between the new and previous weapon multipliers, so the new level affects subsequent attacks immediately.

Potion `might` remains a separate combat effect and is not folded into persisted skill damage.

## Persistence

Schema v13 extends `skillProgression` with:

- weapons;
- one-handed;
- swords;
- short-sword.

Schema v12 is preserved as a distinct legacy shape containing exactly the original seven ids.

v12→v13:

- preserves every existing profession/fishing SkillState exactly;
- adds the four weapon nodes at level 0 / XP 0;
- does not infer historical weapon use.

v13 validation requires all eleven canonical skill ids and rejects missing, unknown or malformed entries.

Compatibility mirrors continue to apply only to legacy profession subsystem fields; weapon nodes have no duplicate mirror.

## UI

The existing full Skill Tree panel automatically displays the four weapon nodes with their real level and current XP because they are now canonical persisted skills.

No separate weapon panel is needed.

## Deferred equipment work

This stage deliberately does not implement equipment loadout.

A later loadout stage should:

- persist equipped instance ids per slot;
- validate ownership and slot compatibility;
- apply existing attribute and skill requirements;
- route combat weapon XP by equipped weapon family/type;
- stop treating generic `attack` as inherently Short Sword;
- then enable Armor, Blocking and conditional Magic XP using the already fixed domain weights.
