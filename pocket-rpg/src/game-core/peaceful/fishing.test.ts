import { describe, expect, it } from "vitest";
import { SeededRng } from "../rng";
import { createInitialGameState } from "../game-state";
import { advanceFishing, fishWeightForBait, startFishing, stopFishing } from "./fishing";

describe("fishing", () => {
  it("runs automatic completed cycles and keeps the next cycle active", () => {
    const state = createInitialGameState();
    state.world.currentLocationId = "meadow";
    state.inventory.instances.push({ instanceId: "bait", definitionId: "bread-bait", rarity: "common", upgradeLevel: 0, statRoll: 1, properties: [] });
    const started = startFishing(state, "bread-bait", 0);
    const advanced = advanceFishing(started, 30_000, new SeededRng(1));
    expect(advanced.fishing).not.toBeNull();
    expect(advanced.character.xp).toBeGreaterThan(0);
  });

  it("loses partial cycle progress when stopped", () => {
    const state = createInitialGameState();
    state.world.currentLocationId = "meadow";
    state.inventory.instances.push({ instanceId: "bait", definitionId: "bread-bait", rarity: "common", upgradeLevel: 0, statRoll: 1, properties: [] });
    const started = startFishing(state, "bread-bait", 0);
    const stopped = stopFishing(started);
    const restarted = startFishing(stopped, "bread-bait", 2_000);
    expect(restarted.fishing!.cycleStartedAt).toBe(2_000);
  });

  it("bait changes fish and rare weights without making other fish impossible", () => {
    expect(fishWeightForBait("silver-carp", "bread-bait")).toBeGreaterThan(fishWeightForBait("silver-carp", "worm-bait"));
    expect(fishWeightForBait("river-perch", "bread-bait")).toBeGreaterThan(0);
  });

  it("rejects fishing at exactly 120% load", () => {
    const state = createInitialGameState();
    state.world.currentLocationId = "meadow";
    state.inventory.instances.push({ instanceId: "bait", definitionId: "bread-bait", rarity: "common", upgradeLevel: 0, statRoll: 1, properties: [] });
    state.inventory.stacks["wolf-pelt"] = 54;
    expect(() => startFishing(state, "bread-bait", 0)).toThrow(/перегруз/i);
  });
});
