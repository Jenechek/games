# Pocket RPG First Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first end-to-end playable browser slice of Pocket RPG: persistent character progression, hierarchical skills, inventory/equipment, connected locations, encounters, 5-second auto/manual combat, loot, fishing, and a minimal city merchant loop.

**Architecture:** Keep all game rules in a pure TypeScript `game-core` that has no React or browser-storage dependency. React renders immutable game state and sends commands; content is authored as stable-ID data; IndexedDB persists a versioned save envelope. Time-based systems store timestamps and are reconstructed, never simulated by long-lived hidden timers.

**Tech Stack:** TypeScript, React, Vite, Vitest, React Testing Library, IndexedDB, fake-indexeddb for tests.

**Spec:** `pocket-rpg/docs/superpowers/specs/2026-09-23-pocket-rpg-core-design.md`

## Global Constraints

- All core game formulas live under `src/game-core/`; React must not duplicate balance rules.
- All content references use stable string IDs.
- Tests use deterministic seeded RNG.
- Auto combat uses 5-second rounds; manual combat has no time limit.
- Travel between adjacent locations is 4–8 seconds before overload effects.
- Eight attributes start at 10.
- Character level grants exactly 15 whole attribute points: +1 to all 8, then 7 distributed by XP-source profile.
- Skill level 1 requires 250 XP; every next level requires 15% more XP.
- Deeper relevant skill nodes gain 65% more XP per hierarchy level.
- Skill levels cap at 100 and never decay.
- Inventory capacity is mass-based; equipped gear is excluded from carried inventory mass.
- Combat resolution order is player additional → enemy additional → player main → enemy main.
- Combat calculation stops on defeat except explicit defeat-triggered effects.
- No durability, ammunition inventory, binding, dismantling, hunger/thirst, or combat map.
- First slice content is intentionally small: 1 city, 4–6 locations, 3–5 enemies, one weapon path, one armor path, minimal magic, one merchant, Fishing.

## Review Focus

- Corrupted or partial save data must fail closed to a fresh/default state rather than crash the app.
- Reloading during travel must reconstruct remaining travel time without duplicating arrival or encounter side effects.
- Switching auto/manual mode near round resolution must execute only the final selected action/style once.
- Overload at exactly 120% must disable Fishing; values just below 120% must not.
- A combatant defeated by an earlier resolution step must never execute a later queued action in that round.

---

### Task 1: Scaffold the Pocket RPG application and core boundaries

**Files:**
- Create: `pocket-rpg/package.json`
- Create: `pocket-rpg/tsconfig.json`
- Create: `pocket-rpg/vite.config.ts`
- Create: `pocket-rpg/index.html`
- Create: `pocket-rpg/src/main.tsx`
- Create: `pocket-rpg/src/app/App.tsx`
- Create: `pocket-rpg/src/app/app.css`
- Create: `pocket-rpg/src/game-core/types.ts`
- Create: `pocket-rpg/src/game-core/rng.ts`
- Create: `pocket-rpg/src/game-core/rng.test.ts`

**Interfaces:**
- Produces: `SeededRng` with `next(): number`, `int(min,max): number`, `chance(probability): boolean`
- Produces foundational IDs/types used by all later tasks.

- [ ] **Step 1: Add project and test scripts**

```json
{
  "name": "pocket-rpg",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -b"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "fake-indexeddb": "^6.0.0",
    "jsdom": "^26.0.0",
    "typescript": "^5.8.0",
    "vite": "^7.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Write the failing deterministic RNG test**

```ts
import { describe, expect, it } from "vitest";
import { SeededRng } from "./rng";

