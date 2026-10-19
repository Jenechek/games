import { skills } from '../../content/skills.js';
import {
  actionXp,
  applyWeightedSkillUse,
  multiplicativeSkillMultiplier,
  skillPrimaryBonus
} from '../progression/skill-tree.js';
import type {
  PersistedSkillId,
  SkillProgressionState
} from '../progression/skill-progress.js';

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
] as const satisfies readonly PersistedSkillId[];

export function normalizedWeaponSkillPath(
  progression:SkillProgressionState,
  skillPath:readonly string[]|undefined
):PersistedSkillId[]{
  if(!skillPath)return [];
  return skillPath.filter(
    (id):id is PersistedSkillId=>Object.prototype.hasOwnProperty.call(progression,id)
  );
}

export function weaponDamageMultiplier(
  progression:SkillProgressionState,
  skillPath:readonly string[]|undefined
):number{
  const path=normalizedWeaponSkillPath(progression,skillPath);
  return multiplicativeSkillMultiplier(
    path.map(id=>skillPrimaryBonus(progression[id].level))
  );
}

export function applyWeaponAttackProgression(
  progression:SkillProgressionState,
  skillPath:readonly string[]|undefined,
  success:boolean
):SkillProgressionState{
  const path=normalizedWeaponSkillPath(progression,skillPath);
  if(path.length===0)return progression;
  const baseXp=actionXp(success);
  return applyWeightedSkillUse(
    progression,
    skills,
    path.map(skillId=>({
      skillId,
      weight:COMBAT_DOMAIN_XP_WEIGHTS.weapon
    })),
    baseXp
  ) as SkillProgressionState;
}

export function shortSwordDamageMultiplier(
  progression:SkillProgressionState
):number{
  return weaponDamageMultiplier(progression,SHORT_SWORD_SKILL_CHAIN);
}

export function applyShortSwordAttackProgression(
  progression:SkillProgressionState,
  success:boolean
):SkillProgressionState{
  return applyWeaponAttackProgression(
    progression,
    SHORT_SWORD_SKILL_CHAIN,
    success
  );
}
