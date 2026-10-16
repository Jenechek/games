import type { SkillState } from '../progression/skills.js';

export type FactionId='karnholm'|'ellaria'|'rivermark'|'greenwald';

export interface DiplomacyState {
  skill:SkillState;
  audienceAvailableAt:Record<FactionId,number>;
  mediationAvailableAt:Record<FactionId,number>;
  completedRequestWindows:Partial<Record<FactionId,number>>;
}

export type RelationRank=
  |'hostile'
  |'cold'
  |'neutral'
  |'respected'
  |'honored'
  |'allied';

export interface FactionRequestDefinition {
  itemId:string;
  quantity:number;
}

export interface FactionDefinition {
  id:FactionId;
  label:string;
  cityId:string;
  description:string;
  requests:FactionRequestDefinition[];
  honoredUnlockItemId:string;
}

export interface AudienceResult {
  state:DiplomacyState;
  relation:number;
  success:boolean;
  chance:number;
  xp:number;
}

export interface MediationResult {
  state:DiplomacyState;
  relation:number;
  success:boolean;
  chance:number;
  xp:number;
}

export interface FactionRequest {
  factionId:FactionId;
  window:number;
  itemId:string;
  quantity:number;
}

export interface RequestCompletionResult {
  state:DiplomacyState;
  relation:number;
  xp:number;
  goldReward:number;
}
