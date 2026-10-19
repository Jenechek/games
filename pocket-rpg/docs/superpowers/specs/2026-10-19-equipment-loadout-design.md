# Pocket RPG — Equipment Loadout

Date: 2026-10-19
Status: Implemented

## Goal

Replace the temporary rule that every generic attack is a Short Sword action with a real persisted equipment loadout.

The loadout is intentionally small and uses only already-authored equipment slots and stats.

## Slots

Schema v14 stores exactly four slots:

- mainHand;
- offHand;
- body;
- bag.

Each slot stores either null or an equipment instance id.

The equipment instance itself remains in `inventory.equipment`. Equipping never duplicates, removes or transfers an instance.

Equipping another item into the same slot replaces the slot reference only. The previous item remains owned.

## Persistence

Schema v13 is preserved as the previous shape with canonical skill progression and no loadout.

v13→v14:

- preserves all existing game state;
- creates an empty four-slot loadout;
- never guesses equipment from inventory order;
- never auto-equips a legacy item.

v14 validation requires:

- exactly the four known slot keys;
- no unknown slot keys;
- every non-null instance id exists in inventory;
- one instance cannot occupy multiple slots;
- the referenced item definition matches the slot;
- current attribute and skill requirements are satisfied.

Invalid v14 loadouts fail closed.

## Requirements

`canEquip` remains the authoritative requirement check.

The runtime projects current canonical skill levels into the equipment requirement map.

Equipment can be owned while requirements are unmet, but cannot be equipped.

If an already equipped item becomes invalid because attribute retraining completes, it is automatically unequipped.

The same pruning is applied during offline reconstruction and during live runtime ticks.

### Starter Short Sword gate

Before real loadout, generic attacks could train Short Sword before a weapon was equipped.

Once progression is routed only through equipped weapons, the old Iron Short Sword requirement `Short Sword 1` creates a progression loop: the character needs the sword to train the skill but needs the skill to equip the sword.

Therefore the base Iron Short Sword entry requirement is changed to `Short Sword 0`.

Its Strength 12 requirement remains.

Rare Short Sword remains gated at Strength 20 and Short Sword 20.

## Runtime rules

Equipment changes are unavailable in combat.

Inventory/recovery rules otherwise remain unchanged.

Equipping does not interrupt peaceful work.

Equipped equipment cannot be sold. It must first be unequipped.

Upgrade and property reroll keep the same instance id, so equipped references remain valid.

## Equipment stats

The active loadout aggregates base instance stats plus rolled equipment properties.

Current authored stats are connected as follows:

- damage → added to base player attack damage;
- accuracy → added to player accuracy;
- parry → added to player parry before injury multiplier;
- blockChance → player shield block and shield presence;
- evasion → added to base evasion;
- mitigation → physical damage mitigation;
- capacity → carrying-capacity bonus.

Multiple mitigation sources use the existing diminishing combination rule rather than flat addition.

Mitigation is applied only after hit/block/parry and only when damage reaches the player.

If a summon intercepts the attack, the summon receives the unmitigated post-crit attack damage; the player's armor does not protect the summon.

## Carrying capacity

The equipped bag's `capacity` stat feeds every current load-ratio check:

- travel;
- starting Fishing;
- Fishing continuation;
- starting Gathering;
- Gathering continuation;
- starting Farming;
- Farming continuation.

Removing the bag can immediately make the character overloaded. Existing overload rules then block or stop the relevant activities.

## Weapon routing

Weapon definitions may declare a `skillPath`.

Both current Short Sword definitions declare:

- weapons;
- one-handed;
- swords;
- short-sword.

The runtime obtains the path only from the equipment instance currently referenced by `mainHand`.

There is no inventory-order fallback.

If mainHand is empty, or the item has no skill path:

- generic attack is still allowed as an unarmed/basic action;
- no weapon SkillState changes;
- weapon skill multiplier is exactly 1.

If the equipped item declares a path, existing schema-v13 rules apply:

- success uses 20 base XP;
- miss/block/parry uses 5 base XP;
- depth scaling applies after the 100% weapon weight;
- all applicable weapon-node bonuses stack multiplicatively;
- a level gained during combat affects subsequent attacks immediately.

## UI

The inventory panel now shows:

- all four equipment slots;
- the currently equipped item or empty slot;
- Unequip action;
- each owned equipment instance;
- Equip action when requirements are satisfied;
- a requirement warning when they are not.

Combat disables equipment changes.

## Deferred combat branches

This stage does not add new Armor, Shield or Magic skill nodes.

The already agreed cross-domain weights remain:

- weapon 100%;
- armor 80%;
- blocking 70%;
- magic 30% when applicable.

The next combat-progression stage can now use the actual body/offHand loadout to award Armor and Blocking XP without guessing what the player used.
