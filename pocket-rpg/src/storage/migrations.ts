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
import { createDefaultCraftingState } from '../game-core/crafting/crafting.js';
import type { CraftingState } from '../game-core/crafting/types.js';
import { createDefaultEconomyState } from '../game-core/economy/merchant.js';
import type { EconomyState } from '../game-core/economy/types.js';
import { createDefaultDiplomacyState } from '../game-core/diplomacy/diplomacy.js';
import type { DiplomacyState } from '../game-core/diplomacy/types.js';
import {
  ATTRIBUTE_IDS,
  balancedAttributesForLegacyLevel,
  createDefaultUniversityState
} from '../game-core/university/retraining.js';
import type { UniversityState } from '../game-core/university/types.js';
import { createLegacyEquipmentInstance,type EquipmentInstance } from '../game-core/items/equipment.js';
import type { InventoryState,LegacyInventoryState } from '../game-core/items/inventory.js';
import type {
  GameState,
  LegacyGameStateV1,
  LegacyGameStateV2,
  LegacyGameStateV3,
  LegacyGameStateV4,
  LegacyGameStateV5,
  LegacyGameStateV6,
  LegacyGameStateV7
} from '../game-core/game-state.js';
import { cropDefs } from '../content/farming.js';
import { gatheringResourceDefs } from '../content/gathering.js';
import { locations } from '../content/locations.js';
import { cities } from '../content/cities.js';
import { itemDefs } from '../content/items.js';
import { craftingRecipes,starterRecipeIds } from '../content/crafting.js';
import { basePrices } from '../content/economy.js';
import type { SaveEnvelopeV8 } from './schema.js';

const FACTION_IDS=['karnholm','ellaria','rivermark','greenwald'] as const;

