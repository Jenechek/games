export type CombatStyle='balanced'|'aggressive'|'defensive'|'evasive';
export type CombatAction = {type:'attack'} | {type:'heal'; amount:number} | {type:'stun'} | {type:'wait'};
export interface CombatantState { id:string; hp:number; maxHp:number; mana:number; maxMana:number; stamina:number; maxStamina:number; stunned:boolean; shieldBlock:number; parry:number; evasion:number; accuracy:number; damage:number; style?:CombatStyle; hasShield?:boolean; }
export interface CombatState { player:CombatantState; enemy:CombatantState; round:number; }
export interface ActionSelection { main?:CombatAction; additional?:CombatAction; style?:CombatStyle; }
export interface RoundSelections { player:ActionSelection; enemy:ActionSelection; }
export interface CombatLogEntry { phase:'player-additional'|'enemy-additional'|'player-main'|'enemy-main'; action:string; }
