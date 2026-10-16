# Pocket RPG — Persistent Summons Core

Date: 2026-10-16
Status: Implemented core; class binding intentionally deferred

## Purpose

This stage implements the persistent summon lifecycle and combat behavior without prematurely fixing the final player-class roster.

The summon system is class-driven, but the core receives class limits and available creature definitions from outside. This keeps the established rule that summons are embedded in ordinary class branches rather than becoming a separate top-level progression tree.

## Established behavior

- Summons persist outside combat.
- They do not disappear after a battle.
- They have no global duration timer.
- A dead summon is removed and must be summoned again.
- Allies and summons act fully automatically; the player gives them no direct combat commands.
- Class summon capacity is 1, 2, or 3.
- When a new summon exceeds the class limit, the oldest active summon is replaced.
- Mage archetype: one protective elemental.
- Tamer archetype: up to three creatures and a weaker personal combat identity; class buffs will be connected in the class layer.
- Creatures are intended to unlock and improve through their normal class branches.
- Ordinary items do not restore summon HP or stamina.
- Special class abilities may restore them.
- HP and stamina regenerate continuously outside combat.

## Persistent roster

Schema v10 stores:

- instance id;
- creature definition id;
- current HP;
- current stamina;
- summon timestamp;
- last out-of-combat recovery timestamp;
- next instance counter.

The roster contains only living active summons and never more than three.

Schemas v1-v9 migrate with an empty roster. Migration does not guess a class or create a summon.

## Capacity and replacement

The core function receives a capacity of 1, 2, or 3 from the future class layer.

If the roster is already full when a creature is summoned:

1. active summons are ordered by summon time;
2. ties use stable instance-id ordering;
3. the oldest summon is removed;
4. the new summon is added.

This replacement is deliberate and does not count as a summon death.

## Out-of-combat recovery

Current baseline: a summon recovers an amount equal to 100% of its maximum HP and stamina over 10 real minutes.

Recovery is linear, continuous and capped at the creature maximum.

It runs only outside combat.

Save reconstruction applies elapsed real time, so recovery continues while the game is closed.

This 10-minute value is an initial balance constant and can be tuned independently of persistence or combat rules.

## Combat representation

When combat begins, active persistent summons are converted into combat summon states.

Each combat state contains:

- current and maximum HP;
- current and maximum stamina;
- damage;
- accuracy;
- evasion;
- interception chance;
- automatic attack stamina cost;
- per-round stamina recovery;
- role;
- passive immunity ids.

After every combat round, the persistent roster is synchronized from combat state.

Dead summons are removed during synchronization.

Survivors keep their exact post-round HP and stamina.

## Automatic actions

Summons take no player commands.

In the current round-based combat model, every living summon gets one automatic action after the player's main action and before the enemy's main action.

The current generic automatic action is an attack if enough stamina exists; otherwise the summon waits.

More class-branch abilities can replace or augment this decision later, but they must remain automatic.

## Interception

Interception is considered only when an attack against the player has actually succeeded.

The attack must first pass:

1. accuracy/evasion;
2. shield block, if applicable;
3. parry, if applicable.

Only then may a summon intercept.

For multiple summons:

1. only living summons with a positive interception chance participate;
2. they are checked from highest current HP to lowest;
3. ties use stable instance-id order;
4. each summon rolls its own interception chance;
5. the first success receives the attack.

The protective Mage elemental has 100% interception chance.

The whole applicable attack is redirected to the intercepting summon. There is no overflow damage to the player when the summon dies from that intercepted hit.

Summons do not intercept attacks that are already directed at another summon.

## Effects and immunities

The state model includes passive immunity ids.

The current combat engine only has direct attack damage plus a simple stun action, so redirected status-effect payloads are not yet generalized.

When combat effects are generalized, redirected applicable effects must use the intercepting creature's immunities, not the player's.

The initial protective elemental carries stun immunity as the first stored immunity example.

## Healing restrictions

There is no inventory-item target path for summons.

The only explicit summon healing function in the core is the class-skill restoration API, which can restore HP and stamina and is capped at the creature maxima.

This keeps ordinary consumables from bypassing the established summon recovery rule.

## Initial content templates

Mage example:
- Guardian Elemental
- capacity example: 1
- 100% interception
- guardian role

Tamer examples:
- War Beast
- Swift Beast
- Bulwark Beast
- capacity example: 3

These definitions provide combat fixtures and a playable data model. They do not define the final complete class roster or final unlock levels.

## Deferred class layer

The next dependent layer should own:

- the final set of player classes;
- which classes have capacity 1, 2, or 3;
- which summon definitions each class can unlock;
- summon-skill progression through ordinary class branches;
- class-specific summon buffs;
- the Tamer's reduced personal power and stronger creature scaling;
- the Mage elemental's branch progression;
- class-skill healing/restoration abilities.

No separate Summoning profession or top-level skill tree should be created.
