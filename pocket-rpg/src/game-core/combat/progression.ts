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

export function normalizedCombatSkillPath(
  progression:SkillProgressionState,
  skillPath:readonly string[]|undefined
):PersistedSkillId[]{
  if(!skillPath)return [];
  return skillPath.filter(
    (id):id is PersistedSkillId=>Object.prototype.hasOwnProperty.call(progression,id)
  );
}

export const normalizedWeaponSkillPath=normalizedCombatSkillPath;

export function weaponDamageMultiplier(
  progression:SkillProgressionState,
  skillPath:readonly string[]|undefined
):number{
  const path=normalizedCombatSkillPath(progression,skillPath);
  return multiplicativeSkillMultiplier(
    path.map(id=>skillPrimaryBonus(progression[id].level))
  );
}

export function applyWeaponAttackProgression(
  progression:SkillProgressionState,
  skillPath:readonly string[]|undefined,
  success:boolean
):SkillProgressionState{
  const path=normalizedCombatSkillPath(progression,skillPath);
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


function combatSkillEffectMultiplier(
  progression:SkillProgressionState,
  skillPath:readonly string[]|undefined
):number{
  const path=normalizedCombatSkillPath(progression,skillPath);
  return multiplicativeSkillMultiplier(
    path.map(id=>skillPrimaryBonus(progression[id].level))
  );
}

function applyCombatDomainProgression(
  progression:SkillProgressionState,
  skillPath:readonly string[]|undefined,
  success:boolean,
  weight:number
):SkillProgressionState{
  const path=normalizedCombatSkillPath(progression,skillPath);
  if(path.length===0)return progression;
  return applyWeightedSkillUse(
    progression,
    skills,
    path.map(skillId=>({skillId,weight})),
    actionXp(success)
  ) as SkillProgressionState;
}

export function armorMitigationMultiplier(
  progression:SkillProgressionState,
  skillPath:readonly string[]|undefined
):number{
  return combatSkillEffectMultiplier(progression,skillPath);
}

export function blockingChanceMultiplier(
  progression:SkillProgressionState,
  skillPath:readonly string[]|undefined
):number{
  return combatSkillEffectMultiplier(progression,skillPath);
}

export function applyArmorActionProgression(
  progression:SkillProgressionState,
  skillPath:readonly string[]|undefined,
  success:boolean
):SkillProgressionState{
  return applyCombatDomainProgression(
    progression,
    skillPath,
    success,
    COMBAT_DOMAIN_XP_WEIGHTS.armor
  );
}

export function applyBlockingActionProgression(
  progression:SkillProgressionState,
  skillPath:readonly string[]|undefined,
  success:boolean
):SkillProgressionState{
  return applyCombatDomainProgression(
    progression,
    skillPath,
    success,
    COMBAT_DOMAIN_XP_WEIGHTS.blocking
  );
}


export function applyArmorMitigationSkill(
  baseMitigation:number,
  progression:SkillProgressionState,
  skillPath:readonly string[]|undefined
):number{
  return Math.max(0,baseMitigation)
    *armorMitigationMultiplier(progression,skillPath);
}

export function applyBlockingChanceSkill(
  baseBlockChance:number,
  progression:SkillProgressionState,
  skillPath:readonly string[]|undefined
):number{
  return Math.max(0,baseBlockChance)
    *blockingChanceMultiplier(progression,skillPath);
}
