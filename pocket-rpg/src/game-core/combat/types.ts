import type { SummonCombatState } from '../summons/types.js';
export type MagicDamageType='arcane'|'fire'|'frost';
export type CombatStyle='balanced'|'aggressive'|'defensive'|'evasive';

export interface CombatEffectState {
  id:'might'|'focus'|'ward'|'burn'|'chill'|'spellblade';
  magnitude:number;
  roundsRemaining:number;
}

export type CombatAction =
  | {type:'class-ability';staminaCost:number;effect:'strike'|'guard'|'heal'|'focus';power:number}
  | {type:'attack'}
  | {type:'heal'; amount:number}
  | {type:'stun'}
  | {type:'wait'}
  | {
      type:'magic';
      manaCost:number;
      spellblade?:boolean;
      skillPath:readonly string[];
      effect:
        | {
            kind:'buff';
            id:CombatEffectState['id'];
            magnitude:number;
            rounds:number;
          }
        | {
            kind:'heal';
            amount:number;
          }
        | {
            kind:'damage';
            amount:number;
            damageType?:MagicDamageType;
          };
    };

export interface CombatantState {
  id:string;
  hp:number;
  maxHp:number;
  mana:number;
  maxMana:number;
  stamina:number;
  maxStamina:number;
  stunned:boolean;
  shieldBlock:number;
  parry:number;
  evasion:number;
  accuracy:number;
  damage:number;
  damageMitigation?:number;
  magicResistance?:number;
  elementalResistances?:Partial<Record<MagicDamageType,number>>;
  style?:CombatStyle;
  hasShield?:boolean;
  toxicity?:number;
  effects?:CombatEffectState[];
}

export interface CombatState { player:CombatantState; enemy:CombatantState; round:number; summons?:SummonCombatState[]; }
export interface ActionSelection { main?:CombatAction; additional?:CombatAction; style?:CombatStyle; }
export interface RoundSelections { player:ActionSelection; enemy:ActionSelection; }
export interface CombatLogEntry {
  phase:'player-additional'|'enemy-additional'|'player-main'|'summon-main'|'enemy-main';
  action:string;
  actorId?:string;
  success?:boolean;
  damage?:number;
  magicSkillPath?:readonly string[];
  magicEffectApplied?:boolean;
  statusDamage?:number;
}
