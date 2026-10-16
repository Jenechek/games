import type { FarmingState, FarmingWork, FarmField } from './types.js';

const STARTER_SEEDS = ['wheat', 'turnip', 'flax'] as const;

export function fieldSlotLimit(level: number): number {
  const safeLevel = Math.max(0, Math.min(100, Math.floor(level)));
  if (safeLevel >= 100) return 5;
  if (safeLevel >= 80) return 4;
  if (safeLevel >= 50) return 3;
  if (safeLevel >= 20) return 2;
  return 1;
}

export function fieldCellCapacity(level: number): number {
  const safeLevel = Math.max(0, Math.min(100, Math.floor(level)));
  return 4 + Math.floor(safeLevel / 20) * 2;
}

export function createDefaultFarmingState(): FarmingState {
  return {
    skill: { level: 0, xp: 0 },
    fields: [],
    knownSeedIds: [...STARTER_SEEDS],
    nextFieldNumber: 1
  };
}

export function startFieldEstablishment(
  state: FarmingState,
  locationId: string,
  now: number
): FarmingWork {
  if (state.fields.length >= fieldSlotLimit(state.skill.level)) {
    throw new Error('field slot limit reached');
  }
  return {
    type: 'establish',
    locationId,
    startedAt: now,
    nextAt: now + 30_000
  };
}

export function advanceFieldEstablishment(
  state: FarmingState,
  work: FarmingWork,
  now: number
): { state: FarmingState; work: FarmingWork | null } {
  if (work.type !== 'establish' || now < work.nextAt) {
    return { state, work };
  }

  if (state.fields.length >= fieldSlotLimit(state.skill.level)) {
    return { state, work: null };
  }

  const field: FarmField = {
    id: `field-${state.nextFieldNumber}`,
    locationId: work.locationId,
    cycleCropId: null,
    cells: Array.from({ length: fieldCellCapacity(state.skill.level) }, () => null)
  };

  return {
    state: {
      ...state,
      fields: [...state.fields, field],
      nextFieldNumber: state.nextFieldNumber + 1
    },
    work: null
  };
}

export function abandonField(state: FarmingState, fieldId: string): FarmingState {
  return {
    ...state,
    fields: state.fields.filter(field => field.id !== fieldId)
  };
}

export function reconcileFieldCapacity(state: FarmingState): FarmingState {
  const capacity = fieldCellCapacity(state.skill.level);
  let changed = false;

  const fields = state.fields.map(field => {
    if (field.cells.length >= capacity) return field;
    changed = true;
    return {
      ...field,
      cells: [
        ...field.cells,
        ...Array.from({ length: capacity - field.cells.length }, () => null)
      ]
    };
  });

  return changed ? { ...state, fields } : state;
}