function isObject(value:unknown):value is Record<string,unknown>{
  return Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
}
function isFiniteNumber(value:unknown):value is number{
  return typeof value==='number'&&Number.isFinite(value);
}
function isTimestamp(value:unknown):value is number|null{
  return value===null||isFiniteNumber(value);
}
function looksLikeCharacter(value:unknown):boolean{
  if(!isObject(value))return false;
  return Number.isInteger(value.level)&&(value.level as number)>=1
    &&isFiniteNumber(value.xp)&&value.xp>=0
    &&isFiniteNumber(value.gold)&&value.gold>=0;
}
function looksLikeCurrentCharacter(value:unknown):boolean{
  if(!looksLikeCharacter(value)||!isObject(value)||!isObject(value.attributes))return false;
  const keys=Object.keys(value.attributes);
  if(keys.length!==ATTRIBUTE_IDS.length)return false;
  for(const id of ATTRIBUTE_IDS){
    const attribute=value.attributes[id];
    if(!isFiniteNumber(attribute)||attribute<1)return false;
  }
  return keys.every(id=>(ATTRIBUTE_IDS as readonly string[]).includes(id));
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
    &&Boolean(locations[value.locationId])
    &&Number.isInteger(value.arrivalCount)
    &&(value.arrivalCount as number)>=0
    &&looksLikeTravel(value.travel);
}
function looksLikeStack(value:unknown):boolean{
  if(!isObject(value))return false;
  if(typeof value.itemId!=='string'||value.itemId.length===0)return false;
  if(!Number.isInteger(value.quantity)||(value.quantity as number)<=0)return false;
  if(value.itemClass!==undefined&&(!Number.isInteger(value.itemClass)||(value.itemClass as number)<1||(value.itemClass as number)>5))return false;
  return true;
}
function looksLikeLegacyInventory(value:unknown):value is LegacyInventoryState{
  return isObject(value)&&Array.isArray(value.stacks)&&value.stacks.every(looksLikeStack);
}
function looksLikeEquipmentProperty(value:unknown):boolean{
  if(!isObject(value))return false;
  return typeof value.id==='string'
    &&typeof value.label==='string'
    &&typeof value.stat==='string'
    &&isFiniteNumber(value.value)
    &&typeof value.rerollable==='boolean'
    &&['inherent','upgrade3','upgrade5','unique'].includes(String(value.source))
    &&Number.isInteger(value.introducedAtUpgrade)
    &&[0,3,5].includes(value.introducedAtUpgrade as number);
}
function looksLikeEquipment(value:unknown):value is EquipmentInstance{
  if(!isObject(value))return false;
  const def=typeof value.itemId==='string'?itemDefs[value.itemId]:undefined;
  if(!def?.slot)return false;
  if(typeof value.instanceId!=='string'||value.instanceId.length===0)return false;
  if(!Number.isInteger(value.itemClass)||(value.itemClass as number)<1||(value.itemClass as number)>5)return false;
  if(!['common','quality','rare','epic','unique'].includes(String(value.rarity)))return false;
  if(!Number.isInteger(value.upgradeLevel)||(value.upgradeLevel as number)<0||(value.upgradeLevel as number)>5)return false;
  if(!isObject(value.stats)||!Object.values(value.stats).every(isFiniteNumber))return false;
  if(!Array.isArray(value.properties)||!value.properties.every(looksLikeEquipmentProperty))return false;
  return true;
}
function looksLikeInventoryV5(value:unknown):value is InventoryState{
  if(!isObject(value)||!Array.isArray(value.stacks)||!Array.isArray(value.equipment))return false;
  if(!value.stacks.every(looksLikeStack)||!value.equipment.every(looksLikeEquipment))return false;
  if(value.stacks.some(stack=>isObject(stack)&&typeof stack.itemId==='string'&&Boolean(itemDefs[stack.itemId]?.slot)))return false;
  const ids=value.equipment.map(entry=>isObject(entry)?entry.instanceId:null);
  return new Set(ids).size===ids.length;
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
  return looksLikeLegacyStateV1(value)&&isObject(value)&&looksLikeInjuryState(value.injuries);
}
function looksLikeFarmCell(value:unknown):boolean{
  if(value===null)return true;
  if(!isObject(value))return false;
  return isFiniteNumber(value.plantedAt)
    &&isFiniteNumber(value.maturesAt)
    &&value.maturesAt>=value.plantedAt;
}
function looksLikeFarmingState(value:unknown):value is FarmingState{
  if(!isObject(value)||!isObject(value.skill))return false;
  if(!Number.isInteger(value.skill.level)||(value.skill.level as number)<0||(value.skill.level as number)>100)return false;
  if(!isFiniteNumber(value.skill.xp)||value.skill.xp<0)return false;
  if(!Array.isArray(value.knownSeedIds))return false;
  if(!value.knownSeedIds.every(seed=>typeof seed==='string'&&Boolean(cropDefs[seed])))return false;
  if(new Set(value.knownSeedIds).size!==value.knownSeedIds.length)return false;
  if(!Number.isInteger(value.nextFieldNumber)||(value.nextFieldNumber as number)<1)return false;
  if(!Array.isArray(value.fields))return false;

  const level=value.skill.level as number;
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
    if(typeof field.locationId!=='string'||field.locationId.length===0)return false;
    if(!locations[field.locationId]?.agriculture)return false;
    if(field.cycleCropId!==null&&(typeof field.cycleCropId!=='string'||!cropDefs[field.cycleCropId]))return false;
    if(!Array.isArray(field.cells)||field.cells.length<4||field.cells.length>maxCapacity)return false;
    if(!field.cells.every(looksLikeFarmCell))return false;
    const hasCrop=field.cells.some(cell=>cell!==null);
    if(hasCrop&&field.cycleCropId===null)return false;
    if(!hasCrop&&field.cycleCropId!==null)return false;
  }
  if((value.nextFieldNumber as number)<=highestFieldNumber)return false;
  return true;
}
function looksLikeGatheringState(value:unknown):value is GatheringState{
  if(!isObject(value)||!isObject(value.skill))return false;
  if(!Number.isInteger(value.skill.level)||(value.skill.level as number)<0||(value.skill.level as number)>100)return false;
  if(!isFiniteNumber(value.skill.xp)||value.skill.xp<0)return false;
  if(!Array.isArray(value.discoveredResourceIds))return false;
  if(!value.discoveredResourceIds.every(id=>typeof id==='string'&&Boolean(gatheringResourceDefs[id])))return false;
  if(new Set(value.discoveredResourceIds).size!==value.discoveredResourceIds.length)return false;
  return true;
}
function looksLikeSkillState(value:unknown):boolean{
  return isObject(value)
    &&Number.isInteger(value.level)
    &&(value.level as number)>=0
    &&(value.level as number)<=100
    &&isFiniteNumber(value.xp)
    &&value.xp>=0;
}
function looksLikeCraftingState(value:unknown):value is CraftingState{
  if(!isObject(value)||!isObject(value.skills))return false;
  if(!looksLikeSkillState(value.skills.crafting)||!looksLikeSkillState(value.skills.alchemy))return false;
  if(!Array.isArray(value.knownRecipeIds))return false;
  if(!value.knownRecipeIds.every(id=>typeof id==='string'&&Boolean(craftingRecipes[id])))return false;
  if(new Set(value.knownRecipeIds).size!==value.knownRecipeIds.length)return false;
  return Number.isInteger(value.nextEquipmentId)&&(value.nextEquipmentId as number)>=1;
}
function looksLikePressureEntry(value:unknown):boolean{
  return isObject(value)
    &&isFiniteNumber(value.value)
    &&value.value>=-0.25
    &&value.value<=1.5
    &&isFiniteNumber(value.updatedAt)
    &&value.updatedAt>=0;
}
function looksLikeEconomyState(value:unknown):value is EconomyState{
  if(!isObject(value)||!looksLikeSkillState(value.trading))return false;
  if(!isObject(value.pressures)||!isObject(value.factionRelations))return false;

  for(const [cityId,market] of Object.entries(value.pressures)){
    if(!cities[cityId]||!isObject(market))return false;
    for(const [itemId,entry] of Object.entries(market)){
      if(!basePrices[itemId]||!looksLikePressureEntry(entry))return false;
    }
  }

  const relationKeys=Object.keys(value.factionRelations);
  if(relationKeys.length!==FACTION_IDS.length)return false;
  for(const factionId of FACTION_IDS){
    const relation=value.factionRelations[factionId];
    if(!isFiniteNumber(relation)||relation<-100||relation>100)return false;
  }
  return relationKeys.every(id=>(FACTION_IDS as readonly string[]).includes(id));
}
function looksLikeLegacyStateV3(value:unknown):value is LegacyGameStateV3{
  return looksLikeLegacyStateV2(value)&&isObject(value)&&looksLikeFarmingState(value.farming);
}
function looksLikeLegacyStateV4(value:unknown):value is LegacyGameStateV4{
  return looksLikeLegacyStateV3(value)&&isObject(value)&&looksLikeGatheringState(value.gathering);
}
function validEquipmentCounter(inventory:InventoryState,crafting:CraftingState):boolean{
  let highest=0;
  for(const instance of inventory.equipment??[]){
    const match=/^eq-(\d+)$/.exec(instance.instanceId);
    if(match)highest=Math.max(highest,Number(match[1]));
  }
  return crafting.nextEquipmentId>highest;
}
function looksLikeLegacyStateV5(value:unknown):value is LegacyGameStateV5{
  if(!isObject(value))return false;
  if(!looksLikeCharacter(value.character)
    ||!looksLikeWorld(value.world)
    ||!looksLikeInventoryV5(value.inventory)
    ||!looksLikeInjuryState(value.injuries)
    ||!looksLikeFarmingState(value.farming)
    ||!looksLikeGatheringState(value.gathering)
    ||!looksLikeCraftingState(value.crafting))return false;
  return validEquipmentCounter(value.inventory as InventoryState,value.crafting as CraftingState);
}
function looksLikeLegacyStateV6(value:unknown):value is LegacyGameStateV6{
  return looksLikeLegacyStateV5(value)
    &&isObject(value)
    &&looksLikeEconomyState(value.economy);
}
function looksLikeDiplomacyState(value:unknown):value is DiplomacyState{
  if(!isObject(value)||!looksLikeSkillState(value.skill))return false;
  if(!isObject(value.audienceAvailableAt)
    ||!isObject(value.mediationAvailableAt)
    ||!isObject(value.completedRequestWindows))return false;

  for(const factionId of FACTION_IDS){
    const audience=value.audienceAvailableAt[factionId];
    const mediation=value.mediationAvailableAt[factionId];
    if(!isFiniteNumber(audience)||audience<0)return false;
    if(!isFiniteNumber(mediation)||mediation<0)return false;
  }
  if(Object.keys(value.audienceAvailableAt).length!==FACTION_IDS.length)return false;
  if(Object.keys(value.mediationAvailableAt).length!==FACTION_IDS.length)return false;

  for(const [factionId,window] of Object.entries(value.completedRequestWindows)){
    if(!(FACTION_IDS as readonly string[]).includes(factionId))return false;
    if(!Number.isInteger(window)||(window as number)<0)return false;
  }
  return true;
}
function looksLikeLegacyStateV7(value:unknown):value is LegacyGameStateV7{
  return looksLikeLegacyStateV6(value)
    &&isObject(value)
    &&looksLikeDiplomacyState(value.diplomacy);
}
function looksLikeUniversityState(value:unknown):value is UniversityState{
  if(!isObject(value))return false;
  if(value.pending===null)return true;
  if(!isObject(value.pending))return false;
  const pending=value.pending;
  if(typeof pending.from!=='string'||!(ATTRIBUTE_IDS as readonly string[]).includes(pending.from))return false;
  if(typeof pending.to!=='string'||!(ATTRIBUTE_IDS as readonly string[]).includes(pending.to))return false;
  if(pending.from===pending.to)return false;
  if(!isFiniteNumber(pending.percent)||pending.percent<=0||pending.percent>100)return false;
  if(!isFiniteNumber(pending.amount)||pending.amount<=0)return false;
  if(!isFiniteNumber(pending.startedAt)||pending.startedAt<0)return false;
  if(!isFiniteNumber(pending.completesAt)||pending.completesAt<=pending.startedAt)return false;
  return true;
}
function looksLikeGameState(value:unknown):value is GameState{
  return looksLikeLegacyStateV7(value)
    &&isObject(value)
    &&looksLikeCurrentCharacter(value.character)
    &&looksLikeUniversityState(value.university);
}

