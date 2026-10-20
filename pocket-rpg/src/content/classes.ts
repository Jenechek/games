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
  },
  warrior:{id:'warrior',label:'Воин',description:'Устойчивый универсальный боец: повышенная живучесть и стабильный физический урон.',summonLimit:1,personalDamageMultiplier:1.08,summonHpMultiplier:1,summonDamageMultiplier:1,summonUnlocks:[],hpMultiplier:1.12,mitigationBonus:0.05,accuracyBonus:0,evasionBonus:0,manaMultiplier:1},
  guardian:{id:'guardian',label:'Страж',description:'Тяжёлый защитник: высокий запас здоровья и сопротивление физическому урону.',summonLimit:1,personalDamageMultiplier:0.88,summonHpMultiplier:1,summonDamageMultiplier:1,summonUnlocks:[],hpMultiplier:1.3,mitigationBonus:0.16,accuracyBonus:-0.04,evasionBonus:-0.03,manaMultiplier:1},
  duelist:{id:'duelist',label:'Дуэлянт',description:'Точный боец ближнего боя: высокий шанс попадания и уклонение за счёт защиты.',summonLimit:1,personalDamageMultiplier:1.04,summonHpMultiplier:1,summonDamageMultiplier:1,summonUnlocks:[],hpMultiplier:0.94,mitigationBonus:0,accuracyBonus:0.12,evasionBonus:0.1,manaMultiplier:1},
  ranger:{id:'ranger',label:'Следопыт',description:'Мобильный стрелок: точность и уклонение, сниженная выживаемость в ближнем бою.',summonLimit:1,personalDamageMultiplier:1.02,summonHpMultiplier:1,summonDamageMultiplier:1,summonUnlocks:[],hpMultiplier:0.96,mitigationBonus:0,accuracyBonus:0.1,evasionBonus:0.08,manaMultiplier:1},
  assassin:{id:'assassin',label:'Убийца',description:'Высокий физический урон и уклонение при пониженном здоровье.',summonLimit:1,personalDamageMultiplier:1.2,summonHpMultiplier:1,summonDamageMultiplier:1,summonUnlocks:[],hpMultiplier:0.82,mitigationBonus:0,accuracyBonus:0.07,evasionBonus:0.12,manaMultiplier:1},
  paladin:{id:'paladin',label:'Паладин',description:'Защитный боец с усиленной маной, здоровьем и умеренным физическим уроном.',summonLimit:1,personalDamageMultiplier:0.93,summonHpMultiplier:1,summonDamageMultiplier:1,summonUnlocks:[],hpMultiplier:1.16,mitigationBonus:0.1,accuracyBonus:0,evasionBonus:0,manaMultiplier:1.2},
  berserker:{id:'berserker',label:'Берсерк',description:'Максимальный прямой урон ценой защиты и здоровья.',summonLimit:1,personalDamageMultiplier:1.27,summonHpMultiplier:1,summonDamageMultiplier:1,summonUnlocks:[],hpMultiplier:0.88,mitigationBonus:0,accuracyBonus:-0.03,evasionBonus:-0.05,manaMultiplier:0.9},
  monk:{id:'monk',label:'Монах',description:'Уклоняющийся боец с точными ударами и умеренным физическим уроном.',summonLimit:1,personalDamageMultiplier:1.02,summonHpMultiplier:1,summonDamageMultiplier:1,summonUnlocks:[],hpMultiplier:1.02,mitigationBonus:0.03,accuracyBonus:0.09,evasionBonus:0.13,manaMultiplier:1},
  battlemage:{id:'battlemage',label:'Боевой маг',description:'Гибрид оружия и магии: расширенный запас маны с ценой за физическую защиту.',summonLimit:1,personalDamageMultiplier:0.94,summonHpMultiplier:1,summonDamageMultiplier:1,summonUnlocks:[],hpMultiplier:0.94,mitigationBonus:0,accuracyBonus:0.03,evasionBonus:0.02,manaMultiplier:1.4},
  druid:{id:'druid',label:'Друид',description:'Выносливый магический гибрид: больше здоровья и маны, но ниже физический урон.',summonLimit:1,personalDamageMultiplier:0.88,summonHpMultiplier:1,summonDamageMultiplier:1,summonUnlocks:[],hpMultiplier:1.12,mitigationBonus:0.06,accuracyBonus:0,evasionBonus:0,manaMultiplier:1.25}
};
