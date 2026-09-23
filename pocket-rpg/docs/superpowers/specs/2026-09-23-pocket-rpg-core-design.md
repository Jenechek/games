# Pocket RPG Core Design

Date: 2026-09-23  
Status: Approved

## Product direction

Browser-based text RPG inspired by Pocket Combats RPG, with deeper progression, dynamic locations, automatic/manual combat, persistent character growth, multiple cities, dynamic economy, peaceful professions, faction relationships, ambient NPC dialogue, crafting, farming, and event-driven world state.

The first implementation validates the core loop rather than the full content scope.

## Technical stack

- TypeScript
- React
- Vite
- IndexedDB for local persistent saves
- Pure TypeScript game core with no React dependency
- Static authored content in data modules
- Timestamp-based reconstruction for safe offline/out-of-combat timers
- Seeded RNG for deterministic tests

## Architecture

`src/game-core/`
- deterministic domain logic
- progression formulas
- combat resolution
- inventory/equipment rules
- location/travel rules
- peaceful activity rules
- save-safe state models

`src/app/`
- React UI only
- state presentation and command dispatch
- no duplicated balance formulas

`src/content/`
- attributes, skills, items, enemies, locations, cities, events, recipes, dialogue pools

`src/storage/`
- IndexedDB persistence
- versioned save schema
- migrations

The engine must remain presentation-independent.

## First playable vertical slice

Implement only:
1. Character creation and 8 attributes
2. General level and XP
3. Hierarchical skill tree and skill XP
4. Inventory, mass, equipment, requirements
5. 4–6 connected locations with 4–8 second travel
6. Basic encounter system
7. Combat: 5-second auto rounds + manual mode
8. Loot and pickup
9. IndexedDB save/load
10. Fishing as first peaceful activity
11. One city and one merchant

Deferred until the slice is stable:
- multi-city economy
- full faction network
- University retraining UI
- full crafting catalog
- farming UI
- large summon roster
- other peaceful professions
- multiplayer/PvP

## Attributes

Eight base attributes:
- Strength
- Agility
- Intuition
- Vitality
- Wisdom
- Luck
- Charisma
- Intelligence

All start at 10.

Each character level grants exactly 15 whole attribute points:
- +1 to every attribute
- remaining 7 distributed automatically by the XP-source profile accumulated during that level

Attributes primarily:
- gate equipment
- gate event/world checks
- provide modest numeric bonuses
- provide small XP-affinity bonuses to related skills

General XP:
- first level requires substantial XP
- every next level requires 15% more XP

## Skills

Hierarchical tree:
- maximum depth 4
- some branches may stop at depth 3
- maximum 8 direct children per node
- every node starts at 0 and caps at 100
- 250 XP for level 1
- each next level requires 15% more XP
- deeper relevant node gains 65% more XP than its parent for the same action
- child level may exceed parent level
- no global skill cap
- skills never decay
- full tree visible from start
- skills grow only through practical use
- XP stored fractionally and shown to one decimal place

Baseline direct successful action: 20 XP before modifiers.
Failed action: 25% XP.
XP depends on action difficulty, effectiveness, success/failure, small randomness, branch relevance, hierarchy depth, and attribute affinity.
Trading has no per-transaction XP cap.

Skill effect:
- +0.2% primary effectiveness per level
- direct sibling spillover = 10% of primary bonus
- applicable ancestor/descendant bonuses multiply

Fixed ability unlock levels:
10 / 20 / 35 / 50 / 70 / 85 / 100

Unlocked abilities are always available when their scope applies.
Abilities also level 0–100 with the same 250 XP / +15% progression model and fixed passive milestones.

## Equipment and inventory

Equipment may require both:
- minimum attributes
- minimum skill levels

If requirements are not met, the item may be owned/traded/stored but not equipped.

Inventory:
- limited by mass, not slots
- equipped gear does not count toward inventory carrying mass
- identical items may stack
- stack mass is the sum of all items
- quest items and currency have no mass and are stored separately
- specialized bags/pouches are organizational only
- bows have unlimited abstract ammunition; arrows are not inventory items

