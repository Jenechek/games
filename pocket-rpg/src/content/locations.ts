export interface LocationDefinition {
  id: string;
  name: string;
  connections: string[];
  monsterPool: string[];
  fishPool: string[];
  encounterChance: number;
  tags: string[];
}

export const locationDefinitions: Record<string, LocationDefinition> = {
  tillanium: {
    id: "tillanium", name: "Тилланиум", connections: ["city-gate"], monsterPool: [], fishPool: [], encounterChance: 0, tags: ["city"]
  },
  "city-gate": {
    id: "city-gate", name: "Городские ворота", connections: ["tillanium", "meadow"], monsterPool: [], fishPool: [], encounterChance: 0, tags: ["safe"]
  },
  meadow: {
    id: "meadow", name: "Луг", connections: ["city-gate", "forest-edge"], monsterPool: ["young-wolf"], fishPool: ["silver-carp", "river-perch"], encounterChance: 0.18, tags: ["wild", "water"]
  },
  "forest-edge": {
    id: "forest-edge", name: "Опушка леса", connections: ["meadow", "dark-forest"], monsterPool: ["young-wolf", "bandit"], fishPool: [], encounterChance: 0.25, tags: ["wild"]
  },
  "dark-forest": {
    id: "dark-forest", name: "Тёмный лес", connections: ["forest-edge"], monsterPool: ["young-wolf", "bandit", "old-treant"], fishPool: ["black-bream"], encounterChance: 0.32, tags: ["wild", "dangerous", "water"]
  }
};
