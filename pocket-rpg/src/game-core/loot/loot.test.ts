import { describe, expect, it } from "vitest";
import { SeededRng } from "../rng";
import { acceptLootItems, adjustedDropChance, rollLoot } from "./loot";

describe("loot", () => {
  const enemy = { id: "test", gold: [5, 5] as [number, number], drops: [{ itemId: "healing-potion", chance: 1 }] };

  it("always returns enemy gold and deterministic seeded drops", () => {
    expect(rollLoot(enemy, 10, new SeededRng(9))).toEqual(rollLoot(enemy, 10, new SeededRng(9)));
    expect(rollLoot(enemy, 10, new SeededRng(9)).gold).toBe(5);
  });

  it("Luck modestly increases drop probability", () => {
    expect(adjustedDropChance(0.1, 50)).toBeGreaterThan(adjustedDropChance(0.1, 10));
  });

  it("only transfers selected item drops", () => {
    const loot = rollLoot(enemy, 10, new SeededRng(2));
    const inventory = { instances: [], stacks: {}, equipped: {} };
    const next = acceptLootItems(inventory, loot.items, []);
    expect(next.stacks["healing-potion"] ?? 0).toBe(0);
  });
});
