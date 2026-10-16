import type {SkillState} from '../progression/skills.js';

export type WorkshopKind='forge'|'tailor'|'alchemy';
export type CraftDiscipline='crafting'|'alchemy';

export interface CraftingState {
  craftingSkill:SkillState;
  alchemySkill:SkillState;
  knownRecipeIds:string[];
  nextInstanceNumber:number;
}

export interface RecipeMaterialRequirement {
  materialType:string;
  quantity:number;
  minClass?:number;
}

export interface StackRecipeOutput {
  kind:'stack';
  itemId:string;
  quantity:number;
}

export interface EquipmentRecipeOutput {
  kind:'equipment';
  baseItemId:string;
}

export interface CraftRecipe {
  id:string;
  label:string;
  workshop:WorkshopKind;
  discipline:CraftDiscipline;
  skillRequired:number;
  xp:number;
  materials:RecipeMaterialRequirement[];
  output:StackRecipeOutput|EquipmentRecipeOutput;
}

export interface MaterialPick {
  itemId:string;
  quantity:number;
  materialClass:number;
}

export interface RecipeMaterialSelection {
  picks:MaterialPick[];
  complete:boolean;
  weightedAverageClass:number;
}

export type CraftRarityProbabilities={
  common:number;
  quality:number;
  rare:number;
  epic:number;
};

export interface CraftReadiness {
  ok:boolean;
  reasons:Array<'recipe'|'workshop'|'skill'|'materials'>;
}

export interface RandomSource {
  next():number;
}
