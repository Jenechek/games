export interface CropDefinition {
  id: string;
  label: string;
  growthMs: number;
  yieldMin: number;
  yieldMax: number;
  harvestXp: number;
  baseRareChance: number;
  unitWeight: number;
}

export const cropDefs: Record<string, CropDefinition> = {
  wheat: {
    id: 'wheat',
    label: 'Пшеница',
    growthMs: 5 * 60 * 1000,
    yieldMin: 1,
    yieldMax: 3,
    harvestXp: 20,
    baseRareChance: 0.01,
    unitWeight: 0.2
  },
  turnip: {
    id: 'turnip',
    label: 'Репа',
    growthMs: 15 * 60 * 1000,
    yieldMin: 1,
    yieldMax: 2,
    harvestXp: 28,
    baseRareChance: 0.015,
    unitWeight: 0.35
  },
  flax: {
    id: 'flax',
    label: 'Лён',
    growthMs: 30 * 60 * 1000,
    yieldMin: 2,
    yieldMax: 4,
    harvestXp: 36,
    baseRareChance: 0.02,
    unitWeight: 0.15
  }
};
