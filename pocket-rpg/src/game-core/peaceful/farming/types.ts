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

export type FarmingWork = EstablishFieldWork;
