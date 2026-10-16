import {addSkillXp} from '../progression/skills.js';
import type {
  InventoryState,
  ItemInstance,
  ItemInstanceRarity,
  ItemUpgradeLevel
} from '../items/inventory.js';
import {itemDefs} from '../../content/items.js';
import {craftRecipes} from '../../content/crafting.js';
import type {
  CraftReadiness,
  CraftRecipe,
  CraftRarityProbabilities,
  CraftingState,
  RandomSource,
  RecipeMaterialSelection,
  WorkshopKind
} from './types.js';

const rarityOrder:ItemInstanceRarity[]=['common','quality','rare','epic'];
const rarityMultipliers:Record<ItemInstanceRarity,number>={
  common:1,
  quality:1.05,
  rare:1.10,
  epic:1.20
};

const propertyDefs:Record<string,{stat?:string;mode?:'add'|'mul';value?:number}>={
  keen:{stat:'damage',mode:'mul',value:0.08},
  reinforced:{stat:'mitigation',mode:'add',value:0.03},
  nimble:{stat:'evasion',mode:'add',value:0.04},
  steadfast:{stat:'blockChance',mode:'add',value:0.05},
  roomy:{stat:'capacity',mode:'add',value:5},
  light:{},
  balanced:{}
};

export function createDefaultCraftingState():CraftingState{
  return {
    craftingSkill:{level:0,xp:0},
    alchemySkill:{level:0,xp:0},
    knownRecipeIds:['healing-potion','weak-injury-medicine','travel-bag'],
    nextInstanceNumber:1
  };
}

function materialInfo(itemId:string):{materialType:string;materialClass:number}{
  if(itemId.endsWith('-rare')){
    return {materialType:itemId.slice(0,-5),materialClass:1};
  }
  return {materialType:itemId,materialClass:0};
}

export function recipeMaterialSelection(
  recipe:CraftRecipe,
  inventory:InventoryState
):RecipeMaterialSelection{
  const picks:RecipeMaterialSelection['picks']=[];
  let complete=true;
  let classTotal=0;
  let quantityTotal=0;

  for(const requirement of recipe.materials){
    let needed=requirement.quantity;
    const candidates=inventory.stacks
      .map(stack=>({...stack,...materialInfo(stack.itemId)}))
      .filter(stack=>
        stack.materialType===requirement.materialType
        && stack.quantity>0
        && stack.materialClass>=(requirement.minClass??0)
      )
      .sort((a,b)=>b.materialClass-a.materialClass||a.itemId.localeCompare(b.itemId));

    for(const candidate of candidates){
      if(needed<=0)break;
      const quantity=Math.min(needed,candidate.quantity);
      if(quantity<=0)continue;
      picks.push({itemId:candidate.itemId,quantity,materialClass:candidate.materialClass});
      classTotal+=candidate.materialClass*quantity;
      quantityTotal+=quantity;
      needed-=quantity;
    }
    if(needed>0)complete=false;
  }

  return {
    picks,
    complete,
    weightedAverageClass:quantityTotal>0?classTotal/quantityTotal:0
  };
}

function unlockedRarityIndex(level:number):number{
  if(level>=80)return 3;
  if(level>=50)return 2;
  if(level>=20)return 1;
  return 0;
}
function rounded(value:number):number{return Math.round(value*1e12)/1e12;}

export function craftRarityProbabilities(
  recipe:CraftRecipe,
  state:CraftingState,
  inventory:InventoryState,
  luck:number
):CraftRarityProbabilities{
  if(recipe.output.kind!=='equipment')return {common:1,quality:0,rare:0,epic:0};
  const selection=recipeMaterialSelection(recipe,inventory);
  const raw=selection.weightedAverageClass
    + state.craftingSkill.level/50
    + Math.max(0,luck-10)*0.005;
  const cap=unlockedRarityIndex(state.craftingSkill.level);
  const score=Math.max(0,Math.min(3,cap,raw));
  const low=Math.floor(score);
  const high=Math.ceil(score);
  const fraction=score-low;
  const values=[0,0,0,0];
  if(low===high)values[low]=1;
  else{
    values[low]=rounded(1-fraction);
    values[high]=rounded(fraction);
  }
  return {common:values[0],quality:values[1],rare:values[2],epic:values[3]};
}

export function sampleCraftRarity(
  probabilities:CraftRarityProbabilities,
  rng:RandomSource
):ItemInstanceRarity{
  const roll=Math.max(0,Math.min(0.999999999999,rng.next()));
  let cumulative=0;
  for(const rarity of rarityOrder){
    cumulative+=probabilities[rarity];
    if(roll<cumulative)return rarity;
  }
  return 'epic';
}

