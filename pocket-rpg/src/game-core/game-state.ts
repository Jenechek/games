import type { InventoryState,LegacyInventoryState } from './items/inventory.js';
import type { WorldState } from './world/travel.js';
import { advanceWorldTime } from './world/travel.js';
import type { InjuryState } from './injuries/types.js';
import { reconstructRecovery } from './injuries/defeat.js';
import type { FarmingState } from './peaceful/farming/types.js';
import type { GatheringState } from './peaceful/gathering/types.js';
import type { CraftingState } from './crafting/types.js';
import type { EconomyState } from './economy/types.js';

export interface CharacterPersistentState {
  level:number;
  xp:number;
  gold:number;
}

export interface LegacyGameStateV1 {
  character:CharacterPersistentState;
  world:WorldState;
  inventory:LegacyInventoryState;
}

export interface LegacyGameStateV2 extends LegacyGameStateV1 {
  injuries:InjuryState;
}

export interface LegacyGameStateV3 extends LegacyGameStateV2 {
  farming:FarmingState;
}

export interface LegacyGameStateV4 extends LegacyGameStateV3 {
  gathering:GatheringState;
}

export interface LegacyGameStateV5 extends LegacyGameStateV4 {
  inventory:InventoryState;
  crafting:CraftingState;
}

export interface GameState extends LegacyGameStateV5 {
  economy:EconomyState;
}

export function reconstructState(state:GameState,now:number):GameState{
  return {
    ...state,
    world:advanceWorldTime(state.world,now),
    injuries:reconstructRecovery(state.injuries,now)
  };
}
