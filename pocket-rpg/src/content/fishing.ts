export interface FishDefinition {
  id: string;
  name: string;
  weight: number;
  value: number;
  baseXp: number;
  rareChance: number;
  baseWeight: number;
}

export interface BaitDefinition {
  id: string;
  name: string;
  speciesWeights: Record<string, number>;
  rareMultiplier: number;
}

export const fishDefinitions: Record<string, FishDefinition> = {
  "silver-carp": { id: "silver-carp", name: "Серебряный карась", weight: 1.2, value: 9, baseXp: 18, rareChance: 0.025, baseWeight: 1 },
  "river-perch": { id: "river-perch", name: "Речной окунь", weight: 0.9, value: 7, baseXp: 16, rareChance: 0.02, baseWeight: 1.2 },
  "black-bream": { id: "black-bream", name: "Чёрный лещ", weight: 1.6, value: 18, baseXp: 30, rareChance: 0.012, baseWeight: 0.65 },
  "moon-carp": { id: "moon-carp", name: "Лунный карась", weight: 1.1, value: 35, baseXp: 48, rareChance: 0.008, baseWeight: 0.18 }
};

export const baitDefinitions: Record<string, BaitDefinition> = {
  "bread-bait": { id: "bread-bait", name: "Хлебная наживка", speciesWeights: { "silver-carp": 1.8, "river-perch": 0.7, "black-bream": 1, "moon-carp": 1.1 }, rareMultiplier: 1.03 },
  "worm-bait": { id: "worm-bait", name: "Червь", speciesWeights: { "silver-carp": 0.8, "river-perch": 1.7, "black-bream": 1.25, "moon-carp": 1 }, rareMultiplier: 1.05 }
};
