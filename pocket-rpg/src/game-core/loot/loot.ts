import type { SeededRng } from '../rng.js';
import type { InventoryState } from '../items/inventory.js';
export interface LootDropDef { itemId:string; chance:number; }
export interface EnemyLootDef { gold:[number,number]; drops:LootDropDef[]; }
export interface LootItem { itemId:string; quantity:number; }
export interface LootResult { gold:number; items:LootItem[]; }
export function adjustedDropChance(base:number,luck:number):number { const bonus=Math.max(0,luck-10)*0.002; return Math.min(1,base*(1+bonus)); }
export function rollLoot(enemy:EnemyLootDef,character:{luck:number},rng:SeededRng):LootResult {
  const gold=rng.int(enemy.gold[0],enemy.gold[1]); const items:LootItem[]=[];
  for(const drop of enemy.drops) if(rng.chance(adjustedDropChance(drop.chance,character.luck))) items.push({itemId:drop.itemId,quantity:1});
  return {gold,items};
}
export function acceptLootItems(inventory:InventoryState,loot:LootItem[],selectedIds:string[]):InventoryState {
  const stacks=inventory.stacks.map(x=>({...x}));
  for(const item of loot) { if(!selectedIds.includes(item.itemId)) continue; const stack=stacks.find(x=>x.itemId===item.itemId); if(stack) stack.quantity+=item.quantity; else stacks.push({...item}); }
  return {stacks};
}
