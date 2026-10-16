import { cleanInjuryState } from '../game-core/injuries/injuries.js';
import { BODY_ZONES, type InjuryState } from '../game-core/injuries/types.js';
import {
  createDefaultFarmingState,
  fieldCellCapacity,
  fieldSlotLimit
} from '../game-core/peaceful/farming/farming.js';
import type { FarmingState } from '../game-core/peaceful/farming/types.js';
import type {
  GameState,
  LegacyGameStateV1,
  LegacyGameStateV2
} from '../game-core/game-state.js';
import { cropDefs } from '../content/farming.js';
import type { SaveEnvelopeV3 } from './schema.js';

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

function looksLikeLegacyStateV1(value: unknown): value is LegacyGameStateV1 {
  if (!isObject(value)) return false;
  return looksLikeCharacter(value.character)
    && looksLikeWorld(value.world)
    && looksLikeInventory(value.inventory);
}

function looksLikeLegacyStateV2(value: unknown): value is LegacyGameStateV2 {
  if (!looksLikeLegacyStateV1(value)) return false;
  return looksLikeInjuryState((value as Record<string, unknown>).injuries);
}

function looksLikeFarmCell(value: unknown): boolean {
  if (value === null) return true;
  if (!isObject(value)) return false;
  return isFiniteNumber(value.plantedAt)
    && isFiniteNumber(value.maturesAt)
    && value.maturesAt >= value.plantedAt;
}

function looksLikeFarmingState(value: unknown): value is FarmingState {
  if (!isObject(value) || !isObject(value.skill)) return false;
  if (!Number.isInteger(value.skill.level) || (value.skill.level as number) < 0 || (value.skill.level as number) > 100) return false;
  if (!isFiniteNumber(value.skill.xp) || value.skill.xp < 0) return false;
  if (!Array.isArray(value.knownSeedIds)) return false;
  if (!value.knownSeedIds.every(seed => typeof seed === 'string' && Boolean(cropDefs[seed]))) return false;
  if (new Set(value.knownSeedIds).size !== value.knownSeedIds.length) return false;
  if (!Number.isInteger(value.nextFieldNumber) || (value.nextFieldNumber as number) < 1) return false;
  if (!Array.isArray(value.fields)) return false;

  const level = value.skill.level as number;
  if (value.fields.length > fieldSlotLimit(level)) return false;
  const maxCapacity = fieldCellCapacity(level);
  const ids = new Set<string>();

  for (const field of value.fields) {
    if (!isObject(field)) return false;
    if (typeof field.id !== 'string' || field.id.length === 0 || ids.has(field.id)) return false;
    ids.add(field.id);
    if (typeof field.locationId !== 'string' || field.locationId.length === 0) return false;
    if (field.cycleCropId !== null && (typeof field.cycleCropId !== 'string' || !cropDefs[field.cycleCropId])) return false;
    if (!Array.isArray(field.cells) || field.cells.length < 4 || field.cells.length > maxCapacity) return false;
    if (!field.cells.every(looksLikeFarmCell)) return false;

    const hasCrop = field.cells.some(cell => cell !== null);
    if (hasCrop && field.cycleCropId === null) return false;
    if (!hasCrop && field.cycleCropId !== null) return false;
  }

  return true;
}

function looksLikeGameState(value: unknown): value is GameState {
  if (!looksLikeLegacyStateV2(value)) return false;
  return looksLikeFarmingState((value as Record<string, unknown>).farming);
}

export function migrateSave(value: unknown): SaveEnvelopeV3 | null {
  if (!isObject(value) || !isFiniteNumber(value.savedAt)) return null;

  if (value.schemaVersion === 1 && looksLikeLegacyStateV1(value.state)) {
    return {
      schemaVersion: 3,
      savedAt: value.savedAt,
      state: {
        ...value.state,
        injuries: cleanInjuryState(),
        farming: createDefaultFarmingState()
      }
    };
  }

  if (value.schemaVersion === 2 && looksLikeLegacyStateV2(value.state)) {
    return {
      schemaVersion: 3,
      savedAt: value.savedAt,
      state: {
        ...value.state,
        farming: createDefaultFarmingState()
      }
    };
  }

  if (value.schemaVersion === 3 && looksLikeGameState(value.state)) {
    return {
      schemaVersion: 3,
      savedAt: value.savedAt,
      state: value.state
    };
  }

  return null;
}
