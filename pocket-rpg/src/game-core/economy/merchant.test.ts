import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../game-state";
import { buyItem, createMarketState, currentMarketMultiplier, sellStack } from "./merchant";

describe("merchant economy", () => {
  it("has effectively infinite stock", () => {
    let state = createInitialGameState();
    state.gold = 10_000;
    let market = createMarketState();
    ({ state, market } = buyItem(state, market, "tillanium", "healing-potion", 50, 0));
    expect(state.inventory.stacks["healing-potion"]).toBeGreaterThanOrEqual(50);
  });

  it("immediate same-city resale loses gold", () => {
    let state = createInitialGameState();
    state.gold = 1000;
    let market = createMarketState();
    const before = state.gold;
    ({ state, market } = buyItem(state, market, "tillanium", "healing-potion", 1, 0));
    ({ state, market } = sellStack(state, market, "tillanium", "healing-potion", 1, 1));
    expect(state.gold).toBeLessThan(before);
  });

  it("buying creates temporary 5% personal pressure", () => {
    let state = createInitialGameState();
    state.gold = 1000;
    let market = createMarketState();
    ({ market } = buyItem(state, market, "tillanium", "healing-potion", 2, 0));
    expect(currentMarketMultiplier(market, "tillanium", "healing-potion", 0)).toBeCloseTo(1.05 ** 2);
  });
});
