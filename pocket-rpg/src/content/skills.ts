export const skills=[
  {id:'weapons',parentId:null,depth:0,label:'Оружие'},
  {id:'one-handed',parentId:'weapons',depth:1,label:'Одноручное оружие'},
  {id:'swords',parentId:'one-handed',depth:2,label:'Мечи'},
  {id:'short-sword',parentId:'swords',depth:3,label:'Короткий меч'},
  {id:'professions',parentId:null,depth:0,label:'Профессии'},
  {id:'crafting',parentId:'professions',depth:1,label:'Ремесло'},
  {id:'tailoring',parentId:'crafting',depth:2,label:'Портняжное дело'},
  {id:'alchemy',parentId:'professions',depth:1,label:'Алхимия'},
  {id:'potions',parentId:'alchemy',depth:2,label:'Зелья'},
  {id:'restorative-potions',parentId:'potions',depth:3,label:'Восстанавливающие зелья'},
  {id:'combat-tonics',parentId:'potions',depth:3,label:'Боевые тоники'}
] as const;
