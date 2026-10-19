# Pocket RPG — Armor and Blocking Progression

Date: 2026-10-19
Status: Implemented

## Scope

This stage connects the existing equipment loadout to the agreed defensive combat XP weights.

Implemented domains:
- Armor: 80%
- Blocking: 70%

The previously implemented weapon domain remains 100%.

Magic remains reserved at 30% for a later stage where magical effects can be identified from actual actions.

There is no separate top-level Defense skill tree.

## Authored skill branches

Armor:
- Armor, depth 0
- Body Armor, depth 1
- Light Armor, depth 2
- Heavy Armor, depth 2

Shields:
- Shields, depth 0

The existing items declare their paths explicitly:

- Light Armor -> Armor / Body Armor / Light Armor
- Heavy Armor -> Armor / Body Armor / Heavy Armor
- Wooden Shield -> Shields

Future armor or shield types should extend these authored branches rather than introduce a generic Defense root.

## Persistence

Schema v15 extends the canonical persisted skill map with:

- armor
- body-armor
- light-armor
- heavy-armor
- shields

Schema v14 remains a distinct legacy shape with the previous eleven skill ids and the persisted equipment loadout.

v14 -> v15:
- preserves the full equipment loadout;
- preserves all profession and weapon SkillState values exactly;
- adds all five defensive nodes at level 0 / XP 0;
- does not infer historical armor or shield use.

v13 and earlier migrations continue directly to v15 through the same current defaults.

## Eligibility

Defensive skill XP comes only from actually equipped slots:

- body slot -> Armor domain;
- offHand slot -> Blocking domain.

An empty slot contributes no skill path and no XP.

The item definition's skillPath is authoritative.

The system does not infer armor type from item id text, weight, stats or inventory order.

## Combat action source

Progression is tied to the player's actually executed main combat action.

The action must appear in the combat log as player-main.

Wait is deliberately excluded so a player cannot train Armor or Shields by repeatedly passing turns.

If the player is stunned and the main action never executes, no defensive XP is granted.

Weapon progression still requires an attack action.

Armor and Blocking are broader combat participation domains and may progress on another executed main action, such as an authored heal or stun action, as long as the relevant equipment is worn.

## XP weights

Shared baseline:
- successful action: 20 XP;
- failed action: 5 XP.

Armor applies 80% before hierarchy depth scaling.

Light or Heavy Armor success:
- Armor: 16
- Body Armor: 26.4
- active type node: 43.56

Failure:
- Armor: 4
- Body Armor: 6.6
- active type node: 10.89

Blocking applies 70%.

Shield success:
- Shields: 14

Failure:
- Shields: 3.5

Only the equipped armor type receives its child-node XP.

Light Armor never grants Heavy Armor XP, and Heavy Armor never grants Light Armor XP.

## Primary effects

The generic skill effect rule remains:
- +0.2% primary effect per level;
- maximum +20% per node at level 100;
- applicable hierarchy multipliers stack multiplicatively.

Armor primary effect:
- multiplies mitigation values produced by the equipped body item.

Example at level 100 in Armor, Body Armor and Light Armor:
- multiplier = 1.2 × 1.2 × 1.2 = 1.728.

Only body mitigation is multiplied by the Armor chain.

Mitigation from the shield or any other slot is not treated as Armor mitigation.

After skill scaling, all mitigation sources continue through the existing diminishing combination model.

Blocking primary effect:
- multiplies blockChance produced by the equipped offHand item.

At Shields 100:
- blockChance multiplier = 1.2.

The existing combat cap logic still applies after the skill-adjusted raw block chance is calculated.

## Stats deliberately not scaled

Armor skill does not automatically scale:
- evasion;
- parry;
- accuracy;
- damage;
- capacity.

Shield skill does not automatically scale:
- mitigation;
- parry;
- other rolled stats.

These remain independent item properties unless a future authored skill explicitly targets them.

## Mid-combat progression

After a player main action resolves, the canonical skill map is updated.

If Armor or Shields crosses a level during combat:
- player damageMitigation is recomputed from the same equipped items using the new Armor multiplier;
- player shieldBlock is recomputed using the new Shields multiplier.

The updated values apply to subsequent combat interactions.

## Summon interception

The existing rule remains unchanged:
- if a summon intercepts the enemy attack, player armor mitigation does not reduce damage taken by that summon.

Armor progression therefore changes only damage that actually reaches the player.

## Deferred Magic domain

The 30% Magic weight remains centralized but unused until combat actions expose a real magical effect source.

That future stage should:
- train only applicable Magic branches;
- apply 30% before hierarchy depth scaling;
- allow one action to train weapon/armor/blocking/magic simultaneously when all are genuinely applicable;
- keep unrelated peaceful skills at 0%.
