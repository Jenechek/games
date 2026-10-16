import type { SkillState } from '../progression/skills.js';

export interface MarketPressureEntry {
  value:number;
  updatedAt:number;
}

export interface EconomyState {
  trading:SkillState;
  pressures:Record<string,Record<string,MarketPressureEntry>>;
  factionRelations:Record<string,number>;
}

export interface MarketEventDefinition {
  id:string;
  label:string;
  cityId:string;
  phase:number;
  multipliers:Record<string,number>;
}

export interface PriceQuote {
  unitPrices:number[];
  total:number;
  pressureBefore:number;
  pressureAfter:number;
}

export interface TradePriceContext {
  cityId:string;
  itemId:string;
  quantity:number;
  now:number;
  basePrice:number;
  cityMultiplier:number;
  eventMultiplier:number;
  tradingLevel:number;
  charisma:number;
  factionRelation:number;
}
