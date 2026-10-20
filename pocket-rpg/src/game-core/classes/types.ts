import type { SkillState } from '../progression/skills.js';

export type PlayerClassId='mage'|'tamer'|'warrior'|'guardian'|'duelist'|'ranger'|'assassin'|'paladin'|'berserker'|'monk'|'battlemage'|'druid';

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
  hpMultiplier?:number;
  mitigationBonus?:number;
  accuracyBonus?:number;
  evasionBonus?:number;
  manaMultiplier?:number;
}

export interface ClassCombatModifiers {
  personalDamageMultiplier:number;
  summonHpMultiplier:number;
  summonDamageMultiplier:number;
}
