import type { AttributeId } from '../game-core/types.js';
import type { SeededRng } from '../game-core/rng.js';
import { startTravel, advanceWorldTime, type WorldState } from '../game-core/world/travel.js';
import type { InjuryState } from '../game-core/injuries/types.js';
import { cleanInjuryState, clearAllInjuries, healInjuries, injuryPenaltySummary, totalInjurySeverity } from '../game-core/injuries/injuries.js';
import { isForcedRest, isRecoveryLocked, isUnconscious, reconstructRecovery } from '../game-core/injuries/defeat.js';
import type { InventoryState } from '../game-core/items/inventory.js';

export interface UiGameState {
  attributes: Record<AttributeId, number>;
  world: WorldState;
  gold: number;
  injuries: InjuryState;
}

export type RecoveryActionKind = 'travel' | 'combat' | 'fishing' | 'merchant' | 'inventory';
export type InjuryMedicineTier = 'weak' | 'medium' | 'strong';

export interface InjuryMedicineResult {
  ok: boolean;
  reason?: 'combat' | 'unconscious' | 'forced-rest' | 'no-injuries' | 'missing-item';
  inventory: InventoryState;
  injuries: InjuryState;
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
    injuries:cleanInjuryState()
  };
}

export function canPerformAction(injuries: InjuryState, action: RecoveryActionKind, now: number): boolean {
  if (action === 'inventory') return true;
  return !isRecoveryLocked(injuries, now);
}

export function useInjuryMedicine(
  inventory: InventoryState,
  injuries: InjuryState,
  tier: InjuryMedicineTier,
  now: number,
  inCombat: boolean,
  rng: SeededRng
): InjuryMedicineResult {
  if (inCombat) return {ok:false,reason:'combat',inventory,injuries};
  if (isUnconscious(injuries, now)) return {ok:false,reason:'unconscious',inventory,injuries};
  if (isForcedRest(injuries, now) && tier !== 'strong') return {ok:false,reason:'forced-rest',inventory,injuries};
  if (totalInjurySeverity(injuries) === 0) return {ok:false,reason:'no-injuries',inventory,injuries};

  const itemId = MEDICINE_ITEMS[tier];
  const stack = inventory.stacks.find(entry => entry.itemId === itemId && entry.quantity > 0);
  if (!stack) return {ok:false,reason:'missing-item',inventory,injuries};

  let healed = tier === 'strong'
    ? clearAllInjuries(injuries)
    : healInjuries(injuries, tier === 'weak' ? 2 : 4, rng);

  if (tier === 'strong' && isForcedRest(injuries, now)) {
    healed = {...healed, restUntil:null};
  }

  const stacks = inventory.stacks
    .map(entry => entry.itemId === itemId ? {...entry,quantity:entry.quantity - 1} : {...entry})
    .filter(entry => entry.quantity > 0);

  return {ok:true,inventory:{stacks},injuries:healed};
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
