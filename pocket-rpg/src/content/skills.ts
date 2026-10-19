import type { SkillNodeDefinition } from '../game-core/progression/skill-tree.js';

export const skills=[
  {id:'weapons',parentId:null,depth:0,label:'Оружие'},
  {id:'one-handed',parentId:'weapons',depth:1,label:'Одноручное оружие'},
  {id:'swords',parentId:'one-handed',depth:2,label:'Мечи'},
  {id:'short-sword',parentId:'swords',depth:3,label:'Короткий меч'},

  {id:'armor',parentId:null,depth:0,label:'Броня'},
  {id:'body-armor',parentId:'armor',depth:1,label:'Нательная броня'},
  {id:'light-armor',parentId:'body-armor',depth:2,label:'Лёгкая броня'},
  {id:'heavy-armor',parentId:'body-armor',depth:2,label:'Тяжёлая броня'},

  {id:'shields',parentId:null,depth:0,label:'Щиты'},

  {id:'magic',parentId:null,depth:0,label:'Магия'},
  {id:'arcane',parentId:'magic',depth:1,label:'Аркана'},
  {id:'concentration',parentId:'arcane',depth:2,label:'Концентрация'},
  {id:'arcane-focus',parentId:'concentration',depth:3,label:'Магический фокус'},
  {id:'restoration',parentId:'magic',depth:1,label:'Восстановление'},
  {id:'healing',parentId:'restoration',depth:2,label:'Исцеление'},
  {id:'arcane-mend',parentId:'healing',depth:3,label:'Магическое лечение'},
  {id:'protection',parentId:'magic',depth:1,label:'Защита'},
  {id:'warding',parentId:'protection',depth:2,label:'Обереги'},
  {id:'arcane-ward',parentId:'warding',depth:3,label:'Магический барьер'},

  {id:'professions',parentId:null,depth:0,label:'Профессии'},
  {id:'crafting',parentId:'professions',depth:1,label:'Ремесло'},
  {id:'tailoring',parentId:'crafting',depth:2,label:'Портняжное дело'},
  {id:'alchemy',parentId:'professions',depth:1,label:'Алхимия'},
  {id:'potions',parentId:'alchemy',depth:2,label:'Зелья'},
  {id:'restorative-potions',parentId:'potions',depth:3,label:'Восстанавливающие зелья'},
  {id:'combat-tonics',parentId:'potions',depth:3,label:'Боевые тоники'},
  {id:'trading',parentId:'professions',depth:1,label:'Торговля'},
  {id:'diplomacy',parentId:'professions',depth:1,label:'Дипломатия'},
  {id:'fishing',parentId:'professions',depth:1,label:'Рыбалка'},
  {id:'gathering',parentId:'professions',depth:1,label:'Сбор'},
  {id:'farming',parentId:'professions',depth:1,label:'Фермерство'}
] as const satisfies readonly SkillNodeDefinition[];