export function upgradeLegacyInventory(
  inventory:LegacyInventoryState,
  startEquipmentId=1
):{inventory:InventoryState;nextEquipmentId:number}{
  const stacks:InventoryState['stacks']=[];
  const equipment:EquipmentInstance[]=[];
  let nextEquipmentId=Math.max(1,Math.floor(startEquipmentId));

  for(const stack of inventory.stacks){
    const def=itemDefs[stack.itemId];
    if(def?.slot){
      for(let index=0;index<stack.quantity;index+=1){
        equipment.push(createLegacyEquipmentInstance(`eq-${nextEquipmentId}`,def));
        nextEquipmentId+=1;
      }
      continue;
    }
    const itemClass=Math.max(1,Math.min(5,def?.materialClass??stack.itemClass??1));
    stacks.push({itemId:stack.itemId,quantity:stack.quantity,itemClass});
  }
  return {inventory:{stacks,equipment},nextEquipmentId};
}

function withCrafting(
  legacy:LegacyGameStateV4
):LegacyGameStateV5{
  const upgraded=upgradeLegacyInventory(legacy.inventory);
  return {
    ...legacy,
    inventory:upgraded.inventory,
    crafting:{
      ...createDefaultCraftingState(starterRecipeIds),
      nextEquipmentId:upgraded.nextEquipmentId
    }
  };
}

