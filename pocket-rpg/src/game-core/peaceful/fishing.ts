import type { SeededRng } from '../rng.js';
import type { InventoryState } from '../items/inventory.js';
import { addInventoryStack,cloneInventory } from '../items/inventory.js';
import { addSkillXp,type SkillState } from '../progression/skills.js';
import { baits, fishDefs, fishPools } from '../../content/fishing.js';

export interface FishingState { baitId:string; nextAt:number; cycleMs:number; }
export interface FishingGameState {
  inventory:InventoryState;
  fishingSkill:SkillState;
  fishing?:FishingState|null;
}

export function weightedFishChance(base:number,baitWeight:number,rareBonus:number):number {
  return Math.max(.0001,base*baitWeight*(1+rareBonus));
}

export function startFishing<T extends FishingGameState>(
  state:T,baitId:string,now:number,loadRatio:number,cycleMs=5000
):T & {fishing:FishingState} {
  if(loadRatio>=1.2) throw new Error('overloaded');
  return {...state,fishing:{baitId,nextAt:now+cycleMs,cycleMs}};
}

export function stopFishing<T extends FishingGameState>(state:T):T & {fishing:null} {
  return {...state,fishing:null};
}

function chooseFish(locationId:string,baitId:string,rng:SeededRng,luck:number):string {
  const pool=fishPools[locationId] ?? [];
  const bait=baits[baitId];
  const weights=pool.map(id=>{
    const fish=fishDefs[id];
    const rare=(fish.rare?bait?.rareBonus ?? 0:0)+Math.max(0,luck-10)*.001;
    return weightedFishChance(fish.baseChance,bait?.speciesWeights[id] ?? 1,rare);
  });
  const total=weights.reduce((a,b)=>a+b,0);
  let roll=rng.next()*total;
  for(let i=0;i<pool.length;i++){roll-=weights[i];if(roll<=0)return pool[i];}
  return pool[pool.length-1];
}

export function advanceFishing<T extends FishingGameState>(
  state:T,
  now:number,
  rng:SeededRng,
  locationId:string,
  luck:number,
  canContinue?:(inventory:InventoryState)=>boolean
):{state:T;gainedXp:number} {
  if(!state.fishing) return {state,gainedXp:0};
  let out:any={
    ...state,
    inventory:cloneInventory(state.inventory),
    fishingSkill:{...state.fishingSkill},
    fishing:{...state.fishing}
  };
  let gainedXp=0;
  while(out.fishing && now>=out.fishing.nextAt){
    const fishId=chooseFish(locationId,out.fishing.baitId,rng,luck);
    if(!fishId)break;
    const xp=fishDefs[fishId].xp;
    out.inventory=addInventoryStack(out.inventory,fishId,1,1);
    out.fishingSkill=addSkillXp(out.fishingSkill,xp);
    gainedXp+=xp;
    if(canContinue&&!canContinue(out.inventory)){out.fishing=null;break;}
    out.fishing.nextAt+=out.fishing.cycleMs;
  }
  return {state:out,gainedXp};
}
