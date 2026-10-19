import type { SummonCombatState } from '../summons/types.js';
export type CombatStyle='balanced'|'aggressive'|'defensive'|'evasive';

export interface CombatEffectState {
  id:'might'|'focus';
  magnitude:number;
  roundsRemaining:number;
}

export type CombatAction =
  | {type:'attack'}
  | {type:'heal'; amount:number}
  | {type:'stun'}
  | {type:'wait'}
  | {
      type:'magic';
      manaCost:number;
      skillPath:readonly string[];
      effect:{
        id:CombatEffectState['id'];
        magnitude:number;
        rounds:number;
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
}
