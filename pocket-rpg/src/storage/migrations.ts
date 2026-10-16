import { cleanInjuryState } from '../game-core/injuries/injuries.js';
import { BODY_ZONES, type InjuryState } from '../game-core/injuries/types.js';
import type { GameState, LegacyGameStateV1 } from '../game-core/game-state.js';
import type { SaveEnvelopeV2 } from './schema.js';

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isTimestamp(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function looksLikeCharacter(value: unknown): boolean {
  if (!isObject(value)) return false;
  return Number.isInteger(value.level) && (value.level as number) >= 1
    && isFiniteNumber(value.xp) && value.xp >= 0
    && isFiniteNumber(value.gold) && value.gold >= 0;
}

function looksLikeTravel(value: unknown): boolean {
  if (value === null) return true;
  if (!isObject(value)) return false;
  return typeof value.fromId === 'string'
    && typeof value.destinationId === 'string'
    && isFiniteNumber(value.startedAt)
    && isFiniteNumber(value.arrivesAt)
    && value.arrivesAt >= value.startedAt;
}

function looksLikeWorld(value: unknown): boolean {
  if (!isObject(value)) return false;
  return typeof value.locationId === 'string'
    && value.locationId.length > 0
    && Number.isInteger(value.arrivalCount)
    && (value.arrivalCount as number) >= 0
    && looksLikeTravel(value.travel);
}

function looksLikeInventory(value: unknown): boolean {
  if (!isObject(value) || !Array.isArray(value.stacks)) return false;
  return value.stacks.every(stack =>
    isObject(stack)
    && typeof stack.itemId === 'string'
    && stack.itemId.length > 0
    && Number.isInteger(stack.quantity)
    && (stack.quantity as number) > 0
  );
}

function looksLikeInjuryState(value: unknown): value is InjuryState {
  if (!isObject(value) || !isObject(value.severity)) return false;
  if (!isTimestamp(value.unconsciousUntil) || !isTimestamp(value.restUntil)) return false;

  for (const zone of BODY_ZONES) {
    const severity = value.severity[zone];
    if (severity !== 0 && severity !== 1 && severity !== 2 && severity !== 3) return false;
  }
  return true;
}

function looksLikeLegacyState(value: unknown): value is LegacyGameStateV1 {
  if (!isObject(value)) return false;
  return looksLikeCharacter(value.character)
    && looksLikeWorld(value.world)
    && looksLikeInventory(value.inventory);
}

function looksLikeGameState(value: unknown): value is GameState {
  if (!isObject(value)) return false;
  return looksLikeCharacter(value.character)
    && looksLikeWorld(value.world)
    && looksLikeInventory(value.inventory)
    && looksLikeInjuryState(value.injuries);
}

export function migrateSave(value: unknown): SaveEnvelopeV2 | null {
  if (!isObject(value) || !isFiniteNumber(value.savedAt)) return null;

  if (value.schemaVersion === 1 && looksLikeLegacyState(value.state)) {
    return {
      schemaVersion: 2,
      savedAt: value.savedAt,
      state: {
        ...value.state,
        injuries: cleanInjuryState()
      }
    };
  }

  if (value.schemaVersion === 2 && looksLikeGameState(value.state)) {
    return {
      schemaVersion: 2,
      savedAt: value.savedAt,
      state: value.state
    };
  }

  return null;
}
