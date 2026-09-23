export const SKILL_LEVEL_ONE_XP = 250;
export const SKILL_LEVEL_GROWTH = 1.15;
export const SKILL_DEPTH_GROWTH = 1.65;
export const SKILL_LEVEL_CAP = 100;
export const SKILL_EFFECT_PER_LEVEL = 0.002;

export interface SkillState {
  level: number;
  xp: number;
}

export function skillXpRequired(level: number): number {
  if (level < 1) throw new Error("level must be >= 1");
  return SKILL_LEVEL_ONE_XP * SKILL_LEVEL_GROWTH ** (level - 1);
}

export function skillDepthMultiplier(depth: number): number {
  if (depth < 0) throw new Error("depth must be >= 0");
  return SKILL_DEPTH_GROWTH ** depth;
}

export function skillPrimaryMultiplier(level: number): number {
  return 1 + Math.min(SKILL_LEVEL_CAP, Math.max(0, level)) * SKILL_EFFECT_PER_LEVEL;
}

export function siblingBonusMultiplier(level: number): number {
  return 1 + Math.min(SKILL_LEVEL_CAP, Math.max(0, level)) * SKILL_EFFECT_PER_LEVEL * 0.1;
}

export function addSkillXp(state: SkillState, amount: number): SkillState {
  if (state.level >= SKILL_LEVEL_CAP) return { level: SKILL_LEVEL_CAP, xp: 0 };
  let level = Math.max(0, state.level);
  let xp = Math.max(0, state.xp) + Math.max(0, amount);
  while (level < SKILL_LEVEL_CAP) {
    const requirement = skillXpRequired(level + 1);
    if (xp + 1e-9 < requirement) break;
    xp -= requirement;
    level += 1;
  }
  if (level >= SKILL_LEVEL_CAP) return { level: SKILL_LEVEL_CAP, xp: 0 };
  return { level, xp };
}
