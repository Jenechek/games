export type AgricultureKind = 'safe'|'neutral';
export interface LocationDefinition {
  id:string;
  label:string;
  neighbors:string[];
  enemies:string[];
  fishing?:boolean;
  agriculture?:AgricultureKind;
}
export const locations:Record<string,LocationDefinition>={
  'tillanium':{id:'tillanium',label:'Тилланиум',neighbors:['city-gate'],enemies:[]},
  'city-gate':{id:'city-gate',label:'Городские ворота',neighbors:['tillanium','tillanium-fields','meadow'],enemies:[]},
  'tillanium-fields':{id:'tillanium-fields',label:'Поля Тилланиума',neighbors:['city-gate'],enemies:[],agriculture:'safe'},
  'meadow':{id:'meadow',label:'Луг',neighbors:['city-gate','forest-edge'],enemies:['young-wolf'],fishing:true,agriculture:'neutral'},
  'forest-edge':{id:'forest-edge',label:'Опушка леса',neighbors:['meadow','dark-forest'],enemies:['young-wolf','bandit'],fishing:true},
  'dark-forest':{id:'dark-forest',label:'Тёмный лес',neighbors:['forest-edge'],enemies:['young-wolf','bandit','old-treant']}
};
