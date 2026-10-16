import { cleanInjuryState } from '../game-core/injuries/injuries.js';
import { BODY_ZONES, type InjuryState } from '../game-core/injuries/types.js';
import type { GameState, LegacyGameStateV1 } from '../game-core/game-state.js';
import type { SaveEnvelopeV2 } from './schema.js';

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
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
  return isObject(value.character) && isObject(value.world) && isObject(value.inventory);
}

function looksLikeGameState(value: unknown): value is GameState {
  if (!looksLikeLegacyState(value)) return false;
  return looksLikeInjuryState(value.injuries);
}

export function migrateSave(value: unknown): SaveEnvelopeV2 | null {
  if (!isObject(value) || typeof value.savedAt !== 'number' || !Number.isFinite(value.savedAt)) return null;

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
