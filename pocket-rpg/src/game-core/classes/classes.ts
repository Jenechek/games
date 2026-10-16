import { addSkillXp } from '../progression/skills.js';
import type { SummonCombatState } from '../summons/types.js';
import type { PlayerClassDefinition,PlayerClassId,ClassState } from './types.js';

export const CLASS_SKILL_COMBAT_XP_SHARE=0.5;

export function createDefaultClassState():ClassState{
  return {classId:null,skill:{level:0,xp:0}};
}

export function choosePlayerClass(
  state:ClassState,
  classId:PlayerClassId
):ClassState{
  if(state.classId!==null)throw new Error('class already selected');
  return {...state,classId};
}

export function unlockedSummonIds(
  state:ClassState,
  definition:PlayerClassDefinition
):string[]{
  if(state.classId!==definition.id)return [];
  return definition.summonUnlocks
    .filter(unlock=>state.skill.level>=unlock.requiredSkillLevel)
    .map(unlock=>unlock.summonId);
}

export function canUseClassSummon(
  state:ClassState,
  definition:PlayerClassDefinition,
  summonId:string
):boolean{
  return unlockedSummonIds(state,definition).includes(summonId);
}

export function addClassCombatXp(
  state:ClassState,
  combatCharacterXp:number,
  summonsParticipated:boolean
):{state:ClassState;xp:number}{
  if(!state.classId||!summonsParticipated)return {state,xp:0};
  const xp=Math.max(0,combatCharacterXp)*CLASS_SKILL_COMBAT_XP_SHARE;
  return {
    state:{...state,skill:addSkillXp(state.skill,xp)},
    xp
  };
}

export function classSummonLimit(
  state:ClassState,
  definitions:Record<PlayerClassId,PlayerClassDefinition>
):number{
  return state.classId?definitions[state.classId].summonLimit:0;
}


export function applyClassSummonModifiers(
  summons:SummonCombatState[],
  definition:PlayerClassDefinition
):SummonCombatState[]{
  return summons.map(summon=>{
    const maxHp=Math.max(1,Math.round(summon.maxHp*definition.summonHpMultiplier));
    const hp=Math.min(maxHp,Math.max(1,Math.round(summon.hp*definition.summonHpMultiplier)));
    return {
      ...summon,
      hp,
      maxHp,
      damage:summon.damage*definition.summonDamageMultiplier
    };
  });
}
