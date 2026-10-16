import type { AttributeId } from '../types.js';
import type { ItemDefinition } from './items.js';
export interface EquipCharacter { attributes:Record<AttributeId,number>; skills:Record<string,number>; }
export function canEquip(character:EquipCharacter,item:ItemDefinition):{ok:boolean;reasons:string[]} {
  const reasons:string[]=[];
  for(const [key,value] of Object.entries(item.requirements?.attributes ?? {})) if((character.attributes[key as AttributeId] ?? 0) < (value ?? 0)) reasons.push(`attribute:${key}`);
  for(const [key,value] of Object.entries(item.requirements?.skills ?? {})) if((character.skills[key] ?? 0)<value) reasons.push(`skill:${key}`);
  return {ok:reasons.length===0,reasons};
}
