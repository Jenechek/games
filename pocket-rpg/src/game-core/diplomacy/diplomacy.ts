import type { SeededRng } from '../rng.js';
import { addSkillXp } from '../progression/skills.js';
import type {
  AudienceResult,
  DiplomacyState,
  FactionDefinition,
  FactionId,
  FactionRequest,
  MediationResult,
  RelationRank,
  RequestCompletionResult
} from './types.js';

export const AUDIENCE_COOLDOWN_MS=2*60*60*1000;
export const MEDIATION_COOLDOWN_MS=6*60*60*1000;
export const FACTION_REQUEST_WINDOW_MS=6*60*60*1000;

const FACTION_IDS:FactionId[]=['karnholm','ellaria','rivermark','greenwald'];

function clamp(value:number,min:number,max:number):number{
  return Math.max(min,Math.min(max,value));
}

function chance(value:number):number{
  return clamp(value,0.2,0.85);
}

export function createDefaultDiplomacyState():DiplomacyState{
  return {
    skill:{level:0,xp:0},
    audienceAvailableAt:{
      karnholm:0,
      ellaria:0,
      rivermark:0,
      greenwald:0
    },
    mediationAvailableAt:{
      karnholm:0,
      ellaria:0,
      rivermark:0,
      greenwald:0
    },
    completedRequestWindows:{}
  };
}

export function clampRelation(value:number):number{
  return Math.round(clamp(value,-100,100)*100)/100;
}

export function relationRank(relation:number):RelationRank{
  if(relation<=-51)return 'hostile';
  if(relation<=-21)return 'cold';
  if(relation<20)return 'neutral';
  if(relation<50)return 'respected';
  if(relation<80)return 'honored';
  return 'allied';
}

export function audienceChance(
  diplomacyLevel:number,
  charisma:number,
  relation:number
):number{
  const skillBonus=Math.max(0,diplomacyLevel)*0.002;
  const charismaBonus=Math.max(0,charisma-10)*0.006;
  const hostileRecovery=Math.max(0,-relation)*0.001;
  const highStandingDifficulty=Math.max(0,relation)*0.002;
  return chance(0.52+skillBonus+charismaBonus+hostileRecovery-highStandingDifficulty);
}

export function attemptAudience(args:{
  state:DiplomacyState;
  factionId:FactionId;
  relation:number;
  charisma:number;
  now:number;
  rng:Pick<SeededRng,'chance'>;
}):AudienceResult{
  if(args.now<(args.state.audienceAvailableAt[args.factionId]??0)){
    throw new Error('audience cooldown');
  }
  const probability=audienceChance(args.state.skill.level,args.charisma,args.relation);
  const success=args.rng.chance(probability);
  const xp=success?25:10;
  return {
    state:{
      ...args.state,
      skill:addSkillXp(args.state.skill,xp),
      audienceAvailableAt:{
        ...args.state.audienceAvailableAt,
        [args.factionId]:args.now+AUDIENCE_COOLDOWN_MS
      }
    },
    relation:clampRelation(args.relation+(success?1:0)),
    success,
    chance:probability,
    xp
  };
}

export function mediationChance(
  diplomacyLevel:number,
  charisma:number,
  relation:number
):number{
  const skillBonus=Math.max(0,diplomacyLevel-20)*0.003;
  const charismaBonus=Math.max(0,charisma-10)*0.006;
  const standingBonus=clamp(relation,-50,50)*0.001;
  return chance(0.42+skillBonus+charismaBonus+standingBonus);
}

export function attemptMediation(args:{
  state:DiplomacyState;
  factionId:FactionId;
  relation:number;
  charisma:number;
  now:number;
  rng:Pick<SeededRng,'chance'>;
}):MediationResult{
  if(args.state.skill.level<20)throw new Error('diplomacy too low');
  if(args.now<(args.state.mediationAvailableAt[args.factionId]??0)){
    throw new Error('mediation cooldown');
  }
  const probability=mediationChance(args.state.skill.level,args.charisma,args.relation);
  const success=args.rng.chance(probability);
  const xp=success?55:20;
  return {
    state:{
      ...args.state,
      skill:addSkillXp(args.state.skill,xp),
      mediationAvailableAt:{
        ...args.state.mediationAvailableAt,
        [args.factionId]:args.now+MEDIATION_COOLDOWN_MS
      }
    },
    relation:clampRelation(args.relation+(success?2:-1)),
    success,
    chance:probability,
    xp
  };
}

export function factionRequestWindow(now:number):number{
  return Math.floor(Math.max(0,now)/FACTION_REQUEST_WINDOW_MS);
}

export function currentFactionRequest(
  faction:FactionDefinition,
  now:number
):FactionRequest{
  const window=factionRequestWindow(now);
  const request=faction.requests[window%faction.requests.length];
  return {
    factionId:faction.id,
    window,
    itemId:request.itemId,
    quantity:request.quantity
  };
}

export function canCompleteFactionRequest(
  state:DiplomacyState,
  request:FactionRequest
):boolean{
  return state.completedRequestWindows[request.factionId]!==request.window;
}

export function completeFactionRequest(args:{
  state:DiplomacyState;
  request:FactionRequest;
  relation:number;
  baseItemPrice:number;
}):RequestCompletionResult{
  if(!canCompleteFactionRequest(args.state,args.request)){
    throw new Error('request already completed');
  }
  const goldReward=Math.round(args.baseItemPrice*args.request.quantity*0.5*100)/100;
  const xp=60;
  return {
    state:{
      ...args.state,
      skill:addSkillXp(args.state.skill,xp),
      completedRequestWindows:{
        ...args.state.completedRequestWindows,
        [args.request.factionId]:args.request.window
      }
    },
    relation:clampRelation(args.relation+3),
    xp,
    goldReward
  };
}

export function honoredFactionItemUnlocked(relation:number):boolean{
  return relation>=50;
}

export function isFactionId(value:string):value is FactionId{
  return (FACTION_IDS as string[]).includes(value);
}
