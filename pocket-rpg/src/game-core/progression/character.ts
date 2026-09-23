import type { AttributeId } from '../types.js';
export interface CharacterProgression { level:number; xp:number; attributes:Record<AttributeId,number>; }
export type AttributeProfile = Record<AttributeId,number>;
export function xpRequiredForLevel(baseXp:number, level:number):number { return baseXp * (1.15 ** (level-1)); }
const ATTRIBUTES:AttributeId[]=['strength','agility','intuition','vitality','wisdom','luck','charisma','intelligence'];
export function levelUpCharacter(state:CharacterProgression, profile:AttributeProfile):CharacterProgression {
  const attributes={...state.attributes};
  for(const key of ATTRIBUTES) attributes[key]+=1;
  const totalWeight=ATTRIBUTES.reduce((sum,key)=>sum+Math.max(0,profile[key]??0),0);
  const normalized=ATTRIBUTES.map((key,index)=>{ const raw=totalWeight>0 ? Math.max(0,profile[key]??0)/totalWeight*7 : 7/ATTRIBUTES.length; return {key,index,raw,floor:Math.floor(raw),fraction:raw-Math.floor(raw)}; });
  let assigned=normalized.reduce((s,x)=>s+x.floor,0);
  for(const x of normalized) attributes[x.key]+=x.floor;
  normalized.sort((a,b)=>b.fraction-a.fraction || a.index-b.index);
  for(let i=0;assigned<7;i++,assigned++) attributes[normalized[i%normalized.length].key]+=1;
  return {...state,level:state.level+1,attributes};
}
