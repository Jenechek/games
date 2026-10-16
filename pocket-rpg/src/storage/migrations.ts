import { cleanInjuryState } from '../game-core/injuries/injuries.js';
import type { GameState, LegacyGameStateV1 } from '../game-core/game-state.js';
import type { SaveEnvelopeV2 } from './schema.js';

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function looksLikeLegacyState(value: unknown): value is LegacyGameStateV1 {
  if (!isObject(value)) return false;
  return isObject(value.character) && isObject(value.world) && isObject(value.inventory);
}

function looksLikeGameState(value: unknown): value is GameState {
  if (!looksLikeLegacyState(value)) return false;
  return isObject((value as Record<string, unknown>).injuries);
}

export function migrateSave(value: unknown): SaveEnvelopeV2 | null {
  if (!isObject(value) || typeof value.savedAt !== 'number') return null;

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
