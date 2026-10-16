import type { InventoryState } from '../items/inventory.js';
import { addInventoryStack,removeInventoryStack } from '../items/inventory.js';

export interface MarketState { gold:number; inventory:InventoryState; pressure:Record<string,number>; pressureUpdatedAt:number; }

export function decayPersonalMarketPressure(state:MarketState,now:number):MarketState {
  const elapsed=Math.max(0,now-state.pressureUpdatedAt);
  const factor=Math.max(0,1-elapsed/(12*60*60*1000));
  const pressure=Object.fromEntries(Object.entries(state.pressure).map(([k,v])=>[k,v*factor]));
  return {...state,pressure,pressureUpdatedAt:now};
}

export function buyItem(state:MarketState,itemId:string,quantity:number,now:number,basePrice:number):MarketState {
  const current=decayPersonalMarketPressure(state,now);
  let cost=0;
  const start=current.pressure[itemId]??0;
  for(let i=0;i<quantity;i++) cost+=basePrice*(1+start+i*.05);
  if(current.gold<cost) throw new Error('not enough gold');
  return {
    ...current,
    gold:current.gold-cost,
    inventory:addInventoryStack(current.inventory,itemId,quantity,1),
    pressure:{...current.pressure,[itemId]:start+quantity*.05},
    pressureUpdatedAt:now
  };
}

export function sellItem(state:MarketState,itemId:string,quantity:number,now:number,basePrice:number):MarketState {
  const current=decayPersonalMarketPressure(state,now);
  const p=current.pressure[itemId]??0;
  const buyback=basePrice*.7*Math.max(.1,1+p*.25);
  return {
    ...current,
    gold:current.gold+buyback*quantity,
    inventory:removeInventoryStack(current.inventory,itemId,quantity),
    pressure:{...current.pressure,[itemId]:p-quantity*.05},
    pressureUpdatedAt:now
  };
}
