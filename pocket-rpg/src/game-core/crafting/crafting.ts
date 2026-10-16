import type { SeededRng } from '../rng.js';
import { addSkillXp } from '../progression/skills.js';
import {
  addInventoryStack,
  cloneInventory,
  normalizedStackClass,
  removeInventoryStack,
  type InventoryState
} from '../items/inventory.js';
import {
  createEquipmentInstance,
  rerollEquipmentProperty,
  upgradeEquipmentInstance,
  type EquipmentPropertyRollDefinition
} from '../items/equipment.js';
import type { ItemDefinition,ItemRarity } from '../items/items.js';
import type {
  CraftResult,
  CraftingState,
  MaterialPick,
  MaterialPolicy,
  RecipeDefinition,
  UpgradeCost
} from './types.js';

export function createDefaultCraftingState(knownRecipeIds:string[]=[]):CraftingState{
  return {
    skills:{
      crafting:{level:0,xp:0},
      alchemy:{level:0,xp:0}
    },
    knownRecipeIds:[...knownRecipeIds],
    nextEquipmentId:1
  };
}

function clampLevel(value:number):number{
  return Math.max(0,Math.min(100,value));
}

export function effectiveCraftingLevel(skillLevel:number,luck:number):number{
  const luckBonus=Math.min(5,Math.max(0,luck-10)*0.1);
  return clampLevel(skillLevel+luckBonus);
}

export function craftingRarityProbabilities(
  skillLevel:number,
  luck:number
):Record<'common'|'quality'|'rare'|'epic',number>{
  const level=effectiveCraftingLevel(skillLevel,luck);
  const weights={
    common:Math.max(0,100-level),
    quality:level>=10?20+(level-10)*0.4:0,
    rare:level>=35?5+(level-35)*0.5:0,
    epic:level>=70?2+(level-70)*0.45:0
  };
  const total=weights.common+weights.quality+weights.rare+weights.epic;
  if(total<=0)return {common:1,quality:0,rare:0,epic:0};
  return {
    common:weights.common/total,
    quality:weights.quality/total,
    rare:weights.rare/total,
    epic:weights.epic/total
  };
}

export function rollCraftedRarity(
  skillLevel:number,
  luck:number,
  rng:Pick<SeededRng,'next'>
):Exclude<ItemRarity,'unique'>{
  const p=craftingRarityProbabilities(skillLevel,luck);
  let roll=Math.max(0,Math.min(0.999999999,rng.next()));
  for(const rarity of ['common','quality','rare','epic'] as const){
    roll-=p[rarity];
    if(roll<0)return rarity;
  }
  return 'epic';
}

function stackMaterialClass(
  itemId:string,
  stackClass:number,
  defs:Record<string,ItemDefinition>
):number{
  return Math.max(1,Math.min(5,defs[itemId]?.materialClass??stackClass));
}

export function autoSelectMaterials(
  inventory:InventoryState,
  recipe:RecipeDefinition,
  defs:Record<string,ItemDefinition>,
  policy:MaterialPolicy
):MaterialPick[]{
  const picks:MaterialPick[]=[];
  const remaining=inventory.stacks.map(stack=>({...stack}));

  for(const ingredient of recipe.ingredients){
    let needed=ingredient.quantity;
    const candidates=remaining
      .filter(stack=>{
        const def=defs[stack.itemId];
        if(def?.materialType!==ingredient.materialType)return false;
        const itemClass=stackMaterialClass(stack.itemId,normalizedStackClass(stack),defs);
        if(itemClass<(ingredient.minClass??1))return false;
        if(ingredient.maxClass!==undefined&&itemClass>ingredient.maxClass)return false;
        return stack.quantity>0;
      })
      .sort((a,b)=>{
        const ac=stackMaterialClass(a.itemId,normalizedStackClass(a),defs);
        const bc=stackMaterialClass(b.itemId,normalizedStackClass(b),defs);
        return policy==='highest'?bc-ac:ac-bc;
      });

    for(const stack of candidates){
      if(needed<=0)break;
      const take=Math.min(needed,stack.quantity);
      if(take<=0)continue;
      const itemClass=stackMaterialClass(stack.itemId,normalizedStackClass(stack),defs);
      picks.push({itemId:stack.itemId,itemClass,quantity:take});
      stack.quantity-=take;
      needed-=take;
    }
    if(needed>0)throw new Error('not enough materials');
  }
  return picks;
}

