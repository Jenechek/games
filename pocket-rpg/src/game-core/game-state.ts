import type { InventoryState } from './items/inventory.js';
import type { WorldState } from './world/travel.js';
import { advanceWorldTime } from './world/travel.js';
import type { InjuryState } from './injuries/types.js';
import { reconstructRecovery } from './injuries/defeat.js';
import type { FarmingState } from './peaceful/farming/types.js';
import type { GatheringState } from './peaceful/gathering/types.js';

export interface CharacterPersistentState {
  level:number;
  xp:number;
  gold:number;
}

export interface LegacyGameStateV1 {
  character:CharacterPersistentState;
  world:WorldState;
  inventory:InventoryState;
}

export interface LegacyGameStateV2 extends LegacyGameStateV1 {
  injuries:InjuryState;
}

export interface LegacyGameStateV3 extends LegacyGameStateV2 {
  farming:FarmingState;
}

export interface GameState extends LegacyGameStateV3 {
  gathering:GatheringState;
}

export function reconstructState(state:GameState,now:number):GameState{
  return {
    ...state,
    world:advanceWorldTime(state.world,now),
    injuries:reconstructRecovery(state.injuries,now)
  };
}
