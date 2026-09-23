import type { InventoryState } from './items/inventory.js';
import type { WorldState } from './world/travel.js';
import { advanceWorldTime } from './world/travel.js';
export interface GameState { character:{level:number;xp:number;gold:number}; world:WorldState; inventory:InventoryState; }
export function reconstructState(state:GameState,now:number):GameState { return {...state,world:advanceWorldTime(state.world,now)}; }
