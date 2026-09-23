import type { SeededRng } from "../rng";
import { locationDefinitions } from "../../content/locations";
import type { WorldState } from "./world";

export function createWorldState(): WorldState {
  return { currentLocationId: "tillanium", visitedLocationIds: ["tillanium"], travel: null, arrivalCount: 0 };
}

export function startTravel(
  world: WorldState,
  destinationId: string,
  now: number,
  rng: SeededRng,
  overload = 1
): WorldState {
  if (world.travel) throw new Error("travel already active");
  const current = locationDefinitions[world.currentLocationId];
  if (!current?.connections.includes(destinationId)) throw new Error("destination is not adjacent");
  const baseSeconds = rng.int(4, 8);
  const durationMs = Math.round(baseSeconds * 1000 * Math.max(1, overload));
  return {
    ...world,
    travel: { fromLocationId: world.currentLocationId, toLocationId: destinationId, startedAt: now, arrivesAt: now + durationMs }
  };
}

export function advanceWorldTime(world: WorldState, now: number): WorldState {
  if (!world.travel || now < world.travel.arrivesAt) return world;
  const destination = world.travel.toLocationId;
  return {
    ...world,
    currentLocationId: destination,
    visitedLocationIds: world.visitedLocationIds.includes(destination)
      ? world.visitedLocationIds
      : [...world.visitedLocationIds, destination],
    travel: null,
    arrivalCount: world.arrivalCount + 1
  };
}

export function rollLocationEncounter(locationId: string, rng: SeededRng): string | null {
  const location = locationDefinitions[locationId];
  if (!location || location.monsterPool.length === 0 || !rng.chance(location.encounterChance)) return null;
  return location.monsterPool[rng.int(0, location.monsterPool.length - 1)] ?? null;
}
