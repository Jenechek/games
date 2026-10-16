import type { SummonDefinition } from '../game-core/summons/types.js';

export const summonDefinitions:Record<string,SummonDefinition>={
  'guardian-elemental':{
    id:'guardian-elemental',
    label:'Защитный элементаль',
    role:'guardian',
    maxHp:90,
    maxStamina:80,
    damage:9,
    accuracy:0.75,
    evasion:0.05,
    interceptChance:1,
    attackStaminaCost:15,
    staminaRecoveryPerRound:12,
    passiveImmunities:['stun']
  },
  'war-beast':{
    id:'war-beast',
    label:'Боевой зверь',
    role:'striker',
    maxHp:70,
    maxStamina:100,
    damage:14,
    accuracy:0.82,
    evasion:0.10,
    interceptChance:0.20,
    attackStaminaCost:18,
    staminaRecoveryPerRound:15,
    passiveImmunities:[]
  },
  'swift-beast':{
    id:'swift-beast',
    label:'Быстрый зверь',
    role:'striker',
    maxHp:55,
    maxStamina:110,
    damage:11,
    accuracy:0.90,
    evasion:0.18,
    interceptChance:0.12,
    attackStaminaCost:14,
    staminaRecoveryPerRound:18,
    passiveImmunities:[]
  },
  'bulwark-beast':{
    id:'bulwark-beast',
    label:'Живучий зверь',
    role:'guardian',
    maxHp:105,
    maxStamina:85,
    damage:8,
    accuracy:0.72,
    evasion:0.04,
    interceptChance:0.35,
    attackStaminaCost:16,
    staminaRecoveryPerRound:12,
    passiveImmunities:[]
  }
};

export const summonClassExamples={
  mage:{
    limit:1,
    availableSummonIds:['guardian-elemental']
  },
  tamer:{
    limit:3,
    availableSummonIds:['war-beast','swift-beast','bulwark-beast']
  }
} as const;
