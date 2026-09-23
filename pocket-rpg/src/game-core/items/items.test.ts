import { describe, expect, it } from "vitest";
import { canStartPeacefulActivity, inventoryMass, overloadRatio } from "./inventory";
import { canEquip } from "./equipment";
import { itemDefinitions } from "../../content/items";

describe("inventory mass", () => {
  it("does not count equipped gear toward carried inventory mass", () => {
    const state = {
      instances: [
        { instanceId: "a", definitionId: "iron-short-sword", rarity: "common", upgradeLevel: 0, statRoll: 1, properties: [] },
        { instanceId: "b", definitionId: "iron-short-sword", rarity: "common", upgradeLevel: 0, statRoll: 1, properties: [] }
      ],
      stacks: {},
      equipped: { mainHand: "a" }
    } as const;
    expect(inventoryMass(state, itemDefinitions)).toBe(3);
  });

  it("disables peaceful activity at exactly 120% load", () => {
    expect(canStartPeacefulActivity(119.9, 100)).toBe(true);
    expect(canStartPeacefulActivity(120, 100)).toBe(false);
    expect(overloadRatio(120, 100)).toBe(1.2);
  });
});

describe("equipment", () => {
  it("can own but cannot equip an item when requirements are not met", () => {
    const result = canEquip(
      { strength: 10, agility: 10, intuition: 10, vitality: 10, wisdom: 10, luck: 10, charisma: 10, intelligence: 10 },
      { "short-sword": 0 },
      itemDefinitions["iron-short-sword"]
    );
    expect(result.ok).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
