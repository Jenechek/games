import type { SkillState } from '../../progression/skills.js';

export type GatheringCategory='herbs'|'berries'|'fiber';
export type GatheringFocus='balanced'|GatheringCategory;

export interface GatheringState {
  skill:SkillState;
  discoveredResourceIds:string[];
}

export interface GatheringSession {
  focus:GatheringFocus;
  nextAt:number;
  cycleMs:number;
}

export interface GatheringResult {
  resourceId:string;
  itemId:string;
  quantity:number;
  rare:boolean;
}

export interface RandomSource {
  next():number;
  chance(probability:number):boolean;
}
