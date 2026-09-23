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
