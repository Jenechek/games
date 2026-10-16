export type AgricultureKind = 'safe'|'neutral';
export interface LocationDefinition {
  id:string;
  label:string;
  neighbors:string[];
  enemies:string[];
  fishing?:boolean;
  agriculture?:AgricultureKind;
  gathering?:boolean;
}
export const locations:Record<string,LocationDefinition>={
  'tillanium':{id:'tillanium',label:'Тилланиум',neighbors:['city-gate'],enemies:[]},
  'city-gate':{id:'city-gate',label:'Городские ворота',neighbors:['tillanium','tillanium-fields','meadow','west-trade-road','north-trade-road','river-trade-road','south-trade-road'],enemies:[]},
  'tillanium-fields':{id:'tillanium-fields',label:'Поля Тилланиума',neighbors:['city-gate'],enemies:[],agriculture:'safe',gathering:true},
  'meadow':{id:'meadow',label:'Луг',neighbors:['city-gate','forest-edge'],enemies:['young-wolf'],fishing:true,agriculture:'neutral',gathering:true},
  'forest-edge':{id:'forest-edge',label:'Опушка леса',neighbors:['meadow','dark-forest'],enemies:['young-wolf','bandit'],fishing:true,gathering:true},
  'dark-forest':{id:'dark-forest',label:'Тёмный лес',neighbors:['forest-edge'],enemies:['young-wolf','bandit','old-treant'],gathering:true},
  'west-trade-road':{id:'west-trade-road',label:'Западный торговый тракт',neighbors:['city-gate','karnholm'],enemies:[]},
  'north-trade-road':{id:'north-trade-road',label:'Северный торговый тракт',neighbors:['city-gate','ellaria'],enemies:[]},
  'river-trade-road':{id:'river-trade-road',label:'Речной торговый тракт',neighbors:['city-gate','rivermark'],enemies:[]},
  'south-trade-road':{id:'south-trade-road',label:'Южный торговый тракт',neighbors:['city-gate','greenwald'],enemies:[]},
  karnholm:{id:'karnholm',label:'Карнхольм',neighbors:['west-trade-road'],enemies:[]},
  ellaria:{id:'ellaria',label:'Эллария',neighbors:['north-trade-road'],enemies:[]},
  rivermark:{id:'rivermark',label:'Ривермарк',neighbors:['river-trade-road'],enemies:[]},
  greenwald:{id:'greenwald',label:'Гринвальд',neighbors:['south-trade-road'],enemies:[]}
};
