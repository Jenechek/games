export interface EnemyDefinition { id:string; label:string; level:number; habitats:string[]; maxHp:number; damage:number; elementalResistances?:Partial<Record<'arcane'|'fire'|'frost',number>>; }
export const enemies:Record<string,EnemyDefinition>={
  'young-wolf':{id:'young-wolf',label:'Молодой волк',level:2,habitats:['meadow','forest-edge','dark-forest'],maxHp:45,damage:7,elementalResistances:{frost:.2}},
  'bandit':{id:'bandit',label:'Разбойник',level:4,habitats:['forest-edge','dark-forest'],maxHp:70,damage:10,elementalResistances:{arcane:.1}},
  'old-treant':{id:'old-treant',label:'Старый древень',level:7,habitats:['dark-forest'],maxHp:120,damage:14,elementalResistances:{fire:.25,frost:.35}}
};
