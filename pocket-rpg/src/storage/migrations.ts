import { cleanInjuryState } from '../game-core/injuries/injuries.js';
import { BODY_ZONES,type InjuryState } from '../game-core/injuries/types.js';
import {
  createDefaultFarmingState,
  fieldCellCapacity,
  fieldSlotLimit
} from '../game-core/peaceful/farming/farming.js';
import type { FarmingState } from '../game-core/peaceful/farming/types.js';
import { createDefaultGatheringState } from '../game-core/peaceful/gathering/gathering.js';
import type { GatheringState } from '../game-core/peaceful/gathering/types.js';
import {
  createDefaultCraftingState,
  eligiblePropertyIds
} from '../game-core/crafting/crafting.js';
import type { CraftingState } from '../game-core/crafting/types.js';
import type {
  GameState,
  LegacyGameStateV1,
  LegacyGameStateV2,
  LegacyGameStateV3,
  LegacyGameStateV4
} from '../game-core/game-state.js';
import type {InventoryState,ItemInstance} from '../game-core/items/inventory.js';
import { cropDefs } from '../content/farming.js';
import { gatheringResourceDefs } from '../content/gathering.js';
import { craftRecipes } from '../content/crafting.js';
import { itemDefs } from '../content/items.js';
import { locations } from '../content/locations.js';
import type { SaveEnvelopeV5 } from './schema.js';

