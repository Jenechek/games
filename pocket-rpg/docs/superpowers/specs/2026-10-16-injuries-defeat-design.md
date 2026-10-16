# Pocket RPG Injuries and Defeat Design

Date: 2026-10-16  
Status: Draft for user review

## Goal

Complete the defeat loop for the first playable Pocket RPG vertical slice by adding persistent injuries, a 15-second unconscious state, forced rest, injury medicine, save/load support, and a minimal UI panel.

The combat engine continues to decide only whether a combatant is defeated. Persistent defeat consequences are handled by a separate game-core subsystem.

## Architecture

Create a dedicated pure TypeScript subsystem under:

`src/game-core/injuries/`

Responsibilities:
- injury data types and body zones
- applying injury rolls after defeat
- ordinary defeat vs boss/miniboss defeat
- unconscious timers
- forced-rest calculation and reconstruction
- injury medicine rules
- derived injury penalties exposed as pure functions

Combat remains independent from persistent consequences. `combat/resolution.ts` returns combat state only. The application layer detects player defeat and invokes the injury subsystem to update persistent character state.

Persistent injury state becomes part of `GameState` and IndexedDB save data.

React only displays state and dispatches commands. It does not calculate injury severity, rest duration, or medicine effects.

## Injury Model

Body zones are fixed:
- head
- torso
- left arm
- right arm
- left leg
- right leg

Each zone has severity:
- 0: no injury
- 1: light
- 2: medium
- 3: severe

Persistent injury state stores one severity value per body zone.

A repeated injury on the same body zone increases severity by exactly 1, capped at 3.

A zone already at severity 3 is excluded from subsequent injury selection. Injury rolling must choose only from eligible zones.

The already-approved design assumes other game rules prevent the impossible state where no eligible body zone exists during ordinary play. The subsystem must still fail safely if all six zones are already severity 3: no new injury is added and no infinite reroll loop occurs.

## Defeat Consequences

Ordinary defeat:
- combat ends immediately
- player remains in the current location
- player becomes unconscious for 15 real-time seconds
- exactly one injury roll occurs

Boss or miniboss defeat:
- same 15-second unconscious period
- player remains in the current location
- exactly three injury rolls occur
- the three rolls are sequential and may hit the same body zone multiple times
- repeated hits during those three rolls escalate severity normally

Defeat does not teleport the player to a city.

During unconscious state:
- no travel
- no combat
- no peaceful activity
- no merchant interaction
- inventory may be viewed
- injury medicine is not usable until consciousness returns

## Forced Rest

After injuries are applied, count the number of body zones with severity greater than 0.

If more than 5 body zones are injured, forced rest starts after the unconscious period ends.

Forced-rest duration:
`total severity levels across all injuries × 30 seconds`

Examples:
- head 2 + left leg 1 + right arm 1 = 4 severity levels = 120 seconds
- six light injuries = 6 severity levels = 180 seconds

Forced rest is timestamp based:
- `restUntil` is persisted
- reload reconstructs whether rest is still active
- time while the game is closed counts toward the rest timer

During forced rest:
- no travel
- no combat
- no peaceful activity
- no merchant interaction
- inventory remains accessible
- only strong injury medicine is usable
- using strong medicine clears all injuries and immediately cancels forced rest

If injuries are reduced after forced rest has already started, the current rest timer is not recalculated. Only full strong-medicine recovery cancels it early.

## Injury Medicine

Three medicine tiers:

Weak:
- usable only outside combat
- unusable while unconscious
- unusable during forced rest
- heals exactly 2 total severity levels, or all remaining levels if fewer than 2 exist
- each healed severity level is assigned randomly among currently injured zones

Medium:
- usable only outside combat
- unusable while unconscious
- unusable during forced rest
- heals exactly 4 total severity levels, or all remaining levels if fewer than 4 exist
- each healed severity level is assigned randomly among currently injured zones

Strong:
- usable only outside combat
- unusable while unconscious
- usable during forced rest
- removes all injuries
- if forced rest is active, clears `restUntil` immediately

Medicine is consumed only when it successfully heals at least one severity level.

If there are no injuries, medicine use is rejected without consuming the item.

## Injury Penalties

This phase implements a small, explicit first set of penalties so injuries affect gameplay immediately without over-expanding scope.

Head:
- each severity level reduces effective accuracy by 3 percentage points

Torso:
- each severity level reduces maximum combat HP by 5%

