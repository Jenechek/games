export interface SkillDefinition {
  id: string;
  parentId: string | null;
  depth: 0 | 1 | 2 | 3;
  label: string;
}

export const skills: SkillDefinition[] = [
  { id: "weapons", parentId: null, depth: 0, label: "Оружие" },
  { id: "one-handed", parentId: "weapons", depth: 1, label: "Одноручное оружие" },
  { id: "swords", parentId: "one-handed", depth: 2, label: "Мечи" },
  { id: "short-sword", parentId: "swords", depth: 3, label: "Короткий меч" },
  { id: "armor", parentId: null, depth: 0, label: "Броня" },
  { id: "light-armor", parentId: "armor", depth: 1, label: "Лёгкая броня" },
  { id: "magic", parentId: null, depth: 0, label: "Магия" },
  { id: "professions", parentId: null, depth: 0, label: "Профессии" },
  { id: "fishing", parentId: "professions", depth: 1, label: "Рыбалка" }
];