export function rollMaterialResultClass(
  picks:MaterialPick[],
  rng:Pick<SeededRng,'next'>
):number{
  const totalUnits=picks.reduce((sum,pick)=>sum+pick.quantity,0);
  if(totalUnits<=0)return 1;
  const weighted=picks.reduce((sum,pick)=>sum+pick.itemClass*pick.quantity,0)/totalUnits;
  const low=Math.max(1,Math.min(5,Math.floor(weighted)));
  const high=Math.max(1,Math.min(5,Math.ceil(weighted)));
  if(low===high)return low;
  const highChance=weighted-low;
  return rng.next()<highChance?high:low;
}

function consumePicks(inventory:InventoryState,picks:MaterialPick[]):InventoryState{
  let next=cloneInventory(inventory);
  for(const pick of picks){
    next=removeInventoryStack(next,pick.itemId,pick.quantity,pick.itemClass);
  }
  return next;
}

function equipmentXpMultiplier(rarity:Exclude<ItemRarity,'unique'>):number{
  return {common:1,quality:1.1,rare:1.25,epic:1.5}[rarity];
}

export function craftRecipeBatch(args:{
  state:CraftingState;
  inventory:InventoryState;
  recipe:RecipeDefinition;
  quantity:number;
  defs:Record<string,ItemDefinition>;
  propertyPools:Record<string,EquipmentPropertyRollDefinition[]>;
  luck:number;
  rng:SeededRng;
  policy?:MaterialPolicy;
}):{state:CraftingState;inventory:InventoryState;results:CraftResult[]}{
  const {recipe,defs,rng}=args;
  const quantity=Math.max(1,Math.floor(args.quantity));
  if(!args.state.knownRecipeIds.includes(recipe.id))throw new Error('recipe not learned');
  const skill=args.state.skills[recipe.skillId];
  if(skill.level<recipe.requiredSkill)throw new Error('skill too low');

  let inventory=cloneInventory(args.inventory);
  let nextEquipmentId=args.state.nextEquipmentId;
  let gainedXp=0;
  const results:CraftResult[]=[];

  for(let index=0;index<quantity;index+=1){
    const picks=autoSelectMaterials(inventory,recipe,defs,args.policy??'lowest');
    const itemClass=rollMaterialResultClass(picks,rng);
    inventory=consumePicks(inventory,picks);

    if(recipe.kind==='equipment'){
      const def=defs[recipe.resultItemId];
      if(!def?.slot)throw new Error('equipment recipe result is not equipment');
      const rarity=rollCraftedRarity(skill.level,args.luck,rng);
      const instanceId=`eq-${nextEquipmentId}`;
      nextEquipmentId+=1;
      const pool=args.propertyPools[def.slot]??[];
      const instance=createEquipmentInstance(instanceId,def,itemClass,rarity,pool,rng);
      inventory.equipment=[...(inventory.equipment??[]),instance];
      const xp=recipe.xp*equipmentXpMultiplier(rarity);
      gainedXp+=xp;
      results.push({
        recipeId:recipe.id,
        itemId:def.id,
        itemClass,
        rarity,
        equipmentInstanceId:instanceId,
        xp
      });
    }else{
      inventory=addInventoryStack(inventory,recipe.resultItemId,recipe.resultQuantity,itemClass);
      const xp=recipe.xp*(1+(itemClass-1)*0.1);
      gainedXp+=xp;
      results.push({recipeId:recipe.id,itemId:recipe.resultItemId,itemClass,xp});
    }
  }

  return {
    state:{
      ...args.state,
      skills:{...args.state.skills,[recipe.skillId]:addSkillXp(skill,gainedXp)},
      nextEquipmentId
    },
    inventory,
    results
  };
}

export function maxCraftableCount(
  inventory:InventoryState,
  recipe:RecipeDefinition,
  defs:Record<string,ItemDefinition>,
  policy:MaterialPolicy='lowest',
  cap=999
):number{
  let next=cloneInventory(inventory);
  let count=0;
  while(count<cap){
    try{
      const picks=autoSelectMaterials(next,recipe,defs,policy);
      next=consumePicks(next,picks);
      count+=1;
    }catch{
      break;
    }
  }
  return count;
}

