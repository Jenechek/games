import type { AttributeId } from '../game-core/types.js';
import type { SeededRng } from '../game-core/rng.js';
import { startTravel, advanceWorldTime, type WorldState } from '../game-core/world/travel.js';
import type { InjuryState } from '../game-core/injuries/types.js';
import { cleanInjuryState, clearAllInjuries, healInjuries, injuryPenaltySummary, totalInjurySeverity } from '../game-core/injuries/injuries.js';
import { isForcedRest, isRecoveryLocked, isUnconscious, reconstructRecovery } from '../game-core/injuries/defeat.js';
import {
  carryingCapacity,
  inventoryMass,
  overloadRatio,
  type InventoryState
} from '../game-core/items/inventory.js';
import { itemDefs } from '../content/items.js';
import { createDefaultFarmingState } from '../game-core/peaceful/farming/farming.js';
import type { FarmingState, FarmingWork, HarvestResult } from '../game-core/peaceful/farming/types.js';
import { createDefaultGatheringState } from '../game-core/peaceful/gathering/gathering.js';
import type {
  GatheringResult,
  GatheringState
} from '../game-core/peaceful/gathering/types.js';

export interface UiGameState {
  attributes: Record<AttributeId, number>;
  world: WorldState;
  gold: number;
  injuries: InjuryState;
  farming: FarmingState;
  gathering: GatheringState;
}

export type RecoveryActionKind = 'travel' | 'combat' | 'fishing' | 'farming' | 'gathering' | 'merchant' | 'inventory';
export type InterruptingActionKind = 'travel' | 'combat' | 'merchant' | 'inventory';
export type AgricultureKind = 'safe' | 'neutral';
export type InjuryMedicineTier = 'weak' | 'medium' | 'strong';
export type RecoveryView =
  | {kind:'ready'; remainingMs:0}
  | {kind:'unconscious'|'forced-rest'; remainingMs:number};

export interface InjuryMedicineResult {
  ok: boolean;
  reason?: 'combat' | 'unconscious' | 'forced-rest' | 'no-injuries' | 'missing-item';
  inventory: InventoryState;
  injuries: InjuryState;
}

export interface InjuryMedicineAvailability {
  count: number;
  enabled: boolean;
  reason: InjuryMedicineResult['reason'] | null;
}

const MEDICINE_ITEMS: Record<InjuryMedicineTier, string> = {
  weak: 'weak-injury-medicine',
  medium: 'medium-injury-medicine',
  strong: 'strong-injury-medicine'
};

export function createNewGame(): UiGameState {
  return {
    attributes:{strength:10,agility:10,intuition:10,vitality:10,wisdom:10,luck:10,charisma:10,intelligence:10},
    world:{locationId:'tillanium',travel:null,arrivalCount:0},
    gold:100,
    injuries:cleanInjuryState(),
    farming:createDefaultFarmingState(),
    gathering:createDefaultGatheringState()
  };
}

export function getRecoveryView(injuries: InjuryState, now: number): RecoveryView {
  if (isUnconscious(injuries, now)) {
    return {kind:'unconscious',remainingMs:Math.max(0,(injuries.unconsciousUntil ?? now)-now)};
  }
  if (isForcedRest(injuries, now)) {
    return {kind:'forced-rest',remainingMs:Math.max(0,(injuries.restUntil ?? now)-now)};
  }
  return {kind:'ready',remainingMs:0};
}

export function canPerformAction(injuries: InjuryState, action: RecoveryActionKind, now: number): boolean {
  if (action === 'inventory') return true;
  return !isRecoveryLocked(injuries, now);
}

export function currentLoadRatio(
  inventory: InventoryState,
  attributes: {strength:number;vitality:number},
  bagBonus = 0
): number {
  const mass=Math.round(inventoryMass(inventory,itemDefs)*1e9)/1e9;
  return overloadRatio(mass,carryingCapacity(attributes,bagBonus));
}

export type GatheringStartReason='combat'|'farming'|'overload'|'recovery'|null;

export function gatheringStartReason(
  injuries: InjuryState,
  inCombat: boolean,
  hasFarmingWork: boolean,
  loadRatioValue: number,
  now: number
): GatheringStartReason {
  if(inCombat)return 'combat';
  if(hasFarmingWork)return 'farming';
  if(loadRatioValue>=1.2)return 'overload';
  if(!canPerformAction(injuries,'gathering',now))return 'recovery';
  return null;
}

export function canStartGatheringAction(
  injuries: InjuryState,
  inCombat: boolean,
  hasFarmingWork: boolean,
  loadRatioValue: number,
  now: number
): boolean {
  return gatheringStartReason(injuries,inCombat,hasFarmingWork,loadRatioValue,now)===null;
}

export function canStartFishingAction(
  injuries: InjuryState,
  inCombat: boolean,
  hasFarmingWork: boolean,
  loadRatioValue: number,
  now: number
): boolean {
  return !inCombat
    && !hasFarmingWork
    && loadRatioValue < 1.2
    && canPerformAction(injuries,'fishing',now);
}

