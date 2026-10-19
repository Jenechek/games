import { skills } from '../../content/skills.js';
import {
  actionXp,
  applyWeightedSkillUse,
  multiplicativeSkillMultiplier,
  skillPrimaryBonus
} from '../progression/skill-tree.js';
import type { SkillProgressionState } from '../progression/skill-progress.js';

export const COMBAT_DOMAIN_XP_WEIGHTS={
  weapon:1,
  armor:0.8,
  blocking:0.7,
  magic:0.3
} as const;

export const SHORT_SWORD_SKILL_CHAIN=[
  'weapons',
  'one-handed',
  'swords',
  'short-sword'
] as const;

const SHORT_SWORD_USES=SHORT_SWORD_SKILL_CHAIN.map(skillId=>({
  skillId,
  weight:COMBAT_DOMAIN_XP_WEIGHTS.weapon
}));

export function shortSwordDamageMultiplier(
  progression:SkillProgressionState
):number{
  return multiplicativeSkillMultiplier(
    SHORT_SWORD_SKILL_CHAIN.map(id=>skillPrimaryBonus(progression[id].level))
  );
}

export function applyShortSwordAttackProgression(
  progression:SkillProgressionState,
  success:boolean
):SkillProgressionState{
  const baseXp=actionXp(success);
  return applyWeightedSkillUse(
    progression,
    skills,
    SHORT_SWORD_USES,
    baseXp
  ) as SkillProgressionState;
}
