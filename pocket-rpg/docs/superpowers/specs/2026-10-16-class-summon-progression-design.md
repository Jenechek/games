# Pocket RPG — Class and Summon Progression

Date: 2026-10-16
Status: Implemented confirmed class subset

## Scope

This stage connects the persistent summon core to player classes without inventing a complete class roster.

Only previously confirmed archetypes are authored:

- Mage
- Tamer

The registry is intentionally extensible. Additional classes remain a separate design decision.

No class is assigned automatically to a new or migrated character.

## Class state

A character stores:

- selected class id or null;
- one class skill state from 0 to 100.

The class skill represents progression in the selected class's summon branch for this vertical.

There is no separate top-level Summoning profession or global Summoning skill.

## Initial class selection

A new character starts with no class.

The current vertical permits one explicit initial class selection.

Automatic assignment is forbidden.

Class switching/retraining is not implemented in this stage. This avoids inventing class-change rules before the complete class roster and retraining design are agreed.

A legacy v10 save may contain unbound summons with no selected class. Such a save remains loadable, but the UI refuses initial class selection while those unbound summons exist so it cannot silently reinterpret them as another class.

## Class skill XP

Summoning a creature grants no class XP.

This prevents progression by repeated summon/replacement spam.

After a combat victory:

- normal character combat XP is calculated as before;
- if at least one summon participated in that combat, the selected class skill receives 50% of that combat XP;
- if no summon participated, class skill XP is zero.

A summon that participated and later died still counts as participation in that combat.

Class skill uses the shared 0–100 skill XP curve.

## Mage

Current authored Mage configuration:

- summon capacity: 1;
- personal damage multiplier: 1.00;
- summon HP multiplier: 1.00;
- summon damage multiplier: 1.00;
- Guardian Elemental unlock: class skill 0.

The Guardian Elemental retains the summon-core rule of 100% interception for successful attacks against the player.

No additional Mage classes, summons, spells or branch nodes are invented in this stage.

## Tamer

Current authored Tamer configuration:

- summon capacity: 3;
- personal damage multiplier: 0.85;
- summon maximum HP multiplier: 1.15;
- summon damage multiplier: 1.15.

Unlocks:

- War Beast: class skill 0;
- Swift Beast: class skill 20;
- Bulwark Beast: class skill 35.

The Tamer therefore trades 15% of current generic personal attack damage for stronger creatures.

These numbers are authored content constants rather than schema rules and may be tuned later without changing save structure.

## Effective summon definitions

Class multipliers are applied through one effective-definition layer.

The same class-scaled definitions are used for:

- creating a summon;
- out-of-combat recovery;
- preparing combat summon state;
- summon UI maxima;
- save validation.

This avoids a split where combat could use a larger Tamer maximum HP than persistence understands.

## Summon access

A class may summon only creature definitions listed in its class unlock table and already unlocked by current class skill level.

The generic summon core still owns:

- oldest replacement when capacity is exceeded;
- persistent HP/stamina;
- automatic actions;
- interception;
- death removal;
- offline recovery.

The class layer owns:

- capacity;
- allowed creature ids;
- unlock thresholds;
- personal combat multiplier;
- summon HP/damage multipliers.

## Recovery and combat

Class-scaled maximum HP is persistent.

For example, the current Tamer War Beast maximum is:

70 × 1.15 = 80.5, rounded to 81 HP.

Out-of-combat recovery therefore heals it up to 81, not the base 70.

The Tamer's 0.85 personal damage multiplier is applied when player combat state is created.

No direct manual summon combat commands are introduced.

## Persistence

Schema v11 stores class state.

Migration rules:

- v1–v9 continue through existing migrations;
- v10 summons are preserved;
- v10→v11 adds classId=null and class skill 0/0;
- migration never guesses a class.

For a selected class, v11 validation checks:

- valid class id;
- valid class skill state;
- active summon count does not exceed that class limit;
- each active summon is unlocked at the current class skill level;
- summon HP is within the class-scaled maximum;
- stamina and instance/timestamp invariants remain valid.

For classId=null, class skill must remain exactly level 0 / XP 0.

## UI

Before class selection, the Class panel shows only the confirmed Mage and Tamer definitions.

After selection it shows:

- class label and description;
- class skill level and XP;
- active summon count / class capacity;
- current summon unlock list;
- summon buttons only for unlocked creatures.

The panel does not expose a class-switch action.

## Deferred work

Still intentionally deferred:

- complete player-class roster;
- full visible class skill trees and deeper nodes;
- non-summon class abilities;
- class changing/retraining rules;
- additional Mage/Tamer summons beyond confirmed content;
- generalized status-effect redirection through summon interception.

Those systems should extend the registry and class branches rather than create a separate Summoning profession.