export function canStartFarmingAction(
  injuries: InjuryState,
  inCombat: boolean,
  loadRatioValue: number,
  now: number
): boolean {
  return !inCombat
    && loadRatioValue < 1.2
    && canPerformAction(injuries,'farming',now);
}

export function canStartFishingWithFarming(farmingWork: FarmingWork | null | undefined): boolean {
  return farmingWork == null;
}

export function shouldInterruptFarmingWork(action: InterruptingActionKind): boolean {
  return action !== 'inventory';
}

export function shouldInterruptGathering(
  action:'travel'|'combat'|'merchant'|'farming'|'fishing'|'inventory'
):boolean{
  return action!=='inventory';
}

export function applyGatheringResults(
  inventory:InventoryState,
  results:GatheringResult[]
):InventoryState{
  if(results.length===0)return inventory;
  const stacks=inventory.stacks.map(stack=>({...stack}));
  for(const result of results){
    const existing=stacks.find(stack=>stack.itemId===result.itemId);
    if(existing)existing.quantity+=result.quantity;
    else stacks.push({itemId:result.itemId,quantity:result.quantity});
  }
  return {...inventory,stacks};
}

export function applyHarvestResults(
  inventory: InventoryState,
  harvests: HarvestResult[]
): InventoryState {
  if (harvests.length === 0) return inventory;
  const stacks = inventory.stacks.map(stack => ({...stack}));
  for (const result of harvests) {
    const existing = stacks.find(stack => stack.itemId === result.itemId);
    if (existing) existing.quantity += result.quantity;
    else stacks.push({itemId:result.itemId,quantity:result.quantity});
  }
  return {...inventory,stacks};
}

export function rollFarmingInterruption(
  agriculture: AgricultureKind | undefined,
  rng: Pick<SeededRng, 'chance'>
): 'young-wolf' | null {
  if (agriculture !== 'neutral') return null;
  return rng.chance(0.02) ? 'young-wolf' : null;
}

export function scaleFarmingAmbushStats(
  maxHp: number,
  damage: number
): {maxHp:number;damage:number} {
  return {
    maxHp:Math.max(1,Math.floor((maxHp*7+5)/10)),
    damage:Math.max(1,Math.floor((damage*7+5)/10))
  };
}

export function getInjuryMedicineAvailability(
  inventory: InventoryState,
  injuries: InjuryState,
  tier: InjuryMedicineTier,
  now: number,
  inCombat: boolean
): InjuryMedicineAvailability {
  const itemId = MEDICINE_ITEMS[tier];
  const count = inventory.stacks.find(entry => entry.itemId === itemId)?.quantity ?? 0;
  let reason: InjuryMedicineAvailability['reason'] = null;

  if (inCombat) reason = 'combat';
  else if (isUnconscious(injuries, now)) reason = 'unconscious';
  else if (isForcedRest(injuries, now) && tier !== 'strong') reason = 'forced-rest';
  else if (totalInjurySeverity(injuries) === 0) reason = 'no-injuries';
  else if (count <= 0) reason = 'missing-item';

  return {count,enabled:reason === null,reason};
}

export function useInjuryMedicine(
  inventory: InventoryState,
  injuries: InjuryState,
  tier: InjuryMedicineTier,
  now: number,
  inCombat: boolean,
  rng: SeededRng
): InjuryMedicineResult {
  const availability = getInjuryMedicineAvailability(inventory, injuries, tier, now, inCombat);
  if (!availability.enabled) {
    return {ok:false,reason:availability.reason ?? undefined,inventory,injuries};
  }

  const itemId = MEDICINE_ITEMS[tier];
  let healed = tier === 'strong'
    ? clearAllInjuries(injuries)
    : healInjuries(injuries, tier === 'weak' ? 2 : 4, rng);

  if (tier === 'strong' && isForcedRest(injuries, now)) {
    healed = {...healed, restUntil:null};
  }

  const stacks = inventory.stacks
    .map(entry => entry.itemId === itemId ? {...entry,quantity:entry.quantity - 1} : {...entry})
    .filter(entry => entry.quantity > 0);

  return {ok:true,inventory:{...inventory,stacks},injuries:healed};
}

export function travelCommand(
  state: UiGameState,
  destinationId: string,
  now: number,
  rng: SeededRng,
  loadRatio = 1
): UiGameState {
  const travelPenalty = injuryPenaltySummary(state.injuries).travelTimeMultiplier;
  const overloadFactor = loadRatio <= 1 ? 1 : loadRatio;
  return {
    ...state,
    world:{
      ...state.world,
      travel:startTravel(state.world,destinationId,now,rng,overloadFactor * travelPenalty)
    }
  };
}

export function tickGame(state: UiGameState, now: number): UiGameState {
  return {
    ...state,
    world:advanceWorldTime(state.world,now),
    injuries:reconstructRecovery(state.injuries,now)
  };
}