Carrying capacity depends on Strength, Vitality, bag, and some support summons.

Overload:
- allowed
- increases travel time
- lowers overall combat effectiveness by overload percentage
- at 120% carried mass, peaceful activities become unavailable except Trading

Global city chest:
- unlimited capacity
- shared between all cities

Equipment presets:
- switchable with one button outside combat
- unavailable items leave slots empty
- gear cannot change during combat

## Items

Rarity:
- Common: base stats, 0 inherent properties
- Quality: improved base stats, 0 inherent properties
- Rare: stronger stats, 1 inherent property
- Epic: stronger than Rare, 1 inherent property
- Unique: highest stats, 2 inherent properties

Item weight/size are fixed by base item.
Combat stats may roll within small ranges.
Affixes come only from logically compatible pools.
Affix strength has only a narrow roll range and does not scale with rarity.

Equipment upgrades:
- levels 0–5
- every upgrade increases all numeric stats granted by the item by 25% multiplicatively
- level 3 adds one random compatible property
- level 5 adds one more
- any rarity may reach level 5
- equip requirements do not increase with rarity or upgrade level
- upgrades are guaranteed when costs are paid
- reroll one chosen rerollable property at a time
- unlimited rerolls for a fixed small gold cost
- bespoke Unique properties occupy property slots, are fixed, and cannot reroll

No durability, repair, binding, or dismantling.

## Combat

No combat map or movement.

Modes:
- automatic: fixed 5-second rounds
- manual: unlimited decision time
- pause anytime
- switch between auto/manual freely before round resolution
- auto intended action visible to player

Per round:
- one main action
- one additional item action
- flee consumes the whole turn and disables item use

Player may change action, item action, and style until round resolution unless the main action is explicitly revealed/locked.

Resolution order:
1. player additional action
2. enemy additional action
3. player main action
4. enemy main action

Earlier effects immediately affect later steps.
If defeat occurs, normal calculation stops immediately except explicit defeat-triggered effects.

Resources:
- Health
- Mana
- Stamina
- physical abilities spend Stamina
- spells spend Mana
- basic physical attacks cost no Stamina
- each staff has a no-Mana magical base attack and no physical base attack

In combat:
- Mana +15% max per round
- Stamina +15% max per round
- Health has no passive combat regeneration

End of round:
1. periodic effects
2. Mana regeneration
3. Stamina regeneration
4. duration tick
5. cooldown tick

Cooldowns and effect duration use rounds.
Same statuses strengthen and extend.
Opposing statuses cancel/replace.
No global status-count cap.
Repeated control has no universal diminishing returns.

Every offensive action can miss.
Physical crit = x1.5.
Magic has no normal random crit; elemental vulnerability makes the magical hit critical.
Each magical attack has exactly one element.

Physical damage types include slashing, piercing, blunt.
One physical hit may contain multiple components.
Armor mitigation is percentage based and uses diminishing-return stacking.
Armor cannot reduce a successful hit to zero by itself.
Magic ignores base physical armor unless gear explicitly grants magic/elemental resistance.
Magic resistance cap:
- ordinary classes: 40%
- Templar: 60%

Physical mitigation has no hard cap but stacks asymptotically with diminishing returns.

Shield:
- contributes to physical mitigation
- separate full-block chance from shield stat only
- normal full-block cap 60%
- correct style may exceed normal cap by +20 percentage points

Parry:
- unavailable with shield
- successful parry fully negates physical attack
- may trigger one ordinary-damage bonus counterattack
- normal cap 35%
- correct style may exceed by +20 percentage points

Evasion:
- separate full avoidance mechanic
- light builds can have very high raw evasion
- strongly opposed by attacker accuracy and related stats
- technical effective ceiling about 90%, never 100%

Combat styles:
- all core styles available from start
- freely switchable
- current style at resolution is used
- auto AI may switch style unless player locks it
- style affects broad combat profile, not just action preference
- correct style gives +20 percentage points to relevant attack/block/parry success, including above normal caps