function isObject(value:unknown):value is Record<string,unknown>{
  return Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
}
function isFiniteNumber(value:unknown):value is number{
  return typeof value==='number'&&Number.isFinite(value);
}
function isTimestamp(value:unknown):value is number|null{
  return value===null||isFiniteNumber(value);
}
function looksLikeSkill(value:unknown):boolean{
  return isObject(value)
    &&Number.isInteger(value.level)
    &&(value.level as number)>=0
    &&(value.level as number)<=100
    &&isFiniteNumber(value.xp)
    &&value.xp>=0;
}
function looksLikeCharacter(value:unknown):boolean{
  if(!isObject(value))return false;
  return Number.isInteger(value.level)&&(value.level as number)>=1
    &&isFiniteNumber(value.xp)&&value.xp>=0
    &&isFiniteNumber(value.gold)&&value.gold>=0;
}
function looksLikeTravel(value:unknown):boolean{
  if(value===null)return true;
  if(!isObject(value))return false;
  return typeof value.fromId==='string'
    &&typeof value.destinationId==='string'
    &&isFiniteNumber(value.startedAt)
    &&isFiniteNumber(value.arrivesAt)
    &&value.arrivesAt>=value.startedAt;
}
function looksLikeWorld(value:unknown):boolean{
  if(!isObject(value))return false;
  return typeof value.locationId==='string'
    &&value.locationId.length>0
    &&Number.isInteger(value.arrivalCount)
    &&(value.arrivalCount as number)>=0
    &&looksLikeTravel(value.travel);
}
function looksLikeStacks(value:unknown):boolean{
  return Array.isArray(value)&&value.every(stack=>
    isObject(stack)
    &&typeof stack.itemId==='string'
    &&stack.itemId.length>0
    &&Number.isInteger(stack.quantity)
    &&(stack.quantity as number)>0
  );
}
function looksLikeLegacyInventory(value:unknown):boolean{
  return isObject(value)&&looksLikeStacks(value.stacks);
}
function propertyLimit(instance:ItemInstance):number{
  const base=(instance.rarity==='rare'||instance.rarity==='epic')?1:0;
  const atThree=instance.upgradeLevel>=3?1:0;
  const atFive=instance.upgradeLevel>=5?1:0;
  return base+atThree+atFive;
}
function looksLikeItemInstance(value:unknown):value is ItemInstance{
  if(!isObject(value))return false;
  if(typeof value.instanceId!=='string')return false;
  const instanceMatch=/^crafted-(\d+)$/.exec(value.instanceId);
  if(!instanceMatch||Number(instanceMatch[1])<1)return false;
  if(typeof value.baseItemId!=='string'||!itemDefs[value.baseItemId]?.slot)return false;
  if(!['common','quality','rare','epic'].includes(String(value.rarity)))return false;
  if(!Number.isInteger(value.upgradeLevel)||(value.upgradeLevel as number)<0||(value.upgradeLevel as number)>5)return false;
  if(!Array.isArray(value.properties)||!value.properties.every(id=>typeof id==='string'))return false;
  if(new Set(value.properties).size!==value.properties.length)return false;
  const allowed=new Set(eligiblePropertyIds(value.baseItemId));
  if(!value.properties.every(id=>allowed.has(id)))return false;
  return value.properties.length===propertyLimit(value as unknown as ItemInstance);
}
function looksLikeV5Inventory(value:unknown):value is InventoryState{
  if(!isObject(value)||!looksLikeStacks(value.stacks)||!Array.isArray(value.instances))return false;
  if(!value.instances.every(looksLikeItemInstance))return false;
  const ids=value.instances.map(instance=>(instance as ItemInstance).instanceId);
  return new Set(ids).size===ids.length;
}
function normalizeLegacyInventory(value:unknown):InventoryState{
  const inventory=value as {stacks:Array<{itemId:string;quantity:number}>};
  return {
    stacks:inventory.stacks.map(stack=>({...stack})),
    instances:[]
  };
}
function looksLikeInjuryState(value:unknown):value is InjuryState{
  if(!isObject(value)||!isObject(value.severity))return false;
  if(!isTimestamp(value.unconsciousUntil)||!isTimestamp(value.restUntil))return false;
  for(const zone of BODY_ZONES){
    const severity=value.severity[zone];
    if(severity!==0&&severity!==1&&severity!==2&&severity!==3)return false;
  }
  return true;
}
function looksLikeLegacyStateV1(value:unknown):value is LegacyGameStateV1{
  if(!isObject(value))return false;
  return looksLikeCharacter(value.character)
    &&looksLikeWorld(value.world)
    &&looksLikeLegacyInventory(value.inventory);
}
function looksLikeLegacyStateV2(value:unknown):value is LegacyGameStateV2{
  if(!isObject(value))return false;
  return looksLikeCharacter(value.character)
    &&looksLikeWorld(value.world)
    &&looksLikeLegacyInventory(value.inventory)
    &&looksLikeInjuryState(value.injuries);
}
function looksLikeFarmCell(value:unknown):boolean{
  if(value===null)return true;
  if(!isObject(value))return false;
  return isFiniteNumber(value.plantedAt)
    &&isFiniteNumber(value.maturesAt)
    &&value.maturesAt>=value.plantedAt;
}
function looksLikeFarmingState(value:unknown):value is FarmingState{
  if(!isObject(value)||!looksLikeSkill(value.skill))return false;
  if(!Array.isArray(value.knownSeedIds))return false;
  if(!value.knownSeedIds.every(seed=>typeof seed==='string'&&Boolean(cropDefs[seed])))return false;
  if(new Set(value.knownSeedIds).size!==value.knownSeedIds.length)return false;
  if(!Number.isInteger(value.nextFieldNumber)||(value.nextFieldNumber as number)<1)return false;
  if(!Array.isArray(value.fields))return false;

  const level=(value.skill as {level:number}).level;
  if(value.fields.length>fieldSlotLimit(level))return false;
  const maxCapacity=fieldCellCapacity(level);
  const ids=new Set<string>();
  let highestFieldNumber=0;

  for(const field of value.fields){
    if(!isObject(field))return false;
    if(typeof field.id!=='string'||field.id.length===0||ids.has(field.id))return false;
    const match=/^field-(\d+)$/.exec(field.id);
    if(!match)return false;
    highestFieldNumber=Math.max(highestFieldNumber,Number(match[1]));
    ids.add(field.id);
    if(typeof field.locationId!=='string'||!locations[field.locationId]?.agriculture)return false;
    if(field.cycleCropId!==null&&(typeof field.cycleCropId!=='string'||!cropDefs[field.cycleCropId]))return false;
    if(!Array.isArray(field.cells)||field.cells.length<4||field.cells.length>maxCapacity)return false;
    if(!field.cells.every(looksLikeFarmCell))return false;
    const hasCrop=field.cells.some(cell=>cell!==null);
    if(hasCrop&&field.cycleCropId===null)return false;
    if(!hasCrop&&field.cycleCropId!==null)return false;
  }
  return (value.nextFieldNumber as number)>highestFieldNumber;
}
function looksLikeGatheringState(value:unknown):value is GatheringState{
  if(!isObject(value)||!looksLikeSkill(value.skill))return false;
  if(!Array.isArray(value.discoveredResourceIds))return false;
  if(!value.discoveredResourceIds.every(id=>typeof id==='string'&&Boolean(gatheringResourceDefs[id])))return false;
  return new Set(value.discoveredResourceIds).size===value.discoveredResourceIds.length;
}
function looksLikeCraftingState(
  value:unknown,
  inventory:InventoryState
):value is CraftingState{
  if(!isObject(value))return false;
  if(!looksLikeSkill(value.craftingSkill)||!looksLikeSkill(value.alchemySkill))return false;
  if(!Array.isArray(value.knownRecipeIds))return false;
  if(!value.knownRecipeIds.every(id=>typeof id==='string'&&Boolean(craftRecipes[id])))return false;
  if(new Set(value.knownRecipeIds).size!==value.knownRecipeIds.length)return false;
  for(const starter of ['healing-potion','weak-injury-medicine','travel-bag']){
    if(!value.knownRecipeIds.includes(starter))return false;
  }
  if(!Number.isInteger(value.nextInstanceNumber)||(value.nextInstanceNumber as number)<1)return false;
  let highest=0;
  for(const instance of inventory.instances??[]){
    const match=/^crafted-(\d+)$/.exec(instance.instanceId);
    if(match)highest=Math.max(highest,Number(match[1]));
  }
  return (value.nextInstanceNumber as number)>highest;
}
function looksLikeLegacyStateV3(value:unknown):value is LegacyGameStateV3{
  if(!isObject(value))return false;
  return looksLikeCharacter(value.character)
    &&looksLikeWorld(value.world)
    &&looksLikeLegacyInventory(value.inventory)
    &&looksLikeInjuryState(value.injuries)
    &&looksLikeFarmingState(value.farming);
}
function looksLikeLegacyStateV4(value:unknown):value is LegacyGameStateV4{
  if(!isObject(value))return false;
  return looksLikeCharacter(value.character)
    &&looksLikeWorld(value.world)
    &&looksLikeLegacyInventory(value.inventory)
    &&looksLikeInjuryState(value.injuries)
    &&looksLikeFarmingState(value.farming)
    &&looksLikeGatheringState(value.gathering);
}
function looksLikeGameState(value:unknown):value is GameState{
  if(!isObject(value))return false;
  if(!looksLikeCharacter(value.character)
    ||!looksLikeWorld(value.world)
    ||!looksLikeV5Inventory(value.inventory)
    ||!looksLikeInjuryState(value.injuries)
    ||!looksLikeFarmingState(value.farming)
    ||!looksLikeGatheringState(value.gathering))return false;
  return looksLikeCraftingState(value.crafting,value.inventory);
}

