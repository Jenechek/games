import { addSkillXp } from '../../progression/skills.js';
import {
  gatheringPools,
  gatheringResourceDefs,
  type GatheringPoolEntry
} from '../../../content/gathering.js';
import type {
  GatheringFocus,
  GatheringResult,
  GatheringSession,
  GatheringState,
  RandomSource
} from './types.js';

export function createDefaultGatheringState():GatheringState{
  return {skill:{level:0,xp:0},discoveredResourceIds:[]};
}

export function gatheringSpeedMultiplier(level:number,agility:number,intuition:number):number{
  return Math.min(
    2,
    1
      + Math.max(0,Math.min(100,level))*0.005
      + Math.max(0,agility-10)*0.005
      + Math.max(0,intuition-10)*0.005
  );
}

export function gatheringCycleMs(level:number,agility:number,intuition:number):number{
  return Math.ceil(5000/gatheringSpeedMultiplier(level,agility,intuition));
}

export function focusedResourceWeights(locationId:string,focus:GatheringFocus):GatheringPoolEntry[]{
  const pool=gatheringPools[locationId]??[];
  return pool.map(entry=>{
    const def=gatheringResourceDefs[entry.resourceId];
    const focused=focus!=='balanced'&&def?.category===focus;
    return {resourceId:entry.resourceId,weight:entry.weight*(focused?3:1)};
  });
}

export function chooseGatheringResource(
  locationId:string,
  focus:GatheringFocus,
  rng:Pick<RandomSource,'next'>
):string{
  const pool=focusedResourceWeights(locationId,focus);
  if(pool.length===0)throw new Error('gathering pool missing');
  const total=pool.reduce((sum,entry)=>sum+entry.weight,0);
  let roll=Math.max(0,Math.min(0.999999999,rng.next()))*total;
  for(const entry of pool){
    roll-=entry.weight;
    if(roll<0)return entry.resourceId;
  }
  return pool[pool.length-1].resourceId;
}

export function rollGatheringYield(
  resourceId:string,
  level:number,
  rng:Pick<RandomSource,'next'>
):number{
  const def=gatheringResourceDefs[resourceId];
  if(!def)throw new Error('gathering resource missing');
  const safeLevel=Math.max(0,Math.min(100,level));
  const exponent=1/(1+safeLevel/50);
  const biased=Math.pow(Math.max(0,Math.min(0.999999999,rng.next())),exponent);
  const width=def.yieldMax-def.yieldMin+1;
  return Math.min(def.yieldMax,def.yieldMin+Math.floor(biased*width));
}

export function gatheringRareChance(
  resourceId:string,
  level:number,
  luck:number,
  gearRareBonus:number
):number{
  const def=gatheringResourceDefs[resourceId];
  if(!def)throw new Error('gathering resource missing');
  return Math.min(
    0.5,
    def.baseRareChance
      + Math.max(0,Math.min(100,level))*0.0005
      + Math.max(0,luck-10)*0.0005
      + Math.max(0,gearRareBonus)
  );
}

const categoryHints={
  herbs:'здесь встречаются травы',
  berries:'здесь можно найти ягоды',
  fiber:'здесь есть волокнистые растения'
} as const;

export function gatheringLocationView(
  locationId:string,
  state:GatheringState
):{hints:string[];discovered:Array<{resourceId:string;label:string}>}{
  const pool=gatheringPools[locationId]??[];
  const categories:string[]=[];
  for(const entry of pool){
    const category=gatheringResourceDefs[entry.resourceId]?.category;
    if(category&&!categories.includes(category))categories.push(category);
  }
  return {
    hints:categories.map(category=>categoryHints[category as keyof typeof categoryHints]),
    discovered:pool
      .filter(entry=>state.discoveredResourceIds.includes(entry.resourceId))
      .map(entry=>({
        resourceId:entry.resourceId,
        label:gatheringResourceDefs[entry.resourceId].label
      }))
  };
}

export function startGathering(
  state:GatheringState,
  focus:GatheringFocus,
  now:number,
  locationId:string,
  agility:number,
  intuition:number,
  loadRatio:number
):GatheringSession{
  if(!(gatheringPools[locationId]?.length))throw new Error('gathering pool missing');
  if(loadRatio>=1.2)throw new Error('overloaded');
  const cycleMs=gatheringCycleMs(state.skill.level,agility,intuition);
  return {focus,nextAt:now+cycleMs,cycleMs};
}

export function stopGathering(_session:GatheringSession|null):null{
  return null;
}

export function advanceGathering(
  state:GatheringState,
  session:GatheringSession,
  now:number,
  rng:RandomSource,
  locationId:string,
  luck:number,
  gearRareBonus=0
):{gathering:GatheringState;session:GatheringSession;results:GatheringResult[]}{
  let gathering:GatheringState={
    skill:{...state.skill},
    discoveredResourceIds:[...state.discoveredResourceIds]
  };
  const nextSession={...session};
  const results:GatheringResult[]=[];

  while(now>=nextSession.nextAt){
    const resourceId=chooseGatheringResource(locationId,nextSession.focus,rng);
    const def=gatheringResourceDefs[resourceId];
    const quantity=rollGatheringYield(resourceId,gathering.skill.level,rng);
    const rare=rng.chance(gatheringRareChance(resourceId,gathering.skill.level,luck,gearRareBonus));
    results.push({
      resourceId,
      itemId:rare?`${resourceId}-rare`:resourceId,
      quantity,
      rare
    });
    gathering={
      skill:addSkillXp(gathering.skill,def.xp*(rare?2:1)),
      discoveredResourceIds:gathering.discoveredResourceIds.includes(resourceId)
        ? gathering.discoveredResourceIds
        : [...gathering.discoveredResourceIds,resourceId]
    };
    nextSession.nextAt+=nextSession.cycleMs;
  }

  return {gathering,session:nextSession,results};
}
