import type { AttributeId } from '../types.js';

export type ItemRarity='common'|'quality'|'rare'|'epic'|'unique';

export interface ItemRequirements {
  attributes?:Partial<Record<AttributeId,number>>;
  skills?:Record<string,number>;
}

export type CombatConsumableKind='heal'|'mana'|'stamina'|'effect';

export interface CombatConsumableDefinition {
  kind:CombatConsumableKind;
  amount?:number;
  effectId?:'might'|'focus';
  magnitude?:number;
  durationRounds?:number;
  toxicity:number;
}

export interface ItemDefinition {
  id:string;
  label:string;
  weight:number;
  slot?:string;
  skillPath?:string[];
  requirements?:ItemRequirements;
  stats?:Record<string,number>;
  rarity?:ItemRarity;
  materialType?:string;
  materialClass?:number;
  combatUse?:CombatConsumableDefinition;
}
