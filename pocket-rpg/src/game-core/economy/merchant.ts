import type { GameState } from "../game-state";
import { itemDefinitions } from "../../content/items";
import { cityDefinitions } from "../../content/cities";
import { merchantDefinitions } from "../../content/merchants";

export interface MarketPressure {
  multiplier: number;
  updatedAt: number;
}

export interface MarketState {
  pressure: Record<string, MarketPressure>;
}

export function createMarketState(): MarketState {
  return { pressure: {} };
}

function key(cityId: string, itemId: string): string {
  return `${cityId}:${itemId}`;
}

const NORMALIZE_MS = 3 * 60 * 60 * 1000;

export function currentMarketMultiplier(market: MarketState, cityId: string, itemId: string, now: number): number {
  const entry = market.pressure[key(cityId, itemId)];
  if (!entry) return 1;
  const elapsed = Math.max(0, now - entry.updatedAt);
  const t = Math.min(1, elapsed / NORMALIZE_MS);
  return 1 + (entry.multiplier - 1) * (1 - t);
}

function withPressure(market: MarketState, cityId: string, itemId: string, multiplier: number, now: number): MarketState {
  return { pressure: { ...market.pressure, [key(cityId, itemId)]: { multiplier, updatedAt: now } } };
}

function merchantForCity(cityId: string) {
  return Object.values(merchantDefinitions).find((merchant) => merchant.cityId === cityId);
}

function baseLocalPrice(cityId: string, itemId: string): number {
  const item = itemDefinitions[itemId];
  const city = cityDefinitions[cityId];
  if (!item || !city) throw new Error("Неизвестный товар или город");
  return item.basePrice * city.basePriceMultiplier;
}

export function buyItem(
  state: GameState,
  market: MarketState,
  cityId: string,
  itemId: string,
  quantity: number,
  now: number
): { state: GameState; market: MarketState; spent: number } {
  const merchant = merchantForCity(cityId);
  if (!merchant?.sells.includes(itemId)) throw new Error("Товар не продаётся в этом городе");
  const count = Math.max(1, Math.floor(quantity));
  let pressure = currentMarketMultiplier(market, cityId, itemId, now);
  let spent = 0;
  for (let i = 0; i < count; i += 1) {
    spent += Math.ceil(baseLocalPrice(cityId, itemId) * pressure * 1.15);
    pressure *= 1.05;
  }
  if (state.gold < spent) throw new Error("Недостаточно золота");
  const item = itemDefinitions[itemId];
  const next: GameState = { ...state, gold: state.gold - spent, inventory: { ...state.inventory, stacks: { ...state.inventory.stacks }, instances: [...state.inventory.instances], equipped: { ...state.inventory.equipped } } };
  if (item.stackable) next.inventory.stacks[itemId] = (next.inventory.stacks[itemId] ?? 0) + count;
  else {
    for (let i = 0; i < count; i += 1) {
      next.inventory.instances.push({ instanceId: `shop-${itemId}-${now}-${i}`, definitionId: itemId, rarity: "common", upgradeLevel: 0, statRoll: 1, properties: [] });
    }
  }
  return { state: next, market: withPressure(market, cityId, itemId, pressure, now), spent };
}

export function sellStack(
  state: GameState,
  market: MarketState,
  cityId: string,
  itemId: string,
  quantity: number,
  now: number
): { state: GameState; market: MarketState; earned: number } {
  const count = Math.max(1, Math.floor(quantity));
  if ((state.inventory.stacks[itemId] ?? 0) < count) throw new Error("Недостаточно товара");
  let pressure = currentMarketMultiplier(market, cityId, itemId, now);
  let earned = 0;
  for (let i = 0; i < count; i += 1) {
    earned += Math.floor(baseLocalPrice(cityId, itemId) * pressure * 0.75);
    pressure /= 1.05;
  }
  const next: GameState = { ...state, gold: state.gold + earned, inventory: { ...state.inventory, stacks: { ...state.inventory.stacks }, instances: [...state.inventory.instances], equipped: { ...state.inventory.equipped } } };
  next.inventory.stacks[itemId] -= count;
  return { state: next, market: withPressure(market, cityId, itemId, pressure, now), earned };
}

export function decayPersonalMarketPressure(market: MarketState, now: number): MarketState {
  const pressure: Record<string, MarketPressure> = {};
  for (const [entryKey, entry] of Object.entries(market.pressure)) {
    const [cityId, ...rest] = entryKey.split(":");
    const itemId = rest.join(":");
    const multiplier = currentMarketMultiplier(market, cityId, itemId, now);
    if (Math.abs(multiplier - 1) > 0.0001) pressure[entryKey] = { multiplier, updatedAt: now };
  }
  return { pressure };
}
