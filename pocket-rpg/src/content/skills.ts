export const skills=[
  {id:'weapons',parentId:null,depth:0,label:'Оружие'},
  {id:'one-handed',parentId:'weapons',depth:1,label:'Одноручное оружие'},
  {id:'swords',parentId:'one-handed',depth:2,label:'Мечи'},
  {id:'short-sword',parentId:'swords',depth:3,label:'Короткий меч'}
] as const;
