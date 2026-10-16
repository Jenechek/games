export type SummonRole='guardian'|'striker'|'support';

export interface SummonDefinition {
  id:string;
  label:string;
  role:SummonRole;
  maxHp:number;
  maxStamina:number;
  damage:number;
  accuracy:number;
  evasion:number;
  interceptChance:number;
  attackStaminaCost:number;
  staminaRecoveryPerRound:number;
  passiveImmunities:string[];
}

export interface SummonInstanceState {
  instanceId:string;
  definitionId:string;
  hp:number;
  stamina:number;
  summonedAt:number;
  recoveryUpdatedAt:number;
}

export interface SummonRosterState {
  active:SummonInstanceState[];
  nextInstanceId:number;
}

export interface SummonCombatState extends SummonInstanceState {
  maxHp:number;
  maxStamina:number;
  damage:number;
  accuracy:number;
  evasion:number;
  interceptChance:number;
  attackStaminaCost:number;
  staminaRecoveryPerRound:number;
  role:SummonRole;
  passiveImmunities:string[];
}

export interface SummonAttackResult {
  instanceId:string;
  hit:boolean;
  damage:number;
}
