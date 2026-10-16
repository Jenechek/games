import { cropDefs } from '../../../content/farming.js';
import { addSkillXp } from '../../progression/skills.js';
import type {
  FarmingState,
  FarmingWork,
  FarmField,
  FarmCell,
  RandomSource,
  HarvestResult,
  PlantFieldWork,
  HarvestFieldWork
} from './types.js';

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

export function farmingWorkSpeedMultiplier(
  farmingLevel: number,
  vitality: number,
  wisdom: number
): number {
  return Math.min(
    2,
    1
      + Math.max(0, Math.min(100, farmingLevel)) * 0.005
      + Math.max(0, vitality - 10) * 0.005
      + Math.max(0, wisdom - 10) * 0.005
  );
}

function findField(state: FarmingState, fieldId: string): FarmField {
  const field = state.fields.find(candidate => candidate.id === fieldId);
  if (!field) throw new Error('field not found');
  return field;
}

function cloneState(state: FarmingState): FarmingState {
  return {
    ...state,
    skill: { ...state.skill },
    knownSeedIds: [...state.knownSeedIds],
    fields: state.fields.map(field => ({
      ...field,
      cells: field.cells.map(cell => cell ? { ...cell } : null)
    }))
  };
}

export function startPlanting(
  state: FarmingState,
  fieldId: string,
  cropId: string,
  now: number,
  vitality: number,
  wisdom: number
): PlantFieldWork {
  const field = findField(state, fieldId);
  if (!cropDefs[cropId]) throw new Error('crop not found');
  if (!state.knownSeedIds.includes(cropId)) throw new Error('seed not unlocked');
  if (field.cycleCropId !== null && field.cycleCropId !== cropId) {
    throw new Error('crop cycle locked to another crop');
  }

  const queue = field.cells
    .map((cell, index) => cell === null ? index : -1)
    .filter(index => index >= 0);
  if (queue.length === 0) throw new Error('field has no empty cells');

  const multiplier = farmingWorkSpeedMultiplier(state.skill.level, vitality, wisdom);
  const cellMs = Math.ceil(2_000 / multiplier);
  return {
    type: 'plant',
    locationId: field.locationId,
    fieldId,
    cropId,
    startedAt: now,
    nextAt: now + cellMs,
    cellMs,
    queue
  };
}

export function isCellMature(cell: FarmCell | null, now: number): boolean {
  return cell !== null && now >= cell.maturesAt;
}

export function fieldCellSummary(
  field: FarmField,
  now: number
): {empty:number;growing:number;mature:number} {
  let empty=0;
  let growing=0;
  let mature=0;
  for(const cell of field.cells){
    if(cell===null) empty+=1;
    else if(isCellMature(cell,now)) mature+=1;
    else growing+=1;
  }
  return {empty,growing,mature};
}

export function startHarvesting(
  state: FarmingState,
  fieldId: string,
  now: number,
  vitality: number,
  wisdom: number
): HarvestFieldWork {
  const field = findField(state, fieldId);
  if (!field.cycleCropId) throw new Error('field has no crop cycle');

  const queue = field.cells
    .map((cell, index) => isCellMature(cell, now) ? index : -1)
    .filter(index => index >= 0);
  if (queue.length === 0) throw new Error('field has no mature cells');

  const multiplier = farmingWorkSpeedMultiplier(state.skill.level, vitality, wisdom);
  const cellMs = Math.ceil(1_500 / multiplier);
  return {
    type: 'harvest',
    locationId: field.locationId,
    fieldId,
    startedAt: now,
    nextAt: now + cellMs,
    cellMs,
    queue
  };
}

export function rareCropChance(
  cropId: string,
  farmingLevel: number,
  luck: number,
  gearRareBonus: number
): number {
  const crop = cropDefs[cropId];
  if (!crop) throw new Error('crop not found');
  return Math.min(
    0.5,
    crop.baseRareChance
      + Math.max(0, Math.min(100, farmingLevel)) * 0.0005
      + Math.max(0, luck - 10) * 0.0005
      + Math.max(0, gearRareBonus)
  );
}

export function rollCropYield(
  cropId: string,
  farmingLevel: number,
  rng: Pick<RandomSource, 'next'>
): number {
  const crop = cropDefs[cropId];
  if (!crop) throw new Error('crop not found');
  const level = Math.max(0, Math.min(100, farmingLevel));
  const exponent = 1 / (1 + level / 50);
  const biased = Math.pow(Math.max(0, Math.min(0.999999999, rng.next())), exponent);
  const width = crop.yieldMax - crop.yieldMin + 1;
  return Math.min(crop.yieldMax, crop.yieldMin + Math.floor(biased * width));
}

export function advanceFarmingWork(
  state: FarmingState,
  work: FarmingWork,
  now: number,
  rng: RandomSource,
  luck: number,
  gearRareBonus = 0
): {
  state: FarmingState;
  work: FarmingWork | null;
  harvests: HarvestResult[];
  completedCells: number;
} {
  if (work.type === 'establish') {
    const result = advanceFieldEstablishment(state, work, now);
    return {
      state: result.state,
      work: result.work,
      harvests: [],
      completedCells: result.work === null && now >= work.nextAt ? 1 : 0
    };
  }

  if (now < work.nextAt) {
    return { state, work, harvests: [], completedCells: 0 };
  }

  let nextState = cloneState(state);
  let nextWork: PlantFieldWork | HarvestFieldWork | null = { ...work, queue: [...work.queue] };
  const harvests: HarvestResult[] = [];
  let completedCells = 0;

  while (nextWork && now >= nextWork.nextAt && nextWork.queue.length > 0) {
    const index = nextWork.queue[0];
    const completionAt: number = nextWork.nextAt;
    let field = findField(nextState, nextWork.fieldId);

    if (nextWork.type === 'plant') {
      if (field.cells[index] === null) {
        const crop = cropDefs[nextWork.cropId];
        if (!crop) throw new Error('crop not found');
        field.cycleCropId = field.cycleCropId ?? nextWork.cropId;
        field.cells[index] = {
          plantedAt: completionAt,
          maturesAt: completionAt + crop.growthMs
        };
        nextState = {
          ...nextState,
          skill: addSkillXp(nextState.skill, crop.harvestXp * 0.5)
        };
        nextState = reconcileFieldCapacity(nextState);
        completedCells += 1;
      }
    } else {
      const cropId = field.cycleCropId;
      const cell = field.cells[index];
      if (cropId && cell && isCellMature(cell, completionAt)) {
        const crop = cropDefs[cropId];
        if (!crop) throw new Error('crop not found');
        const quantity = rollCropYield(cropId, nextState.skill.level, rng);
        const rare = rng.chance(
          rareCropChance(cropId, nextState.skill.level, luck, gearRareBonus)
        );
        harvests.push({
          cropId,
          itemId: rare ? `${cropId}-rare` : cropId,
          quantity,
          rare
        });
        field.cells[index] = null;
        nextState = {
          ...nextState,
          skill: addSkillXp(nextState.skill, crop.harvestXp * (rare ? 2 : 1))
        };
        nextState = reconcileFieldCapacity(nextState);
        field = findField(nextState, nextWork.fieldId);
        if (field.cells.every(candidate => candidate === null)) {
          field.cycleCropId = null;
        }
        completedCells += 1;
      }
    }

    const remaining = nextWork.queue.slice(1);
    nextWork = remaining.length === 0
      ? null
      : { ...nextWork, queue: remaining, nextAt: completionAt + nextWork.cellMs };
  }

  return { state: nextState, work: nextWork, harvests, completedCells };
}
