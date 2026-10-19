import type { SkillState } from '../progression/skills.js';

export type PlayerClassId='mage'|'tamer';

export interface ClassState {
  classId:PlayerClassId|null;
  skill:SkillState;
}

export interface ClassSummonUnlock {
  summonId:string;
  requiredSkillLevel:number;
}

export interface PlayerClassDefinition {
  id:PlayerClassId;
  label:string;
  description:string;
  summonLimit:1|2|3;
  personalDamageMultiplier:number;
  summonHpMultiplier:number;
  summonDamageMultiplier:number;
  summonUnlocks:ClassSummonUnlock[];
}

export interface ClassCombatModifiers {
  personalDamageMultiplier:number;
  summonHpMultiplier:number;
  summonDamageMultiplier:number;
}
