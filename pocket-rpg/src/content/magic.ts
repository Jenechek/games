export const ARCANE_FOCUS_SKILL_PATH=[
  'magic',
  'arcane',
  'concentration',
  'arcane-focus'
] as const;

export const ARCANE_MEND_SKILL_PATH=[
  'magic',
  'restoration',
  'healing',
  'arcane-mend'
] as const;

export const ARCANE_WARD_SKILL_PATH=[
  'magic',
  'protection',
  'warding',
  'arcane-ward'
] as const;

export type MagicSpellId='arcane-focus'|'arcane-mend'|'arcane-ward';

export type MagicSpellEffect =
  | {
      kind:'buff';
      effectId:'focus'|'ward';
      baseMagnitude:number;
      durationRounds:number;
    }
  | {
      kind:'heal';
      baseAmount:number;
    };

export interface MagicSpellDefinition {
  id:MagicSpellId;
  label:string;
  manaCost:number;
  requiredMagicLevel:0|10|20;
  skillPath:readonly string[];
  effect:MagicSpellEffect;
}

export const magicSpells:Record<MagicSpellId,MagicSpellDefinition>={
  'arcane-focus':{
    id:'arcane-focus',
    label:'Магический фокус',
    manaCost:20,
    requiredMagicLevel:0,
    skillPath:ARCANE_FOCUS_SKILL_PATH,
    effect:{
      kind:'buff',
      effectId:'focus',
      baseMagnitude:0.08,
      durationRounds:3
    }
  },
  'arcane-mend':{
    id:'arcane-mend',
    label:'Магическое лечение',
    manaCost:35,
    requiredMagicLevel:10,
    skillPath:ARCANE_MEND_SKILL_PATH,
    effect:{
      kind:'heal',
      baseAmount:25
    }
  },
  'arcane-ward':{
    id:'arcane-ward',
    label:'Магический барьер',
    manaCost:30,
    requiredMagicLevel:20,
    skillPath:ARCANE_WARD_SKILL_PATH,
    effect:{
      kind:'buff',
      effectId:'ward',
      baseMagnitude:0.10,
      durationRounds:3
    }
  }
};

export const arcaneFocusSpell=magicSpells['arcane-focus'];
export const arcaneMendSpell=magicSpells['arcane-mend'];
export const arcaneWardSpell=magicSpells['arcane-ward'];

export function isMagicSpellUnlocked(
  spell:MagicSpellDefinition,
  magicLevel:number
):boolean{
  return magicLevel>=spell.requiredMagicLevel;
}
