import type { ItemDefinition } from './items.js';
export type ItemInstanceRarity='common'|'quality'|'rare'|'epic';
export type ItemUpgradeLevel=0|1|2|3|4|5;
export interface ItemInstance {
  instanceId:string;
  baseItemId:string;
  rarity:ItemInstanceRarity;
  upgradeLevel:ItemUpgradeLevel;
  properties:string[];
}
export interface InventoryStack { itemId:string; quantity:number; }
export interface InventoryState {
  stacks:InventoryStack[];
  instances?:ItemInstance[];
}
export function inventoryMass(inventory:InventoryState,defs:Record<string,ItemDefinition>):number {
  const stackMass=inventory.stacks.reduce((sum,stack)=>sum+(defs[stack.itemId]?.weight??0)*stack.quantity,0);
  const instanceMass=(inventory.instances??[]).reduce((sum,item)=>sum+(defs[item.baseItemId]?.weight??0),0);
  return stackMass+instanceMass;
}
export function carryingCapacity(attributes:{strength:number; vitality:number},bagBonus:number):number { return attributes.strength*3+attributes.vitality*2+bagBonus; }
export function overloadRatio(mass:number,capacity:number):number { return capacity<=0?Infinity:mass/capacity; }
export function combatEfficiencyMultiplier(ratio:number):number { return ratio<=1?1:Math.max(0,1-(ratio-1)); }
export function canStartPeacefulActivity(mass:number,capacity:number):boolean { return overloadRatio(mass,capacity)<1.2; }