function baseStateParts(value:Record<string,unknown>){
  return {
    character:value.character as GameState['character'],
    world:value.world as GameState['world']
  };
}

export function migrateSave(value:unknown):SaveEnvelopeV5|null{
  if(!isObject(value)||!isFiniteNumber(value.savedAt)||!isObject(value.state))return null;
  const state=value.state;

  if(value.schemaVersion===1&&looksLikeLegacyStateV1(state)){
    return {
      schemaVersion:5,
      savedAt:value.savedAt,
      state:{
        ...baseStateParts(state),
        inventory:normalizeLegacyInventory(state.inventory),
        injuries:cleanInjuryState(),
        farming:createDefaultFarmingState(),
        gathering:createDefaultGatheringState(),
        crafting:createDefaultCraftingState()
      }
    };
  }
  if(value.schemaVersion===2&&looksLikeLegacyStateV2(state)){
    return {
      schemaVersion:5,
      savedAt:value.savedAt,
      state:{
        ...baseStateParts(state),
        inventory:normalizeLegacyInventory(state.inventory),
        injuries:state.injuries,
        farming:createDefaultFarmingState(),
        gathering:createDefaultGatheringState(),
        crafting:createDefaultCraftingState()
      }
    };
  }
  if(value.schemaVersion===3&&looksLikeLegacyStateV3(state)){
    return {
      schemaVersion:5,
      savedAt:value.savedAt,
      state:{
        ...baseStateParts(state),
        inventory:normalizeLegacyInventory(state.inventory),
        injuries:state.injuries,
        farming:state.farming,
        gathering:createDefaultGatheringState(),
        crafting:createDefaultCraftingState()
      }
    };
  }
  if(value.schemaVersion===4&&looksLikeLegacyStateV4(state)){
    return {
      schemaVersion:5,
      savedAt:value.savedAt,
      state:{
        ...baseStateParts(state),
        inventory:normalizeLegacyInventory(state.inventory),
        injuries:state.injuries,
        farming:state.farming,
        gathering:state.gathering,
        crafting:createDefaultCraftingState()
      }
    };
  }
  if(value.schemaVersion===5&&looksLikeGameState(state)){
    return {schemaVersion:5,savedAt:value.savedAt,state};
  }
  return null;
}
