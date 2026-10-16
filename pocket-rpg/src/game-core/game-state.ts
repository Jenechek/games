import type { InventoryState } from './items/inventory.js';
import type { WorldState } from './world/travel.js';
import { advanceWorldTime } from './world/travel.js';
import type { InjuryState } from './injuries/types.js';
import { reconstructRecovery } from './injuries/defeat.js';

export interface CharacterPersistentState {
  level: number;
  xp: number;
  gold: number;
}

export interface GameState {
  character: CharacterPersistentState;
  world: WorldState;
  inventory: InventoryState;
  injuries: InjuryState;
}

export type LegacyGameStateV1 = Omit<GameState, 'injuries'>;

export function reconstructState(state: GameState, now: number): GameState {
  return {
    ...state,
    world: advanceWorldTime(state.world, now),
    injuries: reconstructRecovery(state.injuries, now)
  };
}