function skillForRecipe(state:CraftingState,recipe:CraftRecipe){
  return recipe.discipline==='alchemy'?state.alchemySkill:state.craftingSkill;
}

export function craftReadiness(
  state:CraftingState,
  inventory:InventoryState,
  recipeId:string,
  workshop:WorkshopKind
):CraftReadiness{
  const recipe=craftRecipes[recipeId];
  const reasons:CraftReadiness['reasons']=[];
  if(!recipe||!state.knownRecipeIds.includes(recipeId))reasons.push('recipe');
  if(!recipe)return {ok:false,reasons};
  if(recipe.workshop!==workshop)reasons.push('workshop');
  if(skillForRecipe(state,recipe).level<recipe.skillRequired)reasons.push('skill');
  if(!recipeMaterialSelection(recipe,inventory).complete)reasons.push('materials');
  return {ok:reasons.length===0,reasons};
}

function consumeSelection(inventory:InventoryState,selection:RecipeMaterialSelection):InventoryState{
  const stacks=inventory.stacks.map(stack=>({...stack}));
  for(const pick of selection.picks){
    const stack=stacks.find(candidate=>candidate.itemId===pick.itemId);
    if(!stack||stack.quantity<pick.quantity)throw new Error('materials changed');
    stack.quantity-=pick.quantity;
  }
  return {...inventory,stacks:stacks.filter(stack=>stack.quantity>0)};
}
function addStack(inventory:InventoryState,itemId:string,quantity:number):InventoryState{
  const stacks=inventory.stacks.map(stack=>({...stack}));
  const existing=stacks.find(stack=>stack.itemId===itemId);
  if(existing)existing.quantity+=quantity;
  else stacks.push({itemId,quantity});
  return {...inventory,stacks};
}

export function eligiblePropertyIds(baseItemId:string):string[]{
  const stats=itemDefs[baseItemId]?.stats??{};
  const ids:string[]=[];
  if((stats.damage??0)>0)ids.push('keen');
  if((stats.mitigation??0)>0)ids.push('reinforced');
  if((stats.evasion??0)>0)ids.push('nimble');
  if((stats.blockChance??0)>0)ids.push('steadfast');
  if((stats.capacity??0)>0)ids.push('roomy');
  ids.push('light','balanced');
  return ids;
}

function chooseProperty(baseItemId:string,existing:string[],rng:RandomSource):string|null{
  const candidates=eligiblePropertyIds(baseItemId).filter(id=>!existing.includes(id));
  if(candidates.length===0)return null;
  const index=Math.min(candidates.length-1,Math.floor(Math.max(0,Math.min(0.999999999,rng.next()))*candidates.length));
  return candidates[index];
}

export function craftRecipe(
  state:CraftingState,
  inventory:InventoryState,
  recipeId:string,
  workshop:WorkshopKind,
  luck:number,
  rng:RandomSource
):{
  state:CraftingState;
  inventory:InventoryState;
  output:
    |{kind:'stack';itemId:string;quantity:number}
    |{kind:'instance';instance:ItemInstance};
}{
  const readiness=craftReadiness(state,inventory,recipeId,workshop);
  if(!readiness.ok)throw new Error(`craft not ready: ${readiness.reasons.join(',')}`);
  const recipe=craftRecipes[recipeId];
  const selection=recipeMaterialSelection(recipe,inventory);
  let nextInventory=consumeSelection(inventory,selection);
  let nextState:CraftingState={
    ...state,
    craftingSkill:{...state.craftingSkill},
    alchemySkill:{...state.alchemySkill},
    knownRecipeIds:[...state.knownRecipeIds]
  };

  if(recipe.output.kind==='stack'){
    nextInventory=addStack(nextInventory,recipe.output.itemId,recipe.output.quantity);
    nextState.alchemySkill=addSkillXp(nextState.alchemySkill,recipe.xp);
    return {
      state:nextState,
      inventory:nextInventory,
      output:{kind:'stack',itemId:recipe.output.itemId,quantity:recipe.output.quantity}
    };
  }

  const probabilities=craftRarityProbabilities(recipe,state,inventory,luck);
  const rarity=sampleCraftRarity(probabilities,rng);
  const properties:string[]=[];
  if(rarity==='rare'||rarity==='epic'){
    const property=chooseProperty(recipe.output.baseItemId,properties,rng);
    if(property)properties.push(property);
  }
  const instance:ItemInstance={
    instanceId:`crafted-${state.nextInstanceNumber}`,
    baseItemId:recipe.output.baseItemId,
    rarity,
    upgradeLevel:0,
    properties
  };
  nextInventory={
    ...nextInventory,
    instances:[...(nextInventory.instances??[]),instance]
  };
  nextState.craftingSkill=addSkillXp(nextState.craftingSkill,recipe.xp);
  nextState.nextInstanceNumber+=1;
  return {state:nextState,inventory:nextInventory,output:{kind:'instance',instance}};
}

