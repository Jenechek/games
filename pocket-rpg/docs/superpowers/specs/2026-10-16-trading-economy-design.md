# Pocket RPG — Trading Economy Design

Date: 2026-10-16
Status: Implemented

## Goals

Trading must be a viable peaceful progression path without invalidating gathering, farming, crafting, combat loot, carrying capacity, or future Diplomacy.

The economy is simple enough to read at a glance but dynamic enough that routes and timing matter.

## Cities

- Tillanium — neutral trade hub with broad assortment and no strong permanent surplus.
- Karnholm — military city; iron and heavy equipment are cheaper, food and herbs are relatively expensive.
- Ellaria — magical center; alchemy, magical consumables and arcane goods are cheaper, ordinary military goods are relatively expensive.
- Rivermark — river city; fish, preserved fish and fishing equipment are cheaper.
- Greenwald — agricultural region; crops, plant fiber and agricultural cargo are cheaper, iron and imported goods are more expensive.

Safe trade roads connect the four specialized cities through Tillanium's gate. The current trade stage does not force combat onto the peaceful route.

## Base spread and city profiles

Merchant stock is effectively unlimited.

Every market item has one authored base price. A city then applies an explicit multiplier for goods it produces or lacks.

The normal sell factor is 72% of the current local market value before player bonuses. This prevents immediate same-city buy/sell loops from producing profit.

Specialized city pairs are tuned so a clean intercity route can produce roughly 25–40% gross spread before carrying limits, personal pressure, events and travel are considered.

## Personal market pressure

Each city and item tracks its own player-created pressure.

- Buying one unit adds +5 percentage points.
- Selling one unit subtracts 5 percentage points.
- Pressure is clamped from -25% to +150%.
- Pressure decays linearly back to zero over 12 real hours.

A batch transaction prices units sequentially, so each later unit already sees the pressure created by the previous unit.

This makes small arbitrage trades efficient while discouraging unlimited bulk loops.

## Trading progression

Trading is a profession skill from 0 to 100 using the existing skill XP curve.

Sales grant XP equal to 12% of received gold. Buying does not grant XP.

Trading skill improves both sides of the spread by up to 8% at level 100.

Charisma adds up to another 4% trading advantage.

Combined skill + Charisma advantage is therefore capped at 12%.

## Faction relation hook

Each specialized city exposes a faction relation value from -100 to +100.

At this stage relations start at 0 and are persisted, but no Diplomacy gameplay changes them yet.

Relation changes future prices by at most ±5%:
- positive relation lowers buy prices and raises sell prices;
- negative relation does the reverse.

This keeps the economy ready for the Diplomacy stage without implementing that stage prematurely.

## Events

Market events use deterministic six-hour real-time windows.

Current events:
- Tillanium: Caravan Fair — imported trade cargo becomes cheaper.
- Karnholm: Military Orders — iron and military equipment become more expensive.
- Ellaria: Magical Symposium — arcane goods, mana/focus consumables and medicinal herbs rise in price.
- Rivermark: Poor Catch — fish and preserved fish rise in price.
- Greenwald: Rich Harvest — agricultural goods become cheaper.

Events multiply the city profile rather than replacing it.

## Cargo and carrying capacity

Four dedicated intercity cargo items are introduced:
- Iron Ingot — 2 mass.
- Arcane Ink — 0.5 mass.
- Dried Fish — 1 mass.
- Grain Sack — 2 mass.

This makes existing carrying capacity and overload mechanics part of trade-route optimization.

## Equipment trade

Equipment purchased from merchants becomes a proper individual equipment instance, never an inventory stack.

Equipment sale value accounts for:
- item class;
- rarity;
- +0…+5 upgrade multiplier;
- number of rolled properties.

The merchant still applies the normal sell factor, so upgrade investment is not fully recoverable through resale.

## Save compatibility

Trading progression, faction relations and per-city item pressure are durable state in schema v6.

Schemas v1–v5 migrate automatically to v6 with a neutral default economy.
