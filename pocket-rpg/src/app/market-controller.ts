import { cities } from '../content/cities.js';
import {
  activeMarketEvent,
  basePrices,
  cityPriceMultiplier,
  eventPriceMultiplier
} from '../content/economy.js';
import {
  personalMarketPressure,
  quoteBuy,
  quoteSell
} from '../game-core/economy/merchant.js';
import type { EconomyState,PriceQuote,TradePriceContext } from '../game-core/economy/types.js';
import {
  equipmentClassMultiplier,
  rarityStatMultiplier,
  type EquipmentInstance
} from '../game-core/items/equipment.js';

function stackClassMultiplier(itemClass:number):number{
  const safe=Math.max(1,Math.min(5,Math.floor(itemClass)));
  return 1+(safe-1)*0.075;
}

function relationForCity(economy:EconomyState,cityId:string):number{
  const factionId=cities[cityId]?.factionId;
  return factionId?economy.factionRelations[factionId]??0:0;
}

function context(
  economy:EconomyState,
  cityId:string,
  itemId:string,
  quantity:number,
  now:number,
  charisma:number,
  basePrice:number
):TradePriceContext{
  return {
    cityId,
    itemId,
    quantity,
    now,
    basePrice,
    cityMultiplier:cityPriceMultiplier(cityId,itemId),
    eventMultiplier:eventPriceMultiplier(cityId,itemId,now),
    tradingLevel:economy.trading.level,
    charisma,
    factionRelation:relationForCity(economy,cityId)
  };
}

export function stackBuyQuote(
  economy:EconomyState,
  cityId:string,
  itemId:string,
  itemClass:number,
  quantity:number,
  now:number,
  charisma:number
):PriceQuote{
  const base=basePrices[itemId];
  if(!base)throw new Error('item has no market price');
  const pressure=personalMarketPressure(economy,cityId,itemId,now);
  return quoteBuy(
    context(economy,cityId,itemId,quantity,now,charisma,base*stackClassMultiplier(itemClass)),
    pressure
  );
}

export function stackSellQuote(
  economy:EconomyState,
  cityId:string,
  itemId:string,
  itemClass:number,
  quantity:number,
  now:number,
  charisma:number
):PriceQuote{
  const base=basePrices[itemId];
  if(!base)throw new Error('item has no market price');
  const pressure=personalMarketPressure(economy,cityId,itemId,now);
  return quoteSell(
    context(economy,cityId,itemId,quantity,now,charisma,base*stackClassMultiplier(itemClass)),
    pressure
  );
}

export function equipmentSellQuote(
  economy:EconomyState,
  cityId:string,
  instance:EquipmentInstance,
  now:number,
  charisma:number
):PriceQuote{
  const base=basePrices[instance.itemId];
  if(!base)throw new Error('item has no market price');
  const upgradeMultiplier=1.25**instance.upgradeLevel;
  const propertyMultiplier=1+instance.properties.length*0.02;
  const value=base
    *equipmentClassMultiplier(instance.itemClass)
    *rarityStatMultiplier(instance.rarity)
    *upgradeMultiplier
    *propertyMultiplier;
  const pressure=personalMarketPressure(economy,cityId,instance.itemId,now);
  return quoteSell(
    context(economy,cityId,instance.itemId,1,now,charisma,value),
    pressure
  );
}

export function currentMarketEvent(cityId:string,now:number){
  return activeMarketEvent(cityId,now);
}