export function effectiveInstanceStats(instance:ItemInstance):Record<string,number>{
  const base={...(itemDefs[instance.baseItemId]?.stats??{})};
  const multiplier=rarityMultipliers[instance.rarity]*(1.25**instance.upgradeLevel);
  const stats:Record<string,number>=Object.fromEntries(
    Object.entries(base).map(([key,value])=>[key,value*multiplier])
  );
  for(const propertyId of instance.properties){
    const property=propertyDefs[propertyId];
    if(!property?.stat||property.value===undefined||stats[property.stat]===undefined)continue;
    if(property.mode==='mul')stats[property.stat]*=1+property.value;
    else if(property.mode==='add')stats[property.stat]+=property.value;
  }
  return stats;
}

export function upgradeCost(targetLevel:number):number{
  if(targetLevel<1||targetLevel>5)return Infinity;
  return targetLevel*20;
}

function cloneInstance(instance:ItemInstance):ItemInstance{
  return {...instance,properties:[...instance.properties]};
}

export function upgradeItem(
  instance:ItemInstance,
  gold:number,
  rng:RandomSource
):{ok:boolean;gold:number;instance:ItemInstance}{
  if(instance.upgradeLevel>=5)return {ok:false,gold,instance:cloneInstance(instance)};
  const nextLevel=(instance.upgradeLevel+1) as ItemUpgradeLevel;
  const cost=upgradeCost(nextLevel);
  if(gold<cost)return {ok:false,gold,instance:cloneInstance(instance)};
  const next=cloneInstance(instance);
  next.upgradeLevel=nextLevel;
  if(nextLevel===3||nextLevel===5){
    const property=chooseProperty(next.baseItemId,next.properties,rng);
    if(property)next.properties.push(property);
  }
  return {ok:true,gold:gold-cost,instance:next};
}

export function rerollItemProperty(
  instance:ItemInstance,
  propertyIndex:number,
  gold:number,
  rng:RandomSource
):{ok:boolean;gold:number;instance:ItemInstance}{
  if(gold<10||propertyIndex<0||propertyIndex>=instance.properties.length){
    return {ok:false,gold,instance:cloneInstance(instance)};
  }
  const current=instance.properties[propertyIndex];
  const excluded=[...instance.properties];
  const candidates=eligiblePropertyIds(instance.baseItemId).filter(id=>!excluded.includes(id));
  if(candidates.length===0)return {ok:false,gold,instance:cloneInstance(instance)};
  const index=Math.min(candidates.length-1,Math.floor(Math.max(0,Math.min(0.999999999,rng.next()))*candidates.length));
  const next=cloneInstance(instance);
  next.properties[propertyIndex]=candidates[index];
  if(next.properties[propertyIndex]===current)return {ok:false,gold,instance:cloneInstance(instance)};
  return {ok:true,gold:gold-10,instance:next};
}


export function learnRecipeScroll(
  state:CraftingState,
  inventory:InventoryState,
  recipeId:string
):{
  ok:boolean;
  learned:boolean;
  goldDelta:number;
  state:CraftingState;
  inventory:InventoryState;
}{
  if(!craftRecipes[recipeId]){
    return {ok:false,learned:false,goldDelta:0,state,inventory};
  }
  const scrollId=`recipe-${recipeId}`;
  const stack=inventory.stacks.find(entry=>entry.itemId===scrollId&&entry.quantity>0);
  if(!stack){
    return {ok:false,learned:false,goldDelta:0,state,inventory};
  }
  const stacks=inventory.stacks
    .map(entry=>entry.itemId===scrollId?{...entry,quantity:entry.quantity-1}:{...entry})
    .filter(entry=>entry.quantity>0);
  const alreadyKnown=state.knownRecipeIds.includes(recipeId);
  return {
    ok:true,
    learned:!alreadyKnown,
    goldDelta:alreadyKnown?5:0,
    state:alreadyKnown
      ? {...state,knownRecipeIds:[...state.knownRecipeIds]}
      : {...state,knownRecipeIds:[...state.knownRecipeIds,recipeId]},
    inventory:{...inventory,stacks}
  };
}
