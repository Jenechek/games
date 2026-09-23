export interface EnemyDefinition { id:string; label:string; level:number; habitats:string[]; maxHp:number; damage:number; }
export const enemies:Record<string,EnemyDefinition>={
  'young-wolf':{id:'young-wolf',label:'Молодой волк',level:2,habitats:['meadow','forest-edge','dark-forest'],maxHp:45,damage:7},
  'bandit':{id:'bandit',label:'Разбойник',level:4,habitats:['forest-edge','dark-forest'],maxHp:70,damage:10},
  'old-treant':{id:'old-treant',label:'Старый древень',level:7,habitats:['dark-forest'],maxHp:120,damage:14}
};
