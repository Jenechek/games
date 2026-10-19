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

export const ARCANE_BOLT_SKILL_PATH=['magic','arcane','concentration'] as const;

export type MagicSpellId='arcane-focus'|'arcane-mend'|'arcane-ward'|'arcane-bolt';

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
    }
  | {kind:'damage';baseAmount:number;};

export interface MagicSpellDefinition {
  id:MagicSpellId;
  label:string;
  manaCost:number;
  requiredMagicLevel:0|10|20|35;
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
  'arcane-bolt':{
    id:'arcane-bolt',label:'Арканный импульс',manaCost:25,requiredMagicLevel:35,
    skillPath:ARCANE_BOLT_SKILL_PATH,effect:{kind:'damage',baseAmount:18}
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
export const arcaneBoltSpell=magicSpells['arcane-bolt'];

export function isMagicSpellUnlocked(
  spell:MagicSpellDefinition,
  magicLevel:number
):boolean{
  return magicLevel>=spell.requiredMagicLevel;
}


export interface MagicSpellAvailabilityContext {
  magicLevel:number;
  mana:number;
  hp:number;
  maxHp:number;
}

export function canCastMagicSpell(
  spell:MagicSpellDefinition,
  context:MagicSpellAvailabilityContext
):boolean{
  if(!isMagicSpellUnlocked(spell,context.magicLevel))return false;
  if(context.mana<spell.manaCost)return false;
  if(spell.effect.kind==='heal'&&context.hp>=context.maxHp)return false;
  return true;
}

export interface MageAutoSpellContext extends MagicSpellAvailabilityContext {
  focusRoundsRemaining?:number;
  wardRoundsRemaining?:number;
}

export function chooseMageAutoSpellId(
  context:MageAutoSpellContext
):MagicSpellId|null{
  const hpRatio=context.maxHp>0?context.hp/context.maxHp:1;

  if(
    hpRatio<=0.4
    &&canCastMagicSpell(magicSpells['arcane-mend'],context)
  )return 'arcane-mend';

  if(
    hpRatio<=0.75
    &&(context.wardRoundsRemaining??0)<=1
    &&canCastMagicSpell(magicSpells['arcane-ward'],context)
  )return 'arcane-ward';

  if(
    (context.focusRoundsRemaining??0)<=1
    &&canCastMagicSpell(magicSpells['arcane-focus'],context)
  )return 'arcane-focus';

  if(canCastMagicSpell(magicSpells['arcane-bolt'],context))return 'arcane-bolt';
  return null;
}
