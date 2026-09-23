import { describe, expect, it } from "vitest";
import { createCharacterProgression, levelUpCharacter, xpRequiredForLevel } from "./character";
import { skillDepthMultiplier, skillXpRequired, addSkillXp } from "./skills";

describe("character progression", () => {
  it("requires 15% more XP per next level", () => {
    expect(xpRequiredForLevel(1000, 1)).toBe(1000);
    expect(xpRequiredForLevel(1000, 2)).toBeCloseTo(1150);
  });

  it("adds exactly 15 whole attribute points and at least one to every attribute", () => {
    const current = createCharacterProgression();
    const next = levelUpCharacter(current, {
      strength: 40, agility: 20, intuition: 10, vitality: 10,
      wisdom: 5, luck: 5, charisma: 5, intelligence: 5
    });
    expect(Object.values(next.attributes).reduce((a, b) => a + b, 0) - 80).toBe(15);
    for (const value of Object.values(next.attributes)) expect(value).toBeGreaterThanOrEqual(11);
  });
});

describe("skill progression", () => {
  it("uses 250 XP for level 1 and +15% thereafter", () => {
    expect(skillXpRequired(1)).toBe(250);
    expect(skillXpRequired(2)).toBeCloseTo(287.5);
  });

  it("applies 1.65x at every deeper skill depth", () => {
    expect(skillDepthMultiplier(0)).toBeCloseTo(1);
    expect(skillDepthMultiplier(1)).toBeCloseTo(1.65);
    expect(skillDepthMultiplier(2)).toBeCloseTo(2.7225);
    expect(skillDepthMultiplier(3)).toBeCloseTo(4.492125);
  });

  it("allows a child skill to exceed its parent and caps at 100", () => {
    const parent = addSkillXp({ level: 1, xp: 0 }, 1);
    const child = addSkillXp({ level: 99, xp: skillXpRequired(100) - 1 }, 10);
    expect(parent.level).toBe(1);
    expect(child.level).toBe(100);
  });
});
