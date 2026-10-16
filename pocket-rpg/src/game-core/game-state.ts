import type { AttributeId } from './types.js';
import type { AttributeProfile } from './progression/character.js';
import type { InventoryState,LegacyInventoryState } from './items/inventory.js';
import type { WorldState } from './world/travel.js';
import { advanceWorldTime } from './world/travel.js';
import type { InjuryState } from './injuries/types.js';
import { reconstructRecovery } from './injuries/defeat.js';
import type { FarmingState } from './peaceful/farming/types.js';
import type { GatheringState } from './peaceful/gathering/types.js';
import type { CraftingState } from './crafting/types.js';
import type { EconomyState } from './economy/types.js';
import type { DiplomacyState } from './diplomacy/types.js';
import type { UniversityState } from './university/types.js';
import { resolveRetraining } from './university/retraining.js';

export interface LegacyCharacterPersistentState {
  level:number;
  xp:number;
  gold:number;
}

export interface LegacyCharacterPersistentStateV8 extends LegacyCharacterPersistentState {
  attributes:Record<AttributeId,number>;
}

export interface CharacterPersistentState extends LegacyCharacterPersistentStateV8 {
  attributeXp:AttributeProfile;
}

export interface LegacyGameStateV1 {
  character:LegacyCharacterPersistentState;
  world:WorldState;
  inventory:LegacyInventoryState;
}
export interface LegacyGameStateV2 extends LegacyGameStateV1 {injuries:InjuryState;}
export interface LegacyGameStateV3 extends LegacyGameStateV2 {farming:FarmingState;}
export interface LegacyGameStateV4 extends LegacyGameStateV3 {gathering:GatheringState;}
export interface LegacyGameStateV5 extends LegacyGameStateV4 {
  inventory:InventoryState;
  crafting:CraftingState;
}
export interface LegacyGameStateV6 extends LegacyGameStateV5 {economy:EconomyState;}
export interface LegacyGameStateV7 extends LegacyGameStateV6 {diplomacy:DiplomacyState;}
export interface LegacyGameStateV8 extends LegacyGameStateV7 {
  character:LegacyCharacterPersistentStateV8;
  university:UniversityState;
}
export interface GameState extends LegacyGameStateV8 {
  character:CharacterPersistentState;
}

export function reconstructState(state:GameState,now:number):GameState{
  const retraining=resolveRetraining({
    state:state.university,
    attributes:state.character.attributes,
    now
  });
  return {
    ...state,
    character:{...state.character,attributes:retraining.attributes},
    university:retraining.state,
    world:advanceWorldTime(state.world,now),
    injuries:reconstructRecovery(state.injuries,now)
  };
}
