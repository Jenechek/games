import type { GameState } from "../game-core/game-state";

export interface SaveEnvelopeV1 {
  schemaVersion: 1;
  savedAt: number;
  state: GameState;
}

export function makeSaveEnvelope(state: GameState, savedAt = Date.now()): SaveEnvelopeV1 {
  return { schemaVersion: 1, savedAt, state };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseSaveEnvelope(value: unknown): SaveEnvelopeV1 | null {
  if (!isRecord(value) || value.schemaVersion !== 1 || typeof value.savedAt !== "number" || !isRecord(value.state)) return null;
  const state = value.state;
  if (!isRecord(state.character) || !isRecord(state.world) || !isRecord(state.inventory) || typeof state.gold !== "number") return null;
  if (typeof state.world.currentLocationId !== "string" || !Array.isArray(state.world.visitedLocationIds)) return null;
  if (!isRecord(state.character.attributes) || typeof state.character.level !== "number" || typeof state.character.xp !== "number") return null;
  return value as unknown as SaveEnvelopeV1;
}
