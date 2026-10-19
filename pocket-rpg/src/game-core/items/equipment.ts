import type { AttributeId } from '../types.js';
import type { ItemDefinition,ItemRarity } from './items.js';
import type { InventoryState } from './inventory.js';

export interface EquipCharacter { attributes:Record<AttributeId,number>; skills:Record<string,number>; }
export function canEquip(character:EquipCharacter,item:ItemDefinition):{ok:boolean;reasons:string[]} {
  const reasons:string[]=[];
  for(const [key,value] of Object.entries(item.requirements?.attributes ?? {})) if((character.attributes[key as AttributeId] ?? 0) < (value ?? 0)) reasons.push(`attribute:${key}`);
  for(const [key,value] of Object.entries(item.requirements?.skills ?? {})) if((character.skills[key] ?? 0)<value) reasons.push(`skill:${key}`);
  return {ok:reasons.length===0,reasons};
}

export interface EquipmentPropertyRollDefinition {
  id:string;
  label:string;
  stat:string;
  min:number;
  max:number;
}

export type EquipmentPropertySource='inherent'|'upgrade3'|'upgrade5'|'unique';

export interface EquipmentProperty {
  id:string;
  label:string;
  stat:string;
  value:number;
  rerollable:boolean;
  source:EquipmentPropertySource;
  introducedAtUpgrade:number;
}

export interface EquipmentInstance {
  instanceId:string;
  itemId:string;
  itemClass:number;
  rarity:ItemRarity;
  upgradeLevel:number;
  stats:Record<string,number>;
  properties:EquipmentProperty[];
}

export interface EquipmentRandomSource { next():number; }

const RARITY_MULTIPLIERS:Record<ItemRarity,number>={
  common:1,
  quality:1.06,
  rare:1.12,
  epic:1.20,
  unique:1.30
};

function round(value:number):number{
  return Math.round(value*10000)/10000;
}

function safeClass(itemClass:number):number{
  return Math.max(1,Math.min(5,Math.floor(itemClass)));
}

export function equipmentClassMultiplier(itemClass:number):number{
  return 1+(safeClass(itemClass)-1)*0.075;
}

export function rarityStatMultiplier(rarity:ItemRarity):number{
  return RARITY_MULTIPLIERS[rarity];
}

function propertyCountForRarity(rarity:ItemRarity):number{
  if(rarity==='rare'||rarity==='epic')return 1;
  if(rarity==='unique')return 2;
  return 0;
}

function chooseProperty(
  pool:EquipmentPropertyRollDefinition[],
  rng:EquipmentRandomSource,
  excludedIds:Set<string>
):EquipmentPropertyRollDefinition|null{
  const available=pool.filter(def=>!excludedIds.has(def.id));
  const candidates=available.length>0?available:pool;
  if(candidates.length===0)return null;
  const index=Math.min(candidates.length-1,Math.floor(Math.max(0,Math.min(0.999999999,rng.next()))*candidates.length));
  return candidates[index];
}

function rollPropertyValue(def:EquipmentPropertyRollDefinition,rng:EquipmentRandomSource):number{
  const t=Math.max(0,Math.min(0.999999999,rng.next()));
  return round(def.min+(def.max-def.min)*t);
}

export function rollEquipmentProperty(
  pool:EquipmentPropertyRollDefinition[],
  rng:EquipmentRandomSource,
  source:EquipmentPropertySource,
  introducedAtUpgrade:number,
  excludedIds=new Set<string>()
):EquipmentProperty|null{
  const def=chooseProperty(pool,rng,excludedIds);
  if(!def)return null;
  return {
    id:def.id,
    label:def.label,
    stat:def.stat,
    value:rollPropertyValue(def,rng),
    rerollable:source!=='unique',
    source,
    introducedAtUpgrade
  };
}

export function createEquipmentInstance(
  instanceId:string,
  item:ItemDefinition,
  itemClass:number,
  rarity:ItemRarity,
  pool:EquipmentPropertyRollDefinition[],
  rng:EquipmentRandomSource
):EquipmentInstance{
  if(!item.slot)throw new Error('item is not equipment');
  const statMultiplier=equipmentClassMultiplier(itemClass)*rarityStatMultiplier(rarity);
  const stats:Record<string,number>={};
  for(const [key,value] of Object.entries(item.stats??{})){
    const roll=0.97+Math.max(0,Math.min(0.999999999,rng.next()))*0.06;
    stats[key]=round(value*statMultiplier*roll);
  }
  const properties:EquipmentProperty[]=[];
  const propertyCount=rarity==='unique'?0:propertyCountForRarity(rarity);
  for(let i=0;i<propertyCount;i+=1){
    const property=rollEquipmentProperty(pool,rng,'inherent',0,new Set(properties.map(entry=>entry.id)));
    if(property)properties.push(property);
  }
  return {
    instanceId,
    itemId:item.id,
    itemClass:safeClass(itemClass),
    rarity,
    upgradeLevel:0,
    stats,
    properties
  };
}

export function createLegacyEquipmentInstance(
  instanceId:string,
  item:ItemDefinition
):EquipmentInstance{
  if(!item.slot)throw new Error('item is not equipment');
  return {
    instanceId,
    itemId:item.id,
    itemClass:1,
    rarity:item.rarity??'common',
    upgradeLevel:0,
    stats:{...(item.stats??{})},
    properties:[]
  };
}

