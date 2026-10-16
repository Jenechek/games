import type { SkillState } from '../../progression/skills.js';

export interface FarmCell {
  plantedAt: number;
  maturesAt: number;
}

export interface FarmField {
  id: string;
  locationId: string;
  cycleCropId: string | null;
  cells: Array<FarmCell | null>;
}

export interface FarmingState {
  skill: SkillState;
  fields: FarmField[];
  knownSeedIds: string[];
  nextFieldNumber: number;
}

export interface EstablishFieldWork {
  type: 'establish';
  locationId: string;
  startedAt: number;
  nextAt: number;
}

export interface PlantFieldWork {
  type: 'plant';
  locationId: string;
  fieldId: string;
  cropId: string;
  startedAt: number;
  nextAt: number;
  cellMs: number;
  queue: number[];
}

export interface HarvestFieldWork {
  type: 'harvest';
  locationId: string;
  fieldId: string;
  startedAt: number;
  nextAt: number;
  cellMs: number;
  queue: number[];
}

export type FarmingWork = EstablishFieldWork | PlantFieldWork | HarvestFieldWork;

export interface HarvestResult {
  cropId: string;
  itemId: string;
  quantity: number;
  rare: boolean;
}

export interface RandomSource {
  next(): number;
  chance(probability: number): boolean;
}
