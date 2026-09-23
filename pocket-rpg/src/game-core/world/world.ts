import type { SeededRng } from '../rng.js';
import { locations } from '../../content/locations.js';
export function rollLocationEncounter(locationId:string,rng:SeededRng):string|null {
  const pool=locations[locationId]?.enemies ?? [];
  if(pool.length===0 || !rng.chance(0.2)) return null;
  return pool[rng.int(0,pool.length-1)] ?? null;
}