Auto-combat tactical rules are hidden.
Behavior is shaped by attributes, skills, equipment, style, resources, statuses, known enemy information, and context.
Player may whitelist which consumables auto-combat may use.

Enemy AI follows analogous rules and may change styles.

Intent:
- normally hidden
- some strong abilities explicitly reveal their own intent and lock their action
- reveal is guaranteed and stated in ability description
- these abilities are stronger and may have slightly higher resource/cooldown cost
- ordinary disabling effects can still prevent execution
- no special cancel-revealed-action ability

Penetration:
- proportional against current physical mitigation or magic/elemental resistance
- no block/parry/evasion penetration stat

Control resistance:
- separate per control type
- reduces apply chance, strength, and duration
- similar percentage modifiers stack with diminishing returns

## Defeat and injuries

Normal defeat:
- unconscious for 15 seconds
- remain in same location
- receive injury
- boss/mini-boss defeat causes 3 injury rolls

Body zones:
- head
- torso
- left arm
- right arm
- left leg
- right leg

Severity:
- 1 light
- 2 medium
- 3 severe
- repeat injury on same zone increases severity
- zone already at 3 rerolls to another zone

Injuries affect combat and logically related peaceful work.

If active injury count exceeds 5, forced rest begins.
Rest time = total injury severity levels × 30 seconds.
During forced rest the player may use inventory.
Only strong injury medicine may remove injuries during forced rest; it fully heals all injuries and immediately cancels the rest timer.

Outside forced rest:
- weak medicine heals 2 random severity levels
- medium heals 4 random severity levels
- strong heals all
- injury medicine only outside combat

## Loot

Defeated enemy:
- gold granted automatically
- item drops shown in loot window
- player chooses items to take
- unclaimed items disappear when window closes

Loot tables belong to enemy types.
Enemies have habitats.
Luck can modestly improve drop chance and item quality.

## Locations and travel

Fixed interconnected locations.
Adjacent travel time approximately 4–8 seconds before overload penalties.

Locations have:
- identity
- changing modifiers
- events
- monster pool
- peaceful resource pool

Events can introduce non-native monsters, quests, resource/economy changes, and immediate world consequences.

## Fishing

First implemented peaceful profession.

Loop:
start -> automatic cycles -> result -> XP -> inventory -> rare event check -> repeat

Rules:
- continues until stopped/interrupted
- mid-cycle interruption loses that cycle progress
- inventory interaction and passive NPC dialogue do not stop it
- unrelated actions stop it
- resources never deplete
- very low interruption risk based on location
- location has authored fish pool; pools may overlap
- bait changes species probabilities and rare-value chances
- better rods require skill, improve catch quality/rare chance, and speed
- Luck gives a small secondary boost
- rare/valuable catches grant more skill and general XP
- some rare fish may depend on weather/time and are hinted vaguely before discovery

## Persistence

Use IndexedDB.
Save schema:
- explicit schema version from first release
- migration support
- stable string content IDs
- store timestamps for safe real-time processes
- do not store safely derived values unnecessarily

Offline reconstruction is allowed for safe out-of-combat processes.
Combat never progresses offline.

## Initial content target

- 1 city
- 4–6 connected locations
- 3–5 enemy types
- 1 weapon family path
- 1 armor path
- minimal magic branch
- 1 merchant
- Fishing
- 1–2 lightweight location events
- 1 temporary NPC dialogue encounter

## Testing requirements

The game core must be unit-tested independently of React.

Priority coverage:
- XP formulas
- skill hierarchy multipliers
- level thresholds
- automatic attribute distribution
- inventory mass and overload
- equipment requirements
- combat resolution order
- same-round interruption
- defeat stop behavior
- block/parry/evasion behavior
- diminishing-return stacking
- item rarity/upgrade scaling
- loot rolls
- travel timing
- save/load round trip
- timestamp reconstruction
- deterministic seeded RNG

## Simplicity constraints

Do not add:
- durability/repair
- hunger/thirst
- ammunition management
- item binding
- recipe failure
- workshop quality tiers
- dismantling
- custom inventory tags
- combat map/movement
- deferred professions or systems not required by the first vertical slice
