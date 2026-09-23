import { describe, expect, it } from "vitest";
import { SeededRng } from "../rng";
import { advanceWorldTime, createWorldState, startTravel } from "./travel";

describe("travel", () => {
  it("uses 4–8 seconds before overload", () => {
    const travel = startTravel(createWorldState(), "city-gate", 1000, new SeededRng(4), 1);
    expect(travel.travel!.arrivesAt - travel.travel!.startedAt).toBeGreaterThanOrEqual(4000);
    expect(travel.travel!.arrivesAt - travel.travel!.startedAt).toBeLessThanOrEqual(8000);
  });

  it("overload only increases travel duration", () => {
    const a = startTravel(createWorldState(), "city-gate", 1000, new SeededRng(4), 1);
    const b = startTravel(createWorldState(), "city-gate", 1000, new SeededRng(4), 1.5);
    expect(b.travel!.arrivesAt - 1000).toBeGreaterThan(a.travel!.arrivesAt - 1000);
  });

  it("arrival reconstruction is idempotent", () => {
    const started = startTravel(createWorldState(), "city-gate", 1000, new SeededRng(4), 1);
    const once = advanceWorldTime(started, 20_000);
    const twice = advanceWorldTime(once, 20_000);
    expect(once.currentLocationId).toBe("city-gate");
    expect(twice.arrivalCount).toBe(once.arrivalCount);
  });
});