function withEconomy(legacy:LegacyGameStateV5):LegacyGameStateV6{
  return {...legacy,economy:createDefaultEconomyState()};
}

function withDiplomacy(legacy:LegacyGameStateV6):LegacyGameStateV7{
  return {...legacy,diplomacy:createDefaultDiplomacyState()};
}

function withUniversity(legacy:LegacyGameStateV7):GameState{
  return {
    ...legacy,
    character:{
      ...legacy.character,
      attributes:balancedAttributesForLegacyLevel(legacy.character.level)
    },
    university:createDefaultUniversityState()
  };
}

export function migrateSave(value:unknown):SaveEnvelopeV8|null{
  if(!isObject(value)||!isFiniteNumber(value.savedAt))return null;

  if(value.schemaVersion===1&&looksLikeLegacyStateV1(value.state)){
    const v4:LegacyGameStateV4={
      ...value.state,
      injuries:cleanInjuryState(),
      farming:createDefaultFarmingState(),
      gathering:createDefaultGatheringState()
    };
    return {schemaVersion:8,savedAt:value.savedAt,state:withUniversity(withDiplomacy(withEconomy(withCrafting(v4))))};
  }
  if(value.schemaVersion===2&&looksLikeLegacyStateV2(value.state)){
    const v4:LegacyGameStateV4={
      ...value.state,
      farming:createDefaultFarmingState(),
      gathering:createDefaultGatheringState()
    };
    return {schemaVersion:8,savedAt:value.savedAt,state:withUniversity(withDiplomacy(withEconomy(withCrafting(v4))))};
  }
  if(value.schemaVersion===3&&looksLikeLegacyStateV3(value.state)){
    const v4:LegacyGameStateV4={
      ...value.state,
      gathering:createDefaultGatheringState()
    };
    return {schemaVersion:8,savedAt:value.savedAt,state:withUniversity(withDiplomacy(withEconomy(withCrafting(v4))))};
  }
  if(value.schemaVersion===4&&looksLikeLegacyStateV4(value.state)){
    return {schemaVersion:8,savedAt:value.savedAt,state:withUniversity(withDiplomacy(withEconomy(withCrafting(value.state))))};
  }
  if(value.schemaVersion===5&&looksLikeLegacyStateV5(value.state)){
    return {schemaVersion:8,savedAt:value.savedAt,state:withUniversity(withDiplomacy(withEconomy(value.state)))};
  }
  if(value.schemaVersion===6&&looksLikeLegacyStateV6(value.state)){
    return {schemaVersion:8,savedAt:value.savedAt,state:withUniversity(withDiplomacy(value.state))};
  }
  if(value.schemaVersion===7&&looksLikeLegacyStateV7(value.state)){
    return {schemaVersion:8,savedAt:value.savedAt,state:withUniversity(value.state)};
  }
  if(value.schemaVersion===8&&looksLikeGameState(value.state)){
    return {schemaVersion:8,savedAt:value.savedAt,state:value.state};
  }
  return null;
}
