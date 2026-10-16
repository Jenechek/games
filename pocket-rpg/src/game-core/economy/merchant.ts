import { addSkillXp } from '../progression/skills.js';
import type { EconomyState,PriceQuote,TradePriceContext } from './types.js';

export const PERSONAL_PRESSURE_PER_UNIT=0.05;
export const PERSONAL_PRESSURE_RECOVERY_MS=12*60*60*1000;
export const BASE_SELL_FACTOR=0.72;

const FACTION_RELATION_IDS=['karnholm','ellaria','rivermark','greenwald'] as const;

export function createDefaultEconomyState():EconomyState{
  return {
    trading:{level:0,xp:0},
    pressures:{},
    factionRelations:Object.fromEntries(FACTION_RELATION_IDS.map(id=>[id,0]))
  };
}

function clamp(value:number,min:number,max:number):number{
  return Math.max(min,Math.min(max,value));
}

export function decayedPressureValue(
  value:number,
  updatedAt:number,
  now:number
):number{
  const elapsed=Math.max(0,now-updatedAt);
  const factor=Math.max(0,1-elapsed/PERSONAL_PRESSURE_RECOVERY_MS);
  const decayed=value*factor;
  return Math.abs(decayed)<1e-9?0:decayed;
}

export function personalMarketPressure(
  economy:EconomyState,
  cityId:string,
  itemId:string,
  now:number
):number{
  const entry=economy.pressures[cityId]?.[itemId];
  return entry?decayedPressureValue(entry.value,entry.updatedAt,now):0;
}

export function tradingAdvantage(tradingLevel:number,charisma:number):number{
  const skill=Math.min(0.08,Math.max(0,tradingLevel)*0.0008);
  const charismaBonus=Math.min(0.04,Math.max(0,charisma-10)*0.002);
  return skill+charismaBonus;
}

export function factionPriceBonus(relation:number):number{
  return clamp(relation,-100,100)*0.0005;
}

function marketUnitMultiplier(pressure:number):number{
  return clamp(1+pressure,0.75,2.5);
}

function roundGold(value:number):number{
  return Math.round(value*100)/100;
}

function roundPressure(value:number):number{
  return Math.round(value*10000)/10000;
}

export function quoteBuy(context:TradePriceContext,pressure:number):PriceQuote{
  const quantity=Math.max(1,Math.floor(context.quantity));
  const advantage=tradingAdvantage(context.tradingLevel,context.charisma);
  const relationBonus=factionPriceBonus(context.factionRelation);
  const unitPrices:number[]=[];
  for(let index=0;index<quantity;index+=1){
    const currentPressure=pressure+index*PERSONAL_PRESSURE_PER_UNIT;
    unitPrices.push(roundGold(
      context.basePrice
      *context.cityMultiplier
      *context.eventMultiplier
      *marketUnitMultiplier(currentPressure)
      *(1-advantage)
      *(1-relationBonus)
    ));
  }
  return {
    unitPrices,
    total:roundGold(unitPrices.reduce((sum,value)=>sum+value,0)),
    pressureBefore:pressure,
    pressureAfter:roundPressure(clamp(pressure+quantity*PERSONAL_PRESSURE_PER_UNIT,-0.25,1.5))
  };
}

export function quoteSell(context:TradePriceContext,pressure:number):PriceQuote{
  const quantity=Math.max(1,Math.floor(context.quantity));
  const advantage=tradingAdvantage(context.tradingLevel,context.charisma);
  const relationBonus=factionPriceBonus(context.factionRelation);
  const unitPrices:number[]=[];
  for(let index=0;index<quantity;index+=1){
    const currentPressure=pressure-index*PERSONAL_PRESSURE_PER_UNIT;
    unitPrices.push(roundGold(
      context.basePrice
      *context.cityMultiplier
      *context.eventMultiplier
      *marketUnitMultiplier(currentPressure)
      *BASE_SELL_FACTOR
      *(1+advantage)
      *(1+relationBonus)
    ));
  }
  return {
    unitPrices,
    total:roundGold(unitPrices.reduce((sum,value)=>sum+value,0)),
    pressureBefore:pressure,
    pressureAfter:roundPressure(clamp(pressure-quantity*PERSONAL_PRESSURE_PER_UNIT,-0.25,1.5))
  };
}

function withPressure(
  economy:EconomyState,
  cityId:string,
  itemId:string,
  value:number,
  now:number
):EconomyState{
  return {
    ...economy,
    pressures:{
      ...economy.pressures,
      [cityId]:{
        ...(economy.pressures[cityId]??{}),
        [itemId]:{value,updatedAt:now}
      }
    }
  };
}

export function applyBuyPressure(
  economy:EconomyState,
  cityId:string,
  itemId:string,
  quote:PriceQuote,
  now:number
):EconomyState{
  return withPressure(economy,cityId,itemId,quote.pressureAfter,now);
}

export function tradingXpForSale(totalGold:number):number{
  return Math.max(1,totalGold*0.12);
}

export function applySellProgress(
  economy:EconomyState,
  cityId:string,
  itemId:string,
  quote:PriceQuote,
  now:number
):EconomyState{
  const pressured=withPressure(economy,cityId,itemId,quote.pressureAfter,now);
  return {
    ...pressured,
    trading:addSkillXp(pressured.trading,tradingXpForSale(quote.total))
  };
}
