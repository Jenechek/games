import type { PlayerClassDefinition,PlayerClassId } from '../game-core/classes/types.js';

export const playerClasses:Record<PlayerClassId,PlayerClassDefinition>={
  mage:{
    id:'mage',
    label:'Маг',
    description:'Личный магический боец с Магическим фокусом, лечением и защитным барьером, а также одним защитным элементалем, который полностью перехватывает прошедшие атаки по хозяину.',
    summonLimit:1,
    personalDamageMultiplier:1,
    summonHpMultiplier:1,
    summonDamageMultiplier:1,
    summonUnlocks:[
      {summonId:'guardian-elemental',requiredSkillLevel:0}
    ]
  },
  tamer:{
    id:'tamer',
    label:'Укротитель',
    description:'Лично слабее в прямом бою, но может держать до трёх усиленных существ.',
    summonLimit:3,
    personalDamageMultiplier:0.85,
    summonHpMultiplier:1.15,
    summonDamageMultiplier:1.15,
    summonUnlocks:[
      {summonId:'war-beast',requiredSkillLevel:0},
      {summonId:'swift-beast',requiredSkillLevel:20},
      {summonId:'bulwark-beast',requiredSkillLevel:35}
    ]
  }
};
