# Pocket RPG — Character XP and Automatic Attribute Growth

Date: 2026-10-16
Status: Implemented

## Goals

Character level must become reachable through normal play while preserving the previously agreed automatic attribute system:

- eight attributes start at 10;
- every level grants exactly +15 total attribute points;
- every attribute receives at least +1;
- the remaining 7 points are allocated from XP-source proportions;
- there is no manual attribute allocation;
- the source profile must survive save/load;
- University retraining remains a separate redistribution layer.

## Character XP curve

Level 1 -> 2 requires 1000 character XP.

Each following level requires 15% more than the previous threshold:

required(level) = 1000 × 1.15^(level - 1)

XP above a level boundary carries into the next level.

A single large reward may therefore cross multiple levels.

## XP sources

Existing activity XP is reused wherever an authored XP value already exists.

- Fishing: the same XP granted by the caught fish.
- Gathering: resource XP; rare result uses the same doubled XP already used by Gathering.
- Farming planting: 50% of crop harvest XP per planted cell, matching Farming skill XP.
- Farming harvest: crop harvest XP; rare harvest doubles it, matching Farming skill XP.
- Crafting: recipe XP for every produced item.
- Alchemy: recipe XP for every produced item.
- Trading: the same XP formula used by the Trading skill: max(1, sale gold × 0.12).
- Diplomacy: the XP value returned by audience, mediation or faction request.
- Combat: 40 + 20 × enemy level.

No character XP is granted for:
- buying;
- consuming medicine or potions;
- equipment upgrades;
- property rerolls;
- passive travel;
- failed actions that already grant no profession XP.

## Attribute source profiles

Every character-XP source contributes its XP into an eight-attribute profile.

Combat:
- Strength 30%
- Agility 20%
- Intuition 15%
- Vitality 20%
- Wisdom 3%
- Luck 5%
- Charisma 2%
- Intelligence 5%

Fishing:
- Strength 3%
- Agility 25%
- Intuition 25%
- Vitality 8%
- Wisdom 12%
- Luck 20%
- Charisma 2%
- Intelligence 5%

Gathering:
- Strength 5%
- Agility 20%
- Intuition 25%
- Vitality 10%
- Wisdom 15%
- Luck 15%
- Charisma 2%
- Intelligence 8%

Farming:
- Strength 8%
- Agility 8%
- Intuition 8%
- Vitality 22%
- Wisdom 28%
- Luck 8%
- Charisma 3%
- Intelligence 15%

Crafting:
- Strength 3%
- Agility 18%
- Intuition 8%
- Vitality 4%
- Wisdom 20%
- Luck 7%
- Charisma 3%
- Intelligence 37%

Alchemy:
- Strength 1%
- Agility 8%
- Intuition 10%
- Vitality 5%
- Wisdom 28%
- Luck 8%
- Charisma 3%
- Intelligence 37%

Trading:
- Strength 1%
- Agility 3%
- Intuition 10%
- Vitality 2%
- Wisdom 12%
- Luck 18%
- Charisma 34%
- Intelligence 20%

Diplomacy:
- Strength 1%
- Agility 2%
- Intuition 10%
- Vitality 2%
- Wisdom 24%
- Luck 6%
- Charisma 38%
- Intelligence 17%

Every profile sums to 100%.

## Level-up allocation

While earning XP toward a level, all source contributions accumulate.

At the level boundary:

1. Every attribute receives +1. This consumes 8 of the 15 points.
2. The remaining 7 points are distributed proportionally to the accumulated attribute profile.
3. Each fractional allocation is floored.
4. Any still-unassigned points go to the largest fractional remainders.
5. Equal remainders use stable attribute order for deterministic saves/tests.
6. The source profile is reset to zero for the next level.

This guarantees exactly +15 points with no manual allocation.

## Boundary splitting

If a reward crosses a level boundary, only the XP needed to reach that boundary contributes to the current level profile.

The overflow is applied after the level-up and starts the next level's profile.

Example:
- current XP: 900 / 1000;
- gain 300 Combat XP;
- first 100 Combat XP completes the current profile;
- level-up occurs;
- remaining 200 Combat XP become progress/profile for the next level.

## Combat XP balance

Combat reward:
40 + 20 × enemy level.

Current examples:
- level 1 enemy: 60 XP;
- level 2 enemy: 80 XP;
- level 4 enemy: 120 XP;
- level 7 enemy: 180 XP.

This keeps combat relevant without letting one early encounter dominate a 1000-XP level.

## Persistence

Schema v9 stores the in-progress eight-attribute XP profile.

Migration:
- v8 -> v9 preserves level, XP, attributes and University state;
- the new source profile starts empty because historical source information was never persisted;
- v1-v7 continue through existing migrations, then receive an empty profile.

University retraining does not change the accumulated XP-source profile. It redistributes already-earned specialization, while the source profile controls only future level-up allocation.

## UI

Character panel shows:
- current level;
- current XP / next-level requirement;
- current attributes;
- up to three strongest current profile influences as percentages.

This exposes the automatic allocation logic without adding manual controls.
