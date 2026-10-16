export interface FishDefinition { id:string; label:string; baseChance:number; xp:number; weight:number; rare?:boolean; }
export interface BaitDefinition { id:string; label:string; speciesWeights:Record<string,number>; rareBonus:number; }
export const fishDefs:Record<string,FishDefinition>={
  roach:{id:'roach',label:'Плотва',baseChance:.35,xp:20,weight:.4},
  perch:{id:'perch',label:'Окунь',baseChance:.3,xp:24,weight:.6},
  carp:{id:'carp',label:'Карп',baseChance:.2,xp:30,weight:1.2},
  pike:{id:'pike',label:'Щука',baseChance:.1,xp:42,weight:2},
  'silver-eel':{id:'silver-eel',label:'Серебряный угорь',baseChance:.05,xp:80,weight:1.5,rare:true}
};
export const baits:Record<string,BaitDefinition>={
  worms:{id:'worms',label:'Черви',speciesWeights:{roach:1.4,perch:1.2,carp:.9,pike:.8,'silver-eel':.7},rareBonus:0},
  spinner:{id:'spinner',label:'Блесна',speciesWeights:{roach:.8,perch:1.2,carp:.8,pike:1.5,'silver-eel':1.2},rareBonus:.05}
};
export const fishPools:Record<string,string[]>={meadow:['roach','perch','carp'], 'forest-edge':['perch','carp','pike','silver-eel']};
