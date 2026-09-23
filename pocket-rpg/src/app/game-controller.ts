import type { AttributeId } from '../game-core/types.js';
import type { SeededRng } from '../game-core/rng.js';
import { startTravel, advanceWorldTime, type WorldState } from '../game-core/world/travel.js';
export interface UiGameState { attributes:Record<AttributeId,number>; world:WorldState; gold:number; }
export function createNewGame():UiGameState { return {attributes:{strength:10,agility:10,intuition:10,vitality:10,wisdom:10,luck:10,charisma:10,intelligence:10},world:{locationId:'tillanium',travel:null,arrivalCount:0},gold:100}; }
export function travelCommand(state:UiGameState,destinationId:string,now:number,rng:SeededRng,loadRatio=1):UiGameState { return {...state,world:{...state.world,travel:startTravel(state.world,destinationId,now,rng,loadRatio)}}; }
export function tickGame(state:UiGameState,now:number):UiGameState { return {...state,world:advanceWorldTime(state.world,now)}; }