const UPGRADE_GOLD=[0,10,20,35,55,80] as const;
const UPGRADE_COMMON=[0,2,3,4,5,6] as const;
const UPGRADE_SPECIAL=[0,0,0,1,1,2] as const;

export function equipmentUpgradeCost(targetLevel:number,itemClass:number):UpgradeCost{
  if(targetLevel<1||targetLevel>5)throw new Error('invalid upgrade level');
  const classMultiplier=1+(Math.max(1,Math.min(5,itemClass))-1)*0.25;
  return {
    gold:Math.round(UPGRADE_GOLD[targetLevel]*classMultiplier),
    commonUnits:UPGRADE_COMMON[targetLevel],
    specialUnits:UPGRADE_SPECIAL[targetLevel]
  };
}

function consumeUpgradeMaterials(
  inventory:InventoryState,
  materialType:string,
  cost:UpgradeCost,
  defs:Record<string,ItemDefinition>
):InventoryState{
  let next=cloneInventory(inventory);
  const consume=(quantity:number,minClass:number,maxClass?:number)=>{
    if(quantity<=0)return;
    const recipe:RecipeDefinition={
      id:'upgrade-materials',
      label:'upgrade-materials',
      kind:'stack',
      resultItemId:'none',
      resultQuantity:0,
      skillId:'crafting',
      requiredSkill:0,
      workshop:'tailor',
      ingredients:[{materialType,quantity,minClass,maxClass}],
      xp:0
    };
    const picks=autoSelectMaterials(next,recipe,defs,'lowest');
    next=consumePicks(next,picks);
  };
  consume(cost.commonUnits,1,1);
  consume(cost.specialUnits,2);
  return next;
}

export function upgradeEquipment(args:{
  state:CraftingState;
  inventory:InventoryState;
  gold:number;
  instanceId:string;
  materialType:string;
  defs:Record<string,ItemDefinition>;
  propertyPools:Record<string,EquipmentPropertyRollDefinition[]>;
  rng:SeededRng;
}):{inventory:InventoryState;gold:number;cost:UpgradeCost}{
  const instances=args.inventory.equipment??[];
  const instance=instances.find(entry=>entry.instanceId===args.instanceId);
  if(!instance)throw new Error('equipment not found');
  const def=args.defs[instance.itemId];
  if(!def?.slot)throw new Error('equipment definition missing');
  const target=instance.upgradeLevel+1;
  const cost=equipmentUpgradeCost(target,instance.itemClass);
  if(args.gold<cost.gold)throw new Error('not enough gold');

  const inventory=consumeUpgradeMaterials(args.inventory,args.materialType,cost,args.defs);
  const upgraded=upgradeEquipmentInstance(
    instance,
    args.propertyPools[def.slot]??[],
    args.rng
  );
  inventory.equipment=(inventory.equipment??[]).map(entry=>
    entry.instanceId===instance.instanceId?upgraded:entry
  );
  return {inventory,gold:args.gold-cost.gold,cost};
}

export const REROLL_GOLD_COST=8;

export function rerollEquipment(args:{
  inventory:InventoryState;
  gold:number;
  instanceId:string;
  propertyIndex:number;
  defs:Record<string,ItemDefinition>;
  propertyPools:Record<string,EquipmentPropertyRollDefinition[]>;
  rng:SeededRng;
}):{inventory:InventoryState;gold:number}{
  if(args.gold<REROLL_GOLD_COST)throw new Error('not enough gold');
  const instance=(args.inventory.equipment??[]).find(entry=>entry.instanceId===args.instanceId);
  if(!instance)throw new Error('equipment not found');
  const def=args.defs[instance.itemId];
  if(!def?.slot)throw new Error('equipment definition missing');
  const rerolled=rerollEquipmentProperty(
    instance,
    args.propertyIndex,
    args.propertyPools[def.slot]??[],
    args.rng
  );
  const inventory=cloneInventory(args.inventory);
  inventory.equipment=(inventory.equipment??[]).map(entry=>
    entry.instanceId===instance.instanceId?rerolled:entry
  );
  return {inventory,gold:args.gold-REROLL_GOLD_COST};
}
