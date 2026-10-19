export const ARCANE_FOCUS_SKILL_PATH=[
  'magic',
  'arcane',
  'concentration',
  'arcane-focus'
] as const;

export const arcaneFocusSpell={
  id:'arcane-focus',
  label:'Магический фокус',
  manaCost:20,
  baseMagnitude:0.08,
  durationRounds:3,
  skillPath:ARCANE_FOCUS_SKILL_PATH
} as const;
