import type { EquipmentInstance } from './equipment.js';
import type { ItemDefinition } from './items.js';

export interface InventoryStack {
  itemId:string;
  quantity:number;
  itemClass?:number;
}

export interface LegacyInventoryState {
  stacks:InventoryStack[];
}

export interface InventoryState extends LegacyInventoryState {
  equipment?:EquipmentInstance[];
}

export function normalizedStackClass(stack:InventoryStack):number{
  return Math.max(1,Math.min(5,Math.floor(stack.itemClass??1)));
}

export function cloneInventory(inventory:InventoryState):InventoryState{
  return {
    stacks:inventory.stacks.map(stack=>({...stack})),
    equipment:(inventory.equipment??[]).map(instance=>({
      ...instance,
      stats:{...instance.stats},
      properties:instance.properties.map(property=>({...property}))
    }))
  };
}

export function addInventoryStack(
  inventory:InventoryState,
  itemId:string,
  quantity:number,
  itemClass=1
):InventoryState{
  if(quantity<=0)return cloneInventory(inventory);
  const next=cloneInventory(inventory);
  const safeClass=Math.max(1,Math.min(5,Math.floor(itemClass)));
  const existing=next.stacks.find(stack=>stack.itemId===itemId&&normalizedStackClass(stack)===safeClass);
  if(existing)existing.quantity+=quantity;
  else next.stacks.push(safeClass===1?{itemId,quantity}:{itemId,quantity,itemClass:safeClass});
  return next;
}

export function removeInventoryStack(
  inventory:InventoryState,
  itemId:string,
  quantity:number,
  itemClass?:number
):InventoryState{
  if(quantity<=0)return cloneInventory(inventory);
  const next=cloneInventory(inventory);
  let remaining=quantity;
  const candidates=next.stacks
    .map((stack,index)=>({stack,index}))
    .filter(({stack})=>stack.itemId===itemId&&(itemClass===undefined||normalizedStackClass(stack)===itemClass))
    .sort((a,b)=>normalizedStackClass(a.stack)-normalizedStackClass(b.stack));

  for(const {stack} of candidates){
    const taken=Math.min(stack.quantity,remaining);
    stack.quantity-=taken;
    remaining-=taken;
    if(remaining<=0)break;
  }
  if(remaining>0)throw new Error('not enough items');
  next.stacks=next.stacks.filter(stack=>stack.quantity>0);
  return next;
}

export function inventoryMass(inventory:InventoryState, defs:Record<string,ItemDefinition>):number {
  const stackMass=inventory.stacks.reduce((sum,stack)=>sum+(defs[stack.itemId]?.weight ?? 0)*stack.quantity,0);
  const equipmentMass=(inventory.equipment??[]).reduce((sum,instance)=>sum+(defs[instance.itemId]?.weight??0),0);
  return stackMass+equipmentMass;
}

export function carryingCapacity(attributes:{strength:number; vitality:number}, bagBonus:number):number {
  return attributes.strength*3 + attributes.vitality*2 + bagBonus;
}

export function overloadRatio(mass:number, capacity:number):number {
  return capacity<=0 ? Infinity : mass/capacity;
}

export function combatEfficiencyMultiplier(ratio:number):number {
  return ratio<=1 ? 1 : Math.max(0,1-(ratio-1));
}

export function canStartPeacefulActivity(mass:number,capacity:number):boolean {
  return overloadRatio(mass,capacity)<1.2;
}
