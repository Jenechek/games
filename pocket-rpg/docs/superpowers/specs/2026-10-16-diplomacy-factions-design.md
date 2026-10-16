# Pocket RPG — Diplomacy and Factions Design

Date: 2026-10-16
Status: Implemented

## Goals

Diplomacy is a peaceful progression path that makes faction relations active without turning reputation into a fast economic exploit.

It must:
- use the already established city-faction relations from the economy;
- reward Charisma and a dedicated Diplomacy skill;
- progress slowly enough that high standing is meaningful;
- provide non-combat interaction in faction cities;
- affect markets only within the previously established ±5% faction-price ceiling;
- avoid repeatable gold farming.

## Factions

Four specialized cities have factions:

- Karnholm — Military Council.
- Ellaria — Arcane Synod.
- Rivermark — River Guild.
- Greenwald — Union of Communities.

Tillanium remains neutral and has no faction reputation track.

Relations range from -100 to +100.

Ranks:
- Hostile: -100…-51
- Cold: -50…-21
- Neutral: -20…19
- Respected: 20…49
- Honored: 50…79
- Allied: 80…100

## Diplomacy skill

Diplomacy is a peaceful profession skill from 0 to 100 and uses the shared skill XP curve.

It is developed only by explicit diplomatic actions:
- audience success: 25 XP;
- audience failure: 10 XP;
- mediation success: 55 XP;
- mediation failure: 20 XP;
- completed faction request: 60 XP.

Trading does not grant Diplomacy XP.

## Audience

An audience is the basic social action.

Cooldown: 2 real hours per faction.

Success:
- +1 relation;
- 25 Diplomacy XP.

Failure:
- no relation loss;
- 10 Diplomacy XP.

Success probability is based on:
- base 52%;
- +0.2 percentage points per Diplomacy level;
- +0.6 percentage points per Charisma above 10;
- hostile relations slightly improve recovery chance;
- high positive standing becomes progressively harder to increase.

Final chance is clamped to 20–85%.

This makes audience useful for steady relationship repair but too slow to rush high reputation.

## Mediation

Mediation unlocks at Diplomacy level 20.

Cooldown: 6 real hours per faction.

Success:
- +2 relation;
- 55 Diplomacy XP.

Failure:
- -1 relation;
- 20 Diplomacy XP.

Success probability uses skill, Charisma and current standing, clamped to 20–85%.

Mediation is deliberately riskier than audience and becomes the main skill-based social action at mid progression.

## Faction requests

Each faction has a rotating list of material needs.

The active request changes every 6 real hours and can be completed once per faction per window.

Completion:
- consumes the exact requested item and quantity;
- +3 relation;
- 60 Diplomacy XP;
- gold compensation equal to 50% of the requested goods' authored base value.

The 50% compensation keeps requests a reputation investment instead of an arbitrage route.

Current request themes:
- Karnholm asks for food, healing supplies and medicinal herbs.
- Ellaria asks for imported iron and plant materials.
- Rivermark asks for grain, fiber and healing supplies.
- Greenwald asks for iron, preserved fish and healing supplies.

## Reputation rewards

At relation 50 (Honored), each faction unlocks one local merchant item:

- Karnholm — Rare Short Sword.
- Ellaria — Battle Tonic.
- Rivermark — Spinner.
- Greenwald — Rare Flax.

The item still uses normal city pricing, player market pressure, Trading, Charisma and relation modifiers.

No unique equipment or permanent combat-stat bonus is granted by reputation in this stage.

## Economy interaction

Faction relation continues to modify prices by at most ±5%, exactly as established in the Trading stage.

Diplomacy does not change:
- the 72% base sell factor;
- city surplus/deficit profiles;
- personal market pressure;
- event multipliers;
- carrying capacity.

Therefore high reputation improves an existing route modestly but cannot erase the economy's core constraints.

## Activity restrictions

Diplomatic actions:
- require the player to be physically present in the faction's city;
- are unavailable in combat;
- are unavailable during unconsciousness or forced recovery;
- interrupt fishing, farming work and gathering when started.

## Persistence

Schema v7 stores:
- Diplomacy skill;
- per-faction audience cooldowns;
- per-faction mediation cooldowns;
- completed request window ids.

Faction relations remain in the existing economy state so the market continues to use one authoritative relation value.

Schemas v1–v6 migrate automatically to v7 with neutral Diplomacy defaults.
