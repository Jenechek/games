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
import { emptyAttributeProfile } from '../game-core/progression/character.js';
import type { SkillState } from '../game-core/progression/skills.js';
import {
  LEGACY_PERSISTED_SKILL_IDS_V12,
  LEGACY_PERSISTED_SKILL_IDS_V14,
  PERSISTED_SKILL_IDS,
  collectLegacySkillProgression,
  mirrorsMatchProgression,
  upgradeSkillProgressionV12,
  upgradeSkillProgressionV14
} from '../game-core/progression/skill-progress.js';
import type {
  LegacySkillProgressionStateV12,
  LegacySkillProgressionStateV14,
  SkillProgressionState
} from '../game-core/progression/skill-progress.js';
import { createDefaultSummonRoster } from '../game-core/summons/summons.js';
import { createDefaultClassState,effectiveSummonDefinitions,unlockedSummonIds } from '../game-core/classes/classes.js';
import type { ClassState } from '../game-core/classes/types.js';
import type { SummonRosterState } from '../game-core/summons/types.js';
import type { UniversityState } from '../game-core/university/types.js';
import {
  EQUIPMENT_SLOTS,
  createDefaultEquipmentLoadout,
  createLegacyEquipmentInstance,
  isEquipmentSlot,
  validateEquipmentLoadout,
  type EquipmentInstance,
  type EquipmentLoadoutState
} from '../game-core/items/equipment.js';
import type { InventoryState,LegacyInventoryState } from '../game-core/items/inventory.js';
import type {
  GameState,
  LegacyGameStateV1,
  LegacyGameStateV2,
  LegacyGameStateV3,
  LegacyGameStateV4,
  LegacyGameStateV5,
  LegacyGameStateV6,
  LegacyGameStateV7,
  LegacyGameStateV8,
  LegacyGameStateV9,
  LegacyGameStateV10,
  LegacyGameStateV11,
  LegacyGameStateV12,
  LegacyGameStateV13,
  LegacyGameStateV14
} from '../game-core/game-state.js';
import { cropDefs } from '../content/farming.js';
import { gatheringResourceDefs } from '../content/gathering.js';
import { locations } from '../content/locations.js';
import { cities } from '../content/cities.js';
import { itemDefs } from '../content/items.js';
import { craftingRecipes,starterRecipeIds } from '../content/crafting.js';
import { basePrices } from '../content/economy.js';
import { summonDefinitions } from '../content/summons.js';
import { playerClasses } from '../content/classes.js';
import type { SaveEnvelopeV15 } from './schema.js';

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
function looksLikeLegacyCurrentCharacter(value:unknown):boolean{
  if(!looksLikeCharacter(value)||!isObject(value)||!isObject(value.attributes))return false;
  const keys=Object.keys(value.attributes);
  if(keys.length!==ATTRIBUTE_IDS.length)return false;
  for(const id of ATTRIBUTE_IDS){
    const attribute=value.attributes[id];
    if(!isFiniteNumber(attribute)||attribute<1)return false;
  }
  return keys.every(id=>(ATTRIBUTE_IDS as readonly string[]).includes(id));
}
function looksLikeAttributeProfile(value:unknown):boolean{
  if(!isObject(value))return false;
  const keys=Object.keys(value);
  if(keys.length!==ATTRIBUTE_IDS.length)return false;
  for(const id of ATTRIBUTE_IDS){
    const amount=value[id];
    if(!isFiniteNumber(amount)||amount<0)return false;
  }
  return keys.every(id=>(ATTRIBUTE_IDS as readonly string[]).includes(id));
}
function looksLikeCurrentCharacter(value:unknown):boolean{
  return looksLikeLegacyCurrentCharacter(value)
    &&isObject(value)
    &&looksLikeAttributeProfile(value.attributeXp);
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
function looksLikeSkillState(value:unknown):value is SkillState{
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
function looksLikeLegacyStateV8(value:unknown):value is LegacyGameStateV8{
  return looksLikeLegacyStateV7(value)
    &&isObject(value)
    &&looksLikeLegacyCurrentCharacter(value.character)
    &&looksLikeUniversityState(value.university);
}
function looksLikeLegacyStateV9(value:unknown):value is LegacyGameStateV9{
  return looksLikeLegacyStateV8(value)
    &&isObject(value)
    &&looksLikeCurrentCharacter(value.character);
}
function looksLikeSummonRoster(value:unknown):value is SummonRosterState{
  if(!isObject(value)||!Array.isArray(value.active))return false;
  if(!Number.isInteger(value.nextInstanceId)||(value.nextInstanceId as number)<1)return false;
  if(value.active.length>3)return false;

  const ids=new Set<string>();
  let highest=0;
  for(const instance of value.active){
    if(!isObject(instance))return false;
    if(typeof instance.instanceId!=='string'||ids.has(instance.instanceId))return false;
    const match=/^summon-(\d+)$/.exec(instance.instanceId);
    if(!match)return false;
    highest=Math.max(highest,Number(match[1]));
    ids.add(instance.instanceId);

    if(typeof instance.definitionId!=='string')return false;
    const def=summonDefinitions[instance.definitionId];
    if(!def)return false;
    if(!isFiniteNumber(instance.hp)||instance.hp<=0||instance.hp>def.maxHp)return false;
    if(!isFiniteNumber(instance.stamina)||instance.stamina<0||instance.stamina>def.maxStamina)return false;
    if(!isFiniteNumber(instance.summonedAt)||instance.summonedAt<0)return false;
    if(!isFiniteNumber(instance.recoveryUpdatedAt)||instance.recoveryUpdatedAt<instance.summonedAt)return false;
  }
  return (value.nextInstanceId as number)>highest;
}
function looksLikeLegacyStateV10(value:unknown):value is LegacyGameStateV10{
  return looksLikeLegacyStateV9(value)
    &&isObject(value)
    &&looksLikeSummonRoster(value.summons);
}
function looksLikeClassState(value:unknown):value is ClassState{
  if(!isObject(value)||!looksLikeSkillState(value.skill))return false;
  if(value.classId===null){
    return value.skill.level===0&&value.skill.xp===0;
  }
  return typeof value.classId==='string'
    &&Object.prototype.hasOwnProperty.call(playerClasses,value.classId);
}
function looksLikeClassSummonRoster(
  value:unknown,
  classState:ClassState
):value is SummonRosterState{
  if(!isObject(value)||!Array.isArray(value.active))return false;
  if(!Number.isInteger(value.nextInstanceId)||(value.nextInstanceId as number)<1)return false;

  const classDef=classState.classId?playerClasses[classState.classId]:null;
  const maxActive=classDef?.summonLimit??3;
  if(value.active.length>maxActive)return false;

  const effective=effectiveSummonDefinitions(classState,playerClasses,summonDefinitions);
  const allowed=classDef
    ?new Set(unlockedSummonIds(classState,classDef))
    :null;

  const ids=new Set<string>();
  let highest=0;
  for(const instance of value.active){
    if(!isObject(instance))return false;
    if(typeof instance.instanceId!=='string'||ids.has(instance.instanceId))return false;
    const match=/^summon-(\d+)$/.exec(instance.instanceId);
    if(!match)return false;
    highest=Math.max(highest,Number(match[1]));
    ids.add(instance.instanceId);

    if(typeof instance.definitionId!=='string')return false;
    if(allowed&&!allowed.has(instance.definitionId))return false;
    const def=effective[instance.definitionId];
    if(!def)return false;
    if(!isFiniteNumber(instance.hp)||instance.hp<=0||instance.hp>def.maxHp)return false;
    if(!isFiniteNumber(instance.stamina)||instance.stamina<0||instance.stamina>def.maxStamina)return false;
    if(!isFiniteNumber(instance.summonedAt)||instance.summonedAt<0)return false;
    if(!isFiniteNumber(instance.recoveryUpdatedAt)||instance.recoveryUpdatedAt<instance.summonedAt)return false;
  }
  return (value.nextInstanceId as number)>highest;
}
function looksLikeLegacyStateV11(value:unknown):value is LegacyGameStateV11{
  if(!looksLikeLegacyStateV9(value)||!isObject(value))return false;
  if(!looksLikeClassState(value.classState))return false;
  return looksLikeClassSummonRoster(value.summons,value.classState);
}
function looksLikeLegacySkillProgressionV12(value:unknown):value is LegacySkillProgressionStateV12{
  if(!isObject(value))return false;
  const keys=Object.keys(value);
  if(keys.length!==LEGACY_PERSISTED_SKILL_IDS_V12.length)return false;
  for(const id of LEGACY_PERSISTED_SKILL_IDS_V12){
    if(!looksLikeSkillState(value[id]))return false;
  }
  return keys.every(id=>(LEGACY_PERSISTED_SKILL_IDS_V12 as readonly string[]).includes(id));
}
function looksLikeLegacySkillProgressionV14(value:unknown):value is LegacySkillProgressionStateV14{
  if(!isObject(value))return false;
  const keys=Object.keys(value);
  if(keys.length!==LEGACY_PERSISTED_SKILL_IDS_V14.length)return false;
  for(const id of LEGACY_PERSISTED_SKILL_IDS_V14){
    if(!looksLikeSkillState(value[id]))return false;
  }
  return keys.every(id=>(LEGACY_PERSISTED_SKILL_IDS_V14 as readonly string[]).includes(id));
}
function looksLikeSkillProgression(value:unknown):value is SkillProgressionState{
  if(!isObject(value))return false;
  const keys=Object.keys(value);
  if(keys.length!==PERSISTED_SKILL_IDS.length)return false;
  for(const id of PERSISTED_SKILL_IDS){
    if(!looksLikeSkillState(value[id]))return false;
  }
  return keys.every(id=>(PERSISTED_SKILL_IDS as readonly string[]).includes(id));
}
function looksLikeLegacyStateV12(value:unknown):value is LegacyGameStateV12{
  if(!looksLikeLegacyStateV11(value)||!isObject(value))return false;
  if(!looksLikeLegacySkillProgressionV12(value.skillProgression))return false;
  return mirrorsMatchProgression({
    progression:value.skillProgression,
    farming:value.farming,
    gathering:value.gathering,
    crafting:value.crafting,
    economy:value.economy,
    diplomacy:value.diplomacy
  });
}
function looksLikeLegacyStateV13(value:unknown):value is LegacyGameStateV13{
  if(!looksLikeLegacyStateV11(value)||!isObject(value))return false;
  if(!looksLikeLegacySkillProgressionV14(value.skillProgression))return false;
  return mirrorsMatchProgression({
    progression:value.skillProgression,
    farming:value.farming,
    gathering:value.gathering,
    crafting:value.crafting,
    economy:value.economy,
    diplomacy:value.diplomacy
  });
}
function looksLikeEquipmentLoadoutShape(
  value:unknown
):value is EquipmentLoadoutState{
  if(!isObject(value))return false;
  const keys=Object.keys(value);
  if(keys.length!==EQUIPMENT_SLOTS.length)return false;
  if(!keys.every(isEquipmentSlot))return false;
  return EQUIPMENT_SLOTS.every(slot=>
    value[slot]===null||typeof value[slot]==='string'
  );
}
function validLoadoutForState(args:{
  equipmentLoadout:EquipmentLoadoutState;
  inventory:InventoryState;
  attributes:LegacyGameStateV14['character']['attributes'];
  skillProgression:LegacySkillProgressionStateV14|SkillProgressionState;
}):boolean{
  const skills=Object.fromEntries(
    Object.entries(args.skillProgression).map(([id,skill])=>[id,skill.level])
  );
  return validateEquipmentLoadout(
    args.equipmentLoadout,
    args.inventory,
    itemDefs,
    {
      attributes:args.attributes,
      skills
    }
  );
}
function looksLikeLegacyStateV14(value:unknown):value is LegacyGameStateV14{
  if(!looksLikeLegacyStateV13(value)||!isObject(value))return false;
  if(!looksLikeEquipmentLoadoutShape(value.equipmentLoadout))return false;
  return validLoadoutForState({
    equipmentLoadout:value.equipmentLoadout,
    inventory:value.inventory,
    attributes:value.character.attributes,
    skillProgression:value.skillProgression
  });
}
function looksLikeGameState(value:unknown):value is GameState{
  if(!looksLikeLegacyStateV11(value)||!isObject(value))return false;
  if(!looksLikeSkillProgression(value.skillProgression))return false;
  if(!mirrorsMatchProgression({
    progression:value.skillProgression,
    farming:value.farming,
    gathering:value.gathering,
    crafting:value.crafting,
    economy:value.economy,
    diplomacy:value.diplomacy
  }))return false;
  if(!looksLikeEquipmentLoadoutShape(value.equipmentLoadout))return false;
  return validLoadoutForState({
    equipmentLoadout:value.equipmentLoadout,
    inventory:value.inventory,
    attributes:value.character.attributes,
    skillProgression:value.skillProgression
  });
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

function withUniversity(legacy:LegacyGameStateV7):LegacyGameStateV8{
  return {
    ...legacy,
    character:{
      ...legacy.character,
      attributes:balancedAttributesForLegacyLevel(legacy.character.level)
    },
    university:createDefaultUniversityState()
  };
}

function withCharacterProfile(legacy:LegacyGameStateV8):LegacyGameStateV9{
  return {
    ...legacy,
    character:{
      ...legacy.character,
      attributeXp:emptyAttributeProfile()
    }
  };
}

function withSummons(legacy:LegacyGameStateV9):LegacyGameStateV10{
  return {
    ...legacy,
    summons:createDefaultSummonRoster()
  };
}

function withClassState(legacy:LegacyGameStateV10):LegacyGameStateV11{
  return {
    ...legacy,
    classState:createDefaultClassState()
  };
}

type CurrentSkillBase=LegacyGameStateV11&{
  skillProgression:SkillProgressionState;
};

function withSkillProgression(legacy:LegacyGameStateV11):CurrentSkillBase{
  return {
    ...legacy,
    skillProgression:collectLegacySkillProgression({
      farming:legacy.farming,
      gathering:legacy.gathering,
      crafting:legacy.crafting,
      economy:legacy.economy,
      diplomacy:legacy.diplomacy
    })
  };
}

function withEquipmentLoadout(legacy:CurrentSkillBase):GameState{
  return {
    ...legacy,
    equipmentLoadout:createDefaultEquipmentLoadout()
  };
}

export function migrateSave(value:unknown):SaveEnvelopeV15|null{
  if(!isObject(value)||!isFiniteNumber(value.savedAt))return null;

  if(value.schemaVersion===1&&looksLikeLegacyStateV1(value.state)){
    const v4:LegacyGameStateV4={
      ...value.state,
      injuries:cleanInjuryState(),
      farming:createDefaultFarmingState(),
      gathering:createDefaultGatheringState()
    };
    return {schemaVersion:15,savedAt:value.savedAt,state:withEquipmentLoadout(withSkillProgression(withClassState(withSummons(withCharacterProfile(withUniversity(withDiplomacy(withEconomy(withCrafting(v4)))))))))};
  }
  if(value.schemaVersion===2&&looksLikeLegacyStateV2(value.state)){
    const v4:LegacyGameStateV4={
      ...value.state,
      farming:createDefaultFarmingState(),
      gathering:createDefaultGatheringState()
    };
    return {schemaVersion:15,savedAt:value.savedAt,state:withEquipmentLoadout(withSkillProgression(withClassState(withSummons(withCharacterProfile(withUniversity(withDiplomacy(withEconomy(withCrafting(v4)))))))))};
  }
  if(value.schemaVersion===3&&looksLikeLegacyStateV3(value.state)){
    const v4:LegacyGameStateV4={
      ...value.state,
      gathering:createDefaultGatheringState()
    };
    return {schemaVersion:15,savedAt:value.savedAt,state:withEquipmentLoadout(withSkillProgression(withClassState(withSummons(withCharacterProfile(withUniversity(withDiplomacy(withEconomy(withCrafting(v4)))))))))};
  }
  if(value.schemaVersion===4&&looksLikeLegacyStateV4(value.state)){
    return {schemaVersion:15,savedAt:value.savedAt,state:withEquipmentLoadout(withSkillProgression(withClassState(withSummons(withCharacterProfile(withUniversity(withDiplomacy(withEconomy(withCrafting(value.state)))))))))};
  }
  if(value.schemaVersion===5&&looksLikeLegacyStateV5(value.state)){
    return {schemaVersion:15,savedAt:value.savedAt,state:withEquipmentLoadout(withSkillProgression(withClassState(withSummons(withCharacterProfile(withUniversity(withDiplomacy(withEconomy(value.state))))))))};
  }
  if(value.schemaVersion===6&&looksLikeLegacyStateV6(value.state)){
    return {schemaVersion:15,savedAt:value.savedAt,state:withEquipmentLoadout(withSkillProgression(withClassState(withSummons(withCharacterProfile(withUniversity(withDiplomacy(value.state)))))))};
  }
  if(value.schemaVersion===7&&looksLikeLegacyStateV7(value.state)){
    return {schemaVersion:15,savedAt:value.savedAt,state:withEquipmentLoadout(withSkillProgression(withClassState(withSummons(withCharacterProfile(withUniversity(value.state))))))};
  }
  if(value.schemaVersion===8&&looksLikeLegacyStateV8(value.state)){
    return {schemaVersion:15,savedAt:value.savedAt,state:withEquipmentLoadout(withSkillProgression(withClassState(withSummons(withCharacterProfile(value.state)))))};
  }
  if(value.schemaVersion===9&&looksLikeLegacyStateV9(value.state)){
    return {schemaVersion:15,savedAt:value.savedAt,state:withEquipmentLoadout(withSkillProgression(withClassState(withSummons(value.state))))};
  }
  if(value.schemaVersion===10&&looksLikeLegacyStateV10(value.state)){
    return {schemaVersion:15,savedAt:value.savedAt,state:withEquipmentLoadout(withSkillProgression(withClassState(value.state)))};
  }
  if(value.schemaVersion===11&&looksLikeLegacyStateV11(value.state)){
    return {schemaVersion:15,savedAt:value.savedAt,state:withEquipmentLoadout(withSkillProgression(value.state))};
  }
  if(value.schemaVersion===12&&looksLikeLegacyStateV12(value.state)){
    return {
      schemaVersion:15,
      savedAt:value.savedAt,
      state:withEquipmentLoadout({
        ...value.state,
        skillProgression:upgradeSkillProgressionV12(value.state.skillProgression)
      })
    };
  }
  if(value.schemaVersion===13&&looksLikeLegacyStateV13(value.state)){
    return {
      schemaVersion:15,
      savedAt:value.savedAt,
      state:withEquipmentLoadout({
        ...value.state,
        skillProgression:upgradeSkillProgressionV14(value.state.skillProgression)
      })
    };
  }
  if(value.schemaVersion===14&&looksLikeLegacyStateV14(value.state)){
    return {
      schemaVersion:15,
      savedAt:value.savedAt,
      state:{
        ...value.state,
        skillProgression:upgradeSkillProgressionV14(value.state.skillProgression)
      }
    };
  }
  if(value.schemaVersion===15&&looksLikeGameState(value.state)){
    return {schemaVersion:15,savedAt:value.savedAt,state:value.state};
  }
  return null;
}
