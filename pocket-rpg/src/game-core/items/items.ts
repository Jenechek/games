import type { AttributeId } from '../types.js';
export interface ItemRequirements { attributes?:Partial<Record<AttributeId,number>>; skills?:Record<string,number>; }
export interface ItemDefinition { id:string; label:string; weight:number; slot?:string; requirements?:ItemRequirements; stats?:Record<string,number>; rarity?:'common'|'quality'|'rare'|'epic'|'unique'; }
