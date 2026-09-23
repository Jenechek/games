export interface EnemyDefinition {
  id: string;
  name: string;
  level: number;
  maxHealth: number;
  maxMana: number;
  maxStamina: number;
  damage: number;
  accuracy: number;
  evasion: number;
  style: "aggressive" | "balanced" | "defensive" | "magical";
  gold: [number, number];
  habitats: string[];
}

export const enemyDefinitions: Record<string, EnemyDefinition> = {
  "young-wolf": { id: "young-wolf", name: "Молодой волк", level: 2, maxHealth: 55, maxMana: 0, maxStamina: 70, damage: 7, accuracy: 0.72, evasion: 0.12, style: "aggressive", gold: [1, 4], habitats: ["meadow", "forest-edge", "dark-forest"] },
  bandit: { id: "bandit", name: "Разбойник", level: 4, maxHealth: 80, maxMana: 0, maxStamina: 80, damage: 10, accuracy: 0.76, evasion: 0.08, style: "balanced", gold: [5, 12], habitats: ["forest-edge", "dark-forest"] },
  "old-treant": { id: "old-treant", name: "Старый древень", level: 7, maxHealth: 145, maxMana: 20, maxStamina: 90, damage: 14, accuracy: 0.68, evasion: 0.02, style: "defensive", gold: [8, 18], habitats: ["dark-forest"] }
};
