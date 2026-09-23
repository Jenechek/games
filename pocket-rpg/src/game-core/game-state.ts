import { createCharacterProgression, type CharacterProgression } from "./progression/character";
import type { SkillState } from "./progression/skills";
import { skills as skillDefinitions } from "../content/skills";
import type { InventoryState } from "./items/inventory";
import { createWorldState, advanceWorldTime } from "./world/travel";
import type { WorldState } from "./world/world";
import type { CombatState } from "./combat/types";
import type { GameMode } from "./types";

export interface GameState {
  character: CharacterProgression;
  skills: Record<string, SkillState>;
  inventory: InventoryState;
  world: WorldState;
  gold: number;
  mode: GameMode;
  combat: CombatState | null;
  fishing: null | { locationId: string; baitId: string; cycleStartedAt: number; cycleEndsAt: number };
  log: string[];
}

export function createInitialGameState(): GameState {
  return {
    character: createCharacterProgression(),
    skills: Object.fromEntries(skillDefinitions.map((skill) => [skill.id, { level: 0, xp: 0 }])),
    inventory: {
      instances: [{ instanceId: "starter-rod", definitionId: "simple-fishing-rod", rarity: "common", upgradeLevel: 0, statRoll: 1, properties: [] }],
      stacks: { "healing-potion": 3 },
      equipped: {}
    },
    world: createWorldState(),
    gold: 50,
    mode: "idle",
    combat: null,
    fishing: null,
    log: ["Вы прибыли в Тилланиум."]
  };
}

export function reconstructState(state: GameState, now: number): GameState {
  const world = advanceWorldTime(state.world, now);
  if (world === state.world) return state;
  return {
    ...state,
    world,
    mode: world.travel ? "travel" : "idle",
    log: [...state.log, `Переход завершён: ${world.currentLocationId}`]
  };
}
