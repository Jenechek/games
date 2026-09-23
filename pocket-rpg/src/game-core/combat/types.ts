export type CombatStyle = "balanced" | "aggressive" | "defensive" | "parrying" | "evasive";
export type CombatPhase = "player-additional" | "enemy-additional" | "player-main" | "enemy-main";

export interface CombatStatus {
  id: string;
  duration: number;
  periodicDamage?: number;
}

export interface CombatantState {
  id: string;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  baseDamage: number;
  accuracy: number;
  evasion: number;
  physicalMitigation: number[];
  shieldFullBlockChance: number;
  hasShield: boolean;
  canParry: boolean;
  parryChance: number;
  style: CombatStyle;
  statuses: CombatStatus[];
  cooldowns: Record<string, number>;
}

export interface CombatState {
  player: CombatantState;
  enemy: CombatantState;
  round: number;
}

export type CombatAction = {
  id: string;
  type: "attack" | "item" | "control" | "heal" | "magic";
  damage?: number;
  heal?: number;
  hitChance?: number;
  status?: string;
  duration?: number;
  manaCost?: number;
  staminaCost?: number;
  cooldown?: number;
  tags?: string[];
  telegraphed?: boolean;
};

export interface RoundSelections {
  playerAdditional?: CombatAction;
  enemyAdditional?: CombatAction;
  playerMain?: CombatAction;
  enemyMain?: CombatAction;
  playerStyle?: CombatStyle;
  enemyStyle?: CombatStyle;
}

export interface CombatLogEntry {
  phase: CombatPhase | "counter" | "periodic";
  actorId: string;
  actionId: string;
  message: string;
}
