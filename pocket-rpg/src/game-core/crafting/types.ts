import type { SkillState } from '../progression/skills.js';

export type CraftSkillId='crafting'|'alchemy';
export type WorkshopKind='tailor'|'alchemist';
export type MaterialPolicy='lowest'|'highest';

export interface MaterialRequirement {
  materialType:string;
  quantity:number;
  minClass?:number;
  maxClass?:number;
}

export interface RecipeDefinition {
  id:string;
  label:string;
  kind:'equipment'|'stack';
  resultItemId:string;
  resultQuantity:number;
  skillId:CraftSkillId;
  requiredSkill:number;
  workshop:WorkshopKind;
  ingredients:MaterialRequirement[];
  xp:number;
}

export interface CraftingState {
  skills:Record<CraftSkillId,SkillState>;
  knownRecipeIds:string[];
  nextEquipmentId:number;
}

export interface MaterialPick {
  itemId:string;
  itemClass:number;
  quantity:number;
}

export interface CraftResult {
  recipeId:string;
  itemId:string;
  itemClass:number;
  rarity?:'common'|'quality'|'rare'|'epic';
  equipmentInstanceId?:string;
  xp:number;
}

export interface UpgradeCost {
  gold:number;
  commonUnits:number;
  specialUnits:number;
}