Left arm:
- each severity level reduces block/parry-related effectiveness by 5% when the active equipment uses that arm

Right arm:
- each severity level reduces physical attack effectiveness by 5% when the active equipment uses that arm

Left leg:
- each severity level increases travel time by 5%

Right leg:
- each severity level increases travel time by 5%

For the first implementation, handedness/equipment-side logic is simplified:
- right arm is treated as the attacking/main-hand arm
- left arm is treated as off-hand/shield/parry support

These functions live in the injury subsystem and expose derived multipliers/adjustments. React does not duplicate them.

Penalties stack with existing modifiers using the existing game-core calculation path where one exists. They do not create a second independent combat engine.

## Persistent State

Extend persistent game state with:

```ts
interface InjuryState {
  severity: Record<BodyZone, 0 | 1 | 2 | 3>;
  unconsciousUntil: number | null;
  restUntil: number | null;
}
```

`GameState` includes `injuries: InjuryState`.

Save schema must remain versioned. Because existing saves already use schema version 1, adding required injury state requires a migration.

Create schema version 2:
- schemaVersion: 2
- old version-1 saves migrate by adding a clean injury state
- no user progress from version-1 saves is discarded

Corrupted saves still fail closed to a fresh/default state.

## Content

Add three new inventory item definitions:
- weak injury medicine
- medium injury medicine
- strong injury medicine

All three are normal carried consumables with authored mass and price.

Initial merchant stock in Tillanium includes at least weak and medium medicine.
Strong medicine may also be sold in the first slice for accessibility; rarity/economy tuning can change later without changing the subsystem.

## Application Flow

On player defeat:
1. combat state resolves player HP <= 0
2. application invokes `applyDefeatConsequences(...)`
3. injury rolls are applied
4. `unconsciousUntil = now + 15000`
5. if injury-count threshold is exceeded, `restUntil` is scheduled to begin after unconsciousness and run for the calculated duration
6. combat is cleared
7. UI switches to defeat/recovery display

At every app tick:
- reconstruct unconscious status from timestamp
- reconstruct forced-rest status from timestamp
- completed timestamps are normalized to null

When a player command is issued, the command layer checks recovery locks before starting travel, combat, fishing, or merchant activity.

## UI

Add an `InjuryPanel`.

Show:
- every currently injured body zone
- severity text: лёгкая / средняя / тяжёлая
- remaining unconscious time if active
- remaining forced-rest time if active
- available injury medicines in inventory
- usable medicine buttons
- disabled-state explanation when medicine cannot currently be used

While unconscious, show a clear recovery message instead of presenting unavailable gameplay actions as if they were usable.

While forced rest is active, show a clear rest message and allow strong medicine from the panel.

## Testing

Add game-core tests covering:

Injury rolling:
- ordinary defeat adds one injury level
- repeated hit escalates the same zone
- severity never exceeds 3
- severity-3 zones are excluded
- all-severe state terminates safely
- boss/miniboss defeat performs exactly 3 sequential rolls

Timers:
- unconscious duration is exactly 15 seconds
- player remains in current location
- forced rest starts only when more than 5 zones are injured
- rest duration equals total severity × 30 seconds
- timestamp reconstruction clears completed unconscious/rest timers

Medicine:
- weak heals 2 severity levels
- medium heals 4
- strong heals all
- weak/medium rejected during forced rest
- strong works during forced rest and cancels timer
- medicine rejected during unconscious state
- no-injury use does not consume inventory

Persistence:
- version-1 save migrates to version 2 with clean injury state
- version-2 save/load round trip preserves injury state and timestamps
- corrupted saves remain safe

Gameplay locks:
- travel blocked while unconscious
- combat blocked while unconscious
- fishing blocked while unconscious
- travel/combat/fishing blocked during forced rest
- inventory remains accessible

Penalty helpers:
- head affects accuracy
- torso affects max HP
- legs affect travel time
- arm penalties return expected multipliers

## Scope Exclusions

Do not add in this phase:
- hospitals
- doctors
- injury-specific quests
- permanent disabilities
- limb loss
- diseases
- bleeding-out state after defeat
- new death system
- city respawn
- item durability
- complex left/right handedness setting
- animation-heavy defeat UI
- special injury types beyond the six fixed body zones and severity 1–3

## Compatibility

This subsystem must preserve:
- current 5-second combat rounds
- current loot flow
- current fishing flow
- current travel graph
- current merchant flow
- deterministic seeded RNG in tests
- presentation-independent game-core architecture
