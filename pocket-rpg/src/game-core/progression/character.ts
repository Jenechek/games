import type { AttributeId } from "../types";

export const ATTRIBUTE_ORDER: AttributeId[] = [
  "strength",
  "agility",
  "intuition",
  "vitality",
  "wisdom",
  "luck",
  "charisma",
  "intelligence"
];

export type Attributes = Record<AttributeId, number>;
export type AttributeProfile = Record<AttributeId, number>;

export interface CharacterProgression {
  level: number;
  xp: number;
  attributes: Attributes;
  xpProfile: AttributeProfile;
}

export function zeroAttributeProfile(): AttributeProfile {
  return Object.fromEntries(ATTRIBUTE_ORDER.map((id) => [id, 0])) as AttributeProfile;
}

export function createCharacterProgression(): CharacterProgression {
  return {
    level: 1,
    xp: 0,
    attributes: Object.fromEntries(ATTRIBUTE_ORDER.map((id) => [id, 10])) as Attributes,
    xpProfile: zeroAttributeProfile()
  };
}

export function xpRequiredForLevel(baseXp: number, level: number): number {
  if (level < 1) throw new Error("level must be >= 1");
  return baseXp * 1.15 ** (level - 1);
}

function allocateSeven(profile: AttributeProfile): Record<AttributeId, number> {
  const weights = ATTRIBUTE_ORDER.map((id) => Math.max(0, profile[id]));
  const total = weights.reduce((sum, value) => sum + value, 0);
  const normalized = total > 0 ? weights.map((value) => value / total) : weights.map(() => 1 / ATTRIBUTE_ORDER.length);
  const exact = normalized.map((value) => value * 7);
  const allocated = exact.map(Math.floor);
  const remaining = 7 - allocated.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, remainder: value - allocated[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let i = 0; i < remaining; i += 1) allocated[order[i].index] += 1;
  return Object.fromEntries(ATTRIBUTE_ORDER.map((id, index) => [id, allocated[index]])) as Record<AttributeId, number>;
}

export function levelUpCharacter(current: CharacterProgression, profile: AttributeProfile): CharacterProgression {
  const bonus = allocateSeven(profile);
  const attributes = { ...current.attributes };
  for (const id of ATTRIBUTE_ORDER) attributes[id] += 1 + bonus[id];
  return {
    ...current,
    level: current.level + 1,
    attributes,
    xpProfile: zeroAttributeProfile()
  };
}

export function addXpProfile(profile: AttributeProfile, contribution: Partial<AttributeProfile>, xp: number): AttributeProfile {
  const next = { ...profile };
  for (const id of ATTRIBUTE_ORDER) next[id] += Math.max(0, contribution[id] ?? 0) * Math.max(0, xp);
  return next;
}
