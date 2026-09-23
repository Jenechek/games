import type { SeededRng } from "../rng";
import type { GameState } from "../game-state";
import { addSkillXp } from "../progression/skills";
import { carryingCapacity, canStartPeacefulActivity, inventoryMass } from "../items/inventory";
import { itemDefinitions } from "../../content/items";
import { locationDefinitions } from "../../content/locations";
import { baitDefinitions, fishDefinitions } from "../../content/fishing";

function ownsItem(state: GameState, itemId: string): boolean {
  return (state.inventory.stacks[itemId] ?? 0) > 0 || state.inventory.instances.some((item) => item.definitionId === itemId);
}

function fishingRod(state: GameState): { speed: number; quality: number } | null {
  const fishingLevel = state.skills.fishing?.level ?? 0;
  let best: { speed: number; quality: number } | null = null;
  for (const instance of state.inventory.instances) {
    const def = itemDefinitions[instance.definitionId];
    if (!def?.tags?.includes("fishing-tool")) continue;
    const required = def.requirements?.skills?.fishing ?? 0;
    if (fishingLevel < required) continue;
    const candidate = { speed: def.baseStats?.fishingSpeed ?? 0, quality: def.baseStats?.fishingQuality ?? 0 };
    if (!best || candidate.quality + candidate.speed > best.quality + best.speed) best = candidate;
  }
  return best;
}

function bagBonus(state: GameState): number {
  const bagId = state.inventory.equipped.bag;
  if (!bagId) return 0;
  const instance = state.inventory.instances.find((item) => item.instanceId === bagId);
  return instance ? itemDefinitions[instance.definitionId]?.baseStats?.capacity ?? 0 : 0;
}

function cycleDurationMs(state: GameState, rodSpeed: number): number {
  const skill = state.skills.fishing?.level ?? 0;
  const intuition = state.character.attributes.intuition;
  const speed = 1 + skill * 0.01 + Math.max(0, intuition - 10) * 0.005 + rodSpeed;
  return Math.max(1500, Math.round(6000 / speed));
}

export function fishWeightForBait(fishId: string, baitId: string): number {
  const fish = fishDefinitions[fishId];
  const bait = baitDefinitions[baitId];
  if (!fish) return 0;
  return fish.baseWeight * (bait?.speciesWeights[fishId] ?? 1);
}

function chooseFish(pool: string[], baitId: string, rng: SeededRng): string {
  const weights = pool.map((id) => fishWeightForBait(id, baitId));
  const total = weights.reduce((a, b) => a + b, 0);
  let cursor = rng.next() * total;
  for (let i = 0; i < pool.length; i += 1) {
    cursor -= weights[i];
    if (cursor <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function startFishing(state: GameState, baitId: string, now: number): GameState {
  const location = locationDefinitions[state.world.currentLocationId];
  if (!location?.fishPool.length) throw new Error("В этой локации нельзя рыбачить");
  if (!ownsItem(state, baitId) || !baitDefinitions[baitId]) throw new Error("Нужна подходящая наживка");
  const rod = fishingRod(state);
  if (!rod) throw new Error("Нужна удочка");
  const mass = inventoryMass(state.inventory, itemDefinitions);
  const capacity = carryingCapacity(state.character.attributes.strength, state.character.attributes.vitality, bagBonus(state));
  if (!canStartPeacefulActivity(mass, capacity)) throw new Error("Перегруз не позволяет начать рыбалку");
  const duration = cycleDurationMs(state, rod.speed);
  return { ...state, mode: "fishing", fishing: { locationId: location.id, baitId, cycleStartedAt: now, cycleEndsAt: now + duration } };
}

export function stopFishing(state: GameState): GameState {
  return { ...state, mode: "idle", fishing: null };
}

export function advanceFishing(state: GameState, now: number, rng: SeededRng): GameState {
  if (!state.fishing) return state;
  const next: GameState = {
    ...state,
    character: { ...state.character },
    skills: { ...state.skills },
    inventory: { ...state.inventory, stacks: { ...state.inventory.stacks }, instances: [...state.inventory.instances], equipped: { ...state.inventory.equipped } },
    log: [...state.log],
    fishing: { ...state.fishing }
  };
  const rod = fishingRod(next);
  if (!rod) return stopFishing(next);
  const location = locationDefinitions[next.fishing!.locationId];
  let safety = 0;
  while (next.fishing && now >= next.fishing.cycleEndsAt && safety < 1000) {
    safety += 1;
    const fishId = chooseFish(location.fishPool, next.fishing.baitId, rng);
    const fish = fishDefinitions[fishId];
    const bait = baitDefinitions[next.fishing.baitId];
    const luckBonus = Math.max(0, next.character.attributes.luck - 10) * 0.001;
    const skillBonus = (next.skills.fishing?.level ?? 0) * 0.0015;
    const rareChance = Math.min(0.5, fish.rareChance * bait.rareMultiplier + luckBonus + skillBonus + rod.quality * 0.1);
    const rare = rng.chance(rareChance);
    const itemId = rare ? `${fishId}-rare` : fishId;
    next.inventory.stacks[itemId] = (next.inventory.stacks[itemId] ?? 0) + 1;
    const xp = fish.baseXp * (rare ? 2 : 1) * (0.95 + rng.next() * 0.1);
    next.character.xp += xp;
    next.skills.professions = addSkillXp(next.skills.professions ?? { level: 0, xp: 0 }, xp);
    next.skills.fishing = addSkillXp(next.skills.fishing ?? { level: 0, xp: 0 }, xp * 1.65);
    next.log.push(`${rare ? "Редкий улов" : "Улов"}: ${fish.name} (+${xp.toFixed(1)} XP)`);
    const start = next.fishing.cycleEndsAt;
    const duration = cycleDurationMs(next, rod.speed);
    next.fishing = { ...next.fishing, cycleStartedAt: start, cycleEndsAt: start + duration };
  }
  return next;
}