export function upgradeEquipmentInstance(
  instance:EquipmentInstance,
  pool:EquipmentPropertyRollDefinition[],
  rng:EquipmentRandomSource
):EquipmentInstance{
  if(instance.upgradeLevel>=5)throw new Error('maximum upgrade reached');
  const nextLevel=instance.upgradeLevel+1;
  const stats=Object.fromEntries(Object.entries(instance.stats).map(([key,value])=>[key,round(value*1.25)]));
  const properties=instance.properties.map(property=>({...property,value:round(property.value*1.25)}));
  if(nextLevel===3||nextLevel===5){
    const source:EquipmentPropertySource=nextLevel===3?'upgrade3':'upgrade5';
    const property=rollEquipmentProperty(pool,rng,source,nextLevel,new Set(properties.map(entry=>entry.id)));
    if(property)properties.push(property);
  }
  return {...instance,upgradeLevel:nextLevel,stats,properties};
}

export function rerollEquipmentProperty(
  instance:EquipmentInstance,
  propertyIndex:number,
  pool:EquipmentPropertyRollDefinition[],
  rng:EquipmentRandomSource
):EquipmentInstance{
  const current=instance.properties[propertyIndex];
  if(!current)throw new Error('property not found');
  if(!current.rerollable)throw new Error('property is fixed');

  const excluded=new Set(
    instance.properties
      .filter((_,index)=>index!==propertyIndex)
      .map(property=>property.id)
  );
  const rolled=rollEquipmentProperty(pool,rng,current.source,current.introducedAtUpgrade,excluded);
  if(!rolled)throw new Error('property pool is empty');

  const laterUpgradeCount=Math.max(0,instance.upgradeLevel-current.introducedAtUpgrade);
  const scaledValue=round(rolled.value*(1.25**laterUpgradeCount));
  const properties=instance.properties.map((property,index)=>
    index===propertyIndex?{...rolled,value:scaledValue}:property
  );
  return {...instance,properties};
}


export const EQUIPMENT_SLOTS=['mainHand','offHand','body','bag'] as const;
export type EquipmentSlot=typeof EQUIPMENT_SLOTS[number];
export type EquipmentLoadoutState=Record<EquipmentSlot,string|null>;

export function createDefaultEquipmentLoadout():EquipmentLoadoutState{
  return {mainHand:null,offHand:null,body:null,bag:null};
}

export function isEquipmentSlot(value:unknown):value is EquipmentSlot{
  return typeof value==='string'
    &&(EQUIPMENT_SLOTS as readonly string[]).includes(value);
}

export function equippedInstance(
  loadout:EquipmentLoadoutState,
  inventory:InventoryState,
  slot:EquipmentSlot
):EquipmentInstance|null{
  const id=loadout[slot];
  if(!id)return null;
  return (inventory.equipment??[]).find(instance=>instance.instanceId===id)??null;
}

export function isEquippedInstance(
  loadout:EquipmentLoadoutState,
  instanceId:string
):boolean{
  return EQUIPMENT_SLOTS.some(slot=>loadout[slot]===instanceId);
}

export function equipInstance(args:{
  loadout:EquipmentLoadoutState;
  inventory:InventoryState;
  instanceId:string;
  itemDefs:Record<string,ItemDefinition>;
  character:EquipCharacter;
}):{loadout:EquipmentLoadoutState;slot:EquipmentSlot}{
  const instance=(args.inventory.equipment??[]).find(
    entry=>entry.instanceId===args.instanceId
  );
  if(!instance)throw new Error('equipment not owned');
  const item=args.itemDefs[instance.itemId];
  if(!item||!isEquipmentSlot(item.slot))throw new Error('invalid equipment slot');
  const requirement=canEquip(args.character,item);
  if(!requirement.ok)throw new Error(requirement.reasons.join(','));
  return {
    loadout:{...args.loadout,[item.slot]:instance.instanceId},
    slot:item.slot
  };
}

export function unequipSlot(
  loadout:EquipmentLoadoutState,
  slot:EquipmentSlot
):EquipmentLoadoutState{
  return {...loadout,[slot]:null};
}

export function equipmentStatTotals(
  loadout:EquipmentLoadoutState,
  inventory:InventoryState
):Record<string,number>{
  const totals:Record<string,number>={};
  for(const slot of EQUIPMENT_SLOTS){
    const instance=equippedInstance(loadout,inventory,slot);
    if(!instance)continue;
    for(const [stat,value] of Object.entries(instance.stats)){
      totals[stat]=(totals[stat]??0)+value;
    }
    for(const property of instance.properties){
      totals[property.stat]=(totals[property.stat]??0)+property.value;
    }
  }
  return totals;
}

export function validateEquipmentLoadout(
  loadout:EquipmentLoadoutState,
  inventory:InventoryState,
  itemDefs:Record<string,ItemDefinition>
):boolean{
  const used=new Set<string>();
  for(const slot of EQUIPMENT_SLOTS){
    const id=loadout[slot];
    if(id===null)continue;
    if(typeof id!=='string'||used.has(id))return false;
    const instance=(inventory.equipment??[]).find(entry=>entry.instanceId===id);
    if(!instance)return false;
    const item=itemDefs[instance.itemId];
    if(!item||item.slot!==slot)return false;
    used.add(id);
  }
  return true;
}


export function equipmentStatValues(
  loadout:EquipmentLoadoutState,
  inventory:InventoryState,
  stat:string
):number[]{
  const values:number[]=[];
  for(const slot of EQUIPMENT_SLOTS){
    const instance=equippedInstance(loadout,inventory,slot);
    if(!instance)continue;
    const base=instance.stats[stat];
    if(typeof base==='number')values.push(base);
    for(const property of instance.properties){
      if(property.stat===stat)values.push(property.value);
    }
  }
  return values;
}
