import { describe, expect, it } from "vitest";
import { SeededRng } from "../rng";
import { combineDiminishingPercentages, effectiveEvasion, parryChance, shieldBlockChance } from "./mitigation";
import { createCombatant, resolveRound } from "./resolution";

describe("combat resolution", () => {
  it("resolves player item, enemy item, player main, enemy main", () => {
    const state = { player: createCombatant("player", 100, 8), enemy: createCombatant("enemy", 100, 7), round: 1 };
    const result = resolveRound(state, {
      playerAdditional: { id: "heal", type: "item", heal: 1 },
      enemyAdditional: { id: "heal", type: "item", heal: 1 },
      playerMain: { id: "attack", type: "attack", damage: 1, hitChance: 1 },
      enemyMain: { id: "attack", type: "attack", damage: 1, hitChance: 1 }
    }, new SeededRng(1));
    expect(result.log.map((x) => x.phase)).toEqual(["player-additional", "enemy-additional", "player-main", "enemy-main"]);
  });

  it("stops before enemy main action if player defeats enemy", () => {
    const state = { player: createCombatant("player", 100, 100), enemy: createCombatant("enemy", 10, 100), round: 1 };
    const result = resolveRound(state, {
      playerMain: { id: "attack", type: "attack", damage: 100, hitChance: 1 },
      enemyMain: { id: "attack", type: "attack", damage: 100, hitChance: 1 }
    }, new SeededRng(2));
    expect(result.state.player.health).toBe(100);
    expect(result.log.some((x) => x.phase === "enemy-main")).toBe(false);
  });

  it("an earlier stun cancels a later main action", () => {
    const state = { player: createCombatant("player", 100, 8), enemy: createCombatant("enemy", 100, 7), round: 1 };
    const result = resolveRound(state, {
      enemyAdditional: { id: "stun", type: "control", status: "stunned", duration: 1 },
      playerMain: { id: "attack", type: "attack", damage: 20, hitChance: 1 }
    }, new SeededRng(3));
    expect(result.state.enemy.health).toBe(100);
  });
});

describe("defenses", () => {
  it("stacks mitigation with diminishing returns", () => {
    expect(combineDiminishingPercentages([0.2, 0.2])).toBeCloseTo(0.36);
    expect(combineDiminishingPercentages([0.2, 0.2, 0.2])).toBeCloseTo(0.488);
  });
  it("uses style bonuses above normal block/parry caps", () => {
    expect(shieldBlockChance(0.9, "balanced")).toBeCloseTo(0.6);
    expect(shieldBlockChance(0.9, "defensive")).toBeCloseTo(0.8);
    expect(parryChance(0.9, false, "balanced")).toBeCloseTo(0.35);
    expect(parryChance(0.9, false, "parrying")).toBeCloseTo(0.55);
    expect(parryChance(0.9, true, "parrying")).toBe(0);
  });
  it("never allows 100% effective evasion", () => {
    expect(effectiveEvasion(1, 0.1)).toBeLessThan(0.9);
  });
});
