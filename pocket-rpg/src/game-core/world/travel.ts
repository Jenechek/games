import type { SeededRng } from '../rng.js';
export interface TravelState { fromId:string; destinationId:string; startedAt:number; arrivesAt:number; }
export interface WorldState { locationId:string; travel:TravelState|null; arrivalCount:number; }
export function startTravel(world:WorldState,destinationId:string,now:number,rng:SeededRng,loadRatio:number):TravelState {
  const baseSeconds=rng.int(4,8); const multiplier=loadRatio<=1 ? 1 : loadRatio;
  return {fromId:world.locationId,destinationId,startedAt:now,arrivesAt:now+Math.round(baseSeconds*1000*multiplier)};
}
export function advanceWorldTime(world:WorldState,now:number):WorldState {
  if(!world.travel || now<world.travel.arrivesAt) return world;
  return {locationId:world.travel.destinationId,travel:null,arrivalCount:world.arrivalCount+1};
}