describe("SeededRng", () => {
  it("replays the same sequence from the same seed", () => {
    const a = new SeededRng(12345);
    const b = new SeededRng(12345);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it("returns inclusive integers inside the requested range", () => {
    const rng = new SeededRng(7);
    for (let i = 0; i < 50; i += 1) {
      expect(rng.int(4, 8)).toBeGreaterThanOrEqual(4);
      expect(rng.int(4, 8)).toBeLessThanOrEqual(8);
    }
  });
});
```

- [ ] **Step 3: Run the RNG test and verify failure**

Run: `npm test -- src/game-core/rng.test.ts`  
Expected: FAIL because `SeededRng` does not exist.

- [ ] **Step 4: Implement minimal RNG and foundational types**

```ts
export class SeededRng {
  constructor(private state: number) {}

  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(probability: number): boolean {
    return this.next() < Math.max(0, Math.min(1, probability));
  }
}
```

```ts
export type ContentId = string;
export type AttributeId =
  | "strength" | "agility" | "intuition" | "vitality"
  | "wisdom" | "luck" | "charisma" | "intelligence";

export type GameMode = "idle" | "travel" | "combat" | "fishing";
```

- [ ] **Step 5: Add minimal React shell and verify build**

Run: `npm install && npm run build && npm test`  
Expected: build succeeds and RNG tests pass.

- [ ] **Step 6: Commit**

```bash
git add pocket-rpg
git commit -m "feat(pocket-rpg): scaffold app and deterministic core"
```

---

### Task 2: Character level, automatic attributes, and hierarchical skills

**Files:**
- Create: `pocket-rpg/src/game-core/progression/character.ts`
- Create: `pocket-rpg/src/game-core/progression/skills.ts`
- Create: `pocket-rpg/src/game-core/progression/xp.ts`
- Create: `pocket-rpg/src/game-core/progression/progression.test.ts`
- Create: `pocket-rpg/src/content/skills.ts`

**Interfaces:**
- Consumes: `SeededRng`, `AttributeId`, `ContentId`
- Produces: `CharacterProgression`, `SkillState`
- Produces: `xpRequiredForLevel(baseXp, level)`
- Produces: `awardCharacterXp(state, award)`
- Produces: `awardSkillAction(state, event, rng)`

- [ ] **Step 1: Write failing tests for level XP and 15-point attribute distribution**

```ts
it("requires 15% more XP per next level", () => {
  expect(xpRequiredForLevel(1000, 1)).toBe(1000);
  expect(xpRequiredForLevel(1000, 2)).toBe(1150);
});

it("adds exactly 15 whole attribute points on level-up", () => {
  const next = levelUpCharacter(makeCharacter(), {
    strength: 40, agility: 20, intuition: 10, vitality: 10,
    wisdom: 5, luck: 5, charisma: 5, intelligence: 5
  });
  const before = 80;
  const after = Object.values(next.attributes).reduce((a, b) => a + b, 0);
  expect(after - before).toBe(15);
  for (const value of Object.values(next.attributes)) expect(value).toBeGreaterThanOrEqual(11);
});
```

- [ ] **Step 2: Write failing tests for skill XP**

```ts
it("uses 250 XP for level 1 and +15% thereafter", () => {
  expect(skillXpRequired(1)).toBe(250);
  expect(skillXpRequired(2)).toBeCloseTo(287.5);
});

it("applies 1.65x XP at every deeper skill depth", () => {
  expect(skillDepthMultiplier(0)).toBeCloseTo(1);
  expect(skillDepthMultiplier(1)).toBeCloseTo(1.65);
  expect(skillDepthMultiplier(2)).toBeCloseTo(2.7225);
  expect(skillDepthMultiplier(3)).toBeCloseTo(4.492125);
});
```

- [ ] **Step 3: Run tests and verify failure**

Run: `npm test -- src/game-core/progression/progression.test.ts`  
Expected: FAIL on missing progression functions.

- [ ] **Step 4: Implement formulas and whole-point largest-remainder allocation**

```ts
export const CHARACTER_LEVEL_GROWTH = 1.15;
export const SKILL_LEVEL_GROWTH = 1.15;
export const SKILL_LEVEL_ONE_XP = 250;
export const SKILL_DEPTH_GROWTH = 1.65;

export function skillDepthMultiplier(depth: number): number {
  return SKILL_DEPTH_GROWTH ** depth;
}

export function skillXpRequired(level: number): number {
  return SKILL_LEVEL_ONE_XP * SKILL_LEVEL_GROWTH ** (level - 1);
}
```

Implement the 8 guaranteed +1 points first, then distribute the remaining 7 by normalized XP-source weights using largest fractional remainders so the result is always exactly seven whole points.

- [ ] **Step 5: Add minimal authored skill path**

```ts
export const skills = [
  { id: "weapons", parentId: null, depth: 0, label: "Оружие" },
  { id: "one-handed", parentId: "weapons", depth: 1, label: "Одноручное оружие" },
  { id: "swords", parentId: "one-handed", depth: 2, label: "Мечи" },
  { id: "short-sword", parentId: "swords", depth: 3, label: "Короткий меч" }
] as const;
```

- [ ] **Step 6: Add test for child level exceeding parent and level-100 cap**

Run: `npm test -- src/game-core/progression/progression.test.ts`  
Expected: PASS, including a case where `short-sword` reaches a level above `swords` but cannot exceed 100.

- [ ] **Step 7: Commit**

```bash
git add pocket-rpg/src/game-core/progression pocket-rpg/src/content/skills.ts
git commit -m "feat(pocket-rpg): add character and skill progression"
```

---

### Task 3: Inventory, equipment, mass, requirements, and overload

**Files:**
- Create: `pocket-rpg/src/game-core/items/items.ts`
- Create: `pocket-rpg/src/game-core/items/inventory.ts`
- Create: `pocket-rpg/src/game-core/items/equipment.ts`
- Create: `pocket-rpg/src/game-core/items/items.test.ts`
- Create: `pocket-rpg/src/content/items.ts`

**Interfaces:**
- Produces: `ItemDefinition`, `ItemInstance`, `InventoryState`, `EquipmentState`
- Produces: `inventoryMass()`, `carryingCapacity()`, `overloadRatio()`, `canEquip()`, `equipItem()`

- [ ] **Step 1: Write failing tests for carried mass and equipped-mass exclusion**

```ts
it("counts only inventory mass for overload", () => {
  const state = makeInventory({
    items: [{ itemId: "iron-short-sword", quantity: 2 }],
    equipped: { mainHand: "instance-equipped-sword" }
  });
  expect(inventoryMass(state, itemDefs)).toBe(6);
});
```

- [ ] **Step 2: Write failing tests for equipment requirements**

```ts
it("stores but cannot equip an item when requirements are not met", () => {
  const result = canEquip(character, rareSword, skillsById);
  expect(result.ok).toBe(false);
  expect(result.reasons).toContain("skill:short-sword");
});
```

- [ ] **Step 3: Write boundary test for peaceful cutoff**

```ts
it("disables peaceful activity at exactly 120% load", () => {
  expect(canStartPeacefulActivity({ mass: 119.9, capacity: 100 })).toBe(true);
  expect(canStartPeacefulActivity({ mass: 120, capacity: 100 })).toBe(false);
});
```

- [ ] **Step 4: Implement item definitions and capacity calculations**

Use:
```ts
export function overloadRatio(mass: number, capacity: number): number {
  return capacity <= 0 ? Infinity : mass / capacity;
}

export function combatEfficiencyMultiplier(ratio: number): number {
  return ratio <= 1 ? 1 : Math.max(0, 1 - (ratio - 1));
}
```

Carrying capacity must read Strength, Vitality, and bag bonus through one core function; do not calculate it in React.

- [ ] **Step 5: Add minimal content**

Create one short sword, one shield, one light armor item, one heavy armor item, one bag, one healing consumable, and one fishing rod. Use stable IDs.

- [ ] **Step 6: Run tests**

Run: `npm test -- src/game-core/items/items.test.ts`  
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add pocket-rpg/src/game-core/items pocket-rpg/src/content/items.ts
git commit -m "feat(pocket-rpg): add inventory and equipment rules"
```

---

### Task 4: Locations, travel, and encounter entry

**Files:**
- Create: `pocket-rpg/src/game-core/world/travel.ts`
- Create: `pocket-rpg/src/game-core/world/world.ts`
- Create: `pocket-rpg/src/game-core/world/travel.test.ts`
- Create: `pocket-rpg/src/content/locations.ts`
- Create: `pocket-rpg/src/content/enemies.ts`

**Interfaces:**
- Produces: `WorldState`, `TravelState`
- Produces: `startTravel(world, destinationId, now, rng)`
- Produces: `advanceWorldTime(world, now)`
- Produces: `rollLocationEncounter(locationId, rng)`

- [ ] **Step 1: Write failing tests for 4–8 second travel**

```ts
it("chooses a base travel duration from 4 through 8 seconds", () => {
  const travel = startTravel(world, "forest-edge", 1_000, new SeededRng(4));
  expect(travel.arrivesAt - travel.startedAt).toBeGreaterThanOrEqual(4000);
  expect(travel.arrivesAt - travel.startedAt).toBeLessThanOrEqual(8000);
});
```

- [ ] **Step 2: Write failing overload travel test**

Test that overload increases duration but never makes it shorter than the base result.

- [ ] **Step 3: Write reload/reconstruction idempotency test**

Given the same active travel and a `now` after `arrivesAt`, calling reconstruction twice must not duplicate arrival or encounter effects.

- [ ] **Step 4: Implement travel and minimal world graph**

Create:
- `tillanium`
- `city-gate`
- `meadow`
- `forest-edge`
- `dark-forest`

Use explicit adjacency IDs. Arrival must be a state transition, not a UI timer callback.

- [ ] **Step 5: Add 3–5 enemy definitions with stable IDs and habitat lists**

Include at least:
- young wolf
- bandit
- old treant

- [ ] **Step 6: Run tests and commit**

Run: `npm test -- src/game-core/world/travel.test.ts`  
Expected: PASS.

```bash
git add pocket-rpg/src/game-core/world pocket-rpg/src/content/locations.ts pocket-rpg/src/content/enemies.ts
git commit -m "feat(pocket-rpg): add locations travel and encounters"
```

---

### Task 5: Combat engine and 5-second auto/manual rounds

**Files:**
- Create: `pocket-rpg/src/game-core/combat/types.ts`
- Create: `pocket-rpg/src/game-core/combat/mitigation.ts`
- Create: `pocket-rpg/src/game-core/combat/resolution.ts`
- Create: `pocket-rpg/src/game-core/combat/auto-ai.ts`
- Create: `pocket-rpg/src/game-core/combat/combat.test.ts`
- Create: `pocket-rpg/src/content/combat-actions.ts`

**Interfaces:**
- Produces: `CombatState`, `CombatantState`, `CombatAction`, `CombatStyle`
- Produces: `resolveRound(state, selections, rng)`
- Produces: `chooseAutoAction(state, actorId, rng)`
- Produces: `combineDiminishingPercentages(values)`

- [ ] **Step 1: Write failing resolution-order test**

```ts
it("resolves player item, enemy item, player main, enemy main", () => {
  const result = resolveRound(fixture, selections, new SeededRng(1));
  expect(result.log.map(x => x.phase)).toEqual([
    "player-additional",
    "enemy-additional",
    "player-main",
    "enemy-main"
  ]);
});
```

- [ ] **Step 2: Write defeat-stop regression test**

Make player main action defeat the enemy at step 3. Assert enemy main action is absent from log and no enemy damage occurs.

- [ ] **Step 3: Write same-round interruption test**

Enemy additional action stuns the player on step 2. Assert player main action does not execute.

- [ ] **Step 4: Write mitigation test**

```ts
it("stacks physical mitigation with diminishing returns", () => {
  expect(combineDiminishingPercentages([0.2, 0.2])).toBeCloseTo(0.36);
  expect(combineDiminishingPercentages([0.2, 0.2, 0.2])).toBeCloseTo(0.488);
});
```

- [ ] **Step 5: Write block/parry/style tests**

Cover:
- shield full-block normal cap 60%
- parry normal cap 35%
- correct style may add +20 percentage points above normal cap
- parry unavailable when shield equipped

- [ ] **Step 6: Write evasion/accuracy test**

Ensure effective evasion never reaches 100% and raw 100% accuracy does not guarantee a hit against opposed evasion.

- [ ] **Step 7: Implement core round state and action tags**

Use tags such as:
`attack`, `control`, `heal`, `buff`, `debuff`, `magic`, `physical`, `telegraphed`.

Keep action selection separate from action resolution.

- [ ] **Step 8: Implement resources and end-of-round processing**

Apply:
- periodic effects
- Mana +15%
- Stamina +15%
- duration decrement
- cooldown decrement

Do not auto-regenerate Health in combat.

- [ ] **Step 9: Implement minimal hidden auto-AI**

The AI consumes current state and combat style. It may choose a legal attack/ability/item from allowed options but must not mutate the state while choosing.

- [ ] **Step 10: Add final-selection test for auto/manual switching**

Model a round selection draft that is changed before resolution. Assert only the final selected action/style executes once.

- [ ] **Step 11: Run combat suite**

Run: `npm test -- src/game-core/combat/combat.test.ts`  
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add pocket-rpg/src/game-core/combat pocket-rpg/src/content/combat-actions.ts
git commit -m "feat(pocket-rpg): add round based combat engine"
```

---

### Task 6: Loot, victory XP, and post-combat flow

**Files:**
- Create: `pocket-rpg/src/game-core/loot/loot.ts`
- Create: `pocket-rpg/src/game-core/loot/loot.test.ts`
- Modify: `pocket-rpg/src/content/enemies.ts`
- Modify: `pocket-rpg/src/content/items.ts`

**Interfaces:**
- Produces: `LootResult`
- Produces: `rollLoot(enemy, character, rng)`
- Produces: `acceptLootItems(inventory, lootIds)`

- [ ] **Step 1: Write deterministic gold and item-drop tests**

Assert gold is always added automatically and seeded RNG reproduces item drops.

- [ ] **Step 2: Write Luck-modifier test**

Use two characters differing only in Luck and a fixed synthetic drop table; assert the higher-Luck calculation produces a higher drop probability without replacing the base enemy/item chance.

- [ ] **Step 3: Write unclaimed-loot loss test**

Closing loot with one selected item must add only that item; unselected drops must not persist in world state.

- [ ] **Step 4: Implement loot result and selection flow**

Keep loot generation pure; UI selection is a later command that transfers chosen item instances to inventory.

- [ ] **Step 5: Run and commit**

Run: `npm test -- src/game-core/loot/loot.test.ts`  
Expected: PASS.

```bash
git add pocket-rpg/src/game-core/loot pocket-rpg/src/content
git commit -m "feat(pocket-rpg): add deterministic loot flow"
```

---

### Task 7: Versioned IndexedDB persistence and timestamp reconstruction

**Files:**
- Create: `pocket-rpg/src/storage/schema.ts`
- Create: `pocket-rpg/src/storage/indexed-db.ts`
- Create: `pocket-rpg/src/storage/migrations.ts`
- Create: `pocket-rpg/src/storage/indexed-db.test.ts`
- Create: `pocket-rpg/src/game-core/game-state.ts`

**Interfaces:**
- Produces: `GameState`
- Produces: `SaveEnvelopeV1`
- Produces: `saveGame(state): Promise<void>`
- Produces: `loadGame(): Promise<GameState | null>`
- Produces: `reconstructState(state, now): GameState`

- [ ] **Step 1: Write save/load round-trip test using fake-indexeddb**

Create a character with inventory, location, XP, and active travel; save and load; assert exact durable fields survive.

- [ ] **Step 2: Write corrupted-save test**

Insert malformed data and assert `loadGame` returns a typed failure/null that App can convert to a fresh state without throwing.

- [ ] **Step 3: Write timestamp reconstruction test**

Save during travel, advance test clock beyond arrival, reload/reconstruct, and assert one arrival only.

- [ ] **Step 4: Implement versioned envelope**

```ts
export interface SaveEnvelopeV1 {
  schemaVersion: 1;
  savedAt: number;
  state: GameState;
}
```

Keep schema migration routing explicit from version 1 even though only one version exists.

- [ ] **Step 5: Run storage suite and commit**

Run: `npm test -- src/storage/indexed-db.test.ts`  
Expected: PASS.

```bash
git add pocket-rpg/src/storage pocket-rpg/src/game-core/game-state.ts
git commit -m "feat(pocket-rpg): add versioned local persistence"
```

---

### Task 8: Fishing activity

**Files:**
- Create: `pocket-rpg/src/game-core/peaceful/fishing.ts`
- Create: `pocket-rpg/src/game-core/peaceful/fishing.test.ts`
- Create: `pocket-rpg/src/content/fishing.ts`
- Modify: `pocket-rpg/src/content/locations.ts`
- Modify: `pocket-rpg/src/content/items.ts`

**Interfaces:**
- Produces: `FishingState`, `FishDefinition`, `BaitDefinition`
- Produces: `startFishing(state, baitId, now)`
- Produces: `advanceFishing(state, now, rng)`
- Produces: `stopFishing(state)`

- [ ] **Step 1: Write automatic-cycle test**

Start fishing, advance time across multiple completed cycles, assert each completed cycle adds catch output and XP while leaving the next cycle active.

- [ ] **Step 2: Write interruption test**

Interrupt halfway through a cycle, restart, and assert prior partial progress does not shorten the new cycle.

- [ ] **Step 3: Write bait weighting test**

With a synthetic fish pool, assert bait changes relative fish probabilities and rare-result probability without making unrelated fish impossible.

- [ ] **Step 4: Write 120% overload rejection test**

At exactly 120% carrying load, `startFishing` must reject. At 119.9%, it must allow.

- [ ] **Step 5: Implement minimal fish content**

Add 4–6 fish across two fishing-capable locations, two reusable bait items, and two fixed-progression fishing rods.

- [ ] **Step 6: Run and commit**

Run: `npm test -- src/game-core/peaceful/fishing.test.ts`  
Expected: PASS.

```bash
git add pocket-rpg/src/game-core/peaceful pocket-rpg/src/content
git commit -m "feat(pocket-rpg): add fishing activity"
```

---

### Task 9: Minimal city merchant and personal market loop

**Files:**
- Create: `pocket-rpg/src/game-core/economy/merchant.ts`
- Create: `pocket-rpg/src/game-core/economy/merchant.test.ts`
- Create: `pocket-rpg/src/content/cities.ts`
- Create: `pocket-rpg/src/content/merchants.ts`

**Interfaces:**
- Produces: `MerchantState`, `MarketState`
- Produces: `buyItem(state, itemId, quantity, now)`
- Produces: `sellItem(state, itemInstanceIds, now)`
- Produces: `decayPersonalMarketPressure(state, now)`

- [ ] **Step 1: Write infinite-stock purchase test**

Buying does not reduce merchant stock availability.

- [ ] **Step 2: Write immediate resale-loss test**

For the same unchanged city market state, buying one item then immediately selling it back must reduce player gold.

- [ ] **Step 3: Write temporary 5% pressure test**

Buying repeated units raises the player's personal local price pressure by the defined 5% steps and stores a timestamp for decay.

- [ ] **Step 4: Implement one city and merchant**

Use Tillanium with a compact inventory capped at Rare quality. No Epic/Unique shop items.

- [ ] **Step 5: Run and commit**

Run: `npm test -- src/game-core/economy/merchant.test.ts`  
Expected: PASS.

```bash
git add pocket-rpg/src/game-core/economy pocket-rpg/src/content
git commit -m "feat(pocket-rpg): add minimal merchant loop"
```

---

### Task 10: React game shell and end-to-end playable vertical slice

**Files:**
- Modify: `pocket-rpg/src/app/App.tsx`
- Create: `pocket-rpg/src/app/GameProvider.tsx`
- Create: `pocket-rpg/src/app/components/CharacterPanel.tsx`
- Create: `pocket-rpg/src/app/components/LocationPanel.tsx`
- Create: `pocket-rpg/src/app/components/CombatPanel.tsx`
- Create: `pocket-rpg/src/app/components/InventoryPanel.tsx`
- Create: `pocket-rpg/src/app/components/LootDialog.tsx`
- Create: `pocket-rpg/src/app/components/FishingPanel.tsx`
- Create: `pocket-rpg/src/app/components/MerchantPanel.tsx`
- Create: `pocket-rpg/src/app/components/GameLog.tsx`
- Create: `pocket-rpg/src/app/App.test.tsx`

**Interfaces:**
- Consumes all game-core APIs from Tasks 2–9.
- Produces a playable browser flow with no game-rule math implemented in components.

- [ ] **Step 1: Write failing React smoke test**

```tsx
it("creates a character and shows the starting city", async () => {
  render(<App />);
  await user.click(screen.getByRole("button", { name: /начать игру/i }));
  expect(screen.getByText("Тилланиум")).toBeInTheDocument();
  expect(screen.getByText(/Сила: 10/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Implement GameProvider command boundary**

Expose state plus commands such as:
`travelTo`, `startCombat`, `setCombatMode`, `setCombatAction`, `takeLoot`, `startFishing`, `stopFishing`, `buy`, `sell`.

Provider owns ticking and persistence calls; components only dispatch commands.

- [ ] **Step 3: Implement minimal panels**

The player must be able to:
- inspect attributes/level/skills
- inspect current location and connected destinations
- travel and see countdown
- encounter/fight enemies
- pause auto combat
- switch auto/manual
- see intended auto action
- use one allowed healing item in combat
- inspect and choose loot
- inspect inventory/equipment
- fish in an eligible location
- buy/sell in Tillanium
- reload and continue from save

- [ ] **Step 4: Add combat-resolution UI test**

Use fake timers:
- start auto combat
- advance 5 seconds
- assert exactly one round resolved
- pause
- advance another 10 seconds
- assert no further round resolves

- [ ] **Step 5: Add save/reload integration test**

Create progress, unmount App, remount App with the same fake IndexedDB, and assert the character/location/inventory return.

- [ ] **Step 6: Run complete verification**

Run:
```bash
npm test
npm run typecheck
npm run build
```

Expected: all tests pass, TypeScript passes, Vite production build succeeds.

- [ ] **Step 7: Update README with run instructions**

Document:
```bash
cd pocket-rpg
npm install
npm run dev
npm test
npm run build
```

Also state clearly that this is the first vertical slice and list deferred systems from the approved spec.

- [ ] **Step 8: Commit**

```bash
git add pocket-rpg
git commit -m "feat(pocket-rpg): ship first playable vertical slice"
```

---

## Self-review results

- Spec coverage: every requirement explicitly in the first vertical slice maps to Tasks 1–10.
- Deferred systems remain deferred; no farming, University UI, multiplayer, or full faction implementation is smuggled into the first slice.
- Placeholder scan: no implementation task relies on TBD/TODO instructions.
- Type consistency: stable IDs, `SeededRng`, `GameState`, command boundary, and content/state separation are used consistently across tasks.
- Review Focus coverage:
  - corrupted save → Task 7
  - reload during travel → Tasks 4 and 7
  - auto/manual final selection → Task 5
  - exact 120% overload cutoff → Tasks 3 and 8
  - defeat before later queued action → Task 5
